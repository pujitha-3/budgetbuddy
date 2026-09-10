from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    goal_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    target = Column(Float, nullable=False)
    saved = Column(Float, nullable=False, default=0)
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime, nullable=False)

    contributions = relationship("SavingsContribution", back_populates="goal", cascade="all, delete-orphan")

class SavingsContribution(Base):
    __tablename__ = "savings_contributions"

    contribution_id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("savings_goals.goal_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    source_type = Column(String(30), nullable=True, default=None)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.account_id"), nullable=True, index=True)
    bank_account = relationship("BankAccount", foreign_keys=[bank_account_id])

    goal = relationship("SavingsGoal", back_populates="contributions")
