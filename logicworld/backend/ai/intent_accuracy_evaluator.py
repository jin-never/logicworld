#!/usr/bin/env python3
"""
意图检测准确度评估器
多维度评估意图检测结果的准确性
"""

import asyncio
import logging
import time
import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import sqlite3
from pathlib import Path

class AccuracyMetric(Enum):
    """准确度指标类型"""
    USER_FEEDBACK = "user_feedback"           # 用户反馈
    BEHAVIORAL_VALIDATION = "behavioral"      # 行为验证
    CROSS_VALIDATION = "cross_validation"     # 交叉验证
    TEMPORAL_CONSISTENCY = "temporal"         # 时间一致性
    CONTEXT_COHERENCE = "context_coherence"   # 上下文连贯性

@dataclass
class AccuracyResult:
    """准确度评估结果"""
    overall_score: float                      # 总体准确度分数 (0-1)
    confidence_calibration: float             # 置信度校准度
    user_satisfaction: float                  # 用户满意度
    behavioral_consistency: float             # 行为一致性
    temporal_stability: float                 # 时间稳定性
    context_awareness: float                  # 上下文感知度
    
    # 详细指标
    precision: float                          # 精确率
    recall: float                            # 召回率
    f1_score: float                          # F1分数
    
    # 元数据
    evaluation_time: datetime
    sample_count: int
    evaluation_method: str
    notes: str = ""

class UserFeedbackCollector:
    """用户反馈收集器"""
    
    def __init__(self, db_path: str = "data/databases/intent_feedback.db"):
        self.db_path = db_path
        self.logger = logging.getLogger(__name__)
        self._init_database()
    
    def _init_database(self):
        """初始化数据库"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    user_input TEXT,
                    detected_intent TEXT,
                    confidence REAL,
                    user_confirmed_intent TEXT,
                    satisfaction_score INTEGER,  -- 1-5分
                    feedback_type TEXT,          -- explicit/implicit
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    response_time REAL,
                    context_data TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS behavioral_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    detected_intent TEXT,
                    user_action TEXT,            -- 用户实际执行的动作
                    action_success BOOLEAN,      -- 动作是否成功
                    time_to_action REAL,         -- 从检测到执行的时间
                    correction_needed BOOLEAN,   -- 是否需要纠正
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
    
    async def collect_explicit_feedback(self, 
                                      session_id: str,
                                      user_input: str, 
                                      detected_intent: str,
                                      confidence: float,
                                      user_confirmed_intent: str,
                                      satisfaction_score: int) -> bool:
        """收集显式用户反馈"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO feedback 
                    (session_id, user_input, detected_intent, confidence, 
                     user_confirmed_intent, satisfaction_score, feedback_type)
                    VALUES (?, ?, ?, ?, ?, ?, 'explicit')
                """, (session_id, user_input, detected_intent, confidence, 
                      user_confirmed_intent, satisfaction_score))
            
            self.logger.info(f"✅ 收集到显式反馈: {satisfaction_score}/5")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ 收集反馈失败: {e}")
            return False
    
    async def collect_behavioral_feedback(self,
                                        session_id: str,
                                        detected_intent: str,
                                        user_action: str,
                                        action_success: bool,
                                        time_to_action: float) -> bool:
        """收集行为反馈"""
        try:
            correction_needed = not action_success or time_to_action > 30.0
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO behavioral_data 
                    (session_id, detected_intent, user_action, action_success, 
                     time_to_action, correction_needed)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (session_id, detected_intent, user_action, action_success,
                      time_to_action, correction_needed))
            
            self.logger.info(f"📊 收集到行为数据: {user_action} ({'成功' if action_success else '失败'})")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ 收集行为数据失败: {e}")
            return False

class BehavioralValidator:
    """行为验证器 - 通过用户后续行为验证意图检测准确性"""
    
    def __init__(self, feedback_collector: UserFeedbackCollector):
        self.feedback_collector = feedback_collector
        self.logger = logging.getLogger(__name__)
        
        # 意图-行为映射
        self.intent_action_mapping = {
            "mindmap": ["create_mindmap", "add_node", "edit_structure"],
            "chat": ["send_message", "ask_question", "casual_interaction"],
            "workflow": ["create_workflow", "add_step", "execute_process"],
            "analysis": ["analyze_data", "generate_report", "compare_items"],
            "creation": ["create_document", "write_content", "design_layout"]
        }
    
    async def validate_by_behavior(self, 
                                 session_id: str,
                                 detected_intent: str, 
                                 user_actions: List[str],
                                 time_window: float = 60.0) -> float:
        """通过用户行为验证意图准确性"""
        
        expected_actions = self.intent_action_mapping.get(detected_intent, [])
        if not expected_actions:
            return 0.5  # 未知意图，中性分数
        
        # 计算行为匹配度
        matching_actions = [action for action in user_actions if action in expected_actions]
        
        if not user_actions:
            return 0.3  # 用户无行为，可能检测错误
        
        match_ratio = len(matching_actions) / len(user_actions)
        
        # 时间因子：快速执行相关行为说明检测准确
        time_factor = max(0.5, 1.0 - (time_window / 120.0))  # 2分钟内为满分
        
        accuracy_score = match_ratio * time_factor
        
        self.logger.info(f"🎯 行为验证: {detected_intent} -> {user_actions} = {accuracy_score:.2f}")
        
        return accuracy_score

class CrossValidator:
    """交叉验证器 - 使用多个模型交叉验证"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def cross_validate(self, 
                           text: str,
                           primary_result: Dict[str, Any],
                           alternative_detectors: List[Any]) -> float:
        """交叉验证准确性"""
        
        if not alternative_detectors:
            return 0.7  # 无法交叉验证，给中等分数
        
        primary_intent = primary_result.get('intent')
        primary_confidence = primary_result.get('confidence', 0.5)
        
        # 收集其他检测器的结果
        alternative_results = []
        for detector in alternative_detectors:
            try:
                result = await detector.detect(text)
                alternative_results.append({
                    'intent': result.intent.value,
                    'confidence': result.confidence
                })
            except Exception as e:
                self.logger.warning(f"交叉验证检测器失败: {e}")
                continue
        
        if not alternative_results:
            return 0.6  # 交叉验证失败
        
        # 计算一致性
        consistent_count = sum(1 for result in alternative_results 
                             if result['intent'] == primary_intent)
        
        consistency_ratio = consistent_count / len(alternative_results)
        
        # 置信度加权
        avg_confidence = sum(result['confidence'] for result in alternative_results) / len(alternative_results)
        confidence_factor = (primary_confidence + avg_confidence) / 2
        
        cross_validation_score = consistency_ratio * confidence_factor
        
        self.logger.info(f"🔄 交叉验证: {consistency_ratio:.2f} 一致性, {confidence_factor:.2f} 置信度")
        
        return cross_validation_score

class TemporalConsistencyChecker:
    """时间一致性检查器"""
    
    def __init__(self, feedback_collector: UserFeedbackCollector):
        self.feedback_collector = feedback_collector
        self.logger = logging.getLogger(__name__)
    
    async def check_temporal_consistency(self, 
                                       user_id: str,
                                       current_intent: str,
                                       time_window_hours: int = 24) -> float:
        """检查时间一致性"""
        
        try:
            # 获取历史数据
            with sqlite3.connect(self.feedback_collector.db_path) as conn:
                cursor = conn.execute("""
                    SELECT detected_intent, user_confirmed_intent, satisfaction_score
                    FROM feedback 
                    WHERE session_id LIKE ? 
                    AND timestamp > datetime('now', '-{} hours')
                    ORDER BY timestamp DESC
                """.format(time_window_hours), (f"{user_id}%",))
                
                history = cursor.fetchall()
            
            if not history:
                return 0.7  # 无历史数据，中性分数
            
            # 分析一致性
            similar_intents = [row[0] for row in history if row[0] == current_intent]
            confirmed_intents = [row[1] for row in history if row[1] == current_intent]
            
            # 计算历史准确率
            if similar_intents:
                correct_predictions = sum(1 for i, row in enumerate(history) 
                                        if row[0] == row[1] and row[0] == current_intent)
                historical_accuracy = correct_predictions / len(similar_intents)
            else:
                historical_accuracy = 0.5
            
            # 用户满意度趋势
            recent_satisfaction = [row[2] for row in history[:5] if row[2] is not None]
            if recent_satisfaction:
                avg_satisfaction = sum(recent_satisfaction) / len(recent_satisfaction) / 5.0
            else:
                avg_satisfaction = 0.5
            
            temporal_score = (historical_accuracy + avg_satisfaction) / 2
            
            self.logger.info(f"⏰ 时间一致性: {temporal_score:.2f}")
            
            return temporal_score
            
        except Exception as e:
            self.logger.error(f"❌ 时间一致性检查失败: {e}")
            return 0.5

