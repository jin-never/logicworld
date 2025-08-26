"""
数据流处理模块
提供节点间数据传递、验证和转换功能
"""
import json
import logging
from typing import Any, Dict, List, Optional, Union, Type
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, ValidationError, validator
import re


class DataType(str, Enum):
    """支持的数据类型"""
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    DATE = "date"
    DATETIME = "datetime"
    EMAIL = "email"
    URL = "url"
    JSON = "json"
    ANY = "any"


class DataSchema(BaseModel):
    """数据模式定义"""
    type: DataType
    required: bool = False
    default: Optional[Any] = None
    description: Optional[str] = None
    
    # 字符串类型的约束
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None
    
    # 数字类型的约束
    minimum: Optional[Union[int, float]] = None
    maximum: Optional[Union[int, float]] = None
    
    # 数组类型的约束
    min_items: Optional[int] = None
    max_items: Optional[int] = None
    items_type: Optional[DataType] = None
    
    # 对象类型的约束
    properties: Optional[Dict[str, 'DataSchema']] = None


class DataValidationError(Exception):
    """数据验证错误"""
    def __init__(self, field: str, message: str, value: Any = None):
        self.field = field
        self.message = message
        self.value = value
        super().__init__(f"Field '{field}': {message}")


class DataValidator:
    """数据验证器"""
    
    @staticmethod
    def validate_value(value: Any, schema: DataSchema, field_name: str = "value") -> Any:
        """验证单个值"""
        # 处理空值
        if value is None:
            if schema.required:
                raise DataValidationError(field_name, "Required field is missing")
            return schema.default
        
        # 类型验证
        if schema.type == DataType.STRING:
            return DataValidator._validate_string(value, schema, field_name)
        elif schema.type == DataType.NUMBER:
            return DataValidator._validate_number(value, schema, field_name)
        elif schema.type == DataType.INTEGER:
            return DataValidator._validate_integer(value, schema, field_name)
        elif schema.type == DataType.BOOLEAN:
            return DataValidator._validate_boolean(value, schema, field_name)
        elif schema.type == DataType.ARRAY:
            return DataValidator._validate_array(value, schema, field_name)
        elif schema.type == DataType.OBJECT:
            return DataValidator._validate_object(value, schema, field_name)
        elif schema.type == DataType.DATE:
            return DataValidator._validate_date(value, schema, field_name)
        elif schema.type == DataType.DATETIME:
            return DataValidator._validate_datetime(value, schema, field_name)
        elif schema.type == DataType.EMAIL:
            return DataValidator._validate_email(value, schema, field_name)
        elif schema.type == DataType.URL:
            return DataValidator._validate_url(value, schema, field_name)
        elif schema.type == DataType.JSON:
            return DataValidator._validate_json(value, schema, field_name)
        elif schema.type == DataType.ANY:
            return value
        else:
            raise DataValidationError(field_name, f"Unsupported data type: {schema.type}")
    
    @staticmethod
    def _validate_string(value: Any, schema: DataSchema, field_name: str) -> str:
        """验证字符串类型"""
        if not isinstance(value, str):
            try:
                value = str(value)
            except Exception:
                raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to string")
        
        # 长度验证
        if schema.min_length is not None and len(value) < schema.min_length:
            raise DataValidationError(field_name, f"String length {len(value)} is below minimum {schema.min_length}")
        
        if schema.max_length is not None and len(value) > schema.max_length:
            raise DataValidationError(field_name, f"String length {len(value)} exceeds maximum {schema.max_length}")
        
        # 模式验证
        if schema.pattern and not re.match(schema.pattern, value):
            raise DataValidationError(field_name, f"String does not match pattern: {schema.pattern}")
        
        return value
    
    @staticmethod
    def _validate_number(value: Any, schema: DataSchema, field_name: str) -> Union[int, float]:
        """验证数字类型"""
        if not isinstance(value, (int, float)):
            try:
                value = float(value)
            except (ValueError, TypeError):
                raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to number")
        
        # 范围验证
        if schema.minimum is not None and value < schema.minimum:
            raise DataValidationError(field_name, f"Number {value} is below minimum {schema.minimum}")
        
        if schema.maximum is not None and value > schema.maximum:
            raise DataValidationError(field_name, f"Number {value} exceeds maximum {schema.maximum}")
        
        return value
    
    @staticmethod
    def _validate_integer(value: Any, schema: DataSchema, field_name: str) -> int:
        """验证整数类型"""
        if not isinstance(value, int):
            try:
                if isinstance(value, float) and value.is_integer():
                    value = int(value)
                else:
                    value = int(value)
            except (ValueError, TypeError):
                raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to integer")
        
        # 范围验证
        if schema.minimum is not None and value < schema.minimum:
            raise DataValidationError(field_name, f"Integer {value} is below minimum {schema.minimum}")
        
        if schema.maximum is not None and value > schema.maximum:
            raise DataValidationError(field_name, f"Integer {value} exceeds maximum {schema.maximum}")
        
        return value
    
    @staticmethod
    def _validate_boolean(value: Any, schema: DataSchema, field_name: str) -> bool:
        """验证布尔类型"""
        if isinstance(value, bool):
            return value
        elif isinstance(value, str):
            if value.lower() in ('true', '1', 'yes', 'on'):
                return True
            elif value.lower() in ('false', '0', 'no', 'off'):
                return False
            else:
                raise DataValidationError(field_name, f"Cannot convert string '{value}' to boolean")
        elif isinstance(value, (int, float)):
            return bool(value)
        else:
            raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to boolean")
    
    @staticmethod
    def _validate_array(value: Any, schema: DataSchema, field_name: str) -> List[Any]:
        """验证数组类型"""
        if not isinstance(value, list):
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                    if not isinstance(value, list):
                        raise ValueError()
                except (json.JSONDecodeError, ValueError):
                    raise DataValidationError(field_name, f"Cannot convert string to array")
            else:
                raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to array")
        
        # 长度验证
        if schema.min_items is not None and len(value) < schema.min_items:
            raise DataValidationError(field_name, f"Array length {len(value)} is below minimum {schema.min_items}")
        
        if schema.max_items is not None and len(value) > schema.max_items:
            raise DataValidationError(field_name, f"Array length {len(value)} exceeds maximum {schema.max_items}")
        
        # 元素类型验证
        if schema.items_type:
            item_schema = DataSchema(type=schema.items_type)
            validated_items = []
            for i, item in enumerate(value):
                try:
                    validated_item = DataValidator.validate_value(item, item_schema, f"{field_name}[{i}]")
                    validated_items.append(validated_item)
                except DataValidationError as e:
                    raise DataValidationError(f"{field_name}[{i}]", e.message, item)
            return validated_items
        
        return value
    
    @staticmethod
    def _validate_object(value: Any, schema: DataSchema, field_name: str) -> Dict[str, Any]:
        """验证对象类型"""
        if not isinstance(value, dict):
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                    if not isinstance(value, dict):
                        raise ValueError()
                except (json.JSONDecodeError, ValueError):
                    raise DataValidationError(field_name, f"Cannot convert string to object")
            else:
                raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to object")
        
        # 属性验证
        if schema.properties:
            validated_obj = {}
            for prop_name, prop_schema in schema.properties.items():
                prop_value = value.get(prop_name)
                try:
                    validated_value = DataValidator.validate_value(prop_value, prop_schema, f"{field_name}.{prop_name}")
                    if validated_value is not None:
                        validated_obj[prop_name] = validated_value
                except DataValidationError as e:
                    raise DataValidationError(f"{field_name}.{prop_name}", e.message, prop_value)
            
            # 添加未在schema中定义的属性
            for key, val in value.items():
                if key not in schema.properties:
                    validated_obj[key] = val
            
            return validated_obj
        
        return value
    
    @staticmethod
    def _validate_date(value: Any, schema: DataSchema, field_name: str) -> str:
        """验证日期类型"""
        if isinstance(value, date):
            return value.isoformat()
        elif isinstance(value, str):
            try:
                # 尝试解析日期格式
                datetime.strptime(value, "%Y-%m-%d")
                return value
            except ValueError:
                raise DataValidationError(field_name, f"Invalid date format: {value}. Expected YYYY-MM-DD")
        else:
            raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to date")
    
    @staticmethod
    def _validate_datetime(value: Any, schema: DataSchema, field_name: str) -> str:
        """验证日期时间类型"""
        if isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, str):
            try:
                # 尝试解析多种日期时间格式
                for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"]:
                    try:
                        datetime.strptime(value, fmt)
                        return value
                    except ValueError:
                        continue
                raise ValueError()
            except ValueError:
                raise DataValidationError(field_name, f"Invalid datetime format: {value}")
        else:
            raise DataValidationError(field_name, f"Cannot convert {type(value).__name__} to datetime")
    
    @staticmethod
    def _validate_email(value: Any, schema: DataSchema, field_name: str) -> str:
        """验证邮箱类型"""
        if not isinstance(value, str):
            raise DataValidationError(field_name, f"Email must be a string, got {type(value).__name__}")
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            raise DataValidationError(field_name, f"Invalid email format: {value}")
        
        return value
    
    @staticmethod
    def _validate_url(value: Any, schema: DataSchema, field_name: str) -> str:
        """验证URL类型"""
        if not isinstance(value, str):
            raise DataValidationError(field_name, f"URL must be a string, got {type(value).__name__}")
        
        url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        if not re.match(url_pattern, value):
            raise DataValidationError(field_name, f"Invalid URL format: {value}")
        
        return value
    
    @staticmethod
    def _validate_json(value: Any, schema: DataSchema, field_name: str) -> Any:
        """验证JSON类型"""
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError as e:
                raise DataValidationError(field_name, f"Invalid JSON: {e}")
        else:
            # 如果已经是Python对象，尝试序列化再反序列化以验证
            try:
                json_str = json.dumps(value)
                return json.loads(json_str)
            except (TypeError, ValueError) as e:
                raise DataValidationError(field_name, f"Value is not JSON serializable: {e}")


