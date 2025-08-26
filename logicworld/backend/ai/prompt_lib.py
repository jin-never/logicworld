from __future__ import annotations
"""Prompt-X unified wrapper.

Provides:
- render_prompt(template_id, **vars)  -> str
- add_memory(key, value)

Relies on:
- templates stored under /prompts/*.yaml  (each file must contain at minimum a 'template' field)
- Memory persisted at memory/promptx_mem.json (auto-created)
"""

import yaml
import json
from pathlib import Path
from functools import lru_cache
from typing import Any

# ---------------------------------------------------------------------------
# Try Prompt-X SDK first; fallback to lightweight Jinja2
# ---------------------------------------------------------------------------

try:
    from promptx import PromptTemplate, Memory, PromptSession  # type: ignore
except Exception:  # noqa: BLE001
    # --- Lightweight fallback using Jinja2 ---
    from jinja2 import Template  # type: ignore

    class PromptTemplate:  # type: ignore
        """Mimic promptx.PromptTemplate with basic from_template method."""

        def __init__(self, tmpl: str):
            self._template = Template(tmpl)

        @classmethod
        def from_template(cls, tmpl: str):
            return cls(tmpl)

        def render(self, **kwargs):
            return self._template.render(**kwargs)

    class Memory(dict):  # type: ignore
        """Very simple JSON-based persistent memory."""

        def __init__(self, path: str):  # noqa: D401
            super().__init__()
            self._path = Path(path)
            if self._path.exists():
                try:
                    self.update(json.loads(self._path.read_text(encoding="utf-8")))
                except Exception:  # noqa: BLE001
                    pass

        def save(self):
            try:
                self._path.write_text(json.dumps(self, ensure_ascii=False, indent=2), encoding="utf-8")
            except Exception:  # noqa: BLE001
                pass

    class PromptSession:  # type: ignore
        """Minimal subset: render = template.render."""

        def __init__(self, template: PromptTemplate, memory: Memory | None = None):
            self.template = template
            self.memory = memory or {}

        def render(self, **kwargs):
            return self.template.render(**kwargs)


PROMPT_DIR = Path(__file__).parent.parent / "prompts"
PROMPT_DIR.mkdir(parents=True, exist_ok=True)

MEM_DIR = Path(__file__).parent.parent / "memory"
MEM_DIR.mkdir(exist_ok=True)
MEM_FILE = MEM_DIR / "promptx_mem.json"

# global Memory instance
memory = Memory(path=str(MEM_FILE))

@lru_cache(maxsize=128)
def load_template(template_id: str) -> PromptTemplate:
    """Load PromptTemplate; cache for reuse."""
    # 1) 先尝试云端 Prompt-X Hub
    try:
        from promptx import PromptHub  # 假设 Prompt-X 提供 Hub API
        hub_tmpl = PromptHub.get(template_id)  # 具体接口以实际库为准
        if hub_tmpl:
            return hub_tmpl
    except Exception:
        # 网络故障或云端暂无该模板，继续尝试本地
        pass

    # 2) 本地 fallback
    path = PROMPT_DIR / f"{template_id}.yaml"
    if path.exists():
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        template_str = data["template"] if isinstance(data, dict) and "template" in data else path.read_text("utf-8")
        return PromptTemplate.from_template(template_str)

    # 3) 仍未找到
    raise FileNotFoundError(f"Prompt template '{template_id}' not found in Prompt-X Hub nor local {PROMPT_DIR}.")


def render_prompt(template_id: str, **variables: Any) -> str:
    """Render template with variables and memory snapshot."""
    tmpl = load_template(template_id)
    session = PromptSession(template=tmpl, memory=memory)
    return session.render(**variables)


def add_memory(key: str, value: str):
    """Write key-value to long-term memory and persist."""
    memory[key] = value
    memory.save() 