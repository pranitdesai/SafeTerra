import httpx
import asyncio

BASE_URL = "http://127.0.0.1:8000/api"

async def test_backend():
    print("=== Testing Backend API ===")
    
    async with httpx.AsyncClient() as client:
        # 1. Test Health Check
        print("\n1. Fetching Health Check (/api/health)...")
        try:
            r = await client.get(f"{BASE_URL}/health")
            print(f"Status: {r.status_code}")
            print(f"Response: {r.json()}")
        except Exception as e:
            print(f"Request failed: {e}")

        # 2. Test fetching States (Needs Auth, should return 401)
        print("\n2. Fetching States (/api/states) (Expected 401 without auth)...")
        try:
            r = await client.get(f"{BASE_URL}/states")
            print(f"Status: {r.status_code}")
            print(f"Response: {r.text}")
        except Exception as e:
            print(f"Request failed: {e}")

        # 3. Test fetching Hazards (Needs Auth, should return 401)
        print("\n3. Fetching Hazards (/api/hazards/) (Expected 401 without auth)...")
        try:
            r = await client.get(f"{BASE_URL}/hazards/")
            print(f"Status: {r.status_code}")
            print(f"Response: {r.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend())
