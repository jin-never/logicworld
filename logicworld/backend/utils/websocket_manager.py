"""
WebSocket管理器 - 用于实时通知工具库变更
"""
import json
import asyncio
import logging
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # 存储活跃的WebSocket连接
        self.active_connections: Set[WebSocket] = set()
        # 连接信息
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """接受WebSocket连接"""
        await websocket.accept()
        self.active_connections.add(websocket)
        
        # 存储连接信息
        self.connection_info[websocket] = {
            "client_id": client_id or f"client_{len(self.active_connections)}",
            "connected_at": datetime.now().isoformat(),
            "last_ping": datetime.now().isoformat()
        }
        
        logger.info(f"WebSocket连接已建立: {self.connection_info[websocket]['client_id']}")
        
        # 发送连接确认消息
        await self.send_to_connection(websocket, {
            "type": "connection_established",
            "client_id": self.connection_info[websocket]["client_id"],
            "timestamp": datetime.now().isoformat()
        })
    
    def disconnect(self, websocket: WebSocket):
        """断开WebSocket连接"""
        if websocket in self.active_connections:
            client_info = self.connection_info.get(websocket, {})
            client_id = client_info.get("client_id", "unknown")
            
            self.active_connections.remove(websocket)
            if websocket in self.connection_info:
                del self.connection_info[websocket]
                
            logger.info(f"WebSocket连接已断开: {client_id}")
    
    async def send_to_connection(self, websocket: WebSocket, message: Dict[str, Any]):
        """向特定连接发送消息"""
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"发送WebSocket消息失败: {e}")
            # 如果发送失败，移除连接
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """向所有连接广播消息"""
        if not self.active_connections:
            logger.debug("没有活跃的WebSocket连接，跳过广播")
            return
            
        logger.info(f"广播消息到 {len(self.active_connections)} 个连接: {message.get('type', 'unknown')}")
        
        # 创建要移除的连接列表
        disconnected_connections = []
        
        # 向所有连接发送消息
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"广播消息失败: {e}")
                disconnected_connections.append(connection)
        
        # 移除失败的连接
        for connection in disconnected_connections:
            self.disconnect(connection)
    
    async def send_tool_update_notification(self, source: str, action: str, tool_data: Dict[str, Any] = None):
        """发送工具更新通知"""
        message = {
            "type": "tool_update",
            "source": source,  # ai, mcp, api, system
            "action": action,  # added, updated, removed, synced
            "timestamp": datetime.now().isoformat(),
            "tool_data": tool_data
        }
        
        await self.broadcast(message)
        logger.info(f"已发送工具更新通知: {source} - {action}")
    
    async def send_tools_library_refresh(self, reason: str = "manual"):
        """发送工具库刷新通知"""
        message = {
            "type": "tools_library_refresh",
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.broadcast(message)
        logger.info(f"已发送工具库刷新通知: {reason}")
    
    def get_connection_count(self) -> int:
        """获取活跃连接数"""
        return len(self.active_connections)
    
    def get_connection_info(self) -> List[Dict[str, Any]]:
        """获取所有连接信息"""
        return list(self.connection_info.values())

# 创建全局WebSocket管理器实例
websocket_manager = WebSocketManager()

# 工具同步通知函数
async def notify_tool_change(source: str, action: str, tool_data: Dict[str, Any] = None):
    """通知工具变更"""
    await websocket_manager.send_tool_update_notification(source, action, tool_data)

async def notify_tools_library_refresh(reason: str = "manual"):
    """通知工具库刷新"""
    await websocket_manager.send_tools_library_refresh(reason)

# 便捷的通知函数
async def notify_ai_tools_updated(action: str = "updated", tool_data: Dict[str, Any] = None):
    """通知AI工具更新"""
    await notify_tool_change("ai", action, tool_data)

async def notify_mcp_tools_updated(action: str = "synced", tool_data: Dict[str, Any] = None):
    """通知MCP工具更新"""
    await notify_tool_change("mcp", action, tool_data)

async def notify_api_tools_updated(action: str = "updated", tool_data: Dict[str, Any] = None):
    """通知API工具更新"""
    await notify_tool_change("api", action, tool_data)

async def notify_system_tools_updated(action: str = "updated", tool_data: Dict[str, Any] = None):
    """通知系统工具更新"""
    await notify_tool_change("system", action, tool_data)
