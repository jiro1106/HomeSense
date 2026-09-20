import os

from tuya_connector import TuyaOpenAPI

# Set these locally; never commit credentials or device identifiers.
ACCESS_ID = os.environ["TUYA_ACCESS_ID"]
ACCESS_KEY = os.environ["TUYA_ACCESS_KEY"]
API_ENDPOINT = os.getenv("TUYA_API_ENDPOINT", "https://openapi-sg.iotbing.com")
DEVICE_ID = os.environ["TUYA_DEVICE_ID"]

openapi = TuyaOpenAPI(API_ENDPOINT, ACCESS_ID, ACCESS_KEY)
openapi.connect()

print(openapi.get(f"/v1.0/devices/{DEVICE_ID}/functions"))
print(openapi.get(f"/v1.0/devices/{DEVICE_ID}/status"))
