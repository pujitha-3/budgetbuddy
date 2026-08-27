from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.income import Income
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.bank_account import BankAccount

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


@router.get("/summary")
def report_summary(
    start: str | None = Query(None),
    end: str | None = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    today = date.today()
    default_start = today.replace(day=1)
    start_date = _date(start, default_start)
    end_date = _date(end, today)
    if end_date < start_date:
        start_date, end_date = end_date, start_date

    incomes = db.query(Income).filter(
        Income.user_id == user.user_id,
        Income.date >= start_date,
        Income.date <= end_date,
    ).order_by(Income.date.asc()).all()
    expenses = db.query(Expense).filter(
        Expense.user_id == user.user_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).order_by(Expense.date.asc()).all()

    income_total = sum(float(x.amount or 0) for x in incomes)
    expense_total = sum(float(x.amount or 0) for x in expenses)

    category = defaultdict(float)
    for x in expenses:
        category[x.category or "Other"] += float(x.amount or 0)

    payment = defaultdict(float)
    for x in expenses:
        payment[x.payment_method or "Other"] += float(x.amount or 0)

    monthly = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    for x in incomes:
        monthly[x.date.strftime("%Y-%m")]["income"] += float(x.amount or 0)
    for x in expenses:
        monthly[x.date.strftime("%Y-%m")]["expenses"] += float(x.amount or 0)

    month_rows = []
    cursor = _month_start(start_date)
    while cursor <= end_date:
        key = cursor.strftime("%Y-%m")
        row = monthly[key]
        month_rows.append({
            "month": key,
            "income": round(row["income"], 2),
            "expenses": round(row["expenses"], 2),
            "balance": round(row["income"] - row["expenses"], 2),
        })
        cursor = _add_month(cursor)

    accounts = db.query(BankAccount).filter(BankAccount.user_id == user.user_id).all()
    account_rows = []
    for account in accounts:
        bank_income = sum(
            float(x.amount or 0) for x in db.query(Income).filter(
                Income.user_id == user.user_id,
                Income.account_type == "Bank",
                Income.bank_name == account.bank_name,
            ).all()
        )
        bank_expenses = sum(
            float(x.amount or 0) for x in db.query(Expense).filter(
                Expense.user_id == user.user_id,
                Expense.payment_method == "Bank",
                Expense.bank_account_id == account.account_id,
            ).all()
        )
        account_rows.append({
            "account_id": account.account_id,
            "name": account.nickname or account.bank_name,
            "bank_name": account.bank_name,
            "last4": account.account_number_last4,
            "balance": round(float(account.opening_balance or 0) + bank_income - bank_expenses, 2),
        })

    budgets = db.query(Budget).filter(Budget.user_id == user.user_id).all()
    budget_total = sum(float(x.amount or 0) for x in budgets)

    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "summary": {
            "income": round(income_total, 2),
            "expenses": round(expense_total, 2),
            "net": round(income_total - expense_total, 2),
            "savings_rate": round(((income_total - expense_total) / income_total) * 100, 1) if income_total else 0,
            "transaction_count": len(incomes) + len(expenses),
            "average_expense": round(expense_total / len(expenses), 2) if expenses else 0,
        },
        "monthly": month_rows,
        "categories": [
            {"category": k, "amount": round(v, 2)}
            for k, v in sorted(category.items(), key=lambda item: item[1], reverse=True)
        ],
        "payment_methods": [
            {"method": k, "amount": round(v, 2)}
            for k, v in sorted(payment.items(), key=lambda item: item[1], reverse=True)
        ],
        "bank_accounts": account_rows,
        "budget_total": round(budget_total, 2),
    }
