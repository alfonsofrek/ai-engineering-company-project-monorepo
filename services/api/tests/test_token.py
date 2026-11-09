"""security.py — JWT creation and the get_current_user dependency (unit level)."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from jose import jwt

from services.api import security
from services.api.tests.helpers import register

SECRET = "test-only-secret-key-with-more-than-32-bytes"


def token(sub, minutes=5, secret=SECRET, **extra):
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": sub, "iat": now, "exp": now + timedelta(minutes=minutes), **extra}, secret, algorithm=security.ALGORITHM)


# Happy path
def test_created_token_identifies_user_and_expires_as_configured(api_database, monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
    access_token, expires_in = security.create_access_token(7)
    claims = jwt.decode(access_token, SECRET, algorithms=[security.ALGORITHM])
    assert claims["sub"] == "7" and expires_in == 15
    assert 14 * 60 <= claims["exp"] - claims["iat"] <= 15 * 60


def test_valid_token_resolves_the_active_user(api_database):
    client, *_ = api_database
    user_id = register(client).json()["user"]["id"]
    assert security.get_current_user(token(str(user_id))).id == user_id


# Edge cases
def test_token_for_deleted_or_deactivated_user_is_rejected(api_database):
    client, _, _, users_table, _ = api_database
    user_id = register(client).json()["user"]["id"]
    users_table.update({"is_active": False}, doc_ids=[user_id])
    with pytest.raises(HTTPException) as inactive:
        security.get_current_user(token(str(user_id)))
    with pytest.raises(HTTPException) as missing:
        security.get_current_user(token("999"))
    assert inactive.value.status_code == missing.value.status_code == 401


def test_expiry_setting_must_be_a_positive_integer(monkeypatch):
    for bad in ("0", "-5", "soon"):
        monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", bad)
        with pytest.raises(RuntimeError):
            security.token_expiration_minutes()


def test_secret_shorter_than_32_characters_is_refused(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "too-short")
    with pytest.raises(RuntimeError):
        security.create_access_token(1)


# Failure modes
@pytest.mark.parametrize(
    "bad_token",
    [
        "not-a-jwt",
        token("1", minutes=-1),                       # expired
        token("1", secret="another-secret-key-of-at-least-32-chars"),  # wrong signature
        token("abc"),                                 # sub is not a user id
        jwt.encode({"exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, SECRET, algorithm="HS256"),  # no sub
    ],
)
def test_invalid_tokens_raise_401(api_database, bad_token):
    with pytest.raises(HTTPException) as error:
        security.get_current_user(bad_token)
    assert error.value.status_code == 401


def test_token_signed_with_none_algorithm_is_rejected(api_database):
    unsigned = jwt.encode({"sub": "1"}, "", algorithm="none") if "none" in jwt.ALGORITHMS.SUPPORTED else "e30.eyJzdWIiOiIxIn0."
    with pytest.raises(HTTPException):
        security.get_current_user(unsigned)
