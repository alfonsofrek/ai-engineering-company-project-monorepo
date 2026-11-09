import logging
import os
from urllib.parse import urlencode

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from services.api import password_reset
from services.api import user_store as users
from services.api.auth_models import (
    AuthMeResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from services.api.email_service import EmailDeliveryError, send_password_reset_email
from services.api.security import create_access_token, get_current_user

logger = logging.getLogger("trackflow.auth")

FORGOT_PASSWORD_MESSAGE = "Si ese email está registrado, recibirás un enlace para restablecer la contraseña en unos minutos."
INVALID_RESET_TOKEN = "El enlace no es válido o ha caducado. Solicita uno nuevo."

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = users.get_user_by_email(str(payload.email))
    if (
        user is None
        or not user["is_active"]
        or not users.verify_password(payload.password, user["hashed_password"])
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token, expires_in = create_access_token(user["id"])
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.get("/me", response_model=AuthMeResponse)
def read_auth_me(current_user: UserResponse = Depends(get_current_user)) -> AuthMeResponse:
    profile = users.get_profile_by_user_id(current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="No se ha encontrado el perfil de esta cuenta.")
    return AuthMeResponse(
        email=current_user.email,
        role=current_user.role,
        profile=profile,
    )


def _reset_url(token: str) -> str:
    base = os.getenv("PASSWORD_RESET_URL", "").strip() or (
        os.getenv("BACKOFFICE_ORIGIN", "http://localhost:3000").rstrip("/") + "/reset-password"
    )
    return f"{base}?{urlencode({'token': token})}"


def _deliver_reset_email(email: str, token: str) -> None:
    try:
        send_password_reset_email(email, _reset_url(token), password_reset.token_lifetime_minutes())
    except EmailDeliveryError as error:
        # Logged server-side only: the client always gets the same 200 answer.
        logger.error("Password reset email to %s failed: %s", email, error)


def _set_password(user_id: int, new_password: str) -> None:
    # update_user hashes it, stamps password_changed_at and revokes pending reset links.
    users.update_user(user_id, {"password": new_password})


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, background: BackgroundTasks) -> MessageResponse:
    """Always answers 200 with the same message, so it never reveals which emails exist."""
    user = users.get_user_by_email(str(payload.email))
    if (
        user is not None
        and user["is_active"]
        and password_reset.recent_request_count(user["id"]) < password_reset.MAX_REQUESTS_PER_HOUR
    ):
        token = password_reset.issue_token(user["id"])
        # Sent after the response so the answer time does not depend on the email existing.
        background.add_task(_deliver_reset_email, user["email"], token)
    return MessageResponse(message=FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    try:
        user_id = password_reset.consume_token(payload.token)
    except password_reset.InvalidResetToken:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_RESET_TOKEN) from None

    user = users.get_user_by_id(user_id)
    if user is None or not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_RESET_TOKEN)
    _set_password(user_id, payload.new_password)
    return MessageResponse(message="Contraseña actualizada. Ya puedes iniciar sesión.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user),
) -> MessageResponse:
    user = users.get_user_by_id(current_user.id)
    if user is None or not users.verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual no es correcta.",
        )
    if users.verify_password(payload.new_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser distinta de la actual.",
        )
    _set_password(current_user.id, payload.new_password)
    return MessageResponse(message="Contraseña actualizada.")
