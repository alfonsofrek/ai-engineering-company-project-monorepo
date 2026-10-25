from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB


@pytest.fixture
def api_database(tmp_path, monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-secret-key-with-more-than-32-bytes")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    monkeypatch.setenv("SUPPLIERS_DB_PATH", str(tmp_path / "bootstrap.json"))

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

    with TestClient(app) as client:
        yield client, supplier_table, database, users_table, profiles_table

    database.close()
