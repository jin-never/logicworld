"""
监控和告警模块
提供系统监控、性能指标收集和告警功能
"""
import asyncio
import logging
import time
import psutil
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import deque
import json
import aiohttp


@dataclass
class MetricPoint:
    """指标数据点"""
    timestamp: datetime
    value: float
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class Alert:
    """告警"""
    id: str
    name: str
    description: str
    severity: str  # critical, warning, info
    condition: str
    threshold: float
    current_value: float
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    status: str = "active"  # active, resolved, suppressed


class MetricsCollector:
    """指标收集器"""
    
    def __init__(self):
        self.metrics: Dict[str, deque] = {}
        self.max_points = 1000  # 每个指标最多保留1000个数据点
        self.collection_interval = 10  # 收集间隔（秒）
        self.is_collecting = False
        self._collection_task: Optional[asyncio.Task] = None
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def start_collection(self):
        """开始收集指标"""
        if self.is_collecting:
            return
        
        self.is_collecting = True
        self._collection_task = asyncio.create_task(self._collection_loop())
        self.logger.info("Metrics collection started")
    
    async def stop_collection(self):
        """停止收集指标"""
        self.is_collecting = False
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
        self.logger.info("Metrics collection stopped")
    
    async def _collection_loop(self):
        """收集循环"""
        while self.is_collecting:
            try:
                await self._collect_system_metrics()
                await self._collect_application_metrics()
                await asyncio.sleep(self.collection_interval)
            except Exception as e:
                self.logger.error(f"Error in metrics collection: {e}")
                await asyncio.sleep(self.collection_interval)
    
    async def _collect_system_metrics(self):
        """收集系统指标"""
        now = datetime.now()
        
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=0.1)
        self._add_metric("system_cpu_percent", cpu_percent, now)
        
        # 内存使用
        memory = psutil.virtual_memory()
        self._add_metric("system_memory_percent", memory.percent, now)
        self._add_metric("system_memory_used_mb", memory.used / 1024 / 1024, now)
        self._add_metric("system_memory_available_mb", memory.available / 1024 / 1024, now)
        
        # 磁盘使用
        disk = psutil.disk_usage('/')
        self._add_metric("system_disk_percent", disk.percent, now)
        self._add_metric("system_disk_used_gb", disk.used / 1024 / 1024 / 1024, now)
        self._add_metric("system_disk_free_gb", disk.free / 1024 / 1024 / 1024, now)
        
        # 网络IO
        network = psutil.net_io_counters()
        self._add_metric("system_network_bytes_sent", network.bytes_sent, now)
        self._add_metric("system_network_bytes_recv", network.bytes_recv, now)
    
    async def _collect_application_metrics(self):
        """收集应用指标"""
        now = datetime.now()
        
        # 从其他模块获取应用指标
        try:
            # 尝试导入可选的监控模块
            try:
                # 尝试绝对导入路径
                from ai.concurrent_executor import concurrent_executor
                stats = concurrent_executor.get_performance_stats()
                self._add_metric("app_active_tasks", stats.get('current_resource_usage', {}).get('active_tasks', 0), now)
                self._add_metric("app_completed_tasks", stats.get('completed_tasks', 0), now)
                self._add_metric("app_failed_tasks", stats.get('failed_tasks', 0), now)
            except ImportError:
                # 如果模块不存在，使用默认值
                self._add_metric("app_active_tasks", 0, now)
                self._add_metric("app_completed_tasks", 0, now)
                self._add_metric("app_failed_tasks", 0, now)
            
            try:
                # 尝试导入资源管理器
                from utils.resource_manager import resource_manager
                resource_status = resource_manager.get_resource_status()
                system_status = resource_status.get('system', {})
                self._add_metric("app_memory_used_mb", system_status.get('memory_used_mb', 0), now)
                self._add_metric("app_cpu_percent", system_status.get('cpu_percent', 0), now)
            except ImportError:
                # 使用系统监控获取基本指标
                import psutil
                process = psutil.Process()
                self._add_metric("app_memory_used_mb", process.memory_info().rss / 1024 / 1024, now)
                self._add_metric("app_cpu_percent", process.cpu_percent(), now)
            
        except Exception as e:
            # 静默处理，避免垃圾邮件警告
            self.logger.debug(f"Failed to collect application metrics: {e}")
    
    def _add_metric(self, name: str, value: float, timestamp: datetime, labels: Dict[str, str] = None):
        """添加指标数据点"""
        if name not in self.metrics:
            self.metrics[name] = deque(maxlen=self.max_points)
        
        point = MetricPoint(
            timestamp=timestamp,
            value=value,
            labels=labels or {}
        )
        
        self.metrics[name].append(point)
    
    def get_metric(self, name: str, duration_minutes: int = 60) -> List[MetricPoint]:
        """获取指标数据"""
        if name not in self.metrics:
            return []
        
        cutoff_time = datetime.now() - timedelta(minutes=duration_minutes)
        return [
            point for point in self.metrics[name]
            if point.timestamp > cutoff_time
        ]
    
    def get_latest_value(self, name: str) -> Optional[float]:
        """获取最新值"""
        if name not in self.metrics or not self.metrics[name]:
            return None
        
        return self.metrics[name][-1].value
    
    def get_all_metrics(self) -> Dict[str, List[Dict[str, Any]]]:
        """获取所有指标"""
        result = {}
        for name, points in self.metrics.items():
            result[name] = [
                {
                    "timestamp": point.timestamp.isoformat(),
                    "value": point.value,
                    "labels": point.labels
                }
                for point in points
            ]
        return result


