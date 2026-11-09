"""GET /auth/me."""

from services.api.tests.helpers import auth_headers


# Happy path
def test_me_returns_identity_role_and_profile(api_database):
    client, *_ = api_database
    _, headers = auth_headers(client, name="Ana Ruiz")
    body = client.get("/auth/me", headers=headers).json()
    assert body["email"] == "ops@example.com" and body["role"] == "user"
    assert body["profile"]["name"] == "Ana Ruiz"
    assert "hashed_password" not in body


# Edge case: role changes are visible on the next request with the same token
def test_me_reflects_role_changes_without_new_login(api_database):
    client, _, _, users_table, _ = api_database
    user_id, headers = auth_headers(client)
    users_table.update({"role": "manager"}, doc_ids=[user_id])
    assert client.get("/auth/me", headers=headers).json()["role"] == "manager"


# Failure modes
def test_me_without_profile_returns_404(api_database):
    client, _, _, _, profiles_table = api_database
    _, headers = auth_headers(client)
    profiles_table.truncate()
    assert client.get("/auth/me", headers=headers).status_code == 404


def test_me_requires_a_token(api_database):
    client, *_ = api_database
    assert client.get("/auth/me").status_code == 401
