def startup():
    from data_access.data_access import init_db, DATABASE_PATH, engine, Base
    from sqlalchemy import text, inspect, Column, Integer, String, DateTime, Float, Boolean, ForeignKey
    from sqlalchemy.exc import OperationalError
    import logging
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
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
        
        # Prüfe und füge neue Spalten hinzu
        print("🔍 Prüfe auf neue Felder in den Models...")
        
        # Hole alle SQLAlchemy Models
        for mapper in Base.registry.mappers:
            model = mapper.class_
            table_name = model.__tablename__
            
            if table_name in existing_tables:
                print(f"\n📋 Prüfe Tabelle: {table_name}")
                
                # Hole existierende Spalten aus der Datenbank
                existing_columns = {col['name']: col for col in inspector.get_columns(table_name)}
                
                # Hole Spalten aus dem Model
                model_columns = {}
                for column in model.__table__.columns:
                    model_columns[column.name] = column
                
                # Finde neue Spalten
                new_columns = set(model_columns.keys()) - set(existing_columns.keys())
                
                if new_columns:
                    print(f"  🆕 Neue Spalten gefunden: {new_columns}")
                    
                    for col_name in new_columns:
                        column = model_columns[col_name]
                        
                        # Bestimme den SQL-Typ
                        sql_type = _get_sql_type(column.type)
                        
                        # Baue ALTER TABLE Statement
                        nullable = "NULL" if column.nullable else "NOT NULL"
                        default = f"DEFAULT {column.default.arg}" if column.default else ""
                        
                        alter_sql = f"""
                        ALTER TABLE {table_name} 
                        ADD COLUMN {col_name} {sql_type} {nullable} {default}
                        """
                        
                        try:
                            with engine.connect() as conn:
                                conn.execute(text(alter_sql))
                                conn.commit()
                            print(f"    ✅ Spalte '{col_name}' wurde zu '{table_name}' hinzugefügt")
                        except OperationalError as e:
                            print(f"    ❌ Fehler beim Hinzufügen von '{col_name}': {e}")
                
                # Prüfe auf geänderte Spalten (optional - nur zur Information)
                for col_name in set(existing_columns.keys()) & set(model_columns.keys()):
                    db_col = existing_columns[col_name]
                    model_col = model_columns[col_name]
                    
                    # Vergleiche Typen (vereinfacht)
                    db_type = str(db_col['type']).upper()
                    model_type = _get_sql_type(model_col.type).upper()
                    
                    if not _types_compatible(db_type, model_type):
                        print(f"  ⚠️  Typ-Unterschied bei '{col_name}': DB hat {db_type}, Model hat {model_type}")
                        # Hinweis: Automatische Typ-Änderungen können gefährlich sein
                        # und sollten manuell durchgeführt werden
                
                # Prüfe auf gelöschte Spalten (nur zur Information)
                deleted_columns = set(existing_columns.keys()) - set(model_columns.keys())
                if deleted_columns:
                    print(f"  ℹ️  Spalten in DB aber nicht im Model: {deleted_columns}")
                    # Hinweis: Automatisches Löschen von Spalten ist gefährlich
                    # und sollte manuell durchgeführt werden
        
        print("\n✅ Datenbankprüfung abgeschlossen")

def _get_sql_type(column_type):
    """Konvertiert SQLAlchemy Typen zu SQL Typen"""
    from sqlalchemy import Integer, String, DateTime, Float, Boolean, Text
    from sqlalchemy.types import TypeDecorator
    
    # Hole den tatsächlichen Typ (falls es ein TypeDecorator ist)
    if isinstance(column_type, TypeDecorator):
        column_type = column_type.impl
    
    type_mapping = {
        Integer: "INTEGER",
        DateTime: "DATETIME",
        Float: "REAL",
        Boolean: "BOOLEAN",
        Text: "TEXT"
    }
    
    # Spezielle Behandlung für String
    if isinstance(column_type, String):
        length = getattr(column_type, 'length', None)
        if length:
            return f"VARCHAR({length})"
        else:
            # Fallback auf eine Standard-Länge oder TEXT
            return "VARCHAR(255)"  # oder "TEXT" für unbegrenzte Länge
    
    # Prüfe andere Typen
    for sa_type, sql_type in type_mapping.items():
        if isinstance(column_type, sa_type):
            return sql_type
    
    # Fallback
    return str(column_type).upper()

def _types_compatible(db_type, model_type):
    """Prüft ob zwei Typen kompatibel sind"""
    # Normalisiere die Typen
    db_type = db_type.upper().split('(')[0]
    model_type = model_type.upper().split('(')[0]
    
    # SQLite spezifische Mappings
    compatible_types = {
        ('VARCHAR', 'TEXT'),
        ('TEXT', 'VARCHAR'),
        ('INTEGER', 'BIGINT'),
        ('BIGINT', 'INTEGER'),
        ('REAL', 'FLOAT'),
        ('FLOAT', 'REAL')
    }
    
    if db_type == model_type:
        return True
    
    if (db_type, model_type) in compatible_types or (model_type, db_type) in compatible_types:
        return True
    
    return False