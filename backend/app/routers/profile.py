from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.oauth2 import get_current_user
from app.database import get_db

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileUpdate(BaseModel):
    name: str
    phone: str | None = None


@router.get("/me")
def profile(user=Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
    }


@router.put("/me")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    name = payload.name.strip()
    phone = (payload.phone or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if phone and len(phone) > 30:
        raise HTTPException(status_code=400, detail="Phone number is too long")

    user.name = name
    user.phone = phone or None
    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
    }
