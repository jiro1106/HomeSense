# api/api_server.py

from fastapi import FastAPI, HTTPException, Query, Depends, Path
from pydantic import BaseModel
from pymongo import MongoClient, errors
from dotenv import load_dotenv
from passlib.hash import bcrypt
import os
import datetime
from typing import List
from fastapi.middleware.cors import CORSMiddleware

# ========================
# ENV + DB SETUP
# ========================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, "secrets.env"))

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set in secrets.env")

client = MongoClient(MONGO_URI)
db = client["homesense_db"]

# Load household from env
HOUSEHOLD_ID = os.getenv("HOUSEHOLD_ID")
if not HOUSEHOLD_ID:
    raise RuntimeError("HOUSEHOLD_ID not set in secrets.env")

app = FastAPI(title="HomeSense API", version="1.0")

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # adjust if your frontend uses a different port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# TIMEZONE
# ========================
PH_TZ = datetime.timezone(datetime.timedelta(hours=8))  # Asia/Manila
UTC = datetime.timezone.utc

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
    if "last_logged_in" in doc and isinstance(doc["last_logged_in"], datetime.datetime):
        doc["last_logged_in"] = format_datetime(doc["last_logged_in"])
    return doc

def clean_docs(docs: List[dict]) -> List[dict]:
    """Remove _id and format for a list of documents"""
    return [clean_doc(d) for d in docs]

def parse_date(date_str: str) -> datetime.datetime:
    """Convert YYYY-MM-DD to UTC midnight (tz-aware)."""
    try:
        d = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        return datetime.datetime.combine(d, datetime.time.min, tzinfo=UTC)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}")

def today_utc_midnight() -> datetime.datetime:
    """Return today's midnight in UTC (tz-aware)."""
    return datetime.datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

def format_date(d: datetime.datetime) -> str:
    """Format a stored datetime as YYYY-MM-DD in PH timezone."""
    if not isinstance(d, datetime.datetime):
        return str(d)

    # If tz-naive, assume UTC
    if d.tzinfo is None:
        d = d.replace(tzinfo=UTC)

    # Convert to PH time
    ph_date = d.astimezone(PH_TZ)
    return ph_date.strftime("%Y-%m-%d")


def format_datetime(dt: datetime.datetime) -> str:
    """
    Format a datetime into Philippine Time (ISO with offset).
    Accepts tz-aware or tz-naive datetimes. If tz-naive, treat it as UTC.
    Returns ISO string with +08:00 offset (e.g. 2025-09-22T15:00:00+08:00).
    """
    if dt is None:
        return None

    # If it's not a datetime for any reason, return None
    if not isinstance(dt, datetime.datetime):
        return None

    # If dt is naive (no tzinfo), assume it is stored as UTC in DB and set tzinfo accordingly.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)

    # Convert to PH timezone and return ISO string (includes +08:00)
    try:
        ph_dt = dt.astimezone(PH_TZ)
        return ph_dt.isoformat()
    except Exception:
        # fallback: try to force-convert by interpreting as UTC then convert
        try:
            dt2 = dt.replace(tzinfo=UTC)
            ph_dt = dt2.astimezone(PH_TZ)
            return ph_dt.isoformat()
        except Exception:
            return None

def get_utc_range_for_date(date: str = None):
    """Return (start, end) UTC datetimes for a given PH date string or today if None."""
    if date:
        try:
            local_date = datetime.datetime.strptime(date, "%Y-%m-%d")
            local_start = local_date.replace(tzinfo=PH_TZ)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {date}")
    else:
        local_start = datetime.datetime.now(PH_TZ).replace(hour=0, minute=0, second=0, microsecond=0)

    start = local_start.astimezone(UTC)
    end = (local_start + datetime.timedelta(days=1)).astimezone(UTC)
    return start, end

def validate_device(household_id: str, device_id: str) -> str:
    """Ensure device_id exists in appliances."""
    appliances = db["appliances"].find({"household_id": household_id}, {"device_id": 1})
    if device_id not in [a["device_id"] for a in appliances]:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")
    return device_id

def get_household_id() -> str:
    return HOUSEHOLD_ID

def get_registered_device_ids(household_id: str):
    appliances = db["appliances"].find({"household_id": household_id, "registered": True}, {"device_id": 1})
    return [a["device_id"] for a in appliances]

