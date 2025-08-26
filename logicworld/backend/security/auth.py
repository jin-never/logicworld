"""
平台安全模块 - 用户认证和会话管理
提供完整的用户认证、JWT令牌管理和会话控制功能
"""

import os
import jwt
import uuid
import hashlib
import secrets
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import logging

from .encryption import PasswordManager, get_encryption_manager

logger = logging.getLogger(__name__)

# JWT配置
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

# 安全配置
MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
ACCOUNT_LOCKOUT_MINUTES = int(os.getenv("ACCOUNT_LOCKOUT_MINUTES", "30"))

# HTTP Bearer认证
security = HTTPBearer()


def simple_verify_password(password: str, salt: str, stored_hash: str) -> bool:
    """
    简单密码验证 - 兼容现有数据库中的SHA256哈希
    """
    computed_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return computed_hash == stored_hash


class UserCreate(BaseModel):
    """用户创建模型"""
    username: str
    email: str
    phone: Optional[str] = None
    password: str
    role: str = "user"


class UserLogin(BaseModel):
    """用户登录模型"""
    username: str
    password: str
    remember_me: bool = False


class UserResponse(BaseModel):
    """用户响应模型"""
    user_id: str
    username: str
    email: str
    role: str
    status: str
    email_verified: bool
    two_factor_enabled: bool
    created_at: str
    last_login: Optional[str] = None


