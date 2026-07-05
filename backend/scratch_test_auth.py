import asyncio
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.models import Employee
from app.core.security import verify_password

async def test_auth():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Employee).where(Employee.email == "admin@technova.com"))
        emp = res.scalar_one_or_none()
        if not emp:
            print("Employee not found in database!")
            return
        
        print("Employee found:", emp.name, emp.email)
        print("Password hash in DB:", emp.password_hash)
        
        # Test Admin@123 password
        pwd_match = verify_password("Admin@123", emp.password_hash)
        print("Password 'Admin@123' matches?", pwd_match)

asyncio.run(test_auth())