# ========================
# HELPER: Check if registered
# ========================
def ensure_registered(device_id: str, household_id: str):
    appliances = db["appliances"]
    doc = appliances.find_one({
        "household_id": household_id,
        "device_id": device_id,
        "registered": True  # ✅ check flag directly
    })
    if not doc:
        raise HTTPException(status_code=403, detail=f"Device {device_id} not registered in this household")
    return True


# ========================
# MODELS
# ========================
class RegisterRequest(BaseModel):
    email: str
    password: str  # plain (will be hashed)
    username: str 

class LoginRequest(BaseModel):
    email: str
    password: str

# ========================
# AUTH ENDPOINTS
# ========================
@app.post("/auth/register")
def register_user(req: RegisterRequest):
    try:
        users = db["users"]

        # Normalize email
        email = req.email.strip().lower()

        # Reject emails containing uppercase (before lowering) or emojis
        import re
        emoji_regex = re.compile(
            r"[\U0001F600-\U0001F64F]|"  # emoticons
            r"[\U0001F300-\U0001F5FF]|"  # symbols & pictographs
            r"[\U0001F680-\U0001F6FF]|"  # transport & map
            r"[\U0001F1E0-\U0001F1FF]|"  # flags
            r"[\U0001F900-\U0001F9FF]|"  # supplemental symbols & pictographs
            r"[\U0001FA70-\U0001FAFF]|"  # symbols & pictographs extended-A
            r"[\U00002702-\U000027B0]|"  # dingbats
            r"[\U000024C2-\U0001F251]",  # enclosed characters
            flags=re.UNICODE
        )

        if any(c.isupper() for c in req.email):
            raise HTTPException(status_code=400, detail="Email must not contain uppercase letters.")
        if emoji_regex.search(req.email):
            raise HTTPException(status_code=400, detail="Email must not contain emojis.")

        # Check duplicate
        if users.find_one({"email": email}):
            raise HTTPException(status_code=400, detail="Email already registered!")

        # Hash password
        hashed_pw = bcrypt.hash(req.password)

        username = req.username.strip()

        users.insert_one({
            "email": email,
            "username": username,
            "password": hashed_pw,
            "household_id": HOUSEHOLD_ID,  # always use env household_id
            "last_logged_in": None,        # initially none
        })

        return {
            "message": "User registered successfully",
            "household_id": HOUSEHOLD_ID,
        }

    except HTTPException as e:
        raise e
    except errors.PyMongoError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception:
        raise HTTPException(status_code=500, detail="Unexpected server error")


