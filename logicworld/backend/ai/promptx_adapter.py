"""Prompt-X & LangChain 统一适配层.

提供:
  • PromptXTemplate: 让 Prompt-X / prompts/*.yaml 模板可作为 LangChain PromptTemplate 使用.
  • JSONFileMemory: 基于文件持久化的 ConversationBufferMemory.

后续如安装官方 Prompt-X SDK, render_prompt 会自动切换, 无须更改本模块.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from langchain.prompts.base import StringPromptTemplate
from langchain.memory import ConversationBufferMemory, ChatMessageHistory

from prompt_lib import render_prompt


class PromptXTemplate(StringPromptTemplate):
    """把 Prompt-X 模板封装为 LangChain PromptTemplate."""

    template_id: str

    def format(self, **kwargs: Any) -> str:  # noqa: D401
        return render_prompt(self.template_id, **kwargs)

    def _prompt_type(self) -> str:  # noqa: D401
        return "promptx"


class JSONFileMemory(ConversationBufferMemory):
    """简单文件持久化的 Buffer Memory, 默认格式:
    [ {"user": "...", "ai": "..."}, ... ]
    """

    def __init__(self, path: str | Path, **kwargs):  # noqa: D401
        self._path = Path(path)
        if self._path.exists():
            try:
                msgs = json.loads(self._path.read_text(encoding="utf-8"))
            except Exception:
                msgs = []
        else:
            msgs = []
        chat_history = ChatMessageHistory()
        for m in msgs:
            chat_history.add_user_message(m.get("user", ""))
            chat_history.add_ai_message(m.get("ai", ""))
        super().__init__(chat_memory=chat_history, return_messages=True, **kwargs)

    def save_context(self, inputs: dict[str, Any], outputs: dict[str, Any]):  # noqa: D401
        super().save_context(inputs, outputs)
        # write back to file
        pairs = []
        msgs = self.chat_memory.messages
        for i in range(0, len(msgs), 2):
            user_msg = msgs[i].content if i < len(msgs) else ""
            ai_msg = msgs[i + 1].content if i + 1 < len(msgs) else ""
            pairs.append({"user": user_msg, "ai": ai_msg})
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text(json.dumps(pairs, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass 