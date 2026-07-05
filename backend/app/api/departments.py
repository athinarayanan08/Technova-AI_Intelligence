"""
Departments Router
CRUD operations for the Department model.
Write operations are restricted to ADMIN role.
Read operations are available to any authenticated user.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.dependencies import require_admin, require_any
from app.models.models import Department, Employee, Organization
from app.schemas.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter(prefix="/api/departments", tags=["Departments"])


# ─────────────────────────── GET / ────────────────────────────

@router.get(
    "",
    response_model=List[DepartmentResponse],
    summary="List all departments",
)
async def list_departments(
    organization_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> List[DepartmentResponse]:
    """
    Retrieve all non-deleted departments.
    Optionally filter by `organization_id` query parameter.
    Available to any authenticated user.
    """
    query = select(Department).where(Department.is_deleted == False)  # noqa: E712

    if organization_id is not None:
        query = query.where(Department.organization_id == organization_id)

    query = query.order_by(Department.name)
    result = await db.execute(query)
    departments = result.scalars().all()
    return [DepartmentResponse.model_validate(dept) for dept in departments]


# ─────────────────────────── POST / ────────────────────────────

@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new department (admin only)",
)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> DepartmentResponse:
    """
    Create a new department within an organization.

    - Validates that the referenced organization exists.
    - Rejects duplicate department names within the same organization (409 Conflict).
    - Restricted to ADMIN role.
    """
    # Validate organization exists
    org_result = await db.execute(
        select(Organization).where(
            Organization.id == payload.organization_id,
            Organization.is_deleted == False,  # noqa: E712
        )
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with id={payload.organization_id} not found.",
        )

    # Check for duplicate name in the same organization
    dup_result = await db.execute(
        select(Department).where(
            Department.name == payload.name,
            Department.organization_id == payload.organization_id,
            Department.is_deleted == False,  # noqa: E712
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A department named '{payload.name}' already exists in this organization.",
        )

    dept = Department(
        **payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return DepartmentResponse.model_validate(dept)


# ─────────────────────────── GET /{id} ────────────────────────────

@router.get(
    "/{dept_id}",
    response_model=DepartmentResponse,
    summary="Get a single department by ID",
)
async def get_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> DepartmentResponse:
    """
    Retrieve a single department by its ID.
    Available to any authenticated user.
    """
    result = await db.execute(
        select(Department).where(
            Department.id == dept_id,
            Department.is_deleted == False,  # noqa: E712
        )
    )
    dept: Department | None = result.scalar_one_or_none()

    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with id={dept_id} not found.",
        )

    return DepartmentResponse.model_validate(dept)


# ─────────────────────────── PUT /{id} ────────────────────────────

@router.put(
    "/{dept_id}",
    response_model=DepartmentResponse,
    summary="Update a department (admin only)",
)
async def update_department(
    dept_id: int,
    payload: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> DepartmentResponse:
    """
    Partially update a department's fields.
    Only provided (non-None) fields are applied.
    If `head_employee_id` is supplied, the referenced employee must exist.
    Restricted to ADMIN role.
    """
    result = await db.execute(
        select(Department).where(
            Department.id == dept_id,
            Department.is_deleted == False,  # noqa: E712
        )
    )
    dept: Department | None = result.scalar_one_or_none()

    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with id={dept_id} not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Validate head employee if being set
    if "head_employee_id" in update_data and update_data["head_employee_id"] is not None:
        emp_result = await db.execute(
            select(Employee).where(
                Employee.id == update_data["head_employee_id"],
                Employee.is_active == True,  # noqa: E712
            )
        )
        if not emp_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id={update_data['head_employee_id']} not found or inactive.",
            )

    for field, value in update_data.items():
        setattr(dept, field, value)

    await db.flush()
    await db.refresh(dept)
    return DepartmentResponse.model_validate(dept)


# ─────────────────────────── DELETE /{id} ────────────────────────────

@router.delete(
    "/{dept_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete a department (admin only)",
)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> None:
    """
    Soft-delete a department by setting its `is_deleted` flag to True.
    Restricted to ADMIN role.
    """
    result = await db.execute(
        select(Department).where(
            Department.id == dept_id,
            Department.is_deleted == False,  # noqa: E712
        )
    )
    dept: Department | None = result.scalar_one_or_none()

    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with id={dept_id} not found.",
        )

    dept.is_deleted = True
    await db.flush()
