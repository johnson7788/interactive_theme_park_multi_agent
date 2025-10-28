from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db import get_session
from app.schemas import ThemeCreate, ThemeUpdate, ThemeOut, Page, PageMeta
from app.models import GameTheme, NPC
from app.deps import get_current_admin

router = APIRouter(tags=["themes"], prefix="/themes")


@router.get("", response_model=Page)
async def list_themes(
    q: str | None = Query(None, description="搜索游戏名"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    base = select(GameTheme)
    if q:
        base = base.where(GameTheme.name.like(f"%{q}%"))
    total = await session.scalar(select(func.count()).select_from(base.subquery()))
    rows = (await session.execute(
        base.order_by(GameTheme.updated_at.desc()).offset((page - 1) * size).limit(size)
    )).scalars().all()

    # 附带 NPC 数
    data: list[ThemeOut] = []
    for t in rows:
        npc_count = await session.scalar(select(func.count()).select_from(NPC).where(NPC.theme_id == t.id))
        data.append(ThemeOut(
            id=t.id, name=t.name, description=t.description, status=t.status,
            scene_count=t.scene_count, updated_at=t.updated_at, npc_count=npc_count or 0
        ))
    return Page(data=data, meta=PageMeta(page=page, size=size, total=total or 0))


@router.post("", response_model=ThemeOut)
async def create_theme(
    body: ThemeCreate,
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    theme = GameTheme(**body.model_dump())
    session.add(theme)
    await session.commit()
    await session.refresh(theme)
    return ThemeOut(
        id=theme.id, name=theme.name, description=theme.description, status=theme.status,
        scene_count=theme.scene_count, updated_at=theme.updated_at, npc_count=0
    )


@router.get("/{theme_id}", response_model=ThemeOut)
async def get_theme(theme_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    theme = await session.get(GameTheme, theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    from sqlalchemy import select, func
    npc_count = await session.scalar(select(func.count()).select_from(NPC).where(NPC.theme_id == theme.id))
    return ThemeOut(
        id=theme.id, name=theme.name, description=theme.description, status=theme.status,
        scene_count=theme.scene_count, updated_at=theme.updated_at, npc_count=npc_count or 0
    )


@router.put("/{theme_id}", response_model=ThemeOut)
async def update_theme(theme_id: int, body: ThemeUpdate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    theme = await session.get(GameTheme, theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(theme, k, v)
    await session.commit()
    await session.refresh(theme)
    from sqlalchemy import select, func
    npc_count = await session.scalar(select(func.count()).select_from(NPC).where(NPC.theme_id == theme.id))
    return ThemeOut(
        id=theme.id, name=theme.name, description=theme.description, status=theme.status,
        scene_count=theme.scene_count, updated_at=theme.updated_at, npc_count=npc_count or 0
    )


@router.delete("/{theme_id}")
async def delete_theme(theme_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    theme = await session.get(GameTheme, theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    await session.delete(theme)
    await session.commit()
    return {"ok": True}
