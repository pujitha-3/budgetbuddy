from collections import defaultdict
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.income import Income
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.bank_account import BankAccount
from app.models.savings_goal import SavingsContribution, SavingsGoal

router = APIRouter(prefix="/reports", tags=["Reports"])


def _date(value: str | None, fallback: date) -> date:
    if not value:
        return fallback
    try:
        return date.fromisoformat(value)
    except ValueError:
        return fallback


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _add_month(d: date) -> date:
    return (d.replace(day=28) + timedelta(days=4)).replace(day=1)


def _previous_month_start(d: date) -> date:
    if d.month == 1:
        return date(d.year - 1, 12, 1)
    return date(d.year, d.month - 1, 1)


def _role(user: User) -> str:
    return str(user.role or "student").strip().lower()


def _is_premium(user: User) -> bool:
    return _role(user) in {"premium", "admin"}


def _is_admin(user: User) -> bool:
    return _role(user) == "admin"


def _build_summary(db: Session, user: User, start_date: date, end_date: date):
    incomes = db.query(Income).filter(Income.user_id == user.user_id, Income.date >= start_date, Income.date <= end_date).order_by(Income.date.asc()).all()
    expenses = db.query(Expense).filter(Expense.user_id == user.user_id, Expense.date >= start_date, Expense.date <= end_date).order_by(Expense.date.asc()).all()
    income_total = sum(float(x.amount or 0) for x in incomes)
    expense_total = sum(float(x.amount or 0) for x in expenses)
    category = defaultdict(float)
    payment = defaultdict(float)
    monthly = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    for x in incomes:
        monthly[x.date.strftime("%Y-%m")]["income"] += float(x.amount or 0)
    for x in expenses:
        category[x.category or "Other"] += float(x.amount or 0)
        payment[x.payment_method or "Other"] += float(x.amount or 0)
        monthly[x.date.strftime("%Y-%m")]["expenses"] += float(x.amount or 0)
    month_rows = []
    cursor = _month_start(start_date)
    while cursor <= end_date:
        key = cursor.strftime("%Y-%m")
        row = monthly[key]
        month_rows.append({"month": key, "income": round(row["income"], 2), "expenses": round(row["expenses"], 2), "balance": round(row["income"] - row["expenses"], 2)})
        cursor = _add_month(cursor)
    budgets = db.query(Budget).filter(Budget.user_id == user.user_id).all()
    budget_total = sum(float(x.amount or 0) for x in budgets)
    return {
        "summary": {
            "income": round(income_total, 2),
            "expenses": round(expense_total, 2),
            "net": round(income_total - expense_total, 2),
            "savings_rate": round(((income_total - expense_total) / income_total) * 100, 1) if income_total else 0,
            "transaction_count": len(incomes) + len(expenses),
            "average_expense": round(expense_total / len(expenses), 2) if expenses else 0,
        },
        "monthly": month_rows,
        "categories": [{"category": k, "amount": round(v, 2)} for k, v in sorted(category.items(), key=lambda item: item[1], reverse=True)],
        "payment_methods": [{"method": k, "amount": round(v, 2)} for k, v in sorted(payment.items(), key=lambda item: item[1], reverse=True)],
        "budget_total": round(budget_total, 2),
    }


def _account_rows(db: Session, user: User):
    accounts = db.query(BankAccount).filter(BankAccount.user_id == user.user_id).all()
    rows = []
    for account in accounts:
        bank_income = sum(float(x.amount or 0) for x in db.query(Income).filter(Income.user_id == user.user_id, Income.account_type == "Bank", Income.bank_account_id == account.account_id).all())
        bank_expenses = sum(float(x.amount or 0) for x in db.query(Expense).filter(Expense.user_id == user.user_id, Expense.payment_method == "Bank", Expense.bank_account_id == account.account_id).all())
        rows.append({"account_id": account.account_id, "name": account.nickname or account.bank_name, "bank_name": account.bank_name, "last4": account.account_number_last4, "balance": round(float(account.opening_balance or 0) + bank_income - bank_expenses, 2)})
    return rows


