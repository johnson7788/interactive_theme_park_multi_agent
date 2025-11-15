# 使用 Python 3.13 作为基础镜像
FROM python:3.13-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（如果需要的话可以取消注释）
# RUN apt-get update && apt-get install -y \
#     build-essential \
#     && rm -rf /var/lib/apt/lists/*

# 安装 uv 包管理器
RUN pip install uv

# 复制项目文件
COPY pyproject.toml uv.lock ./
COPY app/ ./app/
COPY config/ ./config/
COPY libs/ ./libs/
COPY main.py ./
COPY test ./
COPY requirements.txt ./

RUN pip install -r requirements.txt -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple
# # 使用 UV 安装项目依赖
# RUN uv sync --frozen --no-dev --default-index https://pypi.tuna.tsinghua.edu.cn/simple

# 暴露端口5000是ws://127.0.0.1:5000， FastAPI 服务器地址: 127.0.0.1:8081
EXPOSE 5000
EXPOSE 8081

# 设置环境变量
ENV PYTHONPATH=/app

# 启动应用程序
CMD ["python", "main.py"]