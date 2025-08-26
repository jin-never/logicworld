"""
输入预处理器
"""

import re
from typing import Dict, Any
from datetime import datetime

class InputPreprocessor:
    """输入预处理器"""
    
    def __init__(self):
        self.text_cleaner = TextCleaner()
        self.context_extractor = ContextExtractor()
    
    def preprocess(self, user_input: str, raw_context: Dict = None) -> Dict[str, Any]:
        """预处理用户输入"""
        
        # 文本清理和标准化
        cleaned_text = self.text_cleaner.clean(user_input)
        
        # 提取隐含上下文信息
        implicit_context = self.context_extractor.extract(user_input)
        
        # 合并显式和隐式上下文
        full_context = self._merge_context(raw_context or {}, implicit_context)
        
        # 计算基础统计信息
        stats = self._calculate_text_stats(user_input)
        
        return {
            "original_input": user_input,
            "cleaned_input": cleaned_text,
            "context": full_context,
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    
    def _merge_context(self, explicit_context: Dict, implicit_context: Dict) -> Dict:
        """合并显式和隐式上下文"""
        
        merged = explicit_context.copy()
        
        # 隐式上下文优先级较低，只在显式上下文没有时才使用
        for key, value in implicit_context.items():
            if key not in merged or merged[key] == "unknown":
                merged[key] = value
        
        return merged
    
    def _calculate_text_stats(self, text: str) -> Dict[str, Any]:
        """计算文本统计信息"""
        
        return {
            "length": len(text),
            "word_count": len(text.split()),
            "sentence_count": text.count('。') + text.count('？') + text.count('！') + text.count('.') + text.count('?') + text.count('!'),
            "question_marks": text.count('？') + text.count('?'),
            "exclamation_marks": text.count('！') + text.count('!'),
            "has_numbers": bool(re.search(r'\d', text)),
            "has_english": bool(re.search(r'[a-zA-Z]', text)),
            "has_punctuation": bool(re.search(r'[，。；：""''（）【】]', text))
        }


class TextCleaner:
    """文本清理器"""
    
    def clean(self, text: str) -> str:
        """清理和标准化文本"""
        
        if not text:
            return ""
        
        # 去除多余空格
        text = re.sub(r'\s+', ' ', text.strip())
        
        # 标准化标点符号
        text = text.replace('?', '？').replace('!', '！')
        text = text.replace(',', '，').replace(';', '；').replace(':', '：')
        
        # 去除特殊字符但保留语义重要的符号
        text = re.sub(r'[^\w\s\u4e00-\u9fff。？！，、；：""''（）【】\-_]', '', text)
        
        # 处理连续的标点符号
        text = re.sub(r'[。]{2,}', '。', text)
        text = re.sub(r'[？]{2,}', '？', text)
        text = re.sub(r'[！]{2,}', '！', text)
        
        return text.strip()


class ContextExtractor:
    """上下文提取器"""
    
    def __init__(self):
        self.urgency_indicators = ["急", "快", "立即", "马上", "紧急", "ASAP", "赶紧", "尽快", "现在就"]
        self.external_indicators = ["客户", "合作伙伴", "领导", "董事会", "对外", "公开", "外部", "正式"]
        self.internal_indicators = ["同事", "团队", "内部", "我们", "部门", "自己", "个人"]
        self.importance_indicators = ["重要", "关键", "核心", "战略", "正式", "官方", "主要", "首要"]
        self.scope_indicators = {
            "limited": ["这个", "单个", "一份", "简单", "小", "局部"],
            "broad": ["整套", "系统", "全面", "完整", "所有", "全部", "整体", "全局"]
        }
    
    def extract(self, user_input: str) -> Dict[str, str]:
        """从输入中提取隐含的上下文信息"""
        
        context = {}
        
        # 时间紧迫性检测
        context["urgency"] = self._detect_urgency(user_input)
        
        # 受众检测
        context["audience"] = self._detect_audience(user_input)
        
        # 重要性检测
        context["importance"] = self._detect_importance(user_input)
        
        # 范围检测
        context["scope"] = self._detect_scope(user_input)
        
        # 任务性质检测
        context["task_nature"] = self._detect_task_nature(user_input)
        
        return context
    
    def _detect_urgency(self, text: str) -> str:
        """检测时间紧迫性"""
        
        urgency_score = sum(1 for indicator in self.urgency_indicators if indicator in text)
        
        if urgency_score >= 2:
            return "very_high"
        elif urgency_score == 1:
            return "high"
        else:
            return "normal"
    
    def _detect_audience(self, text: str) -> str:
        """检测目标受众"""
        
        external_score = sum(1 for indicator in self.external_indicators if indicator in text)
        internal_score = sum(1 for indicator in self.internal_indicators if indicator in text)
        
        if external_score > internal_score:
            return "external"
        elif internal_score > external_score:
            return "internal"
        else:
            return "unknown"
    
    def _detect_importance(self, text: str) -> str:
        """检测重要性"""
        
        importance_score = sum(1 for indicator in self.importance_indicators if indicator in text)
        
        if importance_score >= 2:
            return "very_high"
        elif importance_score == 1:
            return "high"
        else:
            return "normal"
    
    def _detect_scope(self, text: str) -> str:
        """检测任务范围"""
        
        for scope, indicators in self.scope_indicators.items():
            if any(indicator in text for indicator in indicators):
                return scope
        
        return "medium"
    
    def _detect_task_nature(self, text: str) -> str:
        """检测任务性质"""
        
        operational_keywords = ["做", "写", "整理", "录入", "填写", "调整", "复制", "转换"]
        strategic_keywords = ["制定", "建立", "设计", "分析", "评估", "规划", "策略"]
        
        operational_score = sum(1 for kw in operational_keywords if kw in text)
        strategic_score = sum(1 for kw in strategic_keywords if kw in text)
        
        if strategic_score > operational_score:
            return "strategic"
        elif operational_score > strategic_score:
            return "operational"
        else:
            return "mixed"
