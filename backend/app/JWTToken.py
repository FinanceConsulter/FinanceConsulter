import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from jose import JWTError, jwt
from schemas.login import TokenData

logger = logging.getLogger(__name__)

# backend/.env laden (JWT_SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Von backend/app/JWTToken.py aus: app -> backend -> ROOT (Datei ist git-ignored)
SECRET_FILE = Path(__file__).resolve().parent.parent.parent / ".jwt_secret"


def _load_secret_key() -> str:
    """
    JWT_SECRET_KEY aus der Umgebung. Fallback: zufälliger Schlüssel, der in SECRET_FILE
    gespeichert wird, damit Tokens einen Neustart überleben.
    """
    key = (os.getenv("JWT_SECRET_KEY") or "").strip()
    if key:
        return key
    if not SECRET_FILE.exists():
        new_key = secrets.token_hex(32)
        try:
            # O_EXCL: falls ein anderer Prozess gleichzeitig startet, gewinnt dessen Datei
            fd = os.open(SECRET_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        except OSError as e:
            logger.warning("Could not write %s (%s); using a temporary JWT key, tokens end on restart", SECRET_FILE, e)
            return new_key
        else:
            with os.fdopen(fd, "w") as f:
                f.write(new_key)
            return new_key
    key = SECRET_FILE.read_text().strip()
    if not key:
        raise RuntimeError(f"{SECRET_FILE} is empty: delete it or set JWT_SECRET_KEY")
    return key


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or 720)  # 12 h

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")  # User-ID als String
        if subject is None:
            raise credentials_exception
        return TokenData(username=subject)
    except JWTError:
        raise credentials_exception
