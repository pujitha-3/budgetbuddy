from pydantic import BaseModel, Field

class BudgetCreate(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    category: str = Field(default="Overall", min_length=1, max_length=80)
    amount: float = Field(gt=0)

class BudgetResponse(BudgetCreate):
    budget_id: int
    class Config:
        from_attributes = True
