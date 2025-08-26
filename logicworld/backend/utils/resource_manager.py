"""
资源管理和限制模块
提供系统资源的监控、限制和管理功能
"""
import asyncio
import logging
import psutil
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
import threading
import weakref


@dataclass
class ResourceLimits:
    """资源限制配置"""
    max_memory_mb: float = 16384  # 最大内存使用 (MB) - 临时提高到16GB
    max_cpu_percent: float = 80.0  # 最大CPU使用率 (%)
    max_concurrent_tasks: int = 10  # 最大并发任务数
    max_execution_time: int = 3600  # 最大执行时间 (秒)
    max_file_size_mb: float = 100  # 最大文件大小 (MB)
    max_network_requests_per_minute: int = 100  # 每分钟最大网络请求数


@dataclass
class ResourceQuota:
    """资源配额"""
    user_id: Optional[str] = None
    daily_execution_limit: int = 100  # 每日执行次数限制
    daily_execution_count: int = 0  # 今日已执行次数
    monthly_compute_hours: float = 10.0  # 每月计算小时限制
    monthly_compute_used: float = 0.0  # 本月已使用计算小时
    storage_limit_mb: float = 1024  # 存储限制 (MB)
    storage_used_mb: float = 0.0  # 已使用存储 (MB)
    last_reset_date: Optional[datetime] = None


class ResourceTracker:
    """资源跟踪器"""
    
    def __init__(self):
        self.start_time = time.time()
        self.peak_memory = 0.0
        self.peak_cpu = 0.0
        self.total_network_requests = 0
        self.total_file_operations = 0
        self.execution_history = deque(maxlen=1000)
        
    def record_execution(self, duration: float, memory_used: float, cpu_used: float):
        """记录执行信息"""
        self.execution_history.append({
            'timestamp': datetime.now(),
            'duration': duration,
            'memory_used': memory_used,
            'cpu_used': cpu_used
        })
        
        self.peak_memory = max(self.peak_memory, memory_used)
        self.peak_cpu = max(self.peak_cpu, cpu_used)
    
    def record_network_request(self):
        """记录网络请求"""
        self.total_network_requests += 1
    
    def record_file_operation(self):
        """记录文件操作"""
        self.total_file_operations += 1
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        current_time = time.time()
        uptime = current_time - self.start_time
        
        recent_executions = [
            exec_info for exec_info in self.execution_history
            if (datetime.now() - exec_info['timestamp']).total_seconds() < 3600  # 最近1小时
        ]
        
        return {
            'uptime_seconds': uptime,
            'peak_memory_mb': self.peak_memory,
            'peak_cpu_percent': self.peak_cpu,
            'total_network_requests': self.total_network_requests,
            'total_file_operations': self.total_file_operations,
            'recent_executions_count': len(recent_executions),
            'average_execution_time': (
                sum(e['duration'] for e in recent_executions) / len(recent_executions)
                if recent_executions else 0
            )
        }


