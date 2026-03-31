"""Database connection and session management for the Breast Cancer Detection System."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Generator
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def _build_mysql_url_from_env() -> str:
    """Build a MySQL connection URL from individual environment variables."""

    db_host = os.getenv("DB_HOST", "localhost")
    db_user = quote_plus(os.getenv("DB_USER", "root"))
    db_password = quote_plus(os.getenv("DB_PASSWORD", ""))
    db_name = quote_plus(os.getenv("DB_NAME", "breast_cancer"))
    db_port = os.getenv("DB_PORT", "3306")
    return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def _build_mysql_admin_url() -> str:
    """Build a MySQL connection URL without selecting a specific database."""

    db_host = os.getenv("DB_HOST", "localhost")
    db_user = quote_plus(os.getenv("DB_USER", "root"))
    db_password = quote_plus(os.getenv("DB_PASSWORD", ""))
    db_port = os.getenv("DB_PORT", "3306")
    return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/"


def _quote_mysql_identifier(identifier: str) -> str:
    """Safely quote a MySQL identifier such as a database name."""

    return f"`{identifier.replace('`', '``')}`"


def _ensure_mysql_database_exists() -> None:
    """Create the configured MySQL database if the server is reachable but the schema is missing."""

    database_name = os.getenv("DB_NAME", "breast_cancer")
    admin_engine = _build_engine(_build_mysql_admin_url())

    with admin_engine.begin() as connection:
        connection.execute(text(f"CREATE DATABASE IF NOT EXISTS {_quote_mysql_identifier(database_name)}"))


DATABASE_URL = os.getenv("DATABASE_URL", _build_mysql_url_from_env())
SQLITE_FALLBACK_URL = f"sqlite:///{(BASE_DIR / 'breast_cancer_system' / 'breast_cancer_local.db').as_posix()}"


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""


def _build_engine(database_url: str):
    """Create an engine for the provided database URL."""

    if database_url.startswith("sqlite"):
        return create_engine(database_url, connect_args={"check_same_thread": False}, future=True)

    return create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        future=True,
    )


def _resolve_engine():
    """Use MySQL when available and fall back to SQLite for local development."""

    candidate = _build_engine(DATABASE_URL)
    try:
        with candidate.connect() as connection:
            connection.execute(text("SELECT 1"))
        return candidate
    except OperationalError:
        try:
            _ensure_mysql_database_exists()
            retry_candidate = _build_engine(DATABASE_URL)
            with retry_candidate.connect() as connection:
                connection.execute(text("SELECT 1"))
            return retry_candidate
        except Exception:  # noqa: BLE001
            fallback = _build_engine(SQLITE_FALLBACK_URL)
            print(f"MySQL connection failed. Falling back to local SQLite database at {SQLITE_FALLBACK_URL}.")
            return fallback
    except Exception:  # noqa: BLE001
        fallback = _build_engine(SQLITE_FALLBACK_URL)
        print(f"MySQL connection failed. Falling back to local SQLite database at {SQLITE_FALLBACK_URL}.")
        return fallback


engine = _resolve_engine()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and guarantee clean shutdown."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all database tables if they do not already exist."""

    from breast_cancer_system.database import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
