"""
工作流性能监控和分析
提供详细的性能指标收集、分析和优化建议
"""
import asyncio
import time
import psutil
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
import statistics
import json


@dataclass
class PerformanceMetric:
    """性能指标"""
    timestamp: datetime
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str] = None


@dataclass
class NodePerformance:
    """节点性能数据"""
    node_id: str
    node_type: str
    execution_count: int = 0
    total_duration: float = 0.0
    min_duration: float = float('inf')
    max_duration: float = 0.0
    avg_duration: float = 0.0
    success_count: int = 0
    failure_count: int = 0
    last_execution: Optional[datetime] = None
    memory_usage: List[float] = None
    cpu_usage: List[float] = None


@dataclass
class WorkflowPerformance:
    """工作流性能数据"""
    workflow_id: str
    total_duration: float = 0.0
    node_count: int = 0
    parallel_efficiency: float = 0.0
    resource_utilization: Dict[str, float] = None
    bottleneck_nodes: List[str] = None
    optimization_suggestions: List[str] = None


class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self, max_history_size: int = 1000):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.max_history_size = max_history_size
        
        # 性能数据存储
        self.metrics_history: deque = deque(maxlen=max_history_size)
        self.node_performances: Dict[str, NodePerformance] = {}
        self.workflow_performances: Dict[str, WorkflowPerformance] = {}
        
        # 实时监控数据
        self.active_workflows: Dict[str, Dict[str, Any]] = {}
        self.system_metrics: Dict[str, deque] = {
            'cpu_percent': deque(maxlen=100),
            'memory_percent': deque(maxlen=100),
            'disk_io': deque(maxlen=100),
            'network_io': deque(maxlen=100)
        }
        
        # 性能阈值
        self.performance_thresholds = {
            'node_duration_warning': 30.0,  # 秒
            'node_duration_critical': 120.0,  # 秒
            'memory_usage_warning': 80.0,  # 百分比
            'memory_usage_critical': 95.0,  # 百分比
            'cpu_usage_warning': 80.0,  # 百分比
            'cpu_usage_critical': 95.0,  # 百分比
        }
        
        # 启动系统监控
        self._start_system_monitoring()
    
    def _start_system_monitoring(self):
        """启动系统监控"""
        asyncio.create_task(self._monitor_system_resources())
    
    async def _monitor_system_resources(self):
        """监控系统资源"""
        while True:
            try:
                # CPU使用率
                cpu_percent = psutil.cpu_percent(interval=1)
                self.system_metrics['cpu_percent'].append(cpu_percent)
                
                # 内存使用率
                memory = psutil.virtual_memory()
                self.system_metrics['memory_percent'].append(memory.percent)
                
                # 磁盘IO
                disk_io = psutil.disk_io_counters()
                if disk_io:
                    self.system_metrics['disk_io'].append({
                        'read_bytes': disk_io.read_bytes,
                        'write_bytes': disk_io.write_bytes,
                        'timestamp': time.time()
                    })
                
                # 网络IO
                network_io = psutil.net_io_counters()
                if network_io:
                    self.system_metrics['network_io'].append({
                        'bytes_sent': network_io.bytes_sent,
                        'bytes_recv': network_io.bytes_recv,
                        'timestamp': time.time()
                    })
                
                # 记录性能指标
                await self._record_system_metrics(cpu_percent, memory.percent)
                
            except Exception as e:
                self.logger.error(f"System monitoring error: {e}")
            
            await asyncio.sleep(5)  # 每5秒监控一次
    
    async def _record_system_metrics(self, cpu_percent: float, memory_percent: float):
        """记录系统指标"""
        timestamp = datetime.now()
        
        metrics = [
            PerformanceMetric(timestamp, 'cpu_usage', cpu_percent, 'percent'),
            PerformanceMetric(timestamp, 'memory_usage', memory_percent, 'percent')
        ]
        
        for metric in metrics:
            self.metrics_history.append(metric)
    
    def start_workflow_monitoring(self, workflow_id: str, node_count: int):
        """开始工作流监控"""
        self.active_workflows[workflow_id] = {
            'start_time': time.time(),
            'node_count': node_count,
            'completed_nodes': 0,
            'active_nodes': set(),
            'node_start_times': {},
            'resource_snapshots': []
        }
        
        # 初始化工作流性能数据
        self.workflow_performances[workflow_id] = WorkflowPerformance(
            workflow_id=workflow_id,
            node_count=node_count,
            resource_utilization={}
        )
    
    def start_node_monitoring(self, workflow_id: str, node_id: str, node_type: str):
        """开始节点监控"""
        if workflow_id in self.active_workflows:
            workflow_data = self.active_workflows[workflow_id]
            workflow_data['active_nodes'].add(node_id)
            workflow_data['node_start_times'][node_id] = time.time()
            
            # 记录资源快照
            self._take_resource_snapshot(workflow_id, f"node_{node_id}_start")
        
        # 初始化节点性能数据
        if node_id not in self.node_performances:
            self.node_performances[node_id] = NodePerformance(
                node_id=node_id,
                node_type=node_type,
                memory_usage=[],
                cpu_usage=[]
            )
    
    def end_node_monitoring(self, workflow_id: str, node_id: str, 
                          success: bool, result: Any = None):
        """结束节点监控"""
        if workflow_id not in self.active_workflows:
            return
        
        workflow_data = self.active_workflows[workflow_id]
        
        if node_id in workflow_data['node_start_times']:
            # 计算执行时间
            start_time = workflow_data['node_start_times'][node_id]
            duration = time.time() - start_time
            
            # 更新节点性能数据
            self._update_node_performance(node_id, duration, success)
            
            # 更新工作流数据
            workflow_data['completed_nodes'] += 1
            workflow_data['active_nodes'].discard(node_id)
            
            # 记录资源快照
            self._take_resource_snapshot(workflow_id, f"node_{node_id}_end")
            
            # 记录性能指标
            self._record_node_metric(node_id, duration, success)
    
    def end_workflow_monitoring(self, workflow_id: str, success: bool):
        """结束工作流监控"""
        if workflow_id not in self.active_workflows:
            return
        
        workflow_data = self.active_workflows[workflow_id]
        total_duration = time.time() - workflow_data['start_time']
        
        # 更新工作流性能数据
        workflow_perf = self.workflow_performances[workflow_id]
        workflow_perf.total_duration = total_duration
        
        # 计算并行效率
        workflow_perf.parallel_efficiency = self._calculate_parallel_efficiency(workflow_id)
        
        # 分析瓶颈节点
        workflow_perf.bottleneck_nodes = self._identify_bottleneck_nodes(workflow_id)
        
        # 生成优化建议
        workflow_perf.optimization_suggestions = self._generate_optimization_suggestions(workflow_id)
        
        # 清理活动工作流数据
        del self.active_workflows[workflow_id]
        
        self.logger.info(f"Workflow {workflow_id} monitoring completed: {total_duration:.2f}s")
    
    def _update_node_performance(self, node_id: str, duration: float, success: bool):
        """更新节点性能数据"""
        perf = self.node_performances[node_id]
        
        perf.execution_count += 1
        perf.total_duration += duration
        perf.last_execution = datetime.now()
        
        if success:
            perf.success_count += 1
        else:
            perf.failure_count += 1
        
        # 更新统计数据
        perf.min_duration = min(perf.min_duration, duration)
        perf.max_duration = max(perf.max_duration, duration)
        perf.avg_duration = perf.total_duration / perf.execution_count
    
    def _take_resource_snapshot(self, workflow_id: str, event: str):
        """获取资源快照"""
        try:
            snapshot = {
                'event': event,
                'timestamp': time.time(),
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'active_nodes': len(self.active_workflows[workflow_id]['active_nodes'])
            }
            
            self.active_workflows[workflow_id]['resource_snapshots'].append(snapshot)
        except Exception as e:
            self.logger.error(f"Failed to take resource snapshot: {e}")
    
    def _record_node_metric(self, node_id: str, duration: float, success: bool):
        """记录节点指标"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_name='node_execution_time',
            value=duration,
            unit='seconds',
            tags={
                'node_id': node_id,
                'success': str(success)
            }
        )
        self.metrics_history.append(metric)
    
    def _calculate_parallel_efficiency(self, workflow_id: str) -> float:
        """计算并行效率"""
        if workflow_id not in self.workflow_performances:
            return 0.0
        
        workflow_perf = self.workflow_performances[workflow_id]
        
        # 计算理论最短时间（关键路径）
        # 这里简化为所有节点的平均执行时间
        total_node_time = sum(
            perf.avg_duration for perf in self.node_performances.values()
            if perf.execution_count > 0
        )
        
        if total_node_time == 0 or workflow_perf.total_duration == 0:
            return 0.0
        
        # 并行效率 = 理论时间 / 实际时间
        efficiency = min(total_node_time / workflow_perf.total_duration, 1.0)
        return efficiency
    
    def _identify_bottleneck_nodes(self, workflow_id: str) -> List[str]:
        """识别瓶颈节点"""
        bottlenecks = []
        
        # 找出执行时间超过阈值的节点
        for node_id, perf in self.node_performances.items():
            if perf.avg_duration > self.performance_thresholds['node_duration_warning']:
                bottlenecks.append(node_id)
        
        # 按平均执行时间排序
        bottlenecks.sort(
            key=lambda nid: self.node_performances[nid].avg_duration,
            reverse=True
        )
        
        return bottlenecks[:5]  # 返回前5个瓶颈节点
    
    def _generate_optimization_suggestions(self, workflow_id: str) -> List[str]:
        """生成优化建议"""
        suggestions = []
        
        workflow_perf = self.workflow_performances[workflow_id]
        
        # 检查并行效率
        if workflow_perf.parallel_efficiency < 0.5:
            suggestions.append("考虑增加并行执行的节点数量以提高并行效率")
        
        # 检查瓶颈节点
        if workflow_perf.bottleneck_nodes:
            suggestions.append(f"优化瓶颈节点: {', '.join(workflow_perf.bottleneck_nodes[:3])}")
        
        # 检查系统资源
        avg_cpu = statistics.mean(self.system_metrics['cpu_percent']) if self.system_metrics['cpu_percent'] else 0
        avg_memory = statistics.mean(self.system_metrics['memory_percent']) if self.system_metrics['memory_percent'] else 0
        
        if avg_cpu > self.performance_thresholds['cpu_usage_warning']:
            suggestions.append("CPU使用率较高，考虑优化计算密集型节点或增加计算资源")
        
        if avg_memory > self.performance_thresholds['memory_usage_warning']:
            suggestions.append("内存使用率较高，考虑优化内存使用或增加内存资源")
        
        return suggestions
    
    def get_performance_report(self, workflow_id: Optional[str] = None) -> Dict[str, Any]:
        """获取性能报告"""
        if workflow_id and workflow_id in self.workflow_performances:
            # 单个工作流报告
            workflow_perf = self.workflow_performances[workflow_id]
            return {
                'workflow_id': workflow_id,
                'performance': asdict(workflow_perf),
                'node_performances': {
                    nid: asdict(perf) for nid, perf in self.node_performances.items()
                }
            }
        else:
            # 整体性能报告
            return {
                'system_metrics': {
                    'avg_cpu_usage': statistics.mean(self.system_metrics['cpu_percent']) if self.system_metrics['cpu_percent'] else 0,
                    'avg_memory_usage': statistics.mean(self.system_metrics['memory_percent']) if self.system_metrics['memory_percent'] else 0,
                    'active_workflows': len(self.active_workflows)
                },
                'workflow_count': len(self.workflow_performances),
                'node_performances': {
                    nid: asdict(perf) for nid, perf in self.node_performances.items()
                },
                'top_bottlenecks': self._get_top_bottlenecks(),
                'performance_trends': self._get_performance_trends()
            }
    
    def _get_top_bottlenecks(self) -> List[Dict[str, Any]]:
        """获取顶级瓶颈节点"""
        bottlenecks = []
        for node_id, perf in self.node_performances.items():
            if perf.execution_count > 0:
                bottlenecks.append({
                    'node_id': node_id,
                    'node_type': perf.node_type,
                    'avg_duration': perf.avg_duration,
                    'failure_rate': perf.failure_count / perf.execution_count
                })
        
        return sorted(bottlenecks, key=lambda x: x['avg_duration'], reverse=True)[:10]
    
    def _get_performance_trends(self) -> Dict[str, Any]:
        """获取性能趋势"""
        # 简化的趋势分析
        recent_metrics = list(self.metrics_history)[-100:]  # 最近100个指标
        
        if not recent_metrics:
            return {}
        
        # 按指标类型分组
        metrics_by_type = defaultdict(list)
        for metric in recent_metrics:
            metrics_by_type[metric.metric_name].append(metric.value)
        
        trends = {}
        for metric_name, values in metrics_by_type.items():
            if len(values) >= 2:
                # 简单的趋势计算（最后值与第一值的比较）
                trend = (values[-1] - values[0]) / values[0] * 100 if values[0] != 0 else 0
                trends[metric_name] = {
                    'trend_percent': trend,
                    'current_value': values[-1],
                    'avg_value': statistics.mean(values)
                }
        
        return trends


# 全局性能监控器实例
performance_monitor = PerformanceMonitor()