class DataTransformer:
    """数据转换器"""
    
    @staticmethod
    def transform_value(value: Any, from_type: DataType, to_type: DataType) -> Any:
        """转换数据类型"""
        if from_type == to_type:
            return value
        
        # 创建目标类型的schema
        target_schema = DataSchema(type=to_type)
        
        try:
            return DataValidator.validate_value(value, target_schema)
        except DataValidationError as e:
            raise ValueError(f"Cannot transform {from_type} to {to_type}: {e.message}")
    
    @staticmethod
    def auto_transform(value: Any, target_schema: DataSchema) -> Any:
        """自动转换到目标类型"""
        try:
            return DataValidator.validate_value(value, target_schema)
        except DataValidationError as e:
            logging.warning(f"Data transformation failed: {e}")
            return value  # 返回原值而不是抛出异常


class DataFlowManager:
    """数据流管理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.schemas: Dict[str, Dict[str, DataSchema]] = {}  # node_id -> {output_name: schema}
    
    def register_node_schema(self, node_id: str, outputs: Dict[str, DataSchema]):
        """注册节点的输出数据模式"""
        self.schemas[node_id] = outputs
    
    def validate_node_output(self, node_id: str, output_name: str, value: Any) -> Any:
        """验证节点输出数据"""
        if node_id in self.schemas and output_name in self.schemas[node_id]:
            schema = self.schemas[node_id][output_name]
            try:
                return DataValidator.validate_value(value, schema, f"{node_id}.{output_name}")
            except DataValidationError as e:
                self.logger.error(f"Output validation failed for {node_id}.{output_name}: {e}")
                raise
        
        return value  # 如果没有定义schema，直接返回原值
    
    def resolve_reference(self, reference: str, context: Dict[str, Any]) -> Any:
        """解析数据引用"""
        if not reference.startswith('@'):
            return reference
        
        ref_string = reference[1:]
        match = re.match(r"([\w-]+)\.([\w_]+)(?:\[(\d+)\])?(?:\.(\w+))?", ref_string)
        
        if not match:
            raise ValueError(f"Invalid reference format: {reference}")
        
        ref_node_id, ref_output_name, ref_index_str, ref_property = match.groups()
        context_key = f"{ref_node_id}.{ref_output_name}"
        
        if context_key not in context:
            raise ValueError(f"Reference not found: {context_key}")
        
        result = context[context_key]
        
        # 处理数组索引
        if ref_index_str is not None:
            try:
                index = int(ref_index_str)
                if isinstance(result, (list, tuple)) and 0 <= index < len(result):
                    result = result[index]
                else:
                    raise IndexError(f"Index {index} out of range")
            except (ValueError, IndexError) as e:
                raise ValueError(f"Invalid array index in reference {reference}: {e}")
        
        # 处理属性访问
        if ref_property and isinstance(result, dict):
            if ref_property in result:
                result = result[ref_property]
            else:
                raise ValueError(f"Property '{ref_property}' not found in reference {reference}")
        
        return result


# 全局数据流管理器实例
data_flow_manager = DataFlowManager()
