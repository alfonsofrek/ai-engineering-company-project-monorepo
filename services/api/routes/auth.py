from fastapi import APIRouter, Depends, HTTPException, status

from services.api.auth_models import AuthMeResponse, LoginRequest, TokenResponse, UserResponse
from services.api.security import create_access_token, get_current_user
from services.api import user_store as users

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
