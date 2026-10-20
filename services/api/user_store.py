from __future__ import annotations

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


def get_user_by_email(email: str) -> dict[str, Any] | None:
    document = users_table.get(Query().email == str(email))
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
            "email": str(email),
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
        updates["email"] = str(updates["email"])
    if "password" in updates:
        updates["hashed_password"] = hash_password(updates.pop("password"))
    if "role" in updates and updates["role"] is not None:
        updates["role"] = UserRole(updates["role"]).value

    users_table.update(updates, doc_ids=[user_id])
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
