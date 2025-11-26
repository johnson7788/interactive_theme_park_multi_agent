#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Date  : 2025/11/26 20:15
# @File  : test_api.py
# @Author: johnson
# @Contact : github: johnson7788
# @Desc  : 测试用例代码

import unittest
import os
import json
import time
import requests


class CreateUserAPITestCase(unittest.TestCase):
    """
    测试 create_user 接口
    """
    host = "127.0.0.1"
    port = 8000

    env_host = os.environ.get("host")
    if env_host:
        host = env_host

    def test_create_user(self):
        """
        测试创建用户
        POST /create_user
        """
        url = f"http://{self.host}:{self.port}/create_user"
        payload = {
            "username": f"test_user_{int(time.time())}"  # 防止重复
        }

        start_time = time.time()
        try:
            r = requests.post(url, json=payload)
        except Exception as e:
            raise AssertionError(f"接口无法访问: {e}")

        # 打印返回值
        try:
            data = r.json()
        except Exception:
            raise AssertionError(f"响应不是 JSON: {r.text}")

        print(json.dumps(data, indent=4, ensure_ascii=False))

        # 断言正确
        assert r.status_code == 200, f"状态码错误: {r.status_code}"
        assert "user" in data, f"返回数据中缺少 user 字段"
        assert data["user"]["name"] == payload["username"], "用户名不一致"

        print(f"花费时间: {time.time() - start_time} 秒")
        print(f"调用的 server 是: {self.host}")
