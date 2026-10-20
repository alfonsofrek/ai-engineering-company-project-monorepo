from fastapi import APIRouter, Depends, HTTPException, Response, status

from services.api.auth_models import (
    ProfileResponse,
    UserCreate,
    UserRegistrationResponse,
    UserResponse,
    UserUpdate,
)
from services.api.security import get_current_user
from services.api import user_store as users

router = APIRouter(prefix="/users", tags=["users"])


def _can_manage_user(current_user: UserResponse, user_id: int) -> bool:
    return current_user.role == "admin" or current_user.id == user_id


@router.post("", response_model=UserRegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate) -> UserRegistrationResponse:
    try:
        user, profile = users.create_user(
            email=str(payload.email),
            password=payload.password,
            name=payload.name,
            phone=payload.phone,
            address=payload.address,
        )
    except users.DuplicateEmailError:
        raise HTTPException(status_code=409, detail="Email is already registered.") from None
    return UserRegistrationResponse(user=user, profile=profile)


@router.get("", response_model=list[UserResponse])
def list_all_users(current_user: UserResponse = Depends(get_current_user)) -> list[UserResponse]:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required.")
    return [UserResponse.model_validate(user) for user in users.list_users()]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    if not _can_manage_user(current_user, user_id):
        raise HTTPException(status_code=403, detail="Cannot access another user's account.")
    user = users.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    if not _can_manage_user(current_user, user_id):
        raise HTTPException(status_code=403, detail="Cannot update another user's account.")
    admin_fields = {"role", "is_active"}
    if payload.model_fields_set & admin_fields and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change role or activation status.")
    try:
        user = users.update_user(user_id, payload.model_dump(exclude_unset=True))
    except users.DuplicateEmailError:
        raise HTTPException(status_code=409, detail="Email is already registered.") from None
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
) -> Response:
    if not _can_manage_user(current_user, user_id):
        raise HTTPException(status_code=403, detail="Cannot delete another user's account.")
    if not users.delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
