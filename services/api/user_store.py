from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from passlib.hash import bcrypt
from tinydb import Query

from services.api.auth_models import UserRole
from services.api.database import profiles_table, users_table


class DuplicateEmailError(ValueError):
    pass


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.verify(password, hashed_password)
    except (TypeError, ValueError):
        return False


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    document = users_table.get(doc_id=user_id)
    if document is None:
        return None
    return {"id": document.doc_id, **dict(document)}


def normalize_email(email: str) -> str:
    """Emails are case-insensitive for login and uniqueness: Ana@X.com and ana@x.com are one account."""
    return str(email).strip().lower()


def ensure_user_uuid(user_id: int) -> str:
    """Returns the user's stable UUID, assigning one to accounts created before it existed.

    Inventory records in Supabase reference users by this UUID; there is no user table there.
    """
    document = users_table.get(doc_id=user_id)
    if document is None:
        raise KeyError(user_id)
    existing = document.get("uuid")
    if existing:
        return str(existing)
    new_uuid = str(uuid.uuid4())
    users_table.update({"uuid": new_uuid}, doc_ids=[user_id])
    return new_uuid


def get_user_by_email(email: str) -> dict[str, Any] | None:
    wanted = normalize_email(email)
    # Compares normalized values so accounts stored before normalization are still found.
    document = users_table.get(Query().email.test(lambda stored: normalize_email(stored) == wanted))
    if document is None:
        return None
    return {"id": document.doc_id, **dict(document)}


def list_users() -> list[dict[str, Any]]:
    return [{"id": document.doc_id, **dict(document)} for document in users_table.all()]


def get_profile_by_user_id(user_id: int) -> dict[str, Any] | None:
    document = profiles_table.get(Query().user_id == user_id)
    if document is None:
        return None
    return {"id": document.doc_id, **dict(document)}


def create_user(
    email: str,
    password: str,
    name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if get_user_by_email(email) is not None:
        raise DuplicateEmailError(email)

    user_id = users_table.insert(
        {
            "uuid": str(uuid.uuid4()),
            "email": normalize_email(email),
            "hashed_password": hash_password(password),
            "is_active": True,
            "role": UserRole.USER.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    try:
        profile_id = profiles_table.insert(
            {"user_id": user_id, "name": name, "phone": phone, "address": address}
        )
    except Exception:
        users_table.remove(doc_ids=[user_id])
        raise

    user = get_user_by_id(user_id)
    profile = get_profile_by_user_id(user_id)
    assert user is not None and profile is not None
    profile["id"] = profile_id
    return user, profile


def update_user(user_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    if "email" in updates:
        existing = get_user_by_email(str(updates["email"]))
        if existing is not None and existing["id"] != user_id:
            raise DuplicateEmailError(str(updates["email"]))
        updates["email"] = normalize_email(updates["email"])
    password_changed = "password" in updates
    if password_changed:
        updates["hashed_password"] = hash_password(updates.pop("password"))
        updates.setdefault("password_changed_at", datetime.now(timezone.utc).isoformat())
    if "role" in updates and updates["role"] is not None:
        updates["role"] = UserRole(updates["role"]).value

    users_table.update(updates, doc_ids=[user_id])
    if password_changed:
        # Whatever path changed the password (reset, change-password, PUT /users/{id}),
        # reset links issued before it stop working.
        from services.api import password_reset

        password_reset.revoke_all_for_user(user_id)
    return get_user_by_id(user_id)


def update_profile(user_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    profile = get_profile_by_user_id(user_id)
    if profile is None:
        return None
    profiles_table.update(updates, doc_ids=[profile["id"]])
    return get_profile_by_user_id(user_id)


def delete_user(user_id: int) -> bool:
    if get_user_by_id(user_id) is None:
        return False
    profiles_table.remove(Query().user_id == user_id)
    users_table.remove(doc_ids=[user_id])
    return True
