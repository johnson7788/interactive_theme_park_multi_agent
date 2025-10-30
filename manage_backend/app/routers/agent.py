from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..schemas import StoryGenerateIn, StoryGenerateOut, TaskTemplateOut
from ..services.ai import generate_story_and_tasks
from ..deps import get_current_admin

router = APIRouter(tags=["agent"], prefix="/agent")


@router.post("/generate", response_model=StoryGenerateOut, summary="AI生成故事与任务")
async def generate_story(data: StoryGenerateIn, session: AsyncSession = Depends(get_session), _=Depends(get_current_admin)):
    story, tasks = await generate_story_and_tasks(session, data.theme_name, data.scene_setting, data.task_types)
    # 这里返回未落库的任务模板，前端可编辑后，调用 /task/templates 保存
    return StoryGenerateOut(story=story, tasks=tasks)  # type: ignore