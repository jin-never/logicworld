@echo off
echo ========================================
echo 🚀 启动您的工作流系统
echo ========================================
echo.

echo 📋 第1步：清理环境...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

echo 📋 第2步：启动后端...
cd /d "%~dp0backend"
start "后端服务" cmd /k "python quick_start.py"

echo 📋 第3步：等待3秒...
timeout /t 3 /nobreak >nul

echo 📋 第4步：启动前端...
cd /d "%~dp0frontend\mubu-mindmap"
start "前端服务" cmd /k "npm start"

echo.
echo ✅ 启动完成！
echo 📝 后端地址：http://localhost:8000
echo 📝 前端地址：http://localhost:3000
echo.
echo 🎯 如果遇到问题：
echo    1. 等待1-2分钟让服务启动完成
echo    2. 刷新浏览器页面
echo    3. 检查防火墙设置
echo.
pause 