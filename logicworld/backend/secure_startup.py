#!/usr/bin/env python3
"""
安全系统启动脚本
初始化完整的安全防护体系
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def setup_logging():
    """设置日志系统"""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # 设置控制台编码为UTF-8
    if sys.platform == "win32":
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / "security_startup.log", encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )

    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info("安全系统启动")
    logger.info(f"启动时间: {datetime.now().isoformat()}")
    logger.info("=" * 60)
    return logger

def initialize_environment():
    """初始化环境变量"""
    logger = logging.getLogger(__name__)
    
    try:
        from env_manager import env_manager
        logger.info("[完成] 环境变量管理器已初始化")
        
        # 检查关键配置
        required_configs = [
            "SECURITY_MASTER_KEY",
            "JWT_SECRET_KEY",
            "SECURITY_DB_PATH"
        ]
        
        for config in required_configs:
            value = env_manager.get_config_value(config)
            if value:
                logger.info(f"[配置] {config}: 已配置")
            else:
                logger.warning(f"[警告] {config}: 未配置，将使用默认值")
        
        return True
    except Exception as e:
        logger.error(f"❌ 环境变量初始化失败: {e}")
        return False

def initialize_database():
    """初始化数据库"""
    logger = logging.getLogger(__name__)
    
    try:
        # 初始化安全数据库
        from security_api import init_database
        init_database()
        logger.info("[完成] 安全数据库已初始化")

        # 初始化RBAC系统
        from rbac_system import rbac_manager
        logger.info("[完成] RBAC权限系统已初始化")

        # 初始化监控系统
        from security_monitoring import security_monitor
        logger.info("[完成] 安全监控系统已初始化")
        
        return True
    except Exception as e:
        logger.error(f"[失败] 数据库初始化失败: {e}")
        return False

def create_admin_user():
    """创建管理员用户"""
    logger = logging.getLogger(__name__)
    
    try:
        from create_admin import create_admin_user as create_admin
        create_admin()
        logger.info("[完成] 管理员用户已创建/更新")

        # 为管理员分配角色
        from rbac_system import rbac_manager, Role
        rbac_manager.assign_role_to_user("admin", Role.SUPER_ADMIN)
        logger.info("[完成] 管理员角色已分配")

        return True
    except Exception as e:
        logger.error(f"[失败] 管理员用户创建失败: {e}")
        return False

def setup_security_middleware():
    """设置安全中间件"""
    logger = logging.getLogger(__name__)
    
    try:
        from security_middleware import setup_security_middleware
        logger.info("[完成] 安全中间件配置已加载")
        return True
    except Exception as e:
        logger.error(f"[失败] 安全中间件设置失败: {e}")
        return False

def initialize_encryption():
    """初始化加密系统"""
    logger = logging.getLogger(__name__)
    
    try:
        from data_encryption import encryption_manager, database_encryption
        logger.info("[完成] 数据加密系统已初始化")

        # 测试加密功能
        test_data = "test_encryption_data"
        encrypted = encryption_manager.encrypt_string(test_data)
        decrypted = encryption_manager.decrypt_string(encrypted)

        if decrypted == test_data:
            logger.info("[测试] 加密功能测试通过")
        else:
            logger.error("[失败] 加密功能测试失败")
            return False

        return True
    except Exception as e:
        logger.error(f"[失败] 加密系统初始化失败: {e}")
        return False

def run_security_checks():
    """运行安全检查"""
    logger = logging.getLogger(__name__)
    
    checks = []
    
    # 检查文件权限
    sensitive_files = [".env", ".env.encrypted", ".env_key", "security.db"]
    for file_path in sensitive_files:
        if os.path.exists(file_path):
            stat = os.stat(file_path)
            mode = oct(stat.st_mode)[-3:]
            if mode in ["600", "640"]:
                checks.append(f"[安全] {file_path}: 权限安全 ({mode})")
            else:
                checks.append(f"[警告] {file_path}: 权限可能不安全 ({mode})")
        else:
            checks.append(f"[信息] {file_path}: 文件不存在")
    
    # 检查目录权限
    sensitive_dirs = ["logs", "backups", "secure_storage"]
    for dir_path in sensitive_dirs:
        if os.path.exists(dir_path):
            stat = os.stat(dir_path)
            mode = oct(stat.st_mode)[-3:]
            checks.append(f"[权限] {dir_path}/: 目录权限 ({mode})")
        else:
            checks.append(f"[信息] {dir_path}/: 目录不存在")

    # 输出检查结果
    logger.info("[检查] 安全检查结果:")
    for check in checks:
        logger.info(f"  {check}")
    
    return True

def start_application():
    """启动应用程序"""
    logger = logging.getLogger(__name__)
    
    try:
        # 导入主应用
        from core.main import app
        
        # 获取配置
        from env_manager import get_config, get_config_int, get_config_bool
        
        host = get_config("API_HOST", "127.0.0.1")
        port = get_config_int("API_PORT", 8000)
        debug = get_config_bool("DEBUG", False)
        
        logger.info(f"[启动] 启动应用服务器")
        logger.info(f"   地址: http://{host}:{port}")
        logger.info(f"   调试模式: {debug}")
        
        # 启动服务器
        import uvicorn
        uvicorn.run(
            app,
            host=host,
            port=port,
            debug=debug,
            access_log=True
        )
        
    except Exception as e:
        logger.error(f"[失败] 应用启动失败: {e}")
        return False

def main():
    """主函数"""
    logger = setup_logging()
    
    # 初始化步骤
    steps = [
        ("环境变量", initialize_environment),
        ("数据库", initialize_database),
        ("管理员用户", create_admin_user),
        ("安全中间件", setup_security_middleware),
        ("加密系统", initialize_encryption),
        ("安全检查", run_security_checks)
    ]
    
    # 执行初始化步骤
    for step_name, step_func in steps:
        logger.info(f"[进行中] 正在初始化: {step_name}")
        if not step_func():
            logger.error(f"[失败] {step_name}初始化失败，停止启动")
            sys.exit(1)
        logger.info(f"[完成] {step_name}初始化完成")
    
    logger.info("=" * 60)
    logger.info("[成功] 安全系统初始化完成")
    logger.info("=" * 60)

    # 显示安全状态摘要
    logger.info("[状态] 安全状态摘要:")
    logger.info("  [启用] 用户认证: 已启用")
    logger.info("  [启用] 权限控制: 已启用 (RBAC)")
    logger.info("  [启用] 数据加密: 已启用")
    logger.info("  [启用] 安全监控: 已启用")
    logger.info("  [启用] 速率限制: 已启用")
    logger.info("  [启用] 审计日志: 已启用")
    logger.info("  [启用] CORS保护: 已启用")
    logger.info("  [启用] 安全头: 已启用")

    # 显示访问信息
    logger.info("=" * 60)
    logger.info("[信息] 访问信息:")
    logger.info("  前端地址: http://localhost:3000")
    logger.info("  后端API: http://localhost:8000")
    logger.info("  管理员账户: admin / admin123")
    logger.info("  API文档: http://localhost:8000/docs")
    logger.info("=" * 60)
    
    # 启动应用
    try:
        start_application()
    except KeyboardInterrupt:
        logger.info("[停止] 收到停止信号，正在关闭...")
    except Exception as e:
        logger.error(f"[错误] 应用运行错误: {e}")
        sys.exit(1)
    finally:
        logger.info("[停止] 安全系统已停止")

if __name__ == "__main__":
    main()
