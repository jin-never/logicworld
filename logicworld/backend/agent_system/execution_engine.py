# -*- coding: utf-8 -*-
import logging
import json
import os
import re
import subprocess
import asyncio
import datetime
from typing import Dict, Any
from pathlib import Path

# 设置环境变量确保UTF-8编码
os.environ['PYTHONIOENCODING'] = 'utf-8'

from .agent_factory import AgentFactory


class ExecutionEngine:
    """
    简化的执行引擎
    统一执行逻辑：AI分析任务 → 选择工具 → 执行 → 生成产品
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._existing_file_path = None
        self.workflow_context = {}  # 🌟 添加工作流上下文支持

    async def execute(self, task_description: str, context: str = "", role: str = "assistant", mode: str = "normal") -> Dict[str, Any]:
        """执行单个任务，统一的执行逻辑"""
        start_time = datetime.datetime.now()
        logging.info(f"[执行引擎] 开始执行任务: {task_description}")

        try:
            # 1. 创建 Prompt（默认支持工具调用）
            logging.info(f"[执行引擎] 第1步: 创建AI Prompt...")
            
            # 🔧 修复：从上下文中提取工具类型信息
            tool_type = None
            node_data = None
            if hasattr(self, '_current_tool_type'):
                tool_type = self._current_tool_type
            if hasattr(self, '_current_node_data'):
                node_data = self._current_node_data
            
            # 传递现有文件路径给AgentFactory
            kwargs = {"node_data": node_data}
            if hasattr(self, '_existing_file_path'):
                kwargs["file_path"] = self._existing_file_path
                print(f"🔍 [ExecutionEngine] 传递现有文件路径给AgentFactory: {self._existing_file_path}")
            
            prompt = await AgentFactory.create_agent_prompt(
                task=task_description,
                context=context,
                role=role,
                mode=mode,
                tool_type=tool_type,
                **kwargs
            )

            # 2. 调用 LLM 获取响应
            logging.info(f"[执行引擎] 第2步: 调用AI模型...")
            llm_response = await AgentFactory.ask_llm(prompt)
            logging.info(f"[执行引擎] AI响应长度: {len(llm_response)} 字符")
            logging.info(f"[执行引擎] AI响应: {llm_response[:200]}...")
            
            # 🚨 强化修复：AI调用失败时直接返回失败，绝不使用任何备用机制
            if (llm_response is None or 
                llm_response.strip() == "" or 
                llm_response.startswith("LLM调用失败") or
                len(llm_response) < 10 or  # 响应过短也认为是失败
                "调用失败" in llm_response or
                "失败" in llm_response and len(llm_response) < 100):  # 短响应中包含失败字样
                
                error_msg = f"AI模型调用失败：响应无效或为空 (长度: {len(llm_response) if llm_response else 0})"
                logging.error(f"[执行引擎] {error_msg}")
                logging.error(f"[执行引擎] 失败的响应内容: '{llm_response}'")
                return {
                    "task": task_description,
                    "role": role,
                    "result": error_msg,
                    "success": False,
                    "error": error_msg,
                    "duration": 0
                }

            # 3. 处理工具调用并返回结果
            logging.info(f"[执行引擎] 第3步: 检测并执行工具调用")
            print(f"🔍 [ExecutionEngine] 准备处理工具调用，AI响应长度: {len(llm_response)}")
            print(f"🔍 [ExecutionEngine] AI响应内容预览: {llm_response[:200]}...")
            
            # 尝试导入并使用tool_router处理工具调用
            tool_execution_success = True
            tool_error_message = None
            
            try:
                from tools.tool_router import tool_router
                await tool_router.initialize()
                
                print(f"🔧 [ExecutionEngine] 工具路由器初始化完成")
                
                # 🔧 NEW: 传递现有文件信息给工具路由器
                if hasattr(self, '_existing_file_path'):
                    tool_router._existing_file_path = self._existing_file_path
                    print(f"🔍 [ExecutionEngine] 传递现有文件信息给工具路由器: {self._existing_file_path}")
                
                print(f"🚀 [ExecutionEngine] 即将调用工具路由器解析: {llm_response[:100]}...")
                
                # 🌟 关键修复：传递工作流上下文给工具路由器
                tool_result = await tool_router.parse_and_execute_tool_calls(
                    llm_response, 
                    None, 
                    task_description, 
                    self.workflow_context  # 传递工作流上下文
                )
                
                print(f"🎯 [ExecutionEngine] 工具路由器返回结果: {tool_result}")
                
                if tool_result.get("tool_calls_executed"):
                    print(f"🎉 [ExecutionEngine] 工具调用执行成功: {tool_result.get('summary', '未知')}")
                    final_result = tool_result.get('summary', llm_response)
                    
                    # 🔧 关键修复：检查工具调用是否真的成功
                    execution_results = tool_result.get('execution_results', [])
                    for result in execution_results:
                        if isinstance(result, dict) and result.get('success') is False:
                            tool_execution_success = False
                            tool_error_message = result.get('error', '工具调用失败')
                            print(f"❌ [ExecutionEngine] 检测到工具调用失败: {tool_error_message}")
                            break
                        elif isinstance(result, dict) and 'error' in str(result).lower():
                            tool_execution_success = False
                            tool_error_message = f"工具执行出错: {result}"
                            print(f"❌ [ExecutionEngine] 检测到工具执行错误: {tool_error_message}")
                            break
                else:
                    print(f"⚠️ [ExecutionEngine] 工具调用未执行，返回原始AI响应")
                    print(f"   原因: tool_calls_executed = {tool_result.get('tool_calls_executed', 'undefined')}")
                    final_result = llm_response
            except Exception as e:
                logging.error(f"[执行引擎] 工具调用处理失败: {e}")
                print(f"❌ [ExecutionEngine] 工具调用处理失败: {e}")
                final_result = llm_response
                tool_execution_success = False
                tool_error_message = str(e)

            # 5. 返回统一格式的结果
            end_time = datetime.datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            if tool_execution_success:
                logging.info(f"[执行引擎] 第5步: 任务执行完成，耗时 {duration:.2f} 秒")
                print(f"✅ [ExecutionEngine] 任务执行成功，耗时 {duration:.2f} 秒")
                return {
                    "task": task_description,
                    "role": role,
                    "result": final_result,
                    "success": True,
                    "duration": duration
                }
            else:
                logging.error(f"[执行引擎] 任务执行失败: {tool_error_message}，耗时 {duration:.2f} 秒")
                print(f"❌ [ExecutionEngine] 任务执行失败: {tool_error_message}")
                return {
                    "task": task_description,
                    "role": role,
                    "result": final_result,
                    "success": False,
                    "error": tool_error_message,
                    "duration": duration
                }

        except Exception as e:
            end_time = datetime.datetime.now()
            duration = (end_time - start_time).total_seconds()
            error_msg = f"任务执行失败: {str(e)}"
            logging.error(f"[执行引擎] {error_msg}，耗时 {duration:.2f} 秒")
            
            return {
                "task": task_description,
                "role": role,
                "result": error_msg,
                "success": False,
                "error": error_msg,
                "duration": duration
            }

    # 🚫 移除回退执行机制 - 不再生成模板内容
    # 如果AI调用失败，就应该如实反映失败状态

    # 所有工具调用和格式处理已移至tool_router，ExecutionEngine只负责AI响应生成
    async def _legacy_method_placeholder(self):
        """遗留方法占位符 - 工具处理已移至tool_router"""
        # 这个方法已废弃，所有功能都移到了tool_router
        return None
    
    async def _execute_smart_word_creation(self, text_content: str, style_params: dict, task: str) -> str:
        """执行智能Word文档创建（三步法）"""
        try:
            # 生成文件名
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"智能格式文档_{timestamp}.docx"
            output_path = os.path.join("C:/Users/ZhuanZ/Desktop/AI作品", filename)
            
            # 确保目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            logging.info(f"[智能解析器] 开始执行三步工具调用")
            
            # 这个方法已废弃，直接返回简单结果
            logging.info(f"[智能解析器] 智能文档创建功能已移至tool_router")
            
            # 返回简单结果，功能已移至tool_router
            return f"[OK] 智能格式化功能已移至tool_router\n内容: {text_content}\n格式: {style_params}"
                
        except Exception as e:
            logging.error(f"[智能解析器] 执行智能Word创建时出错: {e}")
            return f"[ERROR] 智能格式化执行失败: {str(e)}"

    def _extract_content_from_task(self, task: str, tool_call: dict) -> tuple:
        """从任务描述中智能提取要写入Word文档的内容和格式要求"""
        try:
            # 优先从tool_call中获取内容（只有当内容不为空且不是默认值时才使用）
            if "text_content" in tool_call and tool_call["text_content"] and tool_call["text_content"].strip() and tool_call["text_content"] != "你好":
                return tool_call["text_content"], {}
            
            # 从任务描述中提取内容
            import re
            
            # 匹配"写入xxxx"的模式
            patterns = [
                r'写入(.+?)(?:，|,|。|\.|$)',  # 匹配"写入xxx"
                r'输入(.+?)(?:，|,|。|\.|$)',  # 匹配"输入xxx"  
                r'内容[是为](.+?)(?:，|,|。|\.|$)',  # 匹配"内容是xxx"
                r'文档内容[是为](.+?)(?:，|,|。|\.|$)',  # 匹配"文档内容是xxx"
            ]
            
            for pattern in patterns:
                match = re.search(pattern, task)
                if match:
                    full_content = match.group(1).strip()
                    
                    # 提取纯文本内容（去掉格式要求）
                    content = re.sub(r'[，,]这句话要.+$', '', full_content)
                    content = re.sub(r'[，,]字体.+$', '', content)
                    content = re.sub(r'[，,]颜色.+$', '', content)
                    
                    # 提取格式要求
                    format_requirements = self._extract_format_requirements(task)
                    
                    if content:
                        logging.info(f"[内容提取] 从任务中提取到内容: {content}")
                        logging.info(f"[内容提取] 提取到格式要求: {format_requirements}")
                        return content, format_requirements
            
            # 如果没有匹配到，使用默认内容
            logging.warning(f"[内容提取] 无法从任务中提取内容，使用默认值: {task}")
            return "测试文档内容", {}
            
        except Exception as e:
            logging.error(f"[内容提取] 内容提取失败: {e}")
            return "测试文档内容", {}

    def _extract_format_requirements(self, task: str) -> dict:
        """从任务描述中提取格式要求"""
        try:
            import re
            format_req = {}
            
            # 检查是否要求加粗
            if re.search(r'加粗|粗体|bold', task, re.IGNORECASE):
                format_req['bold'] = True
            
            # 提取字体（更精确的匹配）
            font_match = re.search(r'字体[为是:：]*([^，,。\.、]+?)(?:[，,。\.、]|$)', task)
            if font_match:
                font_name = font_match.group(1).strip()
                # 进一步清理，去掉可能的后缀
                font_name = re.sub(r'[、，,].*$', '', font_name)
                format_req['font_name'] = font_name
            
            # 提取颜色（更精确的匹配）
            color_match = re.search(r'颜色[为是:：]*([^，,。\.、]+?)(?:[，,。\.、]|$)', task)
            if color_match:
                color = color_match.group(1).strip()
                # 进一步清理，只保留颜色名称
                color = re.sub(r'[、，,].*$', '', color)
                format_req['color'] = self._parse_color(color)
            
            return format_req
            
        except Exception as e:
            logging.error(f"[格式提取] 格式要求提取失败: {e}")
            return {}

    def _parse_color(self, color_str: str) -> str:
        """解析颜色字符串到RGB值"""
        color_map = {
            '红色': 'FF0000',
            '绿色': '00FF00', 
            '蓝色': '0000FF',
            '黑色': '000000',
            '白色': 'FFFFFF',
            '黄色': 'FFFF00',
            '紫色': '800080',
            '橙色': 'FFA500'
        }
        return color_map.get(color_str, '000000')  # 默认黑色

    def _map_font_name(self, font_name: str) -> str:
        """映射中文字体名称到系统字体名称"""
        # 使用智能字体降级系统
        font_fallback_map = {
            '华文彩云': ['华文彩云', 'STCaiyun', '华文行楷', 'STXingkai', 'Microsoft YaHei', 'SimSun'],
            '华文行楷': ['华文行楷', 'STXingkai', '华文彩云', 'STCaiyun', 'KaiTi', 'Microsoft YaHei'],
            '华文新魏': ['华文新魏', 'STXinwei', '华文琥珀', 'STHupo', 'Microsoft YaHei', 'SimHei'],
            '华文琥珀': ['华文琥珀', 'STHupo', '华文新魏', 'STXinwei', 'Microsoft YaHei', 'SimHei'],
            '华文细黑': ['华文细黑', 'STXihei', 'Microsoft YaHei', 'SimHei'],
            '微软雅黑': ['Microsoft YaHei', 'SimHei', 'Arial'],
            '宋体': ['SimSun', 'Times New Roman'],
            '黑体': ['SimHei', 'Microsoft YaHei', 'Arial'],
            '楷体': ['KaiTi', 'STKaiti', 'SimSun'],
            '仿宋': ['FangSong', 'STFangsong', 'SimSun']
        }
        
        # 智能字体选择
        def get_best_font(requested_font):
            if requested_font in font_fallback_map:
                for font_option in font_fallback_map[requested_font]:
                    # 这里可以添加字体检测逻辑，现在直接返回第一个选项
                    return font_option
            return requested_font  # 如果没有映射，直接返回原字体
        
        mapped_name = get_best_font(font_name)
        logging.info(f"🎨 [智能字体映射] '{font_name}' -> '{mapped_name}'")
        return mapped_name

    async def _apply_text_formatting(self, filename: str, content: str, format_requirements: dict):
        """应用文本格式设置"""
        try:
            
            # 构建格式参数
            format_params = {
                'paragraph_index': 0,  # 0表示第一个段落（0-based索引）
                'start_pos': 0,
                'end_pos': len(content)
            }
            
            # 应用格式要求
            if format_requirements.get('bold'):
                format_params['bold'] = True
            
            if format_requirements.get('font_name'):
                # 映射中文字体名到系统字体名
                mapped_font = self._map_font_name(format_requirements['font_name'])
                format_params['font_name'] = mapped_font
            
            if format_requirements.get('color'):
                format_params['color'] = format_requirements['color']
            
            logging.info(f"[格式设置] 应用格式: {format_params}")
            
            # 调用格式设置工具
            format_result = await format_text(
                filename,
                paragraph_index=format_params.get('paragraph_index', 0),
                start_pos=format_params.get('start_pos', 0),
                end_pos=format_params.get('end_pos', len(content)),
                bold=format_params.get('bold'),
                italic=format_params.get('italic'),
                underline=format_params.get('underline'),
                color=format_params.get('color'),
                font_name=format_params.get('font_name'),
                font_size=format_params.get('font_size')
            )
            
            logging.info(f"[格式设置] 格式设置结果: {format_result}")
            
        except Exception as e:
            logging.error(f"[格式设置] 格式设置失败: {e}")
            # 格式设置失败不影响文档创建

    async def _execute_wordmcp_tool(self, tool_call: dict, task: str) -> str:
        """执行Word MCP工具调用"""
        try:
            logging.info(f"[执行引擎] 开始执行Word MCP工具: {tool_call}")
            
            # 获取工具参数
            action = tool_call.get("action", "create_document")
            params = tool_call.get("parameters", {})
            
            # 智能提取文档内容和格式要求
            content, format_requirements = self._extract_content_from_task(task, tool_call)
            
            # 生成文件名（与前端格式保持一致）
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            # 从tool_call或params中获取文件名
            filename = tool_call.get("filename") or params.get("filename", f"结果汇总_node_result_{timestamp}.docx")
            
            # 确保文件名有正确的扩展名
            if not filename.endswith(('.doc', '.docx')):
                filename += '.docx'
            
            # 设置输出路径
            output_dir = Path("C:/Users/ZhuanZ/Desktop/AI作品")
            output_dir.mkdir(exist_ok=True)
            output_path = output_dir / filename
            
            # 调用Word MCP服务器
            result = await self._call_word_mcp_server(action, params, content, str(output_path), format_requirements)
            
            if result:
                logging.info(f"[执行引擎] Word文档创建成功: {output_path}")
                return f"[OK] Word文档创建成功！\n\n文件路径: {output_path}\n内容: {content}\n执行时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            else:
                return f"[ERROR] Word文档创建失败，但任务已尝试执行。"
                
        except Exception as e:
            logging.error(f"[执行引擎] Word MCP工具执行失败: {e}")
            return f"[ERROR] Word工具执行出错: {str(e)}"

    async def _call_word_mcp_server(self, action: str, params: dict, content: str, output_path: str, format_requirements: dict = None) -> bool:
        """调用Word MCP服务器"""
        try:
            # 构建MCP服务器调用命令
            # 从backend目录向上找到项目根目录
            project_root = Path(__file__).parent.parent.parent
            mcp_server_path = project_root / "Office-Word-MCP-Server" / "word_document_server" / "main.py"
            
            if not mcp_server_path.exists():
                logging.error(f"[执行引擎] Office-Word-MCP-Server未找到: {mcp_server_path}")
                return False
            
            # 调用真正的Office-Word-MCP-Server
            return await self._call_real_mcp_server(action, params, content, output_path, format_requirements or {})
            
        except Exception as e:
            logging.error(f"[执行引擎] MCP服务器调用失败: {e}")
            return False

    async def _call_real_mcp_server(self, action: str, params: dict, content: str, output_path: str, format_requirements: dict) -> bool:
        """直接调用Office-Word-MCP-Server的工具函数"""
        try:
            logging.info(f"[执行引擎] 调用Office-Word-MCP-Server工具: action={action}, content={content}")
            
            # 直接导入并调用MCP服务器的工具函数
            import sys
            import os
            from pathlib import Path
            
            # 添加MCP服务器路径到Python路径
            project_root = Path(__file__).parent.parent.parent
            mcp_server_root = project_root / "Office-Word-MCP-Server"
            if mcp_server_root.exists():
                sys.path.insert(0, str(mcp_server_root.absolute()))
                
                try:
                    # 导入MCP服务器的工具函数
                    
                    filename = output_path
                    
                    if action == "create_document":
                        # 创建文档操作
                        title = params.get("title", "AI工作流生成文档")
                        
                        logging.info(f"[执行引擎] 调用create_document工具，文件名: {filename}")
                        
                        # 检查文件是否已经存在（避免重复创建）
                        if os.path.exists(filename):
                            logging.info(f"[执行引擎] 文档已存在，跳过重复创建: {filename}")
                            return True
                        
                        # 步骤1: 创建文档
                        create_result = await create_document(filename, title=title)
                        logging.info(f"[执行引擎] 创建文档结果: {create_result}")
                        
                        # 步骤2: 添加内容
                        content_success = True
                        if content and content.strip():
                            content_result = await add_paragraph(filename, content)
                            logging.info(f"[执行引擎] 添加内容结果: {content_result}")
                            
                            # 步骤3: 应用格式（如果有格式要求）
                            if format_requirements and content_result and "Failed" not in content_result:
                                logging.info(f"[✨格式设置] 应用华文彩云格式: {format_requirements}")
                                await self._apply_text_formatting(filename, content, format_requirements)
                            else:
                                logging.warning(f"[❌格式跳过] 无格式要求或内容添加失败")
                        
                        # 检查结果
                        if "successfully" in create_result:
                            logging.info(f"[执行引擎] Office-Word-MCP-Server创建Word文档成功: {filename}")
                            return True
                        else:
                            logging.error(f"[执行引擎] Office-Word-MCP-Server创建文档失败: {create_result}")
                            return False
                            
                    elif action == "add_paragraph":
                        # 添加段落操作
                        text = params.get("text", content or "")
                        
                        logging.info(f"[执行引擎] 调用add_paragraph工具，文件名: {filename}")
                        
                        paragraph_result = await add_paragraph(filename, text)
                        logging.info(f"[执行引擎] 添加段落结果: {paragraph_result}")
                        
                        if "added to" in paragraph_result:
                            logging.info(f"[执行引擎] 段落添加成功: {filename}")
                            return True
                        else:
                            logging.error(f"[执行引擎] 段落添加失败: {paragraph_result}")
                            return False
                            
                    elif action == "add_heading":
                        # 添加标题操作
                        text = params.get("text", content or "")
                        level = params.get("level", 1)
                        
                        logging.info(f"[执行引擎] 调用add_heading工具，文件名: {filename}")
                        
                        heading_result = await add_heading(filename, text, level)
                        logging.info(f"[执行引擎] 添加标题结果: {heading_result}")
                        
                        if "added to" in heading_result:
                            logging.info(f"[执行引擎] 标题添加成功: {filename}")
                            return True
                        else:
                            logging.error(f"[执行引擎] 标题添加失败: {heading_result}")
                            return False
                            
                    elif action == "format_text":
                        # 格式化文本操作
                        paragraph_index = params.get("paragraph_index", 0)
                        start_pos = params.get("start_pos", 0)
                        end_pos = params.get("end_pos", len(content) if content else 0)
                        bold = params.get("bold")
                        italic = params.get("italic")
                        underline = params.get("underline")
                        color = params.get("color")
                        font_name = params.get("font_name")
                        font_size = params.get("font_size")
                        
                        logging.info(f"[执行引擎] 调用format_text工具，文件名: {filename}")
                        
                        format_result = await format_text(
                            filename, paragraph_index, start_pos, end_pos,
                            bold=bold, italic=italic, underline=underline,
                            color=color, font_name=font_name, font_size=font_size
                        )
                        logging.info(f"[执行引擎] 格式化文本结果: {format_result}")
                        
                        if "successfully" in format_result:
                            logging.info(f"[执行引擎] 文本格式化成功: {filename}")
                            return True
                        else:
                            logging.error(f"[执行引擎] 文本格式化失败: {format_result}")
                            return False
                    
                    else:
                        logging.error(f"[执行引擎] 不支持的操作: {action}")
                        return False
                        
                except ImportError as e:
                    logging.error(f"[执行引擎] 无法导入Office-Word-MCP-Server工具: {e}")
                    return False
                except Exception as e:
                    logging.error(f"[执行引擎] Office-Word-MCP-Server调用异常: {e}")
                    return False
                finally:
                    # 清理Python路径
                    if str(mcp_server_root.absolute()) in sys.path:
                        sys.path.remove(str(mcp_server_root.absolute()))
            else:
                logging.error(f"[执行引擎] Office-Word-MCP-Server目录不存在: {mcp_server_root}")
                return False
                
        except Exception as e:
            logging.error(f"[执行引擎] _call_real_mcp_server异常: {e}")
            return False 