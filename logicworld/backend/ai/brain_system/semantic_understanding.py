"""
多层次语义理解模块
构建深层语义解析、情感分析、上下文关联理解等多层次语义理解能力
"""

import logging
import re
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
from datetime import datetime

# 导入现有系统组件
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agent_system.agent_factory import AgentFactory


class SemanticLayer(Enum):
    """语义层次枚举"""
    SURFACE = "surface"         # 表层语义
    SYNTACTIC = "syntactic"     # 句法语义
    SEMANTIC = "semantic"       # 深层语义
    PRAGMATIC = "pragmatic"     # 语用语义
    CONTEXTUAL = "contextual"   # 上下文语义


class EmotionType(Enum):
    """情感类型"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"
    UNCERTAIN = "uncertain"


@dataclass
class SemanticAnalysisResult:
    """语义分析结果"""
    surface_analysis: Dict[str, Any]
    deep_analysis: Dict[str, Any]
    emotion_analysis: Dict[str, Any]
    context_analysis: Dict[str, Any]
    intent_analysis: Dict[str, Any]
    confidence: float
    metadata: Dict[str, Any]


class SemanticUnderstandingModule:
    """
    多层次语义理解模块
    
    实现：
    1. 表层语义分析（关键词、实体识别）
    2. 深层语义解析（意图、概念关系）
    3. 情感与态度分析
    4. 上下文关联理解
    5. 多模态信息融合
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.is_initialized = False
        self.context_memory = {}
        self.emotion_patterns = {}
        self.intent_patterns = {}
        
    async def initialize(self):
        """初始化语义理解模块"""
        if self.is_initialized:
            return
            
        self.logger.info("🔍 [SemanticUnderstanding] 初始化语义理解模块...")
        
        try:
            # 初始化情感分析模式
            await self._initialize_emotion_patterns()
            
            # 初始化意图识别模式
            await self._initialize_intent_patterns()
            
            # 初始化上下文记忆
            self.context_memory = {}
            
            self.is_initialized = True
            self.logger.info("✅ [SemanticUnderstanding] 语义理解模块初始化完成")
            
        except Exception as e:
            self.logger.error(f"❌ [SemanticUnderstanding] 初始化失败: {e}")
            raise
    
    async def analyze_input(self, text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        分析输入文本的语义信息
        
        Args:
            text: 输入文本
            context: 上下文信息
            
        Returns:
            语义分析结果
        """
        if not self.is_initialized:
            await self.initialize()
            
        self.logger.info(f"🔍 [SemanticUnderstanding] 开始语义分析: {text[:50]}...")
        
        try:
            # 1. 表层语义分析
            surface_analysis = await self._surface_analysis(text)
            
            # 2. 深层语义解析
            deep_analysis = await self._deep_semantic_analysis(text, surface_analysis)
            
            # 3. 情感分析
            emotion_analysis = await self._emotion_analysis(text, surface_analysis)
            
            # 4. 上下文分析
            context_analysis = await self._context_analysis(text, context, surface_analysis)
            
            # 5. 意图分析
            intent_analysis = await self._intent_analysis(text, surface_analysis, emotion_analysis)
            
            # 6. 整合分析结果
            result = await self._integrate_analysis(
                text, surface_analysis, deep_analysis, 
                emotion_analysis, context_analysis, intent_analysis
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ [SemanticUnderstanding] 语义分析失败: {e}")
            return self._create_fallback_analysis(text)
    
    async def process(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """处理语义理解请求"""
        self.logger.info("🔍 [SemanticUnderstanding] 处理语义理解请求...")
        
        # 进行深度语义分析
        semantic_result = await self.analyze_input(request.input_text, request.context)
        
        # 生成语义理解的输出
        output = await self._generate_semantic_output(semantic_result, request)
        
        return {
            'output': output,
            'confidence': semantic_result.get('confidence', 0.5),
            'semantic_analysis': semantic_result,
            'reasoning_trace': [
                {
                    'module': 'semantic_understanding',
                    'action': 'analyze_semantics',
                    'result': semantic_result,
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'metadata': {
                'layers_analyzed': semantic_result.get('layers_analyzed', []),
                'complexity_score': semantic_result.get('complexity_score', 0)
            }
        }
    
    async def _surface_analysis(self, text: str) -> Dict[str, Any]:
        """表层语义分析"""
        self.logger.debug("🔍 [SemanticUnderstanding] 执行表层语义分析...")
        
        # 基础文本统计
        word_count = len(text.split())
        char_count = len(text)
        sentence_count = len(re.split(r'[.!?。！？]', text))
        
        # 关键词提取（简单实现）
        keywords = await self._extract_keywords(text)
        
        # 实体识别（简单实现）
        entities = await self._extract_entities(text)
        
        # 语言特征
        language_features = await self._analyze_language_features(text)
        
        return {
            'word_count': word_count,
            'char_count': char_count,
            'sentence_count': sentence_count,
            'keywords': keywords,
            'entities': entities,
            'language_features': language_features,
            'complexity_indicators': {
                'avg_word_length': sum(len(word) for word in text.split()) / max(word_count, 1),
                'sentence_complexity': word_count / max(sentence_count, 1)
            }
        }
    
    async def _deep_semantic_analysis(self, text: str, surface_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """深层语义解析"""
        self.logger.debug("🧠 [SemanticUnderstanding] 执行深层语义分析...")
        
        # 使用LLM进行深层语义分析
        semantic_prompt = f"""
请对以下文本进行深层语义分析，分析其：
1. 核心概念和主题
2. 概念间的关系
3. 隐含意义和暗示
4. 逻辑结构
5. 语义复杂度

文本：{text}

请以JSON格式返回分析结果。
"""
        
        try:
            llm_response = await AgentFactory.ask_llm(semantic_prompt)
            # 检查是否是占位符响应
            if "[占位符回应]" in llm_response or "[错误]" in llm_response:
                raise Exception("LLM不可用")
            # 尝试解析JSON响应
            semantic_result = json.loads(llm_response)
        except:
            # 如果解析失败，使用规则基础的分析
            semantic_result = await self._rule_based_semantic_analysis(text, surface_analysis)
        
        return semantic_result
    
    async def _emotion_analysis(self, text: str, surface_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """情感分析"""
        self.logger.debug("❤️ [SemanticUnderstanding] 执行情感分析...")
        
        # 情感词汇检测
        emotion_words = await self._detect_emotion_words(text)
        
        # 情感强度计算
        emotion_intensity = await self._calculate_emotion_intensity(text, emotion_words)
        
        # 情感类型判断
        emotion_type = await self._classify_emotion_type(emotion_words, emotion_intensity)
        
        # 情感变化趋势（如果是多句话）
        emotion_trend = await self._analyze_emotion_trend(text)
        
        return {
            'emotion_type': emotion_type.value,
            'emotion_intensity': emotion_intensity,
            'emotion_words': emotion_words,
            'emotion_trend': emotion_trend,
            'confidence': min(0.9, len(emotion_words) * 0.2 + 0.3)
        }
    
    async def _context_analysis(self, text: str, context: Dict[str, Any], surface_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """上下文分析"""
        self.logger.debug("🔗 [SemanticUnderstanding] 执行上下文分析...")
        
        # 上下文相关性
        context_relevance = await self._calculate_context_relevance(text, context)
        
        # 话题连续性
        topic_continuity = await self._analyze_topic_continuity(text, context)
        
        # 引用和指代
        references = await self._detect_references(text, context)
        
        return {
            'context_relevance': context_relevance,
            'topic_continuity': topic_continuity,
            'references': references,
            'context_shift': context_relevance < 0.3  # 上下文转换
        }
    
    async def _intent_analysis(self, text: str, surface_analysis: Dict[str, Any], emotion_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """意图分析"""
        self.logger.debug("🎯 [SemanticUnderstanding] 执行意图分析...")

        # 基础意图识别
        primary_intent = await self._identify_primary_intent(text)

        # 次要意图
        secondary_intents = await self._identify_secondary_intents(text, primary_intent)

        # 意图强度
        intent_strength = await self._calculate_intent_strength(text, primary_intent, emotion_analysis)

        # 行动倾向
        action_tendency = await self._analyze_action_tendency(text, primary_intent)

        # 新增：需求完整性评估
        completeness_score = await self._assess_requirement_completeness(text, primary_intent)

        # 新增：缺失信息识别
        missing_info = await self._identify_missing_information(text, primary_intent)

        return {
            'primary_intent': primary_intent,
            'secondary_intents': secondary_intents,
            'intent_strength': intent_strength,
            'action_tendency': action_tendency,
            'requires_action': intent_strength > 0.6,
            'completeness_score': completeness_score,
            'missing_info': missing_info,
            'needs_clarification': completeness_score < 0.7  # 降低阈值，更容易触发澄清
        }

    async def _assess_requirement_completeness(self, text: str, intent: str) -> float:
        """评估需求的完整性，返回0-1的分数"""
        self.logger.debug("📊 [SemanticUnderstanding] 评估需求完整性...")

        try:
            completeness_prompt = f"""
            请评估以下用户需求的完整性，从0到1打分：

            用户需求：{text}
            识别意图：{intent}

            评估标准：
            1. 目标是否明确？(0.25权重)
            2. 输入资源是否清楚？(0.2权重)
            3. 输出要求是否具体？(0.2权重)
            4. 约束条件是否提及？(0.15权重)
            5. 时间要求是否明确？(0.1权重)
            6. 复杂度是否可评估？(0.1权重)

            特殊情况处理：
            - 如果是模糊或开放性问题，基础分数为0.3
            - 如果包含多个子任务，需要评估每个子任务的完整性
            - 如果是紧急或情感化表达，优先考虑核心需求

            请只返回一个0-1之间的数字，例如：0.75
            """

            response = await AgentFactory.ask_llm(completeness_prompt)

            # 尝试提取数字
            import re
            score_match = re.search(r'0\.\d+|1\.0|0|1', response)
            if score_match:
                return float(score_match.group())
            else:
                return 0.5  # 默认分数

        except Exception as e:
            self.logger.error(f"完整性评估失败: {e}")
            return 0.5

    async def _identify_missing_information(self, text: str, intent: str) -> List[str]:
        """识别缺失的关键信息"""
        self.logger.debug("🔍 [SemanticUnderstanding] 识别缺失信息...")

        try:
            missing_info_prompt = f"""
            分析以下用户需求，识别缺失的关键信息：

            用户需求：{text}
            识别意图：{intent}

            请仔细分析并识别以下方面的缺失信息：
            1. 具体目标和期望结果 - 用户想要达成什么？
            2. 可用资源和工具 - 用户有什么可以使用？
            3. 时间要求和截止日期 - 什么时候需要完成？
            4. 质量标准和约束条件 - 有什么限制或要求？
            5. 背景信息和上下文 - 为什么要做这件事？
            6. 具体的实施细节 - 怎么做？做到什么程度？

            如果某项信息已经明确提供，请不要列出。
            只返回明显缺失的信息，每行以"-"开头，要具体明确。

            示例格式：
            - 具体要解决的问题类型
            - 预期的完成时间
            - 可用的预算范围
            - 目标受众或使用者
            """

            response = await AgentFactory.ask_llm(missing_info_prompt)

            # 解析缺失信息列表
            missing_items = []
            for line in response.split('\n'):
                line = line.strip()
                if line.startswith('-'):
                    missing_items.append(line[1:].strip())

            return missing_items[:5]  # 最多返回5个缺失项

        except Exception as e:
            self.logger.error(f"缺失信息识别失败: {e}")
            return []

    async def decompose_to_steps(self, text: str, intent_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """将用户需求分解为清晰的执行步骤"""
        self.logger.info("🔧 [SemanticUnderstanding] 开始任务分解...")

        try:
            # 如果需求不完整，先返回澄清问题
            if intent_analysis.get('needs_clarification', False):
                clarification_questions = await self._generate_clarification_questions(
                    text, intent_analysis.get('missing_info', [])
                )
                return {
                    'type': 'clarification',
                    'questions': clarification_questions,
                    'completeness_score': intent_analysis.get('completeness_score', 0.5)
                }

            # 需求完整，进行任务分解
            steps = await self._generate_task_steps(text, intent_analysis)

            return {
                'type': 'steps',
                'steps': steps,
                'total_steps': len(steps),
                'estimated_time': await self._estimate_total_time(steps),
                'complexity': await self._assess_task_complexity(steps)
            }

        except Exception as e:
            self.logger.error(f"任务分解失败: {e}")
            return {
                'type': 'error',
                'message': f"任务分解失败: {str(e)}"
            }

    async def _generate_clarification_questions(self, text: str, missing_info: List[str]) -> List[str]:
        """生成澄清问题"""
        self.logger.info(f"❓ [SemanticUnderstanding] 生成澄清问题，缺失信息数量: {len(missing_info)}")
        self.logger.info(f"❓ [SemanticUnderstanding] 缺失信息: {missing_info}")

        try:
            questions_prompt = f"""
            基于用户需求和缺失信息，生成3-4个具体的澄清问题：

            用户需求：{text}
            缺失信息：{', '.join(missing_info) if missing_info else '目标不明确、资源不清楚、时间要求不明'}

            请生成具体、可操作的问题，帮助用户补充关键信息：
            1. 针对目标和期望结果的问题
            2. 针对资源和约束条件的问题
            3. 针对时间和优先级的问题
            4. 针对具体需求细节的问题

            每个问题一行，不要编号，直接问具体信息。

            示例格式：
            您具体希望解决什么问题？
            您目前有哪些可用的资源或工具？
            您希望什么时候完成这个任务？
            您对结果有什么具体的要求或标准？
            """

            response = await AgentFactory.ask_llm(questions_prompt)
            self.logger.info(f"❓ [SemanticUnderstanding] AI返回的澄清问题原始文本: {response}")

            # 解析问题列表
            questions = []
            for line in response.split('\n'):
                line = line.strip()
                if line and ('?' in line or '？' in line):
                    questions.append(line)

            self.logger.info(f"❓ [SemanticUnderstanding] 解析后的澄清问题: {questions}")
            return questions[:4]  # 最多4个问题

        except Exception as e:
            self.logger.error(f"澄清问题生成失败: {e}")
            return ["请提供更多详细信息以便我更好地帮助您。"]

    async def _generate_task_steps(self, text: str, intent_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """生成具体的任务执行步骤"""
        self.logger.info("📋 [SemanticUnderstanding] 生成任务步骤...")

        try:
            # 根据需求复杂度调整prompt
            completeness_score = intent_analysis.get('completeness_score', 0.5)
            is_complex_task = completeness_score > 0.7 and len(text) > 50

            if is_complex_task:
                steps_prompt = self._get_complex_task_prompt(text, intent_analysis)
            else:
                steps_prompt = self._get_simple_task_prompt(text, intent_analysis)

            self.logger.info(f"📋 [SemanticUnderstanding] 使用{'复杂任务' if is_complex_task else '简单任务'}处理策略")
            response = await AgentFactory.ask_llm(steps_prompt)

            # 记录AI的原始响应
            self.logger.info(f"📋 [SemanticUnderstanding] AI原始响应: {response[:200]}...")

            # 尝试解析JSON
            import json
            try:
                # 增强的JSON清理逻辑
                clean_response = self._clean_json_response(response)
                self.logger.info(f"📋 [SemanticUnderstanding] 清理后的JSON: {clean_response[:200]}...")

                steps = json.loads(clean_response)
                if isinstance(steps, list) and len(steps) > 0:
                    self.logger.info(f"📋 [SemanticUnderstanding] JSON解析成功，获得{len(steps)}个步骤")
                    return steps
                else:
                    self.logger.warning("📋 [SemanticUnderstanding] JSON解析成功但步骤为空")
            except json.JSONDecodeError as e:
                self.logger.warning(f"📋 [SemanticUnderstanding] JSON解析失败: {e}, 尝试文本解析")

            # 如果JSON解析失败，使用增强的文本解析
            parsed_steps = await self._parse_steps_from_text(response)
            if parsed_steps and len(parsed_steps) > 0:
                self.logger.info(f"📋 [SemanticUnderstanding] 文本解析成功，获得{len(parsed_steps)}个步骤")
                return parsed_steps
            else:
                self.logger.warning("📋 [SemanticUnderstanding] 文本解析也失败，使用降级策略")

            # 降级策略：生成基础步骤
            return self._get_fallback_steps(text, intent_analysis)

        except Exception as e:
            self.logger.error(f"📋 [SemanticUnderstanding] 任务步骤生成失败: {e}")
            import traceback
            self.logger.error(f"📋 [SemanticUnderstanding] 错误详情: {traceback.format_exc()}")
            return self._get_fallback_steps(text, intent_analysis)

    async def _parse_steps_from_text(self, text: str) -> List[Dict[str, Any]]:
        """从文本中解析步骤信息"""
        self.logger.warning("使用文本解析模式处理AI响应")

        # 如果文本包含JSON结构，尝试提取
        import re
        json_pattern = r'\[.*?\]'
        json_matches = re.findall(json_pattern, text, re.DOTALL)

        for match in json_matches:
            try:
                steps = json.loads(match)
                if isinstance(steps, list) and len(steps) > 0:
                    return steps
            except:
                continue

        # 如果没有找到JSON，使用简化的文本解析
        steps = []
        lines = text.split('\n')
        current_step = {}
        step_id = 1

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 检测步骤开始 - 更宽松的匹配
            if any(keyword in line.lower() for keyword in ['步骤', 'step', '第', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.']):
                if current_step:
                    current_step['step_id'] = step_id
                    steps.append(current_step)
                    step_id += 1

                # 清理步骤名称
                clean_name = re.sub(r'^[\d\.\s]*', '', line)
                current_step = {
                    'name': clean_name or f"步骤{step_id}",
                    'description': line,
                    'inputs': [],
                    'outputs': [],
                    'tools': [],
                    'estimated_time': '15分钟',
                    'difficulty': '中等',
                    'priority': '中'
                }
            elif current_step and len(line) > 10:
                # 添加到描述中
                if 'description' in current_step:
                    current_step['description'] += ' ' + line

        # 添加最后一个步骤
        if current_step:
            current_step['step_id'] = step_id
            steps.append(current_step)

        # 如果还是没有步骤，返回默认步骤
        if not steps:
            return self._get_default_steps(text)

        return steps[:8]  # 最多8个步骤

    def _get_default_steps(self, text: str) -> List[Dict[str, Any]]:
        """获取默认的步骤模板"""
        return [
            {
                "step_id": 1,
                "name": "需求分析",
                "description": f"分析用户需求：{text}",
                "inputs": ["用户需求"],
                "outputs": ["需求分析结果"],
                "tools": ["分析工具"],
                "estimated_time": "5分钟",
                "difficulty": "简单"
            },
            {
                "step_id": 2,
                "name": "方案设计",
                "description": "设计解决方案",
                "inputs": ["需求分析结果"],
                "outputs": ["解决方案"],
                "tools": ["设计工具"],
                "estimated_time": "15分钟",
                "difficulty": "中等"
            },
            {
                "step_id": 3,
                "name": "执行实施",
                "description": "执行解决方案",
                "inputs": ["解决方案"],
                "outputs": ["执行结果"],
                "tools": ["执行工具"],
                "estimated_time": "20分钟",
                "difficulty": "中等"
            }
        ]

    async def _estimate_total_time(self, steps: List[Dict[str, Any]]) -> str:
        """估算总执行时间"""
        total_minutes = 0
        for step in steps:
            time_str = step.get('estimated_time', '10分钟')
            # 提取数字
            import re
            time_match = re.search(r'\d+', time_str)
            if time_match:
                total_minutes += int(time_match.group())
            else:
                total_minutes += 10  # 默认10分钟

        if total_minutes < 60:
            return f"{total_minutes}分钟"
        else:
            hours = total_minutes // 60
            minutes = total_minutes % 60
            if minutes > 0:
                return f"{hours}小时{minutes}分钟"
            else:
                return f"{hours}小时"

    async def _assess_task_complexity(self, steps: List[Dict[str, Any]]) -> str:
        """评估任务复杂度"""
        difficulty_scores = {
            '简单': 1,
            '中等': 2,
            '困难': 3
        }

        total_score = 0
        for step in steps:
            difficulty = step.get('difficulty', '中等')
            total_score += difficulty_scores.get(difficulty, 2)

        avg_score = total_score / len(steps) if steps else 2

        if avg_score <= 1.5:
            return '简单'
        elif avg_score <= 2.5:
            return '中等'
        else:
            return '困难'
    
    async def _integrate_analysis(self, text: str, surface: Dict, deep: Dict, emotion: Dict, context: Dict, intent: Dict) -> Dict[str, Any]:
        """整合所有分析结果"""
        self.logger.debug("🔧 [SemanticUnderstanding] 整合分析结果...")
        
        # 计算整体复杂度
        complexity_score = await self._calculate_complexity_score(surface, deep, emotion, context, intent)
        
        # 计算整体置信度
        confidence = await self._calculate_overall_confidence(surface, deep, emotion, context, intent)
        
        # 确定需要的处理类型
        processing_requirements = await self._determine_processing_requirements(deep, emotion, intent, complexity_score)
        
        return {
            'surface_analysis': surface,
            'deep_analysis': deep,
            'emotion_analysis': emotion,
            'context_analysis': context,
            'intent_analysis': intent,
            'complexity_score': complexity_score,
            'confidence': confidence,
            'processing_requirements': processing_requirements,
            'layers_analyzed': ['surface', 'deep', 'emotion', 'context', 'intent'],
            'requires_reasoning': complexity_score > 0.6,
            'requires_collaboration': complexity_score > 0.8,
            'entities_count': len(surface.get('entities', [])),
            'sentiment_complexity': emotion.get('emotion_intensity', 0)
        }
    
    # 辅助方法实现
    async def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        # 简单的关键词提取
        words = text.split()
        # 过滤停用词和短词
        keywords = [word for word in words if len(word) > 2 and word not in ['的', '是', '在', '有', '和', '了', '我', '你', '他']]
        return keywords[:10]  # 返回前10个关键词
    
    async def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """实体识别"""
        entities = []
        # 简单的实体识别（可以后续集成NER模型）
        # 识别数字
        numbers = re.findall(r'\d+', text)
        for num in numbers:
            entities.append({'text': num, 'type': 'NUMBER', 'confidence': 0.9})
        
        # 识别时间表达
        time_patterns = ['今天', '明天', '昨天', '现在', '以后', '之前']
        for pattern in time_patterns:
            if pattern in text:
                entities.append({'text': pattern, 'type': 'TIME', 'confidence': 0.8})
        
        return entities
    
    async def _analyze_language_features(self, text: str) -> Dict[str, Any]:
        """分析语言特征"""
        return {
            'has_questions': '?' in text or '？' in text,
            'has_exclamations': '!' in text or '！' in text,
            'has_negations': any(neg in text for neg in ['不', '没', '非', '无']),
            'has_conditionals': any(cond in text for cond in ['如果', '假如', '要是', '倘若']),
            'has_comparisons': any(comp in text for comp in ['比', '更', '最', '像', '如同'])
        }
    
    async def _initialize_emotion_patterns(self):
        """初始化情感分析模式"""
        self.emotion_patterns = {
            'positive': ['好', '棒', '优秀', '喜欢', '开心', '满意', '赞', '爱'],
            'negative': ['坏', '差', '糟糕', '讨厌', '难过', '失望', '恨', '愤怒'],
            'neutral': ['一般', '普通', '还行', '可以', '正常']
        }
    
    async def _initialize_intent_patterns(self):
        """初始化意图识别模式"""
        self.intent_patterns = {
            'task_planning': ['做', '制作', '创建', '生成', '设计', '分析', '处理', '整理', '准备'],
            'question_answer': ['什么', '怎么', '为什么', '哪里', '谁', '如何', '?', '？'],
            'consultation': ['建议', '意见', '觉得', '应该', '推荐', '选择'],
            'information_query': ['查询', '查看', '了解', '知道', '告诉我'],
            'casual_chat': ['你好', '谢谢', '再见', '早上好', '晚安', '怎么样'],
            'clarification': ['我是说', '具体来说', '也就是', '换句话说', '补充'],
            'feedback': ['很好', '不错', '满意', '不对', '错误', '有问题']
        }
    
    async def _create_fallback_analysis(self, text: str) -> Dict[str, Any]:
        """创建备用分析结果"""
        return {
            'surface_analysis': {'word_count': len(text.split()), 'keywords': [], 'entities': []},
            'deep_analysis': {'concepts': [], 'relationships': []},
            'emotion_analysis': {'emotion_type': 'neutral', 'emotion_intensity': 0.5},
            'context_analysis': {'context_relevance': 0.5},
            'intent_analysis': {'primary_intent': 'unknown'},
            'complexity_score': 0.5,
            'confidence': 0.3,
            'processing_requirements': {'reasoning': False, 'collaboration': False}
        }

    # 情感分析相关方法
    async def _detect_emotion_words(self, text: str) -> Dict[str, List[str]]:
        """检测情感词汇"""
        detected = {'positive': [], 'negative': [], 'neutral': []}

        for emotion_type, words in self.emotion_patterns.items():
            for word in words:
                if word in text:
                    detected[emotion_type].append(word)

        return detected

    async def _calculate_emotion_intensity(self, text: str, emotion_words: Dict[str, List[str]]) -> float:
        """计算情感强度"""
        total_words = sum(len(words) for words in emotion_words.values())
        if total_words == 0:
            return 0.5

        # 正面和负面词汇的权重
        positive_weight = len(emotion_words['positive']) * 1.0
        negative_weight = len(emotion_words['negative']) * 1.0

        # 计算强度（0-1之间）
        intensity = min(1.0, (positive_weight + negative_weight) / len(text.split()) * 10)
        return intensity

    async def _classify_emotion_type(self, emotion_words: Dict[str, List[str]], intensity: float) -> EmotionType:
        """分类情感类型"""
        pos_count = len(emotion_words['positive'])
        neg_count = len(emotion_words['negative'])

        if pos_count > neg_count:
            return EmotionType.POSITIVE
        elif neg_count > pos_count:
            return EmotionType.NEGATIVE
        elif pos_count == neg_count and pos_count > 0:
            return EmotionType.MIXED
        elif intensity < 0.3:
            return EmotionType.NEUTRAL
        else:
            return EmotionType.UNCERTAIN

    async def _analyze_emotion_trend(self, text: str) -> str:
        """分析情感变化趋势"""
        sentences = re.split(r'[.!?。！？]', text)
        if len(sentences) <= 1:
            return "stable"

        # 简单的趋势分析
        emotions = []
        for sentence in sentences:
            if sentence.strip():
                emotion_words = await self._detect_emotion_words(sentence)
                pos_count = len(emotion_words['positive'])
                neg_count = len(emotion_words['negative'])
                emotions.append(pos_count - neg_count)

        if len(emotions) < 2:
            return "stable"

        # 判断趋势
        if emotions[-1] > emotions[0]:
            return "improving"
        elif emotions[-1] < emotions[0]:
            return "declining"
        else:
            return "stable"

    # 上下文分析相关方法
    async def _calculate_context_relevance(self, text: str, context: Dict[str, Any]) -> float:
        """计算上下文相关性"""
        if not context:
            return 0.5

        # 简单的相关性计算
        relevance_score = 0.5

        # 检查关键词重叠
        text_words = set(text.lower().split())
        if 'previous_keywords' in context:
            context_words = set(context['previous_keywords'])
            overlap = len(text_words.intersection(context_words))
            relevance_score += min(0.4, overlap * 0.1)

        return min(1.0, relevance_score)

    async def _analyze_topic_continuity(self, text: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """分析话题连续性"""
        if not context or 'previous_topic' not in context:
            return {'continuity': 'new_topic', 'confidence': 0.5}

        # 简单的话题连续性分析
        current_keywords = await self._extract_keywords(text)
        previous_keywords = context.get('previous_keywords', [])

        overlap = len(set(current_keywords).intersection(set(previous_keywords)))

        if overlap >= 2:
            return {'continuity': 'same_topic', 'confidence': 0.8}
        elif overlap == 1:
            return {'continuity': 'related_topic', 'confidence': 0.6}
        else:
            return {'continuity': 'new_topic', 'confidence': 0.7}

    async def _detect_references(self, text: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """检测引用和指代"""
        references = []

        # 检测代词引用
        pronouns = ['它', '他', '她', '这', '那', '这个', '那个', '这些', '那些']
        for pronoun in pronouns:
            if pronoun in text:
                references.append({
                    'type': 'pronoun',
                    'text': pronoun,
                    'needs_resolution': True
                })

        return references

    # 意图分析相关方法
    async def _identify_primary_intent(self, text: str) -> str:
        """识别主要意图"""
        try:
            # 使用AI进行更准确的意图识别
            intent_prompt = f"""
            分析以下用户输入的意图类型：

            用户输入：{text}

            请识别主要意图类型，从以下选项中选择：
            1. task_planning - 需要制定执行计划的任务（如"我想做个PPT"、"帮我分析数据"）
            2. question_answer - 寻求具体答案的问题（如"什么是AI？"、"如何使用Excel？"）
            3. consultation - 咨询建议或意见（如"你觉得我应该怎么办？"、"有什么建议吗？"）
            4. information_query - 查询特定信息（如"今天天气如何？"、"公司政策是什么？"）
            5. casual_chat - 闲聊对话（如"你好"、"今天过得怎么样？"、"谢谢"）
            6. clarification - 澄清或补充信息（如"我是说..."、"具体来说..."）
            7. feedback - 反馈或评价（如"很好"、"不太对"、"我不满意"）

            只返回意图类型，不要其他内容。
            """

            response = await AgentFactory.ask_llm(intent_prompt)
            intent = response.strip().lower()

            # 验证返回的意图是否有效
            valid_intents = ['task_planning', 'question_answer', 'consultation',
                           'information_query', 'casual_chat', 'clarification', 'feedback']

            if intent in valid_intents:
                return intent
            else:
                # 如果AI返回无效意图，回退到规则匹配
                return await self._fallback_intent_detection(text)

        except Exception as e:
            self.logger.warning(f"AI意图识别失败，使用规则匹配: {e}")
            return await self._fallback_intent_detection(text)

    async def _fallback_intent_detection(self, text: str) -> str:
        """回退的规则匹配意图识别"""
        intent_scores = {}

        for intent_type, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if pattern in text:
                    score += 1
            intent_scores[intent_type] = score

        if not intent_scores or max(intent_scores.values()) == 0:
            return 'unknown'

        return max(intent_scores, key=intent_scores.get)

    async def _identify_secondary_intents(self, text: str, primary_intent: str) -> List[str]:
        """识别次要意图"""
        secondary = []

        for intent_type, patterns in self.intent_patterns.items():
            if intent_type != primary_intent:
                for pattern in patterns:
                    if pattern in text:
                        secondary.append(intent_type)
                        break

        return secondary

    async def _calculate_intent_strength(self, text: str, primary_intent: str, emotion_analysis: Dict[str, Any]) -> float:
        """计算意图强度"""
        base_strength = 0.5

        # 根据情感强度调整
        emotion_intensity = emotion_analysis.get('emotion_intensity', 0.5)
        base_strength += emotion_intensity * 0.3

        # 根据语言特征调整
        if primary_intent == 'question' and ('?' in text or '？' in text):
            base_strength += 0.2
        elif primary_intent == 'request' and any(word in text for word in ['请', '帮']):
            base_strength += 0.2

        return min(1.0, base_strength)

    async def _analyze_action_tendency(self, text: str, primary_intent: str) -> str:
        """分析行动倾向"""
        action_words = ['做', '执行', '开始', '创建', '生成', '制作', '写', '画', '设计']

        if any(word in text for word in action_words):
            return 'high_action'
        elif primary_intent in ['request', 'command']:
            return 'medium_action'
        elif primary_intent == 'question':
            return 'low_action'
        else:
            return 'no_action'

    # 整合分析相关方法
    async def _calculate_complexity_score(self, surface: Dict, deep: Dict, emotion: Dict, context: Dict, intent: Dict) -> float:
        """计算复杂度分数"""
        complexity = 0.0

        # 表层复杂度
        word_count = surface.get('word_count', 0)
        if word_count > 50:
            complexity += 0.2
        if word_count > 100:
            complexity += 0.2

        # 实体数量
        entities_count = len(surface.get('entities', []))
        complexity += min(0.2, entities_count * 0.05)

        # 情感复杂度
        emotion_intensity = emotion.get('emotion_intensity', 0)
        complexity += emotion_intensity * 0.2

        # 意图复杂度
        secondary_intents = intent.get('secondary_intents', [])
        complexity += min(0.2, len(secondary_intents) * 0.1)

        # 语言特征复杂度
        language_features = surface.get('language_features', {})
        feature_count = sum(1 for v in language_features.values() if v)
        complexity += min(0.2, feature_count * 0.04)

        return min(1.0, complexity)

    async def _calculate_overall_confidence(self, surface: Dict, deep: Dict, emotion: Dict, context: Dict, intent: Dict) -> float:
        """计算整体置信度"""
        confidences = []

        # 收集各模块的置信度
        if 'confidence' in emotion:
            confidences.append(emotion['confidence'])

        # 基于分析完整性的置信度
        analysis_completeness = 0.8  # 基础置信度

        # 如果有实体识别结果，增加置信度
        if surface.get('entities'):
            analysis_completeness += 0.1

        # 如果有明确的意图，增加置信度
        if intent.get('primary_intent') != 'unknown':
            analysis_completeness += 0.1

        confidences.append(min(1.0, analysis_completeness))

        return sum(confidences) / len(confidences) if confidences else 0.5

    async def _determine_processing_requirements(self, deep: Dict, emotion: Dict, intent: Dict, complexity_score: float) -> Dict[str, bool]:
        """确定处理需求"""
        return {
            'reasoning': complexity_score > 0.6 or intent.get('primary_intent') in ['question', 'request'],
            'collaboration': complexity_score > 0.8,
            'memory_access': True,  # 总是需要记忆访问
            'emotion_handling': emotion.get('emotion_intensity', 0) > 0.6,
            'context_tracking': True
        }

    async def _rule_based_semantic_analysis(self, text: str, surface_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """基于规则的语义分析（LLM失败时的备用方案）"""
        return {
            'concepts': surface_analysis.get('keywords', [])[:5],
            'relationships': [],
            'implicit_meanings': [],
            'logical_structure': 'simple',
            'semantic_complexity': min(1.0, len(surface_analysis.get('keywords', [])) * 0.1)
        }

    async def _generate_semantic_output(self, semantic_result: Dict[str, Any], request) -> str:
        """生成语义理解的输出"""
        try:
            # 获取分析结果
            intent = semantic_result.get('intent_analysis', {}).get('primary_intent', 'unknown')
            emotion = semantic_result.get('emotion_analysis', {}).get('emotion_type', 'neutral')
            complexity = semantic_result.get('complexity_score', 0.5)
            keywords = semantic_result.get('surface_analysis', {}).get('keywords', [])

            # 根据意图类型生成不同的响应
            if intent == 'question':
                if keywords:
                    return f"您询问关于{', '.join(keywords[:3])}的问题。让我为您详细解答这个{emotion}情感色彩的问题。"
                else:
                    return "我理解您的问题，让我为您提供详细的解答。"
            elif intent == 'request':
                return f"我明白您的请求，这涉及到{', '.join(keywords[:3]) if keywords else '相关内容'}。我将帮助您完成这个任务。"
            elif intent == 'command':
                return f"收到您的指令，我将执行相关操作。"
            else:
                return f"我理解了您的{intent}类型请求，情感倾向为{emotion}。让我为您提供合适的回应。"

        except Exception as e:
            self.logger.error(f"生成语义输出失败: {e}")
            return "我理解了您的需求，正在为您处理。"

    def _get_complex_task_prompt(self, text: str, intent_analysis: Dict[str, Any]) -> str:
        """为复杂任务生成专门的prompt - 优化版本"""
        return f"""
        作为高级AI工作流架构师，请将复杂需求设计为AI可高效执行的精确步骤序列。

        用户需求：{text}
        主要意图：{intent_analysis.get('primary_intent', '')}
        完整性评分：{intent_analysis.get('completeness_score', 0.5)}

        ## 🎯 高级AI工作流设计原则：

        ### 1. 材料收集优先（强制要求）
        - **第一步必须且只能是材料收集节点**
        - 明确指出AI需要收集的具体材料、数据、资源
        - 每个工作流只能有一个材料收集节点，作为起点
        - 支持AI反向追溯材料需求

        ### 2. 智能化优先
        - AI能并行处理的任务充分利用并行能力
        - 每个步骤只告诉AI要达成什么目标，不解释如何做
        - 每个步骤都应该是AI的核心优势领域
        - 避免模拟人工操作的思维模式

        ### 3. 端到端思维
        - 将相关任务整合为完整的AI处理单元
        - 使用明确的动词：收集、分析、生成、撰写、校对、格式化、输出
        - 每个步骤都应该产生完整的阶段性成果
        - 禁止模糊词汇：处理、操作、相关内容

        ### 4. 无步骤限制
        - 根据需求复杂度生成所需的所有步骤
        - 不限制步骤数量，确保工作流的完整性和连贯性
        - 每个步骤都必须有明确的业务价值输出

        ## 📋 复杂Office工作流实际例子：

        ### 例子1：综合业务报告生成
        用户需求：创建季度业务分析报告，包含数据分析、市场洞察、战略建议
        AI步骤序列：
        1. 收集季度业务数据和市场信息（材料节点）
        2. 分析财务表现和趋势变化
        3. 研究行业市场动态和竞争态势
        4. 识别关键业务机会和风险点
        5. 制定战略改进建议方案
        6. 生成可视化数据图表
        7. 撰写综合分析报告正文
        8. 设计专业报告版式布局
        9. 校对内容逻辑和数据准确性
        10. 输出最终业务报告文档

        ### 例子2：多媒体培训材料制作
        用户需求：制作员工培训课程，包含PPT、练习题、评估表
        AI步骤序列：
        1. 收集培训主题资料和课程要求（材料节点）
        2. 分析培训对象的知识背景和学习需求
        3. 设计课程结构和学习路径
        4. 生成培训内容核心知识点
        5. 制作PPT演示文稿页面
        6. 创建互动练习题库
        7. 设计学习效果评估表
        8. 优化多媒体元素和视觉效果
        9. 整合所有培训材料组件
        10. 输出完整培训材料包

        ### 例子3：数据驱动决策分析系统
        用户需求：建立销售预测模型并生成决策支持报告
        AI步骤序列：
        1. 收集历史销售数据和市场因素（材料节点）
        2. 清洗和验证数据完整性
        3. 探索数据模式和关联关系
        4. 构建销售预测算法模型
        5. 验证模型准确性和可靠性
        6. 生成预测结果和置信区间
        7. 分析关键影响因素权重
        8. 制定基于预测的决策建议
        9. 创建交互式数据仪表板
        10. 撰写决策支持分析报告
        11. 输出完整预测分析系统

        ## 🔧 高级节点类型映射指南：

        **材料节点类型（第一步专用）**：
        - material-node：收集、获取、准备、整理材料

        **执行节点类型**：
        - execution-node：分析、生成、撰写、计算、创建、构建、制作
        - condition-node：判断、选择、决策、验证、评估、检验
        - result-node：输出、导出、发布、保存、整合（通常是最后一步）

        **复杂工作流特殊节点**：
        - parallel-execution-node：并行处理多个相关任务
        - integration-node：整合多个组件或结果
        - optimization-node：优化和改进已有成果

        请返回JSON格式的AI执行步骤序列：
        [
            {{
                "step_id": 1,
                "name": "收集[具体材料名称]",
                "description": "收集执行此复杂工作流所需的全部材料、数据和资源",
                "task_type": "材料收集",
                "node_type": "material-node",
                "action_verb": "收集",
                "target_object": "具体的材料对象",
                "execution_guidance": "AI需要获取的详细材料清单和要求",
                "inputs": ["用户需求和上下文"],
                "outputs": ["完整的材料资源包"],
                "recommended_tools": ["Office-Word-MCP-Server"],
                "estimated_time": "3-5分钟",
                "core_value": "为后续步骤提供完整的材料基础"
            }},
            {{
                "step_id": 2,
                "name": "[动词][具体对象]",
                "description": "AI要完成的具体智能任务（体现AI的综合处理能力）",
                "task_type": "智能分析/端到端生成/智能处理/智能优化",
                "node_type": "execution-node/condition-node/result-node",
                "action_verb": "明确的动词",
                "target_object": "具体的操作对象",
                "execution_guidance": "AI执行此步骤的详细指导",
                "inputs": ["明确的输入要求"],
                "outputs": ["完整的AI输出成果"],
                "recommended_tools": ["具体的AI工具名称"],
                "estimated_time": "实际预估时间",
                "core_value": "步骤的核心业务价值"
            }}
        ]

        ## ⚠️ 严格要求：
        1. **第一步必须是材料收集，node_type必须是material-node**
        2. **每个工作流只能有一个material-node**
        3. **每个步骤都是完整的AI智能模块，不是人工操作指南**
        4. **充分发挥AI的并行处理和端到端能力**
        5. **避免过度细分，重视AI的综合智能优势**
        6. **确保每个步骤都有实质性的价值输出**
        7. **根据复杂度生成所需数量的步骤，不受限制**

        必须返回标准JSON格式，无其他内容。
        """

    def _get_simple_task_prompt(self, text: str, intent_analysis: Dict[str, Any]) -> str:
        """为简单Office任务生成prompt - 优化版本"""
        return f"""
        作为AI工作流专家，请将用户需求转化为AI可直接执行的精确步骤序列。

        用户需求：{text}
        主要意图：{intent_analysis.get('primary_intent', '')}

        ## 🎯 核心设计原则：

        ### 1. 材料收集优先（强制要求）
        - **第一步必须且只能是材料收集节点**
        - 明确指出AI需要收集的具体材料、数据、资源
        - 每个工作流只能有一个材料收集节点，作为起点
        - 当AI执行时缺少材料，可以反向追溯到此节点

        ### 2. AI执行导向
        - 每个步骤只告诉AI要达成什么目标，不解释如何做
        - 使用明确的动词：收集、分析、生成、撰写、校对、格式化、输出
        - 禁止模糊词汇：处理、操作、相关内容、执行XX操作

        ### 3. 单一精确操作
        - 每个步骤只包含一个明确的动作
        - 步骤名称格式：[动词] + [具体对象]
        - 避免组合操作，确保AI能够明确执行

        ### 4. 无步骤限制
        - 根据需求复杂度生成所需的所有步骤
        - 不限制步骤数量，确保工作流的完整性

        ## 📋 Office工作流实际例子：

        ### 例子1：Word文档生成
        用户需求：创建一份产品介绍文档
        AI步骤序列：
        1. 收集产品信息素材（材料节点）
        2. 分析目标读者群体特征  
        3. 生成文档结构大纲
        4. 撰写产品介绍正文
        5. 校对语法和表达
        6. 格式化文档布局
        7. 输出最终Word文档

        ### 例子2：Excel数据分析
        用户需求：分析销售数据并生成报表
        AI步骤序列：
        1. 收集销售数据文件和分析要求（材料节点）
        2. 清洗和验证数据质量
        3. 计算关键业务指标
        4. 生成数据透视表
        5. 创建可视化图表
        6. 撰写分析结论报告
        7. 输出Excel分析报表

        ### 例子3：PPT演示文稿制作
        用户需求：制作项目汇报PPT
        AI步骤序列：
        1. 收集项目资料和汇报要求（材料节点）
        2. 分析汇报对象和场景需求
        3. 设计演示文稿结构框架
        4. 生成各页面核心内容
        5. 选择合适的视觉设计风格
        6. 制作图表和视觉元素
        7. 优化页面布局和动画效果
        8. 输出最终PPT文件

        ## 🔧 节点类型映射指南：

        **材料节点类型（第一步专用）**：
        - material-node：收集、获取、准备材料
        
        **执行节点类型**：
        - execution-node：分析、生成、撰写、计算、创建
        - condition-node：判断、选择、决策、验证
        - result-node：输出、导出、发布、保存（通常是最后一步）

        **动词与节点类型对应**：
        - 收集/获取/准备 → material-node（仅第一步）
        - 分析/计算/处理/清洗 → execution-node
        - 生成/创建/撰写/制作 → execution-node
        - 判断/选择/验证/检查 → condition-node
        - 输出/保存/导出/发布 → result-node

        请返回JSON格式的AI执行步骤序列：
        [
            {{
                "step_id": 1,
                "name": "收集[具体材料名称]",
                "description": "收集执行此工作流所需的具体材料、数据或资源",
                "task_type": "材料收集",
                "node_type": "material-node",
                "action_verb": "收集",
                "target_object": "具体的材料对象",
                "execution_guidance": "AI需要获取的具体材料清单",
                "recommended_tools": ["Office-Word-MCP-Server"],
                "estimated_time": "1-2分钟"
            }},
            {{
                "step_id": 2,
                "name": "[动词][具体对象]",
                "description": "AI要完成的具体任务目标（告诉AI要做什么，不解释怎么做）",
                "task_type": "智能分析/内容生成/数据处理/格式转换",
                "node_type": "execution-node/condition-node/result-node",
                "action_verb": "明确的动词",
                "target_object": "具体的操作对象",
                "execution_guidance": "AI执行此步骤的具体指导",
                "recommended_tools": ["具体工具名称"],
                "estimated_time": "预估时间"
            }}
        ]

        ## ⚠️ 严格要求：
        1. **第一步必须是材料收集，node_type必须是material-node**
        2. **每个工作流只能有一个material-node**
        3. **步骤名称必须具体，禁用"处理"、"操作"等模糊词汇**
        4. **描述必须面向AI执行，不要解释操作步骤**
        5. **根据实际需求生成所需数量的步骤，不受限制**

        必须返回标准JSON格式，无其他内容。
        """

    def _clean_json_response(self, response: str) -> str:
        """增强的JSON清理逻辑"""
        import re

        # 移除markdown标记
        clean_response = response.strip()
        if clean_response.startswith('```json'):
            clean_response = clean_response[7:]
        elif clean_response.startswith('```'):
            clean_response = clean_response[3:]
        if clean_response.endswith('```'):
            clean_response = clean_response[:-3]

        # 移除前后的解释文字，只保留JSON部分
        json_start = clean_response.find('[')
        json_end = clean_response.rfind(']')

        if json_start != -1 and json_end != -1 and json_end > json_start:
            clean_response = clean_response[json_start:json_end+1]

        # 修复常见的JSON格式问题
        clean_response = re.sub(r',\s*}', '}', clean_response)  # 移除多余的逗号
        clean_response = re.sub(r',\s*]', ']', clean_response)  # 移除数组末尾的逗号

        return clean_response.strip()

    def _get_fallback_steps(self, text: str, intent_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """降级策略：当所有解析都失败时，生成基础步骤"""
        self.logger.info("📋 [SemanticUnderstanding] 使用降级策略生成基础步骤")

        # 根据文本内容生成基础步骤
        primary_intent = intent_analysis.get('primary_intent', 'task_planning')

        if 'PPT' in text or 'ppt' in text or '演示' in text or '幻灯片' in text:
            return self._get_ppt_fallback_steps(text)
        elif '学习' in text or '教程' in text:
            return self._get_learning_fallback_steps(text)
        elif '计划' in text or '规划' in text:
            return self._get_planning_fallback_steps(text)
        else:
            return self._get_generic_fallback_steps(text)

    def _get_ppt_fallback_steps(self, text: str) -> List[Dict[str, Any]]:
        """PPT制作的降级步骤"""
        return [
            {
                "step_id": 1,
                "name": "确定PPT主题和结构",
                "description": "明确PPT的主要内容、目标受众和整体结构",
                "estimated_time": "30分钟",
                "difficulty": "简单",
                "priority": "高"
            },
            {
                "step_id": 2,
                "name": "收集和整理资料",
                "description": "搜集相关资料、图片、数据等内容素材",
                "estimated_time": "60分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 3,
                "name": "制作PPT大纲",
                "description": "创建详细的PPT大纲，确定每页的主要内容",
                "estimated_time": "45分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 4,
                "name": "设计PPT模板和样式",
                "description": "选择或设计PPT模板，统一字体、颜色等视觉元素",
                "estimated_time": "30分钟",
                "difficulty": "中等",
                "priority": "中"
            },
            {
                "step_id": 5,
                "name": "制作PPT内容",
                "description": "根据大纲制作具体的PPT页面内容",
                "estimated_time": "120分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 6,
                "name": "审核和优化",
                "description": "检查内容准确性，优化排版和视觉效果",
                "estimated_time": "45分钟",
                "difficulty": "简单",
                "priority": "中"
            },
            {
                "step_id": 7,
                "name": "准备演讲稿",
                "description": "准备配套的演讲稿或演示要点",
                "estimated_time": "30分钟",
                "difficulty": "简单",
                "priority": "中"
            }
        ]

    def _get_learning_fallback_steps(self, text: str) -> List[Dict[str, Any]]:
        """学习类任务的降级步骤"""
        return [
            {
                "step_id": 1,
                "name": "明确学习目标",
                "description": "确定要学习的具体内容和预期达到的水平",
                "estimated_time": "15分钟",
                "difficulty": "简单",
                "priority": "高"
            },
            {
                "step_id": 2,
                "name": "制定学习计划",
                "description": "安排学习时间表和学习方法",
                "estimated_time": "30分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 3,
                "name": "收集学习资源",
                "description": "找到合适的教材、视频、文档等学习资料",
                "estimated_time": "45分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 4,
                "name": "开始系统学习",
                "description": "按照计划进行系统性学习",
                "estimated_time": "根据内容而定",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 5,
                "name": "实践和练习",
                "description": "通过实际操作加深理解",
                "estimated_time": "根据内容而定",
                "difficulty": "中等",
                "priority": "中"
            }
        ]

    def _get_planning_fallback_steps(self, text: str) -> List[Dict[str, Any]]:
        """规划类任务的降级步骤"""
        return [
            {
                "step_id": 1,
                "name": "需求分析",
                "description": "详细分析和明确具体需求",
                "estimated_time": "30分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 2,
                "name": "方案设计",
                "description": "设计解决方案和实施策略",
                "estimated_time": "45分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 3,
                "name": "资源准备",
                "description": "准备所需的资源和工具",
                "estimated_time": "30分钟",
                "difficulty": "简单",
                "priority": "中"
            },
            {
                "step_id": 4,
                "name": "执行实施",
                "description": "按照方案执行具体操作",
                "estimated_time": "根据复杂度而定",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 5,
                "name": "检查验证",
                "description": "检查结果是否符合预期",
                "estimated_time": "20分钟",
                "difficulty": "简单",
                "priority": "中"
            }
        ]

    def _get_generic_fallback_steps(self, text: str) -> List[Dict[str, Any]]:
        """通用的降级步骤"""
        return [
            {
                "step_id": 1,
                "name": "理解需求",
                "description": "仔细分析和理解具体需求",
                "estimated_time": "15分钟",
                "difficulty": "简单",
                "priority": "高"
            },
            {
                "step_id": 2,
                "name": "制定方案",
                "description": "根据需求制定解决方案",
                "estimated_time": "30分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 3,
                "name": "准备资源",
                "description": "准备执行所需的资源和工具",
                "estimated_time": "20分钟",
                "difficulty": "简单",
                "priority": "中"
            },
            {
                "step_id": 4,
                "name": "执行操作",
                "description": "按照方案执行具体操作",
                "estimated_time": "45分钟",
                "difficulty": "中等",
                "priority": "高"
            },
            {
                "step_id": 5,
                "name": "验证结果",
                "description": "检查和验证执行结果",
                "estimated_time": "15分钟",
                "difficulty": "简单",
                "priority": "中"
            }
        ]
