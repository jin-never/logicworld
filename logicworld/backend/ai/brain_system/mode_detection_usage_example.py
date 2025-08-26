"""
智能模式检测使用示例
展示如何在实际应用中使用集成的智能模式检测功能
"""

import asyncio
import json
import sys
import os
from typing import Dict, Any

# 添加路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from brain_system.brain_core import IntelligentBrain, BrainRequest

class SmartAssistantDemo:
    """智能助手演示类"""
    
    def __init__(self):
        self.brain = None
        self.conversation_history = []
    
    async def initialize(self):
        """初始化智能助手"""
        print("🚀 初始化智能助手...")
        self.brain = IntelligentBrain()
        await self.brain.initialize()
        print("✅ 智能助手初始化完成")
    
    async def process_user_input(self, user_input: str, user_id: str = "demo_user", user_preferred_mode: str = None) -> Dict[str, Any]:
        """处理用户输入"""
        
        if not self.brain:
            await self.initialize()
        
        print(f"\n👤 用户输入: {user_input}")
        if user_preferred_mode:
            print(f"🎯 用户指定模式: {user_preferred_mode}")
        
        try:
            # 创建请求
            request = BrainRequest(
                input_text=user_input,
                context={
                    "conversation_history": self.conversation_history[-3:],  # 最近3轮对话
                    "user_id": user_id,
                    "timestamp": asyncio.get_event_loop().time()
                },
                user_id=user_id,
                session_id=f"session_{user_id}"
            )
            
            # 处理请求
            response = await self.brain.process(request, user_preferred_mode=user_preferred_mode)
            
            # 提取模式检测信息
            mode_info = self._extract_mode_info(response)
            
            # 构建结果
            result = {
                "response": response.output,
                "confidence": response.confidence,
                "processing_path": response.processing_path,
                "mode_info": mode_info,
                "timestamp": response.timestamp
            }
            
            # 记录对话历史
            self.conversation_history.append({
                "user_input": user_input,
                "assistant_response": response.output,
                "mode_info": mode_info,
                "timestamp": response.timestamp
            })
            
            # 显示结果
            self._display_result(result)
            
            return result
            
        except Exception as e:
            error_result = {
                "error": str(e),
                "response": f"抱歉，处理您的请求时遇到了问题：{str(e)}",
                "confidence": 0.0,
                "mode_info": None
            }
            print(f"❌ 处理失败: {e}")
            return error_result
    
    def _extract_mode_info(self, response) -> Dict[str, Any]:
        """提取模式检测信息"""
        
        mode_info = {
            "detected_mode": None,
            "confidence": None,
            "reasoning": None,
            "detection_id": None
        }
        
        if hasattr(response, 'metadata') and response.metadata:
            for module_result in response.metadata.get('module_results', {}).values():
                if 'processing_mode' in module_result:
                    mode_info.update({
                        "detected_mode": module_result.get('processing_mode'),
                        "confidence": module_result.get('mode_confidence'),
                        "reasoning": module_result.get('mode_reasoning'),
                        "detection_id": module_result.get('detection_id')
                    })
                    break
        
        return mode_info
    
    def _display_result(self, result: Dict[str, Any]):
        """显示处理结果"""
        
        print(f"\n🤖 助手回复: {result['response']}")
        print(f"📊 置信度: {result['confidence']:.2f}")
        print(f"🔄 处理路径: {' → '.join(result['processing_path'])}")
        
        mode_info = result.get('mode_info')
        if mode_info and mode_info.get('detected_mode'):
            print(f"🎯 检测模式: {mode_info['detected_mode']}")
            if mode_info.get('confidence'):
                print(f"🎯 模式置信度: {mode_info['confidence']:.2f}")
            if mode_info.get('reasoning'):
                print(f"🎯 模式推理: {mode_info['reasoning']}")
    
    async def simulate_mode_feedback(self, detection_id: str, user_actual_choice: str, satisfaction: int = None):
        """模拟用户模式反馈"""
        
        if not self.brain or not detection_id:
            print("⚠️ 无法提供反馈：缺少检测ID或大脑实例")
            return False
        
        try:
            success = await self.brain.record_mode_feedback(
                detection_id=detection_id,
                user_choice=user_actual_choice,
                satisfaction=satisfaction,
                comments=f"用户实际选择了{user_actual_choice}模式"
            )
            
            if success:
                print(f"✅ 模式反馈已记录: {user_actual_choice}")
            else:
                print("⚠️ 模式反馈记录失败")
            
            return success
            
        except Exception as e:
            print(f"❌ 模式反馈失败: {e}")
            return False
    
    async def get_statistics(self):
        """获取统计信息"""
        
        if not self.brain:
            return {}
        
        try:
            stats = await self.brain.get_mode_detection_stats()
            print("\n📈 模式检测统计:")
            print(json.dumps(stats, indent=2, ensure_ascii=False))
            return stats
        except Exception as e:
            print(f"❌ 获取统计失败: {e}")
            return {}

