from datetime import date, datetime, timedelta
from io import BytesIO
import csv
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from reportlab.pdfgen import canvas

from ..db import get_session
from ..schemas import StatsOut
from ..models import UserTaskProgress, ProgressStatus, Checkpoint, TaskTemplate, Player
from ..deps import get_current_admin

router = APIRouter(tags=["stats"], prefix="/stats")


@router.get("", response_model=StatsOut, summary="获取数据概览")
async def stats_overview(
    start: date | None = Query(None),
    end: date | None = Query(None),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    if not start or not end:
        end = date.today()
        start = end - timedelta(days=14)

    # 完成率（按任务）
    total_by_task = select(UserTaskProgress.task_id, func.count().label("total")).where(
        UserTaskProgress.created_at >= start, UserTaskProgress.created_at < end + timedelta(days=1)
    ).group_by(UserTaskProgress.task_id).subquery()

    done_by_task = select(UserTaskProgress.task_id, func.count().label("done")).where(
        UserTaskProgress.status == ProgressStatus.completed,
        UserTaskProgress.created_at >= start, UserTaskProgress.created_at < end + timedelta(days=1)
    ).group_by(UserTaskProgress.task_id).subquery()

    comp_rows = (await session.execute(
        select(TaskTemplate.name, func.coalesce((done_by_task.c.done / total_by_task.c.total) * 100, 0))
        .join_from(TaskTemplate, total_by_task, TaskTemplate.id == total_by_task.c.task_id, isouter=True)
        .join(done_by_task, TaskTemplate.id == done_by_task.c.task_id, isouter=True)
    )).all()
    completion_rate = [{"task": r[0], "completion_rate": float(round(r[1] or 0, 2))} for r in comp_rows]

    # 热力图（按打卡点）
    heat_rows = (await session.execute(
        select(Checkpoint.id, Checkpoint.name, func.count(UserTaskProgress.id))
        .join(UserTaskProgress, UserTaskProgress.checkpoint_id == Checkpoint.id, isouter=True)
        .group_by(Checkpoint.id, Checkpoint.name)
        .order_by(func.count(UserTaskProgress.id).desc())
    )).all()
    heatmap = [{"checkpoint_id": r[0], "name": r[1], "count": int(r[2] or 0)} for r in heat_rows]

    # 每日互动量
    daily_rows = (await session.execute(
        select(func.date(UserTaskProgress.created_at), func.count())
        .where(UserTaskProgress.created_at >= start, UserTaskProgress.created_at < end + timedelta(days=1))
        .group_by(func.date(UserTaskProgress.created_at))
        .order_by(func.date(UserTaskProgress.created_at))
    )).all()
    daily_interactions = [{"date": str(r[0]), "count": int(r[1] or 0)} for r in daily_rows]

    # 任务类型占比
    dist_rows = (await session.execute(
        select(TaskTemplate.task_type, func.count()).join(UserTaskProgress, UserTaskProgress.task_id == TaskTemplate.id, isouter=True)
        .group_by(TaskTemplate.task_type)
    )).all()
    task_type_distribution = [{"type": r[0].value, "count": int(r[1] or 0)} for r in dist_rows]

    # 积分排行榜 TOP 10
    top_rows = (await session.execute(
        select(Player.code, Player.name, Player.points).order_by(Player.points.desc()).limit(10)
    )).all()
    top_scores = [{"user_code": r[0], "name": r[1], "points": int(r[2])} for r in top_rows]

    return StatsOut(
        completion_rate_by_task=completion_rate,
        checkpoint_heatmap=heatmap,
        daily_interactions=daily_interactions,
        task_type_distribution=task_type_distribution,
        top_scores=top_scores
    )


@router.get("/export")
async def export(
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_admin),
):
    # 简易导出示例：导出排行榜
    rows = (await session.execute(
        select(Player.code, Player.name, Player.points).order_by(Player.points.desc())
    )).all()

    if format == "csv":
        buf = BytesIO()
        w = csv.writer(buf)
        w.writerow(["User Code", "Name", "Points"])
        for r in rows:
            w.writerow([r[0], r[1], r[2]])
        return Response(content=buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=leaderboard.csv"})

    # PDF
    buf = BytesIO()
    c = canvas.Canvas(buf)
    c.setTitle("Leaderboard")
    c.drawString(50, 800, "Leaderboard")
    y = 780
    c.drawString(50, y, "User Code")
    c.drawString(200, y, "Name")
    c.drawString(450, y, "Points")
    y -= 20
    for r in rows:
        c.drawString(50, y, str(r[0])); c.drawString(200, y, str(r[1])); c.drawString(450, y, str(r[2]))
        y -= 18
        if y < 60:
            c.showPage(); y = 800
    c.save()
    return Response(content=buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=leaderboard.pdf"})