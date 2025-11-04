from typing import Optional
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from ..config import ConfigManager
from ..constant.repsonse import BaseResponse
from ..utils.logger import get_logger
from pydantic import BaseModel, Field

router = APIRouter(prefix="/config", tags=["config"])
logger = get_logger(__name__)
configuration = ConfigManager()


class GetConfigResponse(BaseResponse):
    data: dict[str, str | int | bool]


@router.get("", summary="获取配置信息", response_model=GetConfigResponse)
def get_config():
    logger.info("配置信息: ", configuration.config)
    data = {
        "ws_url": configuration.get("WS_URL"),
        "ws_proxy_url": configuration.get("WS_PROXY_URL"),
        "ota_version_url": configuration.get("OTA_VERSION_URL"),
        "token_enable": configuration.get("TOKEN_ENABLE"),
        "token": configuration.get("TOKEN"),
        "device_id": configuration.get("DEVICE_ID"),
    }
    return JSONResponse(
        content={"message": "配置文件获取成功", "code": 0, "data": data},
        status_code=200,
    )


class ConfigData(BaseModel):
    ws_url: Optional[str] = Field(description="WebSocket连接地址", default="")
    ws_proxy_url: Optional[str] = Field(description="WebSocket代理地址", default="")
    token_enable: Optional[bool] = Field(
        description="请求中是否携带Token", default=False
    )
    token: Optional[str] = Field(description="设备Token", default="")
    ota_version_url: Optional[str] = Field(description="OTA版本地址", default="")


@router.put("", summary="更新配置", response_model=BaseResponse)
def update_config(data: ConfigData):
    logger.info(f"配置信息: {data}")
    try:
        for key, value in data.model_dump().items():
            if value != "" and value:
                logger.info(f"key: {key}, value: {value}")
                configuration.set(key, value)
        configuration.save_config()
        logger.info("配置信息更新成功")
        return JSONResponse(
            content={"message": "配置文件更新成功", "code": 0}, status_code=200
        )
    except Exception as e:
        logger.error(f"配置信息更新失败: {e}")
        return JSONResponse(
            content={"message": f"配置文件更新失败: {str(e)}", "code": 1},
            status_code=500,
        )
