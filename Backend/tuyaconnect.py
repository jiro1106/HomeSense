#!/usr/bin/env python3
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

# Tuya Details
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
API_ENDPOINT = os.getenv("API_ENDPOINT")

# MongoDB setup
mongo_client = MongoClient(os.getenv("MONGO_URI"))

if not all([ACCESS_ID, ACCESS_KEY, API_ENDPOINT, mongo_client]):
    raise RuntimeError("Missing required .env values. Ensure ACCESS_ID, ACCESS_KEY, API_ENDPOINT, and MONGO_URI are set.")

print("🚀 Starting HomeSense Multi-Household Collector")
print("===============================================")

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

# MongoDB database & collections
db = mongo_client["homesense_db"]

energy_collection = db["energy_data"]
daily_totals_per_plug_collection = db["daily_totals_per_plug"]
daily_totals_collection = db["daily_totals"]
current_totals_collection = db["current_totals"]
appliances_collection = db["appliances"]  # NEW collection
households_collection = db["households"]

try:
    households = list(households_collection.find({}, {"_id": 0, "household_id": 1}))
    if not households:
        raise RuntimeError("No households found in the database. Add at least one to 'households' collection.")
    print(f"🏠 Found {len(households)} household(s): {[h['household_id'] for h in households]}")
except Exception as e:
    raise RuntimeError(f"Failed to load households: {e}")

# Ensure indexes
try:
    current_totals_collection.create_index(
        [("household_id", 1), ("device_id", 1)],
        unique=True
    )
    daily_totals_per_plug_collection.create_index(
        [("household_id", 1), ("device_id", 1), ("date", 1)],
        unique=True
    )
    appliances_collection.create_index(
        [("household_id", 1), ("device_id", 1)],
        unique=True
    )
    print("✅ Indexes ensured for current_totals, daily_totals_per_plug, appliances.")
except errors.OperationFailure as e:
    print(f"⚠️ Index creation error: {e}")

# --------------------------------------------------------------------
# Timezone helpers — use PH midnight as the day boundary but store dates
# as UTC datetimes (this keeps DB UTC-normalized while making "days"
# align with Asia/Manila).
# --------------------------------------------------------------------
PH_TZ = datetime.timezone(datetime.timedelta(hours=8))
UTC = datetime.timezone.utc

def ph_midnight_as_utc_for_date(ph_date: datetime.date) -> datetime.datetime:
    """
    Given a PH date (datetime.date), return a tz-aware UTC datetime that
    corresponds to PH midnight of that date (i.e., PH 00:00 -> UTC equivalent).
    """
    ph_midnight = datetime.datetime.combine(ph_date, datetime.time.min).replace(tzinfo=PH_TZ)
    return ph_midnight.astimezone(UTC)

def get_current_tracking_day_utc() -> datetime.datetime:
    """
    Return the current day's PH midnight converted to UTC (tz-aware).
    This is the value to use for 'date' fields so database queries using
    UTC ranges will match PH-day boundaries.
    """
    now_ph = datetime.datetime.now(PH_TZ)
    ph_date = now_ph.date()
    return ph_midnight_as_utc_for_date(ph_date)

# Build the list of devices to poll from appliances collection (for this household)
def load_device_list(household_id):
    """Return a list of devices (smart plugs) registered under a specific household."""
    devices = []
    try:
        cursor = appliances_collection.find({"household_id": household_id})
        for doc in cursor:
            devices.append({
                "device_id": doc.get("device_id"),
                "appliance_name": doc.get("appliance_name"),
                "appliance_type": doc.get("appliance_type"),
                "location": doc.get("location"),
            })
        if not devices:
            print(f"⚠️ No devices found for {household_id}. Skipping this household for now.")
    except Exception as e:
        print(f"❌ Error loading appliances for {household_id}: {e}")
    return devices

# === Multi-household tracking setup ===
household_ids = [h["household_id"] for h in households]

device_lists = {}
device_totals = {}
tracking_days = {}
inactive_counts = {}
is_active = {}
failure_counts = {}
last_printed_totals = {}

