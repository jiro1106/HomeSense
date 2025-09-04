import os
import time
from dotenv import load_dotenv
from pymongo import MongoClient, errors
from tuya_connector import TuyaOpenAPI
import datetime
from tabulate import tabulate
import signal


# Load file secrets
load_dotenv("secrets.env")

# Tuya Details
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
API_ENDPOINT = os.getenv("API_ENDPOINT")

# Parse DEVICE_MAP from .env → {"plug_1": "id1", "plug_2": "id2"}
DEVICE_MAP = {}
raw_map = os.getenv("DEVICE_MAP", "")
for pair in raw_map.split(","):
    if ":" in pair:
        name, device_id = pair.split(":")
        DEVICE_MAP[name.strip()] = device_id.strip()

# MongoDB setup
mongo_client = MongoClient(os.getenv("MONGO_URI"))

# Connect to Tuya
openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)
openapi.connect()

# MongoDB database
db = mongo_client["homesense_db"]

# Collections
energy_collection = db["energy_data"]
daily_totals_per_plug_collection = db["daily_totals_per_plug"]
daily_totals_collection = db["daily_totals"]
current_totals_collection = db["current_totals"]

# --- Ensure unique index on (device_id, date) ---
try:
    current_totals_collection.create_index(
        [("device_id", 1)],
        unique=True
    )
    print("✅ Unique index on device_id ensured for current_totals_collection.")
except errors.OperationFailure as e:
    print(f"⚠️ Index creation error: {e}")

# Track totals per device_id
device_totals = {}
tracking_day = datetime.date.today().isoformat()

# Track inactivity states
inactive_counts = {name: 0 for name in DEVICE_MAP.keys()}
is_active = {name: True for name in DEVICE_MAP.keys()}

# Flag to control stopping
stop_flag = False

def handle_shutdown(signum, frame):
    global stop_flag
    print("\n🛑 Ctrl+C received. Shutting down gracefully...")
    stop_flag = True

# Register signal handlers for Ctrl+C (SIGINT) and termination (SIGTERM)
signal.signal(signal.SIGINT, handle_shutdown)   # Ctrl+C
signal.signal(signal.SIGTERM, handle_shutdown)  # kill or system stop

# Resume from MongoDB if totals exist
for name, device_id in DEVICE_MAP.items():
    saved = current_totals_collection.find_one({"device_id": device_id, "date": tracking_day})
    if saved:
        device_totals[device_id] = float(saved.get("total_kwh", 0.0))
        print(f"✅ Resuming {name} ({device_id}) total for {tracking_day}: {device_totals[device_id]:.6f} kWh")
    else:
        device_totals[device_id] = 0.0
        print(f"⚪ No saved total for {name} ({device_id}) on {tracking_day} — starting at 0.0 kWh")

# Data needed from the API
required_keys = ["add_ele", "cur_power", "cur_voltage", "cur_current", "switch_1"]

def save_current_total(device_name: str, device_id: str, date_str: str, total: float):
    """Upsert total_kwh per device_id per day (unique)."""
    current_totals_collection.update_one(
    {"device_id": device_id},   # 👈 only track by device_id
    {"$set": {
        "device_name": device_name,
        "date": date_str,  # still store today's date
        "total_kwh": round(total, 6),
        "updated_at": datetime.datetime.now()
    }},
    upsert=True   # 👈 still needed so every plug gets at least one doc
)


def save_daily_total_per_plug(device_name: str, device_id: str, date_str: str, total: float):
    try:
        daily_totals_per_plug_collection.update_one(
            {"device_id": device_id, "date": date_str},
            {"$set": {
                "device_name": device_name,
                "total_kwh": round(total, 6),
                "updated_at": datetime.datetime.now()
            }},
            upsert=True
        )
    except Exception as e:
        print(f"Failed to save daily total for {device_name} ({device_id}):", e)

