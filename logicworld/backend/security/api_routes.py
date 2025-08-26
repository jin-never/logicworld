"""
平台安全模块 - API路由
提供用户认证、API密钥管理等安全相关的API端点
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
import logging

from .auth import (
    AuthenticationManager, UserCreate, UserLogin, TokenResponse, 
    get_current_user, get_current_active_user, require_role
)
from .encryption import get_api_key_manager
# from .database import SecurityDatabaseManager  # 暂时注释，稍后实现

logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(tags=["security"])

# 数据库管理器 - 暂时使用None，稍后实现
try:
    from .database import SecurityDatabaseManager
    db_manager = SecurityDatabaseManager()
    print("✅ 安全数据库管理器初始化成功")
except Exception as e:
    print(f"⚠️ 安全数据库管理器初始化失败: {e}")
    db_manager = None

# 认证管理器
auth_manager = AuthenticationManager(db_manager)

# API密钥管理器
api_key_manager = get_api_key_manager()


# ============================================================================
# 用户认证相关API
# ============================================================================

class RegisterRequest(BaseModel):
    """用户注册请求"""
    username: str
    email: str
    phone: str
    sms_code: str
    password: str
    confirm_password: str


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    current_password: str
    new_password: str
    confirm_password: str


class UpdateProfileRequest(BaseModel):
    """更新用户资料请求"""
    username: Optional[str] = None
    email: Optional[str] = None
    motto: Optional[str] = None
    avatar: Optional[str] = None


class SecuritySettingsRequest(BaseModel):
    """安全设置请求"""
    twoFactorAuth: Optional[bool] = None
    loginNotifications: Optional[bool] = None
    sessionTimeout: Optional[int] = None


@router.post("/register", response_model=Dict[str, Any])
async def register_user(req: Request):
    """
    用户注册 - 简化版本
    """
    try:
        # 获取原始请求体
        body = await req.body()
        logger.info(f"收到注册请求，原始请求体: {body}")

        # 解析JSON
        import json
        data = json.loads(body)
        logger.info(f"解析后的数据: {data}")

        # 简单验证必需字段
        required_fields = ['username', 'email', 'phone', 'sms_code', 'password', 'confirm_password']
        for field in required_fields:
            if field not in data or not data[field]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"缺少必需字段: {field}"
                )

        # 验证密码确认
        if data['password'] != data['confirm_password']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码确认不匹配"
            )

        # 验证手机号格式
        import re
        if not re.match(r'^1[3-9]\d{9}$', data['phone']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号码格式不正确"
            )

        # 验证短信验证码
        if data['sms_code'] != "123456":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误或已过期"
            )
        # 创建用户
        user_data = UserCreate(
            username=data['username'],
            email=data['email'],
            phone=data['phone'],
            password=data['password']
        )

        client_ip = req.client.host if req.client else None
        result = auth_manager.create_user(user_data, client_ip)

        return {
            "success": True,
            "message": "用户注册成功，请检查邮箱进行验证",
            "user_id": result["user_id"],
            "phone": data['phone']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户注册失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败"
        )


@router.post("/login", response_model=TokenResponse)
async def login_user(request: UserLogin, req: Request):
    """
    用户登录
    """
    try:
        client_ip = req.client.host if req.client else None
        user_agent = req.headers.get("user-agent", "")
        
        return auth_manager.authenticate_user(request, client_ip, user_agent)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户登录失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败"
        )


@router.post("/test-register")
async def test_register(req: Request):
    """测试注册端点 - 用于调试"""
    try:
        body = await req.body()
        logger.info(f"测试注册请求: {body}")
        return {"success": True, "message": "测试成功", "body": body.decode()}
    except Exception as e:
        logger.error(f"测试注册失败: {e}")
        return {"success": False, "error": str(e)}

@router.post("/send-sms-code")
async def send_sms_code(request: Dict[str, str], req: Request):
    """
    发送短信验证码
    """
    try:
        phone = request.get("phone")
        code_type = request.get("type", "login")  # login 或 register

        if not phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号码不能为空"
            )

        # 验证手机号格式
        import re
        if not re.match(r'^1[3-9]\d{9}$', phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号码格式不正确"
            )

        # 这里应该调用短信服务发送验证码
        # 目前返回成功状态，实际项目中需要集成短信服务
        logger.info(f"发送短信验证码到 {phone}，类型: {code_type}")

        return {
            "success": True,
            "message": "验证码发送成功",
            "expires_in": 300  # 5分钟过期
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"发送短信验证码失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="发送验证码失败"
        )


@router.post("/login-sms", response_model=TokenResponse)
async def login_with_sms(request: Dict[str, str], req: Request):
    """
    短信验证码登录
    """
    try:
        phone = request.get("phone")
        sms_code = request.get("sms_code")
        remember_me = request.get("remember_me", False)

        if not phone or not sms_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号码和验证码不能为空"
            )

        # 这里应该验证短信验证码
        # 目前简单验证，实际项目中需要从缓存或数据库验证
        if sms_code != "123456":  # 临时验证码
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误或已过期"
            )

        # 根据手机号查找用户
        if not db_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用"
            )

        # 这里需要实现根据手机号查找用户的逻辑
        # 目前返回错误，提示需要实现
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="短信登录功能尚未完全实现"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"短信验证码登录失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败"
        )


@router.post("/logout")
async def logout_user(req: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    用户登出
    """
    try:
        # 从请求头获取token
        auth_header = req.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证头"
            )
        
        token = auth_header.split(" ")[1]
        client_ip = req.client.host if req.client else None
        
        return auth_manager.logout_user(token, client_ip)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户登出失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登出失败"
        )


