from pydantic import BaseModel

class User_Schema(BaseModel):
    id: int
    email: str
    password_hash: str
    name: str
    first_name: str
    created_at: str