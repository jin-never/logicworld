"""
并发执行引擎模块
提供工作流的并发执行、资源管理和性能优化功能
"""
import asyncio
import logging
import time
import psutil
from typing import Dict, List, Set, Any, Optional, Callable, Awaitable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import weakref

from ..utils.schemas import Node, Edge


@dataclass
class ExecutionTask:
    """执行任务"""
    node: Node
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    status: str = "pending"  # pending, ready, running, completed, failed
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    result: Any = None
    error: Optional[str] = None
    retry_count: int = 0
    priority: int = 0


@dataclass
class ResourceUsage:
    """资源使用情况"""
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    active_tasks: int = 0
    max_concurrent_tasks: int = 10
    
    def is_overloaded(self) -> bool:
        """检查是否过载"""
        return (
            self.cpu_percent > 80.0 or
            self.memory_mb > 1024 or  # 1GB
            self.active_tasks >= self.max_concurrent_tasks
        )


class ResourceMonitor:
    """资源监控器"""
    
    def __init__(self, check_interval: float = 1.0):
        self.check_interval = check_interval
        self.usage_history: deque = deque(maxlen=60)  # 保留60秒历史
        self.is_monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
        self.current_usage = ResourceUsage()
        
    async def start_monitoring(self):
        """开始监控"""
        if self.is_monitoring:
            return
            
        self.is_monitoring = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
    
    async def stop_monitoring(self):
        """停止监控"""
        self.is_monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
    
    async def _monitor_loop(self):
        """监控循环"""
        while self.is_monitoring:
            try:
                # 获取系统资源使用情况
                cpu_percent = psutil.cpu_percent(interval=0.1)
                memory_info = psutil.virtual_memory()
                memory_mb = memory_info.used / 1024 / 1024
                
                self.current_usage.cpu_percent = cpu_percent
                self.current_usage.memory_mb = memory_mb
                
                # 记录历史
                self.usage_history.append({
                    'timestamp': datetime.now(),
                    'cpu_percent': cpu_percent,
                    'memory_mb': memory_mb,
                    'active_tasks': self.current_usage.active_tasks
                })
                
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logging.error(f"Resource monitoring error: {e}")
                await asyncio.sleep(self.check_interval)
    
    def get_average_usage(self, seconds: int = 30) -> Dict[str, float]:
        """获取平均使用情况"""
        cutoff_time = datetime.now() - timedelta(seconds=seconds)
        recent_data = [
            data for data in self.usage_history 
            if data['timestamp'] > cutoff_time
        ]
        
        if not recent_data:
            return {
                'cpu_percent': 0.0,
                'memory_mb': 0.0,
                'active_tasks': 0.0
            }
        
        return {
            'cpu_percent': sum(d['cpu_percent'] for d in recent_data) / len(recent_data),
            'memory_mb': sum(d['memory_mb'] for d in recent_data) / len(recent_data),
            'active_tasks': sum(d['active_tasks'] for d in recent_data) / len(recent_data)
        }


