import os
import time
from dotenv import load_dotenv
from pymongo import MongoClient, errors
from tuya_connector import TuyaOpenAPI
import datetime
from tabulate import tabulate
import signal
import socket

# Load file secrets
load_dotenv("secrets.env")

# === NEW: Household support (MVP: household1|household2|household3) ===
HOUSEHOLD_ID = os.getenv("HOUSEHOLD_ID")
ALLOWED_HOUSEHOLDS = {"household1", "household2", "household3"}

if not HOUSEHOLD_ID:
    raise RuntimeError("HOUSEHOLD_ID not set in secrets.env (set to household1/household2/household3 for MVP).")
if HOUSEHOLD_ID not in ALLOWED_HOUSEHOLDS:
    raise RuntimeError(f"HOUSEHOLD_ID '{HOUSEHOLD_ID}' not allowed. Use one of {sorted(ALLOWED_HOUSEHOLDS)}")

print(f"🔖 Collector running for household: {HOUSEHOLD_ID}")

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

# --- Check MongoDB connection ---
try:
    mongo_client.admin.command("ping")
    print("✅ Connected to MongoDB successfully.\n")
except errors.ServerSelectionTimeoutError:
    print("❌ Cannot connect to MongoDB. Check Wi-Fi or firewall restrictions.")

# Connect to Tuya
try:
    openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)
    openapi.connect()
    print("✅ Connected to Tuya Cloud successfully.\n")
except Exception as e:
    print("❌ Cannot connect to Tuya Cloud. This may be due to blocked Wi-Fi or firewall rules.")
    print("Error details:", e)

# MongoDB database
db = mongo_client["homesense_db"]

# Collections
energy_collection = db["energy_data"]
daily_totals_per_plug_collection = db["daily_totals_per_plug"]
daily_totals_collection = db["daily_totals"]
current_totals_collection = db["current_totals"]

# --- Ensure unique index on (household_id, device_id) for current_totals_collection ---
try:
    current_totals_collection.create_index(
        [("household_id", 1), ("device_id", 1)],
        unique=True
    )
    print("✅ Unique index on (household_id, device_id) ensured for current_totals_collection.")
except errors.OperationFailure as e:
    print(f"⚠️ Index creation error: {e}")

# Ensure unique index for daily_totals_per_plug on (household_id, device_id, date)
try:
    daily_totals_per_plug_collection.create_index(
        [("household_id", 1), ("device_id", 1), ("date", 1)],
        unique=True
    )
    print("✅ Unique index on (household_id, device_id, date) ensured for daily_totals_per_plug_collection.")
except errors.OperationFailure as e:
    print(f"⚠️ Index creation error (daily_totals_per_plug): {e}")

# Track totals per device_id
device_totals = {}
tracking_day = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


# Track inactivity states
inactive_counts = {name: 0 for name in DEVICE_MAP.keys()}
is_active = {name: True for name in DEVICE_MAP.keys()}

# Flag to control stopping
stop_flag = False

def check_internet_connection(host="8.8.8.8", port=53, timeout=3):
    """Quick check if the device has internet (Google DNS)."""
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except socket.error:
        return False
    
wait_time = 5  # start at 5 seconds
max_wait = 300  # cap at 5 minutes


def handle_shutdown(signum, frame):
    global stop_flag
    print("\n🛑 Ctrl+C received. Shutting down gracefully...")
    stop_flag = True

# Register signal handlers for Ctrl+C (SIGINT) and termination (SIGTERM)
signal.signal(signal.SIGINT, handle_shutdown)   # Ctrl+C
signal.signal(signal.SIGTERM, handle_shutdown)  # kill or system stop

# Resume from MongoDB if totals exist
for name, device_id in DEVICE_MAP.items():
    saved = current_totals_collection.find_one({
        "household_id": HOUSEHOLD_ID,
        "device_id": device_id,
        "date": tracking_day
    })
    if saved:
        device_totals[device_id] = float(saved.get("total_kwh", 0.0))
        print(f"✅ Resuming {name} ({device_id}) total for {tracking_day}: {device_totals[device_id]:.6f} kWh")
    else:
        device_totals[device_id] = 0.0
        print(f"⚪ No saved total for {name} ({device_id}) on {tracking_day} — starting at 0.0 kWh")

# Data needed from the API
required_keys = ["add_ele", "cur_power", "cur_voltage", "cur_current", "switch_1"]

def save_current_total(device_name: str, device_id: str, date: datetime.datetime, total: float, status: str):
    """Upsert total_kwh per household_id + device_id (unique per household)."""
    current_totals_collection.update_one(
        {"household_id": HOUSEHOLD_ID, "device_id": device_id},
        {"$set": {
            "household_id": HOUSEHOLD_ID,
            "device_name": device_name,
            "date": date,
            "total_kwh": round(total, 6),
            "status": status,
            "updated_at": datetime.datetime.now(datetime.timezone.utc)
        }},
        upsert=True
    )


