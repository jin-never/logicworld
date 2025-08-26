"""
用户设置API - 处理用户偏好设置和工作区设置
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import json
import logging

# 导入安全模块
try:
    from security.auth import get_current_active_user
except ImportError:
    # 如果安全模块不可用，创建一个简单的依赖
    def get_current_active_user():
        return {"user_id": "demo_user", "username": "演示用户"}

logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(tags=["user-settings"])


class UserPreferencesRequest(BaseModel):
    """用户偏好设置请求"""
    theme: Optional[str] = None
    language: Optional[str] = None
    autoSave: Optional[bool] = None
    notifications: Optional[bool] = None
    defaultView: Optional[str] = None
    shortcuts: Optional[Dict[str, str]] = None


class WorkspaceSettingsRequest(BaseModel):
    """工作区设置请求"""
    defaultPath: Optional[str] = None
    autoOrganize: Optional[bool] = None
    fileNaming: Optional[str] = None
    backupEnabled: Optional[bool] = None
    syncEnabled: Optional[bool] = None
    exportFormats: Optional[list] = None


# 简单的内存存储（实际应用中应该使用数据库）
user_preferences_store = {}
workspace_settings_store = {}


@router.get("/user-preferences")
async def get_user_preferences(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取用户偏好设置
    """
    try:
        user_id = current_user["user_id"]
        
        # 从存储中获取用户偏好设置，如果没有则返回空
        preferences = user_preferences_store.get(user_id, {})
        
        return {
            "success": True,
            "preferences": preferences
        }
        
    except Exception as e:
        logger.error(f"获取用户偏好设置失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户偏好设置失败"
        )


@router.post("/user-preferences")
async def update_user_preferences(
    request: UserPreferencesRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    更新用户偏好设置
    """
    try:
        user_id = current_user["user_id"]
        
        # 获取当前设置
        current_preferences = user_preferences_store.get(user_id, {})
        
        # 更新设置
        update_data = request.dict(exclude_unset=True)
        current_preferences.update(update_data)
        
        # 保存到存储
        user_preferences_store[user_id] = current_preferences
        
        logger.info(f"用户 {user_id} 的偏好设置已更新: {update_data}")
        
        return {
            "success": True,
            "message": "用户偏好设置更新成功",
            "preferences": current_preferences
        }
        
    except Exception as e:
        logger.error(f"更新用户偏好设置失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新用户偏好设置失败"
        )


@router.get("/workspace-settings")
async def get_workspace_settings(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取工作区设置
    """
    try:
        user_id = current_user["user_id"]
        
        # 从存储中获取工作区设置，如果没有则返回空
        settings = workspace_settings_store.get(user_id, {})
        
        return {
            "success": True,
            "settings": settings
        }
        
    except Exception as e:
        logger.error(f"获取工作区设置失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取工作区设置失败"
        )


@router.post("/workspace-settings")
async def update_workspace_settings(
    request: WorkspaceSettingsRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    更新工作区设置
    """
    try:
        user_id = current_user["user_id"]
        
        # 获取当前设置
        current_settings = workspace_settings_store.get(user_id, {})
        
        # 更新设置
        update_data = request.dict(exclude_unset=True)
        current_settings.update(update_data)
        
        # 保存到存储
        workspace_settings_store[user_id] = current_settings
        
        logger.info(f"用户 {user_id} 的工作区设置已更新: {update_data}")
        
        return {
            "success": True,
            "message": "工作区设置更新成功",
            "settings": current_settings
        }
        
    except Exception as e:
        logger.error(f"更新工作区设置失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新工作区设置失败"
        )


@router.delete("/user-data")
async def clear_user_data(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    清除用户数据（用于测试或重置）
    """
    try:
        user_id = current_user["user_id"]
        
        # 清除用户数据
        user_preferences_store.pop(user_id, None)
        workspace_settings_store.pop(user_id, None)
        
        logger.info(f"用户 {user_id} 的数据已清除")
        
        return {
            "success": True,
            "message": "用户数据已清除"
        }
        
    except Exception as e:
        logger.error(f"清除用户数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="清除用户数据失败"
        )


@router.get("/user-data/export")
async def export_user_data(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    导出用户数据
    """
    try:
        user_id = current_user["user_id"]
        
        # 收集用户数据
        user_data = {
            "user_id": user_id,
            "preferences": user_preferences_store.get(user_id, {}),
            "workspace_settings": workspace_settings_store.get(user_id, {}),
            "export_timestamp": "2024-07-22T17:45:00Z"
        }
        
        return {
            "success": True,
            "data": user_data
        }
        
    except Exception as e:
        logger.error(f"导出用户数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="导出用户数据失败"
        )
