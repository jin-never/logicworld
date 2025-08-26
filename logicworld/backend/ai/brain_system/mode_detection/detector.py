"""
智能模式检测器主类
"""

import asyncio
import time
from typing import Dict, Any, Optional
from datetime import datetime

from .preprocessor import InputPreprocessor
from .analyzers import (
    KeywordAnalyzer, 
    LanguagePatternAnalyzer, 
    ContextAnalyzer, 
    TaskComplexityAnalyzer
)
from .ai_judge import AIAssistedJudge
from .fusion_engine import DecisionFusionEngine
from .learning_system import LearningFeedbackSystem

class MultiDimensionalAnalyzer:
    """多维度分析引擎"""
    
    def __init__(self):
        self.keyword_analyzer = KeywordAnalyzer()
        self.pattern_analyzer = LanguagePatternAnalyzer()
        self.context_analyzer = ContextAnalyzer()
        self.complexity_analyzer = TaskComplexityAnalyzer()
    
    async def analyze(self, preprocessed_data: Dict[str, Any]) -> Dict[str, Any]:
        """多维度分析"""
        
        user_input = preprocessed_data["cleaned_input"]
        context = preprocessed_data["context"]
        
        # 并行执行多个分析
        try:
            analyses = await asyncio.gather(
                self.keyword_analyzer.analyze(user_input),
                self.pattern_analyzer.analyze(user_input),
                self.context_analyzer.analyze(context),
                self.complexity_analyzer.analyze(user_input, context),
                return_exceptions=True
            )
            
            # 处理可能的异常
            keyword_analysis = analyses[0] if not isinstance(analyses[0], Exception) else self._get_default_analysis("keyword")
            pattern_analysis = analyses[1] if not isinstance(analyses[1], Exception) else self._get_default_analysis("pattern")
            context_analysis = analyses[2] if not isinstance(analyses[2], Exception) else self._get_default_analysis("context")
            complexity_analysis = analyses[3] if not isinstance(analyses[3], Exception) else self._get_default_analysis("complexity")
            
        except Exception as e:
            # 如果并行执行失败，使用默认分析
            keyword_analysis = self._get_default_analysis("keyword")
            pattern_analysis = self._get_default_analysis("pattern")
            context_analysis = self._get_default_analysis("context")
            complexity_analysis = self._get_default_analysis("complexity")
        
        return {
            "keyword_analysis": keyword_analysis,
            "pattern_analysis": pattern_analysis,
            "context_analysis": context_analysis,
            "complexity_analysis": complexity_analysis,
            "input_metadata": preprocessed_data
        }
    
    def _get_default_analysis(self, analysis_type: str) -> Dict[str, Any]:
        """获取默认分析结果"""
        
        defaults = {
            "keyword": {
                "dominant_mode": "daily",
                "confidence": 0.5,
                "raw_scores": {"daily": 0.5, "professional": 0.5},
                "normalized_scores": {"daily": 0.5, "professional": 0.5},
                "matched_keywords": {"daily": [], "professional": []},
                "analysis_quality": "no_keywords"
            },
            "pattern": {
                "dominant_mode": "daily",
                "confidence": 0.5,
                "raw_scores": {"daily": 0.5, "professional": 0.5},
                "normalized_scores": {"daily": 0.5, "professional": 0.5},
                "pattern_matches": {"daily": [], "professional": []},
                "total_pattern_matches": 0
            },
            "context": {
                "dominant_mode": "daily",
                "confidence": 0.5,
                "raw_scores": {"daily": 0.5, "professional": 0.5},
                "normalized_scores": {"daily": 0.5, "professional": 0.5},
                "factor_contributions": {},
                "total_factors_analyzed": 0
            },
            "complexity": {
                "suggested_mode": "daily",
                "confidence": 0.5,
                "primary_complexity": "medium",
                "complexity_scores": {"simple": 0.25, "medium": 0.5, "complex": 0.25, "expert": 0.0}
            }
        }
        
        return defaults.get(analysis_type, {})


