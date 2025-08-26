#!/usr/bin/env python3
"""
工作流状态管理模块
定义标准化的数据结构，分离执行状态和业务数据
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

class NodeStatus(Enum):
    """节点执行状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

class WorkflowStatus(Enum):
    """工作流状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class NodeExecutionInfo:
    """节点执行信息（状态相关）"""
    node_id: str
    status: NodeStatus = NodeStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

    @property
    def is_completed(self) -> bool:
        return self.status in [NodeStatus.SUCCESS, NodeStatus.FAILED, NodeStatus.SKIPPED]

@dataclass
class NodeBusinessData:
    """节点业务数据（与具体任务相关）"""
    content: Any = None
    file_paths: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class NodeOutput:
    """标准化的节点输出"""
    execution_info: NodeExecutionInfo
    business_data: NodeBusinessData
    outputs: Dict[str, Any] = field(default_factory=dict)  # 供其他节点引用的输出

    def get_output(self, key: str, default=None):
        """获取输出值"""
        return self.outputs.get(key, default)

    def set_output(self, key: str, value: Any):
        """设置输出值"""
        self.outputs[key] = value

class WorkflowContext:
    """工作流执行上下文"""
    
    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        self.status = WorkflowStatus.PENDING
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        
        # 节点状态管理
        self.nodes: Dict[str, NodeOutput] = {}
        
        # 数据流管理
        self.data_flow: Dict[str, Dict[str, Any]] = {}
        
        # 共享资源管理
        self.shared_resources: Dict[str, Any] = {}
        
        # 错误信息
        self.error: Optional[str] = None

    def add_node_output(self, node_id: str, output: NodeOutput):
        """添加节点输出"""
        self.nodes[node_id] = output
        # 同时更新数据流
        self.data_flow[node_id] = output.outputs

    def get_node_output(self, node_id: str) -> Optional[NodeOutput]:
        """获取节点输出"""
        return self.nodes.get(node_id)

    def resolve_reference(self, reference: str) -> Any:
        """解析@引用"""
        if not reference.startswith("@"):
            return reference
        
        # 解析 @node_id.output_name 格式
        ref_parts = reference[1:].split(".", 1)
        node_id = ref_parts[0]
        output_name = ref_parts[1] if len(ref_parts) > 1 else "result"
        
        if node_id in self.data_flow:
            return self.data_flow[node_id].get(output_name)
        
        return None

    def get_shared_resource(self, resource_type: str, default=None):
        """获取共享资源"""
        return self.shared_resources.get(resource_type, default)

    def set_shared_resource(self, resource_type: str, value: Any):
        """设置共享资源"""
        self.shared_resources[resource_type] = value

    def mark_workflow_started(self):
        """标记工作流开始"""
        self.status = WorkflowStatus.RUNNING
        self.start_time = datetime.now()

    def mark_workflow_completed(self):
        """标记工作流完成"""
        self.status = WorkflowStatus.COMPLETED
        self.end_time = datetime.now()

    def mark_workflow_failed(self, error: str):
        """标记工作流失败"""
        self.status = WorkflowStatus.FAILED
        self.error = error
        self.end_time = datetime.now()

    def get_completed_nodes(self) -> List[str]:
        """获取已完成的节点列表"""
        return [
            node_id for node_id, output in self.nodes.items()
            if output.execution_info.status == NodeStatus.SUCCESS
        ]

    def get_failed_nodes(self) -> List[str]:
        """获取失败的节点列表"""
        return [
            node_id for node_id, output in self.nodes.items()
            if output.execution_info.status == NodeStatus.FAILED
        ]

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式（用于API返回）"""
        return {
            "workflow_id": self.workflow_id,
            "status": self.status.value,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": (
                (self.end_time - self.start_time).total_seconds()
                if self.start_time and self.end_time else None
            ),
            "completed_nodes": self.get_completed_nodes(),
            "failed_nodes": self.get_failed_nodes(),
            "error": self.error,
            "node_executions": {
                node_id: {
                    "node_id": output.execution_info.node_id,
                    "status": output.execution_info.status.value,
                    "start_time": output.execution_info.start_time.isoformat() if output.execution_info.start_time else None,
                    "end_time": output.execution_info.end_time.isoformat() if output.execution_info.end_time else None,
                    "duration": output.execution_info.duration,
                    "error": output.execution_info.error,
                    "retry_count": output.execution_info.retry_count,
                    "outputs": output.outputs,
                    "business_data": {
                        "content": output.business_data.content,
                        "file_paths": output.business_data.file_paths,
                        "metadata": output.business_data.metadata
                    }
                }
                for node_id, output in self.nodes.items()
            },
            "data_flow": self.data_flow,
            "shared_resources": self.shared_resources
        }

