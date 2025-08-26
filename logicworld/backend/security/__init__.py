"""
平台安全模块

提供完整的用户认证、API密钥管理和数据保护功能。

主要组件:
- AuthenticationManager: 用户认证管理
- EncryptionManager: 数据加密管理  
- APIKeyManager: API密钥管理
- SecurityDatabaseManager: 安全数据库管理

使用示例:
    from security import get_current_user, get_api_key_manager
    
    # 在FastAPI路由中使用
    @app.get("/protected")
    async def protected_route(user = Depends(get_current_user)):
        return {"user": user}
    
    # 管理API密钥
    api_key_manager = get_api_key_manager()
    encrypted_data = api_key_manager.encrypt_api_key(api_key, user_key)
"""

from .auth import (
    AuthenticationManager,
    UserCreate,
    UserLogin,
    TokenResponse,
    get_current_user,
    get_current_active_user,
    require_role,
    require_permissions
)

from .encryption import (
    EncryptionManager,
    APIKeyManager,
    PasswordManager,
    get_encryption_manager,
    get_api_key_manager
)

from .database import SecurityDatabaseManager

from .api_routes import router as security_router

__all__ = [
    # 认证相关
    'AuthenticationManager',
    'UserCreate',
    'UserLogin', 
    'TokenResponse',
    'get_current_user',
    'get_current_active_user',
    'require_role',
    'require_permissions',
    
    # 加密相关
    'EncryptionManager',
    'APIKeyManager',
    'PasswordManager',
    'get_encryption_manager',
    'get_api_key_manager',
    
    # 数据库相关
    'SecurityDatabaseManager',
    
    # 路由
    'security_router'
]

# 版本信息
__version__ = "1.0.0"
__author__ = "Platform Security Team"
__description__ = "平台安全模块 - 提供用户认证和API密钥管理功能"
