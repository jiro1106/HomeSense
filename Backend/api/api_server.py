# api/api_server.py

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import uuid
import datetime

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
    for pair in raw_device_map.split(","):
        if ":" in pair:
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

def parse_date(date_str: str):
    """Convert YYYY-MM-DD to date object"""
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}")

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
    if users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    household_id = str(uuid.uuid4())
    users.insert_one({
        "email": req.email,
        "password": req.password,
        "household_id": household_id,
    })
    return {"message": "User registered successfully", "household_id": household_id}

@app.post("/auth/login")
def login_user(req: LoginRequest):
    users = db["users"]
    user = users.find_one({"email": req.email, "password": req.password})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful", "household_id": user["household_id"]}

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
    return {"devices": DEVICE_MAP}

# ========================
# 1️⃣ Current plug status
# ========================
@app.get("/devices/status/{device_name}")
def get_device_status(device_name: str):
    """Return current total kWh and active/inactive status of a single device."""
    device_id = DEVICE_MAP.get(device_name, device_name)  # fallback to raw id
    current = db["current_totals"].find_one({"device_id": device_id})

    if not current:
        raise HTTPException(status_code=404, detail=f"No current data found for {device_name}")

    return {
        "device_name": device_name,
        "device_id": device_id,
        "total_kwh": current.get("total_kwh", 0.0),
        "status": current.get("status", "inactive"),
        "last_updated": current.get("updated_at")
    }

# ========================
# 2️⃣ Daily total per plug
# ========================
@app.get("/energy/daily/{device_name}")
def get_daily_total(device_name: str, date: str = None):
    device_id = DEVICE_MAP.get(device_name, device_name)
    date_obj = parse_date(date) if date else datetime.date.today()
    doc = db["daily_totals_per_plug"].find_one({"device_id": device_id, "date": str(date_obj)})
    return clean_doc(doc) if doc else {"device_id": device_id, "date": str(date_obj), "total_kwh": 0.0}

# ========================
# 3️⃣ Daily household total
# ========================
@app.get("/energy/daily/total")
def get_household_daily_total(date: str = None):
    date_obj = parse_date(date) if date else datetime.date.today()
    doc = db["daily_totals"].find_one({"date": str(date_obj)})
    return clean_doc(doc) if doc else {"date": str(date_obj), "total_kwh": 0.0}

# ========================
# 4️⃣ Dashboard summary (all plugs)
# ========================
@app.get("/energy/summary")
def get_energy_summary():
    """Return current totals, status, and daily totals for all devices."""
    summary = []

    for name, device_id in DEVICE_MAP.items():
        current = db["current_totals"].find_one({"device_id": device_id})
        daily = db["daily_totals_per_plug"].find_one({"device_id": device_id, "date": datetime.date.today().isoformat()})

        summary.append({
            "device_name": name,
            "device_id": device_id,
            "status": current.get("status", "inactive") if current else "inactive",
            "current_total_kwh": current.get("total_kwh", 0.0) if current else 0.0,
            "daily_total_kwh": daily.get("total_kwh", 0.0) if daily else 0.0,
            "last_updated": current.get("updated_at") if current else None
        })

    return {"summary": summary}

# ========================
# 5️⃣ Historical daily totals per plug
# ========================
@app.get("/energy/history/range/{device_name}")
def get_daily_history(device_name: str, start: str = Query(...), end: str = Query(...)):
    device_id = DEVICE_MAP.get(device_name, device_name)
    start_date = parse_date(start)
    end_date = parse_date(end)
    cursor = db["daily_totals_per_plug"].find({
        "device_id": device_id,
        "date": {"$gte": str(start_date), "$lte": str(end_date)}
    }).sort("date", 1)
    return {"device_id": device_id, "history": clean_docs(list(cursor))}

# ========================
# 6️⃣ Historical household totals
# ========================
@app.get("/energy/history/total_range")
def get_household_history(start: str = Query(...), end: str = Query(...)):
    start_date = parse_date(start)
    end_date = parse_date(end)
    cursor = db["daily_totals"].find({
        "date": {"$gte": str(start_date), "$lte": str(end_date)}
    }).sort("date", 1)
    return {"history": clean_docs(list(cursor))}
