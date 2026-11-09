"""Shared helpers for the auth test modules."""

from __future__ import annotations

PASSWORD = "secure-password-123"


def register(client, email="ops@example.com", password=PASSWORD, **profile):
    return client.post("/users", json={"email": email, "password": password, **profile})


def login(client, email="ops@example.com", password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def auth_headers(client, email="ops@example.com", password=PASSWORD, **profile):
    """Registers and logs in a user; returns (user_id, headers)."""
    registration = register(client, email, password, **profile)
    assert registration.status_code == 201, registration.text
    token = login(client, email, password).json()["access_token"]
    return registration.json()["user"]["id"], {"Authorization": f"Bearer {token}"}


def make_admin(users_table, user_id):
    users_table.update({"role": "admin"}, doc_ids=[user_id])