async def main():
    """主演示函数"""
    
    print("🎭 智能模式检测演示")
    print("=" * 50)
    
    # 创建智能助手
    assistant = SmartAssistantDemo()
    await assistant.initialize()
    
    # 演示场景
    demo_scenarios = [
        {
            "input": "帮我整理一下今天的工作清单",
            "description": "日常工作整理",
            "expected_mode": "daily"
        },
        {
            "input": "制定公司的数字化转型战略规划",
            "description": "企业战略规划",
            "expected_mode": "professional"
        },
        {
            "input": "快速写个内部会议纪要",
            "description": "快速文档任务",
            "expected_mode": "daily"
        },
        {
            "input": "分析竞争对手的市场策略并提出应对方案",
            "description": "市场分析任务",
            "expected_mode": "professional"
        }
    ]
    
    print("\n🎬 场景演示 - 自动模式检测")
    print("-" * 40)
    
    detection_ids = []
    
    for i, scenario in enumerate(demo_scenarios, 1):
        print(f"\n📋 场景 {i}: {scenario['description']}")
        
        result = await assistant.process_user_input(scenario['input'])
        
        # 收集检测ID用于后续反馈演示
        if result.get('mode_info') and result['mode_info'].get('detection_id'):
            detection_ids.append({
                'detection_id': result['mode_info']['detection_id'],
                'detected_mode': result['mode_info']['detected_mode'],
                'expected_mode': scenario['expected_mode']
            })
        
        print("=" * 40)
    
    # 演示用户指定模式
    print("\n🎯 场景演示 - 用户指定模式")
    print("-" * 40)
    
    test_input = "帮我写一份项目报告"
    
    print("\n📝 同一任务，不同模式对比:")
    print(f"任务: {test_input}")
    
    # 日常模式
    print("\n🏠 日常模式处理:")
    await assistant.process_user_input(test_input, user_preferred_mode="daily")
    
    # 专业模式
    print("\n🏢 专业模式处理:")
    await assistant.process_user_input(test_input, user_preferred_mode="professional")
    
    # 演示反馈机制
    print("\n📝 反馈机制演示")
    print("-" * 40)
    
    for item in detection_ids[:2]:  # 演示前两个反馈
        detection_id = item['detection_id']
        detected_mode = item['detected_mode']
        expected_mode = item['expected_mode']
        
        print(f"\n反馈检测ID: {detection_id}")
        print(f"系统检测: {detected_mode}")
        print(f"期望模式: {expected_mode}")
        
        # 模拟用户反馈
        if detected_mode == expected_mode:
            # 正确检测，给予正面反馈
            await assistant.simulate_mode_feedback(detection_id, expected_mode, satisfaction=5)
        else:
            # 错误检测，给予纠正反馈
            await assistant.simulate_mode_feedback(detection_id, expected_mode, satisfaction=2)
    
    # 显示统计信息
    print("\n📊 最终统计")
    print("-" * 40)
    await assistant.get_statistics()
    
    print("\n🎉 演示完成！")
    print("\n💡 使用建议:")
    print("1. 系统会自动检测最适合的处理模式")
    print("2. 用户可以手动指定处理模式")
    print("3. 通过反馈机制持续改进检测准确性")
    print("4. 定期查看统计信息了解系统表现")

if __name__ == "__main__":
    asyncio.run(main())
