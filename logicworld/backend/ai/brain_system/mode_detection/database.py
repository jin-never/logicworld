"""
模式检测数据库操作
"""

import sqlite3
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

# 暂时禁用aiosqlite，使用内存存储
try:
    import aiosqlite
    AIOSQLITE_AVAILABLE = True
except ImportError:
    AIOSQLITE_AVAILABLE = False
    print("⚠️ aiosqlite不可用，使用内存存储模式")

class ModeDetectionDatabase:
    """模式检测数据库"""

    def __init__(self, db_path: str = "mode_detection.db"):
        self.db_path = db_path
        self._initialized = False

        # 内存存储（当aiosqlite不可用时）
        if not AIOSQLITE_AVAILABLE:
            self.memory_storage = {
                "feedback": [],
                "performance": [],
                "learning": []
            }
    
    async def initialize(self) -> None:
        """初始化数据库"""

        if self._initialized:
            return

        if not AIOSQLITE_AVAILABLE:
            # 使用内存存储模式
            self._initialized = True
            return

        async with aiosqlite.connect(self.db_path) as db:
            # 创建反馈表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS mode_detection_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    detection_id TEXT UNIQUE,
                    timestamp TEXT NOT NULL,
                    user_input TEXT NOT NULL,
                    detected_mode TEXT NOT NULL,
                    detection_confidence REAL NOT NULL,
                    user_actual_choice TEXT,
                    user_satisfaction INTEGER,
                    user_comments TEXT,
                    detection_accuracy BOOLEAN,
                    detailed_analysis TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 创建性能统计表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS mode_detection_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    total_detections INTEGER DEFAULT 0,
                    accurate_detections INTEGER DEFAULT 0,
                    accuracy_rate REAL DEFAULT 0.0,
                    avg_confidence REAL DEFAULT 0.0,
                    avg_processing_time REAL DEFAULT 0.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(date)
                )
            """)
            
            # 创建学习记录表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS mode_detection_learning (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    error_type TEXT NOT NULL,
                    error_analysis TEXT,
                    improvement_action TEXT,
                    weight_adjustments TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 创建索引
            await db.execute("CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON mode_detection_feedback(timestamp)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_feedback_accuracy ON mode_detection_feedback(detection_accuracy)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_performance_date ON mode_detection_performance(date)")
            
            await db.commit()
        
        self._initialized = True
    
    async def store_feedback(self, feedback_record: Dict[str, Any]) -> bool:
        """存储用户反馈"""

        await self.initialize()

        if not AIOSQLITE_AVAILABLE:
            # 使用内存存储
            self.memory_storage["feedback"].append({
                **feedback_record,
                "created_at": datetime.now().isoformat()
            })
            return True

        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT OR REPLACE INTO mode_detection_feedback 
                    (detection_id, timestamp, user_input, detected_mode, detection_confidence,
                     user_actual_choice, user_satisfaction, user_comments, detection_accuracy, detailed_analysis)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    feedback_record.get("detection_id"),
                    feedback_record.get("timestamp"),
                    feedback_record.get("user_input"),
                    feedback_record.get("detected_mode"),
                    feedback_record.get("detection_confidence"),
                    feedback_record.get("user_actual_choice"),
                    feedback_record.get("user_satisfaction"),
                    feedback_record.get("user_comments"),
                    feedback_record.get("detection_accuracy"),
                    json.dumps(feedback_record.get("detailed_analysis", {}))
                ))
                await db.commit()
            return True
        except Exception:
            return False
    
    async def query_feedback(self, time_range: str = "last_30_days", limit: int = 1000) -> List[Dict[str, Any]]:
        """查询反馈数据"""
        
        await self.initialize()
        
        # 计算时间范围
        end_date = datetime.now()
        if time_range == "last_7_days":
            start_date = end_date - timedelta(days=7)
        elif time_range == "last_30_days":
            start_date = end_date - timedelta(days=30)
        elif time_range == "last_90_days":
            start_date = end_date - timedelta(days=90)
        else:
            start_date = end_date - timedelta(days=30)  # 默认30天
        
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT * FROM mode_detection_feedback 
                    WHERE timestamp >= ? AND timestamp <= ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (start_date.isoformat(), end_date.isoformat(), limit))
                
                rows = await cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                
                results = []
                for row in rows:
                    record = dict(zip(columns, row))
                    # 解析JSON字段
                    if record.get("detailed_analysis"):
                        try:
                            record["detailed_analysis"] = json.loads(record["detailed_analysis"])
                        except json.JSONDecodeError:
                            record["detailed_analysis"] = {}
                    results.append(record)
                
                return results
        except Exception:
            return []
    
    async def store_performance_stats(self, date: str, stats: Dict[str, Any]) -> bool:
        """存储性能统计"""

        await self.initialize()

        if not AIOSQLITE_AVAILABLE:
            # 使用内存存储
            self.memory_storage["performance"].append({
                "date": date,
                **stats,
                "created_at": datetime.now().isoformat()
            })
            return True

        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT OR REPLACE INTO mode_detection_performance 
                    (date, total_detections, accurate_detections, accuracy_rate, 
                     avg_confidence, avg_processing_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    date,
                    stats.get("total_detections", 0),
                    stats.get("accurate_detections", 0),
                    stats.get("accuracy_rate", 0.0),
                    stats.get("avg_confidence", 0.0),
                    stats.get("avg_processing_time", 0.0)
                ))
                await db.commit()
            return True
        except Exception:
            return False
    
    async def query_performance_stats(self, time_range: str = "last_30_days") -> List[Dict[str, Any]]:
        """查询性能统计"""
        
        await self.initialize()
        
        # 计算时间范围
        end_date = datetime.now().date()
        if time_range == "last_7_days":
            start_date = end_date - timedelta(days=7)
        elif time_range == "last_30_days":
            start_date = end_date - timedelta(days=30)
        elif time_range == "last_90_days":
            start_date = end_date - timedelta(days=90)
        else:
            start_date = end_date - timedelta(days=30)
        
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT * FROM mode_detection_performance 
                    WHERE date >= ? AND date <= ?
                    ORDER BY date DESC
                """, (start_date.isoformat(), end_date.isoformat()))
                
                rows = await cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                
                return [dict(zip(columns, row)) for row in rows]
        except Exception:
            return []
    
    async def store_learning_record(self, learning_record: Dict[str, Any]) -> bool:
        """存储学习记录"""

        await self.initialize()

        if not AIOSQLITE_AVAILABLE:
            # 使用内存存储
            self.memory_storage["learning"].append({
                **learning_record,
                "created_at": datetime.now().isoformat()
            })
            return True

        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT INTO mode_detection_learning 
                    (timestamp, error_type, error_analysis, improvement_action, weight_adjustments)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    learning_record.get("timestamp"),
                    learning_record.get("error_type"),
                    json.dumps(learning_record.get("error_analysis", {})),
                    learning_record.get("improvement_action"),
                    json.dumps(learning_record.get("weight_adjustments", {}))
                ))
                await db.commit()
            return True
        except Exception:
            return False
    
    async def get_accuracy_stats(self, time_range: str = "last_30_days") -> Dict[str, Any]:
        """获取准确率统计"""
        
        await self.initialize()
        
        feedback_data = await self.query_feedback(time_range)
        
        if not feedback_data:
            return {
                "accuracy": 0.0,
                "sample_size": 0,
                "accurate_count": 0,
                "error_count": 0,
                "confidence_stats": {},
                "mode_distribution": {}
            }
        
        # 计算准确率
        accurate_predictions = sum(1 for record in feedback_data if record.get("detection_accuracy"))
        total_predictions = len(feedback_data)
        accuracy = accurate_predictions / total_predictions if total_predictions > 0 else 0.0
        
        # 计算置信度统计
        confidences = [record.get("detection_confidence", 0.5) for record in feedback_data]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # 计算模式分布
        mode_counts = {}
        for record in feedback_data:
            mode = record.get("detected_mode", "unknown")
            mode_counts[mode] = mode_counts.get(mode, 0) + 1
        
        mode_distribution = {
            mode: count / total_predictions 
            for mode, count in mode_counts.items()
        } if total_predictions > 0 else {}
        
        return {
            "accuracy": accuracy,
            "sample_size": total_predictions,
            "accurate_count": accurate_predictions,
            "error_count": total_predictions - accurate_predictions,
            "confidence_stats": {
                "avg_confidence": avg_confidence,
                "min_confidence": min(confidences) if confidences else 0.0,
                "max_confidence": max(confidences) if confidences else 0.0
            },
            "mode_distribution": mode_distribution
        }
    
    async def get_error_analysis(self, time_range: str = "last_30_days") -> Dict[str, Any]:
        """获取错误分析"""
        
        await self.initialize()
        
        feedback_data = await self.query_feedback(time_range)
        
        # 筛选错误案例
        error_cases = [record for record in feedback_data if not record.get("detection_accuracy")]
        
        if not error_cases:
            return {
                "total_errors": 0,
                "error_patterns": {},
                "common_mistakes": []
            }
        
        # 分析错误模式
        error_patterns = {}
        for case in error_cases:
            detected = case.get("detected_mode", "unknown")
            actual = case.get("user_actual_choice", "unknown")
            pattern = f"{detected} -> {actual}"
            error_patterns[pattern] = error_patterns.get(pattern, 0) + 1
        
        # 找出常见错误
        common_mistakes = sorted(
            error_patterns.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]  # 前5个最常见错误
        
        return {
            "total_errors": len(error_cases),
            "error_rate": len(error_cases) / len(feedback_data) if feedback_data else 0.0,
            "error_patterns": error_patterns,
            "common_mistakes": common_mistakes
        }
    
    async def cleanup_old_data(self, days_to_keep: int = 90) -> bool:
        """清理旧数据"""
        
        await self.initialize()
        
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # 清理旧的反馈数据
                await db.execute("""
                    DELETE FROM mode_detection_feedback 
                    WHERE timestamp < ?
                """, (cutoff_date.isoformat(),))
                
                # 清理旧的性能数据
                await db.execute("""
                    DELETE FROM mode_detection_performance 
                    WHERE date < ?
                """, (cutoff_date.date().isoformat(),))
                
                # 清理旧的学习记录
                await db.execute("""
                    DELETE FROM mode_detection_learning 
                    WHERE timestamp < ?
                """, (cutoff_date.isoformat(),))
                
                await db.commit()
            return True
        except Exception:
            return False