class ResourceLimiter:
    """资源限制器"""
    
    def __init__(self, limits: ResourceLimits):
        self.limits = limits
        self.active_tasks = 0
        self.network_requests_history = deque(maxlen=100)
        self.file_operations_history = deque(maxlen=100)
        self._lock = threading.Lock()
    
    async def check_memory_limit(self) -> bool:
        """检查内存限制"""
        memory_info = psutil.virtual_memory()
        current_memory_mb = memory_info.used / 1024 / 1024
        
        if current_memory_mb > self.limits.max_memory_mb:
            logging.warning(f"Memory limit exceeded: {current_memory_mb:.1f}MB > {self.limits.max_memory_mb}MB")
            return False
        
        return True
    
    async def check_cpu_limit(self) -> bool:
        """检查CPU限制"""
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        if cpu_percent > self.limits.max_cpu_percent:
            logging.warning(f"CPU limit exceeded: {cpu_percent:.1f}% > {self.limits.max_cpu_percent}%")
            return False
        
        return True
    
    async def check_concurrent_tasks_limit(self) -> bool:
        """检查并发任务限制"""
        with self._lock:
            if self.active_tasks >= self.limits.max_concurrent_tasks:
                logging.warning(f"Concurrent tasks limit exceeded: {self.active_tasks} >= {self.limits.max_concurrent_tasks}")
                return False
        
        return True
    
    async def check_network_rate_limit(self) -> bool:
        """检查网络请求频率限制"""
        current_time = datetime.now()
        cutoff_time = current_time - timedelta(minutes=1)
        
        # 清理过期记录
        while self.network_requests_history and self.network_requests_history[0] < cutoff_time:
            self.network_requests_history.popleft()
        
        if len(self.network_requests_history) >= self.limits.max_network_requests_per_minute:
            logging.warning(f"Network rate limit exceeded: {len(self.network_requests_history)} requests in last minute")
            return False
        
        return True
    
    async def acquire_task_slot(self) -> bool:
        """获取任务槽位"""
        if not await self.check_concurrent_tasks_limit():
            return False
        
        if not await self.check_memory_limit():
            return False
        
        if not await self.check_cpu_limit():
            return False
        
        with self._lock:
            self.active_tasks += 1
        
        return True
    
    def release_task_slot(self):
        """释放任务槽位"""
        with self._lock:
            self.active_tasks = max(0, self.active_tasks - 1)
    
    def record_network_request(self):
        """记录网络请求"""
        self.network_requests_history.append(datetime.now())
    
    def record_file_operation(self, file_size_mb: float = 0) -> bool:
        """记录文件操作"""
        if file_size_mb > self.limits.max_file_size_mb:
            logging.warning(f"File size limit exceeded: {file_size_mb:.1f}MB > {self.limits.max_file_size_mb}MB")
            return False
        
        self.file_operations_history.append({
            'timestamp': datetime.now(),
            'size_mb': file_size_mb
        })
        
        return True


class QuotaManager:
    """配额管理器"""
    
    def __init__(self):
        self.user_quotas: Dict[str, ResourceQuota] = {}
        self._lock = threading.Lock()
    
    def get_user_quota(self, user_id: str) -> ResourceQuota:
        """获取用户配额"""
        with self._lock:
            if user_id not in self.user_quotas:
                self.user_quotas[user_id] = ResourceQuota(user_id=user_id)
            
            quota = self.user_quotas[user_id]
            
            # 检查是否需要重置每日计数
            today = datetime.now().date()
            if quota.last_reset_date != today:
                quota.daily_execution_count = 0
                quota.last_reset_date = today
            
            return quota
    
    def check_daily_execution_limit(self, user_id: str) -> bool:
        """检查每日执行限制"""
        quota = self.get_user_quota(user_id)
        return quota.daily_execution_count < quota.daily_execution_limit
    
    def check_monthly_compute_limit(self, user_id: str, estimated_hours: float) -> bool:
        """检查每月计算时间限制"""
        quota = self.get_user_quota(user_id)
        return (quota.monthly_compute_used + estimated_hours) <= quota.monthly_compute_hours
    
    def check_storage_limit(self, user_id: str, additional_mb: float) -> bool:
        """检查存储限制"""
        quota = self.get_user_quota(user_id)
        return (quota.storage_used_mb + additional_mb) <= quota.storage_limit_mb
    
    def consume_daily_execution(self, user_id: str) -> bool:
        """消费每日执行次数"""
        if not self.check_daily_execution_limit(user_id):
            return False
        
        with self._lock:
            quota = self.get_user_quota(user_id)
            quota.daily_execution_count += 1
        
        return True
    
    def consume_compute_time(self, user_id: str, hours: float) -> bool:
        """消费计算时间"""
        if not self.check_monthly_compute_limit(user_id, hours):
            return False
        
        with self._lock:
            quota = self.get_user_quota(user_id)
            quota.monthly_compute_used += hours
        
        return True
    
    def consume_storage(self, user_id: str, mb: float) -> bool:
        """消费存储空间"""
        if not self.check_storage_limit(user_id, mb):
            return False
        
        with self._lock:
            quota = self.get_user_quota(user_id)
            quota.storage_used_mb += mb
        
        return True
    
    def get_quota_status(self, user_id: str) -> Dict[str, Any]:
        """获取配额状态"""
        quota = self.get_user_quota(user_id)
        
        return {
            'daily_executions': {
                'used': quota.daily_execution_count,
                'limit': quota.daily_execution_limit,
                'remaining': quota.daily_execution_limit - quota.daily_execution_count
            },
            'monthly_compute': {
                'used': quota.monthly_compute_used,
                'limit': quota.monthly_compute_hours,
                'remaining': quota.monthly_compute_hours - quota.monthly_compute_used
            },
            'storage': {
                'used': quota.storage_used_mb,
                'limit': quota.storage_limit_mb,
                'remaining': quota.storage_limit_mb - quota.storage_used_mb
            }
        }


