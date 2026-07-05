"""
Authentication Router
Handles employee registration, login, token refresh, and profile retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.dependencies import get_current_user
from app.models.models import Employee, RoleEnum
from app.schemas.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    RefreshRequest,
    EmployeeResponse,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _build_token_response(employee: Employee) -> TokenResponse:
    """Build a TokenResponse for the given employee."""
    token_data = {"sub": str(employee.id)}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=EmployeeResponse.model_validate(employee),
    )


# ─────────────────────────── POST /register ────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new employee account",
)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Register a new employee.

    - Rejects duplicate emails (409 Conflict).
    - Only allows ADMIN role on the very first registration (no employees exist yet).
    - All subsequent ADMIN registrations must be done by an existing admin via the
      employees endpoint; this endpoint defaults non-first-users to EMPLOYEE.
    - Returns access token, refresh token, and the new employee profile.
    """
    # 1. Check for duplicate email
    existing = await db.execute(
        select(Employee).where(Employee.email == payload.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # 2. Validate ADMIN role request — only allowed when no employees exist yet
    role = payload.role
    if role == RoleEnum.ADMIN:
        count_result = await db.execute(select(func.count()).select_from(Employee))
        employee_count: int = count_result.scalar_one()
        if employee_count > 0:
            # Demote to EMPLOYEE; an existing admin must grant admin rights
            role = RoleEnum.EMPLOYEE

    # 3. Hash password and persist
    new_employee = Employee(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=role,
        organization_id=payload.organization_id,
        department_id=payload.department_id,
        team_id=payload.team_id,
        position=payload.position,
        is_active=True,
    )
    db.add(new_employee)
    await db.flush()   # Assigns the auto-generated `id` before commit
    await db.refresh(new_employee)

    return _build_token_response(new_employee)


# ─────────────────────────── POST /login ────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and obtain access and refresh tokens",
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate an employee with email and password.

    Returns access token, refresh token, and the employee profile on success.
    Returns 401 for invalid credentials regardless of whether the email exists
    (to prevent user enumeration).
    """
    result = await db.execute(
        select(Employee).where(Employee.email == payload.email)
    )
    employee: Employee | None = result.scalar_one_or_none()

    # Unified 401 — do not reveal whether the email exists
    if not employee or not verify_password(payload.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact your administrator.",
        )

    return _build_token_response(employee)


# ─────────────────────────── POST /refresh ────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using a valid refresh token",
)
async def refresh_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Validate the provided refresh token and issue a new access token.

    The full TokenResponse (including a fresh refresh token) is returned so the
    client can implement seamless token rotation.
    """
    token_payload = decode_token(payload.refresh_token)

    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    employee_id: str | None = token_payload.get("sub")
    if not employee_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
        )

    result = await db.execute(
        select(Employee).where(
            Employee.id == int(employee_id),
            Employee.is_active == True,  # noqa: E712
        )
    )
    employee: Employee | None = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is inactive.",
        )

    return _build_token_response(employee)


# ─────────────────────────── GET /me ────────────────────────────

@router.get(
    "/me",
    response_model=EmployeeResponse,
    summary="Get the authenticated user's profile",
)
async def get_me(
    current_user: Employee = Depends(get_current_user),
) -> EmployeeResponse:
    """
    Return the profile of the currently authenticated employee.

    Requires a valid Bearer access token.
    """
    return EmployeeResponse.model_validate(current_user)
