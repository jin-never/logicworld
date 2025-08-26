"""
工作流模板管理模块
提供预定义的工作流模板和示例
"""
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

from utils.schemas import Node, Edge, NodeData


class WorkflowTemplate:
    """工作流模板类"""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        category: str,
        nodes: List[Node],
        edges: List[Edge],
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.nodes = nodes
        self.edges = edges
        self.metadata = metadata or {}
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "nodes": [node.dict() for node in self.nodes],
            "edges": [edge.dict() for edge in self.edges],
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkflowTemplate':
        """从字典创建模板"""
        nodes = [Node(**node_data) for node_data in data["nodes"]]
        edges = [Edge(**edge_data) for edge_data in data["edges"]]
        
        template = cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            category=data["category"],
            nodes=nodes,
            edges=edges,
            metadata=data.get("metadata", {})
        )
        
        if "created_at" in data:
            template.created_at = datetime.fromisoformat(data["created_at"])
        
        return template


class TemplateManager:
    """模板管理器"""
    
    def __init__(self, templates_dir: str = "backend/templates"):
        self.templates_dir = Path(templates_dir)
        self.templates_dir.mkdir(exist_ok=True)
        self.templates: Dict[str, WorkflowTemplate] = {}
        self.categories: Dict[str, List[str]] = {}
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 加载预定义模板
        self._load_predefined_templates()
        self._load_custom_templates()
    
    def _load_predefined_templates(self):
        """加载预定义模板"""
        # 数据处理工作流模板
        self._create_data_processing_template()
        
        # API集成工作流模板
        self._create_api_integration_template()
        
        # 通知工作流模板
        self._create_notification_template()
        
        # 数据验证工作流模板
        self._create_data_validation_template()
        
        # 条件分支工作流模板
        self._create_conditional_workflow_template()
        
        # 循环处理工作流模板
        self._create_loop_processing_template()
    
    def _create_data_processing_template(self):
        """创建数据处理模板"""
        nodes = [
            Node(
                id="start-1",
                type="enhanced",
                position={"x": 100, "y": 100},
                data=NodeData(
                    label="开始",
                    nodeType="start-topic-node",
                    description="工作流开始节点",
                    outputs=["data"]
                )
            ),
            Node(
                id="http-1",
                type="enhanced",
                position={"x": 300, "y": 100},
                data=NodeData(
                    label="获取数据",
                    nodeType="http-request-node",
                    description="从API获取数据",
                    params={
                        "url": "https://api.example.com/data",
                        "method": "GET",
                        "headers": {"Content-Type": "application/json"}
                    },
                    inputs=["trigger"],
                    outputs=["response"]
                )
            ),
            Node(
                id="transform-1",
                type="enhanced",
                position={"x": 500, "y": 100},
                data=NodeData(
                    label="数据转换",
                    nodeType="data-transform-node",
                    description="转换数据格式",
                    params={
                        "transform_type": "map",
                        "data": "@http-1.response",
                        "mapping": {
                            "id": "id",
                            "name": "title",
                            "value": "amount"
                        }
                    },
                    inputs=["data"],
                    outputs=["result"]
                )
            ),
            Node(
                id="validate-1",
                type="enhanced",
                position={"x": 700, "y": 100},
                data=NodeData(
                    label="数据验证",
                    nodeType="data-validation-node",
                    description="验证数据完整性",
                    params={
                        "data": "@transform-1.result",
                        "validation_rules": [
                            {"type": "required", "field": "id"},
                            {"type": "required", "field": "name"},
                            {"type": "type", "field": "value", "expected": "number"}
                        ]
                    },
                    inputs=["data"],
                    outputs=["result"]
                )
            ),
            Node(
                id="end-1",
                type="enhanced",
                position={"x": 900, "y": 100},
                data=NodeData(
                    label="结束",
                    nodeType="end-topic-node",
                    description="工作流结束节点",
                    inputs=["data"]
                )
            )
        ]
        
        edges = [
            Edge(id="e1", source="start-1", target="http-1"),
            Edge(id="e2", source="http-1", target="transform-1"),
            Edge(id="e3", source="transform-1", target="validate-1"),
            Edge(id="e4", source="validate-1", target="end-1")
        ]
        
        template = WorkflowTemplate(
            id="data-processing-basic",
            name="基础数据处理",
            description="从API获取数据，进行转换和验证的基础工作流",
            category="数据处理",
            nodes=nodes,
            edges=edges,
            metadata={
                "difficulty": "初级",
                "estimated_time": "5分钟",
                "tags": ["数据处理", "API", "验证"]
            }
        )
        
        self.add_template(template)
    
    def _create_api_integration_template(self):
        """创建API集成模板"""
        nodes = [
            Node(
                id="start-2",
                type="enhanced",
                position={"x": 100, "y": 100},
                data=NodeData(
                    label="开始",
                    nodeType="start-topic-node",
                    outputs=["data"]
                )
            ),
            Node(
                id="http-get",
                type="enhanced",
                position={"x": 300, "y": 100},
                data=NodeData(
                    label="GET请求",
                    nodeType="http-request-node",
                    params={
                        "url": "https://jsonplaceholder.typicode.com/posts/1",
                        "method": "GET"
                    },
                    inputs=["trigger"],
                    outputs=["response"]
                )
            ),
            Node(
                id="condition-1",
                type="enhanced",
                position={"x": 500, "y": 100},
                data=NodeData(
                    label="检查状态",
                    nodeType="condition-node",
                    params={
                        "condition_type": "simple",
                        "left_value": "@http-get.response.status_code",
                        "operator": "==",
                        "right_value": 200
                    },
                    inputs=["data"],
                    outputs=["result"]
                )
            ),
            Node(
                id="http-post",
                type="enhanced",
                position={"x": 700, "y": 50},
                data=NodeData(
                    label="POST请求",
                    nodeType="http-request-node",
                    params={
                        "url": "https://jsonplaceholder.typicode.com/posts",
                        "method": "POST",
                        "data": {
                            "title": "@http-get.response.data.title",
                            "body": "Updated content",
                            "userId": "@http-get.response.data.userId"
                        }
                    },
                    inputs=["data"],
                    outputs=["response"]
                )
            ),
            Node(
                id="log-error",
                type="enhanced",
                position={"x": 700, "y": 150},
                data=NodeData(
                    label="记录错误",
                    nodeType="log-node",
                    params={
                        "message": "API请求失败: @http-get.response",
                        "log_level": "error"
                    },
                    inputs=["data"],
                    outputs=["result"]
                )
            )
        ]
        
        edges = [
            Edge(id="e1", source="start-2", target="http-get"),
            Edge(id="e2", source="http-get", target="condition-1"),
            Edge(id="e3", source="condition-1", target="http-post", label="成功"),
            Edge(id="e4", source="condition-1", target="log-error", label="失败")
        ]
        
        template = WorkflowTemplate(
            id="api-integration-conditional",
            name="条件API集成",
            description="根据API响应状态执行不同操作的工作流",
            category="API集成",
            nodes=nodes,
            edges=edges,
            metadata={
                "difficulty": "中级",
                "estimated_time": "10分钟",
                "tags": ["API", "条件判断", "错误处理"]
            }
        )
        
        self.add_template(template)
    
    def _create_notification_template(self):
        """创建通知模板"""
        nodes = [
            Node(
                id="start-3",
                type="enhanced",
                position={"x": 100, "y": 100},
                data=NodeData(
                    label="开始",
                    nodeType="start-topic-node",
                    outputs=["data"]
                )
            ),
            Node(
                id="delay-1",
                type="enhanced",
                position={"x": 300, "y": 100},
                data=NodeData(
                    label="等待5秒",
                    nodeType="delay-node",
                    params={
                        "delay_seconds": 5,
                        "delay_type": "fixed"
                    },
                    inputs=["trigger"],
                    outputs=["result"]
                )
            ),
            Node(
                id="email-1",
                type="enhanced",
                position={"x": 500, "y": 100},
                data=NodeData(
                    label="发送邮件",
                    nodeType="email-node",
                    params={
                        "smtp_server": "smtp.gmail.com",
                        "smtp_port": 587,
                        "username": "your-email@gmail.com",
                        "password": "your-password",
                        "to_email": "recipient@example.com",
                        "subject": "工作流通知",
                        "body": "工作流已成功执行完成！"
                    },
                    inputs=["data"],
                    outputs=["result"]
                )
            ),
            Node(
                id="log-1",
                type="enhanced",
                position={"x": 700, "y": 100},
                data=NodeData(
                    label="记录日志",
                    nodeType="log-node",
                    params={
                        "message": "通知已发送: @email-1.result",
                        "log_level": "info"
                    },
                    inputs=["data"],
                    outputs=["result"]
                )
            )
        ]
        
        edges = [
            Edge(id="e1", source="start-3", target="delay-1"),
            Edge(id="e2", source="delay-1", target="email-1"),
            Edge(id="e3", source="email-1", target="log-1")
        ]
        
        template = WorkflowTemplate(
            id="notification-email",
            name="邮件通知",
            description="延迟后发送邮件通知的工作流",
            category="通知",
            nodes=nodes,
            edges=edges,
            metadata={
                "difficulty": "初级",
                "estimated_time": "3分钟",
                "tags": ["通知", "邮件", "延迟"]
            }
        )
        
        self.add_template(template)
    
    def _create_data_validation_template(self):
        """创建数据验证模板"""
        # 实现数据验证模板...
        pass
    
    def _create_conditional_workflow_template(self):
        """创建条件分支模板"""
        # 实现条件分支模板...
        pass
    
    def _create_loop_processing_template(self):
        """创建循环处理模板"""
        # 实现循环处理模板...
        pass
    
    def _load_custom_templates(self):
        """加载自定义模板"""
        try:
            for template_file in self.templates_dir.glob("*.json"):
                with open(template_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    template = WorkflowTemplate.from_dict(data)
                    self.add_template(template)
        except Exception as e:
            self.logger.error(f"Failed to load custom templates: {e}")
    
    def add_template(self, template: WorkflowTemplate):
        """添加模板"""
        self.templates[template.id] = template
        
        # 更新分类
        if template.category not in self.categories:
            self.categories[template.category] = []
        
        if template.id not in self.categories[template.category]:
            self.categories[template.category].append(template.id)
    
    def get_template(self, template_id: str) -> Optional[WorkflowTemplate]:
        """获取模板"""
        return self.templates.get(template_id)
    
    def get_templates_by_category(self, category: str) -> List[WorkflowTemplate]:
        """按分类获取模板"""
        template_ids = self.categories.get(category, [])
        return [self.templates[tid] for tid in template_ids if tid in self.templates]
    
    def get_all_templates(self) -> List[WorkflowTemplate]:
        """获取所有模板"""
        return list(self.templates.values())
    
    def get_categories(self) -> List[str]:
        """获取所有分类"""
        return list(self.categories.keys())
    
    def search_templates(self, query: str) -> List[WorkflowTemplate]:
        """搜索模板"""
        query = query.lower()
        results = []
        
        for template in self.templates.values():
            if (query in template.name.lower() or
                query in template.description.lower() or
                query in template.category.lower() or
                any(query in tag.lower() for tag in template.metadata.get("tags", []))):
                results.append(template)
        
        return results
    
    def save_template(self, template: WorkflowTemplate):
        """保存模板到文件"""
        try:
            template_file = self.templates_dir / f"{template.id}.json"
            with open(template_file, 'w', encoding='utf-8') as f:
                json.dump(template.to_dict(), f, ensure_ascii=False, indent=2)
            
            self.add_template(template)
            self.logger.info(f"Template saved: {template.id}")
        except Exception as e:
            self.logger.error(f"Failed to save template {template.id}: {e}")
            raise


# 全局模板管理器实例
template_manager = TemplateManager()
