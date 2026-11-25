import os
import socket
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Ensure backend/.env is loaded regardless of working directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is missing. Please set your PostgreSQL connection string in backend/.env")

# SQLAlchemy requires postgresql+psycopg2:// (SQLAlchemy 2.1+ defaults postgresql:// to psycopg v3)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Robust DNS fallback: if local DNS cannot resolve Aiven's host, use its direct IP
if "pg-5120fb8-ananyahp580cc.j.aivencloud.com" in DATABASE_URL:
    try:
        socket.gethostbyname("pg-5120fb8-ananyahp580cc.j.aivencloud.com")
    except socket.gaierror:
        DATABASE_URL = DATABASE_URL.replace("pg-5120fb8-ananyahp580cc.j.aivencloud.com", "139.59.0.44")

# Configure PostgreSQL engine with pre-ping, connection recycle, and TCP keepalives
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=180,
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()