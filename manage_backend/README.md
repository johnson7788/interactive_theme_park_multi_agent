# 阿派朗创造力乐园 - 管理后台 API

基于 FastAPI 的后端服务，

## 初始化

```bash
python -m venv .venv
source .venv/bin/activate  # Windows 用 .venv\Scripts\activate
pip install -r requirements.txt
cp env_example .env
python main.py
python test_api.py # 测试代码
bash test_curl.py #或者使用curl命令测试
```

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 注意：写入数据库必须使用 service role，不要用 anon key）

---

# ✅ FastAPI 接口：传入用户名，创建用户
## 🧪 调用示例（POST）
```json
POST /create_user
{
  "username": "test_user_001"
}
```

返回：

```json
{
  "message": "User created successfully",
  "user": {
    "id": "xxxx-xxxx-xxxx",
    "name": "test_user_001",
    "points": 0,
    "completed_tasks": 0,
    "last_checkin": "2025-01-01T00:00:00.000000Z",
    "created_at": "2025-01-01T00:00:00.000000Z",
    "updated_at": "2025-01-01T00:00:00.000000Z"
  }
}
```
