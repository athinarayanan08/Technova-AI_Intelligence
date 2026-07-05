from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.dependencies import require_any
from app.models.models import Notification, Employee
from app.schemas.schemas import NotificationResponse
from typing import List

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def get_my_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    query = select(Notification).where(Notification.recipient_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    result = await db.execute(query.order_by(Notification.created_at.desc()).limit(50))
    return result.scalars().all()


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    notif = await db.get(Notification, notification_id)
    if notif and notif.recipient_id == current_user.id:
        notif.is_read = True
        await db.commit()
    return {"message": "Marked as read"}


@router.put("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(require_any),
):
    result = await db.execute(
        select(Notification).where(
            Notification.recipient_id == current_user.id,
            Notification.is_read == False
        )
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.commit()
    return {"message": "All notifications marked as read"}
