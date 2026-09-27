"""
Task CRUD endpoints.

Business rules enforced here:
  * Ownership — users can only ever see/mutate their own tasks (404 otherwise,
    so we don't leak the existence of other users' tasks).
  * Status transitions — moving a task INTO `completed` stamps `completed_at`;
    moving it back out clears the stamp. This powers the weekly activity chart.
  * Sorting/filtering — status, priority, full-text search and 4 sort orders.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, case, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Task, TaskPriority, User
from ..schemas import TaskCreate, TaskOut, TaskPriority as TaskPriorityEnum
from ..schemas import TaskStatus as TaskStatusEnum
from ..schemas import TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

PRIORITY_RANK = case(
    (Task.priority == TaskPriority.URGENT, 0),
    (Task.priority == TaskPriority.HIGH, 1),
    (Task.priority == TaskPriority.MEDIUM, 2),
    else_=3,
)


def _get_owned_task(task_id: int, db: Session, user: User) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def _apply_status_transition(task: Task, new_status: str) -> None:
    """Stamp/clear completed_at when the status actually changes."""
    if new_status == task.status:
        return
    if new_status == TaskStatusEnum.completed.value:
        task.completed_at = datetime.now(timezone.utc)
    else:
        task.completed_at = None


@router.get("", response_model=list[TaskOut])
def list_tasks(
    status_filter: Optional[TaskStatusEnum] = Query(default=None, alias="status"),
    priority: Optional[TaskPriorityEnum] = None,
    q: Optional[str] = Query(default=None, max_length=100),
    sort: str = Query(default="created_desc", pattern="^(created_desc|created_asc|priority|due_date|title)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt: Select = select(Task).where(Task.user_id == user.id)

    if status_filter is not None:
        stmt = stmt.where(Task.status == status_filter.value)
    if priority is not None:
        stmt = stmt.where(Task.priority == priority.value)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Task.title.ilike(like), Task.description.ilike(like)))

    if sort == "created_asc":
        stmt = stmt.order_by(Task.created_at.asc())
    elif sort == "priority":
        stmt = stmt.order_by(PRIORITY_RANK, Task.created_at.desc())
    elif sort == "due_date":
        # Tasks without a due date sink to the bottom.
        stmt = stmt.order_by(Task.due_date.is_(None), Task.due_date.asc())
    elif sort == "title":
        stmt = stmt.order_by(Task.title.asc())
    else:
        stmt = stmt.order_by(Task.created_at.desc())

    return db.scalars(stmt).all()


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = Task(
        user_id=user.id,
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        status=payload.status.value,
        priority=payload.priority.value,
        due_date=payload.due_date,
    )
    # A task created directly as completed counts as completed "now".
    if task.status == TaskStatusEnum.completed.value:
        task.completed_at = datetime.now(timezone.utc)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_task(task_id, db, user)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_owned_task(task_id, db, user)
    data = payload.model_dump(exclude_unset=True)

    if "status" in data and data["status"] is not None:
        _apply_status_transition(task, data["status"])

    if "title" in data and data["title"] is not None:
        data["title"] = data["title"].strip()
        if not data["title"]:
            raise HTTPException(status_code=422, detail="Title cannot be empty")
    if "description" in data:
        data["description"] = (data["description"] or "").strip() or None

    for field, value in data.items():
        setattr(task, field, value.value if hasattr(value, "value") else value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_owned_task(task_id, db, user)
    db.delete(task)
    db.commit()
