from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from data_access.data_access import SessionLocal
from passlib.context import CryptContext




# Import aller Models (wichtig für SQLAlchemy)
from models.user import User
from models.account import Account
from models.category import Category
from models.transaction import Transaction
from models.merchant import Merchant
from models.receipt import Receipt, ReceiptLineItem
from models.tag import Tag, TransactionTag, ReceiptLineItemTag

# Import Schemas
from schemas.user import UserCreate, UserResponse

app = FastAPI(title="FinanceConsulter API", version="0.1.0")


# Datenbank beim Start initialisieren (nur einmalig)
@app.on_event("startup")
def startup_event():
    from data_access.data_access import init_db, DATABASE_PATH, engine
    from sqlalchemy import text, inspect
    
    print(f"📍 DATABASE_PATH: {DATABASE_PATH}")
    print(f"📍 Datei existiert: {DATABASE_PATH.exists()}")
    
    # Prüfe ob Tabellen existieren
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print(f"📊 Vorhandene Tabellen: {existing_tables}")
    
    if not existing_tables:
        print("📦 Keine Tabellen gefunden. Erstelle alle Tabellen...")
        init_db()
        
        # Prüfe nochmal
        existing_tables = inspect(engine).get_table_names()
        print(f"✅ Tabellen nach Erstellung: {existing_tables}")
    else:
        print(f"✅ Datenbank bereits initialisiert mit {len(existing_tables)} Tabellen")

# CORS-Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
        
pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')

def verify_password(plain_pwd, hash_pwd):
    return pwd_context.verify(plain_pwd, hash_pwd)

def get_pwd_hash(pwd):
    return pwd_context.hash(pwd)

@app.post("/user", response_model=UserResponse, status_code=201)
def create_user(request: UserCreate, db: Session = Depends(get_db)):
    """Erstellt einen neuen Benutzer"""
    # Prüfe ob Email bereits existiert
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email bereits registriert")
    
    new_user = User(
        email=request.email,
        password_hash= get_pwd_hash(request.password),
        name=request.name,
        first_name=request.first_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    """Gibt alle Benutzer zurück"""
    users = db.query(User).all()
    return users

@app.get("/user/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Gibt einen bestimmten Benutzer zurück"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return user

@app.get("/")
def root():
    return {
        "message": "FinanceConsulter API läuft",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}