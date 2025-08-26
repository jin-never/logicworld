"""
增强的工作流模板库
提供丰富的预定义模板、智能推荐和自定义模板管理
"""
import json
import logging
import uuid
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum

from utils.schemas import Node, Edge, NodeData


class TemplateCategory(Enum):
    """模板分类"""
    DATA_PROCESSING = "data_processing"
    CONTENT_GENERATION = "content_generation"
    API_INTEGRATION = "api_integration"
    AUTOMATION = "automation"
    MONITORING = "monitoring"
    NOTIFICATION = "notification"
    ANALYSIS = "analysis"
    MACHINE_LEARNING = "machine_learning"
    BUSINESS_PROCESS = "business_process"
    CUSTOM = "custom"


class TemplateDifficulty(Enum):
    """模板难度"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


@dataclass
class TemplateMetadata:
    """模板元数据"""
    author: str
    version: str
    tags: List[str]
    difficulty: TemplateDifficulty
    estimated_duration: int  # 分钟
    required_tools: List[str]
    use_cases: List[str]
    prerequisites: List[str]
    success_rate: float = 0.0
    usage_count: int = 0
    rating: float = 0.0
    last_updated: Optional[datetime] = None


class EnhancedWorkflowTemplate:
    """增强的工作流模板"""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        category: TemplateCategory,
        nodes: List[Node],
        edges: List[Edge],
        metadata: TemplateMetadata,
        variables: Optional[Dict[str, Any]] = None,
        documentation: Optional[str] = None
    ):
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.nodes = nodes
        self.edges = edges
        self.metadata = metadata
        self.variables = variables or {}
        self.documentation = documentation
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "nodes": [node.dict() for node in self.nodes],
            "edges": [edge.dict() for edge in self.edges],
            "metadata": asdict(self.metadata),
            "variables": self.variables,
            "documentation": self.documentation,
            "created_at": self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EnhancedWorkflowTemplate':
        """从字典创建模板"""
        nodes = [Node(**node_data) for node_data in data["nodes"]]
        edges = [Edge(**edge_data) for edge_data in data["edges"]]
        
        metadata_data = data["metadata"]
        metadata = TemplateMetadata(
            author=metadata_data["author"],
            version=metadata_data["version"],
            tags=metadata_data["tags"],
            difficulty=TemplateDifficulty(metadata_data["difficulty"]),
            estimated_duration=metadata_data["estimated_duration"],
            required_tools=metadata_data["required_tools"],
            use_cases=metadata_data["use_cases"],
            prerequisites=metadata_data["prerequisites"],
            success_rate=metadata_data.get("success_rate", 0.0),
            usage_count=metadata_data.get("usage_count", 0),
            rating=metadata_data.get("rating", 0.0),
            last_updated=datetime.fromisoformat(metadata_data["last_updated"]) if metadata_data.get("last_updated") else None
        )
        
        template = cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            category=TemplateCategory(data["category"]),
            nodes=nodes,
            edges=edges,
            metadata=metadata,
            variables=data.get("variables", {}),
            documentation=data.get("documentation")
        )
        
        if "created_at" in data:
            template.created_at = datetime.fromisoformat(data["created_at"])
        
        return template
    
    def instantiate(self, variables: Dict[str, Any] = None) -> Dict[str, Any]:
        """实例化模板，替换变量"""
        instance_variables = {**self.variables, **(variables or {})}
        
        # 复制节点和边，替换变量
        instance_nodes = []
        for node in self.nodes:
            node_dict = node.dict()
            node_dict = self._replace_variables(node_dict, instance_variables)
            instance_nodes.append(Node(**node_dict))
        
        instance_edges = []
        for edge in self.edges:
            edge_dict = edge.dict()
            edge_dict = self._replace_variables(edge_dict, instance_variables)
            instance_edges.append(Edge(**edge_dict))
        
        return {
            "nodes": instance_nodes,
            "edges": instance_edges,
            "variables": instance_variables
        }
    
    def _replace_variables(self, obj: Any, variables: Dict[str, Any]) -> Any:
        """递归替换对象中的变量"""
        if isinstance(obj, dict):
            return {k: self._replace_variables(v, variables) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._replace_variables(item, variables) for item in obj]
        elif isinstance(obj, str):
            # 简单的变量替换，格式：{{variable_name}}
            for var_name, var_value in variables.items():
                obj = obj.replace(f"{{{{{var_name}}}}}", str(var_value))
            return obj
        else:
            return obj


class EnhancedTemplateLibrary:
    """增强的模板库"""
    
    def __init__(self, templates_dir: str = "backend/templates"):
        self.templates_dir = Path(templates_dir)
        self.templates_dir.mkdir(exist_ok=True)
        self.templates: Dict[str, EnhancedWorkflowTemplate] = {}
        self.categories: Dict[TemplateCategory, List[str]] = {}
        self.tags_index: Dict[str, Set[str]] = {}
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 初始化分类
        for category in TemplateCategory:
            self.categories[category] = []
        
        # 加载模板
        self._load_predefined_templates()
        self._load_custom_templates()
    
    def _load_predefined_templates(self):
        """加载预定义模板"""
        # 数据处理管道模板
        self._create_data_pipeline_template()
        
        # 内容生成工作流模板
        self._create_content_generation_template()
        
        # API集成模板
        self._create_api_integration_template()
        
        # 自动化监控模板
        self._create_monitoring_template()
        
        # 机器学习工作流模板
        self._create_ml_workflow_template()
        
        # 业务流程自动化模板
        self._create_business_automation_template()
    
    def _create_data_pipeline_template(self):
        """创建数据处理管道模板"""
        nodes = [
            Node(
                id="data_source",
                type="input",
                position={"x": 100, "y": 100},
                data=NodeData(
                    label="数据源",
                    nodeType="material",
                    params={
                        "source_type": "{{source_type}}",
                        "connection_string": "{{connection_string}}",
                        "query": "{{data_query}}"
                    }
                )
            ),
            Node(
                id="data_validation",
                type="process",
                position={"x": 300, "y": 100},
                data=NodeData(
                    label="数据验证",
                    nodeType="execution",
                    params={
                        "validation_rules": "{{validation_rules}}",
                        "error_handling": "log_and_continue"
                    }
                )
            ),
            Node(
                id="data_transformation",
                type="process",
                position={"x": 500, "y": 100},
                data=NodeData(
                    label="数据转换",
                    nodeType="execution",
                    params={
                        "transformation_script": "{{transformation_script}}",
                        "output_format": "{{output_format}}"
                    }
                )
            ),
            Node(
                id="data_output",
                type="output",
                position={"x": 700, "y": 100},
                data=NodeData(
                    label="数据输出",
                    nodeType="result",
                    params={
                        "destination": "{{output_destination}}",
                        "format": "{{output_format}}"
                    }
                )
            )
        ]
        
        edges = [
            Edge(id="e1", source="data_source", target="data_validation"),
            Edge(id="e2", source="data_validation", target="data_transformation"),
            Edge(id="e3", source="data_transformation", target="data_output")
        ]
        
        metadata = TemplateMetadata(
            author="System",
            version="1.0.0",
            tags=["data", "pipeline", "etl", "processing"],
            difficulty=TemplateDifficulty.INTERMEDIATE,
            estimated_duration=30,
            required_tools=["data_connector", "validator", "transformer"],
            use_cases=[
                "ETL数据处理",
                "数据清洗和转换",
                "批量数据处理",
                "数据质量检查"
            ],
            prerequisites=["数据源配置", "转换规则定义"],
            success_rate=0.95
        )
        
        template = EnhancedWorkflowTemplate(
            id="data_pipeline_basic",
            name="基础数据处理管道",
            description="一个标准的数据处理管道，包含数据获取、验证、转换和输出步骤",
            category=TemplateCategory.DATA_PROCESSING,
            nodes=nodes,
            edges=edges,
            metadata=metadata,
            variables={
                "source_type": "database",
                "connection_string": "",
                "data_query": "SELECT * FROM table",
                "validation_rules": "not_null,unique",
                "transformation_script": "",
                "output_format": "json",
                "output_destination": ""
            },
            documentation="""
            # 基础数据处理管道
            
            这个模板提供了一个标准的数据处理流程，适用于大多数ETL场景。
            
            ## 使用步骤
            1. 配置数据源连接
            2. 定义验证规则
            3. 编写转换脚本
            4. 设置输出目标
            
            ## 变量说明
            - source_type: 数据源类型（database, file, api等）
            - connection_string: 数据源连接字符串
            - data_query: 数据查询语句
            - validation_rules: 验证规则列表
            - transformation_script: 数据转换脚本
            - output_format: 输出格式
            - output_destination: 输出目标位置
            """
        )
        
        self._add_template(template)
    
    def _create_content_generation_template(self):
        """创建内容生成模板"""
        nodes = [
            Node(
                id="topic_input",
                type="input",
                position={"x": 100, "y": 100},
                data=NodeData(
                    label="主题输入",
                    nodeType="material",
                    params={
                        "topic": "{{content_topic}}",
                        "requirements": "{{content_requirements}}"
                    }
                )
            ),
            Node(
                id="research",
                type="process",
                position={"x": 300, "y": 100},
                data=NodeData(
                    label="资料研究",
                    nodeType="execution",
                    params={
                        "search_engines": ["google", "bing"],
                        "max_results": 10,
                        "language": "{{language}}"
                    }
                )
            ),
            Node(
                id="content_generation",
                type="process",
                position={"x": 500, "y": 100},
                data=NodeData(
                    label="内容生成",
                    nodeType="execution",
                    params={
                        "ai_model": "{{ai_model}}",
                        "style": "{{writing_style}}",
                        "length": "{{content_length}}"
                    }
                )
            ),
            Node(
                id="content_review",
                type="process",
                position={"x": 700, "y": 100},
                data=NodeData(
                    label="内容审核",
                    nodeType="execution",
                    params={
                        "check_grammar": True,
                        "check_plagiarism": True,
                        "check_quality": True
                    }
                )
            ),
            Node(
                id="final_output",
                type="output",
                position={"x": 900, "y": 100},
                data=NodeData(
                    label="最终输出",
                    nodeType="result",
                    params={
                        "format": "{{output_format}}",
                        "destination": "{{output_path}}"
                    }
                )
            )
        ]
        
        edges = [
            Edge(id="e1", source="topic_input", target="research"),
            Edge(id="e2", source="research", target="content_generation"),
            Edge(id="e3", source="content_generation", target="content_review"),
            Edge(id="e4", source="content_review", target="final_output")
        ]
        
        metadata = TemplateMetadata(
            author="System",
            version="1.0.0",
            tags=["content", "generation", "ai", "writing"],
            difficulty=TemplateDifficulty.INTERMEDIATE,
            estimated_duration=45,
            required_tools=["web_search", "ai_generator", "content_checker"],
            use_cases=[
                "博客文章生成",
                "营销文案创作",
                "技术文档编写",
                "社交媒体内容"
            ],
            prerequisites=["AI模型配置", "内容要求定义"],
            success_rate=0.88
        )
        
        template = EnhancedWorkflowTemplate(
            id="content_generation_basic",
            name="智能内容生成工作流",
            description="基于AI的智能内容生成流程，包含研究、生成、审核等步骤",
            category=TemplateCategory.CONTENT_GENERATION,
            nodes=nodes,
            edges=edges,
            metadata=metadata,
            variables={
                "content_topic": "",
                "content_requirements": "",
                "language": "zh-CN",
                "ai_model": "gpt-4",
                "writing_style": "professional",
                "content_length": "medium",
                "output_format": "markdown",
                "output_path": ""
            }
        )
        
        self._add_template(template)
    
    def _create_api_integration_template(self):
        """创建API集成模板"""
        # 实现API集成模板
        pass
    
    def _create_monitoring_template(self):
        """创建监控模板"""
        # 实现监控模板
        pass
    
    def _create_ml_workflow_template(self):
        """创建机器学习工作流模板"""
        # 实现机器学习模板
        pass
    
    def _create_business_automation_template(self):
        """创建业务流程自动化模板"""
        # 实现业务自动化模板
        pass
    
    def _add_template(self, template: EnhancedWorkflowTemplate):
        """添加模板到库中"""
        self.templates[template.id] = template
        self.categories[template.category].append(template.id)
        
        # 更新标签索引
        for tag in template.metadata.tags:
            if tag not in self.tags_index:
                self.tags_index[tag] = set()
            self.tags_index[tag].add(template.id)
        
        self.logger.info(f"Added template: {template.name} ({template.id})")
    
    def _load_custom_templates(self):
        """加载自定义模板"""
        custom_templates_file = self.templates_dir / "custom_templates.json"
        if custom_templates_file.exists():
            try:
                with open(custom_templates_file, 'r', encoding='utf-8') as f:
                    templates_data = json.load(f)
                
                for template_data in templates_data:
                    template = EnhancedWorkflowTemplate.from_dict(template_data)
                    self._add_template(template)
                
                self.logger.info(f"Loaded {len(templates_data)} custom templates")
            except Exception as e:
                self.logger.error(f"Failed to load custom templates: {e}")
    
    def get_template(self, template_id: str) -> Optional[EnhancedWorkflowTemplate]:
        """获取模板"""
        return self.templates.get(template_id)
    
    def list_templates(self, category: Optional[TemplateCategory] = None,
                      tags: Optional[List[str]] = None,
                      difficulty: Optional[TemplateDifficulty] = None) -> List[EnhancedWorkflowTemplate]:
        """列出模板"""
        templates = list(self.templates.values())
        
        # 按分类过滤
        if category:
            templates = [t for t in templates if t.category == category]
        
        # 按标签过滤
        if tags:
            templates = [t for t in templates if any(tag in t.metadata.tags for tag in tags)]
        
        # 按难度过滤
        if difficulty:
            templates = [t for t in templates if t.metadata.difficulty == difficulty]
        
        return templates
    
    def search_templates(self, query: str) -> List[EnhancedWorkflowTemplate]:
        """搜索模板"""
        query = query.lower()
        results = []
        
        for template in self.templates.values():
            # 搜索名称、描述、标签
            if (query in template.name.lower() or
                query in template.description.lower() or
                any(query in tag.lower() for tag in template.metadata.tags) or
                any(query in use_case.lower() for use_case in template.metadata.use_cases)):
                results.append(template)
        
        return results
    
    def recommend_templates(self, user_input: str, available_tools: List[str]) -> List[EnhancedWorkflowTemplate]:
        """推荐模板"""
        # 简化的推荐算法
        recommendations = []
        
        # 基于关键词匹配
        keywords = user_input.lower().split()
        
        for template in self.templates.values():
            score = 0
            
            # 检查工具匹配度
            tool_match = len(set(template.metadata.required_tools) & set(available_tools))
            score += tool_match * 2
            
            # 检查关键词匹配
            for keyword in keywords:
                if keyword in template.name.lower():
                    score += 3
                if keyword in template.description.lower():
                    score += 2
                if any(keyword in tag for tag in template.metadata.tags):
                    score += 1
            
            if score > 0:
                recommendations.append((template, score))
        
        # 按分数排序
        recommendations.sort(key=lambda x: x[1], reverse=True)
        
        return [template for template, score in recommendations[:5]]
    
    def save_custom_template(self, template: EnhancedWorkflowTemplate):
        """保存自定义模板"""
        self._add_template(template)
        
        # 保存到文件
        custom_templates_file = self.templates_dir / "custom_templates.json"
        custom_templates = [t for t in self.templates.values() if t.category == TemplateCategory.CUSTOM]
        
        try:
            with open(custom_templates_file, 'w', encoding='utf-8') as f:
                json.dump([t.to_dict() for t in custom_templates], f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Saved custom template: {template.name}")
        except Exception as e:
            self.logger.error(f"Failed to save custom template: {e}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取模板库统计信息"""
        stats = {
            "total_templates": len(self.templates),
            "categories": {cat.value: len(templates) for cat, templates in self.categories.items()},
            "difficulty_distribution": {},
            "most_used_tags": [],
            "average_rating": 0.0
        }
        
        # 难度分布
        for difficulty in TemplateDifficulty:
            count = len([t for t in self.templates.values() if t.metadata.difficulty == difficulty])
            stats["difficulty_distribution"][difficulty.value] = count
        
        # 最常用标签
        tag_counts = {}
        for template in self.templates.values():
            for tag in template.metadata.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        stats["most_used_tags"] = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # 平均评分
        ratings = [t.metadata.rating for t in self.templates.values() if t.metadata.rating > 0]
        if ratings:
            stats["average_rating"] = sum(ratings) / len(ratings)
        
        return stats


# 全局模板库实例
enhanced_template_library = EnhancedTemplateLibrary()
