"""
智能模式检测器使用示例
"""

import asyncio
import json
from detector import IntelligentModeDetector

class MockLLMClient:
    """模拟LLM客户端"""
    
    async def generate(self, prompt: str) -> str:
        """模拟AI生成响应"""
        
        # 简单的模拟逻辑
        if "快速" in prompt or "简单" in prompt or "帮我" in prompt:
            return json.dumps({
                "recommended_mode": "daily",
                "confidence": 0.8,
                "reasoning": "检测到快速任务需求，推荐使用日常模式",
                "key_factors": ["快速需求", "简单任务"],
                "alternative_mode": "professional",
                "risk_assessment": "低风险选择"
            })
        elif "制定" in prompt or "建立" in prompt or "分析" in prompt:
            return json.dumps({
                "recommended_mode": "professional",
                "confidence": 0.85,
                "reasoning": "检测到系统性任务需求，推荐使用专业模式",
                "key_factors": ["系统性任务", "专业需求"],
                "alternative_mode": "daily",
                "risk_assessment": "标准专业任务"
            })
        else:
            return json.dumps({
                "recommended_mode": "daily",
                "confidence": 0.6,
                "reasoning": "默认推荐日常模式",
                "key_factors": ["默认选择"],
                "alternative_mode": "professional",
                "risk_assessment": "中等风险"
            })

async def main():
    """主函数示例"""
    
    # 初始化检测器
    mock_llm = MockLLMClient()
    detector = IntelligentModeDetector(llm_client=mock_llm)
    
    # 测试用例
    test_cases = [
        {
            "input": "帮我把这个Excel表格整理成Word报告",
            "expected": "daily",
            "description": "典型的日常办公任务"
        },
        {
            "input": "制定公司的数据管理规范和标准流程",
            "expected": "professional", 
            "description": "企业级规范制定任务"
        },
        {
            "input": "快速写个会议纪要",
            "expected": "daily",
            "description": "快速简单任务"
        },
        {
            "input": "深入分析市场竞争格局，制定战略应对方案",
            "expected": "professional",
            "description": "战略分析任务"
        },
        {
            "input": "给客户写一份正式的项目提案",
            "expected": "professional",
            "description": "对外正式文档"
        },
        {
            "input": "整理一下今天的工作清单",
            "expected": "daily",
            "description": "个人工作整理"
        }
    ]
    
    print("🧠 智能模式检测器测试")
    print("=" * 50)
    
    correct_predictions = 0
    total_predictions = len(test_cases)
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n📝 测试案例 {i}: {case['description']}")
        print(f"输入: {case['input']}")
        print(f"期望模式: {case['expected']}")
        
        # 执行检测
        result = await detector.detect_mode(case['input'])
        
        predicted_mode = result['recommended_mode']
        confidence = result['confidence']
        reasoning = result['reasoning']
        
        print(f"检测结果: {predicted_mode}")
        print(f"置信度: {confidence:.2f}")
        print(f"推理过程: {reasoning}")
        
        # 检查准确性
        is_correct = predicted_mode == case['expected']
        if is_correct:
            correct_predictions += 1
            print("✅ 预测正确")
        else:
            print("❌ 预测错误")
        
        # 显示详细分析（可选）
        if result.get('detailed_analysis'):
            print("\n📊 详细分析:")
            detailed = result['detailed_analysis']
            
            # 关键词分析
            keyword_analysis = detailed.get('keyword_analysis', {})
            print(f"  关键词分析: {keyword_analysis.get('dominant_mode', 'N/A')} (置信度: {keyword_analysis.get('confidence', 0):.2f})")
            
            # 语言模式分析
            pattern_analysis = detailed.get('pattern_analysis', {})
            print(f"  语言模式: {pattern_analysis.get('dominant_mode', 'N/A')} (置信度: {pattern_analysis.get('confidence', 0):.2f})")
            
            # 复杂度分析
            complexity_analysis = detailed.get('complexity_analysis', {})
            print(f"  复杂度: {complexity_analysis.get('primary_complexity', 'N/A')} → {complexity_analysis.get('suggested_mode', 'N/A')}")
            
            # 融合结果
            fusion_result = detailed.get('fusion_result', {})
            print(f"  融合置信度: {fusion_result.get('confidence', 0):.2f}")
            print(f"  一致性: {fusion_result.get('consensus_rate', 0):.2f}")
        
        print("-" * 40)
    
    # 总结
    accuracy = correct_predictions / total_predictions
    print(f"\n📈 测试总结:")
    print(f"总测试案例: {total_predictions}")
    print(f"正确预测: {correct_predictions}")
    print(f"准确率: {accuracy:.1%}")
    
    if accuracy >= 0.8:
        print("🎉 检测器表现优秀！")
    elif accuracy >= 0.6:
        print("👍 检测器表现良好")
    else:
        print("⚠️ 检测器需要改进")

async def test_batch_detection():
    """测试批量检测"""
    
    print("\n🔄 批量检测测试")
    print("=" * 30)
    
    mock_llm = MockLLMClient()
    detector = IntelligentModeDetector(llm_client=mock_llm)
    
    batch_inputs = [
        "帮我写个邮件",
        "制定营销策略",
        "整理客户资料",
        "分析财务数据",
        "快速做个表格"
    ]
    
    results = await detector.batch_detect_mode(batch_inputs)
    
    for i, (input_text, result) in enumerate(zip(batch_inputs, results), 1):
        print(f"{i}. {input_text}")
        print(f"   → {result.get('recommended_mode', 'error')} (置信度: {result.get('confidence', 0):.2f})")

async def test_feedback_learning():
    """测试反馈学习"""
    
    print("\n📚 反馈学习测试")
    print("=" * 30)
    
    mock_llm = MockLLMClient()
    detector = IntelligentModeDetector(llm_client=mock_llm)
    
    # 模拟一个检测结果
    test_input = "帮我制定项目计划"
    result = await detector.detect_mode(test_input)
    
    print(f"原始检测: {result['recommended_mode']} (置信度: {result['confidence']:.2f})")
    
    # 模拟用户反馈（假设用户认为应该是专业模式）
    user_feedback = {
        "actual_mode": "professional",
        "satisfaction": 3,  # 1-5分
        "comments": "这个任务需要更专业的处理方式"
    }
    
    # 记录反馈
    success = await detector.record_user_feedback(result, user_feedback)
    print(f"反馈记录: {'成功' if success else '失败'}")
    
    # 获取性能统计
    stats = await detector.get_performance_stats()
    print(f"检测统计: {stats}")

async def test_performance_monitoring():
    """测试性能监控"""
    
    print("\n📊 性能监控测试")
    print("=" * 30)
    
    mock_llm = MockLLMClient()
    detector = IntelligentModeDetector(llm_client=mock_llm)
    
    # 获取分析器信息
    analyzer_info = detector.get_analyzer_info()
    print("分析器信息:")
    for analyzer, info in analyzer_info.items():
        print(f"  {analyzer}: {info}")
    
    # 获取性能统计
    stats = await detector.get_performance_stats()
    print(f"\n性能统计:")
    print(f"  检测统计: {stats.get('detection_stats', {})}")
    print(f"  准确率统计: {stats.get('accuracy_stats', {})}")
    print(f"  融合权重: {stats.get('fusion_weights', {})}")

if __name__ == "__main__":
    # 运行所有测试
    asyncio.run(main())
    asyncio.run(test_batch_detection())
    asyncio.run(test_feedback_learning())
    asyncio.run(test_performance_monitoring())
