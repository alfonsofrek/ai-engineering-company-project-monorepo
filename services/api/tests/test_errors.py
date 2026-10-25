from __future__ import annotations

import io

from fastapi import APIRouter
from fastapi.testclient import TestClient

from services.api.tests.test_auth import create_authenticated_user


def test_validation_errors_never_echo_the_submitted_input(api_database):
    client, *_ = api_database
    secret = "Zq9x"
    response = client.post("/users", json={"email": "not-an-email", "password": secret})

    assert response.status_code == 422
    body = response.json()
    assert body["message"]
    assert body["field"] in {"email", "password"}
    assert all("input" not in issue for issue in body["detail"])
    assert secret not in response.text


def test_not_found_returns_clean_json(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)

    response = client.get("/suppliers/9999", headers=headers)

    assert response.status_code == 404
    assert response.json()["message"] == "No existe ningún proveedor con ese identificador."


def test_unhandled_exceptions_return_generic_500_without_internals(api_database):
    from services.api.main import app

    router = APIRouter()

    @router.get("/__boom")
    def boom() -> None:
        raise RuntimeError("postgres://admin:hunter2@db.internal/trackflow")

    app.include_router(router)
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/__boom")

    assert response.status_code == 500
    assert "hunter2" not in response.text
    assert "Traceback" not in response.text
    assert response.json()["message"].startswith("Ha ocurrido un error inesperado")


def test_csv_analysis_reports_format_errors_in_plain_language(api_database):
    client, *_ = api_database
    response = client.post(
        "/api/incidents/analyze",
        files={"file": ("incidents.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
    )

    assert response.status_code == 400
    assert response.json()["message"].startswith("Faltan columnas obligatorias")
    assert "/tmp" not in response.text


def test_csv_analysis_rejects_empty_and_non_csv_files(api_database):
    client, *_ = api_database
    empty = client.post(
        "/api/incidents/analyze", files={"file": ("incidents.csv", io.BytesIO(b""), "text/csv")}
    )
    wrong_type = client.post(
        "/api/incidents/analyze", files={"file": ("incidents.txt", io.BytesIO(b"x"), "text/plain")}
    )

    assert empty.status_code == 400
    assert wrong_type.status_code == 400
