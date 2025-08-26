"""
共享的数据模型定义，避免循环导入
"""
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Dict, Any, Optional, Union
from enum import Enum


class NodeType(str, Enum):
    """定义所有支持的节点类型"""
    # 核心节点类型
    MATERIAL_NODE = "material-node"
    EXECUTION_NODE = "execution-node"
    CONDITION_NODE = "condition-node"
    RESULT_NODE = "result-node"


class NodeData(BaseModel):
    label: str
    nodeType: str
    params: Dict[str, Any] = {}
    inputs: List[str] = []
    outputs: List[str] = []
    size: Optional[Dict[str, float]] = None
    side: Optional[str] = None
    icon: Optional[str] = None

    # 新增字段用于增强功能
    description: Optional[str] = None
    category: Optional[str] = None
    version: Optional[str] = "1.0"
    timeout: Optional[int] = None  # 超时时间（秒）
    retry_count: Optional[int] = 0  # 重试次数
    error_handling: Optional[str] = "stop"  # stop, continue, retry

    # 执行节点相关字段
    inputContent: Optional[str] = None  # 执行节点的任务内容
    taskDescription: Optional[str] = None  # 任务描述
    prompt: Optional[str] = None  # 提示词
    toolType: Optional[str] = None  # 工具类型
    
    # 🔧 关键修复：添加前端工具选择相关字段
    task: Optional[str] = None  # 任务描述（从前端传递）
    selectedTool: Optional[str] = None  # 前端选择的工具名称
    toolParameters: Optional[Dict[str, Any]] = None  # 工具参数（从前端传递）
    
    # 🎯 MVP关键修复：添加材料节点数据字段
    targetFile: Optional[Dict[str, Any]] = None  # 目标文件信息
    selectedFiles: Optional[List[Dict[str, Any]]] = None  # 选中的文件列表
    textContent: Optional[str] = None  # 文本内容
    urlList: Optional[List[str]] = None  # URL列表
    
    @model_validator(mode='before')
    @classmethod
    def extract_tool_name(cls, values):
        """处理对象格式的selectedTool，提取name字段"""
        if isinstance(values, dict) and 'selectedTool' in values:
            selected_tool = values['selectedTool']
            if isinstance(selected_tool, dict) and 'name' in selected_tool:
                values['selectedTool'] = selected_tool['name']
        return values
    
    # 结果节点相关可选字段（保留前端配置）
    outputFormat: Optional[str] = None
    storagePath: Optional[str] = None
    fileName: Optional[str] = None
    outputType: Optional[str] = None


class Position(BaseModel):
    x: float
    y: float


class Node(BaseModel):
    id: str
    type: str
    position: Position
    data: NodeData
    width: Optional[float] = None
    height: Optional[float] = None
    hidden: Optional[bool] = None
    selected: Optional[bool] = None


class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: Optional[str] = None
    animated: Optional[bool] = None


class WorkflowPayload(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
