# 游乐园（开发中)

# WebRTC
兼容性好，前端实现方式简单，稳定性。

## 支持的语音框架
1. TEN Framework  (声网，收费，免费10000分钟)   Ten --> 声网 --> 电脑
2. Livekit   （国外，收费）
3. fastrtc   (Huggingface 团队)， 部署到公网服务器即可。

## 不同语音模式
Realtime 模式： (端到端模式，Agent效果比较差，工具比较差，速度快，流畅，闲聊功能好)
pipeline模式： STT +GLM(Agent) +TTS （可控，速度慢，延迟1秒以内）

Realtime: 角色声音，不好控制，因为是端到端的。
TTS：可定制角色声音。

GLM(Agent) 实现方式：Google ADK, LangGraph React Agent, Openai Agents. 实现记忆，多Agent。
对比GLM Agent，更可控，多Agent串联。

## 流程
1. 管理后端---生成故事角色信息 ---- 数据库
2. 用户绑定角色 --- 自动初始化多个Agent -- 开始工作
3. 换一个地方打卡时 ---根据用户的id ---连接初始化后的Agent
4. 用户结束或者长时间不用，销毁Agent(线程关掉了)

## 实现思路
### 这是FastRTC的实现，但是很卡，不知道为什么
[backend](tour_backend/backend)
[frontend](tour_backend/frontend)


### 参考小智
小智的客户端和服务端。
https://github.com/78/xiaozhi-esp32
只需要使用main/xiaozhi-server的部分
https://github.com/huangjunsen0406/py-xiaozhi
![xiaozhi.png](doc/xiaozhi.png)

## SenseVoice模型下载:
https://modelscope.cn/models/iic/SenseVoiceSmall/resolve/master/model.pt
放到tour_backend/models/SenseVoiceSmall/model.pt

修改配置文件
```
tour_backend/data/.config.yaml
```

## 配置和启动
```
查看：
cd tour_backend
python3 -m pip install -r requirements.txt
python3 app.py

浏览器打开： tour_backend/test/test_page.html
```


## 这里可以添加自定义的API
```
tour_backend/core/api
base_handler.py
ota_handler.py
vision_handler.py
```