"""
增强的智能提示词库
提供高质量的提示词模板和渲染功能，专门用于工作流生成
"""
import re
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class PromptType(Enum):
    """提示词类型"""
    WORKFLOW_ANALYSIS = "workflow_analysis"
    TASK_DECOMPOSITION = "task_decomposition"
    TOOL_SELECTION = "tool_selection"
    OPTIMIZATION = "optimization"
    VALIDATION = "validation"
    ENHANCED_GENERATION = "enhanced_generation"


@dataclass
class PromptTemplate:
    """提示词模板"""
    name: str
    type: PromptType
    template: str
    variables: List[str]
    description: str
    examples: List[Dict[str, str]] = None


class EnhancedPromptLibrary:
    """增强的提示词库"""
    
    def __init__(self):
        self.templates: Dict[str, PromptTemplate] = {}
        self._initialize_enhanced_templates()
    
    def _initialize_enhanced_templates(self):
        """初始化增强的提示词模板"""
        
        # Word MCP 完整功能集成模板
        self.templates['word_mcp_integration'] = PromptTemplate(
            name="Word MCP完整功能集成",
            type=PromptType.TOOL_SELECTION,
            template="""
            你是一个专业的Word文档处理专家，具有完整的Office Word MCP Server功能。

            📋 可用的Word MCP工具 (使用工具名: 'wordmcp' 或 'word'):

            📄 文档管理:
            - create_document: 创建新文档 (filename, title, author)
            - get_document_info: 获取文档信息 (filename)
            - get_document_text: 提取所有文本 (filename)
            - copy_document: 复制文档 (source, destination)
            - merge_documents: 合并文档 (files[], output_filename)
            - convert_to_pdf: 转PDF (filename, output_path)

            ✍️ 内容创作:
            - add_heading: 添加标题 (filename, heading_text, level[1-9])
            - add_paragraph: 添加正文段落 (filename, text, style)
            - add_table: 创建表格 (filename, rows, cols, data)
            - add_picture: 插入图片 (filename, image_path, width, height)
            - add_page_break: 插入分页符 (filename)

            🎨 富文本格式化:
            - format_text: 格式化文本 (filename, paragraph_index, start_pos, end_pos, bold, italic, underline, color, font_size, font_name)
            - create_custom_style: 创建样式 (filename, style_name, bold, italic, font_size, font_name, color, base_style)
            - search_and_replace: 搜索替换 (filename, find_text, replace_text)

            📊 表格格式化:
            - format_table: 表格样式 (filename, table_index, has_header_row, border_style[single/double/thick/dashed/dotted], shading)

            🔍 内容操作:
            - get_paragraph_text_from_document: 获取段落 (filename, paragraph_index)
            - find_text_in_document: 查找文本 (filename, search_text)
            - delete_paragraph: 删除段落 (filename, paragraph_index)

            📝 脚注尾注:
            - add_footnote_to_document: 添加脚注 (filename, paragraph_index, footnote_text)
            - add_endnote_to_document: 添加尾注 (filename, paragraph_index, endnote_text)
            - customize_footnote_style: 自定义脚注样式 (filename, numbering_format, start_number, font_name, font_size)

            🔒 文档保护:
            - protect_document: 密码保护 (filename, password)
            - unprotect_document: 解除保护 (filename, password)

            🎯 重要规则:
            1. 输出JSON格式的工具调用，包含tool, action, parameters
            2. 支持中文字体：华文彩云、微软雅黑、宋体、楷体等
            3. 支持颜色：red/绿色/#FF0000/rgb(255,0,0)
            4. 文件默认保存到: C:/Users/ZhuanZ/Desktop/AI作品/
            5. 可以组合多个工具调用完成复杂任务

            用户需求: {user_request}

            请根据用户需求，生成合适的Word MCP工具调用序列：
            """,
            variables=["user_request"],
            description="Word MCP完整功能集成提示词",
            examples=[
                {
                    "input": "创建一个年度报告，包含标题、表格和格式化文本",
                    "output": "生成create_document, add_heading, add_table, format_text等工具调用"
                }
            ]
        )
        
        # 增强的工作流分析模板
        self.templates['enhanced_workflow_analysis'] = PromptTemplate(
            name="增强工作流分析",
            type=PromptType.WORKFLOW_ANALYSIS,
            template="""
            作为一个资深的工作流架构师，请深度分析以下用户需求：
            
            用户输入: {user_input}
            可用工具: {available_tools}
            用户偏好: {user_preferences}
            
            请进行多维度深度分析：
            
            1. **语义理解与意图挖掘**
               - 显性需求：用户明确表达的需求
               - 隐性需求：用户未明说但可能需要的功能
               - 业务目标：最终要达成的业务价值
               - 成功标准：如何衡量任务完成的质量
            
            2. **技术复杂度与架构分析**
               - 数据流复杂度：数据的输入、处理、输出路径
               - 控制流复杂度：条件分支、循环、异常处理
               - 集成复杂度：需要集成的外部系统和服务
               - 扩展性要求：未来可能的功能扩展需求
            
            3. **资源与性能评估**
               - 计算资源需求：CPU、内存、存储估算
               - 网络资源需求：带宽、延迟要求
               - 时间复杂度：预期的执行时间范围
               - 并发处理能力：是否需要并行执行
            
            请以结构化JSON格式返回详细分析：
            {{
                "semantic_analysis": {{
                    "explicit_requirements": ["明确需求列表"],
                    "implicit_requirements": ["隐含需求列表"],
                    "business_objectives": ["业务目标列表"],
                    "success_criteria": ["成功标准列表"],
                    "domain_context": "领域上下文描述"
                }},
                "technical_complexity": {{
                    "data_flow_complexity": "simple|moderate|complex|advanced",
                    "control_flow_complexity": "simple|moderate|complex|advanced",
                    "integration_complexity": "simple|moderate|complex|advanced",
                    "scalability_requirements": "low|medium|high",
                    "estimated_components": 数字
                }},
                "resource_assessment": {{
                    "compute_requirements": {{
                        "cpu_cores": 数字,
                        "memory_gb": 数字,
                        "storage_gb": 数字
                    }},
                    "time_complexity": {{
                        "estimated_duration_minutes": 数字,
                        "peak_processing_time": 数字
                    }},
                    "concurrency_needs": {{
                        "max_parallel_tasks": 数字,
                        "requires_load_balancing": true/false
                    }}
                }},
                "recommended_approach": {{
                    "architecture_pattern": "推荐的架构模式",
                    "implementation_strategy": "实施策略",
                    "technology_stack": ["推荐技术栈"],
                    "development_phases": ["开发阶段划分"]
                }}
            }}
            """,
            variables=["user_input", "available_tools", "user_preferences"],
            description="深度分析用户输入的工作流需求，提供全面的技术和业务洞察"
        )
        
        # 智能任务分解模板
        self.templates['intelligent_task_decomposition'] = PromptTemplate(
            name="智能任务分解",
            type=PromptType.TASK_DECOMPOSITION,
            template="""
            作为一个任务分解专家，请将以下复杂任务智能分解为可执行的步骤：
            
            任务描述: {task_description}
            可用工具: {available_tools}
            约束条件: {constraints}
            复杂度级别: {complexity_level}
            
            分解策略：
            1. **原子性原则**：每个步骤应该是不可再分的最小执行单元
            2. **依赖性分析**：明确步骤间的前置条件和数据依赖
            3. **并行性识别**：找出可以并行执行的步骤组合
            4. **容错性设计**：为关键步骤设计错误处理和恢复机制
            5. **可观测性**：为每个步骤添加监控和日志记录点
            
            请按以下格式返回智能分解结果：
            {{
                "decomposition_metadata": {{
                    "strategy": "分解策略说明",
                    "total_steps": 数字,
                    "estimated_duration": "总预估时间",
                    "complexity_score": 数字,
                    "parallelization_potential": "high|medium|low"
                }},
                "steps": [
                    {{
                        "id": "step_1",
                        "name": "步骤名称",
                        "description": "详细描述",
                        "category": "data_processing|api_call|computation|validation|notification",
                        "tool_required": "所需工具",
                        "inputs": [
                            {{
                                "name": "输入参数名",
                                "type": "数据类型",
                                "source": "数据来源",
                                "required": true/false
                            }}
                        ],
                        "outputs": [
                            {{
                                "name": "输出结果名",
                                "type": "数据类型",
                                "description": "输出描述"
                            }}
                        ],
                        "dependencies": ["依赖的步骤ID"],
                        "estimated_duration": "预估时间",
                        "resource_requirements": {{
                            "cpu_intensive": true/false,
                            "memory_intensive": true/false,
                            "io_intensive": true/false
                        }},
                        "error_handling": {{
                            "strategy": "retry|skip|fail|fallback",
                            "max_retries": 数字,
                            "timeout_seconds": 数字
                        }},
                        "monitoring": {{
                            "metrics": ["监控指标列表"],
                            "alerts": ["告警条件列表"]
                        }}
                    }}
                ],
                "execution_plan": {{
                    "parallel_groups": [
                        {{
                            "group_id": "group_1",
                            "steps": ["可并行执行的步骤ID列表"],
                            "max_concurrency": 数字
                        }}
                    ],
                    "critical_path": ["关键路径上的步骤ID"],
                    "bottleneck_steps": ["可能成为瓶颈的步骤ID"],
                    "checkpoint_steps": ["检查点步骤ID"]
                }},
                "quality_assurance": {{
                    "validation_points": ["验证检查点"],
                    "rollback_strategy": "回滚策略",
                    "data_integrity_checks": ["数据完整性检查"],
                    "performance_benchmarks": ["性能基准"]
                }}
            }}
            """,
            variables=["task_description", "available_tools", "constraints", "complexity_level"],
            description="智能分解复杂任务为可执行的步骤，包含详细的执行计划和质量保证"
        )
        
        # 高级工具选择模板
        self.templates['advanced_tool_selection'] = PromptTemplate(
            name="高级工具选择",
            type=PromptType.TOOL_SELECTION,
            template="""
            作为一个工具选择专家，请为以下任务选择最优的工具组合：
            
            任务需求: {task_requirements}
            可用工具目录:
            {tool_catalog}
            性能要求: {performance_requirements}
            成本约束: {cost_constraints}
            
            选择标准（按权重排序）：
            1. **功能匹配度** (40%) - 工具功能与任务需求的匹配程度
            2. **性能效率** (25%) - 执行速度、资源消耗、吞吐量
            3. **可靠性** (20%) - 稳定性、错误率、可用性
            4. **成本效益** (10%) - 使用成本、维护成本、扩展成本
            5. **易用性** (5%) - 配置复杂度、学习曲线、文档质量
            
            请提供详细的工具选择分析：
            {{
                "selection_summary": {{
                    "total_tools_evaluated": 数字,
                    "recommended_tools": 数字,
                    "overall_confidence": "high|medium|low",
                    "estimated_total_cost": "成本估算"
                }},
                "tool_recommendations": [
                    {{
                        "task_component": "任务组件描述",
                        "primary_tool": {{
                            "name": "推荐工具名称",
                            "version": "版本信息",
                            "confidence_score": 数字,
                            "selection_reasons": ["选择理由列表"],
                            "configuration": {{
                                "参数名": "参数值"
                            }},
                            "performance_metrics": {{
                                "expected_throughput": "预期吞吐量",
                                "expected_latency": "预期延迟",
                                "resource_usage": "资源使用情况"
                            }}
                        }},
                        "alternative_tools": [
                            {{
                                "name": "备选工具名称",
                                "pros": ["优点列表"],
                                "cons": ["缺点列表"],
                                "use_case": "适用场景"
                            }}
                        ],
                        "integration_considerations": {{
                            "compatibility_issues": ["兼容性问题"],
                            "data_format_requirements": ["数据格式要求"],
                            "api_limitations": ["API限制"]
                        }}
                    }}
                ],
                "tool_chain_optimization": {{
                    "data_flow_optimization": "数据流优化建议",
                    "caching_strategies": ["缓存策略"],
                    "load_balancing": "负载均衡建议",
                    "monitoring_setup": "监控配置建议"
                }},
                "risk_assessment": {{
                    "single_points_of_failure": ["单点故障风险"],
                    "vendor_lock_in_risks": ["供应商锁定风险"],
                    "scalability_limitations": ["扩展性限制"],
                    "mitigation_strategies": ["风险缓解策略"]
                }},
                "implementation_roadmap": {{
                    "phase_1": "第一阶段实施计划",
                    "phase_2": "第二阶段实施计划",
                    "phase_3": "第三阶段实施计划",
                    "success_metrics": ["成功指标"]
                }}
            }}
            """,
            variables=["task_requirements", "tool_catalog", "performance_requirements", "cost_constraints"],
            description="为任务选择最优的工具组合，包含详细的分析和实施建议"
        )
        
        # 工作流优化模板
        self.templates['comprehensive_workflow_optimization'] = PromptTemplate(
            name="全面工作流优化",
            type=PromptType.OPTIMIZATION,
            template="""
            作为一个工作流优化专家，请全面分析并优化以下工作流：
            
            当前工作流: {current_workflow}
            性能指标: {performance_metrics}
            优化目标: {optimization_goals}
            约束条件: {constraints}
            
            优化维度分析：
            
            1. **性能优化** - 提升执行效率和响应速度
            2. **可靠性优化** - 增强稳定性和容错能力
            3. **可扩展性优化** - 提高系统扩展能力
            4. **可维护性优化** - 简化维护和升级过程
            5. **成本优化** - 降低运营和维护成本
            
            请提供全面的优化分析和建议：
            {{
                "optimization_analysis": {{
                    "current_state_assessment": {{
                        "performance_score": 数字,
                        "reliability_score": 数字,
                        "scalability_score": 数字,
                        "maintainability_score": 数字,
                        "cost_efficiency_score": 数字,
                        "overall_health_score": 数字
                    }},
                    "bottleneck_identification": [
                        {{
                            "component": "组件名称",
                            "bottleneck_type": "cpu|memory|io|network|logic",
                            "severity": "low|medium|high|critical",
                            "impact_description": "影响描述",
                            "root_cause": "根本原因"
                        }}
                    ],
                    "optimization_opportunities": [
                        {{
                            "category": "performance|reliability|scalability|maintainability|cost",
                            "opportunity": "优化机会描述",
                            "potential_improvement": "潜在改进幅度",
                            "implementation_complexity": "low|medium|high",
                            "estimated_effort": "预估工作量"
                        }}
                    ]
                }},
                "optimization_recommendations": [
                    {{
                        "priority": "high|medium|low",
                        "category": "优化类别",
                        "title": "优化标题",
                        "description": "详细描述",
                        "implementation_steps": ["实施步骤"],
                        "expected_benefits": {{
                            "performance_improvement": "性能提升",
                            "cost_reduction": "成本降低",
                            "reliability_enhancement": "可靠性增强"
                        }},
                        "risks_and_considerations": ["风险和注意事项"],
                        "success_metrics": ["成功指标"],
                        "timeline": "实施时间线"
                    }}
                ],
                "implementation_strategy": {{
                    "phased_approach": [
                        {{
                            "phase": "阶段名称",
                            "duration": "持续时间",
                            "objectives": ["阶段目标"],
                            "deliverables": ["交付物"],
                            "success_criteria": ["成功标准"]
                        }}
                    ],
                    "resource_requirements": {{
                        "human_resources": "人力资源需求",
                        "technical_resources": "技术资源需求",
                        "budget_estimation": "预算估算"
                    }},
                    "risk_mitigation": {{
                        "identified_risks": ["识别的风险"],
                        "mitigation_strategies": ["缓解策略"],
                        "contingency_plans": ["应急计划"]
                    }}
                }},
                "monitoring_and_validation": {{
                    "kpi_framework": ["关键性能指标"],
                    "monitoring_setup": "监控配置",
                    "validation_methodology": "验证方法",
                    "continuous_improvement": "持续改进机制"
                }}
            }}
            """,
            variables=["current_workflow", "performance_metrics", "optimization_goals", "constraints"],
            description="全面分析并优化工作流的性能、可靠性、可扩展性和可维护性"
        )
    
    def get_template(self, template_name: str) -> Optional[PromptTemplate]:
        """获取提示词模板"""
        return self.templates.get(template_name)
    
    def list_templates(self, prompt_type: Optional[PromptType] = None) -> List[str]:
        """列出可用的模板"""
        if prompt_type:
            return [name for name, template in self.templates.items() 
                   if template.type == prompt_type]
        return list(self.templates.keys())
    
    def render_prompt(self, template_name: str, variables: Dict[str, Any]) -> str:
        """渲染提示词"""
        template = self.get_template(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found")
        
        # 检查必需的变量
        missing_vars = set(template.variables) - set(variables.keys())
        if missing_vars:
            raise ValueError(f"Missing required variables: {missing_vars}")
        
        # 渲染模板
        try:
            return template.template.format(**variables)
        except KeyError as e:
            raise ValueError(f"Variable {e} not provided for template '{template_name}'")
    
    def add_template(self, template: PromptTemplate):
        """添加新的模板"""
        self.templates[template.name] = template
    
    def validate_template(self, template: PromptTemplate) -> List[str]:
        """验证模板的有效性"""
        issues = []
        
        # 检查模板变量
        template_vars = re.findall(r'\{(\w+)\}', template.template)
        declared_vars = set(template.variables)
        found_vars = set(template_vars)
        
        # 检查未声明的变量
        undeclared = found_vars - declared_vars
        if undeclared:
            issues.append(f"Undeclared variables in template: {undeclared}")
        
        # 检查未使用的变量
        unused = declared_vars - found_vars
        if unused:
            issues.append(f"Unused declared variables: {unused}")
        
        # 检查模板结构
        if not template.template.strip():
            issues.append("Template content is empty")
        
        if not template.description:
            issues.append("Template description is missing")
        
        return issues


# 全局增强提示词库实例
enhanced_prompt_library = EnhancedPromptLibrary()


def render_enhanced_prompt(template_name: str, **kwargs) -> str:
    """便捷的增强提示词渲染函数"""
    return enhanced_prompt_library.render_prompt(template_name, kwargs)
