"""
工作流状态管理模块
提供工作流执行状态的跟踪、暂停、恢复等功能
"""
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path

from utils.schemas import Node, Edge, WorkflowPayload


class WorkflowStatus(str, Enum):
    """工作流状态枚举"""
    PENDING = "pending"           # 等待执行
    RUNNING = "running"           # 正在执行
    PAUSED = "paused"            # 已暂停
    COMPLETED = "completed"       # 已完成
    FAILED = "failed"            # 执行失败
    CANCELLED = "cancelled"       # 已取消
    TIMEOUT = "timeout"          # 执行超时


class NodeStatus(str, Enum):
    """节点状态枚举"""
    PENDING = "pending"           # 等待执行
    RUNNING = "running"           # 正在执行
    COMPLETED = "completed"       # 已完成
    FAILED = "failed"            # 执行失败
    SKIPPED = "skipped"          # 已跳过
    RETRYING = "retrying"        # 重试中


@dataclass
class NodeExecution:
    """节点执行记录"""
    node_id: str
    status: NodeStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        data = asdict(self)
        # 处理datetime序列化
        if self.start_time:
            data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        # 🔧 修复：确保status是字符串而不是枚举对象
        if hasattr(self.status, 'value'):
            data['status'] = self.status.value
        else:
            data['status'] = str(self.status)
        return data


@dataclass
class WorkflowExecution:
    """工作流执行记录"""
    workflow_id: str
    status: WorkflowStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    current_node: Optional[str] = None
    completed_nodes: Set[str] = None
    failed_nodes: Set[str] = None
    context: Dict[str, Any] = None
    error: Optional[str] = None
    
    def __post_init__(self):
        if self.completed_nodes is None:
            self.completed_nodes = set()
        if self.failed_nodes is None:
            self.failed_nodes = set()
        if self.context is None:
            self.context = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        data = asdict(self)
        data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        data['completed_nodes'] = list(self.completed_nodes)
        data['failed_nodes'] = list(self.failed_nodes)
        # 🔧 修复：确保status是字符串而不是枚举对象
        if hasattr(self.status, 'value'):
            data['status'] = self.status.value
        else:
            data['status'] = str(self.status)
        return data


