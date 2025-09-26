import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base

REPO_ROOT = Path(__file__).resolve().parents[3]
DB_FILE = REPO_ROOT / 'db' / 'finance_consulter.db'
DATABASE_URL = f'sqlite:///{DB_FILE.as_posix()}'

engine = create_engine(
    DATABASE_URL, future=True, echo=False, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def init_db():
    Base.metadata.create_all(bind=engine)
