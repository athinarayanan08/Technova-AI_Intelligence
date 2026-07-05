from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.security import decode_token
from app.models.models import Employee, RoleEnum

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Employee:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    employee_id: int = payload.get("sub")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(
        select(Employee).where(Employee.id == int(employee_id), Employee.is_active == True)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return employee


def require_roles(*roles: RoleEnum):
    async def role_checker(current_user: Employee = Depends(get_current_user)) -> Employee:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return role_checker


# Convenience dependency shortcuts
require_admin = require_roles(RoleEnum.ADMIN)
require_manager = require_roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
require_team_lead = require_roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.TEAM_LEAD)
require_any = get_current_user  # any authenticated user
