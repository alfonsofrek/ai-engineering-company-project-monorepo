from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import jwt
from tinydb import Query

from services.api.security import ALGORITHM


def create_authenticated_user(client, email="ops@example.com", password="secure-password-123", **profile):
    registration = client.post(
        "/users",
        json={"email": email, "password": password, **profile},
    )
    assert registration.status_code == 201
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return registration.json(), {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_registration_hashes_credentials_and_creates_profile(api_database):
    client, _, _, users_table, profiles_table = api_database
    response = client.post(
        "/users",
        json={
            "email": "marina@example.com",
            "password": "strong-password-123",
            "name": "Marina Ruiz",
            "phone": "+525512345678",
            "address": "Mexico City",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "user"
    assert "hashed_password" not in body["user"]
    assert body["profile"]["name"] == "Marina Ruiz"
    assert body["profile"]["user_id"] == body["user"]["id"]

    stored_user = users_table.get(doc_id=body["user"]["id"])
    assert stored_user["hashed_password"] != "strong-password-123"
    assert "name" not in stored_user
    assert len(profiles_table) == 1
    assert client.post(
        "/users",
        json={"email": "admin@example.com", "password": "strong-password-123", "role": "admin"},
    ).status_code == 422
    assert client.post(
        "/users",
        json={"email": "marina@example.com", "password": "strong-password-123"},
    ).status_code == 409


def test_login_me_profile_and_self_permissions(api_database):
    client, _, _, _, _ = api_database
    registration, headers = create_authenticated_user(
        client,
        email="marina@example.com",
        name="Marina Ruiz",
    )
    user_id = registration["user"]["id"]

    assert client.post(
        "/auth/login", json={"email": "marina@example.com", "password": "wrong-password"}
    ).status_code == 401
    me = client.get("/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "marina@example.com"
    assert me.json()["profile"]["name"] == "Marina Ruiz"
    assert client.get(f"/users/{user_id}", headers=headers).status_code == 200
    assert client.get("/users", headers=headers).status_code == 403
    assert client.put(
        f"/users/{user_id}", json={"role": "manager"}, headers=headers
    ).status_code == 403

    updated_profile = client.put(
        "/profiles/me", json={"phone": "+34911222333", "address": "Madrid"}, headers=headers
    )
    assert updated_profile.status_code == 200
    assert updated_profile.json()["name"] == "Marina Ruiz"
    assert updated_profile.json()["address"] == "Madrid"
    assert client.get("/profiles/me", headers=headers).json() == updated_profile.json()

    updated_user = client.put(
        f"/users/{user_id}",
        json={"email": "marina.updated@example.com", "password": "new-secure-password-456"},
        headers=headers,
    )
    assert updated_user.status_code == 200
    assert "hashed_password" not in updated_user.json()
    assert client.post(
        "/auth/login", json={"email": "marina.updated@example.com", "password": "strong-password-123"}
    ).status_code == 401
    assert client.post(
        "/auth/login", json={"email": "marina.updated@example.com", "password": "new-secure-password-456"}
    ).status_code == 200


def test_users_cannot_access_or_mutate_another_users_account(api_database):
    client, _, _, _, _ = api_database
    _, owner_headers = create_authenticated_user(client, email="owner@example.com")
    other, _ = create_authenticated_user(client, email="other@example.com")
    other_id = other["user"]["id"]

    assert client.get(f"/users/{other_id}", headers=owner_headers).status_code == 403
    assert client.put(
        f"/users/{other_id}", json={"email": "changed@example.com"}, headers=owner_headers
    ).status_code == 403
    assert client.delete(f"/users/{other_id}", headers=owner_headers).status_code == 403


def test_admin_can_manage_users_and_deletion_removes_profile(api_database):
    client, _, _, users_table, profiles_table = api_database
    admin, admin_headers = create_authenticated_user(client, email="admin@example.com")
    member, _ = create_authenticated_user(client, email="member@example.com")
    admin_id = admin["user"]["id"]
    member_id = member["user"]["id"]
    users_table.update({"role": "admin"}, doc_ids=[admin_id])

    assert client.get("/users", headers=admin_headers).status_code == 200
    changed_role = client.put(
        f"/users/{member_id}", json={"role": "manager"}, headers=admin_headers
    )
    assert changed_role.status_code == 200
    assert changed_role.json()["role"] == "manager"
    inactive_member = client.put(
        f"/users/{member_id}", json={"is_active": False}, headers=admin_headers
    )
    assert inactive_member.status_code == 200
    assert client.post(
        "/auth/login", json={"email": "member@example.com", "password": "secure-password-123"}
    ).status_code == 401

    assert client.delete(f"/users/{member_id}", headers=admin_headers).status_code == 204
    assert users_table.get(doc_id=member_id) is None
    assert profiles_table.get(Query().user_id == member_id) is None


def test_missing_invalid_and_expired_tokens_are_rejected(api_database):
    client, _, _, _, _ = api_database
    registration, _ = create_authenticated_user(client, email="token@example.com")
    user_id = registration["user"]["id"]

    supplier_payload = {
        "name": "Example Carrier",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 3.5,
        "currency": "USD",
        "status": "active",
    }
    protected_routes = [
        ("GET", "/users", None),
        ("GET", f"/users/{user_id}", None),
        ("PUT", f"/users/{user_id}", {"email": "new@example.com"}),
        ("DELETE", f"/users/{user_id}", None),
        ("GET", "/profiles/me", None),
        ("PUT", "/profiles/me", {"phone": "+525512345678"}),
        ("GET", "/auth/me", None),
        ("GET", "/suppliers", None),
        ("GET", "/suppliers/1", None),
        ("POST", "/suppliers", supplier_payload),
        ("PATCH", "/suppliers/1/rate", {"rate_per_shipment": 4.0}),
        ("PATCH", "/suppliers/1/status", {"status": "suspended"}),
        ("GET", "/suppliers/1/status-history", None),
        ("DELETE", "/suppliers/1", None),
    ]
    for method, path, body in protected_routes:
        kwargs = {"json": body} if body is not None else {}
        response = client.request(method, path, **kwargs)
        assert response.status_code == 401, (method, path, response.text)

    assert client.get("/auth/me", headers={"Authorization": "Bearer malformed"}).status_code == 401
    expired_token = jwt.encode(
        {"sub": str(user_id), "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        "test-only-secret-key-with-more-than-32-bytes",
        algorithm=ALGORITHM,
    )
    expired_response = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert expired_response.status_code == 401
