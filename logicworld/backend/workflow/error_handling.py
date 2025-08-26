"""
工作流错误处理和重试机制
提供智能的错误恢复和重试策略
"""
import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass
from enum import Enum
import traceback
import json
from datetime import datetime, timedelta


class ErrorType(Enum):
    """错误类型"""
    NETWORK_ERROR = "network_error"
    TIMEOUT_ERROR = "timeout_error"
    VALIDATION_ERROR = "validation_error"
    PERMISSION_ERROR = "permission_error"
    RESOURCE_ERROR = "resource_error"
    LOGIC_ERROR = "logic_error"
    SYSTEM_ERROR = "system_error"
    UNKNOWN_ERROR = "unknown_error"


class RetryStrategy(Enum):
    """重试策略"""
    FIXED_DELAY = "fixed_delay"
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    CUSTOM = "custom"


@dataclass
class ErrorContext:
    """错误上下文"""
    workflow_id: str
    node_id: str
    error_type: ErrorType
    error_message: str
    stack_trace: str
    timestamp: datetime
    attempt_count: int
    node_data: Dict[str, Any]
    execution_context: Dict[str, Any]


@dataclass
class RetryConfig:
    """重试配置"""
    max_attempts: int = 3
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    base_delay: float = 1.0
    max_delay: float = 60.0
    backoff_multiplier: float = 2.0
    jitter: bool = True
    retryable_errors: List[ErrorType] = None
    custom_delay_func: Optional[Callable[[int], float]] = None


class CircuitBreakerState(Enum):
    """熔断器状态"""
    CLOSED = "closed"      # 正常状态
    OPEN = "open"          # 熔断状态
    HALF_OPEN = "half_open"  # 半开状态


@dataclass
class CircuitBreaker:
    """熔断器"""
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    success_threshold: int = 3
    
    state: CircuitBreakerState = CircuitBreakerState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None


