from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db import get_session
from app.schemas import PlayerOut, PlayerDetailOut, Page, PageMeta
from app.models import Player, UserTaskProgress, ProgressStatus, UserReward
from app.deps import get_current_admin

router = APIRouter(tags=["users"], prefix="/users")


@router.get("", response_model=Page, summary="获取用户列表")
async def list_users(
    q: str | None = Query(None, description="按ID/名称"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    base = select(Player)
    if q:
        base = base.where((Player.code.like(f"%{q}%")) | (Player.name.like(f"%{q}%")))
    total = await session.scalar(select(func.count()).select_from(base.subquery()))
    rows = (await session.execute(
        base.order_by(Player.updated_at.desc()).offset((page - 1) * size).limit(size)
    )).scalars().all()

    # enrich
    data: list[PlayerOut] = []
    for p in rows:
        completed = await session.scalar(
            select(func.count()).select_from(UserTaskProgress).where(
                UserTaskProgress.player_id == p.id,
                UserTaskProgress.status == ProgressStatus.completed
            )
        )
        rewards = (await session.execute(
            select(UserReward).where(UserReward.player_id == p.id)
        )).scalars().all()
        data.append(PlayerOut(
            id=p.id, code=p.code, name=p.name, points=p.points, last_checkin_at=p.last_checkin_at,
            completed_tasks=completed or 0, rewards=[r.rule.content if r.rule else "奖励" for r in rewards]
        ))
    return Page(data=data, meta=PageMeta(page=page, size=size, total=total or 0))


@router.get("/{player_id}", response_model=PlayerDetailOut, summary="用户详情（任务履历+奖励）")
async def user_detail(player_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    p = await session.get(Player, player_id)
    if not p:
        raise HTTPException(404, "User not found")
    progresses = (await session.execute(
        select(UserTaskProgress).where(UserTaskProgress.player_id == p.id).order_by(UserTaskProgress.updated_at.desc())
    )).scalars().all()
    rewards = (await session.execute(
        select(UserReward).where(UserReward.player_id == p.id).order_by(UserReward.updated_at.desc())
    )).scalars().all()
    return PlayerDetailOut(
        id=p.id, code=p.code, name=p.name, points=p.points, last_checkin_at=p.last_checkin_at,
        progresses=[{
            "task_id": it.task_id, "status": it.status.value,
            "checkpoint_id": it.checkpoint_id, "completed_at": it.completed_at
        } for it in progresses],
        rewards=[{
            "rule_id": it.rule_id, "content": (it.rule.content if it.rule else None), "status": it.status, "at": it.created_at
        } for it in rewards]
    )
