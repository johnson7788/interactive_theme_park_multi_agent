from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
from typing import List


class Settings(BaseSettings):
    app_name: str = "Aplaon Admin API"
    app_env: str = "dev"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    database_url: str

    jwt_secret: str
    jwt_alg: str = "HS256"
    jwt_expire_minutes: int = 120

    allowed_origins: List[AnyHttpUrl] | List[str] = []

    ai_provider: str = "local"   # local / openai
    ai_model: str = "gpt-4o-mini"
    openai_api_key: str | None = None

    upload_dir: str = "./uploads"

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()  # reads from env/.env
