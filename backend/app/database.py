"""
Database layer — SQLAlchemy engine, session factory and declarative Base.

We ship with SQLite for zero-config portability (the DB file lives in
taskflow/data/). Swapping to PostgreSQL in production is a single env var:

    TASKFLOW_DATABASE_URL=postgresql://user:pass@host/taskflow
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_URL = os.environ.get(
    "TASKFLOW_DATABASE_URL",
    f"sqlite:///{DATA_DIR / 'taskflow.db'}",
)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db():
    """FastAPI dependency that yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
