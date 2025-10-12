from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path

# Korrigierter Pfad
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # 3x parent: app -> backend -> FinanceConsulter
DATABASE_PATH = BASE_DIR / "backend" / "db" / "finance_consulter.db"

print(f"DATABASE_PATH: {DATABASE_PATH}")
print(f"Datei existiert: {DATABASE_PATH.exists()}")

DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()