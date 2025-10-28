from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

Base = declarative_base()
engine = create_async_engine(settings.database_url, echo=settings.app_debug, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, autoflush=False, autocommit=False)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
