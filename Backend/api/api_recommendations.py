from fastapi import APIRouter, HTTPException, Query
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv
import os
from collections import defaultdict

# ========================
# ENV + DB SETUP
# ========================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, "secrets.env"))

router = APIRouter()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["homesense_db"]

# Collections
appliances_collection = db["appliances"]
daily_totals_per_plug_collection = db["daily_totals_per_plug"]
households_collection = db["households"]

# ==========================
# Helper: Generate Recommendations
# ==========================
def generate_recommendations(appliances, mode):
    recs = []
    base_thresholds = {"high": 1, "medium": 3.5, "low": 5}  
    base_thr = base_thresholds.get(mode, 3.5)

    # Multipliers per appliance type (so smaller devices get lower thresholds)
    type_multipliers = {
        "Air Conditioner": 1.0,
        "Electric Fan": 0.3,
        "Refrigerator": 0.5,
        "Washing Machine": 0.4,
        "Television": 0.2,
        "Microwave": 0.3,
        "Toaster": 0.1,
        "Coffee Maker": 0.2,
        "Blender": 0.1,
        "Other": 1.0
    }

    for app in appliances:
        name = app.get("appliance_name", "Unknown appliance")
        kwh = app.get("total_kwh", 0)
        a_type = app.get("appliance_type", "")
        location = app.get("location", "unspecified area")

        # Determine multiplier for this appliance type
        multiplier = type_multipliers.get(a_type, 1.0)
        effective_thr = base_thr * multiplier

        # --- HIGH SAVINGS MODE ---
        if mode == "high":
            # If usage is above effective threshold
            if kwh > effective_thr:
                recs.append(f"{name} in {location} uses {kwh:.1f} kWh, above threshold {effective_thr:.1f}. Consider reducing usage or upgrading to a more efficient model.")
            # Appliance-specific advice
            if a_type == "Air Conditioner":
                recs.append(f"Set your {name} to around 24 °C and limit usage during 6–10 PM peak hours.")
            elif a_type == "Refrigerator":
                recs.append(f"Defrost your {name} regularly and avoid overpacking it.")
            elif a_type == "Electric Fan":
                recs.append(f"Turn off your {name} when not in use.")
            elif a_type == "Washing Machine":
                recs.append(f"Run full loads and avoid using your {name} during peak hours.")
            elif a_type == "Television":
                recs.append(f"Turn off your {name} when not watching and reduce brightness settings.")
            elif a_type == "Microwave":
                recs.append(f"Use your {name} only when needed and unplug it when idle.")

        # --- MEDIUM SAVINGS MODE ---
        elif mode == "medium":
            if kwh > effective_thr:
                recs.append(f"{name} in {location} is using more than {effective_thr:.1f} kWh — try shifting its use to off-peak hours.")
            # Some device-based tips even when under threshold
            if a_type == "Air Conditioner":
                recs.append(f"In medium mode: reduce AC runtime by 15–20% or use fan + AC combo.")
            elif a_type == "Refrigerator":
                recs.append(f"Check your {name}'s gasket and clean coils to reduce its energy usage.")
            elif a_type == "Washing Machine":
                recs.append(f"Use eco cycle for {name}, and skip small loads.")
            elif a_type == "Television":
                recs.append(f"Enable sleep mode or auto turn-off on your {name}.")
            elif a_type == "Lighting":
                recs.append(f"Use LED bulbs and avoid leaving lights on in empty rooms.")

        # --- LOW SAVINGS MODE ---
        elif mode == "low":
            if kwh > effective_thr:
                recs.append(f"{name} in {location} uses a bit more than {effective_thr:.1f} kWh/day. Try turning it off when idle.")
            elif kwh == 0:
                recs.append(f"Unplug idle appliances like {name} in {location} to avoid standby drain.")
            # Even if kwh is low, give light suggestions
            if a_type == "Air Conditioner":
                recs.append(f"In low mode, run AC in “eco” or “sleep” mode if available for {name}.")
            elif a_type == "Refrigerator":
                recs.append(f"Don't overload your {name} — leave room inside for air circulation.")
            elif a_type == "Television":
                recs.append(f"Turn off your {name} instead of using standby mode.")

        # Fallback: if nothing was added yet
        if not any(name in r for r in recs):
            recs.append(f"Monitor your {name} in {location} regularly for efficient use.")

    # Remove duplicate messages
    recs = list(set(recs))
    return recs


# ==========================
# API ROUTES
# ==========================

@router.put("/household/{household_id}/mode")
def set_savings_mode(household_id: str, mode: str):
    if mode not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Choose from low, medium, or high.")
    
    households_collection.update_one(
        {"household_id": household_id},
        {"$set": {"savings_mode": mode}},
        upsert=True
    )
    return {"message": f"Savings mode set to '{mode}' for household '{household_id}'."}

@router.get("/recommendations/{household_id}")
def get_recommendations(household_id: str, device_id: str = Query(None, description="Optional device_id to get single-appliance recommendations")):
    # Step 1: Get mode
    household = households_collection.find_one({"household_id": household_id})
    if not household or "savings_mode" not in household:
        raise HTTPException(status_code=400, detail="Please set your savings mode first.")
    mode = household["savings_mode"]

    # Step 2: Fetch data
    query = {"household_id": household_id}
    if device_id:
        query["device_id"] = device_id

    data = list(daily_totals_per_plug_collection.find(query))
    if not data:
        raise HTTPException(status_code=404, detail="No energy data found for this household or device.")

    # Step 3: Merge by device_id (get average or latest kWh)
    merged_data = {}
    for entry in data:
        did = entry["device_id"]
        if did not in merged_data:
            merged_data[did] = entry
        else:
            merged_data[did]["total_kwh"] += entry.get("total_kwh", 0)

    # Step 4: Add appliance info (name, type, location)
    registered_appliances = {}
    skipped_count = 0

    for did, record in merged_data.items():
        app = appliances_collection.find_one({"device_id": did})
        # Check if the appliance exists and is registered
        if app and app.get("registered", False) is True:
            record["appliance_name"] = app.get("appliance_name")
            record["appliance_type"] = app.get("appliance_type")
            record["location"] = app.get("location", "unspecified area")
            registered_appliances[did] = record
        else:
            skipped_count += 1  # Count unregistered ones
    appliances = list(registered_appliances.values())

    # Step 5: Generate recommendations
    recs = generate_recommendations(appliances, mode)

    return {
        "household_id": household_id,
        "savings_mode": mode,
        "device_id": device_id or "all",
        "generated_at": datetime.now().isoformat(),
        "recommendations": recs,
        "skipped_unregistered": skipped_count
    }

