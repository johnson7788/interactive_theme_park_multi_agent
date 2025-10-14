from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models import Role, GameStatus, Tone, TaskType, ProgressStatus, RewardType


# ===== Common =====
class PageMeta(BaseModel):
    page: int = 1
    size: int = 20
    total: int = 0


class Page(BaseModel):
    data: list[Any]
    meta: PageMeta


# ===== Auth =====
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    role: Role
    is_active: bool
    created_at: datetime


# ===== Themes =====
class ThemeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: GameStatus = GameStatus.active
    scene_count: int = 0


class ThemeUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[GameStatus] = None
    scene_count: Optional[int] = None


class ThemeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str]
    status: GameStatus
    scene_count: int
    updated_at: datetime
    npc_count: int = 0


# ===== NPC =====
class NPCBase(BaseModel):
    name: str
    tone: Tone = Tone.lively
    avatar_url: Optional[str] = None
    persona: Optional[str] = None
    prompt_template: Optional[str] = None
    script_templates: Optional[dict] = None
    theme_id: Optional[int] = None


class NPCCreate(NPCBase):
    pass


class NPCUpdate(BaseModel):
    tone: Optional[Tone] = None
    avatar_url: Optional[str] = None
    persona: Optional[str] = None
    prompt_template: Optional[str] = None
    script_templates: Optional[dict] = None
    theme_id: Optional[int] = None


class NPCOut(NPCBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime


# ===== Task Template =====
class TaskTemplateBase(BaseModel):
    name: str
    task_type: TaskType
    description: Optional[str] = None
    reward_points: int = 0
    trigger_condition: Optional[dict] = None
    content: Optional[dict] = None
    theme_id: Optional[int] = None


class TaskTemplateCreate(TaskTemplateBase):
    pass


class TaskTemplateUpdate(BaseModel):
    name: Optional[str] = None
    task_type: Optional[TaskType] = None
    description: Optional[str] = None
    reward_points: Optional[int] = None
    trigger_condition: Optional[dict] = None
    content: Optional[dict] = None
    theme_id: Optional[int] = None


class TaskTemplateOut(TaskTemplateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime


# ===== Checkpoint =====
class CheckpointBase(BaseModel):
    code: str
    name: str
    area: Optional[str] = None
    event_type: TaskType = TaskType.qa
    position_x: Optional[float] = Field(None, ge=0, le=1)
    position_y: Optional[float] = Field(None, ge=0, le=1)
    reward: Optional[dict] = None
    npc_id: Optional[int] = None


class CheckpointCreate(CheckpointBase):
    pass


class CheckpointUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    event_type: Optional[TaskType] = None
    position_x: Optional[float] = Field(None, ge=0, le=1)
    position_y: Optional[float] = Field(None, ge=0, le=1)
    reward: Optional[dict] = None
    npc_id: Optional[int] = None


class CheckpointOut(CheckpointBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime


# ===== Users (Players) =====
class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    points: int
    last_checkin_at: Optional[datetime]
    completed_tasks: int = 0
    rewards: list[str] = []


class PlayerDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    points: int
    last_checkin_at: Optional[datetime]
    progresses: list[dict]
    rewards: list[dict]


# ===== Rewards =====
class RewardRuleCreate(BaseModel):
    name: str
    rule_type: RewardType
    condition: Optional[dict] = None
    content: Optional[str] = None
    enabled: bool = True


class RewardRuleUpdate(BaseModel):
    rule_type: Optional[RewardType] = None
    condition: Optional[dict] = None
    content: Optional[str] = None
    enabled: Optional[bool] = None


class RewardRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    rule_type: RewardType
    condition: Optional[dict]
    content: Optional[str]
    enabled: bool
    updated_at: datetime


# ===== Stats =====
class StatsOut(BaseModel):
    completion_rate_by_task: list[dict]
    checkpoint_heatmap: list[dict]
    daily_interactions: list[dict]
    task_type_distribution: list[dict]
    top_scores: list[dict]


# ===== Settings / AI =====
class AIConfigIn(BaseModel):
    provider: str = "local"
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 800


class AIConfigOut(AIConfigIn):
    model_config = ConfigDict(from_attributes=True)


# ===== Story Generator =====
class StoryGenerateIn(BaseModel):
    theme_name: str
    scene_setting: str
    task_types: List[TaskType] = [TaskType.qa, TaskType.collect]


class StoryGenerateOut(BaseModel):
    story: str
    tasks: List[TaskTemplateOut]