class TokenResponse(BaseModel):
    """令牌响应模型"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class SessionInfo(BaseModel):
    """会话信息模型"""
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    created_at: str
    expires_at: str
    last_activity: str
    is_active: bool


class AuthenticationManager:
    """认证管理器 - 处理用户认证和会话管理"""
    
    def __init__(self, db_manager=None):
        """
        初始化认证管理器
        
        Args:
            db_manager: 数据库管理器实例
        """
        self.db_manager = db_manager
        self.password_manager = PasswordManager()
        self.encryption_manager = get_encryption_manager()
    
    def create_user(self, user_data: UserCreate, ip_address: str = None) -> Dict[str, Any]:
        """
        创建新用户
        
        Args:
            user_data: 用户创建数据
            ip_address: 客户端IP地址
            
        Returns:
            创建的用户信息
        """
        try:
            # 验证用户名和邮箱是否已存在
            if self._user_exists(user_data.username, user_data.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="用户名或邮箱已存在"
                )
            
            # 验证密码强度
            self._validate_password_strength(user_data.password)
            
            # 生成用户ID和密码哈希
            user_id = str(uuid.uuid4())
            salt = self.password_manager.generate_salt()
            password_hash = self.password_manager.hash_password(user_data.password, salt)
            
            # 生成邮箱验证令牌
            email_verification_token = self.password_manager.generate_secure_token()
            email_verification_expires = datetime.now() + timedelta(hours=24)
            
            # 创建用户记录
            user_record = {
                "user_id": user_id,
                "username": user_data.username,
                "email": user_data.email,
                "phone": user_data.phone,
                "password_hash": password_hash,
                "salt": salt,
                "role": user_data.role,
                "status": "active",
                "email_verified": False,
                "two_factor_enabled": False,
                "email_verification_token": email_verification_token,
                "email_verification_expires": email_verification_expires.isoformat(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # 保存到数据库
            if self.db_manager:
                self.db_manager.create_user(user_record)
            
            # 记录安全事件
            self._log_security_event(
                user_id=user_id,
                event_type="user_registration",
                event_category="authentication",
                description=f"新用户注册: {user_data.username}",
                ip_address=ip_address
            )
            
            return {
                "user_id": user_id,
                "username": user_data.username,
                "email": user_data.email,
                "email_verification_token": email_verification_token
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"用户创建失败: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="用户创建失败"
            )
    
    def authenticate_user(self, login_data: UserLogin, ip_address: str = None, 
                         user_agent: str = None) -> TokenResponse:
        """
        用户认证登录
        
        Args:
            login_data: 登录数据
            ip_address: 客户端IP地址
            user_agent: 用户代理
            
        Returns:
            认证令牌和用户信息
        """
        try:
            # 获取用户信息
            user = self._get_user_by_username(login_data.username)
            if not user:
                self._log_security_event(
                    event_type="login_failed",
                    event_category="authentication",
                    description=f"登录失败: 用户不存在 - {login_data.username}",
                    ip_address=ip_address
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="用户名或密码错误"
                )
            
            # 检查账户状态
            if user["status"] != "active":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="账户已被禁用"
                )
            
            # 检查账户是否被锁定
            if self._is_account_locked(user):
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="账户已被锁定，请稍后再试"
                )
            
            # 验证密码 - 使用PasswordManager与注册时一致
            if not self.password_manager.verify_password(
                login_data.password, user["salt"], user["password_hash"]
            ):
                # 增加登录失败次数
                self._increment_login_attempts(user["user_id"])
                
                self._log_security_event(
                    user_id=user["user_id"],
                    event_type="login_failed",
                    event_category="authentication",
                    description=f"登录失败: 密码错误 - {login_data.username}",
                    ip_address=ip_address
                )
                
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="用户名或密码错误"
                )
            
            # 重置登录失败次数
            self._reset_login_attempts(user["user_id"])
            
            # 生成JWT令牌
            token_data = {
                "user_id": user["user_id"],
                "username": user["username"],
                "role": user["role"],
                "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
            }
            
            access_token = jwt.encode(token_data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            
            # 创建会话
            session_id = self._create_session(
                user["user_id"], access_token, ip_address, user_agent
            )
            
            # 更新最后登录时间
            self._update_last_login(user["user_id"])
            
            # 记录成功登录事件
            self._log_security_event(
                user_id=user["user_id"],
                event_type="login_success",
                event_category="authentication",
                description=f"用户登录成功: {login_data.username}",
                ip_address=ip_address,
                session_id=session_id
            )
            
            # 构建用户响应
            user_response = UserResponse(
                user_id=user["user_id"],
                username=user["username"],
                email=user["email"],
                role=user["role"],
                status=user["status"],
                email_verified=user["email_verified"],
                two_factor_enabled=user["two_factor_enabled"],
                created_at=user["created_at"],
                last_login=datetime.now().isoformat()
            )
            
            return TokenResponse(
                access_token=access_token,
                expires_in=JWT_EXPIRATION_HOURS * 3600,
                user=user_response
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"用户认证失败: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="认证失败"
            )
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        验证JWT令牌
        
        Args:
            token: JWT令牌
            
        Returns:
            令牌中的用户信息
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # 检查令牌是否过期
            exp = payload.get("exp")
            if exp and datetime.utcnow().timestamp() > exp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="令牌已过期"
                )
            
            # 验证会话是否有效
            user_id = payload.get("user_id")
            if not self._is_session_valid(user_id, token):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="会话无效"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌已过期"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效令牌"
            )
    
    def logout_user(self, token: str, ip_address: str = None) -> Dict[str, str]:
        """
        用户登出
        
        Args:
            token: JWT令牌
            ip_address: 客户端IP地址
            
        Returns:
            登出结果
        """
        try:
            # 验证令牌
            payload = self.verify_token(token)
            user_id = payload["user_id"]
            
            # 使会话失效
            self._invalidate_session(user_id, token)
            
            # 记录登出事件
            self._log_security_event(
                user_id=user_id,
                event_type="logout",
                event_category="authentication",
                description="用户登出",
                ip_address=ip_address
            )
            
            return {"message": "登出成功"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"用户登出失败: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="登出失败"
            )
    
    # 私有方法 - 数据库操作和工具方法
    def _user_exists(self, username: str, email: str) -> bool:
        """检查用户是否已存在"""
        if self.db_manager:
            return self.db_manager.user_exists(username, email)
        return False
    
    def _validate_password_strength(self, password: str) -> None:
        """验证密码强度"""
        if len(password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码长度至少8位"
            )
        
        if not any(c.isupper() for c in password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码必须包含大写字母"
            )
        
        if not any(c.islower() for c in password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码必须包含小写字母"
            )
        
        if not any(c.isdigit() for c in password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码必须包含数字"
            )
    
    def _get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """根据用户名获取用户信息"""
        if self.db_manager:
            return self.db_manager.get_user_by_username(username)
        return None
    
    def _is_account_locked(self, user: Dict[str, Any]) -> bool:
        """检查账户是否被锁定"""
        locked_until = user.get("locked_until")
        if locked_until:
            locked_until_dt = datetime.fromisoformat(locked_until)
            return datetime.now() < locked_until_dt
        return False
    
    def _increment_login_attempts(self, user_id: str) -> None:
        """增加登录失败次数"""
        if self.db_manager:
            self.db_manager.increment_login_attempts(user_id, MAX_LOGIN_ATTEMPTS, ACCOUNT_LOCKOUT_MINUTES)
    
    def _reset_login_attempts(self, user_id: str) -> None:
        """重置登录失败次数"""
        if self.db_manager:
            self.db_manager.reset_login_attempts(user_id)
    
    def _create_session(self, user_id: str, token: str, ip_address: str, user_agent: str) -> str:
        """创建用户会话"""
        session_id = str(uuid.uuid4())
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        if self.db_manager:
            self.db_manager.create_session(session_id, user_id, token_hash, ip_address, user_agent)
        
        return session_id
    
    def _is_session_valid(self, user_id: str, token: str) -> bool:
        """检查会话是否有效"""
        if self.db_manager:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            return self.db_manager.is_session_valid(user_id, token_hash)
        return True
    
    def _invalidate_session(self, user_id: str, token: str) -> None:
        """使会话失效"""
        if self.db_manager:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            self.db_manager.invalidate_session(user_id, token_hash)

    def _invalidate_all_user_sessions(self, user_id: str) -> None:
        """使用户的所有会话失效"""
        if self.db_manager:
            self.db_manager.invalidate_all_user_sessions(user_id)
    
    def _update_last_login(self, user_id: str) -> None:
        """更新最后登录时间"""
        if self.db_manager:
            self.db_manager.update_last_login(user_id)
    
    def _log_security_event(self, event_type: str, event_category: str, description: str,
                           user_id: str = None, ip_address: str = None, session_id: str = None) -> None:
        """记录安全事件"""
        if self.db_manager:
            self.db_manager.log_security_event(
                event_type, event_category, description, user_id, ip_address, session_id
            )


# 依赖注入函数
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """获取当前认证用户"""
    auth_manager = AuthenticationManager()
    return auth_manager.verify_token(credentials.credentials)


async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """获取当前活跃用户"""
    # 这里可以添加额外的用户状态检查
    return current_user


# 权限检查装饰器
def require_role(required_role: str):
    """要求特定角色的装饰器"""
    def decorator(current_user: Dict[str, Any] = Depends(get_current_user)):
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        return current_user
    return decorator


def require_permissions(required_permissions: List[str]):
    """要求特定权限的装饰器"""
    def decorator(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_role = current_user.get("role")
        # 这里需要根据角色获取权限列表进行检查
        # 简化实现，管理员拥有所有权限
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        return current_user
    return decorator
