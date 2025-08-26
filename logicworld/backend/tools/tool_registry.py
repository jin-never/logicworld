"""
Tool Registry to discover, register, and execute tools.
"""
import os
import importlib
import inspect
from pathlib import Path
from typing import Callable, Dict, Any, List

# --- Decorator to mark functions as tools ---
def tool(func: Callable) -> Callable:
    """
    工具装饰器已禁用 - 现在完全使用AI工作流构建器
    这个装饰器现在只是一个空的标记，不会注册任何工具
    """
    # 不再设置任何属性或注册工具
    return func

# 全局工具存储
_tool_info: Dict[str, Dict[str, Any]] = {}

def discover_and_register_tools(tool_dir: str = None):
    """
    工具发现和注册功能已禁用 - 现在完全使用AI工作流构建器
    """
    global _tool_info
    _tool_info = {}
    print("Tool discovery disabled - using AI workflow builder only")

def register_tool(func: Callable):
    """
    Registers a single function as a tool and generates its schema.
    """
    global _tool_info
    
    # NEW: Create a compliant name for the AI and a user-friendly display name.
    ai_compliant_name = f"{func.__module__}.{func.__name__}".replace('.', '_')
    display_name = func.__name__.replace('_', ' ').title()

    if ai_compliant_name in _tool_info:
        return # 避免重复注册
    
    # 从函数的 docstring 和签名中解析 schema
    doc = inspect.getdoc(func)
    description = ""
    # A more robust way to get the description from the docstring
    if doc:
        description = doc.strip().split('\\n\\n')[0]

    sig = inspect.signature(func)
    parameters = {
        "type": "object",
        "properties": {},
        "required": [],
    }
    
    for name, param in sig.parameters.items():
        param_type = "string" # 默认为 string
        if param.annotation == int:
            param_type = "integer"
        elif param.annotation == float:
            param_type = "number"
        elif param.annotation == bool:
            param_type = "boolean"
            
        parameters["properties"][name] = {
            "type": param_type,
            "description": f"Parameter: {name}" # 简单的描述
        }
        if param.default is inspect.Parameter.empty:
            parameters["required"].append(name)
            
    schema = {
        "type": "function",
        "function": {
            "name": ai_compliant_name, # Use the compliant name
            "description": description,
            "parameters": parameters,
        }
    }
    
    # Store all info in the new structure
    _tool_info[ai_compliant_name] = {
        "function": func,
        "schema": schema,
        "display_name": display_name,
        "short_name": func.__name__
    }
    print(f"Successfully registered tool: {ai_compliant_name}")

def get_tools() -> List[Dict[str, Any]]:
    """
    工具注册表已禁用 - 现在完全使用AI工作流构建器
    返回空列表，不再提供任何工具
    """
    return []

def get_tool_info(name: str) -> Dict[str, Any]:
    """
    Returns all internal information for a given tool by its AI-compliant name.
    """
    return _tool_info.get(name)

async def execute_tool(name: str, **kwargs) -> Any:
    """
    Executes a tool by its AI-compliant name with the given arguments.
    Handles both sync and async functions.
    """
    info = _tool_info.get(name)
    if not info:
        raise ValueError(f"Tool '{name}' not found.")
    
    func = info["function"]
    
    # Check if the function is a coroutine function (async def)
    if inspect.iscoroutinefunction(func):
        return await func(**kwargs)
    else:
        # It's a regular synchronous function
        return func(**kwargs)

# ---------------------------------------------------------------------------
# Auto-register MCP servers defined in backend/system_tools.json as individual tools
# ---------------------------------------------------------------------------
import json
from pathlib import Path


def _register_mcp_servers():
    # MCP服务器自动注册功能已禁用
    # 这些工具不再自动注册为系统工具
    pass


# 工具自动注册已禁用 - 现在完全使用AI工作流构建器
# discover_and_register_tools()
# _register_mcp_servers()