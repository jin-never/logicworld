#!/usr/bin/env python3
"""
安全中间件系统
提供请求验证、速率限制、CORS配置、安全头设置等功能
"""

import time
import json
import hashlib
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """安全响应头中间件"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 添加安全头
        for header, value in self.security_headers.items():
            response.headers[header] = value
        
        # 移除可能泄露信息的头
        response.headers.pop("Server", None)
        response.headers.pop("X-Powered-By", None)
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """速率限制中间件"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.requests = defaultdict(deque)
        self.blocked_ips = {}
        
        # 配置
        self.max_requests = kwargs.get('max_requests', 100)  # 每分钟最大请求数
        self.window_size = kwargs.get('window_size', 60)     # 时间窗口（秒）
        self.block_duration = kwargs.get('block_duration', 300)  # 封禁时长（秒）
        self.max_violations = kwargs.get('max_violations', 3)    # 最大违规次数
    
    def get_client_ip(self, request: Request) -> str:
        """获取客户端IP地址"""
        # 优先从代理头获取真实IP
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def is_rate_limited(self, client_ip: str) -> bool:
        """检查是否超过速率限制"""
        now = time.time()
        
        # 检查是否在封禁列表中
        if client_ip in self.blocked_ips:
            if now < self.blocked_ips[client_ip]:
                return True
            else:
                # 封禁时间已过，移除封禁
                del self.blocked_ips[client_ip]
        
        # 清理过期的请求记录
        requests = self.requests[client_ip]
        while requests and requests[0] < now - self.window_size:
            requests.popleft()
        
        # 检查请求数量
        if len(requests) >= self.max_requests:
            # 记录违规
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            
            # 封禁IP
            self.blocked_ips[client_ip] = now + self.block_duration
            return True
        
        # 记录当前请求
        requests.append(now)
        return False
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self.get_client_ip(request)
        
        if self.is_rate_limited(client_ip):
            logger.warning(f"Blocked request from rate-limited IP: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "请求过于频繁，请稍后再试"}
            )
        
        response = await call_next(request)
        
        # 添加速率限制信息到响应头
        remaining = max(0, self.max_requests - len(self.requests[client_ip]))
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + self.window_size))
        
        return response

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """请求验证中间件"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.max_content_length = kwargs.get('max_content_length', 10 * 1024 * 1024)  # 10MB
        self.allowed_methods = kwargs.get('allowed_methods', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
        self.blocked_user_agents = kwargs.get('blocked_user_agents', [])
    
    def validate_request(self, request: Request) -> Optional[str]:
        """验证请求"""
        # 检查HTTP方法
        if request.method not in self.allowed_methods:
            return f"不允许的HTTP方法: {request.method}"
        
        # 检查Content-Length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_content_length:
            return f"请求体过大: {content_length} bytes"
        
        # 检查User-Agent
        user_agent = request.headers.get("user-agent", "").lower()
        for blocked_agent in self.blocked_user_agents:
            if blocked_agent.lower() in user_agent:
                return f"被阻止的User-Agent: {user_agent}"
        
        # 检查可疑的请求头
        suspicious_headers = ["x-forwarded-host", "x-original-url", "x-rewrite-url"]
        for header in suspicious_headers:
            if header in request.headers:
                logger.warning(f"Suspicious header detected: {header}")
        
        return None
    
    async def dispatch(self, request: Request, call_next):
        # 验证请求
        error = self.validate_request(request)
        if error:
            logger.warning(f"Request validation failed: {error}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": error}
            )
        
        response = await call_next(request)
        return response

class SecurityAuditMiddleware(BaseHTTPMiddleware):
    """安全审计中间件"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.log_sensitive_endpoints = kwargs.get('log_sensitive_endpoints', True)
        self.sensitive_paths = kwargs.get('sensitive_paths', [
            '/api/security/login',
            '/api/security/register',
            '/api/security/logout',
            '/api/admin'
        ])
    
    def should_log_request(self, request: Request) -> bool:
        """判断是否需要记录请求"""
        if not self.log_sensitive_endpoints:
            return False
        
        path = request.url.path
        return any(sensitive_path in path for sensitive_path in self.sensitive_paths)
    
    def get_request_info(self, request: Request) -> Dict:
        """获取请求信息"""
        return {
            "timestamp": datetime.now().isoformat(),
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
            "referer": request.headers.get("referer", ""),
            "content_type": request.headers.get("content-type", ""),
            "content_length": request.headers.get("content-length", "0")
        }
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # 记录请求信息
        if self.should_log_request(request):
            request_info = self.get_request_info(request)
            logger.info(f"Security audit - Request: {json.dumps(request_info)}")
        
        response = await call_next(request)
        
        # 记录响应信息
        if self.should_log_request(request):
            duration = time.time() - start_time
            response_info = {
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "response_size": len(response.body) if hasattr(response, 'body') else 0
            }
            logger.info(f"Security audit - Response: {json.dumps(response_info)}")
        
        return response

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF保护中间件"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.secret_key = kwargs.get('secret_key', 'your-csrf-secret-key')
        self.safe_methods = {'GET', 'HEAD', 'OPTIONS', 'TRACE'}
        self.exempt_paths = kwargs.get('exempt_paths', ['/api/security/login', '/api/security/register'])
    
    def generate_csrf_token(self, session_id: str) -> str:
        """生成CSRF令牌"""
        timestamp = str(int(time.time()))
        data = f"{session_id}:{timestamp}:{self.secret_key}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def validate_csrf_token(self, token: str, session_id: str) -> bool:
        """验证CSRF令牌"""
        try:
            # 简单的令牌验证逻辑
            expected_token = self.generate_csrf_token(session_id)
            return token == expected_token
        except Exception:
            return False
    
    async def dispatch(self, request: Request, call_next):
        # 对于安全方法，直接通过
        if request.method in self.safe_methods:
            response = await call_next(request)
            # 为GET请求添加CSRF令牌
            if request.method == 'GET':
                session_id = request.headers.get('X-Session-ID', 'anonymous')
                csrf_token = self.generate_csrf_token(session_id)
                response.headers['X-CSRF-Token'] = csrf_token
            return response
        
        # 检查是否为豁免路径
        if request.url.path in self.exempt_paths:
            return await call_next(request)
        
        # 验证CSRF令牌
        csrf_token = request.headers.get('X-CSRF-Token')
        session_id = request.headers.get('X-Session-ID', 'anonymous')
        
        if not csrf_token or not self.validate_csrf_token(csrf_token, session_id):
            logger.warning(f"CSRF validation failed for {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF令牌验证失败"}
            )
        
        return await call_next(request)

def setup_security_middleware(app):
    """设置所有安全中间件"""
    
    # CORS中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 安全头中间件
    app.add_middleware(SecurityHeadersMiddleware)
    
    # 速率限制中间件
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=100,
        window_size=60,
        block_duration=300
    )
    
    # 请求验证中间件
    app.add_middleware(
        RequestValidationMiddleware,
        max_content_length=10 * 1024 * 1024,
        blocked_user_agents=['bot', 'crawler', 'spider']
    )
    
    # 安全审计中间件
    app.add_middleware(
        SecurityAuditMiddleware,
        log_sensitive_endpoints=True
    )
    
    # CSRF保护中间件（可选，需要前端配合）
    # app.add_middleware(
    #     CSRFProtectionMiddleware,
    #     secret_key='your-csrf-secret-key'
    # )
    
    logger.info("[OK] 安全中间件已全部加载")
