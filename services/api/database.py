"""Both data stores used by the TrackFlow API.

- TinyDB (local JSON file): users, profiles, suppliers and incidents. Auth lives here.
- Supabase (hosted PostgreSQL through SQLModel): inventory — SKUs and stock movements.

Every request that touches inventory gets its own SQLModel session through ``get_db``;
there is no global session object anywhere in the codebase.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine
from tinydb import TinyDB

load_dotenv(Path(__file__).resolve().parent / ".env")

# ---------------------------------------------------------------- TinyDB (auth + legacy)

DATABASE_PATH = Path(
    os.getenv(
        "SUPPLIERS_DB_PATH",
        Path(__file__).resolve().parent / "data" / "suppliers.json",
    )
)
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(DATABASE_PATH)
suppliers_table = db.table("suppliers")
supplier_status_history_table = db.table("supplier_status_history")
users_table = db.table("users")
profiles_table = db.table("profiles")
incidents_table = db.table("incidents")

# ------------------------------------------------------------ Supabase (inventory ORM)


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add the Supabase transaction pooler URI to services/api/.env."
        )
    # Supabase hands out postgres:// URIs; SQLAlchemy needs the explicit driver.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]
    return url


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    url = _database_url()
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    # pool_pre_ping survives Supabase's pooler closing idle connections.
    return create_engine(url, pool_pre_ping=True)


def init_inventory_db() -> None:
    """Creates the inventory tables in Supabase if they do not exist yet."""
    from services.api.inventory import models  # noqa: F401  (registers the tables)

    SQLModel.metadata.create_all(get_engine())


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one SQLModel session per request, always closed."""
    with Session(get_engine()) as session:
        yield session
