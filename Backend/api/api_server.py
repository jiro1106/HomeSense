from fastapi import FastAPI, HTTPException, Query, Depends, Path, APIRouter
from pydantic import BaseModel
from pymongo import MongoClient, errors
from dotenv import load_dotenv
from passlib.hash import bcrypt
import os
import datetime
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from api import api_recommendations
from bson import ObjectId
from typing import Optional
from api import email_verification

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

app = FastAPI(title="HomeSense API", version="1.0")

# Include routers with correct prefixes
app.include_router(api_recommendations.router, prefix="/energy", tags=["Recommendations"])
app.include_router(email_verification.router, prefix="/auth", tags=["Email Verification"])

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# TIMEZONE
# ========================
PH_TZ = datetime.timezone(datetime.timedelta(hours=8))
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

    if d.tzinfo is None:
        d = d.replace(tzinfo=UTC)

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

    if not isinstance(dt, datetime.datetime):
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)

    try:
        ph_dt = dt.astimezone(PH_TZ)
        return ph_dt.isoformat()
    except Exception:
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

def get_registered_device_ids(household_id: str):
    appliances = db["appliances"].find({"household_id": household_id, "registered": True}, {"device_id": 1})
    return [a["device_id"] for a in appliances]

def ensure_registered(device_id: str, household_id: str):
    appliances = db["appliances"]
    doc = appliances.find_one({
        "household_id": household_id,
        "device_id": device_id,
        "registered": True
    })
    if not doc:
        raise HTTPException(status_code=403, detail=f"Device {device_id} not registered in this household")
    return True

# ========================
# MODELS
# ========================
class LoginRequest(BaseModel):
    email: str
    password: str

class UnregisteredAppliance(BaseModel):
    household_id: str
    device_id: str
    appliance_name: str | None = None
    appliance_type: str | None = None
    location: str | None = None
# ========================
# AUTH ENDPOINTS
# ========================
# NOTE: Registration is handled by email_verification.py
# Endpoints: POST /auth/send-verification, POST /auth/verify-code, POST /auth/register

