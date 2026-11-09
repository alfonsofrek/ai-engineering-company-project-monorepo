"""POST /auth/login."""

from jose import jwt

from services.api.security import ALGORITHM
from services.api.tests.helpers import auth_headers, login, register

SECRET = "test-only-secret-key-with-more-than-32-bytes"


# Happy path
def test_login_returns_a_token_for_the_right_user(api_database):
    client, *_ = api_database
    user_id = register(client).json()["user"]["id"]
    body = login(client).json()
    claims = jwt.decode(body["access_token"], SECRET, algorithms=[ALGORITHM])
    assert claims["sub"] == str(user_id)
    assert body["token_type"] == "bearer" and body["expires_in"] == 30


# Edge cases
def test_login_ignores_email_casing(api_database):
    client, *_ = api_database
    register(client, email="Ops@Example.com")
    assert login(client, email="ops@example.com").status_code == 200


def test_empty_password_does_not_log_in(api_database):
    client, *_ = api_database
    register(client)
    assert login(client, password="").status_code == 401


# Failure modes: same answer for wrong password, unknown email and inactive account
def test_wrong_credentials_and_inactive_accounts_get_the_same_401(api_database):
    client, _, _, users_table, _ = api_database
    user_id, _ = auth_headers(client)
    wrong_password = login(client, password="not-the-password")
    unknown_email = login(client, email="nobody@example.com")
    users_table.update({"is_active": False}, doc_ids=[user_id])
    inactive = login(client)
    assert wrong_password.status_code == unknown_email.status_code == inactive.status_code == 401
    assert wrong_password.json()["detail"] == unknown_email.json()["detail"] == inactive.json()["detail"]


def test_malformed_login_request_is_rejected(api_database):
    client, *_ = api_database
    assert client.post("/auth/login", json={"email": "ops@example.com"}).status_code == 422
