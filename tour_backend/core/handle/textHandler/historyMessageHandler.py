from typing import Dict, Any, List

from core.handle.textMessageHandler import TextMessageHandler
from core.handle.textMessageType import TextMessageType
from core.utils.dialogue import Message


class HistoryTextMessageHandler(TextMessageHandler):
    """接收前端发送的历史记录并注入到当前会话上下文"""

    @property
    def message_type(self) -> TextMessageType:
        return TextMessageType.HISTORY

    async def handle(self, conn, msg_json: Dict[str, Any]) -> None:
        # 期望结构：{ type: 'history', messages: [{role:'user'|'assistant', content:'...', created_at?:str, npc_id?:str}] }
        messages: List[Dict[str, Any]] = msg_json.get("messages", [])
        if not isinstance(messages, list) or len(messages) == 0:
            return

        # 将历史写入到对话对象，作为上下文
        for m in messages:
            role = m.get("role")
            content = m.get("content")
            if not role or content is None:
                continue
            # 只支持 user/assistant 两类历史注入
            if role not in ["user", "assistant"]:
                continue
            conn.dialogue.put(Message(role=role, content=content))


