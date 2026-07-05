from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.dependencies import require_any, require_team_lead
from app.models.models import Bug, Employee
from app.schemas.schemas import BugCreate, BugUpdate, BugResponse
from typing import List

router = APIRouter(prefix="/api/bugs", tags=["Bugs"])


@router.get("", response_model=List[BugResponse])
async def list_bugs(
    project_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    query = select(Bug).where(Bug.is_deleted == False)
    if project_id:
        query = query.where(Bug.project_id == project_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=BugResponse, status_code=status.HTTP_201_CREATED)
async def report_bug(
    data: BugCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    bug = Bug(**data.model_dump(), reporter_id=current_user.id, created_by=current_user.id)
    db.add(bug)
    await db.commit()
    await db.refresh(bug)
    return bug


@router.get("/{bug_id}", response_model=BugResponse)
async def get_bug(
    bug_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    bug = await db.get(Bug, bug_id)
    if not bug or bug.is_deleted:
        raise HTTPException(status_code=404, detail="Bug not found")
    return bug


@router.put("/{bug_id}", response_model=BugResponse)
async def update_bug(
    bug_id: int,
    data: BugUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    from datetime import datetime, timezone
    bug = await db.get(Bug, bug_id)
    if not bug or bug.is_deleted:
        raise HTTPException(status_code=404, detail="Bug not found")
    updates = data.model_dump(exclude_unset=True)
    from app.models.models import BugStatusEnum
    if "status" in updates and updates["status"] in [BugStatusEnum.RESOLVED, BugStatusEnum.CLOSED]:
        updates["resolved_at"] = datetime.now(timezone.utc)
    for key, val in updates.items():
        setattr(bug, key, val)
    await db.commit()
    await db.refresh(bug)
    return bug
