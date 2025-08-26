"""
逻辑智慧系统API接口
提供RESTful API接口供前端和其他系统调用
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

# 导入逻辑智慧系统
from .brain_core import IntelligentBrain, BrainRequest, ProcessingMode, ComplexityLevel
from .mode_manager import mode_manager

# 配置日志
logger = logging.getLogger(__name__)

# 创建路由器
brain_router = APIRouter(prefix="/brain", tags=["逻辑智慧"])

# 全局智慧实例
brain_instance = None


# 请求模型
class BrainProcessRequest(BaseModel):
    input_text: str
    user_id: str = "default"
    session_id: str = "default"
    mode: str = "semantic"  # semantic, reasoning, collaborative, adaptive
    complexity: str = "medium"  # low, medium, high, expert
    context: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    user_preferred_mode: Optional[str] = None  # auto, daily, professional, custom - 用户指定的处理模式


class ModeChangeRequest(BaseModel):
    """模式切换请求模型"""
    mode: str  # "normal" or "professional"

class FeedbackRequest(BaseModel):
    event_id: str
    feedback_score: float  # 0.0 - 1.0
    feedback_text: str = ""
    user_id: str = "default"

class ModeFeedbackRequest(BaseModel):
    """模式检测反馈请求模型"""
    detection_id: str
    user_choice: str  # daily, professional - 用户实际选择的模式
    satisfaction: Optional[int] = None  # 1-5分，用户满意度
    comments: Optional[str] = None  # 用户评论


# 响应模型
class BrainProcessResponse(BaseModel):
    output: str
    confidence: float
    processing_path: List[str]
    reasoning_trace: List[Dict[str, Any]]
    memory_updates: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    timestamp: str
    request_id: str
    # 模式检测信息
    detected_mode: Optional[str] = None  # 检测到的处理模式
    mode_confidence: Optional[float] = None  # 模式检测置信度
    mode_reasoning: Optional[str] = None  # 模式选择推理过程
    detection_id: Optional[str] = None  # 检测ID，用于反馈


async def get_brain_instance():
    """获取大脑实例"""
    global brain_instance
    if brain_instance is None:
        brain_instance = IntelligentBrain()
        await brain_instance.initialize()
    return brain_instance


def map_mode_string_to_enum(mode_str: str):
    """映射模式字符串到枚举"""
    from .brain_core import LegacyProcessingMode

    mode_mapping = {
        "simple": LegacyProcessingMode.SIMPLE,
        "semantic": LegacyProcessingMode.SEMANTIC,
        "reasoning": LegacyProcessingMode.REASONING,
        "collaborative": LegacyProcessingMode.COLLABORATIVE,
        "adaptive": LegacyProcessingMode.ADAPTIVE
    }
    return mode_mapping.get(mode_str.lower(), LegacyProcessingMode.SEMANTIC)


def map_complexity_string_to_enum(complexity_str: str):
    """映射复杂度字符串到枚举"""
    from .brain_core import ComplexityLevel

    complexity_mapping = {
        "low": ComplexityLevel.LOW,
        "medium": ComplexityLevel.MEDIUM,
        "high": ComplexityLevel.HIGH,
        "expert": ComplexityLevel.EXPERT
    }
    return complexity_mapping.get(complexity_str.lower(), ComplexityLevel.MEDIUM)


@brain_router.post("/process", response_model=BrainProcessResponse)
async def process_brain_request(request: BrainProcessRequest):
    """
    处理逻辑智慧请求

    这是逻辑智慧系统的主要接口，支持：
    - 多层次语义理解
    - 复杂推理分析
    - 多代理协作
    - 自适应学习
    - 智能记忆管理
    """
    try:
        logger.info(f"🧠 收到逻辑智慧处理请求: {request.input_text[:50]}...")

        # 获取智慧实例
        brain = await get_brain_instance()
        
        # 创建大脑请求
        brain_request = BrainRequest(
            input_text=request.input_text,
            context=request.context,
            user_id=request.user_id,
            session_id=request.session_id,
            mode=map_mode_string_to_enum(request.mode),
            complexity=map_complexity_string_to_enum(request.complexity),
            metadata=request.metadata
        )
        
        # 处理请求（支持智能模式检测）
        response = await brain.process(brain_request, user_preferred_mode=request.user_preferred_mode)

        # 生成请求ID
        request_id = f"brain_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(request.input_text) % 10000}"

        # 提取模式检测信息
        detected_mode = None
        mode_confidence = None
        mode_reasoning = None
        detection_id = None

        if hasattr(response, 'metadata') and response.metadata:
            # 从AI模块的元数据中提取模式信息
            for module_result in response.metadata.get('module_results', {}).values():
                if 'processing_mode' in module_result:
                    detected_mode = module_result.get('processing_mode')
                    mode_confidence = module_result.get('mode_confidence')
                    mode_reasoning = module_result.get('mode_reasoning')
                    detection_id = module_result.get('detection_id')
                    break

        logger.info(f"✅ 大脑处理完成，置信度: {response.confidence}")
        if detected_mode:
            logger.info(f"🎯 检测模式: {detected_mode} (置信度: {mode_confidence:.2f})")

        return BrainProcessResponse(
            output=response.output,
            confidence=response.confidence,
            processing_path=response.processing_path,
            reasoning_trace=response.reasoning_trace,
            memory_updates=response.memory_updates,
            metadata=response.metadata,
            timestamp=response.timestamp,
            request_id=request_id,
            detected_mode=detected_mode,
            mode_confidence=mode_confidence,
            mode_reasoning=mode_reasoning,
            detection_id=detection_id
        )
        
    except Exception as e:
        logger.error(f"❌ 大脑处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"大脑处理失败: {str(e)}")


@brain_router.post("/feedback")
async def provide_feedback(feedback: FeedbackRequest, background_tasks: BackgroundTasks):
    """
    提供用户反馈
    
    用于改进系统性能和个性化服务
    """
    try:
        logger.info(f"📝 收到用户反馈: {feedback.event_id}, 分数: {feedback.feedback_score}")
        
        # 获取大脑实例
        brain = await get_brain_instance()
        
        # 异步处理反馈
        background_tasks.add_task(
            process_feedback_async,
            brain,
            feedback.event_id,
            feedback.feedback_score,
            feedback.feedback_text
        )
        
        return {"message": "反馈已收到，系统将持续学习改进", "status": "success"}

    except Exception as e:
        logger.error(f"❌ 反馈处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"反馈处理失败: {str(e)}")


@brain_router.post("/mode-feedback")
async def provide_mode_feedback(feedback: ModeFeedbackRequest):
    """
    提供模式检测反馈

    用于改进智能模式检测的准确性
    """
    try:
        logger.info(f"🎯 收到模式反馈: {feedback.detection_id}, 用户选择: {feedback.user_choice}")

        # 获取大脑实例
        brain = await get_brain_instance()

        # 记录模式反馈
        success = await brain.record_mode_feedback(
            feedback.detection_id,
            feedback.user_choice,
            feedback.satisfaction,
            feedback.comments
        )

        if success:
            return {
                "message": "模式反馈已记录，系统将持续优化模式检测",
                "status": "success"
            }
        else:
            return {
                "message": "模式反馈记录失败，但不影响正常使用",
                "status": "warning"
            }

    except Exception as e:
        logger.error(f"❌ 模式反馈处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"模式反馈处理失败: {str(e)}")


@brain_router.get("/mode-stats")
async def get_mode_detection_stats():
    """
    获取模式检测统计信息

    返回模式检测的准确率、使用情况等统计数据
    """
    try:
        brain = await get_brain_instance()
        stats = await brain.get_mode_detection_stats()

        return {
            "status": "success",
            "data": stats,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ 获取模式检测统计失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取模式检测统计失败: {str(e)}")


@brain_router.post("/mode-toggle")
async def toggle_mode_detection(enabled: bool):
    """
    启用或禁用模式检测功能
    """
    try:
        brain = await get_brain_instance()
        brain.toggle_mode_detection(enabled)

        return {
            "message": f"模式检测已{'启用' if enabled else '禁用'}",
            "status": "success",
            "enabled": enabled
        }

    except Exception as e:
        logger.error(f"❌ 切换模式检测状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"切换模式检测状态失败: {str(e)}")


@brain_router.get("/supported-modes")
async def get_supported_modes():
    """
    获取支持的模式列表

    返回系统支持的所有处理模式及其配置信息
    """
    try:
        brain = await get_brain_instance()
        modes = await brain.get_supported_modes()

        return {
            "status": "success",
            "data": modes,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ 获取支持模式失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取支持模式失败: {str(e)}")


@brain_router.get("/mode-info/{mode}")
async def get_mode_info(mode: str):
    """
    获取特定模式的详细信息

    Args:
        mode: 模式名称 (auto, daily, professional, custom)
    """
    try:
        brain = await get_brain_instance()
        mode_info = await brain.get_mode_info(mode)

        return {
            "status": "success",
            "mode": mode,
            "data": mode_info,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ 获取模式信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取模式信息失败: {str(e)}")


@brain_router.get("/mode-enabled/{mode}")
async def check_mode_enabled(mode: str):
    """
    检查特定模式是否启用

    Args:
        mode: 模式名称 (auto, daily, professional, custom)
    """
    try:
        brain = await get_brain_instance()
        enabled = await brain.is_mode_enabled(mode)

        return {
            "status": "success",
            "mode": mode,
            "enabled": enabled,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ 检查模式状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"检查模式状态失败: {str(e)}")


async def process_feedback_async(brain: IntelligentBrain, event_id: str, feedback_score: float, feedback_text: str):
    """异步处理反馈"""
    try:
        # 如果大脑有学习模块，提供反馈
        if hasattr(brain, 'modules') and 'learning' in brain.modules:
            await brain.modules['learning'].provide_feedback(event_id, feedback_score, feedback_text)
        logger.info(f"✅ 反馈处理完成: {event_id}")
    except Exception as e:
        logger.error(f"❌ 异步反馈处理失败: {e}")


@brain_router.get("/status")
async def get_brain_status():
    """
    获取智能大脑系统状态
    """
    try:
        brain = await get_brain_instance()
        status = brain.get_status()
        
        # 添加额外的状态信息
        extended_status = {
            **status,
            "api_version": "1.0.0",
            "capabilities": [
                "多层次语义理解",
                "复杂推理分析", 
                "多代理协作",
                "自适应学习",
                "智能记忆管理"
            ],
            "supported_modes": ["simple", "semantic", "reasoning", "collaborative", "adaptive"],
            "supported_complexity": ["low", "medium", "high", "expert"]
        }
        
        return extended_status
        
    except Exception as e:
        logger.error(f"❌ 获取状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取状态失败: {str(e)}")


@brain_router.get("/stats")
async def get_brain_stats():
    """
    获取智能大脑系统统计信息
    """
    try:
        brain = await get_brain_instance()
        
        stats = {
            "system_status": brain.get_status(),
            "processing_history_count": len(brain.processing_history),
        }
        
        # 获取各模块的统计信息
        if hasattr(brain, 'modules'):
            if 'learning' in brain.modules:
                stats["learning_stats"] = brain.modules['learning'].get_learning_stats()
            
            if 'agents' in brain.modules:
                stats["agent_stats"] = brain.modules['agents'].get_agent_pool_status()
            
            if 'memory' in brain.modules:
                stats["memory_stats"] = {
                    "nodes_count": len(brain.modules['memory'].knowledge_graph.nodes),
                    "edges_count": len(brain.modules['memory'].knowledge_graph.edges)
                }
        
        return stats
        
    except Exception as e:
        logger.error(f"❌ 获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@brain_router.get("/user/{user_id}/insights")
async def get_user_insights(user_id: str):
    """
    获取用户个性化洞察
    """
    try:
        brain = await get_brain_instance()
        
        insights = {"user_id": user_id, "message": "用户洞察功能开发中"}
        
        # 如果有学习模块，获取用户洞察
        if hasattr(brain, 'modules') and 'learning' in brain.modules:
            insights = await brain.modules['learning'].get_user_insights(user_id)
        
        return insights
        
    except Exception as e:
        logger.error(f"❌ 获取用户洞察失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取用户洞察失败: {str(e)}")


@brain_router.post("/reset")
async def reset_brain_system():
    """
    重置智能大脑系统（仅用于开发和测试）
    """
    try:
        global brain_instance
        brain_instance = None
        
        logger.info("🔄 智能大脑系统已重置")
        return {"message": "智能大脑系统已重置", "status": "success"}
        
    except Exception as e:
        logger.error(f"❌ 重置失败: {e}")
        raise HTTPException(status_code=500, detail=f"重置失败: {str(e)}")


@brain_router.get("/health")
async def health_check():
    """
    健康检查接口
    """
    try:
        brain = await get_brain_instance()
        
        # 简单的健康检查
        test_request = BrainRequest(
            input_text="健康检查",
            user_id="health_check",
            session_id="health_check",
            mode=ProcessingMode.SIMPLE,
            complexity=ComplexityLevel.LOW
        )
        
        response = await brain.process(test_request)
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "test_confidence": response.confidence,
            "modules_initialized": brain.is_initialized
        }
        
    except Exception as e:
        logger.error(f"❌ 健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


@brain_router.post("/mode/switch")
async def switch_mode(request: ModeChangeRequest):
    """切换处理模式"""
    try:
        from .mode_manager import ProcessingMode

        # 验证模式
        if request.mode == "normal":
            target_mode = ProcessingMode.NORMAL
        elif request.mode == "professional":
            target_mode = ProcessingMode.PROFESSIONAL
        else:
            raise HTTPException(status_code=400, detail=f"无效的模式: {request.mode}")

        # 切换模式
        success = mode_manager.switch_mode(target_mode)

        if success:
            return {
                "status": "success",
                "message": f"已切换到{target_mode.value}模式",
                "mode_info": mode_manager.get_mode_info()
            }
        else:
            raise HTTPException(status_code=500, detail="模式切换失败")

    except Exception as e:
        logger.error(f"❌ 模式切换失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@brain_router.get("/mode/current")
async def get_current_mode():
    """获取当前模式信息"""
    try:
        return {
            "status": "success",
            "current_mode": mode_manager.get_current_mode().value,
            "mode_info": mode_manager.get_mode_info(),
            "all_modes": mode_manager.get_all_modes_info()
        }

    except Exception as e:
        logger.error(f"❌ 获取模式信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@brain_router.get("/mode/list")
async def list_modes():
    """列出所有可用模式"""
    try:
        return {
            "status": "success",
            "modes": mode_manager.get_all_modes_info()
        }

    except Exception as e:
        logger.error(f"❌ 获取模式列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 导出路由器
__all__ = ["brain_router"]
