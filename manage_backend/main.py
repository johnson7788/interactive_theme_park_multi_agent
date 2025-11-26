from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from datetime import datetime
import os
import uvicorn
import dotenv
dotenv.load_dotenv()

app = FastAPI()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class CreateUserRequest(BaseModel):
    username: str


@app.post("/create_user")
async def create_user(req: CreateUserRequest):
    # 检查是否已存在
    existing = supabase.table("User").select("*").eq("name", req.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User already exists")

    now = datetime.utcnow().isoformat()

    new_user = {
        "name": req.username,
        "points": 0,
        "completed_tasks": 0,
        "last_checkin": now,
        "created_at": now,
        "updated_at": now,
    }

    result = supabase.table("User").insert(new_user).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    return {"message": "User created successfully", "user": result.data[0]}

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000)