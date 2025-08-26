"""
任务复杂度分析器
"""

from typing import Dict, Any
from ..config import ModeDetectionConfig

class TaskComplexityAnalyzer:
    """任务复杂度分析器"""
    
    def __init__(self):
        self.complexity_indicators = ModeDetectionConfig.COMPLEXITY_INDICATORS
        self.complexity_to_mode = {
            "simple": "daily",
            "medium": "daily", 
            "complex": "professional",
            "expert": "professional"
        }
    
    async def analyze(self, user_input: str, context: Dict[str, str]) -> Dict[str, Any]:
        """任务复杂度分析"""
        
        input_length = len(user_input)
        word_count = len(user_input.split())
        
        complexity_scores = {}
        detailed_analysis = {}
        
        # 分析每个复杂度级别
        for level, indicators in self.complexity_indicators.items():
            score = 0
            analysis_details = {}
            
            # 长度评分
            min_len, max_len = indicators["length_range"]
            if min_len <= input_length <= max_len:
                length_score = 1.0
                score += length_score
            else:
                # 计算距离最近边界的相对分数
                if input_length < min_len:
                    length_score = input_length / min_len * 0.5
                else:
                    length_score = min_len / input_length * 0.5
                score += length_score
            
            analysis_details["length_score"] = length_score
            
            # 关键词评分
            keyword_matches = []
            for keyword in indicators["keywords"]:
                if keyword in user_input:
                    count = user_input.count(keyword)
                    keyword_matches.append({"keyword": keyword, "count": count})
            
            keyword_score = len(keyword_matches) * 0.5
            score += keyword_score
            analysis_details["keyword_matches"] = keyword_matches
            analysis_details["keyword_score"] = keyword_score
            
            # 任务类型评分
            task_type_matches = []
            for task_type in indicators["task_types"]:
                if task_type in user_input:
                    count = user_input.count(task_type)
                    task_type_matches.append({"task_type": task_type, "count": count})
            
            task_type_score = len(task_type_matches) * 0.8
            score += task_type_score
            analysis_details["task_type_matches"] = task_type_matches
            analysis_details["task_type_score"] = task_type_score
            
            # 上下文评分
            context_score = self._calculate_context_score(context, level)
            score += context_score
            analysis_details["context_score"] = context_score
            
            complexity_scores[level] = score
            detailed_analysis[level] = analysis_details
        
        # 确定主要复杂度
        primary_complexity = max(complexity_scores, key=complexity_scores.get)
        primary_score = complexity_scores[primary_complexity]
        
        # 映射到模式倾向
        suggested_mode = self.complexity_to_mode[primary_complexity]
        
        # 计算置信度
        confidence = self._calculate_confidence(complexity_scores, primary_score)
        
        # 分析复杂度分布
        complexity_distribution = self._analyze_complexity_distribution(complexity_scores)
        
        # 识别复杂度指标
        complexity_indicators_found = self._identify_complexity_indicators(user_input, context)
        
        return {
            "complexity_scores": complexity_scores,
            "detailed_analysis": detailed_analysis,
            "primary_complexity": primary_complexity,
            "suggested_mode": suggested_mode,
            "confidence": confidence,
            "complexity_distribution": complexity_distribution,
            "complexity_indicators": complexity_indicators_found,
            "input_stats": {
                "length": input_length,
                "word_count": word_count,
                "avg_word_length": input_length / word_count if word_count > 0 else 0
            }
        }
    
    def _calculate_context_score(self, context: Dict[str, str], complexity_level: str) -> float:
        """计算上下文对复杂度的贡献分数"""
        
        score = 0.0
        
        # 范围影响复杂度
        scope = context.get("scope", "medium")
        if complexity_level in ["complex", "expert"] and scope == "broad":
            score += 0.5
        elif complexity_level in ["simple", "medium"] and scope == "limited":
            score += 0.3
        
        # 重要性影响复杂度
        importance = context.get("importance", "normal")
        if complexity_level in ["complex", "expert"] and importance in ["high", "very_high"]:
            score += 0.5
        elif complexity_level in ["simple", "medium"] and importance == "normal":
            score += 0.3
        
        # 任务性质影响复杂度
        task_nature = context.get("task_nature", "mixed")
        if complexity_level in ["complex", "expert"] and task_nature == "strategic":
            score += 0.4
        elif complexity_level in ["simple", "medium"] and task_nature == "operational":
            score += 0.4
        
        # 受众影响复杂度
        audience = context.get("audience", "unknown")
        if complexity_level in ["complex", "expert"] and audience == "external":
            score += 0.3
        elif complexity_level in ["simple", "medium"] and audience == "internal":
            score += 0.2
        
        return score
    
    def _calculate_confidence(self, complexity_scores: Dict[str, float], primary_score: float) -> float:
        """计算复杂度分析的置信度"""
        
        if not complexity_scores:
            return 0.0
        
        # 计算主要复杂度与其他复杂度的差距
        other_scores = [score for score in complexity_scores.values() if score != primary_score]
        
        if not other_scores:
            return 1.0
        
        max_other_score = max(other_scores)
        score_difference = primary_score - max_other_score
        
        # 分数差距越大，置信度越高
        confidence = min(score_difference / 3.0, 1.0)  # 假设最大差距为3
        confidence = max(confidence, 0.1)  # 最低置信度为0.1
        
        return confidence
    
    def _analyze_complexity_distribution(self, complexity_scores: Dict[str, float]) -> Dict[str, Any]:
        """分析复杂度分布"""
        
        total_score = sum(complexity_scores.values())
        
        if total_score == 0:
            distribution = {level: 0.25 for level in complexity_scores.keys()}
        else:
            distribution = {
                level: score / total_score 
                for level, score in complexity_scores.items()
            }
        
        # 计算分布的集中度
        max_proportion = max(distribution.values())
        concentration = max_proportion
        
        # 判断分布类型
        if concentration > 0.6:
            distribution_type = "concentrated"
        elif concentration > 0.4:
            distribution_type = "moderate"
        else:
            distribution_type = "dispersed"
        
        return {
            "distribution": distribution,
            "concentration": concentration,
            "distribution_type": distribution_type,
            "total_score": total_score
        }
    
    def _identify_complexity_indicators(self, user_input: str, context: Dict[str, str]) -> Dict[str, Any]:
        """识别复杂度指标"""
        
        indicators = {
            "simplicity_indicators": [],
            "complexity_indicators": [],
            "context_indicators": []
        }
        
        # 简单性指标
        simple_words = ["简单", "快速", "直接", "基础", "容易", "立即"]
        for word in simple_words:
            if word in user_input:
                indicators["simplicity_indicators"].append(word)
        
        # 复杂性指标
        complex_words = ["深入", "系统", "全面", "专业", "权威", "分析", "评估", "设计"]
        for word in complex_words:
            if word in user_input:
                indicators["complexity_indicators"].append(word)
        
        # 上下文指标
        if context.get("scope") == "broad":
            indicators["context_indicators"].append("broad_scope")
        if context.get("importance") in ["high", "very_high"]:
            indicators["context_indicators"].append("high_importance")
        if context.get("audience") == "external":
            indicators["context_indicators"].append("external_audience")
        if context.get("task_nature") == "strategic":
            indicators["context_indicators"].append("strategic_nature")
        
        return indicators
