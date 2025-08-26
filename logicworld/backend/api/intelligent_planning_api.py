"""
智能规划API - 提供用户意图理解和任务分解的API接口
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, AsyncGenerator
import logging
import json
import asyncio
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.intelligent_planner import IntelligentPlanner, create_intelligent_planner
from agent_system.agent_factory import AgentFactory


# 创建路由器
router = APIRouter(prefix="/api/intelligent-planning", tags=["智能规划"])
logger = logging.getLogger(__name__)


# 请求模型
class PlanningRequest(BaseModel):
    """规划请求模型"""
    user_input: str = Field(..., description="用户输入的需求描述", min_length=1, max_length=2000)
    context: Optional[Dict[str, Any]] = Field(None, description="可选的上下文信息")
    session_id: Optional[str] = Field(None, description="会话ID，用于维持对话上下文")


class ClarificationResponse(BaseModel):
    """澄清回复模型"""
    user_response: str = Field(..., description="用户的澄清回复", min_length=1, max_length=1000)
    previous_context: Dict[str, Any] = Field(..., description="之前的上下文信息")
    session_id: Optional[str] = Field(None, description="会话ID")


# 响应模型
class PlanningResponse(BaseModel):
    """规划响应模型"""
    status: str = Field(..., description="处理状态")
    response_type: str = Field(..., description="响应类型")
    message: str = Field(..., description="响应消息")
    timestamp: str = Field(..., description="时间戳")
    data: Optional[Dict[str, Any]] = Field(None, description="具体数据")


# 全局规划器实例管理
planner_instances: Dict[str, IntelligentPlanner] = {}


def get_planner(session_id: Optional[str] = None) -> IntelligentPlanner:
    """获取规划器实例"""
    if session_id:
        if session_id not in planner_instances:
            planner_instances[session_id] = create_intelligent_planner()
        return planner_instances[session_id]
    else:
        # 无会话ID时创建临时实例
        return create_intelligent_planner()


@router.post("/analyze", response_model=PlanningResponse)
async def analyze_user_input(request: PlanningRequest):
    """
    分析用户输入并生成响应

    智能分析用户意图，根据需求生成澄清问题或执行计划
    """
    logger.info(f"🧠 收到分析请求: {request.user_input[:50]}...")

    try:
        # 获取规划器实例
        planner = get_planner(request.session_id)

        # 第一步：快速意图识别
        intent_result = await _quick_intent_analysis(request.user_input, planner)
        intent = intent_result.get('primary_intent', 'task_planning')

        logger.info(f"🎯 识别意图: {intent}")

        # 第二步：智能路由 - 统一使用角色模板
        if _should_use_quick_response(intent, request.user_input):
            # 快速响应模式
            logger.info("⚡ 使用快速响应模式")
            result = await planner.role_based_response(request.user_input, intent, request.context, response_mode="quick")
        else:
            # 深度分析模式 - 也使用角色模板，但更详细
            logger.info("🔍 使用深度分析模式（角色模板）")
            result = await planner.role_based_response(request.user_input, intent, request.context, response_mode="deep")

        # 构建响应
        response_data = {
            'status': result.get('status', 'success'),
            'response_type': result.get('response_type', 'unknown'),
            'message': result.get('message', '处理完成'),
            'timestamp': result.get('timestamp', datetime.now().isoformat()),
            'data': {
                'understanding': result.get('understanding', {}),
                'planning': result.get('planning', {}),
                'summary': result.get('summary', {})
            }
        }

        # 根据响应类型添加特定数据
        if result.get('response_type') == 'clarification_needed':
            response_data['data']['questions'] = result.get('questions', [])
            response_data['data']['completeness_score'] = result.get('completeness_score', 0.5)

        elif result.get('response_type') == 'execution_plan':
            response_data['data']['steps'] = result.get('steps', [])
            response_data['data']['summary'] = result.get('summary', {})

        logger.info("✅ 分析请求处理完成")
        return PlanningResponse(**response_data)

    except Exception as e:
        logger.error(f"❌ 分析请求处理失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"处理分析请求时发生错误: {str(e)}"
        )


@router.post("/analyze-stream")
async def analyze_user_input_stream(request: PlanningRequest):
    """
    分析用户输入并生成流式响应

    返回Server-Sent Events格式的流式数据，支持逐字显示
    """
    logger.info(f"🧠 收到流式分析请求: {request.user_input[:50]}...")

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            # 获取规划器实例
            planner = get_planner(request.session_id)

            # 第一步：快速意图识别
            intent_result = await _quick_intent_analysis(request.user_input, planner)
            intent = intent_result.get('primary_intent', 'task_planning')

            logger.info(f"🎯 识别意图: {intent}")

            # 发送意图识别结果
            yield f"data: {json.dumps({'type': 'intent', 'intent': intent}, ensure_ascii=False)}\n\n"

            # 第二步：生成响应
            if _should_use_quick_response(intent, request.user_input):
                logger.info("⚡ 使用快速响应模式")
                result = await planner.role_based_response(request.user_input, intent, request.context, response_mode="quick")
            else:
                logger.info("🔍 使用深度分析模式（角色模板）")
                result = await planner.role_based_response(request.user_input, intent, request.context, response_mode="deep")

            # 获取完整响应文本
            message = result.get('message', '')

            # 发送开始信号
            yield f"data: {json.dumps({'type': 'start', 'total_length': len(message)}, ensure_ascii=False)}\n\n"

            # 逐字发送内容
            for i, char in enumerate(message):
                # 模拟打字机效果的延迟
                await asyncio.sleep(0.02)  # 20ms延迟，可以调整速度

                chunk_data = {
                    'type': 'chunk',
                    'char': char,
                    'index': i,
                    'total': len(message)
                }
                yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"

            # 发送完成信号
            completion_data = {
                'type': 'complete',
                'status': result.get('status', 'success'),
                'response_type': result.get('response_type', 'unknown'),
                'timestamp': result.get('timestamp', datetime.now().isoformat()),
                'session_id': request.session_id
            }
            yield f"data: {json.dumps(completion_data, ensure_ascii=False)}\n\n"

            logger.info("✅ 流式分析请求处理完成")

        except Exception as e:
            logger.error(f"❌ 流式分析请求处理失败: {e}")
            error_data = {
                'type': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.post("/plan", response_model=PlanningResponse)
async def create_plan(request: PlanningRequest):
    """
    创建执行计划 - 支持智能路由

    根据用户输入智能选择处理方式：
    - 简单聊天：快速响应模式 (1-2秒)
    - 复杂规划：深度分析模式 (10-20秒)
    """
    logger.info(f"🧠 收到规划请求: {request.user_input[:50]}...")

    try:
        # 获取规划器实例
        planner = get_planner(request.session_id)

        # 第一步：快速意图识别
        intent_result = await _quick_intent_analysis(request.user_input, planner)
        intent = intent_result.get('primary_intent', 'task_planning')

        logger.info(f"🎯 识别意图: {intent}")

        # 第二步：智能路由
        if _should_use_quick_response(intent, request.user_input):
            # 快速响应模式
            logger.info("⚡ 使用快速响应模式")
            result = await planner.quick_response(request.user_input, intent, request.context)
        else:
            # 深度分析模式
            logger.info("🔍 使用深度分析模式")
            result = await planner.process_user_request(request.user_input, request.context)

        # 构建响应
        response_data = {
            'status': result.get('status', 'success'),
            'response_type': result.get('response_type', 'unknown'),
            'message': result.get('message', '处理完成'),
            'timestamp': result.get('timestamp', datetime.now().isoformat()),
            'data': {}
        }

        # 根据响应类型添加特定数据
        if result.get('response_type') in ['quick_chat', 'quick_answer']:
            response_data['data'] = {
                'role': result.get('role', ''),
                'intent': result.get('intent', ''),
                'processing_mode': result.get('response_mode', 'quick')
            }
        elif result.get('response_type') in ['execution_plan', 'detailed_analysis']:
            response_data['data'] = {
                'role': result.get('role', ''),
                'intent': result.get('intent', ''),
                'processing_mode': result.get('response_mode', 'deep'),
                'analysis_type': 'role_based'
            }
        else:
            # 兼容原来的深度分析结果
            response_data['data'] = {
                'understanding': result.get('understanding', {}),
                'planning': result.get('planning', {}),
                'summary': result.get('summary', {}),
                'processing_mode': 'deep'
            }

            # 添加特定类型的数据
            if result.get('response_type') == 'clarification_needed':
                response_data['data']['questions'] = result.get('questions', [])
                response_data['data']['completeness_score'] = result.get('completeness_score', 0.5)
            elif result.get('response_type') == 'execution_plan':
                response_data['data']['steps'] = result.get('steps', [])

        logger.info("✅ 规划请求处理完成")
        return PlanningResponse(**response_data)

    except Exception as e:
        logger.error(f"❌ 规划请求处理失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"处理规划请求时发生错误: {str(e)}"
        )


async def _quick_intent_analysis(user_input: str, planner: IntelligentPlanner) -> Dict[str, Any]:
    """快速意图分析"""
    try:
        # 使用简单的prompt进行快速意图识别
        intent_prompt = f"""
        请快速分析用户输入的意图类型：

        用户输入：{user_input}

        请从以下类型中选择最匹配的：
        - casual_chat: 日常聊天、问候、闲聊
        - question_answer: 简单问答、信息查询
        - task_planning: 需要制定计划、分解任务
        - consultation: 寻求建议、咨询
        - learning: 学习相关需求
        - life_assistance: 生活帮助

        请只返回意图类型，不要解释。
        """

        intent_response = await AgentFactory.ask_llm(intent_prompt)
        intent = intent_response.strip().lower()

        # 验证意图类型
        valid_intents = ['casual_chat', 'question_answer', 'task_planning',
                        'consultation', 'learning', 'life_assistance']

        if intent not in valid_intents:
            # 基于关键词的智能判断
            user_lower = user_input.lower().strip()

            # 闲聊类关键词
            if any(word in user_lower for word in ['你好', 'hi', 'hello', '谢谢', '再见', '早上好', '晚上好']):
                intent = 'casual_chat'
            # 简单问答类关键词
            elif len(user_input) < 20 and ('?' in user_input or '？' in user_input):
                intent = 'question_answer'
            # 学习类关键词
            elif any(word in user_lower for word in ['学习', '学会', '教我', '怎么学']):
                intent = 'learning'
            # 规划类关键词
            elif any(word in user_lower for word in ['计划', '规划', '步骤', '怎么做', '制作', '创建', '设计']):
                intent = 'task_planning'
            # 咨询类关键词
            elif any(word in user_lower for word in ['建议', '意见', '推荐', '觉得', '应该']):
                intent = 'consultation'
            # 默认根据长度判断
            elif len(user_input.strip()) < 10:
                intent = 'casual_chat'  # 短输入通常是聊天
            else:
                intent = 'task_planning'  # 长输入通常是任务

        return {'primary_intent': intent}

    except Exception as e:
        logger.warning(f"快速意图分析失败: {e}")
        return {'primary_intent': 'task_planning'}


def _should_use_quick_response(intent: str, user_input: str) -> bool:
    """判断是否应该使用快速响应模式"""
    # 快速响应的意图类型
    quick_intents = ['casual_chat', 'question_answer']

    # 中等响应的意图类型
    medium_intents = ['consultation', 'learning']

    # 基于意图判断
    if intent in quick_intents:
        return True

    # 咨询和学习类如果是简单问题也可以快速响应
    if intent in medium_intents and len(user_input.strip()) < 30:
        return True

    # 基于输入长度判断（很短的输入通常是聊天）
    if len(user_input.strip()) < 15:
        return True

    # 基于关键词判断（明确的聊天关键词）
    quick_keywords = ['你好', 'hi', 'hello', '谢谢', '再见', '是的', '不是', '好的', '没有', '嗯', '哦']
    if any(keyword in user_input.lower() for keyword in quick_keywords):
        return True

    # 简单问句
    if len(user_input) < 25 and ('?' in user_input or '？' in user_input):
        return True

    return False


@router.post("/clarify", response_model=PlanningResponse)
async def handle_clarification(request: ClarificationResponse):
    """
    处理澄清回复
    
    处理用户对澄清问题的回复，生成更完整的执行计划
    """
    logger.info(f"🔄 收到澄清回复: {request.user_response[:50]}...")
    
    try:
        # 获取规划器实例
        planner = get_planner(request.session_id)
        
        # 处理澄清回复
        result = await planner.handle_clarification_response(
            request.user_response, 
            request.previous_context
        )
        
        # 构建响应
        response_data = {
            'status': result.get('status', 'success'),
            'response_type': result.get('response_type', 'unknown'),
            'message': result.get('message', '澄清处理完成'),
            'timestamp': result.get('timestamp', datetime.now().isoformat()),
            'data': {
                'understanding': result.get('understanding', {}),
                'planning': result.get('planning', {}),
                'summary': result.get('summary', {})
            }
        }
        
        # 添加步骤信息
        if result.get('response_type') == 'execution_plan':
            response_data['data']['steps'] = result.get('steps', [])
            response_data['data']['summary'] = result.get('summary', {})
        
        logger.info("✅ 澄清回复处理完成")
        return PlanningResponse(**response_data)
        
    except Exception as e:
        logger.error(f"❌ 澄清回复处理失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"处理澄清回复时发生错误: {str(e)}"
        )


@router.get("/history/{session_id}")
async def get_conversation_history(session_id: str):
    """
    获取对话历史
    
    返回指定会话的对话历史记录
    """
    logger.info(f"📚 获取对话历史: {session_id}")
    
    try:
        if session_id in planner_instances:
            planner = planner_instances[session_id]
            history = planner.get_conversation_history()
            
            return {
                'status': 'success',
                'session_id': session_id,
                'history': history,
                'total_messages': len(history),
                'timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'status': 'not_found',
                'message': f'会话 {session_id} 不存在',
                'history': [],
                'total_messages': 0,
                'timestamp': datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"❌ 获取对话历史失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取对话历史时发生错误: {str(e)}"
        )


@router.delete("/history/{session_id}")
async def clear_conversation_history(session_id: str):
    """
    清空对话历史
    
    清空指定会话的对话历史记录
    """
    logger.info(f"🗑️ 清空对话历史: {session_id}")
    
    try:
        if session_id in planner_instances:
            planner = planner_instances[session_id]
            planner.clear_conversation_history()
            
            return {
                'status': 'success',
                'message': f'会话 {session_id} 的对话历史已清空',
                'timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'status': 'not_found',
                'message': f'会话 {session_id} 不存在',
                'timestamp': datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"❌ 清空对话历史失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"清空对话历史时发生错误: {str(e)}"
        )


@router.get("/memory/{session_id}")
async def get_memory_summary(session_id: str):
    """
    获取记忆系统摘要

    返回指定会话的记忆信息，包括用户偏好、任务模式等
    """
    logger.info(f"🧠 获取记忆摘要: {session_id}")

    try:
        if session_id in planner_instances:
            planner = planner_instances[session_id]
            memory_summary = planner.get_memory_summary()

            return {
                'status': 'success',
                'session_id': session_id,
                'memory_summary': memory_summary,
                'timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'status': 'not_found',
                'message': f'会话 {session_id} 不存在',
                'memory_summary': {},
                'timestamp': datetime.now().isoformat()
            }

    except Exception as e:
        logger.error(f"❌ 获取记忆摘要失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取记忆摘要时发生错误: {str(e)}"
        )


@router.get("/test")
async def test_planning():
    """
    测试接口
    
    用于测试智能规划功能是否正常工作
    """
    test_requests = [
        "我想做个PPT",
        "帮我分析销售数据",
        "制作一个网站"
    ]
    
    results = []
    for test_input in test_requests:
        try:
            planner = create_intelligent_planner()
            result = await planner.process_user_request(test_input)
            results.append({
                'input': test_input,
                'status': 'success',
                'response_type': result.get('response_type', 'unknown')
            })
        except Exception as e:
            results.append({
                'input': test_input,
                'status': 'error',
                'error': str(e)
            })
    
    return {
        'status': 'success',
        'message': '智能规划功能测试完成',
        'test_results': results,
        'timestamp': datetime.now().isoformat()
    }
