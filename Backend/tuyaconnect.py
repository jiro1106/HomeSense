from tuya_connector import TuyaOpenAPI

# --- Replace with your info ---
ACCESS_ID = "c5veqysat4pryryctytu"
ACCESS_KEY = "63f813fc4d114c85a578581063c7da1c"
API_ENDPOINT = "https://openapi-sg.iotbing.com"  # Singapore data center

# --- Initialize OpenAPI ---
openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)

# This will automatically request the access token
openapi.connect()

# --- Now use the API (example: get device functions) ---
device_id = "a3c1d90f6cdce1dc2duc8a"
response = openapi.get(f"/v1.0/devices/{device_id}/functions")
print(response)

print("\n"*5)
print("This is the DEVICE STATUS!\n")
response = openapi.get(f"/v1.0/devices/{device_id}/status")
print(response)

