from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..db import get_session
from ..schemas import NPCCreate, NPCUpdate, NPCOut, Page, PageMeta
from ..models import NPC
from ..deps import get_current_admin

router = APIRouter(tags=["npcs"], prefix="/npcs")


@router.get("", response_model=Page)
async def list_npcs(
    theme_id: int | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    base = select(NPC)
    if theme_id:
        base = base.where(NPC.theme_id == theme_id)
    if q:
        base = base.where(NPC.name.like(f"%{q}%"))
    total = await session.scalar(select(func.count()).select_from(base.subquery()))
    rows = (await session.execute(
        base.order_by(NPC.updated_at.desc()).offset((page - 1) * size).limit(size)
    )).scalars().all()
    return Page(data=[NPCOut.model_validate(r) for r in rows], meta=PageMeta(page=page, size=size, total=total or 0))


@router.post("", response_model=NPCOut)
async def create_npc(body: NPCCreate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    npc = NPC(**body.model_dump())
    session.add(npc)
    await session.commit()
    await session.refresh(npc)
    return NPCOut.model_validate(npc)


@router.put("/{npc_id}", response_model=NPCOut)
async def update_npc(npc_id: int, body: NPCUpdate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    npc = await session.get(NPC, npc_id)
    if not npc:
        raise HTTPException(404, "NPC not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(npc, k, v)
    await session.commit()
    await session.refresh(npc)
    return NPCOut.model_validate(npc)


@router.delete("/{npc_id}")
async def delete_npc(npc_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    npc = await session.get(NPC, npc_id)
    if not npc:
        raise HTTPException(404, "NPC not found")
    await session.delete(npc)
    await session.commit()
    return {"ok": True}