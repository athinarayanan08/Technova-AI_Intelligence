from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.database import engine, Base
from app.ai.scheduler import start_scheduler, stop_scheduler

# Import all models to ensure they are registered with Base
from app.models import models  # noqa

# Import routers
from app.api.auth import router as auth_router
from app.api.organizations import router as org_router
from app.api.departments import router as dept_router
from app.api.teams import router as team_router
from app.api.employees import router as emp_router
from app.api.projects import router as project_router
from app.api.sprints import router as sprint_router
from app.api.tasks import router as task_router
from app.api.bugs import router as bug_router
from app.api.attendance import router as attendance_router
from app.api.daily_reports import router as report_router
from app.api.notifications import router as notif_router
from app.api.ai_routes import router as ai_router

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    logger.info("[STARTUP] Starting AI Organizational Intelligence Platform...")

    # Create all database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("[DATABASE] Database tables created/verified")

    # Start AI scheduler
    start_scheduler()
    logger.info("[SCHEDULER] AI scheduler started")

    # Seed demo data if needed
    try:
        from app.db.seed import seed_demo_data
        await seed_demo_data()
        logger.info("[SEED] Demo data seeded")
    except Exception as e:
        logger.warning(f"[WARNING] Seed skipped (may already exist): {e}")

    yield

    # Shutdown
    stop_scheduler()
    await engine.dispose()
    logger.info("[SHUTDOWN] Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## AI Organizational Intelligence Platform

    A full-stack enterprise platform where employees perform daily operational work,
    and an **AI Intelligence Engine** continuously analyzes that data to produce:

    - 📊 **Organization Health Score** (0–100)
    - ⚠️ **Risk Predictions** with evidence
    - 🔥 **Burnout Warnings** with data-backed recommendations
    - 💡 **Decision Support** — AI never decides, always shows evidence

    ### AI Pipeline (enforced for every insight):
    `Retrieve Data → Analyze → Find Patterns → Generate Insight → Show Evidence → Recommend → Persist`
    """,
    openapi_url="/api/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# Health check supporting GET and HEAD methods
@app.api_route("/health", methods=["GET", "HEAD"], tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# Register all routers
app.include_router(auth_router)
app.include_router(org_router)
app.include_router(dept_router)
app.include_router(team_router)
app.include_router(emp_router)
app.include_router(project_router)
app.include_router(sprint_router)
app.include_router(task_router)
app.include_router(bug_router)
app.include_router(attendance_router)
app.include_router(report_router)
app.include_router(notif_router)
app.include_router(ai_router)
