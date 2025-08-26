"""
自适应学习与进化机制
实现系统的自适应学习、个性化适应和实时知识更新能力
"""

import logging
import asyncio
import json
import sqlite3
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict, deque
import hashlib

# 导入现有系统组件
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agent_system.agent_factory import AgentFactory


class LearningType(Enum):
    """学习类型"""
    SUPERVISED = "supervised"       # 监督学习
    UNSUPERVISED = "unsupervised"  # 无监督学习
    REINFORCEMENT = "reinforcement" # 强化学习
    TRANSFER = "transfer"           # 迁移学习
    INCREMENTAL = "incremental"     # 增量学习


class AdaptationType(Enum):
    """适应类型"""
    USER_PREFERENCE = "user_preference"     # 用户偏好适应
    CONTEXT_ADAPTATION = "context_adaptation" # 上下文适应
    PERFORMANCE_OPTIMIZATION = "performance_optimization" # 性能优化
    KNOWLEDGE_EXPANSION = "knowledge_expansion" # 知识扩展


@dataclass
class LearningEvent:
    """学习事件"""
    id: str
    event_type: LearningType
    input_data: Dict[str, Any]
    expected_output: Optional[str]
    actual_output: str
    feedback_score: float
    timestamp: str
    user_id: str
    session_id: str
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class UserProfile:
    """用户档案"""
    user_id: str
    preferences: Dict[str, Any]
    interaction_patterns: Dict[str, Any]
    learning_history: List[str]
    performance_metrics: Dict[str, float]
    adaptation_settings: Dict[str, Any]
    last_updated: str
    
    def __post_init__(self):
        if not hasattr(self, 'preferences'):
            self.preferences = {}
        if not hasattr(self, 'interaction_patterns'):
            self.interaction_patterns = {}
        if not hasattr(self, 'learning_history'):
            self.learning_history = []
        if not hasattr(self, 'performance_metrics'):
            self.performance_metrics = {}
        if not hasattr(self, 'adaptation_settings'):
            self.adaptation_settings = {}


@dataclass
class KnowledgeUpdate:
    """知识更新"""
    id: str
    knowledge_type: str
    old_knowledge: Dict[str, Any]
    new_knowledge: Dict[str, Any]
    confidence: float
    source: str
    timestamp: str
    validation_status: str = "pending"


