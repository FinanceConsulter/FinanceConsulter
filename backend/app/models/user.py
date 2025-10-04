from data_access.data_access import Base
from sqlalchemy import Column, Integer, String

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement="auto")
    email = Column(String, nullable=False)
    password_hash = Column(String)
    name = Column(String)
    first_name = Column(String)
    created_at = Column(String)