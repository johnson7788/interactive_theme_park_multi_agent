from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..db import get_session
from ..schemas import AIConfigIn, AIConfigOut, Page, PageMeta, AdminUserOut
from ..models import Setting, AdminUser, Role
from ..deps import get_current_admin, require_roles
from ..services.ai import get_ai_config, set_ai_config
from ..utils.security import hash_password

router = APIRouter(tags=["settings"], prefix="/settings")


@router.get("/ai", response_model=AIConfigOut)
async def get_ai(session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    conf = await get_ai_config(session)
    if not conf:
        conf = {"provider": "local", "model": "gpt-4o-mini", "temperature": 0.7, "max_tokens": 800}
    return AIConfigOut(**conf)


@router.put("/ai", response_model=AIConfigOut)
async def update_ai(body: AIConfigIn, session: AsyncSession = Depends(get_session), _=Depends(require_roles(Role.admin))):
    await set_ai_config(session, body.model_dump())
    await session.commit()
    return AIConfigOut(**body.model_dump())


# ===== 账号管理 =====
@router.get("/accounts", response_model=Page)
async def list_accounts(session: AsyncSession = Depends(get_session), _=Depends(require_roles(Role.admin))):
    rows = (await session.execute(select(AdminUser).order_by(AdminUser.created_at.desc()))).scalars().all()
    return Page(data=[AdminUserOut.model_validate(r) for r in rows], meta=PageMeta(page=1, size=len(rows), total=len(rows)))


class AccountCreate(AdminUserOut):
    pass  # 仅用于文档展示（不直接使用）


@router.post("/accounts", response_model=AdminUserOut)
async def create_account(username: str, password: str, role: Role = Role.planner,
                         session: AsyncSession = Depends(get_session),
                         _=Depends(require_roles(Role.admin))):
    exists = (await session.execute(select(AdminUser).where(AdminUser.username == username))).scalar_one_or_none()
    if exists:
        raise HTTPException(400, "Username exists")
    user = AdminUser(username=username, hashed_password=hash_password(password), role=role, is_active=True)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return AdminUserOut.model_validate(user)