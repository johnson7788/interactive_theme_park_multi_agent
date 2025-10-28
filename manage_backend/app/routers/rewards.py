from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_session
from app.schemas import RewardRuleCreate, RewardRuleUpdate, RewardRuleOut, Page, PageMeta
from app.models import RewardRule
from app.deps import get_current_admin

router = APIRouter(tags=["rewards"], prefix="/rewards")


@router.get("", response_model=Page)
async def list_rules(session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    rows = (await session.execute(select(RewardRule).order_by(RewardRule.updated_at.desc()))).scalars().all()
    return Page(data=[RewardRuleOut.model_validate(r) for r in rows], meta=PageMeta(page=1, size=len(rows), total=len(rows)))


@router.post("", response_model=RewardRuleOut)
async def create_rule(body: RewardRuleCreate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    rr = RewardRule(**body.model_dump())
    session.add(rr)
    await session.commit()
    await session.refresh(rr)
    return RewardRuleOut.model_validate(rr)


@router.put("/{rule_id}", response_model=RewardRuleOut)
async def update_rule(rule_id: int, body: RewardRuleUpdate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    rr = await session.get(RewardRule, rule_id)
    if not rr:
        raise HTTPException(404, "Rule not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(rr, k, v)
    await session.commit()
    await session.refresh(rr)
    return RewardRuleOut.model_validate(rr)


@router.delete("/{rule_id}")
async def delete_rule(rule_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    rr = await session.get(RewardRule, rule_id)
    if not rr:
        raise HTTPException(404, "Rule not found")
    await session.delete(rr)
    await session.commit()
    return {"ok": True}
