"""
模式检测器集成接口
"""

import asyncio
from typing import Dict, Any, Optional
from .detector import IntelligentModeDetector

class ModeDetectionService:
    """模式检测服务"""
    
    def __init__(self, llm_client=None):
        self.detector = IntelligentModeDetector(llm_client)
        self._initialized = False
    
    async def initialize(self) -> None:
        """初始化服务"""
        if not self._initialized:
            # 这里可以添加初始化逻辑
            self._initialized = True
    
    async def detect_user_mode(self, user_input: str, context: Dict[str, Any] = None, user_mode_preference: str = None) -> Dict[str, Any]:
        """检测用户输入的最佳处理模式（支持四级模式选择）"""

        await self.initialize()

        try:
            result = await self.detector.detect_mode(user_input, context, user_mode_preference)

            # 格式化返回结果，适配现有系统
            return {
                "success": True,
                "mode": result["recommended_mode"],
                "confidence": result["confidence"],
                "reasoning": result["reasoning"],
                "alternative_mode": result["alternative_mode"],
                "processing_time": result["processing_time"],
                "quality_metrics": {
                    "consensus_rate": result["consensus_rate"],
                    "fusion_quality": result.get("quality_metrics", {}).get("fusion_quality", {}),
                    "decision_explanation": result.get("quality_metrics", {}).get("decision_explanation", "")
                },
                "detection_id": result["detection_id"],
                "timestamp": result["timestamp"],
                "user_specified": result.get("user_specified", False),
                "original_user_mode": result.get("original_user_mode"),
                "mode_source": "user_specified" if result.get("user_specified") else "auto_detected"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "mode": "daily",  # 默认模式
                "confidence": 0.5,
                "reasoning": "检测失败，使用默认模式",
                "alternative_mode": "professional"
            }
    
    async def record_user_choice(self, detection_id: str, user_choice: str, satisfaction: int = None, comments: str = None) -> bool:
        """记录用户的实际选择，用于学习优化"""
        
        try:
            # 构建用户反馈
            user_feedback = {
                "actual_mode": user_choice,
                "satisfaction": satisfaction,
                "comments": comments
            }
            
            # 这里需要根据detection_id找到原始检测结果
            # 简化实现，假设我们有方法获取原始结果
            detection_result = {"detection_id": detection_id}  # 实际应该从缓存或数据库获取
            
            return await self.detector.record_user_feedback(detection_result, user_feedback)
            
        except Exception:
            return False
    
    async def get_detection_stats(self) -> Dict[str, Any]:
        """获取检测统计信息"""
        
        try:
            return await self.detector.get_performance_stats()
        except Exception:
            return {
                "detection_stats": {},
                "accuracy_stats": {"accuracy": 0.0, "sample_size": 0},
                "fusion_weights": {}
            }
    
    async def update_detection_config(self, config_updates: Dict[str, Any]) -> bool:
        """更新检测配置"""
        
        try:
            # 更新融合权重
            if "fusion_weights" in config_updates:
                return self.detector.update_fusion_weights(config_updates["fusion_weights"])
            
            return True
        except Exception:
            return False

    async def get_supported_modes(self) -> Dict[str, Any]:
        """获取支持的模式列表"""

        await self.initialize()

        try:
            return self.detector.get_supported_modes()
        except Exception:
            return {}

    async def get_mode_info(self, mode: str) -> Dict[str, Any]:
        """获取特定模式的信息"""

        await self.initialize()

        try:
            return self.detector.get_mode_info(mode)
        except Exception:
            return {}

    async def is_mode_enabled(self, mode: str) -> bool:
        """检查模式是否启用"""

        await self.initialize()

        try:
            return self.detector.is_mode_enabled(mode)
        except Exception:
            return False


# 全局服务实例
_mode_detection_service: Optional[ModeDetectionService] = None

def get_mode_detection_service(llm_client=None) -> ModeDetectionService:
    """获取模式检测服务实例（单例模式）"""
    
    global _mode_detection_service
    if _mode_detection_service is None:
        _mode_detection_service = ModeDetectionService(llm_client)
    return _mode_detection_service

