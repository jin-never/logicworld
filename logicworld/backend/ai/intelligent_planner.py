"""
智能规划器 - 精准理解用户意图并生成清晰的执行步骤
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.brain_system.semantic_understanding import SemanticUnderstandingModule
from ai.brain_system.brain_core import IntelligentBrain
from agent_system.agent_factory import AgentFactory
from ai.role_template_manager import role_template_manager


class IntelligentPlanner:
    """智能规划器 - 理解用户需求并生成执行计划"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.semantic_module = SemanticUnderstandingModule()
        self.brain = IntelligentBrain()
        self.conversation_history = []

        # 增强记忆系统
        self.user_preferences = {}  # 用户偏好记忆
        self.task_patterns = {}     # 任务模式记忆
        self.context_keywords = []  # 上下文关键词
        self.session_summary = ""   # 会话摘要

    async def quick_response(self, user_input: str, intent: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        快速响应模式 - 用于聊天和简单问答

        Args:
            user_input: 用户输入
            intent: 已识别的意图
            context: 上下文信息

        Returns:
            快速响应结果
        """
        self.logger.info(f"⚡ [IntelligentPlanner] 快速响应模式: {intent}")

        try:
            # 根据意图选择角色
            role_name = role_template_manager.get_role_by_intent(intent)
            self.logger.info(f"🎭 [IntelligentPlanner] 选择角色: {role_name}")

            # 准备模板变量
            template_vars = {
                'user_input': user_input,
                'domain': context.get('domain', '通用') if context else '通用',
                'context': context.get('background', '无特殊背景') if context else '无特殊背景'
            }

            # 渲染角色模板
            role_prompt = role_template_manager.render_template(role_name, **template_vars)

            # 调用AI生成响应
            ai_response = await AgentFactory.ask_llm(role_prompt)

            # 记录对话历史
            self._add_to_history("user", user_input)
            self._add_to_history("assistant", ai_response)

            return {
                'status': 'success',
                'response_type': 'quick_chat' if intent == 'casual_chat' else 'quick_answer',
                'message': ai_response.strip(),
                'role': role_name,
                'intent': intent,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"❌ [IntelligentPlanner] 快速响应失败: {e}")
            return {
                'status': 'error',
                'message': f"快速响应时发生错误: {str(e)}",
                'timestamp': datetime.now().isoformat()
            }

    async def role_based_response(self, user_input: str, intent: str, context: Optional[Dict] = None, response_mode: str = "quick") -> Dict[str, Any]:
        """
        基于角色模板的统一响应方法

        Args:
            user_input: 用户输入
            intent: 已识别的意图
            context: 上下文信息
            response_mode: 响应模式 ("quick" 或 "deep")

        Returns:
            角色响应结果
        """
        self.logger.info(f"🎭 [IntelligentPlanner] 角色响应模式: {intent} ({response_mode})")

        try:
            # 根据意图选择角色
            role_name = role_template_manager.get_role_by_intent(intent)
            self.logger.info(f"🎭 [IntelligentPlanner] 选择角色: {role_name}")

            # 准备模板变量
            template_vars = {
                'user_input': user_input,
                'domain': context.get('domain', '通用') if context else '通用',
                'context': context.get('background', '无特殊背景') if context else '无特殊背景'
            }

            # 根据响应模式调整模板变量
            if response_mode == "deep":
                # 深度模式需要更多变量
                template_vars.update({
                    'analysis_depth': '详细分析',
                    'output_format': '结构化步骤',
                    'complexity_level': '高'
                })

            # 渲染角色模板
            role_prompt = role_template_manager.render_template(role_name, **template_vars)

            # 调用AI生成响应
            ai_response = await AgentFactory.ask_llm(role_prompt)

            # 记录对话历史
            self._add_to_history("user", user_input)
            self._add_to_history("assistant", ai_response)

            # 根据响应模式确定响应类型
            if response_mode == "quick":
                response_type = 'quick_chat' if intent == 'casual_chat' else 'quick_answer'
            else:
                response_type = 'execution_plan' if intent == 'task_planning' else 'detailed_analysis'

            return {
                'status': 'success',
                'response_type': response_type,
                'message': ai_response.strip(),
                'role': role_name,
                'intent': intent,
                'response_mode': response_mode,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"❌ [IntelligentPlanner] 角色响应失败: {e}")
            return {
                'status': 'error',
                'message': f"角色响应时发生错误: {str(e)}",
                'timestamp': datetime.now().isoformat()
            }

    async def process_user_request(self, user_input: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        处理用户请求的主入口
        
        Args:
            user_input: 用户输入的需求描述
            context: 可选的上下文信息
            
        Returns:
            包含理解结果和执行计划的字典
        """
        self.logger.info(f"🚀 [IntelligentPlanner] 开始处理用户请求: {user_input[:50]}...")
        
        try:
            # 记录对话历史
            self._add_to_history("user", user_input)
            
            # 第一步：深度语义理解
            understanding_result = await self._deep_understand_request(user_input, context)
            
            # 第二步：生成执行计划
            planning_result = await self._generate_execution_plan(user_input, understanding_result)
            
            # 第三步：整合结果
            final_result = await self._integrate_results(user_input, understanding_result, planning_result)
            
            # 记录AI响应
            self._add_to_history("assistant", final_result)
            
            self.logger.info("✅ [IntelligentPlanner] 用户请求处理完成")
            return final_result
            
        except Exception as e:
            self.logger.error(f"❌ [IntelligentPlanner] 处理失败: {e}")
            return {
                'status': 'error',
                'message': f"处理请求时发生错误: {str(e)}",
                'timestamp': datetime.now().isoformat()
            }
    
    async def _deep_understand_request(self, user_input: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """深度理解用户请求"""
        self.logger.debug("🧠 [IntelligentPlanner] 执行深度语义理解...")
        
        # 使用增强的语义理解模块
        understanding_result = await self.semantic_module.analyze_input(
            user_input, 
            context or {}
        )
        
        # 添加对话历史上下文
        if self.conversation_history:
            understanding_result['conversation_context'] = self._get_conversation_context()

        # 添加增强记忆信息
        understanding_result['memory_context'] = await self._get_memory_context(user_input)

        # 更新记忆系统
        await self._update_memory_system(user_input, understanding_result)

        return understanding_result
    
    async def _generate_execution_plan(self, user_input: str, understanding_result: Dict[str, Any]) -> Dict[str, Any]:
        """生成执行计划"""
        self.logger.debug("📋 [IntelligentPlanner] 生成执行计划...")
        
        # 获取意图分析结果
        intent_analysis = understanding_result.get('intent_analysis', {})
        
        # 使用语义理解模块的任务分解功能
        planning_result = await self.semantic_module.decompose_to_steps(user_input, intent_analysis)
        
        return planning_result
    
    async def _integrate_results(self, user_input: str, understanding_result: Dict[str, Any], planning_result: Dict[str, Any]) -> Dict[str, Any]:
        """整合理解结果和规划结果"""
        self.logger.debug("🔗 [IntelligentPlanner] 整合结果...")
        
        # 基础结果结构
        integrated_result = {
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'user_input': user_input,
            'understanding': understanding_result,
            'planning': planning_result
        }
        
        # 根据意图类型和规划类型添加不同的响应
        primary_intent = understanding_result.get('intent_analysis', {}).get('primary_intent', 'unknown')

        if planning_result.get('type') == 'clarification':
            questions = planning_result.get('questions', [])
            self.logger.info(f"🔧 [IntelligentPlanner] 澄清问题数量: {len(questions)}")
            self.logger.info(f"🔧 [IntelligentPlanner] 澄清问题内容: {questions}")
            integrated_result.update({
                'response_type': 'clarification_needed',
                'message': '我需要了解更多信息来为您制定详细计划：',
                'questions': questions,
                'completeness_score': planning_result.get('completeness_score', 0.5)
            })
        elif primary_intent in ['casual_chat', 'question_answer', 'consultation', 'information_query']:
            # 处理非任务规划类型的交互
            integrated_result.update(await self._handle_conversational_intent(
                user_input, primary_intent, understanding_result
            ))
        
        elif planning_result.get('type') == 'steps':
            integrated_result.update({
                'response_type': 'execution_plan',
                'message': '我已经为您制定了详细的执行计划：',
                'steps': planning_result.get('steps', []),
                'summary': self._generate_plan_summary(planning_result)
            })
        
        elif planning_result.get('type') == 'error':
            integrated_result.update({
                'status': 'error',
                'response_type': 'error',
                'message': planning_result.get('message', '处理过程中发生错误')
            })
        
        return integrated_result
    
    def _generate_plan_summary(self, planning_result: Dict[str, Any]) -> Dict[str, Any]:
        """生成计划摘要"""
        steps = planning_result.get('steps', [])
        
        return {
            'total_steps': planning_result.get('total_steps', len(steps)),
            'estimated_time': planning_result.get('estimated_time', '未知'),
            'complexity': planning_result.get('complexity', '中等'),
            'step_names': [step.get('name', f"步骤{step.get('step_id', i+1)}") for i, step in enumerate(steps)]
        }
    
    def _add_to_history(self, role: str, content: Any):
        """添加到对话历史"""
        self.conversation_history.append({
            'role': role,
            'content': content,
            'timestamp': datetime.now().isoformat()
        })
        
        # 保持历史记录在合理范围内
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]
    
    def _get_conversation_context(self) -> List[Dict[str, Any]]:
        """获取对话上下文"""
        return self.conversation_history[-6:]  # 返回最近6轮对话
    
    async def handle_clarification_response(self, user_response: str, previous_context: Dict[str, Any]) -> Dict[str, Any]:
        """处理用户的澄清回复"""
        self.logger.info("🔄 [IntelligentPlanner] 处理澄清回复...")
        
        # 将澄清信息与原始请求合并
        original_request = previous_context.get('user_input', '')
        enhanced_request = f"{original_request}\n\n补充信息：{user_response}"
        
        # 重新处理增强后的请求
        return await self.process_user_request(enhanced_request, previous_context)

    async def _handle_conversational_intent(self, user_input: str, intent_type: str, understanding_result: Dict[str, Any]) -> Dict[str, Any]:
        """处理对话类意图"""
        self.logger.info(f"🗣️ [IntelligentPlanner] 处理对话类意图: {intent_type}")

        try:
            if intent_type == 'casual_chat':
                return await self._handle_casual_chat(user_input, understanding_result)
            elif intent_type == 'question_answer':
                return await self._handle_question_answer(user_input, understanding_result)
            elif intent_type == 'consultation':
                return await self._handle_consultation(user_input, understanding_result)
            elif intent_type == 'information_query':
                return await self._handle_information_query(user_input, understanding_result)
            else:
                return await self._handle_general_conversation(user_input, understanding_result)

        except Exception as e:
            self.logger.error(f"处理对话意图失败: {e}")
            return {
                'response_type': 'conversation',
                'message': '我理解您的意思，让我来帮助您。',
                'data': {'intent': intent_type}
            }

    async def _handle_casual_chat(self, user_input: str, understanding_result: Dict[str, Any]) -> Dict[str, Any]:
        """处理闲聊"""
        emotion = understanding_result.get('emotion_analysis', {}).get('emotion_type', 'neutral')

        chat_prompt = f"""
        用户说：{user_input}
        情感类型：{emotion}

        请以友好、自然的方式回复，保持对话的连贯性。
        回复要简洁、温暖，符合中文表达习惯。
        """

        response = await AgentFactory.ask_llm(chat_prompt)

        return {
            'response_type': 'conversation',
            'message': response.strip(),
            'data': {
                'intent': 'casual_chat',
                'emotion': emotion,
                'conversation_type': 'friendly_chat'
            }
        }

    async def _handle_question_answer(self, user_input: str, understanding_result: Dict[str, Any]) -> Dict[str, Any]:
        """处理问答"""
        keywords = understanding_result.get('surface_analysis', {}).get('keywords', [])

        qa_prompt = f"""
        用户问题：{user_input}
        关键词：{', '.join(keywords)}

        请提供准确、有用的答案。如果问题涉及专业知识，请给出详细解释。
        如果不确定答案，请诚实说明并提供可能的方向。
        """

        response = await AgentFactory.ask_llm(qa_prompt)

        return {
            'response_type': 'answer',
            'message': response.strip(),
            'data': {
                'intent': 'question_answer',
                'keywords': keywords,
                'answer_type': 'informative'
            }
        }

    async def _handle_consultation(self, user_input: str, understanding_result: Dict[str, Any]) -> Dict[str, Any]:
        """处理咨询建议"""
        complexity = understanding_result.get('complexity_score', 0.5)

        consultation_prompt = f"""
        用户咨询：{user_input}
        复杂度：{complexity}

        请提供专业、实用的建议。考虑多个角度，给出具体可行的方案。
        如果需要更多信息才能给出准确建议，请说明需要了解哪些方面。
        """

        response = await AgentFactory.ask_llm(consultation_prompt)

        return {
            'response_type': 'consultation',
            'message': response.strip(),
            'data': {
                'intent': 'consultation',
                'complexity': complexity,
                'advice_type': 'professional'
            }
        }

    async def _handle_information_query(self, user_input: str, understanding_result: Dict[str, Any]) -> Dict[str, Any]:
        """处理信息查询"""
        entities = understanding_result.get('surface_analysis', {}).get('entities', [])

        query_prompt = f"""
        用户查询：{user_input}
        相关实体：{', '.join(entities)}

        请提供相关信息。如果是具体的事实查询，请给出准确信息。
        如果是概念解释，请用通俗易懂的语言说明。
        """

        response = await AgentFactory.ask_llm(query_prompt)

        return {
            'response_type': 'information',
            'message': response.strip(),
            'data': {
                'intent': 'information_query',
                'entities': entities,
                'query_type': 'factual'
            }
        }

    async def _handle_general_conversation(self, user_input: str, understanding_result: Dict[str, Any]) -> Dict[str, Any]:
        """处理一般对话"""
        return {
            'response_type': 'conversation',
            'message': '我理解您的意思，有什么我可以帮助您的吗？',
            'data': {
                'intent': 'general',
                'conversation_type': 'open'
            }
        }
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """获取对话历史"""
        return self.conversation_history.copy()
    
    def clear_conversation_history(self):
        """清空对话历史"""
        self.conversation_history.clear()
        self.logger.info("🗑️ [IntelligentPlanner] 对话历史已清空")

    async def _get_memory_context(self, user_input: str) -> Dict[str, Any]:
        """获取记忆上下文信息"""
        memory_context = {
            'user_preferences': self.user_preferences,
            'recent_patterns': self._get_recent_task_patterns(),
            'context_keywords': self.context_keywords[-10:],  # 最近10个关键词
            'session_summary': self.session_summary
        }

        # 检测上下文引用
        context_references = await self._detect_context_references(user_input)
        if context_references:
            memory_context['references'] = context_references

        return memory_context

    async def _update_memory_system(self, user_input: str, understanding_result: Dict[str, Any]):
        """更新记忆系统"""
        try:
            # 1. 提取并更新用户偏好
            await self._extract_user_preferences(user_input, understanding_result)

            # 2. 记录任务模式
            await self._record_task_pattern(user_input, understanding_result)

            # 3. 更新上下文关键词
            await self._update_context_keywords(user_input)

            # 4. 更新会话摘要
            await self._update_session_summary(user_input, understanding_result)

        except Exception as e:
            self.logger.error(f"更新记忆系统失败: {e}")

    async def _detect_context_references(self, user_input: str) -> List[Dict[str, Any]]:
        """检测上下文引用"""
        references = []

        # 检测指代词
        pronouns = ['这个', '那个', '它', '这', '那', '上面的', '前面的', '刚才的']
        for pronoun in pronouns:
            if pronoun in user_input:
                # 查找最近相关的内容
                recent_content = self._find_recent_relevant_content(pronoun)
                if recent_content:
                    references.append({
                        'type': 'pronoun_reference',
                        'pronoun': pronoun,
                        'refers_to': recent_content
                    })

        # 检测任务延续
        continuation_words = ['继续', '接着', '然后', '下一步', '基于此']
        for word in continuation_words:
            if word in user_input:
                last_task = self._get_last_task_context()
                if last_task:
                    references.append({
                        'type': 'task_continuation',
                        'keyword': word,
                        'previous_task': last_task
                    })

        return references

    def _find_recent_relevant_content(self, pronoun: str) -> Optional[Dict[str, Any]]:
        """查找最近相关的内容"""
        # 从最近的对话中查找可能被引用的内容
        for i in range(len(self.conversation_history) - 1, -1, -1):
            entry = self.conversation_history[i]
            if entry['role'] == 'assistant' and isinstance(entry['content'], dict):
                if 'steps' in entry['content']:
                    return {
                        'type': 'task_steps',
                        'content': entry['content']['steps'][:3],  # 前3个步骤
                        'timestamp': entry['timestamp']
                    }
        return None

    def _get_last_task_context(self) -> Optional[Dict[str, Any]]:
        """获取最后一个任务的上下文"""
        for i in range(len(self.conversation_history) - 1, -1, -1):
            entry = self.conversation_history[i]
            if entry['role'] == 'assistant' and isinstance(entry['content'], dict):
                if entry['content'].get('response_type') == 'execution_plan':
                    return {
                        'task_type': entry['content'].get('understanding', {}).get('intent_analysis', {}).get('primary_intent'),
                        'steps_count': len(entry['content'].get('steps', [])),
                        'timestamp': entry['timestamp']
                    }
        return None

    async def _extract_user_preferences(self, user_input: str, understanding_result: Dict[str, Any]):
        """提取并更新用户偏好"""
        try:
            # 提取偏好的提示词
            preference_prompt = f"""
            从以下用户输入中提取用户偏好信息：

            用户输入：{user_input}
            意图分析：{understanding_result.get('intent_analysis', {})}

            请识别以下类型的偏好：
            1. 工作风格偏好（详细/简洁、快速/仔细等）
            2. 输出格式偏好（图表/文字、步骤数量等）
            3. 工具偏好（特定软件、平台等）
            4. 质量要求偏好（高质量/快速完成等）

            如果没有明显偏好，返回空字典。
            返回JSON格式：{{"preference_type": "preference_value"}}
            """

            response = await AgentFactory.ask_llm(preference_prompt)

            # 尝试解析JSON
            import json
            try:
                preferences = json.loads(response)
                if isinstance(preferences, dict):
                    # 更新用户偏好
                    for key, value in preferences.items():
                        self.user_preferences[key] = value
                        self.logger.debug(f"更新用户偏好: {key} = {value}")
            except json.JSONDecodeError:
                pass

        except Exception as e:
            self.logger.error(f"提取用户偏好失败: {e}")

    async def _record_task_pattern(self, user_input: str, understanding_result: Dict[str, Any]):
        """记录任务模式"""
        try:
            intent = understanding_result.get('intent_analysis', {}).get('primary_intent', 'unknown')

            if intent not in self.task_patterns:
                self.task_patterns[intent] = {
                    'count': 0,
                    'common_keywords': [],
                    'typical_complexity': 'medium',
                    'last_seen': datetime.now().isoformat()
                }

            # 更新模式信息
            self.task_patterns[intent]['count'] += 1
            self.task_patterns[intent]['last_seen'] = datetime.now().isoformat()

            # 提取关键词
            keywords = user_input.lower().split()
            for keyword in keywords:
                if len(keyword) > 2 and keyword not in self.task_patterns[intent]['common_keywords']:
                    self.task_patterns[intent]['common_keywords'].append(keyword)

            # 保持关键词数量在合理范围
            if len(self.task_patterns[intent]['common_keywords']) > 10:
                self.task_patterns[intent]['common_keywords'] = self.task_patterns[intent]['common_keywords'][-10:]

        except Exception as e:
            self.logger.error(f"记录任务模式失败: {e}")

    async def _update_context_keywords(self, user_input: str):
        """更新上下文关键词"""
        try:
            # 提取关键词的简单实现
            import re
            words = re.findall(r'\b\w{2,}\b', user_input.lower())

            # 过滤常见词汇
            stop_words = {'我', '你', '他', '她', '它', '的', '了', '在', '是', '有', '和', '与', '或', '但', '如果', '因为', '所以'}
            keywords = [word for word in words if word not in stop_words and len(word) > 1]

            # 添加到上下文关键词
            self.context_keywords.extend(keywords)

            # 保持关键词数量在合理范围
            if len(self.context_keywords) > 50:
                self.context_keywords = self.context_keywords[-50:]

        except Exception as e:
            self.logger.error(f"更新上下文关键词失败: {e}")

    async def _update_session_summary(self, user_input: str, understanding_result: Dict[str, Any]):
        """更新会话摘要"""
        try:
            if len(self.conversation_history) % 5 == 0:  # 每5轮对话更新一次摘要
                summary_prompt = f"""
                基于以下对话历史，生成简洁的会话摘要：

                当前摘要：{self.session_summary}
                最新用户输入：{user_input}
                主要意图：{understanding_result.get('intent_analysis', {}).get('primary_intent')}

                请生成一个简洁的摘要（不超过100字），包含：
                1. 用户的主要需求类型
                2. 讨论的关键话题
                3. 用户的偏好特点

                只返回摘要文本，不要其他内容。
                """

                response = await AgentFactory.ask_llm(summary_prompt)
                self.session_summary = response.strip()
                self.logger.debug(f"更新会话摘要: {self.session_summary}")

        except Exception as e:
            self.logger.error(f"更新会话摘要失败: {e}")

    def _get_recent_task_patterns(self) -> Dict[str, Any]:
        """获取最近的任务模式"""
        # 返回最近使用的任务模式
        recent_patterns = {}
        for intent, pattern in self.task_patterns.items():
            if pattern['count'] > 0:
                recent_patterns[intent] = {
                    'count': pattern['count'],
                    'keywords': pattern['common_keywords'][-5:],  # 最近5个关键词
                    'last_seen': pattern['last_seen']
                }
        return recent_patterns

    def get_memory_summary(self) -> Dict[str, Any]:
        """获取记忆系统摘要"""
        return {
            'conversation_turns': len(self.conversation_history),
            'user_preferences': self.user_preferences,
            'task_patterns': self._get_recent_task_patterns(),
            'context_keywords_count': len(self.context_keywords),
            'session_summary': self.session_summary,
            'memory_updated': datetime.now().isoformat()
        }


# 工厂函数
def create_intelligent_planner() -> IntelligentPlanner:
    """创建智能规划器实例"""
    return IntelligentPlanner()


# 便捷函数
async def plan_user_request(user_input: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    """便捷函数：规划用户请求"""
    planner = create_intelligent_planner()
    return await planner.process_user_request(user_input, context)
