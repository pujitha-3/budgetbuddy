from fastapi import APIRouter, Depends
from app.core.oauth2 import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/me")
def profile(user=Depends(get_current_user)):
    return {"user_id": user.user_id, "name": user.name, "email": user.email, "role": user.role}
