import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .config import settings
from .db import engine, Base, AsyncSessionLocal
from .routers import auth, themes, npcs, agent, tasks, checkpoints, users, rewards, stats, settings as settings_router, uploads
from .routers import api_router
from .models import AuditLog, AdminUser

app = FastAPI(title=settings.app_name, debug=settings.app_debug)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件（上传目录）
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# 路由
api_router.include_router(auth.router)
api_router.include_router(themes.router)
api_router.include_router(npcs.router)
api_router.include_router(agent.router)
api_router.include_router(tasks.router)
api_router.include_router(checkpoints.router)
api_router.include_router(users.router)
api_router.include_router(rewards.router)
api_router.include_router(stats.router)
api_router.include_router(settings_router.router)
api_router.include_router(uploads.router)
app.include_router(api_router)


# 简易审计中间件
@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    # 仅记录写操作
    if request.method in {"POST", "PUT", "DELETE"} and request.url.path.startswith("/api/admin"):
        try:
            # 尝试从token中解析uid（这里不强制）
            uid = None
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                from jose import jwt
                token = auth[7:]
                payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
                uid = int(payload.get("uid")) if payload.get("uid") else None
            async with AsyncSessionLocal() as s:
                log = AuditLog(
                    actor_id=uid,
                    action=request.method,
                    resource=request.url.path,
                    detail={"status_code": response.status_code},
                    ip=request.client.host if request.client else None
                )
                s.add(log)
                await s.commit()
        except Exception:
            # 审计失败不影响主流程
            pass
    return response


@app.on_event("startup")
async def on_startup():
    # 创建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # 简单健康检查
    async with AsyncSessionLocal() as s:
        await s.execute(text("SELECT 1"))