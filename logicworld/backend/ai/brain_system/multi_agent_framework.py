"""
多代理协作框架
基于LangGraph构建多代理协作系统，实现专家代理间的智能协作
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
import json
from datetime import datetime
import uuid

# 导入现有系统组件
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agent_system.agent_factory import AgentFactory
from agent_system.orchestrator import Orchestrator

# 尝试导入LangGraph
try:
    from langgraph.graph import StateGraph
    from typing import TypedDict
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logging.warning("LangGraph not available, using fallback multi-agent system")


class AgentRole(Enum):
    """代理角色"""
    COORDINATOR = "coordinator"       # 协调者
    ANALYST = "analyst"              # 分析师
    CREATIVE = "creative"            # 创意师
    TECHNICAL = "technical"          # 技术专家
    DOMAIN_EXPERT = "domain_expert"  # 领域专家
    CRITIC = "critic"                # 评论家
    SYNTHESIZER = "synthesizer"      # 综合者


class TaskType(Enum):
    """任务类型"""
    ANALYSIS = "analysis"
    CREATION = "creation"
    PROBLEM_SOLVING = "problem_solving"
    EVALUATION = "evaluation"
    SYNTHESIS = "synthesis"


class CollaborationMode(Enum):
    """协作模式"""
    SEQUENTIAL = "sequential"        # 顺序协作
    PARALLEL = "parallel"           # 并行协作
    HIERARCHICAL = "hierarchical"   # 层次协作
    DEMOCRATIC = "democratic"       # 民主协作


@dataclass
class AgentProfile:
    """代理档案"""
    id: str
    role: AgentRole
    name: str
    description: str
    expertise: List[str]
    capabilities: List[str]
    personality_traits: Dict[str, float]
    collaboration_style: str
    performance_history: Dict[str, Any]
    
    def __post_init__(self):
        if not hasattr(self, 'performance_history'):
            self.performance_history = {}


@dataclass
class CollaborationTask:
    """协作任务"""
    id: str
    description: str
    task_type: TaskType
    required_roles: List[AgentRole]
    priority: int
    deadline: Optional[str]
    context: Dict[str, Any]
    status: str = "pending"
    assigned_agents: List[str] = None
    results: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.assigned_agents is None:
            self.assigned_agents = []
        if self.results is None:
            self.results = {}


@dataclass
class CollaborationResult:
    """协作结果"""
    task_id: str
    final_output: str
    confidence: float
    agent_contributions: Dict[str, Any]
    collaboration_trace: List[Dict[str, Any]]
    performance_metrics: Dict[str, float]
    timestamp: str


class MultiAgentFramework:
    """
    多代理协作框架
    
    功能：
    1. 专家代理池管理
    2. 智能任务分解和分配
    3. 多种协作模式支持
    4. 代理间通信和协调
    5. 结果整合和质量评估
    6. 性能监控和优化
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.is_initialized = False
        
        # 代理池
        self.agent_pool: Dict[str, AgentProfile] = {}
        
        # 活跃任务
        self.active_tasks: Dict[str, CollaborationTask] = {}
        
        # 协作历史
        self.collaboration_history: List[CollaborationResult] = []
        
        # 性能统计
        self.performance_stats = {}
        
    async def initialize(self):
        """初始化多代理框架"""
        if self.is_initialized:
            return
            
        self.logger.info("🤖 [MultiAgent] 初始化多代理协作框架...")
        
        try:
            # 初始化专家代理池
            await self._initialize_agent_pool()
            
            # 初始化协作模式
            await self._initialize_collaboration_modes()
            
            # 初始化性能监控
            await self._initialize_performance_monitoring()
            
            self.is_initialized = True
            self.logger.info("✅ [MultiAgent] 多代理协作框架初始化完成")
            
        except Exception as e:
            self.logger.error(f"❌ [MultiAgent] 初始化失败: {e}")
            raise
    
    async def process(self, request, analysis: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """处理多代理协作请求"""
        if not self.is_initialized:
            await self.initialize()
            
        self.logger.info("🤖 [MultiAgent] 开始多代理协作...")
        
        try:
            # 1. 分析协作需求
            collaboration_requirements = await self._analyze_collaboration_requirements(request, analysis)

            # 2. 创建协作任务
            task = await self._create_collaboration_task(request, collaboration_requirements, analysis)

            # 3. 选择和分配代理
            selected_agents = await self._select_and_assign_agents(task, collaboration_requirements)

            # 4. 执行协作
            collaboration_result = await self._execute_collaboration(task, selected_agents, previous_results)

            # 5. 评估和优化
            final_result = await self._evaluate_and_optimize_result(collaboration_result, task)
            
            return {
                'output': final_result['final_output'],
                'confidence': final_result['confidence'],
                'agent_contributions': final_result['agent_contributions'],
                'collaboration_trace': final_result['collaboration_trace'],
                'reasoning_trace': [
                    {
                        'module': 'multi_agent_framework',
                        'action': 'collaborate',
                        'result': {
                            'task_id': task.id,
                            'agents_involved': len(selected_agents),
                            'collaboration_mode': collaboration_requirements['mode']
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                ],
                'metadata': {
                    'task_type': task.task_type.value,
                    'collaboration_mode': collaboration_requirements['mode'],
                    'agents_count': len(selected_agents),
                    'performance_metrics': final_result['performance_metrics']
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ [MultiAgent] 协作失败: {e}")
            return await self._create_fallback_collaboration_result(request, str(e))

    async def _create_fallback_collaboration_result(self, request, error_msg: str) -> Dict[str, Any]:
        """创建备用协作结果"""
        self.logger.info("🔧 [MultiAgent] 使用备用协作模式...")

        try:
            # 简化的多代理协作模拟
            input_text = request.input_text.lower()

            # 模拟不同专家的观点
            perspectives = []

            # 分析师视角
            if any(word in input_text for word in ['什么是', '定义', '解释']):
                perspectives.append({
                    'agent': 'analyst',
                    'role': '分析师',
                    'contribution': '从概念定义和理论框架角度进行分析'
                })

            # 技术专家视角
            if any(word in input_text for word in ['如何', '实现', '技术', '方法']):
                perspectives.append({
                    'agent': 'technical_expert',
                    'role': '技术专家',
                    'contribution': '提供技术实现方案和最佳实践'
                })

            # 创意师视角
            if any(word in input_text for word in ['创新', '设计', '想法', '方案']):
                perspectives.append({
                    'agent': 'creative_designer',
                    'role': '创意师',
                    'contribution': '提供创新思路和设计理念'
                })

            # 如果没有匹配到特定视角，使用通用协作
            if not perspectives:
                perspectives = [
                    {'agent': 'coordinator', 'role': '协调者', 'contribution': '整体协调和综合分析'},
                    {'agent': 'analyst', 'role': '分析师', 'contribution': '深度分析和见解提供'}
                ]

            # 生成协作输出
            collaboration_output = self._generate_collaborative_response(request.input_text, perspectives)

            return {
                'output': collaboration_output,
                'confidence': 0.6,
                'agent_contributions': {p['agent']: p['contribution'] for p in perspectives},
                'collaboration_trace': [
                    {
                        'step': i+1,
                        'agent': p['agent'],
                        'role': p['role'],
                        'action': 'contribute_perspective',
                        'timestamp': datetime.now().isoformat()
                    } for i, p in enumerate(perspectives)
                ],
                'reasoning_trace': [
                    {
                        'module': 'multi_agent_framework',
                        'action': 'fallback_collaboration',
                        'result': f"使用{len(perspectives)}个代理视角进行协作",
                        'timestamp': datetime.now().isoformat()
                    }
                ],
                'metadata': {
                    'is_fallback': True,
                    'agents_simulated': len(perspectives),
                    'error': error_msg
                }
            }

        except Exception as e:
            self.logger.error(f"❌ [MultiAgent] 备用协作也失败: {e}")
            return {
                'output': "我正在协调多个专家为您分析这个问题，请稍等片刻。",
                'confidence': 0.3,
                'agent_contributions': {},
                'collaboration_trace': [],
                'reasoning_trace': [],
                'metadata': {'error': str(e)}
            }

    def _generate_collaborative_response(self, input_text: str, perspectives: List[Dict[str, str]]) -> str:
        """生成协作响应"""
        if len(perspectives) == 1:
            return f"基于{perspectives[0]['role']}的专业视角，我为您提供以下分析和建议。"

        roles = [p['role'] for p in perspectives]
        roles_str = '、'.join(roles[:-1]) + f"和{roles[-1]}" if len(roles) > 1 else roles[0]

        return f"我已经协调了{roles_str}等多个专业角色，为您提供全面的分析。从不同专业角度来看，这个问题涉及多个层面，让我为您提供综合的解答和建议。"
    
    async def _analyze_collaboration_requirements(self, request, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """分析协作需求"""
        self.logger.debug("🔍 [MultiAgent] 分析协作需求...")
        
        complexity = analysis.get('semantic_analysis', {}).get('complexity_score', 0.5)
        intent = analysis.get('semantic_analysis', {}).get('intent_analysis', {}).get('primary_intent', 'unknown')
        
        requirements = {
            'complexity_level': complexity,
            'required_expertise': await self._identify_required_expertise(request.input_text, analysis),
            'task_type': await self._determine_task_type(request.input_text, intent),
            'collaboration_mode': await self._select_collaboration_mode(complexity, intent),
            'agent_count': await self._estimate_required_agents(complexity, intent),
            'priority': await self._assess_task_priority(request, analysis)
        }
        
        return requirements
    
    async def _create_collaboration_task(self, request, requirements: Dict[str, Any], analysis: Dict[str, Any]) -> CollaborationTask:
        """创建协作任务"""
        task_id = f"task_{uuid.uuid4().hex[:8]}"
        
        # 确定所需角色
        required_roles = await self._determine_required_roles(requirements)
        
        task = CollaborationTask(
            id=task_id,
            description=request.input_text,
            task_type=requirements['task_type'],
            required_roles=required_roles,
            priority=requirements['priority'],
            deadline=None,  # 可以根据需要设置
            context={
                'user_id': getattr(request, 'user_id', 'default'),
                'session_id': getattr(request, 'session_id', 'default'),
                'analysis': analysis,
                'requirements': requirements
            }
        )
        
        self.active_tasks[task_id] = task
        return task
    
    async def _select_and_assign_agents(self, task: CollaborationTask, requirements: Dict[str, Any]) -> List[AgentProfile]:
        """选择和分配代理"""
        self.logger.debug("👥 [MultiAgent] 选择和分配代理...")
        
        selected_agents = []
        
        # 为每个所需角色选择最佳代理
        for role in task.required_roles:
            best_agent = await self._find_best_agent_for_role(role, task, requirements)
            if best_agent:
                selected_agents.append(best_agent)
                task.assigned_agents.append(best_agent.id)
        
        # 如果没有足够的专门代理，创建临时代理
        if len(selected_agents) < requirements['agent_count']:
            additional_agents = await self._create_temporary_agents(
                task, requirements['agent_count'] - len(selected_agents)
            )
            selected_agents.extend(additional_agents)
        
        return selected_agents
    
    async def _execute_collaboration(self, task: CollaborationTask, agents: List[AgentProfile], previous_results: Dict[str, Any]) -> CollaborationResult:
        """执行协作"""
        self.logger.info(f"⚡ [MultiAgent] 执行协作，任务: {task.id}")
        
        collaboration_mode = task.context['requirements']['collaboration_mode']
        
        if collaboration_mode == CollaborationMode.SEQUENTIAL.value:
            return await self._execute_sequential_collaboration(task, agents, previous_results)
        elif collaboration_mode == CollaborationMode.PARALLEL.value:
            return await self._execute_parallel_collaboration(task, agents, previous_results)
        elif collaboration_mode == CollaborationMode.HIERARCHICAL.value:
            return await self._execute_hierarchical_collaboration(task, agents, previous_results)
        else:
            return await self._execute_democratic_collaboration(task, agents, previous_results)
    
    async def _execute_sequential_collaboration(self, task: CollaborationTask, agents: List[AgentProfile], previous_results: Dict[str, Any]) -> CollaborationResult:
        """执行顺序协作"""
        self.logger.debug("📝 [MultiAgent] 执行顺序协作...")
        
        agent_contributions = {}
        collaboration_trace = []
        current_input = task.description
        
        for i, agent in enumerate(agents):
            self.logger.debug(f"🤖 [MultiAgent] 代理 {agent.name} 开始工作...")
            
            # 构建代理特定的提示
            agent_prompt = await self._build_agent_prompt(agent, current_input, task, previous_results)
            
            # 执行代理任务
            agent_result = await self._execute_agent_task(agent, agent_prompt, task)
            
            # 记录贡献
            agent_contributions[agent.id] = {
                'role': agent.role.value,
                'input': current_input,
                'output': agent_result['output'],
                'confidence': agent_result['confidence'],
                'reasoning': agent_result.get('reasoning', '')
            }
            
            # 记录协作轨迹
            collaboration_trace.append({
                'step': i + 1,
                'agent_id': agent.id,
                'agent_role': agent.role.value,
                'action': 'process',
                'input': current_input,
                'output': agent_result['output'],
                'timestamp': datetime.now().isoformat()
            })
            
            # 更新输入为下一个代理
            current_input = agent_result['output']
        
        # 计算整体置信度
        confidences = [contrib['confidence'] for contrib in agent_contributions.values()]
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.5
        
        return CollaborationResult(
            task_id=task.id,
            final_output=current_input,
            confidence=overall_confidence,
            agent_contributions=agent_contributions,
            collaboration_trace=collaboration_trace,
            performance_metrics=await self._calculate_performance_metrics(agent_contributions, collaboration_trace),
            timestamp=datetime.now().isoformat()
        )
    
    async def _execute_parallel_collaboration(self, task: CollaborationTask, agents: List[AgentProfile], previous_results: Dict[str, Any]) -> CollaborationResult:
        """执行并行协作"""
        self.logger.debug("🔀 [MultiAgent] 执行并行协作...")
        
        # 并行执行所有代理
        agent_tasks = []
        for agent in agents:
            agent_prompt = await self._build_agent_prompt(agent, task.description, task, previous_results)
            agent_tasks.append(self._execute_agent_task(agent, agent_prompt, task))
        
        # 等待所有代理完成
        agent_results = await asyncio.gather(*agent_tasks, return_exceptions=True)
        
        # 处理结果
        agent_contributions = {}
        collaboration_trace = []
        
        for i, (agent, result) in enumerate(zip(agents, agent_results)):
            if isinstance(result, Exception):
                self.logger.error(f"代理 {agent.name} 执行失败: {result}")
                result = {'output': f"代理执行失败: {str(result)}", 'confidence': 0.1}
            
            agent_contributions[agent.id] = {
                'role': agent.role.value,
                'input': task.description,
                'output': result['output'],
                'confidence': result['confidence'],
                'reasoning': result.get('reasoning', '')
            }
            
            collaboration_trace.append({
                'step': i + 1,
                'agent_id': agent.id,
                'agent_role': agent.role.value,
                'action': 'parallel_process',
                'input': task.description,
                'output': result['output'],
                'timestamp': datetime.now().isoformat()
            })
        
        # 综合所有代理的输出
        final_output = await self._synthesize_parallel_results(agent_contributions, task)
        
        # 计算整体置信度
        confidences = [contrib['confidence'] for contrib in agent_contributions.values()]
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.5
        
        return CollaborationResult(
            task_id=task.id,
            final_output=final_output,
            confidence=overall_confidence,
            agent_contributions=agent_contributions,
            collaboration_trace=collaboration_trace,
            performance_metrics=await self._calculate_performance_metrics(agent_contributions, collaboration_trace),
            timestamp=datetime.now().isoformat()
        )
    
    async def _execute_hierarchical_collaboration(self, task: CollaborationTask, agents: List[AgentProfile], previous_results: Dict[str, Any]) -> CollaborationResult:
        """执行层次协作"""
        self.logger.debug("🏗️ [MultiAgent] 执行层次协作...")
        
        # 找到协调者
        coordinator = next((agent for agent in agents if agent.role == AgentRole.COORDINATOR), agents[0])
        workers = [agent for agent in agents if agent != coordinator]
        
        # 协调者分解任务
        subtasks = await self._decompose_task_hierarchically(task, coordinator)
        
        # 分配子任务给工作代理
        agent_contributions = {}
        collaboration_trace = []
        
        # 执行子任务
        for i, (subtask, worker) in enumerate(zip(subtasks, workers)):
            worker_prompt = await self._build_agent_prompt(worker, subtask, task, previous_results)
            worker_result = await self._execute_agent_task(worker, worker_prompt, task)
            
            agent_contributions[worker.id] = {
                'role': worker.role.value,
                'input': subtask,
                'output': worker_result['output'],
                'confidence': worker_result['confidence'],
                'reasoning': worker_result.get('reasoning', '')
            }
            
            collaboration_trace.append({
                'step': i + 1,
                'agent_id': worker.id,
                'agent_role': worker.role.value,
                'action': 'execute_subtask',
                'input': subtask,
                'output': worker_result['output'],
                'timestamp': datetime.now().isoformat()
            })
        
        # 协调者整合结果
        integration_prompt = await self._build_integration_prompt(coordinator, agent_contributions, task)
        final_result = await self._execute_agent_task(coordinator, integration_prompt, task)
        
        agent_contributions[coordinator.id] = {
            'role': coordinator.role.value,
            'input': 'Integration of all results',
            'output': final_result['output'],
            'confidence': final_result['confidence'],
            'reasoning': final_result.get('reasoning', '')
        }
        
        collaboration_trace.append({
            'step': len(workers) + 1,
            'agent_id': coordinator.id,
            'agent_role': coordinator.role.value,
            'action': 'integrate_results',
            'input': 'All worker results',
            'output': final_result['output'],
            'timestamp': datetime.now().isoformat()
        })
        
        return CollaborationResult(
            task_id=task.id,
            final_output=final_result['output'],
            confidence=final_result['confidence'],
            agent_contributions=agent_contributions,
            collaboration_trace=collaboration_trace,
            performance_metrics=await self._calculate_performance_metrics(agent_contributions, collaboration_trace),
            timestamp=datetime.now().isoformat()
        )
    
    async def _execute_democratic_collaboration(self, task: CollaborationTask, agents: List[AgentProfile], previous_results: Dict[str, Any]) -> CollaborationResult:
        """执行民主协作"""
        self.logger.debug("🗳️ [MultiAgent] 执行民主协作...")
        
        # 第一轮：所有代理提出初始方案
        initial_proposals = {}
        collaboration_trace = []
        
        for i, agent in enumerate(agents):
            agent_prompt = await self._build_agent_prompt(agent, task.description, task, previous_results)
            proposal = await self._execute_agent_task(agent, agent_prompt, task)
            
            initial_proposals[agent.id] = proposal
            
            collaboration_trace.append({
                'step': i + 1,
                'phase': 'proposal',
                'agent_id': agent.id,
                'agent_role': agent.role.value,
                'action': 'propose_solution',
                'output': proposal['output'],
                'timestamp': datetime.now().isoformat()
            })
        
        # 第二轮：代理间相互评议和改进
        refined_proposals = await self._conduct_peer_review(agents, initial_proposals, task)
        
        # 第三轮：投票选择最佳方案
        final_result = await self._conduct_democratic_voting(agents, refined_proposals, task)
        
        # 整合所有贡献
        agent_contributions = {}
        for agent_id, proposal in refined_proposals.items():
            agent = next(agent for agent in agents if agent.id == agent_id)
            agent_contributions[agent_id] = {
                'role': agent.role.value,
                'input': task.description,
                'output': proposal['output'],
                'confidence': proposal['confidence'],
                'reasoning': proposal.get('reasoning', '')
            }
        
        return CollaborationResult(
            task_id=task.id,
            final_output=final_result['output'],
            confidence=final_result['confidence'],
            agent_contributions=agent_contributions,
            collaboration_trace=collaboration_trace,
            performance_metrics=await self._calculate_performance_metrics(agent_contributions, collaboration_trace),
            timestamp=datetime.now().isoformat()
        )

    # 辅助方法实现
    async def _initialize_agent_pool(self):
        """初始化专家代理池"""
        self.logger.debug("👥 [MultiAgent] 初始化专家代理池...")

        # 创建基础专家代理
        base_agents = [
            AgentProfile(
                id="coordinator_001",
                role=AgentRole.COORDINATOR,
                name="协调专家",
                description="负责任务分解、代理协调和结果整合",
                expertise=["项目管理", "团队协调", "任务分解"],
                capabilities=["task_decomposition", "agent_coordination", "result_integration"],
                personality_traits={"leadership": 0.9, "communication": 0.8, "organization": 0.9},
                collaboration_style="directive",
                performance_history={}
            ),
            AgentProfile(
                id="analyst_001",
                role=AgentRole.ANALYST,
                name="分析专家",
                description="专注于数据分析、问题诊断和深度思考",
                expertise=["数据分析", "问题诊断", "逻辑推理"],
                capabilities=["data_analysis", "problem_diagnosis", "logical_reasoning"],
                personality_traits={"analytical": 0.9, "detail_oriented": 0.8, "systematic": 0.9},
                collaboration_style="analytical",
                performance_history={}
            ),
            AgentProfile(
                id="creative_001",
                role=AgentRole.CREATIVE,
                name="创意专家",
                description="负责创新思维、创意生成和非常规解决方案",
                expertise=["创意思维", "创新设计", "艺术创作"],
                capabilities=["creative_thinking", "innovation", "artistic_creation"],
                personality_traits={"creativity": 0.9, "openness": 0.8, "imagination": 0.9},
                collaboration_style="inspirational",
                performance_history={}
            ),
            AgentProfile(
                id="technical_001",
                role=AgentRole.TECHNICAL,
                name="技术专家",
                description="专注于技术实现、系统设计和技术问题解决",
                expertise=["软件开发", "系统架构", "技术实现"],
                capabilities=["software_development", "system_design", "technical_problem_solving"],
                personality_traits={"technical": 0.9, "precision": 0.8, "logical": 0.9},
                collaboration_style="methodical",
                performance_history={}
            ),
            AgentProfile(
                id="critic_001",
                role=AgentRole.CRITIC,
                name="评论专家",
                description="负责质量评估、风险识别和改进建议",
                expertise=["质量评估", "风险分析", "改进建议"],
                capabilities=["quality_assessment", "risk_analysis", "improvement_suggestions"],
                personality_traits={"critical_thinking": 0.9, "attention_to_detail": 0.8, "objectivity": 0.9},
                collaboration_style="evaluative",
                performance_history={}
            ),
            AgentProfile(
                id="synthesizer_001",
                role=AgentRole.SYNTHESIZER,
                name="综合专家",
                description="专注于信息整合、观点综合和最终决策",
                expertise=["信息整合", "观点综合", "决策制定"],
                capabilities=["information_integration", "viewpoint_synthesis", "decision_making"],
                personality_traits={"synthesis": 0.9, "balance": 0.8, "wisdom": 0.9},
                collaboration_style="integrative",
                performance_history={}
            )
        ]

        # 添加到代理池
        for agent in base_agents:
            self.agent_pool[agent.id] = agent

        self.logger.info(f"👥 [MultiAgent] 初始化了 {len(base_agents)} 个专家代理")

    async def _initialize_collaboration_modes(self):
        """初始化协作模式"""
        self.collaboration_modes = {
            CollaborationMode.SEQUENTIAL: {
                'description': '顺序协作，代理依次处理任务',
                'best_for': ['复杂分析', '多步骤任务'],
                'agent_count': (2, 5)
            },
            CollaborationMode.PARALLEL: {
                'description': '并行协作，代理同时处理任务',
                'best_for': ['创意生成', '多角度分析'],
                'agent_count': (2, 4)
            },
            CollaborationMode.HIERARCHICAL: {
                'description': '层次协作，有明确的协调者和执行者',
                'best_for': ['大型项目', '复杂任务分解'],
                'agent_count': (3, 6)
            },
            CollaborationMode.DEMOCRATIC: {
                'description': '民主协作，代理平等参与决策',
                'best_for': ['决策制定', '方案评估'],
                'agent_count': (3, 5)
            }
        }

    async def _initialize_performance_monitoring(self):
        """初始化性能监控"""
        self.performance_stats = {
            'total_collaborations': 0,
            'successful_collaborations': 0,
            'average_confidence': 0.0,
            'agent_performance': {},
            'collaboration_mode_effectiveness': {}
        }

    async def _identify_required_expertise(self, text: str, analysis: Dict[str, Any]) -> List[str]:
        """识别所需专业知识"""
        expertise = []

        # 基于关键词识别
        expertise_keywords = {
            '技术': ['编程', '代码', '系统', '软件', '技术', '开发'],
            '分析': ['分析', '数据', '统计', '研究', '调查'],
            '创意': ['创意', '设计', '艺术', '创新', '想象'],
            '管理': ['管理', '项目', '计划', '组织', '协调'],
            '评估': ['评估', '评价', '审查', '检查', '质量']
        }

        for domain, keywords in expertise_keywords.items():
            if any(keyword in text for keyword in keywords):
                expertise.append(domain)

        return expertise

    async def _determine_task_type(self, text: str, intent: str) -> TaskType:
        """确定任务类型"""
        if intent == 'question' or '分析' in text:
            return TaskType.ANALYSIS
        elif '创建' in text or '设计' in text or '写' in text:
            return TaskType.CREATION
        elif '解决' in text or '问题' in text:
            return TaskType.PROBLEM_SOLVING
        elif '评估' in text or '评价' in text:
            return TaskType.EVALUATION
        else:
            return TaskType.SYNTHESIS

    async def _select_collaboration_mode(self, complexity: float, intent: str) -> str:
        """选择协作模式"""
        if complexity > 0.8:
            return CollaborationMode.HIERARCHICAL.value
        elif complexity > 0.6:
            return CollaborationMode.SEQUENTIAL.value
        elif intent in ['question', 'evaluation']:
            return CollaborationMode.DEMOCRATIC.value
        else:
            return CollaborationMode.PARALLEL.value

    async def _estimate_required_agents(self, complexity: float, intent: str) -> int:
        """估算所需代理数量"""
        base_count = 2

        if complexity > 0.8:
            base_count = 4
        elif complexity > 0.6:
            base_count = 3

        return min(6, max(2, base_count))

    async def _assess_task_priority(self, request, analysis: Dict[str, Any]) -> int:
        """评估任务优先级"""
        priority = 5  # 默认中等优先级

        # 基于情感强度调整
        emotion_intensity = analysis.get('semantic_analysis', {}).get('emotion_analysis', {}).get('emotion_intensity', 0)
        if emotion_intensity > 0.7:
            priority += 2

        # 基于复杂度调整
        complexity = analysis.get('semantic_analysis', {}).get('complexity_score', 0)
        if complexity > 0.8:
            priority += 1

        return min(10, max(1, priority))

    async def _determine_required_roles(self, requirements: Dict[str, Any]) -> List[AgentRole]:
        """确定所需角色"""
        roles = []

        task_type = requirements['task_type']
        expertise = requirements['required_expertise']

        # 根据任务类型确定基础角色
        if task_type == TaskType.ANALYSIS:
            roles.append(AgentRole.ANALYST)
        elif task_type == TaskType.CREATION:
            roles.append(AgentRole.CREATIVE)
        elif task_type == TaskType.PROBLEM_SOLVING:
            roles.extend([AgentRole.ANALYST, AgentRole.TECHNICAL])
        elif task_type == TaskType.EVALUATION:
            roles.append(AgentRole.CRITIC)

        # 根据专业知识需求添加角色
        if '技术' in expertise:
            roles.append(AgentRole.TECHNICAL)
        if '创意' in expertise:
            roles.append(AgentRole.CREATIVE)
        if '管理' in expertise:
            roles.append(AgentRole.COORDINATOR)

        # 复杂任务需要协调者和综合者
        if requirements['complexity_level'] > 0.7:
            if AgentRole.COORDINATOR not in roles:
                roles.append(AgentRole.COORDINATOR)
            roles.append(AgentRole.SYNTHESIZER)

        # 去重并限制数量
        unique_roles = list(set(roles))
        return unique_roles[:requirements['agent_count']]

    async def _find_best_agent_for_role(self, role: AgentRole, task: CollaborationTask, requirements: Dict[str, Any]) -> Optional[AgentProfile]:
        """为角色找到最佳代理"""
        candidates = [agent for agent in self.agent_pool.values() if agent.role == role]

        if not candidates:
            return None

        # 简单选择第一个匹配的代理（可以后续优化为基于性能的选择）
        return candidates[0]

    async def _create_temporary_agents(self, task: CollaborationTask, count: int) -> List[AgentProfile]:
        """创建临时代理"""
        temporary_agents = []

        for i in range(count):
            agent_id = f"temp_{task.id}_{i}"
            agent = AgentProfile(
                id=agent_id,
                role=AgentRole.DOMAIN_EXPERT,
                name=f"临时专家_{i+1}",
                description="为特定任务创建的临时专家代理",
                expertise=task.context['requirements']['required_expertise'],
                capabilities=["general_problem_solving"],
                personality_traits={"adaptability": 0.8, "cooperation": 0.7},
                collaboration_style="adaptive",
                performance_history={}
            )
            temporary_agents.append(agent)
            self.agent_pool[agent_id] = agent

        return temporary_agents

    async def _build_agent_prompt(self, agent: AgentProfile, input_text: str, task: CollaborationTask, previous_results: Dict[str, Any]) -> str:
        """构建代理特定的提示"""
        prompt = f"""
你是{agent.name}，{agent.description}

你的专业领域：{', '.join(agent.expertise)}
你的能力：{', '.join(agent.capabilities)}
协作风格：{agent.collaboration_style}

当前任务：{input_text}

任务类型：{task.task_type.value}
任务上下文：{json.dumps(task.context, ensure_ascii=False)}

请根据你的专业角色和能力，为这个任务提供你的分析和建议。
"""

        if previous_results:
            prompt += f"\n之前的结果参考：{json.dumps(previous_results, ensure_ascii=False)}"

        return prompt

    async def _execute_agent_task(self, agent: AgentProfile, prompt: str, task: CollaborationTask) -> Dict[str, Any]:
        """执行代理任务"""
        try:
            response = await AgentFactory.ask_llm(prompt)

            return {
                'output': response.strip(),
                'confidence': 0.8,  # 可以后续优化为动态计算
                'reasoning': f"基于{agent.role.value}角色的专业分析"
            }
        except Exception as e:
            self.logger.error(f"代理 {agent.name} 执行失败: {e}")
            return {
                'output': f"代理执行遇到问题：{str(e)}",
                'confidence': 0.1,
                'reasoning': "执行失败"
            }

    async def _synthesize_parallel_results(self, agent_contributions: Dict[str, Any], task: CollaborationTask) -> str:
        """综合并行结果"""
        outputs = [contrib['output'] for contrib in agent_contributions.values()]

        synthesis_prompt = f"""
请综合以下多个专家的分析结果，形成一个统一的最终答案：

任务：{task.description}

专家分析结果：
{chr(10).join([f"- {output}" for output in outputs])}

请提供一个整合了所有专家观点的综合性回答。
"""

        try:
            response = await AgentFactory.ask_llm(synthesis_prompt)
            return response.strip()
        except Exception as e:
            self.logger.error(f"结果综合失败: {e}")
            return f"综合多个专家观点：{'; '.join(outputs[:3])}"

    # 层次协作相关方法
    async def _decompose_task_hierarchically(self, task: CollaborationTask, coordinator: AgentProfile) -> List[str]:
        """层次化分解任务"""
        decomposition_prompt = f"""
作为{coordinator.name}，请将以下复杂任务分解为几个可以并行执行的子任务：

主任务：{task.description}

请将任务分解为3-5个具体的子任务，每个子任务应该：
1. 相对独立
2. 可以由专家代理执行
3. 有明确的输出要求

请以列表形式返回子任务。
"""

        try:
            response = await AgentFactory.ask_llm(decomposition_prompt)
            # 简单解析响应为子任务列表
            subtasks = [line.strip() for line in response.split('\n') if line.strip() and not line.startswith('#')]
            return subtasks[:5]  # 最多5个子任务
        except Exception as e:
            self.logger.error(f"任务分解失败: {e}")
            return [task.description]  # 回退到原任务

    async def _build_integration_prompt(self, coordinator: AgentProfile, agent_contributions: Dict[str, Any], task: CollaborationTask) -> str:
        """构建整合提示"""
        contributions_text = []
        for agent_id, contrib in agent_contributions.items():
            contributions_text.append(f"代理角色：{contrib['role']}\n输入：{contrib['input']}\n输出：{contrib['output']}")

        return f"""
作为{coordinator.name}，请整合以下各个专家代理的工作结果：

原始任务：{task.description}

各代理的工作结果：
{chr(10).join(contributions_text)}

请提供一个综合性的最终结果，整合所有代理的贡献。
"""

    # 民主协作相关方法
    async def _conduct_peer_review(self, agents: List[AgentProfile], initial_proposals: Dict[str, Any], task: CollaborationTask) -> Dict[str, Any]:
        """进行同行评议"""
        refined_proposals = {}

        for agent in agents:
            # 获取其他代理的提案
            other_proposals = {aid: prop for aid, prop in initial_proposals.items() if aid != agent.id}

            review_prompt = f"""
作为{agent.name}，请评议以下其他专家的提案，并改进你自己的方案：

你的原始提案：{initial_proposals[agent.id]['output']}

其他专家的提案：
{chr(10).join([f"- {prop['output']}" for prop in other_proposals.values()])}

请基于其他专家的观点，改进你的提案。
"""

            try:
                refined_response = await AgentFactory.ask_llm(review_prompt)
                refined_proposals[agent.id] = {
                    'output': refined_response.strip(),
                    'confidence': initial_proposals[agent.id]['confidence'] * 1.1,  # 评议后置信度略微提升
                    'reasoning': f"基于同行评议改进的{agent.role.value}方案"
                }
            except Exception as e:
                self.logger.error(f"同行评议失败: {e}")
                refined_proposals[agent.id] = initial_proposals[agent.id]

        return refined_proposals

    async def _conduct_democratic_voting(self, agents: List[AgentProfile], proposals: Dict[str, Any], task: CollaborationTask) -> Dict[str, Any]:
        """进行民主投票"""
        votes = {}

        for voter in agents:
            # 为每个代理构建投票提示
            voting_prompt = f"""
作为{voter.name}，请对以下提案进行评分（1-10分）：

{chr(10).join([f"提案{i+1}：{prop['output']}" for i, prop in enumerate(proposals.values())])}

请为每个提案打分，并说明理由。格式：提案1: X分, 提案2: Y分...
"""

            try:
                vote_response = await AgentFactory.ask_llm(voting_prompt)
                # 简单解析投票结果（实际实现中可以更复杂）
                votes[voter.id] = vote_response
            except Exception as e:
                self.logger.error(f"投票失败: {e}")

        # 选择得分最高的提案（简化实现）
        proposal_list = list(proposals.values())
        if proposal_list:
            best_proposal = max(proposal_list, key=lambda x: x['confidence'])
            return best_proposal
        else:
            return {'output': '无法达成共识', 'confidence': 0.3}

    async def _calculate_performance_metrics(self, agent_contributions: Dict[str, Any], collaboration_trace: List[Dict[str, Any]]) -> Dict[str, float]:
        """计算性能指标"""
        metrics = {}

        # 计算平均置信度
        confidences = [contrib['confidence'] for contrib in agent_contributions.values()]
        metrics['average_confidence'] = sum(confidences) / len(confidences) if confidences else 0.0

        # 计算协作效率（基于步骤数）
        metrics['collaboration_efficiency'] = 1.0 / max(1, len(collaboration_trace))

        # 计算代理参与度
        metrics['agent_participation'] = len(agent_contributions) / max(1, len(agent_contributions))

        # 计算整体质量分数
        metrics['overall_quality'] = (metrics['average_confidence'] + metrics['collaboration_efficiency']) / 2

        return metrics

    async def _evaluate_and_optimize_result(self, collaboration_result: CollaborationResult, task: CollaborationTask) -> Dict[str, Any]:
        """评估和优化结果"""
        # 基础验证
        if not collaboration_result.final_output:
            collaboration_result.final_output = "协作未能产生有效结果"
            collaboration_result.confidence = 0.1

        # 置信度调整
        if collaboration_result.confidence > 0.95:
            collaboration_result.confidence = 0.95  # 避免过度自信

        # 记录到历史
        self.collaboration_history.append(collaboration_result)

        # 更新性能统计
        await self._update_performance_stats(collaboration_result)

        return {
            'final_output': collaboration_result.final_output,
            'confidence': collaboration_result.confidence,
            'agent_contributions': collaboration_result.agent_contributions,
            'collaboration_trace': collaboration_result.collaboration_trace,
            'performance_metrics': collaboration_result.performance_metrics
        }

    async def _update_performance_stats(self, result: CollaborationResult):
        """更新性能统计"""
        self.performance_stats['total_collaborations'] += 1

        if result.confidence > 0.6:
            self.performance_stats['successful_collaborations'] += 1

        # 更新平均置信度
        total = self.performance_stats['total_collaborations']
        current_avg = self.performance_stats['average_confidence']
        new_avg = (current_avg * (total - 1) + result.confidence) / total
        self.performance_stats['average_confidence'] = new_avg

        # 更新代理性能
        for agent_id, contribution in result.agent_contributions.items():
            if agent_id not in self.performance_stats['agent_performance']:
                self.performance_stats['agent_performance'][agent_id] = {
                    'total_tasks': 0,
                    'average_confidence': 0.0
                }

            agent_stats = self.performance_stats['agent_performance'][agent_id]
            agent_stats['total_tasks'] += 1
            agent_total = agent_stats['total_tasks']
            agent_current_avg = agent_stats['average_confidence']
            agent_new_avg = (agent_current_avg * (agent_total - 1) + contribution['confidence']) / agent_total
            agent_stats['average_confidence'] = agent_new_avg

    async def _create_fallback_collaboration_result(self, request, error_msg: str) -> Dict[str, Any]:
        """创建备用协作结果"""
        return {
            'output': f"多代理协作遇到问题：{error_msg}。我将尽力为您提供基础分析。",
            'confidence': 0.3,
            'agent_contributions': {},
            'collaboration_trace': [
                {
                    'module': 'multi_agent_framework',
                    'action': 'fallback',
                    'error': error_msg,
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'reasoning_trace': [
                {
                    'module': 'multi_agent_framework',
                    'action': 'fallback',
                    'error': error_msg,
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'metadata': {'error': True, 'fallback': True}
        }

    def get_agent_pool_status(self) -> Dict[str, Any]:
        """获取代理池状态"""
        return {
            'total_agents': len(self.agent_pool),
            'agents_by_role': {role.value: len([a for a in self.agent_pool.values() if a.role == role])
                              for role in AgentRole},
            'active_tasks': len(self.active_tasks),
            'collaboration_history_count': len(self.collaboration_history),
            'performance_stats': self.performance_stats
        }
