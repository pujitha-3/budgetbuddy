"""Create or update the single BudgetBuddy administrator account.

Run from the backend folder:
    python create_admin.py

The script asks for your own admin email and password, so no admin password
is stored in the source code.
"""
from getpass import getpass

from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def main():
    email = input("Enter your ADMIN email: ").strip().lower()
    if not email:
        raise SystemExit("Admin email is required.")

    password = getpass("Enter your ADMIN password: ")
    confirm = getpass("Confirm your ADMIN password: ")
    if not password:
        raise SystemExit("Admin password is required.")
    if password != confirm:
        raise SystemExit("Passwords do not match.")

    name = input("Enter admin name (press Enter for BudgetBuddy Admin): ").strip()
    name = name or "BudgetBuddy Admin"

    db = SessionLocal()
    try:
        # If the email already exists, make that account the Admin and update
        # its password. Otherwise create the account.
        admin = db.query(User).filter(User.email == email).first()
        if not admin:
            admin = User(
                name=name,
                email=email,
                password=hash_password(password),
                role="Admin",
                is_verified=True,
                otp_attempts=0,
            )
            db.add(admin)
        else:
            admin.name = name
            admin.password = hash_password(password)
            admin.role = "Admin"
            admin.is_verified = True

        # Keep exactly one Admin. The old demo administrator is removed
        # completely; any other existing administrator is downgraded to
        # Premium so the requested account remains the sole administrator.
        old_demo = db.query(User).filter(User.email == "admin@budgetbuddy.local", User.email != email).first()
        if old_demo:
            db.delete(old_demo)
            db.flush()

        others = db.query(User).filter(
            User.role == "Admin", User.email != email
        ).all()
        for other in others:
            other.role = "Premium"

        db.commit()
        print("\nSingle admin account is ready.")
        print(f"Admin email: {email}")
        print("Admin password: saved securely in the database (not displayed).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