@router.get("/user/profile")
async def get_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取当前用户的详细资料
    """
    try:
        if not db_manager:
            # 数据库不可用，返回错误
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用"
            )

        user = db_manager.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        return {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user.get("phone"),
            "role": user["role"],
            "status": user["status"],
            "email_verified": user["email_verified"],
            "two_factor_enabled": user["two_factor_enabled"],
            "created_at": user["created_at"],
            "last_login": user["last_login"]
        }

    except Exception as e:
        logger.error(f"获取用户资料失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户资料失败"
        )


@router.get("/user/storage")
async def get_user_storage(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取用户存储使用情况
    """
    try:
        # 获取用户角色，根据角色设置不同的存储限制
        user_role = current_user.get("role", "user")

        # 根据用户角色设置存储限制
        if user_role == "admin":
            storage_limit = 100.0  # 管理员 100GB
            storage_used = 15.2    # 模拟已使用
        elif user_role == "premium":
            storage_limit = 50.0   # 高级用户 50GB
            storage_used = 8.7     # 模拟已使用
        else:
            storage_limit = 10.0   # 普通用户 10GB
            storage_used = 2.3     # 模拟已使用

        # 计算使用百分比
        usage_percentage = (storage_used / storage_limit) * 100

        return {
            "user_id": current_user["user_id"],
            "used_gb": round(storage_used, 2),
            "limit_gb": round(storage_limit, 2),
            "usage_percentage": round(usage_percentage, 1),
            "available_gb": round(storage_limit - storage_used, 2),
            "last_updated": "2025-07-23T03:45:00Z"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取存储信息失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取存储信息失败"
        )


