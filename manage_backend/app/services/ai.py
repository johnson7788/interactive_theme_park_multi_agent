from __future__ import annotations
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Setting, TaskTemplate, TaskType
from ..schemas import TaskTemplateOut

# 如需接入 OpenAI，请取消注释以下内容并在 .env 配置 OPENAI_API_KEY
# from openai import OpenAI
# import os


async def get_ai_config(session: AsyncSession) -> dict:
    res = await session.execute(
        Setting.__table__.select().where(Setting.key == "ai_config")
    )
    row = res.first()
    if row:
        return row.value or {}
    return {}


async def set_ai_config(session: AsyncSession, conf: dict) -> None:
    res = await session.execute(Setting.__table__.select().where(Setting.key == "ai_config"))
    row = res.first()
    if row:
        await session.execute(
            Setting.__table__.update().where(Setting.key == "ai_config").values(value=conf)
        )
    else:
        await session.execute(
            Setting.__table__.insert().values(key="ai_config", value=conf)
        )


# === 本地占位“AI”生成：无外网也可用 ===
def _local_generate_story(theme_name: str, scene_setting: str, task_types: List[TaskType]) -> tuple[str, list[dict]]:
    story = (
        f"【{theme_name}】背景故事\n"
        f"在{scene_setting}中，玩家将探索线索、结识NPC，并逐步完成任务以获得奖励。"
        f"每个场景都有隐藏的彩蛋与道具，鼓励合作与交流。"
    )
    tasks: list[dict] = []
    for i, t in enumerate(task_types, start=1):
        tt_name = {
            TaskType.qa: "问答挑战",
            TaskType.collect: "收集物品",
            TaskType.redirect: "线下导流",
            TaskType.test: "知识测验",
        }[t]
        tasks.append({
            "name": f"{tt_name} #{i}",
            "task_type": t.value,
            "description": f"根据故事线索完成 {tt_name}。",
            "reward_points": 3 + i,
            "trigger_condition": {"scene": scene_setting, "order": i},
            "content": {
                "tips": ["注意观察 NPC 台词", "留心场景中的标志物"],
                "success_criteria": "完成指定动作或回答正确"
            },
            "theme_id": None,
        })
    return story, tasks


async def generate_story_and_tasks(
    session: AsyncSession, theme_name: str, scene_setting: str, task_types: List[TaskType]
) -> tuple[str, list[TaskTemplateOut]]:
    """
    返回：故事文本 + 任务模板（未落库，供前端预览/编辑后保存）
    """
    # ===== 若需要真实模型，可启用以下逻辑 =====
    # if os.getenv("OPENAI_API_KEY"):
    #     client = OpenAI()
    #     prompt = f"请基于主题《{theme_name}》与场景设定《{scene_setting}》生成一段简洁、有趣的故事背景，" \
    #              f"并为任务类型 {', '.join([t.value for t in task_types])} 各生成1个任务要点(名称/描述/奖励)。"
    #     rsp = client.chat.completions.create(
    #         model=os.getenv("AI_MODEL", "gpt-4o-mini"),
    #         messages=[{"role": "system", "content": "你是资深游戏策划。"},
    #                   {"role": "user", "content": prompt}],
    #         temperature=0.7,
    #     )
    #     story = rsp.choices[0].message.content.strip()
    #     # 解析省略，示例仍使用本地模板补齐 tasks
    #     _, tasks_raw = _local_generate_story(theme_name, scene_setting, task_types)
    # else:
    story, tasks_raw = _local_generate_story(theme_name, scene_setting, task_types)

    # 映射到输出模型（未写入数据库）
    tasks: list[TaskTemplateOut] = []
    for t in tasks_raw:
        tasks.append(TaskTemplateOut(
            id=0,  # 未落库情况下占位
            name=t["name"],
            task_type=TaskType(t["task_type"]),
            description=t["description"],
            reward_points=t["reward_points"],
            trigger_condition=t["trigger_condition"],
            content=t["content"],
            theme_id=t["theme_id"],
            updated_at=None  # 占位
        ))
    return story, tasks
