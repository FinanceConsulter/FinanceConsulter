import logging

from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)


def startup():
    """
    Erstellt fehlende Tabellen und ergänzt neue Spalten in bestehenden Tabellen.
    Wird bei jedem Start ausgeführt und ist idempotent.
    """
    from data_access.data_access import DATABASE_PATH, Base, engine, init_db

    logger.info("Database: %s (exists=%s)", DATABASE_PATH, DATABASE_PATH.exists())

    # create_all legt nur fehlende Tabellen an (auch neue Tabellen in einer bestehenden DB).
    init_db()
    _add_missing_columns(engine, Base.metadata.sorted_tables)


def _add_missing_columns(engine, tables) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in tables:
        if table.name not in existing_tables:
            continue
        existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing_columns:
                continue
            sql_type = _get_sql_type(column.type)
            default_sql = _default_sql(column)
            # SQLite kann NOT NULL ohne Default nicht nachträglich hinzufügen.
            nullable = "NOT NULL" if (not column.nullable and default_sql) else "NULL"
            alter_sql = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {sql_type} {nullable} {default_sql}'
            try:
                with engine.begin() as conn:
                    conn.execute(text(alter_sql))
                logger.info("Added column %s.%s", table.name, column.name)
            except OperationalError as e:
                logger.error("Could not add column %s.%s: %s", table.name, column.name, e)


def _default_sql(column) -> str:
    """Nur skalare Defaults können als SQL-DEFAULT übernommen werden (keine Callables)."""
    default = column.default
    if default is None or not getattr(default, "is_scalar", False):
        return ""
    value = default.arg
    if isinstance(value, bool):
        return f"DEFAULT {1 if value else 0}"
    if isinstance(value, (int, float)):
        return f"DEFAULT {value}"
    if isinstance(value, str):
        escaped = value.replace("'", "''")
        return f"DEFAULT '{escaped}'"
    return ""


def _get_sql_type(column_type):
    """Konvertiert SQLAlchemy Typen zu SQL Typen"""
    from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text
    from sqlalchemy.types import TypeDecorator

    if isinstance(column_type, TypeDecorator):
        column_type = column_type.impl

    if isinstance(column_type, Text):
        return "TEXT"
    if isinstance(column_type, String):
        length = getattr(column_type, "length", None)
        return f"VARCHAR({length})" if length else "VARCHAR"

    type_mapping = (
        (Integer, "INTEGER"),
        (DateTime, "DATETIME"),
        (Date, "DATE"),
        (Float, "REAL"),
        (Boolean, "BOOLEAN"),
    )
    for sa_type, sql_type in type_mapping:
        if isinstance(column_type, sa_type):
            return sql_type

    return str(column_type).upper()
