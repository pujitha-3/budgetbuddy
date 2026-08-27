from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"
    expense_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    category = Column(String(80), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    payment_method = Column(String(30), default="Cash", nullable=False)
    # Kept for old records/backward compatibility.
    bank_name = Column(String(120), nullable=True)
    # New relation: an expense can point to one of the user's saved bank accounts.
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.account_id"), nullable=True, index=True)

    bank_account = relationship("BankAccount", foreign_keys=[bank_account_id])

    @property
    def bank_account_last4(self):
        if self.bank_account:
            return self.bank_account.account_number_last4
        return None