@app.post("/auth/login")
def login_user(req: LoginRequest):
    try:
        users = db["users"]

        # Normalize email
        email = req.email.strip().lower()

        # Lookup user
        user = users.find_one({"email": email})
        if not user or not bcrypt.verify(req.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login (store tz-aware UTC in DB)
        now = datetime.datetime.now(UTC)
        users.update_one({"email": email}, {"$set": {"last_logged_in": now}})

        return {
            "message": "Login successful",
            "household_id": HOUSEHOLD_ID,
            "last_logged_in": format_datetime(now),
        }

    except HTTPException as e: 
        raise e
    except errors.PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# ========================
# ADMIN ENDPOINTS
# ========================
@app.get("/admin/users")
def get_users():
    try:
        users = db["users"]
        data = list(users.find({}, {"_id": 0, "email": 1, "username": 1, "household_id": 1, "last_logged_in": 1}))

        # Format last_logged_in: if datetime -> convert to PH time string, else "Never"
        for d in data:
            raw = d.get("last_logged_in", None)

            # If pymongo returned a datetime, handle tz-aware/naive
            if isinstance(raw, datetime.datetime):
                formatted = format_datetime(raw)
                d["last_logged_in"] = formatted if formatted else "Never"
                continue

            # If the stored value is a string (ISO), try parsing it
            if isinstance(raw, str) and raw:
                try:
                    # fromisoformat accepts offset-aware strings; if no tz, assume UTC
                    parsed = datetime.datetime.fromisoformat(raw)
                    if parsed.tzinfo is None:
                        parsed = parsed.replace(tzinfo=UTC)
                    formatted = format_datetime(parsed)
                    d["last_logged_in"] = formatted if formatted else "Never"
                except Exception:
                    d["last_logged_in"] = "Never"
                continue

            # otherwise, null / missing
            d["last_logged_in"] = "Never"

        return {"users": data}
    except errors.PyMongoError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
# ========================
# DELETING USERS
# ========================

@app.delete("/admin/users/{email}")
def delete_user(email: str = Path(..., description="Email of the user to delete")):
    try:
        users = db["users"]
        result = users.delete_one({"email": email.lower().strip()})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": f"User {email} deleted successfully"}
    except errors.PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# ========================
# MODELS FOR APPLIANCES
# ========================
class ApplianceCreate(BaseModel):
    device_id: str
    appliance_name: str
    appliance_type: str           # Appliance type (e.g., "Air Conditioner")
    location: str       # Appliance location (e.g., "Bedroom")

class ApplianceUpdate(BaseModel):
    appliance_name: str | None = None
    appliance_type: str | None = None
    location: str | None = None


# ========================
# APPLIANCE ENDPOINTS (CRUD)
# ========================
@app.post("/appliances")
def register_appliance(appliance: ApplianceCreate, household_id: str = Depends(get_household_id)):
    """Register a new appliance for this household"""
    try:
        # Validate device exists in appliances collection
        validate_device(household_id, appliance.device_id)

        appliances = db["appliances"]
        existing = appliances.find_one({
            "household_id": household_id,
            "device_id": appliance.device_id,
            "registered": True
        })
        if existing:
            raise HTTPException(status_code=400, detail="Appliance already registered for this household")

        doc = {
            "household_id": household_id,
            "device_id": appliance.device_id,
            "appliance_name": appliance.appliance_name,
            "appliance_type": appliance.appliance_type,
            "location": appliance.location, 
            "registered": True,
            "created_at": datetime.datetime.now(UTC),
            "updated_at": datetime.datetime.now(UTC),
        }

        appliances.update_one(
            {"household_id": household_id, "device_id": appliance.device_id},
            {"$set": doc},
            upsert=True
        )

        return {"message": "Appliance registered successfully", "appliance": clean_doc(doc)}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering appliance: {str(e)}")



@app.get("/appliances")
def list_appliances(household_id: str = Depends(get_household_id)):
    """List all appliances for this household"""
    try:
        appliances = db["appliances"]
        docs = list(appliances.find({"household_id": household_id, "registered": True}))
        return {"appliances": clean_docs(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing appliances: {str(e)}")


@app.put("/appliances/{device_id}")
def update_appliance(device_id: str, updates: ApplianceUpdate, household_id: str = Depends(get_household_id)):
    """Update appliance name/type for this household"""
    try:
        appliances = db["appliances"]
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = appliances.update_one(
            {"household_id": household_id, "device_id": device_id, "registered": True},
            {"$set": {**update_data, "updated_at": datetime.datetime.now(UTC)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Appliance not found or not registered")

        return {"message": "Appliance updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating appliance: {str(e)}")


@app.delete("/appliances/{device_id}")
def delete_appliance(device_id: str, household_id: str = Depends(get_household_id)):
    """Delete appliance registration from this household"""
    try:
        appliances = db["appliances"]
        result = appliances.update_one({"household_id": household_id, "device_id": device_id, "registered": True},
        {"$set": {"appliance_type":None,"location":None, "appliance_name":device_id,"registered": False, "updated_at": datetime.datetime.now(UTC)}})
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Appliance not found or not registered")
        return {"message": "Appliance deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting appliance: {str(e)}")


# ========================
# ROOT
# ========================
@app.get("/")
def root():
    return {"message": "HomeSense API is running!"}

# ========================
# DEVICES ENDPOINT
# ========================
@app.get("/devices/unregistered")
def list_unregistered_devices(household_id: str = Depends(get_household_id)):
    """Return all unregistered devices for this household (for registration dropdown)."""
    try:
        devices = list(db["appliances"].find(
            {"household_id": household_id, "registered": False},
            {"_id": 0, "device_id": 1, "name": 1, "type": 1}  # only return relevant fields
        ))

        if not devices:
            return {
                "household_id": household_id,
                "devices": [],
                "status": "No unregistered devices found"
            }

        return {
            "household_id": household_id,
            "devices": devices,
            "status": "OK"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

# ========================
# 1️⃣ Current plug status (scoped by household), must be REGISTERED
# ========================
@app.get("/devices/status/{device_name}")
def get_device_status(device_name: str, household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id, device_name)
    ensure_registered(device_id, household_id)  # ✅ must be registered
    try:
        current = db["current_totals"].find_one({"household_id": household_id, "device_id": device_id})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")   

    if not current:
        return {
            "device_name": device_name,
            "device_id": device_id,
            "status": "No data available",
            "total_kwh": "No data available",
            "last_updated": None
        }

    return {
        "device_name": device_name,
        "device_id": device_id,
        "total_kwh": current.get("total_kwh", 0.0),
        "status": current.get("status", "inactive"),
        "last_updated": format_datetime(current["updated_at"]) if current.get("updated_at") else None
    }

# ========================
# 2️⃣ Daily household total (scoped by household)
# ========================
@app.get("/energy/daily/total")
def get_household_daily_total(date: str = None, household_id: str = Depends(get_household_id)):
    start, end = get_utc_range_for_date(date)

    try:
        registered_devices = get_registered_device_ids(household_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching registered devices: {str(e)}")

    if not registered_devices:
        return {
            "date": date or start.strftime("%Y-%m-%d"),
            "total_kwh": 0.0,
            "status": "No registered appliances"
        }

    try:
        pipeline = [
            {"$match": {
                "household_id": household_id,
                "device_id": {"$in": registered_devices},
                "date": {"$gte": start, "$lt": end}
            }},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(db["daily_totals_per_plug"].aggregate(pipeline))
        total = result[0]["total_kwh"] if result else 0.0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    return {
        "date": date or start.astimezone(PH_TZ).strftime("%Y-%m-%d"),
        "total_kwh": total,
        "status": "OK" if total > 0 else "No data available"
    }


# ========================
# 3️⃣ Daily total per plug (scoped by household)
# ========================
@app.get("/dev/energy/daily/{device_name}")
def get_daily_total(device_name: str, date: str = None, household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id, device_name)
    start, end = get_utc_range_for_date(date)
    try:
        doc = db["daily_totals_per_plug"].find_one({
            "household_id": household_id,
            "device_id": device_id,
            "date": {"$gte": start, "$lt": end}
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    
    return clean_doc(doc) if doc else {
        "device_id": device_id,
        "household_id": household_id,
        "date": date or start.astimezone(PH_TZ).strftime("%Y-%m-%d"),
        "device_name": device_name,
        "total_kwh": "No data available",
        "status": "No data available"
    }

# ========================
# 3️⃣ Daily total per plug (scoped by household), must be REGISTERED
# ========================
@app.get("/energy/daily/{device_name}")
def get_daily_total(device_name: str, date: str = None, household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id,device_name)
    ensure_registered(device_id, household_id)
    start, end = get_utc_range_for_date(date)
    
    try:
        doc = db["daily_totals_per_plug"].find_one({
            "household_id": household_id,
            "device_id": device_id,
            "date": {"$gte": start, "$lt": end}
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    
    return clean_doc(doc) if doc else {
        "device_id": device_id,
        "household_id": household_id,
        "date": date or start.astimezone(PH_TZ).strftime("%Y-%m-%d"),
        "device_name": device_name,
        "total_kwh": "No data available",
        "status": "No data available"
    }

# ========================
# 4️⃣ Dashboard summary (scoped by household)
# ========================
@app.get("/energy/summary")
def get_energy_summary(household_id: str = Depends(get_household_id)):
    """Return summary of all registered appliances in the household,
    including status, daily consumption, and last update time.
    """
    start, end = get_utc_range_for_date()  # today PH -> UTC

    # ✅ Get registered devices
    registered_ids = get_registered_device_ids(household_id)
    if not registered_ids:
        return {
            "household_id": household_id,
            "summary": [],
            "status": "No registered appliances"
        }

    summary = []
    for device_id in registered_ids:
        try:
            # ✅ Get appliance details
            appliance = db["appliances"].find_one(
                {"household_id": household_id, "device_id": device_id},
                {"_id": 0, "appliance_name": 1, "appliance_type": 1, "location": 1}  # only return relevant fields
            )

            # ✅ Get most recent status from current_totals
            current = db["current_totals"].find_one(
                {"household_id": household_id, "device_id": device_id}
            )

            # ✅ Get today’s daily consumption from daily_totals_per_plug
            daily = db["daily_totals_per_plug"].find_one(
                {"household_id": household_id, "device_id": device_id,
                 "date": {"$gte": start, "$lt": end}}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

        summary.append({
            "device_id": device_id,
            "appliance_name": appliance.get("appliance_name") if appliance else None,
            "appliance_type": appliance.get("appliance_type") if appliance else None,
            "location": appliance.get("location") if appliance else None,
            "status": current.get("status", "inactive") if current else "No data available",
            "daily_total_kwh": daily.get("total_kwh", 0.0) if daily else 0.0,
            "last_updated": format_datetime(current["updated_at"]) if current and current.get("updated_at") else None
        })

    return {"household_id": household_id, "summary": summary, "status": "OK"}



# ========================
# 5️⃣ Historical daily totals per plug (scoped by household)
# ========================
@app.get("/energy/history/range/{device_name}")
def get_daily_history(device_name: str,start: str = Query(...),end: str = Query(...),household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id,device_name)
    ensure_registered(device_id, household_id)
    start_date = parse_date(start)
    end_date = parse_date(end)

    
    try:
        cursor = db["daily_totals_per_plug"].find({
            "household_id": household_id,
            "device_id": device_id,
            "date": {"$gte": start_date, "$lte": end_date}
        }).sort("date", 1)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    
    return {"device_name": device_name, "history": clean_docs(list(cursor))}

# ========================
# 6️⃣ Historical household totals (scoped by household)
# ========================
@app.get("/energy/history/total_range")
def get_household_history(start: str = Query(...),end: str = Query(...),household_id: str = Depends(get_household_id)):
    start_date = parse_date(start)
    end_date = parse_date(end)
    try:
        registered_devices = get_registered_device_ids(household_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching registered devices: {str(e)}")

    if not registered_devices:
        return {
            "status": "No registered appliances"
        }
    try:
        cursor = db["daily_totals"].find({
            "household_id": household_id,
            "date": {"$gte": start_date, "$lte": end_date}
        }).sort("date", 1)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    
    return {"history": clean_docs(list(cursor))}

# ========================
# 7. Weekly household total (Mon–Sun) with optional limit
# ========================
@app.get("/energy/weekly/total")
def get_weekly_total_household(limit: int = Query(None, ge=1), household_id: str = Depends(get_household_id)):
    registered_devices = get_registered_device_ids(household_id)
    if not registered_devices:
        return {"data": "No data available"}

    try:
        pipeline = [
            {"$match": {"household_id": household_id, "device_id": {"$in": registered_devices}}},
            {"$group": {
                "_id": {"year": {"$isoWeekYear": "$date"}, "week": {"$isoWeek": "$date"}},
                "total_kwh": {"$sum": "$total_kwh"}
            }},
            {"$sort": {"_id.year": -1, "_id.week": -1}}
        ]
        if limit:
            pipeline.append({"$limit": limit})

        cursor = db["daily_totals_per_plug"].aggregate(pipeline)
        results = list(cursor)

        data = []
        for r in reversed(results):
            year, week = r["_id"]["year"], r["_id"]["week"]
            week_start = datetime.datetime.strptime(f"{year}-{week}-1", "%G-%V-%u").date()
            week_end = week_start + datetime.timedelta(days=6)
            data.append({
                "week_start": format_date(week_start),
                "week_end": format_date(week_end),
                "weekly_total_kwh": r["total_kwh"]
            })

        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")



# ========================
# 8. Weekly total per plug (Mon–Sun) with optional limit
# ========================
@app.get("/energy/weekly/{device_name}")
def get_weekly_total(device_name: str, limit: int = Query(None, ge=1), household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id, device_name)
    ensure_registered(device_id, household_id)
    try:
        pipeline = [
            {"$match": {"household_id": household_id, "device_id": device_id}},
            {"$group": {
                "_id": {"year": {"$isoWeekYear": "$date"}, "week": {"$isoWeek": "$date"}},
                "total_kwh": {"$sum": "$total_kwh"}
            }},
            {"$sort": {"_id.year": -1, "_id.week": -1}}
        ]

        if limit:
            pipeline.append({"$limit": limit})

        cursor = db["daily_totals_per_plug"].aggregate(pipeline)
        results = list(cursor)

        data = []
        for r in reversed(results):
            year, week = r["_id"]["year"], r["_id"]["week"]
            week_start = datetime.datetime.strptime(f"{year}-{week}-1", "%G-%V-%u").date()
            week_end = week_start + datetime.timedelta(days=6)
            data.append({
                "device_name": device_name,
                "week_start": format_date(week_start),
                "week_end": format_date(week_end),
                "total_kwh": r["total_kwh"]
            })

        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

# ========================
# 9. Monthly household total (calendar month) with optional limit
# ========================
@app.get("/energy/monthly/total")
def get_monthly_total_household(limit: int = Query(None, ge=1), household_id: str = Depends(get_household_id)):
    registered_devices = get_registered_device_ids(household_id)
    if not registered_devices:
        return {"data": "No data available"}

    try:
        pipeline = [
            {"$match": {"household_id": household_id, "device_id": {"$in": registered_devices}}},
            {"$group": {
                "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
                "total_kwh": {"$sum": "$total_kwh"}
            }},
            {"$sort": {"_id.year": -1, "_id.month": -1}}
        ]
        if limit:
            pipeline.append({"$limit": limit})

        cursor = db["daily_totals_per_plug"].aggregate(pipeline)
        results = list(cursor)

        data = [
            {"month": f"{r['_id']['year']}-{r['_id']['month']:02}", "monthly_total_kwh": r["total_kwh"]}
            for r in reversed(results)
        ]
        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")



# ========================
# 10. Monthly total per plug (calendar month) with optional limit
# ========================
@app.get("/energy/monthly/{device_name}")
def get_monthly_total(device_name: str, limit: int = Query(None, ge=1), household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id, device_name)
    ensure_registered(device_id, household_id)
    try:
        pipeline = [
            {"$match": {"household_id": household_id, "device_id": device_id}},
            {"$group": {
                "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
                "total_kwh": {"$sum": "$total_kwh"}
            }},
            {"$sort": {"_id.year": -1, "_id.month": -1}}
        ]

        if limit:
            pipeline.append({"$limit": limit})

        cursor = db["daily_totals_per_plug"].aggregate(pipeline)
        results = list(cursor)

        data = [{"device_name": device_name, "month": f"{r['_id']['year']}-{r['_id']['month']:02}", "total_kwh": r["total_kwh"]} for r in reversed(results)]
        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# ========================
# 11. Last 7 days for household total
# ========================
@app.get("/energy/weekly/recent/total")
def get_recent_weekly_household(household_id: str = Depends(get_household_id)):
    end_date = today_utc_midnight()
    start_date = end_date - datetime.timedelta(days=6)  # last 7 days
    
    try:
        pipeline = [
            {"$match": {"household_id": household_id, "date": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(db["daily_totals"].aggregate(pipeline))
        total = result[0]["total_kwh"] if result else 0.0
        return {
            "household_id": household_id,
            "start_date": format_date(start_date),
            "end_date": format_date(end_date),
            "total_kwh": total
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# ========================
# 12. Last 7 days per device
# ========================
@app.get("/energy/weekly/recent/{device_name}")
def get_recent_weekly(device_name: str, household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id, device_name)
    ensure_registered(device_id, household_id)
    end_date = today_utc_midnight()
    start_date = end_date - datetime.timedelta(days=6)
    try:
        pipeline = [
            {"$match": {"household_id": household_id, "device_id": device_id, "date": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(db["daily_totals_per_plug"].aggregate(pipeline))
        total = result[0]["total_kwh"] if result else 0.0
        return {
            "device_name": device_name,
            "start_date": format_date(start_date),
            "end_date": format_date(end_date),
            "total_kwh": total
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    
# ========================
# 13. Last 30 days for household total
# ========================
@app.get("/energy/monthly/recent/total")
def get_recent_monthly_household(household_id: str = Depends(get_household_id)):
    end_date = today_utc_midnight()
    start_date = end_date - datetime.timedelta(days=30)
    try:
        pipeline = [
            {"$match": {"household_id": household_id, "date": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(db["daily_totals"].aggregate(pipeline))
        total = result[0]["total_kwh"] if result else 0.0
        return {
            "household_id": household_id,
            "start_date": format_date(start_date),
            "end_date": format_date(end_date),
            "total_kwh": total
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    

# ========================
# 14. Last 30 days per device
# ========================
@app.get("/energy/monthly/recent/{device_name}")
def get_recent_monthly(device_name: str, household_id: str = Depends(get_household_id)):
    device_id = validate_device(household_id, device_name)
    ensure_registered(device_id, household_id)
    end_date = today_utc_midnight()
    start_date = end_date - datetime.timedelta(days=29)
    try:
        pipeline = [
            {"$match": {"household_id": household_id, "device_id": device_id, "date": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        result = list(db["daily_totals_per_plug"].aggregate(pipeline))
        total = result[0]["total_kwh"] if result else 0.0
        return {
            "device_name": device_name,
            "start_date": format_date(start_date),
            "end_date": format_date(end_date),
            "total_kwh": total
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


