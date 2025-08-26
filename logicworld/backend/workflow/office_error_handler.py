"""
Office智能协作系统错误处理机制
"""
import logging
import traceback
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

class OfficeErrorType(Enum):
    """Office错误类型"""
    PRODUCT_PARSING_ERROR = "product_parsing_error"
    TEMPLATE_LOADING_ERROR = "template_loading_error"
    PROMPT_BUILDING_ERROR = "prompt_building_error"
    CONTEXT_ANALYSIS_ERROR = "context_analysis_error"
    FILE_PATH_EXTRACTION_ERROR = "file_path_extraction_error"
    KEY_POINTS_EXTRACTION_ERROR = "key_points_extraction_error"
    SCENARIO_DETECTION_ERROR = "scenario_detection_error"
    DATA_INTEGRATION_ERROR = "data_integration_error"
    UNKNOWN_ERROR = "unknown_error"

@dataclass
class OfficeError:
    """Office错误信息"""
    error_type: OfficeErrorType
    message: str
    details: Dict[str, Any]
    timestamp: str
    stack_trace: Optional[str] = None
    recovery_suggestion: Optional[str] = None

class OfficeErrorHandler:
    """Office错误处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.error_history: List[OfficeError] = []
        
    def handle_product_parsing_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """处理Office产品解析错误"""
        office_error = OfficeError(
            error_type=OfficeErrorType.PRODUCT_PARSING_ERROR,
            message=f"Office产品解析失败: {str(error)}",
            details={
                "context_keys": list(context.keys()) if context else [],
                "context_size": len(context) if context else 0,
                "error_details": str(error)
            },
            timestamp=datetime.now().isoformat(),
            stack_trace=traceback.format_exc(),
            recovery_suggestion="检查上下文数据格式，确保包含有效的Office产品信息"
        )
        
        self.logger.error(f"Office产品解析错误: {office_error.message}")
        self._log_error_details(office_error)
        self.error_history.append(office_error)
        
        # 返回降级结果
        return {
            "office_products": [],
            "error_handled": True,
            "error_type": office_error.error_type.value,
            "fallback_reason": "产品解析失败，使用空产品列表"
        }
    
    def handle_template_error(self, error: Exception, app_type: str, scenario: str) -> str:
        """处理模板加载错误"""
        office_error = OfficeError(
            error_type=OfficeErrorType.TEMPLATE_LOADING_ERROR,
            message=f"模板加载失败: {app_type}.{scenario}",
            details={
                "app_type": app_type,
                "scenario": scenario,
                "error_details": str(error)
            },
            timestamp=datetime.now().isoformat(),
            stack_trace=traceback.format_exc(),
            recovery_suggestion="使用基础模板或默认模板作为替代"
        )
        
        self.logger.warning(f"模板加载错误: {office_error.message}")
        self._log_error_details(office_error)
        self.error_history.append(office_error)
        
        # 返回基础模板
        return self._get_fallback_template(app_type)
    
    def handle_prompt_building_error(self, error: Exception, task: str, products: List) -> str:
        """处理提示词构建错误"""
        office_error = OfficeError(
            error_type=OfficeErrorType.PROMPT_BUILDING_ERROR,
            message=f"提示词构建失败: {str(error)}",
            details={
                "task": task,
                "products_count": len(products) if products else 0,
                "error_details": str(error)
            },
            timestamp=datetime.now().isoformat(),
            stack_trace=traceback.format_exc(),
            recovery_suggestion="使用简化的提示词模板"
        )
        
        self.logger.error(f"提示词构建错误: {office_error.message}")
        self._log_error_details(office_error)
        self.error_history.append(office_error)
        
        # 返回简化的提示词
        return self._generate_fallback_prompt(task, products)
    
    def handle_context_analysis_error(self, error: Exception, products: List) -> str:
        """处理上下文分析错误"""
        office_error = OfficeError(
            error_type=OfficeErrorType.CONTEXT_ANALYSIS_ERROR,
            message=f"上下文分析失败: {str(error)}",
            details={
                "products_count": len(products) if products else 0,
                "error_details": str(error)
            },
            timestamp=datetime.now().isoformat(),
            recovery_suggestion="使用基础上下文描述"
        )
        
        self.logger.warning(f"上下文分析错误: {office_error.message}")
        self.error_history.append(office_error)
        
        # 返回基础上下文
        return "基于前置工作成果，继续完成当前任务。"
    
    def handle_file_extraction_error(self, error: Exception, result_data: Any) -> str:
        """处理文件路径提取错误"""
        office_error = OfficeError(
            error_type=OfficeErrorType.FILE_PATH_EXTRACTION_ERROR,
            message=f"文件路径提取失败: {str(error)}",
            details={
                "result_type": type(result_data).__name__,
                "result_preview": str(result_data)[:200] if result_data else "None",
                "error_details": str(error)
            },
            timestamp=datetime.now().isoformat(),
            recovery_suggestion="检查执行结果格式，确保包含有效的文件路径信息"
        )
        
        self.logger.warning(f"文件路径提取错误: {office_error.message}")
        self.error_history.append(office_error)
        
        # 返回默认路径
        return "/output/generated_office_file"
    
    def handle_key_points_extraction_error(self, error: Exception, result_data: Any) -> List[str]:
        """处理关键点提取错误"""
        office_error = OfficeError(
            error_type=OfficeErrorType.KEY_POINTS_EXTRACTION_ERROR,
            message=f"关键点提取失败: {str(error)}",
            details={
                "result_type": type(result_data).__name__,
                "error_details": str(error)
            },
            timestamp=datetime.now().isoformat(),
            recovery_suggestion="使用基础关键点或从摘要中提取"
        )
        
        self.logger.warning(f"关键点提取错误: {office_error.message}")
        self.error_history.append(office_error)
        
        # 返回默认关键点
        return ["任务已完成", "请查看生成的文件", "如有问题请联系支持"]
    
    def handle_scenario_detection_error(self, error: Exception, task: str, app_type: str) -> str:
        """处理场景检测错误"""
        office_error = OfficeError(
            error_type=OfficeErrorType.SCENARIO_DETECTION_ERROR,
            message=f"场景检测失败: {str(error)}",
            details={
                "task": task,
                "app_type": app_type,
                "error_details": str(error)
            },
            timestamp=datetime.now().isoformat(),
            recovery_suggestion="使用默认场景模板"
        )
        
        self.logger.warning(f"场景检测错误: {office_error.message}")
        self.error_history.append(office_error)
        
        # 返回默认场景
        default_scenarios = {
            "word": "business_report",
            "excel": "data_analysis", 
            "ppt": "executive_presentation"
        }
        return default_scenarios.get(app_type, "business_report")
    
    def _get_fallback_template(self, app_type: str) -> str:
        """获取降级模板"""
        fallback_templates = {
            "word": """
{original_task}

