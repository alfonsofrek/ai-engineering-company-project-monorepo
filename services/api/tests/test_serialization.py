"""Response contracts from docs/serialization-audit.md.

Each test pins the *exact* set of keys an endpoint returns, so a new model field can
never leak into a response by accident: adding a key to an output means changing the
schema, the audit document and this file on purpose.
"""

from __future__ import annotations

from services.api.tests.helpers import PASSWORD, auth_headers, login, make_admin, register
from services.api.tests.test_inventory import client_and_headers, create_sku, dispatch, receive  # noqa: F401 (fixture)

SENSITIVE_KEYS = {"password", "hashed_password", "token", "reset_token", "password_changed_at", "user_id"}


def all_keys(value) -> set[str]:
    """Every key at any depth of a JSON value."""
    if isinstance(value, dict):
        return set(value) | {key for item in value.values() for key in all_keys(item)}
    if isinstance(value, list):
        return {key for item in value for key in all_keys(item)}
    return set()


# --------------------------------------------------------------------------- whole API


def test_every_route_declares_its_response_model():
    """No route may fall back to FastAPI's implicit 'return whatever the handler returns'.

    Checked on the generated OpenAPI (this FastAPI version wraps included routers, so
    ``app.routes`` does not expose the individual APIRoute objects). A declared
    ``response_model`` shows up as a named schema; an undeclared one as an empty or
    ad-hoc ``additionalProperties`` object.
    """
    from services.api.main import app

    app.openapi_schema = None  # rebuild: other tests may have mounted routes since the last call
    spec = app.openapi()
    checked, undeclared = 0, []
    for path, operations in spec["paths"].items():
        if path.startswith("/__"):
            continue  # throwaway routes that test_errors.py mounts to force a 500
        for method, operation in operations.items():
            code = next(code for code in operation["responses"] if code.startswith("2"))
            content = operation["responses"][code].get("content", {})
            if code == "204" or "text/csv" in content:
                continue  # no JSON body by design (delete / CSV download)
            checked += 1
            schema = content.get("application/json", {}).get("schema", {})
            target = schema.get("items", schema)
            if not ("$ref" in target or "anyOf" in target):
                undeclared.append(f"{method.upper()} {path}")
    assert checked == 29  # 32 operations − 2 DELETE (204) − 1 CSV export
    assert undeclared == []


def test_no_response_schema_exposes_credentials():
    from services.api.main import app

    schemas = app.openapi()["components"]["schemas"]
    for name, schema in schemas.items():
        if name.endswith(("Request", "Create", "Update")) or name.startswith(("Body_", "HTTPValidation", "Validation")):
            continue  # input schemas: they are allowed to *receive* passwords
        assert not set(schema.get("properties", {})) & {"password", "hashed_password", "new_password"}, name


# ---------------------------------------------------------------------------------- auth


def test_unauthenticated_auth_flows_never_echo_email(api_database):
    client, *_ = api_database
    registration = register(client, "echo@example.com")
    assert "echo@example.com" not in registration.text
    assert set(registration.json()) == {"user", "profile"}
    assert set(registration.json()["user"]) == {"id", "role"}

    token = login(client, "echo@example.com")
    assert set(token.json()) == {"access_token", "token_type", "expires_in"}

    forgot = client.post("/auth/forgot-password", json={"email": "echo@example.com"})
    assert set(forgot.json()) == {"message"}
    assert "echo@example.com" not in forgot.text


def test_auth_me_returns_own_email_and_profile_without_foreign_key(api_database):
    client, *_ = api_database
    _, headers = auth_headers(client, name="Ana")
    me = client.get("/auth/me", headers=headers).json()
    assert set(me) == {"email", "role", "profile"}
    assert set(me["profile"]) == {"id", "name", "phone", "address"}
    assert client.get("/profiles/me", headers=headers).json() == me["profile"]


