"""
智能大脑模式管理器
实现普通模式和专业模式的切换和管理
"""

import logging
import os
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass

class ProcessingMode(Enum):
    """处理模式枚举"""
    NORMAL = "normal"       # 普通模式：日常办公，轻量级处理
    PROFESSIONAL = "professional"  # 专业模式：深度分析，复杂推理

@dataclass
class ModeConfig:
    """模式配置"""
    name: str
    description: str
    ai_provider: str
    model: str
    max_tokens: int
    temperature: float
    use_langgraph: bool
    use_multi_agent: bool
    use_complex_reasoning: bool
    response_quality: str

class ModeManager:
    """模式管理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.current_mode = ProcessingMode.NORMAL
        self.mode_configs = self._initialize_mode_configs()
        
    def _initialize_mode_configs(self) -> Dict[ProcessingMode, ModeConfig]:
        """初始化模式配置"""
        return {
            ProcessingMode.NORMAL: ModeConfig(
                name="普通模式",
                description="日常办公助手：快速问答、文档处理、简单分析，注重效率和实用性",
                ai_provider="deepseek",
                model="deepseek-chat",
                max_tokens=1500,  # 适中的token数量
                temperature=0.4,  # 平衡的创造性
                use_langgraph=False,  # 使用简化工作流
                use_multi_agent=False,  # 单一智能代理
                use_complex_reasoning=True,  # 集成基础推理能力
                response_quality="efficient"  # 快速高效
            ),
            ProcessingMode.PROFESSIONAL: ModeConfig(
                name="专业模式 (LangGraph)",
                description="LangGraph工作流编排：复杂推理链、多代理协作、技术架构设计、深度分析",
                ai_provider="deepseek",
                model="deepseek-chat",
                max_tokens=4000,  # 大容量token
                temperature=0.7,  # 高创造性
                use_langgraph=True,  # 核心：LangGraph工作流编排
                use_multi_agent=True,  # 多专家代理协作
                use_complex_reasoning=True,  # 深度推理引擎
                response_quality="comprehensive"  # 全面深入
            )
        }
    
    def switch_mode(self, mode: ProcessingMode) -> bool:
        """切换模式"""
        try:
            if mode in self.mode_configs:
                old_mode = self.current_mode
                self.current_mode = mode
                
                config = self.mode_configs[mode]
                self.logger.info(f"🔄 [ModeManager] 模式切换: {old_mode.value} -> {mode.value}")
                self.logger.info(f"📋 [ModeManager] 当前配置: {config.name} - {config.description}")
                
                return True
            else:
                self.logger.error(f"❌ [ModeManager] 未知模式: {mode}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ [ModeManager] 模式切换失败: {e}")
            return False
    
    def get_current_mode(self) -> ProcessingMode:
        """获取当前模式"""
        return self.current_mode
    
    def get_current_config(self) -> ModeConfig:
        """获取当前模式配置"""
        return self.mode_configs[self.current_mode]
    
    def get_mode_info(self, mode: Optional[ProcessingMode] = None) -> Dict[str, Any]:
        """获取模式信息"""
        target_mode = mode or self.current_mode
        config = self.mode_configs[target_mode]
        
        return {
            "mode": target_mode.value,
            "name": config.name,
            "description": config.description,
            "ai_provider": config.ai_provider,
            "model": config.model,
            "capabilities": {
                "max_tokens": config.max_tokens,
                "temperature": config.temperature,
                "langgraph": config.use_langgraph,
                "multi_agent": config.use_multi_agent,
                "complex_reasoning": config.use_complex_reasoning,
                "response_quality": config.response_quality
            }
        }
    
    def get_all_modes_info(self) -> Dict[str, Any]:
        """获取所有模式信息"""
        return {
            "current_mode": self.current_mode.value,
            "modes": {
                mode.value: self.get_mode_info(mode) 
                for mode in ProcessingMode
            }
        }
    
    def should_use_feature(self, feature: str) -> bool:
        """判断当前模式是否应该使用某个功能"""
        config = self.get_current_config()
        
        feature_map = {
            "langgraph": config.use_langgraph,
            "multi_agent": config.use_multi_agent,
            "complex_reasoning": config.use_complex_reasoning,
            "high_quality": config.response_quality == "comprehensive"
        }
        
        return feature_map.get(feature, False)
    
    def get_ai_params(self) -> Dict[str, Any]:
        """获取当前模式的AI参数"""
        config = self.get_current_config()
        
        return {
            "provider": config.ai_provider,
            "model": config.model,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature
        }
    
    def auto_select_mode(self, user_input: str, context: Dict[str, Any] = None) -> ProcessingMode:
        """根据用户输入自动选择模式"""
        # 专业模式关键词
        professional_keywords = [
            "分析", "设计", "架构", "规划", "策略", "方案", "技术", "算法",
            "系统", "框架", "优化", "评估", "研究", "深度", "复杂", "专业",
            "商业", "市场", "竞争", "投资", "风险", "决策", "管理", "领导"
        ]
        
        # 检查是否包含专业关键词
        input_lower = user_input.lower()
        for keyword in professional_keywords:
            if keyword in input_lower:
                return ProcessingMode.PROFESSIONAL
        
        # 检查上下文复杂度
        if context:
            complexity_indicators = [
                len(user_input) > 100,  # 长文本
                context.get("requires_analysis", False),
                context.get("complexity", "low") in ["high", "expert"]
            ]
            
            if any(complexity_indicators):
                return ProcessingMode.PROFESSIONAL
        
        # 默认普通模式
        return ProcessingMode.NORMAL

# 全局模式管理器实例
mode_manager = ModeManager()
