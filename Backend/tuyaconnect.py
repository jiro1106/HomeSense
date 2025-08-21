import os
import time
from dotenv import load_dotenv
from pymongo import MongoClient
from tuya_connector import TuyaOpenAPI
import datetime
import json

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
energy_collection = db["energy_data"]                 # every 5-min reading
daily_totals_per_plug_collection = db["daily_totals_per_plug"]  # per plug per day
daily_totals_collection = db["daily_totals"]          # overall per day
current_totals_collection = db["current_totals"]      # per plug running total

# Track totals per device_id
device_totals = {}
tracking_day = datetime.date.today().isoformat()

for name, device_id in DEVICE_MAP.items():
    saved = current_totals_collection.find_one({"device_id": device_id, "date": tracking_day})
    if saved:
        device_totals[device_id] = float(saved.get("total_kwh", 0.0))
        print(f"Resuming {name} ({device_id}) total for {tracking_day}: {device_totals[device_id]:.6f} kWh")
    else:
        device_totals[device_id] = 0.0
        print(f"No saved total for {name} ({device_id}) on {tracking_day} — starting at 0.0 kWh")

# Data needed from the API
required_keys = ["add_ele", "cur_power", "cur_voltage", "cur_current", "switch_1"]

def save_current_total(device_name: str, device_id: str, date_str: str, total: float):
    try:
        current_totals_collection.update_one(
            {"device_id": device_id, "date": date_str},
            {"$set": {
                "device_name": device_name,
                "total_kwh": round(total, 6),
                "updated_at": datetime.datetime.now()
            }},
            upsert=True
        )
    except Exception as e:
        print(f"Failed to save current total for {device_name} ({device_id}):", e)

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
        print(f"[{device_name}] Updated per-plug daily total for {date_str}: {total:.6f} kWh")
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
        print(f"🌍 Updated overall daily total for {date_str}: {overall_total:.6f} kWh")
    except Exception as e:
        print(f"Failed to save overall daily total for {date_str}:", e)

def try_reconnect_if_invalid(response, device_name, device_id):
    if not isinstance(response, dict):
        return response
    if (not response.get("success", True)) and response.get("code") == 1010:
        print(f"⚠️ Tuya token invalid for {device_name} ({device_id}) — reconnecting...")
        try:
            openapi.connect()
            time.sleep(1)
            return openapi.get(f"/v1.0/devices/{device_id}/status")
        except Exception as e:
            print(f"❌ Reconnect failed for {device_name} ({device_id}):", e)
            return response
    return response

# Main loop (5-minute logging)
while True:
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

        for name, device_id in DEVICE_MAP.items():
            response = openapi.get(f"/v1.0/devices/{device_id}/status")
            response = try_reconnect_if_invalid(response, name, device_id)

            # print(f"\n=== Raw Response for {name} ({device_id}) ===\n")
            # print(json.dumps(response, indent=4))

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
            clean_data = {
                "device_id": device_id,
                "device_name": name,
                "timestamp": timestamp_ms,
                "readable_time": readable_time,
            }

            power_watts = 0.0
            for item in raw_status:
                code = item.get("code")
                if code in required_keys:
                    clean_data[code] = item.get("value")
                    if code == 'cur_power':
                        try:
                            power_watts = float(item.get("value")) / 10.0
                        except Exception:
                            power_watts = 0.0

            print(f"\n=== Filtered Data for {name} ({device_id}) ===")
            for key, value in clean_data.items():
                print(f"{key}: {value}")

            # kWh calculation (5 min)
            energy_kwh = (power_watts / 1000.0) * (5.0 / 60.0)
            device_totals[device_id] += energy_kwh

            record = {
                "device_id": device_id,
                "device_name": name,
                "timestamp": datetime.datetime.now(),
                "cur_power_watts": round(power_watts, 3),
                "energy_kwh_interval": round(energy_kwh, 6),
                "total_energy_kwh_today": round(device_totals[device_id], 6)
            }

            try:
                energy_collection.insert_one(record)
            except Exception as e:
                print(f"❌ Failed to insert record for {name} ({device_id}):", e)

            save_current_total(name, device_id, tracking_day, device_totals[device_id])
            save_daily_total_per_plug(name, device_id, tracking_day, device_totals[device_id])

            print(f"\n=== Energy Tracker {name} ({device_id}) ===")
            print(f"[{record['timestamp']}] Power: {power_watts:.2f} W | "
                  f"Interval kWh: {energy_kwh:.6f} | Total: {device_totals[device_id]:.6f} kWh")

        # after all plugs updated → update overall daily total
        save_overall_daily_total(tracking_day)

    except Exception as e:
        print("Error occurred:", e)

    time.sleep(300)
