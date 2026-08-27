from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1)
    category: str = "Other"
    amount: float = Field(gt=0)
    date: date
    payment_method: str = "Cash"
    # New: selected saved bank account. bank_name remains for backward compatibility.
    bank_account_id: Optional[int] = None
    bank_name: Optional[str] = None


class ExpenseResponse(ExpenseCreate):
    expense_id: int
    bank_account_last4: Optional[str] = None

    class Config:
        from_attributes = True
