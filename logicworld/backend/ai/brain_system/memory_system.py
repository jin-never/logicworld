"""
智能记忆与知识图谱系统
升级PromptX记忆系统，构建动态知识图谱和长期记忆整合机制
"""

import logging
import asyncio
import json
import sqlite3
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import hashlib
import os

# 导入现有系统组件
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agent_system.agent_factory import AgentFactory


class MemoryType(Enum):
    """记忆类型"""
    WORKING = "working"         # 工作记忆（短期）
    SEMANTIC = "semantic"       # 语义记忆（长期）
    EPISODIC = "episodic"       # 情景记忆（事件）
    PROCEDURAL = "procedural"   # 程序性记忆（技能）
    DECLARATIVE = "declarative" # 陈述性记忆（事实）


class MemoryImportance(Enum):
    """记忆重要性"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class MemoryNode:
    """记忆节点"""
    id: str
    content: str
    memory_type: MemoryType
    importance: MemoryImportance
    timestamp: str
    access_count: int = 0
    last_accessed: str = ""
    tags: List[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.metadata is None:
            self.metadata = {}


@dataclass
class KnowledgeEdge:
    """知识边（关系）"""
    source_id: str
    target_id: str
    relation_type: str
    strength: float
    timestamp: str
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class KnowledgeGraph:
    """知识图谱"""
    nodes: Dict[str, MemoryNode]
    edges: List[KnowledgeEdge]
    
    def __post_init__(self):
        if not hasattr(self, 'nodes'):
            self.nodes = {}
        if not hasattr(self, 'edges'):
            self.edges = []


class IntelligentMemorySystem:
    """
    智能记忆与知识图谱系统
    
    功能：
    1. 多类型记忆管理（工作记忆、语义记忆、情景记忆等）
    2. 动态知识图谱构建和维护
    3. 智能记忆检索和关联
    4. 记忆重要性评估和遗忘机制
    5. 跨会话记忆持久化
    """
    
    def __init__(self, db_path: str = "brain_memory.db"):
        self.logger = logging.getLogger(__name__)
        self.db_path = db_path
        self.is_initialized = False
        
        # 内存中的知识图谱
        self.knowledge_graph = KnowledgeGraph({}, [])
        
        # 工作记忆（临时存储）
        self.working_memory = {}

        # 简化的会话记忆（备用方案）
        self.session_memory: Dict[str, List[Dict[str, Any]]] = {}

        # 记忆访问统计
        self.access_stats = {}
        
    async def initialize(self):
        """初始化记忆系统"""
        if self.is_initialized:
            return
            
        self.logger.info("🧠 [IntelligentMemory] 初始化智能记忆系统...")
        
        try:
            # 初始化数据库
            await self._initialize_database()
            
            # 加载现有记忆到内存
            await self._load_memory_to_cache()
            
            # 初始化知识图谱
            await self._initialize_knowledge_graph()
            
            self.is_initialized = True
            self.logger.info("✅ [IntelligentMemory] 智能记忆系统初始化完成")
            
        except Exception as e:
            self.logger.error(f"❌ [IntelligentMemory] 初始化失败: {e}")
            raise
    
    async def process(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """处理记忆请求"""
        if not self.is_initialized:
            await self.initialize()
            
        self.logger.info("🧠 [IntelligentMemory] 处理记忆请求...")
        
        try:
            # 1. 存储当前交互到记忆
            memory_node = await self._store_interaction(request, analysis, previous_results)

            # 2. 检索相关记忆
            relevant_memories = await self._retrieve_relevant_memories(request.input_text, analysis)

            # 3. 更新知识图谱
            await self._update_knowledge_graph(memory_node, relevant_memories, analysis)

            # 4. 生成记忆增强的响应
            enhanced_response = await self._generate_memory_enhanced_response(
                request, relevant_memories, analysis
            )
            
            return {
                'output': enhanced_response,
                'confidence': 0.8,
                'relevant_memories': relevant_memories,
                'new_memory_id': memory_node.id,
                'updates': [{'type': 'memory_stored', 'id': memory_node.id}],
                'reasoning_trace': [
                    {
                        'module': 'intelligent_memory',
                        'action': 'process_memory',
                        'result': {
                            'stored_memory': memory_node.id,
                            'retrieved_count': len(relevant_memories)
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                ],
                'metadata': {
                    'memory_type': memory_node.memory_type.value,
                    'importance': memory_node.importance.value,
                    'graph_nodes_count': len(self.knowledge_graph.nodes),
                    'graph_edges_count': len(self.knowledge_graph.edges)
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ [IntelligentMemory] 处理失败: {e}")
            return await self._create_fallback_memory_response(request, str(e))

    async def _create_fallback_memory_response(self, request, error_msg: str) -> Dict[str, Any]:
        """创建备用记忆响应"""
        self.logger.info("🔧 [IntelligentMemory] 使用简化记忆模式...")

        try:
            # 简化的记忆处理
            user_id = getattr(request, 'user_id', 'default')
            session_id = getattr(request, 'session_id', 'default')

            # 简单的会话记忆
            session_key = f"{user_id}_{session_id}"
            if session_key not in self.session_memory:
                self.session_memory[session_key] = []

            # 存储当前交互
            interaction = {
                'input': request.input_text,
                'timestamp': datetime.now().isoformat(),
                'id': f"mem_{len(self.session_memory[session_key])}"
            }
            self.session_memory[session_key].append(interaction)

            # 保持最近的10条记忆
            if len(self.session_memory[session_key]) > 10:
                self.session_memory[session_key] = self.session_memory[session_key][-10:]

            # 检索相关记忆（简单关键词匹配）
            relevant_memories = []
            input_words = set(request.input_text.lower().split())

            for memory in self.session_memory[session_key][:-1]:  # 排除当前记忆
                memory_words = set(memory['input'].lower().split())
                if input_words & memory_words:  # 有共同词汇
                    relevant_memories.append(memory)

            # 生成记忆增强响应
            if relevant_memories:
                memory_context = f"基于我们之前的对话，我记得您曾经询问过相关的内容。"
            else:
                memory_context = "这是我们在这个话题上的新对话。"

            return {
                'output': memory_context,
                'confidence': 0.5,
                'relevant_memories': relevant_memories[-3:] if relevant_memories else [],  # 最近3条相关记忆
                'new_memory_id': interaction['id'],
                'updates': [{'type': 'simple_memory_stored', 'id': interaction['id']}],
                'reasoning_trace': [
                    {
                        'module': 'intelligent_memory',
                        'action': 'fallback_memory_processing',
                        'result': f"存储记忆，找到{len(relevant_memories)}条相关记忆",
                        'timestamp': datetime.now().isoformat()
                    }
                ],
                'metadata': {
                    'is_fallback': True,
                    'session_memories_count': len(self.session_memory[session_key]),
                    'relevant_count': len(relevant_memories),
                    'error': error_msg
                }
            }

        except Exception as e:
            self.logger.error(f"❌ [IntelligentMemory] 备用记忆处理也失败: {e}")
            return {
                'output': "我正在记录我们的对话，以便为您提供更好的服务。",
                'confidence': 0.3,
                'relevant_memories': [],
                'new_memory_id': 'fallback',
                'updates': [],
                'reasoning_trace': [],
                'metadata': {'error': str(e)}
            }
    
    async def _store_interaction(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> MemoryNode:
        """存储交互到记忆"""
        self.logger.debug("💾 [IntelligentMemory] 存储交互记忆...")
        
        # 生成记忆ID
        memory_id = self._generate_memory_id(request.input_text)
        
        # 确定记忆类型
        memory_type = await self._determine_memory_type(request, analysis)
        
        # 评估重要性
        importance = await self._assess_memory_importance(request, analysis, previous_results)
        
        # 提取标签
        tags = await self._extract_memory_tags(request, analysis)
        
        # 创建记忆节点
        memory_node = MemoryNode(
            id=memory_id,
            content=request.input_text,
            memory_type=memory_type,
            importance=importance,
            timestamp=datetime.now().isoformat(),
            tags=tags,
            metadata={
                'user_id': getattr(request, 'user_id', 'default'),
                'session_id': getattr(request, 'session_id', 'default'),
                'analysis': self._serialize_analysis(analysis),  # 序列化analysis
                'previous_results': self._serialize_results(previous_results)  # 序列化results
            }
        )
        
        # 存储到数据库
        await self._save_memory_to_db(memory_node)
        
        # 添加到内存缓存
        self.knowledge_graph.nodes[memory_id] = memory_node
        
        return memory_node

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

    def _serialize_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """序列化结果数据，处理不可JSON序列化的对象"""
        if not results:
            return {}

        serialized = {}
        for key, value in results.items():
            try:
                # 尝试JSON序列化测试
                json.dumps(value)
                serialized[key] = value
            except (TypeError, ValueError):
                # 如果无法序列化，转换为基本类型
                if isinstance(value, dict):
                    serialized[key] = self._serialize_results(value)  # 递归处理
                elif hasattr(value, 'value'):  # 枚举类型
                    serialized[key] = value.value
                else:
                    serialized[key] = str(value)

        return serialized

    async def _retrieve_relevant_memories(self, query: str, analysis: Dict[str, Any]) -> List[MemoryNode]:
        """检索相关记忆"""
        self.logger.debug("🔍 [IntelligentMemory] 检索相关记忆...")
        
        relevant_memories = []
        
        # 1. 基于关键词的检索
        keyword_matches = await self._keyword_based_retrieval(query, analysis)
        relevant_memories.extend(keyword_matches)
        
        # 2. 基于语义的检索
        semantic_matches = await self._semantic_based_retrieval(query, analysis)
        relevant_memories.extend(semantic_matches)
        
        # 3. 基于图结构的检索
        graph_matches = await self._graph_based_retrieval(query, analysis)
        relevant_memories.extend(graph_matches)
        
        # 去重和排序
        unique_memories = self._deduplicate_memories(relevant_memories)
        sorted_memories = await self._rank_memories_by_relevance(unique_memories, query, analysis)
        
        # 更新访问统计
        for memory in sorted_memories[:5]:  # 只更新前5个最相关的
            await self._update_access_stats(memory.id)
        
        return sorted_memories[:10]  # 返回前10个最相关的记忆
    
    async def _update_knowledge_graph(self, new_memory: MemoryNode, relevant_memories: List[MemoryNode], analysis: Dict[str, Any]):
        """更新知识图谱"""
        self.logger.debug("🔗 [IntelligentMemory] 更新知识图谱...")
        
        # 为新记忆创建与相关记忆的连接
        for relevant_memory in relevant_memories[:3]:  # 只连接前3个最相关的
            # 计算关系强度
            strength = await self._calculate_relation_strength(new_memory, relevant_memory, analysis)
            
            if strength > 0.3:  # 只创建强度足够的连接
                # 确定关系类型
                relation_type = await self._determine_relation_type(new_memory, relevant_memory, analysis)
                
                # 创建知识边
                edge = KnowledgeEdge(
                    source_id=new_memory.id,
                    target_id=relevant_memory.id,
                    relation_type=relation_type,
                    strength=strength,
                    timestamp=datetime.now().isoformat(),
                    metadata={'analysis': analysis}
                )
                
                self.knowledge_graph.edges.append(edge)
                
                # 保存到数据库
                await self._save_edge_to_db(edge)
    
    async def _generate_memory_enhanced_response(self, request, relevant_memories: List[MemoryNode], analysis: Dict[str, Any]) -> str:
        """生成记忆增强的响应"""
        if not relevant_memories:
            return "我理解了您的请求，并将其记录在记忆中。"
        
        # 构建记忆上下文
        memory_context = []
        for memory in relevant_memories[:3]:
            memory_context.append(f"相关记忆：{memory.content}")
        
        context_str = "\n".join(memory_context)
        
        # 生成增强响应
        prompt = f"""
