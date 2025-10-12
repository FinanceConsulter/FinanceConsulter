
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from schemas.user import User_Schema
from models.user import User
from sqlalchemy.orm import Session
from data_access.data_access import SessionLocal

app = FastAPI()

# CORS-Middleware hinzufügen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React-App URLs
    allow_credentials=True,
    allow_methods=["*"],  # Alle HTTP-Methoden erlauben
    allow_headers=["*"],  # Alle Headers erlauben
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/user")
def create_user(request: User_Schema, db: Session = Depends(get_db)):
    new_user = User(
        email = request.email,
        password_hash = request.password_hash,
        name = request.name,
        first_name = request.first_name
        )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    pass
