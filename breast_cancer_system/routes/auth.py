"""Authentication routes for registration and login."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from breast_cancer_system.database.connection import get_db
from breast_cancer_system.database.models import User
from breast_cancer_system.database.schemas import LoginRequest, RegisterRequest, TokenResponse, UserRead
from breast_cancer_system.utils.security import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token


router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    """Create a new user account with a unique phone number."""

    existing_user = db.query(User).filter(User.phone == payload.phone).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered.")

    user = User(
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        password="",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate a user by phone number and issue a JWT bearer token."""

    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone number.")

    access_token = create_access_token(
        subject=user.phone,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=access_token)
