from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.premium_request import PremiumRequest
from app.config import SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM

router = APIRouter(prefix="/premium", tags=["Premium Requests"])


def _role(user: User) -> str:
    return str(user.role or "Student").strip().lower()


def _is_admin(user: User) -> bool:
    return _role(user) == "admin"


def _send_admin_email(admin_email: str, requester: User):
    # Email is optional. The in-app Admin notification always works.
    if not (SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD and admin_email):
        return False
    try:
        import smtplib
        from email.message import EmailMessage
        message = EmailMessage()
        message["Subject"] = "BudgetBuddy: Premium upgrade request"
        message["From"] = SMTP_FROM or SMTP_USERNAME
        message["To"] = admin_email
        message.set_content(
            f"{requester.name} ({requester.email}) requested Premium access in BudgetBuddy. "
            "Open the application and go to User Management to review the request."
        )
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception as exc:
        print(f"Premium request email failed: {exc}")
        return False


@router.get("/request")
def get_my_premium_request(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if _role(user) in {"premium", "admin"}:
        return {"status": "premium", "message": "Premium access is already enabled."}
    request = (
        db.query(PremiumRequest)
        .filter(PremiumRequest.user_id == user.user_id)
        .order_by(PremiumRequest.request_id.desc())
        .first()
    )
    if not request:
        return {"status": "none"}
    return {"status": request.status, "request_id": request.request_id, "created_at": request.created_at}


@router.post("/request")
def request_premium(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if _role(user) in {"premium", "admin"}:
        raise HTTPException(status_code=400, detail="Premium access is already enabled.")

    pending = (
        db.query(PremiumRequest)
        .filter(PremiumRequest.user_id == user.user_id, PremiumRequest.status == "pending")
        .first()
    )
    if pending:
        return {"message": "Your Premium request is already pending.", "status": "pending", "request_id": pending.request_id}

    request = PremiumRequest(user_id=user.user_id, status="pending")
    db.add(request)
    db.commit()
    db.refresh(request)

    admin = db.query(User).filter(User.role.ilike("admin")).first()
    email_sent = _send_admin_email(admin.email if admin else "", user) if admin else False

    return {
        "message": "Premium request sent to the Admin.",
        "status": "pending",
        "request_id": request.request_id,
        "email_sent": email_sent,
    }
