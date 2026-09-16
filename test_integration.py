import httpx
import asyncio

API_BASE = "http://localhost:8000/api"

async def test_integration():
    print("--- KAVACH API INTEGRATION TEST ---")
    
    async with httpx.AsyncClient() as client:
        # 0. Test Health Check
        print("\n0. Testing Health Check (/health)...")
        try:
            health_resp = await client.get(f"{API_BASE}/health")
            if health_resp.status_code == 200:
                print(f"[OK] Health check passed: {health_resp.json()}")
            else:
                print(f"[FAIL] Health check failed: {health_resp.status_code}")
                return
        except Exception as e:
            print(f"[FAIL] Could not connect to API at {API_BASE}: {e}")
            return

        # 1. Test Unauthenticated Access Protection
        print("\n1. Testing Unauthenticated Access Protection (/settlements/)...")
        unauth_resp = await client.get(f"{API_BASE}/settlements/")
        if unauth_resp.status_code in (401, 403):
            print(f"[OK] Correctly rejected unauthenticated request ({unauth_resp.status_code} Forbidden/Unauthorized).")
        else:
            print(f"[WARN] Expected 401 or 403, got: {unauth_resp.status_code}")

        # 2. Test Login
        print("\n2. Testing Authentication (/auth/login)...")
        login_data = {
            "email": "admin@kavach.gov.in",
            "password": "KavachAdmin@2026"
        }
        
        response = await client.post(f"{API_BASE}/auth/login", json=login_data)
        
        if response.status_code != 200:
            print(f"[FAIL] Login failed! Status: {response.status_code}")
            print(response.json())
            return
            
        data = response.json()
        token = data.get("access_token")
        print(f"[OK] Login successful! Received JWT token (length: {len(token)}).")
        print(f"   Logged in as: {data['user']['full_name']} ({data['user']['role']})")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Test Get Current User
        print("\n3. Testing Protected Profile Endpoint (/auth/me)...")
        me_resp = await client.get(f"{API_BASE}/auth/me", headers=headers)
        if me_resp.status_code == 200:
            print(f"[OK] Profile fetch successful! Email: {me_resp.json()['email']}")
        else:
            print(f"[FAIL] Profile fetch failed: {me_resp.status_code}")
            
        # 4. Test Get Settlements
        print("\n4. Testing Settlements Endpoint (/settlements/)...")
        settlements_resp = await client.get(f"{API_BASE}/settlements/", headers=headers)
        if settlements_resp.status_code == 200:
            settlements = settlements_resp.json()
            print(f"[OK] Fetched {len(settlements)} settlements from the database.")
            for s in settlements[:3]:  # Print first 3
                print(f"   - {s['name']} (Pop: {s['population']}, Status: {s['current_hazard_status']})")
        else:
            print(f"[FAIL] Settlements fetch failed: {settlements_resp.status_code}")
            print(settlements_resp.text)
            
        # 5. Test Get Relocation Sites
        print("\n5. Testing Relocation Sites Endpoint (/relocation-sites/)...")
        sites_resp = await client.get(f"{API_BASE}/relocation-sites/", headers=headers)
        if sites_resp.status_code == 200:
            sites = sites_resp.json()
            print(f"[OK] Fetched {len(sites)} relocation sites from the database.")
            for site in sites[:3]:
                print(f"   - {site['name']} (Capacity: {site['max_capacity']})")
        else:
            print(f"[FAIL] Relocation sites fetch failed: {sites_resp.status_code}")

if __name__ == "__main__":
    asyncio.run(test_integration())