@router.put("/user/profile")
async def update_user_profile(
    request: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    更新用户资料
    """
    try:
        if not db_manager:
            # 如果数据库管理器不可用，返回成功但不实际更新
            return {
                "success": True,
                "message": "用户资料更新成功（演示模式）"
            }

        user = db_manager.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 准备更新数据
        update_data = {}
        if request.username is not None:
            # 检查用户名是否已被其他用户使用
            existing_user = db_manager.get_user_by_username(request.username)
            if existing_user and existing_user["user_id"] != current_user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="用户名已被使用"
                )
            update_data["username"] = request.username

        if request.email is not None:
            # 检查邮箱是否已被其他用户使用
            existing_user = db_manager.get_user_by_email(request.email)
            if existing_user and existing_user["user_id"] != current_user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="邮箱已被使用"
                )
            update_data["email"] = request.email

        if request.motto is not None:
            update_data["motto"] = request.motto

        if request.avatar is not None:
            update_data["avatar"] = request.avatar

        # 更新用户资料
        if update_data:
            db_manager.update_user_profile(current_user["user_id"], update_data)

        return {
            "success": True,
            "message": "用户资料更新成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户资料更新失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="用户资料更新失败"
        )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    修改密码
    """
    try:
        # 验证新密码确认
        if request.new_password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="新密码确认不匹配"
            )
        
        # 验证当前密码
        user = db_manager.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        from .encryption import PasswordManager
        password_manager = PasswordManager()
        
        if not password_manager.verify_password(
            request.current_password, user["salt"], user["password_hash"]
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="当前密码错误"
            )
        
        # 生成新密码哈希
        new_salt = password_manager.generate_salt()
        new_password_hash = password_manager.hash_password(request.new_password, new_salt)
        
        # 更新密码
        db_manager.update_user_password(current_user["user_id"], new_password_hash, new_salt)
        
        return {"success": True, "message": "密码修改成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"密码修改失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码修改失败"
        )


@router.get("/settings")
async def get_security_settings(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取用户安全设置
    """
    try:
        if not db_manager:
            # 数据库不可用，返回错误
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用"
            )

        user = db_manager.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 获取用户安全设置
        settings = db_manager.get_user_security_settings(current_user["user_id"])

        return {
            "twoFactorAuth": user.get("two_factor_enabled", False),
            "loginNotifications": settings.get("login_notifications", True),
            "sessionTimeout": settings.get("session_timeout", 24),
            "passwordLastChanged": user.get("password_changed_at", "2024-06-01"),
            "trustedDevices": settings.get("trusted_devices_count", 0)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取安全设置失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取安全设置失败"
        )


@router.put("/settings")
async def update_security_settings(
    request: SecuritySettingsRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    更新用户安全设置
    """
    try:
        if not db_manager:
            # 数据库不可用，返回错误
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用"
            )

        user = db_manager.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 准备更新数据
        update_data = {}
        if request.twoFactorAuth is not None:
            update_data["two_factor_enabled"] = request.twoFactorAuth

        if request.loginNotifications is not None:
            update_data["login_notifications"] = request.loginNotifications

        if request.sessionTimeout is not None:
            update_data["session_timeout"] = request.sessionTimeout

        # 更新安全设置
        if update_data:
            db_manager.update_user_security_settings(current_user["user_id"], update_data)

        return {
            "success": True,
            "message": "安全设置更新成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"安全设置更新失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="安全设置更新失败"
        )


# ============================================================================
# 安全审计相关API
# ============================================================================

@router.get("/audit-logs")
async def get_audit_logs(
    timeRange: str = "7d",
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取安全审计日志
    """
    try:
        if not db_manager:
            # 数据库不可用，返回错误
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用，无法获取审计日志"
            )

        # 获取审计日志
        logs = db_manager.get_user_audit_logs(current_user["user_id"], timeRange)

        return {"logs": logs}

    except Exception as e:
        logger.error(f"获取审计日志失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审计日志失败"
        )


@router.get("/threat-detection")
async def get_threat_detection(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取威胁检测数据
    """
    try:
        if not db_manager:
            # 数据库不可用，返回错误
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用，无法获取威胁检测数据"
            )

        # 获取威胁检测数据
        detection_data = db_manager.get_threat_detection_data(current_user["user_id"])

        return detection_data

    except Exception as e:
        logger.error(f"获取威胁检测数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取威胁检测数据失败"
        )