class TaskScheduler:
    """任务调度器"""
    
    def __init__(self, max_concurrent_tasks: int = 10):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.ready_queue: deque = deque()
        self.running_tasks: Dict[str, ExecutionTask] = {}
        self.completed_tasks: Dict[str, ExecutionTask] = {}
        self.failed_tasks: Dict[str, ExecutionTask] = {}
        self.task_graph: Dict[str, ExecutionTask] = {}
        
    def add_task(self, task: ExecutionTask):
        """添加任务"""
        self.task_graph[task.node.id] = task
        
        # 如果没有依赖，直接加入就绪队列
        if not task.dependencies:
            task.status = "ready"
            self.ready_queue.append(task)
    
    def build_dependency_graph(self, nodes: List[Node], edges: List[Edge]):
        """构建依赖图"""
        # 清空现有任务
        self.task_graph.clear()
        self.ready_queue.clear()
        self.running_tasks.clear()
        self.completed_tasks.clear()
        self.failed_tasks.clear()
        
        # 创建任务
        for node in nodes:
            task = ExecutionTask(node=node)
            self.task_graph[node.id] = task
        
        # 建立依赖关系
        for edge in edges:
            source_task = self.task_graph.get(edge.source)
            target_task = self.task_graph.get(edge.target)
            
            if source_task and target_task:
                target_task.dependencies.add(edge.source)
                source_task.dependents.add(edge.target)
        
        # 计算优先级（基于依赖深度）
        self._calculate_priorities()
        
        # 找到就绪任务
        for task in self.task_graph.values():
            if not task.dependencies:
                task.status = "ready"
                self.ready_queue.append(task)
        
        # 按优先级排序就绪队列
        self.ready_queue = deque(sorted(self.ready_queue, key=lambda t: t.priority, reverse=True))
    
    def _calculate_priorities(self):
        """计算任务优先级"""
        def calculate_depth(task_id: str, visited: Set[str] = None) -> int:
            if visited is None:
                visited = set()
            
            if task_id in visited:
                return 0  # 避免循环依赖
            
            visited.add(task_id)
            task = self.task_graph[task_id]
            
            if not task.dependents:
                return 1
            
            max_depth = 0
            for dependent_id in task.dependents:
                depth = calculate_depth(dependent_id, visited.copy())
                max_depth = max(max_depth, depth)
            
            return max_depth + 1
        
        for task_id, task in self.task_graph.items():
            task.priority = calculate_depth(task_id)
    
    def get_next_task(self) -> Optional[ExecutionTask]:
        """获取下一个可执行的任务"""
        if not self.ready_queue or len(self.running_tasks) >= self.max_concurrent_tasks:
            return None
        
        return self.ready_queue.popleft()
    
    def start_task(self, task: ExecutionTask):
        """开始执行任务"""
        task.status = "running"
        task.start_time = datetime.now()
        self.running_tasks[task.node.id] = task
    
    def complete_task(self, task: ExecutionTask, result: Any = None):
        """完成任务"""
        task.status = "completed"
        task.end_time = datetime.now()
        task.result = result
        
        # 从运行中移除
        self.running_tasks.pop(task.node.id, None)
        self.completed_tasks[task.node.id] = task
        
        # 检查依赖此任务的其他任务
        self._check_dependent_tasks(task.node.id)
    
    def fail_task(self, task: ExecutionTask, error: str):
        """任务失败"""
        task.status = "failed"
        task.end_time = datetime.now()
        task.error = error
        
        # 从运行中移除
        self.running_tasks.pop(task.node.id, None)
        self.failed_tasks[task.node.id] = task
    
    def _check_dependent_tasks(self, completed_task_id: str):
        """检查依赖已完成任务的其他任务"""
        for task in self.task_graph.values():
            if completed_task_id in task.dependencies and task.status == "pending":
                # 检查所有依赖是否都已完成
                all_dependencies_completed = all(
                    dep_id in self.completed_tasks 
                    for dep_id in task.dependencies
                )
                
                if all_dependencies_completed:
                    task.status = "ready"
                    # 按优先级插入就绪队列
                    inserted = False
                    for i, ready_task in enumerate(self.ready_queue):
                        if task.priority > ready_task.priority:
                            self.ready_queue.insert(i, task)
                            inserted = True
                            break
                    if not inserted:
                        self.ready_queue.append(task)
    
    def get_status(self) -> Dict[str, int]:
        """获取调度器状态"""
        return {
            "pending": len([t for t in self.task_graph.values() if t.status == "pending"]),
            "ready": len(self.ready_queue),
            "running": len(self.running_tasks),
            "completed": len(self.completed_tasks),
            "failed": len(self.failed_tasks),
            "total": len(self.task_graph)
        }


