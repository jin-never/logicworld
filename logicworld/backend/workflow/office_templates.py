"""
Office应用场景模板系统 - 提供专业的Office工作流模板
"""
from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class OfficeScenarioTemplate:
    """Office场景模板"""
    name: str
    description: str
    app_type: str  # "word", "excel", "ppt"
    scenario_type: str  # "business", "education", "research", "marketing"
    input_requirements: List[str]
    output_features: List[str]
    prompt_template: str
    usage_hints: List[str]

class OfficeTemplateManager:
    """Office模板管理器"""
    
    def __init__(self):
        self.templates = self._initialize_templates()
    
    def _initialize_templates(self) -> Dict[str, Dict[str, OfficeScenarioTemplate]]:
        """初始化所有Office模板"""
        return {
            "word": self._get_word_templates(),
            "excel": self._get_excel_templates(),
            "ppt": self._get_ppt_templates()
        }
    
    def _get_word_templates(self) -> Dict[str, OfficeScenarioTemplate]:
        """Word文档模板"""
        return {
            "business_report": OfficeScenarioTemplate(
                name="商业分析报告",
                description="基于数据分析生成专业的商业报告",
                app_type="word",
                scenario_type="business",
                input_requirements=["数据分析结果", "图表数据", "关键指标"],
                output_features=["执行摘要", "详细分析", "图表插入", "结论建议"],
                prompt_template="""
{original_task}

{office_context}

📊 商业报告生成建议：
{context_analysis}

请创建一份专业的商业分析报告，包含以下结构：
• 执行摘要：提炼核心发现和建议
• 数据分析：详细解读{data_insights}
• 图表展示：插入相关数据图表
• 结论建议：基于分析提出可行建议
• 附录：补充数据和说明

确保报告逻辑清晰，数据准确，建议具体可行。
""",
                usage_hints=["基于Excel数据", "包含图表", "专业格式", "管理层汇报"]
            ),
            
            "research_paper": OfficeScenarioTemplate(
                name="研究论文报告",
                description="学术或研究性文档生成",
                app_type="word",
                scenario_type="research",
                input_requirements=["研究数据", "分析结果", "参考资料"],
                output_features=["摘要", "文献综述", "研究方法", "结果分析"],
                prompt_template="""
{original_task}

{office_context}

📚 研究报告生成建议：
{context_analysis}

请创建一份学术级别的研究报告，结构如下：
• 摘要：研究目标、方法、主要发现
• 引言：背景介绍和研究意义
• 研究方法：数据来源和分析方法
• 结果与分析：基于{data_insights}的深度分析
• 讨论：结果的意义和局限性
• 结论：主要贡献和未来研究方向

确保学术严谨性，引用规范，逻辑清晰。
""",
                usage_hints=["学术格式", "引用规范", "数据支撑", "深度分析"]
            ),
            
            "project_proposal": OfficeScenarioTemplate(
                name="项目提案书",
                description="项目策划和提案文档",
                app_type="word",
                scenario_type="business",
                input_requirements=["项目背景", "预算数据", "时间规划"],
                output_features=["项目概述", "实施计划", "预算明细", "风险评估"],
                prompt_template="""
{original_task}

{office_context}

💼 项目提案生成建议：
{context_analysis}

请创建一份完整的项目提案书：
• 项目概述：目标、范围、价值
• 需求分析：基于{data_insights}的需求论证
• 实施方案：详细的执行计划
• 资源配置：人员、预算、时间安排
• 风险管理：潜在风险和应对措施
• 预期成果：具体的交付物和效益

确保提案具有说服力，计划可执行。
""",
                usage_hints=["说服力强", "计划详细", "风险可控", "效益明确"]
            )
        }
    
    def _get_excel_templates(self) -> Dict[str, OfficeScenarioTemplate]:
        """Excel表格模板"""
        return {
            "data_analysis": OfficeScenarioTemplate(
                name="数据分析表",
                description="专业的数据分析和可视化",
                app_type="excel",
                scenario_type="business",
                input_requirements=["原始数据", "分析需求", "指标定义"],
                output_features=["数据清洗", "统计分析", "图表生成", "趋势预测"],
                prompt_template="""
{original_task}

{office_context}

📈 数据分析建议：
{context_analysis}

请创建专业的Excel数据分析工作簿：
• 数据工作表：清洗和整理{data_sources}
• 分析工作表：计算关键指标和统计值
• 图表工作表：创建多种可视化图表
• 透视表：动态数据分析和汇总
• 仪表板：核心指标的可视化展示

确保数据准确，图表美观，分析深入。
""",
                usage_hints=["数据准确", "图表美观", "透视表", "动态分析"]
            ),
            
            "financial_model": OfficeScenarioTemplate(
                name="财务分析模型",
                description="财务数据分析和预测模型",
                app_type="excel",
                scenario_type="business",
                input_requirements=["财务数据", "历史记录", "预测参数"],
                output_features=["财务比率", "趋势分析", "预测模型", "敏感性分析"],
                prompt_template="""
{original_task}

{office_context}

💰 财务模型建议：
{context_analysis}

请创建综合的财务分析模型：
• 数据导入：整理{data_sources}的财务数据
• 比率分析：计算盈利能力、偿债能力等关键比率
• 趋势分析：历史数据的时间序列分析
• 预测模型：基于历史数据的未来预测
• 情景分析：不同假设条件下的结果对比
• 图表展示：财务指标的可视化展示

确保计算准确，模型合理，预测可信。
""",
                usage_hints=["计算准确", "模型合理", "预测可信", "风险评估"]
            ),
            
            "project_tracking": OfficeScenarioTemplate(
                name="项目跟踪表",
                description="项目进度和资源管理",
                app_type="excel",
                scenario_type="business",
                input_requirements=["项目计划", "任务清单", "资源配置"],
                output_features=["进度跟踪", "资源分配", "风险监控", "状态报告"],
                prompt_template="""
{original_task}

{office_context}

📋 项目跟踪建议：
{context_analysis}

请创建完整的项目管理工作簿：
• 项目概览：基于{data_sources}的项目基本信息
• 任务清单：详细的WBS结构和任务分解
• 进度跟踪：甘特图和里程碑管理
• 资源分配：人员、预算、设备的分配表
• 风险登记：风险识别、评估和应对措施
• 状态报告：自动生成的项目状态仪表板

确保跟踪准确，更新及时，预警有效。
""",
                usage_hints=["进度可视", "资源优化", "风险预警", "状态实时"]
            )
        }
    
    def _get_ppt_templates(self) -> Dict[str, OfficeScenarioTemplate]:
        """PowerPoint演示模板"""
        return {
            "executive_presentation": OfficeScenarioTemplate(
                name="管理层汇报",
                description="面向高层管理的专业汇报",
                app_type="ppt",
                scenario_type="business",
                input_requirements=["分析报告", "关键数据", "战略建议"],
                output_features=["执行摘要", "关键图表", "行动计划", "Q&A准备"],
                prompt_template="""
{original_task}

{office_context}

🎯 管理层汇报建议：
{context_analysis}

请创建高水准的管理层汇报PPT：
• 标题页：项目名称、汇报人、日期
• 执行摘要：基于{data_insights}的核心发现
• 关键数据：重要指标的可视化展示
• 趋势分析：数据趋势和对比分析
• 行动建议：具体的实施方案和时间表
• 风险与机遇：潜在挑战和发展机会
• Q&A准备：预期问题和回答要点

确保内容精炼，视觉冲击力强，逻辑清晰。
""",
                usage_hints=["内容精炼", "视觉冲击", "逻辑清晰", "决策导向"]
            ),
            
            "training_material": OfficeScenarioTemplate(
                name="培训课件",
                description="教育培训用的演示材料",
                app_type="ppt",
                scenario_type="education",
                input_requirements=["教学内容", "案例材料", "练习题目"],
                output_features=["课程大纲", "知识点讲解", "案例分析", "练习互动"],
                prompt_template="""
{original_task}

{office_context}

🎓 培训课件建议：
{context_analysis}

请创建专业的培训演示文稿：
• 课程介绍：学习目标和内容概览
• 知识框架：基于{data_insights}的系统性知识结构
• 重点讲解：核心概念的详细说明
• 案例分析：实际应用的具体案例
• 互动环节：讨论问题和练习活动
• 总结回顾：要点梳理和知识巩固
• 延伸学习：进一步学习的资源推荐

确保内容系统，讲解清晰，互动性强。
""",
                usage_hints=["内容系统", "讲解清晰", "互动性强", "实用性高"]
            ),
            
            "product_pitch": OfficeScenarioTemplate(
                name="产品推介",
                description="产品或服务的市场推广演示",
                app_type="ppt",
                scenario_type="marketing",
                input_requirements=["产品信息", "市场数据", "竞品分析"],
                output_features=["产品亮点", "市场机会", "竞争优势", "商业模式"],
                prompt_template="""
{original_task}

{office_context}

🚀 产品推介建议：
{context_analysis}

请创建吸引人的产品推介PPT：
• 开场引入：市场痛点和机遇
• 产品介绍：基于{data_insights}的产品核心价值
• 功能演示：关键特性的可视化展示
• 市场定位：目标客户和市场规模
• 竞争优势：与竞品的差异化对比
• 商业模式：盈利模式和发展规划
• 行动呼吁：明确的下一步行动

确保卖点突出，说服力强，行动导向。
""",
                usage_hints=["卖点突出", "说服力强", "行动导向", "客户价值"]
            )
        }
    
    def get_template(self, app_type: str, scenario: str = None) -> OfficeScenarioTemplate:
        """获取指定的模板"""
        if app_type not in self.templates:
            return None
        
        app_templates = self.templates[app_type]
        
        if scenario and scenario in app_templates:
            return app_templates[scenario]
        
        # 如果没有指定场景，返回默认模板
        default_scenarios = {
            "word": "business_report",
            "excel": "data_analysis", 
            "ppt": "executive_presentation"
        }
        
        default_scenario = default_scenarios.get(app_type)
        return app_templates.get(default_scenario)
    
    def detect_scenario(self, task: str, app_type: str) -> str:
        """根据任务描述检测最适合的场景"""
        task_lower = task.lower()
        
        # 场景检测规则
        scenario_keywords = {
            # Word场景
            "business_report": ["商业", "分析报告", "业务报告", "管理报告", "business", "analysis"],
            "research_paper": ["研究", "论文", "学术", "调研", "research", "paper", "study"],
            "project_proposal": ["项目", "提案", "方案", "计划书", "proposal", "project"],
            
            # Excel场景  
            "data_analysis": ["数据分析", "统计", "分析", "data", "analysis", "statistics"],
            "financial_model": ["财务", "金融", "预算", "financial", "budget", "finance"],
            "project_tracking": ["项目跟踪", "进度", "管理", "tracking", "progress", "management"],
            
            # PPT场景
            "executive_presentation": ["管理层", "汇报", "高管", "executive", "management", "presentation"],
            "training_material": ["培训", "教学", "课件", "training", "education", "course"],
            "product_pitch": ["产品", "推介", "营销", "product", "pitch", "marketing"]
        }
        
        best_match = None
        max_score = 0
        
        for scenario, keywords in scenario_keywords.items():
            # 检查场景是否适用于当前应用类型
            template = self.get_template(app_type, scenario)
            if not template:
                continue
            
            score = sum(1 for keyword in keywords if keyword in task_lower)
            if score > max_score:
                max_score = score
                best_match = scenario
        
        # 如果没有匹配到，返回默认场景
        if not best_match:
            defaults = {"word": "business_report", "excel": "data_analysis", "ppt": "executive_presentation"}
            best_match = defaults.get(app_type, "business_report")
        
        return best_match
    
    def get_scenario_suggestions(self, app_type: str) -> List[str]:
        """获取应用类型的所有可用场景"""
        if app_type not in self.templates:
            return []
        return list(self.templates[app_type].keys()) 