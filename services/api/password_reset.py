"""Single-use, short-lived password reset tokens.

The raw token only ever exists in the email link. TinyDB stores its SHA-256 hash with an
expiry and a ``used_at`` mark, so a token is rejected when it is unknown, expired or
already used — something a stateless JWT with only ``exp`` could not guarantee.
"""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from tinydb import Query

from services.api.database import password_reset_tokens_table

DEFAULT_TOKEN_MINUTES = 30
MAX_REQUESTS_PER_HOUR = 5


class InvalidResetToken(ValueError):
    """The token is unknown, expired or already used."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def token_lifetime_minutes() -> int:
    try:
        minutes = int(os.getenv("PASSWORD_RESET_TOKEN_MINUTES", str(DEFAULT_TOKEN_MINUTES)))
    except ValueError as error:
        raise RuntimeError("PASSWORD_RESET_TOKEN_MINUTES must be an integer.") from error
    if not 15 <= minutes <= 60:
        raise RuntimeError("PASSWORD_RESET_TOKEN_MINUTES must be between 15 and 60.")
    return minutes


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def recent_request_count(user_id: int, within: timedelta = timedelta(hours=1)) -> int:
    since = (_now() - within).isoformat()
    record = Query()
    return password_reset_tokens_table.count((record.user_id == user_id) & (record.created_at >= since))


def issue_token(user_id: int) -> str:
    """Creates a new reset token for the user and returns the raw value for the email link."""
    token = secrets.token_urlsafe(32)
    now = _now()
    password_reset_tokens_table.insert(
        {
            "user_id": user_id,
            "token_hash": _hash(token),
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=token_lifetime_minutes())).isoformat(),
            "used_at": None,
        }
    )
    return token


def consume_token(token: str) -> int:
    """Validates the token and marks it as used. Returns the user id it belongs to."""
    record = Query()
    document: dict[str, Any] | None = password_reset_tokens_table.get(record.token_hash == _hash(token))
    if document is None or document.get("used_at") is not None:
        raise InvalidResetToken()
    if datetime.fromisoformat(document["expires_at"]) <= _now():
        raise InvalidResetToken()

    password_reset_tokens_table.update({"used_at": _now().isoformat()}, doc_ids=[document.doc_id])
    return int(document["user_id"])


def revoke_all_for_user(user_id: int) -> None:
    """Invalidates every outstanding token of the user (after any password change)."""
    record = Query()
    password_reset_tokens_table.update(
        {"used_at": _now().isoformat()},
        (record.user_id == user_id) & (record.used_at == None),  # noqa: E711 (TinyDB query)
    )
