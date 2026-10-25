from fastapi import APIRouter, Depends, HTTPException

from services.api.auth_models import ProfileResponse, ProfileUpdate, UserResponse
from services.api.security import get_current_user
from services.api import user_store as users

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileResponse)
def read_my_profile(current_user: UserResponse = Depends(get_current_user)) -> ProfileResponse:
    profile = users.get_profile_by_user_id(current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="No se ha encontrado el perfil de esta cuenta.")
    return ProfileResponse.model_validate(profile)


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
) -> ProfileResponse:
    profile = users.update_profile(
        current_user.id,
        payload.model_dump(exclude_unset=True),
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="No se ha encontrado el perfil de esta cuenta.")
    return ProfileResponse.model_validate(profile)
