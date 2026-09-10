from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.core.security import hash_password
from app.models.user import User
from app.models.notification import Notification
from app.models.premium_request import PremiumRequest

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(user: User):
    if str(user.role or "").strip().lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")


@router.get("/users")
def list_users(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_admin(user)
    rows = db.query(User).order_by(User.user_id.asc()).all()
    return [
        {"user_id": x.user_id, "name": x.name, "email": x.email, "role": x.role}
        for x in rows
    ]


@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, role: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_admin(user)
    normalized = role.strip().capitalize()
    if normalized not in {"Student", "Premium"}:
        raise HTTPException(status_code=400, detail="Admin can assign only Student or Premium roles.")
    target = db.query(User).filter(User.user_id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.user_id == user.user_id:
        raise HTTPException(status_code=400, detail="The admin account cannot be changed here.")
    old_role = target.role
    target.role = normalized
    if old_role != normalized:
        title = "Premium access granted" if normalized == "Premium" else "Account access updated"
        text = "The Admin changed your access from Student to Premium. Full analytics and exports are now available." if normalized == "Premium" else "The Admin changed your account access to Student."
        db.add(Notification(user_id=target.user_id, type="success" if normalized == "Premium" else "info", title=title, text=text))
        if normalized == "Premium":
            pending = db.query(PremiumRequest).filter(PremiumRequest.user_id == target.user_id, PremiumRequest.status == "Pending").all()
            for req in pending:
                req.status = "Approved"
                req.reviewed_by = user.user_id
                req.reviewed_at = __import__("datetime").datetime.utcnow()
    db.commit()
    return {"message": f"{target.email} is now {normalized}", "user_id": target.user_id, "role": target.role}
