#!/usr/bin/env python3
"""
混合意图检测器 - 本地模型 + 云端模型
结合本地快速检测和云端精确分析
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum
import json
import re

class IntentType(Enum):
    """意图类型"""
    CHAT = "chat"                    # 聊天对话
    MINDMAP = "mindmap"             # 思维导图
    WORKFLOW = "workflow"           # 工作流
    ANALYSIS = "analysis"           # 分析任务
    CREATION = "creation"           # 创作任务
    QUESTION = "question"           # 问题询问
    UNKNOWN = "unknown"             # 未知意图

class ConfidenceLevel(Enum):
    """置信度等级"""
    VERY_HIGH = "very_high"         # 0.9+
    HIGH = "high"                   # 0.7-0.9
    MEDIUM = "medium"               # 0.5-0.7
    LOW = "low"                     # 0.3-0.5
    VERY_LOW = "very_low"           # <0.3

@dataclass
class IntentResult:
    """意图检测结果"""
    intent: IntentType
    confidence: float
    confidence_level: ConfidenceLevel
    source: str                     # 检测来源：local/cloud/hybrid
    reasoning: str                  # 推理过程
    processing_time: float          # 处理时间
    fallback_used: bool = False     # 是否使用了回退策略
    metadata: Dict[str, Any] = None

class LocalIntentDetector:
    """本地意图检测器 - 快速但简单"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._init_patterns()
    
    def _init_patterns(self):
        """初始化关键词模式"""
        self.patterns = {
            IntentType.MINDMAP: [
                r'思维导图|脑图|mind\s*map',
                r'创建|制作|生成|画.*图',
                r'整理.*思路|梳理.*逻辑',
                r'规划|计划.*结构'
            ],
            IntentType.WORKFLOW: [
                r'工作流|流程|workflow',
                r'步骤|流程图|操作.*顺序',
                r'自动化|批处理'
            ],
            IntentType.ANALYSIS: [
                r'分析|解析|研究',
                r'评估|评价|对比',
                r'统计|数据.*分析'
            ],
            IntentType.CREATION: [
                r'写|创作|编写',
                r'设计|制作.*文档',
                r'生成.*内容|创建.*文件'
            ],
            IntentType.QUESTION: [
                r'\?|？|什么|怎么|为什么|如何',
                r'请问|想知道|能否.*解释'
            ],
            IntentType.CHAT: [
                r'你好|hello|hi|谢谢|再见',
                r'聊天|闲聊|随便.*说'
            ]
        }
    
    async def detect(self, text: str, context: Dict[str, Any] = None) -> IntentResult:
        """本地快速检测"""
        start_time = time.time()
        
        text_lower = text.lower()
        intent_scores = {}
        
        # 关键词匹配
        for intent_type, patterns in self.patterns.items():
            score = 0
            matched_patterns = []
            
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    score += 1
                    matched_patterns.append(pattern)
            
            if score > 0:
                intent_scores[intent_type] = {
                    'score': score,
                    'patterns': matched_patterns
                }
        
        # 长度启发式
        if len(text) > 100:
            intent_scores.setdefault(IntentType.MINDMAP, {'score': 0, 'patterns': []})
            intent_scores[IntentType.MINDMAP]['score'] += 0.5
        
        if len(text) < 20:
            intent_scores.setdefault(IntentType.CHAT, {'score': 0, 'patterns': []})
            intent_scores[IntentType.CHAT]['score'] += 0.3
        
        # 确定最佳意图
        if not intent_scores:
            intent = IntentType.UNKNOWN
            confidence = 0.1
            reasoning = "无匹配模式"
        else:
            best_intent = max(intent_scores.keys(), key=lambda x: intent_scores[x]['score'])
            max_score = intent_scores[best_intent]['score']
            
            intent = best_intent
            confidence = min(0.85, max_score * 0.3 + 0.4)  # 本地检测最高0.85
            reasoning = f"匹配模式: {intent_scores[best_intent]['patterns']}"
        
        # 确定置信度等级
        if confidence >= 0.8:
            conf_level = ConfidenceLevel.HIGH
        elif confidence >= 0.6:
            conf_level = ConfidenceLevel.MEDIUM
        elif confidence >= 0.4:
            conf_level = ConfidenceLevel.LOW
        else:
            conf_level = ConfidenceLevel.VERY_LOW
        
        processing_time = time.time() - start_time
        
        return IntentResult(
            intent=intent,
            confidence=confidence,
            confidence_level=conf_level,
            source="local",
            reasoning=reasoning,
            processing_time=processing_time,
            metadata={'scores': intent_scores}
        )

