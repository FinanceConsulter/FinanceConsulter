"""
Test bootstrap: put backend/app on sys.path (the app's import root) and point the
database at a throw-away file *before* any app module is imported.
"""

import os
import sys
import tempfile
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

_TMP_DIR = tempfile.mkdtemp(prefix="fc_tests_")
os.environ["FINANCE_DB_PATH"] = os.path.join(_TMP_DIR, "test.db")
