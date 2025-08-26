"""
教程和文档生成模块
自动生成工作流教程和使用文档
"""
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

from workflow_templates import WorkflowTemplate, template_manager


class TutorialStep:
    """教程步骤"""
    
    def __init__(
        self,
        step_number: int,
        title: str,
        description: str,
        action: str,
        target: Optional[str] = None,
        expected_result: Optional[str] = None,
        tips: Optional[List[str]] = None
    ):
        self.step_number = step_number
        self.title = title
        self.description = description
        self.action = action
        self.target = target
        self.expected_result = expected_result
        self.tips = tips or []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_number": self.step_number,
            "title": self.title,
            "description": self.description,
            "action": self.action,
            "target": self.target,
            "expected_result": self.expected_result,
            "tips": self.tips
        }


class Tutorial:
    """教程类"""
    
    def __init__(
        self,
        id: str,
        title: str,
        description: str,
        difficulty: str,
        estimated_time: str,
        prerequisites: List[str],
        learning_objectives: List[str],
        steps: List[TutorialStep],
        template_id: Optional[str] = None
    ):
        self.id = id
        self.title = title
        self.description = description
        self.difficulty = difficulty
        self.estimated_time = estimated_time
        self.prerequisites = prerequisites
        self.learning_objectives = learning_objectives
        self.steps = steps
        self.template_id = template_id
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
            "estimated_time": self.estimated_time,
            "prerequisites": self.prerequisites,
            "learning_objectives": self.learning_objectives,
            "steps": [step.to_dict() for step in self.steps],
            "template_id": self.template_id,
            "created_at": self.created_at.isoformat()
        }


