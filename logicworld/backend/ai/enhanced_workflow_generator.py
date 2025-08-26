"""
增强AI工作流生成器
支持自然语言理解和智能节点推荐
"""
import json
import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass


@dataclass
class WorkflowNode:
    """工作流节点数据类"""
    id: str
    type: str
    title: str
    description: str
    tool: str
    parameters: Dict[str, Any]
    position: Tuple[int, int]
    category: str


@dataclass 
class WorkflowEdge:
    """工作流连接数据类"""
    id: str
    source: str
    target: str
    type: str = "default"


class EnhancedWorkflowGenerator:
    """增强AI工作流生成器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._init_node_templates()
        self._init_workflow_patterns()
    
    def _init_node_templates(self):
        """初始化节点模板库"""
        self.node_templates = {
            # 输入节点
            "file_input": {
                "type": "MaterialNode",
                "category": "input",
                "title": "文件输入",
                "description": "从本地或云端读取文件",
                "tool": "文件读取器",
                "icon": "📁",
                "parameters": {
                    "inputType": "file",
                    "supportedFormats": ["txt", "csv", "xlsx", "pdf", "docx"]
                }
            },
            "api_input": {
                "type": "MaterialNode", 
                "category": "input",
                "title": "API数据获取",
                "description": "从API接口获取数据",
                "tool": "API客户端",
                "icon": "🌐",
                "parameters": {
                    "inputType": "api",
                    "method": "GET",
                    "headers": {}
                }
            },
            "database_input": {
                "type": "MaterialNode",
                "category": "input", 
                "title": "数据库查询",
                "description": "从数据库读取数据",
                "tool": "数据库连接器",
                "icon": "📊",
                "parameters": {
                    "inputType": "database",
                    "queryType": "SELECT"
                }
            },
            
            # 处理节点
            "data_transform": {
                "type": "ExecutionNode",
                "category": "process",
                "title": "数据转换",
                "description": "转换数据格式和结构",
                "tool": "数据转换器",
                "icon": "🔄",
                "parameters": {
                    "transformType": "format",
                    "outputFormat": "json"
                }
            },
            "ai_process": {
                "type": "ExecutionNode",
                "category": "process",
                "title": "AI处理",
                "description": "使用AI模型处理数据",
                "tool": "AI处理器", 
                "icon": "🤖",
                "parameters": {
                    "aiModel": "gpt-3.5-turbo",
                    "task": "analysis"
                }
            },
            "text_analysis": {
                "type": "ExecutionNode",
                "category": "process",
                "title": "文本分析",
                "description": "分析文本内容和情感",
                "tool": "文本分析器",
                "icon": "📝",
                "parameters": {
                    "analysisType": "sentiment",
                    "language": "zh"
                }
            },
            "image_process": {
                "type": "ExecutionNode",
                "category": "process", 
                "title": "图像处理",
                "description": "处理和分析图像",
                "tool": "图像处理器",
                "icon": "🖼️",
                "parameters": {
                    "operation": "resize",
                    "quality": 80
                }
            },
            
            # 条件节点
            "condition_check": {
                "type": "ConditionNode",
                "category": "condition",
                "title": "条件判断",
                "description": "根据条件进行分支处理",
                "tool": "条件判断器",
                "icon": "❓",
                "parameters": {
                    "conditionType": "value",
                    "operator": "equals"
                }
            },
            "approval_gate": {
                "type": "ConditionNode",
                "category": "condition",
                "title": "审批节点", 
                "description": "等待人工审批确认",
                "tool": "审批系统",
                "icon": "✋",
                "parameters": {
                    "approvalType": "manual",
                    "timeout": 24
                }
            },
            
            # 输出节点
            "file_output": {
                "type": "ResultNode",
                "category": "output",
                "title": "文件输出",
                "description": "将结果保存为文件",
                "tool": "文件写入器",
                "icon": "💾",
                "parameters": {
                    "outputFormat": "json",
                    "location": "local"
                }
            },
            "email_send": {
                "type": "ResultNode",
                "category": "output",
                "title": "邮件发送",
                "description": "发送邮件通知",
                "tool": "邮件发送器",
                "icon": "📧",
                "parameters": {
                    "emailType": "notification",
                    "template": "default"
                }
            },
            "api_output": {
                "type": "ResultNode", 
                "category": "output",
                "title": "API推送",
                "description": "将结果推送到API",
                "tool": "API推送器",
                "icon": "🚀",
                "parameters": {
                    "method": "POST",
                    "contentType": "application/json"
                }
            },
            "notification": {
                "type": "ResultNode",
                "category": "output",
                "title": "消息通知",
                "description": "发送消息通知",
                "tool": "通知系统",
                "icon": "📱",
                "parameters": {
                    "channel": "all",
                    "priority": "normal"
                }
            }
        }
    
    def _init_workflow_patterns(self):
        """初始化工作流模式库"""
        self.workflow_patterns = {
            "data_processing": {
                "keywords": ["数据", "处理", "分析", "统计", "报表", "excel", "csv"],
                "template": ["file_input", "data_transform", "text_analysis", "file_output"],
                "description": "数据处理工作流"
            },
            "content_automation": {
                "keywords": ["内容", "文章", "写作", "生成", "创作", "编辑"],
                "template": ["api_input", "ai_process", "text_analysis", "file_output", "email_send"],
                "description": "内容自动化工作流"
            },
            "notification_system": {
                "keywords": ["通知", "提醒", "监控", "告警", "邮件", "消息"],
                "template": ["api_input", "condition_check", "notification", "email_send"],
                "description": "通知系统工作流"
            },
            "approval_process": {
                "keywords": ["审批", "审核", "流程", "申请", "批准"],
                "template": ["file_input", "approval_gate", "condition_check", "notification"],
                "description": "审批流程工作流"
            },
            "image_pipeline": {
                "keywords": ["图片", "图像", "照片", "处理", "压缩", "转换"],
                "template": ["file_input", "image_process", "condition_check", "file_output"],
                "description": "图像处理管道"
            },
            "api_integration": {
                "keywords": ["接口", "集成", "同步", "推送", "拉取", "api"],
                "template": ["api_input", "data_transform", "condition_check", "api_output"],
                "description": "API集成工作流"
            }
        }
    
    async def generate_intelligent_workflow(self, description: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """智能生成工作流"""
        try:
            self.logger.info(f"开始智能生成工作流: {description}")
            
            # 1. 分析用户需求
            intent_analysis = self._analyze_user_intent(description)
            
            # 2. 匹配工作流模式
            workflow_pattern = self._match_workflow_pattern(description, intent_analysis)
            
            # 3. 生成节点序列
            nodes = self._generate_nodes(workflow_pattern, intent_analysis, description)
            
            # 4. 生成连接关系
            edges = self._generate_edges(nodes)
            
            # 5. 优化布局
            positioned_nodes = self._optimize_layout(nodes)
            
            # 6. 构建完整工作流
            workflow = {
                "title": intent_analysis.get("title", "AI生成工作流"),
                "description": description,
                "category": workflow_pattern["category"],
                "nodes": positioned_nodes,
                "edges": edges,
                "metadata": {
                    "pattern": workflow_pattern["name"],
                    "confidence": workflow_pattern["confidence"],
                    "generated_at": datetime.now().isoformat(),
                    "complexity": self._calculate_complexity(nodes, edges)
                }
            }
            
            return {
                "success": True,
                "workflow": workflow,
                "suggestions": self._generate_suggestions(workflow_pattern, intent_analysis),
                "message": f"成功生成包含{len(nodes)}个节点的智能工作流"
            }
            
        except Exception as e:
            self.logger.error(f"智能工作流生成失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "智能工作流生成失败，请检查输入描述"
            }
    
    def _analyze_user_intent(self, description: str) -> Dict[str, Any]:
        """分析用户意图"""
        intent = {
            "entities": [],
            "actions": [],
            "data_types": [],
            "output_requirements": [],
            "complexity": "medium"
        }
        
        desc_lower = description.lower()
        
        # 识别实体（数据对象）
        entity_patterns = {
            "file": ["文件", "excel", "csv", "pdf", "文档"],
            "email": ["邮件", "邮箱", "email"],
            "image": ["图片", "图像", "照片", "png", "jpg"],
            "data": ["数据", "数据库", "信息", "记录"],
            "api": ["接口", "api", "服务", "调用"],
            "text": ["文本", "内容", "文字", "文章"]
        }
        
        for entity_type, keywords in entity_patterns.items():
            if any(keyword in desc_lower for keyword in keywords):
                intent["entities"].append(entity_type)
        
        # 识别动作
        action_patterns = {
            "process": ["处理", "转换", "分析", "计算"],
            "send": ["发送", "推送", "通知", "提醒"],
            "read": ["读取", "获取", "收集", "导入"],
            "write": ["保存", "输出", "导出", "生成"],
            "check": ["检查", "验证", "判断", "审核"]
        }
        
        for action_type, keywords in action_patterns.items():
            if any(keyword in desc_lower for keyword in keywords):
                intent["actions"].append(action_type)
        
        # 生成标题
        if "数据" in desc_lower:
            intent["title"] = "数据处理工作流"
        elif "邮件" in desc_lower or "通知" in desc_lower:
            intent["title"] = "通知系统工作流"
        elif "图片" in desc_lower or "图像" in desc_lower:
            intent["title"] = "图像处理工作流"
        elif "审批" in desc_lower or "审核" in desc_lower:
            intent["title"] = "审批流程工作流"
        else:
            intent["title"] = "智能自动化工作流"
        
        return intent
    
    def _match_workflow_pattern(self, description: str, intent_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """匹配最佳工作流模式"""
        desc_lower = description.lower()
        best_match = None
        highest_score = 0
        
        for pattern_name, pattern_config in self.workflow_patterns.items():
            score = 0
            
            # 基于关键词匹配
            keyword_matches = sum(1 for keyword in pattern_config["keywords"] if keyword in desc_lower)
            score += keyword_matches * 2
            
            # 基于意图分析
            entity_matches = sum(1 for entity in intent_analysis["entities"] 
                               if any(entity in keyword for keyword in pattern_config["keywords"]))
            score += entity_matches * 1.5
            
            if score > highest_score:
                highest_score = score
                best_match = {
                    "name": pattern_name,
                    "config": pattern_config,
                    "confidence": min(score / 10, 0.95),  # 标准化到0-0.95
                    "category": pattern_name
                }
        
        # 如果没有好的匹配，使用通用模式
        if not best_match or highest_score < 2:
            best_match = {
                "name": "generic",
                "config": {
                    "template": ["file_input", "ai_process", "condition_check", "file_output"],
                    "description": "通用工作流"
                },
                "confidence": 0.5,
                "category": "general"
            }
        
        return best_match
    
    def _generate_nodes(self, pattern: Dict[str, Any], intent: Dict[str, Any], description: str) -> List[Dict[str, Any]]:
        """生成工作流节点"""
        nodes = []
        template = pattern["config"]["template"]
        
        for i, node_template_key in enumerate(template):
            if node_template_key in self.node_templates:
                template_config = self.node_templates[node_template_key]
                
                node = {
                    "id": f"node_{i+1}",
                    "type": template_config["type"],
                    "data": {
                        "label": template_config["title"],
                        "nodeType": template_config["type"].lower().replace("node", "-node"),
                        "icon": template_config["icon"],
                        "description": template_config["description"],
                        "tool": template_config["tool"],
                        "category": template_config["category"],
                        "parameters": template_config["parameters"].copy(),
                        "aiGenerated": True,
                        "confidence": pattern["confidence"]
                    },
                    "position": {"x": 0, "y": 0}  # 位置稍后计算
                }
                
                # 基于描述自定义节点
                self._customize_node_for_description(node, description, intent)
                
                nodes.append(node)
        
        return nodes
    
    def _customize_node_for_description(self, node: Dict[str, Any], description: str, intent: Dict[str, Any]):
        """根据描述自定义节点"""
        desc_lower = description.lower()
        node_data = node["data"]
        
        # 自定义输入节点
        if node_data["category"] == "input":
            if "excel" in desc_lower or "csv" in desc_lower:
                node_data["parameters"]["supportedFormats"] = ["xlsx", "csv", "xls"]
                node_data["label"] = "Excel数据输入"
            elif "api" in desc_lower or "接口" in desc_lower:
                node_data["label"] = "API数据获取"
                node_data["tool"] = "REST API客户端"
        
        # 自定义处理节点
        elif node_data["category"] == "process":
            if "ai" in desc_lower or "智能" in desc_lower:
                node_data["label"] = "AI智能处理"
                node_data["parameters"]["aiModel"] = "gpt-4"
            elif "图片" in desc_lower or "图像" in desc_lower:
                node_data["label"] = "图像智能处理"
                node_data["tool"] = "AI图像处理器"
        
        # 自定义输出节点
        elif node_data["category"] == "output":
            if "邮件" in desc_lower:
                node_data["label"] = "智能邮件通知"
                node_data["parameters"]["template"] = "smart_notification"
            elif "报表" in desc_lower:
                node_data["label"] = "智能报表生成"
                node_data["parameters"]["outputFormat"] = "xlsx"
    
    def _generate_edges(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """生成节点连接"""
        edges = []
        
        for i in range(len(nodes) - 1):
            edge = {
                "id": f"edge_{i+1}",
                "source": nodes[i]["id"],
                "target": nodes[i+1]["id"],
                "type": "smoothstep",
                "animated": True,
                "style": {"stroke": "#667eea", "strokeWidth": 2}
            }
            edges.append(edge)
        
        return edges
    
    def _optimize_layout(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """优化节点布局"""
        # 简单的垂直布局
        for i, node in enumerate(nodes):
            node["position"] = {
                "x": 250,
                "y": i * 120 + 50
            }
        
        return nodes
    
    def _calculate_complexity(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> str:
        """计算工作流复杂度"""
        node_count = len(nodes)
        edge_count = len(edges)
        
        if node_count <= 3:
            return "simple"
        elif node_count <= 6:
            return "medium"
        else:
            return "complex"
    
    def _generate_suggestions(self, pattern: Dict[str, Any], intent: Dict[str, Any]) -> List[str]:
        """生成改进建议"""
        suggestions = []
        
        if pattern["confidence"] < 0.7:
            suggestions.append("建议提供更详细的需求描述以获得更精确的工作流")
        
        if "email" in intent["entities"]:
            suggestions.append("可以添加邮件模板配置以提高通知效果")
        
        if "data" in intent["entities"]:
            suggestions.append("建议添加数据验证节点确保数据质量")
        
        suggestions.append("可以添加错误处理节点提高工作流稳定性")
        suggestions.append("建议配置执行监控以便跟踪工作流状态")
        
        return suggestions


# 全局实例
enhanced_workflow_generator = EnhancedWorkflowGenerator() 