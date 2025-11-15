# 生产镜像，仅包含应用代码
FROM ghcr.io/xinnan-tech/xiaozhi-esp32-server:server-base

COPY . .

RUN pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 启动应用
CMD ["python", "app.py"]