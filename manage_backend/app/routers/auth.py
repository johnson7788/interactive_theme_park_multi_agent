from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_session
from app.schemas import LoginRequest, TokenResponse, AdminUserOut
from app.models import AdminUser
from app.utils.security import verify_password, create_access_token

router = APIRouter(tags=["auth"], prefix="/auth")


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)):
    stmt = select(AdminUser).where(AdminUser.username == data.username)
    res = await session.execute(stmt)
    user: AdminUser | None = res.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id, user.username)
    return TokenResponse(access_token=token, expires_in=60 * 60 * 2)
