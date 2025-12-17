from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'fleetease')]

# Create the main app
app = FastAPI(title="FleetEase API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    tc_kimlik: Optional[str] = None
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    user_id: str
    name: str
    email: str
    phone: Optional[str] = None
    tc_kimlik: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime
    ehliyet_no: Optional[str] = None
    ehliyet_sinifi: Optional[str] = None
    ehliyet_tarihi: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    adres: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    tc_kimlik: Optional[str] = None
    ehliyet_no: Optional[str] = None
    ehliyet_sinifi: Optional[str] = None
    ehliyet_tarihi: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    adres: Optional[str] = None

class Vehicle(BaseModel):
    vehicle_id: str
    brand: str
    model: str
    year: int
    plate: str
    color: str
    segment: str  # Ekonomi, Orta, Lüks, SUV, Minivan
    transmission: str  # Otomatik, Manuel
    fuel_type: str  # Benzin, Dizel, Hibrit, Elektrik
    seats: int
    doors: int
    daily_price: float
    features: List[str] = []
    images: List[str] = []
    available: bool = True
    km: int = 0
    baggage_capacity: str = "Orta"
    min_age: int = 21
    min_license_years: int = 1
    deposit: float = 1000
    km_limit: int = 300

class Reservation(BaseModel):
    reservation_id: str
    user_id: str
    vehicle_id: str
    pickup_date: datetime
    return_date: datetime
    pickup_location: str
    return_location: str
    status: str = "pending"  # pending, confirmed, active, completed, cancelled
    total_price: float
    extras: List[str] = []
    extras_price: float = 0
    driver_info: Optional[dict] = None
    payment_status: str = "pending"  # pending, paid, refunded
    created_at: datetime
    qr_code: Optional[str] = None

class ReservationCreate(BaseModel):
    vehicle_id: str
    pickup_date: datetime
    return_date: datetime
    pickup_location: str
    return_location: str
    extras: List[str] = []
    driver_info: Optional[dict] = None

class Notification(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str  # reservation, campaign, system, payment
    read: bool = False
    created_at: datetime
    data: Optional[dict] = None

class Campaign(BaseModel):
    campaign_id: str
    title: str
    description: str
    image: str
    discount_percent: int = 0
    valid_until: datetime
    active: bool = True

class Location(BaseModel):
    location_id: str
    name: str
    address: str
    city: str
    type: str  # airport, city, hotel
    working_hours: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

async def get_current_user(request: Request) -> Optional[User]:
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Then try Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry with timezone awareness
    expires_at = session.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    # Check if email exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")
    
    # Check if phone exists
    existing_phone = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Bu telefon numarası zaten kayıtlı")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "tc_kimlik": data.tc_kimlik,
        "password_hash": hash_password(data.password),
        "picture": None,
        "created_at": datetime.now(timezone.utc),
        "ehliyet_no": None,
        "ehliyet_sinifi": None,
        "ehliyet_tarihi": None,
        "dogum_tarihi": None,
        "adres": None
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = generate_token()
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    
    return {"user": user_doc, "session_token": session_token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    
    if user_doc.get("password_hash") != hash_password(data.password):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    
    # Create session
    session_token = generate_token()
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_doc.pop("password_hash", None)
    
    return {"user": user_doc, "session_token": session_token}

@api_router.post("/auth/google/callback")
async def google_callback(request: Request, response: Response):
    """Process Google OAuth session_id from Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id for user data
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            user_data = resp.json()
        except Exception as e:
            logger.error(f"Google auth error: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "name": user_data.get("name", ""),
            "email": user_data["email"],
            "phone": None,
            "tc_kimlik": None,
            "picture": user_data.get("picture"),
            "created_at": datetime.now(timezone.utc),
            "google_id": user_data.get("id"),
            "ehliyet_no": None,
            "ehliyet_sinifi": None,
            "ehliyet_tarihi": None,
            "dogum_tarihi": None,
            "adres": None
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = generate_token()
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user_doc.pop("password_hash", None)
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== USER ENDPOINTS ====================

@api_router.put("/users/me")
async def update_user(data: UserUpdate, request: Request):
    user = await require_auth(request)
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    updated_user.pop("password_hash", None)
    return updated_user

# ==================== VEHICLE ENDPOINTS ====================

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(
    segment: Optional[str] = None,
    brand: Optional[str] = None,
    transmission: Optional[str] = None,
    fuel_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    available: Optional[bool] = None,
    sort_by: Optional[str] = "daily_price",
    sort_order: Optional[str] = "asc"
):
    query = {}
    if segment:
        query["segment"] = segment
    if brand:
        query["brand"] = {"$regex": brand, "$options": "i"}
    if transmission:
        query["transmission"] = transmission
    if fuel_type:
        query["fuel_type"] = fuel_type
    if available is not None:
        query["available"] = available
    if min_price is not None:
        query["daily_price"] = {"$gte": min_price}
    if max_price is not None:
        if "daily_price" in query:
            query["daily_price"]["$lte"] = max_price
        else:
            query["daily_price"] = {"$lte": max_price}
    
    sort_direction = 1 if sort_order == "asc" else -1
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).sort(sort_by, sort_direction).to_list(100)
    return [Vehicle(**v) for v in vehicles]

@api_router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str):
    vehicle = await db.vehicles.find_one({"vehicle_id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return Vehicle(**vehicle)

@api_router.get("/vehicles/popular", response_model=List[Vehicle])
async def get_popular_vehicles():
    vehicles = await db.vehicles.find({"available": True}, {"_id": 0}).limit(6).to_list(6)
    return [Vehicle(**v) for v in vehicles]

# ==================== RESERVATION ENDPOINTS ====================

@api_router.get("/reservations", response_model=List[Reservation])
async def get_reservations(request: Request, status: Optional[str] = None):
    user = await require_auth(request)
    
    query = {"user_id": user.user_id}
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Reservation(**r) for r in reservations]

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(data: ReservationCreate, request: Request):
    user = await require_auth(request)
    
    # Verify vehicle exists and is available
    vehicle = await db.vehicles.find_one({"vehicle_id": data.vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    if not vehicle.get("available", True):
        raise HTTPException(status_code=400, detail="Araç müsait değil")
    
    # Calculate price
    days = (data.return_date - data.pickup_date).days
    if days < 1:
        days = 1
    
    daily_price = vehicle.get("daily_price", 0)
    total_price = daily_price * days
    
    # Calculate extras price
    extras_prices = {
        "ek_surucu": 150,
        "bebek_koltugu": 100,
        "gps": 75,
        "tam_kasko": 200,
        "mini_hasar": 100
    }
    extras_price = sum(extras_prices.get(e, 0) for e in data.extras) * days
    
    reservation_id = f"res_{uuid.uuid4().hex[:12]}"
    qr_code = f"FLEETEASE-{reservation_id.upper()}"
    
    reservation = {
        "reservation_id": reservation_id,
        "user_id": user.user_id,
        "vehicle_id": data.vehicle_id,
        "pickup_date": data.pickup_date,
        "return_date": data.return_date,
        "pickup_location": data.pickup_location,
        "return_location": data.return_location,
        "status": "pending",
        "total_price": total_price + extras_price,
        "extras": data.extras,
        "extras_price": extras_price,
        "driver_info": data.driver_info,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc),
        "qr_code": qr_code
    }
    
    await db.reservations.insert_one(reservation)
    
    # Create notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "title": "Rezervasyon Oluşturuldu",
        "message": f"Rezervasyonunuz #{reservation_id} başarıyla oluşturuldu. Onay bekleniyor.",
        "type": "reservation",
        "read": False,
        "created_at": datetime.now(timezone.utc),
        "data": {"reservation_id": reservation_id}
    })
    
    return Reservation(**reservation)

@api_router.get("/reservations/{reservation_id}", response_model=Reservation)
async def get_reservation(reservation_id: str, request: Request):
    user = await require_auth(request)
    
    reservation = await db.reservations.find_one(
        {"reservation_id": reservation_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Rezervasyon bulunamadı")
    return Reservation(**reservation)

@api_router.delete("/reservations/{reservation_id}")
async def cancel_reservation(reservation_id: str, request: Request):
    user = await require_auth(request)
    
    reservation = await db.reservations.find_one(
        {"reservation_id": reservation_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Rezervasyon bulunamadı")
    
    if reservation.get("status") in ["active", "completed"]:
        raise HTTPException(status_code=400, detail="Bu rezervasyon iptal edilemez")
    
    await db.reservations.update_one(
        {"reservation_id": reservation_id},
        {"$set": {"status": "cancelled"}}
    )
    
    # Create notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "title": "Rezervasyon İptal Edildi",
        "message": f"Rezervasyonunuz #{reservation_id} iptal edildi.",
        "type": "reservation",
        "read": False,
        "created_at": datetime.now(timezone.utc),
        "data": {"reservation_id": reservation_id}
    })
    
    return {"message": "Rezervasyon iptal edildi"}

@api_router.post("/reservations/{reservation_id}/pay")
async def pay_reservation(reservation_id: str, request: Request):
    """Mock payment endpoint"""
    user = await require_auth(request)
    
    reservation = await db.reservations.find_one(
        {"reservation_id": reservation_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Rezervasyon bulunamadı")
    
    # Mock payment - always succeeds
    await db.reservations.update_one(
        {"reservation_id": reservation_id},
        {"$set": {"payment_status": "paid", "status": "confirmed"}}
    )
    
    # Create notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "title": "Ödeme Başarılı",
        "message": f"Rezervasyonunuz #{reservation_id} için ödeme alındı ve onaylandı.",
        "type": "payment",
        "read": False,
        "created_at": datetime.now(timezone.utc),
        "data": {"reservation_id": reservation_id}
    })
    
    return {"message": "Ödeme başarılı", "status": "confirmed"}

# ==================== NOTIFICATION ENDPOINTS ====================

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(request: Request):
    user = await require_auth(request)
    
    notifications = await db.notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return [Notification(**n) for n in notifications]

@api_router.get("/notifications/unread-count")
async def get_unread_count(request: Request):
    user = await require_auth(request)
    
    count = await db.notifications.count_documents(
        {"user_id": user.user_id, "read": False}
    )
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    user = await require_auth(request)
    
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    return {"message": "Okundu olarak işaretlendi"}

@api_router.put("/notifications/read-all")
async def mark_all_read(request: Request):
    user = await require_auth(request)
    
    await db.notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Tümü okundu olarak işaretlendi"}

# ==================== LOCATION ENDPOINTS ====================

@api_router.get("/locations", response_model=List[Location])
async def get_locations(city: Optional[str] = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    locations = await db.locations.find(query, {"_id": 0}).to_list(100)
    return [Location(**l) for l in locations]

# ==================== CAMPAIGN ENDPOINTS ====================

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns():
    campaigns = await db.campaigns.find(
        {"active": True, "valid_until": {"$gte": datetime.now(timezone.utc)}},
        {"_id": 0}
    ).to_list(10)
    return [Campaign(**c) for c in campaigns]

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data for testing"""
    
    # Clear existing data
    await db.vehicles.delete_many({})
    await db.locations.delete_many({})
    await db.campaigns.delete_many({})
    
    # Seed vehicles
    vehicles = [
        {
            "vehicle_id": "v001",
            "brand": "Toyota",
            "model": "Corolla",
            "year": 2023,
            "plate": "34 *** 01",
            "color": "Beyaz",
            "segment": "Ekonomi",
            "transmission": "Otomatik",
            "fuel_type": "Benzin",
            "seats": 5,
            "doors": 4,
            "daily_price": 850,
            "features": ["Klima", "Bluetooth", "Geri Görüş Kamerası", "Park Sensörü"],
            "images": ["https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800"],
            "available": True,
            "km": 15000,
            "baggage_capacity": "Orta",
            "min_age": 21,
            "min_license_years": 1,
            "deposit": 1000,
            "km_limit": 300
        },
        {
            "vehicle_id": "v002",
            "brand": "Volkswagen",
            "model": "Passat",
            "year": 2023,
            "plate": "34 *** 02",
            "color": "Siyah",
            "segment": "Orta",
            "transmission": "Otomatik",
            "fuel_type": "Dizel",
            "seats": 5,
            "doors": 4,
            "daily_price": 1200,
            "features": ["Klima", "Bluetooth", "Navigasyon", "Deri Koltuk", "Sunroof"],
            "images": ["https://images.unsplash.com/photo-1632548260498-b7246fa466ea?w=800"],
            "available": True,
            "km": 25000,
            "baggage_capacity": "Büyük",
            "min_age": 23,
            "min_license_years": 2,
            "deposit": 2000,
            "km_limit": 350
        },
        {
            "vehicle_id": "v003",
            "brand": "BMW",
            "model": "520i",
            "year": 2024,
            "plate": "34 *** 03",
            "color": "Lacivert",
            "segment": "Lüks",
            "transmission": "Otomatik",
            "fuel_type": "Benzin",
            "seats": 5,
            "doors": 4,
            "daily_price": 2500,
            "features": ["Klima", "Bluetooth", "Navigasyon", "Deri Koltuk", "Sunroof", "Harman Kardon", "360 Kamera"],
            "images": ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800"],
            "available": True,
            "km": 8000,
            "baggage_capacity": "Büyük",
            "min_age": 25,
            "min_license_years": 3,
            "deposit": 5000,
            "km_limit": 400
        },
        {
            "vehicle_id": "v004",
            "brand": "Mercedes",
            "model": "E200",
            "year": 2024,
            "plate": "34 *** 04",
            "color": "Gri",
            "segment": "Lüks",
            "transmission": "Otomatik",
            "fuel_type": "Hibrit",
            "seats": 5,
            "doors": 4,
            "daily_price": 2800,
            "features": ["Klima", "Bluetooth", "Navigasyon", "Deri Koltuk", "Sunroof", "Burmester", "360 Kamera", "Masaj Koltuğu"],
            "images": ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"],
            "available": True,
            "km": 5000,
            "baggage_capacity": "Büyük",
            "min_age": 25,
            "min_license_years": 3,
            "deposit": 6000,
            "km_limit": 400
        },
        {
            "vehicle_id": "v005",
            "brand": "Hyundai",
            "model": "Tucson",
            "year": 2023,
            "plate": "34 *** 05",
            "color": "Kırmızı",
            "segment": "SUV",
            "transmission": "Otomatik",
            "fuel_type": "Dizel",
            "seats": 5,
            "doors": 5,
            "daily_price": 1500,
            "features": ["Klima", "Bluetooth", "Navigasyon", "Geri Görüş Kamerası", "Park Sensörü"],
            "images": ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800"],
            "available": True,
            "km": 20000,
            "baggage_capacity": "Çok Büyük",
            "min_age": 23,
            "min_license_years": 2,
            "deposit": 2500,
            "km_limit": 350
        },
        {
            "vehicle_id": "v006",
            "brand": "Renault",
            "model": "Clio",
            "year": 2023,
            "plate": "34 *** 06",
            "color": "Turuncu",
            "segment": "Ekonomi",
            "transmission": "Manuel",
            "fuel_type": "Benzin",
            "seats": 5,
            "doors": 5,
            "daily_price": 650,
            "features": ["Klima", "Bluetooth", "USB"],
            "images": ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800"],
            "available": True,
            "km": 30000,
            "baggage_capacity": "Küçük",
            "min_age": 21,
            "min_license_years": 1,
            "deposit": 800,
            "km_limit": 300
        },
        {
            "vehicle_id": "v007",
            "brand": "Ford",
            "model": "Focus",
            "year": 2022,
            "plate": "34 *** 07",
            "color": "Mavi",
            "segment": "Orta",
            "transmission": "Otomatik",
            "fuel_type": "Dizel",
            "seats": 5,
            "doors": 5,
            "daily_price": 950,
            "features": ["Klima", "Bluetooth", "Navigasyon", "Park Sensörü"],
            "images": ["https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800"],
            "available": True,
            "km": 45000,
            "baggage_capacity": "Orta",
            "min_age": 21,
            "min_license_years": 1,
            "deposit": 1200,
            "km_limit": 300
        },
        {
            "vehicle_id": "v008",
            "brand": "Volkswagen",
            "model": "Transporter",
            "year": 2023,
            "plate": "34 *** 08",
            "color": "Beyaz",
            "segment": "Minivan",
            "transmission": "Manuel",
            "fuel_type": "Dizel",
            "seats": 9,
            "doors": 5,
            "daily_price": 1800,
            "features": ["Klima", "Bluetooth", "Geri Görüş Kamerası"],
            "images": ["https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800"],
            "available": True,
            "km": 35000,
            "baggage_capacity": "Çok Büyük",
            "min_age": 25,
            "min_license_years": 3,
            "deposit": 3000,
            "km_limit": 400
        },
        {
            "vehicle_id": "v009",
            "brand": "Tesla",
            "model": "Model 3",
            "year": 2024,
            "plate": "34 *** 09",
            "color": "Beyaz",
            "segment": "Lüks",
            "transmission": "Otomatik",
            "fuel_type": "Elektrik",
            "seats": 5,
            "doors": 4,
            "daily_price": 2200,
            "features": ["Klima", "Bluetooth", "Navigasyon", "Autopilot", "Premium Ses", "Cam Tavan"],
            "images": ["https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800"],
            "available": True,
            "km": 10000,
            "baggage_capacity": "Orta",
            "min_age": 25,
            "min_license_years": 3,
            "deposit": 4000,
            "km_limit": 350
        },
        {
            "vehicle_id": "v010",
            "brand": "Audi",
            "model": "Q5",
            "year": 2023,
            "plate": "34 *** 10",
            "color": "Siyah",
            "segment": "SUV",
            "transmission": "Otomatik",
            "fuel_type": "Dizel",
            "seats": 5,
            "doors": 5,
            "daily_price": 2400,
            "features": ["Klima", "Bluetooth", "Navigasyon", "Deri Koltuk", "Sunroof", "Bang & Olufsen", "Quattro"],
            "images": ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800"],
            "available": True,
            "km": 12000,
            "baggage_capacity": "Büyük",
            "min_age": 25,
            "min_license_years": 3,
            "deposit": 5000,
            "km_limit": 400
        }
    ]
    
    await db.vehicles.insert_many(vehicles)
    
    # Seed locations
    locations = [
        {"location_id": "loc001", "name": "İstanbul Havalimanı", "address": "Arnavutköy, İstanbul", "city": "İstanbul", "type": "airport", "working_hours": "7/24"},
        {"location_id": "loc002", "name": "Sabiha Gökçen Havalimanı", "address": "Pendik, İstanbul", "city": "İstanbul", "type": "airport", "working_hours": "7/24"},
        {"location_id": "loc003", "name": "Taksim Ofis", "address": "Taksim Meydanı, Beyoğlu", "city": "İstanbul", "type": "city", "working_hours": "08:00-20:00"},
        {"location_id": "loc004", "name": "Kadıköy Ofis", "address": "Kadıköy İskele, Kadıköy", "city": "İstanbul", "type": "city", "working_hours": "08:00-20:00"},
        {"location_id": "loc005", "name": "Ankara Esenboğa Havalimanı", "address": "Esenboğa, Ankara", "city": "Ankara", "type": "airport", "working_hours": "7/24"},
        {"location_id": "loc006", "name": "Ankara Kızılay Ofis", "address": "Kızılay Meydanı, Çankaya", "city": "Ankara", "type": "city", "working_hours": "08:00-20:00"},
        {"location_id": "loc007", "name": "İzmir Adnan Menderes Havalimanı", "address": "Gaziemir, İzmir", "city": "İzmir", "type": "airport", "working_hours": "7/24"},
        {"location_id": "loc008", "name": "Antalya Havalimanı", "address": "Muratpaşa, Antalya", "city": "Antalya", "type": "airport", "working_hours": "7/24"}
    ]
    
    await db.locations.insert_many(locations)
    
    # Seed campaigns
    campaigns = [
        {
            "campaign_id": "camp001",
            "title": "Yaz Fırsatı!",
            "description": "7 gün ve üzeri kiralamalarda %20 indirim",
            "image": "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
            "discount_percent": 20,
            "valid_until": datetime.now(timezone.utc) + timedelta(days=60),
            "active": True
        },
        {
            "campaign_id": "camp002",
            "title": "Hafta Sonu Özel",
            "description": "Cuma-Pazar kiralamalarda ek sürücü ücretsiz",
            "image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
            "discount_percent": 0,
            "valid_until": datetime.now(timezone.utc) + timedelta(days=30),
            "active": True
        },
        {
            "campaign_id": "camp003",
            "title": "İlk Kiralama",
            "description": "İlk kiralamanızda %15 indirim",
            "image": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
            "discount_percent": 15,
            "valid_until": datetime.now(timezone.utc) + timedelta(days=90),
            "active": True
        }
    ]
    
    await db.campaigns.insert_many(campaigns)
    
    return {"message": "Data seeded successfully", "vehicles": len(vehicles), "locations": len(locations), "campaigns": len(campaigns)}

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "FleetEase API", "version": "1.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
