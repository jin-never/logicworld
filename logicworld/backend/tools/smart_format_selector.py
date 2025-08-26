"""
智能格式选择器 - 集成逻辑1.0.1的成功模式
分析任务并建议最佳的文档格式和工具
"""
import re
import logging
from typing import Dict, Any, List, Optional


class SmartFormatSelector:
    """智能格式选择器"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 支持的格式和对应的工具
        self.format_tool_mapping = {
            'docx': ['wordmcp', 'word'],
            'xlsx': ['excelmcp', 'excel'],
            'pptx': ['powerpointmcp', 'powerpoint'],
            'pdf': ['pdfmcp', 'pdf'],
            'txt': ['textmcp', 'text'],
            'md': ['markdownmcp', 'markdown'],
            'html': ['htmlmcp', 'html'],
            'csv': ['csvmcp', 'csv'],
            'json': ['jsonmcp', 'json'],
            'xml': ['xmlmcp', 'xml']
        }
        
        # 任务类型到格式的映射
        self.task_format_mapping = {
            'document': 'docx',
            'report': 'docx',
            'analysis': 'docx',
            'presentation': 'pptx',
            'spreadsheet': 'xlsx',
            'data': 'xlsx',
            'web': 'html',
            'config': 'json',
            'note': 'md'
        }
    
    def analyze_task_and_suggest_format(self, task_description: str) -> Dict[str, Any]:
        """分析任务并建议格式"""
        try:
            # 检测任务类型
            task_type = self._detect_task_type(task_description)
            
            # 检测明确提到的格式
            explicit_format = self._detect_explicit_format(task_description)
            
            # 检测工具需求
            detected_tools = self._detect_tools(task_description)
            
            # 决定最佳格式
            if explicit_format:
                suggested_format = explicit_format
                reason = f"任务中明确提到了{explicit_format}格式"
            elif detected_tools:
                # 根据检测到的工具推断格式
                if 'wordmcp' in detected_tools or 'word' in detected_tools:
                    suggested_format = 'docx'
                    reason = "检测到Word文档工具需求"
                elif 'excel' in detected_tools:
                    suggested_format = 'xlsx'
                    reason = "检测到Excel工具需求"
                elif 'powerpoint' in detected_tools:
                    suggested_format = 'pptx'
                    reason = "检测到PowerPoint工具需求"
                else:
                    suggested_format = self.task_format_mapping.get(task_type, 'docx')
                    reason = f"根据任务类型'{task_type}'推荐格式"
            else:
                suggested_format = self.task_format_mapping.get(task_type, 'docx')
                reason = f"根据任务类型'{task_type}'推荐格式"
            
            # 生成建议的文件名
            suggested_filename = self._generate_filename(task_description, suggested_format)
            
            # 获取所有支持的格式
            all_supported_formats = list(self.format_tool_mapping.keys())
            
            return {
                "detected_tools": detected_tools,
                "task_type": task_type,
                "explicit_format": explicit_format,
                "suggested_format": suggested_format,
                "suggested_filename": suggested_filename,
                "reason": reason,
                "all_supported_formats": all_supported_formats,
                "format_confidence": self._calculate_confidence(task_description, suggested_format)
            }
            
        except Exception as e:
            self.logger.error(f"格式分析失败: {e}")
            return {
                "detected_tools": [],
                "task_type": "unknown",
                "explicit_format": None,
                "suggested_format": "docx",
                "suggested_filename": "document.docx",
                "reason": "格式分析失败，使用默认格式",
                "all_supported_formats": ["docx"],
                "format_confidence": 0.5
            }
    
    def _detect_task_type(self, task: str) -> str:
        """检测任务类型"""
        task_lower = task.lower()
        
        # 文档类型
        if any(word in task_lower for word in ['文档', 'document', '报告', 'report', '写作', 'writing']):
            return 'document'
        
        # 分析类型
        if any(word in task_lower for word in ['分析', 'analysis', '研究', 'research', '调查', 'survey']):
            return 'analysis'
        
        # 演示类型
        if any(word in task_lower for word in ['演示', 'presentation', '幻灯片', 'slide', 'ppt']):
            return 'presentation'
        
        # 数据类型
        if any(word in task_lower for word in ['数据', 'data', '表格', 'table', '统计', 'statistics']):
            return 'data'
        
        # 配置类型
        if any(word in task_lower for word in ['配置', 'config', '设置', 'settings']):
            return 'config'
        
        # 网页类型
        if any(word in task_lower for word in ['网页', 'webpage', 'html', 'web']):
            return 'web'
        
        # 笔记类型
        if any(word in task_lower for word in ['笔记', 'note', '记录', 'record']):
            return 'note'
        
        return 'document'  # 默认为文档类型
    
    def _detect_explicit_format(self, task: str) -> Optional[str]:
        """检测明确提到的格式"""
        task_lower = task.lower()
        
        # 检测格式关键词
        format_patterns = {
            'docx': ['word', 'docx', 'doc', '文档'],
            'xlsx': ['excel', 'xlsx', 'xls', '表格', '电子表格'],
            'pptx': ['powerpoint', 'pptx', 'ppt', '演示', '幻灯片'],
            'pdf': ['pdf'],
            'txt': ['txt', '文本', 'text'],
            'md': ['markdown', 'md'],
            'html': ['html', 'htm', '网页'],
            'csv': ['csv'],
            'json': ['json'],
            'xml': ['xml']
        }
        
        for format_name, keywords in format_patterns.items():
            if any(keyword in task_lower for keyword in keywords):
                return format_name
        
        return None
    
    def _detect_tools(self, task: str) -> List[str]:
        """检测需要的工具"""
        task_lower = task.lower()
        detected_tools = []
        
        # Word工具检测
        if any(word in task_lower for word in ['word', 'docx', '文档', '报告', '写作']):
            detected_tools.append('wordmcp')
        
        # Excel工具检测
        if any(word in task_lower for word in ['excel', 'xlsx', '表格', '数据', '统计']):
            detected_tools.append('excel')
        
        # PowerPoint工具检测
        if any(word in task_lower for word in ['powerpoint', 'pptx', '演示', '幻灯片']):
            detected_tools.append('powerpoint')
        
        # PDF工具检测
        if any(word in task_lower for word in ['pdf']):
            detected_tools.append('pdf')
        
        return detected_tools
    
    def _generate_filename(self, task: str, format_ext: str) -> str:
        """生成建议的文件名"""
        # 提取任务中的关键词作为文件名
        import re
        from datetime import datetime
        
        # 清理任务描述，提取有意义的词汇
        clean_task = re.sub(r'[^\w\s\u4e00-\u9fff]', '', task)  # 保留中英文和数字
        words = clean_task.split()[:3]  # 取前3个词
        
        if words:
            filename_base = '_'.join(words)
            # 限制文件名长度
            if len(filename_base) > 20:
                filename_base = filename_base[:20]
        else:
            filename_base = "document"
        
        # 添加时间戳以避免重复
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        return f"{filename_base}_{timestamp}.{format_ext}"
    
    def _calculate_confidence(self, task: str, suggested_format: str) -> float:
        """计算格式建议的置信度"""
        confidence = 0.5  # 基础置信度
        
        task_lower = task.lower()
        
        # 如果任务中明确提到格式，置信度提高
        format_keywords = {
            'docx': ['word', 'docx', '文档'],
            'xlsx': ['excel', 'xlsx', '表格'],
            'pptx': ['powerpoint', 'pptx', '演示'],
            'pdf': ['pdf'],
            'txt': ['txt', '文本']
        }
        
        if suggested_format in format_keywords:
            keywords = format_keywords[suggested_format]
            if any(keyword in task_lower for keyword in keywords):
                confidence = 0.9
        
        # 如果任务描述详细，置信度提高
        if len(task) > 20:
            confidence += 0.1
        
        # 如果任务包含具体动作词，置信度提高
        action_words = ['创建', '生成', '制作', '编写', '分析', 'create', 'generate', 'make', 'write']
        if any(word in task_lower for word in action_words):
            confidence += 0.1
        
        return min(confidence, 1.0)  # 确保不超过1.0
    
    def create_enhanced_prompt(self, original_task: str, format_analysis: Dict[str, Any]) -> str:
        """创建增强的任务提示"""
        suggested_format = format_analysis.get('suggested_format', 'docx')
        detected_tools = format_analysis.get('detected_tools', [])
        suggested_filename = format_analysis.get('suggested_filename', 'document.docx')
        
        # 根据格式和工具创建增强提示
        if suggested_format == 'docx' and ('wordmcp' in detected_tools or 'word' in detected_tools):
            enhanced_prompt = f"""
