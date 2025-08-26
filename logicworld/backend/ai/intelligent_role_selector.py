"""
智能角色选择器
根据用户输入自动选择最合适的AI角色模板
"""

import re
import yaml
import logging
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class RoleMatch:
    """角色匹配结果"""
    role_id: str
    role_name: str
    confidence: float
    reasoning: str
    template: str
    variables: Dict[str, Any]

class IntelligentRoleSelector:
    """智能角色选择器"""
    
    def __init__(self):
        self.roles = {}
        self.role_patterns = {}
        self._load_role_templates()
        self._initialize_patterns()
    
    def _load_role_templates(self):
        """加载角色模板"""
        try:
            template_path = Path(__file__).parent.parent / "prompts" / "role_templates.yaml"
            if template_path.exists():
                with open(template_path, 'r', encoding='utf-8') as f:
                    self.roles = yaml.safe_load(f)
                logger.info(f"✅ 加载了 {len(self.roles)} 个角色模板")
            else:
                logger.warning(f"❌ 角色模板文件不存在: {template_path}")
        except Exception as e:
            logger.error(f"❌ 加载角色模板失败: {e}")
    
    def _initialize_patterns(self):
        """初始化角色匹配模式"""
        self.role_patterns = {
            'casual_chat_assistant': {
                'keywords': ['你好', 'hi', 'hello', '聊天', '闲聊', '怎么样', '最近', '心情', '天气', '不错', '今天', '早上', '晚上', '周末'],
                'patterns': [r'你好', r'hi|hello', r'聊.*天', r'怎么样', r'最近.*如何', r'天气.*不错', r'今天.*天气', r'.*不错呢', r'早上好', r'晚上好'],
                'intent_types': ['greeting', 'casual', 'social', 'weather_talk'],
                'question_types': ['greeting', 'casual_inquiry', 'small_talk'],
                'confidence_base': 0.9
            },
            
            'question_answer_expert': {
                'keywords': ['什么是', '如何', '怎么', '为什么', '原理', '定义', '解释', '说明'],
                'patterns': [r'什么是', r'如何.*', r'怎么.*', r'为什么', r'.*原理', r'.*定义'],
                'intent_types': ['question', 'knowledge', 'explanation'],
                'question_types': ['what', 'how', 'why', 'definition'],
                'confidence_base': 0.9
            },
            
            'consultation_advisor': {
                'keywords': ['建议', '咨询', '应该', '选择', '决策', '方案', '策略', '建议'],
                'patterns': [r'.*建议', r'应该.*', r'.*选择', r'.*决策', r'.*方案', r'.*策略'],
                'intent_types': ['consultation', 'advice', 'decision'],
                'question_types': ['advice_seeking', 'decision_making'],
                'confidence_base': 0.85
            },
            
            'task_planning_expert': {
                'keywords': ['计划', '规划', '制定', '安排', '步骤', '流程', '执行', '实现'],
                'patterns': [r'制定.*计划', r'.*规划', r'.*步骤', r'如何实现', r'执行.*', r'.*流程'],
                'intent_types': ['planning', 'task_management', 'execution'],
                'question_types': ['planning', 'step_by_step'],
                'confidence_base': 0.9
            },
            
            'learning_consultant': {
                'keywords': ['学习', '教程', '入门', '掌握', '提升', '技能', '课程', '培训'],
                'patterns': [r'学习.*', r'.*教程', r'如何.*学', r'.*入门', r'提升.*技能'],
                'intent_types': ['learning', 'education', 'skill_development'],
                'question_types': ['learning_path', 'tutorial_request'],
                'confidence_base': 0.9
            },
            
            'life_assistant': {
                'keywords': ['生活', '日常', '家庭', '健康', '购物', '出行', '实用', '推荐'],
                'patterns': [r'日常.*', r'生活.*', r'.*推荐', r'实用.*', r'.*技巧'],
                'intent_types': ['life_help', 'practical', 'recommendation'],
                'question_types': ['practical_advice', 'recommendation'],
                'confidence_base': 0.8
            },
            
            'project_manager': {
                'keywords': ['项目', '管理', '团队', '协作', '工作流', '进度', '资源', '风险'],
                'patterns': [r'项目.*', r'.*管理', r'团队.*', r'工作流.*', r'.*进度', r'.*资源'],
                'intent_types': ['project_management', 'team_work', 'workflow'],
                'question_types': ['project_planning', 'team_management'],
                'confidence_base': 0.85
            },
            
            'creative_partner': {
                'keywords': ['创意', '想法', '设计', '创新', '灵感', '头脑风暴', '创作', '艺术'],
                'patterns': [r'创意.*', r'.*想法', r'设计.*', r'.*创新', r'.*灵感', r'头脑风暴'],
                'intent_types': ['creativity', 'brainstorming', 'design'],
                'question_types': ['creative_thinking', 'idea_generation'],
                'confidence_base': 0.8
            },

            'platform_assistant': {
                'keywords': ['逻辑世界', '平台', '功能', '介绍', '逻辑', '思维导图', '工作流', '助手', '系统', '特色', '使用', '操作', '你能', '你会', '你叫', '名字', '身份', '做什么', '干什么', '能力', '主要功能', '核心功能', '特点'],
                'patterns': [r'逻辑世界.*', r'平台.*功能', r'.*介绍.*平台', r'.*功能.*介绍', r'思维导图.*', r'工作流.*', r'.*助手.*', r'.*系统.*', r'你能.*', r'你会.*', r'你叫.*', r'.*做什么', r'.*干什么', r'.*能力.*', r'.*主要功能.*', r'.*核心功能.*', r'.*特点.*'],
                'intent_types': ['platform_inquiry', 'feature_introduction', 'system_help', 'self_introduction', 'capability_inquiry'],
                'question_types': ['platform_features', 'system_introduction', 'usage_guide', 'ai_capabilities', 'identity_inquiry'],
                'confidence_base': 0.98
            }
        }
    
    def analyze_user_input(self, user_input: str, context: Dict[str, Any] = None) -> RoleMatch:
        """分析用户输入并选择最合适的角色"""
        try:
            logger.info(f"🎭 开始智能角色选择分析: {user_input}")
            
            # 计算每个角色的匹配分数
            role_scores = {}
            
            for role_id, patterns in self.role_patterns.items():
                score = self._calculate_role_score(user_input, patterns)

                # 平台助手优先级提升：如果是平台相关问题，给予额外加分
                if role_id == 'platform_assistant':
                    platform_keywords = ['你能', '你会', '你叫', '做什么', '干什么', '能力', '功能', '介绍', '逻辑世界', '平台', '助手', '系统']
                    platform_boost = 0
                    for keyword in platform_keywords:
                        if keyword in user_input.lower():
                            platform_boost += 0.1
                    score = min(score + platform_boost, 1.0)

                role_scores[role_id] = score
                logger.debug(f"   {role_id}: {score:.3f}")

            # 选择得分最高的角色
            best_role_id = max(role_scores, key=role_scores.get)
            best_score = role_scores[best_role_id]
            
            # 如果最高分太低，使用默认的问答专家
            if best_score < 0.2:
                best_role_id = 'question_answer_expert'
                best_score = 0.5
                reasoning = "未找到明确匹配的角色，使用通用问答专家"
            else:
                reasoning = f"基于关键词和模式匹配，置信度: {best_score:.2f}"
            
            # 获取角色模板
            role_template = self.roles.get(best_role_id, {})
            role_name = self._get_role_display_name(best_role_id)
            
            # 准备模板变量
            variables = self._prepare_template_variables(user_input, best_role_id, context)
            
            result = RoleMatch(
                role_id=best_role_id,
                role_name=role_name,
                confidence=best_score,
                reasoning=reasoning,
                template=role_template.get('template', ''),
                variables=variables
            )
            
            logger.info(f"🎯 选择角色: {role_name} (置信度: {best_score:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"❌ 角色选择分析失败: {e}")
            # 返回默认角色
            return self._get_default_role(user_input)
    
    def _calculate_role_score(self, user_input: str, patterns: Dict) -> float:
        """计算角色匹配分数"""
        score = 0.0
        user_lower = user_input.lower()
        
        # 关键词匹配 (40%)
        keyword_matches = 0
        for keyword in patterns['keywords']:
            if keyword in user_lower:
                keyword_matches += 1
        
        if patterns['keywords']:
            keyword_score = min(keyword_matches / len(patterns['keywords']), 1.0) * 0.4
            score += keyword_score
        
        # 正则模式匹配 (40%)
        pattern_matches = 0
        for pattern in patterns['patterns']:
            if re.search(pattern, user_input, re.IGNORECASE):
                pattern_matches += 1
        
        if patterns['patterns']:
            pattern_score = min(pattern_matches / len(patterns['patterns']), 1.0) * 0.4
            score += pattern_score
        
        # 基础置信度 (20%)
        base_confidence = patterns.get('confidence_base', 0.5) * 0.2
        score += base_confidence
        
        return min(score, 1.0)
    
    def _get_role_display_name(self, role_id: str) -> str:
        """获取角色显示名称"""
        name_mapping = {
            'casual_chat_assistant': '闲聊助手',
            'question_answer_expert': '问答专家',
            'consultation_advisor': '咨询顾问',
            'task_planning_expert': '任务规划师',
            'learning_consultant': '学习顾问',
            'life_assistant': '生活助手',
            'project_manager': '项目经理',
            'creative_partner': '创意伙伴',
            'platform_assistant': '逻辑世界平台助手'
        }
        return name_mapping.get(role_id, role_id)
    
    def _prepare_template_variables(self, user_input: str, role_id: str, context: Dict = None) -> Dict[str, Any]:
        """准备模板变量"""
        variables = {
            'user_input': user_input
        }
        
        # 根据角色类型添加特定变量
        if role_id == 'question_answer_expert':
            variables['domain'] = self._detect_domain(user_input)
        
        elif role_id == 'consultation_advisor':
            variables['context'] = context.get('background', '无特殊背景') if context else '无特殊背景'
        
        elif role_id == 'task_planning_expert':
            variables.update({
                'context': context.get('background', '无特殊背景') if context else '无特殊背景',
                'analysis_depth': '详细',
                'output_format': 'markdown'
            })
        
        elif role_id == 'learning_consultant':
            variables.update({
                'user_background': context.get('background', '初学者') if context else '初学者',
                'learning_goal': self._extract_learning_goal(user_input)
            })
        
        elif role_id == 'life_assistant':
            variables['urgency'] = self._detect_urgency(user_input)
        
        elif role_id == 'project_manager':
            variables.update({
                'context': context.get('background', '无特殊背景') if context else '无特殊背景',
                'analysis_depth': '专业级'
            })
        
        elif role_id == 'creative_partner':
            variables['creative_direction'] = self._detect_creative_direction(user_input)

        elif role_id == 'platform_assistant':
            variables['user_context'] = context.get('background', '新用户') if context else '新用户'

        return variables
    
    def _detect_domain(self, user_input: str) -> str:
        """检测问题领域"""
        domains = {
            '技术': ['编程', '代码', '开发', '软件', '算法', '数据库', 'python', 'java', 'javascript'],
            '商业': ['商业', '营销', '销售', '管理', '企业', '市场'],
            '教育': ['学习', '教育', '培训', '课程', '知识'],
            '生活': ['生活', '健康', '家庭', '日常', '实用'],
            '科学': ['科学', '物理', '化学', '生物', '数学', '研究']
        }
        
        user_lower = user_input.lower()
        for domain, keywords in domains.items():
            if any(keyword in user_lower for keyword in keywords):
                return domain
        
        return '通用'
    
    def _extract_learning_goal(self, user_input: str) -> str:
        """提取学习目标"""
        if '入门' in user_input or '基础' in user_input:
            return '入门掌握'
        elif '精通' in user_input or '专业' in user_input:
            return '专业精通'
        elif '提升' in user_input or '进阶' in user_input:
            return '技能提升'
        else:
            return '系统学习'
    
    def _detect_urgency(self, user_input: str) -> str:
        """检测紧急程度"""
        urgent_keywords = ['紧急', '急', '马上', '立即', '赶紧', '快']
        if any(keyword in user_input for keyword in urgent_keywords):
            return '紧急'
        else:
            return '一般'
    
    def _detect_creative_direction(self, user_input: str) -> str:
        """检测创意方向"""
        if '设计' in user_input:
            return '设计创新'
        elif '写作' in user_input or '文案' in user_input:
            return '文字创作'
        elif '产品' in user_input:
            return '产品创新'
        else:
            return '开放创意'
    
    def _get_default_role(self, user_input: str) -> RoleMatch:
        """获取默认角色"""
        return RoleMatch(
            role_id='question_answer_expert',
            role_name='问答专家',
            confidence=0.5,
            reasoning='使用默认问答专家角色',
            template=self.roles.get('question_answer_expert', {}).get('template', ''),
            variables={'user_input': user_input, 'domain': '通用'}
        )

# 全局实例
role_selector = IntelligentRoleSelector()
