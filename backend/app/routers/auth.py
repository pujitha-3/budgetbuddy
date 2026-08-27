import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import Register, Login, Token
from app.core.security import hash_password, verify_password, create_access_token

router=APIRouter(prefix="/auth",tags=["Authentication"])

@router.post("/register")
def register(user:Register,db:Session=Depends(get_db)):
    strong=re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$")
    if not strong.match(user.password):
        raise HTTPException(400,"Password must contain 8+ characters, uppercase, lowercase, number and special character.")
    email=user.email.lower().strip()
    if db.query(User).filter(User.email==email).first():
        raise HTTPException(400,"Email already exists")
    new_user=User(name=user.name.strip(),email=email,password=hash_password(user.password),role="Student",is_verified=True,otp_attempts=0)
    db.add(new_user); db.commit(); db.refresh(new_user)
    return {"message":"User Registered Successfully"}

@router.post("/login",response_model=Token)
def login(user:Login,db:Session=Depends(get_db)):
    email=user.email.lower().strip()
    db_user=db.query(User).filter(User.email==email).first()
    if not db_user: raise HTTPException(401,"Email not found")
    if not verify_password(user.password,db_user.password): raise HTTPException(401,"Incorrect password")
    return {"access_token":create_access_token({"sub":db_user.email}),"token_type":"bearer"}