def _savings_progress(db: Session, user: User):
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == user.user_id).order_by(SavingsGoal.goal_id.desc()).all()
    return [{"goal_id": g.goal_id, "name": g.name, "target": round(float(g.target or 0), 2), "saved": round(float(g.saved or 0), 2), "percentage": round(min(100, (float(g.saved or 0) / float(g.target)) * 100) if g.target else 0, 1)} for g in goals]


@router.get("/summary")
def report_summary(
    start: str | None = Query(None),
    end: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Basic analytics are intentionally locked to the current month.
    # Premium/Admin users use /reports/premium for historical/custom ranges.
    today = date.today()
    start_date = today.replace(day=1)
    end_date = today

    result = _build_summary(db, user, start_date, end_date)
    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        **result,
        "savings_goals": _savings_progress(db, user),
        "bank_accounts": _account_rows(db, user),
    }


@router.get("/premium")
def premium_report(start_date: str | None = Query(None), end_date: str | None = Query(None), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not _is_premium(user):
        raise HTTPException(status_code=403, detail="Premium analytics are available only to Premium users.")
    today = date.today()
    default_end = today
    default_start = _month_start(today)
    if not start_date and not end_date:
        default_start = _month_start(today)
        for _ in range(11):
            default_start = _previous_month_start(default_start)
    start = _date(start_date, default_start)
    end = _date(end_date, default_end)
    if end < start:
        start, end = end, start
    result = _build_summary(db, user, start, end)

    expenses = db.query(Expense).filter(Expense.user_id == user.user_id, Expense.date >= start, Expense.date <= end).all()
    category_monthly = defaultdict(lambda: defaultdict(float))
    for item in expenses:
        category_monthly[item.date.strftime("%Y-%m")][item.category or "Other"] += float(item.amount or 0)
    category_trend = []
    cursor = _month_start(start)
    while cursor <= end:
        key = cursor.strftime("%Y-%m")
        row = {"month": key}
        row.update({k: round(v, 2) for k, v in category_monthly[key].items()})
        category_trend.append(row)
        cursor = _add_month(cursor)

    current_start = _month_start(today)
    current_end = today
    previous_start = _previous_month_start(current_start)
    previous_end = current_start - timedelta(days=1)
    current = _build_summary(db, user, current_start, current_end)["summary"]
    previous = _build_summary(db, user, previous_start, previous_end)["summary"]
    previous_expenses = previous["expenses"]
    change_pct = ((current["expenses"] - previous_expenses) / previous_expenses * 100) if previous_expenses else (100 if current["expenses"] else 0)

    contribution_rows = db.query(SavingsContribution).filter(SavingsContribution.user_id == user.user_id, SavingsContribution.date >= start, SavingsContribution.date <= end).all()
    savings_buckets = defaultdict(float)
    for item in contribution_rows:
        savings_buckets[item.date.strftime("%Y-%m")] += float(item.amount or 0)
    savings_trend = [{"month": k, "amount": round(v, 2)} for k, v in sorted(savings_buckets.items())]

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        **result,
        "category_trend": category_trend,
        "comparison": {"this_month": current, "last_month": previous, "change_percentage": round(change_pct, 1)},
        "savings_trend": savings_trend,
        "savings_goals": _savings_progress(db, user),
        "bank_accounts": _account_rows(db, user),
    }


@router.get("/system")
def system_analytics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required.")
    users = db.query(User).count()
    total_income = sum(float(x.amount or 0) for x in db.query(Income).all())
    total_expenses = sum(float(x.amount or 0) for x in db.query(Expense).all())
    monthly = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    for item in db.query(Income).all(): monthly[item.date.strftime("%Y-%m")]["income"] += float(item.amount or 0)
    for item in db.query(Expense).all(): monthly[item.date.strftime("%Y-%m")]["expenses"] += float(item.amount or 0)
    months = [{"month": key, "income": round(monthly[key]["income"], 2), "expenses": round(monthly[key]["expenses"], 2), "balance": round(monthly[key]["income"] - monthly[key]["expenses"], 2)} for key in sorted(monthly.keys())[-12:]]
    return {"total_users": users, "total_income": round(total_income, 2), "total_expenses": round(total_expenses, 2), "total_balance": round(total_income - total_expenses, 2), "monthly": months}
