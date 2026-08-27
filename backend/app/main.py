from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.database import Base, engine
from app.models import User, Income, Expense, Budget, BankAccount
from app.routers import auth, profile, income, expense, budget, dashboard, bank_account, reports

Base.metadata.create_all(bind=engine)

# create_all() does not add new columns to an existing SQLite table.
# This tiny migration keeps existing BudgetBuddy databases working after
# adding bank_account_id to expenses.
def migrate_existing_database():
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if "users" in tables:
        columns = {c["name"] for c in inspector.get_columns("users")}
        with engine.begin() as conn:
            if "is_verified" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 1"))
            if "otp_hash" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN otp_hash VARCHAR(128)"))
            if "otp_expires_at" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME"))
            if "otp_attempts" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0"))

    if "expenses" in tables:
        columns = {c["name"] for c in inspector.get_columns("expenses")}
        if "bank_account_id" not in columns:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE expenses ADD COLUMN bank_account_id INTEGER"
                ))

    if "bank_accounts" in tables:
        columns = {c["name"] for c in inspector.get_columns("bank_accounts")}
        if "is_active" not in columns:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE bank_accounts ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
                ))

    if "incomes" in tables:
        columns = {c["name"] for c in inspector.get_columns("incomes")}
        if "bank_account_id" not in columns:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE incomes ADD COLUMN bank_account_id INTEGER"
                ))

    if "budgets" in tables:
        columns = {c["name"] for c in inspector.get_columns("budgets")}
        if "category" not in columns:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE budgets ADD COLUMN category VARCHAR(80) NOT NULL DEFAULT 'Overall'"
                ))

migrate_existing_database()

app = FastAPI(title="BudgetBuddy API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(income.router)
app.include_router(expense.router)
app.include_router(budget.router)
app.include_router(dashboard.router)
app.include_router(bank_account.router)
app.include_router(reports.router)


@app.get("/")
def home():
    return {"message": "Welcome to BudgetBuddy API"}
