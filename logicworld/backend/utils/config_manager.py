"""
配置管理模块
统一管理应用配置，支持环境变量和配置文件
"""
import os
import json
import logging
from typing import Dict, Any, Optional, Union
from pathlib import Path
from dataclasses import dataclass, field
import yaml


@dataclass
class DatabaseConfig:
    """数据库配置"""
    url: str = "sqlite:///./workflow.db"
    echo: bool = False
    pool_size: int = 10
    max_overflow: int = 20


@dataclass
class RedisConfig:
    """Redis配置"""
    url: str = "redis://localhost:6379/0"
    max_connections: int = 10
    socket_timeout: int = 30


@dataclass
class SecurityConfig:
    """安全配置"""
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: list = field(default_factory=lambda: ["*"])
    cors_allow_credentials: bool = True
    cors_allow_methods: list = field(default_factory=lambda: ["*"])
    cors_allow_headers: list = field(default_factory=lambda: ["*"])


@dataclass
class ResourceConfig:
    """资源限制配置"""
    max_memory_mb: float = 2048
    max_cpu_percent: float = 80.0
    max_concurrent_tasks: int = 10
    max_execution_time: int = 3600
    max_file_size_mb: float = 100
    max_network_requests_per_minute: int = 100


@dataclass
class LoggingConfig:
    """日志配置"""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file_path: str = "logs/app.log"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    enable_console: bool = True
    enable_file: bool = True


@dataclass
class MonitoringConfig:
    """监控配置"""
    enable_metrics: bool = True
    metrics_port: int = 9000
    enable_health_check: bool = True
    health_check_interval: int = 30
    enable_performance_tracking: bool = True


