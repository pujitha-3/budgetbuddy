from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.premium_request import PremiumRequest
from app.models.notification import Notification

router = APIRouter(prefix="/premium", tags=["Premium Requests"])

def require_admin(user: User):
    if str(user.role or '').lower() != 'admin':
        raise HTTPException(403, 'Admin access required.')

@router.get('/my-request')
def my_request(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(PremiumRequest).filter(PremiumRequest.user_id == user.user_id).order_by(PremiumRequest.request_id.desc()).first()
    if not row:
        return {"status": None}
    return {"request_id": row.request_id, "status": row.status, "created_at": row.created_at.isoformat() if row.created_at else None}

@router.post('/request')
def request_premium(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    role = str(user.role or '').lower()
    if role == 'admin':
        raise HTTPException(400, 'Admin already has Premium analytics.')
    if role == 'premium':
        raise HTTPException(400, 'Your account is already Premium.')
    existing = db.query(PremiumRequest).filter(PremiumRequest.user_id == user.user_id, PremiumRequest.status == 'Pending').first()
    if existing:
        return {"request_id": existing.request_id, "status": existing.status, "message": 'Premium request is already pending.'}
    row = PremiumRequest(user_id=user.user_id, status='Pending')
    db.add(row); db.flush()
    admins = db.query(User).filter(User.role.ilike('admin')).all()
    for admin in admins:
        db.add(Notification(user_id=admin.user_id, type='premium_request', title='Premium Upgrade Request', text=f"{user.name} ({user.email}) requested Premium access.", action_path=f'/admin-users?request_id={row.request_id}&user_id={user.user_id}'))
    db.commit(); db.refresh(row)
    return {"request_id": row.request_id, "status": row.status, "message": 'Premium request sent to Admin.'}

@router.get('/admin/requests')
def admin_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_admin(user)
    rows = db.query(PremiumRequest, User).join(User, User.user_id == PremiumRequest.user_id).order_by(PremiumRequest.created_at.desc()).all()
    return [{"request_id": r.request_id, "user_id": u.user_id, "name": u.name, "email": u.email, "role": u.role, "status": r.status, "created_at": r.created_at.isoformat() if r.created_at else None} for r,u in rows]

@router.put('/admin/requests/{request_id}')
def review_request(request_id: int, decision: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_admin(user)
    decision = decision.strip().lower()
    if decision not in {'approve','reject'}: raise HTTPException(400, 'Decision must be approve or reject.')
    row = db.query(PremiumRequest).filter(PremiumRequest.request_id == request_id).first()
    if not row: raise HTTPException(404, 'Premium request not found.')
    target = db.query(User).filter(User.user_id == row.user_id).first()
    if not target: raise HTTPException(404, 'Requested user not found.')
    if row.status != 'Pending':
        return {"message": f"Request is already {row.status.lower()}.", "status": row.status, "role": target.role}
    row.status = 'Approved' if decision == 'approve' else 'Rejected'
    row.reviewed_at = datetime.utcnow(); row.reviewed_by = user.user_id
    if decision == 'approve':
        target.role = 'Premium'
        title = '🎉 Premium access approved'
        text = 'Your Premium request was approved by the Admin. Full analytics and exports are now available.'
        ntype = 'success'
    else:
        title = 'Premium request declined'
        text = 'Your Premium request was declined by the Admin. You can request again later.'
        ntype = 'warning'
    db.add(Notification(user_id=target.user_id, type=ntype, title=title, text=text))
    db.commit()
    return {"message": f"{target.email} is now {target.role}" if decision == 'approve' else 'Premium request rejected', "status": row.status, "role": target.role}
