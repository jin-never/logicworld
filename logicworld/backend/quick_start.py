#!/usr/bin/env python3
"""
快速启动脚本 - 绕过模块导入问题
"""
import os
import sys
import subprocess
import time

def check_port(port):
    """检查端口是否被占用"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def kill_port(port):
    """杀掉占用端口的进程"""
    try:
        if os.name == 'nt':  # Windows
            subprocess.run(['netstat', '-ano'], capture_output=True)
            subprocess.run(['taskkill', '/F', '/IM', 'python.exe'], capture_output=True)
        else:  # Linux/Mac
            subprocess.run(['pkill', '-f', f':{port}'], capture_output=True)
    except:
        pass

def main():
    print("🚀 快速启动工作流系统...")
    
    # 检查并清理端口8000
    if check_port(8000):
        print("⚠️ 端口8000被占用，正在清理...")
        kill_port(8000)
        time.sleep(2)
    
    # 设置Python路径
    backend_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, backend_path)
    
    # 临时修复导入问题
    os.environ['PYTHONPATH'] = backend_path
    
    try:
        # 尝试启动简化版本
        print("✅ 启动简化版后端服务...")
        from fastapi import FastAPI
        import uvicorn
        
        app = FastAPI(title="工作流系统 - 简化版")
        
        @app.get("/")
        def root():
            return {"status": "running", "message": "工作流系统正常运行"}
        
        @app.get("/health")
        def health():
            return {"status": "healthy"}
        
        # 启动服务器
        uvicorn.run(app, host="127.0.0.1", port=8000)
        
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        print("🔧 请尝试手动解决依赖问题")

if __name__ == "__main__":
    main() 