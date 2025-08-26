"""
简化的思维导图API - 用于测试增强功能
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel

from workflow.mindmap_execution_engine import mindmap_execution_engine
from utils.schemas import WorkflowPayload, Node, Edge

router = APIRouter()

# 工作流执行请求模型
class WorkflowExecutionRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    title: Optional[str] = "未命名工作流"
    description: Optional[str] = ""

@router.post("/api/workflow/execute")
async def execute_workflow(request: Request, background_tasks: BackgroundTasks):
    """执行工作流"""
    try:
        # 手动解析请求数据以绕过Pydantic验证问题
        raw_data = await request.json()
        
        # 🔧 修复selectedTool对象格式问题
        nodes = []
        for node_data in raw_data.get('nodes', []):
            # 处理node data中的selectedTool
            node_data_dict = node_data.get('data', {})
            if 'selectedTool' in node_data_dict and isinstance(node_data_dict['selectedTool'], dict):
                if 'name' in node_data_dict['selectedTool']:
                    node_data_dict['selectedTool'] = node_data_dict['selectedTool']['name']
                    logging.info(f"🔧 [selectedTool修复] 转换对象格式到字符串: {node_data_dict['selectedTool']}")
            
            # 手动创建Node对象，使用字典而不是NodeData
            node = {
                'id': node_data.get('id', ''),
                'type': node_data.get('type', 'default'),
                'position': node_data.get('position', {'x': 0, 'y': 0}),
                'data': node_data_dict
            }
            nodes.append(node)

        edges = []
        for edge_data in raw_data.get('edges', []):
            edge = {
                'id': edge_data.get('id', ''),
                'source': edge_data.get('source', ''),
                'target': edge_data.get('target', ''),
                'sourceHandle': edge_data.get('sourceHandle', 'default'),
                'targetHandle': edge_data.get('targetHandle', 'default'),
                'type': edge_data.get('type', 'default'),
                'data': edge_data.get('data', {})
            }
            edges.append(edge)

        # 创建简化的工作流数据（使用字典而不是Pydantic对象）
        workflow_data = {
            'nodes': nodes,
            'edges': edges,
            'title': raw_data.get('title', ''),
            'description': raw_data.get('description', '')
        }

        # 直接传递给执行引擎
        from workflow.mindmap_execution_engine import mindmap_execution_engine
        workflow_id = await mindmap_execution_engine.execute_workflow(workflow_data)
        
        return {
            "status": "started",
            "workflow_id": workflow_id,
            "message": "工作流已启动"
        }

    except Exception as e:
        logging.error(f"Failed to execute workflow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")


@router.get("/api/workflow/{workflow_id}/status")
async def get_workflow_status(workflow_id: str):
    """获取工作流执行状态"""
    try:
        print(f"🔍 [API] 获取工作流状态: {workflow_id}")
        status = mindmap_execution_engine.get_workflow_status(workflow_id)
        print(f"🔍 [API] 获取到状态: {status}")
        
        if status:
            print(f"🔧 [API] 返回增强状态数据")
            return status
        else:
            raise HTTPException(status_code=404, detail="Workflow not found")
            
    except Exception as e:
        print(f"❌ [API] 获取状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get workflow status: {str(e)}")


# 工具库API已移至 core/main.py，避免路由冲突 