async def detect_processing_mode(user_input: str, context: Dict[str, Any] = None, llm_client=None) -> Dict[str, Any]:
    """便捷函数：检测处理模式"""
    
    service = get_mode_detection_service(llm_client)
    return await service.detect_user_mode(user_input, context)

async def record_mode_feedback(detection_id: str, user_choice: str, satisfaction: int = None, comments: str = None) -> bool:
    """便捷函数：记录模式反馈"""
    
    service = get_mode_detection_service()
    return await service.record_user_choice(detection_id, user_choice, satisfaction, comments)


# 与现有AI集成系统的集成接口
class AIIntegrationModeDetector:
    """与AI集成系统的模式检测器接口"""
    
    def __init__(self, ai_integration_system):
        self.ai_system = ai_integration_system
        self.mode_service = get_mode_detection_service(ai_integration_system.deepseek_client)
    
    async def enhance_ai_processing(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """增强AI处理流程，自动检测和应用最佳模式"""
        
        # 1. 检测最佳处理模式
        mode_result = await self.mode_service.detect_user_mode(user_input, context)
        
        if not mode_result["success"]:
            # 检测失败，使用默认处理
            return await self.ai_system.process_user_input(user_input, context)
        
        # 2. 根据检测结果调整处理策略
        detected_mode = mode_result["mode"]
        confidence = mode_result["confidence"]
        
        # 构建增强的上下文
        enhanced_context = context.copy() if context else {}
        enhanced_context.update({
            "processing_mode": detected_mode,
            "mode_confidence": confidence,
            "mode_reasoning": mode_result["reasoning"],
            "detection_id": mode_result["detection_id"]
        })
        
        # 3. 根据模式调整AI处理参数
        if detected_mode == "professional":
            # 专业模式：更严格、更详细
            enhanced_context["response_style"] = "professional"
            enhanced_context["detail_level"] = "comprehensive"
            enhanced_context["formality"] = "high"
        else:
            # 日常模式：更轻松、更实用
            enhanced_context["response_style"] = "casual"
            enhanced_context["detail_level"] = "practical"
            enhanced_context["formality"] = "medium"
        
        # 4. 执行增强的AI处理
        ai_result = await self.ai_system.process_user_input(user_input, enhanced_context)
        
        # 5. 在结果中包含模式检测信息
        if isinstance(ai_result, dict):
            ai_result["mode_detection"] = {
                "detected_mode": detected_mode,
                "confidence": confidence,
                "reasoning": mode_result["reasoning"],
                "detection_id": mode_result["detection_id"]
            }
        
        return ai_result
    
    async def process_with_mode_feedback(self, user_input: str, user_preferred_mode: str = None, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """处理用户输入，支持用户指定模式"""
        
        if user_preferred_mode:
            # 用户指定了模式，直接使用
            enhanced_context = context.copy() if context else {}
            enhanced_context["processing_mode"] = user_preferred_mode
            enhanced_context["mode_source"] = "user_specified"
            
            return await self.ai_system.process_user_input(user_input, enhanced_context)
        else:
            # 自动检测模式
            return await self.enhance_ai_processing(user_input, context)


# 使用示例
async def example_integration():
    """集成使用示例"""
    
    # 假设有一个AI集成系统实例
    class MockAISystem:
        def __init__(self):
            self.deepseek_client = None  # 实际的DeepSeek客户端
        
        async def process_user_input(self, user_input: str, context: Dict[str, Any] = None):
            mode = context.get("processing_mode", "daily") if context else "daily"
            return {
                "response": f"使用{mode}模式处理: {user_input}",
                "mode_used": mode,
                "context": context
            }
    
    # 创建集成检测器
    ai_system = MockAISystem()
    mode_detector = AIIntegrationModeDetector(ai_system)
    
    # 测试自动模式检测
    result1 = await mode_detector.enhance_ai_processing("帮我写个简单的邮件")
    print("自动检测结果:", result1)
    
    # 测试用户指定模式
    result2 = await mode_detector.process_with_mode_feedback(
        "帮我写个简单的邮件", 
        user_preferred_mode="professional"
    )
    print("用户指定模式结果:", result2)

if __name__ == "__main__":
    asyncio.run(example_integration())
