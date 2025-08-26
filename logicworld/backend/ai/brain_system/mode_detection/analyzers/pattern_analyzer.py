"""
语言模式分析器
"""

import re
from typing import Dict, List, Any
from ..config import ModeDetectionConfig

class LanguagePatternAnalyzer:
    """语言模式分析器"""
    
    def __init__(self):
        self.patterns = ModeDetectionConfig.LANGUAGE_PATTERNS
    
    async def analyze(self, user_input: str) -> Dict[str, Any]:
        """语言模式分析"""
        
        pattern_matches = {"daily": [], "professional": []}
        
        # 分析每种模式的语言模式
        for mode, patterns in self.patterns.items():
            mode_key = mode.replace("_patterns", "")  # daily_patterns -> daily
            
            for pattern in patterns:
                try:
                    matches = re.findall(pattern, user_input, re.IGNORECASE)
                    if matches:
                        pattern_matches[mode_key].append({
                            "pattern": pattern,
                            "matches": matches,
                            "count": len(matches),
                            "match_positions": self._find_match_positions(pattern, user_input)
                        })
                except re.error:
                    # 正则表达式错误，跳过这个模式
                    continue
        
        # 计算模式分数
        daily_score = sum(match["count"] for match in pattern_matches["daily"])
        prof_score = sum(match["count"] for match in pattern_matches["professional"])
        
        total_matches = daily_score + prof_score
        if total_matches > 0:
            normalized_scores = {
                "daily": daily_score / total_matches,
                "professional": prof_score / total_matches
            }
        else:
            normalized_scores = {"daily": 0.5, "professional": 0.5}
        
        # 确定主导模式
        dominant_mode = max(normalized_scores, key=normalized_scores.get)
        confidence = max(normalized_scores.values()) if total_matches > 0 else 0.0
        
        # 分析语言特征
        language_features = self._analyze_language_features(user_input)
        
        return {
            "pattern_matches": pattern_matches,
            "raw_scores": {"daily": daily_score, "professional": prof_score},
            "normalized_scores": normalized_scores,
            "dominant_mode": dominant_mode,
            "confidence": confidence,
            "total_pattern_matches": total_matches,
            "language_features": language_features,
            "pattern_diversity": self._calculate_pattern_diversity(pattern_matches)
        }
    
    def _find_match_positions(self, pattern: str, text: str) -> List[Dict[str, int]]:
        """找到匹配位置"""
        
        positions = []
        try:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                positions.append({
                    "start": match.start(),
                    "end": match.end(),
                    "matched_text": match.group()
                })
        except re.error:
            pass
        
        return positions
    
    def _analyze_language_features(self, text: str) -> Dict[str, Any]:
        """分析语言特征"""
        
        features = {}
        
        # 句式特征
        features["question_sentences"] = text.count('？') + text.count('?')
        features["exclamation_sentences"] = text.count('！') + text.count('!')
        features["declarative_sentences"] = text.count('。') + text.count('.')
        
        # 语气特征
        features["imperative_indicators"] = len(re.findall(r'请|帮|给|让', text))
        features["polite_indicators"] = len(re.findall(r'请|谢谢|麻烦|劳烦', text))
        features["urgent_indicators"] = len(re.findall(r'急|快|立即|马上', text))
        
        # 专业性特征
        features["formal_connectors"] = len(re.findall(r'因此|所以|然而|但是|此外|另外', text))
        features["technical_terms"] = len(re.findall(r'系统|框架|体系|规范|标准|流程', text))
        
        # 复杂度特征
        features["complex_sentences"] = len(re.findall(r'[，,][^。！？]*[，,]', text))
        features["subordinate_clauses"] = len(re.findall(r'如果|当|由于|因为|虽然|尽管', text))
        
        return features
    
    def _calculate_pattern_diversity(self, pattern_matches: Dict[str, List]) -> Dict[str, float]:
        """计算模式多样性"""
        
        diversity = {}
        
        for mode, matches in pattern_matches.items():
            unique_patterns = len(matches)
            total_matches = sum(match["count"] for match in matches)
            
            if total_matches > 0:
                diversity[mode] = unique_patterns / total_matches
            else:
                diversity[mode] = 0.0
        
        return diversity
    
    def add_pattern(self, mode: str, pattern: str) -> bool:
        """添加新的语言模式"""
        
        try:
            # 验证正则表达式
            re.compile(pattern)
            
            pattern_key = f"{mode}_patterns"
            if pattern_key not in self.patterns:
                self.patterns[pattern_key] = []
            
            if pattern not in self.patterns[pattern_key]:
                self.patterns[pattern_key].append(pattern)
                return True
            return False
        except re.error:
            return False
    
    def remove_pattern(self, mode: str, pattern: str) -> bool:
        """移除语言模式"""
        
        try:
            pattern_key = f"{mode}_patterns"
            if pattern_key in self.patterns and pattern in self.patterns[pattern_key]:
                self.patterns[pattern_key].remove(pattern)
                return True
            return False
        except Exception:
            return False
    
    def get_patterns(self, mode: str = None) -> Dict[str, List[str]]:
        """获取语言模式"""
        
        if mode:
            pattern_key = f"{mode}_patterns"
            return {pattern_key: self.patterns.get(pattern_key, [])}
        else:
            return self.patterns.copy()