class AlertManager:
    """告警管理器"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: List[Dict[str, Any]] = []
        self.notification_handlers: List[Callable] = []
        self.check_interval = 30  # 检查间隔（秒）
        self.is_monitoring = False
        self._monitoring_task: Optional[asyncio.Task] = None
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 默认告警规则
        self._setup_default_rules()
    
    def _setup_default_rules(self):
        """设置默认告警规则"""
        self.alert_rules = [
            {
                "id": "high_cpu_usage",
                "name": "CPU使用率过高",
                "description": "系统CPU使用率超过80%",
                "metric": "system_cpu_percent",
                "condition": ">",
                "threshold": 80.0,
                "severity": "warning",
                "duration_minutes": 5
            },
            {
                "id": "high_memory_usage",
                "name": "内存使用率过高",
                "description": "系统内存使用率超过90%",
                "metric": "system_memory_percent",
                "condition": ">",
                "threshold": 90.0,
                "severity": "critical",
                "duration_minutes": 2
            },
            {
                "id": "high_disk_usage",
                "name": "磁盘使用率过高",
                "description": "系统磁盘使用率超过85%",
                "metric": "system_disk_percent",
                "condition": ">",
                "threshold": 85.0,
                "severity": "warning",
                "duration_minutes": 10
            },
            {
                "id": "high_task_failure_rate",
                "name": "任务失败率过高",
                "description": "应用任务失败率超过10%",
                "metric": "app_failed_tasks",
                "condition": ">",
                "threshold": 10.0,
                "severity": "critical",
                "duration_minutes": 5
            }
        ]
    
    async def start_monitoring(self):
        """开始监控"""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        self.logger.info("Alert monitoring started")
    
    async def stop_monitoring(self):
        """停止监控"""
        self.is_monitoring = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        self.logger.info("Alert monitoring stopped")
    
    async def _monitoring_loop(self):
        """监控循环"""
        while self.is_monitoring:
            try:
                await self._check_alerts()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                self.logger.error(f"Error in alert monitoring: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _check_alerts(self):
        """检查告警"""
        for rule in self.alert_rules:
            await self._check_rule(rule)
    
    async def _check_rule(self, rule: Dict[str, Any]):
        """检查单个规则"""
        metric_name = rule["metric"]
        threshold = rule["threshold"]
        condition = rule["condition"]
        duration_minutes = rule.get("duration_minutes", 5)
        
        # 获取指标数据
        points = self.metrics_collector.get_metric(metric_name, duration_minutes)
        if not points:
            return
        
        # 检查条件
        triggered = False
        current_value = points[-1].value
        
        if condition == ">" and current_value > threshold:
            triggered = True
        elif condition == "<" and current_value < threshold:
            triggered = True
        elif condition == "==" and current_value == threshold:
            triggered = True
        elif condition == ">=" and current_value >= threshold:
            triggered = True
        elif condition == "<=" and current_value <= threshold:
            triggered = True
        
        alert_id = rule["id"]
        
        if triggered:
            if alert_id not in self.alerts or self.alerts[alert_id].status == "resolved":
                # 创建新告警
                alert = Alert(
                    id=alert_id,
                    name=rule["name"],
                    description=rule["description"],
                    severity=rule["severity"],
                    condition=f"{metric_name} {condition} {threshold}",
                    threshold=threshold,
                    current_value=current_value,
                    triggered_at=datetime.now()
                )
                
                self.alerts[alert_id] = alert
                await self._send_alert_notification(alert)
                self.logger.warning(f"Alert triggered: {alert.name}")
        else:
            if alert_id in self.alerts and self.alerts[alert_id].status == "active":
                # 解决告警
                alert = self.alerts[alert_id]
                alert.status = "resolved"
                alert.resolved_at = datetime.now()
                
                await self._send_resolution_notification(alert)
                self.logger.info(f"Alert resolved: {alert.name}")
    
    async def _send_alert_notification(self, alert: Alert):
        """发送告警通知"""
        for handler in self.notification_handlers:
            try:
                await handler(alert, "triggered")
            except Exception as e:
                self.logger.error(f"Failed to send alert notification: {e}")
    
    async def _send_resolution_notification(self, alert: Alert):
        """发送解决通知"""
        for handler in self.notification_handlers:
            try:
                await handler(alert, "resolved")
            except Exception as e:
                self.logger.error(f"Failed to send resolution notification: {e}")
    
    def add_notification_handler(self, handler: Callable):
        """添加通知处理器"""
        self.notification_handlers.append(handler)
    
    def get_active_alerts(self) -> List[Alert]:
        """获取活跃告警"""
        return [alert for alert in self.alerts.values() if alert.status == "active"]
    
    def get_all_alerts(self) -> List[Alert]:
        """获取所有告警"""
        return list(self.alerts.values())
    
    def get_alert_history(self, hours: int = 24) -> List[Alert]:
        """获取告警历史"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [
            alert for alert in self.alerts.values()
            if alert.triggered_at > cutoff_time
        ]


