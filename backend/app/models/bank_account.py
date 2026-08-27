from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from app.database import Base

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    account_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    bank_name = Column(String(120), nullable=False)
    account_holder = Column(String(120), nullable=False)
    account_type = Column(String(30), nullable=False, default="Savings")
    account_number_last4 = Column(String(4), nullable=False)
    ifsc_code = Column(String(20), nullable=True)
    branch_name = Column(String(120), nullable=True)
    nickname = Column(String(80), nullable=True)
    opening_balance = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
