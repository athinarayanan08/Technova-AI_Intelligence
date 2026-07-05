import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        # 1. Login
        login_res = await client.post(
            "http://localhost:8000/api/auth/login",
            json={"email": "rajan@technova.com", "password": "Manager@123"}
        )
        print("Login Status:", login_res.status_code)
        if login_res.status_code != 200:
            print("Login Error:", login_res.text)
            return

        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get dashboard summary
        dashboard_res = await client.get(
            "http://localhost:8000/api/ai/dashboard/summary?org_id=1",
            headers=headers
        )
        print("Dashboard Status:", dashboard_res.status_code)
        print("Dashboard Content:", dashboard_res.text)

if __name__ == "__main__":
    asyncio.run(test())
