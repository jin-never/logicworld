"""
决策融合引擎
"""

from typing import Dict, Any, List
from .config import ModeDetectionConfig

class DecisionFusionEngine:
    """决策融合引擎"""
    
    def __init__(self):
        self.fusion_weights = ModeDetectionConfig.FUSION_WEIGHTS.copy()
        self.confidence_thresholds = ModeDetectionConfig.CONFIDENCE_THRESHOLDS
    
    def fuse_decisions(self, analysis_results: Dict[str, Any], ai_judgment: Dict[str, Any]) -> Dict[str, Any]:
        """融合多个分析结果"""
        
        # 收集所有分析的模式建议和置信度
        decisions = self._collect_decisions(analysis_results, ai_judgment)
        
        # 执行加权融合
        fusion_result = self._weighted_fusion(decisions)
        
        # 计算一致性指标
        consistency_metrics = self._calculate_consistency(decisions)
        
        # 评估融合质量
        fusion_quality = self._assess_fusion_quality(decisions, fusion_result, consistency_metrics)
        
        # 生成决策解释
        decision_explanation = self._generate_explanation(decisions, fusion_result, consistency_metrics)
        
        return {
            "recommended_mode": fusion_result["recommended_mode"],
            "confidence": fusion_result["confidence"],
            "consensus_rate": consistency_metrics["consensus_rate"],
            "detailed_scores": fusion_result["detailed_scores"],
            "alternative_mode": fusion_result["alternative_mode"],
            "individual_decisions": decisions,
            "fusion_weights": self.fusion_weights,
            "consistency_metrics": consistency_metrics,
            "fusion_quality": fusion_quality,
            "decision_explanation": decision_explanation
        }
    
    def _collect_decisions(self, analysis_results: Dict[str, Any], ai_judgment: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """收集所有分析的决策"""
        
        decisions = {}
        
        # 关键词分析
        keyword_analysis = analysis_results.get('keyword_analysis', {})
        decisions["keyword_analysis"] = {
            "mode": keyword_analysis.get('dominant_mode', 'daily'),
            "confidence": keyword_analysis.get('confidence', 0.5),
            "quality": self._assess_analysis_quality(keyword_analysis)
        }
        
        # 语言模式分析
        pattern_analysis = analysis_results.get('pattern_analysis', {})
        decisions["pattern_analysis"] = {
            "mode": pattern_analysis.get('dominant_mode', 'daily'),
            "confidence": pattern_analysis.get('confidence', 0.5),
            "quality": self._assess_analysis_quality(pattern_analysis)
        }
        
        # 复杂度分析
        complexity_analysis = analysis_results.get('complexity_analysis', {})
        decisions["complexity_analysis"] = {
            "mode": complexity_analysis.get('suggested_mode', 'daily'),
            "confidence": complexity_analysis.get('confidence', 0.5),
            "quality": self._assess_analysis_quality(complexity_analysis)
        }
        
        # 上下文分析
        context_analysis = analysis_results.get('context_analysis', {})
        decisions["context_analysis"] = {
            "mode": context_analysis.get('dominant_mode', 'daily'),
            "confidence": context_analysis.get('confidence', 0.5),
            "quality": self._assess_analysis_quality(context_analysis)
        }
        
        # AI判断
        decisions["ai_judgment"] = {
            "mode": ai_judgment.get('recommended_mode', 'daily'),
            "confidence": ai_judgment.get('confidence', 0.5),
            "quality": self._assess_ai_judgment_quality(ai_judgment)
        }
        
        return decisions
    
    def _weighted_fusion(self, decisions: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """加权融合决策"""
        
        weighted_scores = {"daily": 0.0, "professional": 0.0}
        total_weight = 0.0
        effective_weights = {}
        
        for analyzer, decision in decisions.items():
            if analyzer not in self.fusion_weights:
                continue
            
            base_weight = self.fusion_weights[analyzer]
            confidence = decision['confidence']
            quality = decision['quality']
            mode = decision['mode']
            
            # 计算有效权重（考虑置信度和质量）
            effective_weight = base_weight * confidence * quality
            effective_weights[analyzer] = effective_weight
            
            # 累加分数
            weighted_scores[mode] += effective_weight
            total_weight += effective_weight
        
        # 归一化
        if total_weight > 0:
            final_scores = {
                mode: score / total_weight 
                for mode, score in weighted_scores.items()
            }
        else:
            final_scores = {"daily": 0.5, "professional": 0.5}
        
        # 确定最终决策
        recommended_mode = max(final_scores, key=final_scores.get)
        confidence = final_scores[recommended_mode]
        alternative_mode = min(final_scores, key=final_scores.get)
        
        return {
            "recommended_mode": recommended_mode,
            "confidence": confidence,
            "detailed_scores": final_scores,
            "alternative_mode": alternative_mode,
            "effective_weights": effective_weights,
            "total_weight": total_weight
        }
    
    def _calculate_consistency(self, decisions: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """计算一致性指标"""
        
        modes = [decision["mode"] for decision in decisions.values()]
        
        # 计算共识率
        if modes:
            mode_counts = {mode: modes.count(mode) for mode in set(modes)}
            consensus_mode = max(mode_counts, key=mode_counts.get)
            consensus_rate = mode_counts[consensus_mode] / len(modes)
        else:
            consensus_mode = "daily"
            consensus_rate = 0.0
        
        # 计算置信度分布
        confidences = [decision["confidence"] for decision in decisions.values()]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5
        confidence_variance = sum((c - avg_confidence) ** 2 for c in confidences) / len(confidences) if confidences else 0.0
        
        # 计算质量分布
        qualities = [decision["quality"] for decision in decisions.values()]
        avg_quality = sum(qualities) / len(qualities) if qualities else 0.5
        
        # 一致性等级
        if consensus_rate >= 0.8:
            consistency_level = "high"
        elif consensus_rate >= 0.6:
            consistency_level = "medium"
        else:
            consistency_level = "low"
        
        return {
            "consensus_mode": consensus_mode,
            "consensus_rate": consensus_rate,
            "consistency_level": consistency_level,
            "avg_confidence": avg_confidence,
            "confidence_variance": confidence_variance,
            "avg_quality": avg_quality,
            "mode_distribution": {mode: modes.count(mode) / len(modes) for mode in set(modes)} if modes else {}
        }
    
    def _assess_analysis_quality(self, analysis_result: Dict[str, Any]) -> float:
        """评估单个分析的质量"""
        
        quality_score = 0.5  # 基础分数
        
        # 检查是否有足够的分析数据
        if analysis_result.get('total_matches', 0) > 0:
            quality_score += 0.2
        
        if analysis_result.get('confidence', 0) > 0.6:
            quality_score += 0.2
        
        # 检查分析的详细程度
        if 'detailed_analysis' in analysis_result or 'factor_contributions' in analysis_result:
            quality_score += 0.1
        
        return min(quality_score, 1.0)
    
    def _assess_ai_judgment_quality(self, ai_judgment: Dict[str, Any]) -> float:
        """评估AI判断的质量"""
        
        quality_score = 0.7  # AI判断基础分数较高
        
        # 检查是否有解析错误
        if ai_judgment.get('parse_error'):
            quality_score -= 0.3
        
        # 检查是否使用了降级判断
        if ai_judgment.get('fallback_used'):
            quality_score -= 0.2
        
        # 检查验证一致性
        validation = ai_judgment.get('validation', {})
        if validation.get('consistency_check'):
            quality_score += 0.1
        
        return max(min(quality_score, 1.0), 0.1)
    
    def _assess_fusion_quality(self, decisions: Dict[str, Dict[str, Any]], 
                              fusion_result: Dict[str, Any], 
                              consistency_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """评估融合质量"""
        
        quality_factors = {}
        
        # 一致性质量
        consistency_quality = consistency_metrics["consensus_rate"]
        quality_factors["consistency"] = consistency_quality
        
        # 置信度质量
        confidence_quality = fusion_result["confidence"]
        quality_factors["confidence"] = confidence_quality
        
        # 数据质量
        avg_quality = consistency_metrics["avg_quality"]
        quality_factors["data_quality"] = avg_quality
        
        # 权重有效性
        total_weight = fusion_result["total_weight"]
        max_possible_weight = sum(self.fusion_weights.values())
        weight_effectiveness = total_weight / max_possible_weight if max_possible_weight > 0 else 0
        quality_factors["weight_effectiveness"] = weight_effectiveness
        
        # 综合质量分数
        overall_quality = (
            consistency_quality * 0.3 +
            confidence_quality * 0.3 +
            avg_quality * 0.2 +
            weight_effectiveness * 0.2
        )
        
        # 质量等级
        if overall_quality >= 0.8:
            quality_level = "excellent"
        elif overall_quality >= 0.6:
            quality_level = "good"
        elif overall_quality >= 0.4:
            quality_level = "fair"
        else:
            quality_level = "poor"
        
        return {
            "overall_quality": overall_quality,
            "quality_level": quality_level,
            "quality_factors": quality_factors
        }
    
    def _generate_explanation(self, decisions: Dict[str, Dict[str, Any]], 
                            fusion_result: Dict[str, Any], 
                            consistency_metrics: Dict[str, Any]) -> str:
        """生成决策解释"""
        
        recommended_mode = fusion_result["recommended_mode"]
        confidence = fusion_result["confidence"]
        consensus_rate = consistency_metrics["consensus_rate"]
        
        explanation_parts = []
        
        # 基础决策说明
        explanation_parts.append(f"推荐使用{recommended_mode}模式，置信度为{confidence:.2f}")
        
        # 一致性说明
        if consensus_rate >= 0.8:
            explanation_parts.append(f"各分析器高度一致({consensus_rate:.1%}同意)")
        elif consensus_rate >= 0.6:
            explanation_parts.append(f"各分析器基本一致({consensus_rate:.1%}同意)")
        else:
            explanation_parts.append(f"各分析器意见分歧较大({consensus_rate:.1%}同意)")
        
        # 主要支持因素
        supporting_analyzers = [
            analyzer for analyzer, decision in decisions.items()
            if decision["mode"] == recommended_mode
        ]
        
        if supporting_analyzers:
            analyzer_names = {
                "keyword_analysis": "关键词分析",
                "pattern_analysis": "语言模式分析", 
                "complexity_analysis": "复杂度分析",
                "context_analysis": "上下文分析",
                "ai_judgment": "AI智能判断"
            }
            
            support_list = [analyzer_names.get(a, a) for a in supporting_analyzers]
            explanation_parts.append(f"主要支持因素：{', '.join(support_list)}")
        
        return "；".join(explanation_parts)
    
    def update_fusion_weights(self, new_weights: Dict[str, float]) -> bool:
        """更新融合权重"""
        
        try:
            # 验证权重
            if not all(0 <= weight <= 1 for weight in new_weights.values()):
                return False
            
            # 验证权重总和
            if abs(sum(new_weights.values()) - 1.0) > 0.01:
                return False
            
            # 更新权重
            for analyzer, weight in new_weights.items():
                if analyzer in self.fusion_weights:
                    self.fusion_weights[analyzer] = weight
            
            return True
        except Exception:
            return False
    
    def get_fusion_weights(self) -> Dict[str, float]:
        """获取当前融合权重"""
        return self.fusion_weights.copy()
