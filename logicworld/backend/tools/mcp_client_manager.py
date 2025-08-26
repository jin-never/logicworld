"""
MCP客户端管理器 - 使用标准MCP协议管理和调用MCP服务器
"""
import asyncio
import json
import subprocess
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
from .standard_mcp_client import StandardMCPClient


class MCPClientManager:
    """MCP客户端管理器 - 使用简化的内置工具系统"""
    
    def __init__(self):
        self.clients = {}
        self.available_tools = {}
        self.logger = logging.getLogger(__name__)
        self.initialized = False

    async def initialize(self) -> bool:
        """初始化MCP客户端管理器 - 使用简化模式"""
        try:
            self.logger.info("🚀 [简化模式] 初始化MCP客户端管理器...")
            
            # 使用简化的内置工具系统，跳过外部MCP服务器
            from tools.standard_mcp_client import get_mcp_client
            
            # 获取内置工具客户端
            builtin_client = await get_mcp_client()
            self.clients["builtin-tools"] = builtin_client
            
            # 注册内置工具
            tools = await builtin_client.list_tools()
            for tool in tools:
                self.available_tools[tool["name"]] = {
                    "client": "builtin-tools",
                    "schema": tool
                }
            
            self.logger.info(f"✅ [简化模式] MCP客户端管理器初始化完成")
            self.logger.info(f"📦 [简化模式] 注册了 {len(self.available_tools)} 个内置工具")
            self.logger.info(f"🔧 [简化模式] 可用工具: {list(self.available_tools.keys())}")
            
            self.initialized = True
            return True

        except Exception as e:
            self.logger.error(f"❌ [简化模式] MCP客户端管理器初始化失败: {e}")
            self.initialized = False
            return False
    
    async def register_word_mcp_server(self) -> bool:
        """注册Word MCP服务器 - 简化版本，直接使用内置工具"""
        try:
            self.logger.info("🚀 [简化模式] 使用内置Word工具，跳过MCP服务器")
            
            # 内置Word工具已在initialize中注册
            word_tools = [name for name in self.available_tools.keys() 
                         if name in ["create_document", "open_document", "save_document", 
                                   "add_paragraph", "add_heading", "add_table", "format_text"]]
            
            self.logger.info(f"✅ [简化模式] Word工具注册完成，共 {len(word_tools)} 个工具")
            return True
                
        except Exception as e:
            self.logger.error(f"❌ [简化模式] Word工具注册失败: {e}")
            return False

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """调用工具 - 使用简化的内置工具系统"""
        try:
            if tool_name not in self.available_tools:
                return {
                    "content": [{"type": "text", "text": f"❌ 未知工具: {tool_name}"}],
                    "isError": True
                }
            
            client_name = self.available_tools[tool_name]["client"]
            client = self.clients[client_name]
            
            result = await client.call_tool(tool_name, arguments)
            return result
                
        except Exception as e:
            self.logger.error(f"❌ 工具调用失败: {tool_name}, 错误: {e}")
            return {
                "content": [{"type": "text", "text": f"❌ 工具执行失败: {str(e)}"}],
                "isError": True
            }

    def get_available_tools(self) -> Dict[str, Any]:
        """获取可用工具列表"""
        return self.available_tools.copy()

    async def close_all(self):
        """关闭所有客户端连接"""
        for client in self.clients.values():
            try:
                await client.close()
            except Exception as e:
                self.logger.error(f"关闭客户端时出错: {e}")
        
        self.clients.clear()
        self.available_tools.clear()
        self.logger.info("🔚 [简化模式] 所有MCP客户端已关闭") 