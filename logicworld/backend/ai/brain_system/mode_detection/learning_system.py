"""
学习反馈系统
"""

import json
import asyncio
from typing import Dict, Any, List
from datetime import datetime
from .database import ModeDetectionDatabase
from .config import ModeDetectionConfig

class LearningFeedbackSystem:
    """学习反馈系统"""
    
    def __init__(self, db_path: str = "mode_detection.db"):
        self.database = ModeDetectionDatabase(db_path)
        self.model_optimizer = ModelOptimizer(self.database)
        self.learning_config = ModeDetectionConfig.LEARNING_CONFIG
    
    async def record_feedback(self, detection_result: Dict[str, Any], user_feedback: Dict[str, Any]) -> None:
        """记录用户反馈"""
        
        # 构建反馈记录
        feedback_record = {
            "detection_id": detection_result.get("detection_id"),
            "timestamp": detection_result.get("timestamp", datetime.now().isoformat()),
            "user_input": detection_result.get("original_input"),
            "detected_mode": detection_result.get("recommended_mode"),
            "detection_confidence": detection_result.get("confidence"),
            "user_actual_choice": user_feedback.get("actual_mode"),
            "user_satisfaction": user_feedback.get("satisfaction"),
            "user_comments": user_feedback.get("comments"),
            "detection_accuracy": detection_result.get("recommended_mode") == user_feedback.get("actual_mode"),
            "detailed_analysis": detection_result.get("detailed_analysis", {})
        }
        
        # 存储反馈
        await self.database.store_feedback(feedback_record)
        
        # 如果检测错误，触发学习优化
        if not feedback_record["detection_accuracy"]:
            await self.model_optimizer.learn_from_error(feedback_record)
    
    async def get_detection_accuracy(self, time_range: str = "last_30_days") -> Dict[str, Any]:
        """获取检测准确率统计"""
        
        return await self.database.get_accuracy_stats(time_range)
    
    async def get_error_analysis(self, time_range: str = "last_30_days") -> Dict[str, Any]:
        """获取错误分析"""
        
        return await self.database.get_error_analysis(time_range)
    
    async def get_learning_insights(self, time_range: str = "last_30_days") -> Dict[str, Any]:
        """获取学习洞察"""
        
        # 获取准确率统计
        accuracy_stats = await self.get_detection_accuracy(time_range)
        
        # 获取错误分析
        error_analysis = await self.get_error_analysis(time_range)
        
        # 获取性能趋势
        performance_stats = await self.database.query_performance_stats(time_range)
        
        # 分析改进建议
        improvement_suggestions = self._generate_improvement_suggestions(
            accuracy_stats, error_analysis, performance_stats
        )
        
        return {
            "accuracy_stats": accuracy_stats,
            "error_analysis": error_analysis,
            "performance_trend": performance_stats,
            "improvement_suggestions": improvement_suggestions,
            "learning_status": self._assess_learning_status(accuracy_stats)
        }
    
    def _generate_improvement_suggestions(self, accuracy_stats: Dict, error_analysis: Dict, performance_stats: List) -> List[str]:
        """生成改进建议"""
        
        suggestions = []
        
        # 基于准确率的建议
        accuracy = accuracy_stats.get("accuracy", 0.0)
        if accuracy < 0.7:
            suggestions.append("检测准确率较低，建议增加训练数据或调整分析权重")
        elif accuracy < 0.8:
            suggestions.append("检测准确率中等，可以通过优化关键词库和语言模式来提升")
        
        # 基于错误模式的建议
        common_mistakes = error_analysis.get("common_mistakes", [])
        if common_mistakes:
            top_mistake = common_mistakes[0]
            suggestions.append(f"最常见错误是{top_mistake[0]}，建议针对性优化相关分析器")
        
        # 基于置信度的建议
        confidence_stats = accuracy_stats.get("confidence_stats", {})
        avg_confidence = confidence_stats.get("avg_confidence", 0.5)
        if avg_confidence < 0.6:
            suggestions.append("平均置信度较低，建议增强分析器的判断能力")
        
        # 基于性能趋势的建议
        if len(performance_stats) >= 2:
            recent_accuracy = performance_stats[0].get("accuracy_rate", 0.0)
            previous_accuracy = performance_stats[1].get("accuracy_rate", 0.0)
            if recent_accuracy < previous_accuracy:
                suggestions.append("准确率呈下降趋势，建议检查最近的模型调整")
        
        return suggestions if suggestions else ["系统运行良好，继续保持当前配置"]
    
    def _assess_learning_status(self, accuracy_stats: Dict) -> str:
        """评估学习状态"""
        
        accuracy = accuracy_stats.get("accuracy", 0.0)
        sample_size = accuracy_stats.get("sample_size", 0)
        
        if sample_size < self.learning_config["min_feedback_count"]:
            return "数据收集中"
        elif accuracy >= 0.9:
            return "优秀"
        elif accuracy >= 0.8:
            return "良好"
        elif accuracy >= 0.7:
            return "一般"
        else:
            return "需要改进"


