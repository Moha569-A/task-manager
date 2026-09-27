"""
Pydantic schemas — request/response contracts for the API.

These double as the OpenAPI documentation you see at /docs.
"""
from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------- enums

class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


# ---------------------------------------------------------------- auth

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120, examples=["Ada Lovelace"])
    email: str = Field(
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        examples=["ada@example.com"],
    )
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------- tasks

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    status: TaskStatus = TaskStatus.pending
    priority: TaskPriority = TaskPriority.medium
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    """PATCH semantics: omitted fields stay unchanged, explicit null clears."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[date]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------- dashboard

class DayCount(BaseModel):
    date: date
    count: int


class DashboardSummary(BaseModel):
    total_tasks: int
    completed: int
    in_progress: int
    pending: int
    overdue: int
    due_today: int
    completion_rate: float
    by_priority: dict[str, int]
    completed_last_7_days: list[DayCount]
    recent_tasks: list[TaskOut]
