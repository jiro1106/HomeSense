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
# We keep parsing DEVICE_MAP only to seed the appliances collection if needed.
DEVICE_IDS = []
raw_ids = os.getenv("DEVICE_IDS", "")
if raw_ids:
    DEVICE_IDS = [did.strip() for did in raw_ids.split(",") if did.strip()]

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

# --- If appliances collection lacks entries, seed placeholders from DEVICE_MAP ---
# This allows the app to show available device_ids in a dropdown even before user registers names.
if DEVICE_IDS:
    for dev_id in DEVICE_IDS:
        try:
            appliances_collection.update_one(
                {"household_id": HOUSEHOLD_ID, "device_id": dev_id},
                {"$setOnInsert": {
                    "appliance_name": None,       # user will register this later
                    "appliance_type": None,
                    "location": None,
                    "registered":False,         # user will register this later
                    "created_at": datetime.datetime.now(datetime.timezone.utc)
                }},
                upsert=True
            )
        except Exception as e:
            print(f"⚠️ Failed to seed appliance for {dev_id}: {e}")
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
def load_device_list():
    devices = []
    try:
        cursor = appliances_collection.find({"household_id": HOUSEHOLD_ID})
        for doc in cursor:
            devices.append({
                "device_id": doc.get("device_id"),
                "appliance_name": doc.get("appliance_name"), # user assigned name (Air Conditioner)
                "appliance_type": doc.get("appliance_type"), # optional (e.g., cooling, kitchen)
                "location": doc.get("location"),            # optional (e.g., Living Room)
            })
    except Exception as e:
        print("❌ Error loading appliances from MongoDB:", e)
    return devices

device_list = load_device_list()
if not device_list:
    print("⚠️ No devices found in appliances collection for this household. Make sure the collector seeded them or register from the app.")
else:
    ids = ", ".join([d["device_id"] for d in device_list])
    print(f"🔌 Devices to monitor (count={len(device_list)}): {ids}")

# Track totals per device_id (use device_id as canonical key)
device_totals = {}
tracking_day = get_current_tracking_day_utc()  # <-- PH-based day boundary (stored as UTC datetime)

# Initialize device_totals and other trackers using device_list
inactive_counts = {d["device_id"]: 0 for d in device_list}
is_active = {d["device_id"]: True for d in device_list}
failure_counts = {d["device_id"]: 0 for d in device_list}
last_printed_totals = {d["device_id"]: None for d in device_list}

# Resume from MongoDB if totals exist (current_totals uses household_id + device_id)
for d in device_list:
    device_id = d["device_id"]
    try:
        saved = current_totals_collection.find_one({
            "household_id": HOUSEHOLD_ID,
            "device_id": device_id,
            "date": tracking_day
        })
        if saved:
            device_totals[device_id] = float(saved.get("total_kwh", 0.0))
            name_label = d.get("appliance_name") or device_id
            # show PH date for readability
            ph_date_str = tracking_day.astimezone(PH_TZ).strftime("%Y-%m-%d")
            print(f"✅ Resuming {name_label} ({device_id}) total for {ph_date_str}: {device_totals[device_id]:.6f} kWh")
        else:
            device_totals[device_id] = 0.0
            name_label = d.get("appliance_name") or device_id
            ph_date_str = tracking_day.astimezone(PH_TZ).strftime("%Y-%m-%d")
            print(f"⚪ No saved total for {name_label} ({device_id}) on {ph_date_str} — starting at 0.0 kWh")
    except Exception as e:
        print(f"⚠️ Error while resuming totals for {device_id}: {e}")
        device_totals[device_id] = 0.0

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

def save_current_total(device_id: str, date: datetime.datetime, total: float, status: str, device_label, appliance_type, location):
    current_totals_collection.update_one(
        {"household_id": HOUSEHOLD_ID, "device_id": device_id},
        {"$set": {
            "household_id": HOUSEHOLD_ID,
            "device_id": device_id,
            "appliance_name": device_label if device_label else None,
            "appliance_type": appliance_type,
            "location": location,
            "date": date,  # date is expected to be a tz-aware UTC datetime representing PH midnight
            "total_kwh": round(total, 6),
            "status": status,
            "updated_at": datetime.datetime.now(datetime.timezone.utc)
        }},
        upsert=True
    )