@app.post("/auth/login")
def login_user(req: LoginRequest):
    """
    Login endpoint - user must be fully registered (is_completed=True)
    """
    try:
        users = db["users"]

        # Normalize email
        email = req.email.strip().lower()

        # Lookup user - must be fully registered
        user = users.find_one({"email": email, "is_completed": True})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password (user.password should be hashed)
        stored_password = user.get("password")
        if not stored_password:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Check if password is hashed or plaintext (for backwards compatibility)
        is_hashed = stored_password.startswith("$2")  # bcrypt hashes start with $2
        
        try:
            if is_hashed:
                # Password is hashed, verify it
                if not bcrypt.verify(req.password, stored_password):
                    raise HTTPException(status_code=401, detail="Invalid email or password")
            else:
                # Password is plaintext (shouldn't happen, but handle it)
                if req.password != stored_password:
                    raise HTTPException(status_code=401, detail="Invalid email or password")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Get household_id
        household_id = user.get("household_id")
        if not household_id:
            raise HTTPException(status_code=400, detail="User does not have an assigned household_id")

        # Update last login (store tz-aware UTC in DB)
        now = datetime.datetime.now(UTC)
        users.update_one({"email": email}, {"$set": {"last_logged_in": now}})

        return {
            "message": "Login successful",
            "household_id": household_id,
            "last_logged_in": format_datetime(now),
            "email": user["email"],
            "username": user["username"]
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
# adding unregistered smart plugs to tuyaconnect.py
# ========================
@app.post("/admin/appliances/add-unregistered")
def add_unregistered_appliance(data: UnregisteredAppliance):
    appliances = db["appliances"]
    existing = appliances.find_one({"device_id": data.device_id})

    if existing:
        raise HTTPException(status_code=400, detail="Device ID already exists in database")

    appliances.insert_one({
        "household_id": data.household_id,
        "device_id": data.device_id,
        "appliance_name": data.appliance_name,
        "appliance_type": data.appliance_type,
        "location": data.location,
        "registered": False,
        "created_at": datetime.datetime.now(datetime.timezone.utc)
    })
    return {"message": f"Unregistered appliance {data.device_id} added successfully"}

# ========================
# Update registered/unregistered smart plug
# ========================
@app.put("/admin/appliances/{device_id}")
def admin_update_appliance(device_id: str, data: UnregisteredAppliance):
    appliances = db["appliances"]

    update_fields = {
        k: v for k, v in data.dict().items() if v is not None and k != "device_id"
    }

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_fields["updated_at"] = datetime.datetime.now(datetime.timezone.utc)

    result = appliances.update_one(
        {"device_id": device_id},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Smart plug not found")

    return {"message": f"Smart plug {device_id} updated successfully"}


# ========================
# Delete registered/unregistered smart plug
# ========================
@app.delete("/admin/appliances/{device_id}")
def admin_delete_appliance(device_id: str):
    appliances = db["appliances"]

    result = appliances.delete_one({"device_id": device_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Smart plug not found")

    return {"message": f"Smart plug {device_id} deleted successfully"}

# ========================
# DELETING USERS
# ========================

@app.delete("/admin/users/{email}")
def delete_user(email: str = Path(..., description="Email of the user to delete")):
    try:
        email = email.lower().strip()
        users_col = db["users"]
        households_col = db["households"]

        # Find the user first
        user = users_col.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail=f"User '{email}' not found")

        # Extract the user's household_id (if any)
        household_id = user.get("household_id")

        # Delete the user
        result = users_col.delete_one({"email": email})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"User '{email}' not found or already deleted")

        # If this household has no more users, delete it too
        household_deleted = False
        if household_id:
            remaining_users = users_col.count_documents({"household_id": household_id})
            if remaining_users == 0:
                households_col.delete_one({"household_id": household_id})
                household_deleted = True

        # Return structured response
        return {
            "message": f"User '{email}' deleted successfully",
            "household_deleted": household_deleted
        }

    except errors.PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# ========================
# COMPLETE ADMIN ANALYTICS ENDPOINTS
# ========================

@app.get("/admin/analytics")
def get_admin_analytics():
    """Admin analytics summary with user/device/energy stats"""
    try:
        users = db["users"]
        appliances = db["appliances"]
        daily_totals = db["daily_totals"]

        total_users = users.count_documents({})
        total_devices = appliances.count_documents({})

        # ✅ Sum total kWh from daily_totals collection
        total_energy_pipeline = [
            {"$group": {"_id": None, "total_kwh": {"$sum": "$total_kwh"}}}
        ]
        total_energy_result = list(daily_totals.aggregate(total_energy_pipeline))

        total_energy = (
            total_energy_result[0]["total_kwh"] if total_energy_result else 0
        )

        # ✅ Compute average kWh per user
        avg_kwh_per_user = (
            round(total_energy / total_users, 4) if total_users > 0 else 0
        )

        return {
            "total_users": total_users,
            "total_devices": total_devices,
            "total_energy_kwh": round(total_energy, 4),
            "average_kwh_per_user": avg_kwh_per_user,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/devices")
def get_all_devices():
    """
    Admin: Fetch all devices from appliances and merge with current_totals for their active/inactive status.
    """
    try:
        appliances_col = db["appliances"]

        devices = list(appliances_col.aggregate([
            {
                "$lookup": {
                    "from": "current_totals",      # Join with current_totals
                    "localField": "device_id",     # Match by device_id
                    "foreignField": "device_id",
                    "as": "status_info"
                }
            },
            {
                "$addFields": {
                    "status": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$status_info.status", 0]},  # take the first match
                            "unknown"  # default if not found
                        ]
                    }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "device_id": 1,
                    "device_name": 1,
                    "appliance_name": 1,
                    "appliance_type": 1,
                    "household_id": 1,
                    "location": 1,
                    "registered": 1,
                    "status": 1
                }
            }
        ]))

        print(f"DEBUG: Found {len(devices)} devices (joined with status)")

        return {
            "devices": devices,
            "total_devices": len(devices)
        }

    except Exception as e:
        print(f"ERROR in /admin/devices: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching devices: {str(e)}")



@app.get("/admin/energy-breakdown")
def get_energy_breakdown_by_household():
    """
    Admin: Get detailed energy breakdown grouped by household.
    Returns each household with its users and their individual energy consumption.
    Aggregates directly from daily_totals using household_id.
    """
    try:
        users_collection = db["users"]
        daily_totals = db["daily_totals"]

        # Get all users with their household_id
        all_users = list(users_collection.find(
            {}, 
            {"_id": 0, "email": 1, "username": 1, "household_id": 1}
        ))

        print(f"DEBUG: Found {len(all_users)} users")

        # Group users by household_id
        households = {}
        for user in all_users:
            household_id = user.get("household_id", "Unknown")
            if household_id not in households:
                households[household_id] = []
            households[household_id].append(user)

        # Aggregate energy consumption directly by household_id from daily_totals
        household_energy_pipeline = [
            {
                "$group": {
                    "_id": "$household_id",
                    "total_kwh": {"$sum": "$total_kwh"}
                }
            }
        ]
        household_energy_result = list(daily_totals.aggregate(household_energy_pipeline))
        
        # Create a dictionary for quick lookup
        household_energy_map = {
            h["_id"]: h["total_kwh"] 
            for h in household_energy_result 
            if h["_id"] is not None
        }

        print(f"DEBUG: Energy by household: {household_energy_map}")

        # Build result with household energy data
        result = []
        for household_id, users in households.items():
            # Get total energy for this household
            total_household_kwh = household_energy_map.get(household_id, 0)
            
            household_data = {
                "household_id": household_id,
                "users": [],
                "total_household_kwh": round(total_household_kwh, 4),
                "user_count": len(users)
            }

            # For each user in the household, calculate their individual energy
            for user in users:
                user_email = user["email"]
                
                # Sum energy for this specific user in this household
                user_energy_pipeline = [
                    {
                        "$match": {
                            "household_id": household_id,
                            "email": user_email
                        }
                    },
                    {
                        "$group": {
                            "_id": None,
                            "total_kwh": {"$sum": "$total_kwh"}
                        }
                    }
                ]
                user_energy_result = list(daily_totals.aggregate(user_energy_pipeline))
                user_total_kwh = user_energy_result[0]["total_kwh"] if user_energy_result else 0

                print(f"DEBUG: User {user_email} in household {household_id}: {user_total_kwh} kWh")

                household_data["users"].append({
                    "email": user["email"],
                    "username": user.get("username", "N/A"),
                    "total_kwh": round(user_total_kwh, 4)
                })

            # Calculate average per user in household
            household_data["average_kwh_per_user"] = (
                round(household_data["total_household_kwh"] / household_data["user_count"], 4)
                if household_data["user_count"] > 0 else 0
            )

            result.append(household_data)

        # Sort by household_id for consistent ordering
        result.sort(key=lambda x: str(x["household_id"]))

        print(f"DEBUG: Returning {len(result)} households")
        for h in result:
            print(f"  Household {h['household_id']}: {h['total_household_kwh']} kWh, {h['user_count']} users")

        return {
            "households": result,
            "total_households": len(result)
        }

    except Exception as e:
        import traceback
        print(f"ERROR in /admin/energy-breakdown: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching energy breakdown: {str(e)}"
        )


@app.get("/admin/household-energy-details")
def get_household_energy_details(household_id: str):
    """
    Admin: Get detailed daily, weekly, and monthly energy breakdown for a specific household.
    Shows ALL available data, not just recent periods.
    """
    try:
        # Get registered devices for the household
        registered_devices = get_registered_device_ids(household_id)
        
        if not registered_devices:
            return {
                "household_id": household_id,
                "daily": [],
                "weekly": [],
                "monthly": [],
                "message": "No registered devices found"
            }

        # Daily energy data (ALL days)
        daily_pipeline = [
            {
                "$match": {
                    "household_id": household_id,
                    "device_id": {"$in": registered_devices}
                }
            },
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                    "total_kwh": {"$sum": "$total_kwh"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        daily_result = list(db["daily_totals_per_plug"].aggregate(daily_pipeline))
        daily_data = [{"date": item["_id"], "kwh": round(item["total_kwh"], 4)} for item in daily_result]

        # Weekly energy data (ALL weeks)
        weekly_pipeline = [
            {
                "$match": {
                    "household_id": household_id,
                    "device_id": {"$in": registered_devices}
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$isoWeekYear": "$date"},
                        "week": {"$isoWeek": "$date"}
                    },
                    "total_kwh": {"$sum": "$total_kwh"}
                }
            },
            {"$sort": {"_id.year": 1, "_id.week": 1}}
        ]
        weekly_result = list(db["daily_totals_per_plug"].aggregate(weekly_pipeline))
        weekly_data = []
        for item in weekly_result:
            year, week = item["_id"]["year"], item["_id"]["week"]
            try:
                week_start = datetime.datetime.strptime(f"{year}-{week}-1", "%G-%V-%u").date()
                week_end = week_start + datetime.timedelta(days=6)
                weekly_data.append({
                    "week_start": week_start.strftime("%Y-%m-%d"),
                    "week_end": week_end.strftime("%Y-%m-%d"),
                    "kwh": round(item["total_kwh"], 4)
                })
            except ValueError:
                # Handle edge cases in week calculation
                continue

        # Monthly energy data (ALL months)
        monthly_pipeline = [
            {
                "$match": {
                    "household_id": household_id,
                    "device_id": {"$in": registered_devices}
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$date"},
                        "month": {"$month": "$date"}
                    },
                    "total_kwh": {"$sum": "$total_kwh"}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        monthly_result = list(db["daily_totals_per_plug"].aggregate(monthly_pipeline))
        monthly_data = [{
            "month": f"{item['_id']['year']}-{item['_id']['month']:02d}",
            "kwh": round(item["total_kwh"], 4)
        } for item in monthly_result]

        return {
            "household_id": household_id,
            "daily": daily_data,
            "weekly": weekly_data,
            "monthly": monthly_data,
            "total_registered_devices": len(registered_devices),
            "total_days": len(daily_data),
            "total_weeks": len(weekly_data),
            "total_months": len(monthly_data)
        }

    except Exception as e:
        import traceback
        print(f"ERROR in /admin/household-energy-details: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching household energy details: {str(e)}"
        )
    
@app.get("/admin/households")
def get_all_households():
    # --- Get distinct household IDs from both collections ---
    users_collection = db["users"]
    user_households = users_collection.distinct("household_id")

    # --- Merge and clean up ---
    all_households = set(user_households)
    all_households = [h for h in all_households if h and isinstance(h, str)]

    # --- Sort alphabetically for better dropdown UX ---
    all_households.sort()

    # --- Return consistent format ---
    return {"households": [{"household_id": h} for h in all_households]}

@app.get("/admin/all-households-energy-summary")
def get_all_households_energy_summary():
    """
    Admin: Get comprehensive energy summary for all households including daily, weekly, monthly breakdowns.
    """
    try:
        # First get the basic household breakdown
        breakdown_response = get_energy_breakdown_by_household()
        households = breakdown_response["households"]
        
        # Enhance each household with detailed energy breakdowns
        enhanced_households = []
        for household in households:
            household_id = household["household_id"]
            
            # Get detailed energy data for this household
            try:
                details_response = get_household_energy_details(household_id)
                household["energy_details"] = details_response
            except Exception as e:
                print(f"Warning: Could not fetch details for household {household_id}: {e}")
                household["energy_details"] = {
                    "daily": [],
                    "weekly": [],
                    "monthly": [],
                    "error": str(e)
                }
            
            enhanced_households.append(household)
        
        return {
            "households": enhanced_households,
            "total_households": len(enhanced_households)
        }
        
    except Exception as e:
        import traceback
        print(f"ERROR in /admin/all-households-energy-summary: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching all households energy summary: {str(e)}"
        )

# ========================
# DEBUG ENDPOINTS (REMOVE IN PRODUCTION)
# ========================

@app.get("/admin/debug/daily-totals-sample")
def get_daily_totals_sample():
    """Debug endpoint: Get a sample document from daily_totals to understand structure"""
    try:
        daily_totals = db["daily_totals"]
        sample = daily_totals.find_one({})
        
        if sample:
            # Remove _id for cleaner output
            sample.pop("_id", None)
            
        return {
            "sample_document": sample,
            "total_documents": daily_totals.count_documents({}),
            "message": "Check what fields are available in your daily_totals collection"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/debug/collections-info")
def get_collections_info():
    """Debug endpoint: Get information about all collections"""
    try:
        collections_info = {}
        
        # Check daily_totals
        daily_totals = db["daily_totals"]
        dt_sample = daily_totals.find_one({})
        if dt_sample:
            dt_sample.pop("_id", None)
        collections_info["daily_totals"] = {
            "count": daily_totals.count_documents({}),
            "sample_fields": list(dt_sample.keys()) if dt_sample else [],
            "sample_document": dt_sample
        }
        
        # Check appliances
        appliances = db["appliances"]
        app_sample = appliances.find_one({})
        if app_sample:
            app_sample.pop("_id", None)
        collections_info["appliances"] = {
            "count": appliances.count_documents({}),
            "sample_fields": list(app_sample.keys()) if app_sample else [],
            "sample_document": app_sample
        }
        
        # Check users
        users = db["users"]
        user_sample = users.find_one({})
        if user_sample:
            user_sample.pop("_id", None)
            # Remove password for security
            user_sample.pop("password", None)
        collections_info["users"] = {
            "count": users.count_documents({}),
            "sample_fields": list(user_sample.keys()) if user_sample else [],
            "sample_document": user_sample
        }
        
        return collections_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================
# USER PROFILE ENDPOINTS
# ========================

class UserProfileResponse(BaseModel):
    email: str
    username: str

class UpdateProfileRequest(BaseModel):
    username: str
    current_password: str = None  # For password changes
    new_password: str = None

@app.get("/user/profile")
def get_user_profile(email: str = Query(..., description="User email")):
    try:
        users = db["users"]
        user = users.find_one({"email": email.lower().strip()}, {"_id": 0, "email": 1, "username": 1})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except errors.PyMongoError:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.put("/user/profile")
def update_user_profile(req: UpdateProfileRequest, email: str = Query(..., description="User email")):
    try:
        users = db["users"]
        
        # Find user
        user = users.find_one({"email": email.lower().strip()})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = {"username": req.username.strip()}
        
        # If password change is requested
        if req.new_password:
            if not req.current_password:
                raise HTTPException(status_code=400, detail="Current password is required to change password")
            
            # Verify current password
            if not bcrypt.verify(req.current_password, user["password"]):
                raise HTTPException(status_code=401, detail="Current password is incorrect")
            
            # Hash new password
            update_data["password"] = bcrypt.hash(req.new_password)
        
        # Update user
        result = users.update_one(
            {"email": email.lower().strip()},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return {"message": "No changes detected"}
        
        return {"message": "Profile updated successfully"}
        
    except HTTPException as e:
        raise e
    except errors.PyMongoError:
        raise HTTPException(status_code=500, detail="Database error")
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
def register_appliance(appliance: ApplianceCreate, household_id: str = Query(...)):
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
def list_appliances(household_id: str = Query(...)):
    """List all appliances for this household"""
    try:
        appliances = db["appliances"]
        docs = list(appliances.find({"household_id": household_id, "registered": True}))
        return {"appliances": clean_docs(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing appliances: {str(e)}")


@app.put("/appliances/{device_id}")
def update_appliance(device_id: str, updates: ApplianceUpdate, household_id: str = Query(...)):
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
def delete_appliance(device_id: str, household_id: str = Query(...)):
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
def list_unregistered_devices(household_id: str = Query(...)):
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
def get_device_status(device_name: str, household_id: str = Query(...)):
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
def get_household_daily_total(date: str = None, household_id: str = Query(...)):
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
def get_daily_total(device_name: str, date: str = None, household_id: str = Query(...)):
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
def get_daily_total(device_name: str, date: str = None, household_id: str = Query(...)):
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
def get_energy_summary(household_id: str = Query(...)):
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
def get_daily_history(device_name: str,start: str = Query(...),end: str = Query(...),household_id: str = Query(...)):
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
def get_household_history(start: str = Query(...),end: str = Query(...),household_id: str = Query(...)):
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
def get_weekly_total_household(limit: int = Query(None, ge=1), household_id: str = Query(...)):
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
def get_weekly_total(device_name: str, limit: int = Query(None, ge=1), household_id: str = Query(...)):
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
def get_monthly_total_household(limit: int = Query(None, ge=1), household_id: str = Query(...)):
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
def get_monthly_total(device_name: str, limit: int = Query(None, ge=1), household_id: str = Query(...)):
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
def get_recent_weekly_household(household_id: str = Query(...)):
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
def get_recent_weekly(device_name: str, household_id: str = Query(...)):
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
def get_recent_monthly_household(household_id: str = Query(...)):
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
def get_recent_monthly(device_name: str, household_id: str = Query(...)):
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


