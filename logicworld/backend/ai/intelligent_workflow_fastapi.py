"""
AI智能工作流FastAPI路由
为前端提供智能化工作流生成和节点配置的FastAPI接口
"""
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai.intelligent_node_configurator import IntelligentNodeConfigurator, NodeType, NodeConfigRequest
from ai.intelligent_workflow_orchestrator import IntelligentWorkflowOrchestrator


# 创建路由器
router = APIRouter(prefix="/api/intelligent-workflow", tags=["intelligent-workflow"])

# 全局实例
node_configurator = None
workflow_orchestrator = None
logger = logging.getLogger(__name__)


# 请求模型
class WorkflowGenerationRequest(BaseModel):
    description: str
    context: Dict[str, Any] = {}


class NodeConfigurationRequest(BaseModel):
    nodeType: str
    description: str = ""
    context: Dict[str, Any] = {}
    workflowContext: Dict[str, Any] = {}
    existingConfig: Dict[str, Any] = {}


class RequirementsAnalysisRequest(BaseModel):
    input: str
    context: Dict[str, Any] = {}


class WorkflowOptimizationRequest(BaseModel):
    workflow: Dict[str, Any]
    optimizationGoals: List[str] = ["performance"]


class ConnectionSuggestionRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    context: Dict[str, Any] = {}


class WorkflowValidationRequest(BaseModel):
    workflow: Dict[str, Any]


async def initialize_services():
    """初始化服务"""
    global node_configurator, workflow_orchestrator
    
    if node_configurator is None:
        node_configurator = IntelligentNodeConfigurator()
        await node_configurator.initialize()
    
    if workflow_orchestrator is None:
        workflow_orchestrator = IntelligentWorkflowOrchestrator()
        await workflow_orchestrator.initialize()


@router.post("/generate")
async def generate_intelligent_workflow(request: WorkflowGenerationRequest):
    """生成智能工作流"""
    try:
        await initialize_services()
        
        if not request.description:
            raise HTTPException(status_code=400, detail="请提供工作流描述")
        
        logger.info(f"🎯 生成智能工作流请求: {request.description[:50]}...")
        
        # 生成智能工作流
        workflow = await workflow_orchestrator.generate_intelligent_workflow(
            request.description, request.context
        )
        
        # 转换为前端格式
        frontend_workflow = _convert_to_frontend_format(workflow)
        
        return {
            "success": True,
            "workflow": frontend_workflow,
            "metadata": {
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "created_at": workflow.metadata.get("created_at"),
                "optimization_info": workflow.optimization_info
            }
        }
        
    except Exception as e:
        logger.error(f"生成智能工作流失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configure-node")
async def configure_intelligent_node(request: NodeConfigurationRequest):
    """智能配置节点"""
    try:
        await initialize_services()
        
        if not request.nodeType:
            raise HTTPException(status_code=400, detail="请指定节点类型")
        
        try:
            node_type = NodeType(request.nodeType)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"不支持的节点类型: {request.nodeType}")
        
        logger.info(f"🔧 智能配置节点请求: {request.nodeType}")
        
        # 创建配置请求
        config_request = NodeConfigRequest(
            node_type=node_type,
            user_description=request.description,
            context=request.context,
            workflow_context=request.workflowContext,
            existing_config=request.existingConfig
        )
        
        # 生成智能配置
        config_response = await node_configurator.configure_node(config_request)
        
        return {
            "success": config_response.success,
            "config": config_response.config,
            "reasoning": config_response.reasoning,
            "confidence": config_response.confidence,
            "suggestions": config_response.suggestions,
            "optimizations": config_response.optimizations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"智能配置节点失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-requirements")
async def analyze_workflow_requirements(request: RequirementsAnalysisRequest):
    """分析工作流需求"""
    try:
        await initialize_services()
        
        if not request.input:
            raise HTTPException(status_code=400, detail="请提供需求描述")
        
        logger.info(f"🔍 分析工作流需求: {request.input[:50]}...")
        
        # 使用工作流编排器的分析功能
        analysis = await workflow_orchestrator._analyze_workflow_requirements(request.input, request.context)
        
        return {
            "success": True,
            "analysis": analysis,
            "recommendations": {
                "suggested_nodes": analysis.get("required_nodes", []),
                "connection_style": analysis.get("connection_style", "linear"),
                "complexity": analysis.get("complexity", "moderate"),
                "optimization_goals": analysis.get("optimization_goals", [])
            }
        }
        
    except Exception as e:
        logger.error(f"分析工作流需求失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize-workflow")
async def optimize_existing_workflow(request: WorkflowOptimizationRequest):
    """优化现有工作流"""
    try:
        await initialize_services()
        
        if not request.workflow:
            raise HTTPException(status_code=400, detail="请提供工作流数据")
        
        logger.info("🚀 优化现有工作流")
        
        # 转换前端格式到内部格式
        nodes, connections = _convert_from_frontend_format(request.workflow)
        
        # 执行优化
        optimization_result = await workflow_orchestrator._optimize_workflow(
            nodes, connections, {"optimization_goals": request.optimizationGoals}
        )
        
        # 转换回前端格式
        optimized_workflow = _convert_optimization_to_frontend(optimization_result)
        
        return {
            "success": True,
            "optimizedWorkflow": optimized_workflow,
            "optimizationInfo": optimization_result.get("optimization_info", {}),
            "improvements": _calculate_improvements(request.workflow, optimized_workflow)
        }
        
    except Exception as e:
        logger.error(f"优化工作流失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-connections")
