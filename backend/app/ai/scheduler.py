"""
Scheduled AI Jobs — runs nightly and can be triggered on-demand
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.models import Project, Employee, Organization, ProjectStatusEnum
from app.ai.intelligence_engine import AIIntelligenceEngine
from app.analytics.health_score import HealthScoreCalculator
from app.models.models import HealthScoreSnapshot
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def run_nightly_analysis():
    """Full nightly AI analysis job — runs at 2am daily"""
    logger.info("[AI_SCHEDULER] Starting nightly AI analysis job...")
    async with AsyncSessionLocal() as db:
        engine = AIIntelligenceEngine(db)
        calculator = HealthScoreCalculator(db)

        # Get all active organizations
        orgs = await db.execute(select(Organization).where(Organization.is_deleted == False))
        for org in orgs.scalars().all():
            try:
                # 1. Compute health score
                scores = await calculator.compute(org.id)
                snapshot = HealthScoreSnapshot(organization_id=org.id, **scores)
                db.add(snapshot)
                logger.info(f"[HEALTH_SCORE] Health score for {org.name}: {scores['overall_score']}")

                # 2. Analyze all active projects
                projects = await db.execute(
                    select(Project).where(
                        Project.department.has(organization_id=org.id),
                        Project.status == ProjectStatusEnum.ACTIVE,
                        Project.is_deleted == False
                    )
                )
                for project in projects.scalars().all():
                    try:
                        await engine.analyze_project_risk(project.id)
                        logger.info(f"[PROJECT_RISK] Project risk analyzed: {project.name}")
                    except Exception as e:
                        logger.error(f"[ERROR] Failed project analysis {project.id}: {e}")

                # 3. Analyze employee burnout
                employees = await db.execute(
                    select(Employee).where(
                        Employee.organization_id == org.id,
                        Employee.is_active == True,
                        Employee.is_deleted == False
                    )
                )
                for employee in employees.scalars().all():
                    try:
                        await engine.analyze_employee_burnout(employee.id)
                    except Exception as e:
                        logger.error(f"[ERROR] Failed burnout analysis {employee.id}: {e}")

                await db.commit()
            except Exception as e:
                logger.error(f"[ERROR] Failed org analysis {org.id}: {e}")
                await db.rollback()

    logger.info("[AI_SCHEDULER] Nightly AI analysis job completed.")


async def run_health_score_refresh(org_id: int):
    """On-demand health score refresh for a specific organization"""
    async with AsyncSessionLocal() as db:
        calculator = HealthScoreCalculator(db)
        scores = await calculator.compute(org_id)
        snapshot = HealthScoreSnapshot(organization_id=org_id, **scores)
        db.add(snapshot)
        await db.commit()
        await db.refresh(snapshot)
        return snapshot


def start_scheduler():
    """Start APScheduler — called at app startup"""
    scheduler.add_job(
        run_nightly_analysis,
        CronTrigger(hour=2, minute=0),  # 2:00 AM daily
        id="nightly_analysis",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info("[SCHEDULER] AI scheduler started — nightly job at 2:00 AM")


def stop_scheduler():
    scheduler.shutdown(wait=False)
