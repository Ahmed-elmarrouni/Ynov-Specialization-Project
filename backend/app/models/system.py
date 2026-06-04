from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from app.core.database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, nullable=False, index=True)
    phone_number = Column(String)
    password_hash = Column(String, nullable=False)
    role = Column(String)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.datetime.utcnow)

class DataImport(Base):
    __tablename__ = "data_imports"
    id = Column(Integer, primary_key=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    file_name = Column(String)
    file_type = Column(String)
    total_rows = Column(Integer)
    success_rows = Column(Integer)
    error_rows = Column(Integer)
    status = Column(String)
    error_log = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)