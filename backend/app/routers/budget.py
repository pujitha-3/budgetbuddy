from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetResponse

router=APIRouter(prefix="/budget",tags=["Budget"])

@router.get("/",response_model=list[BudgetResponse])
def get_budgets(db:Session=Depends(get_db),user=Depends(get_current_user)):
    return db.query(Budget).filter(Budget.user_id==user.user_id).order_by(Budget.month.desc(), Budget.category.asc()).all()

@router.post("/",response_model=BudgetResponse)
def add_budget(data:BudgetCreate,db:Session=Depends(get_db),user=Depends(get_current_user)):
    item=db.query(Budget).filter(
        Budget.user_id==user.user_id,
        Budget.month==data.month,
        Budget.category==data.category
    ).first()
    if item:
        item.amount=data.amount
    else:
        item=Budget(user_id=user.user_id,**data.model_dump())
        db.add(item)
    db.commit();db.refresh(item);return item

@router.put("/{budget_id}",response_model=BudgetResponse)
def update_budget(budget_id:int,data:BudgetCreate,db:Session=Depends(get_db),user=Depends(get_current_user)):
    item=db.query(Budget).filter(Budget.budget_id==budget_id,Budget.user_id==user.user_id).first()
    if not item: raise HTTPException(404,"Budget not found")
    item.month=data.month;item.category=data.category;item.amount=data.amount
    db.commit();db.refresh(item);return item

@router.delete("/{budget_id}")
def delete_budget(budget_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    item=db.query(Budget).filter(Budget.budget_id==budget_id,Budget.user_id==user.user_id).first()
    if not item: raise HTTPException(404,"Budget not found")
    db.delete(item);db.commit();return {"message":"Budget deleted successfully"}
