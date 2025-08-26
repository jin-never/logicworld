#!/usr/bin/env python3
"""
增强的状态管理集成系统
将状态管理深度集成到工作流执行链路中
"""

import asyncio
import json
import time
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

from utils.workflow_state import (
    WorkflowContext, NodeOutput, NodeExecutionInfo, NodeBusinessData,
    NodeStatus, WorkflowStatus
)

class StateChangeEvent(Enum):
    """状态变更事件类型"""
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"
    NODE_STARTED = "node_started"
    NODE_COMPLETED = "node_completed"
    NODE_FAILED = "node_failed"
    DATA_FLOW_UPDATED = "data_flow_updated"

@dataclass
class StateChangePayload:
    """状态变更事件载荷"""
    event_type: StateChangeEvent
    workflow_id: str
    node_id: Optional[str] = None
    timestamp: datetime = None
    data: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class StateEventBus:
    """状态事件总线 - 负责状态变更的发布和订阅"""
    
    def __init__(self):
        self.subscribers: Dict[StateChangeEvent, List[Callable]] = {}
        self.global_subscribers: List[Callable] = []
    
    def subscribe(self, event_type: StateChangeEvent, callback: Callable):
        """订阅特定事件类型"""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
    
    def subscribe_all(self, callback: Callable):
        """订阅所有事件"""
        self.global_subscribers.append(callback)
    
    async def publish(self, payload: StateChangePayload):
        """发布状态变更事件"""
        # 触发特定事件订阅者
        if payload.event_type in self.subscribers:
            for callback in self.subscribers[payload.event_type]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(payload)
                    else:
                        callback(payload)
                except Exception as e:
                    print(f"⚠️ 状态事件处理器错误: {e}")
        
        # 触发全局订阅者
        for callback in self.global_subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(payload)
                else:
                    callback(payload)
            except Exception as e:
                print(f"⚠️ 全局状态事件处理器错误: {e}")

