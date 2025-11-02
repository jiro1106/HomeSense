from fastapi import APIRouter, HTTPException, Query
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os

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
    """Generate structured recommendations per appliance with multi-level thresholds and prioritized impact."""
    all_recs = []

    # Multi-level thresholds per savings mode
    mode_thresholds = {
        "strict": {"low": 1.0, "high": 1.5},
        "balanced": {"low": 3.0, "high": 4.0},
        "relaxed": {"low": 5.0, "high": 6.0}
    }

    # Appliance type multipliers
    type_multipliers = {
        "Air Conditioner": 1.0,
        "Electric Fan": 0.3,
        "Refrigerator": 0.5,
        "Washing Machine": 0.4,
        "Television": 0.2,
        "Computer": 0.4,
        "Router/WiFi": 0.1,
        "Other": 1.0
    }

    # Context-aware tips per appliance type
    appliance_tips = {
    "Air Conditioner": {
        "high": "Try setting your AC to around 24 °C and limit use during 6–10 PM peak hours.",
        "medium": "Use a fan together with your AC to cool faster and save energy.",
        "low": "Great job! Your AC usage is already efficient, keep it up!"
    },
    "Refrigerator": {
        "high": "Defrost regularly and avoid overpacking to help cooling efficiency.",
        "medium": "Check the door seal and clean coils to reduce power use.",
        "low": "Your fridge is running efficiently, maintain good spacing and temperature settings!"
    },
    "Electric Fan": {
        "high": "Turn off the fan when not in use to save energy.",
        "medium": "Use your fan with an AC for faster cooling and shorter AC time.",
        "low": "Good job managing your fan usage efficiently."
    },
    "Washing Machine": {
        "high": "Run full loads and avoid using it during peak hours.",
        "medium": "Use the eco cycle and avoid washing small loads frequently.",
        "low": "Efficient washing habits detected, great work!"
    },
    "Television": {
        "high": "Turn off when not watching and lower brightness to save power.",
        "medium": "Enable sleep mode or auto power-off when idle.",
        "low": "Nice! Your TV power usage is already efficient."
    },
    "Microwave": {
        "high": "Use only when needed and unplug when idle to save power.",
        "medium": "Avoid reheating multiple times, plan cooking efficiently.",
        "low": "Your microwave usage looks efficient, keep it up!"
    },
    "Router/WiFi": {
        "high": "Turn off your router when not in use or overnight to save energy.",
        "medium": "Limit the number of connected devices during peak hours.",
        "low": "Your router’s energy usage is already optimized, great job!"
    },
    "Computer": {
        "high": "Shut down or sleep your computer when not in use for long periods.",
        "medium": "Try reducing screen brightness and close unused applications.",
        "low": "Your computer power habits are efficient, keep doing what you’re doing!"
    },
    "Other": {
        "high": "Turn off and unplug devices when not in use.",
        "medium": "Avoid leaving devices on standby for long periods.",
        "low": "Energy use looks efficient for this device, nice work!"
    }
}


    # Sort appliances by total kWh (highest impact first)
    appliances = sorted(appliances, key=lambda x: x.get("total_kwh", 0), reverse=True)

    for app in appliances:
        name = app.get("appliance_name", "Unknown appliance")
        kwh = app.get("total_kwh", 0)
        a_type = app.get("appliance_type", "Other")
        location = app.get("location", "unspecified area")

        multiplier = type_multipliers.get(a_type, 1.0)
        low_thr = mode_thresholds[mode]["low"] * multiplier
        high_thr = mode_thresholds[mode]["high"] * multiplier

        app_recs = []

        # Multi-level threshold logic
        if kwh > high_thr:
            app_recs.append(
                f"Your {a_type} in {location} is using a high amount of energy ({kwh:.1f} kWh). Try to limit its use or switch it off when not needed."
            )
        elif kwh > low_thr:
            app_recs.append(
                 f"Your {a_type} in {location} is using slightly more energy than expected ({kwh:.1f} kWh). Try to shorten its usage time a bit to save more."
            )
        elif kwh == 0:
            app_recs.append(
                 f"Your {a_type} in {location} is currently off or not consuming energy. Great job on saving electricity!"
            )
        else:
            app_recs.append(f"Good job! Your {a_type} in {location} is running efficiently ({kwh:.1f} kWh). Great job on your energy-saving habits!"
            )

        # Add context-aware appliance-specific tips
        tip = appliance_tips.get(a_type, {}).get(mode)
        if tip:
            app_recs.append(tip)

        all_recs.append({
            "appliance_name": name,
            "appliance_type": a_type,
            "location": location,
            "total_kwh": kwh,
            "recommendations": list(set(app_recs))
        })

    return all_recs