def save_daily_total_per_plug(device_id: str, date: datetime.datetime, total: float, device_label,appliance_type,location):
    try:
        daily_totals_per_plug_collection.update_one(
            {"household_id": HOUSEHOLD_ID, "device_id": device_id, "date": date},
            {"$set": {
                "household_id": HOUSEHOLD_ID,
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
        print(f"Failed to save daily total for {device_id}: {e}")

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
        ph_date_str = date.astimezone(PH_TZ).strftime("%Y-%m-%d")
        print(f"\n🚨 Updated overall daily total for {HOUSEHOLD_ID} {ph_date_str}: {overall_total:.6f} kWh")
    except Exception as e:
        print(f"Failed to save overall daily total for {date}:", e)

def print_plug_reading(device_label, power_watts, energy_kwh, total_kwh, status, timestamp, device_id, date, appliance_type=None):
    """Pretty-print a single plug reading and save to MongoDB energy_data (scoped to household)."""
    print(f"\n💡 [{device_label}] Total: {total_kwh:.6f} kWh")
    print(f"   ├─ Power:       {power_watts:.2f} W")
    print(f"   ├─ Interval:    {energy_kwh:.6f} kWh")
    print(f"   ├─ Status:      {'🟢 active' if status == 'active' else '🔴 inactive'}")
    print(f"   └─ Timestamp:   {timestamp}")

    try:
        energy_collection.insert_one({
            "household_id": HOUSEHOLD_ID,
            "device_id": device_id,
            "appliance_name": device_label if device_label else None,
            "appliance_type": appliance_type,
            "date": date,  # keep date marker consistent (UTC datetime representing PH midnight)
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "power_watts": round(power_watts, 2),
            "interval_kwh": round(energy_kwh, 6),
            "total_kwh": round(total_kwh, 6),
            "status": status
        })
    except Exception as e:
        print(f"⚠️ Failed to insert energy_data for {device_id}: {e}")

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
        # refresh device_list each cycle in case user registered new appliances
        device_list = load_device_list()
        # if device_list changed, re-init tracking maps for new devices
        for d in device_list:
            device_id = d["device_id"]
            if device_id not in device_totals:
                device_totals[device_id] = 0.0
                inactive_counts.setdefault(device_id, 0)
                is_active.setdefault(device_id, True)
                failure_counts.setdefault(device_id, 0)
                last_printed_totals.setdefault(device_id, None)

        if not check_internet_connection():
            print(f"🌐 No internet connection detected. Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
            wait_time = min(wait_time * 2, max_wait)
            continue

        # Use PH midnight as the day boundary, converted to UTC for storage/queries
        now_date = get_current_tracking_day_utc()

        # new day handling (PH-based)
        if now_date != tracking_day:
            tracking_day = now_date
            ph_date_str = tracking_day.astimezone(PH_TZ).strftime("%Y-%m-%d")
            print(f"\n🔁 PH day changed — starting new day: {ph_date_str}")
            # reset totals for all devices
            for d in device_list:
                device_id = d["device_id"]
                device_totals[device_id] = 0.0
                # use device label for saved doc
                label = d.get("appliance_name") or device_id
                appliance_type = d.get("appliance_type")
                location = d.get("location")
                save_current_total(device_id, tracking_day, 0.0, "inactive", label, appliance_type, location)
                save_daily_total_per_plug(device_id, tracking_day, 0.0, label, appliance_type, location)
            save_overall_daily_total(tracking_day)

        print("\n" + "─" * 35 + " ⚡ Plug Readings " + "─" * 35)
        device_summaries = {}

        for d in device_list:
            device_id = d["device_id"]
            device_label = d.get("appliance_name") or device_id
            appliance_type = d.get("appliance_type")
            location = d.get("location")
            response = openapi.get(f"/v1.0/devices/{device_id}/status")
            response = try_reconnect_if_invalid(response, device_id)

            if isinstance(response, dict) and (not response.get("success", True)) and response.get("code") == 1010:
                print(f"❌ Still invalid token for {device_label} ({device_id}). Skipping...")
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
                print(f"⏳ Initial reading for {device_label} ({device_id}) collected, will compute kWh after 5 minutes...")
                continue

            # kWh for 5-minute interval
            energy_kwh = (power_watts / 1000.0) * (1.0 / 60.0)

            # Active/inactive logic
            if power_watts == 0:
                inactive_counts[device_id] = inactive_counts.get(device_id, 0) + 1
                if inactive_counts[device_id] >= 1 and is_active.get(device_id, True):
                    is_active[device_id] = False
                    print(f"\n🔴 {device_label} is inactive (no power for 1 interval)")
            else:
                inactive_counts[device_id] = 0
                if not is_active.get(device_id, True):
                    is_active[device_id] = True
                    print(f"\n🟢 {device_label} is active again")

            # Update running total
            device_totals[device_id] = device_totals.get(device_id, 0.0) + energy_kwh

            # Persist totals (date param is tracking_day which is UTC datetime representing PH midnight)
            save_current_total(device_id, tracking_day, device_totals[device_id], "active" if is_active[device_id] else "inactive", device_label, appliance_type, location)
            save_daily_total_per_plug(device_id, tracking_day, device_totals[device_id], device_label, appliance_type, location)

            # Insert energy_data and print if changed
            if last_printed_totals.get(device_id) != round(device_totals[device_id], 6):
                print_plug_reading(device_label, power_watts, energy_kwh, device_totals[device_id],
                                   "active" if is_active[device_id] else "inactive", readable_time, device_id, tracking_day, appliance_type)
                last_printed_totals[device_id] = round(device_totals[device_id], 6)

            device_summaries[device_label] = {
                "total_kwh": device_totals[device_id],
                "status": "active" if is_active[device_id] else "inactive"
            }

        # After all plugs processed → overall daily total
        if not first_run:
            save_overall_daily_total(tracking_day)
            overall_total = sum(d["total_kwh"] for d in device_summaries.values())
            ph_date_str = tracking_day.astimezone(PH_TZ).strftime("%Y-%m-%d")
            print_cycle_summary(ph_date_str, datetime.datetime.now(datetime.timezone.utc).astimezone(PH_TZ).strftime("%H:%M:%S"),
                                device_summaries, overall_total)

    except errors.ServerSelectionTimeoutError:
        print("❌ Lost connection to MongoDB. Check Wi-Fi or VPN.")
    except Exception as e:
        print("⚠️ Unexpected error:", e)

    # Sleep loop (5 minutes)
    for _ in range(60):
        if stop_flag:
            break
        time.sleep(1)

    if first_run:
        first_run = False

print("✅ Program stopped successfully.")
