"""
简化版提示词构建器 - 为Office协作生成智能提示词
"""
from typing import List, Dict, Any
from .office_product import OfficeProduct, detect_office_app_type
from .office_templates import OfficeTemplateManager
from .office_error_handler import office_error_handler
from .office_cache import prompt_cache, template_cache, scenario_cache

class SimplePromptBuilder:
    """升级版的Office提示词构建器 - 支持专业场景模板"""
    
    def __init__(self):
        self.template_manager = OfficeTemplateManager()
        
        # 基础模板（作为备用）
        self.FALLBACK_TEMPLATES = {
            "word": """
{original_task}

{office_context}

Word任务建议：
{word_suggestions}

请使用Word工具完成上述任务，确保内容质量和格式规范。
""",
            "excel": """
{original_task}

{office_context}

Excel任务建议：
{excel_suggestions}

请使用Excel工具完成上述任务，确保数据准确性和图表美观。
""",
            "ppt": """
{original_task}

{office_context}

PPT任务建议：
{ppt_suggestions}

请使用PowerPoint工具完成上述任务，确保演示效果和视觉美观。
"""
        }
    
    def build_prompt(self, task: str, office_products: List[OfficeProduct]) -> str:
        """构建增强的提示词 - 使用专业场景模板和缓存"""
        
        try:
            # 检测任务类型
            app_type = detect_office_app_type(task)
            
            # 检测最适合的场景（使用缓存）
            scenario = scenario_cache.get_cached_scenario(task, app_type)
            if scenario is None:
                scenario = self.template_manager.detect_scenario(task, app_type)
                scenario_cache.cache_scenario(task, app_type, scenario)
            
            # 检查提示词缓存
            cached_prompt = prompt_cache.get_cached_prompt(task, office_products, app_type, scenario)
            if cached_prompt:
                print(f"🚀 [缓存命中] 使用缓存的提示词")
                return cached_prompt
            
            # 获取专业模板（使用缓存）
            template_obj = template_cache.get_cached_template(app_type, scenario)
            if template_obj is None:
                template_obj = self.template_manager.get_template(app_type, scenario)
                if template_obj:
                    template_cache.cache_template(app_type, scenario, template_obj)
            
            # 筛选相关的Office产品
            relevant_products = self.filter_relevant_products(office_products, app_type)
            
            # 构建上下文
            context = self.build_office_context(relevant_products)
            
            # 生成提示词
            if template_obj:
                # 使用专业模板
                prompt = self._build_professional_prompt(task, relevant_products, template_obj, context)
            else:
                # 使用基础模板作为备用
                prompt = self._build_fallback_prompt(task, relevant_products, app_type, context)
            
            # 缓存生成的提示词
            prompt_cache.cache_prompt(task, office_products, app_type, scenario, prompt)
            print(f"💾 [新增缓存] 提示词已缓存")
            
            return prompt
                
        except Exception as e:
            # 处理提示词构建错误
            return office_error_handler.handle_prompt_building_error(e, task, office_products)
    
    def _build_professional_prompt(self, task: str, products: List[OfficeProduct], 
                                 template_obj, context: str) -> str:
        """使用专业模板构建提示词"""
        
        # 分析上下文和数据洞察
        context_analysis = self._analyze_context_for_template(products, template_obj)
        data_insights = self._extract_data_insights(products)
        data_sources = self._identify_data_sources(products)
        
        # 填充专业模板
        try:
            return template_obj.prompt_template.format(
                original_task=task,
                office_context=context,
                context_analysis=context_analysis,
                data_insights=data_insights,
                data_sources=data_sources
            )
        except KeyError as e:
            # 如果模板格式有问题，使用错误处理器
            return office_error_handler.handle_template_error(e, template_obj.app_type, "template_format_error")
    
    def _build_fallback_prompt(self, task: str, products: List[OfficeProduct], 
                             app_type: str, context: str) -> str:
        """使用基础模板构建提示词"""
        
        # 生成建议
        suggestions = self.get_office_suggestions(app_type, products, task)
        
        # 选择基础模板并填充
        template = self.FALLBACK_TEMPLATES.get(app_type, self.FALLBACK_TEMPLATES["word"])
        
        return template.format(
            original_task=task,
            office_context=context,
            **{f"{app_type}_suggestions": suggestions}
        )
    
    def _analyze_context_for_template(self, products: List[OfficeProduct], template_obj) -> str:
        """为专业模板分析上下文"""
        try:
            if not products:
                return "当前没有前置工作成果，将创建全新的文档。"
            
            analysis_parts = []
            
            for product in products:
                analysis_parts.append(f"• 基于{product.app_type.upper()}产品：{product.summary}")
                if product.key_points:
                    analysis_parts.append(f"  关键要点：{', '.join(product.key_points[:3])}")
            
            # 根据模板类型添加特定分析
            if template_obj.scenario_type == "business":
                analysis_parts.append("• 建议采用商业级别的专业格式和分析深度")
            elif template_obj.scenario_type == "research":
                analysis_parts.append("• 确保学术严谨性和数据支撑的充分性")
            elif template_obj.scenario_type == "education":
                analysis_parts.append("• 注重内容的系统性和教学效果")
            
            return "\n".join(analysis_parts)
            
        except Exception as e:
            return office_error_handler.handle_context_analysis_error(e, products)
    
    def _extract_data_insights(self, products: List[OfficeProduct]) -> str:
        """提取数据洞察"""
        insights = []
        
        for product in products:
            if product.app_type == "excel":
                insights.append(f"Excel数据分析：{product.summary}")
            elif product.app_type == "word":
                insights.append(f"文档内容：{product.summary}")
            elif product.app_type == "ppt":
                insights.append(f"演示要点：{product.summary}")
        
        return "；".join(insights) if insights else "待分析的新数据"
    
    def _identify_data_sources(self, products: List[OfficeProduct]) -> str:
        """识别数据源"""
        sources = []
        
        for product in products:
            if product.file_path:
                sources.append(f"{product.app_type.upper()}文件：{product.file_path}")
            else:
                sources.append(f"{product.app_type.upper()}数据")
        
        return "、".join(sources) if sources else "新建数据源"
    
    def filter_relevant_products(self, products: List[OfficeProduct], target_app: str) -> List[OfficeProduct]:
        """筛选与目标应用相关的产品"""
        relevant = []
        for product in products:
            if product.is_compatible_with_task(f"create {target_app}"):
                relevant.append(product)
        return relevant
    
    def build_office_context(self, products: List[OfficeProduct]) -> str:
        """构建Office上下文描述"""
        if not products:
            return "当前没有可用的前置Office产品。"
        
        context_parts = ["可用的前置Office产品："]
        for i, product in enumerate(products, 1):
            context_parts.append(f"{i}. {product.to_context_string().strip()}")
        
        return "\n".join(context_parts)
    
    def get_office_suggestions(self, app_type: str, products: List[OfficeProduct], task: str) -> str:
        """生成Office应用特定的建议"""
        
        suggestions = []
        
        if app_type == "word":
            suggestions.extend(self.get_word_suggestions(products, task))
        elif app_type == "excel":
            suggestions.extend(self.get_excel_suggestions(products, task))
        elif app_type == "ppt":
            suggestions.extend(self.get_ppt_suggestions(products, task))
        
        if not suggestions:
            suggestions.append(f"请创建高质量的{app_type.upper()}产品")
        
        return "\n".join([f"• {suggestion}" for suggestion in suggestions])
    
    def get_word_suggestions(self, products: List[OfficeProduct], task: str) -> List[str]:
        """生成Word特定建议"""
        suggestions = []
        
        # 基于现有产品的建议
        for product in products:
            if product.app_type == "excel":
                suggestions.append(f"基于Excel数据（{product.summary}）生成详细的文字分析")
                if product.key_points:
                    suggestions.append(f"重点突出：{', '.join(product.key_points[:3])}")
            elif product.app_type == "ppt":
                suggestions.append(f"基于PPT内容（{product.summary}）扩展为详细文档")
        
        # 任务特定建议
        task_lower = task.lower()
        if "报告" in task_lower:
            suggestions.append("包含执行摘要、详细分析、结论建议等章节")
        if "分析" in task_lower:
            suggestions.append("添加数据图表和深度分析内容")
        
        return suggestions
    
    def get_excel_suggestions(self, products: List[OfficeProduct], task: str) -> List[str]:
        """生成Excel特定建议"""
        suggestions = []
        
        # 基于现有产品的建议
        for product in products:
            if product.app_type == "word":
                suggestions.append(f"从Word文档（{product.summary}）中提取数据制作表格")
            elif product.app_type == "ppt":
                suggestions.append(f"基于PPT数据（{product.summary}）创建详细数据表")
        
        # 任务特定建议
        task_lower = task.lower()
        if "分析" in task_lower:
            suggestions.append("创建数据透视表和统计图表")
        if "数据" in task_lower:
            suggestions.append("确保数据格式规范，添加必要的公式计算")
        
        return suggestions
    
    def get_ppt_suggestions(self, products: List[OfficeProduct], task: str) -> List[str]:
        """生成PPT特定建议"""
        suggestions = []
        
        # 基于现有产品的建议
        for product in products:
            if product.app_type == "word":
                suggestions.append(f"提取Word文档（{product.summary}）的要点制作PPT")
                if product.key_points:
                    suggestions.append(f"重点幻灯片：{', '.join(product.key_points[:3])}")
            elif product.app_type == "excel":
                suggestions.append(f"将Excel图表（{product.summary}）插入到PPT中")
        
        # 任务特定建议
        task_lower = task.lower()
        if "汇报" in task_lower:
            suggestions.append("创建适合管理层汇报的专业PPT")
            suggestions.append("包含标题页、要点总结、数据展示、结论建议")
        if "演示" in task_lower:
            suggestions.append("确保幻灯片视觉效果和演示流程")
        
        return suggestions 