class CloudIntentDetector:
    """云端意图检测器 - 精确但较慢"""
    
    def __init__(self, api_client=None):
        self.logger = logging.getLogger(__name__)
        self.api_client = api_client
        self.available = api_client is not None
    
    async def detect(self, text: str, context: Dict[str, Any] = None) -> IntentResult:
        """云端精确检测"""
        start_time = time.time()
        
        if not self.available:
            raise Exception("云端API不可用")
        
        try:
            # 构建提示词
            prompt = self._build_prompt(text, context)
            
            # 调用云端API
            response = await self._call_cloud_api(prompt)
            
            # 解析响应
            result = self._parse_response(response)
            
            processing_time = time.time() - start_time
            
            return IntentResult(
                intent=result['intent'],
                confidence=result['confidence'],
                confidence_level=result['confidence_level'],
                source="cloud",
                reasoning=result['reasoning'],
                processing_time=processing_time,
                metadata=result.get('metadata', {})
            )
            
        except Exception as e:
            self.logger.error(f"云端检测失败: {e}")
            raise
    
    def _build_prompt(self, text: str, context: Dict[str, Any] = None) -> str:
        """构建云端API提示词"""
        prompt = f"""
请分析以下用户输入的意图，从这些类别中选择最合适的：
- chat: 日常聊天、问候、感谢等
- mindmap: 创建思维导图、整理思路、结构化信息
- workflow: 工作流程、步骤规划、自动化任务
- analysis: 数据分析、评估、研究
- creation: 创作文档、设计内容、生成材料
- question: 询问问题、寻求解释

用户输入: "{text}"

请以JSON格式返回结果：
{{
    "intent": "意图类型",
    "confidence": 0.95,
    "reasoning": "判断理由"
}}
"""
        return prompt
    
    async def _call_cloud_api(self, prompt: str) -> str:
        """调用云端API"""
        if self.api_client:
            try:
                # 调用实际的API客户端
                response = await self.api_client.generate_response(prompt)
                return response
            except Exception as e:
                self.logger.error(f"云端API调用失败: {e}")
                raise
        else:
            # 模拟响应用于测试
            await asyncio.sleep(0.5)  # 模拟网络延迟
            return '{"intent": "mindmap", "confidence": 0.92, "reasoning": "用户明确提到创建思维导图"}'
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """解析云端响应"""
        try:
            data = json.loads(response)
            
            intent_str = data.get('intent', 'unknown')
            intent = IntentType(intent_str) if intent_str in [e.value for e in IntentType] else IntentType.UNKNOWN
            
            confidence = float(data.get('confidence', 0.5))
            
            if confidence >= 0.9:
                conf_level = ConfidenceLevel.VERY_HIGH
            elif confidence >= 0.7:
                conf_level = ConfidenceLevel.HIGH
            elif confidence >= 0.5:
                conf_level = ConfidenceLevel.MEDIUM
            elif confidence >= 0.3:
                conf_level = ConfidenceLevel.LOW
            else:
                conf_level = ConfidenceLevel.VERY_LOW
            
            return {
                'intent': intent,
                'confidence': confidence,
                'confidence_level': conf_level,
                'reasoning': data.get('reasoning', '云端分析结果'),
                'metadata': data
            }
            
        except Exception as e:
            self.logger.error(f"解析云端响应失败: {e}")
            return {
                'intent': IntentType.UNKNOWN,
                'confidence': 0.1,
                'confidence_level': ConfidenceLevel.VERY_LOW,
                'reasoning': f'响应解析失败: {e}',
                'metadata': {}
            }

