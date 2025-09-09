# api/api_server.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import uuid

# ========================
# ENV + DB SETUP
# ========================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, "secrets.env"))

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["homesense_db"]

# Parse DEVICE_MAP (format: plug1:deviceid1,plug2:deviceid2)
raw_device_map = os.getenv("DEVICE_MAP", "")
DEVICE_MAP = {}
if raw_device_map:
    pairs = raw_device_map.split(",")
    for pair in pairs:
        key, value = pair.split(":")
        DEVICE_MAP[key.strip()] = value.strip()

app = FastAPI(title="HomeSense API", version="1.0")

# ========================
# HELPERS
# ========================
def clean_doc(doc):
    """Remove MongoDB _id from one document"""
    if "_id" in doc:
        doc.pop("_id")
    return doc

def clean_docs(docs):
    """Remove _id from a list of documents"""
    return [clean_doc(d) for d in docs]


# ========================
# MODELS
# ========================
class RegisterRequest(BaseModel):
    email: str
    password: str  # plain (no hashing, as requested)

class LoginRequest(BaseModel):
    email: str
    password: str


# ========================
# AUTH ENDPOINTS
# ========================
@app.post("/auth/register")
def register_user(req: RegisterRequest):
    users = db["users"]

    # Check if user already exists
    if users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate a household_id (UUID)
    household_id = str(uuid.uuid4())

    user_doc = {
        "email": req.email,
        "password": req.password,  # ⚠️ plain text
        "household_id": household_id,
    }

    users.insert_one(user_doc)

    return {"message": "User registered successfully", "household_id": household_id}


@app.post("/auth/login")
def login_user(req: LoginRequest):
    users = db["users"]

    user = users.find_one({"email": req.email, "password": req.password})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "message": "Login successful",
        "household_id": user["household_id"],
    }


# ========================
# ROOT
# ========================
@app.get("/")
def root():
    return {"message": "HomeSense API is running!"}


# ========================
# DEVICES ENDPOINT
# ========================
@app.get("/devices")
def list_devices():
    """Return available friendly names + their real device_ids"""
    return {"devices": DEVICE_MAP}


# ========================
# ENERGY HISTORY
# ========================
@app.get("/energy/history/{device_name}")
def get_energy_history(device_name: str, limit: int = 10):
    """
    Get recent energy data for a device.
    Accepts either:
      - friendly name (plug1, plug2, etc.)
      - raw device_id
    """
    device_id = DEVICE_MAP.get(device_name, device_name)  # fallback to raw id

    cursor = (
        db["energy_data"]
        .find({"device_id": device_id})
        .sort("timestamp", -1)
        .limit(limit)
    )
    docs = list(cursor)

    return {
        "device_name": device_name,
        "device_id": device_id,
        "data": clean_docs(docs),
    }
