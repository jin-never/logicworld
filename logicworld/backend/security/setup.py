#!/usr/bin/env python3
"""
平台安全模块设置脚本
用于快速初始化和配置安全模块
"""

import os
import sys
import secrets
import sqlite3
from pathlib import Path

def generate_secure_key(length=32):
    """生成安全的随机密钥"""
    return secrets.token_urlsafe(length)

def create_env_file():
    """创建或更新.env文件中的安全配置"""
    env_path = Path(".env")
    
    # 生成安全密钥
    master_key = generate_secure_key(32)
    jwt_secret = generate_secure_key(32)
    
    security_config = f"""
# ============================================================================
# 平台安全模块配置 (由setup.py自动生成)
# ============================================================================

# 主加密密钥 (请妥善保管，丢失将无法解密已存储的数据)
SECURITY_MASTER_KEY={master_key}

# JWT令牌密钥
JWT_SECRET_KEY={jwt_secret}
JWT_EXPIRATION_HOURS=24

# 登录安全配置
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30

# 数据库配置
SECURITY_DB_PATH=security.db

# 密码策略
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=false

# 会话配置
SESSION_TIMEOUT_HOURS=24
ENABLE_REMEMBER_ME=true

# 审计日志
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_RETENTION_DAYS=90

# 速率限制
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PER_MINUTE=100

# CORS配置
SECURITY_CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
"""
    
    if env_path.exists():
        # 读取现有内容
        with open(env_path, 'r', encoding='utf-8') as f:
            existing_content = f.read()
        
        # 检查是否已有安全配置
        if "SECURITY_MASTER_KEY" in existing_content:
            print("⚠️  检测到现有安全配置，是否覆盖？(y/N): ", end="")
            response = input().strip().lower()
            if response != 'y':
                print("跳过环境变量配置")
                return
        
        # 追加安全配置
        with open(env_path, 'a', encoding='utf-8') as f:
            f.write(security_config)
    else:
        # 创建新的.env文件
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(security_config)
    
    print("✅ 环境变量配置完成")
    print(f"🔑 主加密密钥: {master_key[:10]}...")
    print(f"🎫 JWT密钥: {jwt_secret[:10]}...")
    print("⚠️  请妥善保管这些密钥，建议备份到安全位置")

def init_database():
    """初始化安全数据库"""
    try:
        from .database import SecurityDatabaseManager
        
        print("正在初始化安全数据库...")
        db_manager = SecurityDatabaseManager()
        print("✅ 数据库初始化完成")
        
        # 创建默认管理员账户
        print("是否创建默认管理员账户？(Y/n): ", end="")
        response = input().strip().lower()
        
        if response != 'n':
            create_admin_user(db_manager)
            
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False
    
    return True

def create_admin_user(db_manager):
    """创建默认管理员账户"""
    try:
        from .encryption import PasswordManager
        import uuid
        from datetime import datetime
        
        print("\n创建管理员账户:")
        username = input("管理员用户名 (默认: admin): ").strip() or "admin"
        email = input("管理员邮箱: ").strip()
        
        if not email:
            print("❌ 邮箱不能为空")
            return
        
        password = input("管理员密码 (至少8位): ").strip()
        if len(password) < 8:
            print("❌ 密码长度至少8位")
            return
        
        # 检查用户是否已存在
        if db_manager.user_exists(username, email):
            print("❌ 用户名或邮箱已存在")
            return
        
        # 创建管理员用户
        password_manager = PasswordManager()
        user_id = str(uuid.uuid4())
        salt = password_manager.generate_salt()
        password_hash = password_manager.hash_password(password, salt)
        
        user_data = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "salt": salt,
            "role": "admin",
            "status": "active",
            "email_verified": True,  # 管理员账户默认已验证
            "two_factor_enabled": False,
            "email_verification_token": None,
            "email_verification_expires": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if db_manager.create_user(user_data):
            print(f"✅ 管理员账户创建成功")
            print(f"   用户名: {username}")
            print(f"   邮箱: {email}")
            print(f"   用户ID: {user_id}")
        else:
            print("❌ 管理员账户创建失败")
            
    except Exception as e:
        print(f"❌ 创建管理员账户失败: {e}")

def install_dependencies():
    """安装必要的依赖包"""
    print("正在检查依赖包...")
    
    required_packages = [
        "cryptography",
        "pyjwt",
        "fastapi",
        "python-multipart"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"需要安装以下依赖包: {', '.join(missing_packages)}")
        print("是否自动安装？(Y/n): ", end="")
        response = input().strip().lower()
        
        if response != 'n':
            import subprocess
            try:
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install"
                ] + missing_packages)
                print("✅ 依赖包安装完成")
            except subprocess.CalledProcessError as e:
                print(f"❌ 依赖包安装失败: {e}")
                return False
    else:
        print("✅ 所有依赖包已安装")
    
    return True

def test_security_module():
    """测试安全模块功能"""
    print("\n正在测试安全模块...")
    
    try:
        # 测试加密功能
        from .encryption import get_encryption_manager, get_api_key_manager
        
        encryption_manager = get_encryption_manager()
        api_key_manager = get_api_key_manager()
        
        # 测试密钥生成
        test_key = encryption_manager.generate_key("user")
        print("✅ 密钥生成测试通过")
        
        # 测试加密解密
        test_data = "test-api-key-12345"
        encrypted_data = api_key_manager.encrypt_api_key(test_data, test_key)
        decrypted_data = api_key_manager.decrypt_api_key(encrypted_data, test_key)
        
        if decrypted_data == test_data:
            print("✅ 加密解密测试通过")
        else:
            print("❌ 加密解密测试失败")
            return False
        
        # 测试数据库连接
        from .database import SecurityDatabaseManager
        db_manager = SecurityDatabaseManager()
        
        # 简单的数据库查询测试
        users = db_manager.get_all_users()
        print("✅ 数据库连接测试通过")
        
        print("✅ 所有测试通过，安全模块配置成功！")
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("🔒 平台安全模块设置向导")
    print("=" * 60)
    
    # 检查当前目录
    if not Path("backend").exists():
        print("❌ 请在项目根目录运行此脚本")
        sys.exit(1)
    
    # 步骤1: 安装依赖
    if not install_dependencies():
        print("❌ 依赖安装失败，请手动安装后重试")
        sys.exit(1)
    
    # 步骤2: 创建环境变量配置
    create_env_file()
    
    # 步骤3: 初始化数据库
    if not init_database():
        print("❌ 数据库初始化失败")
        sys.exit(1)
    
    # 步骤4: 测试功能
    if not test_security_module():
        print("❌ 功能测试失败")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🎉 安全模块设置完成！")
    print("=" * 60)
    print("\n下一步:")
    print("1. 在主应用中集成安全路由")
    print("2. 保护需要认证的API端点")
    print("3. 配置前端登录界面")
    print("4. 测试用户注册和登录功能")
    print("\n详细文档请参考: backend/security/README.md")

if __name__ == "__main__":
    main()