class ResourceManager:
    """资源管理器"""
    
    def __init__(self, limits: Optional[ResourceLimits] = None):
        self.limits = limits or ResourceLimits()
        self.tracker = ResourceTracker()
        self.limiter = ResourceLimiter(self.limits)
        self.quota_manager = QuotaManager()
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def can_execute_task(self, user_id: Optional[str] = None, estimated_duration: float = 0) -> Dict[str, Any]:
        """检查是否可以执行任务"""
        checks = {
            'memory_ok': await self.limiter.check_memory_limit(),
            'cpu_ok': await self.limiter.check_cpu_limit(),
            'concurrency_ok': await self.limiter.check_concurrent_tasks_limit(),
            'network_rate_ok': await self.limiter.check_network_rate_limit()
        }
        
        if user_id:
            estimated_hours = estimated_duration / 3600
            checks.update({
                'daily_quota_ok': self.quota_manager.check_daily_execution_limit(user_id),
                'compute_quota_ok': self.quota_manager.check_monthly_compute_limit(user_id, estimated_hours)
            })
        
        can_execute = all(checks.values())
        
        return {
            'can_execute': can_execute,
            'checks': checks,
            'reason': self._get_failure_reason(checks) if not can_execute else None
        }
    
    def _get_failure_reason(self, checks: Dict[str, bool]) -> str:
        """获取失败原因"""
        failed_checks = [check for check, passed in checks.items() if not passed]
        
        reasons = {
            'memory_ok': '内存使用超出限制',
            'cpu_ok': 'CPU使用率过高',
            'concurrency_ok': '并发任务数达到上限',
            'network_rate_ok': '网络请求频率过高',
            'daily_quota_ok': '每日执行次数已用完',
            'compute_quota_ok': '每月计算时间配额不足'
        }
        
        return '; '.join(reasons.get(check, check) for check in failed_checks)
    
    async def acquire_resources(self, user_id: Optional[str] = None) -> bool:
        """获取资源"""
        if not await self.limiter.acquire_task_slot():
            return False
        
        if user_id:
            if not self.quota_manager.consume_daily_execution(user_id):
                self.limiter.release_task_slot()
                return False
        
        return True
    
    def release_resources(self, user_id: Optional[str] = None, execution_time: float = 0):
        """释放资源"""
        self.limiter.release_task_slot()
        
        if user_id and execution_time > 0:
            hours = execution_time / 3600
            self.quota_manager.consume_compute_time(user_id, hours)
    
    def get_resource_status(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """获取资源状态"""
        memory_info = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent()
        
        status = {
            'system': {
                'memory_used_mb': memory_info.used / 1024 / 1024,
                'memory_limit_mb': self.limits.max_memory_mb,
                'cpu_percent': cpu_percent,
                'cpu_limit_percent': self.limits.max_cpu_percent,
                'active_tasks': self.limiter.active_tasks,
                'max_concurrent_tasks': self.limits.max_concurrent_tasks
            },
            'statistics': self.tracker.get_statistics()
        }
        
        if user_id:
            status['quota'] = self.quota_manager.get_quota_status(user_id)
        
        return status


# 全局资源管理器实例
resource_manager = ResourceManager()
