from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.savings_goal import SavingsGoal, SavingsContribution
from app.models.bank_account import BankAccount
from app.models.income import Income
from app.models.expense import Expense
from app.models.notification import Notification
from app.schemas.savings_goal import SavingsGoalCreate, SavingsGoalUpdate, ContributionCreate

router = APIRouter(prefix="/savings", tags=["Savings Goals"])


def _owned_goal(db: Session, user: User, goal_id: int):
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.goal_id == goal_id,
        SavingsGoal.user_id == user.user_id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    return goal


def _row(goal: SavingsGoal):
    return {
        "goal_id": goal.goal_id,
        "name": goal.name,
        "target": round(float(goal.target or 0), 2),
        "saved": round(float(goal.saved or 0), 2),
        "deadline": goal.deadline.isoformat() if goal.deadline else None,
    }


@router.get("/")
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == user.user_id).order_by(SavingsGoal.goal_id.desc()).all()
    return [_row(g) for g in goals]


@router.post("/")
def create_goal(payload: SavingsGoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    saved = min(max(float(payload.saved or 0), 0), float(payload.target))
    goal = SavingsGoal(
        user_id=user.user_id,
        name=payload.name.strip(),
        target=float(payload.target),
        saved=saved,
        deadline=payload.deadline,
        created_at=datetime.utcnow(),
    )
    db.add(goal)
    db.flush()
    if saved > 0:
        db.add(SavingsContribution(goal_id=goal.goal_id, user_id=user.user_id, amount=saved, date=date.today()))
    db.commit()
    db.refresh(goal)
    return _row(goal)


@router.put("/{goal_id}")
def update_goal(goal_id: int, payload: SavingsGoalUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = _owned_goal(db, user, goal_id)
    if payload.name is not None:
        goal.name = payload.name.strip()
    if payload.target is not None:
        goal.target = float(payload.target)
    if payload.saved is not None:
        goal.saved = min(max(float(payload.saved), 0), float(goal.target))
    if payload.deadline is not None:
        goal.deadline = payload.deadline
    db.commit()
    db.refresh(goal)
    return _row(goal)


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = _owned_goal(db, user, goal_id)
    db.delete(goal)
    db.commit()
    return {"message": "Savings goal deleted"}


@router.post("/{goal_id}/contributions")
def add_contribution(goal_id: int, payload: ContributionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = _owned_goal(db, user, goal_id)
    target = float(goal.target or 0)
    previous = float(goal.saved or 0)
    remaining = max(0, target - previous)
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Savings goal is already completed")

    source_type = payload.source_type
    bank_account = None
    if source_type == "Bank":
        if not payload.bank_account_id:
            raise HTTPException(400, "Select a bank account for this contribution.")
        bank_account = db.query(BankAccount).filter(
            BankAccount.account_id == payload.bank_account_id,
            BankAccount.user_id == user.user_id,
            BankAccount.is_active.is_(True),
        ).first()
        if not bank_account:
            raise HTTPException(404, "Bank account not found.")

    # Available balance is calculated from the same source that the Dashboard uses.
    # Savings contributions are transfers into a goal, not expenses, so they are
    # stored separately and deducted from the selected source balance.
    contribution_query = db.query(func.coalesce(func.sum(SavingsContribution.amount), 0)).filter(
        SavingsContribution.user_id == user.user_id,
        SavingsContribution.source_type == source_type,
    )
    if source_type == "Bank":
        contribution_query = contribution_query.filter(SavingsContribution.bank_account_id == bank_account.account_id)
    prior_savings = float(contribution_query.scalar() or 0)

    if source_type == "Bank":
        bank_income = float(db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
            Income.user_id == user.user_id, Income.account_type == "Bank", Income.bank_account_id == bank_account.account_id
        ).scalar() or 0)
        legacy_income = float(db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
            Income.user_id == user.user_id, Income.account_type == "Bank", Income.bank_name == bank_account.bank_name, Income.bank_account_id.is_(None)
        ).scalar() or 0)
        bank_expense = float(db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.user_id == user.user_id, Expense.payment_method == "Bank", Expense.bank_account_id == bank_account.account_id
        ).scalar() or 0)
        legacy_expense = float(db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.user_id == user.user_id, Expense.payment_method == "Bank", Expense.bank_name == bank_account.bank_name, Expense.bank_account_id.is_(None)
        ).scalar() or 0)
        available = float(bank_account.opening_balance or 0) + bank_income + legacy_income - bank_expense - legacy_expense - prior_savings
        source_label = f"{bank_account.nickname or bank_account.bank_name} •••• {bank_account.account_number_last4}"
    elif source_type == "Wallet":
        income_total = float(db.query(func.coalesce(func.sum(Income.amount), 0)).filter(Income.user_id == user.user_id, Income.account_type == "Wallet").scalar() or 0)
        expense_total = float(db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.user_id == user.user_id, Expense.payment_method == "Wallet").scalar() or 0)
        available = income_total - expense_total - prior_savings
        source_label = "Wallet"
    else:
        income_total = float(db.query(func.coalesce(func.sum(Income.amount), 0)).filter(Income.user_id == user.user_id, Income.account_type == "Cash").scalar() or 0)
        expense_total = float(db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.user_id == user.user_id, Expense.payment_method == "Cash").scalar() or 0)
        available = income_total - expense_total - prior_savings
        source_label = "Cash"

    if available < 0: available = 0
    added = min(float(payload.amount), remaining)
    if added > available + 1e-9:
        raise HTTPException(status_code=400, detail=f"Insufficient {source_type.lower()} balance. Available: ₹{available:,.2f}.")

    new_amount = previous + added
    contribution_date = payload.date or date.today()
    db.add(SavingsContribution(goal_id=goal.goal_id, user_id=user.user_id, amount=added, date=contribution_date, source_type=source_type, bank_account_id=bank_account.account_id if bank_account else None))
    goal.saved = new_amount
    db.commit()
    db.refresh(goal)

    previous_pct = (previous / target * 100) if target else 0
    new_pct = (new_amount / target * 100) if target else 0

    # Savings notifications are intentionally progress-based, not milestone-based.
    # A contribution below 100% creates exactly one notification containing both
    # the contributed amount and the new progress. Completing the goal creates
    # exactly one completion notification. We do not create 70/80/90% notices.
    # Remove any legacy milestone notifications for this goal so old behavior
    # does not continue to clutter the user's notification list.
    legacy_titles = [
        f"Savings goal {milestone}% reached" for milestone in (70, 80, 90)
    ]
    db.query(Notification).filter(
        Notification.user_id == user.user_id,
        Notification.title.in_(legacy_titles),
        Notification.text.like(f"%'{goal.name}'%"),
    ).delete(synchronize_session=False)

    if new_amount >= target:
        notification = {
            "type": "success",
            "title": "🎉 Savings goal completed",
            "text": f"Congratulations! You completed '{goal.name}' at ₹{target:,.2f}. Progress: 100%.",
        }
    else:
        notification = {
            "type": "goal",
            "title": "Savings progress updated",
            "text": f"₹{added:,.2f} added to '{goal.name}' from {source_label}. Progress: {new_pct:.0f}% complete. Total saved: ₹{new_amount:,.2f} of ₹{target:,.2f}.",
        }

    # Exactly one notification per contribution: progress update, or completion.
    db.add(Notification(
        user_id=user.user_id,
        type=notification["type"],
        title=notification["title"],
        text=notification["text"],
    ))
    db.commit()

    return {
        "goal": _row(goal),
        "added": round(added, 2),
        "previous_saved": round(previous, 2),
        "new_saved": round(new_amount, 2),
        "previous_percentage": round(previous_pct, 1),
        "new_percentage": round(new_pct, 1),
        "source_type": source_type,
        "source_label": source_label,
        "source_balance_before": round(available, 2),
        "source_balance_after": round(available - added, 2),
        "notification": notification,
        "milestones": [],
    }

@router.get("/contributions/history")
def contribution_history(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(SavingsContribution).filter(SavingsContribution.user_id == user.user_id)
    if start_date:
        query = query.filter(SavingsContribution.date >= start_date)
    if end_date:
        query = query.filter(SavingsContribution.date <= end_date)
    rows = query.order_by(SavingsContribution.date.asc(), SavingsContribution.contribution_id.asc()).all()
    return [{
        "id": x.contribution_id,
        "goal_id": x.goal_id,
        "amount": round(float(x.amount or 0), 2),
        "date": x.date.isoformat(),
        "source_type": x.source_type,
        "bank_account_id": x.bank_account_id,
    } for x in rows]


@router.get("/contributions/trend")
def contribution_trend(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(SavingsContribution).filter(SavingsContribution.user_id == user.user_id)
    if start_date:
        query = query.filter(SavingsContribution.date >= start_date)
    if end_date:
        query = query.filter(SavingsContribution.date <= end_date)
    buckets = {}
    for item in query.all():
        key = item.date.strftime("%Y-%m")
        buckets[key] = buckets.get(key, 0) + float(item.amount or 0)
    return [{"month": k, "amount": round(buckets[k], 2)} for k in sorted(buckets)]
