# 智能模式检测器

一个基于多维度分析和AI辅助判断的智能模式检测系统，能够自动识别用户需求并推荐最适合的处理模式（日常模式 vs 专业模式）。

## 🎯 核心功能

- **多维度分析**: 关键词、语言模式、上下文、任务复杂度全方位分析
- **AI辅助判断**: 结合规则分析和AI智能判断
- **决策融合**: 多个分析结果的智能融合
- **学习优化**: 从用户反馈中持续学习和优化
- **性能监控**: 完整的性能统计和错误分析

## 📁 项目结构

```
mode_detection/
├── __init__.py              # 模块初始化
├── config.py                # 配置文件
├── detector.py              # 主检测器
├── preprocessor.py          # 输入预处理器
├── analyzers/               # 分析器模块
│   ├── __init__.py
│   ├── keyword_analyzer.py  # 关键词分析器
│   ├── pattern_analyzer.py  # 语言模式分析器
│   ├── context_analyzer.py  # 上下文分析器
│   └── complexity_analyzer.py # 复杂度分析器
├── ai_judge.py             # AI辅助判断器
├── fusion_engine.py        # 决策融合引擎
├── learning_system.py      # 学习反馈系统
├── database.py             # 数据库操作
├── integration.py          # 集成接口
├── example_usage.py        # 使用示例
└── README.md               # 说明文档
```

## 🚀 快速开始

### 1. 基本使用

```python
import asyncio
from mode_detection import IntelligentModeDetector

async def main():
    # 初始化检测器
    detector = IntelligentModeDetector(llm_client=your_llm_client)
    
    # 检测模式
    result = await detector.detect_mode("帮我把这个Excel表格整理成Word报告")
    
    print(f"推荐模式: {result['recommended_mode']}")
    print(f"置信度: {result['confidence']:.2f}")
    print(f"推理过程: {result['reasoning']}")

asyncio.run(main())
```

### 2. 集成到现有系统

```python
from mode_detection.integration import detect_processing_mode

async def process_user_request(user_input: str):
    # 自动检测处理模式
    mode_result = await detect_processing_mode(user_input)
    
    if mode_result["success"]:
        mode = mode_result["mode"]
        confidence = mode_result["confidence"]
        
        # 根据检测结果调整处理策略
        if mode == "professional":
            return await process_with_professional_mode(user_input)
        else:
            return await process_with_daily_mode(user_input)
```

### 3. 批量检测

```python
# 批量检测多个输入
inputs = [
    "帮我写个邮件",
    "制定公司营销策略", 
    "整理客户资料"
]

results = await detector.batch_detect_mode(inputs)
for input_text, result in zip(inputs, results):
    print(f"{input_text} → {result['recommended_mode']}")
```

## 🔧 配置说明

### 融合权重配置

```python
# 在 config.py 中调整各分析器的权重
FUSION_WEIGHTS = {
    "keyword_analysis": 0.25,      # 关键词分析权重
    "pattern_analysis": 0.25,      # 语言模式分析权重
    "complexity_analysis": 0.20,   # 复杂度分析权重
    "context_analysis": 0.15,      # 上下文分析权重
    "ai_judgment": 0.15            # AI判断权重
}
```

### 关键词库配置

```python
# 添加新的关键词
detector.analyzer.keyword_analyzer.add_keyword(
    mode="daily", 
    category="action_words", 
    keyword="快速处理", 
    weight=0.8
)

# 更新关键词权重
detector.analyzer.keyword_analyzer.update_keyword_weight(
    mode="professional",
    category="formal_words",
    keyword="制定",
    new_weight=0.9
)
```

## 📊 性能监控

### 获取检测统计

```python
# 获取性能统计
stats = await detector.get_performance_stats()

print("检测统计:", stats["detection_stats"])
print("准确率:", stats["accuracy_stats"]["accuracy"])
print("样本数量:", stats["accuracy_stats"]["sample_size"])
```

### 记录用户反馈

```python
# 记录用户反馈用于学习优化
user_feedback = {
    "actual_mode": "professional",
    "satisfaction": 4,  # 1-5分
    "comments": "应该使用更专业的处理方式"
}

await detector.record_user_feedback(detection_result, user_feedback)
```

## 🎯 模式说明

### 日常模式 (Daily Mode)
- **特点**: 够用就行，快速高效
- **适用场景**: 
  - 内部使用、团队协作
  - 简单任务、临时需求
  - 快速解决问题
- **示例**: 
  - "帮我写个会议纪要"
  - "把这个数据整理一下"
  - "快速做个表格"

### 专业模式 (Professional Mode)
- **特点**: 企业标准，系统完整
- **适用场景**:
  - 对外正式、重要决策
  - 企业级应用、长期使用
  - 需要权威性和规范性
- **示例**:
  - "制定公司数据管理规范"
  - "分析市场竞争格局"
  - "给客户的正式提案"

## 🔍 检测原理

### 多维度分析

1. **关键词分析**: 基于预定义关键词库的权重匹配
2. **语言模式分析**: 使用正则表达式匹配语言特征
3. **上下文分析**: 分析任务的受众、重要性、范围等
4. **复杂度分析**: 评估任务的复杂程度和专业要求

### AI辅助判断

- 使用大语言模型进行综合分析
- 结合规则分析结果进行智能判断
- 提供可解释的推理过程

### 决策融合

- 加权融合多个分析结果
- 考虑各分析器的置信度和质量
- 计算一致性指标

## 📈 学习优化

### 自动学习机制

- 从用户反馈中学习
- 分析错误原因并调整
- 优化权重配置

### 性能提升

- 持续监控检测准确率
- 识别常见错误模式
- 自动调整分析策略

## 🛠️ 高级功能

### 自定义分析器

```python
# 添加自定义语言模式
detector.analyzer.pattern_analyzer.add_pattern(
    mode="daily",
    pattern=r"临时.*"
)

# 更新上下文权重
detector.analyzer.context_analyzer.update_context_weights(
    factor="urgency",
    value="very_high", 
    daily_weight=0.9,
    professional_weight=0.1
)
```

### 动态配置更新

```python
# 更新融合权重
new_weights = {
    "keyword_analysis": 0.3,
    "pattern_analysis": 0.3,
    "complexity_analysis": 0.2,
    "context_analysis": 0.1,
    "ai_judgment": 0.1
}

detector.update_fusion_weights(new_weights)
```

## 🔧 依赖要求

```bash
pip install aiosqlite asyncio
```

## 📝 使用建议

1. **初始化**: 确保LLM客户端正确配置
2. **测试**: 使用example_usage.py测试基本功能
3. **调优**: 根据实际使用情况调整权重配置
4. **监控**: 定期检查性能统计和用户反馈
5. **学习**: 收集用户反馈以持续改进

## 🎯 预期性能

- **初期准确率**: 70-80%
- **优化后准确率**: 85-90%
- **持续学习后**: 90%+
- **平均响应时间**: < 1秒
- **并发处理能力**: 支持批量检测

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这个智能模式检测器！

## 📄 许可证

MIT License
