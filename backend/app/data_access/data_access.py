from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path

# Von backend/app/data_access/data_access.py aus:
# parent: data_access -> app -> backend -> ROOT
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATABASE_PATH = BASE_DIR / "db" / "finance_consulter.db"

print(f"DATABASE_PATH: {DATABASE_PATH}")
print(f"Datei existiert: {DATABASE_PATH.exists()}")

DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Erstellt alle Tabellen in der Datenbank.
    Einmalig beim ersten Start ausführen!
    """
    # Importiere alle Models, damit sie registriert werden
    from backend.app.models.user import User
    from backend.app.models.account import Account
    from backend.app.models.category import Category
    from backend.app.models.transaction import Transaction
    from backend.app.models.merchant import Merchant
    from backend.app.models.receipt import Receipt, ReceiptLineItem
    from backend.app.models.tag import Tag, TransactionTag, ReceiptLineItemTag
    
    Base.metadata.create_all(bind=engine)
    print("✅ Alle Tabellen wurden erfolgreich erstellt!")
    
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()