class ConcurrentExecutor:
    """并发执行器"""
    
    def __init__(self, max_concurrent_tasks: int = 10):
        self.scheduler = TaskScheduler(max_concurrent_tasks)
        self.resource_monitor = ResourceMonitor()
        self.executor_pool = ThreadPoolExecutor(max_workers=max_concurrent_tasks)
        self.is_executing = False
        self.execution_context: Dict[str, Any] = {}
        self.progress_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
        
        # 性能统计
        self.stats = {
            'total_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0,
            'total_execution_time': 0.0,
            'average_task_time': 0.0,
            'peak_memory_usage': 0.0,
            'peak_cpu_usage': 0.0
        }
    
    async def execute_workflow(
        self,
        nodes: List[Node],
        edges: List[Edge],
        context: Dict[str, Any] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    ) -> Dict[str, Any]:
        """执行工作流"""
        if self.is_executing:
            raise RuntimeError("Executor is already running")
        
        self.is_executing = True
        self.execution_context = context or {}
        self.progress_callback = progress_callback
        
        try:
            # 开始资源监控
            await self.resource_monitor.start_monitoring()
            
            # 构建依赖图
            self.scheduler.build_dependency_graph(nodes, edges)
            
            # 更新统计
            self.stats['total_tasks'] = len(nodes)
            self.stats['completed_tasks'] = 0
            self.stats['failed_tasks'] = 0
            
            start_time = time.time()
            
            # 执行任务
            await self._execute_tasks()
            
            end_time = time.time()
            self.stats['total_execution_time'] = end_time - start_time
            
            # 计算平均任务时间
            if self.stats['completed_tasks'] > 0:
                self.stats['average_task_time'] = (
                    self.stats['total_execution_time'] / self.stats['completed_tasks']
                )
            
            # 更新峰值使用情况
            avg_usage = self.resource_monitor.get_average_usage()
            self.stats['peak_memory_usage'] = max(
                self.stats['peak_memory_usage'], 
                avg_usage['memory_mb']
            )
            self.stats['peak_cpu_usage'] = max(
                self.stats['peak_cpu_usage'], 
                avg_usage['cpu_percent']
            )
            
            # 检查执行结果
            status = self.scheduler.get_status()
            if status['failed'] > 0:
                failed_tasks = list(self.scheduler.failed_tasks.values())
                raise RuntimeError(f"Workflow execution failed. {status['failed']} tasks failed.")
            
            return {
                'status': 'success',
                'context': self.execution_context,
                'stats': self.stats,
                'scheduler_status': status
            }
            
        finally:
            self.is_executing = False
            await self.resource_monitor.stop_monitoring()
    
    async def _execute_tasks(self):
        """执行任务循环"""
        active_futures = {}
        
        while True:
            # 检查资源使用情况
            if self.resource_monitor.current_usage.is_overloaded():
                await asyncio.sleep(0.5)  # 等待资源释放
                continue
            
            # 获取下一个可执行的任务
            task = self.scheduler.get_next_task()
            if task:
                # 开始执行任务
                self.scheduler.start_task(task)
                future = asyncio.create_task(self._execute_single_task(task))
                active_futures[future] = task
                
                # 更新资源使用情况
                self.resource_monitor.current_usage.active_tasks = len(active_futures)
                
                # 发送进度通知
                if self.progress_callback:
                    await self.progress_callback({
                        'event': 'task_started',
                        'task_id': task.node.id,
                        'status': self.scheduler.get_status()
                    })
            
            # 检查已完成的任务
            if active_futures:
                done_futures = [f for f in active_futures.keys() if f.done()]
                
                for future in done_futures:
                    task = active_futures.pop(future)
                    
                    try:
                        result = await future
                        self.scheduler.complete_task(task, result)
                        self.stats['completed_tasks'] += 1
                        
                        # 发送进度通知
                        if self.progress_callback:
                            await self.progress_callback({
                                'event': 'task_completed',
                                'task_id': task.node.id,
                                'result': result,
                                'status': self.scheduler.get_status()
                            })
                            
                    except Exception as e:
                        error_msg = str(e)
                        self.scheduler.fail_task(task, error_msg)
                        self.stats['failed_tasks'] += 1
                        
                        # 发送进度通知
                        if self.progress_callback:
                            await self.progress_callback({
                                'event': 'task_failed',
                                'task_id': task.node.id,
                                'error': error_msg,
                                'status': self.scheduler.get_status()
                            })
                
                # 更新资源使用情况
                self.resource_monitor.current_usage.active_tasks = len(active_futures)
            
            # 检查是否所有任务都已完成
            status = self.scheduler.get_status()
            if status['running'] == 0 and status['ready'] == 0:
                break
            
            # 短暂等待
            await asyncio.sleep(0.1)
    
    async def _execute_single_task(self, task: ExecutionTask) -> Any:
        """执行单个任务"""
        from node_executors import execute_extended_node
        
        try:
            # 解析任务参数中的上下文引用
            resolved_context = self._resolve_task_context(task)
            
            # 执行节点
            result = await execute_extended_node(task.node, resolved_context)
            
            # 保存结果到上下文
            if task.node.data.outputs and result is not None:
                context_key = f"{task.node.id}.{task.node.data.outputs[0]}"
                self.execution_context[context_key] = result
            
            return result
            
        except Exception as e:
            logging.error(f"Task execution failed for {task.node.id}: {e}")
            raise
    
    def _resolve_task_context(self, task: ExecutionTask) -> Dict[str, Any]:
        """解析任务的上下文"""
        # 获取任务依赖的结果
        task_context = self.execution_context.copy()
        
        # 添加依赖任务的结果
        for dep_id in task.dependencies:
            dep_task = self.scheduler.completed_tasks.get(dep_id)
            if dep_task and dep_task.result is not None:
                if dep_task.node.data.outputs:
                    context_key = f"{dep_id}.{dep_task.node.data.outputs[0]}"
                    task_context[context_key] = dep_task.result
        
        return task_context
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计"""
        return {
            **self.stats,
            'current_resource_usage': {
                'cpu_percent': self.resource_monitor.current_usage.cpu_percent,
                'memory_mb': self.resource_monitor.current_usage.memory_mb,
                'active_tasks': self.resource_monitor.current_usage.active_tasks
            },
            'average_resource_usage': self.resource_monitor.get_average_usage(),
            'scheduler_status': self.scheduler.get_status()
        }


class PerformanceOptimizer:
    """性能优化器"""

    def __init__(self):
        self.optimization_history = []
        self.current_config = {
            'max_concurrent_tasks': 10,
            'memory_threshold': 1024,  # MB
            'cpu_threshold': 80.0,     # %
            'task_timeout': 300        # seconds
        }

    def analyze_performance(self, stats: Dict[str, Any]) -> Dict[str, Any]:
        """分析性能并提供优化建议"""
        recommendations = []

        # 分析CPU使用率
        cpu_usage = stats.get('current_resource_usage', {}).get('cpu_percent', 0)
        if cpu_usage > 90:
            recommendations.append({
                'type': 'cpu_high',
                'message': 'CPU使用率过高，建议减少并发任务数量',
                'action': 'reduce_concurrency',
                'current_value': cpu_usage,
                'suggested_value': max(1, self.current_config['max_concurrent_tasks'] - 2)
            })
        elif cpu_usage < 30 and self.current_config['max_concurrent_tasks'] < 20:
            recommendations.append({
                'type': 'cpu_low',
                'message': 'CPU使用率较低，可以增加并发任务数量',
                'action': 'increase_concurrency',
                'current_value': cpu_usage,
                'suggested_value': self.current_config['max_concurrent_tasks'] + 2
            })

        # 分析内存使用
        memory_usage = stats.get('current_resource_usage', {}).get('memory_mb', 0)
        if memory_usage > self.current_config['memory_threshold']:
            recommendations.append({
                'type': 'memory_high',
                'message': '内存使用过高，建议优化数据处理',
                'action': 'optimize_memory',
                'current_value': memory_usage,
                'suggested_value': self.current_config['memory_threshold']
            })

        # 分析任务执行时间
        avg_task_time = stats.get('average_task_time', 0)
        if avg_task_time > 60:  # 超过1分钟
            recommendations.append({
                'type': 'task_slow',
                'message': '任务执行时间过长，建议优化任务逻辑',
                'action': 'optimize_tasks',
                'current_value': avg_task_time,
                'suggested_value': 30
            })

        # 分析失败率
        total_tasks = stats.get('total_tasks', 1)
        failed_tasks = stats.get('failed_tasks', 0)
        failure_rate = failed_tasks / total_tasks if total_tasks > 0 else 0

        if failure_rate > 0.1:  # 失败率超过10%
            recommendations.append({
                'type': 'high_failure_rate',
                'message': '任务失败率过高，建议检查错误处理',
                'action': 'improve_error_handling',
                'current_value': failure_rate * 100,
                'suggested_value': 5
            })

        return {
            'recommendations': recommendations,
            'performance_score': self._calculate_performance_score(stats),
            'optimization_potential': len(recommendations) > 0
        }

    def _calculate_performance_score(self, stats: Dict[str, Any]) -> float:
        """计算性能评分 (0-100)"""
        score = 100.0

        # CPU使用率评分
        cpu_usage = stats.get('current_resource_usage', {}).get('cpu_percent', 0)
        if cpu_usage > 90:
            score -= 30
        elif cpu_usage > 70:
            score -= 15
        elif cpu_usage < 20:
            score -= 10

        # 内存使用评分
        memory_usage = stats.get('current_resource_usage', {}).get('memory_mb', 0)
        if memory_usage > self.current_config['memory_threshold']:
            score -= 25

        # 任务执行时间评分
        avg_task_time = stats.get('average_task_time', 0)
        if avg_task_time > 120:
            score -= 20
        elif avg_task_time > 60:
            score -= 10

        # 失败率评分
        total_tasks = stats.get('total_tasks', 1)
        failed_tasks = stats.get('failed_tasks', 0)
        failure_rate = failed_tasks / total_tasks if total_tasks > 0 else 0

        if failure_rate > 0.2:
            score -= 25
        elif failure_rate > 0.1:
            score -= 15
        elif failure_rate > 0.05:
            score -= 5

        return max(0, score)

    def apply_optimization(self, recommendation: Dict[str, Any]) -> bool:
        """应用优化建议"""
        action = recommendation.get('action')

        if action == 'reduce_concurrency':
            new_value = recommendation.get('suggested_value', 5)
            self.current_config['max_concurrent_tasks'] = max(1, new_value)
            return True
        elif action == 'increase_concurrency':
            new_value = recommendation.get('suggested_value', 15)
            self.current_config['max_concurrent_tasks'] = min(20, new_value)
            return True
        elif action == 'optimize_memory':
            # 这里可以实现内存优化策略
            return True
        elif action == 'optimize_tasks':
            # 这里可以实现任务优化策略
            return True
        elif action == 'improve_error_handling':
            # 这里可以实现错误处理改进
            return True

        return False


# 全局实例
concurrent_executor = ConcurrentExecutor()
performance_optimizer = PerformanceOptimizer()
