from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest

from services.api import password_reset
from services.api.routes import auth as auth_routes
from services.api.tests.test_auth import create_authenticated_user

EMAIL = "ops@example.com"
OLD_PASSWORD = "secure-password-123"
NEW_PASSWORD = "brand-new-password-456"


@pytest.fixture
def sent_emails(monkeypatch):
    """Captures reset emails instead of calling Resend."""
    outbox: list[dict] = []
    monkeypatch.setattr(
        auth_routes,
        "send_password_reset_email",
        lambda to, url, minutes: outbox.append({"to": to, "url": url, "minutes": minutes}),
    )
    return outbox


def token_from(email: dict) -> str:
    return parse_qs(urlparse(email["url"]).query)["token"][0]


def login(client, password, email=EMAIL):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_forgot_password_sends_link_to_registered_email(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)

    response = client.post("/auth/forgot-password", json={"email": EMAIL})
    assert response.status_code == 200
    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == EMAIL
    assert sent_emails[0]["url"].startswith("http://localhost:3000/reset-password?token=")
    assert 15 <= sent_emails[0]["minutes"] <= 60


def test_forgot_password_does_not_reveal_unknown_emails(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)

    known = client.post("/auth/forgot-password", json={"email": EMAIL})
    unknown = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()
    assert [email["to"] for email in sent_emails] == [EMAIL]


def test_reset_password_changes_password_and_token_works_once(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)
    client.post("/auth/forgot-password", json={"email": EMAIL})
    token = token_from(sent_emails[0])

    first = client.post("/auth/reset-password", json={"token": token, "new_password": NEW_PASSWORD})
    assert first.status_code == 200
    assert login(client, OLD_PASSWORD).status_code == 401
    assert login(client, NEW_PASSWORD).status_code == 200

    reused = client.post("/auth/reset-password", json={"token": token, "new_password": "another-pass-789"})
    assert reused.status_code == 400
    assert login(client, NEW_PASSWORD).status_code == 200


def test_expired_token_is_rejected(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)
    client.post("/auth/forgot-password", json={"email": EMAIL})
    token = token_from(sent_emails[0])

    past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    password_reset.password_reset_tokens_table.update({"expires_at": past})

    response = client.post("/auth/reset-password", json={"token": token, "new_password": NEW_PASSWORD})
    assert response.status_code == 400
    assert login(client, OLD_PASSWORD).status_code == 200


def test_invalid_token_is_rejected(api_database):
    client, *_ = api_database
    response = client.post(
        "/auth/reset-password", json={"token": "x" * 43, "new_password": NEW_PASSWORD}
    )
    assert response.status_code == 400


def test_newer_password_change_revokes_older_reset_links(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)
    client.post("/auth/forgot-password", json={"email": EMAIL})
    client.post("/auth/forgot-password", json={"email": EMAIL})
    first, second = token_from(sent_emails[0]), token_from(sent_emails[1])

    assert client.post("/auth/reset-password", json={"token": second, "new_password": NEW_PASSWORD}).status_code == 200
    assert client.post("/auth/reset-password", json={"token": first, "new_password": "another-pass-789"}).status_code == 400


def test_reset_requests_are_rate_limited_per_user(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)
    for _ in range(password_reset.MAX_REQUESTS_PER_HOUR + 2):
        assert client.post("/auth/forgot-password", json={"email": EMAIL}).status_code == 200
    assert len(sent_emails) == password_reset.MAX_REQUESTS_PER_HOUR


def test_change_password_requires_auth_and_correct_current_password(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)

    assert client.post(
        "/auth/change-password", json={"current_password": OLD_PASSWORD, "new_password": NEW_PASSWORD}
    ).status_code == 401

    wrong = client.post(
        "/auth/change-password",
        json={"current_password": "not-my-password", "new_password": NEW_PASSWORD},
        headers=headers,
    )
    assert wrong.status_code == 400
    assert login(client, OLD_PASSWORD).status_code == 200

    ok = client.post(
        "/auth/change-password",
        json={"current_password": OLD_PASSWORD, "new_password": NEW_PASSWORD},
        headers=headers,
    )
    assert ok.status_code == 200
    assert login(client, OLD_PASSWORD).status_code == 401
    assert login(client, NEW_PASSWORD).status_code == 200


def test_short_new_password_is_rejected(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)
    response = client.post(
        "/auth/change-password",
        json={"current_password": OLD_PASSWORD, "new_password": "short"},
        headers=headers,
    )
    assert response.status_code == 422


def test_reset_link_lifetime_must_stay_between_15_and_60_minutes(monkeypatch):
    for bad in ("5", "61", "half-hour"):
        monkeypatch.setenv("PASSWORD_RESET_TOKEN_MINUTES", bad)
        with pytest.raises(RuntimeError):
            password_reset.token_lifetime_minutes()
    monkeypatch.setenv("PASSWORD_RESET_TOKEN_MINUTES", "45")
    assert password_reset.token_lifetime_minutes() == 45


def test_only_the_token_hash_is_stored(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)
    client.post("/auth/forgot-password", json={"email": EMAIL})
    raw = token_from(sent_emails[0])
    stored = password_reset.password_reset_tokens_table.all()[0]
    assert raw not in str(stored) and len(stored["token_hash"]) == 64


def test_forgot_password_for_inactive_account_sends_nothing(api_database, sent_emails):
    client, _, _, users_table, _ = api_database
    registration, _ = create_authenticated_user(client)
    users_table.update({"is_active": False}, doc_ids=[registration["user"]["id"]])
    assert client.post("/auth/forgot-password", json={"email": EMAIL}).status_code == 200
    assert sent_emails == []


def test_forgot_password_matches_email_in_any_case(api_database, sent_emails):
    client, *_ = api_database
    create_authenticated_user(client)
    client.post("/auth/forgot-password", json={"email": "OPS@Example.com"})
    assert [e["to"] for e in sent_emails] == [EMAIL]


def test_change_password_to_the_same_one_is_rejected(api_database):
    client, *_ = api_database
    _, headers = create_authenticated_user(client)
    response = client.post(
        "/auth/change-password",
        json={"current_password": OLD_PASSWORD, "new_password": OLD_PASSWORD},
        headers=headers,
    )
    assert response.status_code == 400
