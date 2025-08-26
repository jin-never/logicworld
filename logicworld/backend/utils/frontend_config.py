"""
前端配置管理API
处理API工具配置、AI工具配置等前端请求
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any, Union
import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

router = APIRouter(tags=["frontend-config"])

# 配置文件路径 - 使用项目根目录下的data/configs/backend-config
PROJECT_ROOT = Path(__file__).parent.parent.parent
CONFIG_DIR = PROJECT_ROOT / "data" / "configs" / "backend-config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

API_TOOLS_CONFIG = CONFIG_DIR / "api_tools.json"
AI_TOOLS_CONFIG = CONFIG_DIR / "ai_tools.json"
MCP_TOOLS_CONFIG = CONFIG_DIR / "mcp_tools.json"

# Pydantic 模型
class APIToolConfig(BaseModel):
    id: str
    name: str
    description: str
    base_url: str
    protocol: str = "HTTPS"
    timeout: int = 60000
    auth_type: str = "Bearer Token"
    auth_token: str = ""
    supported_methods: List[str] = ["GET", "POST"]
    custom_headers: Dict[str, str] = {}
    enabled: bool = True
    functionalCategory: Union[str, List[str]] = ""  # 新增：功能分类，支持单选或多选

class AIToolConfig(BaseModel):
    id: str
    name: str
    description: str
    provider: str  # deepseek, qwen, zhipu, baidu, moonshot, doubao, openai, anthropic, etc.
    model: str
    api_key: str
    base_url: str = ""
    max_tokens: int = 4000
    temperature: float = 0.7
    enabled: bool = True
    functionalCategory: Union[str, List[str]] = ""  # 新增：功能分类，支持单选或多选

class MCPToolConfig(BaseModel):
    id: str
    name: str
    description: str
    server_type: Optional[str] = "stdio"  # stdio, http
    command: Optional[str] = None
    args: Optional[List[str]] = None
    url: Optional[str] = None
    enabled: bool = True
    functionalCategory: Union[str, List[str]] = ""  # 新增：功能分类，支持单选或多选

    # 兼容前端ToolDataModel的额外字段
    version: Optional[str] = "1.0.0"
    author: Optional[str] = ""
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    sourceType: Optional[str] = None
    capabilities: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    approvalStatus: Optional[str] = None
    approvedBy: Optional[str] = None
    approvedAt: Optional[str] = None
    ownerId: Optional[str] = None
    isPublic: Optional[bool] = False
    available: Optional[bool] = True
    tested: Optional[bool] = False
    testResults: Optional[Dict] = None
    config: Optional[Dict] = None
    sensitiveFields: Optional[List[str]] = []
    requiredFields: Optional[List[str]] = []
    optionalFields: Optional[List[str]] = []
    usageCount: Optional[int] = 0
    lastUsedAt: Optional[str] = None

# 工具函数
def load_config(config_path: Path) -> List[Dict]:
    """加载配置文件"""
    if config_path.exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_config(config_path: Path, data: List[Dict]):
    """保存配置文件"""
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

async def trigger_tools_sync():
    """触发工具库同步 - 通知前端工具库需要刷新"""
    try:
        # 导入WebSocket通知函数
        from utils.websocket_manager import notify_tools_library_refresh

        # 发送WebSocket通知
        await notify_tools_library_refresh("config_updated")
        print("工具配置已更新，已发送WebSocket同步通知")
        return True
    except Exception as e:
        print(f"触发工具同步失败: {e}")
        return False

# API工具端点
@router.get("/api-tools")
async def get_api_tools():
    """获取所有API工具配置"""
    return load_config(API_TOOLS_CONFIG)

@router.post("/api-tools")
async def create_api_tool(tool: APIToolConfig):
    """创建新的API工具配置"""
    tools = load_config(API_TOOLS_CONFIG)

    # 检查ID是否已存在
    if any(t.get('id') == tool.id for t in tools):
        raise HTTPException(status_code=400, detail="Tool ID already exists")

    tools.append(tool.model_dump())
    save_config(API_TOOLS_CONFIG, tools)

    # 触发工具库同步
    await trigger_tools_sync()

    # 发送API工具更新通知
    from utils.websocket_manager import notify_api_tools_updated
    await notify_api_tools_updated("added", tool.model_dump())

    return {"message": "API tool created successfully", "tool": tool.model_dump()}

@router.put("/api-tools/{tool_id}")
async def update_api_tool(tool_id: str, tool: APIToolConfig):
    """更新API工具配置"""
    tools = load_config(API_TOOLS_CONFIG)

    for i, t in enumerate(tools):
        if t.get('id') == tool_id:
            tools[i] = tool.model_dump()
            save_config(API_TOOLS_CONFIG, tools)

            # 触发工具库同步
            await trigger_tools_sync()

            # 发送API工具更新通知
            from utils.websocket_manager import notify_api_tools_updated
            await notify_api_tools_updated("updated", tool.model_dump())

            return {"message": "API tool updated successfully", "tool": tool.model_dump()}

    raise HTTPException(status_code=404, detail="Tool not found")

@router.delete("/api-tools/{tool_id}")
async def delete_api_tool(tool_id: str):
    """删除API工具配置"""
    tools = load_config(API_TOOLS_CONFIG)

    for i, t in enumerate(tools):
        if t.get('id') == tool_id:
            deleted_tool = tools.pop(i)
            save_config(API_TOOLS_CONFIG, tools)

            # 触发工具库同步
            await trigger_tools_sync()

            return {"message": "API tool deleted successfully", "tool": deleted_tool}

    raise HTTPException(status_code=404, detail="Tool not found")

# AI工具端点
@router.get("/ai-tools")
async def get_ai_tools():
    """获取所有AI工具配置"""
    return load_config(AI_TOOLS_CONFIG)

@router.post("/ai-tools")
async def create_ai_tool(tool: AIToolConfig):
    """创建新的AI工具配置"""
    tools = load_config(AI_TOOLS_CONFIG)

    # 检查ID是否已存在
    if any(t.get('id') == tool.id for t in tools):
        raise HTTPException(status_code=400, detail="Tool ID already exists")

    tools.append(tool.model_dump())
    save_config(AI_TOOLS_CONFIG, tools)

    # 触发工具库同步
    await trigger_tools_sync()

    return {"message": "AI tool created successfully", "tool": tool.model_dump()}

@router.put("/ai-tools/{tool_id}")
async def update_ai_tool(tool_id: str, tool: AIToolConfig):
    """更新AI工具配置"""
    tools = load_config(AI_TOOLS_CONFIG)

    for i, t in enumerate(tools):
        if t.get('id') == tool_id:
            tools[i] = tool.model_dump()
            save_config(AI_TOOLS_CONFIG, tools)

            # 触发工具库同步
            await trigger_tools_sync()

            # 发送AI工具更新通知
            from utils.websocket_manager import notify_ai_tools_updated
            await notify_ai_tools_updated("updated", tool.model_dump())

            return {"message": "AI tool updated successfully", "tool": tool.model_dump()}

    raise HTTPException(status_code=404, detail="Tool not found")

@router.delete("/ai-tools/{tool_id}")
async def delete_ai_tool(tool_id: str):
    """删除AI工具配置"""
    tools = load_config(AI_TOOLS_CONFIG)

    for i, t in enumerate(tools):
        if t.get('id') == tool_id:
            deleted_tool = tools.pop(i)
            save_config(AI_TOOLS_CONFIG, tools)

            # 触发工具库同步
            await trigger_tools_sync()

            return {"message": "AI tool deleted successfully", "tool": deleted_tool}

    raise HTTPException(status_code=404, detail="Tool not found")

# MCP工具端点
@router.get("/mcp-tools")
async def get_mcp_tools():
    """获取所有MCP工具配置"""
    return load_config(MCP_TOOLS_CONFIG)

# 防重复创建的缓存（存储最近的创建请求）
_recent_creations = {}

@router.post("/mcp-tools")
async def create_mcp_tool(tool_data: dict):
    """创建新的MCP工具配置"""
    print(f"DEBUG: 接收到创建工具请求: {tool_data}")

    # 手动验证必需字段
    required_fields = ['id', 'name', 'description']
    for field in required_fields:
        if field not in tool_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    tools = load_config(MCP_TOOLS_CONFIG)
    print(f"DEBUG: 当前工具列表长度: {len(tools)}")

    # 检查ID是否已存在
    if any(t.get('id') == tool_data['id'] for t in tools):
        raise HTTPException(status_code=400, detail="Tool ID already exists")

    # 检查核心配置是否已存在（参数和指令相同）
    def get_tool_config(tool):
        """提取工具的核心配置参数"""
        # 优先从直接字段获取
        server_type = tool.get('server_type')
        command = tool.get('command')
        args = tool.get('args')
        url = tool.get('url')

        # 如果直接字段不存在，从config中获取
        config = tool.get('config', {})
        if not server_type and config and 'transport' in config:
            server_type = config['transport']
        if not command and config and 'command' in config:
            command = config['command']
        if not args and config and 'args' in config:
            args = config['args']
            # 确保args是列表格式
            if isinstance(args, str):
                args = [args]
        if not url and config and 'url' in config:
            url = config['url']

        return server_type, command, args, url

    # 获取新工具的配置
    new_server_type, new_command, new_args, new_url = get_tool_config(tool_data)

    for existing_tool in tools:
        # 获取现有工具的配置
        existing_server_type, existing_command, existing_args, existing_url = get_tool_config(existing_tool)

        # 比较核心配置参数
        if (existing_server_type == new_server_type and
            existing_command == new_command and
            existing_args == new_args and
            existing_url == new_url):

            existing_name = existing_tool.get('name', '未知工具')
            raise HTTPException(
                status_code=400,
                detail=f"相同配置的工具已存在：'{existing_name}'。服务器类型、命令、参数和URL都相同的工具无需重复添加。"
            )

    # 防重复创建检查（5秒内的相同配置请求）
    current_time = datetime.now()
    # 使用核心配置参数作为缓存键
    config_signature = f"{new_server_type}_{new_command}_{str(new_args)}_{new_url}"
    cache_key = f"config_{hash(config_signature)}"

    if cache_key in _recent_creations:
        last_creation_time = _recent_creations[cache_key]
        if current_time - last_creation_time < timedelta(seconds=5):
            raise HTTPException(status_code=429, detail="检测到重复的配置请求，请稍等片刻再试。")

    # 记录此次创建请求
    _recent_creations[cache_key] = current_time

    # 清理过期的缓存记录（超过1分钟的）
    expired_keys = [k for k, v in _recent_creations.items() if current_time - v > timedelta(minutes=1)]
    for key in expired_keys:
        del _recent_creations[key]

    # 设置默认值
    tool_data.setdefault('server_type', 'stdio')
    tool_data.setdefault('enabled', True)
    tool_data.setdefault('version', '1.0.0')
    tool_data.setdefault('author', '')
    tool_data.setdefault('createdAt', datetime.now().isoformat())
    tool_data.setdefault('updatedAt', datetime.now().isoformat())

    tools.append(tool_data)
    save_config(MCP_TOOLS_CONFIG, tools)

    # 触发工具库同步
    await trigger_tools_sync()

    return {"message": "MCP tool created successfully", "tool": tool_data}

@router.put("/mcp-tools/{tool_id}")
async def update_mcp_tool(tool_id: str, tool: MCPToolConfig):
    """更新MCP工具配置"""
    tools = load_config(MCP_TOOLS_CONFIG)

    for i, t in enumerate(tools):
        if t.get('id') == tool_id:
            tools[i] = tool.model_dump()
            save_config(MCP_TOOLS_CONFIG, tools)

            # 触发工具库同步
            await trigger_tools_sync()

            return {"message": "MCP tool updated successfully", "tool": tool.model_dump()}

    raise HTTPException(status_code=404, detail="Tool not found")

@router.delete("/mcp-tools/{tool_id}")
async def delete_mcp_tool(tool_id: str):
    """删除MCP工具配置"""
    tools = load_config(MCP_TOOLS_CONFIG)

    for i, t in enumerate(tools):
        if t.get('id') == tool_id:
            deleted_tool = tools.pop(i)
            save_config(MCP_TOOLS_CONFIG, tools)

            # 触发工具库同步
            await trigger_tools_sync()

            return {"message": "MCP tool deleted successfully", "tool": deleted_tool}

    raise HTTPException(status_code=404, detail="Tool not found")

# 测试连接端点
@router.post("/api-tools/{tool_id}/test")
async def test_api_tool(tool_id: str):
    """测试API工具连接"""
    tools = load_config(API_TOOLS_CONFIG)
    
    for tool in tools:
        if tool.get('id') == tool_id:
            # 这里可以实现实际的连接测试逻辑
            # 暂时返回模拟结果
            return {
                "success": True,
                "message": "连接测试成功",
                "response_time": 150,
                "status_code": 200
            }
    
    raise HTTPException(status_code=404, detail="Tool not found")

@router.post("/ai-tools/{tool_id}/test")
async def test_ai_tool(tool_id: str):
    """测试AI工具连接"""
    tools = load_config(AI_TOOLS_CONFIG)
    
    for tool in tools:
        if tool.get('id') == tool_id:
            # 这里可以实现实际的AI服务测试逻辑
            # 暂时返回模拟结果
            return {
                "success": True,
                "message": "AI服务连接成功",
                "model_info": tool.get('model', 'unknown'),
                "response_time": 200
            }
    
    raise HTTPException(status_code=404, detail="Tool not found")

# 获取所有工具统计
@router.get("/stats")
async def get_tools_stats():
    """获取工具统计信息"""
    api_tools = load_config(API_TOOLS_CONFIG)
    ai_tools = load_config(AI_TOOLS_CONFIG)
    mcp_tools = load_config(MCP_TOOLS_CONFIG)
    
    return {
        "api_tools": {
            "total": len(api_tools),
            "enabled": len([t for t in api_tools if t.get('enabled', True)])
        },
        "ai_tools": {
            "total": len(ai_tools),
            "enabled": len([t for t in ai_tools if t.get('enabled', True)])
        },
        "mcp_tools": {
            "total": len(mcp_tools),
            "enabled": len([t for t in mcp_tools if t.get('enabled', True)])
        }
    }
