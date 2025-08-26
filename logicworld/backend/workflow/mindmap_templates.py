"""
思维导图工作流模板系统
提供专门为思维导图设计的工作流模板
"""
import json
import logging
import os
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

from utils.schemas import Node, Edge


class MindmapTemplate:
    """思维导图模板类"""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        category: str,
        tags: List[str],
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        thumbnail: Optional[str] = None,
        difficulty: str = "beginner",  # beginner, intermediate, advanced
        estimated_time: int = 5,  # 预估执行时间（分钟）
        use_cases: List[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.tags = tags or []
        self.nodes = nodes
        self.edges = edges
        self.thumbnail = thumbnail
        self.difficulty = difficulty
        self.estimated_time = estimated_time
        self.use_cases = use_cases or []
        self.metadata = metadata or {}
        self.created_at = datetime.now()
        self.usage_count = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "tags": self.tags,
            "nodes": self.nodes,
            "edges": self.edges,
            "thumbnail": self.thumbnail,
            "difficulty": self.difficulty,
            "estimated_time": self.estimated_time,
            "use_cases": self.use_cases,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "usage_count": self.usage_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MindmapTemplate':
        """从字典创建模板"""
        template = cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            category=data["category"],
            tags=data.get("tags", []),
            nodes=data["nodes"],
            edges=data["edges"],
            thumbnail=data.get("thumbnail"),
            difficulty=data.get("difficulty", "beginner"),
            estimated_time=data.get("estimated_time", 5),
            use_cases=data.get("use_cases", []),
            metadata=data.get("metadata", {})
        )
        
        if "created_at" in data:
            template.created_at = datetime.fromisoformat(data["created_at"])
        
        template.usage_count = data.get("usage_count", 0)
        return template


