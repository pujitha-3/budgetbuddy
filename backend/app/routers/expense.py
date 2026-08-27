from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.expense import Expense
from app.models.bank_account import BankAccount
from app.schemas.expense import ExpenseCreate, ExpenseResponse

router = APIRouter(prefix="/expense", tags=["Expense"])


def owned(db, expense_id, user_id):
    return db.query(Expense).filter(
        Expense.expense_id == expense_id,
        Expense.user_id == user_id
    ).first()


def get_owned_bank(db: Session, account_id: int, user_id: int):
    return db.query(BankAccount).filter(
        BankAccount.account_id == account_id,
        BankAccount.user_id == user_id
    ).first()


def prepare_data(data: ExpenseCreate, db: Session, user_id: int):
    values = data.model_dump()

    if data.payment_method == "Bank":
        if not data.bank_account_id:
            # Backward compatibility for old clients/records.
            if not data.bank_name:
                raise HTTPException(400, "Please select a bank account")
        else:
            account = get_owned_bank(db, data.bank_account_id, user_id)
            if not account:
                raise HTTPException(404, "Selected bank account not found")
            # Store the bank name too so existing dashboard/data remains compatible.
            values["bank_name"] = account.bank_name
    else:
        values["bank_account_id"] = None
        values["bank_name"] = None

    return values


@router.get("/", response_model=list[ExpenseResponse])
def get_expenses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Expense).filter(
        Expense.user_id == user.user_id
    ).order_by(Expense.date.desc(), Expense.expense_id.desc()).all()


@router.post("/", response_model=ExpenseResponse)
def add_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    values = prepare_data(data, db, user.user_id)
    item = Expense(user_id=user.user_id, **values)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    item = owned(db, expense_id, user.user_id)
    if not item:
        raise HTTPException(404, "Expense not found")

    values = prepare_data(data, db, user.user_id)
    for key, value in values.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    item = owned(db, expense_id, user.user_id)
    if not item:
        raise HTTPException(404, "Expense not found")

    db.delete(item)
    db.commit()
    return {"message": "Expense deleted successfully"}
