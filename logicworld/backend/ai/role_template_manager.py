"""
AI角色模板管理器
支持动态加载、缓存和渲染不同角色的prompt模板
"""

import yaml
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from functools import lru_cache

logger = logging.getLogger(__name__)


@dataclass
class RoleTemplate:
    """角色模板数据类"""
    name: str
    template: str
    variables: List[str]
    metadata: Dict[str, Any]
    
    @property
    def response_time(self) -> str:
        """获取响应时间类型"""
        return self.metadata.get('response_time', 'medium')
    
    @property
    def style(self) -> str:
        """获取响应风格"""
        return self.metadata.get('style', 'professional')
    
    @property
    def length(self) -> str:
        """获取响应长度"""
        return self.metadata.get('length', 'medium')


class RoleTemplateManager:
    """角色模板管理器"""
    
    def __init__(self, templates_file: str = None):
        if templates_file is None:
            # 动态确定文件路径
            current_dir = Path(__file__).parent.parent
            templates_file = current_dir / "prompts" / "role_templates.yaml"
        self.templates_file = Path(templates_file)
        self.templates: Dict[str, RoleTemplate] = {}
        self.intent_role_mapping = {
            'casual_chat': 'casual_chat_assistant',
            'question_answer': 'question_answer_expert',
            'consultation': 'consultation_advisor',
            'task_planning': 'task_planning_expert',
            'learning': 'learning_consultant',
            'life_assistance': 'life_assistant',
            'project_management': 'project_manager',
            'creative': 'creative_partner',
            'information_query': 'question_answer_expert',
            'clarification': 'casual_chat_assistant',
            'feedback': 'consultation_advisor'
        }
        self._load_templates()
    
    def _load_templates(self):
        """加载角色模板"""
        try:
            if not self.templates_file.exists():
                logger.warning(f"角色模板文件不存在: {self.templates_file}")
                self._create_default_templates()
                return
            
            with open(self.templates_file, 'r', encoding='utf-8') as f:
                templates_data = yaml.safe_load(f)
            
            for template_name, template_config in templates_data.items():
                if isinstance(template_config, dict):
                    self.templates[template_name] = RoleTemplate(
                        name=template_name,
                        template=template_config.get('template', ''),
                        variables=template_config.get('variables', []),
                        metadata=template_config.get('metadata', {})
                    )
            
            logger.info(f"成功加载 {len(self.templates)} 个角色模板")
            
        except Exception as e:
            logger.error(f"加载角色模板失败: {e}")
            self._create_default_templates()
    
    def _create_default_templates(self):
        """创建默认模板"""
        logger.info("创建默认角色模板")
        
        # 默认聊天模板
        self.templates['casual_chat_assistant'] = RoleTemplate(
            name='casual_chat_assistant',
            template='你是一个友好的AI助手。用户说：{user_input}\n\n请自然地回应。',
            variables=['user_input'],
            metadata={'response_time': 'fast', 'style': 'casual', 'length': 'short'}
        )
        
        # 默认规划模板
        self.templates['task_planning_expert'] = RoleTemplate(
            name='task_planning_expert',
            template='你是一个专业的规划师。任务需求：{user_input}\n\n请制定详细的执行计划。',
            variables=['user_input'],
            metadata={'response_time': 'slow', 'style': 'systematic', 'length': 'detailed'}
        )
    
    def get_role_by_intent(self, intent: str) -> str:
        """根据意图获取对应的角色"""
        return self.intent_role_mapping.get(intent, 'casual_chat_assistant')
    
    def get_template(self, role_name: str) -> Optional[RoleTemplate]:
        """获取角色模板"""
        return self.templates.get(role_name)
    
    def render_template(self, role_name: str, **variables) -> str:
        """渲染角色模板"""
        template = self.get_template(role_name)
        if not template:
            logger.warning(f"角色模板不存在: {role_name}")
            return f"你是一个AI助手，请回应：{variables.get('user_input', '')}"
        
        try:
            # 检查必需的变量
            missing_vars = set(template.variables) - set(variables.keys())
            if missing_vars:
                logger.warning(f"缺少模板变量: {missing_vars}")
                # 为缺失的变量提供默认值
                for var in missing_vars:
                    if var == 'user_input':
                        variables[var] = variables.get('user_input', '')
                    elif var == 'domain':
                        variables[var] = '通用'
                    elif var == 'context':
                        variables[var] = '无特殊背景'
                    elif var == 'user_background':
                        variables[var] = '未提供背景信息'
                    elif var == 'learning_goal':
                        variables[var] = '未明确学习目标'
                    elif var == 'urgency':
                        variables[var] = '一般'
                    elif var == 'project_scale':
                        variables[var] = '中等规模'
                    elif var == 'time_constraint':
                        variables[var] = '未明确时间限制'
                    elif var == 'creative_direction':
                        variables[var] = '开放性创意'
                    elif var == 'analysis_depth':
                        variables[var] = '标准分析'
                    elif var == 'output_format':
                        variables[var] = '结构化输出'
                    elif var == 'complexity_level':
                        variables[var] = '中等'
                    else:
                        variables[var] = '未提供'
            
            return template.template.format(**variables)
            
        except Exception as e:
            logger.error(f"渲染模板失败: {e}")
            return f"你是一个AI助手，请回应：{variables.get('user_input', '')}"
    
    def get_fast_roles(self) -> List[str]:
        """获取快速响应的角色列表"""
        return [
            name for name, template in self.templates.items()
            if template.response_time == 'fast'
        ]
    
    def get_slow_roles(self) -> List[str]:
        """获取需要深度思考的角色列表"""
        return [
            name for name, template in self.templates.items()
            if template.response_time == 'slow'
        ]
    
    def add_custom_role(self, role_name: str, template: str, variables: List[str], 
                       metadata: Dict[str, Any] = None):
        """添加自定义角色"""
        self.templates[role_name] = RoleTemplate(
            name=role_name,
            template=template,
            variables=variables,
            metadata=metadata or {}
        )
        logger.info(f"添加自定义角色: {role_name}")
    
    def save_templates(self):
        """保存模板到文件"""
        try:
            templates_data = {}
            for name, template in self.templates.items():
                templates_data[name] = {
                    'template': template.template,
                    'variables': template.variables,
                    'metadata': template.metadata
                }
            
            with open(self.templates_file, 'w', encoding='utf-8') as f:
                yaml.dump(templates_data, f, ensure_ascii=False, indent=2)
            
            logger.info("角色模板保存成功")
            
        except Exception as e:
            logger.error(f"保存角色模板失败: {e}")
    
    def reload_templates(self):
        """重新加载模板"""
        self.templates.clear()
        self._load_templates()
        logger.info("角色模板重新加载完成")


# 全局角色模板管理器实例
role_template_manager = RoleTemplateManager()
