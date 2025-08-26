#!/usr/bin/env python3
"""
简单的安全API模块
提供用户注册、登录、登出功能
"""

import os
import sqlite3
import hashlib
import secrets
import uuid
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from rbac_system import rbac_manager, Role, Permission, check_user_permission
from data_encryption import mask_user_data
from security_monitoring import security_monitor, log_login_success, log_login_failure

# 创建路由器
router = APIRouter()

# 安全配置
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
DB_PATH = "security.db"

# 安全方案
security = HTTPBearer()

# 数据模型
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    confirm_password: Optional[str] = None
    sms_code: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    remember_me: Optional[bool] = False

class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    role: str
    status: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# 数据库操作
def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """初始化数据库"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 创建users表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        email_verified INTEGER DEFAULT 0,
        phone_verified INTEGER DEFAULT 0,
        two_factor_enabled INTEGER DEFAULT 0,
        login_attempts INTEGER DEFAULT 0,
        last_login_attempt TEXT,
        account_locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        last_login TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

# 密码处理
def hash_password(password: str, salt: str) -> str:
    """哈希密码"""
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(password: str, salt: str, password_hash: str) -> bool:
    """验证密码"""
    return hash_password(password, salt) == password_hash

# JWT处理
def create_access_token(data: dict) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """验证令牌"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证凭据",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )

# API端点
@router.get("/csrf-token")
async def get_csrf_token():
    """获取CSRF令牌"""
    import secrets
    token = secrets.token_urlsafe(32)
    return {"csrf_token": token}

