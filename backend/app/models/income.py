from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Income(Base):
    __tablename__ = "incomes"
    income_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    source = Column(String(120), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    account_type = Column(String(30), default="Cash", nullable=False)
    bank_name = Column(String(120), nullable=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.account_id"), nullable=True, index=True)
    bank_account = relationship("BankAccount", foreign_keys=[bank_account_id])

    @property
    def bank_account_last4(self):
        return self.bank_account.account_number_last4 if self.bank_account else None