def save_daily_total_per_plug(device_name: str, device_id: str, date: datetime.datetime, total: float):
    try:
        daily_totals_per_plug_collection.update_one(
            {"household_id": HOUSEHOLD_ID, "device_id": device_id, "date": date},
            {"$set": {
                "household_id": HOUSEHOLD_ID,
                "device_name": device_name,
                "total_kwh": round(total, 6),
                "updated_at": datetime.datetime.now(datetime.timezone.utc)
            }},
            upsert=True
        )
    except Exception as e:
        print(f"Failed to save daily total for {device_name} ({device_id}):", e)

def save_overall_daily_total(date: datetime.datetime):
    try:
        pipeline = [
            {"$match": {"household_id": HOUSEHOLD_ID, "date": date}},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(daily_totals_per_plug_collection.aggregate(pipeline))
        overall_total = result[0]["total_kwh"] if result else 0.0

        daily_totals_collection.update_one(
            {"household_id": HOUSEHOLD_ID, "date": date},
            {"$set": {
                "household_id": HOUSEHOLD_ID,
                "total_kwh": round(overall_total, 6),
                "updated_at": datetime.datetime.now(datetime.timezone.utc)
            }},
            upsert=True
        )
        print(f"\n🚨 Updated overall daily total for {HOUSEHOLD_ID} {date}: {overall_total:.6f} kWh")
    except Exception as e:
        print(f"Failed to save overall daily total for {date}:", e)


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

def print_plug_reading(device_name, power_watts, energy_kwh, total_kwh, status, timestamp, device_id, date):
    """Pretty-print a single plug reading and save to MongoDB energy_data (scoped to household)."""
    
    # Print to console
    print(f"\n💡 [{device_name}] Total: {total_kwh:.6f} kWh")
    print(f"   ├─ Power:       {power_watts:.2f} W")
    print(f"   ├─ Interval:    {energy_kwh:.6f} kWh")
    print(f"   ├─ Status:      {'🟢 active' if status == 'active' else '🔴 inactive'}")
    print(f"   └─ Timestamp:   {timestamp}")
    
    # Save to MongoDB (include household_id)
    try:
        energy_collection.insert_one({
            "household_id": HOUSEHOLD_ID,
            "device_id": device_id,
            "device_name": device_name,
            "date": date,  # ISODate (midnight)
            "timestamp": datetime.datetime.now(datetime.timezone.utc),  # exact log time
            "power_watts": round(power_watts, 2),
            "interval_kwh": round(energy_kwh, 6),
            "total_kwh": round(total_kwh, 6),
            "status": status
        })
    except Exception as e:
        print(f"⚠️ Failed to insert energy_data for {device_name}: {e}")

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
        if not check_internet_connection():
            print(f"🌐 No internet connection detected. Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
            wait_time = min(wait_time * 2, max_wait) #exponential backoff
            continue  # skip this cycle

        now_date = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # If new day → reset per device
        if now_date != tracking_day:
            tracking_day = now_date 
            for name, device_id in DEVICE_MAP.items():
                device_totals[device_id] = 0.0
                save_current_total(name, device_id, tracking_day, 0.0, "inactive")
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
            energy_kwh = (power_watts / 1000.0) * (5.0 / 60.0) #3.0 / 60.0 if 3 minutes

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
            save_current_total(name, device_id, tracking_day, device_totals[device_id],"active" if is_active[name] else "inactive")
            save_daily_total_per_plug(name, device_id, tracking_day, device_totals[device_id])

            # Only print if total changed (avoid duplicates)
            if last_printed_totals[device_id] != round(device_totals[device_id], 6):
                print_plug_reading(
                    name,                          # device_name
                    power_watts,                   # power_watts
                    energy_kwh,                    # energy_kwh
                    device_totals[device_id],      # total_kwh
                    "active" if is_active[name] else "inactive",  # status
                    readable_time,                 # timestamp
                    device_id,                     # device_id
                    tracking_day                   # date
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
            print_cycle_summary(tracking_day, datetime.datetime.now(datetime.timezone.utc).strftime("%H:%M:%S"),
                                device_summaries, overall_total)

    except errors.ServerSelectionTimeoutError:
        print("❌ Lost connection to MongoDB. Check Wi-Fi or VPN.")
    except Exception as e:
        print("⚠️ Unexpected error:", e)
    # Sleep loop
    for _ in range(300): #change to 180 if 3 minutes, 300 if 5 minutes
        if stop_flag:
            break
        time.sleep(1)

    if first_run:
        first_run = False

print("✅ Program stopped succesfully.")

