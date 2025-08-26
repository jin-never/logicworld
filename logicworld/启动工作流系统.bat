@echo off
chcp 65001 >nul
title 🚀 AI工作流系统启动器

echo.
echo ========================================
echo   🚀 AI智能工作流系统启动器
echo ========================================
echo.

echo 📋 第1步：环境检查...
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装或不在PATH中
    echo 请安装Python 3.8+并添加到PATH
    pause
    exit /b 1
) else (
    echo ✅ Python环境正常
)

REM 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装或不在PATH中
    echo 请安装Node.js 16+并添加到PATH
    pause
    exit /b 1
) else (
    echo ✅ Node.js环境正常
)

echo.
echo 📋 第2步：清理旧进程...
echo.

REM 清理可能存在的进程
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo ✅ 进程清理完成

echo.
echo 📋 第3步：启动后端服务...
echo.

REM 启动后端
cd /d "%~dp0backend"
start "🔧 后端服务 - 端口8000" cmd /k "echo 启动后端服务... && python start_server.py"

echo ✅ 后端服务启动中...
echo 📝 后端地址：http://localhost:8000

echo.
echo 📋 第4步：等待后端就绪...
echo.

REM 等待后端启动
timeout /t 8 /nobreak >nul

echo.
echo 📋 第5步：启动前端服务...
echo.

REM 启动前端
cd /d "%~dp0frontend\mubu-mindmap"
start "🎨 前端服务 - 端口3000" cmd /k "echo 启动前端服务... && npm start"

echo ✅ 前端服务启动中...
echo 📝 前端地址：http://localhost:3000

echo.
echo ========================================
echo   ✅ 启动完成！
echo ========================================
echo.
echo 📋 服务状态：
echo   🔧 后端服务：http://localhost:8000
echo   🎨 前端服务：http://localhost:3000
echo   📚 API文档：http://localhost:8000/docs
echo.
echo 📋 使用提示：
echo   1. 等待1-2分钟让服务完全启动
echo   2. 打开浏览器访问前端地址
echo   3. 如遇问题，检查控制台输出
echo   4. 按Ctrl+C可停止对应服务
echo.
echo 📋 管理员信息：
echo   用户名：admin
echo   密码：admin123
echo.

REM 自动打开浏览器（可选）
set /p openBrowser="是否自动打开浏览器？(Y/N): "
if /i "%openBrowser%"=="Y" (
    echo 🌐 正在打开浏览器...
    timeout /t 3 /nobreak >nul
    start http://localhost:3000
)

echo.
echo 🎯 系统已启动，祝您使用愉快！
echo.
pause 