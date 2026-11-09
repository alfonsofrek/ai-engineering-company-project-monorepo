from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB


@pytest.fixture
def api_database(tmp_path, monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-secret-key-with-more-than-32-bytes")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    monkeypatch.setenv("SUPPLIERS_DB_PATH", str(tmp_path / "bootstrap.json"))
    # Inventory runs against a throwaway SQLite file by default. Set TEST_DATABASE_URL to an
    # empty PostgreSQL database to run the same tests with real FK/CHECK constraints.
    test_database_url = os.getenv("TEST_DATABASE_URL")
    monkeypatch.setenv("DATABASE_URL", test_database_url or f"sqlite:///{tmp_path / 'inventory.db'}")
    from services.api.database import get_engine

    get_engine.cache_clear()

    from services.api import seed, user_store
    from services.api.main import app
    from services.api.routes import incidents as incident_routes
    from services.api.routes import suppliers as supplier_routes

    database = TinyDB(tmp_path / "test-api.json")
    supplier_table = database.table("suppliers")
    history_table = database.table("supplier_status_history")
    users_table = database.table("users")
    profiles_table = database.table("profiles")
    incidents_table = database.table("incidents")
    monkeypatch.setattr(incident_routes, "incidents_table", incidents_table)
    monkeypatch.setattr(supplier_routes, "suppliers_table", supplier_table)
    monkeypatch.setattr(supplier_routes, "supplier_status_history_table", history_table)
    monkeypatch.setattr(seed, "suppliers_table", supplier_table)
    monkeypatch.setattr(user_store, "users_table", users_table)
    monkeypatch.setattr(user_store, "profiles_table", profiles_table)
    from services.api import password_reset

    monkeypatch.setattr(password_reset, "password_reset_tokens_table", database.table("password_reset_tokens"))

    with TestClient(app) as client:
        yield client, supplier_table, database, users_table, profiles_table

    database.close()
    if test_database_url:
        from sqlmodel import SQLModel

        SQLModel.metadata.drop_all(get_engine())
    get_engine().dispose()
    get_engine.cache_clear()
