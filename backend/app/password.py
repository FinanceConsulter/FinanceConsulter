# password.py
from passlib.context import CryptContext

# pbkdf2_sha256 funktioniert ohne externe Dependencies
pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')

def verify_password(plain_pwd: str, hash_pwd: str) -> bool:
    # Leerer oder unbekannter Hash-Typ -> ungültig statt 500
    if not hash_pwd:
        return False
    try:
        return pwd_context.verify(plain_pwd, hash_pwd)
    except ValueError:
        return False

def get_pwd_hash(pwd: str) -> str:
    return pwd_context.hash(pwd)