#!/usr/bin/env python3
"""
意图检测实时监控系统
实时监控准确度、自动调优、异常检测
"""

import asyncio
import logging
import time
import json
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import deque, defaultdict
import threading
from enum import Enum

class AlertLevel(Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class PerformanceMetrics:
    """性能指标"""
    accuracy_rate: float                    # 准确率
    response_time: float                    # 响应时间
    confidence_calibration: float           # 置信度校准
    user_satisfaction: float               # 用户满意度
    error_rate: float                      # 错误率
    throughput: float                      # 吞吐量 (请求/秒)
    
    timestamp: datetime
    sample_count: int

@dataclass
class Alert:
    """告警信息"""
    level: AlertLevel
    message: str
    metric_name: str
    current_value: float
    threshold: float
    timestamp: datetime
    suggestion: str = ""

class RealTimeMonitor:
    """实时监控器"""
    
    def __init__(self, window_size: int = 100):
        self.logger = logging.getLogger(__name__)
        self.window_size = window_size
        
        # 滑动窗口数据
        self.accuracy_window = deque(maxlen=window_size)
        self.response_time_window = deque(maxlen=window_size)
        self.confidence_window = deque(maxlen=window_size)
        self.satisfaction_window = deque(maxlen=window_size)
        
        # 计数器
        self.total_requests = 0
        self.error_count = 0
        self.start_time = time.time()
        
        # 告警阈值
        self.thresholds = {
            'accuracy_rate': 0.7,          # 准确率低于70%告警
            'response_time': 2.0,          # 响应时间超过2秒告警
            'error_rate': 0.1,             # 错误率超过10%告警
            'confidence_calibration': 0.6, # 置信度校准低于60%告警
            'user_satisfaction': 0.6       # 用户满意度低于60%告警
        }
        
        # 告警回调
        self.alert_callbacks: List[Callable[[Alert], None]] = []
        
        # 监控状态
        self.monitoring_active = False
        self.monitor_thread = None
    
    def add_alert_callback(self, callback: Callable[[Alert], None]):
        """添加告警回调函数"""
        self.alert_callbacks.append(callback)
    
    def record_detection(self, 
                        accuracy: float,
                        response_time: float,
                        confidence: float,
                        user_satisfaction: Optional[float] = None,
                        is_error: bool = False):
        """记录一次检测结果"""
        
        self.total_requests += 1
        
        if is_error:
            self.error_count += 1
        else:
            self.accuracy_window.append(accuracy)
            self.response_time_window.append(response_time)
            self.confidence_window.append(confidence)
            
            if user_satisfaction is not None:
                self.satisfaction_window.append(user_satisfaction)
    
    def get_current_metrics(self) -> PerformanceMetrics:
        """获取当前性能指标"""
        
        if not self.accuracy_window:
            return PerformanceMetrics(
                accuracy_rate=0.0,
                response_time=0.0,
                confidence_calibration=0.0,
                user_satisfaction=0.0,
                error_rate=0.0,
                throughput=0.0,
                timestamp=datetime.now(),
                sample_count=0
            )
        
        # 计算指标
        accuracy_rate = sum(self.accuracy_window) / len(self.accuracy_window)
        avg_response_time = sum(self.response_time_window) / len(self.response_time_window)
        avg_confidence = sum(self.confidence_window) / len(self.confidence_window)
        
        # 置信度校准 (简化计算)
        confidence_calibration = 1.0 - abs(avg_confidence - accuracy_rate)
        
        # 用户满意度
        if self.satisfaction_window:
            user_satisfaction = sum(self.satisfaction_window) / len(self.satisfaction_window)
        else:
            user_satisfaction = 0.8  # 默认值
        
        # 错误率
        error_rate = self.error_count / self.total_requests if self.total_requests > 0 else 0.0
        
        # 吞吐量
        elapsed_time = time.time() - self.start_time
        throughput = self.total_requests / elapsed_time if elapsed_time > 0 else 0.0
        
        return PerformanceMetrics(
            accuracy_rate=accuracy_rate,
            response_time=avg_response_time,
            confidence_calibration=confidence_calibration,
            user_satisfaction=user_satisfaction,
            error_rate=error_rate,
            throughput=throughput,
            timestamp=datetime.now(),
            sample_count=len(self.accuracy_window)
        )
    
    def check_alerts(self, metrics: PerformanceMetrics):
        """检查告警条件"""
        
        alerts = []
        
        # 准确率告警
        if metrics.accuracy_rate < self.thresholds['accuracy_rate']:
            alerts.append(Alert(
                level=AlertLevel.WARNING,
                message=f"意图检测准确率过低: {metrics.accuracy_rate:.2f}",
                metric_name="accuracy_rate",
                current_value=metrics.accuracy_rate,
                threshold=self.thresholds['accuracy_rate'],
                timestamp=datetime.now(),
                suggestion="建议检查训练数据质量或调整模型参数"
            ))
        
        # 响应时间告警
        if metrics.response_time > self.thresholds['response_time']:
            alerts.append(Alert(
                level=AlertLevel.WARNING,
                message=f"响应时间过长: {metrics.response_time:.2f}s",
                metric_name="response_time",
                current_value=metrics.response_time,
                threshold=self.thresholds['response_time'],
                timestamp=datetime.now(),
                suggestion="建议优化模型推理速度或增加缓存"
            ))
        
        # 错误率告警
        if metrics.error_rate > self.thresholds['error_rate']:
            alerts.append(Alert(
                level=AlertLevel.ERROR,
                message=f"错误率过高: {metrics.error_rate:.2f}",
                metric_name="error_rate",
                current_value=metrics.error_rate,
                threshold=self.thresholds['error_rate'],
                timestamp=datetime.now(),
                suggestion="建议检查系统稳定性和异常处理"
            ))
        
        # 置信度校准告警
        if metrics.confidence_calibration < self.thresholds['confidence_calibration']:
            alerts.append(Alert(
                level=AlertLevel.WARNING,
                message=f"置信度校准不准确: {metrics.confidence_calibration:.2f}",
                metric_name="confidence_calibration",
                current_value=metrics.confidence_calibration,
                threshold=self.thresholds['confidence_calibration'],
                timestamp=datetime.now(),
                suggestion="建议重新校准置信度计算方法"
            ))
        
        # 用户满意度告警
        if metrics.user_satisfaction < self.thresholds['user_satisfaction']:
            alerts.append(Alert(
                level=AlertLevel.WARNING,
                message=f"用户满意度过低: {metrics.user_satisfaction:.2f}",
                metric_name="user_satisfaction",
                current_value=metrics.user_satisfaction,
                threshold=self.thresholds['user_satisfaction'],
                timestamp=datetime.now(),
                suggestion="建议分析用户反馈并改进检测逻辑"
            ))
        
        # 触发告警回调
        for alert in alerts:
            for callback in self.alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    self.logger.error(f"告警回调执行失败: {e}")
        
        return alerts
    
    def start_monitoring(self, check_interval: float = 30.0):
        """启动监控"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        def monitor_loop():
            while self.monitoring_active:
                try:
                    metrics = self.get_current_metrics()
                    alerts = self.check_alerts(metrics)
                    
                    if alerts:
                        self.logger.warning(f"检测到 {len(alerts)} 个告警")
                    
                    time.sleep(check_interval)
                    
                except Exception as e:
                    self.logger.error(f"监控循环异常: {e}")
                    time.sleep(check_interval)
        
        self.monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        self.logger.info("🔍 实时监控已启动")
    
    def stop_monitoring(self):
        """停止监控"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5.0)
        
        self.logger.info("⏹️ 实时监控已停止")

class AdaptiveOptimizer:
    """自适应优化器"""
    
    def __init__(self, monitor: RealTimeMonitor):
        self.monitor = monitor
        self.logger = logging.getLogger(__name__)
        
        # 优化历史
        self.optimization_history = []
        
        # 优化策略
        self.strategies = {
            'low_accuracy': self._optimize_for_accuracy,
            'slow_response': self._optimize_for_speed,
            'poor_calibration': self._optimize_calibration
        }
    
    async def auto_optimize(self) -> Dict[str, Any]:
        """自动优化"""
        
        metrics = self.monitor.get_current_metrics()
        optimizations = []
        
        # 根据指标选择优化策略
        if metrics.accuracy_rate < 0.7:
            result = await self._optimize_for_accuracy(metrics)
            optimizations.append(result)
        
        if metrics.response_time > 2.0:
            result = await self._optimize_for_speed(metrics)
            optimizations.append(result)
        
        if metrics.confidence_calibration < 0.6:
            result = await self._optimize_calibration(metrics)
            optimizations.append(result)
        
        # 记录优化历史
        optimization_record = {
            'timestamp': datetime.now(),
            'metrics_before': metrics,
            'optimizations_applied': optimizations
        }
        self.optimization_history.append(optimization_record)
        
        return {
            'optimizations_count': len(optimizations),
            'optimizations': optimizations,
            'metrics': metrics
        }
    
    async def _optimize_for_accuracy(self, metrics: PerformanceMetrics) -> Dict[str, Any]:
        """优化准确率"""
        
        suggestions = []
        
        if metrics.accuracy_rate < 0.5:
            suggestions.extend([
                "增加本地检测的关键词模式",
                "调整云端模型的提示词",
                "增加上下文信息的权重"
            ])
        elif metrics.accuracy_rate < 0.7:
            suggestions.extend([
                "优化意图分类阈值",
                "增加交叉验证检测器",
                "改进用户反馈收集"
            ])
        
        self.logger.info(f"🎯 准确率优化建议: {suggestions}")
        
        return {
            'strategy': 'accuracy_optimization',
            'current_accuracy': metrics.accuracy_rate,
            'suggestions': suggestions,
            'priority': 'high' if metrics.accuracy_rate < 0.5 else 'medium'
        }
    
    async def _optimize_for_speed(self, metrics: PerformanceMetrics) -> Dict[str, Any]:
        """优化响应速度"""
        
        suggestions = []
        
        if metrics.response_time > 5.0:
            suggestions.extend([
                "增加本地检测的置信度阈值",
                "减少云端API调用",
                "实现结果缓存机制"
            ])
        elif metrics.response_time > 2.0:
            suggestions.extend([
                "优化云端API超时设置",
                "并行执行本地和云端检测",
                "预加载常用模式"
            ])
        
        self.logger.info(f"⚡ 速度优化建议: {suggestions}")
        
        return {
            'strategy': 'speed_optimization',
            'current_response_time': metrics.response_time,
            'suggestions': suggestions,
            'priority': 'high' if metrics.response_time > 5.0 else 'medium'
        }
    
    async def _optimize_calibration(self, metrics: PerformanceMetrics) -> Dict[str, Any]:
        """优化置信度校准"""
        
        suggestions = [
            "重新校准置信度计算公式",
            "增加置信度验证样本",
            "调整本地和云端结果融合权重"
        ]
        
        self.logger.info(f"📊 校准优化建议: {suggestions}")
        
        return {
            'strategy': 'calibration_optimization',
            'current_calibration': metrics.confidence_calibration,
            'suggestions': suggestions,
            'priority': 'medium'
        }

class IntentMonitoringSystem:
    """意图检测监控系统 - 主控制器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.monitor = RealTimeMonitor()
        self.optimizer = AdaptiveOptimizer(self.monitor)
        
        # 设置告警回调
        self.monitor.add_alert_callback(self._handle_alert)
        
        # 监控状态
        self.system_active = False
    
    def _handle_alert(self, alert: Alert):
        """处理告警"""
        level_emoji = {
            AlertLevel.INFO: "ℹ️",
            AlertLevel.WARNING: "⚠️", 
            AlertLevel.ERROR: "❌",
            AlertLevel.CRITICAL: "🚨"
        }
        
        emoji = level_emoji.get(alert.level, "📢")
        
        self.logger.warning(
            f"{emoji} [{alert.level.value.upper()}] {alert.message} "
            f"(当前值: {alert.current_value:.2f}, 阈值: {alert.threshold:.2f})"
        )
        
        if alert.suggestion:
            self.logger.info(f"💡 建议: {alert.suggestion}")
    
    async def record_detection_result(self,
                                    session_id: str,
                                    detection_result: Dict[str, Any],
                                    response_time: float,
                                    user_feedback: Optional[Dict[str, Any]] = None,
                                    is_error: bool = False):
        """记录检测结果"""
        
        # 提取指标
        confidence = detection_result.get('confidence', 0.5)
        
        # 简化的准确率计算 (实际应该基于用户反馈)
        if user_feedback:
            accuracy = 1.0 if user_feedback.get('correct', False) else 0.0
            satisfaction = user_feedback.get('satisfaction', 0.8)
        else:
            accuracy = confidence  # 临时使用置信度作为准确率
            satisfaction = None
        
        # 记录到监控器
        self.monitor.record_detection(
            accuracy=accuracy,
            response_time=response_time,
            confidence=confidence,
            user_satisfaction=satisfaction,
            is_error=is_error
        )
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """获取监控面板数据"""
        
        metrics = self.monitor.get_current_metrics()
        
        return {
            'current_metrics': {
                'accuracy_rate': f"{metrics.accuracy_rate:.2%}",
                'response_time': f"{metrics.response_time:.2f}s",
                'confidence_calibration': f"{metrics.confidence_calibration:.2%}",
                'user_satisfaction': f"{metrics.user_satisfaction:.2%}",
                'error_rate': f"{metrics.error_rate:.2%}",
                'throughput': f"{metrics.throughput:.1f} req/s"
            },
            'sample_count': metrics.sample_count,
            'last_updated': metrics.timestamp.isoformat(),
            'system_status': 'active' if self.system_active else 'inactive',
            'thresholds': self.monitor.thresholds
        }
    
    def start_system(self):
        """启动监控系统"""
        if not self.system_active:
            self.monitor.start_monitoring()
            self.system_active = True
            self.logger.info("🚀 意图检测监控系统已启动")
    
    def stop_system(self):
        """停止监控系统"""
        if self.system_active:
            self.monitor.stop_monitoring()
            self.system_active = False
            self.logger.info("⏹️ 意图检测监控系统已停止")

# 全局实例
_monitoring_system: Optional[IntentMonitoringSystem] = None

def get_monitoring_system() -> IntentMonitoringSystem:
    """获取监控系统实例"""
    global _monitoring_system
    if _monitoring_system is None:
        _monitoring_system = IntentMonitoringSystem()
    return _monitoring_system
