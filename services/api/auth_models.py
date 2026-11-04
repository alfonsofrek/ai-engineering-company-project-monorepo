from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, model_validator

# Passwords are taken exactly as typed: str_strip_whitespace on the models must not
# trim them, or a password registered with surrounding spaces could never log in.
RawPassword = Annotated[str, StringConstraints(strip_whitespace=False)]


class UserRole(StrEnum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr
    password: RawPassword = Field(min_length=8, max_length=72)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=240)

    @model_validator(mode="after")
    def password_fits_bcrypt(self) -> "UserCreate":
        if len(self.password.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes for bcrypt.")
        return self


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr | None = None
    password: RawPassword | None = Field(default=None, min_length=8, max_length=72)
    role: UserRole | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_update(self) -> "UserUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one user field must be provided.")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Updated user fields cannot be null.")
        if self.password is not None and len(self.password.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes for bcrypt.")
        return self


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=240)

    @model_validator(mode="after")
    def require_a_change(self) -> "ProfileUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one profile field must be provided.")
        return self


class User(BaseModel):
    id: int
    email: EmailStr
    hashed_password: str
    is_active: bool
    role: UserRole
    created_at: datetime


class Profile(BaseModel):
    id: int
    user_id: int
    name: str | None
    phone: str | None
    address: str | None


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    role: UserRole
    created_at: datetime


class ProfileResponse(Profile):
    pass


class UserRegistrationResponse(BaseModel):
    user: UserResponse
    profile: ProfileResponse


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthMeResponse(BaseModel):
    email: EmailStr
    role: UserRole
    profile: ProfileResponse


def _validate_new_password(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes for bcrypt.")
    return password


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=72)

    @model_validator(mode="after")
    def password_fits_bcrypt(self) -> "ResetPasswordRequest":
        _validate_new_password(self.new_password)
        return self


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

    @model_validator(mode="after")
    def password_fits_bcrypt(self) -> "ChangePasswordRequest":
        _validate_new_password(self.new_password)
        return self


class MessageResponse(BaseModel):
    message: str
