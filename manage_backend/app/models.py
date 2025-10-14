from __future__ import annotations
from datetime import datetime
from enum import StrEnum
from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum,
    func, Text, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from app.db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ===== Enums =====
class Role(StrEnum):
    admin = "admin"
    planner = "planner"


class GameStatus(StrEnum):
    draft = "draft"
    active = "active"
    paused = "paused"
    archived = "archived"


class Tone(StrEnum):
    lively = "lively"   # 活泼
    gentle = "gentle"   # 温柔
    wise = "wise"       # 睿智
    funny = "funny"     # 搞笑


class TaskType(StrEnum):
    qa = "qa"           # 问答
    collect = "collect" # 采集
    redirect = "redirect"  # 导流
    test = "test"       # 测试/测验


class ProgressStatus(StrEnum):
    pending = "pending"
    completed = "completed"


class RewardType(StrEnum):
    points = "points"     # 积分奖励
    limited = "limited"   # 限量
    location = "location" # 地点相关
    time = "time"         # 时间相关


# ===== Admin Users (后台账号) =====
class AdminUser(TimestampMixin, Base):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role), default=Role.admin)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    logs: Mapped[list["AuditLog"]] = relationship(back_populates="actor")


# ===== Players (游客/用户) =====
class Player(TimestampMixin, Base):
    __tablename__ = "players"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # 如 U001
    name: Mapped[str] = mapped_column(String(64))
    points: Mapped[int] = mapped_column(Integer, default=0)
    last_checkin_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    progresses: Mapped[list["UserTaskProgress"]] = relationship(back_populates="player")
    rewards: Mapped[list["UserReward"]] = relationship(back_populates="player")


# ===== 游戏主题 =====
class GameTheme(TimestampMixin, Base):
    __tablename__ = "game_themes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[GameStatus] = mapped_column(SAEnum(GameStatus), default=GameStatus.active)
    scene_count: Mapped[int] = mapped_column(Integer, default=0)

    npcs: Mapped[list["NPC"]] = relationship(back_populates="theme")
    tasks: Mapped[list["TaskTemplate"]] = relationship(back_populates="theme")


# ===== NPC =====
class NPC(TimestampMixin, Base):
    __tablename__ = "npcs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    tone: Mapped[Tone] = mapped_column(SAEnum(Tone), default=Tone.lively)
    avatar_url: Mapped[str | None] = mapped_column(String(255))
    persona: Mapped[str | None] = mapped_column(Text)  # 角色设定
    script_templates: Mapped[dict | None] = mapped_column(MySQLJSON)
    prompt_template: Mapped[str | None] = mapped_column(Text)

    theme_id: Mapped[int | None] = mapped_column(ForeignKey("game_themes.id"))
    theme: Mapped[GameTheme | None] = relationship(back_populates="npcs")


# ===== 任务模板 =====
class TaskTemplate(TimestampMixin, Base):
    __tablename__ = "task_templates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    task_type: Mapped[TaskType] = mapped_column(SAEnum(TaskType), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    reward_points: Mapped[int] = mapped_column(Integer, default=0)
    trigger_condition: Mapped[dict | None] = mapped_column(MySQLJSON)  # 触发条件
    content: Mapped[dict | None] = mapped_column(MySQLJSON)            # 题面/流程等

    theme_id: Mapped[int | None] = mapped_column(ForeignKey("game_themes.id"), index=True)
    theme: Mapped[GameTheme | None] = relationship(back_populates="tasks")

    progresses: Mapped[list["UserTaskProgress"]] = relationship(back_populates="task")


# ===== 打卡点 =====
class Checkpoint(TimestampMixin, Base):
    __tablename__ = "checkpoints"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # 如 CP001
    name: Mapped[str] = mapped_column(String(120))
    area: Mapped[str | None] = mapped_column(String(120))
    event_type: Mapped[TaskType] = mapped_column(SAEnum(TaskType), default=TaskType.qa)
    position_x: Mapped[float | None] = mapped_column()  # 0~1 相对坐标
    position_y: Mapped[float | None] = mapped_column()
    reward: Mapped[dict | None] = mapped_column(MySQLJSON)

    npc_id: Mapped[int | None] = mapped_column(ForeignKey("npcs.id"))
    npc: Mapped[NPC | None] = relationship()

    # 供热力图统计
    progresses: Mapped[list["UserTaskProgress"]] = relationship(back_populates="checkpoint")


# ===== 进度与奖励 =====
class UserTaskProgress(TimestampMixin, Base):
    __tablename__ = "user_task_progress"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[ProgressStatus] = mapped_column(SAEnum(ProgressStatus), default=ProgressStatus.pending)
    points_awarded: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("task_templates.id"), index=True)
    checkpoint_id: Mapped[int | None] = mapped_column(ForeignKey("checkpoints.id"), index=True)

    player: Mapped[Player] = relationship(back_populates="progresses")
    task: Mapped[TaskTemplate] = relationship(back_populates="progresses")
    checkpoint: Mapped[Checkpoint | None] = relationship(back_populates="progresses")

    __table_args__ = (
        Index("idx_progress_player_task", "player_id", "task_id"),
    )


class RewardRule(TimestampMixin, Base):
    __tablename__ = "reward_rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    rule_type: Mapped[RewardType] = mapped_column(SAEnum(RewardType))
    condition: Mapped[dict | None] = mapped_column(MySQLJSON)
    content: Mapped[str | None] = mapped_column(String(255))  # 奖励内容描述
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    rewards: Mapped[list["UserReward"]] = relationship(back_populates="rule")


class UserReward(TimestampMixin, Base):
    __tablename__ = "user_rewards"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    rule_id: Mapped[int | None] = mapped_column(ForeignKey("reward_rules.id"))
    status: Mapped[str] = mapped_column(String(32), default="granted")

    player: Mapped[Player] = relationship(back_populates="rewards")
    rule: Mapped[RewardRule | None] = relationship(back_populates="rewards")


# ===== Settings / 操作日志 =====
class Setting(TimestampMixin, Base):
    __tablename__ = "settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    value: Mapped[dict | None] = mapped_column(MySQLJSON)


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("admin_users.id"))
    action: Mapped[str] = mapped_column(String(120))
    resource: Mapped[str] = mapped_column(String(120))
    detail: Mapped[dict | None] = mapped_column(MySQLJSON)
    ip: Mapped[str | None] = mapped_column(String(64))

    actor: Mapped[AdminUser | None] = relationship(back_populates="logs")

    __table_args__ = (
        Index("idx_audit_action_resource", "action", "resource"),
    )


# 约束例子
UniqueConstraint(RewardRule.name)
