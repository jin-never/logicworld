"""
Office智能协作系统缓存机制 - 提高重复任务效率
"""
import hashlib
import json
import time
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import threading

@dataclass
class CacheEntry:
    """缓存条目"""
    key: str
    value: Any
    created_at: datetime
    last_accessed: datetime
    access_count: int
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None

class OfficeCacheManager:
    """Office协作系统缓存管理器"""
    
    def __init__(self, max_entries: int = 1000, default_ttl: int = 3600):
        self.max_entries = max_entries
        self.default_ttl = default_ttl  # 默认TTL: 1小时
        self.cache: Dict[str, CacheEntry] = {}
        self.lock = threading.RLock()
        
        # 缓存统计
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "total_requests": 0
        }
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """生成缓存键"""
        # 将参数转换为字符串并排序以确保一致性
        key_data = {
            "prefix": prefix,
            "args": args,
            "kwargs": sorted(kwargs.items())
        }
        
        # 创建哈希
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return f"{prefix}:{hashlib.md5(key_str.encode()).hexdigest()}"
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        with self.lock:
            self.stats["total_requests"] += 1
            
            if key not in self.cache:
                self.stats["misses"] += 1
                return None
            
            entry = self.cache[key]
            
            # 检查是否过期
            if entry.expires_at and datetime.now() > entry.expires_at:
                del self.cache[key]
                self.stats["misses"] += 1
                return None
            
            # 更新访问信息
            entry.last_accessed = datetime.now()
            entry.access_count += 1
            
            self.stats["hits"] += 1
            return entry.value
    
    def put(self, key: str, value: Any, ttl: Optional[int] = None, metadata: Dict[str, Any] = None) -> None:
        """存储缓存值"""
        with self.lock:
            # 计算过期时间
            expires_at = None
            if ttl is not None or self.default_ttl > 0:
                ttl = ttl if ttl is not None else self.default_ttl
                expires_at = datetime.now() + timedelta(seconds=ttl)
            
            # 创建缓存条目
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(),
                last_accessed=datetime.now(),
                access_count=1,
                expires_at=expires_at,
                metadata=metadata or {}
            )
            
            # 如果缓存已满，执行LRU淘汰
            if len(self.cache) >= self.max_entries:
                self._evict_lru()
            
            self.cache[key] = entry
    
    def _evict_lru(self) -> None:
        """LRU淘汰算法"""
        if not self.cache:
            return
        
        # 找到最少最近使用的条目
        lru_key = min(self.cache.keys(), 
                     key=lambda k: self.cache[k].last_accessed)
        
        del self.cache[lru_key]
        self.stats["evictions"] += 1
    
    def clear(self) -> None:
        """清空缓存"""
        with self.lock:
            self.cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        with self.lock:
            hit_rate = 0
            if self.stats["total_requests"] > 0:
                hit_rate = self.stats["hits"] / self.stats["total_requests"]
            
            return {
                **self.stats,
                "hit_rate": hit_rate,
                "cache_size": len(self.cache),
                "memory_usage_mb": self._estimate_memory_usage()
            }
    
    def _estimate_memory_usage(self) -> float:
        """估算内存使用量（MB）"""
        total_size = 0
        for entry in self.cache.values():
            # 粗略估算对象大小
            total_size += len(str(entry.value)) * 2  # 假设每个字符2字节
            total_size += len(str(entry.key)) * 2
            total_size += 200  # 元数据和对象开销
        
        return total_size / (1024 * 1024)

class OfficePromptCache:
    """Office提示词缓存"""
    
    def __init__(self, cache_manager: OfficeCacheManager):
        self.cache = cache_manager
        self.prefix = "office_prompt"
    
    def get_cached_prompt(self, task: str, products: List, app_type: str, scenario: str) -> Optional[str]:
        """获取缓存的提示词"""
        # 生成缓存键
        products_hash = self._hash_products(products)
        key = self.cache._generate_key(
            self.prefix,
            task=task,
            products_hash=products_hash,
            app_type=app_type,
            scenario=scenario
        )
        
        return self.cache.get(key)
    
    def cache_prompt(self, task: str, products: List, app_type: str, scenario: str, 
                    prompt: str, ttl: int = 1800) -> None:
        """缓存提示词（默认30分钟TTL）"""
        products_hash = self._hash_products(products)
        key = self.cache._generate_key(
            self.prefix,
            task=task,
            products_hash=products_hash,
            app_type=app_type,
            scenario=scenario
        )
        
        metadata = {
            "task": task,
            "app_type": app_type,
            "scenario": scenario,
            "products_count": len(products),
            "prompt_length": len(prompt)
        }
        
        self.cache.put(key, prompt, ttl=ttl, metadata=metadata)
    
    def _hash_products(self, products: List) -> str:
        """生成产品列表的哈希值"""
        if not products:
            return "empty"
        
        products_data = []
        for product in products:
            if hasattr(product, 'to_dict'):
                product_dict = product.to_dict()
                # 只使用关键字段生成哈希，忽略时间戳
                key_fields = {
                    "app_type": product_dict.get("app_type"),
                    "summary": product_dict.get("summary"),
                    "key_points": product_dict.get("key_points")
                }
                products_data.append(key_fields)
        
        products_str = json.dumps(products_data, sort_keys=True)
        return hashlib.md5(products_str.encode()).hexdigest()

class OfficeTemplateCache:
    """Office模板缓存"""
    
    def __init__(self, cache_manager: OfficeCacheManager):
        self.cache = cache_manager
        self.prefix = "office_template"
    
    def get_cached_template(self, app_type: str, scenario: str) -> Optional[Any]:
        """获取缓存的模板"""
        key = self.cache._generate_key(
            self.prefix,
            app_type=app_type,
            scenario=scenario
        )
        
        return self.cache.get(key)
    
    def cache_template(self, app_type: str, scenario: str, template: Any, ttl: int = 7200) -> None:
        """缓存模板（默认2小时TTL）"""
        key = self.cache._generate_key(
            self.prefix,
            app_type=app_type,
            scenario=scenario
        )
        
        metadata = {
            "app_type": app_type,
            "scenario": scenario,
            "template_name": getattr(template, 'name', 'unknown')
        }
        
        self.cache.put(key, template, ttl=ttl, metadata=metadata)

class OfficeScenarioCache:
    """Office场景检测缓存"""
    
    def __init__(self, cache_manager: OfficeCacheManager):
        self.cache = cache_manager
        self.prefix = "office_scenario"
    
    def get_cached_scenario(self, task: str, app_type: str) -> Optional[str]:
        """获取缓存的场景"""
        key = self.cache._generate_key(
            self.prefix,
            task=task,
            app_type=app_type
        )
        
        return self.cache.get(key)
    
    def cache_scenario(self, task: str, app_type: str, scenario: str, ttl: int = 3600) -> None:
        """缓存场景检测结果（默认1小时TTL）"""
        key = self.cache._generate_key(
            self.prefix,
            task=task,
            app_type=app_type
        )
        
        metadata = {
            "task": task,
            "app_type": app_type,
            "scenario": scenario
        }
        
        self.cache.put(key, scenario, ttl=ttl, metadata=metadata)

# 全局缓存管理器
office_cache_manager = OfficeCacheManager(max_entries=1000, default_ttl=3600)

# 专用缓存实例
prompt_cache = OfficePromptCache(office_cache_manager)
template_cache = OfficeTemplateCache(office_cache_manager)
scenario_cache = OfficeScenarioCache(office_cache_manager) 