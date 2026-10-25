from __future__ import annotations

from datetime import datetime

import pytest
from tinydb import Query, TinyDB


@pytest.fixture
def supplier_api(api_database):
    client, table, database, _, _ = api_database
    registration = client.post(
        "/users", json={"email": "supplier-ops@example.com", "password": "secure-password-123"}
    )
    assert registration.status_code == 201
    login = client.post(
        "/auth/login",
        json={"email": "supplier-ops@example.com", "password": "secure-password-123"},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    return client, table, database, headers


def supplier_payload(**updates):
    return {
        "name": "Example Carrier",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "ops@example.com",
        "notes": "Synthetic test record.",
        **updates,
    }


def test_create_filters_and_validate_supplier_contract(supplier_api):
    client, _, _, headers = supplier_api
    created = client.post("/suppliers", json=supplier_payload(), headers=headers)

    assert created.status_code == 201
    supplier = created.json()
    assert supplier["id"] == 1
    assert supplier["updated_at"]
    assert supplier["rate_per_shipment"] == 7.45
    assert supplier["currency"] == "USD"
    assert client.get("/suppliers?country=USA&category=carrier_last_mile", headers=headers).json() == [supplier]
    assert client.get("/suppliers?category=reverse_logistics", headers=headers).json() == []

    assert client.post("/suppliers", json=supplier_payload(updated_at="2026-01-01T00:00:00Z"), headers=headers).status_code == 422
    assert client.post("/suppliers", json=supplier_payload(rate_per_shipment=0), headers=headers).status_code == 422
    assert client.post("/suppliers", json=supplier_payload(status="pending"), headers=headers).status_code == 422
    assert client.post("/suppliers", json=supplier_payload(categories=["unknown"]), headers=headers).status_code == 422
    assert client.post("/suppliers", json=supplier_payload(currency="EUR"), headers=headers).status_code == 422
    assert client.post("/suppliers", json=supplier_payload(contact_email="not-an-email"), headers=headers).status_code == 422
    assert client.post("/suppliers", json=supplier_payload(country="Mexico"), headers=headers).status_code == 422


def test_detail_rate_status_and_delete(supplier_api):
    client, _, _, headers = supplier_api
    supplier = client.post("/suppliers", json=supplier_payload(), headers=headers).json()
    supplier_id = supplier["id"]

    assert client.get(f"/suppliers/{supplier_id}", headers=headers).json() == supplier
    assert client.get("/suppliers/9999", headers=headers).status_code == 404
    assert client.patch(f"/suppliers/{supplier_id}/rate", json={"rate_per_shipment": 8.25}, headers=headers).status_code == 200
    updated = client.get(f"/suppliers/{supplier_id}", headers=headers).json()
    assert updated["rate_per_shipment"] == 8.25
    assert datetime.fromisoformat(updated["updated_at"]) > datetime.fromisoformat(supplier["updated_at"])
    assert client.patch(f"/suppliers/{supplier_id}/rate", json={"rate_per_shipment": -1}, headers=headers).status_code == 422

    suspended = client.patch(f"/suppliers/{supplier_id}/status", json={"status": "suspended"}, headers=headers)
    assert suspended.status_code == 200
    assert suspended.json()["status"] == "suspended"
    history = client.get(f"/suppliers/{supplier_id}/status-history", headers=headers)
    assert history.status_code == 200
    assert history.json()[0]["previous_status"] == "active"
    assert history.json()[0]["status"] == "suspended"
    assert client.patch(f"/suppliers/{supplier_id}/status", json={"status": "pending"}, headers=headers).status_code == 422
    assert client.delete(f"/suppliers/{supplier_id}", headers=headers).status_code == 204
    history_after_delete = client.get(f"/suppliers/{supplier_id}/status-history", headers=headers)
    assert history_after_delete.status_code == 200
    assert len(history_after_delete.json()) == 1
    assert client.delete(f"/suppliers/{supplier_id}", headers=headers).status_code == 404


def test_seed_is_exact_idempotent_and_persistent(supplier_api, tmp_path):
    _, table, _, _ = supplier_api
    from services.api import seed

    supplier_query = Query()
    seed.main()
    assert len(table) == 15
    assert len(table.search(supplier_query.country == "USA")) == 9
    assert len(table.search(supplier_query.country == "Spain")) == 6

    seed.main()
    assert len(table) == 15

    reopened = TinyDB(tmp_path / "test-api.json").table("suppliers")
    assert len(reopened) == 15
    assert reopened.get(supplier_query.name == "UPS Ground") is not None