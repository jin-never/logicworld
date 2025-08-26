"""
节点执行器模块
只包含四个核心节点类型的执行器
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
import re

from utils.schemas import Node, NodeType
from .office_product import OfficeProduct, detect_office_app_type, extract_file_path_from_result, extract_key_points_from_result
from .simple_prompt_builder import SimplePromptBuilder
from .office_error_handler import office_error_handler


class NodeExecutionError(Exception):
    """节点执行错误"""
    def __init__(self, node_id: str, message: str, error_type: str = "execution_error"):
        self.node_id = node_id
        self.message = message
        self.error_type = error_type
        super().__init__(f"Node {node_id}: {message}")


class BaseNodeExecutor(ABC):
    """节点执行器基类"""
    
    @abstractmethod
    async def execute(self, node: Node, context: Dict[str, Any], **kwargs) -> Any:
        """执行节点"""
        pass
    
    def resolve_parameters(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """解析参数中的上下文引用"""
        if not params:
            return {}
        
        resolved = {}
        for key, value in params.items():
            resolved[key] = self.resolve_parameter(value, context)
        return resolved
    
    def resolve_parameter(self, value: Any, context: Dict[str, Any]) -> Any:
        """解析单个参数"""
        if isinstance(value, str) and value.startswith("@"):
            # 引用上下文中的值，格式：@nodeId.outputName
            ref_key = value[1:]
            return context.get(ref_key, value)
        elif isinstance(value, dict):
            resolved = {}
            for k, v in value.items():
                resolved[k] = self.resolve_parameter(v, context)
            return resolved
        elif isinstance(value, list):
            return [self.resolve_parameter(item, context) for item in value]
        else:
            return value


class MaterialNodeExecutor(BaseNodeExecutor):
    """材料节点执行器"""

    async def execute(self, node: Node, context: Dict[str, Any], **kwargs) -> Any:
        params = self.resolve_parameters(node.data.params, context)

        file_types = params.get("file_types", ["pdf", "doc", "txt"])
        max_file_size = params.get("max_file_size", 100)
        auto_categorize = params.get("auto_categorize", True)

        # 真实文件处理 - 要求用户提供实际文件
        if not params.get("uploaded_files") and not params.get("file_paths"):
            raise ValueError("❌ 材料节点需要真实的文件输入，请上传文件或提供文件路径")
        
        # 处理实际上传的文件
        uploaded_files = params.get("uploaded_files", [])
        file_paths = params.get("file_paths", [])
        
        processed_files = []
        for file_item in uploaded_files + file_paths:
            if isinstance(file_item, str):
                processed_files.append({"path": file_item, "type": "file_path"})
            else:
                processed_files.append({"name": file_item.get("name", "unknown"), "type": "uploaded"})
        
        file_info = {
            "total_files": len(processed_files),
            "supported_types": file_types,
            "max_size_mb": max_file_size,
            "auto_categorized": auto_categorize,
            "files": processed_files
        }

        return {
            "node_type": "material",
            "processed_files": processed_files,
            "file_info": file_info,
            "executed_at": datetime.now().isoformat()
        }


class ExecutionNodeExecutor(BaseNodeExecutor):
    """执行节点执行器 - 集成AI执行引擎和工具调用"""

    def __init__(self):
        # 延迟导入避免循环依赖
        from agent_system.execution_engine import ExecutionEngine
        self.ai_execution_engine = ExecutionEngine()
        # 初始化工具路由器
        self.tool_router = None
        self._initialize_tool_router()
        # 初始化Office提示词构建器
        self.prompt_builder = SimplePromptBuilder()
        
    def _initialize_tool_router(self):
        """初始化工具路由器"""
        try:
            from tools.tool_router import tool_router
            self.tool_router = tool_router
            # 异步初始化将在第一次使用时执行
        except Exception as e:
            logging.error(f"Failed to initialize tool router: {e}")
            self.tool_router = None
        
    async def execute(self, node: Node, context: Dict[str, Any], **kwargs) -> Any:
        params = self.resolve_parameters(node.data.params, context)

        # 🏢 Office产品智能协作：解析前置Office产品
        office_products = self.parse_office_products(context)
        print(f"🏢 [Office协作] 发现 {len(office_products)} 个前置Office产品")

        # 🔍 添加调试信息
        print(f"🔍 [DEBUG] 节点ID: {node.id}")
        print(f"🔍 [DEBUG] 节点类型: {node.type}")
        print(f"🔍 [DEBUG] 节点数据keys: {list(node.data.__dict__.keys())}")
        print(f"🔍 [DEBUG] selectedTool存在检查: {hasattr(node.data, 'selectedTool')}")
        if hasattr(node.data, 'selectedTool'):
            print(f"🔍 [DEBUG] selectedTool值: {node.data.selectedTool}")
        print(f"🔍 [DEBUG] toolParameters存在检查: {hasattr(node.data, 'toolParameters')}")
        if hasattr(node.data, 'toolParameters'):
            print(f"🔍 [DEBUG] toolParameters值: {node.data.toolParameters}")

        # 🎯 第一步：检查是否有预选的工具（直接执行模式）
        if hasattr(node.data, 'selectedTool') and node.data.selectedTool:
            print(f"🎯 [直接工具执行] 检测到预选工具: {node.data.selectedTool}")
            return await self._execute_direct_tool(node, context, params)

        # 获取任务描述（从节点标签或参数中）
        task_description = node.data.label if node.data.label else "执行"
        if hasattr(node.data, 'task') and node.data.task:
            task_description = node.data.task
        elif params.get("task_content"):
            task_description = params.get("task_content")
        
        # 🏢 Office智能协作：使用Office产品构建增强提示词
        if office_products:
            enhanced_task = self.prompt_builder.build_prompt(task_description, office_products)
            print(f"🏢 [Office协作] 智能增强提示词生成完成")
            print(f"原始任务: {task_description}")
            print(f"增强后任务: {enhanced_task[:200]}...")
            task_description = enhanced_task
        
        # 构建执行上下文
        execution_context = ""
        if context:
            # 过滤出有用的上下文信息
            relevant_context = {}
            for key, value in context.items():
                if key.endswith('.result') and value:
                    relevant_context[key] = value
            if relevant_context:
                execution_context = f"Previous results: {json.dumps(relevant_context, indent=2, ensure_ascii=False)}"
        
        # 首先检查任务是否需要增强（如果还没有被Office协作增强过）
        if not office_products and (len(task_description.strip()) <= 10 or task_description.strip() in ["执行", "execute", "运行", "run"]):
            enhanced_description = self._enhance_task_description(task_description, context, params)
            print(f"🔧 任务增强: '{task_description}' → '{enhanced_description}'")
            task_description = enhanced_description
        
        # 对最终任务描述进行智能格式分析
        format_analysis = self._analyze_task_format(task_description)
        
        # 应用格式智能分析
        if format_analysis.get("detected_tools"):
            print(f"🎯 检测到工具: {format_analysis['detected_tools']}")
            print(f"📄 推荐格式: {format_analysis['suggested_format']} - {format_analysis['reason']}")
            print(f"📁 建议文件名: {format_analysis['suggested_filename']}")
            
            # 创建增强的任务提示
            task_description = self._create_format_enhanced_prompt(task_description, format_analysis)
        
        try:
            # 调用真正的AI执行引擎
            print(f"🔍 [调试步骤1] 准备调用AI执行引擎...")
            result = await self.ai_execution_engine.execute(
                task_description=task_description,
                context=execution_context,
                role="assistant"
            )
            print(f"🔍 [调试步骤2] AI执行引擎返回结果类型: {type(result)}")
            print(f"🔍 [调试步骤2] AI执行引擎返回结果: {result}")
            
            ai_result = result.get('result', '')
            print(f"🔍 [调试步骤3] 提取ai_result成功，类型: {type(ai_result)}，长度: {len(ai_result) if isinstance(ai_result, str) else 'N/A'}")
            
            # 🚀 新增：检测并执行工具调用（传递任务描述用于格式解析）
            print(f"🔍 [调试步骤4] 准备调用_process_tool_calls，ai_result长度: {len(ai_result) if isinstance(ai_result, str) else 'N/A'}")
            print(f"🔍 [调试步骤4] ai_result内容预览: {ai_result[:200] if isinstance(ai_result, str) else str(ai_result)[:200]}...")
            tool_execution_result = await self._process_tool_calls(ai_result, format_analysis, task_description)
            print(f"🔍 [调试步骤5] _process_tool_calls返回结果: {tool_execution_result}")
            
            # 根据任务类型智能推断输出格式
            expected_output_format = self._infer_output_format(task_description, ai_result)
            
            # 构建增强的结果
            enhanced_result = {
                "node_type": "execution",
                "task": task_description,
                "mode": "normal",
                "model": "deepseek-chat",
                "ai_response": ai_result,
                "result": ai_result,  # 保持兼容性
                "tool_execution": tool_execution_result,
                "expected_output_format": expected_output_format,
                "execution_metadata": {
                    "task_type": self._classify_task_type(task_description),
                    "content_keywords": self._extract_keywords(task_description),
                    "ai_model": "deepseek-chat",
                    "context_used": bool(execution_context),
                    "tools_executed": tool_execution_result.get("tool_calls_executed", False)
                },
                "executed_at": datetime.now().isoformat()
            }
            
            # 如果工具调用成功执行，更新主要结果
            if tool_execution_result.get("tool_calls_executed"):
                enhanced_result["result"] = tool_execution_result.get("summary", ai_result)
                enhanced_result["final_output"] = "工具执行完成，已生成实际产品"
                
                # 🔧 关键修复：提取并传递document_path到工作流上下文
                tool_results = tool_execution_result.get("execution_results", [])
                for tool_result in tool_results:
                    if tool_result.get("status") == "success" and "document_path" in tool_result:
                        enhanced_result["document_path"] = tool_result["document_path"]
                        print(f"📁 [工作流链式修复] 提取document_path到上下文: {tool_result['document_path']}")
                        break
                
                print(f"🎉 工具调用成功，已更新结果为: {enhanced_result['result']}")
            else:
                print(f"⚠️ 工具调用未执行，保持原始AI结果: {ai_result[:100]}...")
            
            return enhanced_result
            
        except Exception as e:
            logging.error(f"AI execution failed for node {node.id}: {e}")
            return {
                "node_type": "execution", 
                "task": task_description,
                "error": str(e),
                "executed_at": datetime.now().isoformat()
            }
    
    async def _process_tool_calls(self, ai_response: str, format_analysis: Dict[str, Any] = None, task_description: str = None) -> Dict[str, Any]:
        """处理AI响应中的工具调用"""
        try:
            if not self.tool_router:
                return {
                    "type": "no_tool_router",
                    "content": ai_response,
                    "tool_calls_executed": False
                }
            
            # 确保工具路由器已初始化
            if not hasattr(self.tool_router, '_initialized'):
                await self.tool_router.initialize()
                self.tool_router._initialized = True
                
            # 解析并执行工具调用（传递格式分析结果和任务描述）
            result = await self.tool_router.parse_and_execute_tool_calls(ai_response, format_analysis, task_description)
            
            if result.get("tool_calls_executed"):
                print(f"🔧 工具调用执行成功: {result.get('summary', '未知')}")
            
            # 🏢 包装结果为Office产品（如果适用）
            enhanced_result = self.wrap_result_as_office_product(result, task_description)
            print(f"🏢 [Office产品] 结果包装完成: {enhanced_result.get('type', 'standard')}")
            
            return enhanced_result
            
        except Exception as e:
            logging.error(f"Tool call processing failed: {e}")
            return {
                "type": "error",
                "content": ai_response,
                "error": str(e),
                "tool_calls_executed": False
            }
            
    async def _execute_direct_tool(self, node: Node, context: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
        """直接执行预选的工具，跳过AI分析"""
        try:
            selected_tool = node.data.selectedTool
            tool_parameters = getattr(node.data, 'toolParameters', {})
            
            print(f"🔧 [直接工具执行] 工具: {selected_tool}")
            print(f"🔧 [直接工具执行] 参数: {tool_parameters}")
            
            # 验证必需参数
            validation_result = self._validate_tool_parameters(selected_tool, tool_parameters)
            if not validation_result["valid"]:
                error_msg = f"工具 {selected_tool} 缺少必需参数: {', '.join(validation_result['missing_parameters'])}"
                print(f"❌ [直接工具执行] 参数验证失败: {error_msg}")
                return {
                    "node_type": "execution",
                    "task": f"直接执行工具: {selected_tool}",
                    "error": error_msg,
                    "status": "parameter_error",
                    "missing_parameters": validation_result['missing_parameters'],
                    "executed_at": datetime.now().isoformat()
                }
            
            # 直接执行工具
            if self.tool_router:
                print(f"🔧 [直接工具执行] 通过工具路由器执行: {selected_tool}")
                
                # 确保工具路由器已初始化
                if not hasattr(self.tool_router, '_initialized'):
                    await self.tool_router.initialize()
                    self.tool_router._initialized = True
                
                # 构造工具调用字符串，让工具路由器解析并执行
                tool_call_str = f"{selected_tool}({json.dumps(tool_parameters, ensure_ascii=False)})"
                execution_result = await self.tool_router.parse_and_execute_tool_calls(tool_call_str)
                
                # 解析执行结果
                if execution_result.get("tool_calls_executed"):
                    tool_result = {
                        "success": True,
                        "result": execution_result.get("summary", "工具执行成功")
                    }
                else:
                    tool_result = {
                        "success": False,
                        "result": execution_result.get("content", "工具执行失败")
                    }
                
                return {
                    "node_type": "execution",
                    "task": f"直接执行工具: {selected_tool}",
                    "selected_tool": selected_tool,
                    "tool_parameters": tool_parameters,
                    "result": tool_result.get("result", "工具执行完成"),
                    "tool_execution": {
                        "type": "direct_tool_execution",
                        "tool": selected_tool,
                        "parameters": tool_parameters,
                        "result": tool_result,
                        "executed": True
                    },
                    "status": "success" if tool_result.get("success", True) else "error",
                    "executed_at": datetime.now().isoformat()
                }
            else:
                error_msg = "工具路由器未初始化"
                print(f"❌ [直接工具执行] {error_msg}")
                return {
                    "node_type": "execution",
                    "task": f"直接执行工具: {selected_tool}",
                    "error": error_msg,
                    "status": "router_error",
                    "executed_at": datetime.now().isoformat()
                }
                
        except Exception as e:
            print(f"❌ [直接工具执行] 执行失败: {e}")
            return {
                "node_type": "execution",
                "task": f"直接执行工具: {getattr(node.data, 'selectedTool', 'unknown')}",
                "error": str(e),
                "status": "execution_error",
                "executed_at": datetime.now().isoformat()
            }
    
    def _validate_tool_parameters(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """验证工具参数完整性"""
        # 定义各工具的必需参数
        required_params = {
            "wordmcp.create_document": ["filename"],
            "wordmcp.open_document": ["filename"],
            "wordmcp.add_paragraph": ["text"],
            "wordmcp.add_heading": ["text"],
            "wordmcp.save_document": [],
            "wordmcp.add_table": ["rows", "cols"],
            "wordmcp.format_text": ["text"],
            "wordmcp.export_to_pdf": ["filename"]
        }
        
        # 支持简化的工具名称
        tool_key = tool_name
        if not tool_key.startswith("wordmcp."):
            tool_key = f"wordmcp.{tool_name}"
        
        required = required_params.get(tool_key, [])
        missing = [param for param in required if param not in parameters or not parameters[param]]
        
        return {
            "valid": len(missing) == 0,
            "missing_parameters": missing,
            "required_parameters": required
            }
    
    def _analyze_task_format(self, task_description: str) -> Dict[str, Any]:
        """分析任务并建议格式"""
        try:
            from tools.smart_format_selector import smart_format_selector
            return smart_format_selector.analyze_task_and_suggest_format(task_description)
        except Exception as e:
            logging.error(f"格式分析失败: {e}")
            return {
                "detected_tools": [],
                "suggested_format": "txt",
                "suggested_filename": "output.txt",
                "reason": "格式分析失败",
                "all_supported_formats": ["txt"]
            }
    
    def _create_format_enhanced_prompt(self, original_task: str, format_analysis: Dict[str, Any]) -> str:
        """创建格式增强的任务提示"""
        try:
            from tools.smart_format_selector import smart_format_selector
            return smart_format_selector.create_enhanced_prompt(original_task, format_analysis)
        except Exception as e:
            logging.error(f"创建增强提示失败: {e}")
            return original_task
    
    def _enhance_task_description(self, original_task: str, context: Dict[str, Any], params: Dict[str, Any]) -> str:
        """智能增强任务描述"""
        print(f"🔍 开始任务增强: 原任务='{original_task}', 上下文键={list(context.keys())}")
        
        enhanced_description = original_task
        
        # 从上下文推断任务类型
        if context:
            for key, value in context.items():
                print(f"   检查上下文: {key} = {str(value)[:100]}...")
                if key.endswith('.result') and isinstance(value, dict):
                    if 'material' in key.lower() or 'file' in str(value).lower():
                        enhanced_description = f"基于提供的材料信息，创建一个详细的专业文档，包含完整的分析、建议和实用信息"
                        print(f"   → 材料类型增强: {enhanced_description}")
                        break
                    elif 'design' in str(value).lower() or '设计' in str(value):
                        enhanced_description = f"根据设计要求，创建相应的详细设计方案和技术文档"
                        print(f"   → 设计类型增强: {enhanced_description}")
                        break
        
        # 如果仍然太简单，提供默认的详细任务
        if len(enhanced_description.strip()) <= 15 or enhanced_description == original_task:
            # 针对"执行"这种超简单任务，提供工具导向的增强
            if original_task.strip().lower() in ["执行", "execute", "运行", "run"]:
                enhanced_description = "使用wordmcp工具创建一个Word文档，内容要求详细完整，包含标题、正文段落和总结"
                print(f"   → 工具导向增强: {enhanced_description}")
            else:
                enhanced_description = "创建一个关于人工智能技术应用与发展趋势的专业分析报告，包含技术原理、应用场景、发展前景和实际案例分析，要求内容详实、结构清晰、具有实用价值"
                print(f"   → 默认增强: {enhanced_description}")
        
        return enhanced_description
    
    def _infer_output_format(self, task_description: str, result: str) -> str:
        """根据任务描述和结果推断输出格式"""
        task_lower = task_description.lower()
        
        if any(word in task_lower for word in ['word', '文档', 'doc', '报告']):
            return 'docx'
        elif any(word in task_lower for word in ['excel', '表格', 'xls', '数据']):
            return 'xlsx'
        elif any(word in task_lower for word in ['ppt', '演示', 'presentation', '幻灯片']):
            return 'pptx'
        elif any(word in task_lower for word in ['pdf']):
            return 'pdf'
        else:
            return 'txt'
    
    def _classify_task_type(self, task_description: str) -> str:
        """分类任务类型"""
        task_lower = task_description.lower()
        
        if any(word in task_lower for word in ['分析', 'analysis', '研究']):
            return 'analysis'
        elif any(word in task_lower for word in ['设计', 'design', '规划']):
            return 'design'
        elif any(word in task_lower for word in ['文档', 'document', '报告', 'report']):
            return 'documentation'
        elif any(word in task_lower for word in ['创建', 'create', '生成', 'generate']):
            return 'creation'
        else:
            return 'general'
    
    def _extract_keywords(self, task_description: str) -> List[str]:
        """提取任务关键词"""
        import re
        # 简单的关键词提取
        keywords = []
        words = re.findall(r'\b\w{2,}\b', task_description)
        for word in words:
            if len(word) > 2 and word not in ['and', 'the', 'for', 'with', '的', '和', '与']:
                keywords.append(word)
        return keywords[:5]  # 最多返回5个关键词

    def parse_office_products(self, context: Dict[str, Any]) -> List[OfficeProduct]:
        """从上下文中解析Office产品"""
        try:
            office_products = []
            
            for key, value in context.items():
                if key.endswith('.result') and value:
                    # 尝试解析为Office产品
                    try:
                        if isinstance(value, dict) and 'office_product' in value:
                            # 直接从结果中获取Office产品
                            product_data = value['office_product']
                            office_products.append(OfficeProduct.from_dict(product_data))
                        else:
                            # 智能识别Office产品
                            detected_product = self.detect_office_product_from_result(value)
                            if detected_product:
                                office_products.append(detected_product)
                    except Exception as e:
                        print(f"⚠️ 解析Office产品失败 {key}: {e}")
                        continue
            
            return office_products
            
        except Exception as e:
            # 处理严重的解析错误
            error_result = office_error_handler.handle_product_parsing_error(e, context)
            return error_result.get("office_products", [])
    
    def detect_office_product_from_result(self, result: Any) -> Optional[OfficeProduct]:
        """智能检测结果中的Office产品"""
        if not result:
            return None
        
        result_str = str(result)
        
        try:
            # 检测文件路径和应用类型
            file_path = extract_file_path_from_result(result)
        except Exception as e:
            file_path = office_error_handler.handle_file_extraction_error(e, result)
        
        # 根据文件扩展名检测应用类型
        app_type = ""
        if file_path:
            if file_path.endswith(('.docx', '.doc')):
                app_type = "word"
            elif file_path.endswith(('.xlsx', '.xls')):
                app_type = "excel"
            elif file_path.endswith(('.pptx', '.ppt')):
                app_type = "ppt"
        
        # 如果没有文件路径，根据内容检测
        if not app_type:
            result_lower = result_str.lower()
            if any(word in result_lower for word in ['word', '文档', '报告']):
                app_type = "word"
            elif any(word in result_lower for word in ['excel', '表格', '数据']):
                app_type = "excel"
            elif any(word in result_lower for word in ['ppt', '演示', '幻灯片']):
                app_type = "ppt"
        
        if app_type:
            # 生成摘要
            summary = self.generate_office_summary(result_str, app_type)
            
            # 提取关键点
            try:
                key_points = extract_key_points_from_result(result)
            except Exception as e:
                key_points = office_error_handler.handle_key_points_extraction_error(e, result)
            
            return OfficeProduct(
                app_type=app_type,
                summary=summary,
                file_path=file_path,
                key_points=key_points
            )
        
        return None
    
    def generate_office_summary(self, result_str: str, app_type: str) -> str:
        """生成Office产品摘要"""
        if len(result_str) > 100:
            # 截取前100个字符作为摘要
            summary = result_str[:100] + "..."
        else:
            summary = result_str
        
        # 根据应用类型添加前缀
        app_names = {"word": "Word文档", "excel": "Excel表格", "ppt": "PPT演示"}
        app_name = app_names.get(app_type, "Office文档")
        
        return f"{app_name}: {summary}"
    
    def wrap_result_as_office_product(self, result: Any, task: str) -> Dict[str, Any]:
        """将执行结果包装为Office产品"""
        
        # 检测Office产品
        office_product = self.detect_office_product_from_result(result)
        
        if office_product:
            # 返回包含Office产品信息的结果
            return {
                'result': result,
                'office_product': office_product.to_dict(),
                'type': 'office_enhanced'
            }
        else:
            # 如果无法检测为Office产品，返回原始结果
            return {'result': result}


class ConditionNodeExecutor(BaseNodeExecutor):
    """条件判断节点执行器"""
    
    async def execute(self, node: Node, context: Dict[str, Any], **kwargs) -> Any:
        params = self.resolve_parameters(node.data.params, context)
        
        condition_type = params.get("condition_type", "simple")
        left_value = params.get("left_value")
        operator = params.get("operator", "==")
        right_value = params.get("right_value")
        
        # 执行条件判断
        result = self._evaluate_condition(left_value, operator, right_value)
        
        return {
            "node_type": "condition",
            "condition_type": condition_type,
            "left_value": left_value,
            "operator": operator,
            "right_value": right_value,
            "result": result,
            "executed_at": datetime.now().isoformat()
        }
    
    def _evaluate_condition(self, left: Any, operator: str, right: Any) -> bool:
        """评估条件表达式"""
        try:
            if operator == "==":
                return left == right
            elif operator == "!=":
                return left != right
            elif operator == ">":
                return left > right
            elif operator == "<":
                return left < right
            elif operator == ">=":
                return left >= right
            elif operator == "<=":
                return left <= right
            elif operator == "contains":
                return str(right) in str(left)
            elif operator == "not_contains":
                return str(right) not in str(left)
            elif operator == "starts_with":
                return str(left).startswith(str(right))
            elif operator == "ends_with":
                return str(left).endswith(str(right))
            elif operator == "is_empty":
                return not left or left == ""
            elif operator == "is_not_empty":
                return bool(left and left != "")
            else:
                return bool(left)
        except Exception as e:
            raise ValueError(f"Invalid expression: {e}")


class ResultNodeExecutor(BaseNodeExecutor):
    """结果节点执行器"""

    async def execute(self, node: Node, context: Dict[str, Any], **kwargs) -> Any:
        params = self.resolve_parameters(node.data.params, context)

        format_type = params.get("format_type", "text")
        display_options = params.get("display_options", {})

        # 获取输入数据
        input_data = params.get("data", "")

        # 根据格式类型处理数据
        if format_type == "json":
            try:
                formatted_result = json.dumps(input_data, indent=2, ensure_ascii=False)
            except:
                formatted_result = str(input_data)
        elif format_type == "table":
            # 简单的表格格式化
            if isinstance(input_data, list):
                formatted_result = "\n".join([str(item) for item in input_data])
            else:
                formatted_result = str(input_data)
        else:
            formatted_result = str(input_data)

        return {
            "node_type": "result",
            "format_type": format_type,
            "input_data": input_data,
            "formatted_result": formatted_result,
            "display_options": display_options,
            "executed_at": datetime.now().isoformat()
        }


# 节点执行器注册表
NODE_EXECUTORS = {
    # 核心节点执行器
    NodeType.MATERIAL_NODE: MaterialNodeExecutor(),
    NodeType.EXECUTION_NODE: ExecutionNodeExecutor(),
    NodeType.CONDITION_NODE: ConditionNodeExecutor(),
    NodeType.RESULT_NODE: ResultNodeExecutor(),
    # 兼容性映射：前端发送的"execution"类型
    "execution": ExecutionNodeExecutor(),
}


async def execute_extended_node(node: Node, context: Dict[str, Any], **kwargs) -> Any:
    """执行扩展节点类型"""
    # 先尝试直接使用字符串类型查找（支持兼容性映射）
    node_type_str = node.data.nodeType
    if node_type_str in NODE_EXECUTORS:
        executor = NODE_EXECUTORS[node_type_str]
        return await executor.execute(node, context, **kwargs)
    
    # 如果字符串查找失败，尝试转换为NodeType枚举
    try:
        node_type = NodeType(node_type_str)
        if node_type in NODE_EXECUTORS:
            executor = NODE_EXECUTORS[node_type]
            return await executor.execute(node, context, **kwargs)
    except ValueError:
        pass  # 无效的NodeType值，继续到异常处理
    
        # 对于不在扩展执行器中的节点类型，抛出特殊异常
        # 让主执行逻辑继续处理
    raise NodeExecutionError(node.id, f"Node type {node_type_str} not handled by extended executors", "not_extended")
