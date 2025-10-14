from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db import get_session
from app.schemas import TaskTemplateCreate, TaskTemplateUpdate, TaskTemplateOut, Page, PageMeta
from app.models import TaskTemplate, TaskType
from app.deps import get_current_admin

router = APIRouter(tags=["tasks"], prefix="/task")


@router.get("/templates", response_model=Page, summary="获取模板列表")
async def list_templates(
    task_type: TaskType | None = Query(None),
    theme_ids: list[int] | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    base = select(TaskTemplate)
    if task_type:
        base = base.where(TaskTemplate.task_type == task_type)
    if theme_ids:
        base = base.where(TaskTemplate.theme_id.in_(theme_ids))
    total = await session.scalar(select(func.count()).select_from(base.subquery()))
    rows = (await session.execute(
        base.order_by(TaskTemplate.updated_at.desc()).offset((page - 1) * size).limit(size)
    )).scalars().all()
    return Page(data=[TaskTemplateOut.model_validate(r) for r in rows], meta=PageMeta(page=page, size=size, total=total or 0))


@router.post("/templates", response_model=TaskTemplateOut)
async def create_template(body: TaskTemplateCreate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    t = TaskTemplate(**body.model_dump())
    session.add(t)
    await session.commit()
    await session.refresh(t)
    return TaskTemplateOut.model_validate(t)


@router.put("/templates/{tpl_id}", response_model=TaskTemplateOut)
async def update_template(tpl_id: int, body: TaskTemplateUpdate, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    t = await session.get(TaskTemplate, tpl_id)
    if not t:
        raise HTTPException(404, "Template not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    await session.commit()
    await session.refresh(t)
    return TaskTemplateOut.model_validate(t)


@router.post("/templates/{tpl_id}/duplicate", response_model=TaskTemplateOut)
async def duplicate_template(tpl_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    t = await session.get(TaskTemplate, tpl_id)
    if not t:
        raise HTTPException(404, "Template not found")
    new_t = TaskTemplate(
        name=f"{t.name} (copy)", task_type=t.task_type, description=t.description,
        reward_points=t.reward_points, trigger_condition=t.trigger_condition, content=t.content,
        theme_id=t.theme_id
    )
    session.add(new_t)
    await session.commit()
    await session.refresh(new_t)
    return TaskTemplateOut.model_validate(new_t)
