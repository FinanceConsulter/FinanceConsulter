from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from data_access.data_access import SessionLocal, get_db
from data_access.db_init import startup
import password 

# Import Routers
from routers import user, authentication, merchant, account, category, tag, transaction, receipt, ai_insights, receipt_line_item

app = FastAPI(title="FinanceConsulter API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(authentication.router)
app.include_router(user.router)
app.include_router(transaction.router)
app.include_router(account.router)
app.include_router(merchant.router)
app.include_router(category.router)
app.include_router(tag.router)
app.include_router(receipt.router)
app.include_router(receipt_line_item.router)
app.include_router(ai_insights.router)

# Datenbank beim Start initialisieren (nur einmalig)
@app.on_event("startup")
def startup_event():
    startup()


@app.get("/")
def root():
    return {
        "message": "FinanceConsulter API läuft",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}