class AdaptiveLearningSystem:
    """
    自适应学习与进化机制
    
    功能：
    1. 实时学习反馈机制
    2. 用户偏好学习和适应
    3. 上下文感知适应
    4. 知识图谱动态更新
    5. 性能持续优化
    6. 个性化服务定制
    """
    
    def __init__(self, db_path: str = "adaptive_learning.db"):
        self.logger = logging.getLogger(__name__)
        self.db_path = db_path
        self.is_initialized = False
        
        # 学习事件队列
        self.learning_queue = deque(maxlen=1000)
        
        # 用户档案缓存
        self.user_profiles: Dict[str, UserProfile] = {}
        
        # 知识更新队列
        self.knowledge_updates = deque(maxlen=500)
        
        # 学习统计
        self.learning_stats = {
            'total_events': 0,
            'successful_adaptations': 0,
            'knowledge_updates': 0,
            'user_satisfaction_trend': []
        }
        
        # 适应策略
        self.adaptation_strategies = {}
        
    async def initialize(self):
        """初始化自适应学习系统"""
        if self.is_initialized:
            return
            
        self.logger.info("🧠 [AdaptiveLearning] 初始化自适应学习系统...")
        
        try:
            # 初始化数据库
            await self._initialize_database()
            
            # 加载用户档案
            await self._load_user_profiles()
            
            # 初始化适应策略
            await self._initialize_adaptation_strategies()
            
            # 启动后台学习任务
            await self._start_background_learning()
            
            self.is_initialized = True
            self.logger.info("✅ [AdaptiveLearning] 自适应学习系统初始化完成")
            
        except Exception as e:
            self.logger.error(f"❌ [AdaptiveLearning] 初始化失败: {e}")
            raise
    
    async def process(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """处理自适应学习请求"""
        if not self.is_initialized:
            await self.initialize()
            
        self.logger.info("🧠 [AdaptiveLearning] 开始自适应学习处理...")
        
        try:
            # 1. 获取或创建用户档案
            user_profile = await self._get_or_create_user_profile(request.user_id)
            
            # 2. 记录学习事件
            learning_event = await self._record_learning_event(request, analysis, previous_results)
            
            # 3. 执行适应性调整
            adaptations = await self._perform_adaptations(request, analysis, user_profile, previous_results)
            
            # 4. 更新知识库
            knowledge_updates = await self._update_knowledge_base(request, analysis, previous_results, adaptations)
            
            # 5. 优化系统性能
            performance_improvements = await self._optimize_performance(request, analysis, user_profile)
            
            # 6. 生成个性化响应
            personalized_response = await self._generate_personalized_response(
                request, analysis, user_profile, adaptations
            )
            
            return {
                'output': personalized_response,
                'confidence': 0.85,
                'adaptations': adaptations,
                'knowledge_updates': knowledge_updates,
                'performance_improvements': performance_improvements,
                'reasoning_trace': [
                    {
                        'module': 'adaptive_learning',
                        'action': 'learn_and_adapt',
                        'result': {
                            'learning_event_id': learning_event.id,
                            'adaptations_count': len(adaptations),
                            'knowledge_updates_count': len(knowledge_updates)
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                ],
                'metadata': {
                    'user_profile_updated': True,
                    'learning_type': learning_event.event_type.value,
                    'adaptation_types': [adapt['type'] for adapt in adaptations],
                    'personalization_level': user_profile.performance_metrics.get('personalization_level', 0.5)
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ [AdaptiveLearning] 处理失败: {e}")
            return await self._create_fallback_learning_response(request, str(e))
    
    async def _record_learning_event(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> LearningEvent:
        """记录学习事件"""
        self.logger.debug("📝 [AdaptiveLearning] 记录学习事件...")
        
        # 生成事件ID
        event_id = self._generate_event_id(request.input_text)
        
        # 确定学习类型
        learning_type = await self._determine_learning_type(request, analysis, previous_results)
        
        # 计算反馈分数（基于之前的结果质量）
        feedback_score = await self._calculate_feedback_score(previous_results)
        
        # 创建学习事件
        learning_event = LearningEvent(
            id=event_id,
            event_type=learning_type,
            input_data={
                'text': request.input_text,
                'context': request.context or {},
                'analysis': self._serialize_analysis(analysis)  # 序列化analysis
            },
            expected_output=None,  # 可以从用户反馈中获取
            actual_output=previous_results.get('semantic', {}).get('output', ''),
            feedback_score=feedback_score,
            timestamp=datetime.now().isoformat(),
            user_id=request.user_id,
            session_id=request.session_id,
            metadata={
                'complexity': analysis.get('semantic_analysis', {}).get('complexity_score', 0),
                'intent': analysis.get('semantic_analysis', {}).get('intent_analysis', {}).get('primary_intent', ''),
                'emotion': analysis.get('semantic_analysis', {}).get('emotion_analysis', {}).get('emotion_type', '')
            }
        )
        
        # 添加到学习队列
        self.learning_queue.append(learning_event)
        
        # 保存到数据库
        await self._save_learning_event(learning_event)
        
        # 更新统计
        self.learning_stats['total_events'] += 1
        
        return learning_event

    def _serialize_analysis(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """序列化分析结果，处理不可JSON序列化的对象"""
        if not analysis:
            return {}

        serialized = {}
        for key, value in analysis.items():
            try:
                # 尝试JSON序列化测试
                json.dumps(value)
                serialized[key] = value
            except (TypeError, ValueError):
                # 如果无法序列化，转换为字符串或基本类型
                if hasattr(value, 'value'):  # 枚举类型
                    serialized[key] = value.value
                elif hasattr(value, 'name'):  # 枚举类型
                    serialized[f"{key}_name"] = value.name
                    if hasattr(value, 'value'):
                        serialized[key] = value.value
                else:
                    serialized[key] = str(value)

        return serialized

    async def _get_or_create_user_profile(self, user_id: str) -> UserProfile:
        """获取或创建用户档案"""
        if user_id in self.user_profiles:
            return self.user_profiles[user_id]
        
        # 尝试从数据库加载
        profile = await self._load_user_profile_from_db(user_id)
        
        if not profile:
            # 创建新的用户档案
            profile = UserProfile(
                user_id=user_id,
                preferences={
                    'response_style': 'balanced',
                    'detail_level': 'medium',
                    'language_style': 'formal',
                    'preferred_reasoning_type': 'logical'
                },
                interaction_patterns={
                    'session_length': [],
                    'question_types': [],
                    'complexity_preference': 0.5,
                    'feedback_frequency': 0.0
                },
                learning_history=[],
                performance_metrics={
                    'satisfaction_score': 0.5,
                    'engagement_level': 0.5,
                    'personalization_level': 0.0
                },
                adaptation_settings={
                    'auto_adapt': True,
                    'learning_rate': 0.1,
                    'adaptation_threshold': 0.3
                },
                last_updated=datetime.now().isoformat()
            )
            
            # 保存到数据库
            await self._save_user_profile(profile)
        
        # 缓存到内存
        self.user_profiles[user_id] = profile
        return profile
    
    async def _perform_adaptations(self, request, analysis: Dict[str, Any], user_profile: UserProfile, previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """执行适应性调整"""
        self.logger.debug("🔄 [AdaptiveLearning] 执行适应性调整...")
        
        adaptations = []
        
        # 1. 用户偏好适应
        preference_adaptation = await self._adapt_to_user_preferences(request, analysis, user_profile)
        if preference_adaptation:
            adaptations.append(preference_adaptation)
        
        # 2. 上下文适应
        context_adaptation = await self._adapt_to_context(request, analysis, user_profile)
        if context_adaptation:
            adaptations.append(context_adaptation)
        
        # 3. 性能优化适应
        performance_adaptation = await self._adapt_for_performance(request, analysis, user_profile, previous_results)
        if performance_adaptation:
            adaptations.append(performance_adaptation)
        
        # 4. 知识扩展适应
        knowledge_adaptation = await self._adapt_knowledge_base(request, analysis, user_profile)
        if knowledge_adaptation:
            adaptations.append(knowledge_adaptation)
        
        # 更新用户档案
        await self._update_user_profile_with_adaptations(user_profile, adaptations)
        
        return adaptations
    
    async def _update_knowledge_base(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any], adaptations: List[Dict[str, Any]]) -> List[KnowledgeUpdate]:
        """更新知识库"""
        self.logger.debug("📚 [AdaptiveLearning] 更新知识库...")
        
        updates = []
        
        # 基于用户交互更新知识
        if previous_results and 'reasoning' in previous_results:
            reasoning_result = previous_results['reasoning']
            if reasoning_result.get('confidence', 0) > 0.8:
                # 高置信度的推理结果可以用于知识更新
                update = KnowledgeUpdate(
                    id=f"kb_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    knowledge_type="reasoning_pattern",
                    old_knowledge={},
                    new_knowledge={
                        'pattern': reasoning_result.get('reasoning_chain', {}),
                        'context': analysis.get('semantic_analysis', {}),
                        'success_rate': reasoning_result.get('confidence', 0)
                    },
                    confidence=reasoning_result.get('confidence', 0),
                    source="user_interaction",
                    timestamp=datetime.now().isoformat()
                )
                updates.append(update)
                self.knowledge_updates.append(update)
        
        # 基于适应结果更新知识
        for adaptation in adaptations:
            if adaptation.get('confidence', 0) > 0.7:
                update = KnowledgeUpdate(
                    id=f"adapt_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    knowledge_type="adaptation_pattern",
                    old_knowledge={},
                    new_knowledge=adaptation,
                    confidence=adaptation.get('confidence', 0),
                    source="adaptation_learning",
                    timestamp=datetime.now().isoformat()
                )
                updates.append(update)
                self.knowledge_updates.append(update)
        
        # 保存更新到数据库
        for update in updates:
            await self._save_knowledge_update(update)
        
        self.learning_stats['knowledge_updates'] += len(updates)
        
        return updates
    
    async def _optimize_performance(self, request, analysis: Dict[str, Any], user_profile: UserProfile) -> List[Dict[str, Any]]:
        """优化系统性能"""
        self.logger.debug("⚡ [AdaptiveLearning] 优化系统性能...")
        
        improvements = []
        
        # 分析用户交互模式
        interaction_patterns = user_profile.interaction_patterns
        
        # 优化响应时间
        if len(interaction_patterns.get('session_length', [])) > 5:
            avg_session_length = sum(interaction_patterns['session_length']) / len(interaction_patterns['session_length'])
            if avg_session_length < 30:  # 短会话偏好
                improvements.append({
                    'type': 'response_optimization',
                    'description': '优化为快速响应模式',
                    'parameters': {'max_reasoning_depth': 2, 'parallel_processing': True},
                    'confidence': 0.8
                })
        
        # 优化复杂度处理
        complexity_preference = interaction_patterns.get('complexity_preference', 0.5)
        if complexity_preference < 0.3:
            improvements.append({
                'type': 'complexity_optimization',
                'description': '简化处理流程',
                'parameters': {'simplify_output': True, 'reduce_technical_terms': True},
                'confidence': 0.7
            })
        elif complexity_preference > 0.7:
            improvements.append({
                'type': 'complexity_optimization',
                'description': '增强深度分析',
                'parameters': {'enable_deep_reasoning': True, 'detailed_explanations': True},
                'confidence': 0.7
            })
        
        return improvements
    
    async def _generate_personalized_response(self, request, analysis: Dict[str, Any], user_profile: UserProfile, adaptations: List[Dict[str, Any]]) -> str:
        """生成个性化响应"""
        # 基于用户偏好调整响应风格
        preferences = user_profile.preferences
        
        base_response = "我已经根据您的偏好和历史交互进行了个性化处理。"
        
        # 根据响应风格调整
        response_style = preferences.get('response_style', 'balanced')
        if response_style == 'concise':
            base_response = "已为您个性化处理。"
        elif response_style == 'detailed':
            base_response = "我已经仔细分析了您的请求，并根据您的个人偏好、历史交互模式和当前上下文进行了全面的个性化处理。"
        
        # 添加适应信息
        if adaptations:
            adaptation_info = f"本次进行了{len(adaptations)}项适应性调整，包括：" + "、".join([adapt.get('description', adapt.get('type', '')) for adapt in adaptations[:3]])
            base_response += f" {adaptation_info}"
        
        return base_response

    # 辅助方法实现
    async def _initialize_database(self):
        """初始化数据库"""
        self.logger.debug("🗄️ [AdaptiveLearning] 初始化数据库...")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 创建学习事件表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                input_data TEXT NOT NULL,
                expected_output TEXT,
                actual_output TEXT,
                feedback_score REAL NOT NULL,
                timestamp TEXT NOT NULL,
                user_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                metadata TEXT
            )
        ''')

        # 创建用户档案表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                preferences TEXT NOT NULL,
                interaction_patterns TEXT NOT NULL,
                learning_history TEXT NOT NULL,
                performance_metrics TEXT NOT NULL,
                adaptation_settings TEXT NOT NULL,
                last_updated TEXT NOT NULL
            )
        ''')

        # 创建知识更新表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS knowledge_updates (
                id TEXT PRIMARY KEY,
                knowledge_type TEXT NOT NULL,
                old_knowledge TEXT,
                new_knowledge TEXT NOT NULL,
                confidence REAL NOT NULL,
                source TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                validation_status TEXT DEFAULT 'pending'
            )
        ''')

        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_learning_user ON learning_events (user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_learning_timestamp ON learning_events (timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_updates (knowledge_type)')

        conn.commit()
        conn.close()

    async def _load_user_profiles(self):
        """加载用户档案"""
        self.logger.debug("📥 [AdaptiveLearning] 加载用户档案...")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM user_profiles ORDER BY last_updated DESC LIMIT 100')
        rows = cursor.fetchall()

        for row in rows:
            profile = self._row_to_user_profile(row)
            self.user_profiles[profile.user_id] = profile

        conn.close()

        self.logger.info(f"📥 [AdaptiveLearning] 加载了 {len(self.user_profiles)} 个用户档案")

    async def _initialize_adaptation_strategies(self):
        """初始化适应策略"""
        self.adaptation_strategies = {
            AdaptationType.USER_PREFERENCE: {
                'threshold': 0.3,
                'learning_rate': 0.1,
                'adaptation_methods': ['preference_update', 'style_adjustment']
            },
            AdaptationType.CONTEXT_ADAPTATION: {
                'threshold': 0.4,
                'learning_rate': 0.15,
                'adaptation_methods': ['context_weighting', 'dynamic_routing']
            },
            AdaptationType.PERFORMANCE_OPTIMIZATION: {
                'threshold': 0.5,
                'learning_rate': 0.2,
                'adaptation_methods': ['parameter_tuning', 'algorithm_selection']
            },
            AdaptationType.KNOWLEDGE_EXPANSION: {
                'threshold': 0.6,
                'learning_rate': 0.05,
                'adaptation_methods': ['knowledge_integration', 'pattern_learning']
            }
        }

    async def _start_background_learning(self):
        """启动后台学习任务"""
        self.logger.debug("🔄 [AdaptiveLearning] 启动后台学习任务...")
        # 这里可以启动异步任务进行持续学习
        # 由于这是演示，我们只是记录启动
        pass

    def _generate_event_id(self, content: str) -> str:
        """生成事件ID"""
        timestamp = datetime.now().isoformat()
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        return f"event_{timestamp}_{content_hash}"

    async def _determine_learning_type(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> LearningType:
        """确定学习类型"""
        # 基于上下文和结果确定学习类型
        if previous_results and 'reasoning' in previous_results:
            return LearningType.REINFORCEMENT
        elif analysis.get('semantic_analysis', {}).get('complexity_score', 0) > 0.7:
            return LearningType.SUPERVISED
        else:
            return LearningType.INCREMENTAL

    async def _calculate_feedback_score(self, previous_results: Dict[str, Any]) -> float:
        """计算反馈分数"""
        if not previous_results:
            return 0.5

        # 基于各模块的置信度计算综合反馈分数
        confidences = []
        for module_result in previous_results.values():
            if isinstance(module_result, dict) and 'confidence' in module_result:
                confidences.append(module_result['confidence'])

        if confidences:
            return sum(confidences) / len(confidences)
        else:
            return 0.5

    async def _save_learning_event(self, event: LearningEvent):
        """保存学习事件到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT OR REPLACE INTO learning_events
            (id, event_type, input_data, expected_output, actual_output, feedback_score, timestamp, user_id, session_id, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event.id,
            event.event_type.value,
            json.dumps(event.input_data, ensure_ascii=False),
            event.expected_output,
            event.actual_output,
            event.feedback_score,
            event.timestamp,
            event.user_id,
            event.session_id,
            json.dumps(event.metadata, ensure_ascii=False)
        ))

        conn.commit()
        conn.close()

    async def _load_user_profile_from_db(self, user_id: str) -> Optional[UserProfile]:
        """从数据库加载用户档案"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM user_profiles WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()

        conn.close()

        if row:
            return self._row_to_user_profile(row)
        return None

    def _row_to_user_profile(self, row) -> UserProfile:
        """将数据库行转换为用户档案"""
        return UserProfile(
            user_id=row[0],
            preferences=json.loads(row[1]),
            interaction_patterns=json.loads(row[2]),
            learning_history=json.loads(row[3]),
            performance_metrics=json.loads(row[4]),
            adaptation_settings=json.loads(row[5]),
            last_updated=row[6]
        )

    async def _save_user_profile(self, profile: UserProfile):
        """保存用户档案到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT OR REPLACE INTO user_profiles
            (user_id, preferences, interaction_patterns, learning_history, performance_metrics, adaptation_settings, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            profile.user_id,
            json.dumps(profile.preferences, ensure_ascii=False),
            json.dumps(profile.interaction_patterns, ensure_ascii=False),
            json.dumps(profile.learning_history, ensure_ascii=False),
            json.dumps(profile.performance_metrics, ensure_ascii=False),
            json.dumps(profile.adaptation_settings, ensure_ascii=False),
            profile.last_updated
        ))

        conn.commit()
        conn.close()

    async def _save_knowledge_update(self, update: KnowledgeUpdate):
        """保存知识更新到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO knowledge_updates
            (id, knowledge_type, old_knowledge, new_knowledge, confidence, source, timestamp, validation_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            update.id,
            update.knowledge_type,
            json.dumps(update.old_knowledge, ensure_ascii=False),
            json.dumps(update.new_knowledge, ensure_ascii=False),
            update.confidence,
            update.source,
            update.timestamp,
            update.validation_status
        ))

        conn.commit()
        conn.close()

    # 适应方法实现
    async def _adapt_to_user_preferences(self, request, analysis: Dict[str, Any], user_profile: UserProfile) -> Optional[Dict[str, Any]]:
        """适应用户偏好"""
        preferences = user_profile.preferences
        current_intent = analysis.get('semantic_analysis', {}).get('intent_analysis', {}).get('primary_intent', '')

        # 检查是否需要调整响应风格
        if current_intent == 'question' and preferences.get('response_style') != 'detailed':
            # 用户问问题时可能需要详细回答
            return {
                'type': AdaptationType.USER_PREFERENCE.value,
                'description': '调整为详细回答风格',
                'old_value': preferences.get('response_style'),
                'new_value': 'detailed',
                'confidence': 0.7,
                'reason': '问题类型请求通常需要详细回答'
            }

        return None

    async def _adapt_to_context(self, request, analysis: Dict[str, Any], user_profile: UserProfile) -> Optional[Dict[str, Any]]:
        """适应上下文"""
        complexity = analysis.get('semantic_analysis', {}).get('complexity_score', 0)
        user_complexity_pref = user_profile.interaction_patterns.get('complexity_preference', 0.5)

        # 如果当前复杂度与用户偏好差异较大，进行适应
        if abs(complexity - user_complexity_pref) > 0.3:
            target_complexity = (complexity + user_complexity_pref) / 2
            return {
                'type': AdaptationType.CONTEXT_ADAPTATION.value,
                'description': '调整处理复杂度以匹配用户偏好',
                'old_value': complexity,
                'new_value': target_complexity,
                'confidence': 0.6,
                'reason': f'用户偏好复杂度{user_complexity_pref}，当前{complexity}'
            }

        return None

    async def _adapt_for_performance(self, request, analysis: Dict[str, Any], user_profile: UserProfile, previous_results: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """性能优化适应"""
        # 检查之前结果的性能
        if previous_results:
            avg_confidence = 0
            confidence_count = 0

            for module_result in previous_results.values():
                if isinstance(module_result, dict) and 'confidence' in module_result:
                    avg_confidence += module_result['confidence']
                    confidence_count += 1

            if confidence_count > 0:
                avg_confidence /= confidence_count

                # 如果平均置信度较低，建议性能优化
                if avg_confidence < 0.6:
                    return {
                        'type': AdaptationType.PERFORMANCE_OPTIMIZATION.value,
                        'description': '优化处理流程以提高置信度',
                        'old_value': avg_confidence,
                        'new_value': 'optimized_pipeline',
                        'confidence': 0.8,
                        'reason': f'当前平均置信度{avg_confidence:.2f}较低'
                    }

        return None

    async def _adapt_knowledge_base(self, request, analysis: Dict[str, Any], user_profile: UserProfile) -> Optional[Dict[str, Any]]:
        """知识库适应"""
        # 检查是否遇到新的知识领域
        keywords = analysis.get('semantic_analysis', {}).get('surface_analysis', {}).get('keywords', [])

        # 简单检查：如果关键词中包含专业术语，可能需要扩展知识库
        technical_keywords = ['AI', '机器学习', '深度学习', '算法', '数据科学', '编程']

        if any(keyword in ' '.join(keywords) for keyword in technical_keywords):
            return {
                'type': AdaptationType.KNOWLEDGE_EXPANSION.value,
                'description': '扩展技术领域知识库',
                'old_value': 'basic_knowledge',
                'new_value': 'expanded_technical_knowledge',
                'confidence': 0.7,
                'reason': '检测到技术相关内容，需要扩展相关知识'
            }

        return None

    async def _update_user_profile_with_adaptations(self, user_profile: UserProfile, adaptations: List[Dict[str, Any]]):
        """根据适应结果更新用户档案"""
        for adaptation in adaptations:
            adaptation_type = adaptation['type']

            if adaptation_type == AdaptationType.USER_PREFERENCE.value:
                # 更新用户偏好
                if 'response_style' in adaptation['description']:
                    user_profile.preferences['response_style'] = adaptation['new_value']

            elif adaptation_type == AdaptationType.CONTEXT_ADAPTATION.value:
                # 更新复杂度偏好
                if 'complexity_preference' not in user_profile.interaction_patterns:
                    user_profile.interaction_patterns['complexity_preference'] = []
                user_profile.interaction_patterns['complexity_preference'] = adaptation['new_value']

            # 记录适应历史
            user_profile.learning_history.append(adaptation['description'])

            # 限制历史记录长度
            if len(user_profile.learning_history) > 50:
                user_profile.learning_history = user_profile.learning_history[-50:]

        # 更新时间戳
        user_profile.last_updated = datetime.now().isoformat()

        # 保存到数据库
        await self._save_user_profile(user_profile)

        # 更新成功适应统计
        if adaptations:
            self.learning_stats['successful_adaptations'] += len(adaptations)

    async def _create_fallback_learning_response(self, request, error_msg: str) -> Dict[str, Any]:
        """创建备用学习响应"""
        return {
            'output': f"自适应学习遇到问题：{error_msg}。系统将继续学习和改进。",
            'confidence': 0.3,
            'adaptations': [],
            'knowledge_updates': [],
            'performance_improvements': [],
            'reasoning_trace': [
                {
                    'module': 'adaptive_learning',
                    'action': 'fallback',
                    'error': error_msg,
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'metadata': {'error': True, 'fallback': True}
        }

    # 公共接口方法
    async def provide_feedback(self, event_id: str, feedback_score: float, feedback_text: str = ""):
        """提供用户反馈"""
        self.logger.info(f"📝 [AdaptiveLearning] 收到反馈: {event_id}, 分数: {feedback_score}")

        # 查找对应的学习事件
        for event in self.learning_queue:
            if event.id == event_id:
                event.feedback_score = feedback_score
                if feedback_text:
                    event.metadata['user_feedback'] = feedback_text

                # 更新数据库
                await self._save_learning_event(event)
                break

        # 更新用户满意度趋势
        self.learning_stats['user_satisfaction_trend'].append(feedback_score)
        if len(self.learning_stats['user_satisfaction_trend']) > 100:
            self.learning_stats['user_satisfaction_trend'] = self.learning_stats['user_satisfaction_trend'][-100:]

    def get_learning_stats(self) -> Dict[str, Any]:
        """获取学习统计信息"""
        recent_satisfaction = self.learning_stats['user_satisfaction_trend'][-10:] if self.learning_stats['user_satisfaction_trend'] else [0.5]

        return {
            'total_events': self.learning_stats['total_events'],
            'successful_adaptations': self.learning_stats['successful_adaptations'],
            'knowledge_updates': self.learning_stats['knowledge_updates'],
            'user_profiles_count': len(self.user_profiles),
            'recent_satisfaction_avg': sum(recent_satisfaction) / len(recent_satisfaction),
            'learning_queue_size': len(self.learning_queue),
            'knowledge_updates_pending': len([u for u in self.knowledge_updates if u.validation_status == 'pending'])
        }

    async def get_user_insights(self, user_id: str) -> Dict[str, Any]:
        """获取用户洞察"""
        if user_id not in self.user_profiles:
            return {'error': 'User profile not found'}

        profile = self.user_profiles[user_id]

        return {
            'user_id': user_id,
            'preferences': profile.preferences,
            'interaction_summary': {
                'total_interactions': len(profile.learning_history),
                'complexity_preference': profile.interaction_patterns.get('complexity_preference', 0.5),
                'satisfaction_score': profile.performance_metrics.get('satisfaction_score', 0.5),
                'personalization_level': profile.performance_metrics.get('personalization_level', 0.0)
            },
            'recent_adaptations': profile.learning_history[-5:],
            'last_updated': profile.last_updated
        }
