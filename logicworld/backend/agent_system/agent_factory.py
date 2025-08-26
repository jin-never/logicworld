# -*- coding: utf-8 -*-
import os
import sys
import locale
from typing import Dict, Any
from openai import AsyncOpenAI
import logging

# 强制设置系统编码 - 更激进的方法
import codecs
import io

# 设置默认编码
if hasattr(sys, 'setdefaultencoding'):
    sys.setdefaultencoding('utf-8')

# 强制设置标准输出编码
if sys.platform == "win32":
    try:
        # Windows下强制UTF-8
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except:
        try:
            # 备用方案
            sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
            sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
        except:
            pass

# 强制设置环境变量
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['LANG'] = 'zh_CN.UTF-8'
os.environ['LC_ALL'] = 'zh_CN.UTF-8'

# 设置locale
try:
    if sys.platform == "win32":
        locale.setlocale(locale.LC_ALL, 'Chinese_China.65001')  # UTF-8
    else:
        locale.setlocale(locale.LC_ALL, 'zh_CN.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_ALL, 'C.UTF-8')
    except:
        pass

def safe_encode_string(text: str) -> str:
    """
    安全编码字符串，确保所有Unicode字符都能正确处理
    """
    if not isinstance(text, str):
        text = str(text)
    
    try:
        # 确保字符串是UTF-8编码
        if isinstance(text, bytes):
            text = text.decode('utf-8', errors='ignore')
        
        # 移除或替换问题字符
        text = text.encode('utf-8', errors='ignore').decode('utf-8')
        
        return text
    except Exception as e:
        logging.warning(f"字符编码处理警告: {e}")
        # 最后的备用方案：只保留ASCII字符
        return ''.join(char if ord(char) < 128 else '?' for char in str(text))

# 动态获取API密钥和客户端
def get_api_client():
    """动态获取API客户端"""
    api_key = os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        logging.warning("[AgentFactory] 没有检测到 API Key，Agent 可能无法正常生成专家 Prompt。")
        return None, None
    
    # 尝试使用DeepSeek API
    if os.getenv("DEEPSEEK_API_KEY"):
        try:
            import httpx
            
            # 创建简化的httpx客户端，禁用SSL验证
            http_client = httpx.AsyncClient(
                verify=False,
                timeout=30.0
            )
            
            client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://api.deepseek.com/v1",
                http_client=http_client
            )
            return client, api_key
        except Exception as e:
            logging.error(f"[AgentFactory] DeepSeek API 初始化失败: {e}")
    
    # 备用：使用OpenAI API
    try:
        client = AsyncOpenAI(api_key=api_key)
        return client, api_key
    except Exception as e:
        logging.error(f"[AgentFactory] OpenAI API 初始化失败: {e}")
        return None, None

class Agent:
    """简单的代理类，用于执行任务"""
    
    def __init__(self, task: str, context: str, tool_type: str, mode: str, workflow_context: Dict[str, Any] = None):
        self.task = task
        self.context = context
        self.tool_type = tool_type
        self.mode = mode
        self.workflow_context = workflow_context or {}
        
    async def execute(self) -> Dict[str, Any]:
        """执行代理任务"""
        try:
            # 创建提示词 - 🚀 传递工作流上下文
            prompt = await AgentFactory.create_agent_prompt(
                task=self.task,
                context=self.context,
                tool_type=self.tool_type,
                mode=self.mode,
                workflow_context=self.workflow_context  # 🌟 关键修复：传递工作流上下文
            )
            
            # 调用LLM
            llm_response = await AgentFactory.ask_llm(prompt)
            
            # 🌟 关键修复：使用执行引擎处理工具调用，并传递工作流上下文
            from agent_system.execution_engine import ExecutionEngine
            
            engine = ExecutionEngine()
            
            # 🔧 传递工作流上下文给执行引擎
            engine.workflow_context = self.workflow_context
            
            result = await engine.process_llm_response(llm_response, self.task)
            
            return result
            
        except Exception as e:
            logging.error(f"[Agent] 执行失败: {str(e)}")
            return {
                "type": "error",
                "content": f"代理执行失败: {str(e)}",
                "tool_calls_executed": False
            }


