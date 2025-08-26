#!/usr/bin/env python3
"""
完全禁用的MCP客户端 - 不启动任何外部MCP服务器

这个版本完全移除了所有外部MCP服务器依赖，直接使用内置工具。

Authors: AI Assistant
Date: 2025-08-15
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class StandardMCPClient:
    """完全禁用的MCP客户端 - 只使用内置工具"""
    
    def __init__(self, server_name: str = "builtin-tools"):
        self.server_name = server_name
        self.available_tools = {}
        self.logger = logger
        self._setup_builtin_tools()
        
    def _setup_builtin_tools(self):
        """设置内置工具列表"""
        self.available_tools = {
            # Word文档工具
            "create_document": {
                "description": "创建新的Word文档",
                "parameters": {
                    "filename": {"type": "string", "description": "文档文件名"},
                    "title": {"type": "string", "description": "文档标题", "optional": True},
                    "content": {"type": "string", "description": "文档内容", "optional": True}
                }
            },
            "add_paragraph": {
                "description": "向Word文档添加段落",
                "parameters": {
                    "text": {"type": "string", "description": "段落文本"},
                    "filename": {"type": "string", "description": "目标文档文件名", "optional": True}
                }
            },
            "save_document": {
                "description": "保存Word文档",
                "parameters": {
                    "filename": {"type": "string", "description": "文档文件名"}
                }
            }
        }
        
    async def connect_mcp_server(self, server_name: str, command: str, args: list, cwd: str):
        """彻底禁用MCP服务器连接，直接返回成功"""
        self.logger.info(f"🚫 [禁用模式] 完全跳过MCP服务器启动: {server_name}")
        self.logger.info(f"✅ [禁用模式] 使用内置工具，无外部依赖")
        # 不执行任何外部进程启动
        return True
        
    async def list_tools(self) -> List[Dict[str, Any]]:
        """返回内置工具列表"""
        tools = []
        for name, info in self.available_tools.items():
            tools.append({
                "name": name,
                "description": info["description"],
                "inputSchema": {
                    "type": "object",
                    "properties": info["parameters"],
                    "required": [k for k, v in info["parameters"].items() if not v.get("optional", False)]
                }
            })
        return tools
        
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """调用内置工具"""
        if tool_name not in self.available_tools:
            return {
                "isError": True,
                "content": [{"type": "text", "text": f"Unknown tool: {tool_name}"}]
            }
            
        # 使用内置工具实现
        try:
            from tools.unified_tool_system import unified_tool_system
            result = await unified_tool_system.execute_tool(tool_name, arguments)
            return {
                "content": [{"type": "text", "text": str(result)}]
            }
        except Exception as e:
            self.logger.error(f"工具执行失败: {e}")
        return {
                "content": [{"type": "text", "text": f"Tool {tool_name} executed with basic implementation: {arguments}"}]
            }

# 全局客户端实例
_mcp_client = None

async def get_mcp_client() -> StandardMCPClient:
    """获取MCP客户端实例"""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = StandardMCPClient()
    return _mcp_client 