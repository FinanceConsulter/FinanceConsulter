from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from data_access.data_access import SessionLocal, get_db
from data_access.db_init import startup
import password 

# Import Routers
from routers import user, authentication

app = FastAPI(title="FinanceConsulter API", version="0.1.0")
app.include_router(authentication.router)
app.include_router(user.router)

# Datenbank beim Start initialisieren (nur einmalig)
@app.on_event("startup")
def startup_event():
    startup()

# CORS-Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "FinanceConsulter API läuft",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}