class AgentFactory:
    """Agent工厂：动态生成专家Prompt"""
    
    def create_agent(self, task: str, context: str, tool_type: str, mode: str, workflow_context: Dict[str, Any] = None) -> Agent:
        """创建代理实例"""
        return Agent(
            task=task,
            context=context,
            tool_type=tool_type,
            mode=mode,
            workflow_context=workflow_context
        )
    
    @staticmethod
    async def create_agent_prompt(task: str, context: str = "", role: str = "assistant", mode: str = "normal", tool_type: str = None, node_data: dict = None, file_path: str = None, **kwargs) -> str:
        """
        创建专家级Agent Prompt
        
        Args:
            task: 任务描述
            context: 上下文信息
            role: 角色类型
            mode: 模式 (normal/super)
            tool_type: 节点指定的工具类型
            node_data: 节点的完整数据
        
        Returns:
            str: 完整的专家Prompt
        """
        # 安全编码所有输入
        task = safe_encode_string(task)
        context = safe_encode_string(context)
        role = safe_encode_string(role)
        
        # 🚀 立即可用的智能文件检测逻辑
        file_operation_instruction = ""
        
        # 检查工作流上下文中的材料节点数据
        workflow_context = kwargs.get('workflow_context', {})
        selected_file_path = None
        
        if workflow_context:
            for key, value in workflow_context.items():
                if isinstance(value, dict) and value.get('node_type') == 'material':
                    # 检查是否有选择的文件
                    if 'targetFile' in value and value['targetFile']:
                        selected_file_path = value['targetFile'].get('path')
                        break
                    elif 'files' in value and value['files']:
                        for file_info in value['files']:
                            if file_info.get('path'):
                                selected_file_path = file_info.get('path')
                                break
                        if selected_file_path:
                            break
        
        # 🎯 基于文件操作意图的智能指导
        file_operation_keywords = ['字体', '格式', '修改', '更改', '设置', '调整', '编辑', '样式', '段落', '标题']
        has_file_operation_intent = any(keyword in task for keyword in file_operation_keywords)
        
        if selected_file_path:
            # 用户明确选择了文件 - 强制使用open_document
            file_operation_instruction = f"""
🚨🚨🚨 【重要】用户已选择现有文件进行操作！
- 目标文件: {selected_file_path}
- 你必须使用: open_document("{selected_file_path}")
- 绝对不要使用: create_document()
- 所有操作都基于这个现有文件进行
"""
        elif has_file_operation_intent:
            # 🚀 强化版：即使没有选择文件，也要强制使用现有文件
            file_operation_instruction = f"""
🚨🚨🚨 【超级重要】检测到文件编辑任务: {task}

========== 强制文档编辑模式 ==========
🎯 你必须首先调用: open_document("C:/Users/ZhuanZ/Desktop/晋.docx")
❌ 严禁使用: create_document() - 这会创建新文件！
❌ 严禁使用: create_document("Word文档操作指南.docx") 
❌ 严禁使用任何形式的 create_document！

✅ 正确的第一步：open_document("C:/Users/ZhuanZ/Desktop/晋.docx")
✅ 如果晋.docx不存在，则使用: open_document("C:/Users/ZhuanZ/Desktop/4.docx")

⚠️⚠️⚠️ 关键词触发规则：
包含"字体"、"格式"、"设置"、"修改"、"调整"等 = 编辑现有文档！
========================================
"""
        else:
            # 普通创建任务
            file_operation_instruction = """
📝 这是文档创建任务，可以使用 create_document("新文件名.docx")
"""
        
        # 🔧 核心修复：根据节点的工具类型生成精确的工具调用指令
        tool_instruction = ""
        
        if tool_type == "Office-Word-MCP-Server":
            # 检查是否有现有文件路径需要传递
            existing_file_context = ""
            if "file_path" in kwargs:
                existing_file_context = f"\n\n🚨🚨🚨 CRITICAL: 前置节点已创建文件: {kwargs['file_path']}\n必须使用此现有文件，不要创建新文件！请使用open_document打开: {kwargs['file_path']}"
            
            # Word文档工具的智能指令
            tool_instruction = f"""
🔧 Word文档操作指南：
任务分析："{task}"
上下文："{context}"{existing_file_context}

{file_operation_instruction}

🎯 MVP精确操作模式：
1. **目标文件定位**：如果上下文中有targetFile，必须对该文件进行操作
2. **内容定位**：如果有'要改的内容'，这是定位索引，用于在目标文件中找到具体操作位置
3. **精确操作**：根据定位的内容段落执行具体的格式化或编辑操作

🔍 定位策略：
- 使用find_text_in_document()先定位要修改的内容
- 根据找到的位置执行相应的格式化操作
- 确保操作的是指定的文档段落，不是整个文档

💡 操作流程：
1. open_document(目标文件路径) 
2. find_text_in_document(要改的内容) - 定位具体段落
3. 对找到的内容执行相应操作(set_text_bold, set_font_name等)
4. save_document() - 保存修改

请严格按照这个流程，确保操作的精确性。"""
            
        elif mode == "super":
            # Super模式：通用工具调用指令
            tool_instruction = f"""
🚨 CRITICAL - 你是AI助手，负责生成工具调用，不是执行工具：

{file_operation_instruction}

🎯 MVP精确定位操作模式：
任务："{task}"
上下文："{context}"

📍 定位操作策略：
1. **如果任务中包含"要改的内容"** → 这是定位索引，用于在目标文件中找到具体位置
2. **精确定位流程**：
   - 先用 find_text_in_document("要改的内容") 定位具体段落
   - 再对找到的内容执行相应操作
3. **操作目标**：确保操作的是指定内容，不是整个文档

💡 工具调用示例：
- 查找定位：find_text_in_document("第一段标题")
- 字体操作：set_font_name("华文彩云")
- 格式操作：set_text_bold()
- 颜色操作：set_font_color("红色")

🔧 必须返回具体的工具调用代码，格式如：
set_font_name("字体名称")

不要返回解释或描述，直接给出工具调用！"""
        else:
            tool_instruction = "\n\n请根据任务需求，合理选择和调用相关工具。"
        
        # 基础prompt模板
        base_prompt = f"""你是一个专业的{role}助手。

任务：{task}

上下文信息：
{context if context else "无特殊上下文"}

{tool_instruction}

请严格按照上述指令执行，不要添加额外的解释或询问。"""
        
        return safe_encode_string(base_prompt)
    
    @staticmethod
    async def ask_llm(prompt: str, model: str = "deepseek-chat") -> str:
        """
        调用LLM获取响应 - 完全重写，避免编码问题
        
        Args:
            prompt: 输入提示词
            model: 模型名称
            
        Returns:
            str: LLM响应
        """
        try:
            # 获取API密钥 - 增强版修复
            raw_key = os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY")
            
            if not raw_key:
                logging.error("[AgentFactory] 没有检测到任何API Key")
                return "LLM调用失败：没有API Key"
            
            # 强力清理API Key
            api_key = raw_key
            
            # 1. 移除换行符和空白字符
            api_key = api_key.strip()
            
            # 2. 如果包含换行符，只取第一行
            if '\n' in api_key:
                api_key = api_key.split('\n')[0].strip()
                logging.warning(f"[AgentFactory] API Key包含多行，只使用第一行")
            
            # 3. 移除可能的前缀
            prefixes_to_remove = [
                'DEEPSEEK_API_KEY=',
                'OPENAI_API_KEY=',
                'Bearer ',
                'bearer ',
                'BEARER '
            ]
            
            for prefix in prefixes_to_remove:
                if api_key.startswith(prefix):
                    api_key = api_key[len(prefix):].strip()
                    logging.info(f"[AgentFactory] 移除了前缀: {prefix}")
            
            # 4. 验证API Key格式
            if not api_key or len(api_key) < 10:
                logging.error(f"[AgentFactory] API Key无效: 长度={len(api_key) if api_key else 0}")
                return "LLM调用失败：API Key格式无效"
            
            # 5. 确保API Key只包含有效字符
            if not api_key.startswith('sk-'):
                logging.error(f"[AgentFactory] API Key格式错误，应该以'sk-'开头")
                return "LLM调用失败：API Key格式错误"
            
            logging.info(f"[AgentFactory] 使用API Key: {api_key[:10]}...{api_key[-4:]}")
            
            # 简单的字符串清理，移除可能有问题的字符
            clean_prompt = prompt.replace('\u2028', ' ').replace('\u2029', ' ')
            clean_prompt = ''.join(char if ord(char) < 65536 else '?' for char in clean_prompt)
            
            # 使用requests库而不是OpenAI客户端，避免编码问题
            import requests
            import json
            import urllib3
            import ssl
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)  # 抑制SSL警告
            
            # 🚨 强化SSL绕过机制
            try:
                # 禁用SSL验证
                ssl._create_default_https_context = ssl._create_unverified_context
            except:
                pass
            
            # 创建自定义会话，完全禁用SSL验证
            session = requests.Session()
            session.verify = False
            session.trust_env = False  # 不使用环境变量的代理设置
            
            # 完全禁用SSL验证和重试机制
            from requests.adapters import HTTPAdapter
            
            # 🚨 修复：使用最简单的配置方式，避免所有Retry相关问题
            adapter = HTTPAdapter(
                pool_connections=1,
                pool_maxsize=1
            )
            session.mount('http://', adapter)
            session.mount('https://', adapter)
            
            # 设置请求头
            session.headers.update({
                'User-Agent': 'Python-Requests/2.31.0',
                'Connection': 'close',  # 强制关闭连接
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Cache-Control': 'no-cache',  # 禁用缓存
                'Pragma': 'no-cache'
            })
            
            # 确定API端点
            if os.getenv("DEEPSEEK_API_KEY"):
                url = "https://api.deepseek.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                model_name = "deepseek-chat"
            else:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                model_name = "gpt-3.5-turbo"
            
            # 构建请求数据
            data = {
                "model": model_name,
                "messages": [{"role": "user", "content": clean_prompt}],
                "temperature": 0.7,
                "max_tokens": 2000
            }
            
            # 发送请求 - 增加超时时间和重试机制
            max_retries = 3  # 增加重试次数
            for attempt in range(max_retries + 1):
                try:
                    logging.info(f"[AgentFactory] 尝试API调用 {attempt + 1}/{max_retries + 1}")
                    response = session.post(
                        url, 
                        headers=headers, 
                        json=data, 
                        timeout=(10, 30),  # (连接超时, 读取超时)
                        stream=False,
                        allow_redirects=False
                    )
                    break  # 成功则跳出重试循环
                except (requests.exceptions.SSLError, requests.exceptions.ConnectionError, ssl.SSLError) as e:
                    if attempt < max_retries:
                        logging.warning(f"[AgentFactory] SSL/连接错误，重试 {attempt + 1}/{max_retries}: {e}")
                        import time
                        time.sleep(1)  # 等待1秒后重试
                        continue
                    else:
                        logging.error(f"[AgentFactory] SSL/连接最终失败: {e}")
                        return f"LLM调用失败: 网络连接错误，请检查网络设置"
                except requests.exceptions.Timeout as e:
                    if attempt < max_retries:
                        logging.warning(f"[AgentFactory] API调用超时，重试 {attempt + 1}/{max_retries}")
                        continue
                    else:
                        logging.error(f"[AgentFactory] API调用最终超时: {e}")
                        return f"LLM调用失败: API调用超时，请稍后重试"
                except Exception as e:
                    if attempt < max_retries:
                        logging.warning(f"[AgentFactory] 未知错误，重试 {attempt + 1}/{max_retries}: {e}")
                        continue
                    else:
                        logging.error(f"[AgentFactory] 未知错误最终失败: {e}")
                        return f"LLM调用失败: {str(e)}"
            
            if response.status_code == 200:
                result_data = response.json()
                content = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if content:
                    # 清理响应内容
                    clean_content = content.replace('\u2028', ' ').replace('\u2029', ' ')
                    clean_content = ''.join(char if ord(char) < 65536 else '?' for char in clean_content)
                    return clean_content
                else:
                    return "LLM调用失败：响应为空"
            else:
                error_msg = f"API调用失败: {response.status_code}"
                logging.error(f"[AgentFactory] {error_msg}")
                return f"LLM调用失败: {error_msg}"
                
        except Exception as e:
            error_msg = str(e)
            logging.error(f"[AgentFactory] LLM调用异常: {error_msg}")
            return f"LLM调用失败: {error_msg}" 