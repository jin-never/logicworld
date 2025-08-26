from typing import List
import json
import logging

from .agent_factory import AgentFactory

class DecompositionEngine:
    """LLM-based engine that converts a raw user prompt into a list of high-level tasks (SOP steps)."""

    SYSTEM_PROMPT = (
        "你是一位资深项目规划专家，擅长将用户的高层需求拆分为完整的软件开发流程。\n"
        "请根据行业最佳实践（产品→设计→编码→测试→部署），**仅**输出一个 JSON 数组，数组元素依次为高阶任务字符串，切勿添加任何额外解释。"
    )

    @classmethod
    async def decompose(cls, user_prompt: str) -> List[str]:
        """Return a list of high-level tasks. Fallback to heuristics if JSON 解析失败."""
        prompt = f"{cls.SYSTEM_PROMPT}\n\n用户需求: {user_prompt}"
        llm_response = await AgentFactory.ask_llm(prompt)

        # Try to parse JSON list
        try:
            tasks = json.loads(llm_response)
            if isinstance(tasks, list) and all(isinstance(t, str) for t in tasks):
                return tasks
        except Exception:
            pass

        # Fallback: split by line/numbering
        logging.warning("[DecompositionEngine] 无法解析 JSON，使用 fallback 规则切分。")
        bullets = []
        for line in llm_response.splitlines():
            line = line.strip("- •0123456789. ")
            if line:
                bullets.append(line)
        return bullets or [user_prompt] 