class IntentAccuracyEvaluator:
    """意图检测准确度评估器 - 主控制器"""
    
    def __init__(self, db_path: str = "data/databases/intent_feedback.db"):
        self.logger = logging.getLogger(__name__)
        self.feedback_collector = UserFeedbackCollector(db_path)
        self.behavioral_validator = BehavioralValidator(self.feedback_collector)
        self.cross_validator = CrossValidator()
        self.temporal_checker = TemporalConsistencyChecker(self.feedback_collector)
    
    async def evaluate_accuracy(self,
                              session_id: str,
                              user_input: str,
                              detection_result: Dict[str, Any],
                              user_actions: List[str] = None,
                              alternative_detectors: List[Any] = None) -> AccuracyResult:
        """综合评估准确度"""
        
        start_time = time.time()
        self.logger.info(f"🔍 开始准确度评估: {detection_result.get('intent')}")
        
        # 1. 行为验证
        if user_actions:
            behavioral_score = await self.behavioral_validator.validate_by_behavior(
                session_id, detection_result.get('intent'), user_actions
            )
        else:
            behavioral_score = 0.5
        
        # 2. 交叉验证
        if alternative_detectors:
            cross_validation_score = await self.cross_validator.cross_validate(
                user_input, detection_result, alternative_detectors
            )
        else:
            cross_validation_score = 0.7
        
        # 3. 时间一致性
        user_id = session_id.split('_')[0] if '_' in session_id else session_id
        temporal_score = await self.temporal_checker.check_temporal_consistency(user_id)
        
        # 4. 置信度校准 (检测器自身置信度与实际准确性的匹配度)
        reported_confidence = detection_result.get('confidence', 0.5)
        calibration_score = self._calculate_confidence_calibration(
            reported_confidence, behavioral_score, cross_validation_score
        )
        
        # 5. 综合计算
        weights = {
            'behavioral': 0.4,
            'cross_validation': 0.3,
            'temporal': 0.2,
            'calibration': 0.1
        }
        
        overall_score = (
            behavioral_score * weights['behavioral'] +
            cross_validation_score * weights['cross_validation'] +
            temporal_score * weights['temporal'] +
            calibration_score * weights['calibration']
        )
        
        # 计算其他指标 (简化版)
        precision = cross_validation_score
        recall = behavioral_score
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        result = AccuracyResult(
            overall_score=overall_score,
            confidence_calibration=calibration_score,
            user_satisfaction=0.8,  # 需要实际用户反馈
            behavioral_consistency=behavioral_score,
            temporal_stability=temporal_score,
            context_awareness=cross_validation_score,
            precision=precision,
            recall=recall,
            f1_score=f1_score,
            evaluation_time=datetime.now(),
            sample_count=1,
            evaluation_method="hybrid_multi_metric",
            notes=f"评估耗时: {time.time() - start_time:.2f}s"
        )
        
        self.logger.info(f"📊 准确度评估完成: {overall_score:.2f}")
        
        return result
    
    def _calculate_confidence_calibration(self, 
                                        reported_confidence: float,
                                        behavioral_score: float,
                                        cross_validation_score: float) -> float:
        """计算置信度校准度"""
        
        actual_accuracy = (behavioral_score + cross_validation_score) / 2
        
        # 置信度与实际准确性的差异
        calibration_error = abs(reported_confidence - actual_accuracy)
        
        # 转换为校准分数 (差异越小，校准度越高)
        calibration_score = max(0, 1.0 - calibration_error * 2)
        
        return calibration_score
    
    async def get_accuracy_statistics(self, days: int = 30) -> Dict[str, Any]:
        """获取准确度统计信息"""
        
        try:
            with sqlite3.connect(self.feedback_collector.db_path) as conn:
                # 总体统计
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total_samples,
                        AVG(CASE WHEN detected_intent = user_confirmed_intent THEN 1.0 ELSE 0.0 END) as accuracy,
                        AVG(satisfaction_score) / 5.0 as avg_satisfaction
                    FROM feedback 
                    WHERE timestamp > datetime('now', '-{} days')
                    AND user_confirmed_intent IS NOT NULL
                """.format(days))
                
                stats = cursor.fetchone()
                
                # 按意图类型统计
                cursor = conn.execute("""
                    SELECT 
                        detected_intent,
                        COUNT(*) as count,
                        AVG(CASE WHEN detected_intent = user_confirmed_intent THEN 1.0 ELSE 0.0 END) as accuracy
                    FROM feedback 
                    WHERE timestamp > datetime('now', '-{} days')
                    AND user_confirmed_intent IS NOT NULL
                    GROUP BY detected_intent
                """.format(days))
                
                intent_stats = cursor.fetchall()
            
            return {
                'overall': {
                    'total_samples': stats[0] or 0,
                    'accuracy': stats[1] or 0.0,
                    'user_satisfaction': stats[2] or 0.0
                },
                'by_intent': {
                    row[0]: {'count': row[1], 'accuracy': row[2]}
                    for row in intent_stats
                },
                'evaluation_period_days': days,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"❌ 获取统计信息失败: {e}")
            return {'error': str(e)}

# 全局实例
_accuracy_evaluator: Optional[IntentAccuracyEvaluator] = None

def get_accuracy_evaluator() -> IntentAccuracyEvaluator:
    """获取准确度评估器实例"""
    global _accuracy_evaluator
    if _accuracy_evaluator is None:
        _accuracy_evaluator = IntentAccuracyEvaluator()
    return _accuracy_evaluator
