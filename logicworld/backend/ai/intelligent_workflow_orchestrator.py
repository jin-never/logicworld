"""
智能工作流编排器 - 增强版
"""
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from .enhanced_workflow_generator import enhanced_workflow_generator

class IntelligentWorkflowOrchestrator:
    """智能工作流编排器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    async def generate_workflow(self, user_description: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """生成工作流 - 使用增强AI生成器"""
        try:
            self.logger.info(f"开始智能生成工作流: {user_description}")
            
            # 使用增强的AI工作流生成器
            result = await enhanced_workflow_generator.generate_intelligent_workflow(
                description=user_description,
                context=context or {}
            )
            
            if result["success"]:
                # 转换为前端期望的格式（保持向后兼容）
                workflow = result["workflow"]
                
                # 提取steps（为了兼容现有前端代码）
                steps = []
                for node in workflow.get("nodes", []):
                    step = {
                        "title": node["data"]["label"],
                        "description": node["data"]["description"],
                        "tool": node["data"]["tool"],
                        "parameters": node["data"]["parameters"],
                        "nodeType": node["data"]["nodeType"],
                        "category": node["data"]["category"]
                    }
                    steps.append(step)
                
                # 添加steps到workflow中（向后兼容）
                workflow["steps"] = steps
                workflow["workflow_type"] = workflow["category"]
                workflow["estimated_duration"] = f"{len(steps) * 3}分钟"
                
                return {
                    "success": True,
                    "workflow": workflow,
                    "suggestions": result.get("suggestions", []),
                    "message": result["message"]
                }
            else:
                return result
            
        except Exception as e:
            self.logger.error(f"智能工作流生成失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "智能工作流生成失败，请稍后重试"
            }
    
    def _analyze_workflow_type(self, description: str) -> str:
        """分析工作流类型"""
        description_lower = description.lower()
        
        if any(word in description_lower for word in ['数据', '分析', '处理', '清洗']):
            return 'data_processing'
        elif any(word in description_lower for word in ['创建', '生成', '制作', '写作']):
            return 'content_creation'
        elif any(word in description_lower for word in ['项目', '管理', '计划', '团队']):
            return 'project_management'
        elif any(word in description_lower for word in ['自动', '定时', '监控', '通知']):
            return 'automation'
        else:
            return 'general'
    
    def _generate_steps(self, description: str, workflow_type: str) -> List[Dict[str, Any]]:
        """生成工作流步骤"""
        steps = []
        
        # 根据工作流类型生成不同的步骤
        if workflow_type == 'data_processing':
            steps = [
                {
                    "title": "数据收集",
                    "description": "收集和准备需要处理的数据",
                    "tool": "数据收集工具",
                    "executionDescription": "从各种数据源收集原始数据"
                },
                {
                    "title": "数据清洗",
                    "description": "清理和标准化数据格式",
                    "tool": "数据清洗工具",
                    "executionDescription": "去除重复数据，处理缺失值"
                },
                {
                    "title": "数据分析",
                    "description": "对清洗后的数据进行分析",
                    "tool": "数据分析工具",
                    "executionDescription": "使用统计方法分析数据模式"
                },
                {
                    "title": "结果输出",
                    "description": "生成分析报告和可视化图表",
                    "tool": "报告生成工具",
                    "executionDescription": "创建数据分析报告和图表"
                }
            ]
        elif workflow_type == 'content_creation':
            steps = [
                {
                    "title": "内容规划",
                    "description": "规划内容结构和主题",
                    "tool": "内容规划工具",
                    "executionDescription": "确定内容大纲和关键点"
                },
                {
                    "title": "素材收集",
                    "description": "收集相关的素材和资料",
                    "tool": "素材管理工具",
                    "executionDescription": "搜集文字、图片、视频等素材"
                },
                {
                    "title": "内容创作",
                    "description": "根据规划创作内容",
                    "tool": "内容编辑工具",
                    "executionDescription": "撰写文字内容，编辑多媒体素材"
                },
                {
                    "title": "内容审核",
                    "description": "检查和完善内容质量",
                    "tool": "质量检查工具",
                    "executionDescription": "校对文字，检查格式和质量"
                }
            ]
        elif workflow_type == 'project_management':
            steps = [
                {
                    "title": "项目启动",
                    "description": "定义项目目标和范围",
                    "tool": "项目管理工具",
                    "executionDescription": "制定项目章程和目标"
                },
                {
                    "title": "资源分配",
                    "description": "分配人员和资源",
                    "tool": "资源管理工具",
                    "executionDescription": "安排团队成员和预算"
                },
                {
                    "title": "任务执行",
                    "description": "执行项目任务",
                    "tool": "任务跟踪工具",
                    "executionDescription": "按计划执行各项任务"
                },
                {
                    "title": "项目收尾",
                    "description": "完成项目交付",
                    "tool": "交付管理工具",
                    "executionDescription": "完成最终交付和总结"
                }
            ]
        else:
            # 通用步骤
            steps = [
                {
                    "title": "需求分析",
                    "description": "分析和理解具体需求",
                    "tool": "分析工具",
                    "executionDescription": "详细分析用户需求"
                },
                {
                    "title": "方案设计",
                    "description": "设计解决方案",
                    "tool": "设计工具",
                    "executionDescription": "制定详细的执行方案"
                },
                {
                    "title": "方案实施",
                    "description": "执行解决方案",
                    "tool": "执行工具",
                    "executionDescription": "按方案执行具体操作"
                },
                {
                    "title": "结果验证",
                    "description": "验证执行结果",
                    "tool": "验证工具",
                    "executionDescription": "检查和验证最终结果"
                }
            ]
        
        return steps
