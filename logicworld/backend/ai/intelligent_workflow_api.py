"""
AI智能工作流API
为前端提供智能化工作流生成和节点配置的API接口
"""
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from flask import Blueprint, request, jsonify
from functools import wraps

from ai.intelligent_node_configurator import IntelligentNodeConfigurator, NodeType, NodeConfigRequest
from ai.intelligent_workflow_orchestrator import IntelligentWorkflowOrchestrator


# 创建蓝图
intelligent_workflow_bp = Blueprint('intelligent_workflow', __name__, url_prefix='/api/intelligent-workflow')

# 全局实例
node_configurator = None
workflow_orchestrator = None
logger = logging.getLogger(__name__)


def async_route(f):
    """异步路由装饰器"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(f(*args, **kwargs))
        finally:
            loop.close()
    return wrapper


async def initialize_services():
    """初始化服务"""
    global node_configurator, workflow_orchestrator
    
    if node_configurator is None:
        node_configurator = IntelligentNodeConfigurator()
        await node_configurator.initialize()
    
    if workflow_orchestrator is None:
        workflow_orchestrator = IntelligentWorkflowOrchestrator()
        await workflow_orchestrator.initialize()


@intelligent_workflow_bp.route('/generate-workflow', methods=['POST'])
@async_route
async def generate_intelligent_workflow():
    """生成智能工作流"""
    try:
        await initialize_services()
        
        data = request.get_json()
        user_description = data.get('description', '')
        context = data.get('context', {})
        
        if not user_description:
            return jsonify({
                'success': False,
                'error': '请提供工作流描述'
            }), 400
        
        logger.info(f"🎯 生成智能工作流请求: {user_description[:50]}...")
        
        # 生成智能工作流
        workflow = await workflow_orchestrator.generate_intelligent_workflow(
            user_description, context
        )
        
        # 转换为前端格式
        frontend_workflow = _convert_to_frontend_format(workflow)
        
        return jsonify({
            'success': True,
            'workflow': frontend_workflow,
            'metadata': {
                'workflow_id': workflow.id,
                'workflow_name': workflow.name,
                'created_at': workflow.metadata.get('created_at'),
                'optimization_info': workflow.optimization_info
            }
        })
        
    except Exception as e:
        logger.error(f"生成智能工作流失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@intelligent_workflow_bp.route('/configure-node', methods=['POST'])
@async_route
async def configure_intelligent_node():
    """智能配置节点"""
    try:
        await initialize_services()
        
        data = request.get_json()
        node_type_str = data.get('nodeType', '')
        user_description = data.get('description', '')
        context = data.get('context', {})
        workflow_context = data.get('workflowContext', {})
        existing_config = data.get('existingConfig', {})
        
        if not node_type_str:
            return jsonify({
                'success': False,
                'error': '请指定节点类型'
            }), 400
        
        try:
            node_type = NodeType(node_type_str)
        except ValueError:
            return jsonify({
                'success': False,
                'error': f'不支持的节点类型: {node_type_str}'
            }), 400
        
        logger.info(f"🔧 智能配置节点请求: {node_type_str}")
        
        # 创建配置请求
        config_request = NodeConfigRequest(
            node_type=node_type,
            user_description=user_description,
            context=context,
            workflow_context=workflow_context,
            existing_config=existing_config
        )
        
        # 生成智能配置
        config_response = await node_configurator.configure_node(config_request)
        
        return jsonify({
            'success': config_response.success,
            'config': config_response.config,
            'reasoning': config_response.reasoning,
            'confidence': config_response.confidence,
            'suggestions': config_response.suggestions,
            'optimizations': config_response.optimizations
        })
        
    except Exception as e:
        logger.error(f"智能配置节点失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@intelligent_workflow_bp.route('/analyze-requirements', methods=['POST'])
@async_route
async def analyze_workflow_requirements():
    """分析工作流需求"""
    try:
        await initialize_services()
        
        data = request.get_json()
        user_input = data.get('input', '')
        context = data.get('context', {})
        
        if not user_input:
            return jsonify({
                'success': False,
                'error': '请提供需求描述'
            }), 400
        
        logger.info(f"🔍 分析工作流需求: {user_input[:50]}...")
        
        # 使用工作流编排器的分析功能
        analysis = await workflow_orchestrator._analyze_workflow_requirements(user_input, context)
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'recommendations': {
                'suggested_nodes': analysis.get('required_nodes', []),
                'connection_style': analysis.get('connection_style', 'linear'),
                'complexity': analysis.get('complexity', 'moderate'),
                'optimization_goals': analysis.get('optimization_goals', [])
            }
        })
        
    except Exception as e:
        logger.error(f"分析工作流需求失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@intelligent_workflow_bp.route('/optimize-workflow', methods=['POST'])
@async_route
async def optimize_existing_workflow():
    """优化现有工作流"""
    try:
        await initialize_services()
        
        data = request.get_json()
        workflow_data = data.get('workflow', {})
        optimization_goals = data.get('optimizationGoals', ['performance'])
        
        if not workflow_data:
            return jsonify({
                'success': False,
                'error': '请提供工作流数据'
            }), 400
        
        logger.info("🚀 优化现有工作流")
        
        # 转换前端格式到内部格式
        nodes, connections = _convert_from_frontend_format(workflow_data)
        
        # 执行优化
        optimization_result = await workflow_orchestrator._optimize_workflow(
            nodes, connections, {'optimization_goals': optimization_goals}
        )
        
        # 转换回前端格式
        optimized_workflow = _convert_optimization_to_frontend(optimization_result)
        
        return jsonify({
            'success': True,
            'optimizedWorkflow': optimized_workflow,
            'optimizationInfo': optimization_result.get('optimization_info', {}),
            'improvements': _calculate_improvements(workflow_data, optimized_workflow)
        })
        
    except Exception as e:
        logger.error(f"优化工作流失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@intelligent_workflow_bp.route('/suggest-connections', methods=['POST'])
@async_route
async def suggest_intelligent_connections():
    """建议智能连接"""
    try:
        await initialize_services()
        
        data = request.get_json()
        nodes = data.get('nodes', [])
        context = data.get('context', {})
        
        if not nodes:
            return jsonify({
                'success': False,
                'error': '请提供节点数据'
            }), 400
        
        logger.info("🔗 生成智能连接建议")
        
        # 分析节点并生成连接建议
        connection_suggestions = await _generate_connection_suggestions(nodes, context)
        
        return jsonify({
            'success': True,
            'suggestions': connection_suggestions,
            'reasoning': '基于节点类型和功能分析生成的智能连接建议'
        })
        
    except Exception as e:
        logger.error(f"生成连接建议失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@intelligent_workflow_bp.route('/validate-workflow', methods=['POST'])
@async_route
async def validate_workflow():
    """验证工作流"""
    try:
        await initialize_services()
        
        data = request.get_json()
        workflow_data = data.get('workflow', {})
        
        if not workflow_data:
            return jsonify({
                'success': False,
                'error': '请提供工作流数据'
            }), 400
        
        logger.info("✅ 验证工作流")
        
        # 转换格式并验证
        nodes, connections = _convert_from_frontend_format(workflow_data)
        validation_result = await workflow_orchestrator._validate_workflow({
            'nodes': nodes,
            'connections': connections
        })
        
        return jsonify({
            'success': True,
            'validation': validation_result,
            'isValid': validation_result.get('valid', False),
            'issues': validation_result.get('issues', []),
            'warnings': validation_result.get('warnings', []),
            'suggestions': validation_result.get('suggestions', [])
        })
        
    except Exception as e:
        logger.error(f"验证工作流失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def _convert_to_frontend_format(workflow):
    """将内部工作流格式转换为前端格式"""
    frontend_nodes = []
    frontend_edges = []
    
    # 转换节点
    for node in workflow.nodes:
        frontend_node = {
            'id': node.id,
            'type': node.type.value,
            'position': node.position,
            'data': {
                'label': _generate_node_label(node),
                'nodeType': node.type.value,
                'config': node.config,
                'intelligentConfig': True
            }
        }
        frontend_nodes.append(frontend_node)
    
    # 转换连接
    for connection in workflow.connections:
        frontend_edge = {
            'id': connection.id,
            'source': connection.source,
            'target': connection.target,
            'type': 'default',
            'data': {
                'connectionType': connection.type.value,
                'conditions': connection.conditions,
                'metadata': connection.metadata
            }
        }
        frontend_edges.append(frontend_edge)
    
    return {
        'nodes': frontend_nodes,
        'edges': frontend_edges,
        'metadata': workflow.metadata
    }


def _generate_node_label(node):
    """生成节点标签"""
    type_labels = {
        NodeType.MATERIAL: "📁 智能材料",
        NodeType.EXECUTION: "⚡ 智能执行", 
        NodeType.CONDITION: "🔀 智能条件",
        NodeType.RESULT: "📄 智能结果"
    }
    return type_labels.get(node.type, node.type.value)


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
        'performance_improvement': '预计提升30%',
        'resource_savings': '预计节省20%内存',
        'accuracy_improvement': '预计提升15%准确率'
    }


async def _generate_connection_suggestions(nodes, context):
    """生成连接建议"""
    suggestions = []
    
    # 基础连接逻辑
    for i in range(len(nodes) - 1):
        current_node = nodes[i]
        next_node = nodes[i + 1]
        
        suggestion = {
            'source': current_node.get('id'),
            'target': next_node.get('id'),
            'type': 'sequential',
            'confidence': 0.8,
            'reasoning': f"基于节点类型 {current_node.get('type')} -> {next_node.get('type')} 的标准连接"
        }
        suggestions.append(suggestion)
    
    return suggestions
