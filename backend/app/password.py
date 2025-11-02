# password.py
from passlib.context import CryptContext

# pbkdf2_sha256 funktioniert ohne externe Dependencies
pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')

def verify_password(plain_pwd: str, hash_pwd: str) -> bool:
    return pwd_context.verify(plain_pwd, hash_pwd)

def get_pwd_hash(pwd: str) -> str:
    return pwd_context.hash(pwd)