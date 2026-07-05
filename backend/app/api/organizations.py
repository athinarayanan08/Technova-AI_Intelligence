"""
Organizations Router
CRUD operations for the Organization model.
All write operations are restricted to ADMIN role.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.dependencies import require_admin, require_any
from app.models.models import Employee, Organization
from app.schemas.schemas import OrganizationCreate, OrganizationUpdate, OrganizationResponse

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])


# ─────────────────────────── GET / ────────────────────────────

@router.get(
    "",
    response_model=List[OrganizationResponse],
    summary="List all organizations (admin only)",
)
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> List[OrganizationResponse]:
    """
    Retrieve all non-deleted organizations.
    Restricted to ADMIN role.
    """
    result = await db.execute(
        select(Organization)
        .where(Organization.is_deleted == False)  # noqa: E712
        .order_by(Organization.created_at.desc())
    )
    organizations = result.scalars().all()
    return [OrganizationResponse.model_validate(org) for org in organizations]


# ─────────────────────────── POST / ────────────────────────────

@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new organization (admin only)",
)
async def create_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> OrganizationResponse:
    """
    Create a new organization.
    Rejects duplicate names with 409 Conflict.
    Restricted to ADMIN role.
    """
    existing = await db.execute(
        select(Organization).where(
            Organization.name == payload.name,
            Organization.is_deleted == False,  # noqa: E712
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An organization named '{payload.name}' already exists.",
        )

    org = Organization(
        **payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(org)
    await db.flush()
    await db.refresh(org)
    return OrganizationResponse.model_validate(org)


# ─────────────────────────── GET /{id} ────────────────────────────

@router.get(
    "/{org_id}",
    response_model=OrganizationResponse,
    summary="Get a single organization by ID",
)
async def get_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> OrganizationResponse:
    """
    Retrieve a single organization by its ID.
    Available to any authenticated user.
    """
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.is_deleted == False,  # noqa: E712
        )
    )
    org: Organization | None = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with id={org_id} not found.",
        )

    return OrganizationResponse.model_validate(org)


# ─────────────────────────── PUT /{id} ────────────────────────────

@router.put(
    "/{org_id}",
    response_model=OrganizationResponse,
    summary="Update an organization (admin only)",
)
async def update_organization(
    org_id: int,
    payload: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> OrganizationResponse:
    """
    Partially update an organization's fields.
    Only provided (non-None) fields are updated.
    Restricted to ADMIN role.
    """
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.is_deleted == False,  # noqa: E712
        )
    )
    org: Organization | None = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with id={org_id} not found.",
        )

    # Check for name collision if name is being changed
    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != org.name:
        name_conflict = await db.execute(
            select(Organization).where(
                Organization.name == update_data["name"],
                Organization.is_deleted == False,  # noqa: E712
            )
        )
        if name_conflict.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An organization named '{update_data['name']}' already exists.",
            )

    for field, value in update_data.items():
        setattr(org, field, value)

    await db.flush()
    await db.refresh(org)
    return OrganizationResponse.model_validate(org)


# ─────────────────────────── DELETE /{id} ────────────────────────────

@router.delete(
    "/{org_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete an organization (admin only)",
)
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> None:
    """
    Soft-delete an organization by setting its `is_deleted` flag to True.
    The record is retained in the database but excluded from future list/get queries.
    Restricted to ADMIN role.
    """
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.is_deleted == False,  # noqa: E712
        )
    )
    org: Organization | None = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with id={org_id} not found.",
        )

    org.is_deleted = True
    await db.flush()
