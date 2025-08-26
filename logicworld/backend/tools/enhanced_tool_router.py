"""
增强工具路由器 - 集成逻辑1.0.1的智能格式检测和处理
将AI生成的工具调用路由到正确的执行器，支持智能格式分析和增强提示
"""
import json
import logging
import re
import asyncio
from typing import Dict, Any, List, Optional

# ===== 移除MCP相关导入 =====
# from .mcp_client_manager import MCPClientManager  # 已移除
# from .unified_tool_system import unified_tool_system, execute_tool_call, get_available_tools  # 已移除

# ===== 添加新的导入 =====
from .simple_word_tools import get_simple_word_tools, execute_word_tool, get_word_tools


class EnhancedToolRouter:
    """增强智能工具路由器 - 集成逻辑1.0.1成功模式"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.mcp_manager = None
        self.builtin_tools = {}
        self._initialized = False
        
    async def initialize(self):
        """初始化工具路由器 - 使用简化的内置工具"""
        if self._initialized:
            return
        
        try:
            self.logger.info("🚀 [简化模式] 初始化增强工具路由器...")
            
            # ===== 完全移除MCP相关初始化 =====
            # 不再初始化MCP管理器
            # self.mcp_manager = MCPClientManager()
            # await self.mcp_manager.initialize()
            
            # ===== 使用新的简化工具系统 =====
            # 初始化简化的Word工具
            self.simple_word_tools = get_simple_word_tools()
            available_tools = get_word_tools()
            
            self.logger.info(f"✅ [简化模式] 发现 {len(available_tools)} 个内置工具: {[tool['name'] for tool in available_tools]}")
            
            self._initialized = True
            self.logger.info("✅ [简化模式] 增强工具路由器初始化成功，使用内置工具系统。")
            
        except Exception as e:
            self.logger.error(f"❌ [简化模式] 增强工具路由器初始化失败: {e}")
            self._initialized = False
            raise
    
    def _extract_format_from_task(self, task: str) -> dict:
        """从任务描述中提取格式要求 - 增强版支持完整Word MCP功能"""
        format_requirements = {}
        
        # 字体检测 - 完整的Microsoft Word字体库支持
        font_patterns = [
            # 华文系列字体（优先匹配）
            r'(华文彩云|华文仿宋|华文楷体|华文隶书|华文宋体|华文细黑|华文新魏|华文行楷|华文中宋|华文琥珀)',
            # 常用中文字体（中文名）
            r'(微软雅黑|宋体|黑体|楷体|仿宋|隶书|幼圆)',
            # 方正字体系列
            r'(方正舒体|方正姚体|方正隶书)',
            # 英文字体名称（系统内部名）
            r'(STCaiyun|STFangsong|STKaiti|STLiti|STSong|STXihei|STXinwei|STXingkai|STZhongsong|STHupo)',
            r'(Microsoft YaHei|SimSun|SimHei|KaiTi|FangSong|LiSu|YouYuan)',
            # 经典英文字体
            r'(Times New Roman|Arial|Calibri|Georgia|Verdana|Tahoma|Comic Sans MS|Impact|Trebuchet MS|Palatino)',
            # 通用字体识别模式（兜底）
            r'字体[为是用设置成]\s*([^\s,，。、]+?)(?=[,，。、]|$)',
            r'用\s*([^\s,，。]*字体)',
        ]
        
        for pattern in font_patterns:
            match = re.search(pattern, task)
            if match:
                font_name = match.group(1).strip()
                if font_name and len(font_name) > 1:
                    format_requirements['font_name'] = font_name
                    print(f"🔤 [字体识别] 检测到字体: {font_name}")
                    break
        
        # 颜色检测
        color_patterns = [
            r'颜色[为是用设置成]\s*([红绿蓝黑白黄紫橙粉灰棕]色?)',
            r'([红绿蓝黑白黄紫橙粉灰棕]色)',
            r'(red|green|blue|black|white|yellow|purple|orange|pink|gray|brown)',
            r'#([0-9A-Fa-f]{6})',
            r'rgb\((\d+),\s*(\d+),\s*(\d+)\)',
        ]
        
        for pattern in color_patterns:
            match = re.search(pattern, task)
            if match:
                if pattern.startswith('rgb'):
                    r, g, b = match.groups()
                    format_requirements['color'] = f"rgb({r},{g},{b})"
                elif pattern.startswith('#'):
                    format_requirements['color'] = f"#{match.group(1)}"
                else:
                    color = match.group(1).strip()
                    if '色' not in color and color not in ['red', 'green', 'blue', 'black', 'white', 'yellow', 'purple', 'orange', 'pink', 'gray', 'brown']:
                        color += '色'
                    format_requirements['color'] = color
                print(f"🎨 [颜色识别] 检测到颜色: {format_requirements['color']}")
                break
        
        # 字体样式检测
        if any(word in task for word in ['加粗', '粗体', '加黑', 'bold']):
            format_requirements['bold'] = True
            print(f"💪 [样式识别] 检测到加粗")
            
        if any(word in task for word in ['斜体', '倾斜', 'italic']):
            format_requirements['italic'] = True
            print(f"📐 [样式识别] 检测到斜体")
            
        if any(word in task for word in ['下划线', 'underline']):
            format_requirements['underline'] = True
            print(f"📝 [样式识别] 检测到下划线")
        
        # 字体大小检测
        size_patterns = [
            r'字号[为是用]\s*(\d+)',
            r'(\d+)号',
            r'字体大小[为是用]\s*(\d+)',
            r'font-size[:\s]*(\d+)',
            r'size[:\s]*(\d+)',
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, task)
            if match:
                size = match.group(1)
                if pattern == r'(\d+)号':  # 转换号数到磅数
                    size_map = {'一': 26, '二': 22, '三': 16, '四': 14, '五': 10.5, '六': 7.5,
                               '1': 26, '2': 22, '3': 16, '4': 14, '5': 10.5, '6': 7.5}
                    size = size_map.get(size, size)
                format_requirements['font_size'] = str(size)
                print(f"📏 [大小识别] 检测到字体大小: {size}")
                break
        
        # 段落格式检测
        if any(word in task for word in ['首行缩进', '缩进']):
            indent_pattern = r'缩进\s*(\d+)\s*[字个]?[符字]?'
            match = re.search(indent_pattern, task)
            if match:
                indent_chars = match.group(1)
                format_requirements['indent_first_line'] = f"{indent_chars}字符"
                print(f"📐 [段落格式] 检测到首行缩进: {indent_chars}字符")
        
        # 行距检测
        spacing_patterns = [
            r'(\d+\.?\d*)倍行距',
            r'行距\s*(\d+\.?\d*)',
            r'line-spacing[:\s]*(\d+\.?\d*)',
        ]
        
        for pattern in spacing_patterns:
            match = re.search(pattern, task)
            if match:
                spacing = match.group(1)
                format_requirements['line_spacing'] = f"{spacing}倍"
                print(f"📏 [段落格式] 检测到行距: {spacing}倍")
                break
        
        return format_requirements
    
    async def parse_and_execute_tool_calls(self, ai_response: str, format_analysis: Dict[str, Any] = None, task_description: str = None) -> Dict[str, Any]:
        """解析并执行工具调用 - 增强版"""
        try:
            # 提取工具调用
            tool_calls = self._extract_tool_calls_from_response(ai_response)
            
            if not tool_calls:
                return {
                    "type": "no_tool_calls",
                    "content": ai_response,
                    "tool_calls_executed": False
                }
            
            print(f"🔧 [工具调用] 提取到 {len(tool_calls)} 个工具调用")
            
            # 从任务描述中提取格式要求
            task_format_requirements = {}
            if task_description:
                task_format_requirements = self._extract_format_from_task(task_description)
                print(f"🎨 [格式要求] 从任务中提取: {task_format_requirements}")
            
            # 🔧 NEW: 检查是否有现有文件需要使用
            existing_file_path = getattr(self, '_existing_file_path', None)
            if not existing_file_path:
                # 从执行引擎获取现有文件信息
                from backend.agent_system.execution_engine import ExecutionEngine
                if hasattr(ExecutionEngine, '_existing_file_path'):
                    existing_file_path = ExecutionEngine._existing_file_path
            
            # 执行工具调用
            execution_results = []
            for tool_call in tool_calls:
                # 🔧 NEW: 对Word工具调用进行文件检查和修改
                if tool_call.get("tool", "").lower() in ["wordmcp", "word"]:
                    tool_call = tool_call.copy()  # 不修改原始tool_call
                    
                    # 如果有现有文件且工具调用是create_document，改为open_document
                    if existing_file_path and tool_call.get("action") == "create_document":
                        print(f"🔍 [文件检查] 发现现有文件 {existing_file_path}，将create_document改为open_document")
                        tool_call["action"] = "open_document"
                        if "parameters" not in tool_call:
                            tool_call["parameters"] = {}
                        tool_call["parameters"]["filename"] = existing_file_path
                    
                    # 如果有现有文件且工具调用需要文件名，使用现有文件
                    elif existing_file_path and tool_call.get("action") in ["add_paragraph", "add_heading", "format_text"]:
                        if "parameters" not in tool_call:
                            tool_call["parameters"] = {}
                        if "filename" not in tool_call["parameters"]:
                            tool_call["parameters"]["filename"] = existing_file_path
                            print(f"🔍 [文件检查] 为 {tool_call.get('action')} 操作指定现有文件: {existing_file_path}")
                    
                    # 应用任务格式要求
                    if task_format_requirements:
                        # 如果是add_paragraph动作，将格式要求合并到parameters中
                        if tool_call.get("action") == "add_paragraph":
                            if "parameters" not in tool_call:
                                tool_call["parameters"] = {}
                            # 只合并Word工具支持的参数（排除color等不支持的参数）
                            supported_params = ["font_name", "font_size", "bold", "alignment", "line_spacing"]
                            for key, value in task_format_requirements.items():
                                if key in supported_params:
                                    tool_call["parameters"][key] = value
                            print(f"🎨 [智能格式] 将支持的任务格式合并到add_paragraph.parameters: {tool_call['parameters']}")
                
                result = await self.route_tool_call(tool_call, format_analysis)
                execution_results.append(result)
            
            # 生成执行总结
            summary = self._generate_execution_summary(execution_results)
            
            return {
                "type": "tool_execution_result",
                "original_response": ai_response,
                "tool_calls": tool_calls,
                "execution_results": execution_results,
                "summary": summary,
                "tool_calls_executed": True,
                "format_analysis": format_analysis
            }
            
        except Exception as e:
            self.logger.error(f"Tool call parsing and execution failed: {e}")
            return {
                "type": "error",
                "content": ai_response,
                "error": str(e),
                "tool_calls_executed": False
            }
    
    def _extract_tool_calls_from_response(self, response: str) -> List[Dict[str, Any]]:
        """从AI响应中提取工具调用"""
        tool_calls = []
        
        # 方法1: 检测JSON代码块
        json_pattern = r'```json\s*(.*?)\s*```'
        json_matches = re.findall(json_pattern, response, re.DOTALL)
        
        for match in json_matches:
            try:
                parsed = json.loads(match.strip())
                if isinstance(parsed, list):
                    tool_calls.extend(parsed)
                elif isinstance(parsed, dict):
                    tool_calls.append(parsed)
                print(f"🎯 [工具提取] 成功解析工具调用: {parsed}")
            except json.JSONDecodeError as e:
                print(f"❌ [工具提取] JSON解析失败: {e}")
                continue
        
        # 方法2: 检测特定工具调用模式
        if not tool_calls:
            tool_calls = self._extract_by_patterns(response)
        
        return tool_calls
    
    def _extract_by_patterns(self, response: str) -> List[Dict[str, Any]]:
        """通过模式匹配提取工具调用"""
        tool_calls = []
        
        # 检测wordmcp相关的工具调用
        if "wordmcp" in response.lower() or "word" in response.lower():
            if "新建" in response or "创建" in response or "create" in response.lower():
                # 提取文档创建调用
                tool_call = {
                    "tool": "wordmcp",
                    "action": "create_document", 
                    "parameters": {
                        "filename": "document.docx"
                    }
                }
                
                # 提取文本内容
                if "测试" in response:
                    tool_call["text_content"] = "测试内容"
                
                tool_calls.append(tool_call)
        
        return tool_calls
    
    async def route_tool_call(self, tool_call: Dict[str, Any], format_analysis: Dict[str, Any] = None) -> Dict[str, Any]:
        """路由工具调用到正确的执行器"""
        tool = tool_call.get("tool", "").lower()
        action = tool_call.get("action", "")
        parameters = tool_call.get("parameters", {})
        
        print(f"🔧 [工具路由] 路由工具: {tool}.{action}")
        
        try:
            # Word工具调用 - 使用python-docx
            if tool in ["wordmcp", "word", "word-mcp"]:
                return await self._handle_wordmcp_tool(tool_call, format_analysis)
            
            # 通用MCP工具
            elif tool in ["mcp", "claude-mcp"] or tool.startswith("mcp-"):
                return await self._handle_generic_mcp_tool(tool_call)
            
            # 内置工具
            elif tool in self.builtin_tools:
                executor = self.builtin_tools[tool]
                result = await executor(parameters)
                return {
                    "status": "success",
                    "tool": tool,
                    "action": action,
                    "result": result
                }
            
            else:
                return {
                    "status": "error",
                    "tool": tool,
                    "action": action,
                    "error": f"未知工具: {tool}"
                }
                
        except Exception as e:
            self.logger.error(f"Tool execution failed: {tool}.{action} - {e}")
            return {
                "status": "error",
                "tool": tool,
                "action": action,
                "error": str(e)
            }
    
    async def _handle_wordmcp_tool(self, tool_call: Dict[str, Any], format_analysis: Dict[str, Any] = None) -> Dict[str, Any]:
        """处理Word工具调用 - 使用简化的内置实现"""
        try:
            action = tool_call.get("action", "")
            parameters = tool_call.get("parameters", {})
            
            self.logger.info(f"🔧 [简化模式] 处理Word工具调用: {action}")
            
            # ===== 完全移除MCP相关逻辑 =====
            # 不再使用MCP客户端或统一工具系统
            # if self.unified_tools:
            #     return await self.unified_tools.execute_tool(tool_call.name, tool_call.arguments)
            
            # ===== 使用新的简化工具系统 =====
            # 直接调用简化的Word工具
            result = execute_word_tool(action, parameters)
            
            if result.get("success"):
                self.logger.info(f"✅ [简化模式] Word工具 {action} 执行成功")
                return {
                    "success": True,
                    "result": result,
                    "tool_name": action,
                    "execution_time": "immediate"
                }
            else:
                self.logger.error(f"❌ [简化模式] Word工具 {action} 执行失败: {result.get('error')}")
                return {
                    "success": False,
                    "error": result.get("error", "工具执行失败"),
                    "tool_name": action
            }
            
        except Exception as e:
            self.logger.error(f"❌ [简化模式] Word工具调用异常: {e}")
            return {
                "success": False,
                "error": f"Word工具调用异常: {str(e)}",
                "tool_name": action if 'action' in locals() else "unknown"
            }
    
    async def _handle_generic_mcp_tool(self, tool_call: Dict[str, Any]) -> Dict[str, Any]:
        """处理通用MCP工具调用"""
        tool = tool_call.get("tool", "")
        action = tool_call.get("action", "")
        parameters = tool_call.get("parameters", {})
        
        print(f"🔧 [通用MCP] 处理通用MCP工具: {tool}.{action}")
        
        try:
            if hasattr(self.mcp_manager, 'call_generic_mcp_tool'):
                result = await self.mcp_manager.call_generic_mcp_tool(tool, action, parameters)
            else:
                result = {
                    "success": False,
                    "error": f"通用MCP工具 {tool}.{action} 功能正在开发中"
                }
            
            return {
                "status": "success" if result.get("success") else "error",
                "tool": tool,
                "action": action,
                "result": result,
                "error": result.get("error") if not result.get("success") else None
            }
            
        except Exception as e:
            self.logger.error(f"通用MCP工具执行异常: {tool}.{action} - {e}")
            return {
                "status": "error",
                "tool": tool,
                "action": action,
                "error": str(e)
            }
    
    def _generate_execution_summary(self, execution_results: List[Dict[str, Any]]) -> str:
        """生成执行总结"""
        if not execution_results:
            return "没有执行任何工具"
        
        successful_count = sum(1 for result in execution_results if result.get("status") == "success")
        total_count = len(execution_results)
        
        summary = f"执行了 {total_count} 个工具调用，其中 {successful_count} 个成功"
        
        # 添加具体的成功操作描述
        for result in execution_results:
            if result.get("status") == "success":
                tool = result.get("tool", "")
                action = result.get("action", "")
                if tool == "wordmcp" or tool == "word":
                    if action == "create_document":
                        summary += f"\n✅ 创建了Word文档"
                        if result.get("result", {}).get("document_path"):
                            summary += f": {result['result']['document_path']}"
                    elif action == "add_paragraph":
                        summary += f"\n✅ 添加了段落内容"
                    elif action == "set_page_size":
                        summary += f"\n✅ 设置了页面大小"
                    elif action == "add_heading":
                        summary += f"\n✅ 添加了标题"
        
        return summary
    
    def _register_builtin_tools(self):
        """注册内置工具"""
        self.builtin_tools = {
            "echo": self._echo_tool,
            "test": self._test_tool
        }
    
    async def _echo_tool(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """回声工具"""
        message = parameters.get("message", "Hello, World!")
        return {"echo": message}
    
    async def _test_tool(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """测试工具"""
        return {"status": "test_successful", "parameters": parameters}


# 创建全局实例
enhanced_tool_router = EnhancedToolRouter() 