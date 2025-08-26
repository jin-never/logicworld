"""
智能大脑核心 - 统一协调接口
整合所有智能模块，提供统一的大脑接口和协调机制
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum
import json
from datetime import datetime

# 导入现有系统组件
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agent_system.agent_factory import AgentFactory
from .mode_manager import mode_manager, ProcessingMode


class LegacyProcessingMode(Enum):
    """旧版处理模式枚举（保持兼容性）"""
    SIMPLE = "simple"           # 简单处理
    SEMANTIC = "semantic"       # 语义理解
    REASONING = "reasoning"     # 复杂推理
    COLLABORATIVE = "collaborative"  # 多代理协作
    ADAPTIVE = "adaptive"       # 自适应学习


class ComplexityLevel(Enum):
    """复杂度级别"""
    LOW = 1      # 简单问答
    MEDIUM = 2   # 需要推理
    HIGH = 3     # 复杂分析
    EXPERT = 4   # 专家级别


@dataclass
class BrainRequest:
    """大脑请求数据结构"""
    input_text: str
    context: Dict[str, Any] = None
    user_id: str = "default"
    session_id: str = "default"
    mode: LegacyProcessingMode = LegacyProcessingMode.SEMANTIC
    complexity: ComplexityLevel = ComplexityLevel.MEDIUM
    metadata: Dict[str, Any] = None


@dataclass
class BrainResponse:
    """大脑响应数据结构"""
    output: str
    confidence: float
    processing_path: List[str]
    reasoning_trace: List[Dict[str, Any]]
    memory_updates: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    timestamp: str


class IntelligentBrain:
    """
    智能大脑核心类
    
    作为整个智能系统的协调中心，负责：
    1. 分析输入复杂度和类型
    2. 选择合适的处理模式和模块
    3. 协调各个智能模块的工作
    4. 整合结果并提供统一输出
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.modules = {}
        self.processing_history = []
        self.is_initialized = False
        
    async def initialize(self):
        """初始化大脑系统"""
        if self.is_initialized:
            return
            
        self.logger.info("🧠 [IntelligentBrain] 开始初始化智能大脑系统...")
        
        try:
            # 延迟导入避免循环依赖
            from .semantic_understanding import SemanticUnderstandingModule
            from .reasoning_engine import ComplexReasoningEngine
            from .memory_system import IntelligentMemorySystem
            from .multi_agent_framework import MultiAgentFramework
            from .adaptive_learning import AdaptiveLearningSystem
            from .ai_integration import IntelligentAIIntegration

            # 初始化各个模块
            self.modules['semantic'] = SemanticUnderstandingModule()
            self.modules['reasoning'] = ComplexReasoningEngine()
            self.modules['memory'] = IntelligentMemorySystem()
            self.modules['agents'] = MultiAgentFramework()
            self.modules['learning'] = AdaptiveLearningSystem()
            self.modules['ai'] = IntelligentAIIntegration()
            
            # 初始化各模块
            for name, module in self.modules.items():
                await module.initialize()
                self.logger.info(f"✅ [IntelligentBrain] {name} 模块初始化完成")
                
            self.is_initialized = True
            self.logger.info("🎉 [IntelligentBrain] 智能大脑系统初始化完成")
            
        except Exception as e:
            self.logger.error(f"❌ [IntelligentBrain] 初始化失败: {e}")
            raise
    
    async def process(self, request: Union[str, BrainRequest], user_preferred_mode: str = None) -> BrainResponse:
        """
        处理输入请求的主入口（支持智能模式检测）

        Args:
            request: 输入请求（字符串或BrainRequest对象）
            user_preferred_mode: 用户指定的处理模式 (daily/professional)

        Returns:
            BrainResponse: 处理结果
        """
        if not self.is_initialized:
            await self.initialize()

        # 标准化请求格式
        if isinstance(request, str):
            request = BrainRequest(input_text=request)

        # 添加用户指定模式到上下文
        if user_preferred_mode:
            if not hasattr(request, 'context') or request.context is None:
                request.context = {}
            request.context["user_preferred_mode"] = user_preferred_mode

        # 保存当前请求文本供AI模块使用
        self._current_request_text = request.input_text

        self.logger.info(f"🧠 [IntelligentBrain] 开始处理请求: {request.input_text[:100]}...")

        try:
            # 0. 智能模式检测和选择
            await self._handle_intelligent_mode_selection(request, user_preferred_mode)

            # 1. 分析输入复杂度和类型
            analysis = await self._analyze_input(request)

            # 2. 选择处理策略
            strategy = await self._select_strategy(request, analysis)

            # 3. 执行处理流程
            result = await self._execute_strategy(request, strategy, analysis)

            # 4. 后处理和学习
            response = await self._post_process(request, result, strategy)

            # 5. 记录处理历史
            self.processing_history.append({
                'request': request,
                'response': response,
                'timestamp': datetime.now().isoformat()
            })

            return response

        except Exception as e:
            self.logger.error(f"❌ [IntelligentBrain] 处理失败: {e}")
            return BrainResponse(
                output=f"处理失败: {str(e)}",
                confidence=0.0,
                processing_path=["error"],
                reasoning_trace=[{"error": str(e)}],
                memory_updates=[],
                metadata={"error": True},
                timestamp=datetime.now().isoformat()
            )

    async def _handle_intelligent_mode_selection(self, request: BrainRequest, user_preferred_mode: str = None):
        """处理智能模式检测和选择"""

        try:
            # 如果有AI模块，使用智能模式检测
            if 'ai' in self.modules:
                ai_module = self.modules['ai']

                # 检测最佳处理模式
                if user_preferred_mode:
                    # 用户指定模式
                    processing_mode = user_preferred_mode
                    mode_confidence = 1.0
                    mode_reasoning = "用户指定模式"
                    detection_id = None
                    self.logger.info(f"👤 [IntelligentBrain] 用户指定模式: {processing_mode}")
                else:
                    # 自动检测模式
                    try:
                        # 使用AI集成系统的模式检测服务
                        if hasattr(ai_module, 'mode_detection_service') and ai_module.mode_detection_service:
                            # 确定检测模式：用户指定 > 自动检测
                            detection_mode = user_preferred_mode if user_preferred_mode else "auto"

                            mode_result = await ai_module.mode_detection_service.detect_user_mode(
                                request.input_text,
                                getattr(request, 'context', {}),
                                user_mode_preference=detection_mode
                            )

                            if mode_result["success"]:
                                processing_mode = mode_result["mode"]
                                mode_confidence = mode_result["confidence"]
                                mode_reasoning = mode_result["reasoning"]
                                detection_id = mode_result["detection_id"]
                                self.logger.info(f"🎯 [IntelligentBrain] 检测到模式: {processing_mode} (置信度: {mode_confidence:.2f})")
                            else:
                                processing_mode = "daily"
                                mode_confidence = 0.5
                                mode_reasoning = "检测失败，使用默认模式"
                                detection_id = None
                                self.logger.warning(f"⚠️ [IntelligentBrain] 模式检测失败，使用默认模式")
                        else:
                            processing_mode = "daily"
                            mode_confidence = 0.5
                            mode_reasoning = "模式检测服务未启用"
                            detection_id = None
                    except Exception as e:
                        processing_mode = "daily"
                        mode_confidence = 0.5
                        mode_reasoning = f"检测异常: {str(e)}"
                        detection_id = None
                        self.logger.warning(f"⚠️ [IntelligentBrain] 模式检测异常: {e}")

                # 将模式信息添加到请求上下文
                if not hasattr(request, 'context') or request.context is None:
                    request.context = {}

                request.context.update({
                    "processing_mode": processing_mode,
                    "mode_confidence": mode_confidence,
                    "mode_reasoning": mode_reasoning,
                    "detection_id": detection_id
                })

                # 根据检测模式调整系统行为
                if processing_mode == "professional":
                    # 专业模式：更严格、更详细的处理
                    self.logger.info("🎓 [IntelligentBrain] 启用专业模式处理")
                else:
                    # 日常模式：更轻松、更实用的处理
                    self.logger.info("📋 [IntelligentBrain] 启用日常模式处理")

            else:
                # 没有AI模块，使用传统模式选择
                suggested_mode = mode_manager.auto_select_mode(
                    request.input_text,
                    getattr(request, 'context', {})
                )

                if suggested_mode != mode_manager.get_current_mode():
                    mode_manager.switch_mode(suggested_mode)
                    self.logger.info(f"🔄 [IntelligentBrain] 自动切换到{suggested_mode.value}模式")

        except Exception as e:
            self.logger.error(f"❌ [IntelligentBrain] 模式选择失败: {e}")
            # 使用默认模式
            if not hasattr(request, 'context') or request.context is None:
                request.context = {}
            request.context.update({
                "processing_mode": "daily",
                "mode_confidence": 0.5,
                "mode_reasoning": f"模式选择失败: {str(e)}",
                "detection_id": None
            })

    async def _analyze_input(self, request: BrainRequest) -> Dict[str, Any]:
        """分析输入的复杂度、类型和意图"""
        self.logger.info("🔍 [IntelligentBrain] 分析输入...")
        
        # 使用语义理解模块进行初步分析
        semantic_analysis = await self.modules['semantic'].analyze_input(request.input_text)
        
        # 复杂度评估
        complexity = await self._assess_complexity(request.input_text, semantic_analysis)
        
        # 意图识别
        intent = await self._identify_intent(request.input_text, semantic_analysis)
        
        return {
            'semantic_analysis': semantic_analysis,
            'complexity': complexity.value,  # 使用枚举的值而不是枚举对象
            'complexity_name': complexity.name,  # 添加枚举名称
            'intent': intent,
            'requires_reasoning': complexity.value >= ComplexityLevel.MEDIUM.value,
            'requires_collaboration': complexity.value >= ComplexityLevel.HIGH.value,
            'requires_memory': True  # 总是需要记忆系统
        }
    
    async def _select_strategy(self, request: BrainRequest, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """根据分析结果和当前模式选择处理策略"""
        self.logger.info("🎯 [IntelligentBrain] 选择处理策略...")

        # 获取当前模式配置
        mode_config = mode_manager.get_current_config()
        current_mode = mode_manager.get_current_mode()

        strategy = {
            'mode': current_mode.value,
            'modules': ['semantic', 'memory', 'ai'],  # 基础模块
            'parallel_processing': False,
            'reasoning_depth': 1,
            'ai_params': mode_manager.get_ai_params()
        }

        # 根据模式配置调整策略
        if mode_config.use_complex_reasoning and analysis['requires_reasoning']:
            strategy['modules'].append('reasoning')
            strategy['reasoning_depth'] = analysis['complexity'].value

        if mode_config.use_multi_agent and analysis['requires_collaboration']:
            strategy['modules'].append('agents')
            strategy['parallel_processing'] = True

        if mode_config.use_langgraph and analysis['complexity'] >= ComplexityLevel.HIGH.value:
            strategy['use_langgraph'] = True

        # 总是包含学习模块
        strategy['modules'].append('learning')

        self.logger.info(f"🎯 [IntelligentBrain] 策略配置: {current_mode.value}模式, 模块: {strategy['modules']}")

        return strategy
    
    async def _execute_strategy(self, request: BrainRequest, strategy: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """执行选定的处理策略"""
        self.logger.info(f"⚡ [IntelligentBrain] 执行策略: {strategy['modules']}")
        
        results = {}
        processing_path = []
        
        # 顺序处理基础模块
        for module_name in ['semantic', 'memory']:
            if module_name in strategy['modules']:
                module_result = await self.modules[module_name].process(request, analysis, results)
                results[module_name] = module_result
                processing_path.append(module_name)

        # 处理AI模块（在推理之前）
        if 'ai' in strategy['modules']:
            # 构建增强的上下文，包含模式检测信息
            ai_context = {
                'semantic_analysis': results.get('semantic', {}),
                'memory_context': results.get('memory', {}),
                'user_id': getattr(request, 'user_id', 'anonymous'),
                'session_id': getattr(request, 'session_id', 'default')
            }

            # 添加模式检测信息到AI上下文
            if hasattr(request, 'context') and request.context:
                ai_context.update({
                    'processing_mode': request.context.get('processing_mode', 'daily'),
                    'mode_confidence': request.context.get('mode_confidence', 0.5),
                    'mode_reasoning': request.context.get('mode_reasoning', ''),
                    'detection_id': request.context.get('detection_id')
                })

            # 获取用户指定的模式
            user_preferred_mode = None
            if hasattr(request, 'context') and request.context:
                user_preferred_mode = request.context.get('user_preferred_mode')

            ai_result = await self.modules['ai'].generate_intelligent_response(
                user_input=request.input_text,
                context=ai_context,
                response_type="conversational",
                user_preferred_mode=user_preferred_mode
            )
            results['ai'] = {
                'output': ai_result.content,
                'confidence': ai_result.confidence,
                'metadata': ai_result.metadata
            }
            processing_path.append('ai')
        
        # 处理推理模块
        if 'reasoning' in strategy['modules']:
            reasoning_result = await self.modules['reasoning'].process(
                request, analysis, results, depth=strategy['reasoning_depth']
            )
            results['reasoning'] = reasoning_result
            processing_path.append('reasoning')
        
        # 处理多代理协作
        if 'agents' in strategy['modules']:
            agent_result = await self.modules['agents'].process(request, analysis, results)
            results['agents'] = agent_result
            processing_path.append('agents')
        
        # 学习模块（总是最后执行）
        learning_result = await self.modules['learning'].process(request, analysis, results)
        results['learning'] = learning_result
        processing_path.append('learning')
        
        return {
            'results': results,
            'processing_path': processing_path,
            'strategy': strategy
        }
    
    async def _post_process(self, request: BrainRequest, execution_result: Dict[str, Any], strategy: Dict[str, Any]) -> BrainResponse:
        """后处理和结果整合"""
        self.logger.info("🔧 [IntelligentBrain] 后处理和结果整合...")
        
        results = execution_result['results']
        
        # 整合各模块的输出
        final_output = await self._integrate_outputs(results)
        
        # 计算置信度
        confidence = await self._calculate_confidence(results)
        
        # 收集推理轨迹
        reasoning_trace = []
        for module_name, result in results.items():
            if 'reasoning_trace' in result:
                reasoning_trace.extend(result['reasoning_trace'])
        
        # 收集记忆更新
        memory_updates = []
        if 'memory' in results and 'updates' in results['memory']:
            memory_updates = results['memory']['updates']
        
        return BrainResponse(
            output=final_output,
            confidence=confidence,
            processing_path=execution_result['processing_path'],
            reasoning_trace=reasoning_trace,
            memory_updates=memory_updates,
            metadata={
                'strategy': strategy,
                'module_results': {k: v.get('metadata', {}) for k, v in results.items()}
            },
            timestamp=datetime.now().isoformat()
        )
    
    async def _assess_complexity(self, text: str, semantic_analysis: Dict[str, Any]) -> ComplexityLevel:
        """评估输入的复杂度"""
        # 简单的复杂度评估逻辑
        factors = 0
        
        # 文本长度因子
        if len(text) > 200:
            factors += 1
        if len(text) > 500:
            factors += 1
            
        # 语义复杂度因子
        if semantic_analysis.get('entities_count', 0) > 3:
            factors += 1
        if semantic_analysis.get('sentiment_complexity', 0) > 0.5:
            factors += 1
        if semantic_analysis.get('requires_reasoning', False):
            factors += 2
            
        # 映射到复杂度级别
        if factors <= 1:
            return ComplexityLevel.LOW
        elif factors <= 3:
            return ComplexityLevel.MEDIUM
        elif factors <= 5:
            return ComplexityLevel.HIGH
        else:
            return ComplexityLevel.EXPERT
    
    async def _identify_intent(self, text: str, semantic_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """识别用户意图"""
        # 使用现有的意图识别系统
        try:
            # 这里可以集成现有的意图识别逻辑
            return {
                'primary_intent': semantic_analysis.get('intent', 'unknown'),
                'confidence': semantic_analysis.get('intent_confidence', 0.5),
                'secondary_intents': semantic_analysis.get('secondary_intents', [])
            }
        except Exception as e:
            self.logger.warning(f"意图识别失败: {e}")
            return {'primary_intent': 'unknown', 'confidence': 0.0, 'secondary_intents': []}
    
    async def _integrate_outputs(self, results: Dict[str, Any]) -> str:
        """整合各模块的输出"""
        try:
            # 如果有AI模块，使用AI生成智能响应
            if 'ai' in self.modules:
                # 收集所有分析结果作为上下文
                context = {
                    'semantic_analysis': results.get('semantic', {}),
                    'reasoning_result': results.get('reasoning', {}),
                    'memory_context': results.get('memory', {}),
                    'agent_insights': results.get('agents', {})
                }

                # 确定响应类型
                response_type = "conversational"
                if results.get('semantic', {}).get('intent_analysis', {}).get('primary_intent') == 'question':
                    response_type = "analytical"
                elif results.get('reasoning', {}).get('complexity_score', 0) > 0.7:
                    response_type = "technical"

                # 使用AI生成智能响应
                ai_response = await self.modules['ai'].generate_intelligent_response(
                    user_input=getattr(self, '_current_request_text', ''),
                    context=context,
                    response_type=response_type
                )

                if ai_response.confidence > 0.5:
                    return ai_response.content

            # 备用方案：使用传统优先级（AI优先）
            if 'ai' in results and results['ai'].get('output'):
                return results['ai']['output']
            elif 'agents' in results and results['agents'].get('output'):
                return results['agents']['output']
            elif 'reasoning' in results and results['reasoning'].get('output'):
                return results['reasoning']['output']
            elif 'semantic' in results and results['semantic'].get('output'):
                return results['semantic']['output']
            else:
                return "我理解了您的需求，正在为您提供最合适的回答。"

        except Exception as e:
            self.logger.error(f"❌ [IntelligentBrain] 输出整合失败: {e}")
            return "我理解了您的需求，让我为您提供帮助。"
    
    async def _calculate_confidence(self, results: Dict[str, Any]) -> float:
        """计算整体置信度"""
        confidences = []
        for result in results.values():
            if 'confidence' in result:
                confidences.append(result['confidence'])
        
        if not confidences:
            return 0.5
        
        # 使用加权平均
        return sum(confidences) / len(confidences)
    
    def get_status(self) -> Dict[str, Any]:
        """获取大脑系统状态"""
        return {
            'initialized': self.is_initialized,
            'modules': list(self.modules.keys()),
            'processing_history_count': len(self.processing_history),
            'last_processed': self.processing_history[-1]['timestamp'] if self.processing_history else None
        }

    async def record_mode_feedback(self, detection_id: str, user_choice: str, satisfaction: int = None, comments: str = None) -> bool:
        """记录用户对模式选择的反馈"""

        try:
            if 'ai' in self.modules:
                ai_module = self.modules['ai']
                return await ai_module.record_mode_feedback(detection_id, user_choice, satisfaction, comments)
            return False
        except Exception as e:
            self.logger.warning(f"⚠️ [IntelligentBrain] 记录模式反馈失败: {e}")
            return False

    async def get_mode_detection_stats(self) -> Dict[str, Any]:
        """获取模式检测统计信息"""

        try:
            if 'ai' in self.modules:
                ai_module = self.modules['ai']
                return await ai_module.get_mode_detection_stats()
            return {"enabled": False}
        except Exception as e:
            self.logger.warning(f"⚠️ [IntelligentBrain] 获取模式检测统计失败: {e}")
            return {"enabled": False, "error": str(e)}

    def toggle_mode_detection(self, enabled: bool) -> None:
        """启用或禁用模式检测"""

        try:
            if 'ai' in self.modules:
                ai_module = self.modules['ai']
                ai_module.toggle_mode_detection(enabled)
                self.logger.info(f"🎯 [IntelligentBrain] 模式检测已{'启用' if enabled else '禁用'}")
        except Exception as e:
            self.logger.warning(f"⚠️ [IntelligentBrain] 切换模式检测状态失败: {e}")

    async def get_supported_modes(self) -> Dict[str, Any]:
        """获取支持的模式列表"""

        try:
            if 'ai' in self.modules:
                ai_module = self.modules['ai']
                return await ai_module.get_supported_modes()
            return {"enabled": False}
        except Exception as e:
            self.logger.warning(f"⚠️ [IntelligentBrain] 获取支持模式失败: {e}")
            return {"enabled": False, "error": str(e)}

    async def get_mode_info(self, mode: str) -> Dict[str, Any]:
        """获取特定模式的信息"""

        try:
            if 'ai' in self.modules:
                ai_module = self.modules['ai']
                return await ai_module.get_mode_info(mode)
            return {"enabled": False}
        except Exception as e:
            self.logger.warning(f"⚠️ [IntelligentBrain] 获取模式信息失败: {e}")
            return {"enabled": False, "error": str(e)}

    async def is_mode_enabled(self, mode: str) -> bool:
        """检查模式是否启用"""

        try:
            if 'ai' in self.modules:
                ai_module = self.modules['ai']
                return await ai_module.is_mode_enabled(mode)
            return False
        except Exception as e:
            self.logger.warning(f"⚠️ [IntelligentBrain] 检查模式状态失败: {e}")
            return False

    def get_processing_history(self) -> List[Dict[str, Any]]:
        """获取处理历史"""
        return self.processing_history.copy()
