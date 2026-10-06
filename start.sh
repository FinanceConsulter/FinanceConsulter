#!/usr/bin/env bash
# Startet FinanceConsulter: Backend (http://127.0.0.1:8000) und Frontend (http://localhost:3000).
#   ./start.sh          API + Frontend (ohne ML-Pakete)
#   ./start.sh --full   zusaetzlich ML-Pakete (Belegscan, KI-Kategorisierung)
# Beim ersten Start werden .venv, Python-Pakete und npm-Module eingerichtet.
# Beenden mit Ctrl+C.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQ="backend/requirements-core.txt"
for arg in "$@"; do
  case "$arg" in
    --full) REQ="backend/requirements.txt" ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "Unbekannte Option: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\033[36m==> %s\033[0m\n' "$1"; }
command -v npm >/dev/null || { echo "Node.js (npm) fehlt: https://nodejs.org" >&2; exit 1; }
PYTHON="$(command -v python3 || command -v python || true)"
[ -n "$PYTHON" ] || { echo "Python 3.10+ fehlt: https://www.python.org/downloads/" >&2; exit 1; }

VENV="$ROOT/.venv"
PY="$VENV/bin/python"
if [ ! -x "$PY" ]; then
  step "Erstelle Python-Umgebung (.venv)"
  "$PYTHON" -m venv "$VENV"
fi

HASH="$("$PY" -c 'import hashlib,sys; print(hashlib.sha256(b"".join(open(f,"rb").read() for f in sys.argv[1:])).hexdigest())' \
        "$ROOT/backend/requirements-core.txt" "$ROOT/$REQ")"
STAMP="$VENV/.installed-$(basename "$REQ" .txt)"
if [ "$(cat "$STAMP" 2>/dev/null || true)" != "$HASH" ]; then
  step "Installiere Python-Pakete ($REQ)"
  "$PY" -m pip install --disable-pip-version-check -q --upgrade pip
  "$PY" -m pip install --disable-pip-version-check -q -r "$ROOT/$REQ"
  echo "$HASH" > "$STAMP"
fi

FRONT="$ROOT/financeconsulter"
if [ ! -f "$FRONT/node_modules/.package-lock.json" ] || [ "$FRONT/package-lock.json" -nt "$FRONT/node_modules/.package-lock.json" ]; then
  step "Installiere Frontend-Pakete (npm install)"
  (cd "$FRONT" && npm install --no-audit --no-fund)
fi

PIDS=()
cleanup() { [ ${#PIDS[@]} -eq 0 ] || kill "${PIDS[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

step "Starte Backend"
(cd "$ROOT/backend/app" && exec "$PY" -m uvicorn main:app --host 127.0.0.1 --port 8000) &
PIDS+=($!)
for _ in $(seq 1 60); do
  curl -fs http://127.0.0.1:8000/health >/dev/null 2>&1 && break
  sleep 1
done
curl -fs http://127.0.0.1:8000/health >/dev/null 2>&1 || { echo "Backend nicht gestartet (Port 8000 belegt?)" >&2; exit 1; }

step "Starte Frontend (der Browser oeffnet sich automatisch)"
(cd "$FRONT" && exec npm start) &
PIDS+=($!)

echo
echo "FinanceConsulter laeuft:  App http://localhost:3000 | API-Doku http://127.0.0.1:8000/docs"
echo "Beenden mit Ctrl+C."
wait
