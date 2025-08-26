"""LangChain & LangGraph 辅助工具。"""
from __future__ import annotations

import asyncio
from typing import Any, Callable, Awaitable

from langchain.callbacks.base import AsyncCallbackHandler


class GraphForwardHandler(AsyncCallbackHandler):
    """将 LangChain 事件转发给 progress_cb (用于 LangGraph SSE)。"""

    def __init__(self, progress_cb: Callable[[dict[str, Any]], Awaitable[None]]):
        super().__init__()
        self._cb = progress_cb

    async def on_chain_start(self, serialized: dict[str, Any], inputs: dict[str, Any], **kwargs):  # type: ignore[override]
        await self._safe_emit({"event": "lc_chain_start", "name": serialized.get("id"), "inputs": inputs})

    async def on_chain_end(self, outputs: dict[str, Any], **kwargs):  # type: ignore[override]
        await self._safe_emit({"event": "lc_chain_end", "outputs": outputs})

    async def on_tool_start(self, serialized: dict[str, Any], inputs: dict[str, Any], **kwargs):  # type: ignore[override]
        await self._safe_emit({"event": "lc_tool_start", "name": serialized.get("name"), "inputs": inputs})

    async def on_tool_end(self, outputs: Any, **kwargs):  # type: ignore[override]
        await self._safe_emit({"event": "lc_tool_end", "outputs": outputs})

    async def on_llm_start(self, serialized: dict[str, Any], prompts: list[str], **kwargs):  # type: ignore[override]
        await self._safe_emit({"event": "lc_llm_start", "prompts": prompts})

    async def on_llm_end(self, response: Any, **kwargs):  # type: ignore[override]
        await self._safe_emit({"event": "lc_llm_end"})

    async def _safe_emit(self, payload: dict[str, Any]):
        try:
            await self._cb(payload)
        except Exception:  # noqa: BLE001
            pass 