class ModelOptimizer:
    """模型优化器"""
    
    def __init__(self, database: ModeDetectionDatabase):
        self.database = database
        self.learning_config = ModeDetectionConfig.LEARNING_CONFIG
    
    async def learn_from_error(self, error_record: Dict[str, Any]) -> None:
        """从错误中学习"""
        
        try:
            # 分析错误原因
            error_analysis = await self._analyze_error_cause(error_record)
            
            # 生成改进行动
            improvement_action = self._generate_improvement_action(error_analysis)
            
            # 记录学习过程
            learning_record = {
                "timestamp": datetime.now().isoformat(),
                "error_type": error_analysis.get("error_type", "unknown"),
                "error_analysis": error_analysis,
                "improvement_action": improvement_action,
                "weight_adjustments": {}  # 实际的权重调整会在这里记录
            }
            
            await self.database.store_learning_record(learning_record)
            
        except Exception as e:
            # 学习过程出错，记录但不影响主流程
            print(f"Learning from error failed: {e}")
    
    async def _analyze_error_cause(self, error_record: Dict[str, Any]) -> Dict[str, Any]:
        """分析错误原因"""
        
        user_input = error_record.get("user_input", "")
        detected_mode = error_record.get("detected_mode", "")
        actual_mode = error_record.get("user_actual_choice", "")
        detailed_analysis = error_record.get("detailed_analysis", {})
        
        # 分析各个分析器的表现
        analyzer_performance = {}
        
        # 关键词分析器表现
        keyword_analysis = detailed_analysis.get("keyword_analysis", {})
        keyword_mode = keyword_analysis.get("dominant_mode", "")
        keyword_confidence = keyword_analysis.get("confidence", 0.0)
        analyzer_performance["keyword"] = {
            "predicted_correctly": keyword_mode == actual_mode,
            "confidence": keyword_confidence,
            "contribution": "high" if keyword_confidence > 0.7 else "low"
        }
        
        # 语言模式分析器表现
        pattern_analysis = detailed_analysis.get("pattern_analysis", {})
        pattern_mode = pattern_analysis.get("dominant_mode", "")
        pattern_confidence = pattern_analysis.get("confidence", 0.0)
        analyzer_performance["pattern"] = {
            "predicted_correctly": pattern_mode == actual_mode,
            "confidence": pattern_confidence,
            "contribution": "high" if pattern_confidence > 0.7 else "low"
        }
        
        # 复杂度分析器表现
        complexity_analysis = detailed_analysis.get("complexity_analysis", {})
        complexity_mode = complexity_analysis.get("suggested_mode", "")
        complexity_confidence = complexity_analysis.get("confidence", 0.0)
        analyzer_performance["complexity"] = {
            "predicted_correctly": complexity_mode == actual_mode,
            "confidence": complexity_confidence,
            "contribution": "high" if complexity_confidence > 0.7 else "low"
        }
        
        # 上下文分析器表现
        context_analysis = detailed_analysis.get("context_analysis", {})
        context_mode = context_analysis.get("dominant_mode", "")
        context_confidence = context_analysis.get("confidence", 0.0)
        analyzer_performance["context"] = {
            "predicted_correctly": context_mode == actual_mode,
            "confidence": context_confidence,
            "contribution": "high" if context_confidence > 0.7 else "low"
        }
        
        # AI判断表现
        ai_judgment = detailed_analysis.get("ai_judgment", {})
        ai_mode = ai_judgment.get("recommended_mode", "")
        ai_confidence = ai_judgment.get("confidence", 0.0)
        analyzer_performance["ai"] = {
            "predicted_correctly": ai_mode == actual_mode,
            "confidence": ai_confidence,
            "contribution": "high" if ai_confidence > 0.7 else "low"
        }
        
        # 确定主要错误来源
        wrong_analyzers = [
            name for name, perf in analyzer_performance.items()
            if not perf["predicted_correctly"] and perf["contribution"] == "high"
        ]
        
        # 分类错误类型
        if len(wrong_analyzers) >= 3:
            error_type = "systematic_error"
        elif "keyword" in wrong_analyzers:
            error_type = "keyword_mismatch"
        elif "pattern" in wrong_analyzers:
            error_type = "pattern_mismatch"
        elif "context" in wrong_analyzers:
            error_type = "context_misinterpretation"
        elif "ai" in wrong_analyzers:
            error_type = "ai_judgment_error"
        else:
            error_type = "fusion_error"
        
        return {
            "error_type": error_type,
            "detected_mode": detected_mode,
            "actual_mode": actual_mode,
            "analyzer_performance": analyzer_performance,
            "wrong_analyzers": wrong_analyzers,
            "user_input": user_input,
            "root_cause": self._identify_root_cause(error_type, analyzer_performance, user_input)
        }
    
    def _identify_root_cause(self, error_type: str, analyzer_performance: Dict, user_input: str) -> str:
        """识别根本原因"""
        
        if error_type == "keyword_mismatch":
            return f"关键词分析器未能正确识别输入'{user_input}'中的关键信号"
        elif error_type == "pattern_mismatch":
            return f"语言模式分析器未能匹配输入'{user_input}'的语言特征"
        elif error_type == "context_misinterpretation":
            return "上下文分析器对任务场景的理解有偏差"
        elif error_type == "ai_judgment_error":
            return "AI判断器的综合分析出现偏差"
        elif error_type == "fusion_error":
            return "决策融合过程中权重分配不当"
        elif error_type == "systematic_error":
            return "多个分析器同时出现判断偏差，可能存在系统性问题"
        else:
            return "未知错误原因"
    
    def _generate_improvement_action(self, error_analysis: Dict[str, Any]) -> str:
        """生成改进行动"""
        
        error_type = error_analysis.get("error_type", "")
        wrong_analyzers = error_analysis.get("wrong_analyzers", [])
        
        actions = []
        
        if error_type == "keyword_mismatch":
            actions.append("更新关键词库，添加遗漏的关键词")
            actions.append("调整关键词权重，提高相关词汇的重要性")
        
        elif error_type == "pattern_mismatch":
            actions.append("扩展语言模式库，添加新的匹配模式")
            actions.append("优化正则表达式，提高模式匹配准确性")
        
        elif error_type == "context_misinterpretation":
            actions.append("完善上下文分析规则")
            actions.append("调整上下文权重配置")
        
        elif error_type == "ai_judgment_error":
            actions.append("优化AI提示词模板")
            actions.append("增强AI判断的验证机制")
        
        elif error_type == "fusion_error":
            actions.append("重新评估各分析器的融合权重")
            actions.append("改进决策融合算法")
        
        elif error_type == "systematic_error":
            actions.append("全面检查系统配置")
            actions.append("考虑重新训练或校准所有分析器")
        
        return "; ".join(actions) if actions else "需要进一步分析"
    
    async def optimize_weights(self, performance_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """优化权重配置"""
        
        # 这里可以实现更复杂的权重优化算法
        # 目前返回当前权重作为示例
        current_weights = ModeDetectionConfig.FUSION_WEIGHTS.copy()
        
        # 基于性能数据调整权重的简单示例
        if len(performance_data) >= 10:  # 有足够数据时才调整
            # 计算各分析器的准确率
            analyzer_accuracy = {
                "keyword_analysis": 0.0,
                "pattern_analysis": 0.0,
                "complexity_analysis": 0.0,
                "context_analysis": 0.0,
                "ai_judgment": 0.0
            }
            
            # 这里应该基于实际的性能数据计算
            # 暂时返回当前权重
            pass
        
        return current_weights
