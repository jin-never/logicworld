"""
错误处理和调试模块
提供详细的错误信息、调试功能和错误恢复机制
"""
import json
import logging
import traceback
import sys
from typing import Dict, Any, List, Optional, Type
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path

try:
    from .schemas import Node
except ImportError:
    from utils.schemas import Node


class ErrorSeverity(str, Enum):
    """错误严重程度"""
    LOW = "low"           # 低级错误，可以继续执行
    MEDIUM = "medium"     # 中级错误，需要注意
    HIGH = "high"         # 高级错误，应该停止执行
    CRITICAL = "critical" # 严重错误，系统级问题


class ErrorCategory(str, Enum):
    """错误分类"""
    VALIDATION = "validation"         # 数据验证错误
    EXECUTION = "execution"          # 执行错误
    NETWORK = "network"              # 网络错误
    TIMEOUT = "timeout"              # 超时错误
    PERMISSION = "permission"        # 权限错误
    RESOURCE = "resource"            # 资源错误
    CONFIGURATION = "configuration" # 配置错误
    SYSTEM = "system"               # 系统错误
    USER = "user"                   # 用户错误


@dataclass
class ErrorInfo:
    """错误信息"""
    error_id: str
    timestamp: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    message: str
    details: Optional[str] = None
    node_id: Optional[str] = None
    workflow_id: Optional[str] = None
    stack_trace: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