{office_context}

请使用Word工具完成上述任务，确保内容质量和格式规范。
包含以下要素：
• 清晰的结构和章节
• 准确的数据引用
• 专业的格式排版
• 明确的结论和建议
""",
            "excel": """
{original_task}

{office_context}

请使用Excel工具完成上述任务，确保数据准确性和图表美观。
包含以下要素：
• 清晰的数据组织
• 必要的计算公式
• 美观的图表展示
• 易于理解的格式
""",
            "ppt": """
{original_task}

{office_context}

请使用PowerPoint工具完成上述任务，确保演示效果和视觉美观。
包含以下要素：
• 清晰的逻辑结构
• 重点内容突出
• 专业的视觉设计
• 易于理解的布局
"""
        }
        
        return fallback_templates.get(app_type, fallback_templates["word"])
    
    def _generate_fallback_prompt(self, task: str, products: List) -> str:
        """生成降级提示词"""
        basic_context = ""
        if products:
            try:
                basic_context = f"基于 {len(products)} 个前置工作成果，"
                app_types = [getattr(p, 'app_type', 'unknown') for p in products]
                basic_context += f"包含 {', '.join(set(app_types))} 等类型的文档。"
            except:
                basic_context = "基于前置工作成果，"
        
        return f"""
{task}

{basic_context}

请完成上述任务，确保：
• 充分利用现有信息
• 保持专业质量标准
• 生成实用的输出结果
• 格式清晰易懂
"""
    
    def _log_error_details(self, office_error: OfficeError):
        """记录错误详细信息"""
        self.logger.error(f"""
=== Office协作系统错误详情 ===
错误类型: {office_error.error_type.value}
错误消息: {office_error.message}
发生时间: {office_error.timestamp}
错误详情: {office_error.details}
恢复建议: {office_error.recovery_suggestion}
""")
        
        if office_error.stack_trace:
            self.logger.debug(f"错误堆栈: {office_error.stack_trace}")
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """获取错误统计信息"""
        if not self.error_history:
            return {"total_errors": 0, "error_types": {}}
        
        error_types = {}
        for error in self.error_history:
            error_type = error.error_type.value
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        return {
            "total_errors": len(self.error_history),
            "error_types": error_types,
            "recent_errors": [
                {
                    "type": e.error_type.value,
                    "message": e.message,
                    "timestamp": e.timestamp
                }
                for e in self.error_history[-5:]  # 最近5个错误
            ]
        }
    
    def clear_error_history(self):
        """清空错误历史"""
        self.error_history.clear()
        self.logger.info("错误历史已清空")

# 全局错误处理器实例
office_error_handler = OfficeErrorHandler() 