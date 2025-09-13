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
# TIMEZONE
# ========================
PH_TZ = datetime.timezone(datetime.timedelta(hours=8))  # Philippine Time (UTC+8)

# ========================
# HELPERS
# ========================
def clean_doc(doc):
    """Remove MongoDB _id from one document and format dates"""
    if not doc:
        return None
    doc.pop("_id", None)
    if "date" in doc and isinstance(doc["date"], (datetime.date, datetime.datetime)):
        doc["date"] = format_date(doc["date"])
    if "updated_at" in doc and isinstance(doc["updated_at"], datetime.datetime):
        doc["updated_at"] = format_datetime(doc["updated_at"])
    return doc

def clean_docs(docs):
    """Remove _id and format for a list of documents"""
    return [clean_doc(d) for d in docs]

def parse_date(date_str: str) -> datetime.datetime:
    """
    Convert YYYY-MM-DD to UTC midnight (timezone-aware).
    This matches how the collector currently stores daily documents
    (e.g. 2025-09-11 -> 2025-09-11T00:00:00+00:00).
    """
    try:
        d = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        return datetime.datetime.combine(d, datetime.time.min, tzinfo=datetime.timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}")

def today_utc_midnight() -> datetime.datetime:
    """Return today's midnight in UTC (tz-aware)."""
    return datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

def format_date(d: datetime.datetime) -> str:
    """Format a stored datetime as YYYY-MM-DD without timezone shifting."""
    if isinstance(d, datetime.datetime):
        return d.strftime("%Y-%m-%d")
    return str(d)

def format_datetime(dt: datetime.datetime) -> str:
    """Format datetime as ISO8601 Z (UTC)."""
    return dt.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

# ========================
# MODELS
# ========================
class RegisterRequest(BaseModel):
    email: str
    password: str  # plain (no hashing yet)

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
        "last_updated": format_datetime(current["updated_at"]) if current.get("updated_at") else None
    }

# ========================
# 32️⃣ Daily household total
# ========================
@app.get("/energy/daily/total")
def get_household_daily_total(date: str = None):
    print("👉 HIT: get_household_daily_total endpoint")
    PH_TZ = datetime.timezone(datetime.timedelta(hours=8))  # Asia/Manila
    UTC = datetime.timezone.utc

    # If date param is given, parse it as PH midnight -> convert to UTC
    if date:
        try:
            local_date = datetime.datetime.strptime(date, "%Y-%m-%d")
            local_start = local_date.replace(tzinfo=PH_TZ)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {date}")
    else:
        # Default: today in PH midnight
        today_local = datetime.datetime.now(PH_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
        local_start = today_local

    # Convert PH midnight to UTC window
    start = local_start.astimezone(UTC)
    end = (local_start + datetime.timedelta(days=1)).astimezone(UTC)

    # Debug logs (will show in uvicorn console)
    print("📌 DAILY TOTAL RANGE")
    print("   start =", start.isoformat())
    print("   end   =", end.isoformat())

    # MongoDB query (range-based, same as per plug)
    doc = db["daily_totals"].find_one({
        "date": {"$gte": start, "$lt": end}
    })

    if not doc:
        return {
            "date": date or local_start.strftime("%Y-%m-%d"),
            "total_kwh": "No data found",
            "updated at": "No data found",
        }

    return clean_doc(doc)

# ========================
#  3️⃣ Daily total per plug
# ========================
@app.get("/energy/daily/{device_name}")
def get_daily_total(device_name: str, date: str = None):
    print("👉 HIT: get_daily_total endpoint")
    device_id = DEVICE_MAP.get(device_name, device_name)
    date_obj = parse_date(date) if date else today_utc_midnight()

    start = date_obj
    end = date_obj + datetime.timedelta(days=1)

    doc = db["daily_totals_per_plug"].find_one({
        "device_id": device_id,
        "date": {"$gte": start, "$lt": end}
    })

    return clean_doc(doc) if doc else {
        "device_id": device_id,
        "date": format_date(date_obj),
        "total_kwh": 0.0
    }


# ========================
# 4️⃣ Dashboard summary (all plugs)
# ========================
@app.get("/energy/summary")
def get_energy_summary():
    """Return current totals, status, and daily totals for all devices."""
    summary = []
    today = today_utc_midnight()

    for name, device_id in DEVICE_MAP.items():
        current = db["current_totals"].find_one({"device_id": device_id})
        daily = db["daily_totals_per_plug"].find_one({"device_id": device_id, "date": today})

        summary.append({
            "device_name": name,
            "device_id": device_id,
            "status": current.get("status", "inactive") if current else "inactive",
            "current_total_kwh": current.get("total_kwh", 0.0) if current else 0.0,
            "daily_total_kwh": daily.get("total_kwh", 0.0) if daily else 0.0,
            "last_updated": format_datetime(current["updated_at"]) if current and current.get("updated_at") else None
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
        "date": {"$gte": start_date, "$lte": end_date}
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
        "date": {"$gte": start_date, "$lte": end_date}
    }).sort("date", 1)
    return {"history": clean_docs(list(cursor))}
