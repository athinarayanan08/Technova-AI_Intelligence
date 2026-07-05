import os
import socket
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

db_url = settings.DATABASE_URL
engine_kwargs = {
    "echo": settings.DEBUG,
}

# Resilient fallback check: see if PostgreSQL port is open on localhost
postgres_active = False
if "localhost" in db_url or "127.0.0.1" in db_url:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        s.connect(("localhost", 5432))
        s.close()
        postgres_active = True
    except Exception:
        postgres_active = False
else:
    postgres_active = True  # Remote DB, assume active

if postgres_active:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 0,
    })
else:
    # Fallback to local SQLite database in the workspace
    sqlite_path = "d:/AI_Organization/backend/ai_org.db"
    db_url = f"sqlite+aiosqlite:///{sqlite_path}"
    print(f"[WARNING] PostgreSQL port 5432 is closed. Resilient fallback to SQLite: {sqlite_path}")

engine = create_async_engine(db_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