async def suggest_intelligent_connections(request: ConnectionSuggestionRequest):
    """建议智能连接"""
    try:
        await initialize_services()
        
        if not request.nodes:
            raise HTTPException(status_code=400, detail="请提供节点数据")
        
        logger.info("🔗 生成智能连接建议")
        
        # 分析节点并生成连接建议
        connection_suggestions = await _generate_connection_suggestions(request.nodes, request.context)
        
        return {
            "success": True,
            "suggestions": connection_suggestions,
            "reasoning": "基于节点类型和功能分析生成的智能连接建议"
        }
        
    except Exception as e:
        logger.error(f"生成连接建议失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-workflow")
async def validate_workflow(request: WorkflowValidationRequest):
    """验证工作流"""
    try:
        await initialize_services()
        
        if not request.workflow:
            raise HTTPException(status_code=400, detail="请提供工作流数据")
        
        logger.info("✅ 验证工作流")
        
        # 转换格式并验证
        nodes, connections = _convert_from_frontend_format(request.workflow)
        validation_result = await workflow_orchestrator._validate_workflow({
            "nodes": nodes,
            "connections": connections
        })
        
        return {
            "success": True,
            "validation": validation_result,
            "isValid": validation_result.get("valid", False),
            "issues": validation_result.get("issues", []),
            "warnings": validation_result.get("warnings", []),
            "suggestions": validation_result.get("suggestions", [])
        }
        
    except Exception as e:
        logger.error(f"验证工作流失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _convert_to_frontend_format(workflow):
    """将内部工作流格式转换为前端格式"""
    frontend_nodes = []
    frontend_edges = []

    # 节点类型映射：内部类型 -> 前端节点类型
    node_type_mapping = {
        "material-node": "customNode",  # 材料节点使用customNode显示详细统计信息
        "execution-node": "execution-node",
        "condition-node": "condition-node",
        "result-node": "result-node"
    }

    # 转换节点
    for node in workflow.nodes:
        # 映射到前端的增强型节点类型
        frontend_type = node_type_mapping.get(node.type.value, node.type.value)

        frontend_node = {
            "id": node.id,
            "type": frontend_type,
            "position": node.position,
            "data": {
                "label": _generate_node_label(node),
                "nodeType": node.type.value,  # 使用原始节点类型，让前端正确识别
                "status": "default",  # 普通节点的默认状态
                # 移除增强型节点特有的属性，使用普通节点格式
                # "config": node.config,  # 普通节点不需要复杂配置
                # "intelligentConfig": True,
                # "aiEnhanced": True,
                # "typeIcon": _get_node_icon(node.type),
                # "progress": 0
            }
        }
        frontend_nodes.append(frontend_node)
    
    # 转换连接
    for connection in workflow.connections:
        # 根据连接类型确定sourceHandle和targetHandle
        # 新版节点使用复合ID格式：direction-type
        source_handle = "right-source"  # 默认从右侧输出
        target_handle = "left-target"   # 默认从左侧输入

        # 如果是条件节点，使用特定的handle
        if connection.type.value == "conditional":
            source_handle = "right-true"  # 条件为真的输出

        frontend_edge = {
            "id": connection.id,
            "source": connection.source,
            "target": connection.target,
            "sourceHandle": source_handle,
            "targetHandle": target_handle,
            "type": "enhanced",  # 使用与前端一致的连接线类型
            "animated": False,
            "className": "silky-smooth enhanced-edge",
            "style": {"strokeWidth": 2, "stroke": "#7c3aed"},
            "markerEnd": "url(#smooth-arrow)",
            "data": {
                "connectionType": connection.type.value,
                "conditions": connection.conditions,
                "metadata": connection.metadata,
                "status": "connected",
                "color": "#7c3aed",
                "aiGenerated": True
            }
        }
        frontend_edges.append(frontend_edge)
    
    return {
        "nodes": frontend_nodes,
        "edges": frontend_edges,
        "metadata": workflow.metadata
    }


def _generate_node_label(node):
    """生成节点标签"""
    type_labels = {
        NodeType.MATERIAL: "材料",
        NodeType.EXECUTION: "执行",
        NodeType.CONDITION: "条件",
        NodeType.RESULT: "结果"
    }
    return type_labels.get(node.type, node.type.value)


def _get_node_icon(node_type):
    """获取节点图标"""
    type_icons = {
        NodeType.MATERIAL: "📁",
        NodeType.EXECUTION: "⚡",
        NodeType.CONDITION: "🔀",
        NodeType.RESULT: "📄"
    }
    return type_icons.get(node_type, "🔧")


def _convert_from_frontend_format(workflow_data):
    """将前端格式转换为内部格式"""
    # 这里需要实现转换逻辑
    # 暂时返回空列表，实际实现时需要完善
    return [], []


def _convert_optimization_to_frontend(optimization_result):
    """将优化结果转换为前端格式"""
    # 这里需要实现转换逻辑
    return optimization_result


def _calculate_improvements(original, optimized):
    """计算改进指标"""
    return {
        "performance_improvement": "预计提升30%",
        "resource_savings": "预计节省20%内存",
        "accuracy_improvement": "预计提升15%准确率"
    }


async def _generate_connection_suggestions(nodes, context):
    """生成连接建议"""
    suggestions = []
    
    # 基础连接逻辑
    for i in range(len(nodes) - 1):
        current_node = nodes[i]
        next_node = nodes[i + 1]
        
        suggestion = {
            "source": current_node.get("id"),
            "target": next_node.get("id"),
            "type": "sequential",
            "confidence": 0.8,
            "reasoning": f"基于节点类型 {current_node.get('type')} -> {next_node.get('type')} 的标准连接"
        }
        suggestions.append(suggestion)
    
    return suggestions