def test_user_list_is_slimmer_than_user_detail(api_database):
    client, _, _, users_table, _ = api_database
    admin_id, headers = auth_headers(client, "admin@example.com")
    make_admin(users_table, admin_id)
    listing = client.get("/users", headers=headers).json()
    assert set(listing[0]) == {"id", "email", "role", "is_active"}
    detail = client.get(f"/users/{admin_id}", headers=headers).json()
    assert set(detail) == {"id", "email", "role", "is_active", "created_at"}
    assert not all_keys(listing) & SENSITIVE_KEYS
    assert not all_keys(detail) & SENSITIVE_KEYS


# ----------------------------------------------------------------- suppliers / incidents


SUPPLIER = {
    "name": "Rápidos del Norte",
    "country": "Spain",
    "categories": ["carrier_last_mile"],
    "rate_per_shipment": 4.5,
    "currency": "EUR",
    "status": "active",
}
SUPPLIER_FIELDS = {
    "id", "name", "country", "categories", "rate_per_shipment", "currency",
    "status", "service_zone", "contact_email", "notes", "updated_at",
}


def test_supplier_contract_and_history_without_redundant_id(api_database):
    client, *_ = api_database
    _, headers = auth_headers(client)
    created = client.post("/suppliers", json=SUPPLIER, headers=headers).json()
    assert set(created) == SUPPLIER_FIELDS
    assert set(client.get("/suppliers", headers=headers).json()[0]) == SUPPLIER_FIELDS

    client.patch(f"/suppliers/{created['id']}/status", json={"status": "suspended"}, headers=headers)
    history = client.get(f"/suppliers/{created['id']}/status-history", headers=headers).json()
    assert set(history[0]) == {"id", "previous_status", "status", "changed_at"}


def test_supplier_input_and_output_are_separate_schemas(api_database):
    """The write schema rejects output-only fields: clients cannot set id or updated_at."""
    client, *_ = api_database
    _, headers = auth_headers(client)
    for forbidden in ({"id": 99}, {"updated_at": "2020-01-01T00:00:00Z"}):
        assert client.post("/suppliers", json={**SUPPLIER, **forbidden}, headers=headers).status_code == 422


INCIDENT = {
    "title": "Paquete perdido",
    "description": "El cliente no ha recibido el paquete.",
    "category": "lost_parcel",
    "origin": "customer",
    "branch": "zaragoza",
}
INCIDENT_LIST_FIELDS = {"id", "title", "description", "category", "status", "origin", "branch", "source_ref", "created_at"}


def test_incident_list_omits_updated_at_but_detail_keeps_it(api_database):
    client, *_ = api_database
    _, headers = auth_headers(client)
    created = client.post("/api/incidents", json=INCIDENT, headers=headers).json()
    assert set(created) == INCIDENT_LIST_FIELDS | {"updated_at"}
    assert set(client.get(f"/api/incidents/{created['id']}", headers=headers).json()) == INCIDENT_LIST_FIELDS | {"updated_at"}
    assert set(client.get("/api/incidents", headers=headers).json()[0]) == INCIDENT_LIST_FIELDS
    # write schema: the client cannot choose created_at or source_ref
    assert client.post("/api/incidents", json={**INCIDENT, "source_ref": "X-1"}, headers=headers).status_code == 400


# ----------------------------------------------------------------------------- inventory


def test_movement_embeds_a_flat_sku_without_repeating_the_foreign_key(client_and_headers):
    client, headers, _ = client_and_headers
    sku = create_sku(client, headers)
    entry = receive(client, headers, sku["id"], 10).json()
    assert "sku_id" not in entry
    assert entry["sku"] == {"id": sku["id"], "name": sku["name"], "sku": sku["sku"]}

    exit_ = dispatch(client, headers, sku["id"], 3).json()
    assert "sku_id" not in exit_
    movements = client.get("/inventory/orders", headers=headers).json()
    assert {m["movement"] for m in movements} == {"inbound", "outbound"}
    assert all(set(m["sku"]) == {"id", "name", "sku"} for m in movements)
