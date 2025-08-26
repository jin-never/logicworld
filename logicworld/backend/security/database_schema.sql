-- 平台安全模块数据库架构设计
-- 用于存储用户信息、API密钥和安全相关数据

-- ============================================================================
-- 用户管理表
-- ============================================================================

-- 用户基本信息表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,           -- 用户唯一标识符
    username TEXT UNIQUE NOT NULL,          -- 用户名
    email TEXT UNIQUE NOT NULL,             -- 邮箱
    phone TEXT,                             -- 手机号码
    password_hash TEXT NOT NULL,            -- 密码哈希
    salt TEXT NOT NULL,                     -- 密码盐值
    role TEXT DEFAULT 'user',               -- 用户角色 (admin, user, guest)
    status TEXT DEFAULT 'active',           -- 账户状态 (active, suspended, deleted)
    email_verified BOOLEAN DEFAULT FALSE,   -- 邮箱验证状态
    two_factor_enabled BOOLEAN DEFAULT FALSE, -- 双因子认证启用状态
    two_factor_secret TEXT,                 -- 双因子认证密钥
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    login_attempts INTEGER DEFAULT 0,       -- 登录尝试次数
    locked_until DATETIME,                  -- 账户锁定到期时间
    password_reset_token TEXT,              -- 密码重置令牌
    password_reset_expires DATETIME,        -- 密码重置令牌过期时间
    email_verification_token TEXT,          -- 邮箱验证令牌
    email_verification_expires DATETIME     -- 邮箱验证令牌过期时间
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,        -- 会话ID
    user_id TEXT NOT NULL,                  -- 用户ID
    jwt_token_hash TEXT NOT NULL,           -- JWT令牌哈希
    ip_address TEXT,                        -- 登录IP地址
    user_agent TEXT,                        -- 用户代理
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,           -- 会话过期时间
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,         -- 会话是否活跃
    device_fingerprint TEXT,                -- 设备指纹
    location TEXT,                          -- 登录位置
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- API密钥安全存储表
-- ============================================================================

-- 加密密钥管理表
CREATE TABLE IF NOT EXISTS encryption_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id TEXT UNIQUE NOT NULL,            -- 密钥标识符
    key_type TEXT NOT NULL,                 -- 密钥类型 (master, user, api)
    encrypted_key TEXT NOT NULL,            -- 加密后的密钥
    key_version INTEGER DEFAULT 1,          -- 密钥版本
    algorithm TEXT DEFAULT 'AES-256-GCM',   -- 加密算法
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                    -- 密钥过期时间
    is_active BOOLEAN DEFAULT TRUE,         -- 密钥是否活跃
    rotation_schedule TEXT,                 -- 轮换计划
    last_rotated DATETIME                   -- 上次轮换时间
);

-- 用户API密钥表
CREATE TABLE IF NOT EXISTS user_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                  -- 用户ID
    service_name TEXT NOT NULL,             -- 服务名称 (deepseek, openai, claude等)
    service_type TEXT NOT NULL,             -- 服务类型 (ai, mcp, tool等)
    key_name TEXT NOT NULL,                 -- 密钥名称/别名
    encrypted_api_key TEXT NOT NULL,        -- 加密后的API密钥
    encryption_key_id TEXT NOT NULL,        -- 用于加密的密钥ID
    iv TEXT NOT NULL,                       -- 初始化向量
    key_hash TEXT NOT NULL,                 -- 密钥哈希(用于验证)
    key_status TEXT DEFAULT 'active',       -- 密钥状态 (active, expired, revoked)
    usage_count INTEGER DEFAULT 0,          -- 使用次数
    last_used DATETIME,                     -- 最后使用时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                    -- 密钥过期时间
    rate_limit_per_minute INTEGER DEFAULT 100, -- 每分钟请求限制
    rate_limit_per_day INTEGER DEFAULT 10000,  -- 每日请求限制
    metadata TEXT,                          -- 额外元数据(JSON格式)
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (encryption_key_id) REFERENCES encryption_keys(key_id),
    UNIQUE(user_id, service_name, key_name)
);

-- ============================================================================
-- 权限和角色管理表
-- ============================================================================

-- 角色定义表
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT UNIQUE NOT NULL,         -- 角色名称
    role_description TEXT,                  -- 角色描述
    permissions TEXT NOT NULL,              -- 权限列表(JSON格式)
    is_system_role BOOLEAN DEFAULT FALSE,   -- 是否为系统角色
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                  -- 用户ID
    role_name TEXT NOT NULL,                -- 角色名称
    granted_by TEXT,                        -- 授权人
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                    -- 角色过期时间
    is_active BOOLEAN DEFAULT TRUE,         -- 角色是否活跃
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_name) REFERENCES roles(role_name),
    UNIQUE(user_id, role_name)
);