class TutorialGenerator:
    """教程生成器"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.tutorials: Dict[str, Tutorial] = {}
        self._generate_basic_tutorials()
    
    def _generate_basic_tutorials(self):
        """生成基础教程"""
        # 生成平台入门教程
        self._generate_getting_started_tutorial()
        
        # 为每个模板生成教程
        for template in template_manager.get_all_templates():
            self._generate_template_tutorial(template)
    
    def _generate_getting_started_tutorial(self):
        """生成入门教程"""
        steps = [
            TutorialStep(
                step_number=1,
                title="欢迎使用工作流平台",
                description="了解工作流平台的基本概念和界面布局",
                action="观察界面",
                expected_result="熟悉左侧节点库、中央画布和右侧属性面板",
                tips=[
                    "左侧是节点工具栏，包含各种类型的节点",
                    "中央是工作流画布，用于拖拽和连接节点",
                    "右侧是属性面板，用于配置选中节点的参数"
                ]
            ),
            TutorialStep(
                step_number=2,
                title="添加第一个节点",
                description="从节点库中添加一个开始节点到画布",
                action="点击节点库中的'开始'节点",
                target="start-topic-node",
                expected_result="画布上出现一个开始节点",
                tips=[
                    "开始节点是工作流的入口点",
                    "每个工作流都应该有一个开始节点"
                ]
            ),
            TutorialStep(
                step_number=3,
                title="添加HTTP请求节点",
                description="添加一个HTTP请求节点来获取数据",
                action="点击节点库中的'HTTP请求'节点",
                target="http-request-node",
                expected_result="画布上出现一个HTTP请求节点",
                tips=[
                    "HTTP请求节点可以调用外部API",
                    "支持GET、POST、PUT、DELETE等方法"
                ]
            ),
            TutorialStep(
                step_number=4,
                title="连接节点",
                description="将开始节点连接到HTTP请求节点",
                action="从开始节点的输出点拖拽到HTTP请求节点的输入点",
                expected_result="两个节点之间出现连接线",
                tips=[
                    "连接线表示数据流向",
                    "只能从输出点连接到输入点"
                ]
            ),
            TutorialStep(
                step_number=5,
                title="配置节点参数",
                description="选中HTTP请求节点并配置其参数",
                action="点击HTTP请求节点，在右侧属性面板中配置URL",
                target="http-request-node",
                expected_result="节点参数被正确配置",
                tips=[
                    "URL是必填参数",
                    "可以使用测试API：https://jsonplaceholder.typicode.com/posts/1"
                ]
            ),
            TutorialStep(
                step_number=6,
                title="添加结束节点",
                description="添加结束节点完成工作流",
                action="添加结束节点并连接到HTTP请求节点",
                target="end-topic-node",
                expected_result="完整的工作流链路",
                tips=[
                    "结束节点标记工作流的结束",
                    "可以有多个结束节点"
                ]
            ),
            TutorialStep(
                step_number=7,
                title="执行工作流",
                description="点击执行按钮运行工作流",
                action="点击工具栏中的'预览'按钮，然后点击'开始执行'",
                expected_result="工作流成功执行并显示结果",
                tips=[
                    "执行前会进行验证检查",
                    "可以在日志中查看执行过程"
                ]
            )
        ]
        
        tutorial = Tutorial(
            id="getting-started",
            title="工作流平台入门",
            description="学习如何使用工作流平台创建和执行第一个工作流",
            difficulty="初级",
            estimated_time="15分钟",
            prerequisites=[],
            learning_objectives=[
                "了解工作流平台的基本界面",
                "学会添加和连接节点",
                "掌握节点参数配置",
                "能够执行简单的工作流"
            ],
            steps=steps
        )
        
        self.tutorials[tutorial.id] = tutorial
    
    def _generate_template_tutorial(self, template: WorkflowTemplate):
        """为模板生成教程"""
        steps = []
        step_number = 1
        
        # 介绍步骤
        steps.append(TutorialStep(
            step_number=step_number,
            title=f"了解{template.name}工作流",
            description=template.description,
            action="观察模板结构",
            expected_result="理解工作流的目标和结构"
        ))
        step_number += 1
        
        # 为每个节点生成步骤
        for i, node in enumerate(template.nodes):
            if node.data.nodeType == "start-topic-node":
                continue  # 跳过开始节点
            
            steps.append(TutorialStep(
                step_number=step_number,
                title=f"配置{node.data.label}节点",
                description=f"配置{node.data.label}节点的参数",
                action=f"选中{node.data.label}节点并配置参数",
                target=node.id,
                expected_result=f"{node.data.label}节点配置完成",
                tips=self._generate_node_tips(node)
            ))
            step_number += 1
        
        # 执行步骤
        steps.append(TutorialStep(
            step_number=step_number,
            title="执行工作流",
            description="运行配置好的工作流",
            action="点击执行按钮",
            expected_result="工作流成功执行",
            tips=["检查所有节点参数是否正确配置", "观察执行日志了解执行过程"]
        ))
        
        tutorial = Tutorial(
            id=f"template-{template.id}",
            title=f"{template.name}教程",
            description=f"学习如何使用{template.name}工作流模板",
            difficulty=template.metadata.get("difficulty", "中级"),
            estimated_time=template.metadata.get("estimated_time", "10分钟"),
            prerequisites=["工作流平台入门"],
            learning_objectives=[
                f"掌握{template.name}工作流的使用",
                "理解相关节点的配置方法",
                "能够根据需要修改和扩展工作流"
            ],
            steps=steps,
            template_id=template.id
        )
        
        self.tutorials[tutorial.id] = tutorial
    
    def _generate_node_tips(self, node) -> List[str]:
        """为节点生成提示"""
        tips = []
        
        node_type = node.data.nodeType
        
        if node_type == "http-request-node":
            tips.extend([
                "确保URL格式正确，包含协议（http://或https://）",
                "根据API要求设置正确的请求方法",
                "如需认证，在headers中添加Authorization字段"
            ])
        elif node_type == "condition-node":
            tips.extend([
                "选择合适的比较操作符",
                "确保比较的数据类型一致",
                "可以使用@引用前面节点的输出"
            ])
        elif node_type == "data-transform-node":
            tips.extend([
                "映射字段名要与源数据结构匹配",
                "使用JSON格式配置字段映射",
                "可以重命名字段或提取嵌套数据"
            ])
        elif node_type == "email-node":
            tips.extend([
                "确保SMTP服务器配置正确",
                "使用应用专用密码而不是账户密码",
                "测试邮件发送前先检查网络连接"
            ])
        
        return tips
    
    def get_tutorial(self, tutorial_id: str) -> Optional[Tutorial]:
        """获取教程"""
        return self.tutorials.get(tutorial_id)
    
    def get_all_tutorials(self) -> List[Tutorial]:
        """获取所有教程"""
        return list(self.tutorials.values())
    
    def get_tutorials_by_difficulty(self, difficulty: str) -> List[Tutorial]:
        """按难度获取教程"""
        return [t for t in self.tutorials.values() if t.difficulty == difficulty]
    
    def search_tutorials(self, query: str) -> List[Tutorial]:
        """搜索教程"""
        query = query.lower()
        results = []
        
        for tutorial in self.tutorials.values():
            if (query in tutorial.title.lower() or
                query in tutorial.description.lower() or
                any(query in obj.lower() for obj in tutorial.learning_objectives)):
                results.append(tutorial)
        
        return results


class DocumentationGenerator:
    """文档生成器"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def generate_node_documentation(self) -> Dict[str, Any]:
        """生成节点文档"""
        from node_types_config import NODE_TYPES_CONFIG
        
        docs = {
            "title": "节点类型参考文档",
            "description": "所有可用节点类型的详细说明和使用方法",
            "categories": {}
        }
        
        # 按分类组织节点文档
        for node_type, config in NODE_TYPES_CONFIG.items():
            category = config.get("category", "其他")
            
            if category not in docs["categories"]:
                docs["categories"][category] = {
                    "name": category,
                    "nodes": []
                }
            
            node_doc = {
                "type": node_type,
                "name": config.get("name", node_type),
                "description": config.get("description", ""),
                "icon": config.get("icon", "⚙️"),
                "inputs": config.get("inputs", []),
                "outputs": config.get("outputs", []),
                "parameters": config.get("parameters", {}),
                "examples": self._generate_node_examples(node_type, config)
            }
            
            docs["categories"][category]["nodes"].append(node_doc)
        
        return docs
    
    def _generate_node_examples(self, node_type: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """生成节点使用示例"""
        examples = []
        
        if node_type == "http-request-node":
            examples.extend([
                {
                    "title": "GET请求示例",
                    "description": "获取用户信息",
                    "parameters": {
                        "url": "https://api.example.com/users/123",
                        "method": "GET",
                        "headers": {"Authorization": "Bearer your-token"}
                    }
                },
                {
                    "title": "POST请求示例",
                    "description": "创建新用户",
                    "parameters": {
                        "url": "https://api.example.com/users",
                        "method": "POST",
                        "headers": {"Content-Type": "application/json"},
                        "data": {"name": "张三", "email": "zhangsan@example.com"}
                    }
                }
            ])
        elif node_type == "condition-node":
            examples.append({
                "title": "数值比较示例",
                "description": "检查用户年龄是否大于18",
                "parameters": {
                    "condition_type": "simple",
                    "left_value": "@user-data.age",
                    "operator": ">",
                    "right_value": 18
                }
            })
        
        return examples
    
    def generate_api_documentation(self) -> Dict[str, Any]:
        """生成API文档"""
        return {
            "title": "工作流平台API文档",
            "version": "1.0",
            "base_url": "http://localhost:8001",
            "endpoints": [
                {
                    "path": "/execute",
                    "method": "POST",
                    "description": "执行工作流",
                    "parameters": {
                        "nodes": "节点列表",
                        "edges": "连接列表"
                    },
                    "response": "执行结果"
                },
                {
                    "path": "/templates",
                    "method": "GET",
                    "description": "获取工作流模板",
                    "parameters": {
                        "category": "可选，按分类过滤"
                    },
                    "response": "模板列表"
                }
            ]
        }


# 全局实例
tutorial_generator = TutorialGenerator()
documentation_generator = DocumentationGenerator()
