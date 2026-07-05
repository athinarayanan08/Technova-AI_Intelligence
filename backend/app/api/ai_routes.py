from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.dependencies import require_any, require_manager, require_admin
from app.models.models import AiInsight, HealthScoreSnapshot, Organization, Employee
from app.schemas.schemas import AiInsightResponse, HealthScoreResponse, AiAssistantRequest, AiAssistantResponse
from app.ai.intelligence_engine import AIIntelligenceEngine
from app.ai.scheduler import run_health_score_refresh
from typing import List, Optional

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence"])


# ─────────────── Health Score ───────────────

@router.get("/health-score/latest", response_model=HealthScoreResponse)
async def get_latest_health_score(
    org_id: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    result = await db.execute(
        select(HealthScoreSnapshot)
        .where(HealthScoreSnapshot.organization_id == org_id)
        .order_by(HealthScoreSnapshot.computed_at.desc())
        .limit(1)
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No health score computed yet. Trigger a refresh first.")
    return snapshot


@router.get("/health-score/history", response_model=List[HealthScoreResponse])
async def get_health_score_history(
    org_id: int = 1,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(HealthScoreSnapshot)
        .where(
            HealthScoreSnapshot.organization_id == org_id,
            HealthScoreSnapshot.computed_at >= since,
        )
        .order_by(HealthScoreSnapshot.computed_at.asc())
    )
    return result.scalars().all()


@router.post("/health-score/refresh")
async def refresh_health_score(
    org_id: int = 1,
    current_user: Employee = Depends(require_any),
):
    """On-demand health score refresh"""
    snapshot = await run_health_score_refresh(org_id)
    return {
        "message": "Health score refreshed",
        "overall_score": snapshot.overall_score,
        "computed_at": snapshot.computed_at,
    }


# ─────────────── Insights ───────────────

@router.get("/insights", response_model=List[AiInsightResponse])
async def list_insights(
    insight_type: Optional[str] = None,
    subject_entity: Optional[str] = None,
    current_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    query = select(AiInsight)
    if current_only:
        query = query.where(AiInsight.is_current == True)
    if insight_type:
        query = query.where(AiInsight.type == insight_type)
    if subject_entity:
        query = query.where(AiInsight.subject_entity == subject_entity)
    query = query.order_by(AiInsight.generated_at.desc()).limit(50)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/insights/analyze-project/{project_id}", response_model=AiInsightResponse)
async def analyze_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    engine = AIIntelligenceEngine(db)
    return await engine.analyze_project_risk(project_id)


@router.post("/insights/analyze-employee/{employee_id}", response_model=AiInsightResponse)
async def analyze_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    engine = AIIntelligenceEngine(db)
    return await engine.analyze_employee_burnout(employee_id)


@router.post("/analyze-bug/{bug_id}")
async def analyze_bug_by_id(
    bug_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    from app.models.models import Bug
    bug = await db.get(Bug, bug_id)
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found.")
        
    bug_data = {
        "title": bug.title,
        "project_id": bug.project_id,
        "severity": bug.severity.value if hasattr(bug.severity, 'value') else str(bug.severity),
        "steps_to_reproduce": bug.steps_to_reproduce or "None provided.",
        "description": bug.description or "No description."
    }
    
    engine = AIIntelligenceEngine(db)
    return await engine.generate_bug_analysis(bug_data)


# ─────────────── AI Assistant (RAG) ───────────────

@router.post("/assistant", response_model=AiAssistantResponse)
async def ask_ai_assistant(
    request: AiAssistantRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    """
    RAG-grounded AI assistant.
    Always retrieves real data first. Never answers from memory alone.
    Every response includes evidence[] showing exactly which data was used.
    """
    engine = AIIntelligenceEngine(db)
    result = await engine.answer_question(
        question=request.question,
        context_entity=request.context_entity,
        context_id=request.context_id,
        current_user=current_user,
    )

    # Persist to audit trail
    from app.models.models import AiInsight, InsightTypeEnum
    insight = AiInsight(
        type=InsightTypeEnum.ORG_HEALTH,
        subject_entity=request.context_entity or "organization",
        subject_id=request.context_id,
        verdict=result.get("risk_level"),
        evidence_json={"question": request.question, "evidence": result.get("evidence", [])},
        recommendation="\n".join(result.get("recommendations", [])),
        raw_analysis=result.get("answer"),
        is_current=False,
    )
    db.add(insight)
    await db.commit()
    await db.refresh(insight)

    return AiAssistantResponse(
        answer=result["answer"],
        risk_level=result.get("risk_level"),
        evidence=result.get("evidence", []),
        recommendations=result.get("recommendations", []),
        data_sources=result.get("data_sources", []),
        insight_id=insight.id,
    )


# ─────────────── Dashboard Analytics ───────────────

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    org_id: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    """Returns all data needed for the executive dashboard in one call"""
    from sqlalchemy import func
    from app.models.models import Project, Employee, Task, Bug, TaskStatusEnum, BugStatusEnum, ProjectStatusEnum

    # Latest health score
    health_result = await db.execute(
        select(HealthScoreSnapshot)
        .where(HealthScoreSnapshot.organization_id == org_id)
        .order_by(HealthScoreSnapshot.computed_at.desc())
        .limit(1)
    )
    health = health_result.scalar_one_or_none()

    # Project stats
    projects_result = await db.execute(
        select(Project).where(Project.is_deleted == False)
    )
    projects = projects_result.scalars().all()

    project_stats = {
        "total": len(projects),
        "active": sum(1 for p in projects if p.status == ProjectStatusEnum.ACTIVE),
        "completed": sum(1 for p in projects if p.status == ProjectStatusEnum.COMPLETED),
        "avg_completion": round(sum(p.completion_pct for p in projects) / max(len(projects), 1), 1),
    }

    # Employee count
    emp_count = await db.scalar(
        select(func.count(Employee.id)).where(
            Employee.organization_id == org_id,
            Employee.is_active == True,
            Employee.is_deleted == False
        )
    )

    # Bug stats
    open_bugs = await db.scalar(
        select(func.count(Bug.id)).where(
            Bug.status.in_([BugStatusEnum.OPEN, BugStatusEnum.IN_PROGRESS]),
            Bug.is_deleted == False
        )
    )

    # Latest insights (top 10)
    insights_result = await db.execute(
        select(AiInsight)
        .where(AiInsight.is_current == True)
        .order_by(AiInsight.generated_at.desc())
        .limit(10)
    )
    insights = insights_result.scalars().all()

    return {
        "health_score": {
            "overall": health.overall_score if health else 0,
            "project": health.project_score if health else 0,
            "employee": health.employee_score if health else 0,
            "knowledge": health.knowledge_score if health else 0,
            "risk": health.risk_score if health else 0,
            "computed_at": health.computed_at if health else None,
        },
        "projects": project_stats,
        "employees": {"total": emp_count},
        "bugs": {"open": open_bugs},
        "recent_insights": [
            {
                "id": i.id,
                "type": i.type.value,
                "subject": i.subject_name,
                "verdict": i.verdict,
                "score": i.score,
                "generated_at": i.generated_at,
            }
            for i in insights
        ],
    }


from pydantic import BaseModel

class AgenticAnalysisRequest(BaseModel):
    date: str
    team_id: Optional[int] = None

@router.post("/agentic-team-analysis")
async def run_agentic_team_analysis(
    req: AgenticAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    from app.models.models import RoleEnum
    if current_user.role not in [RoleEnum.MANAGER, RoleEnum.TEAM_LEAD, RoleEnum.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied. Managers and Team Leads only.")

    from datetime import datetime
    try:
        target_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    from app.models.models import DailyReport
    query = select(DailyReport).where(DailyReport.date == target_date)
    
    if current_user.role == RoleEnum.TEAM_LEAD and current_user.team_id:
        query = query.join(Employee).where(Employee.team_id == current_user.team_id)
    elif req.team_id:
        query = query.join(Employee).where(Employee.team_id == req.team_id)
        
    reports_res = await db.execute(query.order_by(DailyReport.created_at.desc()))
    reports = reports_res.scalars().all()
    
    if not reports:
        return {
            "success": False,
            "message": f"No daily reports submitted on {req.date} to analyze.",
            "analysis": None
        }

    reports_data = []
    for r in reports:
        employee_res = await db.execute(select(Employee).where(Employee.id == r.employee_id))
        emp = employee_res.scalar_one_or_none()
        emp_name = emp.name if emp else f"Employee #{r.employee_id}"
        reports_data.append({
            "employee": emp_name,
            "tasks": r.content,
            "blockers": r.blockers or "None",
            "tomorrow_plan": r.tomorrow_plan or "None",
            "mood_score": r.mood_score or 3,
            "hours_worked": r.hours_worked or 8
        })

    engine = AIIntelligenceEngine(db)
    analysis_result = await engine.generate_agentic_team_analysis(reports_data, req.date)

    from app.models.models import AiInsight, InsightTypeEnum
    insight = AiInsight(
        type=InsightTypeEnum.TEAM_VELOCITY,
        subject_entity="team",
        subject_id=current_user.team_id or 1,
        subject_name=f"Agentic Team Analysis for {req.date}",
        score=sum(r["mood_score"] for r in reports_data) / len(reports_data) if reports_data else 3.0,
        verdict="COMPLETED",
        evidence_json={"reports_count": len(reports), "date": req.date},
        recommendation=analysis_result.get("recommendations", ""),
        raw_analysis=analysis_result.get("summary", ""),
        is_current=True,
    )
    db.add(insight)
    await db.commit()
    await db.refresh(insight)

    return {
        "success": True,
        "message": f"Successfully completed agentic analysis of {len(reports)} team reports.",
        "date": req.date,
        "summary": analysis_result.get("summary"),
        "recommendations": analysis_result.get("recommendations"),
        "insights_saved_id": insight.id
    }
