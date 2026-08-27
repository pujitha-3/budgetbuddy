from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.bank_account import BankAccount
from app.schemas.bank_account import BankAccountCreate, BankAccountResponse

router = APIRouter(prefix="/bank-accounts", tags=["Bank Accounts"])

def owned(db: Session, account_id: int, user_id: int, active_only=False):
    query = db.query(BankAccount).filter(
        BankAccount.account_id == account_id,
        BankAccount.user_id == user_id
    )
    if active_only:
        query = query.filter(BankAccount.is_active.is_(True))
    return query.first()

@router.get("/", response_model=list[BankAccountResponse])
def list_accounts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(BankAccount).filter(
        BankAccount.user_id == user.user_id,
        BankAccount.is_active.is_(True)
    ).order_by(BankAccount.account_id.desc()).all()

@router.post("/", response_model=BankAccountResponse)
def add_account(data: BankAccountCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    account = BankAccount(user_id=user.user_id, is_active=True, **data.model_dump())
    db.add(account); db.commit(); db.refresh(account); return account

@router.put("/{account_id}", response_model=BankAccountResponse)
def update_account(account_id: int, data: BankAccountCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    account = owned(db, account_id, user.user_id, active_only=True)
    if not account:
        raise HTTPException(status_code=404, detail="Active bank account not found")
    for key, value in data.model_dump().items():
        setattr(account, key, value)
    db.commit(); db.refresh(account); return account

@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    account = owned(db, account_id, user.user_id, active_only=True)
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    # Soft-delete: preserve the account row so historical income/expense
    # transactions remain intact. It disappears only from active accounts.
    account.is_active = False
    db.commit()
    return {
        "message": "Bank account removed. Income and expense history has been preserved."
    }
