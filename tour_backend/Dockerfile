# 生产镜像，仅包含应用代码
FROM python:3.10-slim

# 使用国内 apt 源（清华大学）
# RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list && \
#     sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list

# 替换 apt 源（Bookworm 格式）
RUN sed -i 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|http://security.debian.org/debian-security|https://mirrors.tuna.tsinghua.edu.cn/debian-security|g' /etc/apt/sources.list.d/debian.sources


# 安装系统依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends libopus0 ffmpeg locales && \
    sed -i '/zh_CN.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 配置pip使用国内镜像源（阿里云）并设置超时和重试
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    pip config set global.trusted-host mirrors.aliyun.com && \
    pip config set global.timeout 120 && \
    pip config set install.retries 5

# 设置环境变量以确保正确的字符编码
ENV LANG=zh_CN.UTF-8 \
    LC_ALL=zh_CN.UTF-8 \
    LANGUAGE=zh_CN:zh \
    PYTHONIOENCODING=utf-8

WORKDIR /opt/xiaozhi-esp32-server

COPY . .

# 安装Python依赖
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt --default-timeout=120 --retries 5

RUN pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 启动应用
CMD ["python", "app.py"]