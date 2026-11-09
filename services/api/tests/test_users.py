"""GET/PUT/DELETE /users — ownership and admin rules."""

from services.api.tests.helpers import PASSWORD, auth_headers, login, make_admin


# Happy paths
def test_user_reads_and_updates_own_account(api_database):
    client, *_ = api_database
    user_id, headers = auth_headers(client)
    assert client.get(f"/users/{user_id}", headers=headers).json()["email"] == "ops@example.com"
    updated = client.put(f"/users/{user_id}", json={"email": "New@Example.com"}, headers=headers)
    assert updated.status_code == 200 and updated.json()["email"] == "new@example.com"
    assert login(client, email="new@example.com").status_code == 200


def test_admin_lists_and_deletes_other_accounts(api_database):
    client, _, _, users_table, profiles_table = api_database
    admin_id, admin = auth_headers(client, email="admin@example.com")
    member_id, _ = auth_headers(client, email="member@example.com")
    make_admin(users_table, admin_id)
    assert {u["email"] for u in client.get("/users", headers=admin).json()} == {"admin@example.com", "member@example.com"}
    assert client.delete(f"/users/{member_id}", headers=admin).status_code == 204
    assert users_table.get(doc_id=member_id) is None
    assert all(p["user_id"] != member_id for p in profiles_table.all())


# Edge cases
def test_changing_password_via_put_revokes_pending_reset_links(api_database, monkeypatch):
    client, *_ = api_database
    from services.api.routes import auth as auth_routes

    outbox = []
    monkeypatch.setattr(auth_routes, "send_password_reset_email", lambda to, url, minutes: outbox.append(url))
    user_id, headers = auth_headers(client)
    client.post("/auth/forgot-password", json={"email": "ops@example.com"})
    reset_token = outbox[0].split("token=")[1]

    client.put(f"/users/{user_id}", json={"password": "changed-via-put-1"}, headers=headers)
    reused = client.post("/auth/reset-password", json={"token": reset_token, "new_password": "attacker-pass-2"})
    assert reused.status_code == 400
    assert login(client, password="changed-via-put-1").status_code == 200


def test_email_change_to_an_existing_one_in_other_case_conflicts(api_database):
    client, *_ = api_database
    auth_headers(client, email="taken@example.com")
    user_id, headers = auth_headers(client)
    assert client.put(f"/users/{user_id}", json={"email": "TAKEN@example.com"}, headers=headers).status_code == 409


def test_empty_update_is_rejected(api_database):
    client, *_ = api_database
    user_id, headers = auth_headers(client)
    assert client.put(f"/users/{user_id}", json={}, headers=headers).status_code == 422


# Failure modes
def test_regular_user_cannot_touch_other_accounts_or_escalate(api_database):
    client, *_ = api_database
    other_id, _ = auth_headers(client, email="other@example.com")
    user_id, headers = auth_headers(client)
    assert client.get("/users", headers=headers).status_code == 403
    assert client.get(f"/users/{other_id}", headers=headers).status_code == 403
    assert client.put(f"/users/{other_id}", json={"email": "x@example.com"}, headers=headers).status_code == 403
    assert client.delete(f"/users/{other_id}", headers=headers).status_code == 403
    assert client.put(f"/users/{user_id}", json={"role": "admin"}, headers=headers).status_code == 403
    assert client.put(f"/users/{user_id}", json={"is_active": False}, headers=headers).status_code == 403
    assert login(client, email="other@example.com", password=PASSWORD).status_code == 200


def test_admin_gets_404_for_unknown_users(api_database):
    client, _, _, users_table, _ = api_database
    admin_id, admin = auth_headers(client, email="admin@example.com")
    make_admin(users_table, admin_id)
    assert client.get("/users/999", headers=admin).status_code == 404
    assert client.put("/users/999", json={"email": "x@example.com"}, headers=admin).status_code == 404
    assert client.delete("/users/999", headers=admin).status_code == 404