@dataclass
class AppConfig:
    """应用配置"""
    name: str = "Workflow Platform"
    version: str = "1.0.0"
    description: str = "N8N-like workflow automation platform"
    host: str = "localhost"
    port: int = 8000
    debug: bool = False
    reload: bool = False
    workers: int = 1
    
    # 子配置
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    resources: ResourceConfig = field(default_factory=ResourceConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or "config.yaml"
        self.config = AppConfig()
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # 加载配置
        self._load_config()
        self._load_env_variables()
        self._validate_config()
    
    def _load_config(self):
        """从配置文件加载配置"""
        config_path = Path(self.config_file)
        
        if not config_path.exists():
            self.logger.info(f"Config file {self.config_file} not found, using defaults")
            return
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                if config_path.suffix.lower() in ['.yaml', '.yml']:
                    config_data = yaml.safe_load(f)
                else:
                    config_data = json.load(f)
            
            self._update_config_from_dict(config_data)
            self.logger.info(f"Configuration loaded from {self.config_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to load config file {self.config_file}: {e}")
    
    def _load_env_variables(self):
        """从环境变量加载配置"""
        env_mappings = {
            # 应用配置
            'APP_NAME': ('name',),
            'APP_VERSION': ('version',),
            'APP_HOST': ('host',),
            'APP_PORT': ('port',),
            'APP_DEBUG': ('debug',),
            'APP_WORKERS': ('workers',),
            
            # 数据库配置
            'DATABASE_URL': ('database', 'url'),
            'DATABASE_ECHO': ('database', 'echo'),
            'DATABASE_POOL_SIZE': ('database', 'pool_size'),
            
            # Redis配置
            'REDIS_URL': ('redis', 'url'),
            'REDIS_MAX_CONNECTIONS': ('redis', 'max_connections'),
            
            # 安全配置
            'SECRET_KEY': ('security', 'secret_key'),
            'ACCESS_TOKEN_EXPIRE_MINUTES': ('security', 'access_token_expire_minutes'),
            'CORS_ORIGINS': ('security', 'cors_origins'),
            
            # 资源配置
            'MAX_MEMORY_MB': ('resources', 'max_memory_mb'),
            'MAX_CPU_PERCENT': ('resources', 'max_cpu_percent'),
            'MAX_CONCURRENT_TASKS': ('resources', 'max_concurrent_tasks'),
            
            # 日志配置
            'LOG_LEVEL': ('logging', 'level'),
            'LOG_FILE_PATH': ('logging', 'file_path'),
            
            # 监控配置
            'ENABLE_METRICS': ('monitoring', 'enable_metrics'),
            'METRICS_PORT': ('monitoring', 'metrics_port'),
        }
        
        for env_var, config_path in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                self._set_config_value(config_path, value)
    
    def _set_config_value(self, path: tuple, value: str):
        """设置配置值"""
        try:
            # 类型转换
            if path[-1] in ['port', 'workers', 'pool_size', 'max_connections', 
                           'access_token_expire_minutes', 'max_concurrent_tasks', 
                           'metrics_port', 'max_file_size', 'backup_count']:
                value = int(value)
            elif path[-1] in ['debug', 'echo', 'cors_allow_credentials', 
                             'enable_metrics', 'enable_health_check', 
                             'enable_performance_tracking', 'enable_console', 'enable_file']:
                value = value.lower() in ('true', '1', 'yes', 'on')
            elif path[-1] in ['max_memory_mb', 'max_cpu_percent', 'max_file_size_mb']:
                value = float(value)
            elif path[-1] in ['cors_origins', 'cors_allow_methods', 'cors_allow_headers']:
                value = [item.strip() for item in value.split(',')]
            
            # 设置值
            obj = self.config
            for key in path[:-1]:
                obj = getattr(obj, key)
            setattr(obj, path[-1], value)
            
        except Exception as e:
            self.logger.error(f"Failed to set config value {'.'.join(path)}: {e}")
    
    def _update_config_from_dict(self, config_data: Dict[str, Any]):
        """从字典更新配置"""
        def update_object(obj, data):
            for key, value in data.items():
                if hasattr(obj, key):
                    attr = getattr(obj, key)
                    if hasattr(attr, '__dict__'):  # 嵌套对象
                        if isinstance(value, dict):
                            update_object(attr, value)
                    else:
                        setattr(obj, key, value)
        
        update_object(self.config, config_data)
    
    def _validate_config(self):
        """验证配置"""
        errors = []
        
        # 验证端口范围
        if not (1 <= self.config.port <= 65535):
            errors.append(f"Invalid port: {self.config.port}")
        
        # 验证工作进程数
        if self.config.workers < 1:
            errors.append(f"Workers must be >= 1: {self.config.workers}")
        
        # 验证资源限制
        if self.config.resources.max_memory_mb <= 0:
            errors.append(f"Invalid max_memory_mb: {self.config.resources.max_memory_mb}")
        
        if not (0 < self.config.resources.max_cpu_percent <= 100):
            errors.append(f"Invalid max_cpu_percent: {self.config.resources.max_cpu_percent}")
        
        # 验证日志级别
        valid_log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if self.config.logging.level.upper() not in valid_log_levels:
            errors.append(f"Invalid log level: {self.config.logging.level}")
        
        if errors:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")
    
    def get_config(self) -> AppConfig:
        """获取配置"""
        return self.config
    
    def get_database_url(self) -> str:
        """获取数据库URL"""
        return self.config.database.url
    
    def get_redis_url(self) -> str:
        """获取Redis URL"""
        return self.config.redis.url
    
    def is_debug(self) -> bool:
        """是否调试模式"""
        return self.config.debug
    
    def get_cors_config(self) -> Dict[str, Any]:
        """获取CORS配置"""
        return {
            "allow_origins": self.config.security.cors_origins,
            "allow_credentials": self.config.security.cors_allow_credentials,
            "allow_methods": self.config.security.cors_allow_methods,
            "allow_headers": self.config.security.cors_allow_headers,
        }
    
    def save_config(self, file_path: Optional[str] = None):
        """保存配置到文件"""
        file_path = file_path or self.config_file
        
        try:
            config_dict = self._config_to_dict()
            
            with open(file_path, 'w', encoding='utf-8') as f:
                if file_path.endswith('.yaml') or file_path.endswith('.yml'):
                    yaml.dump(config_dict, f, default_flow_style=False, allow_unicode=True)
                else:
                    json.dump(config_dict, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Configuration saved to {file_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to save config to {file_path}: {e}")
            raise
    
    def _config_to_dict(self) -> Dict[str, Any]:
        """将配置转换为字典"""
        def obj_to_dict(obj):
            if hasattr(obj, '__dict__'):
                result = {}
                for key, value in obj.__dict__.items():
                    if hasattr(value, '__dict__'):
                        result[key] = obj_to_dict(value)
                    else:
                        result[key] = value
                return result
            return obj
        
        return obj_to_dict(self.config)
    
    def update_config(self, updates: Dict[str, Any]):
        """更新配置"""
        self._update_config_from_dict(updates)
        self._validate_config()
    
    def reload_config(self):
        """重新加载配置"""
        self.config = AppConfig()
        self._load_config()
        self._load_env_variables()
        self._validate_config()


# 全局配置管理器实例
config_manager = ConfigManager()

# 便捷访问函数
def get_config() -> AppConfig:
    """获取应用配置"""
    return config_manager.get_config()

def get_database_url() -> str:
    """获取数据库URL"""
    return config_manager.get_database_url()

def get_redis_url() -> str:
    """获取Redis URL"""
    return config_manager.get_redis_url()

def is_debug() -> bool:
    """是否调试模式"""
    return config_manager.is_debug()

def get_cors_config() -> Dict[str, Any]:
    """获取CORS配置"""
    return config_manager.get_cors_config()


# 创建默认配置文件
def create_default_config():
    """创建默认配置文件"""
    default_config = {
        "name": "Workflow Platform",
        "version": "1.0.0",
        "host": "0.0.0.0",
        "port": 8001,
        "debug": False,
        "workers": 1,
        "database": {
            "url": "sqlite:///./workflow.db",
            "echo": False,
            "pool_size": 10
        },
        "redis": {
            "url": "redis://localhost:6379/0",
            "max_connections": 10
        },
        "security": {
            "secret_key": "your-secret-key-change-in-production",
            "access_token_expire_minutes": 30,
            "cors_origins": ["*"]
        },
        "resources": {
            "max_memory_mb": 2048,
            "max_cpu_percent": 80.0,
            "max_concurrent_tasks": 10
        },
        "logging": {
            "level": "INFO",
            "file_path": "logs/app.log",
            "enable_console": True,
            "enable_file": True
        },
        "monitoring": {
            "enable_metrics": True,
            "enable_health_check": True,
            "enable_performance_tracking": True
        }
    }

    config_path = Path("config.yaml")
    if not config_path.exists():
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(default_config, f, default_flow_style=False, allow_unicode=True)
        print(f"Default configuration created at {config_path}")


if __name__ == "__main__":
    create_default_config()