class ErrorHandler:
    """错误处理器"""
    
    def __init__(self, log_file: str = "logs/errors.log"):
        self.log_file = Path(log_file)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 设置文件日志处理器
        file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
        file_handler.setLevel(logging.ERROR)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # 错误统计
        self.error_counts: Dict[str, int] = {}
        self.recent_errors: List[ErrorInfo] = []
    
    def handle_error(
        self,
        exception: Exception,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        category: ErrorCategory = ErrorCategory.EXECUTION,
        node_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorInfo:
        """处理错误"""
        import uuid
        
        error_id = str(uuid.uuid4())
        
        # 获取堆栈跟踪
        stack_trace = traceback.format_exc()
        
        # 创建错误信息
        error_info = ErrorInfo(
            error_id=error_id,
            timestamp=datetime.now(),
            severity=severity,
            category=category,
            message=str(exception),
            details=self._get_error_details(exception),
            node_id=node_id,
            workflow_id=workflow_id,
            stack_trace=stack_trace,
            context=context,
            suggestions=self._get_error_suggestions(exception, category)
        )
        
        # 记录错误
        self._log_error(error_info)
        
        # 更新统计
        error_type = type(exception).__name__
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        # 保存到最近错误列表
        self.recent_errors.append(error_info)
        if len(self.recent_errors) > 100:  # 只保留最近100个错误
            self.recent_errors.pop(0)
        
        return error_info
    
    def _get_error_details(self, exception: Exception) -> str:
        """获取错误详细信息"""
        details = []
        
        # 异常类型
        details.append(f"Exception Type: {type(exception).__name__}")
        
        # 异常参数
        if hasattr(exception, 'args') and exception.args:
            details.append(f"Arguments: {exception.args}")
        
        # 特定异常的额外信息
        if hasattr(exception, 'errno'):
            details.append(f"Error Number: {exception.errno}")
        
        if hasattr(exception, 'filename'):
            details.append(f"Filename: {exception.filename}")
        
        if hasattr(exception, 'lineno'):
            details.append(f"Line Number: {exception.lineno}")
        
        return "\n".join(details)
    
    def _get_error_suggestions(self, exception: Exception, category: ErrorCategory) -> List[str]:
        """获取错误建议"""
        suggestions = []
        
        exception_type = type(exception).__name__
        
        # 基于异常类型的建议
        if exception_type == "ConnectionError":
            suggestions.extend([
                "检查网络连接是否正常",
                "验证目标服务是否可用",
                "检查防火墙设置",
                "尝试增加连接超时时间"
            ])
        elif exception_type == "TimeoutError":
            suggestions.extend([
                "增加超时时间设置",
                "检查网络延迟",
                "优化请求参数",
                "考虑分批处理数据"
            ])
        elif exception_type == "ValueError":
            suggestions.extend([
                "检查输入数据格式",
                "验证参数类型和范围",
                "查看数据转换逻辑",
                "确认配置参数正确"
            ])
        elif exception_type == "KeyError":
            suggestions.extend([
                "检查必需的字段是否存在",
                "验证数据结构",
                "确认配置键名正确",
                "添加默认值处理"
            ])
        elif exception_type == "FileNotFoundError":
            suggestions.extend([
                "检查文件路径是否正确",
                "确认文件是否存在",
                "验证文件权限",
                "检查工作目录设置"
            ])
        elif exception_type == "PermissionError":
            suggestions.extend([
                "检查文件/目录权限",
                "确认用户访问权限",
                "验证API密钥或令牌",
                "检查系统权限设置"
            ])
        
        # 基于错误分类的建议
        if category == ErrorCategory.VALIDATION:
            suggestions.extend([
                "检查输入数据格式",
                "验证数据类型",
                "确认必需字段完整"
            ])
        elif category == ErrorCategory.NETWORK:
            suggestions.extend([
                "检查网络连接",
                "验证URL地址",
                "检查代理设置"
            ])
        elif category == ErrorCategory.CONFIGURATION:
            suggestions.extend([
                "检查配置文件",
                "验证环境变量",
                "确认参数设置"
            ])
        
        return suggestions
    
    def _log_error(self, error_info: ErrorInfo):
        """记录错误到日志"""
        log_message = f"[{error_info.error_id}] {error_info.message}"
        
        if error_info.node_id:
            log_message += f" (Node: {error_info.node_id})"
        
        if error_info.workflow_id:
            log_message += f" (Workflow: {error_info.workflow_id})"
        
        if error_info.severity == ErrorSeverity.CRITICAL:
            self.logger.critical(log_message)
        elif error_info.severity == ErrorSeverity.HIGH:
            self.logger.error(log_message)
        elif error_info.severity == ErrorSeverity.MEDIUM:
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
        
        # 记录详细信息到文件
        try:
            with open(self.log_file.parent / "error_details.jsonl", "a", encoding='utf-8') as f:
                f.write(json.dumps(error_info.to_dict(), ensure_ascii=False) + "\n")
        except Exception as e:
            self.logger.error(f"Failed to write error details: {e}")
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """获取错误统计信息"""
        total_errors = sum(self.error_counts.values())
        
        # 按严重程度统计
        severity_counts = {}
        for error in self.recent_errors:
            severity = error.severity.value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # 按分类统计
        category_counts = {}
        for error in self.recent_errors:
            category = error.category.value
            category_counts[category] = category_counts.get(category, 0) + 1
        
        return {
            "total_errors": total_errors,
            "error_types": self.error_counts,
            "severity_distribution": severity_counts,
            "category_distribution": category_counts,
            "recent_errors_count": len(self.recent_errors)
        }
    
    def get_recent_errors(self, limit: int = 20) -> List[Dict[str, Any]]:
        """获取最近的错误"""
        recent = self.recent_errors[-limit:] if limit > 0 else self.recent_errors
        return [error.to_dict() for error in reversed(recent)]
    
    def clear_error_history(self):
        """清空错误历史"""
        self.recent_errors.clear()
        self.error_counts.clear()


class DebugInfo:
    """调试信息收集器"""
    
    def __init__(self):
        self.debug_data: Dict[str, Any] = {}
        self.execution_trace: List[Dict[str, Any]] = []
    
    def add_debug_point(self, name: str, data: Any, node_id: Optional[str] = None):
        """添加调试点"""
        debug_entry = {
            "timestamp": datetime.now().isoformat(),
            "name": name,
            "data": data,
            "node_id": node_id
        }
        self.execution_trace.append(debug_entry)
        
        # 也保存到调试数据中
        if node_id:
            if node_id not in self.debug_data:
                self.debug_data[node_id] = []
            self.debug_data[node_id].append(debug_entry)
    
    def get_node_debug_info(self, node_id: str) -> List[Dict[str, Any]]:
        """获取特定节点的调试信息"""
        return self.debug_data.get(node_id, [])
    
    def get_execution_trace(self) -> List[Dict[str, Any]]:
        """获取执行轨迹"""
        return self.execution_trace
    
    def export_debug_info(self, file_path: str):
        """导出调试信息到文件"""
        debug_export = {
            "timestamp": datetime.now().isoformat(),
            "debug_data": self.debug_data,
            "execution_trace": self.execution_trace
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(debug_export, f, ensure_ascii=False, indent=2)


class ErrorRecovery:
    """错误恢复机制"""
    
    @staticmethod
    def can_retry(exception: Exception, retry_count: int, max_retries: int) -> bool:
        """判断是否可以重试"""
        if retry_count >= max_retries:
            return False
        
        # 某些错误类型不应该重试
        non_retryable_errors = [
            ValueError,
            TypeError,
            AttributeError,
            KeyError,
            FileNotFoundError,
            PermissionError
        ]
        
        if type(exception) in non_retryable_errors:
            return False
        
        return True
    
    @staticmethod
    def get_retry_delay(retry_count: int, base_delay: float = 1.0) -> float:
        """计算重试延迟（指数退避）"""
        return base_delay * (2 ** retry_count)
    
    @staticmethod
    def suggest_recovery_actions(error_info: ErrorInfo) -> List[str]:
        """建议恢复操作"""
        actions = []
        
        if error_info.category == ErrorCategory.NETWORK:
            actions.extend([
                "重试请求",
                "检查网络连接",
                "使用备用服务地址"
            ])
        elif error_info.category == ErrorCategory.TIMEOUT:
            actions.extend([
                "增加超时时间",
                "分批处理数据",
                "优化查询条件"
            ])
        elif error_info.category == ErrorCategory.VALIDATION:
            actions.extend([
                "修正输入数据",
                "调整验证规则",
                "提供默认值"
            ])
        elif error_info.category == ErrorCategory.RESOURCE:
            actions.extend([
                "释放资源",
                "增加资源限制",
                "优化资源使用"
            ])
        
        return actions


# 全局错误处理器实例
error_handler = ErrorHandler()

# 全局调试信息收集器
debug_info = DebugInfo()
