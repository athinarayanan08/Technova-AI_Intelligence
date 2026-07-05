"""
Teams Router
CRUD operations for the Team model.
Write operations are restricted to ADMIN role.
Read operations are available to any authenticated user.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.dependencies import require_admin, require_any
from app.models.models import Department, Employee, Team
from app.schemas.schemas import TeamCreate, TeamUpdate, TeamResponse

router = APIRouter(prefix="/api/teams", tags=["Teams"])


# ─────────────────────────── GET / ────────────────────────────

@router.get(
    "",
    response_model=List[TeamResponse],
    summary="List all teams",
)
async def list_teams(
    department_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> List[TeamResponse]:
    """
    Retrieve all non-deleted teams.
    Optionally filter by `department_id` query parameter.
    Available to any authenticated user.
    """
    query = select(Team).where(Team.is_deleted == False)  # noqa: E712

    if department_id is not None:
        query = query.where(Team.department_id == department_id)

    query = query.order_by(Team.name)
    result = await db.execute(query)
    teams = result.scalars().all()
    return [TeamResponse.model_validate(team) for team in teams]


# ─────────────────────────── POST / ────────────────────────────

@router.post(
    "",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team (admin only)",
)
async def create_team(
    payload: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> TeamResponse:
    """
    Create a new team within a department.

    - Validates that the referenced department exists.
    - Validates that `team_lead_id` (if provided) is an active employee.
    - Rejects duplicate team names within the same department (409 Conflict).
    - Restricted to ADMIN role.
    """
    # Validate department exists
    dept_result = await db.execute(
        select(Department).where(
            Department.id == payload.department_id,
            Department.is_deleted == False,  # noqa: E712
        )
    )
    if not dept_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with id={payload.department_id} not found.",
        )

    # Validate team lead if provided
    if payload.team_lead_id is not None:
        lead_result = await db.execute(
            select(Employee).where(
                Employee.id == payload.team_lead_id,
                Employee.is_active == True,  # noqa: E712
            )
        )
        if not lead_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id={payload.team_lead_id} not found or inactive.",
            )

    # Check for duplicate name in the same department
    dup_result = await db.execute(
        select(Team).where(
            Team.name == payload.name,
            Team.department_id == payload.department_id,
            Team.is_deleted == False,  # noqa: E712
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A team named '{payload.name}' already exists in this department.",
        )

    team = Team(
        **payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(team)
    await db.flush()
    await db.refresh(team)
    return TeamResponse.model_validate(team)


# ─────────────────────────── GET /{id} ────────────────────────────

@router.get(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Get a single team by ID",
)
async def get_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
) -> TeamResponse:
    """
    Retrieve a single team by its ID.
    Available to any authenticated user.
    """
    result = await db.execute(
        select(Team).where(
            Team.id == team_id,
            Team.is_deleted == False,  # noqa: E712
        )
    )
    team: Team | None = result.scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id={team_id} not found.",
        )

    return TeamResponse.model_validate(team)


# ─────────────────────────── PUT /{id} ────────────────────────────

@router.put(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Update a team (admin only)",
)
async def update_team(
    team_id: int,
    payload: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> TeamResponse:
    """
    Partially update a team's fields.
    Only provided (non-None) fields are applied.
    If `team_lead_id` is supplied, the referenced employee must be active.
    Restricted to ADMIN role.
    """
    result = await db.execute(
        select(Team).where(
            Team.id == team_id,
            Team.is_deleted == False,  # noqa: E712
        )
    )
    team: Team | None = result.scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id={team_id} not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Validate new team lead if being set
    if "team_lead_id" in update_data and update_data["team_lead_id"] is not None:
        lead_result = await db.execute(
            select(Employee).where(
                Employee.id == update_data["team_lead_id"],
                Employee.is_active == True,  # noqa: E712
            )
        )
        if not lead_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id={update_data['team_lead_id']} not found or inactive.",
            )

    for field, value in update_data.items():
        setattr(team, field, value)

    await db.flush()
    await db.refresh(team)
    return TeamResponse.model_validate(team)


# ─────────────────────────── DELETE /{id} ────────────────────────────

@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete a team (admin only)",
)
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_admin),
) -> None:
    """
    Soft-delete a team by setting its `is_deleted` flag to True.
    Restricted to ADMIN role.
    """
    result = await db.execute(
        select(Team).where(
            Team.id == team_id,
            Team.is_deleted == False,  # noqa: E712
        )
    )
    team: Team | None = result.scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id={team_id} not found.",
        )

    team.is_deleted = True
    await db.flush()
