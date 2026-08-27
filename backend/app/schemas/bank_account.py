from pydantic import BaseModel, Field
from typing import Optional

class BankAccountCreate(BaseModel):
    bank_name: str = Field(min_length=2, max_length=120)
    account_holder: str = Field(min_length=2, max_length=120)
    account_type: str = "Savings"
    account_number_last4: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    nickname: Optional[str] = None
    opening_balance: float = Field(default=0, ge=0)

class BankAccountResponse(BankAccountCreate):
    account_id: int

    class Config:
        from_attributes = True
