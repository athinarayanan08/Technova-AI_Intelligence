from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.database import get_db
from app.core.dependencies import require_any
from app.models.models import DailyReport, Employee, Project
from app.schemas.schemas import DailyReportCreate, DailyReportResponse
from typing import List
from datetime import date

router = APIRouter(prefix="/api/daily-reports", tags=["Daily Reports"])


@router.get("", response_model=List[DailyReportResponse])
async def list_reports(
    employee_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    from app.models.models import RoleEnum
    query = select(DailyReport)
    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.where(DailyReport.employee_id == current_user.id)
    elif employee_id:
        query = query.where(DailyReport.employee_id == employee_id)
    result = await db.execute(query.order_by(DailyReport.date.desc()))
    return result.scalars().all()


@router.post("", response_model=DailyReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_report(
    data: DailyReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    # One report per employee per day
    existing = await db.execute(
        select(DailyReport).where(
            DailyReport.employee_id == current_user.id,
            DailyReport.date == data.date
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Daily report already submitted for this date")

    report = DailyReport(**data.model_dump(), employee_id=current_user.id)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/my", response_model=List[DailyReportResponse])
async def my_reports(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    result = await db.execute(
        select(DailyReport)
        .where(DailyReport.employee_id == current_user.id)
        .order_by(DailyReport.date.desc())
    )
    return result.scalars().all()


from pydantic import BaseModel
from app.models.models import Notification, NotificationTypeEnum, Team

class SendReportRequest(BaseModel):
    message: str

@router.post("/send-report")
async def send_daily_report_to_leads(
    req: SendReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    # Find recipients
    recipients = set()
    
    # 1. Direct Manager
    if current_user.manager_id:
        recipients.add(current_user.manager_id)
        
    # 2. Team Lead
    if current_user.team_id:
        team = await db.get(Team, current_user.team_id)
        if team and team.team_lead_id and team.team_lead_id != current_user.id:
            recipients.add(team.team_lead_id)
            
    # 3. Fallback: Managers in the organization
    if not recipients:
        from app.models.models import RoleEnum
        managers_res = await db.execute(
            select(Employee.id).where(
                Employee.organization_id == current_user.organization_id,
                Employee.role.in_([RoleEnum.MANAGER, RoleEnum.ADMIN]),
                Employee.id != current_user.id
            )
        )
        for row in managers_res.fetchall():
            recipients.add(row[0])
            
    # Get today's daily report if it exists
    report_res = await db.execute(
        select(DailyReport).where(
            DailyReport.employee_id == current_user.id,
            DailyReport.date == date.today()
        )
    )
    report = report_res.scalar_one_or_none()
    
    project_info = ""
    if report and report.project_id:
        project_res = await db.execute(select(Project).where(Project.id == report.project_id))
        proj = project_res.scalar_one_or_none()
        if proj:
            project_info = f" for project '{proj.name}'"

    # Create notifications
    notifications_created = 0
    for r_id in recipients:
        notif = Notification(
            recipient_id=r_id,
            type=NotificationTypeEnum.GENERAL,
            title=f"Daily Report Submission: {current_user.name}",
            message=f"{current_user.name} has submitted their daily report{project_info}. Additional message: {req.message}",
            entity_type="daily_report",
            entity_id=report.id if report else None,
            is_read=False
        )
        db.add(notif)
        notifications_created += 1
        
    if notifications_created > 0:
        await db.commit()
        
    return {"message": "Report sent successfully", "recipients_notified": len(recipients)}
