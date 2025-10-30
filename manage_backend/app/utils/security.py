from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from ..config import settings
from pydantic import BaseModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

class TokenData(BaseModel):
    sub: str
    uid: int
    exp: int

def create_access_token(uid: int, subject: str, expires_minutes: int | None = None) -> str:
    if expires_minutes is None:
        expires_minutes = settings.jwt_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode = {"sub": subject, "uid": uid, "exp": int(expire.timestamp())}
    token = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_alg)
    return token


def verify_token(token: str, secret: str = None, algorithm: str = None) -> dict:
    """验证JWT令牌并返回payload数据"""
    if secret is None:
        secret = settings.jwt_secret
    if algorithm is None:
        algorithm = settings.jwt_alg

    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        # 验证令牌是否过期
        if 'exp' in payload:
            current_time = int(datetime.now(timezone.utc).timestamp())
            if payload['exp'] < current_time:
                raise JWTError("Token has expired")
        return payload
    except JWTError:
        # 在实际应用中，您可能需要更具体的错误处理
        raise ValueError("Invalid or expired token")