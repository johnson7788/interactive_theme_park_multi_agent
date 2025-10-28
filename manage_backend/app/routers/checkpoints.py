from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db import get_session
from app.schemas import CheckpointCreate, CheckpointUpdate, CheckpointOut, Page, PageMeta
from app.models import Checkpoint
from app.deps import get_current_admin

router = APIRouter(tags=["checkpoints"], prefix="/checkpoints")


@router.get("", response_model=Page, summary="读取打卡点")
async def list_checkpoints(
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    base = select(Checkpoint)
    if q:
        base = base.where(Checkpoint.name.like(f"%{q}%"))
    total = await session.scalar(select(func.count()).select_from(base.subquery()))
    rows = (await session.execute(
        base.order_by(Checkpoint.updated_at.desc()).offset((page - 1) * size).limit(size)
    )).scalars().all()
    return Page(data=[CheckpointOut.model_validate(r) for r in rows], meta=PageMeta(page=page, size=size, total=total or 0))


@router.post("", response_model=CheckpointOut, summary="新增/更新打卡点（单个）")
async def upsert_checkpoint(
    body: CheckpointCreate,
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    # 以 code 作为幂等键，如果存在则更新
    res = await session.execute(select(Checkpoint).where(Checkpoint.code == body.code))
    cp = res.scalar_one_or_none()
    if cp:
        for k, v in body.model_dump(exclude_unset=True).items():
            setattr(cp, k, v)
    else:
        cp = Checkpoint(**body.model_dump())
        session.add(cp)
    await session.commit()
    await session.refresh(cp)
    return CheckpointOut.model_validate(cp)


@router.put("/{cp_id}", response_model=CheckpointOut)
async def update_checkpoint(cp_id: int, body: CheckpointUpdate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    cp = await session.get(Checkpoint, cp_id)
    if not cp:
        raise HTTPException(404, "Checkpoint not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(cp, k, v)
    await session.commit()
    await session.refresh(cp)
    return CheckpointOut.model_validate(cp)


@router.delete("/{cp_id}")
async def delete_checkpoint(cp_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    cp = await session.get(Checkpoint, cp_id)
    if not cp:
        raise HTTPException(404, "Checkpoint not found")
    await session.delete(cp)
    await session.commit()
    return {"ok": True}
