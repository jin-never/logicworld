#!/usr/bin/env python3
"""
简单的服务器启动脚本
"""

import os
import sys
import uvicorn
from pathlib import Path

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    """启动服务器"""
    try:
        # 切换到backend目录
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(backend_dir)
        print(f"工作目录: {os.getcwd()}")

        # 导入应用
        from core.main import app
        
        # 启动配置
        host = "127.0.0.1"
        port = 8000
        
        print("=" * 60)
        print("🛡️ 安全系统启动")
        print("=" * 60)
        print(f"服务器地址: http://{host}:{port}")
        print(f"API文档: http://{host}:{port}/docs")
        print(f"管理员账户: admin / admin123")
        print("=" * 60)
        
        # 启动服务器
        uvicorn.run(
            app,
            host=host,
            port=port,
            reload=False,
            access_log=True
        )
        
    except KeyboardInterrupt:
        print("\n[停止] 收到停止信号，正在关闭...")
    except Exception as e:
        print(f"[错误] 服务器启动失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
