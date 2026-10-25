from __future__ import annotations

import sys
from pathlib import Path

import pytest
from tinydb import TinyDB

from services.api.tests.test_auth import create_authenticated_user

ROOT = Path(__file__).resolve().parents[3]


def incident(**overrides):
    payload = {
        "title": "Paquete no entregado",
        "description": "El cliente indica que el paquete no ha llegado tras 5 días.",
        "category": "delayed_delivery",
        "origin": "branch",
        "branch": "zaragoza",
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def client_and_headers(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)
    return client, headers


def test_incident_endpoints_require_authentication(api_database):
    client, *_ = api_database
    assert client.get("/api/incidents").status_code == 401
    assert client.post("/api/incidents", json=incident()).status_code == 401


def test_create_get_and_list_with_filters(client_and_headers):
    client, headers = client_and_headers
    created = client.post("/api/incidents", json=incident(), headers=headers)
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "open"
    assert body["created_at"] and body["updated_at"]

    client.post("/api/incidents", json=incident(origin="internal", branch="central", category="damage"), headers=headers)

    assert client.get(f"/api/incidents/{body['id']}", headers=headers).json()["title"] == "Paquete no entregado"
    assert len(client.get("/api/incidents", headers=headers).json()) == 2
    assert len(client.get("/api/incidents?branch=central", headers=headers).json()) == 1
    assert len(client.get("/api/incidents?origin=branch&status=open", headers=headers).json()) == 1
    assert client.get("/api/incidents?category=lost_parcel", headers=headers).json() == []


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        (incident(title=""), "title"),
        ({key: value for key, value in incident().items() if key != "branch"}, "branch"),
        (incident(category="robo"), "category"),
        (incident(origin="partner"), "origin"),
        (incident(status="closed"), "status"),
    ],
)
def test_create_returns_400_identifying_the_field(client_and_headers, payload, field):
    client, headers = client_and_headers
    response = client.post("/api/incidents", json=payload, headers=headers)
    assert response.status_code == 400
    body = response.json()
    assert body["field"] == field
    assert body["message"]
    assert "Traceback" not in response.text


def test_missing_incident_returns_404(client_and_headers):
    client, headers = client_and_headers
    response = client.get("/api/incidents/999", headers=headers)
    assert response.status_code == 404
    assert response.json()["message"]


def test_status_lifecycle(client_and_headers):
    client, headers = client_and_headers
    incident_id = client.post("/api/incidents", json=incident(), headers=headers).json()["id"]
    path = f"/api/incidents/{incident_id}/status"

    assert client.patch(path, json={"status": "resolved"}, headers=headers).status_code == 400
    moved = client.patch(path, json={"status": "in_progress"}, headers=headers)
    assert moved.status_code == 200 and moved.json()["status"] == "in_progress"
    assert client.patch(path, json={"status": "resolved"}, headers=headers).json()["status"] == "resolved"
    final = client.patch(path, json={"status": "open"}, headers=headers)
    assert final.status_code == 400
    assert final.json()["field"] == "status"
    assert client.patch(path, json={"status": "nope"}, headers=headers).status_code == 400
    assert client.patch("/api/incidents/999/status", json={"status": "discarded"}, headers=headers).status_code == 404


def test_summary_on_empty_and_populated_database(client_and_headers):
    client, headers = client_and_headers
    empty = client.get("/api/incidents/summary", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["total"] == 0
    assert empty.json()["by_branch"] == {"los_angeles": 0, "zaragoza": 0, "central": 0}

    client.post("/api/incidents", json=incident(), headers=headers)
    client.post("/api/incidents", json=incident(origin="customer", branch="los_angeles"), headers=headers)
    summary = client.get("/api/incidents/summary", headers=headers).json()
    assert summary["total"] == 2
    assert summary["by_status"]["open"] == 2
    assert summary["by_origin"] == {"customer": 1, "branch": 1, "internal": 0}


def test_seed_is_idempotent_and_assigns_customer_origin(tmp_path):
    sys.path.insert(0, str(ROOT / "scripts"))
    import seed_incidents

    table = TinyDB(tmp_path / "seed.json").table("incidents")
    csv_path = ROOT / "scripts" / "incidents-trackflow.csv"

    inserted, skipped, rejected = seed_incidents.seed(csv_path, table)
    assert (inserted, skipped, len(rejected)) == (95, 0, 5)
    assert {row["origin"] for row in table.all()} == {"customer"}
    assert {row["branch"] for row in table.all()} <= {"los_angeles", "zaragoza"}

    assert seed_incidents.seed(csv_path, table)[:2] == (0, 95)
    assert len(table) == 95