for household_id in household_ids:
    # Load each household’s devices
    devices = load_device_list(household_id)
    device_lists[household_id] = devices
    tracking_days[household_id] = get_current_tracking_day_utc()
    
    # Initialize trackers
    device_totals[household_id] = {d["device_id"]: 0.0 for d in devices}
    inactive_counts[household_id] = {d["device_id"]: 0 for d in devices}
    is_active[household_id] = {d["device_id"]: True for d in devices}
    failure_counts[household_id] = {d["device_id"]: 0 for d in devices}
    last_printed_totals[household_id] = {d["device_id"]: None for d in devices}

    # Log initialization
    if devices:
        ids = ", ".join([d["device_id"] for d in devices])
        print(f"🔌 {household_id}: Devices to monitor ({len(devices)}): {ids}")
    else:
        print(f"⚠️ {household_id}: No devices found.")

# === Resume saved totals from MongoDB (per household) ===
for household_id in household_ids:
    devices = device_lists.get(household_id, [])
    tracking_day = tracking_days[household_id]
    
    for d in devices:
        device_id = d["device_id"]
        try:
            saved = current_totals_collection.find_one({
                "household_id": household_id,
                "device_id": device_id,
                "date": tracking_day
            })

            name_label = d.get("appliance_name") or device_id
            ph_date_str = tracking_day.astimezone(PH_TZ).strftime("%Y-%m-%d")

            if saved:
                total_kwh = float(saved.get("total_kwh", 0.0))
                device_totals[household_id][device_id] = total_kwh
                print(f"✅ [{household_id}] Resuming {name_label} ({device_id}) total for {ph_date_str}: {total_kwh:.6f} kWh")
            else:
                device_totals[household_id][device_id] = 0.0
                print(f"⚪ [{household_id}] No saved total for {name_label} ({device_id}) on {ph_date_str} — starting at 0.0 kWh")

        except Exception as e:
            print(f"⚠️ [{household_id}] Error while resuming totals for {device_id}: {e}")
            device_totals[household_id][device_id] = 0.0

# Helper: internet check
def check_internet_connection(host="8.8.8.8", port=53, timeout=3):
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except socket.error:
        return False

wait_time = 5  # start at 5 seconds
max_wait = 300  # cap at 5 minutes

# Graceful shutdown
stop_flag = False
def handle_shutdown(signum, frame):
    global stop_flag
    print("\n🛑 Ctrl+C received. Shutting down gracefully...")
    print("✅ All households stopped successfully. Exiting.")
    stop_flag = True

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)

# Data keys expected in Tuya response
required_keys = ["add_ele", "cur_power", "cur_voltage", "cur_current", "switch_1"]

def try_reconnect_if_invalid(response, device_id):
    """If Tuya token expired, reconnect and retry once."""
    global failure_counts
    if not isinstance(response, dict):
        return response

    if (not response.get("success", True)) and response.get("code") == 1010:
        print(f"⚠️ Tuya token invalid for device {device_id} — reconnecting...")
        try:
            openapi.connect()
            time.sleep(1)
            # reset specific device failure count
            failure_counts[device_id] = 0
            return openapi.get(f"/v1.0/devices/{device_id}/status")
        except Exception as e:
            failure_counts[device_id] += 1
            backoff = min(60, 2 ** failure_counts[device_id])
            print(f"❌ Reconnect failed for {device_id}. Sleeping {backoff}s before retry...")
            time.sleep(backoff)
            return response
    return response

first_run = True

def save_current_total(household_id, device_id, date, total, status, device_label, appliance_type, location):
    current_totals_collection.update_one(
        {"household_id": household_id, "device_id": device_id},
        {"$set": {
            "household_id": household_id,
            "device_id": device_id,
            "appliance_name": device_label if device_label else None,
            "appliance_type": appliance_type,
            "location": location,
            "date": date,
            "total_kwh": round(total, 6),
            "status": status,
            "updated_at": datetime.datetime.now(datetime.timezone.utc)
        }},
        upsert=True
    )