class MindmapTemplateManager:
    """思维导图模板管理器"""
    
    def __init__(self, templates_dir: str = "backend/templates"):
        # 确保路径是相对于项目根目录的
        if not os.path.isabs(templates_dir):
            # 获取当前文件的目录，然后向上找到backend目录
            current_dir = Path(__file__).parent
            backend_dir = current_dir.parent
            project_root = backend_dir.parent
            self.templates_dir = project_root / templates_dir
        else:
            self.templates_dir = Path(templates_dir)

        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self.templates: Dict[str, MindmapTemplate] = {}
        self.categories: Dict[str, List[str]] = {}
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 加载预定义模板
        self._load_predefined_templates()
        self._load_custom_templates()
    
    def _load_predefined_templates(self):
        """加载预定义模板"""
        # 文档处理工作流
        self._create_document_processing_template()
        
        # AI内容生成工作流
        self._create_ai_content_generation_template()
        
        # 数据分析工作流
        self._create_data_analysis_template()
    
    def _create_document_processing_template(self):
        """创建文档处理模板"""
        nodes = [
            {
                "id": "material-1",
                "type": "material-node",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "📄 文档输入",
                    "description": "上传需要处理的文档",
                    "fileTypes": ["pdf", "doc", "docx", "txt"],
                    "maxFiles": 10,
                    "processingMode": "batch"
                }
            },
            {
                "id": "execution-1",
                "type": "execution-node",
                "position": {"x": 400, "y": 100},
                "data": {
                    "label": "🤖 文档分析",
                    "taskDescription": "分析文档内容，提取关键信息和摘要",
                    "aiModel": "gpt-4",
                    "executionMode": "normal",
                    "prompt": "请分析以下文档内容，提取关键信息、主要观点和重要数据，生成结构化摘要。"
                }
            },
            {
                "id": "condition-1",
                "type": "condition-node",
                "position": {"x": 700, "y": 100},
                "data": {
                    "label": "✅ 质量检查",
                    "conditions": [
                        {
                            "leftOperand": "@execution-1.result.confidence",
                            "operator": "greater",
                            "rightOperand": "0.8",
                            "dataType": "number"
                        }
                    ],
                    "logicalOperator": "AND"
                }
            },
            {
                "id": "result-1",
                "type": "result-node",
                "position": {"x": 1000, "y": 100},
                "data": {
                    "label": "📊 生成报告",
                    "outputType": "file",
                    "outputFormat": "pdf",
                    "fileName": "document_analysis_report",
                    "quality": "high"
                }
            }
        ]
        
        edges = [
            {"id": "e1", "source": "material-1", "target": "execution-1"},
            {"id": "e2", "source": "execution-1", "target": "condition-1"},
            {"id": "e3", "source": "condition-1", "target": "result-1"}
        ]
        
        template = MindmapTemplate(
            id="doc-processing-basic",
            name="📄 文档处理工作流",
            description="自动分析文档内容，提取关键信息并生成结构化报告",
            category="文档处理",
            tags=["文档", "AI分析", "报告生成", "自动化"],
            nodes=nodes,
            edges=edges,
            difficulty="beginner",
            estimated_time=10,
            use_cases=[
                "合同文档分析",
                "研究报告摘要",
                "会议纪要整理",
                "技术文档解析"
            ]
        )
        
        self.add_template(template)
    
    def _create_ai_content_generation_template(self):
        """创建AI内容生成模板"""
        nodes = [
            {
                "id": "material-1",
                "type": "material-node",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "💡 创意输入",
                    "description": "输入创作主题和要求",
                    "inputType": "text",
                    "placeholder": "请输入您的创作主题、风格要求和目标受众..."
                }
            },
            {
                "id": "execution-1",
                "type": "execution-node",
                "position": {"x": 400, "y": 100},
                "data": {
                    "label": "✍️ 内容创作",
                    "taskDescription": "根据输入的主题和要求，创作高质量的内容",
                    "aiModel": "gpt-4",
                    "executionMode": "normal",
                    "prompt": "请根据提供的主题和要求，创作一篇高质量的内容。要求：1. 结构清晰 2. 语言流畅 3. 内容丰富 4. 符合目标受众需求"
                }
            },
            {
                "id": "execution-2",
                "type": "execution-node",
                "position": {"x": 400, "y": 300},
                "data": {
                    "label": "🎨 内容优化",
                    "taskDescription": "对生成的内容进行优化和润色",
                    "aiModel": "gpt-4",
                    "executionMode": "normal",
                    "prompt": "请对以下内容进行优化：1. 改善语言表达 2. 增强逻辑性 3. 提升可读性 4. 确保内容质量"
                }
            },
            {
                "id": "condition-1",
                "type": "condition-node",
                "position": {"x": 700, "y": 200},
                "data": {
                    "label": "📏 长度检查",
                    "conditions": [
                        {
                            "leftOperand": "@execution-2.result.length",
                            "operator": "greater",
                            "rightOperand": "500",
                            "dataType": "number"
                        }
                    ]
                }
            },
            {
                "id": "result-1",
                "type": "result-node",
                "position": {"x": 1000, "y": 200},
                "data": {
                    "label": "📝 输出内容",
                    "outputType": "file",
                    "outputFormat": "md",
                    "fileName": "generated_content",
                    "quality": "high"
                }
            }
        ]
        
        edges = [
            {"id": "e1", "source": "material-1", "target": "execution-1"},
            {"id": "e2", "source": "execution-1", "target": "execution-2"},
            {"id": "e3", "source": "execution-2", "target": "condition-1"},
            {"id": "e4", "source": "condition-1", "target": "result-1"}
        ]
        
        template = MindmapTemplate(
            id="ai-content-generation",
            name="✍️ AI内容生成工作流",
            description="使用AI自动生成和优化高质量内容",
            category="内容创作",
            tags=["AI生成", "内容创作", "文本优化", "自动化"],
            nodes=nodes,
            edges=edges,
            difficulty="intermediate",
            estimated_time=15,
            use_cases=[
                "博客文章创作",
                "营销文案生成",
                "产品描述编写",
                "社交媒体内容"
            ]
        )
        
        self.add_template(template)
    
    def _create_data_analysis_template(self):
        """创建数据分析模板"""
        nodes = [
            {
                "id": "material-1",
                "type": "material-node",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "📊 数据输入",
                    "description": "上传需要分析的数据文件",
                    "fileTypes": ["csv", "xlsx", "json"],
                    "maxFiles": 5,
                    "processingMode": "analysis"
                }
            },
            {
                "id": "execution-1",
                "type": "execution-node",
                "position": {"x": 400, "y": 100},
                "data": {
                    "label": "🔍 数据探索",
                    "taskDescription": "对数据进行初步探索和统计分析",
                    "aiModel": "gpt-4",
                    "executionMode": "normal",
                    "prompt": "请对提供的数据进行探索性分析：1. 数据概览 2. 基本统计 3. 数据质量评估 4. 异常值检测"
                }
            },
            {
                "id": "condition-1",
                "type": "condition-node",
                "position": {"x": 700, "y": 100},
                "data": {
                    "label": "✅ 数据质量",
                    "conditions": [
                        {
                            "leftOperand": "@execution-1.result.quality_score",
                            "operator": "greater",
                            "rightOperand": "0.7",
                            "dataType": "number"
                        }
                    ]
                }
            },
            {
                "id": "execution-2",
                "type": "execution-node",
                "position": {"x": 1000, "y": 100},
                "data": {
                    "label": "📈 深度分析",
                    "taskDescription": "进行深度数据分析和洞察挖掘",
                    "aiModel": "gpt-4",
                    "executionMode": "normal",
                    "prompt": "基于数据探索结果，进行深度分析：1. 趋势分析 2. 相关性分析 3. 模式识别 4. 业务洞察"
                }
            },
            {
                "id": "result-1",
                "type": "result-node",
                "position": {"x": 1300, "y": 100},
                "data": {
                    "label": "📋 分析报告",
                    "outputType": "report",
                    "outputFormat": "html",
                    "fileName": "data_analysis_report",
                    "quality": "high"
                }
            }
        ]
        
        edges = [
            {"id": "e1", "source": "material-1", "target": "execution-1"},
            {"id": "e2", "source": "execution-1", "target": "condition-1"},
            {"id": "e3", "source": "condition-1", "target": "execution-2"},
            {"id": "e4", "source": "execution-2", "target": "result-1"}
        ]
        
        template = MindmapTemplate(
            id="data-analysis-workflow",
            name="📊 数据分析工作流",
            description="自动化数据探索、分析和报告生成",
            category="数据分析",
            tags=["数据分析", "统计", "报告", "洞察"],
            nodes=nodes,
            edges=edges,
            difficulty="intermediate",
            estimated_time=20,
            use_cases=[
                "业务数据分析",
                "用户行为分析",
                "销售数据洞察",
                "市场趋势分析"
            ]
        )
        
        self.add_template(template)
    
    def _load_custom_templates(self):
        """加载自定义模板"""
        templates_file = self.templates_dir / "custom_templates.json"
        if templates_file.exists():
            try:
                with open(templates_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for template_data in data:
                        template = MindmapTemplate.from_dict(template_data)
                        self.templates[template.id] = template
                        self._update_categories(template)
            except Exception as e:
                self.logger.error(f"Failed to load custom templates: {e}")
    
    def _update_categories(self, template: MindmapTemplate):
        """更新分类索引"""
        if template.category not in self.categories:
            self.categories[template.category] = []
        if template.id not in self.categories[template.category]:
            self.categories[template.category].append(template.id)
    
    def add_template(self, template: MindmapTemplate):
        """添加模板"""
        self.templates[template.id] = template
        self._update_categories(template)
        self.logger.info(f"Added template: {template.name}")
    
    def get_template(self, template_id: str) -> Optional[MindmapTemplate]:
        """获取模板"""
        return self.templates.get(template_id)
    
    def get_templates_by_category(self, category: str) -> List[MindmapTemplate]:
        """按分类获取模板"""
        template_ids = self.categories.get(category, [])
        return [self.templates[tid] for tid in template_ids if tid in self.templates]
    
    def get_all_templates(self) -> List[MindmapTemplate]:
        """获取所有模板"""
        return list(self.templates.values())
    
    def get_categories(self) -> List[str]:
        """获取所有分类"""
        return list(self.categories.keys())
    
    def search_templates(self, query: str, category: str = None, tags: List[str] = None) -> List[MindmapTemplate]:
        """搜索模板"""
        results = []
        query_lower = query.lower() if query else ""
        
        for template in self.templates.values():
            # 分类过滤
            if category and template.category != category:
                continue
            
            # 标签过滤
            if tags and not any(tag in template.tags for tag in tags):
                continue
            
            # 文本搜索
            if query:
                searchable_text = f"{template.name} {template.description} {' '.join(template.tags)}".lower()
                if query_lower not in searchable_text:
                    continue
            
            results.append(template)
        
        # 按使用次数排序
        results.sort(key=lambda t: t.usage_count, reverse=True)
        return results
    
    def use_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """使用模板（增加使用计数并返回模板数据）"""
        template = self.get_template(template_id)
        if template:
            template.usage_count += 1
            self._save_custom_templates()
            return template.to_dict()
        return None
    
    def _save_custom_templates(self):
        """保存自定义模板"""
        try:
            custom_templates = [
                template.to_dict() 
                for template in self.templates.values() 
                if not template.id.startswith(('doc-processing', 'ai-content', 'data-analysis'))
            ]
            
            templates_file = self.templates_dir / "custom_templates.json"
            with open(templates_file, 'w', encoding='utf-8') as f:
                json.dump(custom_templates, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save custom templates: {e}")


# 全局模板管理器实例
mindmap_template_manager = MindmapTemplateManager()