-- ============================================================================
-- 安全审计和日志表
-- ============================================================================

-- 安全事件日志表
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,          -- 事件唯一标识
    user_id TEXT,                           -- 用户ID(可为空，如系统事件)
    event_type TEXT NOT NULL,               -- 事件类型 (login, logout, api_key_access等)
    event_category TEXT NOT NULL,           -- 事件分类 (authentication, authorization, data_access等)
    severity TEXT DEFAULT 'info',           -- 严重程度 (critical, high, medium, low, info)
    description TEXT NOT NULL,              -- 事件描述
    ip_address TEXT,                        -- 客户端IP
    user_agent TEXT,                        -- 用户代理
    request_path TEXT,                      -- 请求路径
    request_method TEXT,                    -- 请求方法
    response_status INTEGER,                -- 响应状态码
    session_id TEXT,                        -- 会话ID
    additional_data TEXT,                   -- 额外数据(JSON格式)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,        -- 是否已处理
    alert_sent BOOLEAN DEFAULT FALSE        -- 是否已发送告警
);

-- API使用统计表
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                  -- 用户ID
    service_name TEXT NOT NULL,             -- 服务名称
    api_key_id INTEGER NOT NULL,           -- API密钥ID
    request_count INTEGER DEFAULT 0,        -- 请求次数
    success_count INTEGER DEFAULT 0,        -- 成功次数
    error_count INTEGER DEFAULT 0,          -- 错误次数
    total_tokens INTEGER DEFAULT 0,         -- 总token数
    total_cost DECIMAL(10,4) DEFAULT 0,     -- 总费用
    date DATE NOT NULL,                     -- 统计日期
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (api_key_id) REFERENCES user_api_keys(id) ON DELETE CASCADE,
    UNIQUE(user_id, service_name, api_key_id, date)
);

-- ============================================================================
-- 安全配置表
-- ============================================================================

-- 系统安全配置表
CREATE TABLE IF NOT EXISTS security_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,        -- 配置键
    config_value TEXT NOT NULL,             -- 配置值
    config_type TEXT DEFAULT 'string',      -- 配置类型
    description TEXT,                       -- 配置描述
    is_encrypted BOOLEAN DEFAULT FALSE,     -- 是否加密存储
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT                         -- 更新人
);

-- ============================================================================
-- 索引创建
-- ============================================================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 会话表索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON user_sessions(is_active);

-- API密钥表索引
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON user_api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON user_api_keys(key_status);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON user_api_keys(last_used);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON security_audit_logs(severity);

-- API使用统计索引
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON api_usage_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_service_date ON api_usage_stats(service_name, date);

-- ============================================================================
-- 初始数据插入
-- ============================================================================

-- 插入默认角色
INSERT OR IGNORE INTO roles (role_name, role_description, permissions, is_system_role) VALUES
('admin', '系统管理员', '["*"]', TRUE),
('user', '普通用户', '["read_own_data", "write_own_data", "manage_own_api_keys"]', TRUE),
('guest', '访客用户', '["read_public_data"]', TRUE);

-- 插入默认安全配置
INSERT OR IGNORE INTO security_config (config_key, config_value, config_type, description) VALUES
('password_min_length', '8', 'integer', '密码最小长度'),
('password_require_uppercase', 'true', 'boolean', '密码是否需要大写字母'),
('password_require_lowercase', 'true', 'boolean', '密码是否需要小写字母'),
('password_require_numbers', 'true', 'boolean', '密码是否需要数字'),
('password_require_symbols', 'false', 'boolean', '密码是否需要特殊字符'),
('max_login_attempts', '5', 'integer', '最大登录尝试次数'),
('account_lockout_duration', '30', 'integer', '账户锁定时长(分钟)'),
('session_timeout', '24', 'integer', '会话超时时间(小时)'),
('jwt_secret_rotation_days', '30', 'integer', 'JWT密钥轮换周期(天)'),
('api_key_encryption_algorithm', 'AES-256-GCM', 'string', 'API密钥加密算法'),
('enable_audit_logging', 'true', 'boolean', '是否启用审计日志'),
('enable_rate_limiting', 'true', 'boolean', '是否启用速率限制'),
('enable_ip_whitelist', 'false', 'boolean', '是否启用IP白名单'),
('enable_two_factor_auth', 'true', 'boolean', '是否启用双因子认证');
