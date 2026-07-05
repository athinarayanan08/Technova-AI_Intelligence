from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.database import get_db
from app.core.dependencies import require_any, require_team_lead
from app.models.models import Task, Employee, TaskStatusEnum
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse
from typing import List

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    project_id: int = None,
    sprint_id: int = None,
    assignee_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    query = select(Task).where(Task.is_deleted == False)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if sprint_id:
        query = query.where(Task.sprint_id == sprint_id)
    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)

    # Employees only see their own tasks
    from app.models.models import RoleEnum
    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.where(Task.assignee_id == current_user.id)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_team_lead),
):
    task = Task(**data.model_dump(), created_by=current_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/my", response_model=List[TaskResponse])
async def get_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    result = await db.execute(
        select(Task).where(
            Task.assignee_id == current_user.id,
            Task.is_deleted == False
        )
    )
    return result.scalars().all()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    task = await db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    task = await db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = data.model_dump(exclude_unset=True)

    # Set completed_at when task is marked done
    if "status" in updates and updates["status"] == TaskStatusEnum.DONE:
        updates["completed_at"] = datetime.now(timezone.utc)
        updates["progress_pct"] = 100.0

    for key, val in updates.items():
        setattr(task, key, val)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_team_lead),
):
    task = await db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    task.is_deleted = True
    await db.commit()
