from datetime import date
from typing import Optional
from pydantic import BaseModel, Field

class SavingsGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target: float = Field(gt=0)
    saved: float = Field(default=0, ge=0)
    deadline: Optional[date] = None

class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    target: Optional[float] = Field(default=None, gt=0)
    saved: Optional[float] = Field(default=None, ge=0)
    deadline: Optional[date] = None

class ContributionCreate(BaseModel):
    amount: float = Field(gt=0)
    date: Optional[date] = None
    source_type: str = Field(default="Cash", pattern=r"^(Bank|Cash|Wallet)$")
    bank_account_id: Optional[int] = None

class SavingsGoalResponse(BaseModel):
    goal_id: int
    name: str
    target: float
    saved: float
    deadline: Optional[date] = None

    class Config:
        from_attributes = True