class ReferenceResolver:
    """@引用解析器"""
    
    def __init__(self, context: WorkflowContext):
        self.context = context

    def resolve_value(self, value: Any) -> Any:
        """递归解析值中的@引用"""
        if isinstance(value, str):
            return self.context.resolve_reference(value)
        elif isinstance(value, dict):
            return {k: self.resolve_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self.resolve_value(item) for item in value]
        else:
            return value

    def resolve_parameters(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """解析参数字典中的所有@引用"""
        return {key: self.resolve_value(value) for key, value in params.items()}

def create_node_output(node_id: str, 
                      status: NodeStatus = NodeStatus.PENDING,
                      business_data: Optional[NodeBusinessData] = None,
                      outputs: Optional[Dict[str, Any]] = None) -> NodeOutput:
    """创建标准化的节点输出"""
    execution_info = NodeExecutionInfo(node_id=node_id, status=status)
    business_data = business_data or NodeBusinessData()
    outputs = outputs or {}
    
    return NodeOutput(
        execution_info=execution_info,
        business_data=business_data,
        outputs=outputs
    )

def create_wordmcp_output(node_id: str, 
                         document_path: str,
                         content: str = "",
                         tool_result: Optional[Dict[str, Any]] = None) -> NodeOutput:
    """创建WordMCP节点的标准输出"""
    business_data = NodeBusinessData(
        content=content,
        file_paths={"document": document_path},
        metadata={"tool_result": tool_result or {}}
    )
    
    outputs = {
        "document_path": document_path,
        "content": content,
        "file_paths": {"document": document_path}
    }
    
    return create_node_output(
        node_id=node_id,
        status=NodeStatus.SUCCESS,
        business_data=business_data,
        outputs=outputs
    ) 

class SharedResourceManager:
    """共享资源管理器"""
    
    def __init__(self):
        self.resources: Dict[str, Dict[str, Any]] = {}
    
    def register_file(self, workflow_id: str, file_path: str, resource_type: str = "document", created_by: str = None):
        """注册共享文件资源"""
        key = f"{workflow_id}_{resource_type}"
        self.resources[key] = {
            "path": file_path,
            "type": resource_type,
            "created_by": created_by,
            "last_modified_by": created_by,
            "created_at": datetime.now(),
            "last_modified_at": datetime.now(),
            "version": 1
        }
        
        # self.logger.info(f"🔗 [共享资源] 注册文件: {file_path} (类型: {resource_type})") # Assuming logger is available
    
    def get_shared_file(self, workflow_id: str, resource_type: str = "document") -> Optional[str]:
        """获取共享文件路径"""
        key = f"{workflow_id}_{resource_type}"
        resource = self.resources.get(key)
        if resource:
            return resource["path"]
        return None
    
    def update_file(self, workflow_id: str, resource_type: str = "document", modified_by: str = None):
        """更新文件修改信息"""
        key = f"{workflow_id}_{resource_type}"
        if key in self.resources:
            self.resources[key]["last_modified_by"] = modified_by
            self.resources[key]["last_modified_at"] = datetime.now()
            self.resources[key]["version"] += 1
    
    def cleanup_workflow_resources(self, workflow_id: str):
        """清理工作流相关的资源"""
        keys_to_remove = [key for key in self.resources.keys() if key.startswith(f"{workflow_id}_")]
        for key in keys_to_remove:
            del self.resources[key]

# 全局共享资源管理器实例
shared_resource_manager = SharedResourceManager() 