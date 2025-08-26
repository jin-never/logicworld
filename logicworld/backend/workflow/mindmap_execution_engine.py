"""
思维导图工作流执行引擎
专门处理前端思维导图节点的执行逻辑
"""
import asyncio
import json
import logging
import os
import uuid
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
import datetime as dt_module  # 备用全局导入
from pathlib import Path

from utils.schemas import Node, Edge, WorkflowPayload
from .workflow_state import WorkflowStateManager, WorkflowStatus, NodeStatus
from agent_system.execution_engine import ExecutionEngine

# 🧠 NEW: 导入智能上下文增强器
import sys
# 正确的路径：backend/workflow/ -> 逻辑0.9.2/
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, project_root)
# from smart_context_enhancer import SmartContextEnhancer  # 模块不存在，使用临时替代

# 临时替代SmartContextEnhancer
class SmartContextEnhancer:
    """临时替代的智能上下文增强器"""
    def __init__(self):
        pass

# 🌟 全局工作流上下文管理（借鉴Airflow XCom机制）
class GlobalWorkflowContext:
    """全局工作流上下文管理器 - 确保数据强制性传递和验证"""
    
    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        self.target_file = None
        self.target_file_path = None
        self.data_lineage = []  # 数据血缘追踪
        self.required_fields = ["target_file"]  # 必需字段
        self.logger = logging.getLogger(f"GlobalContext-{workflow_id}")
    
    def set_target_file(self, file_info: Dict[str, Any], source_node: str) -> None:
        """设置目标文件（强制性）"""
        if not file_info:
            raise ValueError(f"Target file cannot be empty (from {source_node})")
        
        self.target_file = file_info
        self.target_file_path = file_info.get('path') or file_info.get('fullPath')
        
        if not self.target_file_path:
            raise ValueError(f"Target file path cannot be empty (from {source_node})")
        
        # 记录数据血缘
        self.data_lineage.append({
            "action": "set_target_file",
            "source_node": source_node,
            "file_path": self.target_file_path,
            "timestamp": datetime.now()
        })
        
        self.logger.info(f"🎯 [GlobalContext] 设置目标文件: {self.target_file_path} (来源: {source_node})")
    
    def get_target_file(self) -> Dict[str, Any]:
        """获取目标文件（带验证）"""
        if not self.target_file:
            raise ValueError(f"Target file not set in workflow {self.workflow_id}")
        return self.target_file
    
    def get_target_file_path(self) -> str:
        """获取目标文件路径（带验证）"""
        if not self.target_file_path:
            raise ValueError(f"Target file path not set in workflow {self.workflow_id}")
        return self.target_file_path
    
    def validate_file_operation(self, operation_file_path: str, operation_type: str) -> bool:
        """验证文件操作是否针对正确的目标文件"""
        if not self.target_file_path:
            self.logger.warning(f"🚨 [GlobalContext] 目标文件未设置，无法验证操作: {operation_type}")
            return False
        
        if operation_file_path != self.target_file_path:
            self.logger.error(f"🚨 [GlobalContext] 文件操作不一致！")
            self.logger.error(f"   期望操作: {self.target_file_path}")
            self.logger.error(f"   实际操作: {operation_file_path}")
            self.logger.error(f"   操作类型: {operation_type}")
            return False
        
        # 记录正确的操作
        self.data_lineage.append({
            "action": operation_type,
            "file_path": operation_file_path,
            "timestamp": datetime.now(),
            "validated": True
        })
        
        self.logger.info(f"✅ [GlobalContext] 文件操作验证通过: {operation_type} -> {operation_file_path}")
        return True
    
    def get_data_lineage_summary(self) -> str:
        """获取数据血缘摘要"""
        if not self.data_lineage:
            return "无操作记录"
        
        summary = f"目标文件: {self.target_file_path}\n"
        summary += f"操作历史 ({len(self.data_lineage)}项):\n"
        
        for i, item in enumerate(self.data_lineage, 1):
            summary += f"  {i}. {item['action']} ({item.get('source_node', 'system')})\n"
        
        return summary


