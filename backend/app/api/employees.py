"""
Employees Router
CRUD operations for the Employee model plus convenience sub-resource endpoints
for tasks and attendance records.

Access control:
  - List all:              TEAM_LEAD, MANAGER, ADMIN
  - Create:                ADMIN
  - Get one:               any authenticated user
  - Update:                ADMIN (any employee); authenticated employee (self only)
  - Soft delete:           ADMIN
  - Sub-resources:         any authenticated user
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.dependencies import require_admin, require_team_lead, require_any, get_current_user
from app.models.models import Attendance, Employee, RoleEnum, Task
from app.schemas.schemas import (
    AttendanceResponse,
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    TaskResponse,
)
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/employees", tags=["Employees"])


# ─────────────────────────── GET / ────────────────────────────

@router.get(
    "",
    response_model=List[EmployeeResponse],
    summary="List all employees (team lead and above)",
)
async def list_employees(
    is_active: bool | None = None,
    department_id: int | None = None,
    team_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_team_lead),
) -> List[EmployeeResponse]:
    """
    Retrieve all non-deleted employees.

    Optional query filters:
    - `is_active`: filter by active/inactive status
    - `department_id`: filter by department
    - `team_id`: filter by team

    Available to TEAM_LEAD, MANAGER, and ADMIN roles.
    """
    query = select(Employee).where(Employee.is_deleted == False)  # noqa: E712

    if is_active is not None:
        query = query.where(Employee.is_active == is_active)
    if department_id is not None:
        query = query.where(Employee.department_id == department_id)
    if team_id is not None:
        query = query.where(Employee.team_id == team_id)

    query = query.order_by(Employee.name)
    result = await db.execute(query)
    employees = result.scalars().all()
    return [EmployeeResponse.model_validate(emp) for emp in employees]


# ─────────────────────────── POST / ────────────────────────────

@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee account (admin only)",
)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> EmployeeResponse:
    """
    Create a new employee account.

    - Rejects duplicate email addresses with 409 Conflict.
    - Hashes the plaintext password before persisting.
    - Sets `created_by` to the calling admin's id.
    - Restricted to ADMIN role.
    """
    # Duplicate email check
    dup_result = await db.execute(
        select(Employee).where(Employee.email == payload.email)
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An employee with email '{payload.email}' already exists.",
        )

    create_data = payload.model_dump(exclude={"password"})
    employee = Employee(
        **create_data,
        password_hash=get_password_hash(payload.password),
        created_by=current_user.id,
    )
    db.add(employee)
    await db.flush()
    await db.refresh(employee)
    return EmployeeResponse.model_validate(employee)


# ─────────────────────────── GET /{id} ────────────────────────────

@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get a single employee by ID",
)
async def get_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> EmployeeResponse:
    """
    Retrieve a single employee by their ID.
    Available to any authenticated user.
    """
    result = await db.execute(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    employee: Employee | None = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id={employee_id} not found.",
        )

    return EmployeeResponse.model_validate(employee)


# ─────────────────────────── PUT /{id} ────────────────────────────

@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update an employee",
)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> EmployeeResponse:
    """
    Partially update an employee's profile.

    Access rules:
    - **ADMIN** may update any employee, including sensitive fields such as
      `role`, `salary`, and `is_active`.
    - **Non-admins** may only update their own profile and are restricted to
      non-sensitive fields (`name`, `phone`, `avatar_url`, `position`).

    Only provided (non-None) fields are applied.
    """
    result = await db.execute(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    employee: Employee | None = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id={employee_id} not found.",
        )

    is_admin = current_user.role == RoleEnum.ADMIN
    is_self = current_user.id == employee_id

    # Non-admins can only edit their own profile
    if not is_admin and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Non-admins cannot touch privileged fields
    if not is_admin:
        privileged_fields = {"role", "salary", "is_active", "team_id", "department_id", "manager_id"}
        disallowed = privileged_fields.intersection(update_data.keys())
        if disallowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You are not authorized to update field(s): {sorted(disallowed)}.",
            )

    for field, value in update_data.items():
        setattr(employee, field, value)

    await db.flush()
    await db.refresh(employee)
    return EmployeeResponse.model_validate(employee)


# ─────────────────────────── DELETE /{id} ────────────────────────────

@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate and soft delete an employee (admin only)",
)
async def delete_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> None:
    """
    Soft-delete an employee by setting `is_deleted=True` and `is_active=False`.

    Prevents an admin from deleting their own account.
    Restricted to ADMIN role.
    """
    if current_user.id == employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    result = await db.execute(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    employee: Employee | None = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id={employee_id} not found.",
        )

    employee.is_deleted = True
    employee.is_active = False
    await db.flush()


# ─────────────────────────── GET /{id}/tasks ────────────────────────────

@router.get(
    "/{employee_id}/tasks",
    response_model=List[TaskResponse],
    summary="Get all tasks assigned to an employee",
)
async def get_employee_tasks(
    employee_id: int,
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> List[TaskResponse]:
    """
    Retrieve all tasks assigned to a specific employee.

    Optional query parameter:
    - `status_filter`: filter by task status (e.g. TODO, IN_PROGRESS, DONE)

    The employee must exist and not be soft-deleted.
    Available to any authenticated user.
    """
    # Validate employee exists
    emp_result = await db.execute(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    if not emp_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id={employee_id} not found.",
        )

    query = (
        select(Task)
        .where(
            Task.assignee_id == employee_id,
            Task.is_deleted == False,  # noqa: E712
        )
        .order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
    )

    if status_filter is not None:
        query = query.where(Task.status == status_filter)

    result = await db.execute(query)
    tasks = result.scalars().all()
    return [TaskResponse.model_validate(task) for task in tasks]


# ─────────────────────────── GET /{id}/attendance ────────────────────────────

@router.get(
    "/{employee_id}/attendance",
    response_model=List[AttendanceResponse],
    summary="Get attendance records for an employee",
)
async def get_employee_attendance(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> List[AttendanceResponse]:
    """
    Retrieve all attendance records for a specific employee, ordered most-recent first.

    The employee must exist and not be soft-deleted.
    Available to any authenticated user.
    """
    # Validate employee exists
    emp_result = await db.execute(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    if not emp_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id={employee_id} not found.",
        )

    result = await db.execute(
        select(Attendance)
        .where(Attendance.employee_id == employee_id)
        .order_by(Attendance.date.desc())
    )
    records = result.scalars().all()
    return [AttendanceResponse.model_validate(record) for record in records]