class HybridIntentDetector:
    """混合意图检测器 - 主控制器"""
    
    def __init__(self, cloud_api_client=None):
        self.logger = logging.getLogger(__name__)
        self.local_detector = LocalIntentDetector()
        self.cloud_detector = CloudIntentDetector(cloud_api_client)
        
        # 配置参数
        self.local_confidence_threshold = 0.8  # 本地检测置信度阈值
        self.cloud_timeout = 3.0               # 云端检测超时时间
        self.enable_cloud_fallback = True      # 启用云端回退
    
    async def detect(self, text: str, context: Dict[str, Any] = None) -> IntentResult:
        """混合检测策略"""
        self.logger.info(f"🎯 开始混合意图检测: {text[:50]}...")
        
        # 第一步：本地快速检测
        local_result = await self.local_detector.detect(text, context)
        self.logger.info(f"📱 本地检测: {local_result.intent.value} (置信度: {local_result.confidence:.2f})")
        
        # 如果本地检测置信度很高，直接返回
        if local_result.confidence >= self.local_confidence_threshold:
            self.logger.info("✅ 本地检测置信度高，直接采用")
            local_result.source = "hybrid_local"
            return local_result
        
        # 第二步：云端精确检测
        if self.enable_cloud_fallback and self.cloud_detector.available:
            try:
                self.logger.info("☁️ 启动云端精确检测...")
                cloud_result = await asyncio.wait_for(
                    self.cloud_detector.detect(text, context),
                    timeout=self.cloud_timeout
                )
                
                self.logger.info(f"☁️ 云端检测: {cloud_result.intent.value} (置信度: {cloud_result.confidence:.2f})")
                
                # 融合本地和云端结果
                final_result = self._fuse_results(local_result, cloud_result)
                self.logger.info(f"🔀 融合结果: {final_result.intent.value} (置信度: {final_result.confidence:.2f})")
                
                return final_result
                
            except asyncio.TimeoutError:
                self.logger.warning("⏰ 云端检测超时，使用本地结果")
                local_result.fallback_used = True
                local_result.source = "hybrid_timeout"
                return local_result
                
            except Exception as e:
                self.logger.warning(f"☁️ 云端检测失败: {e}，使用本地结果")
                local_result.fallback_used = True
                local_result.source = "hybrid_error"
                return local_result
        
        # 只有本地检测结果
        self.logger.info("📱 仅使用本地检测结果")
        local_result.source = "hybrid_local_only"
        return local_result
    
    def _fuse_results(self, local_result: IntentResult, cloud_result: IntentResult) -> IntentResult:
        """融合本地和云端检测结果"""
        
        # 如果云端置信度很高，优先采用云端结果
        if cloud_result.confidence >= 0.9:
            cloud_result.source = "hybrid_cloud"
            cloud_result.reasoning = f"云端高置信度检测: {cloud_result.reasoning}"
            return cloud_result
        
        # 如果两者意图一致，提高置信度
        if local_result.intent == cloud_result.intent:
            fused_confidence = min(0.95, (local_result.confidence + cloud_result.confidence) / 2 + 0.1)
            
            return IntentResult(
                intent=local_result.intent,
                confidence=fused_confidence,
                confidence_level=ConfidenceLevel.VERY_HIGH if fused_confidence >= 0.9 else ConfidenceLevel.HIGH,
                source="hybrid_consensus",
                reasoning=f"本地+云端一致: {local_result.reasoning} | {cloud_result.reasoning}",
                processing_time=local_result.processing_time + cloud_result.processing_time,
                metadata={
                    'local_result': local_result.__dict__,
                    'cloud_result': cloud_result.__dict__
                }
            )
        
        # 如果意图不一致，选择置信度更高的
        if cloud_result.confidence > local_result.confidence:
            cloud_result.source = "hybrid_cloud_preferred"
            cloud_result.reasoning = f"云端置信度更高: {cloud_result.reasoning}"
            return cloud_result
        else:
            local_result.source = "hybrid_local_preferred"
            local_result.reasoning = f"本地置信度更高: {local_result.reasoning}"
            return local_result

# 全局实例
_hybrid_detector: Optional[HybridIntentDetector] = None

def get_hybrid_detector(cloud_api_client=None) -> HybridIntentDetector:
    """获取混合检测器实例"""
    global _hybrid_detector
    if _hybrid_detector is None:
        _hybrid_detector = HybridIntentDetector(cloud_api_client)
    return _hybrid_detector

async def detect_intent_hybrid(text: str, context: Dict[str, Any] = None, cloud_api_client=None) -> IntentResult:
    """便捷函数：混合意图检测"""
    detector = get_hybrid_detector(cloud_api_client)
    return await detector.detect(text, context)
