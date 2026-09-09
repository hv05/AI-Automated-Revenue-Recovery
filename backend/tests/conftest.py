import os
import asyncio
import pytest
from app.db.session import init_db, engine, Base


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Drop and recreate clean database tables for the test run."""
    async def _reset():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_reset())