def save_overall_daily_total(date_str: str):
    try:
        pipeline = [
            {"$match": {"date": date_str}},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(daily_totals_per_plug_collection.aggregate(pipeline))
        overall_total = result[0]["total_kwh"] if result else 0.0

        daily_totals_collection.update_one(
            {"date": date_str},
            {"$set": {
                "total_kwh": round(overall_total, 6),
                "updated_at": datetime.datetime.now()
            }},
            upsert=True
        )
        print(f"\n🚨 Updated overall daily total for {date_str}: {overall_total:.6f} kWh")
    except Exception as e:
        print(f"Failed to save overall daily total for {date_str}:", e)

# Track consecutive failures
failure_counts = {name: 0 for name in DEVICE_MAP.keys()}

def try_reconnect_if_invalid(response, device_name, device_id):
    global failure_counts

    if not isinstance(response, dict):
        return response

    if (not response.get("success", True)) and response.get("code") == 1010:
        print(f"⚠️ Tuya token invalid for {device_name} ({device_id}) — reconnecting...")

        try:
            openapi.connect()
            time.sleep(1)
            failure_counts[device_name] = 0  # ✅ reset on success
            return openapi.get(f"/v1.0/devices/{device_id}/status")
        except Exception as e:
            failure_counts[device_name] += 1
            wait_time = min(60, 2 ** failure_counts[device_name])  # exponential backoff, max 60s
            print(f"❌ Reconnect failed for {device_name} ({device_id}). Sleeping {wait_time}s before retry...")
            time.sleep(wait_time)
            return response

    return response

# --- NEW FLAG ---
first_run = True

# Track last printed totals to suppress duplicates
last_printed_totals = {device_id: None for device_id in DEVICE_MAP.values()}

def print_plug_reading(device_name, device_id, power_watts, energy_kwh, total_kwh, status, timestamp):
    """Pretty-print a single plug reading."""
    print(f"\n💡 [{device_name}] Total: {total_kwh:.6f} kWh")
    print(f"   ├─ Power:       {power_watts:.2f} W")
    print(f"   ├─ Interval:    {energy_kwh:.6f} kWh")
    print(f"   ├─ Status:      {'🟢 active' if status == 'active' else '🔴 inactive'}")
    print(f"   └─ Timestamp:   {timestamp}")

def print_cycle_summary(date_str, timestamp, device_summaries, overall_total):
    """Print a summary table at the end of a cycle using tabulate."""
    print(f"\n📊 Daily Summary ({date_str} @ {timestamp})")

    # Prepare rows for each device
    table = []
    for name, data in device_summaries.items():
        status_icon = "ON " if data["status"] == "active" else "OFF "
        table.append([name, f"{data['total_kwh']:.6f}", status_icon])

    # Add the total row
    table.append(["TOTAL", f"{overall_total:.6f}", ""])

    # Print table with 'fancy_grid' format
    print(tabulate(table, headers=["Plug", "kWh", "Status"], tablefmt="fancy_grid"))

# Main loop (5-minute logging)
while not stop_flag:
    try:
        now_date_str = datetime.date.today().isoformat()

        # If new day → reset per device
        if now_date_str != tracking_day:
            tracking_day = now_date_str
            for name, device_id in DEVICE_MAP.items():
                device_totals[device_id] = 0.0
                save_current_total(name, device_id, tracking_day, 0.0)
                save_daily_total_per_plug(name, device_id, tracking_day, 0.0)
            save_overall_daily_total(tracking_day)

        # Divider for each cycle
        print("\n" + "─" * 35 + " ⚡ Plug Readings " + "─" * 35)

        device_summaries = {}

        for name, device_id in DEVICE_MAP.items():
            response = openapi.get(f"/v1.0/devices/{device_id}/status")
            response = try_reconnect_if_invalid(response, name, device_id)

            if isinstance(response, dict) and (not response.get("success", True)) and response.get("code") == 1010:
                print(f"❌ Still invalid token for {name} ({device_id}). Skipping...")
                continue

            timestamp_ms = response.get("t")
            timestamp_s = int(timestamp_ms) / 1000 if timestamp_ms else None
            readable_time = (
                datetime.datetime.fromtimestamp(timestamp_s).strftime('%Y-%m-%d %H:%M:%S')
                if timestamp_s else "N/A"
            )

            raw_status = response.get("result", []) or []
            power_watts = 0.0
            for item in raw_status:
                if item.get("code") == 'cur_power':
                    try:
                        power_watts = float(item.get("value")) / 10.0
                    except Exception:
                        power_watts = 0.0

            if first_run:
                print(f"⏳ Initial reading for {name} ({device_id}) collected, will compute kWh after 5 minutes...")
                continue

            # kWh calculation (5 min)
            energy_kwh = (power_watts / 1000.0) * (3.0 / 60.0) #3.0 / 60.0 if 3 minutes

            # Active/inactive handling
            if power_watts == 0:
                inactive_counts[name] += 1
                if inactive_counts[name] >= 1 and is_active[name]:
                    is_active[name] = False
                    print(f"\n🔴 {name} is inactive (no power for 1 interval)")
            else:
                inactive_counts[name] = 0
                if not is_active[name]:
                    is_active[name] = True
                    print(f"\n🟢 {name} is active again")

            # Update running totals
            device_totals[device_id] += energy_kwh

            # Save to Mongo
            save_current_total(name, device_id, tracking_day, device_totals[device_id])
            save_daily_total_per_plug(name, device_id, tracking_day, device_totals[device_id])

            # Only print if total changed (avoid duplicates)
            if last_printed_totals[device_id] != round(device_totals[device_id], 6):
                print_plug_reading(
                    name, device_id,
                    power_watts,
                    energy_kwh,
                    device_totals[device_id],
                    "active" if is_active[name] else "inactive",
                    readable_time
                )
                last_printed_totals[device_id] = round(device_totals[device_id], 6)

            # Store for summary
            device_summaries[name] = {
                "total_kwh": device_totals[device_id],
                "status": "active" if is_active[name] else "inactive"
            }

        # After all plugs updated → overall daily total
        if not first_run:
            save_overall_daily_total(tracking_day)

            # Compute summary total
            overall_total = sum(d["total_kwh"] for d in device_summaries.values())
            print_cycle_summary(tracking_day, datetime.datetime.now().strftime("%H:%M:%S"),
                                device_summaries, overall_total)

    except Exception as e:
        print("Error occurred:", e)

    # Sleep loop
    for _ in range(180): #change to 180 if 3 minutes, 300 if 5 minutes
        if stop_flag:
            break
        time.sleep(1)

    if first_run:
        first_run = False

print("✅ Program stopped succesfully.")