class ErrorHandler:
    """错误处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.error_patterns: Dict[str, ErrorType] = {}
        self.retry_configs: Dict[str, RetryConfig] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.error_callbacks: List[Callable[[ErrorContext], None]] = []
        
        # 默认错误模式
        self._setup_default_error_patterns()
        self._setup_default_retry_configs()
    
    def _setup_default_error_patterns(self):
        """设置默认错误模式"""
        self.error_patterns.update({
            r"connection.*timeout": ErrorType.TIMEOUT_ERROR,
            r"connection.*refused": ErrorType.NETWORK_ERROR,
            r"network.*unreachable": ErrorType.NETWORK_ERROR,
            r"permission.*denied": ErrorType.PERMISSION_ERROR,
            r"access.*denied": ErrorType.PERMISSION_ERROR,
            r"validation.*failed": ErrorType.VALIDATION_ERROR,
            r"invalid.*input": ErrorType.VALIDATION_ERROR,
            r"resource.*not.*found": ErrorType.RESOURCE_ERROR,
            r"out.*of.*memory": ErrorType.RESOURCE_ERROR,
            r"disk.*full": ErrorType.RESOURCE_ERROR,
        })
    
    def _setup_default_retry_configs(self):
        """设置默认重试配置"""
        self.retry_configs.update({
            'default': RetryConfig(
                max_attempts=3,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                retryable_errors=[
                    ErrorType.NETWORK_ERROR,
                    ErrorType.TIMEOUT_ERROR,
                    ErrorType.RESOURCE_ERROR
                ]
            ),
            'network': RetryConfig(
                max_attempts=5,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                base_delay=2.0,
                max_delay=120.0,
                retryable_errors=[ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR]
            ),
            'critical': RetryConfig(
                max_attempts=1,
                strategy=RetryStrategy.FIXED_DELAY,
                retryable_errors=[]
            )
        })
    
    def classify_error(self, error: Exception) -> ErrorType:
        """分类错误"""
        error_message = str(error).lower()
        
        # 检查错误模式
        import re
        for pattern, error_type in self.error_patterns.items():
            if re.search(pattern, error_message):
                return error_type
        
        # 根据异常类型分类
        if isinstance(error, asyncio.TimeoutError):
            return ErrorType.TIMEOUT_ERROR
        elif isinstance(error, ConnectionError):
            return ErrorType.NETWORK_ERROR
        elif isinstance(error, PermissionError):
            return ErrorType.PERMISSION_ERROR
        elif isinstance(error, ValueError):
            return ErrorType.VALIDATION_ERROR
        elif isinstance(error, MemoryError):
            return ErrorType.RESOURCE_ERROR
        else:
            return ErrorType.UNKNOWN_ERROR
    
    def should_retry(self, error_context: ErrorContext, retry_config: RetryConfig) -> bool:
        """判断是否应该重试"""
        # 检查重试次数
        if error_context.attempt_count >= retry_config.max_attempts:
            return False
        
        # 检查错误类型是否可重试
        if retry_config.retryable_errors is not None:
            if error_context.error_type not in retry_config.retryable_errors:
                return False
        
        # 检查熔断器状态
        circuit_breaker = self.circuit_breakers.get(error_context.node_id)
        if circuit_breaker and circuit_breaker.state == CircuitBreakerState.OPEN:
            # 检查是否可以进入半开状态
            if (circuit_breaker.last_failure_time and 
                datetime.now() - circuit_breaker.last_failure_time > 
                timedelta(seconds=circuit_breaker.recovery_timeout)):
                circuit_breaker.state = CircuitBreakerState.HALF_OPEN
                circuit_breaker.success_count = 0
            else:
                return False
        
        return True
    
    def calculate_delay(self, attempt: int, retry_config: RetryConfig) -> float:
        """计算重试延迟"""
        if retry_config.custom_delay_func:
            return retry_config.custom_delay_func(attempt)
        
        if retry_config.strategy == RetryStrategy.FIXED_DELAY:
            delay = retry_config.base_delay
        elif retry_config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = retry_config.base_delay * attempt
        elif retry_config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = retry_config.base_delay * (retry_config.backoff_multiplier ** (attempt - 1))
        else:
            delay = retry_config.base_delay
        
        # 限制最大延迟
        delay = min(delay, retry_config.max_delay)
        
        # 添加抖动
        if retry_config.jitter:
            import random
            delay *= (0.5 + random.random() * 0.5)
        
        return delay
    
    def update_circuit_breaker(self, node_id: str, success: bool):
        """更新熔断器状态"""
        if node_id not in self.circuit_breakers:
            self.circuit_breakers[node_id] = CircuitBreaker()
        
        circuit_breaker = self.circuit_breakers[node_id]
        
        if success:
            if circuit_breaker.state == CircuitBreakerState.HALF_OPEN:
                circuit_breaker.success_count += 1
                if circuit_breaker.success_count >= circuit_breaker.success_threshold:
                    circuit_breaker.state = CircuitBreakerState.CLOSED
                    circuit_breaker.failure_count = 0
            elif circuit_breaker.state == CircuitBreakerState.CLOSED:
                circuit_breaker.failure_count = 0
        else:
            circuit_breaker.failure_count += 1
            circuit_breaker.last_failure_time = datetime.now()
            
            if circuit_breaker.failure_count >= circuit_breaker.failure_threshold:
                circuit_breaker.state = CircuitBreakerState.OPEN
                self.logger.warning(f"Circuit breaker opened for node {node_id}")
    
    async def handle_error(self, workflow_id: str, node_id: str, 
                          error: Exception, node_data: Dict[str, Any],
                          execution_context: Dict[str, Any],
                          attempt_count: int = 1) -> bool:
        """处理错误"""
        # 分类错误
        error_type = self.classify_error(error)
        
        # 创建错误上下文
        error_context = ErrorContext(
            workflow_id=workflow_id,
            node_id=node_id,
            error_type=error_type,
            error_message=str(error),
            stack_trace=traceback.format_exc(),
            timestamp=datetime.now(),
            attempt_count=attempt_count,
            node_data=node_data,
            execution_context=execution_context
        )
        
        # 记录错误
        self.logger.error(
            f"Node {node_id} failed (attempt {attempt_count}): "
            f"{error_type.value} - {error_context.error_message}"
        )
        
        # 触发错误回调
        for callback in self.error_callbacks:
            try:
                callback(error_context)
            except Exception as e:
                self.logger.error(f"Error callback failed: {e}")
        
        # 获取重试配置
        retry_config_name = node_data.get('retry_config', 'default')
        retry_config = self.retry_configs.get(retry_config_name, self.retry_configs['default'])
        
        # 判断是否应该重试
        should_retry = self.should_retry(error_context, retry_config)
        
        if should_retry:
            # 计算延迟
            delay = self.calculate_delay(attempt_count, retry_config)
            
            self.logger.info(
                f"Retrying node {node_id} in {delay:.2f}s "
                f"(attempt {attempt_count + 1}/{retry_config.max_attempts})"
            )
            
            # 等待重试
            await asyncio.sleep(delay)
            
            return True
        else:
            # 更新熔断器
            self.update_circuit_breaker(node_id, False)
            
            self.logger.error(f"Node {node_id} failed permanently after {attempt_count} attempts")
            return False
    
    def handle_success(self, node_id: str):
        """处理成功"""
        self.update_circuit_breaker(node_id, True)
    
    def register_error_callback(self, callback: Callable[[ErrorContext], None]):
        """注册错误回调"""
        self.error_callbacks.append(callback)
    
    def add_retry_config(self, name: str, config: RetryConfig):
        """添加重试配置"""
        self.retry_configs[name] = config
    
    def add_error_pattern(self, pattern: str, error_type: ErrorType):
        """添加错误模式"""
        self.error_patterns[pattern] = error_type
    
    def get_error_stats(self) -> Dict[str, Any]:
        """获取错误统计"""
        circuit_breaker_stats = {}
        for node_id, cb in self.circuit_breakers.items():
            circuit_breaker_stats[node_id] = {
                'state': cb.state.value,
                'failure_count': cb.failure_count,
                'success_count': cb.success_count,
                'last_failure_time': cb.last_failure_time.isoformat() if cb.last_failure_time else None
            }
        
        return {
            'circuit_breakers': circuit_breaker_stats,
            'retry_configs': list(self.retry_configs.keys()),
            'error_patterns': len(self.error_patterns)
        }


# 全局错误处理器实例
error_handler = ErrorHandler()