class IntelligentModeDetector:
    """智能模式检测器主类"""
    
    def __init__(self, llm_client=None):
        self.preprocessor = InputPreprocessor()
        self.analyzer = MultiDimensionalAnalyzer()
        self.ai_judge = AIAssistedJudge(llm_client)
        self.fusion_engine = DecisionFusionEngine()
        self.learning_system = LearningFeedbackSystem()
        
        # 性能统计
        self.detection_stats = {
            "total_detections": 0,
            "successful_detections": 0,
            "failed_detections": 0,
            "avg_processing_time": 0.0
        }
    
    async def detect_mode(self, user_input: str, context: Dict[str, Any] = None, user_mode_preference: str = None) -> Dict[str, Any]:
        """主检测方法（支持四级模式选择）"""

        start_time = time.time()
        detection_id = f"detection_{int(start_time * 1000)}"

        try:
            self.detection_stats["total_detections"] += 1

            # 处理用户模式偏好
            if user_mode_preference:
                return await self._handle_user_mode_preference(user_mode_preference, user_input, context, detection_id, start_time)

            # 1. 预处理
            preprocessed_data = self.preprocessor.preprocess(user_input, context)

            # 2. 多维度分析
            analysis_results = await self.analyzer.analyze(preprocessed_data)

            # 3. AI辅助判断
            ai_judgment = await self.ai_judge.judge(user_input, analysis_results)

            # 4. 决策融合
            final_decision = self.fusion_engine.fuse_decisions(analysis_results, ai_judgment)

            # 5. 构建返回结果
            processing_time = time.time() - start_time
            
            detection_result = {
                "detection_id": detection_id,
                "original_input": user_input,
                "recommended_mode": final_decision["recommended_mode"],
                "confidence": final_decision["confidence"],
                "consensus_rate": final_decision["consensus_rate"],
                "alternative_mode": final_decision["alternative_mode"],
                "reasoning": ai_judgment.get("reasoning", "基于多维度分析的智能判断"),
                "key_factors": ai_judgment.get("key_factors", []),
                "processing_time": processing_time,
                "timestamp": datetime.now().isoformat(),
                "detailed_analysis": {
                    "keyword_analysis": analysis_results["keyword_analysis"],
                    "pattern_analysis": analysis_results["pattern_analysis"],
                    "context_analysis": analysis_results["context_analysis"],
                    "complexity_analysis": analysis_results["complexity_analysis"],
                    "ai_judgment": ai_judgment,
                    "fusion_result": final_decision
                },
                "quality_metrics": {
                    "fusion_quality": final_decision.get("fusion_quality", {}),
                    "consistency_metrics": final_decision.get("consistency_metrics", {}),
                    "decision_explanation": final_decision.get("decision_explanation", "")
                }
            }
            
            # 更新统计信息
            self.detection_stats["successful_detections"] += 1
            self._update_avg_processing_time(processing_time)
            
            return detection_result
            
        except Exception as e:
            # 错误处理，返回安全的默认值
            processing_time = time.time() - start_time
            self.detection_stats["failed_detections"] += 1
            
            return {
                "detection_id": detection_id,
                "original_input": user_input,
                "recommended_mode": "daily",  # 默认日常模式
                "confidence": 0.5,
                "consensus_rate": 0.0,
                "alternative_mode": "professional",
                "reasoning": f"检测过程出错，使用默认模式: {str(e)}",
                "key_factors": ["错误处理"],
                "processing_time": processing_time,
                "timestamp": datetime.now().isoformat(),
                "error": True,
                "error_message": str(e),
                "detailed_analysis": {},
                "quality_metrics": {}
            }
    
    async def batch_detect_mode(self, inputs: list) -> list:
        """批量模式检测"""
        
        tasks = []
        for item in inputs:
            if isinstance(item, str):
                task = self.detect_mode(item)
            elif isinstance(item, dict):
                user_input = item.get("input", "")
                context = item.get("context", {})
                task = self.detect_mode(user_input, context)
            else:
                continue
            
            tasks.append(task)
        
        if not tasks:
            return []
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 处理异常结果
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    processed_results.append({
                        "error": True,
                        "error_message": str(result),
                        "recommended_mode": "daily",
                        "confidence": 0.5
                    })
                else:
                    processed_results.append(result)
            
            return processed_results
            
        except Exception as e:
            # 批量处理失败
            return [{"error": True, "error_message": str(e)} for _ in inputs]
    
    async def record_user_feedback(self, detection_result: Dict[str, Any], user_feedback: Dict[str, Any]) -> bool:
        """记录用户反馈用于学习优化"""
        
        try:
            await self.learning_system.record_feedback(detection_result, user_feedback)
            return True
        except Exception:
            return False
    
    async def get_performance_stats(self, time_range: str = "last_30_days") -> Dict[str, Any]:
        """获取检测器性能统计"""
        
        try:
            learning_stats = await self.learning_system.get_detection_accuracy(time_range)
            
            return {
                "detection_stats": self.detection_stats.copy(),
                "accuracy_stats": learning_stats,
                "fusion_weights": self.fusion_engine.get_fusion_weights()
            }
        except Exception:
            return {
                "detection_stats": self.detection_stats.copy(),
                "accuracy_stats": {"accuracy": 0.0, "sample_size": 0},
                "fusion_weights": self.fusion_engine.get_fusion_weights()
            }
    
    def _update_avg_processing_time(self, new_time: float) -> None:
        """更新平均处理时间"""
        
        current_avg = self.detection_stats["avg_processing_time"]
        total_successful = self.detection_stats["successful_detections"]
        
        if total_successful == 1:
            self.detection_stats["avg_processing_time"] = new_time
        else:
            # 计算新的平均值
            self.detection_stats["avg_processing_time"] = (
                (current_avg * (total_successful - 1) + new_time) / total_successful
            )
    
    def reset_stats(self) -> None:
        """重置统计信息"""
        
        self.detection_stats = {
            "total_detections": 0,
            "successful_detections": 0,
            "failed_detections": 0,
            "avg_processing_time": 0.0
        }
    
    def update_fusion_weights(self, new_weights: Dict[str, float]) -> bool:
        """更新融合权重"""
        
        return self.fusion_engine.update_fusion_weights(new_weights)

    async def _handle_user_mode_preference(self, user_mode: str, user_input: str, context: Dict[str, Any], detection_id: str, start_time: float) -> Dict[str, Any]:
        """处理用户指定的模式偏好"""

        from .config import ModeDetectionConfig

        processing_time = time.time() - start_time

        # 验证模式是否支持
        if user_mode not in ModeDetectionConfig.SUPPORTED_MODES:
            # 不支持的模式，降级到自动检测
            return await self.detect_mode(user_input, context, user_mode_preference=None)

        mode_config = ModeDetectionConfig.SUPPORTED_MODES[user_mode]

        # 检查模式是否启用
        if not mode_config.get("enabled", True):
            # 模式未启用，降级到自动检测
            return await self.detect_mode(user_input, context, user_mode_preference=None)

        # 处理不同类型的模式
        if user_mode == "auto":
            # 自动模式：执行智能检测
            return await self.detect_mode(user_input, context, user_mode_preference=None)

        elif user_mode in ["daily", "professional"]:
            # 具体模式：直接使用用户指定的模式
            recommended_mode = user_mode
            confidence = 1.0  # 用户指定，置信度最高
            reasoning = f"用户指定使用{mode_config['name']}"
            alternative_mode = "professional" if user_mode == "daily" else "daily"

        elif user_mode == "custom":
            # 自定义模式：暂未实现，降级到专业模式
            recommended_mode = "professional"
            confidence = 0.8
            reasoning = "自定义模式暂未实现，降级到专业模式"
            alternative_mode = "daily"

        else:
            # 未知模式，降级到日常模式
            recommended_mode = "daily"
            confidence = 0.5
            reasoning = f"未知模式 {user_mode}，降级到日常模式"
            alternative_mode = "professional"

        # 构建返回结果
        detection_result = {
            "detection_id": detection_id,
            "original_input": user_input,
            "recommended_mode": recommended_mode,
            "confidence": confidence,
            "consensus_rate": 1.0,  # 用户指定，一致性最高
            "alternative_mode": alternative_mode,
            "reasoning": reasoning,
            "key_factors": [f"用户指定模式: {user_mode}"],
            "processing_time": processing_time,
            "timestamp": datetime.now().isoformat(),
            "user_specified": True,
            "original_user_mode": user_mode,
            "detailed_analysis": {
                "mode_source": "user_specified",
                "mode_config": mode_config,
                "fallback_applied": user_mode != recommended_mode
            },
            "quality_metrics": {
                "fusion_quality": {"user_specified": True},
                "consistency_metrics": {"user_preference": 1.0},
                "decision_explanation": f"用户明确指定使用{user_mode}模式"
            }
        }

        # 更新统计信息
        self.detection_stats["successful_detections"] += 1
        self._update_avg_processing_time(processing_time)

        return detection_result

    def get_supported_modes(self) -> Dict[str, Any]:
        """获取支持的模式列表"""

        from .config import ModeDetectionConfig
        return ModeDetectionConfig.SUPPORTED_MODES.copy()

    def get_mode_info(self, mode: str) -> Dict[str, Any]:
        """获取特定模式的信息"""

        from .config import ModeDetectionConfig
        return ModeDetectionConfig.SUPPORTED_MODES.get(mode, {})

    def is_mode_enabled(self, mode: str) -> bool:
        """检查模式是否启用"""

        from .config import ModeDetectionConfig
        mode_config = ModeDetectionConfig.SUPPORTED_MODES.get(mode, {})
        return mode_config.get("enabled", False)

    def get_analyzer_info(self) -> Dict[str, Any]:
        """获取分析器信息"""
        
        return {
            "keyword_analyzer": {
                "type": "KeywordAnalyzer",
                "keywords_count": {
                    "daily": len([kw for cat in self.analyzer.keyword_analyzer.keyword_database.get("daily_mode", {}).values() for kw in cat]),
                    "professional": len([kw for cat in self.analyzer.keyword_analyzer.keyword_database.get("professional_mode", {}).values() for kw in cat])
                }
            },
            "pattern_analyzer": {
                "type": "LanguagePatternAnalyzer", 
                "patterns_count": {
                    "daily": len(self.analyzer.pattern_analyzer.patterns.get("daily_patterns", [])),
                    "professional": len(self.analyzer.pattern_analyzer.patterns.get("professional_patterns", []))
                }
            },
            "context_analyzer": {
                "type": "ContextAnalyzer",
                "context_factors": list(self.analyzer.context_analyzer.context_weights.keys())
            },
            "complexity_analyzer": {
                "type": "TaskComplexityAnalyzer",
                "complexity_levels": list(self.analyzer.complexity_analyzer.complexity_indicators.keys())
            }
        }
