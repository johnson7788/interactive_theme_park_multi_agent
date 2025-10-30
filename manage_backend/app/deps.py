from fastapi import Depends, HTTPException
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from .db import get_session
from .models import AdminUser, Role
from .utils.security import verify_token

# OAuth2 密码验证方案
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
        token: str = Depends(oauth2_scheme),
        session: AsyncSession = Depends(get_session)
) -> AdminUser:
    """获取当前登录用户"""
    try:
        payload = verify_token(token)
        user_id = payload.get("uid")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        # 从数据库获取用户信息
        user = await session.get(AdminUser, user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="User inactive or not found")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


async def get_current_admin(
        user: AdminUser = Depends(get_current_user)
) -> AdminUser:
    """获取当前登录的管理员用户"""
    if user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user


def require_roles(*required_roles):
    """
    角色验证依赖项工厂函数
    检查当前用户是否具有指定的角色之一
    """
    async def role_checker(user: AdminUser = Depends(get_current_user)):
        if user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user
    return role_checker