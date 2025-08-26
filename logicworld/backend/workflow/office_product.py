"""
Office产品类型系统 - 支持Office工作流的智能协作
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import json

@dataclass
class OfficeProduct:
    """Office领域的产品类"""
    
    def __init__(self, 
                 app_type: str = "",
                 summary: str = "", 
                 file_path: str = "",
                 key_points: List[str] = None):
        self.app_type = app_type  # "word", "excel", "ppt"
        self.summary = summary
        self.file_path = file_path
        self.key_points = key_points or []
        self.created_at = datetime.now().isoformat()
        self.metadata = {}
    
    def to_context_string(self) -> str:
        """生成给下一个节点的上下文描述"""
        return f"""
可用{self.app_type.upper()}产品：
- 内容：{self.summary}
- 文件：{self.file_path}
- 要点：{', '.join(self.key_points)}
- 创建时间：{self.created_at}
"""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "app_type": self.app_type,
            "summary": self.summary,
            "file_path": self.file_path,
            "key_points": self.key_points,
            "created_at": self.created_at,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'OfficeProduct':
        """从字典创建Office产品"""
        product = cls(
            app_type=data.get("app_type", ""),
            summary=data.get("summary", ""),
            file_path=data.get("file_path", ""),
            key_points=data.get("key_points", [])
        )
        product.created_at = data.get("created_at", datetime.now().isoformat())
        product.metadata = data.get("metadata", {})
        return product
    
    def is_compatible_with_task(self, task: str) -> bool:
        """检查与Office任务的兼容性"""
        task_lower = task.lower()
        
        # Word产品的兼容性检查
        if self.app_type == "word":
            return any(word in task_lower for word in ["word", "文档", "报告", "ppt", "演示"])
        
        # Excel产品的兼容性检查
        elif self.app_type == "excel":
            return any(word in task_lower for word in ["excel", "表格", "数据", "word", "ppt"])
        
        # PPT产品的兼容性检查
        elif self.app_type == "ppt":
            return any(word in task_lower for word in ["ppt", "演示", "word", "文档"])
        
        return False

# Office产品类型常量
OFFICE_APP_TYPES = {
    "word": {
        "name": "Word文档",
        "file_extensions": [".docx", ".doc"],
        "typical_tasks": ["写报告", "创建文档", "生成说明"],
        "can_use_from": ["excel", "ppt"],  # 可以使用哪些应用的产品
        "can_provide_to": ["excel", "ppt"]  # 可以为哪些应用提供产品
    },
    "excel": {
        "name": "Excel表格",
        "file_extensions": [".xlsx", ".xls"],
        "typical_tasks": ["数据分析", "创建表格", "统计计算"],
        "can_use_from": ["word", "ppt"],
        "can_provide_to": ["word", "ppt"]
    },
    "ppt": {
        "name": "PowerPoint演示",
        "file_extensions": [".pptx", ".ppt"],
        "typical_tasks": ["制作PPT", "演示汇报", "幻灯片"],
        "can_use_from": ["word", "excel"],
        "can_provide_to": ["word", "excel"]
    }
}

def detect_office_app_type(task: str) -> str:
    """从任务描述中检测Office应用类型"""
    task_lower = task.lower()
    
    # Word检测
    if any(word in task_lower for word in ["word", "文档", "报告", "写", "创建文档"]):
        return "word"
    
    # Excel检测
    elif any(word in task_lower for word in ["excel", "表格", "数据", "统计", "分析", "计算"]):
        return "excel"
    
    # PPT检测
    elif any(word in task_lower for word in ["ppt", "powerpoint", "演示", "幻灯片", "汇报"]):
        return "ppt"
    
    # 默认返回word
    return "word"

def extract_file_path_from_result(result: Any) -> str:
    """从执行结果中提取文件路径"""
    import re
    import os
    
    if isinstance(result, dict):
        # 优先从特定字段中查找
        for key in ['file_path', 'output_path', 'document_path', 'saved_path', 'file']:
            if key in result and result[key]:
                path = str(result[key])
                if _is_office_file(path):
                    return path
        
        # 从result字段中查找
        result_str = str(result.get('result', ''))
    else:
        result_str = str(result)
    
    # 增强的文件路径匹配模式
    file_patterns = [
        # Windows绝对路径
        r'[A-Z]:[\\\/][^<>:"|?*\n]+\.(docx?|xlsx?|pptx?)(?:\b|$)',
        # Unix绝对路径  
        r'\/[^<>:"|?*\n]+\.(docx?|xlsx?|pptx?)(?:\b|$)',
        # 相对路径（包含output、documents等常见目录）
        r'(?:\.[\\/])?(?:output|documents|files|temp|tmp)[\\/][^<>:"|?*\n]+\.(docx?|xlsx?|pptx?)(?:\b|$)',
        # 简单文件名（在当前目录）
        r'\b[^<>:"|?*\n\\\/]+\.(docx?|xlsx?|pptx?)(?:\b|$)',
        # URL路径
        r'https?://[^\s<>"|]+\.(docx?|xlsx?|pptx?)(?:\b|$)'
    ]
    
    for pattern in file_patterns:
        matches = re.findall(pattern, result_str, re.IGNORECASE | re.MULTILINE)
        if matches:
            # 如果有多个匹配，选择最可能的一个
            best_match = _select_best_file_path(matches)
            if best_match:
                return best_match
    
    return ""

def _is_office_file(path: str) -> bool:
    """检查是否为Office文件"""
    if not path:
        return False
    office_extensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
    return any(path.lower().endswith(ext) for ext in office_extensions)

def _select_best_file_path(matches: list) -> str:
    """从多个匹配中选择最佳文件路径"""
    if not matches:
        return ""
    
    if len(matches) == 1:
        return matches[0] if isinstance(matches[0], str) else matches[0][0]
    
    # 优先选择规则
    scored_matches = []
    for match in matches:
        path = match if isinstance(match, str) else match[0]
        score = 0
        
        # 包含output目录得分更高
        if 'output' in path.lower():
            score += 10
        
        # 绝对路径得分更高
        if path.startswith(('/', 'C:', 'D:', 'E:')):
            score += 5
        
        # 更长的路径通常更具体
        score += len(path) * 0.1
        
        # .docx等新格式得分更高
        if path.endswith(('docx', 'xlsx', 'pptx')):
            score += 3
        
        scored_matches.append((score, path))
    
    # 返回得分最高的路径
    scored_matches.sort(reverse=True)
    return scored_matches[0][1]

def extract_key_points_from_result(result: Any, max_points: int = 5) -> List[str]:
    """从执行结果中提取关键要点"""
    import re
    
    if isinstance(result, dict):
        # 优先从summary、key_points等字段提取
        for key in ['key_points', 'highlights', 'summary_points', 'main_points']:
            if key in result and isinstance(result[key], list):
                return result[key][:max_points]
        
        result_str = str(result.get('result', ''))
    else:
        result_str = str(result)
    
    key_points = []
    
    # 1. 查找编号列表项（更宽泛的模式）
    numbered_patterns = [
        r'(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]{15,80})',  # 1. 或 1) 开头
        r'(?:^|\n)\s*[（(](\d+)[）)]\s*([^\n]{15,80})',  # (1) 开头
        r'(?:^|\n)\s*[①-⑩]\s*([^\n]{15,80})'  # 圆圈数字
    ]
    
    for pattern in numbered_patterns:
        matches = re.findall(pattern, result_str, re.MULTILINE)
        for match in matches:
            text = match[1] if len(match) > 1 else match[0]
            if text.strip() and len(text.strip()) >= 10:
                key_points.append(text.strip())
        if len(key_points) >= max_points:
            break
    
    # 2. 查找项目符号列表
    if len(key_points) < max_points:
        bullet_patterns = [
            r'(?:^|\n)\s*[•·○▪▫-]\s*([^\n]{15,80})',  # 各种符号
            r'(?:^|\n)\s*[★☆]\s*([^\n]{15,80})',  # 星号
            r'(?:^|\n)\s*→\s*([^\n]{15,80})'  # 箭头
        ]
        
        for pattern in bullet_patterns:
            matches = re.findall(pattern, result_str, re.MULTILINE)
            for match in matches:
                text = match.strip()
                if text and len(text) >= 10 and text not in key_points:
                    key_points.append(text)
            if len(key_points) >= max_points:
                break
    
    # 3. 查找关键数据和结论
    if len(key_points) < max_points:
        key_info_patterns = [
            r'([^。\n]*(?:增长|下降|提升|改善|优化)[^。\n]*(?:\d+%|倍|万|亿)[^。\n]*)',
            r'([^。\n]*(?:数据显示|分析结果|报告指出|发现)[^。\n]{20,60})',
            r'([^。\n]*(?:建议|推荐|应该|需要)[^。\n]{20,60})',
            r'([^。\n]*(?:预计|预期|估计)[^。\n]*(?:\d+)[^。\n]*)'
        ]
        
        for pattern in key_info_patterns:
            matches = re.findall(pattern, result_str)
            for match in matches:
                text = match.strip()
                if text and len(text) >= 15 and text not in key_points:
                    key_points.append(text)
            if len(key_points) >= max_points:
                break
    
    # 4. 如果仍然没有找到足够的要点，提取重要句子
    if len(key_points) < max_points:
        sentences = re.split(r'[。！？]', result_str)
        important_sentences = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if (20 <= len(sentence) <= 80 and 
                any(word in sentence for word in ['重要', '关键', '主要', '核心', '显著', '明显', '特别'])):
                important_sentences.append(sentence)
        
        key_points.extend(important_sentences[:max_points - len(key_points)])
    
    # 清理和去重
    cleaned_points = []
    for point in key_points[:max_points]:
        cleaned = _clean_key_point(point)
        if cleaned and cleaned not in cleaned_points:
            cleaned_points.append(cleaned)
    
    return cleaned_points[:max_points]

def _clean_key_point(text: str) -> str:
    """清理关键要点文本"""
    if not text:
        return ""
    
    # 移除多余的空白字符
    text = re.sub(r'\s+', ' ', text.strip())
    
    # 移除开头的标点符号
    text = re.sub(r'^[：:：\-\s]+', '', text)
    
    # 确保长度合适
    if len(text) < 10:
        return ""
    if len(text) > 100:
        text = text[:97] + "..."
    
    return text 