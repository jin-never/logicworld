"""
复杂推理引擎
基于LangGraph扩展TOT引擎，实现因果推理、类比推理、逻辑推理等复杂推理能力
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import json
from datetime import datetime

# 导入现有系统组件
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agent_system.agent_factory import AgentFactory
# TOTEngine已删除，使用简化的推理逻辑

# 尝试导入LangGraph
try:
    from langgraph.graph import StateGraph
    from typing import TypedDict
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logging.warning("LangGraph not available, using fallback reasoning")


class ReasoningType(Enum):
    """推理类型枚举"""
    CAUSAL = "causal"           # 因果推理
    ANALOGICAL = "analogical"   # 类比推理
    LOGICAL = "logical"         # 逻辑推理
    ABDUCTIVE = "abductive"     # 溯因推理
    INDUCTIVE = "inductive"     # 归纳推理
    DEDUCTIVE = "deductive"     # 演绎推理
    CREATIVE = "creative"       # 创新推理


class ReasoningDepth(Enum):
    """推理深度"""
    SHALLOW = 1    # 浅层推理
    MEDIUM = 2     # 中等推理
    DEEP = 3       # 深度推理
    EXPERT = 4     # 专家级推理


@dataclass
class ReasoningStep:
    """推理步骤"""
    step_id: str
    reasoning_type: ReasoningType
    premise: str
    conclusion: str
    confidence: float
    evidence: List[str]
    timestamp: str


@dataclass
class ReasoningChain:
    """推理链"""
    chain_id: str
    steps: List[ReasoningStep]
    final_conclusion: str
    overall_confidence: float
    reasoning_path: List[str]


class ComplexReasoningEngine:
    """
    复杂推理引擎
    
    实现多种推理模式：
    1. 因果推理：分析原因和结果的关系
    2. 类比推理：基于相似性进行推理
    3. 逻辑推理：基于逻辑规则进行推理
    4. 溯因推理：从结果推导原因
    5. 归纳推理：从特殊到一般
    6. 演绎推理：从一般到特殊
    7. 创新推理：产生新的见解和解决方案
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.is_initialized = False
        self.reasoning_history = []
        self.knowledge_base = {}
        self.reasoning_patterns = {}
        
    async def initialize(self):
        """初始化推理引擎"""
        if self.is_initialized:
            return
            
        self.logger.info("🧠 [ComplexReasoning] 初始化复杂推理引擎...")
        
        try:
            # 初始化推理模式
            await self._initialize_reasoning_patterns()
            
            # 初始化知识库
            await self._initialize_knowledge_base()
            
            # TOT引擎已删除，使用简化推理
            
            self.is_initialized = True
            self.logger.info("✅ [ComplexReasoning] 复杂推理引擎初始化完成")
            
        except Exception as e:
            self.logger.error(f"❌ [ComplexReasoning] 初始化失败: {e}")
            raise
    
    async def process(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any], depth: int = 2) -> Dict[str, Any]:
        """处理推理请求"""
        if not self.is_initialized:
            await self.initialize()
            
        self.logger.info(f"🧠 [ComplexReasoning] 开始复杂推理，深度: {depth}")
        
        try:
            # 1. 分析推理需求
            reasoning_requirements = await self._analyze_reasoning_requirements(request, analysis)
            
            # 2. 选择推理策略
            reasoning_strategy = await self._select_reasoning_strategy(reasoning_requirements, depth)
            
            # 3. 执行推理
            reasoning_result = await self._execute_reasoning(request, reasoning_strategy, previous_results)
            
            # 4. 验证和优化推理结果
            validated_result = await self._validate_reasoning(reasoning_result, request)
            
            return {
                'output': validated_result['conclusion'],
                'confidence': validated_result['confidence'],
                'reasoning_chain': validated_result['reasoning_chain'],
                'reasoning_trace': validated_result['reasoning_trace'],
                'metadata': {
                    'reasoning_types': reasoning_strategy['types'],
                    'depth': depth,
                    'strategy': reasoning_strategy
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ [ComplexReasoning] 推理失败: {e}")
            return await self._create_fallback_reasoning(request, str(e))
    
    async def _analyze_reasoning_requirements(self, request, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """分析推理需求"""
        self.logger.debug("🔍 [ComplexReasoning] 分析推理需求...")
        
        semantic_analysis = analysis.get('semantic_analysis', {})
        intent = semantic_analysis.get('intent_analysis', {}).get('primary_intent', 'unknown')
        complexity = semantic_analysis.get('complexity_score', 0.5)
        
        requirements = {
            'primary_reasoning_type': await self._determine_primary_reasoning_type(request.input_text, intent),
            'secondary_reasoning_types': await self._determine_secondary_reasoning_types(request.input_text, semantic_analysis),
            'requires_causal_analysis': await self._requires_causal_analysis(request.input_text),
            'requires_analogical_thinking': await self._requires_analogical_thinking(request.input_text),
            'requires_logical_validation': await self._requires_logical_validation(request.input_text),
            'complexity_level': complexity,
            'domain_knowledge_needed': await self._identify_domain_knowledge(request.input_text)
        }
        
        return requirements
    
    async def _select_reasoning_strategy(self, requirements: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """选择推理策略"""
        self.logger.debug("🎯 [ComplexReasoning] 选择推理策略...")
        
        strategy = {
            'types': [requirements['primary_reasoning_type']],
            'depth': depth,
            'parallel_reasoning': False,
            'use_langgraph': LANGGRAPH_AVAILABLE and depth >= 3,
            'use_tot': depth >= 2,
            'validation_steps': []
        }
        
        # 添加次要推理类型
        strategy['types'].extend(requirements['secondary_reasoning_types'])
        
        # 根据复杂度调整策略
        if requirements['complexity_level'] > 0.7:
            strategy['parallel_reasoning'] = True
            strategy['validation_steps'].append('logical_consistency')
            strategy['validation_steps'].append('evidence_support')
        
        # 根据推理类型调整策略
        if requirements['requires_causal_analysis']:
            strategy['validation_steps'].append('causal_validation')
        
        if requirements['requires_analogical_thinking']:
            strategy['validation_steps'].append('analogy_validation')
        
        return strategy

    async def _execute_basic_reasoning(self, request, strategy: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """基础推理实现（备用方案）"""
        self.logger.info("🔧 [ComplexReasoning] 使用基础推理模式...")

        try:
            # 获取语义分析结果
            semantic_result = previous_results.get('semantic', {})
            intent = semantic_result.get('intent_analysis', {}).get('primary_intent', 'unknown')
            keywords = semantic_result.get('surface_analysis', {}).get('keywords', [])

            # 基于意图进行推理
            reasoning_chain = []
            conclusion = ""

            if intent == 'question':
                reasoning_chain.append("识别为问题类型，需要提供解答")
                if any(word in request.input_text.lower() for word in ['什么是', '什么叫', '定义']):
                    reasoning_chain.append("这是概念定义类问题")
                    conclusion = f"这是关于{', '.join(keywords[:2]) if keywords else '相关概念'}的定义问题。我将为您提供详细的解释和相关背景知识。"
                elif any(word in request.input_text.lower() for word in ['如何', '怎么', '方法']):
                    reasoning_chain.append("这是方法询问类问题")
                    conclusion = f"关于{', '.join(keywords[:2]) if keywords else '这个问题'}，我建议采用系统性的方法来解决。首先需要分析具体需求，然后制定详细计划，最后逐步实施。"
                elif any(word in request.input_text.lower() for word in ['为什么', '原因']):
                    reasoning_chain.append("这是原因分析类问题")
                    conclusion = f"关于{', '.join(keywords[:2]) if keywords else '这个现象'}的原因，需要从多个角度进行分析，包括技术因素、环境因素和人为因素等。"
                else:
                    conclusion = f"这是一个关于{', '.join(keywords[:3]) if keywords else '相关主题'}的问题。让我为您提供全面的分析和解答。"

            elif intent == 'request':
                reasoning_chain.append("识别为请求类型，需要提供帮助")
                conclusion = f"我理解您的请求。针对{', '.join(keywords[:2]) if keywords else '您的需求'}，我将为您提供最合适的解决方案和建议。"

            else:
                reasoning_chain.append("进行通用推理分析")
                conclusion = f"基于您的输入，我分析这涉及到{', '.join(keywords[:3]) if keywords else '多个方面'}。让我为您提供详细的分析和建议。"

            return {
                'output': conclusion,
                'confidence': 0.7,
                'reasoning_chain': reasoning_chain,
                'reasoning_trace': [
                    {
                        'step': i+1,
                        'type': 'basic_reasoning',
                        'content': step,
                        'timestamp': datetime.now().isoformat()
                    } for i, step in enumerate(reasoning_chain)
                ],
                'metadata': {
                    'reasoning_type': 'basic',
                    'intent_based': True,
                    'keywords_used': keywords[:3]
                }
            }

        except Exception as e:
            self.logger.error(f"❌ [ComplexReasoning] 基础推理失败: {e}")
            return {
                'output': "我正在分析您的问题，请稍等片刻。",
                'confidence': 0.3,
                'reasoning_chain': ["基础推理处理"],
                'reasoning_trace': [],
                'metadata': {'error': str(e)}
            }
    
    async def _execute_reasoning(self, request, strategy: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """执行推理"""
        self.logger.info(f"⚡ [ComplexReasoning] 执行推理策略: {strategy['types']}")

        try:
            if strategy['use_langgraph'] and LANGGRAPH_AVAILABLE:
                return await self._execute_langgraph_reasoning(request, strategy, previous_results)
            elif strategy['use_tot']:
                return await self._execute_tot_reasoning(request, strategy, previous_results)
            else:
                return await self._execute_sequential_reasoning(request, strategy, previous_results)
        except Exception as e:
            self.logger.error(f"❌ [ComplexReasoning] 推理执行失败: {e}")
            # 返回基础推理结果
            return await self._execute_basic_reasoning(request, strategy, previous_results)
    
    async def _execute_langgraph_reasoning(self, request, strategy: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """使用LangGraph执行复杂推理"""
        self.logger.info("🔗 [ComplexReasoning] 使用LangGraph执行推理...")
        
        # 构建推理图
        reasoning_graph = await self._build_reasoning_graph(strategy)
        
        # 执行推理图
        initial_state = {
            'input': request.input_text,
            'context': request.context or {},
            'previous_results': previous_results,
            'reasoning_steps': [],
            'current_conclusion': '',
            'confidence': 0.0
        }
        
        try:
            final_state = await reasoning_graph.invoke(initial_state)
            
            return {
                'conclusion': final_state.get('current_conclusion', ''),
                'confidence': final_state.get('confidence', 0.0),
                'reasoning_steps': final_state.get('reasoning_steps', []),
                'reasoning_trace': final_state.get('reasoning_trace', [])
            }
        except Exception as e:
            self.logger.error(f"LangGraph推理失败: {e}")
            return await self._execute_tot_reasoning(request, strategy, previous_results)
    
    async def _execute_tot_reasoning(self, request, strategy: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """使用TOT引擎执行推理"""
        self.logger.info("🌳 [ComplexReasoning] 使用TOT引擎执行推理...")
        
        # 构建TOT推理上下文
        context = await self._build_tot_context(request, strategy, previous_results)
        
        # 使用简化推理替代TOT
        simplified_result = await AgentFactory.ask_llm(
            f"请对以下问题进行深度分析和推理：\n{request.input_text}\n\n上下文：{context}"
        )
        
        # 转换为标准格式
        return {
            'conclusion': simplified_result,
            'confidence': 0.7,  # 简化推理置信度
            'reasoning_steps': [{'step': 1, 'content': simplified_result}],
            'reasoning_trace': [
                {
                    'module': 'simplified_reasoning',
                    'action': 'analyze',
                    'result': simplified_result,
                    'timestamp': datetime.now().isoformat()
                }
            ]
        }
    
    async def _execute_sequential_reasoning(self, request, strategy: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """执行顺序推理"""
        self.logger.info("📝 [ComplexReasoning] 执行顺序推理...")
        
        reasoning_steps = []
        current_premise = request.input_text
        
        for reasoning_type in strategy['types']:
            step_result = await self._execute_single_reasoning_step(
                current_premise, reasoning_type, previous_results
            )
            reasoning_steps.append(step_result)
            current_premise = step_result['conclusion']
        
        # 整合推理步骤
        final_conclusion = reasoning_steps[-1]['conclusion'] if reasoning_steps else "无法得出结论"
        overall_confidence = sum(step['confidence'] for step in reasoning_steps) / len(reasoning_steps) if reasoning_steps else 0.0
        
        return {
            'conclusion': final_conclusion,
            'confidence': overall_confidence,
            'reasoning_steps': reasoning_steps,
            'reasoning_trace': [
                {
                    'module': 'sequential_reasoning',
                    'action': 'execute_steps',
                    'result': {'steps_count': len(reasoning_steps)},
                    'timestamp': datetime.now().isoformat()
                }
            ]
        }
    
    async def _execute_single_reasoning_step(self, premise: str, reasoning_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个推理步骤"""
        self.logger.debug(f"🔍 [ComplexReasoning] 执行{reasoning_type}推理...")
        
        if reasoning_type == ReasoningType.CAUSAL.value:
            return await self._causal_reasoning(premise, context)
        elif reasoning_type == ReasoningType.ANALOGICAL.value:
            return await self._analogical_reasoning(premise, context)
        elif reasoning_type == ReasoningType.LOGICAL.value:
            return await self._logical_reasoning(premise, context)
        elif reasoning_type == ReasoningType.ABDUCTIVE.value:
            return await self._abductive_reasoning(premise, context)
        elif reasoning_type == ReasoningType.INDUCTIVE.value:
            return await self._inductive_reasoning(premise, context)
        elif reasoning_type == ReasoningType.DEDUCTIVE.value:
            return await self._deductive_reasoning(premise, context)
        elif reasoning_type == ReasoningType.CREATIVE.value:
            return await self._creative_reasoning(premise, context)
        else:
            return await self._default_reasoning(premise, context)
    
    async def _causal_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """因果推理"""
        prompt = f"""
请进行因果推理分析：

前提：{premise}

请分析：
1. 可能的原因
2. 可能的结果
3. 因果关系的强度
4. 支持证据

请以JSON格式返回分析结果。
"""
        
        try:
            response = await AgentFactory.ask_llm(prompt)
            result = json.loads(response)
        except:
            result = {
                'causes': ['未知原因'],
                'effects': ['未知结果'],
                'strength': 0.5,
                'evidence': []
            }
        
        return {
            'reasoning_type': ReasoningType.CAUSAL.value,
            'premise': premise,
            'conclusion': f"基于因果分析：{result.get('effects', ['未知'])[0]}",
            'confidence': result.get('strength', 0.5),
            'evidence': result.get('evidence', []),
            'details': result
        }
    
    async def _analogical_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """类比推理"""
        prompt = f"""
请进行类比推理：

当前情况：{premise}

请找出相似的情况或案例，并进行类比分析：
1. 相似的情况
2. 相似点
3. 不同点
4. 基于类比的推论

请以JSON格式返回分析结果。
"""
        
        try:
            response = await AgentFactory.ask_llm(prompt)
            result = json.loads(response)
        except:
            result = {
                'analogies': ['类似情况'],
                'similarities': ['相似点'],
                'differences': ['不同点'],
                'conclusion': '基于类比的推论'
            }
        
        return {
            'reasoning_type': ReasoningType.ANALOGICAL.value,
            'premise': premise,
            'conclusion': result.get('conclusion', '基于类比的推论'),
            'confidence': 0.7,
            'evidence': result.get('analogies', []),
            'details': result
        }
    
    async def _logical_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """逻辑推理"""
        prompt = f"""
请进行逻辑推理：

前提：{premise}

请进行严格的逻辑分析：
1. 识别逻辑结构
2. 应用逻辑规则
3. 得出逻辑结论
4. 检查逻辑一致性

请以JSON格式返回分析结果。
"""
        
        try:
            response = await AgentFactory.ask_llm(prompt)
            result = json.loads(response)
        except:
            result = {
                'logical_structure': '简单命题',
                'rules_applied': ['基本逻辑'],
                'conclusion': '逻辑结论',
                'consistency': True
            }
        
        return {
            'reasoning_type': ReasoningType.LOGICAL.value,
            'premise': premise,
            'conclusion': result.get('conclusion', '逻辑结论'),
            'confidence': 0.9 if result.get('consistency', True) else 0.5,
            'evidence': result.get('rules_applied', []),
            'details': result
        }

    async def _abductive_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """溯因推理"""
        prompt = f"""
请进行溯因推理（从结果推导最可能的原因）：

观察到的现象：{premise}

请分析：
1. 最可能的解释
2. 其他可能的解释
3. 每种解释的可能性
4. 支持证据

请以JSON格式返回分析结果。
"""

        try:
            response = await AgentFactory.ask_llm(prompt)
            result = json.loads(response)
        except:
            result = {
                'best_explanation': '最可能的解释',
                'alternative_explanations': ['其他解释'],
                'probabilities': [0.7, 0.3],
                'evidence': []
            }

        return {
            'reasoning_type': ReasoningType.ABDUCTIVE.value,
            'premise': premise,
            'conclusion': result.get('best_explanation', '最可能的解释'),
            'confidence': max(result.get('probabilities', [0.5])),
            'evidence': result.get('evidence', []),
            'details': result
        }

    async def _inductive_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """归纳推理"""
        prompt = f"""
请进行归纳推理（从特殊到一般）：

具体情况：{premise}

请分析：
1. 识别模式和规律
2. 归纳出一般性结论
3. 评估归纳的可靠性
4. 考虑例外情况

请以JSON格式返回分析结果。
"""

        try:
            response = await AgentFactory.ask_llm(prompt)
            result = json.loads(response)
        except:
            result = {
                'patterns': ['识别的模式'],
                'general_conclusion': '一般性结论',
                'reliability': 0.6,
                'exceptions': []
            }

        return {
            'reasoning_type': ReasoningType.INDUCTIVE.value,
            'premise': premise,
            'conclusion': result.get('general_conclusion', '一般性结论'),
            'confidence': result.get('reliability', 0.6),
            'evidence': result.get('patterns', []),
            'details': result
        }

    async def _deductive_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """演绎推理"""
        prompt = f"""
请进行演绎推理（从一般到特殊）：

一般性前提：{premise}

请分析：
1. 识别一般性规则
2. 应用到具体情况
3. 得出特定结论
4. 验证推理有效性

请以JSON格式返回分析结果。
"""

        try:
            response = await AgentFactory.ask_llm(prompt)
            result = json.loads(response)
        except:
            result = {
                'general_rules': ['一般规则'],
                'specific_application': '具体应用',
                'conclusion': '特定结论',
                'validity': True
            }

        return {
            'reasoning_type': ReasoningType.DEDUCTIVE.value,
            'premise': premise,
            'conclusion': result.get('conclusion', '特定结论'),
            'confidence': 0.9 if result.get('validity', True) else 0.5,
            'evidence': result.get('general_rules', []),
            'details': result
        }

    async def _creative_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """创新推理"""
        prompt = f"""
请进行创新推理，产生新的见解和解决方案：

问题或情况：{premise}

请进行创新思考：
1. 跳出常规思维
2. 寻找新的角度和视角
3. 产生创新性解决方案
4. 评估创新方案的可行性

请以JSON格式返回分析结果。
"""

        try:
            response = await AgentFactory.ask_llm(prompt)
            result = json.loads(response)
        except:
            result = {
                'new_perspectives': ['新视角'],
                'innovative_solutions': ['创新方案'],
                'feasibility': 0.6,
                'novelty': 0.8
            }

        return {
            'reasoning_type': ReasoningType.CREATIVE.value,
            'premise': premise,
            'conclusion': result.get('innovative_solutions', ['创新方案'])[0],
            'confidence': result.get('feasibility', 0.6),
            'evidence': result.get('new_perspectives', []),
            'details': result
        }

    async def _default_reasoning(self, premise: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """默认推理"""
        prompt = f"""
请对以下内容进行分析和推理：

内容：{premise}

请提供您的分析和结论。
"""

        try:
            response = await AgentFactory.ask_llm(prompt)
            conclusion = response.strip()
        except:
            conclusion = "基于分析的结论"

        return {
            'reasoning_type': 'default',
            'premise': premise,
            'conclusion': conclusion,
            'confidence': 0.6,
            'evidence': [],
            'details': {}
        }

    # 辅助方法
    async def _determine_primary_reasoning_type(self, text: str, intent: str) -> str:
        """确定主要推理类型"""
        # 关键词匹配
        if any(word in text for word in ['为什么', '原因', '导致', '因为']):
            return ReasoningType.CAUSAL.value
        elif any(word in text for word in ['像', '类似', '好比', '如同']):
            return ReasoningType.ANALOGICAL.value
        elif any(word in text for word in ['如果', '那么', '逻辑', '推论']):
            return ReasoningType.LOGICAL.value
        elif any(word in text for word in ['创新', '新的', '不同', '独特']):
            return ReasoningType.CREATIVE.value
        elif intent == 'question':
            return ReasoningType.ABDUCTIVE.value
        else:
            return ReasoningType.LOGICAL.value

    async def _determine_secondary_reasoning_types(self, text: str, semantic_analysis: Dict[str, Any]) -> List[str]:
        """确定次要推理类型"""
        secondary_types = []

        # 根据语义分析确定次要推理类型
        complexity = semantic_analysis.get('complexity_score', 0)

        if complexity > 0.7:
            secondary_types.append(ReasoningType.LOGICAL.value)

        if complexity > 0.8:
            secondary_types.append(ReasoningType.CREATIVE.value)

        return secondary_types

    async def _requires_causal_analysis(self, text: str) -> bool:
        """判断是否需要因果分析"""
        causal_keywords = ['为什么', '原因', '导致', '因为', '所以', '结果', '影响']
        return any(keyword in text for keyword in causal_keywords)

    async def _requires_analogical_thinking(self, text: str) -> bool:
        """判断是否需要类比思维"""
        analogy_keywords = ['像', '类似', '好比', '如同', '相似', '对比', '比较']
        return any(keyword in text for keyword in analogy_keywords)

    async def _requires_logical_validation(self, text: str) -> bool:
        """判断是否需要逻辑验证"""
        logic_keywords = ['逻辑', '推理', '证明', '验证', '如果', '那么', '因此']
        return any(keyword in text for keyword in logic_keywords)

    async def _identify_domain_knowledge(self, text: str) -> List[str]:
        """识别需要的领域知识"""
        domains = []

        # 简单的领域识别
        domain_keywords = {
            'technology': ['技术', '软件', '编程', '计算机', 'AI', '人工智能'],
            'science': ['科学', '物理', '化学', '生物', '数学'],
            'business': ['商业', '管理', '营销', '财务', '经济'],
            'medicine': ['医学', '健康', '疾病', '治疗', '药物'],
            'education': ['教育', '学习', '教学', '培训', '课程']
        }

        for domain, keywords in domain_keywords.items():
            if any(keyword in text for keyword in keywords):
                domains.append(domain)

        return domains

    async def _build_reasoning_graph(self, strategy: Dict[str, Any]):
        """构建推理图（LangGraph）"""
        if not LANGGRAPH_AVAILABLE:
            raise RuntimeError("LangGraph not available")

        graph = StateGraph()

        # 定义推理节点
        async def reasoning_node(state):
            reasoning_type = state.get('current_reasoning_type', 'logical')
            premise = state.get('current_premise', state['input'])

            step_result = await self._execute_single_reasoning_step(
                premise, reasoning_type, state.get('previous_results', {})
            )

            state['reasoning_steps'].append(step_result)
            state['current_conclusion'] = step_result['conclusion']
            state['confidence'] = step_result['confidence']

            return state

        # 添加推理节点
        for i, reasoning_type in enumerate(strategy['types']):
            node_name = f"reasoning_{i}_{reasoning_type}"
            graph.add_node(node_name, RunnableCallable(reasoning_node))

            if i > 0:
                prev_node = f"reasoning_{i-1}_{strategy['types'][i-1]}"
                graph.add_edge(prev_node, node_name)

        # 设置入口点
        if strategy['types']:
            entry_node = f"reasoning_0_{strategy['types'][0]}"
            graph.set_entry_point(entry_node)

        return graph.compile()

    async def _build_tot_context(self, request, strategy: Dict[str, Any], previous_results: Dict[str, Any]) -> str:
        """构建TOT推理上下文"""
        context_parts = []

        # 添加基础上下文
        if request.context:
            context_parts.append(f"上下文：{json.dumps(request.context, ensure_ascii=False)}")

        # 添加推理策略信息
        context_parts.append(f"推理类型：{', '.join(strategy['types'])}")
        context_parts.append(f"推理深度：{strategy['depth']}")

        # 添加之前的结果
        if previous_results:
            context_parts.append(f"之前的分析结果：{json.dumps(previous_results, ensure_ascii=False)}")

        return "\n".join(context_parts)

    async def _validate_reasoning(self, reasoning_result: Dict[str, Any], request) -> Dict[str, Any]:
        """验证和优化推理结果"""
        self.logger.debug("✅ [ComplexReasoning] 验证推理结果...")

        # 基础验证
        if not reasoning_result.get('conclusion'):
            reasoning_result['conclusion'] = "无法得出明确结论"
            reasoning_result['confidence'] = 0.1

        # 置信度调整
        if reasoning_result.get('confidence', 0) > 0.95:
            reasoning_result['confidence'] = 0.95  # 避免过度自信

        # 构建推理链
        reasoning_chain = ReasoningChain(
            chain_id=f"chain_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            steps=[],  # 这里可以从reasoning_steps构建
            final_conclusion=reasoning_result['conclusion'],
            overall_confidence=reasoning_result['confidence'],
            reasoning_path=[]
        )

        return {
            'conclusion': reasoning_result['conclusion'],
            'confidence': reasoning_result['confidence'],
            'reasoning_chain': reasoning_chain,
            'reasoning_trace': reasoning_result.get('reasoning_trace', [])
        }

    async def _create_fallback_reasoning(self, request, error_msg: str) -> Dict[str, Any]:
        """创建备用推理结果"""
        return {
            'output': f"推理过程中遇到问题：{error_msg}。我将尽力为您提供基础分析。",
            'confidence': 0.3,
            'reasoning_chain': None,
            'reasoning_trace': [
                {
                    'module': 'complex_reasoning',
                    'action': 'fallback',
                    'error': error_msg,
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'metadata': {'error': True, 'fallback': True}
        }

    async def _initialize_reasoning_patterns(self):
        """初始化推理模式"""
        self.reasoning_patterns = {
            'causal': {
                'keywords': ['为什么', '原因', '导致', '因为', '所以'],
                'templates': ['如果{A}，那么{B}', '由于{A}，导致{B}']
            },
            'analogical': {
                'keywords': ['像', '类似', '好比', '如同'],
                'templates': ['{A}就像{B}一样', '{A}和{B}相似']
            },
            'logical': {
                'keywords': ['逻辑', '推理', '因此', '所以'],
                'templates': ['根据{A}，可以推出{B}', '如果{A}为真，则{B}为真']
            }
        }

    async def _initialize_knowledge_base(self):
        """初始化知识库"""
        self.knowledge_base = {
            'common_sense': [],
            'domain_knowledge': {},
            'reasoning_rules': [],
            'case_studies': []
        }
