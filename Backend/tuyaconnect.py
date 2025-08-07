from tuya_connector import TuyaOpenAPI
import json  # For pretty printing
from datetime import datetime  # For converting timestamp

# --- Developer Info ---
ACCESS_ID = "c5veqysat4pryryctytu"
ACCESS_KEY = "63f813fc4d114c85a578581063c7da1c"
API_ENDPOINT = "https://openapi-sg.iotbing.com"  # Singapore data center

# --- Initialize OpenAPI ---
openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)
openapi.connect()

# --- Device ID ---
device_id = "a3c1d90f6cdce1dc2duc8a"

# --- Fetch Device Status ---
response = openapi.get(f"/v1.0/devices/{device_id}/status")

# --- Print Full Raw Response ---
print("\n=== Full Raw Tuya Device Response ===\n")
print(json.dumps(response, indent=4))  # Pretty print

# --- Extract timestamp ---
timestamp_ms = response.get("t")  # Unix timestamp in ms
timestamp_s = int(timestamp_ms) / 1000 if timestamp_ms else None

# Convert to readable date-time if timestamp exists
readable_time = datetime.fromtimestamp(timestamp_s).strftime('%Y-%m-%d %H:%M:%S') if timestamp_s else "N/A"

# --- Filter required keys ---
raw_status = response.get("result", [])
required_keys = ["add_ele", "cur_power", "cur_voltage", "cur_current", "switch_1"]

clean_data = {
    "device_id": device_id,
    "timestamp": timestamp_ms,
    "readable_time": readable_time,
}

for item in raw_status:
    code = item.get("code")
    if code in required_keys:
        clean_data[code] = item.get("value")

# --- Output cleaned data (line by line) ---
print("\n=== Filtered Cleaned Data ===\n")
for key, value in clean_data.items():
    print(f"{key}: {value}")
