"""
AI模型集成模块
集成多种AI模型API，提供真正的智能对话和分析能力
支持智能模式检测和自适应处理策略
"""

import logging
import asyncio
import os
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import aiohttp
from datetime import datetime

# 导入现有系统组件
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agent_system.agent_factory import AgentFactory

# 导入智能模式检测器
from .mode_detection.integration import get_mode_detection_service, detect_processing_mode


class AIProvider(Enum):
    """AI服务提供商"""
    DEEPSEEK = "deepseek"
    QWEN = "qwen"
    ZHIPU = "zhipu"
    BAIDU = "baidu"
    MOONSHOT = "moonshot"
    DOUBAO = "doubao"
    OPENAI = "openai"
    CLAUDE = "claude"


@dataclass
class AIResponse:
    """AI响应数据结构"""
    content: str
    confidence: float
    provider: str
    model: str
    tokens_used: int
    response_time: float
    metadata: Dict[str, Any]


class IntelligentAIIntegration:
    """
    智能AI集成系统
    
    提供多种AI模型的统一接口，实现：
    1. 多模型支持和自动切换
    2. 智能提示词工程
    3. 响应质量评估
    4. 错误处理和重试
    5. 成本优化
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.providers = {}
        self.current_provider = AIProvider.DEEPSEEK
        self.is_initialized = False
        
        # 配置信息
        self.api_keys = {
            'deepseek': os.getenv('DEEPSEEK_API_KEY'),
            'qwen': os.getenv('QWEN_API_KEY'),
            'zhipu': os.getenv('ZHIPU_API_KEY'),
            'baidu': os.getenv('BAIDU_API_KEY'),
            'moonshot': os.getenv('MOONSHOT_API_KEY'),
            'doubao': os.getenv('DOUBAO_API_KEY'),
            'openai': os.getenv('OPENAI_API_KEY'),
            'claude': os.getenv('CLAUDE_API_KEY')
        }
        
        # 模型配置
        self.model_configs = {
            AIProvider.DEEPSEEK: {
                'model': 'deepseek-chat',
                'max_tokens': 4000,
                'temperature': 0.7,
                'cost_per_1k': 0.001
            },
            AIProvider.QWEN: {
                'model': 'qwen-turbo',
                'max_tokens': 4000,
                'temperature': 0.7,
                'cost_per_1k': 0.0005
            },
            AIProvider.ZHIPU: {
                'model': 'glm-4',
                'max_tokens': 4000,
                'temperature': 0.7,
                'cost_per_1k': 0.001
            },
            AIProvider.BAIDU: {
                'model': 'ernie-4.0-8k',
                'max_tokens': 4000,
                'temperature': 0.7,
                'cost_per_1k': 0.0008
            },
            AIProvider.MOONSHOT: {
                'model': 'moonshot-v1-8k',
                'max_tokens': 4000,
                'temperature': 0.7,
                'cost_per_1k': 0.0012
            },
            AIProvider.DOUBAO: {
                'model': 'doubao-lite-4k',
                'max_tokens': 4000,
                'temperature': 0.7,
                'cost_per_1k': 0.0005
            },
            AIProvider.OPENAI: {
                'model': 'gpt-3.5-turbo',
                'max_tokens': 4000,
                'temperature': 0.7,
                'cost_per_1k': 0.002
            }
        }

        # 智能模式检测服务
        self.mode_detection_service = None
        self.mode_detection_enabled = True
    
    async def initialize(self):
        """初始化AI集成系统"""
        if self.is_initialized:
            return

        self.logger.info("🤖 [AIIntegration] 初始化AI集成系统...")

        try:
            # 检查可用的API密钥
            available_providers = []
            for provider, api_key in self.api_keys.items():
                if api_key:
                    available_providers.append(provider)
                    self.logger.info(f"✅ [AIIntegration] {provider} API密钥已配置")
                else:
                    self.logger.warning(f"⚠️ [AIIntegration] {provider} API密钥未配置")

            if not available_providers:
                raise RuntimeError("❌ 系统启动失败：未配置有效的AI API密钥！请添加 DEEPSEEK_API_KEY 或 OPENAI_API_KEY 环境变量")
            else:
                # 选择最优的提供商
                self.current_provider = self._select_best_provider(available_providers)
                self.logger.info(f"🎯 [AIIntegration] 选择AI提供商: {self.current_provider.value}")

            # 初始化智能模式检测服务
            if self.mode_detection_enabled:
                try:
                    self.mode_detection_service = get_mode_detection_service(self)
                    await self.mode_detection_service.initialize()
                    self.logger.info("🧠 [AIIntegration] 智能模式检测服务已启用")
                except Exception as e:
                    self.logger.warning(f"⚠️ [AIIntegration] 模式检测服务初始化失败: {e}")
                    self.mode_detection_enabled = False

            self.is_initialized = True
            self.logger.info("✅ [AIIntegration] AI集成系统初始化完成")

        except Exception as e:
            self.logger.error(f"❌ [AIIntegration] 初始化失败: {e}")
            raise
    
    async def generate_intelligent_response(self,
                                          user_input: str,
                                          context: Dict[str, Any] = None,
                                          response_type: str = "conversational",
                                          user_preferred_mode: str = None) -> AIResponse:
        """
        生成智能响应（支持智能模式检测）

        Args:
            user_input: 用户输入
            context: 上下文信息
            response_type: 响应类型 (conversational, analytical, creative, technical)
            user_preferred_mode: 用户指定的处理模式 (daily/professional)
        """
        if not self.is_initialized:
            await self.initialize()

        self.logger.info(f"🧠 [AIIntegration] 生成智能响应: {user_input[:50]}...")

        try:
            # 智能模式检测
            processing_mode = "daily"  # 默认模式
            mode_confidence = 0.5
            mode_reasoning = "默认日常模式"
            detection_id = None

            if user_preferred_mode:
                # 用户指定模式
                processing_mode = user_preferred_mode
                mode_confidence = 1.0
                mode_reasoning = "用户指定模式"
                self.logger.info(f"👤 [AIIntegration] 用户指定模式: {processing_mode}")
            elif self.mode_detection_enabled and self.mode_detection_service:
                # 自动检测模式（默认使用auto模式进行智能检测）
                try:
                    mode_result = await self.mode_detection_service.detect_user_mode(
                        user_input, context, user_mode_preference="auto"
                    )
                    if mode_result["success"]:
                        processing_mode = mode_result["mode"]
                        mode_confidence = mode_result["confidence"]
                        mode_reasoning = mode_result["reasoning"]
                        detection_id = mode_result["detection_id"]
                        mode_source = mode_result.get("mode_source", "auto_detected")
                        self.logger.info(f"🎯 [AIIntegration] 检测到模式: {processing_mode} (置信度: {mode_confidence:.2f}, 来源: {mode_source})")
                    else:
                        self.logger.warning(f"⚠️ [AIIntegration] 模式检测失败: {mode_result.get('error', 'unknown')}")
                except Exception as e:
                    self.logger.warning(f"⚠️ [AIIntegration] 模式检测异常: {e}")

            # 根据检测模式调整上下文
            enhanced_context = context.copy() if context else {}
            enhanced_context.update({
                "processing_mode": processing_mode,
                "mode_confidence": mode_confidence,
                "mode_reasoning": mode_reasoning,
                "detection_id": detection_id
            })

            # 构建智能提示词
            prompt = await self._build_intelligent_prompt(user_input, enhanced_context, response_type)

            # 调用AI模型
            start_time = datetime.now()

            response_content = await self._call_ai_api(prompt)

            response_time = (datetime.now() - start_time).total_seconds()

            # 评估响应质量
            confidence = await self._evaluate_response_quality(response_content, user_input)

            return AIResponse(
                content=response_content,
                confidence=confidence,
                provider=self.current_provider.value,
                model=self.model_configs.get(self.current_provider.value, {}).get('model', 'unknown'),
                tokens_used=len(response_content.split()) * 1.3 if response_content else 0,  # 估算
                response_time=response_time,
                metadata={
                    'response_type': response_type,
                    'context_used': bool(context),
                    'prompt_length': len(prompt),
                    'processing_mode': processing_mode,
                    'mode_confidence': mode_confidence,
                    'mode_reasoning': mode_reasoning,
                    'detection_id': detection_id
                }
            )

        except Exception as e:
            self.logger.error(f"❌ [AIIntegration] 生成响应失败: {e}")
            # 返回备用响应
            return await self._generate_fallback_response(user_input, context)
    
    async def _build_intelligent_prompt(self,
                                      user_input: str,
                                      context: Dict[str, Any],
                                      response_type: str) -> str:
        """构建智能提示词（支持模式感知）"""

        # 获取处理模式
        processing_mode = context.get("processing_mode", "daily")
        mode_confidence = context.get("mode_confidence", 0.5)

        # 根据处理模式构建不同的系统提示
        if processing_mode == "professional":
            system_prompt = """你是一个专业的企业级AI顾问，具备以下特质：