基于以下相关记忆，为用户请求生成响应：

用户请求：{request.input_text}

相关记忆：
{context_str}

请生成一个整合了记忆信息的智能响应。
"""
        
        try:
            response = await AgentFactory.ask_llm(prompt)
            return response.strip()
        except Exception as e:
            self.logger.warning(f"生成记忆增强响应失败: {e}")
            return f"基于我的记忆，我记得我们之前讨论过相关话题。让我为您提供帮助。"
    
    # 数据库相关方法
    async def _initialize_database(self):
        """初始化数据库"""
        self.logger.debug("🗄️ [IntelligentMemory] 初始化数据库...")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建记忆节点表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memory_nodes (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                memory_type TEXT NOT NULL,
                importance INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                access_count INTEGER DEFAULT 0,
                last_accessed TEXT,
                tags TEXT,
                metadata TEXT
            )
        ''')
        
        # 创建知识边表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS knowledge_edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                relation_type TEXT NOT NULL,
                strength REAL NOT NULL,
                timestamp TEXT NOT NULL,
                metadata TEXT,
                FOREIGN KEY (source_id) REFERENCES memory_nodes (id),
                FOREIGN KEY (target_id) REFERENCES memory_nodes (id)
            )
        ''')
        
        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_nodes (memory_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_importance ON memory_nodes (importance)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON memory_nodes (timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_edges_source ON knowledge_edges (source_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_edges_target ON knowledge_edges (target_id)')
        
        conn.commit()
        conn.close()
    
    async def _load_memory_to_cache(self):
        """加载记忆到缓存"""
        self.logger.debug("📥 [IntelligentMemory] 加载记忆到缓存...")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 加载最近的记忆节点（限制数量避免内存过大）
        cursor.execute('''
            SELECT * FROM memory_nodes 
            ORDER BY timestamp DESC 
            LIMIT 1000
        ''')
        
        rows = cursor.fetchall()
        for row in rows:
            memory_node = self._row_to_memory_node(row)
            self.knowledge_graph.nodes[memory_node.id] = memory_node
        
        # 加载对应的边
        if self.knowledge_graph.nodes:
            node_ids = list(self.knowledge_graph.nodes.keys())
            placeholders = ','.join(['?' for _ in node_ids])
            
            cursor.execute(f'''
                SELECT * FROM knowledge_edges 
                WHERE source_id IN ({placeholders}) 
                OR target_id IN ({placeholders})
            ''', node_ids + node_ids)
            
            edge_rows = cursor.fetchall()
            for row in edge_rows:
                edge = self._row_to_knowledge_edge(row)
                self.knowledge_graph.edges.append(edge)
        
        conn.close()
        
        self.logger.info(f"📥 [IntelligentMemory] 加载了 {len(self.knowledge_graph.nodes)} 个记忆节点和 {len(self.knowledge_graph.edges)} 条边")
    
    async def _initialize_knowledge_graph(self):
        """初始化知识图谱"""
        self.logger.debug("🕸️ [IntelligentMemory] 初始化知识图谱...")
        
        # 如果没有现有的图谱，创建基础结构
        if not self.knowledge_graph.nodes:
            self.knowledge_graph = KnowledgeGraph({}, [])
        
        # 这里可以添加图谱分析和优化逻辑
        await self._analyze_graph_structure()
    
    async def _analyze_graph_structure(self):
        """分析图谱结构"""
        node_count = len(self.knowledge_graph.nodes)
        edge_count = len(self.knowledge_graph.edges)
        
        self.logger.info(f"🕸️ [IntelligentMemory] 知识图谱结构: {node_count} 节点, {edge_count} 边")
        
        # 计算图谱密度
        if node_count > 1:
            max_edges = node_count * (node_count - 1) / 2
            density = edge_count / max_edges if max_edges > 0 else 0
            self.logger.info(f"🕸️ [IntelligentMemory] 图谱密度: {density:.3f}")
    
    # 辅助方法
    def _generate_memory_id(self, content: str) -> str:
        """生成记忆ID"""
        timestamp = datetime.now().isoformat()
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        return f"mem_{timestamp}_{content_hash}"
    
    def _row_to_memory_node(self, row) -> MemoryNode:
        """将数据库行转换为记忆节点"""
        return MemoryNode(
            id=row[0],
            content=row[1],
            memory_type=MemoryType(row[2]),
            importance=MemoryImportance(row[3]),
            timestamp=row[4],
            access_count=row[5] or 0,
            last_accessed=row[6] or "",
            tags=json.loads(row[7]) if row[7] else [],
            metadata=json.loads(row[8]) if row[8] else {}
        )
    
    def _row_to_knowledge_edge(self, row) -> KnowledgeEdge:
        """将数据库行转换为知识边"""
        return KnowledgeEdge(
            source_id=row[1],
            target_id=row[2],
            relation_type=row[3],
            strength=row[4],
            timestamp=row[5],
            metadata=json.loads(row[6]) if row[6] else {}
        )

    # 记忆分析和处理方法
    async def _determine_memory_type(self, request, analysis: Dict[str, Any]) -> MemoryType:
        """确定记忆类型"""
        intent = analysis.get('semantic_analysis', {}).get('intent_analysis', {}).get('primary_intent', 'unknown')

        if intent == 'question':
            return MemoryType.EPISODIC  # 问题通常是情景记忆
        elif intent in ['request', 'command']:
            return MemoryType.PROCEDURAL  # 请求和命令是程序性记忆
        elif any(keyword in request.input_text for keyword in ['事实', '知识', '定义', '概念']):
            return MemoryType.DECLARATIVE  # 事实性内容
        else:
            return MemoryType.SEMANTIC  # 默认为语义记忆

    async def _assess_memory_importance(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> MemoryImportance:
        """评估记忆重要性"""
        importance_score = 0

        # 基于复杂度
        complexity = analysis.get('semantic_analysis', {}).get('complexity_score', 0)
        importance_score += complexity * 2

        # 基于情感强度
        emotion_intensity = analysis.get('semantic_analysis', {}).get('emotion_analysis', {}).get('emotion_intensity', 0)
        importance_score += emotion_intensity

        # 基于用户意图强度
        intent_strength = analysis.get('semantic_analysis', {}).get('intent_analysis', {}).get('intent_strength', 0)
        importance_score += intent_strength

        # 基于文本长度（更长的文本可能更重要）
        text_length_factor = min(1.0, len(request.input_text) / 200)
        importance_score += text_length_factor * 0.5

        # 映射到重要性级别
        if importance_score >= 3.0:
            return MemoryImportance.CRITICAL
        elif importance_score >= 2.0:
            return MemoryImportance.HIGH
        elif importance_score >= 1.0:
            return MemoryImportance.MEDIUM
        else:
            return MemoryImportance.LOW

    async def _extract_memory_tags(self, request, analysis: Dict[str, Any]) -> List[str]:
        """提取记忆标签"""
        tags = []

        # 从语义分析中提取关键词作为标签
        keywords = analysis.get('semantic_analysis', {}).get('surface_analysis', {}).get('keywords', [])
        tags.extend(keywords[:5])  # 最多5个关键词标签

        # 添加意图标签
        intent = analysis.get('semantic_analysis', {}).get('intent_analysis', {}).get('primary_intent', '')
        if intent:
            tags.append(f"intent:{intent}")

        # 添加情感标签
        emotion = analysis.get('semantic_analysis', {}).get('emotion_analysis', {}).get('emotion_type', '')
        if emotion:
            tags.append(f"emotion:{emotion}")

        # 添加实体标签
        entities = analysis.get('semantic_analysis', {}).get('surface_analysis', {}).get('entities', [])
        for entity in entities[:3]:  # 最多3个实体标签
            if isinstance(entity, dict) and 'type' in entity:
                tags.append(f"entity:{entity['type']}")

        return list(set(tags))  # 去重

    async def _save_memory_to_db(self, memory_node: MemoryNode):
        """保存记忆到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT OR REPLACE INTO memory_nodes
            (id, content, memory_type, importance, timestamp, access_count, last_accessed, tags, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            memory_node.id,
            memory_node.content,
            memory_node.memory_type.value,
            memory_node.importance.value,
            memory_node.timestamp,
            memory_node.access_count,
            memory_node.last_accessed,
            json.dumps(memory_node.tags, ensure_ascii=False),
            json.dumps(memory_node.metadata, ensure_ascii=False)
        ))

        conn.commit()
        conn.close()

    async def _save_edge_to_db(self, edge: KnowledgeEdge):
        """保存知识边到数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO knowledge_edges
            (source_id, target_id, relation_type, strength, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            edge.source_id,
            edge.target_id,
            edge.relation_type,
            edge.strength,
            edge.timestamp,
            json.dumps(edge.metadata, ensure_ascii=False)
        ))

        conn.commit()
        conn.close()

    # 记忆检索方法
    async def _keyword_based_retrieval(self, query: str, analysis: Dict[str, Any]) -> List[MemoryNode]:
        """基于关键词的记忆检索"""
        query_keywords = set(query.lower().split())
        matches = []

        for memory_node in self.knowledge_graph.nodes.values():
            # 检查内容匹配
            content_keywords = set(memory_node.content.lower().split())
            overlap = len(query_keywords.intersection(content_keywords))

            if overlap > 0:
                # 计算匹配分数
                score = overlap / len(query_keywords.union(content_keywords))
                matches.append((memory_node, score))

        # 按分数排序
        matches.sort(key=lambda x: x[1], reverse=True)
        return [match[0] for match in matches[:20]]

    async def _semantic_based_retrieval(self, query: str, analysis: Dict[str, Any]) -> List[MemoryNode]:
        """基于语义的记忆检索"""
        matches = []

        # 提取查询的语义特征
        query_intent = analysis.get('semantic_analysis', {}).get('intent_analysis', {}).get('primary_intent', '')
        query_emotion = analysis.get('semantic_analysis', {}).get('emotion_analysis', {}).get('emotion_type', '')
        query_keywords = analysis.get('semantic_analysis', {}).get('surface_analysis', {}).get('keywords', [])

        for memory_node in self.knowledge_graph.nodes.values():
            semantic_score = 0

            # 意图匹配
            if f"intent:{query_intent}" in memory_node.tags:
                semantic_score += 0.3

            # 情感匹配
            if f"emotion:{query_emotion}" in memory_node.tags:
                semantic_score += 0.2

            # 关键词匹配
            keyword_overlap = len(set(query_keywords).intersection(set(memory_node.tags)))
            semantic_score += keyword_overlap * 0.1

            if semantic_score > 0.1:
                matches.append((memory_node, semantic_score))

        # 按语义分数排序
        matches.sort(key=lambda x: x[1], reverse=True)
        return [match[0] for match in matches[:15]]

    async def _graph_based_retrieval(self, query: str, analysis: Dict[str, Any]) -> List[MemoryNode]:
        """基于图结构的记忆检索"""
        matches = []

        # 首先找到与查询最相关的节点
        initial_matches = await self._keyword_based_retrieval(query, analysis)

        if not initial_matches:
            return []

        # 通过图结构扩展搜索
        visited = set()
        for initial_node in initial_matches[:3]:  # 只从前3个最相关的节点开始
            connected_nodes = await self._get_connected_nodes(initial_node.id, max_depth=2)
            for node_id, distance in connected_nodes:
                if node_id not in visited and node_id in self.knowledge_graph.nodes:
                    visited.add(node_id)
                    # 距离越近，分数越高
                    score = 1.0 / (distance + 1)
                    matches.append((self.knowledge_graph.nodes[node_id], score))

        # 按分数排序
        matches.sort(key=lambda x: x[1], reverse=True)
        return [match[0] for match in matches[:10]]

    async def _get_connected_nodes(self, node_id: str, max_depth: int = 2) -> List[Tuple[str, int]]:
        """获取连接的节点"""
        connected = []
        visited = {node_id}
        queue = [(node_id, 0)]

        while queue and len(connected) < 20:  # 限制结果数量
            current_id, depth = queue.pop(0)

            if depth >= max_depth:
                continue

            # 查找所有连接的边
            for edge in self.knowledge_graph.edges:
                next_id = None
                if edge.source_id == current_id and edge.target_id not in visited:
                    next_id = edge.target_id
                elif edge.target_id == current_id and edge.source_id not in visited:
                    next_id = edge.source_id

                if next_id:
                    visited.add(next_id)
                    connected.append((next_id, depth + 1))
                    queue.append((next_id, depth + 1))

        return connected

    def _deduplicate_memories(self, memories: List[MemoryNode]) -> List[MemoryNode]:
        """去重记忆"""
        seen_ids = set()
        unique_memories = []

        for memory in memories:
            if memory.id not in seen_ids:
                seen_ids.add(memory.id)
                unique_memories.append(memory)

        return unique_memories

    async def _rank_memories_by_relevance(self, memories: List[MemoryNode], query: str, analysis: Dict[str, Any]) -> List[MemoryNode]:
        """按相关性排序记忆"""
        scored_memories = []

        for memory in memories:
            relevance_score = await self._calculate_relevance_score(memory, query, analysis)
            scored_memories.append((memory, relevance_score))

        # 按相关性分数排序
        scored_memories.sort(key=lambda x: x[1], reverse=True)
        return [memory for memory, score in scored_memories]

    async def _calculate_relevance_score(self, memory: MemoryNode, query: str, analysis: Dict[str, Any]) -> float:
        """计算相关性分数"""
        score = 0.0

        # 基础文本相似度
        query_words = set(query.lower().split())
        memory_words = set(memory.content.lower().split())
        text_similarity = len(query_words.intersection(memory_words)) / len(query_words.union(memory_words))
        score += text_similarity * 0.4

        # 重要性权重
        importance_weight = memory.importance.value / 4.0  # 归一化到0-1
        score += importance_weight * 0.2

        # 访问频率权重
        access_weight = min(1.0, memory.access_count / 10.0)  # 归一化
        score += access_weight * 0.1

        # 时间衰减（最近的记忆更相关）
        try:
            memory_time = datetime.fromisoformat(memory.timestamp.replace('Z', '+00:00'))
            time_diff = datetime.now() - memory_time.replace(tzinfo=None)
            time_decay = max(0.1, 1.0 - (time_diff.days / 365.0))  # 一年后衰减到0.1
            score += time_decay * 0.3
        except:
            score += 0.1  # 如果时间解析失败，给个基础分数

        return score

    async def _update_access_stats(self, memory_id: str):
        """更新访问统计"""
        if memory_id in self.knowledge_graph.nodes:
            memory_node = self.knowledge_graph.nodes[memory_id]
            memory_node.access_count += 1
            memory_node.last_accessed = datetime.now().isoformat()

            # 更新数据库
            await self._save_memory_to_db(memory_node)

    # 知识图谱相关方法
    async def _calculate_relation_strength(self, memory1: MemoryNode, memory2: MemoryNode, analysis: Dict[str, Any]) -> float:
        """计算关系强度"""
        strength = 0.0

        # 标签重叠
        tag_overlap = len(set(memory1.tags).intersection(set(memory2.tags)))
        strength += tag_overlap * 0.2

        # 内容相似度
        words1 = set(memory1.content.lower().split())
        words2 = set(memory2.content.lower().split())
        content_similarity = len(words1.intersection(words2)) / len(words1.union(words2))
        strength += content_similarity * 0.5

        # 时间接近度
        try:
            time1 = datetime.fromisoformat(memory1.timestamp.replace('Z', '+00:00'))
            time2 = datetime.fromisoformat(memory2.timestamp.replace('Z', '+00:00'))
            time_diff = abs((time1 - time2).total_seconds())
            time_proximity = max(0, 1.0 - (time_diff / (24 * 3600)))  # 一天内的接近度
            strength += time_proximity * 0.3
        except:
            pass

        return min(1.0, strength)

    async def _determine_relation_type(self, memory1: MemoryNode, memory2: MemoryNode, analysis: Dict[str, Any]) -> str:
        """确定关系类型"""
        # 基于标签确定关系类型
        common_tags = set(memory1.tags).intersection(set(memory2.tags))

        if any('intent:' in tag for tag in common_tags):
            return 'similar_intent'
        elif any('emotion:' in tag for tag in common_tags):
            return 'similar_emotion'
        elif any('entity:' in tag for tag in common_tags):
            return 'shared_entity'
        else:
            return 'semantic_similarity'

    async def _create_fallback_memory_response(self, request, error_msg: str) -> Dict[str, Any]:
        """创建备用记忆响应"""
        return {
            'output': f"记忆处理遇到问题：{error_msg}。我仍会尽力为您提供帮助。",
            'confidence': 0.3,
            'relevant_memories': [],
            'new_memory_id': None,
            'updates': [],
            'reasoning_trace': [
                {
                    'module': 'intelligent_memory',
                    'action': 'fallback',
                    'error': error_msg,
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'metadata': {'error': True, 'fallback': True}
        }
