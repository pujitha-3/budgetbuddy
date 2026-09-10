import sys
from app.database import SessionLocal
from app.models.user import User

if len(sys.argv) != 3:
    print("Usage: python set_role.py <email> <Student|Premium>")
    raise SystemExit(1)

email = sys.argv[1].strip().lower()
role = sys.argv[2].strip().capitalize()
if role not in {"Student", "Premium"}:
    print("Only Student or Premium can be assigned with this helper.")
    raise SystemExit(1)

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"User not found: {email}")
        raise SystemExit(1)
    if str(user.role or "").lower() == "admin":
        print("The Admin account cannot be changed with this helper.")
        raise SystemExit(1)
    user.role = role
    db.commit()
    print(f"{email} is now {role}")
finally:
    db.close()
