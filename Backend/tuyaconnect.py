import os # to access the OS for env
import time # to get time data 
from dotenv import load_dotenv # hiding secrets
from pymongo import MongoClient 
from tuya_connector import TuyaOpenAPI # access API from Tuya
import datetime # to get time data 
import json  # for pretty-printing Tuya response

#Load file secrets
load_dotenv("secrets.env")

#Tuya Details
ACCESS_ID = os.getenv("ACCESS_ID")
ACCESS_KEY = os.getenv("ACCESS_KEY")
API_ENDPOINT = os.getenv("API_ENDPOINT")
DEVICE_ID = os.getenv("DEVICE_ID")

#MongoDB setup
mongo_client = MongoClient(os.getenv("MONGO_URI"))

# Connect to Tuya
openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)
openapi.connect()

# MongoDB database
db = mongo_client["homesense_db"]

# Collections
energy_collection = db["energy_data"]         # every 5-min reading
daily_totals_collection = db["daily_totals"] # one doc per day
current_totals_collection = db["current_totals"]  # totals for each day smart plug is reading


# Load today's saved total_kwh if it exists (resume)
today_str = datetime.date.today().isoformat()
saved = current_totals_collection.find_one({"device_id": DEVICE_ID, "date": today_str})
if saved:
    total_kwh = float(saved.get("total_kwh", 0.0))
    print(f"Resuming from saved total for {today_str}: {total_kwh:.6f} kWh")
else:
    total_kwh = 0.0
    print(f"No saved total for {today_str} — starting at 0.0 kWh")

# Keep the current day string to detect date change at midnight
tracking_day = today_str

# Data needed from the API
required_keys = ["add_ele", "cur_power", "cur_voltage", "cur_current", "switch_1"]

def save_current_total(device_id: str, date_str: str, total: float):
    """Upsert the running total for today so we can resume on restart."""
    try:
        current_totals_collection.update_one(
            {"device_id": device_id, "date": date_str},
            {"$set": {"total_kwh": round(total, 6), "updated_at": datetime.datetime.now()}},
            upsert=True
        )
    except Exception as e:
        print("Failed to save current total:", e)

def save_daily_total(device_id: str, date_str: str, total: float):
    """Save finished day's total into daily_totals."""
    try:
        daily_totals_collection.insert_one({
            "device_id": device_id,
            "date": date_str,
            "total_kwh": round(total, 6),
            "saved_at": datetime.datetime.now()
        })
        print(f"Saved daily total for {date_str}: {total:.6f} kWh")
    except Exception as e:
        print("Failed to save daily total:", e)

def try_reconnect_if_invalid(response):
    """Handle Tuya 'token invalid' responses by reconnecting once."""
    # response may be a dict with code/msg fields
    if not isinstance(response, dict):
        return response
    if (not response.get("success", True)) and response.get("code") == 1010:
        print("Tuya token invalid — reconnecting and retrying once...")
        try:
            openapi.connect()
            time.sleep(1)  # 1s pause
            return openapi.get(f"/v1.0/devices/{DEVICE_ID}/status")
        except Exception as e:
            print("Reconnect failed:", e)
            return response
    return response

# Main loop (5-minute logging)
while True:
    try:
        # Detect midnight / day change
        now_date_str = datetime.date.today().isoformat()
        if now_date_str != tracking_day:
            # Save the old day's total and reset
            save_daily_total(DEVICE_ID, tracking_day, total_kwh)

            # reset counters for the new day
            total_kwh = 0.0
            tracking_day = now_date_str

            # update current_totals for new day (0.0)
            save_current_total(DEVICE_ID, tracking_day, total_kwh)

        # Main API Call to fetch device status from Tuya
        response = openapi.get(f"/v1.0/devices/{DEVICE_ID}/status")
        response = try_reconnect_if_invalid(response)

        #Print Full Raw Response (Optional Debugging)
        print("\n=== Full Raw Tuya Device Response ===\n")
        print(json.dumps(response, indent=4))

        # If token is invalid (still), skip this iteration
        if isinstance(response, dict) and (not response.get("success", True)) and response.get("code") == 1010:
            print("Tuya still returning token invalid. Will retry on next loop.")
            time.sleep(300)
            continue

        #Extract timestamp and make it readable for humans
        timestamp_ms = response.get("t")
        timestamp_s = int(timestamp_ms) / 1000 if timestamp_ms else None
        readable_time = (
            datetime.datetime.fromtimestamp(timestamp_s).strftime('%Y-%m-%d %H:%M:%S')
            if timestamp_s else "N/A"
        )

        #Filtered clean data
        raw_status = response.get("result", []) or []
        clean_data = {
            "device_id": DEVICE_ID,
            "timestamp": timestamp_ms,
            "readable_time": readable_time,
        }

        power_watts = 0.0

        for item in raw_status:
            code = item.get("code")
            if code in required_keys:
                clean_data[code] = item.get("value")
                # your device reports cur_power as deciwatts (value / 10 -> watts)
                if code == 'cur_power':
                    val = item.get("value")
                    try:
                        power_watts = float(val) / 10.0
                    except Exception:
                        power_watts = 0.0

        #Print Filtered Cleaned Data
        print("\n=== Filtered Cleaned Data ===")
        for key, value in clean_data.items():
            print(f"{key}: {value}")
        print()
        # --- kWh Calculation (for a 5-minute interval) ---
        # energy_kwh = (power in kW) * (time in hours)
        # time = 5 minutes = 5/60 hours
        energy_kwh = (power_watts / 1000.0) * (5.0 / 60.0)
        total_kwh += energy_kwh

        # --- MongoDB Record (insert into energy_data) ---
        record = {
            "device_id": DEVICE_ID,
            "timestamp": datetime.datetime.now(),
            "cur_power_watts": round(power_watts, 3),
            "energy_kwh_interval": round(energy_kwh, 6),
            "total_energy_kwh_today": round(total_kwh, 6)
        }
        try:
            energy_collection.insert_one(record)
        except Exception as e:
            print("Failed to insert energy record:", e)

        #Update current_totals for resume
        save_current_total(DEVICE_ID, tracking_day, total_kwh)

        #Print Energy Log
        print("\n=== Energy Tracker ===")
        print(f"[{record['timestamp']}] Power: {power_watts:.2f} W | "
              f"Interval kWh: {energy_kwh:.6f} | Total: {total_kwh:.6f} kWh")

    except Exception as e:
        print("Error occurred:", e)

    # Wait 5 minutes
    time.sleep(300)
