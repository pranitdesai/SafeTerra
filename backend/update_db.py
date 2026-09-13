import asyncio
from app.db.session import async_session
from app.models.user import User
from app.core.config import settings
from sqlalchemy import select

async def main():
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == settings.DEMO_DDMO_EMAIL))
        ddmo = result.scalar_one_or_none()
        if ddmo:
            ddmo.full_name = "Dehradun DDMO"
            await session.commit()
            print("Successfully updated full name to 'Dehradun DDMO'")
        else:
            print("User not found.")

if __name__ == "__main__":
    asyncio.run(main())
