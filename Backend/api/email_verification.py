from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import logging
from passlib.hash import bcrypt
from requests.exceptions import RequestException
import requests

# Initialize router
router = APIRouter()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================
# Load environment variables
# ==========================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, "secrets.env"))

MONGO_URI = os.getenv("MONGO_URI")

# ==========================
# MongoDB setup
# ==========================
client = MongoClient(MONGO_URI)
db = client["homesense_db"]

# ==========================
# Models
# ==========================
class EmailRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class SignupRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    household_id: str = None


# ==========================
# Helper function to send email
# ==========================
def send_email(to_email: str, verification_code: str) -> bool:
    """
    Send verification email using Brevo SMTP API (HTTP). Returns True on success.
    This version logs Brevo response body to help debug 4xx/5xx errors.
    """
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        logger.error("BREVO_API_KEY not set")
        raise HTTPException(status_code=500, detail="Email provider not configured")

    url = "https://api.brevo.com/v3/smtp/email"
    subject = "HomeSense Email Verification"
    text_content = f"""Your HomeSense verification code is: {verification_code}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.
"""
    payload = {
        "sender": {"name": "HomeSense", "email": "app.homesense@gmail.com"},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_content
    }

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
    except RequestException as e:
        logger.error(f"❌ HTTP error when calling Brevo: {e}")
        raise HTTPException(status_code=500, detail=f"Email provider request failed: {e}")

    # Log status and body for debugging
    logger.info(f"Brevo response status: {resp.status_code}")
    try:
        logger.info(f"Brevo response body: {resp.text}")
    except Exception:
        logger.info("Brevo response body could not be read")

    if resp.status_code == 201 or resp.status_code == 200:
        logger.info("✅ Email sent successfully via Brevo")
        return True
    elif resp.status_code == 401:
        raise HTTPException(status_code=500, detail="Email provider unauthorized (401). Check your API key.")
    else:
        # include body to assist debugging (it is logged above)
        raise HTTPException(status_code=500, detail=f"Email sending failed: {resp.status_code}")


# ==========================
# Helper function to generate unique household ID
# ==========================
def generate_unique_household_id():
    """Generate a unique household ID (household1, household2, etc.)"""
    # Get all existing household IDs
    all_users = db.users.find({}, {"household_id": 1})
    existing_ids = set()
    
    for user in all_users:
        hid = user.get("household_id")
        if hid and hid.startswith("household"):
            try:
                # Extract number from household ID (e.g., "household5" -> 5)
                num = int(hid.replace("household", ""))
                existing_ids.add(num)
            except ValueError:
                pass
    
    # Find the next available number
    next_num = 1
    while next_num in existing_ids:
        next_num += 1
    
    return f"household{next_num}"


# ==========================
# ROUTES
# ==========================

