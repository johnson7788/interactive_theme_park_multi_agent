import os
from uuid import uuid4
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from ..config import settings
from ..deps import get_current_admin

router = APIRouter(tags=["uploads"], prefix="/uploads")


@router.post("", summary="文件上传（返回可访问URL）")
async def upload(file: UploadFile = File(...), _=Depends(get_current_admin)):
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = (file.filename or "").split(".")[-1].lower()
    if ext not in {"png", "jpg", "jpeg", "webp", "gif", "svg"}:
        raise HTTPException(400, "Invalid file type")
    fname = f"{uuid4().hex}.{ext}"
    fpath = os.path.join(settings.upload_dir, fname)
    with open(fpath, "wb") as f:
        f.write(await file.read())
    return {"url": f"/uploads/{fname}", "name": file.filename}