from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.database import get_db
from app.core.dependencies import require_any, require_team_lead
from app.models.models import Attendance, Employee, RoleEnum
from app.schemas.schemas import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.get("", response_model=List[AttendanceResponse])
async def list_attendance(
    employee_id: int = None,
    date_from: date = None,
    date_to: date = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    query = select(Attendance)

    # Employees only see their own records
    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.where(Attendance.employee_id == current_user.id)
    elif employee_id:
        query = query.where(Attendance.employee_id == employee_id)

    if date_from:
        query = query.where(Attendance.date >= date_from)
    if date_to:
        query = query.where(Attendance.date <= date_to)

    result = await db.execute(query.order_by(Attendance.date.desc()))
    return result.scalars().all()


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def mark_attendance(
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    # Check duplicate for same date
    existing = await db.execute(
        select(Attendance).where(
            Attendance.employee_id == current_user.id,
            Attendance.date == data.date
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Attendance already marked for this date")

    # Compute working hours
    working_hours = None
    overtime_hours = 0.0
    if data.check_in and data.check_out:
        delta = data.check_out - data.check_in
        working_hours = round(delta.total_seconds() / 3600, 2)
        overtime_hours = max(0.0, working_hours - 8.0)

    attendance = Attendance(
        employee_id=current_user.id,
        working_hours=working_hours,
        overtime_hours=overtime_hours,
        **data.model_dump()
    )
    db.add(attendance)
    await db.commit()
    await db.refresh(attendance)
    return attendance


@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    record = await db.get(Attendance, attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    if current_user.role == RoleEnum.EMPLOYEE and record.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify another employee's attendance")

    updates = data.model_dump(exclude_unset=True)
    for key, val in updates.items():
        setattr(record, key, val)

    if record.check_in and record.check_out:
        delta = record.check_out - record.check_in
        record.working_hours = round(delta.total_seconds() / 3600, 2)
        record.overtime_hours = max(0.0, record.working_hours - 8.0)

    await db.commit()
    await db.refresh(record)
    return record


@router.get("/my/today", response_model=AttendanceResponse | None)
async def get_today_attendance(
    date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    if not date:
        date = date.today()
    result = await db.execute(
        select(Attendance).where(
            Attendance.employee_id == current_user.id,
            Attendance.date == date
        )
    )
    return result.scalar_one_or_none()
