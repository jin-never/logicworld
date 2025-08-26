@echo off
echo 🚀 快速启动前端系统...

REM 清理npm缓存
echo 🧹 清理npm缓存...
npm cache clean --force

REM 删除node_modules重新安装
echo 📦 重新安装依赖...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM 安装依赖
npm install --legacy-peer-deps --no-optional

REM 启动开发服务器
echo ✅ 启动开发服务器...
npm start

pause 