"""
模式检测器配置文件
"""

from typing import Dict, Any
import os

class ModeDetectionConfig:
    """模式检测器配置"""

    # 四级模式选择配置
    SUPPORTED_MODES = {
        "auto": {
            "name": "自动模式",
            "description": "系统默认模式，智能选择日常或专业模式",
            "is_meta_mode": True,  # 元模式，会选择其他具体模式
            "priority": 1,
            "enabled": True
        },
        "daily": {
            "name": "日常模式",
            "description": "够用就行，快速高效，适用于内部协作和简单任务",
            "is_meta_mode": False,
            "priority": 2,
            "enabled": True
        },
        "professional": {
            "name": "专业模式",
            "description": "企业标准，系统完整，适用于对外正式和重要决策",
            "is_meta_mode": False,
            "priority": 3,
            "enabled": True
        },
        "custom": {
            "name": "自定义模式",
            "description": "用户自定义的处理模式，支持个性化配置",
            "is_meta_mode": False,
            "priority": 4,
            "enabled": False  # 暂未实现，预留接口
        }
    }

    # 默认模式（系统启动时的默认选择）
    DEFAULT_MODE = "auto"

    # 自动模式的候选模式（自动模式会在这些模式中选择）
    AUTO_MODE_CANDIDATES = ["daily", "professional"]

    # 融合权重配置
    FUSION_WEIGHTS = {
        "keyword_analysis": 0.25,
        "pattern_analysis": 0.25,
        "complexity_analysis": 0.20,
        "context_analysis": 0.15,
        "ai_judgment": 0.15
    }
    
    # 置信度阈值
    CONFIDENCE_THRESHOLDS = {
        "high_confidence": 0.8,
        "medium_confidence": 0.6,
        "low_confidence": 0.4
    }
    
    # 关键词权重配置
    KEYWORD_WEIGHTS = {
        "daily_mode": {
            "action_words": {
                "帮我": 0.8, "给我": 0.7, "写个": 0.6, "做个": 0.6,
                "整理": 0.7, "录入": 0.8, "填写": 0.7, "调整": 0.6,
                "复制": 0.8, "粘贴": 0.7, "转换": 0.6, "导入": 0.7
            },
            "scope_words": {
                "这个": 0.8, "这份": 0.7, "简单": 0.9, "快速": 0.9,
                "临时": 0.8, "草稿": 0.8, "初版": 0.7, "基础": 0.6
            },
            "urgency_words": {
                "急": 0.9, "快": 0.8, "立即": 0.9, "马上": 0.8,
                "赶紧": 0.8, "尽快": 0.7, "现在": 0.6
            },
            "audience_words": {
                "内部": 0.7, "团队": 0.6, "同事": 0.7, "我们": 0.5,
                "自己": 0.8, "个人": 0.7
            }
        },
        
        "professional_mode": {
            "formal_words": {
                "制定": 0.9, "建立": 0.8, "设计": 0.7, "规范": 0.9,
                "标准": 0.8, "体系": 0.9, "框架": 0.8, "策略": 0.8,
                "政策": 0.9, "制度": 0.8, "流程": 0.7
            },
            "analysis_words": {
                "分析": 0.8, "研究": 0.8, "评估": 0.8, "调研": 0.7,
                "论证": 0.9, "审核": 0.7, "审查": 0.7, "考察": 0.6,
                "探讨": 0.6, "深入": 0.8
            },
            "scope_words": {
                "企业": 0.9, "公司": 0.7, "组织": 0.8, "全面": 0.8,
                "系统": 0.8, "完整": 0.7, "深入": 0.8, "综合": 0.7,
                "整体": 0.7, "全局": 0.8
            },
            "audience_words": {
                "客户": 0.8, "合作伙伴": 0.9, "领导": 0.7, "董事会": 0.9,
                "对外": 0.8, "公开": 0.7, "正式": 0.8, "官方": 0.9,
                "外部": 0.8
            }
        }
    }
    
    # 语言模式配置
    LANGUAGE_PATTERNS = {
        "daily_patterns": [
            r"帮我.*",           # 请求帮助模式
            r"怎么.*",           # 询问方法模式  
            r".*怎么做",         # 操作询问模式
            r"给我.*",           # 直接请求模式
            r"把.*整理成.*",     # 转换任务模式
            r".*格式.*",         # 格式相关模式
            r"简单.*",           # 简化需求模式
            r"快速.*",           # 快速需求模式
            r".*录入.*",         # 录入任务模式
            r".*填写.*",         # 填写任务模式
            r".*调整.*",         # 调整任务模式
            r".*复制.*"          # 复制任务模式
        ],
        
        "professional_patterns": [
            r"制定.*规范",       # 制定规范模式
            r"建立.*体系",       # 建立体系模式
            r"设计.*流程",       # 设计流程模式
            r"分析.*影响",       # 影响分析模式
            r"评估.*风险",       # 风险评估模式
            r".*战略.*",         # 战略相关模式
            r"深入.*研究",       # 深度研究模式
            r"系统.*分析",       # 系统分析模式
            r"全面.*评估",       # 全面评估模式
            r"综合.*考虑",       # 综合考虑模式
            r".*标准化.*",       # 标准化模式
            r".*规范化.*"        # 规范化模式
        ]
    }
    
    # 复杂度指标配置
    COMPLEXITY_INDICATORS = {
        "simple": {
            "length_range": (1, 50),
            "keywords": ["简单", "快速", "直接", "基础", "容易"],
            "task_types": ["录入", "复制", "调整", "填写", "查看"]
        },
        "medium": {
            "length_range": (50, 150),
            "keywords": ["整理", "汇总", "分类", "统计", "总结"],
            "task_types": ["报告", "总结", "计划", "方案", "清单"]
        },
        "complex": {
            "length_range": (150, 500),
            "keywords": ["分析", "评估", "设计", "制定", "优化"],
            "task_types": ["战略", "体系", "框架", "规范", "政策"]
        },
        "expert": {
            "length_range": (500, float('inf')),
            "keywords": ["深入", "系统", "全面", "专业", "权威"],
            "task_types": ["研究", "论证", "架构", "变革", "创新"]
        }
    }
    
    # AI提示词模板
    AI_PROMPT_TEMPLATE = """
    你是智能模式检测专家，需要分析用户需求并推荐最适合的处理模式。

    用户输入：{user_input}

    已有分析结果：
    - 关键词分析：{keyword_result} (置信度: {keyword_confidence:.2f})
    - 语言模式：{pattern_result} (置信度: {pattern_confidence:.2f})
    - 任务复杂度：{complexity_result} → {complexity_mode}
    - 上下文信息：{context_info}

    模式说明：
    - daily（日常模式）：够用就行，快速高效，适合内部使用、简单任务、临时需求
    - professional（专业模式）：企业标准，系统完整，适合对外正式、重要决策、长期使用

    请综合分析并返回JSON格式：
    {{
        "recommended_mode": "daily/professional",
        "confidence": 0.85,
        "reasoning": "详细的判断理由",
        "key_factors": ["影响判断的关键因素"],
        "alternative_mode": "备选模式",
        "risk_assessment": "选择风险评估"
    }}
    """
    
    # 数据库配置
    DATABASE_CONFIG = {
        "feedback_table": "mode_detection_feedback",
        "performance_table": "mode_detection_performance",
        "learning_table": "mode_detection_learning"
    }
    
    # 学习系统配置
    LEARNING_CONFIG = {
        "min_feedback_count": 10,      # 最少反馈数量才开始学习
        "learning_rate": 0.1,          # 学习率
        "weight_adjustment_factor": 0.05,  # 权重调整因子
        "performance_window_days": 30   # 性能统计窗口天数
    }

    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """获取完整配置"""
        return {
            "fusion_weights": cls.FUSION_WEIGHTS,
            "confidence_thresholds": cls.CONFIDENCE_THRESHOLDS,
            "keyword_weights": cls.KEYWORD_WEIGHTS,
            "language_patterns": cls.LANGUAGE_PATTERNS,
            "complexity_indicators": cls.COMPLEXITY_INDICATORS,
            "ai_prompt_template": cls.AI_PROMPT_TEMPLATE,
            "database_config": cls.DATABASE_CONFIG,
            "learning_config": cls.LEARNING_CONFIG
        }
