# Mysql数据库

# 初始化
```
python -m venv .venv
source .venv/bin/activate  # Windows 用 .venv\Scripts\activate
pip install -r requirements.txt
cp env_example .env
uvicorn app.main:app --reload
# 初始化数据
python -m app.seeds.seed
```

