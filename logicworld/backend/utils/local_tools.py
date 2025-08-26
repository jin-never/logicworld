"""
本地可用工具集合
这些工具可以真正使用，不依赖外部服务
"""

import os
import json
import datetime
import requests
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from fastapi import Query
from fastapi.responses import FileResponse
import mimetypes
import sys

router = APIRouter()

# ==================== 文件管理工具 ====================

@router.post("/local-tools/file-manager/list")
async def list_files(payload: Dict[str, Any]):
    """列出目录中的文件"""
    try:
        directory = payload.get("directory", ".")
        path = Path(directory)
        
        if not path.exists():
            return {"error": f"Directory {directory} does not exist"}
        
        if not path.is_dir():
            return {"error": f"{directory} is not a directory"}
        
        files = []
        for item in path.iterdir():
            files.append({
                "name": item.name,
                "type": "directory" if item.is_dir() else "file",
                "size": item.stat().st_size if item.is_file() else None,
                "modified": datetime.datetime.fromtimestamp(item.stat().st_mtime).isoformat()
            })
        
        return {
            "directory": str(path.absolute()),
            "files": files,
            "count": len(files)
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/local-tools/file-manager/read")
async def read_file(payload: Dict[str, Any]):
    """读取文件内容"""
    try:
        filepath = payload.get("filepath")
        if not filepath:
            return {"error": "filepath is required"}
        
        path = Path(filepath)
        if not path.exists():
            return {"error": f"File {filepath} does not exist"}
        
        if not path.is_file():
            return {"error": f"{filepath} is not a file"}
        
        # 限制文件大小（1MB）
        if path.stat().st_size > 1024 * 1024:
            return {"error": "File too large (max 1MB)"}
        
        content = path.read_text(encoding='utf-8')
        return {
            "filepath": str(path.absolute()),
            "content": content,
            "size": len(content)
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/local-tools/file-manager/stream")
async def stream_file(filepath: str = Query(..., description="绝对或相对文件路径")):
    """以内联方式返回文件内容，浏览器可直接预览或下载。
    注意：仅用于本机开发环境，请确保路径安全。
    """
    try:
        path = Path(filepath)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {filepath}")
        if not path.is_file():
            raise HTTPException(status_code=400, detail=f"Not a file: {filepath}")

        # 猜测 MIME 类型
        mime, _ = mimetypes.guess_type(str(path))
        media_type = mime or "application/octet-stream"

        response = FileResponse(str(path), media_type=media_type, filename=path.name)
        # 强制 inline 展示
        response.headers["Content-Disposition"] = f"inline; filename*=UTF-8''{path.name}"
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/local-tools/file-manager/exists")
async def file_exists(filepath: str = Query(..., description="绝对或相对文件路径")):
    """校验文件是否存在，并返回基础元信息。"""
    try:
        path = Path(filepath)
        return {
            "path": str(path),
            "exists": path.exists(),
            "is_file": path.is_file() if path.exists() else False,
            "name": path.name,
            "size": (path.stat().st_size if path.exists() and path.is_file() else None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 使用系统默认应用打开文件
@router.post("/local-tools/file-manager/open")
async def open_file(payload: Dict[str, Any]):
    """在服务器本机上使用系统默认应用打开指定路径（文件或文件夹）。
    仅用于本地开发环境：后端与用户在同一台机器上时可直接唤起本机应用。
    """
    try:
        filepath = payload.get("filepath")
        if not filepath:
            raise HTTPException(status_code=400, detail="filepath is required")

        path = Path(filepath)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Path not found: {filepath}")

        # 平台分支
        if os.name == 'nt':
            # Windows 同时支持文件与目录
            os.startfile(str(path))  # type: ignore[attr-defined]
        else:
            # macOS 或 Linux
            opener = 'open' if sys.platform == 'darwin' else 'xdg-open'
            subprocess.Popen([opener, str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        return {"success": True, "opened": str(path)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 系统信息工具 ====================

@router.post("/local-tools/system/info")
async def system_info(payload: Dict[str, Any]):
    """获取系统信息"""
    try:
        import platform

        # 基础系统信息（不依赖psutil）
        info = {
            "platform": platform.platform(),
            "system": platform.system(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
        }

        # 尝试获取更详细的系统信息（如果psutil可用）
        try:
            import psutil
            info.update({
                "cpu_count": psutil.cpu_count(),
                "memory": {
                    "total": psutil.virtual_memory().total,
                    "available": psutil.virtual_memory().available,
                    "percent": psutil.virtual_memory().percent
                },
                "disk": {
                    "total": psutil.disk_usage('/').total if os.name != 'nt' else psutil.disk_usage('C:\\').total,
                    "free": psutil.disk_usage('/').free if os.name != 'nt' else psutil.disk_usage('C:\\').free,
                    "percent": psutil.disk_usage('/').percent if os.name != 'nt' else psutil.disk_usage('C:\\').percent
                }
            })
        except ImportError:
            info["note"] = "psutil not available, limited system info"

        return info
    except Exception as e:
        return {"error": str(e)}

# ==================== 网络工具 ====================

@router.post("/local-tools/network/ping")
async def ping_host(payload: Dict[str, Any]):
    """Ping 主机"""
    try:
        host = payload.get("host")
        count = payload.get("count", 4)  # 允许自定义ping次数
        timeout_seconds = payload.get("timeout", 30)  # 增加超时时间

        if not host:
            return {"error": "host is required"}

        # 构建ping命令 - 针对Windows和Linux/Mac的不同参数
        if os.name == 'nt':  # Windows
            cmd = ["ping", "-n", str(count), "-w", "3000", host]  # -w 3000ms 超时
        else:  # Linux/Mac
            cmd = ["ping", "-c", str(count), "-W", "3", host]  # -W 3秒超时

        # 执行ping命令
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds
        )

        # 解析结果
        success = result.returncode == 0
        output = result.stdout
        error_output = result.stderr

        # 尝试提取统计信息（如果成功）
        stats = {}
        if success and output:
            try:
                # 简单的统计信息提取
                if "TTL=" in output or "ttl=" in output:
                    stats["packets_transmitted"] = count
                    stats["packets_received"] = count if success else 0
                    stats["packet_loss"] = "0%" if success else "100%"
            except:
                pass

        return {
            "host": host,
            "success": success,
            "output": output,
            "error": error_output if error_output else None,
            "command": " ".join(cmd),
            "stats": stats,
            "returncode": result.returncode
        }

    except subprocess.TimeoutExpired:
        return {
            "host": host,
            "success": False,
            "error": f"Ping timeout after {timeout_seconds} seconds",
            "timeout": True
        }
    except FileNotFoundError:
        return {
            "host": host,
            "success": False,
            "error": "Ping command not found on this system"
        }
    except Exception as e:
        return {
            "host": host,
            "success": False,
            "error": f"Ping failed: {str(e)}"
        }

@router.post("/local-tools/network/http-request")
async def http_request(payload: Dict[str, Any]):
    """发送 HTTP 请求"""
    try:
        url = payload.get("url")
        method = payload.get("method", "GET").upper()
        headers = payload.get("headers", {})
        data = payload.get("data")
        
        if not url:
            return {"error": "url is required"}
        
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if data else None,
            timeout=10
        )
        
        return {
            "url": url,
            "method": method,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "content": response.text[:1000],  # 限制返回内容长度
            "success": response.status_code < 400
        }
    except Exception as e:
        return {"error": str(e)}

# ==================== 文本处理工具 ====================

@router.post("/local-tools/text/word-count")
async def word_count(payload: Dict[str, Any]):
    """统计文本字数"""
    try:
        text = payload.get("text", "")
        
        return {
            "text_length": len(text),
            "word_count": len(text.split()),
            "line_count": len(text.splitlines()),
            "char_count_no_spaces": len(text.replace(" ", "")),
            "paragraph_count": len([p for p in text.split("\n\n") if p.strip()])
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/local-tools/text/format")
async def format_text(payload: Dict[str, Any]):
    """格式化文本"""
    try:
        text = payload.get("text", "")
        operation = payload.get("operation", "upper")  # upper, lower, title, strip
        
        if operation == "upper":
            result = text.upper()
        elif operation == "lower":
            result = text.lower()
        elif operation == "title":
            result = text.title()
        elif operation == "strip":
            result = text.strip()
        elif operation == "reverse":
            result = text[::-1]
        else:
            return {"error": f"Unknown operation: {operation}"}
        
        return {
            "original": text,
            "operation": operation,
            "result": result
        }
    except Exception as e:
        return {"error": str(e)}

# ==================== 时间工具 ====================

@router.post("/local-tools/time/current")
async def current_time(payload: Dict[str, Any]):
    """获取当前时间"""
    try:
        format_str = payload.get("format", "%Y-%m-%d %H:%M:%S")
        
        now = datetime.datetime.now()
        return {
            "timestamp": now.timestamp(),
            "iso_format": now.isoformat(),
            "formatted": now.strftime(format_str),
            "timezone": str(now.astimezone().tzinfo)
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/local-tools/time/calculate")
async def calculate_time(payload: Dict[str, Any]):
    """时间计算"""
    try:
        start_time = payload.get("start_time")  # ISO format
        end_time = payload.get("end_time")      # ISO format
        
        if not start_time or not end_time:
            return {"error": "start_time and end_time are required"}
        
        start = datetime.datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end = datetime.datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        diff = end - start
        
        return {
            "start_time": start_time,
            "end_time": end_time,
            "difference": {
                "total_seconds": diff.total_seconds(),
                "days": diff.days,
                "hours": diff.seconds // 3600,
                "minutes": (diff.seconds % 3600) // 60,
                "seconds": diff.seconds % 60
            }
        }
    except Exception as e:
        return {"error": str(e)}
