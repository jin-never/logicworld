"""
关键词分析器
"""

from typing import Dict, List, Any
from ..config import ModeDetectionConfig

class KeywordAnalyzer:
    """关键词分析器"""
    
    def __init__(self):
        self.keyword_database = ModeDetectionConfig.KEYWORD_WEIGHTS
    
    async def analyze(self, user_input: str) -> Dict[str, Any]:
        """关键词分析"""
        
        scores = {"daily": 0.0, "professional": 0.0}
        matched_keywords = {"daily": [], "professional": []}
        category_scores = {"daily": {}, "professional": {}}
        
        for mode, categories in self.keyword_database.items():
            category_scores[mode] = {}
            
            for category, keywords in categories.items():
                category_score = 0.0
                category_matches = []
                
                for keyword, weight in keywords.items():
                    if keyword in user_input:
                        # 计算关键词在文本中的出现次数
                        count = user_input.count(keyword)
                        weighted_score = weight * count
                        
                        scores[mode] += weighted_score
                        category_score += weighted_score
                        
                        category_matches.append({
                            "keyword": keyword,
                            "weight": weight,
                            "count": count,
                            "weighted_score": weighted_score
                        })
                        
                        matched_keywords[mode].append({
                            "keyword": keyword,
                            "category": category,
                            "weight": weight,
                            "count": count
                        })
                
                category_scores[mode][category] = {
                    "score": category_score,
                    "matches": category_matches
                }
        
        # 归一化分数
        total_score = scores["daily"] + scores["professional"]
        if total_score > 0:
            normalized_scores = {
                "daily": scores["daily"] / total_score,
                "professional": scores["professional"] / total_score
            }
        else:
            normalized_scores = {"daily": 0.5, "professional": 0.5}
        
        # 确定主导模式
        dominant_mode = max(normalized_scores, key=normalized_scores.get)
        confidence = max(normalized_scores.values())
        
        # 计算关键词密度
        word_count = len(user_input.split())
        total_matches = len(matched_keywords["daily"]) + len(matched_keywords["professional"])
        keyword_density = total_matches / word_count if word_count > 0 else 0
        
        return {
            "raw_scores": scores,
            "normalized_scores": normalized_scores,
            "matched_keywords": matched_keywords,
            "category_scores": category_scores,
            "dominant_mode": dominant_mode,
            "confidence": confidence,
            "keyword_density": keyword_density,
            "total_matches": total_matches,
            "analysis_quality": self._assess_analysis_quality(total_matches, keyword_density)
        }
    
    def _assess_analysis_quality(self, total_matches: int, keyword_density: float) -> str:
        """评估分析质量"""
        
        if total_matches == 0:
            return "no_keywords"
        elif keyword_density > 0.3:
            return "high_density"
        elif keyword_density > 0.1:
            return "medium_density"
        else:
            return "low_density"
    
    def get_keyword_suggestions(self, mode: str, category: str = None) -> List[str]:
        """获取关键词建议"""
        
        if mode not in self.keyword_database:
            return []
        
        if category:
            if category in self.keyword_database[mode]:
                return list(self.keyword_database[mode][category].keys())
            else:
                return []
        else:
            # 返回所有类别的关键词
            all_keywords = []
            for cat_keywords in self.keyword_database[mode].values():
                all_keywords.extend(cat_keywords.keys())
            return all_keywords
    
    def add_keyword(self, mode: str, category: str, keyword: str, weight: float) -> bool:
        """添加新关键词"""
        
        try:
            if mode not in self.keyword_database:
                self.keyword_database[mode] = {}
            
            if category not in self.keyword_database[mode]:
                self.keyword_database[mode][category] = {}
            
            self.keyword_database[mode][category][keyword] = weight
            return True
        except Exception:
            return False
    
    def update_keyword_weight(self, mode: str, category: str, keyword: str, new_weight: float) -> bool:
        """更新关键词权重"""
        
        try:
            if (mode in self.keyword_database and 
                category in self.keyword_database[mode] and 
                keyword in self.keyword_database[mode][category]):
                
                self.keyword_database[mode][category][keyword] = new_weight
                return True
            return False
        except Exception:
            return False