# ==========================
# API ROUTES
# ==========================

from datetime import datetime, timedelta
from fastapi import HTTPException

@router.put("/household/{household_id}/provider")
def set_electricity_provider(household_id: str, provider: str):
    """
    Updates a household's electricity provider with cooldown control.
    Returns when the user can switch again if still on cooldown.
    Example: PUT /household/household1/provider?provider=BATELEC
    """
    try:
        valid_providers = ["BATELEC", "MERALCO"]
        cooldown_days = 15  # ⏳ adjust if you want 30 days

        if provider not in valid_providers:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid provider. Choose from {', '.join(valid_providers)}."
            )

        household = households_collection.find_one({"household_id": household_id})

        # 🆕 If household does not exist, create it
        if not household:
            households_collection.insert_one({
                "household_id": household_id,
                "electricity_provider": provider,
                "last_switch_date": datetime.utcnow()
            })
            return {
                "message": f"New household created with provider {provider.upper()}.",
                "next_switch_date": (datetime.utcnow() + timedelta(days=cooldown_days)).isoformat()
            }

        # 🕒 Cooldown check
        last_switch = household.get("last_switch_date")
        if last_switch:
            if isinstance(last_switch, str):
                last_switch = datetime.fromisoformat(last_switch)
            diff_days = (datetime.utcnow() - last_switch).days

            if diff_days < cooldown_days:
                next_switch_date = last_switch + timedelta(days=cooldown_days)
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": f"You can only change your provider every {cooldown_days} days.",
                        "days_remaining": cooldown_days - diff_days,
                        "next_switch_date": next_switch_date.isoformat()
                    }
                )

        # ✅ Passed cooldown — update provider
        households_collection.update_one(
            {"household_id": household_id},
            {
                "$set": {
                    "electricity_provider": provider,
                    "last_switch_date": datetime.utcnow()
                }
            },
            upsert=True
        )

        return {
            "message": f"Electricity provider set to {provider.upper()} for Household ID: {household_id}",
            "next_switch_date": (datetime.utcnow() + timedelta(days=cooldown_days)).isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")



@router.get("/household/{household_id}/provider")
def get_electricity_provider(household_id: str):
    """
    Retrieves the saved electricity provider and next eligible switch date.
    Example: GET /household/household1/provider
    """
    try:
        cooldown_days = 15
        household = households_collection.find_one({"household_id": household_id})
        if not household:
            raise HTTPException(status_code=404, detail="Household not found.")

        provider = household.get("electricity_provider", None)
        last_switch = household.get("last_switch_date")

        next_switch_date = None
        if last_switch:
            if isinstance(last_switch, str):
                last_switch = datetime.fromisoformat(last_switch)
            next_switch_date = (last_switch + timedelta(days=cooldown_days)).isoformat()

        return {
            "provider": provider,
            "last_switch_date": last_switch.isoformat() if last_switch else None,
            "next_switch_date": next_switch_date,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
@router.put("/household/{household_id}/mode")
def set_savings_mode(household_id: str, mode: str):

    if mode not in ["relaxed", "balanced", "strict"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Choose from relaxed, balanced, or strict.")

    result = households_collection.update_one(
        {"household_id": household_id},
        {"$set": {"savings_mode": mode}},
        upsert=True
    )
    if result.matched_count == 0:
        return {
            "message": f"Household not found. Created new entry with mode {mode.upper()}."
        }

    return {
        "message": f"Savings mode set to {mode.upper()} for household {household_id}."
    }

@router.get("/household/{household_id}/mode")
def get_savings_mode(household_id: str):
    household = households_collection.find_one({"household_id": household_id})
    if not household:
        raise HTTPException(status_code=404, detail="Household not found.")

    mode = household.get("savings_mode", "balanced")  # default to 'medium' if not set
    return {"mode": mode}


@router.get("/recommendations/{household_id}")
def get_recommendations(household_id: str, device_id: str = Query(None, description="Optional device_id to get single-appliance recommendations")):
    # Step 1: Get mode
    household = households_collection.find_one({"household_id": household_id})
    if not household or "savings_mode" not in household:
        raise HTTPException(status_code=400, detail="Please set your savings mode first.")
    mode = household["savings_mode"]

    # Step 2: Fetch data
    ph_tz = timezone(timedelta(hours=8))
    today = datetime.now(ph_tz).date()
    start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=ph_tz)
    end_of_day = datetime.combine(today, datetime.max.time(), tzinfo=ph_tz)

    query = {
        "household_id": household_id,
        "date": {"$gte": start_of_day, "$lte": end_of_day}
    }
    if device_id:
        query["device_id"] = device_id

    data = list(daily_totals_per_plug_collection.find(query))
    if not data:
        raise HTTPException(status_code=404, detail="No energy data found for this household or device.")

    # Step 3: Merge by device_id
    merged_data = {}
    for entry in data:
        did = entry["device_id"]
        if did not in merged_data:
            merged_data[did] = {
                "device_id": did,
                "household_id": entry["household_id"],
                "total_kwh": entry.get("total_kwh", 0),
                "date": entry.get("date")
            }
        else:
            merged_data[did]["total_kwh"] += entry.get("total_kwh", 0)


    # Step 4: Add appliance info
    registered_appliances = []
    skipped_count = 0

    for did, record in merged_data.items():
        app = appliances_collection.find_one({"device_id": did})
        if app and app.get("registered", False) is True:
            record["appliance_name"] = app.get("appliance_name")
            record["appliance_type"] = app.get("appliance_type")
            record["location"] = app.get("location", "unspecified area")
            registered_appliances.append(record)
        else:
            skipped_count += 1

    # Step 5: Generate structured recommendations
    recs = generate_recommendations(registered_appliances, mode)

    total_appliances = len(recs)
    below_threshold = 0

    for r in recs:
    # Count "below threshold" messages
        for msg in r["recommendations"]:
            if "below the threshold" in msg or "Great job" in msg:
                below_threshold += 1
                break  # only count once per appliance
     # Compute efficiency score (percentage)
    efficiency_score = round((below_threshold / total_appliances) * 100, 1) if total_appliances > 0 else 0

    # User-friendly message
    if efficiency_score >= 80:
        summary_msg = f"You're doing great! {below_threshold} out of {total_appliances} appliances are within efficient usage levels.🌱"
        status="good"
    elif efficiency_score >= 50:
        summary_msg = f"Moderate efficiency. {below_threshold} of {total_appliances} appliances are below threshold, there is room for improvement.⚖️"
        status="moderate"
    else:
        summary_msg = f"Energy usage is " + "HIGH" + f". Only {below_threshold} of {total_appliances} appliances are within efficient range. ⚠️"
        status="high"

    return {
        "household_id": household_id,
        "savings_mode": mode,
        "device_id": device_id or "all",
        "generated_at": datetime.now().isoformat(),
        "recommendations": recs,
        "performance_summary": {
            "checked_appliances": total_appliances,
            "below_threshold": below_threshold,
            "efficiency_score": efficiency_score,
            "summary_message": summary_msg,
            "status": status
        },
        "skipped_unregistered": skipped_count
    }
