from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.database import Base

class Budget(Base):
    __tablename__ = "budgets"
    budget_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    month = Column(String(7), nullable=False)
    category = Column(String(80), nullable=False, default="Overall")
    amount = Column(Float, nullable=False)