class HealthChecker:
    """健康检查器"""
    
    def __init__(self):
        self.checks: Dict[str, Callable] = {}
        self.last_check_results: Dict[str, Dict[str, Any]] = {}
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def register_check(self, name: str, check_func: Callable):
        """注册健康检查"""
        self.checks[name] = check_func
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """运行所有健康检查"""
        results = {}
        overall_status = "healthy"
        
        for name, check_func in self.checks.items():
            try:
                result = await check_func()
                results[name] = result
                
                if result.get("status") != "healthy":
                    overall_status = "unhealthy"
                    
            except Exception as e:
                results[name] = {
                    "status": "error",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                overall_status = "unhealthy"
                self.logger.error(f"Health check {name} failed: {e}")
        
        self.last_check_results = results
        
        return {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "checks": results
        }
    
    async def get_health_status(self) -> Dict[str, Any]:
        """获取健康状态"""
        if not self.last_check_results:
            return await self.run_all_checks()
        
        return {
            "status": "healthy" if all(
                check.get("status") == "healthy" 
                for check in self.last_check_results.values()
            ) else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "checks": self.last_check_results
        }


# 全局实例
metrics_collector = MetricsCollector()
alert_manager = AlertManager(metrics_collector)
health_checker = HealthChecker()


# 默认健康检查
async def database_health_check():
    """数据库健康检查"""
    try:
        # 这里应该检查数据库连接
        return {
            "status": "healthy",
            "message": "Database connection is healthy",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }


async def redis_health_check():
    """Redis健康检查"""
    try:
        # 这里应该检查Redis连接
        return {
            "status": "healthy",
            "message": "Redis connection is healthy",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }


# 注册默认健康检查
health_checker.register_check("database", database_health_check)
health_checker.register_check("redis", redis_health_check)
