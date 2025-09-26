from typing import Union, Generator
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, init_db

app = FastAPI()

# CORS-Middleware hinzufügen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React-App URLs
    allow_credentials=True,
    allow_methods=["*"],  # Alle HTTP-Methoden erlauben
    allow_headers=["*"],  # Alle Headers erlauben
)

@app.get("/")
def read_root():
    return {"Hello": "Hello Bastian"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


# --- Database setup & dependency ---
@app.on_event("startup")
def on_startup():
    init_db()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health(db: Session = Depends(get_db)):
    # simple probe: count users (table may be empty)
    result = db.execute("SELECT COUNT(1) FROM users").scalar_one_or_none()
    return {"status": "ok", "users": result}