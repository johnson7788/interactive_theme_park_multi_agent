from pydantic import BaseModel, Field


class BaseResponse(BaseModel):
    message: str = Field(..., description="响应消息")
    code: int = Field(..., description="响应状态码")
