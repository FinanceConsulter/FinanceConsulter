"""
Dieses Script erstellt alle Tabellen in der Datenbank.
Einmalig ausführen mit: python init_database.py
"""

import sys
from pathlib import Path

# Füge app-Verzeichnis zum Python-Path hinzu
app_dir = Path(__file__).resolve().parent / "app"
sys.path.insert(0, str(app_dir))

from data_access.data_access import init_db, engine, DATABASE_PATH
from sqlalchemy import text

def check_existing_tables():
    """Prüft, welche Tabellen bereits existieren"""
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ))
        tables = [row[0] for row in result]
        return tables

def main():
    print("🔍 Prüfe existierende Tabellen...")
    existing_tables = check_existing_tables()
    
    if existing_tables:
        print(f"⚠️  Folgende Tabellen existieren bereits: {', '.join(existing_tables)}")
        response = input("Möchtest du die Datenbank neu erstellen? (WARNUNG: Alle Daten gehen verloren!) [j/N]: ")
        
        if response.lower() == 'j':
            print("🗑️  Lösche alte Datenbank...")
            # Pool-Verbindungen schließen, sonst landet das neue Schema in der gelöschten Datei
            engine.dispose()
            for suffix in ("", "-wal", "-shm"):
                Path(f"{DATABASE_PATH}{suffix}").unlink(missing_ok=True)
            print("✅ Datenbank gelöscht")
            
            print("📦 Erstelle neue Datenbank mit allen Tabellen...")
            init_db()
        else:
            print("❌ Abgebrochen. Keine Änderungen vorgenommen.")
    else:
        print("📦 Keine Tabellen gefunden. Erstelle neue Datenbank...")
        init_db()
    
    print("\n✅ Fertig! Folgende Tabellen wurden erstellt:")
    final_tables = check_existing_tables()
    for table in final_tables:
        print(f"   - {table}")

if __name__ == "__main__":
    main()