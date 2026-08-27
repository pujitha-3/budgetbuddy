from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.oauth2 import get_current_user
from app.models.income import Income
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.bank_account import BankAccount

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def sum_income(db, user_id, account_type=None, bank_name=None):
    query = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        Income.user_id == user_id
    )
    if account_type is not None:
        query = query.filter(Income.account_type == account_type)
    if bank_name is not None:
        query = query.filter(Income.bank_name == bank_name)
    return float(query.scalar() or 0)


def sum_expense(db, user_id, payment_method=None, bank_name=None, bank_account_id=None):
    query = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == user_id
    )
    if payment_method is not None:
        query = query.filter(Expense.payment_method == payment_method)
    if bank_name is not None:
        query = query.filter(Expense.bank_name == bank_name)
    if bank_account_id is not None:
        query = query.filter(Expense.bank_account_id == bank_account_id)
    return float(query.scalar() or 0)


@router.get("/")
def dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    # ------------------------------------------------------------
    # 1. Overall transaction totals
    # ------------------------------------------------------------
    total_income = sum_income(db, user.user_id)
    total_expenses = sum_expense(db, user.user_id)

    # Category budgets are the primary budget total. If the user only has
    # an older Overall budget, keep supporting that value.
    budget_rows = db.query(Budget).filter(Budget.user_id == user.user_id).all()
    category_budget_total = sum(float(x.amount or 0) for x in budget_rows if x.category != "Overall")
    overall_rows = [x for x in budget_rows if x.category == "Overall"]
    monthly_budget = category_budget_total if category_budget_total > 0 else sum(float(x.amount or 0) for x in overall_rows)

    # ------------------------------------------------------------
    # 2. Bank balances
    #
    # Opening balance = money already present when the account was
    # added. It is NOT income, so it must not be counted twice.
    # Current bank balance = opening + bank income - bank expenses.
    # ------------------------------------------------------------
    accounts = (
        db.query(BankAccount)
        .filter(BankAccount.user_id == user.user_id, BankAccount.is_active.is_(True))
        .order_by(BankAccount.account_id.asc())
        .all()
    )

    bank_accounts = []
    total_bank_balance = 0.0

    for account in accounts:
        bank_income = float(
            db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
                Income.user_id == user.user_id,
                Income.account_type == "Bank",
                Income.bank_account_id == account.account_id
            ).scalar() or 0
        )
        # Legacy bank income records created before bank_account_id existed.
        legacy_bank_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
            Income.user_id == user.user_id,
            Income.account_type == "Bank",
            Income.bank_name == account.bank_name,
            Income.bank_account_id.is_(None)
        ).scalar() or 0
        bank_income += float(legacy_bank_income or 0)
        # New expenses are matched to the exact saved account.
        # Old expenses are handled by the legacy bank_name fallback below.
        new_bank_expense = sum_expense(
            db, user.user_id, payment_method="Bank", bank_account_id=account.account_id
        )
        # Avoid double counting: new records are accounted for by account id;
        # only add legacy rows that have no bank_account_id.
        legacy_bank_expense = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.user_id == user.user_id,
            Expense.payment_method == "Bank",
            Expense.bank_name == account.bank_name,
            Expense.bank_account_id.is_(None)
        ).scalar() or 0
        bank_expense = float(new_bank_expense or 0) + float(legacy_bank_expense or 0)

        current_balance = (
            float(account.opening_balance or 0)
            + bank_income
            - bank_expense
        )

        total_bank_balance += current_balance

        bank_accounts.append({
            "account_id": account.account_id,
            "bank_name": account.bank_name,
            "nickname": account.nickname,
            "account_type": account.account_type,
            "last4": account.account_number_last4,
            "opening_balance": float(account.opening_balance or 0),
            "bank_income": bank_income,
            "bank_expense": bank_expense,
            "balance": current_balance,
        })

    # ------------------------------------------------------------
    # 3. Cash + Wallet balances
    # ------------------------------------------------------------
    cash_income = sum_income(db, user.user_id, account_type="Cash")
    wallet_income = sum_income(db, user.user_id, account_type="Wallet")
    cash_expense = sum_expense(db, user.user_id, payment_method="Cash")
    wallet_expense = sum_expense(db, user.user_id, payment_method="Wallet")

    cash_balance = cash_income - cash_expense
    wallet_balance = wallet_income - wallet_expense
    non_bank_balance = cash_balance + wallet_balance

    # ------------------------------------------------------------
    # 4. REAL total balance
    #
    # Total money = current bank money + current cash + current wallet.
    # This includes bank opening balances and prevents the dashboard
    # from disagreeing with the account balances.
    # ------------------------------------------------------------
    total_balance = total_bank_balance + non_bank_balance

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_balance,
        "monthly_budget": monthly_budget,
        "total_bank_balance": total_bank_balance,
        "cash_balance": cash_balance,
        "wallet_balance": wallet_balance,
        "bank_accounts": bank_accounts,
    }
