"""
ORM models — the database design of TaskFlow.

    ┌──────────┐ 1        * ┌──────────┐
    │  users   │────────────│  tasks   │
    └──────────┘            └──────────┘

A task always belongs to exactly one user (ownership is the core
multi-tenancy rule of the app: every query is scoped by user_id).
"""
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TaskStatus:
    """Stored as plain strings so the database stays readable & portable."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ALL = (PENDING, IN_PROGRESS, COMPLETED)


class TaskPriority:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    ALL = (LOW, MEDIUM, HIGH, URGENT)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    # format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email!r}>"


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed')",
            name="ck_tasks_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_tasks_priority",
        ),
        # Composite index for the most common query: "my tasks with status X"
        Index("ix_tasks_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TaskStatus.PENDING, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(10), nullable=False, default=TaskPriority.MEDIUM
    )
    due_date: Mapped["datetime | None"] = mapped_column(Date, nullable=True)
    # Business rule: set the moment a task transitions INTO "completed",
    # cleared if it moves back out. Powers the "completed this week" chart.
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    owner: Mapped[User] = relationship(back_populates="tasks")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Task id={self.id} title={self.title!r} status={self.status!r}>"
