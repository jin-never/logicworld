"""
上下文分析器
"""

from typing import Dict, Any

class ContextAnalyzer:
    """上下文分析器"""
    
    def __init__(self):
        self.context_weights = {
            "urgency": {
                "very_high": {"daily": 0.8, "professional": 0.2},
                "high": {"daily": 0.7, "professional": 0.3},
                "normal": {"daily": 0.5, "professional": 0.5}
            },
            "audience": {
                "external": {"daily": 0.2, "professional": 0.8},
                "internal": {"daily": 0.7, "professional": 0.3},
                "unknown": {"daily": 0.5, "professional": 0.5}
            },
            "importance": {
                "very_high": {"daily": 0.1, "professional": 0.9},
                "high": {"daily": 0.3, "professional": 0.7},
                "normal": {"daily": 0.6, "professional": 0.4}
            },
            "scope": {
                "limited": {"daily": 0.8, "professional": 0.2},
                "medium": {"daily": 0.5, "professional": 0.5},
                "broad": {"daily": 0.2, "professional": 0.8}
            },
            "task_nature": {
                "operational": {"daily": 0.8, "professional": 0.2},
                "mixed": {"daily": 0.5, "professional": 0.5},
                "strategic": {"daily": 0.2, "professional": 0.8}
            }
        }
    
    async def analyze(self, context: Dict[str, str]) -> Dict[str, Any]:
        """上下文分析"""
        
        context_scores = {"daily": 0.0, "professional": 0.0}
        factor_contributions = {}
        confidence_factors = []
        
        # 分析每个上下文因素
        for factor, value in context.items():
            if factor in self.context_weights and value in self.context_weights[factor]:
                weights = self.context_weights[factor][value]
                
                # 累加分数
                context_scores["daily"] += weights["daily"]
                context_scores["professional"] += weights["professional"]
                
                # 记录因素贡献
                factor_contributions[factor] = {
                    "value": value,
                    "weights": weights,
                    "contribution": weights
                }
                
                # 计算置信度因素
                confidence_factors.append(abs(weights["daily"] - weights["professional"]))
        
        # 归一化分数
        total_factors = len(factor_contributions)
        if total_factors > 0:
            normalized_scores = {
                "daily": context_scores["daily"] / total_factors,
                "professional": context_scores["professional"] / total_factors
            }
        else:
            normalized_scores = {"daily": 0.5, "professional": 0.5}
        
        # 确定主导模式
        dominant_mode = max(normalized_scores, key=normalized_scores.get)
        
        # 计算置信度
        confidence = self._calculate_confidence(confidence_factors, total_factors)
        
        # 分析上下文完整性
        context_completeness = self._analyze_context_completeness(context)
        
        # 识别关键决定因素
        key_factors = self._identify_key_factors(factor_contributions)
        
        return {
            "raw_scores": context_scores,
            "normalized_scores": normalized_scores,
            "dominant_mode": dominant_mode,
            "confidence": confidence,
            "factor_contributions": factor_contributions,
            "context_completeness": context_completeness,
            "key_factors": key_factors,
            "total_factors_analyzed": total_factors
        }
    
    def _calculate_confidence(self, confidence_factors: list, total_factors: int) -> float:
        """计算置信度"""
        
        if not confidence_factors:
            return 0.5
        
        # 平均差异度作为置信度基础
        avg_difference = sum(confidence_factors) / len(confidence_factors)
        
        # 考虑因素数量的影响
        factor_bonus = min(total_factors / 5.0, 1.0)  # 最多5个因素给满分
        
        # 最终置信度
        confidence = (avg_difference * 0.7 + factor_bonus * 0.3)
        
        return min(max(confidence, 0.0), 1.0)
    
    def _analyze_context_completeness(self, context: Dict[str, str]) -> Dict[str, Any]:
        """分析上下文完整性"""
        
        expected_factors = ["urgency", "audience", "importance", "scope", "task_nature"]
        available_factors = [f for f in expected_factors if f in context and context[f] != "unknown"]
        
        completeness_score = len(available_factors) / len(expected_factors)
        
        missing_factors = [f for f in expected_factors if f not in context or context[f] == "unknown"]
        
        return {
            "completeness_score": completeness_score,
            "available_factors": available_factors,
            "missing_factors": missing_factors,
            "total_expected": len(expected_factors),
            "total_available": len(available_factors)
        }
    
    def _identify_key_factors(self, factor_contributions: Dict[str, Dict]) -> list:
        """识别关键决定因素"""
        
        key_factors = []
        
        for factor, contribution in factor_contributions.items():
            weights = contribution["weights"]
            difference = abs(weights["daily"] - weights["professional"])
            
            # 差异大于0.4的因素被认为是关键因素
            if difference > 0.4:
                key_factors.append({
                    "factor": factor,
                    "value": contribution["value"],
                    "difference": difference,
                    "favors": "professional" if weights["professional"] > weights["daily"] else "daily"
                })
        
        # 按差异程度排序
        key_factors.sort(key=lambda x: x["difference"], reverse=True)
        
        return key_factors
    
    def update_context_weights(self, factor: str, value: str, daily_weight: float, professional_weight: float) -> bool:
        """更新上下文权重"""
        
        try:
            if factor not in self.context_weights:
                self.context_weights[factor] = {}
            
            self.context_weights[factor][value] = {
                "daily": daily_weight,
                "professional": professional_weight
            }
            return True
        except Exception:
            return False
    
    def get_context_weights(self, factor: str = None) -> Dict:
        """获取上下文权重"""
        
        if factor:
            return self.context_weights.get(factor, {})
        else:
            return self.context_weights.copy()
