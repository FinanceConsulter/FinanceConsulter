from passlib.context import CryptContext


pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def verify_password(plain_pwd, hash_pwd):
    return pwd_context.verify(plain_pwd, hash_pwd)

def get_pwd_hash(pwd):
    return pwd_context.hash(pwd)