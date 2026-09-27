"""
Demo data seeder — runs once at startup if the database is empty.

Creates a demo account (demo@taskflow.app / demo1234) with a realistic set
of tasks so the dashboard, board and charts are alive on first launch.
"""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Task, TaskPriority, TaskStatus, User
from .security import hash_password

DEMO_EMAIL = "demo@taskflow.app"
DEMO_PASSWORD = "demo1234"


def _dt(days_ago: int, hour: int = 12) -> datetime:
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.replace(hour=hour, minute=0, second=0, microsecond=0)


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(User)) > 0:
        return

    demo = User(
        email=DEMO_EMAIL,
        full_name="Ava Thompson",
        password_hash=hash_password(DEMO_PASSWORD),
    )
    db.add(demo)
    db.flush()  # get demo.id

    today = date.today()

    def task(title, status, priority, due_offset=None, description=None, created=0, completed_days_ago=None):
        return Task(
            user_id=demo.id,
            title=title,
            description=description,
            status=status,
            priority=priority,
            due_date=today + timedelta(days=due_offset) if due_offset is not None else None,
            completed_at=_dt(completed_days_ago) if completed_days_ago is not None else None,
            created_at=_dt(created),
            updated_at=_dt(0 if completed_days_ago is None else completed_days_ago),
        )

    P, I, C = TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED
    LO, ME, HI, UR = TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT

    db.add_all([
        # completed (spread over the last week to populate the activity chart)
        task("Finalize Q3 landing page copy", C, HI, due_offset=-6, completed_days_ago=6, created=12,
             description="Tighten the hero section and rewrite the feature blurbs with the new positioning."),
        task("Update privacy policy page", C, LO, due_offset=-8, completed_days_ago=6, created=14),
        task("Ship dark-mode toggle (v1.2)", C, ME, due_offset=-5, completed_days_ago=3, created=10,
             description="Toggle + system-preference detection. Shipped behind the appearance settings menu."),
        task("Set up CI pipeline for the web app", C, UR, due_offset=-4, completed_days_ago=2, created=9,
             description="Lint, typecheck and tests on every PR; deploy preview branches automatically."),
        task("Review onboarding funnel analytics", C, ME, due_offset=-2, completed_days_ago=1, created=6,
             description="Signup → first task created drops to 41%. The empty state needs a stronger CTA."),
        task("Draft investor update email", C, HI, due_offset=0, completed_days_ago=0, created=3),

        # in progress
        task("Migrate billing to Stripe v2 API", I, UR, due_offset=2, created=7,
             description="Webhooks are done; subscription proration logic still needs tests."),
        task("Fix flaky auth tests on CI", I, HI, due_offset=1, created=4,
             description="Token clock-skew assertion fails ~1 in 8 runs. Freeze time in the test harness."),
        task("Design empty states for the dashboard", I, ME, due_offset=4, created=2,
             description="Three variants: no tasks yet, all done, filtered-to-nothing."),

        # pending
        task("Write API docs for the public beta", P, HI, due_offset=-1, created=8,
             description="Auth guide, task endpoints, rate limits, curl examples."),
        task("Record product demo for the website", P, ME, due_offset=-3, created=6,
             description="90-second script: create task → drag to done → dashboard. Screen-record at 2x and slow it."),
        task("Reply to Acme Corp partnership thread", P, UR, due_offset=0, created=2,
             description="They asked about SSO and the team plan. Loop in sales before replying."),
        task("Plan sprint 24 retro agenda", P, LO, due_offset=6, created=2),
        task("Audit npm dependencies for CVEs", P, ME, due_offset=9, created=1,
             description="Run npm audit, bump majors where safe, file tickets for the rest."),
    ])
    db.commit()
    print(f"[seed] Created demo user {DEMO_EMAIL} (password: {DEMO_PASSWORD}) with 14 tasks")
