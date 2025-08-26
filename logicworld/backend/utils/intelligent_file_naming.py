"""
智能文件命名工具
根据文件内容和执行节点的输出自动生成有意义的文件名
"""
import re
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
import jieba
from collections import Counter


class IntelligentFileNaming:
    """智能文件命名器"""
    
    def __init__(self):
        # 常见业务关键词映射
        self.business_keywords = {
            '报告': ['report', 'analysis', 'summary'],
            '分析': ['analysis', 'study', 'research'],
            '计划': ['plan', 'strategy', 'roadmap'],
            '总结': ['summary', 'review', 'overview'],
            '文档': ['document', 'doc', 'manual'],
            '方案': ['solution', 'proposal', 'scheme'],
            '流程': ['process', 'workflow', 'procedure'],
            '规范': ['standard', 'specification', 'guideline'],
            '手册': ['manual', 'handbook', 'guide'],
            '清单': ['list', 'checklist', 'inventory'],
            '表格': ['table', 'sheet', 'form'],
            '图表': ['chart', 'graph', 'diagram'],
            '模板': ['template', 'framework', 'pattern'],
            '数据': ['data', 'dataset', 'statistics']
        }
        
        # 文件类型对应的前缀
        self.type_prefixes = {
            'docx': 'DOC',
            'xlsx': 'XLS', 
            'pptx': 'PPT',
            'pdf': 'PDF',
            'txt': 'TXT',
            'md': 'MD',
            'json': 'DATA',
            'csv': 'CSV',
            'py': 'CODE',
            'js': 'SCRIPT',
            'html': 'WEB'
        }
    
    def generate_filename(self, 
                         content: str, 
                         execution_node_data: Dict[str, Any],
                         file_format: str,
                         context: Dict[str, Any] = None) -> str:
        """
        生成智能文件名
        
        Args:
            content: 文件内容
            execution_node_data: 执行节点的数据
            file_format: 文件格式
            context: 执行上下文
            
        Returns:
            智能生成的文件名
        """
        try:
            # 1. 从执行节点获取基础信息
            base_name = self._extract_base_name(execution_node_data)
            
            # 2. 从内容中提取关键信息
            content_keywords = self._extract_content_keywords(content)
            
            # 3. 生成描述性名称
            descriptive_name = self._generate_descriptive_name(
                base_name, content_keywords, file_format
            )
            
            # 4. 添加时间戳和格式信息
            final_name = self._finalize_filename(descriptive_name, file_format)
            
            return final_name
            
        except Exception as e:
            # 如果智能命名失败，返回默认命名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            return f"output_{timestamp}.{file_format}"
    
    def _extract_base_name(self, execution_node_data: Dict[str, Any]) -> str:
        """从执行节点提取基础名称"""
        # 优先使用节点的标签或名称
        label = execution_node_data.get('label', '')
        if label and label != '执行节点':
            # 清理标签，移除特殊字符
            clean_label = re.sub(r'[^\w\u4e00-\u9fff\-_]', '', label)
            if clean_label:
                return clean_label
        
        # 其次使用节点描述
        description = execution_node_data.get('description', '')
        if description:
            # 提取描述的前10个字符作为基础名
            clean_desc = re.sub(r'[^\w\u4e00-\u9fff]', '', description)
            return clean_desc[:10] if clean_desc else ''
        
        # 最后使用节点类型相关信息
        node_type = execution_node_data.get('nodeType', '')
        if 'ai' in node_type.lower():
            return 'AI生成'
        elif 'api' in node_type.lower():
            return 'API输出'
        else:
            return '执行结果'
    
    def _extract_content_keywords(self, content: str, max_keywords: int = 3) -> List[str]:
        """从内容中提取关键词"""
        if not content or len(content.strip()) < 10:
            return []
        
        try:
            # 截取内容前500字符进行分析（避免处理过长内容）
            sample_content = content[:500]
            
            # 使用jieba分词
            words = jieba.lcut(sample_content)
            
            # 过滤有意义的词汇
            meaningful_words = []
            for word in words:
                # 保留长度>=2的中文词汇或英文单词
                if (len(word) >= 2 and 
                    (re.match(r'[\u4e00-\u9fff]+', word) or  # 中文
                     re.match(r'[a-zA-Z]+', word))):  # 英文
                    meaningful_words.append(word)
            
            # 统计词频并选择最常见的词汇
            word_count = Counter(meaningful_words)
            top_words = [word for word, count in word_count.most_common(max_keywords)]
            
            return top_words
            
        except Exception:
            # 如果分词失败，使用简单的关键词提取
            return self._simple_keyword_extraction(content, max_keywords)
    
    def _simple_keyword_extraction(self, content: str, max_keywords: int = 3) -> List[str]:
        """简单的关键词提取（备用方案）"""
        # 匹配业务关键词
        found_keywords = []
        for keyword in self.business_keywords.keys():
            if keyword in content and len(found_keywords) < max_keywords:
                found_keywords.append(keyword)
        
        return found_keywords
    
    def _generate_descriptive_name(self, 
                                 base_name: str, 
                                 keywords: List[str], 
                                 file_format: str) -> str:
        """生成描述性名称"""
        components = []
        
        # 添加文件类型前缀
        if file_format in self.type_prefixes:
            components.append(self.type_prefixes[file_format])
        
        # 添加基础名称
        if base_name:
            components.append(base_name)
        
        # 添加关键词
        if keywords:
            # 限制关键词数量，避免文件名过长
            selected_keywords = keywords[:2]
            components.extend(selected_keywords)
        
        # 组合名称，确保不会太长
        descriptive_name = '_'.join(components)
        
        # 限制长度（Windows文件名限制）
        if len(descriptive_name) > 50:
            descriptive_name = descriptive_name[:50]
        
        return descriptive_name
    
    def _finalize_filename(self, descriptive_name: str, file_format: str) -> str:
        """完成文件名（添加时间戳和扩展名）"""
        # 添加时间戳（简化格式）
        timestamp = datetime.now().strftime("%m%d_%H%M")
        
        # 组合最终文件名
        if descriptive_name:
            final_name = f"{descriptive_name}_{timestamp}.{file_format}"
        else:
            final_name = f"output_{timestamp}.{file_format}"
        
        # 确保文件名安全（移除不安全字符）
        safe_filename = re.sub(r'[<>:"/\\|?*]', '_', final_name)
        
        return safe_filename
    
    def suggest_filenames(self, 
                         content: str, 
                         execution_node_data: Dict[str, Any],
                         file_format: str,
                         count: int = 3) -> List[str]:
        """生成多个文件名建议"""
        suggestions = []
        
        # 生成主要建议
        main_suggestion = self.generate_filename(content, execution_node_data, file_format)
        suggestions.append(main_suggestion)
        
        # 生成变体建议
        base_name = self._extract_base_name(execution_node_data)
        keywords = self._extract_content_keywords(content, max_keywords=5)
        
        # 变体1：使用不同的关键词组合
        if len(keywords) > 2:
            alt_keywords = keywords[1:3]  # 使用不同的关键词
            alt_name = self._generate_descriptive_name(base_name, alt_keywords, file_format)
            alt_filename = self._finalize_filename(alt_name, file_format)
            if alt_filename not in suggestions:
                suggestions.append(alt_filename)
        
        # 变体2：简化版本（只用基础名称）
        simple_name = self._generate_descriptive_name(base_name, [], file_format)
        simple_filename = self._finalize_filename(simple_name, file_format)
        if simple_filename not in suggestions:
            suggestions.append(simple_filename)
        
        # 确保返回指定数量的建议
        while len(suggestions) < count:
            timestamp = datetime.now().strftime("%m%d_%H%M%S")
            fallback = f"output_{len(suggestions)}_{timestamp}.{file_format}"
            suggestions.append(fallback)
        
        return suggestions[:count]


# 全局实例
intelligent_naming = IntelligentFileNaming()


def generate_smart_filename(content: str, 
                          execution_node_data: Dict[str, Any],
                          file_format: str,
                          context: Dict[str, Any] = None) -> str:
    """
    便利函数：生成智能文件名
    """
    return intelligent_naming.generate_filename(
        content, execution_node_data, file_format, context
    ) 