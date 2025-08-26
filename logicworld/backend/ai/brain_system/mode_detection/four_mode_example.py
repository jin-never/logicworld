"""
四级模式选择系统使用示例
演示自动、日常、专业、自定义四种模式的使用
"""

import asyncio
import json
import sys
import os

# 添加路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from brain_system.brain_core import IntelligentBrain, BrainRequest

class FourModeDemo:
    """四级模式演示类"""
    
    def __init__(self):
        self.brain = None
    
    async def initialize(self):
        """初始化系统"""
        print("🚀 初始化四级模式选择系统...")
        self.brain = IntelligentBrain()
        await self.brain.initialize()
        print("✅ 系统初始化完成")
    
    async def demo_mode_hierarchy(self):
        """演示四级模式层次结构"""
        
        print("\n🎯 四级模式层次结构")
        print("=" * 50)
        
        # 获取支持的模式
        try:
            modes = await self.brain.get_supported_modes()
            
            print("📋 支持的模式列表:")
            for mode_key, mode_config in modes.items():
                if isinstance(mode_config, dict):
                    enabled_status = "✅" if mode_config.get("enabled", False) else "❌"
                    priority = mode_config.get("priority", 0)
                    name = mode_config.get("name", mode_key)
                    description = mode_config.get("description", "")
                    
                    print(f"{priority}. {enabled_status} {name}")
                    print(f"   {description}")
                    print()
        
        except Exception as e:
            print(f"❌ 获取模式信息失败: {e}")
    
    async def demo_auto_mode(self):
        """演示自动模式"""
        
        print("\n🤖 自动模式演示")
        print("=" * 40)
        
        test_cases = [
            {
                "input": "帮我整理今天的工作清单",
                "expected": "daily",
                "description": "简单日常任务"
            },
            {
                "input": "制定公司的数字化转型战略",
                "expected": "professional", 
                "description": "企业战略任务"
            },
            {
                "input": "快速写个内部邮件通知",
                "expected": "daily",
                "description": "内部沟通任务"
            }
        ]
        
        for i, case in enumerate(test_cases, 1):
            print(f"\n📝 测试 {i}: {case['description']}")
            print(f"输入: {case['input']}")
            print(f"期望检测: {case['expected']}")
            
            try:
                # 使用自动模式（系统默认）
                request = BrainRequest(
                    input_text=case['input'],
                    context={},
                    user_id="auto_demo",
                    session_id="auto_session"
                )
                
                # 不指定模式，让系统自动选择
                response = await self.brain.process(request)
                
                # 提取检测结果
                detected_mode = self._extract_mode_from_response(response)
                
                print(f"系统检测: {detected_mode}")
                
                if detected_mode == case['expected']:
                    print("✅ 检测正确")
                else:
                    print("❌ 检测偏差")
                
                print(f"响应: {response.output[:80]}...")
                
            except Exception as e:
                print(f"❌ 处理失败: {e}")
            
            print("-" * 30)
    
    async def demo_manual_modes(self):
        """演示手动指定模式"""
        
        print("\n👤 手动模式选择演示")
        print("=" * 40)
        
        test_input = "帮我写一份项目进度报告"
        
        modes_to_test = ["auto", "daily", "professional"]
        
        for mode in modes_to_test:
            print(f"\n📋 使用 {mode} 模式处理:")
            print(f"输入: {test_input}")
            
            try:
                request = BrainRequest(
                    input_text=test_input,
                    context={},
                    user_id="manual_demo",
                    session_id="manual_session"
                )
                
                # 指定模式
                response = await self.brain.process(request, user_preferred_mode=mode)
                
                detected_mode = self._extract_mode_from_response(response)
                print(f"实际使用模式: {detected_mode}")
                print(f"响应风格: {self._analyze_response_style(response.output)}")
                print(f"响应: {response.output[:100]}...")
                
            except Exception as e:
                print(f"❌ 处理失败: {e}")
            
            print("-" * 30)
    
    async def demo_custom_mode(self):
        """演示自定义模式（预留功能）"""
        
        print("\n🛠️ 自定义模式演示")
        print("=" * 40)
        
        # 检查自定义模式是否启用
        try:
            custom_enabled = await self.brain.is_mode_enabled("custom")
            custom_info = await self.brain.get_mode_info("custom")
            
            print(f"自定义模式状态: {'启用' if custom_enabled else '未启用'}")
            print(f"模式信息: {custom_info}")
            
            if not custom_enabled:
                print("⚠️ 自定义模式暂未实现，这是预留的扩展接口")
                print("💡 未来可以支持:")
                print("   - 用户自定义提示词模板")
                print("   - 行业特定的处理风格")
                print("   - 个性化的输出格式")
                print("   - 企业内部的标准规范")
            else:
                # 如果启用了，尝试使用
                test_input = "使用自定义模式处理这个任务"
                
                request = BrainRequest(
                    input_text=test_input,
                    context={"custom_config": {"style": "企业内部标准"}},
                    user_id="custom_demo",
                    session_id="custom_session"
                )
                
                response = await self.brain.process(request, user_preferred_mode="custom")
                print(f"自定义模式响应: {response.output[:100]}...")
        
        except Exception as e:
            print(f"❌ 自定义模式测试失败: {e}")
    
    async def demo_mode_comparison(self):
        """演示不同模式的对比"""
        
        print("\n🔄 模式对比演示")
        print("=" * 40)
        
        comparison_task = "分析我们公司的市场竞争优势"
        
        print(f"对比任务: {comparison_task}")
        print()
        
        modes = ["daily", "professional"]
        results = {}
        
        for mode in modes:
            print(f"🎭 {mode.upper()} 模式处理:")
            
            try:
                request = BrainRequest(
                    input_text=comparison_task,
                    context={},
                    user_id="comparison_demo",
                    session_id="comparison_session"
                )
                
                response = await self.brain.process(request, user_preferred_mode=mode)
                results[mode] = response.output
                
                print(f"响应长度: {len(response.output)} 字符")
                print(f"响应风格: {self._analyze_response_style(response.output)}")
                print(f"内容预览: {response.output[:120]}...")
                print()
                
            except Exception as e:
                print(f"❌ {mode} 模式处理失败: {e}")
                print()
        
        # 分析差异
        if len(results) == 2:
            daily_len = len(results.get("daily", ""))
            prof_len = len(results.get("professional", ""))
            
            print("📊 对比分析:")
            print(f"日常模式长度: {daily_len} 字符")
            print(f"专业模式长度: {prof_len} 字符")
            print(f"长度差异: {abs(prof_len - daily_len)} 字符")
            
            if prof_len > daily_len:
                print("✅ 专业模式提供了更详细的分析")
            else:
                print("📝 日常模式提供了更简洁的回答")
    
    def _extract_mode_from_response(self, response) -> str:
        """从响应中提取检测到的模式"""
        
        if hasattr(response, 'metadata') and response.metadata:
            for module_result in response.metadata.get('module_results', {}).values():
                if 'processing_mode' in module_result:
                    return module_result.get('processing_mode', 'unknown')
        
        return 'unknown'
    
    def _analyze_response_style(self, text: str) -> str:
        """分析响应风格"""
        
        if not text:
            return "无内容"
        
        # 简单的风格分析
        formal_indicators = ["制定", "建立", "规范", "标准", "体系", "战略", "分析"]
        casual_indicators = ["帮你", "可以", "简单", "快速", "整理", "做个"]
        
        formal_count = sum(1 for word in formal_indicators if word in text)
        casual_count = sum(1 for word in casual_indicators if word in text)
        
        if formal_count > casual_count:
            return "正式专业"
        elif casual_count > formal_count:
            return "轻松友好"
        else:
            return "中性平衡"

async def main():
    """主演示函数"""
    
    print("🎭 四级模式选择系统演示")
    print("=" * 60)
    
    demo = FourModeDemo()
    await demo.initialize()
    
    # 演示模式层次结构
    await demo.demo_mode_hierarchy()
    
    # 演示自动模式
    await demo.demo_auto_mode()
    
    # 演示手动模式选择
    await demo.demo_manual_modes()
    
    # 演示自定义模式
    await demo.demo_custom_mode()
    
    # 演示模式对比
    await demo.demo_mode_comparison()
    
    print("\n🎉 四级模式演示完成！")
    print("\n💡 使用建议:")
    print("1. 🤖 自动模式 - 系统默认，适合大多数场景")
    print("2. 📋 日常模式 - 快速高效，适合内部协作")
    print("3. 🏢 专业模式 - 正式权威，适合对外场合")
    print("4. 🛠️ 自定义模式 - 个性化配置，未来扩展")

if __name__ == "__main__":
    asyncio.run(main())