@router.get("/login-history")
async def get_login_history(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取登录历史
    """
    try:
        if not db_manager:
            # 数据库不可用，返回错误
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用，无法获取登录历史"
            )

        # 获取登录历史
        history = db_manager.get_user_login_history(current_user["user_id"])

        return {"history": history}

    except Exception as e:
        logger.error(f"获取登录历史失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取登录历史失败"
        )


@router.get("/encryption-status")
async def get_encryption_status(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取加密状态
    """
    try:
        if not db_manager:
            # 数据库不可用，返回错误
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务不可用，无法获取加密状态"
            )

        # 获取加密状态
        encryption_status = db_manager.get_encryption_status(current_user["user_id"])

        return encryption_status

    except Exception as e:
        logger.error(f"获取加密状态失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取加密状态失败"
        )


# ============================================================================
# API密钥管理相关API
# ============================================================================

class APIKeyCreateRequest(BaseModel):
    """API密钥创建请求"""
    service_name: str
    service_type: str
    key_name: str
    api_key: str
    expires_at: Optional[str] = None


class APIKeyResponse(BaseModel):
    """API密钥响应"""
    id: int
    service_name: str
    service_type: str
    key_name: str
    key_status: str
    created_at: str
    last_used: Optional[str] = None
    expires_at: Optional[str] = None


class APIKeyUpdateRequest(BaseModel):
    """API密钥更新请求"""
    key_name: Optional[str] = None
    api_key: Optional[str] = None
    expires_at: Optional[str] = None