请使用Word文档工具完成以下任务：{original_task}

具体要求：
1. 创建一个名为"{suggested_filename}"的Word文档
2. 文档应包含完整的内容结构（标题、正文、总结等）
3. 应用适当的格式设置（字体、字号、段落格式等）
4. 确保内容详实、结构清晰

请直接使用wordmcp工具来执行此任务。请立即调用相应的工具函数，不要返回JSON规划。
            """.strip()
        
        elif suggested_format == 'xlsx':
            enhanced_prompt = f"""
请使用Excel工具完成以下任务：{original_task}

具体要求：
1. 创建一个名为"{suggested_filename}"的Excel文件
2. 包含适当的数据表格和分析
3. 应用必要的格式和公式
4. 确保数据准确、布局合理

请直接使用相应的Excel工具来执行此任务。
            """.strip()
        
        elif suggested_format == 'pptx':
            enhanced_prompt = f"""
请使用PowerPoint工具完成以下任务：{original_task}

具体要求：
1. 创建一个名为"{suggested_filename}"的演示文稿
2. 包含清晰的幻灯片结构
3. 应用适当的设计和布局
4. 确保内容生动、易于理解

请直接使用相应的PowerPoint工具来执行此任务。
            """.strip()
        
        else:
            # 默认增强提示
            enhanced_prompt = f"""
请完成以下任务：{original_task}

建议输出格式：{suggested_format}
建议文件名：{suggested_filename}

请确保输出内容完整、格式规范、结构清晰。
            """.strip()
        
        return enhanced_prompt


# 创建全局实例
smart_format_selector = SmartFormatSelector() 