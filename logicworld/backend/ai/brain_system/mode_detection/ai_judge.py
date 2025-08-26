"""
AI辅助判断器
"""

import json
import asyncio
from typing import Dict, Any
from .config import ModeDetectionConfig

class AIAssistedJudge:
    """AI辅助判断器"""
    
    def __init__(self, llm_client=None):
        self.llm = llm_client
        self.prompt_template = ModeDetectionConfig.AI_PROMPT_TEMPLATE
        self.max_retries = 3
        self.timeout = 30  # 秒
    
    async def judge(self, user_input: str, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """AI辅助判断"""
        
        try:
            # 构建分析提示词
            analysis_prompt = self._build_analysis_prompt(user_input, analysis_results)
            
            # 调用AI分析（带重试机制）
            ai_response = await self._call_ai_with_retry(analysis_prompt)
            
            # 解析AI响应
            parsed_result = self._parse_ai_response(ai_response)
            
            # 验证AI判断的合理性
            validated_result = self._validate_ai_judgment(parsed_result, analysis_results)
            
            return validated_result
            
        except Exception as e:
            # AI判断失败，返回基于规则的默认判断
            return self._fallback_judgment(analysis_results, str(e))
    
    def _build_analysis_prompt(self, user_input: str, analysis_results: Dict[str, Any]) -> str:
        """构建AI分析提示词"""
        
        # 提取分析结果
        keyword_analysis = analysis_results.get('keyword_analysis', {})
        pattern_analysis = analysis_results.get('pattern_analysis', {})
        complexity_analysis = analysis_results.get('complexity_analysis', {})
        context_analysis = analysis_results.get('context_analysis', {})
        
        # 构建上下文信息字符串
        context_info = self._format_context_info(analysis_results.get('input_metadata', {}).get('context', {}))
        
        # 使用模板构建提示词
        prompt = self.prompt_template.format(
            user_input=user_input,
            keyword_result=keyword_analysis.get('dominant_mode', 'unknown'),
            keyword_confidence=keyword_analysis.get('confidence', 0.0),
            pattern_result=pattern_analysis.get('dominant_mode', 'unknown'),
            pattern_confidence=pattern_analysis.get('confidence', 0.0),
            complexity_result=complexity_analysis.get('primary_complexity', 'unknown'),
            complexity_mode=complexity_analysis.get('suggested_mode', 'unknown'),
            context_info=context_info
        )
        
        return prompt
    
    def _format_context_info(self, context: Dict[str, str]) -> str:
        """格式化上下文信息"""
        
        if not context:
            return "无明确上下文信息"
        
        context_items = []
        for key, value in context.items():
            if value != "unknown":
                context_items.append(f"{key}: {value}")
        
        return ", ".join(context_items) if context_items else "无明确上下文信息"
    
    async def _call_ai_with_retry(self, prompt: str) -> str:
        """带重试机制的AI调用"""
        
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                # 设置超时
                response = await asyncio.wait_for(
                    self._call_ai(prompt),
                    timeout=self.timeout
                )
                return response
                
            except asyncio.TimeoutError:
                last_error = "AI调用超时"
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1)  # 等待1秒后重试
                    
            except Exception as e:
                last_error = str(e)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1)  # 等待1秒后重试
        
        raise Exception(f"AI调用失败，已重试{self.max_retries}次: {last_error}")
    
    async def _call_ai(self, prompt: str) -> str:
        """调用AI模型"""
        
        if not self.llm:
            raise Exception("LLM客户端未初始化")
        
        # 这里需要根据实际的LLM客户端接口进行调用
        # 假设LLM客户端有generate方法
        try:
            response = await self.llm.generate(prompt)
            return response
        except Exception as e:
            raise Exception(f"LLM调用错误: {str(e)}")
    
    def _parse_ai_response(self, ai_response: str) -> Dict[str, Any]:
        """解析AI响应"""
        
        try:
            # 清理响应文本
            cleaned_response = self._clean_ai_response(ai_response)
            
            # 尝试解析JSON
            result = json.loads(cleaned_response)
            
            # 验证必要字段
            required_fields = ["recommended_mode", "confidence", "reasoning"]
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")
            
            # 验证模式值
            if result["recommended_mode"] not in ["daily", "professional"]:
                raise ValueError(f"Invalid mode: {result['recommended_mode']}")
            
            # 验证置信度
            confidence = float(result["confidence"])
            if not 0 <= confidence <= 1:
                result["confidence"] = max(0, min(1, confidence))
            
            # 设置默认值
            result.setdefault("key_factors", [])
            result.setdefault("alternative_mode", "professional" if result["recommended_mode"] == "daily" else "daily")
            result.setdefault("risk_assessment", "标准风险评估")
            
            return result
            
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            # AI响应解析失败，返回默认值
            return {
                "recommended_mode": "daily",  # 默认日常模式
                "confidence": 0.5,
                "reasoning": f"AI响应解析失败: {str(e)}，使用默认判断",
                "key_factors": ["解析错误"],
                "alternative_mode": "professional",
                "risk_assessment": "低风险默认选择",
                "parse_error": True
            }
    
    def _clean_ai_response(self, response: str) -> str:
        """清理AI响应文本"""
        
        # 移除可能的markdown代码块标记
        response = response.replace("```json", "").replace("```", "")
        
        # 移除前后空白
        response = response.strip()
        
        # 尝试提取JSON部分
        start_idx = response.find('{')
        end_idx = response.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            response = response[start_idx:end_idx + 1]
        
        return response
    
    def _validate_ai_judgment(self, ai_result: Dict[str, Any], analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """验证AI判断的合理性"""
        
        # 收集规则分析的建议
        rule_suggestions = []
        
        keyword_analysis = analysis_results.get('keyword_analysis', {})
        if keyword_analysis.get('dominant_mode'):
            rule_suggestions.append(keyword_analysis['dominant_mode'])
        
        pattern_analysis = analysis_results.get('pattern_analysis', {})
        if pattern_analysis.get('dominant_mode'):
            rule_suggestions.append(pattern_analysis['dominant_mode'])
        
        complexity_analysis = analysis_results.get('complexity_analysis', {})
        if complexity_analysis.get('suggested_mode'):
            rule_suggestions.append(complexity_analysis['suggested_mode'])
        
        context_analysis = analysis_results.get('context_analysis', {})
        if context_analysis.get('dominant_mode'):
            rule_suggestions.append(context_analysis['dominant_mode'])
        
        # 计算规则共识
        if rule_suggestions:
            rule_consensus = max(set(rule_suggestions), key=rule_suggestions.count)
            consensus_count = rule_suggestions.count(rule_consensus)
            consensus_rate = consensus_count / len(rule_suggestions)
        else:
            rule_consensus = "daily"
            consensus_rate = 0.0
        
        # 检查AI判断与规则共识的一致性
        ai_mode = ai_result["recommended_mode"]
        is_consistent = ai_mode == rule_consensus
        
        # 如果AI判断与强规则共识不一致，调整置信度
        if not is_consistent and consensus_rate >= 0.6:
            original_confidence = ai_result["confidence"]
            ai_result["confidence"] *= 0.7  # 降低置信度
            ai_result["reasoning"] += f" (注意：与规则分析存在分歧，规则倾向于{rule_consensus}，置信度从{original_confidence:.2f}调整为{ai_result['confidence']:.2f})"
        
        # 添加验证信息
        ai_result["validation"] = {
            "rule_consensus": rule_consensus,
            "consensus_rate": consensus_rate,
            "consistency_check": is_consistent,
            "rule_suggestions": rule_suggestions,
            "adjustment_applied": not is_consistent and consensus_rate >= 0.6
        }
        
        return ai_result
    
    def _fallback_judgment(self, analysis_results: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """AI判断失败时的降级判断"""
        
        # 基于规则分析结果进行简单判断
        rule_votes = {"daily": 0, "professional": 0}
        
        # 关键词分析投票
        keyword_analysis = analysis_results.get('keyword_analysis', {})
        if keyword_analysis.get('dominant_mode'):
            rule_votes[keyword_analysis['dominant_mode']] += keyword_analysis.get('confidence', 0.5)
        
        # 语言模式分析投票
        pattern_analysis = analysis_results.get('pattern_analysis', {})
        if pattern_analysis.get('dominant_mode'):
            rule_votes[pattern_analysis['dominant_mode']] += pattern_analysis.get('confidence', 0.5)
        
        # 复杂度分析投票
        complexity_analysis = analysis_results.get('complexity_analysis', {})
        if complexity_analysis.get('suggested_mode'):
            rule_votes[complexity_analysis['suggested_mode']] += complexity_analysis.get('confidence', 0.5)
        
        # 上下文分析投票
        context_analysis = analysis_results.get('context_analysis', {})
        if context_analysis.get('dominant_mode'):
            rule_votes[context_analysis['dominant_mode']] += context_analysis.get('confidence', 0.5)
        
        # 确定最终模式
        if rule_votes["professional"] > rule_votes["daily"]:
            recommended_mode = "professional"
            confidence = min(rule_votes["professional"] / (rule_votes["daily"] + rule_votes["professional"]), 0.8)
        else:
            recommended_mode = "daily"
            confidence = min(rule_votes["daily"] / (rule_votes["daily"] + rule_votes["professional"]), 0.8)
        
        return {
            "recommended_mode": recommended_mode,
            "confidence": confidence,
            "reasoning": f"AI判断失败({error_message})，基于规则分析的降级判断",
            "key_factors": ["规则分析", "降级判断"],
            "alternative_mode": "professional" if recommended_mode == "daily" else "daily",
            "risk_assessment": "使用规则降级判断，风险较低",
            "fallback_used": True,
            "rule_votes": rule_votes
        }
