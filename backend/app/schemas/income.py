from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class IncomeCreate(BaseModel):
    source: str = Field(min_length=1)
    amount: float = Field(gt=0)
    date: date
    account_type: str = "Cash"
    bank_name: Optional[str] = None
    bank_account_id: Optional[int] = None

class IncomeResponse(IncomeCreate):
    income_id: int
    bank_account_last4: Optional[str] = None
    class Config:
        from_attributes = True