@router.post("/send-verification")
def send_verification_code(req: EmailRequest):
    """Send 6-digit verification code to user's email"""
    
    logger.info(f"📨 Verification request for: {req.email}")
    
    # Normalize email
    email = req.email.strip().lower()
    
    # Check if email is already fully registered
    existing_user = db.users.find_one({"email": email, "is_completed": True})
    if existing_user:
        logger.warning(f"⚠️ Email already registered: {email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate 6-digit code
    verification_code = random.randint(100000, 999999)
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    logger.info(f"🎲 Generated code for {email}: {verification_code}")

    # Store in database
    try:
        db.users.update_one(
            {"email": email},
            {"$set": {
                "verification_code": str(verification_code), 
                "is_verified": False,
                "is_completed": False,
                "verification_code_expires": expires_at,
                "created_at": datetime.utcnow()
            }},
            upsert=True,
        )
        logger.info(f"💾 Stored verification code in database for {email}")
    except Exception as e:
        logger.error(f"❌ Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to store verification code")

    # Send email
    send_email(email, verification_code)

    logger.info(f"✅ Verification code sent to {email}")
    return {"message": "Verification code sent successfully"}


@router.post("/verify-code")
def verify_code(req: VerifyCodeRequest):
    """Verify the 6-digit code sent to user's email"""
    email = req.email.strip().lower()
    logger.info(f"🔍 Verifying code for: {email}")
    
    user = db.users.find_one({"email": email})
    if not user:
        logger.warning(f"⚠️ User not found: {email}")
        raise HTTPException(
            status_code=404, 
            detail="User not found. Please request a new verification code."
        )

    # Check if code has expired
    if user.get("verification_code_expires") and user["verification_code_expires"] < datetime.utcnow():
        logger.warning(f"⚠️ Verification code expired for {email}")
        raise HTTPException(
            status_code=400, 
            detail="Verification code has expired. Please request a new one."
        )

    # Verify code matches
    if user.get("verification_code") == req.code:
        logger.info(f"✅ Code verified for {email}")
        db.users.update_one(
            {"email": email},
            {"$set": {"is_verified": True}, "$unset": {"verification_code": "", "verification_code_expires": ""}},
        )
        logger.info(f"✅ Email marked as verified for {email}")
        return {"message": "Email verified successfully"}
    else:
        logger.warning(f"❌ Invalid code for {email}. Got: {req.code}, Expected: {user.get('verification_code')}")
        raise HTTPException(status_code=400, detail="Invalid verification code")


@router.post("/register")
def register_user(req: SignupRequest):
    """Final user registration after email verification"""
    email = req.email.strip().lower()
    logger.info(f"📝 Registration request for: {email}")
    
    # Check if user exists and is verified
    user = db.users.find_one({"email": email})
    
    if not user:
        logger.warning(f"⚠️ User not found during registration: {email}")
        raise HTTPException(
            status_code=404, 
            detail="User not found. Please verify your email first."
        )
    
    if not user.get("is_verified"):
        logger.warning(f"⚠️ Email not verified during registration: {email}")
        raise HTTPException(
            status_code=400, 
            detail="Email not verified. Please complete verification first."
        )
    
    # Check if this email is already fully registered
    if user.get("is_completed"):
        logger.warning(f"⚠️ Account already completed for: {email}")
        raise HTTPException(
            status_code=400, 
            detail="Account already exists with this email."
        )
    
    # Check if username already exists
    existing_username = db.users.find_one({"username": req.username, "is_completed": True})
    if existing_username:
        logger.warning(f"⚠️ Username already exists: {req.username}")
        raise HTTPException(
            status_code=400, 
            detail="Username already exists"
        )
    
    # Determine household ID
    if req.household_id and req.household_id.strip():
        # User wants to join an existing household
        household_id = req.household_id.strip().lower()
        
        # Check if household exists (check if ANY user has this household_id)
        existing_household = db.users.find_one({"household_id": household_id})
        if not existing_household:
            logger.warning(f"⚠️ Household {household_id} does not exist")
            raise HTTPException(
                status_code=400, 
                detail=f"Household ID '{household_id}' does not exist. Please check and try again."
            )
        logger.info(f"✅ Joining existing household: {household_id}")
    else:
        # Generate a new unique household ID for this user
        household_id = generate_unique_household_id()
        logger.info(f"🏠 Generated new household ID for {email}: {household_id}")
    
    # Hash the password before storing
    hashed_password = bcrypt.hash(req.password)
    
    # Update user with final registration details
    update_data = {
        "username": req.username,
        "password": hashed_password,
        "household_id": household_id,
        "is_completed": True,
        "updated_at": datetime.utcnow()
    }
    
    try:
        db.users.update_one(
            {"email": email},
            {"$set": update_data}
        )
        logger.info(f"✅ User registered successfully: {email} with household: {household_id}")
    except Exception as e:
        logger.error(f"❌ Database error during registration: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete registration")
    
    return {
        "message": "User registered successfully",
        "household_id": household_id
    }