1. 严谨专业的分析能力和权威性
2. 系统性思考和全面考虑问题
3. 使用准确的专业术语和标准化表达
4. 提供企业级标准的解决方案
5. 确保内容的准确性和可靠性

处理原则：
- 企业标准：符合正式商务规范和企业级要求
- 系统完整：全面分析各个方面，不遗漏要点
- 专业权威：使用专业术语，提供权威可信的建议
- 质量保证：确保内容的准确性和专业性
- 合规安全：遵循相关法规和标准

请提供高质量的专业回答。"""
        else:
            system_prompt = """你是一个友好实用的日常工作助手，具备以下特质：
1. 亲切友好的交流方式和实用导向
2. 快速高效地解决实际问题
3. 简洁明了的表达和易于理解
4. 重点突出，避免过度复杂化
5. 提供可立即执行的建议

处理原则：
- 够用就行：包含必要信息，不过度复杂
- 快速高效：直接明了，便于理解和执行
- 实用导向：重点突出，解决实际问题
- 友好专业：语调适中，不过分正式
- 互动性强：鼓励进一步交流和反馈

请提供实用高效的回答。"""

        # 根据响应类型调整提示词
        if processing_mode == "professional":
            type_prompts = {
                "conversational": "请以正式、专业的方式回应，确保内容的权威性。",
                "analytical": "请提供深入的专业分析，包含理论支撑和系统性见解。",
                "creative": "请提供创新但专业的解决方案，确保可行性和专业性。",
                "technical": "请提供企业级的技术解答，包含详细的实施方案和标准。"
            }
        else:
            type_prompts = {
                "conversational": "请以轻松、友好的对话方式回应。",
                "analytical": "请提供实用的分析和见解，重点突出关键要点。",
                "creative": "请发挥创造力，提供简单易行的创新想法。",
                "technical": "请提供实用的技术解答，包含具体的操作步骤。"
            }

        prompt = f"{system_prompt}\n\n{type_prompts.get(response_type, '')}\n\n"

        # 添加模式信息
        if mode_confidence > 0.8:
            prompt += f"检测到的处理模式：{processing_mode}（高置信度）\n"
        elif mode_confidence > 0.6:
            prompt += f"检测到的处理模式：{processing_mode}（中等置信度）\n"
        else:
            prompt += f"使用默认处理模式：{processing_mode}\n"

        # 添加上下文信息（排除模式检测相关信息）
        if context:
            filtered_context = {k: v for k, v in context.items()
                              if k not in ["processing_mode", "mode_confidence", "mode_reasoning", "detection_id"]}
            if filtered_context:
                prompt += f"上下文信息：{json.dumps(filtered_context, ensure_ascii=False)}\n\n"

        prompt += f"用户输入：{user_input}\n\n请提供回答："

        return prompt

    async def record_mode_feedback(self, detection_id: str, user_choice: str, satisfaction: int = None, comments: str = None) -> bool:
        """记录用户对模式选择的反馈"""

        if not self.mode_detection_enabled or not self.mode_detection_service:
            return False

        try:
            return await self.mode_detection_service.record_user_choice(
                detection_id, user_choice, satisfaction, comments
            )
        except Exception as e:
            self.logger.warning(f"⚠️ [AIIntegration] 记录模式反馈失败: {e}")
            return False

    async def get_mode_detection_stats(self) -> Dict[str, Any]:
        """获取模式检测统计信息"""

        if not self.mode_detection_enabled or not self.mode_detection_service:
            return {"enabled": False}

        try:
            stats = await self.mode_detection_service.get_detection_stats()
            stats["enabled"] = True
            return stats
        except Exception as e:
            self.logger.warning(f"⚠️ [AIIntegration] 获取模式检测统计失败: {e}")
            return {"enabled": True, "error": str(e)}

    def toggle_mode_detection(self, enabled: bool) -> None:
        """启用或禁用模式检测"""

        self.mode_detection_enabled = enabled
        self.logger.info(f"🎯 [AIIntegration] 模式检测已{'启用' if enabled else '禁用'}")

    async def get_supported_modes(self) -> Dict[str, Any]:
        """获取支持的模式列表"""

        if not self.mode_detection_enabled or not self.mode_detection_service:
            return {"enabled": False}

        try:
            return await self.mode_detection_service.get_supported_modes()
        except Exception as e:
            self.logger.warning(f"⚠️ [AIIntegration] 获取支持模式失败: {e}")
            return {"error": str(e)}

    async def get_mode_info(self, mode: str) -> Dict[str, Any]:
        """获取特定模式的信息"""

        if not self.mode_detection_enabled or not self.mode_detection_service:
            return {"enabled": False}

        try:
            return await self.mode_detection_service.get_mode_info(mode)
        except Exception as e:
            self.logger.warning(f"⚠️ [AIIntegration] 获取模式信息失败: {e}")
            return {"error": str(e)}

    async def is_mode_enabled(self, mode: str) -> bool:
        """检查模式是否启用"""

        if not self.mode_detection_enabled or not self.mode_detection_service:
            return False

        try:
            return await self.mode_detection_service.is_mode_enabled(mode)
        except Exception as e:
            self.logger.warning(f"⚠️ [AIIntegration] 检查模式状态失败: {e}")
            return False

    async def _call_ai_api(self, prompt: str) -> str:
        """调用AI API"""
        try:
            # 使用现有的AgentFactory
            response = await AgentFactory.ask_llm(prompt)
            
            # 检查响应是否有效
            if "[占位符回应]" in response or "[错误]" in response:
                raise Exception("AI API不可用")
            
            return response
            
        except Exception as e:
            self.logger.error(f"❌ [AIIntegration] AI API调用失败: {e}")
            raise
    

    
    async def _evaluate_response_quality(self, response: str, user_input: str) -> float:
        """评估响应质量"""
        try:
            # 基础质量指标
            quality_score = 0.5
            
            # 长度合理性
            if 20 <= len(response) <= 1000:
                quality_score += 0.2
            
            # 相关性检查（简单关键词匹配）
            user_keywords = set(user_input.lower().split())
            response_keywords = set(response.lower().split())
            relevance = len(user_keywords & response_keywords) / max(len(user_keywords), 1)
            quality_score += relevance * 0.2
            
            # 完整性检查
            if not any(phrase in response for phrase in ['[占位符', '[错误', '失败', '无法']):
                quality_score += 0.1
            
            return min(1.0, quality_score)
            
        except Exception:
            return 0.5
    
    async def _generate_fallback_response(self, user_input: str, context: Dict[str, Any]) -> AIResponse:
        """生成备用响应"""
        raise RuntimeError("❌ AI API调用失败且无备用方案，请检查网络连接和API密钥配置")
        
        return AIResponse(
            content=fallback_content,
            confidence=0.3,
            provider="fallback",
            model="local",
            tokens_used=len(fallback_content.split()) if fallback_content else 0,
            response_time=0.1,
            metadata={'is_fallback': True}
        )
    
    def _select_best_provider(self, available_providers: List[str]) -> AIProvider:
        """选择最佳的AI提供商"""
        # 优先级排序 - 国内AI服务商优先
        priority = ['deepseek', 'qwen', 'zhipu', 'moonshot', 'doubao', 'baidu', 'openai', 'claude']

        for provider in priority:
            if provider in available_providers:
                return AIProvider(provider)

        return AIProvider.LOCAL
