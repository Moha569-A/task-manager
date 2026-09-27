"""
Dashboard aggregation endpoint.

All numbers are computed server-side with SQL aggregates (GROUP BY), not by
loading every task into Python — this stays fast as a user's task count grows.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Task, TaskPriority, TaskStatus, User
from ..schemas import DashboardSummary, DayCount, TaskOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    mine = Task.user_id == user.id

    # --- status & priority breakdowns (GROUP BY aggregates) ---------------
    status_rows = db.execute(
        select(Task.status, func.count()).where(mine).group_by(Task.status)
    ).all()
    status_counts = {s: c for s, c in status_rows}

    priority_rows = db.execute(
        select(Task.priority, func.count()).where(mine).group_by(Task.priority)
    ).all()
    by_priority = {p: 0 for p in TaskPriority.ALL}
    for p, c in priority_rows:
        by_priority[p] = c

    total = sum(status_counts.values())
    completed = status_counts.get(TaskStatus.COMPLETED, 0)
    in_progress = status_counts.get(TaskStatus.IN_PROGRESS, 0)
    pending = status_counts.get(TaskStatus.PENDING, 0)
    completion_rate = round(completed / total * 100, 1) if total else 0.0

    # --- due-date awareness -----------------------------------------------
    today = date.today()
    overdue = db.scalar(
        select(func.count())
        .select_from(Task)
        .where(mine, Task.due_date < today, Task.status != TaskStatus.COMPLETED)
    )
    due_today = db.scalar(
        select(func.count())
        .select_from(Task)
        .where(mine, Task.due_date == today, Task.status != TaskStatus.COMPLETED)
    )

    # --- completions over the last 7 days (for the activity chart) --------
    week_start = today - timedelta(days=6)
    rows = db.execute(
        select(func.date(Task.completed_at).label("day"), func.count())
        .where(mine, Task.completed_at.isnot(None), func.date(Task.completed_at) >= week_start.isoformat())
        .group_by("day")
    ).all()
    day_counts = {d: c for d, c in rows}
    completed_last_7_days = [
        DayCount(date=week_start + timedelta(days=i), count=day_counts.get((week_start + timedelta(days=i)).isoformat(), 0))
        for i in range(7)
    ]

    # --- the 5 most recently touched tasks --------------------------------
    recent_tasks = db.scalars(
        select(Task).where(mine).order_by(Task.updated_at.desc()).limit(5)
    ).all()

    return DashboardSummary(
        total_tasks=total,
        completed=completed,
        in_progress=in_progress,
        pending=pending,
        overdue=overdue or 0,
        due_today=due_today or 0,
        completion_rate=completion_rate,
        by_priority=by_priority,
        completed_last_7_days=completed_last_7_days,
        recent_tasks=[TaskOut.model_validate(t) for t in recent_tasks],
    )
