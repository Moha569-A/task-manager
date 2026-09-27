"""
TaskFlow API — application entry point.

Wires together the database, routers (auth / tasks / dashboard), demo-data
seeding and static serving of the frontend SPA from /frontend.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, SessionLocal, engine
from .routers import auth, dashboard, tasks
from .seed import seed_if_empty

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables & seed demo data on startup.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    print("[taskflow] API ready — docs at /docs")
    yield


app = FastAPI(
    title="TaskFlow API",
    description="A SaaS-style task management backend: JWT auth, task CRUD, dashboard analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

# Permissive CORS so the API can also be consumed by a separately hosted frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes (registered BEFORE the static catch-all mount).
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "service": "taskflow-api", "version": app.version}


# Serve the SPA. Hash-based routing means plain static serving is enough.
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