@router.post("/register", response_model=dict)
async def register_user(user_data: UserRegister):
    """用户注册"""
    # 验证密码确认
    if user_data.confirm_password and user_data.password != user_data.confirm_password:
        raise HTTPException(status_code=400, detail="密码确认不匹配")
    
    # 验证密码强度
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="密码长度至少8位")
    
    # 初始化数据库
    init_database()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查用户名是否已存在
        cursor.execute("SELECT username FROM users WHERE username = ?", (user_data.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="用户名已存在")
        
        # 检查邮箱是否已存在
        cursor.execute("SELECT email FROM users WHERE email = ?", (user_data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="邮箱已被注册")
        
        # 生成盐值和密码哈希
        salt = secrets.token_hex(16)
        password_hash = hash_password(user_data.password, salt)
        
        # 生成用户ID
        user_id = str(uuid.uuid4())
        
        # 获取当前时间
        now = datetime.now().isoformat()
        
        # 创建新用户
        cursor.execute('''
        INSERT INTO users (
            user_id, username, email, phone, password_hash, salt,
            role, status, email_verified, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, user_data.username, user_data.email, user_data.phone,
            password_hash, salt, 'user', 'active', 1, now
        ))

        conn.commit()

        # 为新用户分配默认角色
        rbac_manager.assign_role_to_user(user_id, Role.USER)

        return {
            "success": True,
            "message": "注册成功！请使用新账户登录。",
            "user_id": user_id
        }
        
    except sqlite3.IntegrityError as e:
        raise HTTPException(status_code=400, detail="注册失败：数据冲突")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"注册失败：{str(e)}")
    finally:
        conn.close()

@router.post("/login", response_model=LoginResponse)
async def login_user(user_data: UserLogin, request: Request):
    """用户登录"""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")

    # 检查IP是否在黑名单中
    if security_monitor.is_ip_blacklisted(client_ip):
        log_login_failure(client_ip, user_agent, user_data.username)
        raise HTTPException(status_code=403, detail="IP地址已被封禁")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 查找用户
        cursor.execute("""
        SELECT user_id, username, email, password_hash, salt, role, status
        FROM users WHERE username = ?
        """, (user_data.username,))

        user = cursor.fetchone()
        if not user:
            log_login_failure(client_ip, user_agent, user_data.username)
            raise HTTPException(status_code=401, detail="用户名或密码错误")

        # 验证密码
        if not verify_password(user_data.password, user['salt'], user['password_hash']):
            log_login_failure(client_ip, user_agent, user_data.username)
            raise HTTPException(status_code=401, detail="用户名或密码错误")

        # 检查用户状态
        if user['status'] != 'active':
            log_login_failure(client_ip, user_agent, user_data.username)
            raise HTTPException(status_code=401, detail="账户已被禁用")

        # 更新最后登录时间
        now = datetime.now().isoformat()
        cursor.execute("UPDATE users SET last_login = ? WHERE user_id = ?", (now, user['user_id']))
        conn.commit()

        # 记录登录成功事件
        log_login_success(user['user_id'], client_ip, user_agent)

        # 创建访问令牌
        access_token = create_access_token(data={"sub": user['user_id'], "username": user['username']})

        # 构建用户响应
        user_response = UserResponse(
            user_id=user['user_id'],
            username=user['username'],
            email=user['email'],
            role=user['role'],
            status=user['status']
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"登录失败：{str(e)}")
    finally:
        conn.close()

@router.post("/logout")
async def logout_user(current_user: dict = Depends(verify_token)):
    """用户登出"""
    # 简单的登出响应（实际应用中可能需要令牌黑名单）
    return {"success": True, "message": "登出成功"}

@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: dict = Depends(verify_token)):
    """获取当前用户信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
        SELECT user_id, username, email, role, status 
        FROM users WHERE user_id = ?
        """, (current_user['sub'],))
        
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        return UserResponse(
            user_id=user['user_id'],
            username=user['username'],
            email=user['email'],
            role=user['role'],
            status=user['status']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户信息失败：{str(e)}")
    finally:
        conn.close()

@router.get("/users", response_model=list)
async def list_users(current_user: dict = Depends(verify_token)):
    """获取用户列表（需要管理员权限）"""
    # 检查权限
    if not check_user_permission(current_user['sub'], Permission.ADMIN_USERS):
        raise HTTPException(status_code=403, detail="权限不足")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
        SELECT user_id, username, email, role, status, created_at, last_login
        FROM users ORDER BY created_at DESC
        """)

        users = []
        for row in cursor.fetchall():
            user_data = dict(row)
            # 脱敏敏感信息
            user_data = mask_user_data(user_data)
            users.append(user_data)

        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户列表失败：{str(e)}")
    finally:
        conn.close()

@router.post("/users/{user_id}/roles")
async def assign_user_role(user_id: str, role_name: str, current_user: dict = Depends(verify_token)):
    """为用户分配角色（需要管理员权限）"""
    # 检查权限
    if not check_user_permission(current_user['sub'], Permission.ADMIN_USERS):
        raise HTTPException(status_code=403, detail="权限不足")

    try:
        role = Role(role_name)
        success = rbac_manager.assign_role_to_user(user_id, role, current_user['sub'])
        if success:
            return {"success": True, "message": f"角色 {role_name} 分配成功"}
        else:
            raise HTTPException(status_code=500, detail="角色分配失败")
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的角色名称")

@router.get("/audit-logs")
async def get_audit_logs(current_user: dict = Depends(verify_token), limit: int = 100):
    """获取审计日志（需要管理员权限）"""
    # 检查权限
    if not check_user_permission(current_user['sub'], Permission.ADMIN_LOGS):
        raise HTTPException(status_code=403, detail="权限不足")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
        SELECT * FROM permission_audit_log
        ORDER BY timestamp DESC LIMIT ?
        """, (limit,))

        logs = [dict(row) for row in cursor.fetchall()]
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取审计日志失败：{str(e)}")
    finally:
        conn.close()

@router.get("/security-dashboard")
async def get_security_dashboard(current_user: dict = Depends(verify_token)):
    """获取安全仪表板数据（需要管理员权限）"""
    # 检查权限
    if not check_user_permission(current_user['sub'], Permission.ADMIN_SECURITY):
        raise HTTPException(status_code=403, detail="权限不足")

    try:
        dashboard_data = security_monitor.get_security_dashboard_data()
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取安全仪表板数据失败：{str(e)}")

@router.get("/threat-detections")
async def get_threat_detections(current_user: dict = Depends(verify_token), limit: int = 50):
    """获取威胁检测记录（需要管理员权限）"""
    # 检查权限
    if not check_user_permission(current_user['sub'], Permission.ADMIN_SECURITY):
        raise HTTPException(status_code=403, detail="权限不足")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
        SELECT * FROM threat_detections
        ORDER BY detected_at DESC LIMIT ?
        """, (limit,))

        detections = []
        for row in cursor.fetchall():
            detection = dict(row)
            if detection['details']:
                detection['details'] = json.loads(detection['details'])
            detections.append(detection)

        return detections
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取威胁检测记录失败：{str(e)}")
    finally:
        conn.close()

@router.get("/ip-blacklist")
async def get_ip_blacklist(current_user: dict = Depends(verify_token)):
    """获取IP黑名单（需要管理员权限）"""
    # 检查权限
    if not check_user_permission(current_user['sub'], Permission.ADMIN_SECURITY):
        raise HTTPException(status_code=403, detail="权限不足")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
        SELECT * FROM ip_blacklist
        WHERE status = 'active'
        ORDER BY added_at DESC
        """)

        blacklist = [dict(row) for row in cursor.fetchall()]
        return blacklist
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取IP黑名单失败：{str(e)}")
    finally:
        conn.close()

# 初始化数据库（启动时）
init_database()
