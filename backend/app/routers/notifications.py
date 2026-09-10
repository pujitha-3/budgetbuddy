from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Hide legacy savings milestone notifications from the old 70/80/90%
    # behavior. New savings notifications contain the actual contribution
    # amount and current progress instead.
    legacy_titles = [
        "Savings goal 70% reached",
        "Savings goal 80% reached",
        "Savings goal 90% reached",
    ]
    rows = db.query(Notification).filter(
        Notification.user_id == user.user_id,
        ~Notification.title.in_(legacy_titles),
    ).order_by(Notification.created_at.desc(), Notification.notification_id.desc()).limit(100).all()
    return [{
        "id": x.notification_id,
        "type": x.type,
        "title": x.title,
        "text": x.text,
        "action_path": x.action_path,
        "read": x.read,
        "time": x.created_at.isoformat(),
    } for x in rows]

@router.post("/")
def create_notification(payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    title = str(payload.get("title") or "Notification").strip()
    text = str(payload.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "Notification text is required")
    item = Notification(user_id=user.user_id, type=str(payload.get("type") or "info"), title=title[:200], text=text[:1000], action_path=payload.get("action_path"))
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.notification_id, "type": item.type, "title": item.title, "text": item.text, "action_path": item.action_path, "read": item.read, "time": item.created_at.isoformat()}

@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(Notification).filter(Notification.notification_id == notification_id, Notification.user_id == user.user_id).first()
    if not item: raise HTTPException(404, "Notification not found")
    item.read = True; db.commit(); return {"message": "Notification marked as read"}

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(Notification).filter(Notification.notification_id == notification_id, Notification.user_id == user.user_id).first()
    if not item: raise HTTPException(404, "Notification not found")
    db.delete(item); db.commit(); return {"message": "Notification deleted"}

@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == user.user_id, Notification.read.is_(False)).update({Notification.read: True}, synchronize_session=False)
    db.commit(); return {"message": "All notifications marked as read"}

@router.delete("/")
def clear_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == user.user_id).delete(synchronize_session=False)
    db.commit(); return {"message": "Notifications cleared"}