class FlowlineStateManager:
    """流程线状态管理器 - 核心集成组件"""
    
    def __init__(self):
        self.contexts: Dict[str, WorkflowContext] = {}
        self.event_bus = StateEventBus()
        
        # 前端状态同步队列
        self.frontend_sync_queue: List[Dict] = []
        
        # 注册内置事件处理器
        self._register_builtin_handlers()
    
    def _register_builtin_handlers(self):
        """注册内置事件处理器"""
        # 前端状态同步处理器
        self.event_bus.subscribe_all(self._handle_frontend_sync)
        
        # 数据流更新处理器
        self.event_bus.subscribe(StateChangeEvent.NODE_COMPLETED, self._handle_data_flow_update)
    
    async def _handle_frontend_sync(self, payload: StateChangePayload):
        """处理前端状态同步"""
        sync_data = {
            'event': payload.event_type.value,
            'workflow_id': payload.workflow_id,
            'node_id': payload.node_id,
            'timestamp': payload.timestamp.isoformat(),
            'data': payload.data or {}
        }
        
        # 添加到同步队列 (WebSocket 或轮询时消费)
        self.frontend_sync_queue.append(sync_data)
        
        # 保持队列大小
        if len(self.frontend_sync_queue) > 100:
            self.frontend_sync_queue = self.frontend_sync_queue[-50:]
    
    async def _handle_data_flow_update(self, payload: StateChangePayload):
        """处理数据流更新"""
        if payload.workflow_id in self.contexts and payload.node_id:
            context = self.contexts[payload.workflow_id]
            node_output = context.get_node_output(payload.node_id)
            
            if node_output and payload.data:
                # 更新节点输出
                for key, value in payload.data.items():
                    node_output.set_output(key, value)
                
                # 触发数据流更新事件
                await self.event_bus.publish(StateChangePayload(
                    event_type=StateChangeEvent.DATA_FLOW_UPDATED,
                    workflow_id=payload.workflow_id,
                    node_id=payload.node_id,
                    data={'updated_outputs': payload.data}
                ))
    
    async def start_workflow(self, workflow_id: str, nodes: List[Dict]) -> WorkflowContext:
        """启动工作流并初始化状态"""
        context = WorkflowContext(workflow_id)
        context.status = WorkflowStatus.RUNNING
        context.start_time = datetime.now()
        
        # 初始化所有节点状态
        for node in nodes:
            node_id = node['id']
            execution_info = NodeExecutionInfo(node_id=node_id, status=NodeStatus.PENDING)
            business_data = NodeBusinessData()
            node_output = NodeOutput(execution_info=execution_info, business_data=business_data)
            context.add_node_output(node_id, node_output)
        
        self.contexts[workflow_id] = context
        
        # 发布工作流启动事件
        await self.event_bus.publish(StateChangePayload(
            event_type=StateChangeEvent.WORKFLOW_STARTED,
            workflow_id=workflow_id,
            data={'node_count': len(nodes)}
        ))
        
        return context
    
    async def start_node(self, workflow_id: str, node_id: str, node_data: Dict):
        """开始执行节点"""
        if workflow_id not in self.contexts:
            raise ValueError(f"工作流 {workflow_id} 不存在")
        
        context = self.contexts[workflow_id]
        node_output = context.get_node_output(node_id)
        
        if node_output:
            # 更新执行状态
            node_output.execution_info.status = NodeStatus.RUNNING
            node_output.execution_info.start_time = datetime.now()
            
            # 更新业务数据
            node_output.business_data.metadata.update({
                'node_type': node_data.get('nodeType', 'unknown'),
                'task': node_data.get('inputContent', ''),
                'tool_type': node_data.get('toolType', ''),
                'ai_model': node_data.get('aiModel', '')
            })
            
            # 发布节点启动事件
            await self.event_bus.publish(StateChangePayload(
                event_type=StateChangeEvent.NODE_STARTED,
                workflow_id=workflow_id,
                node_id=node_id,
                data={'node_data': node_data}
            ))
    
    async def complete_node(self, workflow_id: str, node_id: str, result: Dict):
        """完成节点执行"""
        if workflow_id not in self.contexts:
            raise ValueError(f"工作流 {workflow_id} 不存在")
        
        context = self.contexts[workflow_id]
        node_output = context.get_node_output(node_id)
        
        if node_output:
            # 更新执行状态
            node_output.execution_info.status = NodeStatus.SUCCESS
            node_output.execution_info.end_time = datetime.now()
            if node_output.execution_info.start_time:
                duration = (node_output.execution_info.end_time - node_output.execution_info.start_time).total_seconds()
                node_output.execution_info.duration = duration
            
            # 更新业务数据
            node_output.business_data.content = result
            
            # 设置输出引用 (供其他节点使用)
            if 'document_path' in result:
                node_output.set_output('document_path', result['document_path'])
            if 'content' in result:
                node_output.set_output('content', result['content'])
            if 'result' in result:
                node_output.set_output('result', result['result'])
            
            # 发布节点完成事件
            await self.event_bus.publish(StateChangePayload(
                event_type=StateChangeEvent.NODE_COMPLETED,
                workflow_id=workflow_id,
                node_id=node_id,
                data={
                    'result': result,
                    'outputs': node_output.outputs,
                    'duration': node_output.execution_info.duration
                }
            ))
    
    async def fail_node(self, workflow_id: str, node_id: str, error: str):
        """节点执行失败"""
        if workflow_id not in self.contexts:
            raise ValueError(f"工作流 {workflow_id} 不存在")
        
        context = self.contexts[workflow_id]
        node_output = context.get_node_output(node_id)
        
        if node_output:
            # 更新执行状态
            node_output.execution_info.status = NodeStatus.FAILED
            node_output.execution_info.end_time = datetime.now()
            node_output.execution_info.error = error
            
            # 发布节点失败事件
            await self.event_bus.publish(StateChangePayload(
                event_type=StateChangeEvent.NODE_FAILED,
                workflow_id=workflow_id,
                node_id=node_id,
                data={'error': error}
            ))
    
    async def complete_workflow(self, workflow_id: str):
        """完成工作流"""
        if workflow_id not in self.contexts:
            return
        
        context = self.contexts[workflow_id]
        context.status = WorkflowStatus.COMPLETED
        context.end_time = datetime.now()
        
        # 发布工作流完成事件
        await self.event_bus.publish(StateChangePayload(
            event_type=StateChangeEvent.WORKFLOW_COMPLETED,
            workflow_id=workflow_id,
            data={'total_duration': (context.end_time - context.start_time).total_seconds()}
        ))
    
    def get_workflow_status(self, workflow_id: str) -> Dict:
        """获取工作流状态 (API调用)"""
        if workflow_id not in self.contexts:
            raise ValueError(f"工作流 {workflow_id} 不存在")
        
        context = self.contexts[workflow_id]
        
        # 构建状态响应 (分离执行状态和业务数据)
        response = {
            'workflow_id': workflow_id,
            'execution_status': {
                'status': context.status.value,
                'start_time': context.start_time.isoformat() if context.start_time else None,
                'end_time': context.end_time.isoformat() if context.end_time else None,
                'duration': (context.end_time - context.start_time).total_seconds() if context.end_time and context.start_time else None,
                'error': context.error
            },
            'business_results': {
                'completed_nodes': [node_id for node_id, output in context.nodes.items() 
                                  if output.execution_info.status == NodeStatus.SUCCESS],
                'failed_nodes': [node_id for node_id, output in context.nodes.items() 
                               if output.execution_info.status == NodeStatus.FAILED],
                'generated_documents': [],
                'content_summary': '',
                'outputs': {}
            },
            'node_details': {},
            'data_flow': context.data_flow,
            'real_time_events': self.get_recent_events(workflow_id)
        }
        
        # 填充节点详情
        for node_id, node_output in context.nodes.items():
            response['node_details'][node_id] = {
                'execution_info': {
                    'status': node_output.execution_info.status.value,
                    'start_time': node_output.execution_info.start_time.isoformat() if node_output.execution_info.start_time else None,
                    'end_time': node_output.execution_info.end_time.isoformat() if node_output.execution_info.end_time else None,
                    'duration': node_output.execution_info.duration,
                    'error': node_output.execution_info.error,
                    'retry_count': node_output.execution_info.retry_count
                },
                'business_data': {
                    'node_type': node_output.business_data.metadata.get('node_type', ''),
                    'task': node_output.business_data.metadata.get('task', ''),
                    'content': node_output.business_data.content,
                    'file_paths': node_output.business_data.file_paths,
                    'ai_metadata': {
                        'model': node_output.business_data.metadata.get('ai_model', ''),
                        'mode': node_output.business_data.metadata.get('mode', ''),
                        'task_type': node_output.business_data.metadata.get('task_type', '')
                    }
                },
                'outputs': node_output.outputs
            }
            
            # 收集生成的文档
            if 'document_path' in node_output.outputs:
                response['business_results']['generated_documents'].append(node_output.outputs['document_path'])
        
        # 生成内容摘要
        doc_count = len(response['business_results']['generated_documents'])
        response['business_results']['content_summary'] = f'已生成 {doc_count} 个文档' if doc_count > 0 else '未生成文档'
        
        return response
    
    def get_recent_events(self, workflow_id: str, limit: int = 20) -> List[Dict]:
        """获取最近的状态变更事件"""
        # 从同步队列中过滤特定工作流的事件
        workflow_events = [
            event for event in self.frontend_sync_queue[-limit:]
            if event.get('workflow_id') == workflow_id
        ]
        return workflow_events
    
    def get_flowline_sync_data(self, workflow_id: str) -> Dict:
        """获取流程线同步数据 (专门用于可视化更新)"""
        if workflow_id not in self.contexts:
            return {}
        
        context = self.contexts[workflow_id]
        
        # 构建节点状态映射 (用于流程线可视化)
        node_states = {}
        edge_states = {}
        
        for node_id, node_output in context.nodes.items():
            status = node_output.execution_info.status.value
            
            # 转换为前端状态格式
            frontend_status = {
                'pending': 'idle',
                'running': 'running', 
                'success': 'success',
                'failed': 'error',
                'skipped': 'skipped'
            }.get(status, 'idle')
            
            node_states[node_id] = {
                'status': frontend_status,
                'progress': 100 if status in ['success', 'failed'] else (50 if status == 'running' else 0),
                'duration': node_output.execution_info.duration,
                'error': node_output.execution_info.error,
                'outputs': node_output.outputs
            }
        
        return {
            'workflow_status': context.status.value,
            'node_states': node_states,
            'edge_states': edge_states,
            'data_flow': context.data_flow,
            'last_update': datetime.now().isoformat()
        }

# 全局状态管理器实例
flowline_state_manager = FlowlineStateManager() 