# 平台安全模块文档

## 概述

本安全模块为平台提供完整的用户认证、API密钥管理和数据保护功能，确保用户敏感信息的安全存储和访问控制。

## 核心功能

### 🔐 用户认证系统
- 用户注册、登录、登出
- JWT令牌管理
- 密码强度验证
- 账户锁定机制
- 会话管理

### 🔑 API密钥管理
- 加密存储API密钥
- 支持多种AI服务（DeepSeek、OpenAI、Claude等）
- 密钥轮换机制
- 使用统计和监控

### 🛡️ 数据加密
- AES-256-GCM加密算法
- Fernet对称加密
- 密钥派生和管理
- 数据完整性验证

### 📝 安全审计
- 完整的操作日志
- 安全事件监控
- 异常行为检测
- 审计报告生成

## 架构设计

```
backend/security/
├── database_schema.sql    # 数据库架构
├── encryption.py         # 加密工具
├── auth.py               # 用户认证
├── api_routes.py         # API端点
├── database.py           # 数据库管理
└── README.md            # 文档
```

## 安装和配置

### 1. 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# 安全配置
SECURITY_MASTER_KEY=your-256-bit-master-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_EXPIRATION_HOURS=24

# 登录安全
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30

# 数据库
SECURITY_DB_PATH=security.db
```

### 2. 安装依赖

```bash
pip install cryptography pyjwt fastapi python-multipart
```

### 3. 初始化数据库

```python
from backend.security.database import SecurityDatabaseManager

db_manager = SecurityDatabaseManager()
# 数据库会自动初始化
```

## API使用指南

### 用户认证

#### 用户注册
```http
POST /api/security/register
Content-Type: application/json

{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123",
    "confirm_password": "SecurePass123"
}
```

#### 用户登录
```http
POST /api/security/login
Content-Type: application/json

{
    "username": "testuser",
    "password": "SecurePass123",
    "remember_me": false
}
```

#### 用户登出
```http
POST /api/security/logout
Authorization: Bearer <access_token>
```

### API密钥管理

#### 创建API密钥
```http
POST /api/security/api-keys
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "service_name": "deepseek",
    "service_type": "ai",
    "key_name": "我的DeepSeek密钥",
    "api_key": "sk-xxxxxxxxxxxxxxxx",
    "expires_at": "2024-12-31T23:59:59"
}
```

#### 获取API密钥列表
```http
GET /api/security/api-keys
Authorization: Bearer <access_token>
```

#### 解密API密钥
```http
GET /api/security/api-keys/{key_id}/decrypt
Authorization: Bearer <access_token>
```

## 安全最佳实践

### 开发者指南

1. **密钥管理**
   - 使用环境变量存储敏感配置
   - 定期轮换加密密钥
   - 不在代码中硬编码密钥

2. **密码安全**
   - 强制密码复杂度要求
   - 使用PBKDF2进行密码哈希
   - 实施账户锁定机制

3. **会话管理**
   - 设置合理的会话超时时间
   - 实施会话固定攻击防护
   - 记录会话活动日志

4. **数据加密**
   - 敏感数据必须加密存储
   - 使用强加密算法（AES-256-GCM）
   - 实施数据完整性验证

### 用户指南

1. **密码安全**
   - 使用强密码（至少8位，包含大小写字母和数字）
   - 不要重复使用密码
   - 定期更换密码

2. **API密钥管理**
   - 为不同服务使用不同的密钥名称
   - 定期检查密钥使用情况
   - 及时删除不再使用的密钥

3. **账户安全**
   - 启用双因子认证（如果可用）
   - 定期检查登录日志
   - 发现异常活动及时报告

## 安全配置

### 密码策略
```python
# 在 security_config 表中配置
password_min_length = 8
password_require_uppercase = True
password_require_lowercase = True
password_require_numbers = True
password_require_symbols = False
```

### 登录安全
```python
max_login_attempts = 5
account_lockout_duration = 30  # 分钟
session_timeout = 24  # 小时
```

### 加密配置
```python
api_key_encryption_algorithm = "AES-256-GCM"
jwt_secret_rotation_days = 30
enable_audit_logging = True
```

## 监控和告警

### 安全事件监控
- 登录失败次数过多
- 异常IP地址访问
- API密钥频繁访问
- 权限提升尝试

### 审计日志
所有安全相关操作都会记录在 `security_audit_logs` 表中：
- 用户登录/登出
- API密钥创建/删除/访问
- 密码修改
- 权限变更

### 性能监控
- API响应时间
- 数据库查询性能
- 加密/解密操作耗时
- 内存和CPU使用率

## 故障排除

### 常见问题

1. **JWT令牌验证失败**
   - 检查JWT_SECRET_KEY配置
   - 确认令牌未过期
   - 验证令牌格式正确

2. **API密钥解密失败**
   - 检查SECURITY_MASTER_KEY配置
   - 确认用户有权限访问该密钥
   - 验证数据库中的加密数据完整性

3. **数据库连接失败**
   - 检查数据库文件路径
   - 确认数据库文件权限
   - 验证SQL架构是否正确初始化

### 日志分析
```bash
# 查看安全事件日志
tail -f logs/security.log | grep "SECURITY"

# 查看登录失败记录
sqlite3 security.db "SELECT * FROM security_audit_logs WHERE event_type='login_failed' ORDER BY timestamp DESC LIMIT 10;"
```

## 集成到现有系统

### 1. 在主应用中集成安全路由

```python
# backend/core/main.py
from fastapi import FastAPI
from backend.security.api_routes import router as security_router

app = FastAPI()

# 添加安全路由
app.include_router(security_router)
```

### 2. 保护现有API端点

```python
from backend.security.auth import get_current_user, require_role

@app.get("/protected-endpoint")
async def protected_endpoint(current_user = Depends(get_current_user)):
    return {"message": "这是受保护的端点", "user": current_user}

@app.get("/admin-only")
async def admin_only(current_user = Depends(require_role("admin"))):
    return {"message": "管理员专用端点"}
```

### 3. 在工具中使用API密钥

```python
from backend.security.database import SecurityDatabaseManager
from backend.security.encryption import get_api_key_manager

async def get_user_api_key(user_id: str, service_name: str):
    db_manager = SecurityDatabaseManager()
    api_key_manager = get_api_key_manager()

    # 获取加密的API密钥
    encrypted_key = db_manager.get_user_api_key(user_id, service_name)
    if encrypted_key:
        # 解密并返回
        user_encryption_key = db_manager.get_user_encryption_key(user_id)
        return api_key_manager.decrypt_api_key(encrypted_key, user_encryption_key)
    return None
```

## 更新和维护

### 定期维护任务
1. 清理过期的会话记录
2. 轮换加密密钥
3. 更新安全配置
4. 备份安全数据库
5. 审查安全日志

### 版本更新
在更新安全模块时，请注意：
1. 备份现有数据库
2. 测试新版本兼容性
3. 更新环境变量配置
4. 验证加密/解密功能
5. 检查API端点变更

## 联系支持

如果遇到安全相关问题，请：
1. 查看本文档的故障排除部分
2. 检查系统日志文件
3. 联系技术支持团队
4. 提供详细的错误信息和复现步骤

---

**重要提醒**: 安全是一个持续的过程，请定期审查和更新安全配置，确保系统始终处于最佳安全状态。
