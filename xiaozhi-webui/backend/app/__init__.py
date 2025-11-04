from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import config


def create_app():

    app = FastAPI()

    # 配置 CORS 中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
    )

    # 注册路由
    app.include_router(config.router)

    return app
