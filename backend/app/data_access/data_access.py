import logging
import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Von backend/app/data_access/data_access.py aus:
# parent: data_access -> app -> backend -> ROOT
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
# FINANCE_DB_PATH erlaubt eine andere DB-Datei (z.B. für Tests).
DATABASE_PATH = Path(os.getenv("FINANCE_DB_PATH") or BASE_DIR / "db" / "finance_consulter.db").resolve()
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)


def make_engine(path: Path):
    """SQLite engine with WAL (reads do not block a concurrent write) and a lock timeout."""
    eng = create_engine(
        f"sqlite:///{path}",
        # timeout: wait for locks instead of failing when another request writes concurrently
        connect_args={"check_same_thread": False, "timeout": 30},
    )

    @event.listens_for(eng, "connect")
    def _sqlite_pragmas(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
        finally:
            cursor.close()

    return eng


engine = make_engine(DATABASE_PATH)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def import_all_models():
    """Registriert alle Models an Base.metadata (immer über denselben Modulpfad)."""
    import models  # noqa: F401


def init_db():
    """
    Erstellt alle fehlenden Tabellen. Idempotent: bestehende Tabellen bleiben unverändert.
    """
    import_all_models()
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured at %s", DATABASE_PATH)