def save_daily_total_per_plug(household_id, device_id, date, total, device_label, appliance_type, location):
    try:
        daily_totals_per_plug_collection.update_one(
            {"household_id": household_id, "device_id": device_id, "date": date},
            {"$set": {
                "household_id": household_id,
                "device_id": device_id,
                "appliance_name": device_label if device_label else None,
                "appliance_type": appliance_type,
                "location": location,
                "total_kwh": round(total, 6),
                "updated_at": datetime.datetime.now(datetime.timezone.utc)
            }},
            upsert=True
        )
    except Exception as e:
        print(f"Failed to save daily total for {device_id} ({household_id}): {e}")
        
def save_overall_daily_total(household_id, date):
    try:
        pipeline = [
            {"$match": {"household_id": household_id, "date": date}},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(daily_totals_per_plug_collection.aggregate(pipeline))
        overall_total = result[0]["total_kwh"] if result else 0.0

        daily_totals_collection.update_one(
            {"household_id": household_id, "date": date},
            {"$set": {
                "household_id": household_id,
                "total_kwh": round(overall_total, 6),
                "updated_at": datetime.datetime.now(datetime.timezone.utc)
            }},
            upsert=True
        )

        ph_date_str = date.astimezone(PH_TZ).strftime("%Y-%m-%d")
        print(f"\n🚨 Updated overall daily total for {household_id} {ph_date_str}: {overall_total:.6f} kWh")

    except Exception as e:
        print(f"Failed to save overall daily total for {household_id}: {e}")

def print_plug_reading(household_id, device_label, power_watts, energy_kwh, total_kwh, status, timestamp, device_id, date, appliance_type=None):
    print(f"\n💡 [{household_id}] {device_label} — Total: {total_kwh:.6f} kWh")
    print(f"   ├─ Power:       {power_watts:.2f} W")
    print(f"   ├─ Interval:    {energy_kwh:.6f} kWh")
    print(f"   ├─ Status:      {'🟢 active' if status == 'active' else '🔴 inactive'}")
    print(f"   └─ Timestamp:   {timestamp}")

    try:
        energy_collection.insert_one({
            "household_id": household_id,
            "device_id": device_id,
            "appliance_name": device_label if device_label else None,
            "appliance_type": appliance_type,
            "date": date,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "power_watts": round(power_watts, 2),
            "interval_kwh": round(energy_kwh, 6),
            "total_kwh": round(total_kwh, 6),
            "status": status
        })
    except Exception as e:
        print(f"⚠️ Failed to insert energy_data for {device_id} ({household_id}): {e}")

def print_cycle_summary(date_str, timestamp, device_summaries, overall_total):
    print(f"\n📊 Daily Summary ({date_str} @ {timestamp})")
    table = []
    for label, data in device_summaries.items():
        status_icon = "ON " if data["status"] == "active" else "OFF "
        table.append([label, f"{data['total_kwh']:.6f}", status_icon])
    table.append(["TOTAL", f"{overall_total:.6f}", ""])
    print(tabulate(table, headers=["Plug", "kWh", "Status"], tablefmt="fancy_grid"))

# Main loop (5-minute logging)
while not stop_flag:
    try:
        if not check_internet_connection():
            print(f"🌐 No internet connection detected. Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
            wait_time = min(wait_time * 2, max_wait)
            continue

        # Iterate through all households
        for household_id in household_ids:
            devices = load_device_list(household_id)
            device_lists[household_id] = devices

            # Refresh tracking_day for each household
            now_date = get_current_tracking_day_utc()

            # Handle PH day change
            if now_date != tracking_days[household_id]:
                tracking_days[household_id] = now_date
                ph_date_str = now_date.astimezone(PH_TZ).strftime("%Y-%m-%d")
                print(f"\n🔁 [{household_id}] PH day changed — starting new day: {ph_date_str}")

                for d in devices:
                    device_id = d["device_id"]
                    device_totals[household_id][device_id] = 0.0
                    label = d.get("appliance_name") or device_id
                    appliance_type = d.get("appliance_type")
                    location = d.get("location")
                    save_current_total(household_id, device_id, now_date, 0.0, "inactive", label, appliance_type, location)
                    save_daily_total_per_plug(household_id, device_id, now_date, 0.0, label, appliance_type, location)

                save_overall_daily_total(household_id, now_date)

            # --- Fetch readings for each device ---
            print(f"\n──── ⚡ [{household_id}] Plug Readings ────")
            device_summaries = {}

            for d in devices:
                device_id = d["device_id"]
                device_label = d.get("appliance_name") or device_id
                appliance_type = d.get("appliance_type")
                location = d.get("location")

                response = openapi.get(f"/v1.0/devices/{device_id}/status")
                response = try_reconnect_if_invalid(response, device_id)

                if isinstance(response, dict) and (not response.get("success", True)) and response.get("code") == 1010:
                    print(f"❌ [{household_id}] Invalid token for {device_label} ({device_id}). Skipping...")
                    continue

                timestamp_ms = response.get("t")
                timestamp_s = int(timestamp_ms) / 1000 if timestamp_ms else None
                readable_time = (
                    datetime.datetime.fromtimestamp(timestamp_s).strftime('%Y-%m-%d %H:%M:%S')
                    if timestamp_s else "N/A"
                )

                # Extract power in watts
                raw_status = response.get("result", []) or []
                power_watts = 0.0
                for item in raw_status:
                    if item.get("code") == 'cur_power':
                        try:
                            power_watts = float(item.get("value")) / 10.0
                        except Exception:
                            power_watts = 0.0

                # Skip first cycle until initial reading is complete
                if first_run:
                    print(f"⏳ [{household_id}] Initial reading for {device_label} collected, computing kWh next cycle...")
                    continue

                # Calculate energy consumed during this interval (5 min = 1/12 hr)
                energy_kwh = (power_watts / 1000.0) * (3.0 / 60.0)

                # Determine active/inactive status
                if power_watts == 0:
                    inactive_counts[household_id][device_id] += 1
                    if inactive_counts[household_id][device_id] >= 1 and is_active[household_id][device_id]:
                        is_active[household_id][device_id] = False
                        print(f"🔴 [{household_id}] {device_label} is inactive.")
                else:
                    inactive_counts[household_id][device_id] = 0
                    if not is_active[household_id][device_id]:
                        is_active[household_id][device_id] = True
                        print(f"🟢 [{household_id}] {device_label} is active again.")

                # Update total kWh for the household’s device
                device_totals[household_id][device_id] += energy_kwh

                # Save updated totals
                save_current_total(household_id, device_id, now_date, device_totals[household_id][device_id],
                                   "active" if is_active[household_id][device_id] else "inactive",
                                   device_label, appliance_type, location)
                save_daily_total_per_plug(household_id, device_id, now_date, device_totals[household_id][device_id],
                                          device_label, appliance_type, location)

                # Print readings only if changed
                if last_printed_totals[household_id][device_id] != round(device_totals[household_id][device_id], 6):
                    print_plug_reading(household_id, device_label, power_watts, energy_kwh,
                                       device_totals[household_id][device_id],
                                       "active" if is_active[household_id][device_id] else "inactive",
                                       readable_time, device_id, now_date, appliance_type)
                    last_printed_totals[household_id][device_id] = round(device_totals[household_id][device_id], 6)

                device_summaries[device_label] = {
                    "total_kwh": device_totals[household_id][device_id],
                    "status": "active" if is_active[household_id][device_id] else "inactive"
                }

            # After all devices → save overall household total
            if not first_run:
                save_overall_daily_total(household_id, now_date)
                overall_total = sum(d["total_kwh"] for d in device_summaries.values())
                ph_date_str = now_date.astimezone(PH_TZ).strftime("%Y-%m-%d")
                print_cycle_summary(
                    ph_date_str,
                    datetime.datetime.now(datetime.timezone.utc).astimezone(PH_TZ).strftime("%H:%M:%S"),
                    device_summaries,
                    overall_total
                )

    except errors.ServerSelectionTimeoutError:
        print("❌ Lost connection to MongoDB. Retrying...")
    except Exception as e:
        print("⚠️ Unexpected error:", e)

    # Sleep between cycles (3 minutes)
    for _ in range(180):
        if stop_flag:
            break
        time.sleep(1)

    if first_run:
        first_run = False


print("✅ Program stopped successfully.")
