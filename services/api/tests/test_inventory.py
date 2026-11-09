from __future__ import annotations

import uuid

import pytest

from services.api.tests.test_auth import create_authenticated_user


def sku_payload(**overrides):
    payload = {
        "name": "Classic White Sneaker - Size 42",
        "sku": "CLT-SNK-W-42",
        "client_name": "PureStep Footwear",
        "category": "fashion",
        "warehouse": "LA",
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def client_and_headers(api_database):
    client, _, _, users_table, _ = api_database
    _, headers = create_authenticated_user(client)
    return client, headers, users_table


def create_sku(client, headers, **overrides):
    response = client.post("/inventory/products", json=sku_payload(**overrides), headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def receive(client, headers, sku_id, quantity, warehouse="LA", reference="PO-2024-0098"):
    return client.post(
        "/inventory/orders/inbound",
        json={"sku_id": sku_id, "quantity": quantity, "reference": reference, "warehouse": warehouse},
        headers=headers,
    )


def dispatch(client, headers, sku_id, quantity, warehouse="LA", **overrides):
    payload = {
        "sku_id": sku_id,
        "quantity": quantity,
        "exit_type": "dispatch",
        "tracking_number": "1Z999AA10123456784",
        "warehouse": warehouse,
    }
    payload.update(overrides)
    return client.post("/inventory/orders/outbound", json=payload, headers=headers)


def test_inventory_routes_require_authentication(api_database):
    client, *_ = api_database
    assert client.get("/inventory/products").status_code == 401
    assert client.post("/inventory/products", json=sku_payload()).status_code == 401
    assert client.post("/inventory/orders/inbound", json={}).status_code == 401
    assert client.post("/inventory/orders/outbound", json={}).status_code == 401
    assert client.get("/inventory/orders").status_code == 401


def test_new_sku_starts_at_zero_and_stock_cannot_be_set(client_and_headers):
    client, headers, _ = client_and_headers
    sku = create_sku(client, headers)
    assert sku["current_stock"] == 0
    assert sku["warehouse"] == "LA"

    # current_stock is not an accepted input field.
    response = client.post(
        "/inventory/products",
        json=sku_payload(sku="TEC-EAR-001", current_stock=500),
        headers=headers,
    )
    assert response.status_code == 422
    # No route exists to edit a SKU's stock directly.
    assert client.patch(f"/inventory/products/{sku['id']}", json={"current_stock": 5}, headers=headers).status_code in (404, 405)


def test_stock_is_entries_minus_exits(client_and_headers):
    client, headers, _ = client_and_headers
    sku = create_sku(client, headers)
    assert receive(client, headers, sku["id"], 40).status_code == 201
    assert receive(client, headers, sku["id"], 25, reference="GR-LA-0234").status_code == 201
    assert dispatch(client, headers, sku["id"], 12).status_code == 201
    loss = dispatch(client, headers, sku["id"], 3, exit_type="loss", tracking_number=None)
    assert loss.status_code == 201, loss.text

    assert client.get(f"/inventory/products/{sku['id']}", headers=headers).json()["current_stock"] == 50


def test_outbound_exceeding_stock_is_rejected_before_writing(client_and_headers):
    client, headers, _ = client_and_headers
    sku = create_sku(client, headers)
    receive(client, headers, sku["id"], 10)

    response = dispatch(client, headers, sku["id"], 11)
    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Insufficient stock for SKU 'CLT-SNK-W-42'. Available: 10, requested: 11."
    )
    orders = client.get("/inventory/orders", headers=headers).json()
    assert [o["movement"] for o in orders] == ["inbound"]
    assert client.get(f"/inventory/products/{sku['id']}", headers=headers).json()["current_stock"] == 10


def test_dispatch_requires_tracking_and_loss_forbids_it(client_and_headers):
    client, headers, _ = client_and_headers
    sku = create_sku(client, headers)
    receive(client, headers, sku["id"], 10)

    assert dispatch(client, headers, sku["id"], 1, tracking_number=None).status_code == 422
    assert dispatch(client, headers, sku["id"], 1, exit_type="loss").status_code == 422


def test_stock_is_per_warehouse_not_aggregated(client_and_headers):
    client, headers, _ = client_and_headers
    la = create_sku(client, headers)
    zgz = create_sku(client, headers, sku="CLT-SNK-W-42-Z", warehouse="ZGZ")
    receive(client, headers, la["id"], 20)
    receive(client, headers, zgz["id"], 15, warehouse="ZGZ", reference="PO-2024-0112")

    products = {p["sku"]: p for p in client.get("/inventory/products", headers=headers).json()}
    assert products["CLT-SNK-W-42"]["current_stock"] == 20
    assert products["CLT-SNK-W-42-Z"]["current_stock"] == 15

    # LA has 20 units, so a 16-unit exit from ZGZ (15 units) must fail even though 35 exist overall.
    assert dispatch(client, headers, zgz["id"], 16, warehouse="ZGZ").status_code == 400
    # Movements must use the SKU record of their own warehouse.
    assert receive(client, headers, la["id"], 5, warehouse="ZGZ").status_code == 400

    only_zgz = client.get("/inventory/products?warehouse=ZGZ", headers=headers).json()
    assert [p["sku"] for p in only_zgz] == ["CLT-SNK-W-42-Z"]


def test_movements_store_creator_uuid_and_include_sku_data(client_and_headers):
    client, headers, users_table = client_and_headers
    sku = create_sku(client, headers)
    entry = receive(client, headers, sku["id"], 10).json()
    exit_ = dispatch(client, headers, sku["id"], 4).json()

    stored_uuid = users_table.all()[0]["uuid"]
    assert uuid.UUID(stored_uuid)
    assert entry["user_uuid"] == stored_uuid == exit_["user_uuid"]

    orders = client.get("/inventory/orders", headers=headers).json()
    assert {o["movement"] for o in orders} == {"inbound", "outbound"}
    for order in orders:
        assert order["sku"]["sku"] == "CLT-SNK-W-42"
        assert order["warehouse"] == "LA"


def test_duplicate_sku_in_same_warehouse_conflicts_and_unknown_sku_404(client_and_headers):
    client, headers, _ = client_and_headers
    create_sku(client, headers)
    assert client.post("/inventory/products", json=sku_payload(), headers=headers).status_code == 409
    assert client.get("/inventory/products/999", headers=headers).status_code == 404
    assert receive(client, headers, 999, 1).status_code == 404
