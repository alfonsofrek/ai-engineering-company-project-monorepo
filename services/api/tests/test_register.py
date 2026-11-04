"""POST /users — public registration."""

from passlib.hash import bcrypt

from services.api.tests.helpers import PASSWORD, login, register


# Happy path
def test_registration_creates_user_role_and_profile(api_database):
    client, _, _, users_table, profiles_table = api_database
    response = register(client, name="Ana Ruiz", phone="+34600111222")
    assert response.status_code == 201
    user = users_table.all()[0]
    assert user["role"] == "user" and user["is_active"] is True
    assert bcrypt.verify(PASSWORD, user["hashed_password"]) and PASSWORD not in str(user)
    assert profiles_table.all()[0]["name"] == "Ana Ruiz"


# Edge case: the same email with different casing is the same account (bug fixed, see TESTING.md)
def test_email_is_case_insensitive_for_uniqueness(api_database):
    client, *_ = api_database
    assert register(client, email="Ops.Lead@Example.com").status_code == 201
    assert register(client, email="ops.lead@example.com").status_code == 409


# Edge case: a password is stored exactly as typed, spaces included (bug fixed, see TESTING.md)
def test_password_keeps_surrounding_spaces(api_database):
    client, *_ = api_database
    assert register(client, password="  spaced-password  ").status_code == 201
    assert login(client, password="  spaced-password  ").status_code == 200
    assert login(client, password="spaced-password").status_code == 401


# Edge case: bcrypt only uses 72 bytes, so longer passwords are rejected instead of truncated
def test_password_longer_than_72_bytes_is_rejected(api_database):
    client, *_ = api_database
    assert register(client, password="ñ" * 37).status_code == 422  # 74 bytes, 37 characters


# Failure modes
def test_duplicate_email_is_rejected(api_database):
    client, *_ = api_database
    register(client)
    response = register(client)
    assert response.status_code == 409


def test_invalid_input_is_rejected(api_database):
    client, _, _, users_table, _ = api_database
    assert register(client, password="short").status_code == 422
    assert register(client, email="not-an-email").status_code == 422
    assert client.post("/users", json={"email": "a@example.com", "password": PASSWORD, "role": "admin"}).status_code == 422
    assert users_table.all() == []
