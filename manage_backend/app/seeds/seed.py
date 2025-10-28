import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import AsyncSessionLocal
from app.models import AdminUser, Player, GameTheme, NPC, TaskTemplate, TaskType
from app.utils.security import hash_password


async def seed():
    async with AsyncSessionLocal() as s:
        # Admin account
        exists = (await s.execute(select(AdminUser).where(AdminUser.username == "admin"))).scalar_one_or_none()
        if not exists:
            s.add(AdminUser(username="admin", hashed_password=hash_password("admin123"), is_active=True))
            print("Created admin: admin / admin123")

        # Sample players
        if not (await s.execute(select(Player))).first():
            s.add_all([
                Player(code="U001", name="小明", points=12),
                Player(code="U002", name="小红", points=8),
            ])

        # Sample theme & npc & task
        th = (await s.execute(select(GameTheme).where(GameTheme.name == "星际探险"))).scalar_one_or_none()
        if not th:
            th = GameTheme(name="星际探险", description="穿梭银河的冒险之旅", scene_count=5)
            s.add(th)
            await s.flush()
            npc = NPC(name="船长阿派朗", tone="wise", persona="沉稳睿智的船长", theme_id=th.id)
            s.add(npc)
            s.add(TaskTemplate(
                name="答题开舱门", task_type=TaskType.qa, description="回答一道关于星际的题目",
                reward_points=5, theme_id=th.id, content={"question": "银河系中心是什么？"}
            ))
        await s.commit()


if __name__ == "__main__":
    asyncio.run(seed())