class WorkflowStateManager:
    """工作流状态管理器"""
    
    def __init__(self, storage_path: str = "workflow_states"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 内存中的状态缓存
        self.workflow_executions: Dict[str, WorkflowExecution] = {}
        self.node_executions: Dict[str, Dict[str, NodeExecution]] = {}  # workflow_id -> {node_id: execution}
        
        # 加载已保存的状态
        self._load_states()
    
    def _load_states(self):
        """加载已保存的工作流状态"""
        try:
            for state_file in self.storage_path.glob("*.json"):
                with open(state_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    workflow_id = data['workflow_id']
                    
                    # 恢复工作流执行状态
                    execution = WorkflowExecution(
                        workflow_id=workflow_id,
                        status=WorkflowStatus(data['status']),
                        start_time=datetime.fromisoformat(data['start_time']),
                        end_time=datetime.fromisoformat(data['end_time']) if data.get('end_time') else None,
                        duration=data.get('duration'),
                        current_node=data.get('current_node'),
                        completed_nodes=set(data.get('completed_nodes', [])),
                        failed_nodes=set(data.get('failed_nodes', [])),
                        context=data.get('context', {}),
                        error=data.get('error')
                    )
                    self.workflow_executions[workflow_id] = execution
                    
                    # 恢复节点执行状态
                    if 'node_executions' in data:
                        self.node_executions[workflow_id] = {}
                        for node_id, node_data in data['node_executions'].items():
                            node_exec = NodeExecution(
                                node_id=node_id,
                                status=NodeStatus(node_data['status']),
                                start_time=datetime.fromisoformat(node_data['start_time']) if node_data.get('start_time') else None,
                                end_time=datetime.fromisoformat(node_data['end_time']) if node_data.get('end_time') else None,
                                duration=node_data.get('duration'),
                                result=node_data.get('result'),
                                error=node_data.get('error'),
                                retry_count=node_data.get('retry_count', 0),
                                max_retries=node_data.get('max_retries', 0)
                            )
                            self.node_executions[workflow_id][node_id] = node_exec
        except Exception as e:
            self.logger.error(f"Failed to load workflow states: {e}")
    
    def _save_state(self, workflow_id: str):
        """保存工作流状态到文件"""
        try:
            if workflow_id not in self.workflow_executions:
                return
            
            execution = self.workflow_executions[workflow_id]
            data = execution.to_dict()
            
            # 添加节点执行状态
            if workflow_id in self.node_executions:
                data['node_executions'] = {}
                for node_id, node_exec in self.node_executions[workflow_id].items():
                    data['node_executions'][node_id] = node_exec.to_dict()
            
            state_file = self.storage_path / f"{workflow_id}.json"
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save workflow state for {workflow_id}: {e}")
    
    def start_workflow(self, workflow_id: str, payload: WorkflowPayload) -> WorkflowExecution:
        """开始工作流执行"""
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            status=WorkflowStatus.RUNNING,
            start_time=datetime.now()
        )
        
        self.workflow_executions[workflow_id] = execution
        self.node_executions[workflow_id] = {}
        
        # 初始化所有节点状态
        for node in payload.nodes:
            node_exec = NodeExecution(
                node_id=node.id,
                status=NodeStatus.PENDING,
                max_retries=node.data.retry_count or 0
            )
            self.node_executions[workflow_id][node.id] = node_exec
        
        self._save_state(workflow_id)
        self.logger.info(f"Started workflow execution: {workflow_id}")
        return execution
    
    def start_node(self, workflow_id: str, node_id: str):
        """开始节点执行"""
        if workflow_id in self.node_executions and node_id in self.node_executions[workflow_id]:
            node_exec = self.node_executions[workflow_id][node_id]
            node_exec.status = NodeStatus.RUNNING
            node_exec.start_time = datetime.now()
            
            # 更新工作流当前节点
            if workflow_id in self.workflow_executions:
                self.workflow_executions[workflow_id].current_node = node_id
            
            self._save_state(workflow_id)
            self.logger.info(f"Started node execution: {workflow_id}.{node_id}")
    
    def complete_node(self, workflow_id: str, node_id: str, result: Any = None):
        """完成节点执行"""
        if workflow_id in self.node_executions and node_id in self.node_executions[workflow_id]:
            node_exec = self.node_executions[workflow_id][node_id]
            node_exec.status = NodeStatus.COMPLETED
            node_exec.end_time = datetime.now()
            node_exec.result = result
            
            if node_exec.start_time:
                node_exec.duration = (node_exec.end_time - node_exec.start_time).total_seconds()
            
            # 🔧 修复：将节点结果保存到工作流上下文中，供后续节点使用
            if workflow_id in self.workflow_executions:
                workflow_exec = self.workflow_executions[workflow_id]
                workflow_exec.completed_nodes.add(node_id)
                
                # 将节点结果保存到上下文中，使用 node_id.result 格式
                result_key = f"{node_id}.result"
                workflow_exec.context[result_key] = result
                
                print(f"🔧 [状态管理器] 节点结果已保存到上下文: {result_key}")
                print(f"🔧 [状态管理器] 结果内容预览: {str(result)[:200]}...")
                print(f"🔧 [状态管理器] 当前上下文键: {list(workflow_exec.context.keys())}")
            
            self._save_state(workflow_id)
            self.logger.info(f"Completed node execution: {workflow_id}.{node_id}")
    
    def fail_node(self, workflow_id: str, node_id: str, error: str):
        """节点执行失败"""
        if workflow_id in self.node_executions and node_id in self.node_executions[workflow_id]:
            node_exec = self.node_executions[workflow_id][node_id]
            node_exec.status = NodeStatus.FAILED
            node_exec.end_time = datetime.now()
            node_exec.error = error
            
            if node_exec.start_time:
                node_exec.duration = (node_exec.end_time - node_exec.start_time).total_seconds()
            
            # 更新工作流状态
            if workflow_id in self.workflow_executions:
                self.workflow_executions[workflow_id].failed_nodes.add(node_id)
            
            self._save_state(workflow_id)
            self.logger.error(f"Failed node execution: {workflow_id}.{node_id} - {error}")
    
    def retry_node(self, workflow_id: str, node_id: str) -> bool:
        """重试节点执行"""
        if workflow_id in self.node_executions and node_id in self.node_executions[workflow_id]:
            node_exec = self.node_executions[workflow_id][node_id]
            
            if node_exec.retry_count < node_exec.max_retries:
                node_exec.retry_count += 1
                node_exec.status = NodeStatus.RETRYING
                node_exec.start_time = datetime.now()
                node_exec.end_time = None
                node_exec.error = None
                
                self._save_state(workflow_id)
                self.logger.info(f"Retrying node execution: {workflow_id}.{node_id} (attempt {node_exec.retry_count})")
                return True
            else:
                self.logger.warning(f"Max retries exceeded for node: {workflow_id}.{node_id}")
                return False
        
        return False
    
    def pause_workflow(self, workflow_id: str, reason: str = "User requested"):
        """暂停工作流执行"""
        if workflow_id in self.workflow_executions:
            execution = self.workflow_executions[workflow_id]
            execution.status = WorkflowStatus.PAUSED
            execution.error = reason
            
            self._save_state(workflow_id)
            self.logger.info(f"Paused workflow: {workflow_id} - {reason}")
    
    def resume_workflow(self, workflow_id: str):
        """恢复工作流执行"""
        if workflow_id in self.workflow_executions:
            execution = self.workflow_executions[workflow_id]
            execution.status = WorkflowStatus.RUNNING
            execution.error = None

            self._save_state(workflow_id)
            self.logger.info(f"Resumed workflow: {workflow_id}")

    def reset_workflow(self, workflow_id: str, payload: WorkflowPayload) -> WorkflowExecution:
        """重置工作流到初始状态"""
        # 清理旧的执行状态
        if workflow_id in self.workflow_executions:
            del self.workflow_executions[workflow_id]
        if workflow_id in self.node_executions:
            del self.node_executions[workflow_id]

        # 删除状态文件
        state_file = self.storage_path / f"{workflow_id}.json"
        if state_file.exists():
            state_file.unlink()

        # 重新初始化工作流
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            status=WorkflowStatus.PENDING,
            start_time=datetime.now()
        )

        self.workflow_executions[workflow_id] = execution
        self.node_executions[workflow_id] = {}

        # 重新初始化所有节点状态
        for node in payload.nodes:
            node_exec = NodeExecution(
                node_id=node.id,
                status=NodeStatus.PENDING,
                max_retries=node.data.retry_count or 0
            )
            self.node_executions[workflow_id][node.id] = node_exec

        self._save_state(workflow_id)
        self.logger.info(f"Reset workflow to initial state: {workflow_id}")
        return execution
    
    def complete_workflow(self, workflow_id: str, result: Any = None):
        """完成工作流执行"""
        if workflow_id in self.workflow_executions:
            execution = self.workflow_executions[workflow_id]
            execution.status = WorkflowStatus.COMPLETED
            execution.end_time = datetime.now()
            execution.current_node = None
            
            if execution.start_time:
                execution.duration = (execution.end_time - execution.start_time).total_seconds()
            
            # 保存最终结果到上下文
            if result is not None:
                execution.context['final_result'] = result
            
            self._save_state(workflow_id)
            self.logger.info(f"Completed workflow: {workflow_id}")
    
    def fail_workflow(self, workflow_id: str, error: str):
        """工作流执行失败"""
        if workflow_id in self.workflow_executions:
            execution = self.workflow_executions[workflow_id]
            execution.status = WorkflowStatus.FAILED
            execution.end_time = datetime.now()
            execution.error = error
            
            if execution.start_time:
                execution.duration = (execution.end_time - execution.start_time).total_seconds()
            
            self._save_state(workflow_id)
            self.logger.error(f"Failed workflow: {workflow_id} - {error}")
    
    def get_workflow_status(self, workflow_id: str) -> Optional[WorkflowExecution]:
        """获取工作流状态"""
        return self.workflow_executions.get(workflow_id)
    
    def get_node_status(self, workflow_id: str, node_id: str) -> Optional[NodeExecution]:
        """获取节点状态"""
        if workflow_id in self.node_executions:
            return self.node_executions[workflow_id].get(node_id)
        return None
    
    def get_all_workflows(self) -> List[WorkflowExecution]:
        """获取所有工作流状态"""
        return list(self.workflow_executions.values())
    
    def cleanup_old_workflows(self, days: int = 30):
        """清理旧的工作流状态"""
        cutoff_date = datetime.now() - timedelta(days=days)
        to_remove = []
        
        for workflow_id, execution in self.workflow_executions.items():
            if execution.end_time and execution.end_time < cutoff_date:
                to_remove.append(workflow_id)
        
        for workflow_id in to_remove:
            del self.workflow_executions[workflow_id]
            if workflow_id in self.node_executions:
                del self.node_executions[workflow_id]
            
            # 删除文件
            state_file = self.storage_path / f"{workflow_id}.json"
            if state_file.exists():
                state_file.unlink()
        
        if to_remove:
            self.logger.info(f"Cleaned up {len(to_remove)} old workflow states")


# 全局工作流状态管理器实例
workflow_state_manager = WorkflowStateManager()
