from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.dependencies import require_any
from app.models.models import Sprint, Employee
from app.schemas.schemas import SprintCreate, SprintUpdate, SprintResponse
from typing import List

router = APIRouter(prefix="/api/sprints", tags=["Sprints"])


@router.get("", response_model=List[SprintResponse])
async def list_sprints(
    project_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    query = select(Sprint)
    if project_id:
        query = query.where(Sprint.project_id == project_id)
    result = await db.execute(query.order_by(Sprint.start_date.desc()))
    return result.scalars().all()


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    data: SprintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    from app.core.dependencies import require_manager
    sprint = Sprint(**data.model_dump(), created_by=current_user.id)
    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return sprint


@router.get("/{sprint_id}", response_model=SprintResponse)
async def get_sprint(
    sprint_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    sprint = await db.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.put("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: int,
    data: SprintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    sprint = await db.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(sprint, key, val)
    await db.commit()
    await db.refresh(sprint)
    return sprint
