"""
AI智能节点配置器
为四个核心节点提供智能化配置和优化功能
"""
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from ai.brain_system.brain_core import IntelligentBrain
from ai.brain_system.ai_integration import IntelligentAIIntegration


class NodeType(Enum):
    """节点类型"""
    MATERIAL = "material-node"
    EXECUTION = "execution-node"
    CONDITION = "condition-node"
    RESULT = "result-node"


@dataclass
class NodeConfigRequest:
    """节点配置请求"""
    node_type: NodeType
    user_description: str
    context: Dict[str, Any]
    workflow_context: Dict[str, Any]
    existing_config: Dict[str, Any] = None


@dataclass
class NodeConfigResponse:
    """节点配置响应"""
    success: bool
    config: Dict[str, Any]
    reasoning: str
    confidence: float
    suggestions: List[str]
    optimizations: List[Dict[str, Any]]


class IntelligentNodeConfigurator:
    """智能节点配置器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.brain = None
        self.ai_integration = None
        
        # 节点配置模板
        self.node_templates = {
            NodeType.MATERIAL: {
                "default_config": {
                    "auto_detection": True,
                    "supported_formats": ["txt", "pdf", "docx", "xlsx", "csv", "json", "xml"],
                    "preprocessing": {
                        "auto_extract": True,
                        "format_conversion": True,
                        "quality_check": True
                    },
                    "organization": {
                        "auto_categorize": True,
                        "duplicate_detection": True,
                        "version_control": True
                    }
                },
                "intelligence_features": [
                    "auto_type_detection",
                    "content_analysis", 
                    "dependency_mapping",
                    "quality_assessment",
                    "preprocessing_suggestions"
                ]
            },
            NodeType.EXECUTION: {
                "default_config": {
                    "execution_type": "ai-task",  # 默认为AI任务执行
                    "ai_model": "deepseek",  # 默认使用DeepSeek模型
                    "auto_tool_selection": True,
                    "parameter_optimization": True,
                    "error_handling": {
                        "auto_retry": True,
                        "fallback_strategies": True,
                        "error_recovery": True
                    },
                    "performance": {
                        "parallel_execution": True,
                        "resource_optimization": True,
                        "progress_tracking": True
                    }
                },
                "intelligence_features": [
                    "task_decomposition",
                    "tool_auto_selection",
                    "parameter_intelligence",
                    "execution_optimization",
                    "performance_prediction"
                ]
            },
            NodeType.CONDITION: {
                "default_config": {
                    "condition_type": "intelligent",
                    "auto_logic_generation": True,
                    "dynamic_evaluation": True,
                    "learning": {
                        "user_preference_learning": True,
                        "pattern_recognition": True,
                        "decision_optimization": True
                    },
                    "validation": {
                        "logic_verification": True,
                        "edge_case_handling": True,
                        "consistency_check": True
                    }
                },
                "intelligence_features": [
                    "logical_reasoning",
                    "dynamic_branching",
                    "quality_checking",
                    "preference_learning",
                    "intelligent_fallback"
                ]
            },
            NodeType.RESULT: {
                "default_config": {
                    "output_optimization": True,
                    "format_intelligence": True,
                    "quality_enhancement": True,
                    "distribution": {
                        "auto_format_selection": True,
                        "multi_version_generation": True,
                        "compatibility_check": True
                    },
                    "post_processing": {
                        "auto_enhancement": True,
                        "metadata_generation": True,
                        "version_management": True
                    }
                },
                "intelligence_features": [
                    "format_intelligence",
                    "quality_optimization",
                    "multi_version_management",
                    "distribution_strategy",
                    "post_processing_automation"
                ]
            }
        }
    
    async def initialize(self):
        """初始化配置器"""
        try:
            self.brain = IntelligentBrain()
            await self.brain.initialize()
            
            self.ai_integration = IntelligentAIIntegration()
            await self.ai_integration.initialize()
            
            self.logger.info("🤖 智能节点配置器初始化完成")
            
        except Exception as e:
            self.logger.error(f"智能节点配置器初始化失败: {e}")
            raise
    
    async def configure_node(self, request: NodeConfigRequest) -> NodeConfigResponse:
        """智能配置节点"""
        if not self.brain:
            await self.initialize()
        
        self.logger.info(f"🔧 开始智能配置 {request.node_type.value} 节点")
        
        try:
            # 1. 分析用户需求和上下文
            analysis = await self._analyze_node_requirements(request)
            
            # 2. 生成智能配置
            config = await self._generate_intelligent_config(request, analysis)
            
            # 3. 优化配置
            optimized_config = await self._optimize_config(config, request, analysis)
            
            # 4. 验证配置
            validation_result = await self._validate_config(optimized_config, request)
            
            # 5. 生成建议和优化方案
            suggestions = await self._generate_suggestions(optimized_config, request, analysis)
            optimizations = await self._generate_optimizations(optimized_config, request, analysis)
            
            return NodeConfigResponse(
                success=True,
                config=optimized_config,
                reasoning=analysis.get('reasoning', ''),
                confidence=validation_result.get('confidence', 0.8),
                suggestions=suggestions,
                optimizations=optimizations
            )
            
        except Exception as e:
            self.logger.error(f"节点配置失败: {e}")
            return NodeConfigResponse(
                success=False,
                config=self._get_fallback_config(request.node_type),
                reasoning=f"配置失败，使用默认配置: {str(e)}",
                confidence=0.3,
                suggestions=[],
                optimizations=[]
            )
    
    async def _analyze_node_requirements(self, request: NodeConfigRequest) -> Dict[str, Any]:
        """分析节点需求"""
        analysis_prompt = f"""
        分析以下节点配置需求：
        
        节点类型: {request.node_type.value}
        用户描述: {request.user_description}
        上下文信息: {json.dumps(request.context, ensure_ascii=False, indent=2)}
        工作流上下文: {json.dumps(request.workflow_context, ensure_ascii=False, indent=2)}
        
        请分析并返回JSON格式的结果，包含：
        1. requirements: 具体需求列表
        2. constraints: 约束条件
        3. optimization_goals: 优化目标
        4. intelligence_level: 所需智能化程度 (basic/intermediate/advanced)
        5. reasoning: 分析推理过程
        6. recommended_features: 推荐的智能化功能
        """
        
        try:
            response = await self.ai_integration.generate_intelligent_response(
                user_input=analysis_prompt,
                context=request.context,
                response_type="analytical"
            )
            
            # 尝试解析JSON响应
            if hasattr(response, 'content'):
                analysis_text = response.content
            else:
                analysis_text = str(response)
            
            # 提取JSON部分
            json_start = analysis_text.find('{')
            json_end = analysis_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                analysis = json.loads(analysis_text[json_start:json_end])
            else:
                # 如果无法解析JSON，使用规则基础分析
                analysis = await self._rule_based_analysis(request)
            
            return analysis
            
        except Exception as e:
            self.logger.warning(f"AI分析失败，使用规则基础分析: {e}")
            return await self._rule_based_analysis(request)
    
    async def _rule_based_analysis(self, request: NodeConfigRequest) -> Dict[str, Any]:
        """基于规则的分析（备用方案）"""
        node_type = request.node_type
        description = request.user_description.lower()
        
        # 基础分析逻辑
        requirements = []
        constraints = []
        optimization_goals = []
        intelligence_level = "intermediate"
        
        if node_type == NodeType.MATERIAL:
            if any(word in description for word in ['文件', '文档', '图片', '数据']):
                requirements.extend(['文件处理', '格式识别', '内容提取'])
            if any(word in description for word in ['批量', '大量', '多个']):
                optimization_goals.append('批量处理优化')
                intelligence_level = "advanced"
        
        elif node_type == NodeType.EXECUTION:
            if any(word in description for word in ['AI', '智能', '自动']):
                requirements.extend(['AI任务执行', '智能参数配置'])
                intelligence_level = "advanced"
            if any(word in description for word in ['工具', '调用', 'API']):
                requirements.extend(['工具调用', 'API集成'])
        
        elif node_type == NodeType.CONDITION:
            if any(word in description for word in ['判断', '条件', '分支']):
                requirements.extend(['逻辑判断', '条件评估'])
            if any(word in description for word in ['复杂', '多条件']):
                intelligence_level = "advanced"
        
        elif node_type == NodeType.RESULT:
            if any(word in description for word in ['报告', '文档', '输出']):
                requirements.extend(['格式化输出', '质量优化'])
            if any(word in description for word in ['多种', '格式', '版本']):
                optimization_goals.append('多格式支持')
        
        return {
            'requirements': requirements,
            'constraints': constraints,
            'optimization_goals': optimization_goals,
            'intelligence_level': intelligence_level,
            'reasoning': f'基于关键词分析 {node_type.value} 节点需求',
            'recommended_features': self.node_templates[node_type]['intelligence_features']
        }

    async def _generate_intelligent_config(self, request: NodeConfigRequest, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """生成智能配置"""
        base_config = self.node_templates[request.node_type]['default_config'].copy()

        # 根据分析结果调整配置
        intelligence_level = analysis.get('intelligence_level', 'intermediate')
        requirements = analysis.get('requirements', [])

        if request.node_type == NodeType.MATERIAL:
            config = await self._configure_material_node(base_config, requirements, analysis)
        elif request.node_type == NodeType.EXECUTION:
            config = await self._configure_execution_node(base_config, requirements, analysis)
        elif request.node_type == NodeType.CONDITION:
            config = await self._configure_condition_node(base_config, requirements, analysis)
        elif request.node_type == NodeType.RESULT:
            config = await self._configure_result_node(base_config, requirements, analysis)
        else:
            config = base_config

        # 应用智能化级别调整
        config = self._apply_intelligence_level(config, intelligence_level)

        return config

    async def _configure_material_node(self, base_config: Dict[str, Any],
                                     requirements: List[str],
                                     analysis: Dict[str, Any]) -> Dict[str, Any]:
        """配置材料节点"""
        config = base_config.copy()

        # 根据需求调整配置
        if '文件处理' in requirements:
            config['preprocessing']['auto_extract'] = True
            config['preprocessing']['format_conversion'] = True

        if '批量处理优化' in analysis.get('optimization_goals', []):
            config['batch_processing'] = {
                'enabled': True,
                'parallel_processing': True,
                'chunk_size': 'auto'
            }

        # 智能文件类型检测
        config['intelligence'] = {
            'auto_type_detection': True,
            'content_analysis': True,
            'dependency_mapping': True,
            'quality_assessment': True
        }

        return config

    async def _configure_execution_node(self, base_config: Dict[str, Any],
                                       requirements: List[str],
                                       analysis: Dict[str, Any]) -> Dict[str, Any]:
        """配置执行节点"""
        config = base_config.copy()

        # 根据需求调整执行类型
        if 'AI任务执行' in requirements:
            config['execution_type'] = 'ai-execution'
            config['ai_config'] = {
                'model_selection': 'auto',
                'parameter_optimization': True,
                'context_awareness': True
            }

        if '工具调用' in requirements:
            config['tool_integration'] = {
                'auto_tool_selection': True,
                'parameter_mapping': True,
                'error_handling': True
            }

        # 智能任务分解
        config['intelligence'] = {
            'task_decomposition': True,
            'execution_optimization': True,
            'performance_prediction': True,
            'adaptive_retry': True
        }

        return config

    async def _configure_condition_node(self, base_config: Dict[str, Any],
                                       requirements: List[str],
                                       analysis: Dict[str, Any]) -> Dict[str, Any]:
        """配置条件节点"""
        config = base_config.copy()

        # 智能逻辑生成
        if '逻辑判断' in requirements:
            config['logic_generation'] = {
                'auto_condition_creation': True,
                'natural_language_input': True,
                'logic_optimization': True
            }

        # 动态分支
        config['intelligence'] = {
            'logical_reasoning': True,
            'dynamic_branching': True,
            'quality_checking': True,
            'preference_learning': True
        }

        return config

    async def _configure_result_node(self, base_config: Dict[str, Any],
                                    requirements: List[str],
                                    analysis: Dict[str, Any]) -> Dict[str, Any]:
        """配置结果节点"""
        config = base_config.copy()

        # 格式化输出
        if '格式化输出' in requirements:
            config['output_formatting'] = {
                'auto_format_selection': True,
                'template_generation': True,
                'quality_enhancement': True
            }

        # 多格式支持
        if '多格式支持' in analysis.get('optimization_goals', []):
            config['multi_format'] = {
                'enabled': True,
                'formats': ['pdf', 'docx', 'html', 'json', 'csv'],
                'auto_conversion': True
            }

        # 智能优化
        config['intelligence'] = {
            'format_intelligence': True,
            'quality_optimization': True,
            'distribution_strategy': True,
            'metadata_generation': True
        }

        return config

    def _apply_intelligence_level(self, config: Dict[str, Any], level: str) -> Dict[str, Any]:
        """应用智能化级别"""
        if level == 'basic':
            # 基础级别：关闭高级功能
            if 'intelligence' in config:
                for key in config['intelligence']:
                    if key in ['advanced_reasoning', 'deep_learning', 'complex_optimization']:
                        config['intelligence'][key] = False

        elif level == 'advanced':
            # 高级级别：启用所有智能功能
            if 'intelligence' not in config:
                config['intelligence'] = {}

            config['intelligence'].update({
                'advanced_reasoning': True,
                'deep_learning': True,
                'complex_optimization': True,
                'predictive_analysis': True,
                'adaptive_behavior': True
            })

        return config

    async def _optimize_config(self, config: Dict[str, Any],
                              request: NodeConfigRequest,
                              analysis: Dict[str, Any]) -> Dict[str, Any]:
        """优化配置"""
        optimized_config = config.copy()

        # 性能优化
        if 'performance' not in optimized_config:
            optimized_config['performance'] = {}

        optimized_config['performance'].update({
            'caching': True,
            'lazy_loading': True,
            'resource_management': True
        })

        # 根据工作流上下文优化
        workflow_context = request.workflow_context
        if workflow_context.get('high_volume', False):
            optimized_config['performance']['parallel_processing'] = True
            optimized_config['performance']['batch_optimization'] = True

        return optimized_config

    async def _validate_config(self, config: Dict[str, Any],
                              request: NodeConfigRequest) -> Dict[str, Any]:
        """验证配置"""
        validation_result = {
            'valid': True,
            'confidence': 0.8,
            'issues': [],
            'warnings': []
        }

        # 基础验证
        required_fields = ['intelligence']
        for field in required_fields:
            if field not in config:
                validation_result['issues'].append(f'缺少必需字段: {field}')
                validation_result['valid'] = False

        # 节点特定验证
        if request.node_type == NodeType.EXECUTION:
            if 'execution_type' not in config:
                validation_result['warnings'].append('未指定执行类型，将使用默认值')

        # 计算置信度
        if validation_result['issues']:
            validation_result['confidence'] *= 0.5
        if validation_result['warnings']:
            validation_result['confidence'] *= 0.9

        return validation_result

    async def _generate_suggestions(self, config: Dict[str, Any],
                                   request: NodeConfigRequest,
                                   analysis: Dict[str, Any]) -> List[str]:
        """生成建议"""
        suggestions = []

        # 基于节点类型的建议
        if request.node_type == NodeType.MATERIAL:
            suggestions.append("建议启用自动文件类型检测以提高处理效率")
            if not config.get('preprocessing', {}).get('quality_check'):
                suggestions.append("建议启用质量检查以确保数据完整性")

        elif request.node_type == NodeType.EXECUTION:
            suggestions.append("建议使用AI执行模式以获得更好的任务理解能力")
            if not config.get('error_handling', {}).get('auto_retry'):
                suggestions.append("建议启用自动重试机制以提高执行成功率")

        elif request.node_type == NodeType.CONDITION:
            suggestions.append("建议使用智能逻辑生成以简化条件配置")
            suggestions.append("启用用户偏好学习可以提高决策准确性")

        elif request.node_type == NodeType.RESULT:
            suggestions.append("建议启用多格式输出以满足不同需求")
            suggestions.append("自动质量优化可以提升输出效果")

        return suggestions

    async def _generate_optimizations(self, config: Dict[str, Any],
                                     request: NodeConfigRequest,
                                     analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """生成优化方案"""
        optimizations = []

        # 性能优化
        optimizations.append({
            'type': 'performance',
            'title': '性能优化',
            'description': '启用并行处理和缓存机制',
            'impact': 'high',
            'config_changes': {
                'performance.parallel_processing': True,
                'performance.caching': True
            }
        })

        # 智能化优化
        optimizations.append({
            'type': 'intelligence',
            'title': '智能化增强',
            'description': '启用高级AI功能和自适应行为',
            'impact': 'medium',
            'config_changes': {
                'intelligence.advanced_reasoning': True,
                'intelligence.adaptive_behavior': True
            }
        })

        return optimizations

    def _get_fallback_config(self, node_type: NodeType) -> Dict[str, Any]:
        """获取备用配置"""
        return self.node_templates[node_type]['default_config'].copy()
