from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.income import Income
from app.models.bank_account import BankAccount
from app.schemas.income import IncomeCreate, IncomeResponse

router = APIRouter(prefix="/income", tags=["Income"])

def owned(db, income_id, user_id):
    return db.query(Income).filter(Income.income_id == income_id, Income.user_id == user_id).first()

def prepare_data(data: IncomeCreate, db: Session, user_id: int):
    values = data.model_dump()
    if data.account_type == "Bank":
        if not data.bank_account_id:
            # Keep old clients working, but new UI should send bank_account_id.
            if not data.bank_name:
                raise HTTPException(400, "Please select a bank account")
            values["bank_account_id"] = None
        else:
            account = db.query(BankAccount).filter(
                BankAccount.account_id == data.bank_account_id,
                BankAccount.user_id == user_id,
                BankAccount.is_active.is_(True)
            ).first()
            if not account:
                raise HTTPException(404, "Selected bank account not found")
            values["bank_name"] = account.bank_name
    else:
        values["bank_name"] = None
        values["bank_account_id"] = None
    return values

@router.get("/", response_model=list[IncomeResponse])
def get_income(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Income).filter(Income.user_id == user.user_id).order_by(Income.date.desc()).all()

@router.post("/", response_model=IncomeResponse)
def add_income(data: IncomeCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = Income(user_id=user.user_id, **prepare_data(data, db, user.user_id))
    db.add(item); db.commit(); db.refresh(item); return item

@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(income_id: int, data: IncomeCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = owned(db, income_id, user.user_id)
    if not item: raise HTTPException(404, "Income not found")
    for k,v in prepare_data(data, db, user.user_id).items(): setattr(item,k,v)
    db.commit(); db.refresh(item); return item

@router.delete("/{income_id}")
def delete_income(income_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = owned(db, income_id, user.user_id)
    if not item: raise HTTPException(404, "Income not found")
    db.delete(item); db.commit(); return {"message": "Income deleted successfully"}