@router.post("/api-keys", response_model=Dict[str, Any])
async def create_api_key(
    request: APIKeyCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    创建API密钥
    """
    try:
        # 获取用户加密密钥
        user_encryption_key = db_manager.get_user_encryption_key(current_user["user_id"])
        if not user_encryption_key:
            # 为用户生成新的加密密钥
            from .encryption import get_encryption_manager
            encryption_manager = get_encryption_manager()
            user_key = encryption_manager.generate_key("user")
            key_id = db_manager.create_encryption_key(user_key, "user")
            db_manager.assign_user_encryption_key(current_user["user_id"], key_id)
            user_encryption_key = user_key
        
        # 加密API密钥
        encrypted_data = api_key_manager.encrypt_api_key(request.api_key, user_encryption_key)
        
        # 保存到数据库
        api_key_id = db_manager.create_api_key(
            user_id=current_user["user_id"],
            service_name=request.service_name,
            service_type=request.service_type,
            key_name=request.key_name,
            encrypted_api_key=encrypted_data["encrypted_api_key"],
            iv=encrypted_data["iv"],
            key_hash=encrypted_data["key_hash"],
            expires_at=request.expires_at
        )
        
        return {
            "success": True,
            "message": "API密钥创建成功",
            "api_key_id": api_key_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API密钥创建失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API密钥创建失败"
        )


@router.get("/api-keys", response_model=List[APIKeyResponse])
async def list_api_keys(
    service_name: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    获取用户的API密钥列表
    """
    try:
        api_keys = db_manager.get_user_api_keys(current_user["user_id"], service_name)
        
        return [
            APIKeyResponse(
                id=key["id"],
                service_name=key["service_name"],
                service_type=key["service_type"],
                key_name=key["key_name"],
                key_status=key["key_status"],
                created_at=key["created_at"],
                last_used=key["last_used"],
                expires_at=key["expires_at"]
            )
            for key in api_keys
        ]
        
    except Exception as e:
        logger.error(f"获取API密钥列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取API密钥列表失败"
        )


@router.get("/api-keys/{api_key_id}/decrypt")
async def decrypt_api_key(
    api_key_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    解密API密钥（仅返回给密钥所有者）
    """
    try:
        # 获取API密钥信息
        api_key_info = db_manager.get_api_key_by_id(api_key_id)
        if not api_key_info or api_key_info["user_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        
        # 获取用户加密密钥
        user_encryption_key = db_manager.get_user_encryption_key(current_user["user_id"])
        if not user_encryption_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="用户加密密钥不存在"
            )
        
        # 解密API密钥
        encrypted_data = {
            "encrypted_api_key": api_key_info["encrypted_api_key"],
            "iv": api_key_info["iv"],
            "key_hash": api_key_info["key_hash"]
        }
        
        decrypted_key = api_key_manager.decrypt_api_key(encrypted_data, user_encryption_key)
        
        # 更新使用时间
        db_manager.update_api_key_usage(api_key_id)
        
        return {
            "api_key": decrypted_key,
            "service_name": api_key_info["service_name"],
            "key_name": api_key_info["key_name"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API密钥解密失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API密钥解密失败"
        )


@router.put("/api-keys/{api_key_id}")
async def update_api_key(
    api_key_id: int,
    request: APIKeyUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    更新API密钥
    """
    try:
        # 验证密钥所有权
        api_key_info = db_manager.get_api_key_by_id(api_key_id)
        if not api_key_info or api_key_info["user_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        
        update_data = {}
        
        # 如果要更新API密钥值
        if request.api_key:
            user_encryption_key = db_manager.get_user_encryption_key(current_user["user_id"])
            encrypted_data = api_key_manager.encrypt_api_key(request.api_key, user_encryption_key)
            update_data.update(encrypted_data)
        
        # 更新其他字段
        if request.key_name:
            update_data["key_name"] = request.key_name
        if request.expires_at:
            update_data["expires_at"] = request.expires_at
        
        # 执行更新
        db_manager.update_api_key(api_key_id, update_data)
        
        return {"success": True, "message": "API密钥更新成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API密钥更新失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API密钥更新失败"
        )


@router.delete("/api-keys/{api_key_id}")
async def delete_api_key(
    api_key_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    删除API密钥
    """
    try:
        # 验证密钥所有权
        api_key_info = db_manager.get_api_key_by_id(api_key_id)
        if not api_key_info or api_key_info["user_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        
        # 删除密钥
        db_manager.delete_api_key(api_key_id)
        
        return {"success": True, "message": "API密钥删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API密钥删除失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API密钥删除失败"
        )


@router.delete("/delete-account")
async def delete_account(
    req: Request,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    删除用户账户
    """
    try:
        user_id = current_user["user_id"]
        client_ip = req.client.host if req.client else None

        logger.info(f"用户 {user_id} 请求删除账户")

        # 记录安全事件
        auth_manager._log_security_event(
            user_id=user_id,
            event_type="account_deletion",
            event_category="account_management",
            description="用户请求删除账户",
            ip_address=client_ip
        )

        # 删除用户相关的所有数据
        # 1. 删除API密钥
        try:
            api_keys = db_manager.get_user_api_keys(user_id)
            for key in api_keys:
                db_manager.delete_api_key(key["id"])
        except Exception as e:
            logger.warning(f"删除用户API密钥时出错: {e}")

        # 2. 删除会话
        try:
            auth_manager._invalidate_all_user_sessions(user_id)
        except Exception as e:
            logger.warning(f"删除用户会话时出错: {e}")

        # 3. 删除用户记录
        success = db_manager.delete_user(user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除用户记录失败"
            )

        logger.info(f"用户 {user_id} 账户删除成功")

        return {
            "success": True,
            "message": "账户删除成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除账户失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除账户失败"
        )


# ============================================================================
# 管理员API
# ============================================================================

@router.get("/admin/users", dependencies=[Depends(require_role("admin"))])
async def list_all_users():
    """
    获取所有用户列表（管理员专用）
    """
    try:
        users = db_manager.get_all_users()
        return users
        
    except Exception as e:
        logger.error(f"获取用户列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户列表失败"
        )


@router.get("/admin/audit-logs", dependencies=[Depends(require_role("admin"))])
async def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    event_type: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    获取安全审计日志（管理员专用）
    """
    try:
        logs = db_manager.get_audit_logs(limit, offset, event_type, user_id)
        return logs
        
    except Exception as e:
        logger.error(f"获取审计日志失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审计日志失败"
        )
