"""GET/PUT /profiles/me."""

from services.api.tests.helpers import auth_headers


# Happy path
def test_profile_is_read_and_partially_updated(api_database):
    client, *_ = api_database
    _, headers = auth_headers(client, name="Ana", phone="+34600111222")
    updated = client.put("/profiles/me", json={"phone": "+34600999888"}, headers=headers).json()
    assert updated["phone"] == "+34600999888" and updated["name"] == "Ana"
    assert client.get("/profiles/me", headers=headers).json()["phone"] == "+34600999888"


# Edge cases
def test_fields_can_be_cleared_with_null(api_database):
    client, *_ = api_database
    _, headers = auth_headers(client, address="Calle Mayor 1")
    assert client.put("/profiles/me", json={"address": None}, headers=headers).json()["address"] is None


def test_each_user_only_sees_their_own_profile(api_database):
    client, *_ = api_database
    _, ana = auth_headers(client, email="ana@example.com", name="Ana")
    _, luis = auth_headers(client, email="luis@example.com", name="Luis")
    assert client.get("/profiles/me", headers=ana).json()["name"] == "Ana"
    assert client.get("/profiles/me", headers=luis).json()["name"] == "Luis"


# Failure modes
def test_invalid_profile_updates_are_rejected(api_database):
    client, *_ = api_database
    _, headers = auth_headers(client)
    assert client.put("/profiles/me", json={}, headers=headers).status_code == 422
    assert client.put("/profiles/me", json={"name": "x" * 121}, headers=headers).status_code == 422
    assert client.put("/profiles/me", json={"user_id": 99}, headers=headers).status_code == 422


def test_profile_routes_require_a_token(api_database):
    client, *_ = api_database
    assert client.get("/profiles/me").status_code == 401
    assert client.put("/profiles/me", json={"name": "x"}).status_code == 401