class MindmapExecutionEngine:
    """思维导图执行引擎"""
    
    def __init__(self, state_manager: WorkflowStateManager = None):
        self.state_manager = state_manager or WorkflowStateManager()
        self.execution_engine = ExecutionEngine()
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 🧠 NEW: 初始化智能上下文增强器
        self.context_enhancer = SmartContextEnhancer()
        self.logger.info("🧠 [智能增强] 智能上下文增强器已初始化")
        
        # 🎯 MVP改进：工作流级别的目标文件跟踪
        self.workflow_target_files = {}  # {workflow_id: target_file_path}
        
        # 🌟 新增：全局目标文件上下文管理（借鉴Airflow XCom）
        self.workflow_global_context = {}  # {workflow_id: GlobalContext}
        
        # 执行状态跟踪
        self.execution_states = {}  # 存储每个工作流的执行状态
        
        # 节点执行器映射
        self.node_executors = {
            # 核心节点类型
            'material-node': self._execute_material_node,
            'execution-node': self._execute_execution_node,
            'condition-node': self._execute_condition_node,
            'result-node': self._execute_result_node,

            # 默认执行器
            'default': self._execute_default_node
        }
        
        # 活跃的工作流执行任务
        self.active_workflows: Dict[str, asyncio.Task] = {}
    
    async def execute_workflow(self, payload) -> str:
        """执行工作流"""
        workflow_id = str(uuid.uuid4())
        
        try:
            # 类型检查和修复 - 确保payload是WorkflowPayload对象
            if isinstance(payload, dict):
                self.logger.warning(f"🔄 检测到字典类型的payload，正在转换为WorkflowPayload对象")
                from utils.schemas import WorkflowPayload, Node, Edge, NodeData, Position
                
                # 转换字典为WorkflowPayload对象
                nodes = []
                for node_dict in payload.get('nodes', []):
                    # 🚨 修复：确保必需字段存在，添加默认值
                    node_data = node_dict.get('data', {})
                    
                    # 确保必需字段存在
                    if 'label' not in node_data:
                        node_data['label'] = node_dict.get('type', 'Unknown Node')
                    if 'nodeType' not in node_data:
                        node_data['nodeType'] = node_dict.get('type', 'default-node')
                    
                    # 添加其他常用默认值
                    node_data.setdefault('params', {})
                    node_data.setdefault('inputs', [])
                    node_data.setdefault('outputs', [])
                    
                    self.logger.info(f"🔧 [NodeData] 创建节点数据: {node_data.get('label')} ({node_data.get('nodeType')})")
                    
                    try:
                        node = Node(
                            id=node_dict['id'],
                            type=node_dict['type'],
                            position=Position(**node_dict['position']),
                            data=NodeData(**node_data)
                        )
                        nodes.append(node)
                        self.logger.info(f"✅ [NodeData] 节点创建成功: {node.id}")
                    except Exception as e:
                        self.logger.error(f"❌ [NodeData] 节点创建失败: {node_dict['id']} - {str(e)}")
                        self.logger.error(f"❌ [NodeData] 节点数据: {node_data}")
                        raise ValueError(f"节点数据创建失败 {node_dict['id']}: {str(e)}")
                
                edges = []
                for edge_dict in payload.get('edges', []):
                    edge = Edge(**edge_dict)
                    edges.append(edge)
                
                payload = WorkflowPayload(nodes=nodes, edges=edges)
                self.logger.info(f"✅ 成功转换payload为WorkflowPayload对象，节点数: {len(payload.nodes)}")
            
            # 确保payload有正确的属性
            if not hasattr(payload, 'nodes') or not hasattr(payload, 'edges'):
                raise ValueError(f"无效的payload对象: {type(payload)}")
            
            # 启动工作流
            execution = self.state_manager.start_workflow(workflow_id, payload)
            
            # 创建执行任务
            task = asyncio.create_task(self._run_workflow(workflow_id, payload))
            self.active_workflows[workflow_id] = task
            
            self.logger.info(f"Started workflow execution: {workflow_id}")
            return workflow_id
            
        except Exception as e:
            self.logger.error(f"Failed to start workflow: {e}")
            self.state_manager.fail_workflow(workflow_id, str(e))
            raise
    
    async def _run_workflow(self, workflow_id: str, payload):
        """运行工作流的主要逻辑"""
        try:
            # 类型检查和修复
            if isinstance(payload, dict):
                self.logger.warning(f"🔄 检测到字典类型的payload，正在转换为WorkflowPayload对象")
                from utils.schemas import WorkflowPayload, Node, Edge, NodeData, Position
                
                # 转换字典为WorkflowPayload对象
                nodes = []
                for node_dict in payload.get('nodes', []):
                    # 🚨 修复：确保必需字段存在，添加默认值
                    node_data = node_dict.get('data', {})
                    
                    # 确保必需字段存在
                    if 'label' not in node_data:
                        node_data['label'] = node_dict.get('type', 'Unknown Node')
                    if 'nodeType' not in node_data:
                        node_data['nodeType'] = node_dict.get('type', 'default-node')
                    
                    # 添加其他常用默认值
                    node_data.setdefault('params', {})
                    node_data.setdefault('inputs', [])
                    node_data.setdefault('outputs', [])
                    
                    self.logger.info(f"🔧 [NodeData] 创建节点数据: {node_data.get('label')} ({node_data.get('nodeType')})")
                    
                    try:
                        node = Node(
                            id=node_dict['id'],
                            type=node_dict['type'],
                            position=Position(**node_dict['position']),
                            data=NodeData(**node_data)
                        )
                        nodes.append(node)
                        self.logger.info(f"✅ [NodeData] 节点创建成功: {node.id}")
                    except Exception as e:
                        self.logger.error(f"❌ [NodeData] 节点创建失败: {node_dict['id']} - {str(e)}")
                        self.logger.error(f"❌ [NodeData] 节点数据: {node_data}")
                        raise ValueError(f"节点数据创建失败 {node_dict['id']}: {str(e)}")
                
                edges = []
                for edge_dict in payload.get('edges', []):
                    edge = Edge(**edge_dict)
                    edges.append(edge)
                
                payload = WorkflowPayload(nodes=nodes, edges=edges)
                self.logger.info(f"✅ 成功转换payload为WorkflowPayload对象")
            
            # 确保payload有正确的属性
            if not hasattr(payload, 'nodes') or not hasattr(payload, 'edges'):
                raise ValueError(f"无效的payload对象: {type(payload)}")
            
            # 构建节点依赖图
            dependency_graph = self._build_dependency_graph(payload.nodes, payload.edges)
            
            # 执行上下文
            context = {}
            
            # 获取起始节点（没有输入边的节点）
            start_nodes = self._get_start_nodes(payload.nodes, payload.edges)
            
            if not start_nodes:
                raise Exception("No start nodes found in workflow")
            
            # 执行节点
            await self._execute_nodes_recursive(
                workflow_id, start_nodes, dependency_graph, 
                payload.nodes, context
            )
            
            # 完成工作流
            self.state_manager.complete_workflow(workflow_id, context)
            
        except Exception as e:
            self.logger.error(f"Workflow execution failed: {workflow_id} - {e}")
            self.state_manager.fail_workflow(workflow_id, str(e))
        finally:
            # 清理活跃任务
            if workflow_id in self.active_workflows:
                del self.active_workflows[workflow_id]
    
    def _build_dependency_graph(self, nodes: List[Node], edges: List[Edge]) -> Dict[str, List[str]]:
        """构建节点依赖图"""
        graph = {node.id: [] for node in nodes}
        
        for edge in edges:
            if edge.target in graph:
                graph[edge.target].append(edge.source)
        
        return graph
    
    def _get_start_nodes(self, nodes: List[Node], edges: List[Edge]) -> List[str]:
        """获取起始节点"""
        target_nodes = {edge.target for edge in edges}
        return [node.id for node in nodes if node.id not in target_nodes]
    
    def _get_next_nodes(self, current_node: str, edges: List[Edge]) -> List[str]:
        """获取下一个节点"""
        return [edge.target for edge in edges if edge.source == current_node]
    
    async def _execute_nodes_recursive(
        self, 
        workflow_id: str, 
        node_ids: List[str], 
        dependency_graph: Dict[str, List[str]], 
        all_nodes: List[Node], 
        context: Dict[str, Any]
    ):
        """递归执行节点"""
        # 创建节点ID到节点对象的映射
        node_map = {node.id: node for node in all_nodes}
        
        # 并发执行当前层的节点
        tasks = []
        for node_id in node_ids:
            if node_id in node_map:
                task = asyncio.create_task(
                    self._execute_single_node(workflow_id, node_map[node_id], context)
                )
                tasks.append((node_id, task))
        
        # 等待所有节点完成
        failed_nodes = set()
        for node_id, task in tasks:
            try:
                result = await task
                context[f"{node_id}.result"] = result
            except Exception as e:
                self.logger.error(f"Node execution failed: {node_id} - {e}")
                self.state_manager.fail_node(workflow_id, node_id, str(e))
                failed_nodes.add(node_id)
                # 不要raise，继续执行其他节点
                self.logger.warning(f"节点 {node_id} 失败，但继续执行其他节点")
        
        # 找到下一层可以执行的节点 - 但要排除依赖失败节点的节点
        next_nodes = set()
        for node_id in node_ids:
            # 跳过已经失败的节点
            if node_id in failed_nodes:
                continue
                
            # 获取当前节点的所有后继节点
            for next_node in dependency_graph:
                if node_id in dependency_graph[next_node]:
                    # 检查该节点的所有依赖是否都已完成且没有失败
                    dependencies = dependency_graph[next_node]
                    dependencies_completed = all(f"{dep}.result" in context for dep in dependencies)
                    dependencies_not_failed = not any(dep in failed_nodes for dep in dependencies)
                    
                    if dependencies_completed and dependencies_not_failed:
                        next_nodes.add(next_node)
                    elif any(dep in failed_nodes for dep in dependencies):
                        # 如果依赖节点失败，标记这个节点也失败
                        self.logger.error(f"节点 {next_node} 因依赖节点失败而跳过")
                        self.state_manager.fail_node(workflow_id, next_node, f"依赖节点失败: {[dep for dep in dependencies if dep in failed_nodes]}")
                        failed_nodes.add(next_node)
        
        # 递归执行下一层节点
        if next_nodes:
            await self._execute_nodes_recursive(
                workflow_id, list(next_nodes), dependency_graph, all_nodes, context
            )
            
        # 如果有失败的节点，在最后抛出异常
        if failed_nodes:
            raise Exception(f"工作流中有 {len(failed_nodes)} 个节点失败: {list(failed_nodes)}")
    
    async def _execute_single_node(self, workflow_id: str, node: Node, context: Dict[str, Any]) -> Any:
        """执行单个节点"""
        # 优先使用node.data.nodeType，因为这是前端设置的正确类型
        node_type = getattr(node.data, 'nodeType', None) or node.type or 'default'
        self.logger.info(f"[STATUS] 开始执行节点 {node.id} (类型: {node_type})")
        
        self.state_manager.start_node(workflow_id, node.id)
        
        # 🔧 修复：真正发送SSE node_start事件给前端
        try:
            from utils.websocket_manager import websocket_manager
            await websocket_manager.broadcast({
                "event": "node_start",
                "node_id": node.id,
                "node_type": node_type,
                "timestamp": dt_module.datetime.now().isoformat()
            })
            self.logger.info(f"[SSE] 已发送node_start事件: {node.id}")
        except Exception as e:
            self.logger.warning(f"[SSE] 发送node_start事件失败: {e}")
            # 保留原有的日志记录作为备份
            self.logger.info(f"[SSE] node_start: {{\"node_id\": \"{node.id}\", \"node_type\": \"{node_type}\"}}")
        
        try:
            # 获取节点执行器 - 使用正确的node_type
            executor = self.node_executors.get(node_type, self.node_executors['default'])
            
            # 执行节点
            result = await executor(workflow_id, node, context) # Pass workflow_id to executor
            
            # 检查执行结果是否成功
            if isinstance(result, dict) and result.get('success') is False:
                error_message = result.get('error', 'Node execution failed')
                self.logger.error(f"[STATUS] 节点 {node.id} 执行失败: {error_message}")
                raise Exception(f"Node {node.id} execution failed: {error_message}")
            
            # 🚨 额外安全检查：即使success不是False，也要检查是否包含AI失败信息
            if isinstance(result, dict):
                result_content = str(result.get('result', ''))
                if ("AI模型调用失败" in result_content or 
                    "LLM调用失败" in result_content or
                    "无法生成有效响应" in result_content or
                    "API调用失败" in result_content):
                    
                    error_message = f"检测到AI调用失败: {result_content[:100]}"
                    self.logger.error(f"[SECURITY] 节点 {node.id} 含有AI失败信息: {error_message}")
                    raise Exception(f"Node {node.id} AI failure detected: {error_message}")
            
            # 完成节点
            self.state_manager.complete_node(workflow_id, node.id, result)
            
            # 🔧 修复：真正发送SSE node_done成功事件给前端
            try:
                from utils.websocket_manager import websocket_manager
                await websocket_manager.broadcast({
                    "event": "node_done",
                    "node_id": node.id,
                    "status": "success",
                    "result": "已完成",
                    "timestamp": dt_module.datetime.now().isoformat()
                })
                self.logger.info(f"[SSE] 已发送node_done成功事件: {node.id}")
            except Exception as e:
                self.logger.warning(f"[SSE] 发送node_done成功事件失败: {e}")
                # 保留原有的日志记录作为备份
                self.logger.info(f"[SSE] node_done: {{\"node_id\": \"{node.id}\", \"status\": \"success\", \"result\": \"已完成\"}}")
            self.logger.info(f"[STATUS] 节点 {node.id} 执行完成")
            
            return result
            
        except Exception as e:
            self.state_manager.fail_node(workflow_id, node.id, str(e))
            
            # 🔧 修复：真正发送SSE node_done失败事件给前端
            try:
                from utils.websocket_manager import websocket_manager
                await websocket_manager.broadcast({
                    "event": "node_done",
                    "node_id": node.id,
                    "status": "error",
                    "error": str(e),
                    "timestamp": dt_module.datetime.now().isoformat()
                })
                self.logger.info(f"[SSE] 已发送node_done失败事件: {node.id}")
            except Exception as ws_e:
                self.logger.warning(f"[SSE] 发送node_done失败事件失败: {ws_e}")
                # 保留原有的日志记录作为备份
                self.logger.info(f"[SSE] node_done: {{\"node_id\": \"{node.id}\", \"status\": \"error\", \"error\": \"{str(e)}\"}}")
            self.logger.error(f"[STATUS] 节点 {node.id} 执行失败: {e}")
            # 不要在这里raise，让上层处理错误传播
            raise
    
    async def _execute_material_node(self, workflow_id: str, node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行材料节点"""
        self.logger.info(f"Executing material node: {node.id}")
        
        # 🌟 初始化全局上下文
        if workflow_id not in self.workflow_global_context:
            self.workflow_global_context[workflow_id] = GlobalWorkflowContext(workflow_id)
        
        global_context = self.workflow_global_context[workflow_id]
        
        data = node.data
        result = {
            'node_type': 'material',
            'files': [],
            'content': '',
            'metadata': {}
        }
        
        # 🎯 强制性目标文件处理（借鉴GitHub Actions的前置条件检查）
        target_file_found = False
        
        # 检查 targetFile 字段
        if 'targetFile' in data and data['targetFile']:
            target_file = data['targetFile']
            self.logger.info(f"🎯 [MaterialNode] 发现targetFile: {target_file}")
            
            # 设置全局目标文件
            global_context.set_target_file(target_file, node.id)
            target_file_found = True
            
            result['targetFile'] = target_file
            result['files'].append({
                'name': target_file.get('name', ''),
                'size': target_file.get('size', 0),
                'type': target_file.get('type', 'document'),
                'path': target_file.get('path', ''),
                'fullPath': target_file.get('path', ''),
                'content': ''
            })
            
            self.logger.info(f"✅ [MaterialNode] 目标文件已设置: {target_file.get('name')} -> {target_file.get('path')}")
        
        # 检查 selectedFiles 字段
        elif 'selectedFiles' in data and data['selectedFiles']:
            selected_files = data['selectedFiles']
            self.logger.info(f"🎯 [MaterialNode] 发现selectedFiles: {len(selected_files)}个文件")
            
            # 使用第一个文件作为目标文件
            if selected_files:
                target_file = selected_files[0]
                global_context.set_target_file(target_file, node.id)
                target_file_found = True
                
                result['targetFile'] = target_file
                result['selectedFiles'] = selected_files
                
                for file_info in selected_files:
                    result['files'].append({
                        'name': file_info.get('name', ''),
                        'size': file_info.get('size', 0),
                        'type': file_info.get('type', 'document'),
                        'path': file_info.get('path', '') or file_info.get('fullPath', ''),
                        'fullPath': file_info.get('fullPath', '') or file_info.get('path', ''),
                        'content': ''
                    })
                
                self.logger.info(f"✅ [MaterialNode] 从selectedFiles设置目标文件: {target_file.get('name')}")
        
        # 🚨 强制性验证：必须有目标文件
        if not target_file_found:
            # 🌟 MVP修复：不再抛出错误，而是创建一个默认的成功状态
            # 这样智能补齐仍然可以工作，通过任务描述推断目标文件
            self.logger.warning(f"⚠️ [MaterialNode] 未找到目标文件，创建默认成功状态以支持智能补齐")
            
            # 创建一个表示"无文件但成功"的状态
            result['file_count'] = 0
            result['total_size'] = 0
            result['processed_at'] = datetime.now().isoformat()
            result['status'] = 'no_files_but_ready'  # 标记为无文件但就绪状态
            
            self.logger.info(f"🎯 [MaterialNode] 默认处理完成: 0个文件，状态为就绪")
            
            return result
        
        # 更新结果统计
        result['file_count'] = len(result['files'])
        result['total_size'] = sum(f.get('size', 0) for f in result['files'])
        result['processed_at'] = datetime.now().isoformat()
        
        self.logger.info(f"🎯 [MaterialNode] 处理完成: {result['file_count']}个文件, 目标文件: {global_context.target_file_path}")
        
        return result
    
    def _apply_data_mapping(self, node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
        """根据节点的数据映射配置提取特定的数据字段"""
        data = node.data
        
        # 获取节点的数据映射配置
        input_mappings = getattr(data, 'inputMappings', {})
        
        if not input_mappings:
            # 如果没有配置数据映射，返回空字典（不自动传递所有数据）
            return {}
        
        mapped_data = {}
        
        # 遍历配置的映射
        for mapping_key in input_mappings.keys():
            # mapping_key 格式: "nodeId.path.to.field"
            parts = mapping_key.split('.', 1)
            if len(parts) != 2:
                continue
                
            source_node_id, field_path = parts
            
            # 从context中获取源节点的结果
            source_result_key = f"{source_node_id}.result"
            if source_result_key not in context:
                continue
                
            source_data = context[source_result_key]
            
            # 根据字段路径提取数据
            field_value = self._extract_field_value(source_data, field_path)
            if field_value is not None:
                # 使用简化的字段名作为key
                simple_key = field_path.split('.')[-1]  # 使用最后一部分作为key
                mapped_data[simple_key] = field_value
        
        self.logger.info(f"[DataMapping] 节点 {node.id} 映射结果: {list(mapped_data.keys())}")
        return mapped_data
    
    def _extract_field_value(self, data: Any, field_path: str) -> Any:
        """从数据中根据路径提取字段值"""
        if not field_path:
            return data
            
        parts = field_path.split('.')
        current = data
        
        try:
            for part in parts:
                if isinstance(current, dict):
                    current = current.get(part)
                elif isinstance(current, list) and part.startswith('[') and part.endswith(']'):
                    # 处理数组索引，如 [0]
                    index = int(part[1:-1])
                    current = current[index]
                else:
                    return None
                    
                if current is None:
                    return None
                    
            return current
        except (KeyError, IndexError, ValueError, TypeError):
            return None
    
    async def _execute_execution_node(self, workflow_id: str, node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行执行节点"""
        self.logger.info(f"Executing execution node: {node.id}")
        
        # 🌟 获取全局上下文（强制性验证）
        if workflow_id not in self.workflow_global_context:
            raise ValueError(f"🚨 [ExecutionNode] 全局上下文未初始化！工作流: {workflow_id}")
        
        global_context = self.workflow_global_context[workflow_id]
        
        # 🚨 前置条件检查：必须有目标文件（借鉴GitHub Actions）
        try:
            target_file_path = global_context.get_target_file_path()
            target_file_info = global_context.get_target_file()
            self.logger.info(f"✅ [ExecutionNode] 目标文件验证通过: {target_file_path}")
        except ValueError as e:
            error_msg = f"🚨 [ExecutionNode] 前置条件失败: {str(e)}"
            self.logger.error(error_msg)
            raise ValueError(error_msg)
        
        data = node.data
        
        # 获取任务描述
        task = getattr(data, 'inputContent', '') or getattr(data, 'taskDescription', '')
        
        if not task:
            raise ValueError(f"🚨 [ExecutionNode] 任务描述不能为空！节点: {node.id}")
        
        # 🎯 强制性上下文增强（借鉴Zapier的数据映射）
        execution_context = f"任务: {task}"
        
        # 🌟 强制性目标文件上下文注入
        execution_context += f"\n\n🎯 目标文件信息（必须使用此文件）:"
        execution_context += f"\n文件路径: {target_file_path}"
        execution_context += f"\n文件名称: {target_file_info.get('name', 'Unknown')}"
        execution_context += f"\n文件大小: {target_file_info.get('size', 0)} bytes"
        
        # 🚨 强制性AI指令约束（借鉴Power Automate的环境变量机制）
        execution_context += f"\n\n🚨 重要约束条件："
        execution_context += f"\n1. 必须操作指定的目标文件: {target_file_path}"
        execution_context += f"\n2. 禁止创建新文档，必须使用 open_document('{target_file_path}')"
        execution_context += f"\n3. 所有操作必须基于现有文档内容进行修改"
        
        # 处理手动数据映射
        mapped_data = self._apply_data_mapping(node, context)
        
        # 添加上下文信息
        if mapped_data:
            execution_context += f"\n\n输入数据:"
            for key, value in mapped_data.items():
                execution_context += f"\n{key}: {value}"
        elif context:
            execution_context += f"\n\n上下文信息:"
            for key, value in context.items():
                if isinstance(value, dict) and 'node_type' in value:
                    node_type = value['node_type']
                    if node_type == 'material':
                        files_info = value.get('files', [])
                        if files_info:
                            execution_context += f"\n- 材料节点提供了 {len(files_info)} 个文件"
                    elif node_type == 'execution':
                        result_info = value.get('result', '')
                        if result_info:
                            execution_context += f"\n- 前置执行结果: {result_info[:100]}..."
        
        self.logger.info(f"🎯 [ExecutionNode] 增强后的执行上下文长度: {len(execution_context)}")
        
        try:
            # 获取工具类型
            tool_type = getattr(data, 'toolType', 'DeepSeek聊天模型')
            
            # 创建代理并执行
            agent_factory = AgentFactory()
            agent = agent_factory.create_agent(
                task=task,
                context=execution_context,
                tool_type=tool_type,
                mode="super",
                workflow_context=context  # 🌟 传递工作流上下文
            )
            
            self.logger.info(f"🔧 [ExecutionNode] 开始执行任务: {task[:100]}...")
            result = await agent.execute()
            
            # 🌟 验证AI执行结果（数据血缘检查）
            if isinstance(result, dict) and 'execution_results' in result:
                for exec_result in result['execution_results']:
                    operation_file = exec_result.get('file_path', '')
                    operation_type = exec_result.get('action', 'unknown')
                    
                    if operation_file:
                        # 验证操作的文件是否为目标文件
                        is_valid = global_context.validate_file_operation(operation_file, operation_type)
                        if not is_valid:
                            self.logger.warning(f"⚠️ [ExecutionNode] 检测到非目标文件操作，但继续执行")
            
            # 构建执行结果
                    execution_result = {
                        'node_type': 'execution',
                'task': task,
                'enhanced_task': execution_context,
                'mode': "super",
                'model': tool_type,
                'result': str(result),
                'success': True,
                'expected_output_format': 'txt',
                        'execution_metadata': {
                    'task_type': 'general',
                    'content_keywords': [],
                    'ai_model': tool_type,
                    'target_file_path': target_file_path,  # 记录目标文件
                    'data_lineage': global_context.get_data_lineage_summary()
                },
                'executed_at': datetime.now().isoformat()
                        }
            
            self.logger.info(f"✅ [ExecutionNode] 任务执行成功")
            return execution_result
            
        except Exception as e:
            error_msg = f"🚨 [ExecutionNode] 任务执行失败: {str(e)}"
            self.logger.error(error_msg)
            
            return {
                'node_type': 'execution',
                'task': task,
                'error': error_msg,
                'success': False,
                'executed_at': datetime.now().isoformat(),
                'target_file_path': target_file_path,
                'data_lineage': global_context.get_data_lineage_summary()
            }
    
    async def _execute_condition_node(self, node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行条件节点"""
        self.logger.info(f"Executing condition node: {node.id}")
        
        data = node.data
        
        # 获取条件配置
        conditions = getattr(data, 'conditions', [])
        logical_operator = getattr(data, 'logicalOperator', 'AND')
        
        results = []
        for i, condition in enumerate(conditions):
            left_operand = self._resolve_value(condition.get('leftOperand', ''), context)
            operator = condition.get('operator', 'equals')
            right_operand = self._resolve_value(condition.get('rightOperand', ''), context)
            data_type = condition.get('dataType', 'text')
            
            # 执行条件判断
            condition_result = self._evaluate_condition(left_operand, operator, right_operand, data_type)
            results.append(condition_result)
        
        # 计算最终结果
        if logical_operator == 'AND':
            final_result = all(results)
        else:  # OR
            final_result = any(results)
        
        return {
            'node_type': 'condition',
            'conditions': len(conditions),
            'logical_operator': logical_operator,
            'individual_results': results,
            'final_result': final_result,
            'evaluated_at': dt_module.datetime.now().isoformat()
        }
    
    async def _execute_result_node(self, workflow_id: str, node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行结果节点"""
        self.logger.info(f"Executing result node: {node.id}")
        
        # 🌟 获取全局上下文
        global_context = self.workflow_global_context.get(workflow_id)
        
        data = node.data
        
        # 获取输出配置
        output_type = getattr(data, 'outputType', 'file')
        params_dict = getattr(data, 'params', {}) or {}
        
        # 🎯 强制性目标文件验证和显示（借鉴Zapier的数据映射验证）
        result_content = "✅ 工作流执行完成！\n\n"
        
        if global_context:
            try:
                target_file_path = global_context.get_target_file_path()
                target_file_info = global_context.get_target_file()
                
                result_content += f"🎯 目标文件操作完成:\n"
                result_content += f"文件名称: {target_file_info.get('name', 'Unknown')}\n"
                result_content += f"文件路径: {target_file_path}\n"
                result_content += f"文件大小: {target_file_info.get('size', 0)} bytes\n\n"
                
                # 🌟 数据血缘摘要
                lineage_summary = global_context.get_data_lineage_summary()
                result_content += f"📋 操作历史:\n{lineage_summary}\n\n"
                
                # 设置结果文件信息
                result_file_name = target_file_info.get('name', 'processed_document.docx')
                result_file_path = target_file_path
                
                self.logger.info(f"✅ [ResultNode] 目标文件处理完成: {result_file_name}")
                
            except ValueError as e:
                self.logger.warning(f"⚠️ [ResultNode] 无法获取目标文件信息: {str(e)}")
                result_content += f"⚠️ 警告: {str(e)}\n\n"
                result_file_name = "workflow_result.txt"
                result_file_path = None
            else:
                self.logger.warning(f"⚠️ [ResultNode] 全局上下文不存在")
                result_content += "⚠️ 警告: 全局上下文不存在\n\n"
                result_file_name = "workflow_result.txt"
                result_file_path = None
        
        # 处理手动数据映射
        mapped_data = self._apply_data_mapping(node, context)
        
        # 添加映射的数据或上下文结果摘要
        if mapped_data:
            result_content += "📊 输入数据摘要:\n"
            for key, value in mapped_data.items():
                result_content += f"- {key}: {str(value)[:200]}{'...' if len(str(value)) > 200 else ''}\n"
        elif context:
            result_content += "📊 节点执行摘要:\n"
            for key, value in context.items():
                if isinstance(value, dict) and 'node_type' in value:
                    node_type = value['node_type']
                    if node_type == 'material':
                        file_count = value.get('file_count', 0)
                        result_content += f"- 材料节点: 处理了 {file_count} 个文件\n"
                    elif node_type == 'execution':
                        success = value.get('success', False)
                        result_content += f"- 执行节点: {'成功' if success else '失败'}\n"
                        if 'result' in value:
                            exec_result = str(value['result'])[:200]
                            result_content += f"  结果: {exec_result}{'...' if len(str(value['result'])) > 200 else ''}\n"
        
        # 构建结果对象
        result = {
                'node_type': 'result',
                'output_type': output_type,
            'output_format': 'auto',
            'file_name': result_file_name,
            'content': result_content,
            'generated_at': datetime.now().isoformat(),
            'ready_to_export': True
        }
        
        # 🌟 如果有目标文件路径，添加文件信息
        if result_file_path:
            try:
                import os
                if os.path.exists(result_file_path):
                    file_size = os.path.getsize(result_file_path)
                    result.update({
                        'size': file_size,
                        'storage_path': os.path.dirname(result_file_path),
                        'saved_file_path': result_file_path
                    })
                    self.logger.info(f"✅ [ResultNode] 目标文件验证成功: {result_file_path} ({file_size} bytes)")
                else:
                    self.logger.warning(f"⚠️ [ResultNode] 目标文件不存在: {result_file_path}")
            except Exception as e:
                self.logger.warning(f"⚠️ [ResultNode] 文件信息获取失败: {str(e)}")
        
        self.logger.info(f"🎯 [ResultNode] 结果节点执行完成，文件: {result_file_name}")
        return result
    


    async def _execute_default_node(self, workflow_id: str, node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行默认节点"""
        self.logger.info(f"Executing default node: {node.id}")

        return {
            'node_type': 'default',
            'node_id': node.id,
            'label': getattr(node.data, 'label', ''),
            'executed_at': dt_module.datetime.now().isoformat()
        }
    
    def _infer_output_format_from_task(self, task_description: str, result_content: str) -> str:
        """根据任务描述和结果内容智能推断输出格式"""
        task_lower = task_description.lower()
        content_lower = result_content.lower() if result_content else ""
        
        # 演示文稿类任务（优先检查，避免被文档类匹配）
        if any(keyword in task_lower for keyword in ['演示', 'ppt', 'presentation', '幻灯片', 'powerpoint']):
            return 'pptx'
        
        # 文档类任务
        elif any(keyword in task_lower for keyword in ['写', '文档', '报告', '说明', '手册', 'document', 'report']):
            if any(keyword in task_lower for keyword in ['表格', 'excel', 'sheet']):
                return 'xlsx'
            else:
                return 'docx'
        
        # 数据类任务
        elif any(keyword in task_lower for keyword in ['数据', 'data', '统计']):
            if any(keyword in task_lower for keyword in ['表格', 'excel', 'csv']):
                return 'xlsx'
            elif 'json' in task_lower or 'api' in task_lower:
                return 'json'
            else:
                return 'csv'
        
        # 代码类任务
        elif any(keyword in task_lower for keyword in ['代码', 'code', 'script', '脚本', '程序', 'python', 'javascript']):
            if 'python' in task_lower or 'py' in task_lower or 'python' in task_lower:
                return 'py'
            elif 'javascript' in task_lower or 'js' in task_lower:
                return 'js'
            elif 'html' in task_lower:
                return 'html'
            else:
                return 'py'  # 默认代码格式改为py
        
        # 网页开发类任务
        elif any(keyword in task_lower for keyword in ['网页', 'html', 'web', '页面', '开发']):
            return 'html'
        
        # 默认返回文本格式
        return 'txt'
    
    def _classify_task_type(self, task_description: str) -> str:
        """分类任务类型，用于智能命名"""
        task_lower = task_description.lower()
        
        if any(keyword in task_lower for keyword in ['写', '创建', '生成']):
            if any(keyword in task_lower for keyword in ['报告', 'report']):
                return 'report'
            elif any(keyword in task_lower for keyword in ['文档', 'document']):
                return 'document'
            elif any(keyword in task_lower for keyword in ['计划', 'plan']):
                return 'plan'
            elif any(keyword in task_lower for keyword in ['总结', 'summary']):
                return 'summary'
            else:
                return 'creation'
        elif any(keyword in task_lower for keyword in ['分析', 'analysis', '研究']):
            return 'analysis'
        elif any(keyword in task_lower for keyword in ['翻译', 'translate']):
            return 'translation'
        elif any(keyword in task_lower for keyword in ['优化', 'optimize', '改进']):
            return 'optimization'
        else:
            return 'general'
    
    def _extract_task_keywords(self, task_description: str) -> list:
        """从任务描述中提取关键词"""
        # 简单的关键词提取
        keywords = []
        common_keywords = ['报告', '文档', '分析', '计划', '总结', '数据', '代码', '网页']
        
        for keyword in common_keywords:
            if keyword in task_description:
                keywords.append(keyword)
        
        return keywords[:3]  # 最多返回3个关键词
    
    def _resolve_value(self, value: str, context: Dict[str, Any]) -> Any:
        """解析值中的上下文引用"""
        if isinstance(value, str) and value.startswith('@'):
            ref_key = value[1:]
            return context.get(ref_key, value)
        return value
    
    def _evaluate_condition(self, left: Any, operator: str, right: Any, data_type: str) -> bool:
        """评估条件"""
        try:
            if data_type == 'number':
                left = float(left) if left is not None else 0
                right = float(right) if right is not None else 0
            elif data_type == 'text':
                left = str(left) if left is not None else ''
                right = str(right) if right is not None else ''
            
            if operator == 'equals':
                return left == right
            elif operator == 'notEquals':
                return left != right
            elif operator == 'greater':
                return left > right
            elif operator == 'less':
                return left < right
            elif operator == 'greaterEqual':
                return left >= right
            elif operator == 'lessEqual':
                return left <= right
            elif operator == 'contains':
                return str(right) in str(left)
            elif operator == 'notContains':
                return str(right) not in str(left)
            else:
                return False
                
        except Exception as e:
            self.logger.error(f"Condition evaluation error: {e}")
            return False
    
    def _generate_output_content(self, context: Dict[str, Any], output_type: str, output_format: str) -> str:
        """生成输出内容
        返回字符串內容；若為 docx，該函數將寫入臨時文本並由上層保存為 .docx 由專用邏輯處理
        """
        # 優先從最近的執行節點結果拿文本
        latest_exec_text = ''
        try:
            # 取最後一個 *.result 中的 'result' 或 'content'
            exec_keys = [k for k in context.keys() if k.endswith('.result')]
            for key in sorted(exec_keys, reverse=True):
                val = context.get(key) or {}
                if isinstance(val, dict):
                    latest_exec_text = val.get('result') or val.get('content') or ''
                    if latest_exec_text:
                        break
                else:
                    latest_exec_text = str(val)
                    break
        except Exception:
            pass

        if output_format == 'docx':
            # 返回純文本，寫檔流程在 _execute_result_node 內處理 docx
            if latest_exec_text:
                return latest_exec_text
            # 後備：若沒有執行結果就序列化上下文
            return json.dumps(context, ensure_ascii=False, indent=2)

        if output_format == 'json':
            return json.dumps(context, indent=2, ensure_ascii=False)
        elif output_format == 'txt':
            if latest_exec_text:
                return latest_exec_text
            lines = []
            lines.append("工作流执行结果")
            lines.append("=" * 50)
            lines.append(f"生成时间: {dt_module.datetime.now().isoformat()}")
            lines.append("")
            for key, value in context.items():
                lines.append(f"{key}:")
                lines.append(f"  {value}")
                lines.append("")
            return "\n".join(lines)
        else:
            return str(context)
    
    async def pause_workflow(self, workflow_id: str) -> bool:
        """暂停工作流"""
        if workflow_id in self.active_workflows:
            task = self.active_workflows[workflow_id]
            task.cancel()
            self.state_manager.pause_workflow(workflow_id, "User requested pause")
            return True
        return False
    
    async def resume_workflow(self, workflow_id: str, payload: WorkflowPayload) -> bool:
        """恢复工作流"""
        execution = self.state_manager.get_workflow_status(workflow_id)
        if execution and execution.status == WorkflowStatus.PAUSED:
            self.state_manager.resume_workflow(workflow_id)

            # 重新启动执行任务
            task = asyncio.create_task(self._run_workflow(workflow_id, payload))
            self.active_workflows[workflow_id] = task
            return True
        return False

    async def reset_and_restart_workflow(self, workflow_id: str, payload: WorkflowPayload) -> str:
        """重置并重新启动工作流"""
        try:
            # 停止当前执行（如果有的话）
            if workflow_id in self.active_workflows:
                task = self.active_workflows[workflow_id]
                task.cancel()
                del self.active_workflows[workflow_id]

            # 重置工作流状态
            execution = self.state_manager.reset_workflow(workflow_id, payload)

            # 重新启动工作流
            task = asyncio.create_task(self._run_workflow(workflow_id, payload))
            self.active_workflows[workflow_id] = task

            self.logger.info(f"Reset and restarted workflow: {workflow_id}")
            return workflow_id

        except Exception as e:
            self.logger.error(f"Failed to reset and restart workflow: {e}")
            self.state_manager.fail_workflow(workflow_id, str(e))
            raise
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """获取工作流状态"""
        try:
            # 尝试使用get_workflow_status方法
            execution = self.state_manager.get_workflow_status(workflow_id)
        except AttributeError:
            # 如果方法不存在，使用workflows字典直接获取
            execution = self.state_manager.workflows.get(workflow_id)
        if execution:
            # 获取基本工作流状态
            status_dict = execution.to_dict()
            
            # 添加节点执行状态 - 这对前端流程线交互至关重要
            if workflow_id in self.state_manager.node_executions:
                status_dict['node_executions'] = {}
                for node_id, node_exec in self.state_manager.node_executions[workflow_id].items():
                    status_dict['node_executions'][node_id] = node_exec.to_dict()
            
            return status_dict
        return None
    
    def get_node_status(self, workflow_id: str, node_id: str) -> Optional[Dict[str, Any]]:
        """获取节点状态"""
        node_execution = self.state_manager.get_node_status(workflow_id, node_id)
        if node_execution:
            return node_execution.to_dict()
        return None

    def _generate_output_content(self, context: Dict[str, Any], output_type: str, output_format: str) -> str:
        """生成输出内容"""
        if not context:
            return "# 工作流执行结果\n\n没有找到可用的执行内容。"
        
        # 收集所有节点的执行结果
        content_parts = []
        content_parts.append(f"# 工作流执行结果")
        content_parts.append(f"生成时间: {dt_module.datetime.now().isoformat()}")
        content_parts.append("")
        
        for node_id, node_result in context.items():
            if isinstance(node_result, dict):
                node_type = node_result.get('node_type', 'unknown')
                
                if node_type == 'execution':
                    # 执行节点的结果
                    task = node_result.get('task', '未知任务')
                    result = node_result.get('result', '')
                    
                    content_parts.append(f"## 执行任务: {task}")
                    content_parts.append("")
                    if result:
                        content_parts.append(result)
                    else:
                        content_parts.append("*此任务没有生成输出内容*")
                    content_parts.append("")
                    
                elif node_type == 'material':
                    # 材料节点的结果
                    content_parts.append(f"## 材料节点")
                    content_parts.append("")
                    content_parts.append(str(node_result.get('content', node_result)))
                    content_parts.append("")
                    
                elif node_type == 'condition':
                    # 条件节点的结果
                    condition_result = node_result.get('result', False)
                    content_parts.append(f"## 条件判断: {'通过' if condition_result else '不通过'}")
                    content_parts.append("")
        
        # 如果没有找到任何有效内容，添加一个默认说明
        if len(content_parts) <= 3:  # 只有标题和时间
            content_parts.append("## 执行说明")
            content_parts.append("")
            content_parts.append("工作流已成功执行，但各个节点没有生成可显示的内容。")
            content_parts.append("这可能是因为：")
            content_parts.append("- 执行节点使用了模拟模式")
            content_parts.append("- API配置需要检查")
            content_parts.append("- 任务类型不需要生成文本输出")
        
        return "\n".join(content_parts)


# 全局执行引擎实例
mindmap_execution_engine = MindmapExecutionEngine()
