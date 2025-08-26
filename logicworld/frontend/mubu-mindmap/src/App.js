import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect, memo } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  ConnectionLineType,
  ConnectionMode,
  BezierEdge,
} from '@xyflow/react';
import useViewportPersistence from './useViewportPersistence';
import ELK from 'elkjs/lib/elk.bundled';
import { createSafeResizeObserver } from './utils/safeResizeObserver';
import '@xyflow/react/dist/style.css';
import './MindMap.css';
import './App.css';
import './MaterialNode.css';
import Sidebar from './Sidebar';
import InfoPage from './InfoPage';
import ChatBox from './ChatBox';
import ToolLibrary from './ToolLibrary';
import ToolLibraryDemo from './ToolLibraryDemo';
import AuthModal from './components/Security/AuthModal';
import SmoothArrowMarker from './SmoothArrowMarker';
import StateManagementDemo from './components/StateManagementDemo';

// 导入4个核心功能节点组件
import MaterialNode from './MaterialNode';
import ExecutionNode from './ExecutionNode';
import ConditionNode from './ConditionNode';
import ResultNode from './ResultNode';
import DocumentPreviewDialog from './components/DocumentPreviewDialog';
import StatusTrackingPanel from './components/StatusTrackingPanel';
import NodePropertiesPanel from './NodePropertiesPanel';

import ResultPanel from './ResultPanel';
import TemplateMarketplace from './TemplateMarketplaceFixed';
// import EnhancedExecutionConsole from './EnhancedExecutionConsole'; // 已移除执行控制台
import EnhancedEdge from './EnhancedEdge';
import {
  useFlowLineIntegration,
  FlowLinePreview,
  EnhancedFlowLine
} from './FlowLineIntegration';
import { UserProvider } from './UserContext';
import AIWorkflowModal from './components/AIWorkflowModal';
import ConnectionCorrectionLabel from './ConnectionCorrectionLabel';
import AIConditionBranchManager from './AIConditionBranchManager';

// 导入WebSocket客户端以启用实时同步
import './utils/websocketClient';

// 导入增强的错误抑制器
import errorSuppressor, { safeExecute } from './utils/errorSuppressor';
// ---------------------------------------------------------------------------
// 后端 API 基址，直接连接到8000端口
// ---------------------------------------------------------------------------
const API_BASE = 'http://localhost:8000';
console.log('🔧 API_BASE 设置为: 直接连接到8000端口');

// 思维导图管理API
const mindmapAPI = {
  create: async (mindmap) => {
    const response = await fetch(`${API_BASE}/api/mindmaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mindmap)
    });
    if (!response.ok) throw new Error('Failed to create mindmap');
    return response.json();
  },

  update: async (mindmapId, mindmap) => {
    const response = await fetch(`${API_BASE}/api/mindmaps/${mindmapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mindmap)
    });
    if (!response.ok) throw new Error('Failed to update mindmap');
    return response.json();
  },

  updateAccess: async (mindmapId) => {
    const response = await fetch(`${API_BASE}/api/mindmaps/${mindmapId}/access`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to update access time');
    return response.json();
  },

  // 智能工作流生成API
  generateIntelligentWorkflow: async (description, sessionId = null) => {
    const response = await fetch(`${API_BASE}/api/intelligent-workflow/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        session_id: sessionId,
        context: {}
      })
    });
    if (!response.ok) throw new Error('Failed to generate intelligent workflow');
    return response.json();
  }
};

// 🎯 混合路由意图检测系统
// ==========================================

// 📊 第一层：快速规则路由器
const FAST_RULE_PATTERNS = {
  // 🔥 高置信度模式 (直接路由，不需要AI验证)
  command: {
    patterns: [/^\/\w+/, /^#\w+/],
    confidence: 0.95,
    examples: ['/help', '#workflow']
  },

  mindmap_explicit: {
    patterns: [
      /思维导图|脑图|mind\s*map/i,
      /画.*图|绘制.*图/i,
      /整理.*思路|梳理.*逻辑/i,
      /结构化.*信息|信息.*结构/i
    ],
    confidence: 0.95,
    examples: ['画个思维导图', '创建脑图', '整理思路']
  },

  workflow_explicit: {
    patterns: [
      /工作流|流程图|步骤|计划/i,
      /制作.*流程|设计.*步骤/i,
      /规划.*方案|方案.*规划/i,
      /任务.*分解|分解.*任务/i
    ],
    confidence: 0.95,
    examples: ['制作工作流程', '设计学习计划', '任务分解']
  },

  // 🎯 扩展任务创建模式 - 提高置信度
  task_creation: {
    patterns: [
      /创建|制作|生成|写|做/i,
      /帮我.*做|帮助.*完成/i,
      /设计.*方案|方案.*设计/i,
      /分析.*问题|问题.*分析/i,
      /研究.*主题|主题.*研究/i,
      /学习.*计划|计划.*学习/i
    ],
    confidence: 0.85, // 提高置信度
    examples: ['写一份文档', '帮我做个计划', '分析这个问题']
  },

  // 💬 聊天模式 - 更严格的匹配
  chat_greeting: {
    patterns: [/^(你好|hi|hello|嗨|早上好|晚上好)!?$/i, /^(谢谢|感谢|再见|拜拜)!?$/i],
    confidence: 0.98,
    examples: ['你好', '谢谢', '再见']
  },

  chat_question: {
    patterns: [
      /^.{1,30}[?？]$/,  // 短问句
      /^(什么是|怎么|为什么|如何).{1,20}[?？]?$/i,  // 简短疑问
      /^(能否|可以|是否).{1,20}[?？]$/i  // 简短询问
    ],
    confidence: 0.9,
    examples: ['什么是AI？', '怎么使用？', '能否帮助我？']
  }
};

// 🚀 快速规则路由器
const fastRuleRouter = (prompt) => {
  const results = [];

  // 1. 关键词模式匹配
  for (const [intentType, config] of Object.entries(FAST_RULE_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(prompt)) {
        results.push({
          intent: intentType.includes('_') ? intentType.split('_')[0] : intentType,
          confidence: config.confidence,
          source: 'fast_rule',
          matched_pattern: pattern.toString(),
          reason: `匹配规则: ${pattern}`
        });
      }
    }
  }

  // 2. 长度和复杂度启发式
  const length = prompt.length;
  const complexity = calculateComplexity(prompt);

  // 长文本倾向于mindmap
  if (length > 80 && complexity > 0.6) {
    results.push({
      intent: 'mindmap',
      confidence: 0.75,
      source: 'heuristic',
      reason: `长文本高复杂度: 长度${length}, 复杂度${complexity.toFixed(2)}`
    });
  }

  // 短文本简单问候倾向于chat
  if (length < 15 && complexity < 0.3) {
    results.push({
      intent: 'chat',
      confidence: 0.8,
      source: 'heuristic',
      reason: `短文本低复杂度: 长度${length}, 复杂度${complexity.toFixed(2)}`
    });
  }

  // 返回最高置信度的结果
  return results.length > 0
    ? results.sort((a, b) => b.confidence - a.confidence)[0]
    : { intent: 'mindmap', confidence: 0.5, source: 'default' }; // 默认倾向mindmap
};

// 📊 计算文本复杂度
const calculateComplexity = (text) => {
  let score = 0;

  // 句子数量
  const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
  score += Math.min(sentences.length * 0.1, 0.3);

  // 逗号和连接词
  const commas = (text.match(/[，,]/g) || []).length;
  score += Math.min(commas * 0.05, 0.2);

  // 动词和名词密度
  const actionWords = /创建|制作|生成|分析|设计|规划|整理|写|做|帮助|完成/g;
  const actionMatches = (text.match(actionWords) || []).length;
  score += Math.min(actionMatches * 0.15, 0.4);

  // 专业词汇
  const professionalWords = /方案|流程|步骤|计划|思维|逻辑|结构|系统|框架|模型/g;
  const professionalMatches = (text.match(professionalWords) || []).length;
  score += Math.min(professionalMatches * 0.1, 0.3);

  return Math.min(score, 1.0);
};

// 🧠 上下文感知路由器
const contextAwareRouter = (prompt, context, aiResult) => {
  const contextFactors = {
    // 对话历史影响
    conversation_continuity: 0,
    // 任务复杂度影响
    task_complexity: 0,
    // 用户行为模式影响
    user_pattern: 0
  };

  // 分析对话连续性
  if (context.lastIntent) {
    if (context.lastIntent === 'workflow' && /继续|下一步|然后/.test(prompt)) {
      contextFactors.conversation_continuity = 0.3;
    }
  }

  // 分析任务复杂度
  const taskIndicators = prompt.match(/并且|然后|接着|同时|还要/g);
  if (taskIndicators && taskIndicators.length > 0) {
    contextFactors.task_complexity = Math.min(taskIndicators.length * 0.2, 0.4);
  }

  // 计算上下文调整后的置信度
  const contextBonus = Object.values(contextFactors).reduce((sum, factor) => sum + factor, 0);

  return {
    original_intent: aiResult.intent,
    context_bonus: contextBonus,
    adjusted_confidence: Math.min((aiResult.confidence || 0.5) + contextBonus, 1.0),
    context_factors: contextFactors
  };
};

// 📊 置信度融合决策器
const confidenceBasedDecision = (routeResults) => {
  console.log('🔍 路由结果汇总:', routeResults);

  // 找出最高置信度的结果
  const bestResult = routeResults
    .filter(r => r && r.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (!bestResult) {
    return { intent: 'chat', confidence: 0.1, source: 'fallback' };
  }

  // 高置信度直接采用
  if (bestResult.confidence >= 0.9) {
    console.log(`✅ 高置信度路由 (${bestResult.confidence}): ${bestResult.intent}`);
    return bestResult;
  }

  // 中等置信度需要综合考虑
  if (bestResult.confidence >= 0.7) {
    console.log(`🤔 中等置信度路由 (${bestResult.confidence}): ${bestResult.intent}`);
    return bestResult;
  }

  // 低置信度默认为聊天
  console.log(`💬 低置信度，默认聊天模式`);
  return { intent: 'chat', confidence: 0.6, source: 'low_confidence_fallback' };
};

const CHAT_KEYWORDS = [
  'hello', 'hi', 'how', 'what', 'why', 'when', 'where', 'who',
  '你好', '介绍', '什么', '怎么', '为什么', '什么时候', '哪里', '谁',
  '聊天', '对话', '问题', '回答', '解释', '说明'
];

// 🤖 AI语义路由器
const aiSemanticRouter = async (prompt) => {
  try {
    console.log(`🤖 AI语义路由，API地址: ${API_BASE}/detect_intent`);
    console.log(`📝 发送数据:`, { prompt: prompt });

    const response = await fetch(`${API_BASE}/detect_intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt
      }),
    });

    console.log(`📡 API响应状态: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`🤖 AI语义路由结果:`, result);

      return {
        intent: result.intent || 'chat',
        confidence: result.confidence || 0.5,
        source: 'ai_semantic',
        reasoning: result.reasoning || 'AI语义分析'
      };
    } else {
      console.warn(`❌ AI语义路由失败: ${response.status} ${response.statusText}`);
      return { intent: 'unknown', confidence: 0, source: 'ai_semantic_failed' };
    }
  } catch (error) {
    console.warn('🚨 AI语义路由异常:', error);
    return { intent: 'unknown', confidence: 0, source: 'ai_semantic_error' };
  }
};

// 🎯 混合路由主控制器
const hybridIntentDetection = async (prompt, context = {}) => {
  console.log('🎯 启动混合路由意图检测');
  console.log('📝 输入文本:', prompt);
  console.log('🔍 上下文:', context);

  const routeResults = [];

  // 🚀 第一层：快速规则路由
  console.log('🚀 执行快速规则路由...');
  const fastRoute = fastRuleRouter(prompt);
  console.log('📊 快速规则结果:', fastRoute);
  routeResults.push(fastRoute);

  // 如果快速路由置信度很高，可以直接返回
  if (fastRoute.confidence >= 0.95) {
    console.log('✅ 快速路由高置信度，直接采用');
    return fastRoute.intent;
  }

  // 🤖 第二层：AI语义路由
  console.log('🤖 执行AI语义路由...');
  const aiRoute = await aiSemanticRouter(prompt);
  console.log('📊 AI语义结果:', aiRoute);
  routeResults.push(aiRoute);

  // 🧠 第三层：上下文感知路由
  console.log('🧠 执行上下文感知路由...');
  const contextRoute = contextAwareRouter(prompt, context, aiRoute);
  console.log('📊 上下文感知结果:', contextRoute);

  // 将上下文调整应用到AI结果
  const adjustedAiRoute = {
    ...aiRoute,
    confidence: contextRoute.adjusted_confidence,
    context_bonus: contextRoute.context_bonus
  };
  routeResults.push(adjustedAiRoute);

  // 📊 第四层：置信度融合决策
  console.log('📊 执行置信度融合决策...');
  const finalDecision = confidenceBasedDecision(routeResults);
  console.log('✅ 最终决策:', finalDecision);

  return finalDecision.intent;
};

// 🎯 主要的意图检测函数 - 使用混合路由
const detectIntent = async (prompt, context = {}) => {
  // 使用混合路由系统进行意图检测
  return await hybridIntentDetection(prompt, context);
};

// 📚 保留旧的关键词检测作为参考（已集成到快速规则路由中）
const legacyKeywordDetection = (prompt) => {
  console.log('📚 旧版关键词检测（仅供参考）');
  const lowerPrompt = prompt.toLowerCase();

  // 简化的关键词匹配
  if (/思维导图|脑图|创建|制作|生成|写|文档/.test(lowerPrompt)) {
    return 'mindmap';
  } else if (/你好|hello|hi|谢谢/.test(lowerPrompt) && prompt.length < 20) {
    return 'chat';
  } else if (/\?|？|什么|怎么|为什么/.test(prompt)) {
    return 'chat';
  } else {
    return prompt.length > 50 ? 'mindmap' : 'chat';
  }
};

// Helper function to format parameter values for display
const formatParamValue = (value) => {
  const sValue = String(value);
  if (sValue.startsWith('@')) {
    const match = sValue.match(/@([\w-]+)\.([\w_]+)/);
    if (match) {
      const nodeName = match[1].replace('-', ' ');
      // Capitalize first letter
      return `来自: ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}`;
    }
  }
  // Truncate long strings
  if (sValue.length > 50) {
    return `${sValue.substring(0, 47)}...`;
  }
  return sValue;
};


// Helper function to generate unique IDs（时间戳 + 随机段，避免毫秒级重复）
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

const edgeTypes = {
  bezier: BezierEdge,
  enhanced: EnhancedEdge,
  'enhanced-flow-line': EnhancedFlowLine,
};

const defaultEdgeOptions = {
  type: 'enhanced', // 使用增强的边组件
  animated: false, // 禁用内置动画，使用自定义CSS动画
  className: 'default-dashed', // 默认虚线样式
  style: { strokeWidth: 3, stroke: '#7c3aed', strokeDasharray: '32 16' },
  markerEnd: 'url(#smooth-arrow)',
};

// Group Node Component
const GroupNode = ({ id, data, style }) => {
  return (
    <div className="group-node" style={style}>
      <div className="custom-node-header">{data.label}</div>
    </div>
  );
};

// Initialize ELK for layout calculations
const elk = new ELK();

// Enhanced collision detection and resolution function
const resolveCollisions = (nodes) => {
  console.log('🔍 智能碰撞检测开始，处理', nodes.length, '个节点');
  const MINIMUM_SPACING = 80; // 增加普通节点间距，提升视觉效果
  const EXPANDED_SPACING = 120; // 增加展开节点间距
  const WORKFLOW_SPACING = 100; // 工作流节点专用间距
  const resolvedNodes = [...nodes];

  // Helper function to get actual node dimensions
  const getNodeDimensions = (node) => {
    // 对于材料节点，检查是否有展开的 CSS 类
    const isMaterialNode = node.data?.nodeType === 'material-node';
    const isExpanded = node.data?.isExpanded || node.data?.isConfigOpen;

    // 如果是材料节点且有 expanded 类，则认为是展开状态
    const isMaterialExpanded = isMaterialNode && (
      isExpanded ||
      // 通过检查节点的实际尺寸来判断是否展开
      (node.data?.size && node.data.size.width > 400)
    );

    const baseWidth = node.data?.label?.length ? node.data.label.length * 12 + 40 : 90;
    const baseHeight = 50;

    let width, height;

    if (isExpanded || isMaterialExpanded) {
      // 专门增加展开节点的宽度，保持合适的高度
      width = Math.max(baseWidth, 1800); // 进一步增加宽度到1800px
      height = Math.max(baseHeight, 650); // 保持合适的高度650px
    } else {
      // Regular nodes with type-specific sizing
      switch (node.type) {
        case 'execution-node':
        case 'condition-node':
        case 'result-node':
        case 'material-node':
          width = Math.max(baseWidth, 140);
          height = Math.max(baseHeight, 60);
          break;
        default:
          width = Math.max(baseWidth, 90);
          height = Math.max(baseHeight, 40);
      }
    }

    return { width, height, isExpanded: isExpanded || isMaterialExpanded };
  };

  // Sort nodes by position for more predictable collision resolution
  resolvedNodes.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

  // Multiple passes to ensure all collisions are resolved
  let maxIterations = 2; // 进一步减少迭代次数，减少过度调整
  let hasCollisions = true;
  let collisionCount = 0;

  while (hasCollisions && maxIterations > 0) {
    hasCollisions = false;
    maxIterations--;
    collisionCount = 0;

    for (let i = 0; i < resolvedNodes.length; i++) {
      const nodeA = resolvedNodes[i];
      const dimA = getNodeDimensions(nodeA);

      for (let j = i + 1; j < resolvedNodes.length; j++) {
        const nodeB = resolvedNodes[j];
        const dimB = getNodeDimensions(nodeB);

        // 🎯 智能间距计算：根据节点类型和状态动态调整
        let spacing = MINIMUM_SPACING;

        // 展开节点间距处理
        if (dimA.isExpanded && dimB.isExpanded) {
          spacing = EXPANDED_SPACING; // 两个都展开时使用较大间距
        } else if (dimA.isExpanded || dimB.isExpanded) {
          spacing = (MINIMUM_SPACING + EXPANDED_SPACING) / 2; // 一个展开时使用中等间距
        }

        // 工作流节点间的专用间距优化
        const isWorkflowNode = (node) => {
          const nodeType = node.data?.nodeType;
          return ['material-node', 'execution-node', 'condition-node', 'result-node'].includes(nodeType);
        };

        if (isWorkflowNode(nodeA) && isWorkflowNode(nodeB)) {
          spacing = Math.max(spacing, WORKFLOW_SPACING);
        }

        // 基于节点尺寸的动态间距微调
        const dynamicSpacing = Math.max(dimA.width, dimB.width) * 0.08;
        spacing = Math.max(spacing, dynamicSpacing);

        // Calculate bounding boxes with spacing
        const aLeft = nodeA.position.x;
        const aRight = nodeA.position.x + dimA.width;
        const aTop = nodeA.position.y;
        const aBottom = nodeA.position.y + dimA.height;

        const bLeft = nodeB.position.x;
        const bRight = nodeB.position.x + dimB.width;
        const bTop = nodeB.position.y;
        const bBottom = nodeB.position.y + dimB.height;

        // Check for overlap with minimum spacing
        const overlapX = Math.max(0, Math.min(aRight + spacing, bRight) - Math.max(aLeft - spacing, bLeft));
        const overlapY = Math.max(0, Math.min(aBottom + spacing, bBottom) - Math.max(aTop - spacing, bTop));

        if (overlapX > 0 && overlapY > 0) {
          hasCollisions = true;
          collisionCount++;
          // console.log(`Collision ${collisionCount} detected between ${nodeA.id} and ${nodeB.id}`, { overlapX, overlapY, spacing });

          // Calculate move distance - 减少移动距离
          const moveX = overlapX + spacing * 0.5; // 减少水平移动距离
          const moveY = overlapY + spacing * 0.5; // 减少垂直移动距离

          // Determine move direction based on relative positions
          const centerAX = aLeft + dimA.width / 2;
          const centerAY = aTop + dimA.height / 2;
          const centerBX = bLeft + dimB.width / 2;
          const centerBY = bTop + dimB.height / 2;

          const deltaX = centerBX - centerAX;
          const deltaY = centerBY - centerAY;

          // Move the node that's further from the origin or has lower priority
          let nodeToMove = nodeB;

          // Prefer moving non-expanded nodes over expanded ones
          if (dimA.isExpanded && !dimB.isExpanded) {
            nodeToMove = nodeB;
          } else if (!dimA.isExpanded && dimB.isExpanded) {
            nodeToMove = nodeA;
          } else {
            // If both are same type, move the one further down/right
            nodeToMove = (nodeB.position.y > nodeA.position.y ||
                         (nodeB.position.y === nodeA.position.y && nodeB.position.x > nodeA.position.x))
                         ? nodeB : nodeA;
          }

          // Apply movement
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Move horizontally
            nodeToMove.position.x += deltaX > 0 ? moveX : -moveX;
          } else {
            // Move vertically
            nodeToMove.position.y += deltaY > 0 ? moveY : -moveY;
          }
        }
      }
    }
  }

  console.log(`Collision resolution completed. Total collisions resolved: ${collisionCount}`);
  return resolvedNodes;
};

// Enhanced layout function with collision detection and spacing
const getLayoutedElements = (nodes, edges) => {
  // Enhanced size estimation considering expanded states and node types
  const getWidth = (node) => {
    // Check if node is expanded or in config mode
    const isExpanded = node.data?.isExpanded || node.data?.isConfigOpen;
    const baseWidth = node.width || (node.data?.label?.length || 10) * 12 + 40;

    // Different sizes for different node types and states
    if (isExpanded) {
      return Math.max(baseWidth, 1800); // 专门增加展开节点宽度到1800px
    }

    // Adjust for different node types
    switch (node.type) {
      case 'execution-node':
      case 'condition-node':
      case 'result-node':
      case 'material-node':
        return Math.max(baseWidth, 140); // Slightly wider for these node types
      default:
        return Math.max(baseWidth, 90); // Minimum width for regular nodes
    }
  };

  const getHeight = (node) => {
    const isExpanded = node.data?.isExpanded || node.data?.isConfigOpen;
    const baseHeight = node.height || 50;

    if (isExpanded) {
      return Math.max(baseHeight, 650); // 保持合适的展开节点高度650px
    }

    return Math.max(baseHeight, 40); // Minimum height for regular nodes
  };

  // Check if any nodes are expanded to adjust spacing
  const hasExpandedNodes = nodes.some(node => node.data?.isExpanded || node.data?.isConfigOpen);

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      // 树状图分散布局设置
      'elk.spacing.nodeNode': hasExpandedNodes ? '300' : '220', // 增加水平间距，更分散
      'elk.layered.spacing.nodeNodeBetweenLayers': hasExpandedNodes ? '400' : '320', // 增加垂直间距
      'elk.spacing.componentComponent': hasExpandedNodes ? '200' : '150', // 增加组件间距
      'elk.spacing.edgeNode': '80', // 增加边与节点间距
      'elk.spacing.edgeEdge': '60', // 增加边与边间距
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF', // 更好的树状布局
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP', // 减少边交叉
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED', // 平衡对齐
      'org.eclipse.elk.alignment': 'CENTER', // 居中对齐
      'elk.padding': '[top=150,left=150,bottom=150,right=150]', // 增加整体边距
      // 树状分散布局优化
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '20',
    },
    children: nodes.map(node => ({
      id: node.id,
      width: getWidth(node),
      height: getHeight(node),
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  return elk.layout(graph)
    .then(layoutedGraph => {
      // Create a map for quick lookups
      const positionMap = new Map();
      layoutedGraph.children.forEach(child => {
        positionMap.set(child.id, { x: child.x, y: child.y });
      });

      // Apply ELK positions first
      let layoutedNodes = nodes.map(node => ({
        ...node,
        position: positionMap.get(node.id) || { x: 0, y: 0 },
        // Store computed dimensions for collision detection
        computedWidth: getWidth(node),
        computedHeight: getHeight(node),
      }));

      // Post-process to ensure no overlaps with additional spacing
      layoutedNodes = resolveCollisions(layoutedNodes);

      return { nodes: layoutedNodes, edges };
    })
    .catch(error => {
        console.error('ELK layout algorithm failed:', error);
        // On failure, return original nodes to prevent the app from crashing
    return { nodes, edges };
  });
};

const initialNodes = [];

const initialEdges = [];

const ContextMenu = ({ x, y, onAddSibling, onAddChild, onDeleteNode, onClose, selectedNodeId, onZoomIn, onZoomOut, onToggleAllNodesVisibility, isAllCollapsed, addParentNode, copyNodes, pasteNodes, cutNodes, duplicateNode, copiedElements, onCenterMainTopic, screenToFlowPosition }) => {
  console.log('ContextMenu rendering. contextMenu state:', { x, y, selectedNodeId });
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ x, y });

  useEffect(() => {
    const handleClickOutside = (event) => {
      console.log('handleClickOutside triggered.');
      console.log('Event target:', event.target);
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        console.log('Click outside menu detected. Closing menu.');
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  // 调整菜单位置以确保在屏幕内显示
  useEffect(() => {
    if (menuRef.current && x && y) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // 检查右边界
      if (x + menuRect.width > windowWidth) {
        adjustedX = windowWidth - menuRect.width - 10;
      }

      // 检查下边界
      if (y + menuRect.height > windowHeight) {
        adjustedY = windowHeight - menuRect.height - 10;
      }

      // 确保不超出左边界和上边界
      adjustedX = Math.max(10, adjustedX);
      adjustedY = Math.max(10, adjustedY);

      setMenuPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  if (!x || !y) return null;

  const allMenuItems = [
    { label: '插入材料节点 (Ctrl+1)', action: () => {
      // 在右键位置插入材料节点
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y }) : { x: x - 100, y: y - 50 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'customNode',
        position: flowPosition,
        data: {
          label: '材料节点',
          nodeType: 'material-node',
          inputType: 'file',
          selectedFiles: [],
          textContent: '',
          urlList: [],
          folderPath: '',
          batchProcessing: false,
          previewEnabled: true,
          maxFileSize: 100,
          allowedFormats: []
        }
      };
      // 需要通过回调函数添加节点
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: false, context: 'pane' },
    { label: '插入执行节点 (Ctrl+2)', action: () => {
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y }) : { x: x - 100, y: y - 50 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'execution-node',
        position: flowPosition,
        data: {
          label: '执行',
          nodeType: 'execution-node'
        }
      };
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: false, context: 'pane' },
    { label: '插入条件节点 (Ctrl+3)', action: () => {
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y }) : { x: x - 100, y: y - 50 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'condition-node',
        position: flowPosition,
        data: {
          label: '条件判断',
          nodeType: 'condition-node'
        }
      };
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: false, context: 'pane' },
    { label: '插入结果节点 (Ctrl+4)', action: () => {
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y }) : { x: x - 100, y: y - 50 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'result-node',
        position: flowPosition,
        data: {
          label: '结果汇总',
          nodeType: 'result-node'
        }
      };
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: false, context: 'pane' },
    { label: '适应视图 (F)', action: () => {
      if (window.reactFlowInstanceFunctions?.fitView) {
        window.reactFlowInstanceFunctions.fitView({ padding: 0.2, duration: 600 });
      }
    }, disabled: false, context: 'pane' },
    { label: isAllCollapsed ? '展开所有主题 (Ctrl+A)' : '折叠所有主题 (Ctrl+A)', action: onToggleAllNodesVisibility, disabled: false, context: 'pane' },

    { label: '插入材料节点 (Ctrl+1)', action: () => {
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y: y + 50 }) : { x: x - 100, y: y + 50 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'customNode',
        position: flowPosition,
        data: {
          label: '材料节点',
          nodeType: 'material-node',
          inputType: 'file',
          selectedFiles: [],
          textContent: '',
          urlList: [],
          folderPath: '',
          batchProcessing: false,
          previewEnabled: true,
          maxFileSize: 100,
          allowedFormats: []
        }
      };
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: !selectedNodeId, context: 'node' },
    { label: '插入执行节点 (Ctrl+2)', action: () => {
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y: y + 100 }) : { x: x - 100, y: y + 100 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'execution-node',
        position: flowPosition,
        data: {
          label: '执行',
          nodeType: 'execution-node'
        }
      };
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: !selectedNodeId, context: 'node' },
    { label: '插入条件节点 (Ctrl+3)', action: () => {
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y: y + 150 }) : { x: x - 100, y: y + 150 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'condition-node',
        position: flowPosition,
        data: {
          label: '条件判断',
          nodeType: 'condition-node'
        }
      };
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: !selectedNodeId, context: 'node' },
    { label: '插入结果节点 (Ctrl+4)', action: () => {
      const flowPosition = screenToFlowPosition ? screenToFlowPosition({ x, y: y + 200 }) : { x: x - 100, y: y + 200 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'result-node',
        position: flowPosition,
        data: {
          label: '结果汇总',
          nodeType: 'result-node'
        }
      };
      if (window.addNodeFromContextMenu) {
        window.addNodeFromContextMenu(newNode);
      }
    }, disabled: !selectedNodeId, context: 'node' },
    { label: '复制 (Ctrl+C)', action: copyNodes, disabled: !selectedNodeId, context: 'node' },
    { label: '剪切 (Ctrl+X)', action: cutNodes, disabled: !selectedNodeId, context: 'node' },
    { label: '粘贴 (Ctrl+V)', action: () => pasteNodes(selectedNodeId), disabled: !copiedElements, context: 'node' },
    { label: '删除 (Delete)', action: onDeleteNode, disabled: !selectedNodeId, context: 'node' },
    { label: '折叠子节点', action: () => console.log('折叠子节点'), disabled: true, context: 'node' },
    { label: '展开/收缩兄弟节点', action: () => console.log('展开/收缩兄弟节点'), disabled: true, context: 'node' },
    { label: '仅显示当前分支', action: () => console.log('仅显示当前分支'), disabled: true, context: 'node' },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (selectedNodeId) {
      return item.context === 'node' || item.context === 'both';
    } else {
      return item.context === 'pane';
    }
  });

  console.log('ContextMenu - selectedNodeId:', selectedNodeId, 'Filtered menuItems:', menuItems);

  const handleItemClick = (action) => {
    action();
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{ top: menuPosition.y, left: menuPosition.x }}
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ul>
        {menuItems.map((item, index) => (
          <li key={index} onClick={item.disabled ? undefined : () => handleItemClick(item.action)} className={item.disabled ? 'disabled' : ''}>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Component to wrap ReactFlow and use useReactFlow hook
function MindMapFlow({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onConnectStart, onConnectEnd, nodeTypes, onNodeContextMenu, onPaneContextMenu, onPaneClick, onNodeClick, onNodeDrag, onNodeDragStop, onFlowReady, reactFlowWrapperRef, toggleSidebar, toggleChatBox, isSidebarCollapsed, isChatBoxCollapsed, currentPage, setNodes, saveMindmapData, setIsShortcutHelpVisible, onEdgeClick, onDeleteEdge, onReverseEdge, selectedEdgeId, isWorkflowLocked }) {
    const { setViewport, getViewport, zoomIn, zoomOut, screenToFlowPosition, fitView, getNodes } = useReactFlow();

    // 集成新的流程线系统
    const {
        previewConnection,
        isConnecting,
        handleConnectionStart,
        handleConnectionDrag,
        handleConnectionEnd,
        handleLineClick,
        handleDeleteLine
    } = useFlowLineIntegration();

    // 监听流程线事件
    useEffect(() => {
        const handleFlowLineConnected = (event) => {
            const connection = event.detail;
            console.log('🔗 流程线连接完成:', connection);
            console.log('📍 原始连接参数:', JSON.stringify(connection, null, 2));

            // 🎯 应用与onConnect相同的智能方向处理逻辑
            let finalConnection = { ...connection };

            if (connection.data && connection.data.wasReversed) {
                // 使用FlowLineSystem优化后的连接方向
                console.log('🔄 使用方向优化后的连接:', {
                    userDirection: connection.data.userDirection,
                    wasReversed: connection.data.wasReversed,
                    originalDragStart: connection.data.originalDragStart,
                    originalDragEnd: connection.data.originalDragEnd
                });

                // 连接已经被FlowLineSystem优化过，直接使用
                finalConnection = {
                    ...connection,
                    data: {
                        ...connection.data,
                        // 确保包含所有优化信息
                        directionOptimized: true,
                        optimizationApplied: true
                    }
                };
            } else {
                // 如果没有方向优化信息，应用智能连接方向处理
                console.log('⚡ 应用智能连接方向处理');

                // 获取节点位置信息进行方向判断
                const sourceNode = nodes.find(n => n.id === connection.source);
                const targetNode = nodes.find(n => n.id === connection.target);

                if (sourceNode && targetNode) {
                    const sourcePos = sourceNode.position;
                    const targetPos = targetNode.position;

                    // 计算相对位置
                    const deltaX = targetPos.x - sourcePos.x;
                    const deltaY = targetPos.y - sourcePos.y;

                    // 判断是否需要颠倒连接方向
                    // 规则：如果目标节点在源节点的左上方，则颠倒连接方向
                    const shouldReverse = deltaX < -50 || deltaY < -50; // 给一些容差

                    if (shouldReverse) {
                        // 颠倒连接方向
                        finalConnection = {
                            ...connection,
                            source: connection.target,  // 颠倒：原来的target变成source
                            target: connection.source,  // 颠倒：原来的source变成target
                            sourceHandle: connection.targetHandle, // 颠倒handle
                            targetHandle: connection.sourceHandle, // 颠倒handle
                            data: {
                                ...connection.data,
                                directionReversed: true,
                                originalSource: connection.source,
                                originalTarget: connection.target,
                                originalSourceHandle: connection.sourceHandle,
                                originalTargetHandle: connection.targetHandle
                            }
                        };

                        console.log('🔄 流程线颠倒连接方向:', {
                            original: `${connection.source} -> ${connection.target}`,
                            reversed: `${finalConnection.source} -> ${finalConnection.target}`,
                            reason: `目标在源的${deltaX < -50 ? '左侧' : ''}${deltaY < -50 ? '上方' : ''}`,
                            deltaX,
                            deltaY
                        });
                    } else {
                        // 保持原始连接方向
                        finalConnection = {
                            ...connection,
                            data: {
                                ...connection.data,
                                directionOptimized: true,
                                optimizationApplied: true
                            }
                        };

                        console.log('➡️ 流程线保持原始连接方向:', {
                            connection: `${finalConnection.source} -> ${finalConnection.target}`,
                            reason: '目标在源的右下方',
                            deltaX,
                            deltaY
                        });
                    }
                }
            }

            console.log('✅ 最终连接参数:', finalConnection);

            // 添加到edges状态
            onEdgesChange([{
                type: 'add',
                item: finalConnection
            }]);
        };

        const handleFlowLineSelected = (event) => {
            const { lineId } = event.detail;
            console.log('🎯 流程线被选中:', lineId);
            onEdgeClick(lineId, event.detail.data);
        };

        const handleFlowLineDeleted = (event) => {
            const { lineId } = event.detail;
            console.log('🗑️ 流程线被删除:', lineId);
            onDeleteEdge(lineId);
        };

        const handleFlowLineReversed = (event) => {
            const { lineId, data } = event.detail;
            console.log('🔄 流程线被反转:', lineId, data);
            onReverseEdge(lineId, data);
        };



        // 添加事件监听器
        window.addEventListener('flowLineConnected', handleFlowLineConnected);
        window.addEventListener('flowLineSelected', handleFlowLineSelected);
        window.addEventListener('flowLineDeleted', handleFlowLineDeleted);
        window.addEventListener('flowLineReversed', handleFlowLineReversed);

        return () => {
            // 清理事件监听器
            window.removeEventListener('flowLineConnected', handleFlowLineConnected);
            window.removeEventListener('flowLineSelected', handleFlowLineSelected);
            window.removeEventListener('flowLineDeleted', handleFlowLineDeleted);
            window.removeEventListener('flowLineReversed', handleFlowLineReversed);
        };
    }, [onEdgesChange, onEdgeClick, onDeleteEdge, onReverseEdge]);
    const [selectedBoxId, setSelectedBoxId] = useState(null);

    // 简化视图持久化，只使用主要的Hook
    const isOnMindmapPage = currentPage === 'mindmap';
    const { saveViewport, restoreViewport, manualSave } = useViewportPersistence('mindmap_viewport', isOnMindmapPage);

    // Handle dropping new nodes from toolbox - keep existing nodes in place
    const onDrop = useCallback((event) => {
      event.preventDefault();
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      try {
        const nodeData = JSON.parse(type);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode = {
          id: `node_${Date.now()}`,
          type: nodeData.type || nodeData.nodeType,
          position,
          data: {
            label: nodeData.label,
            nodeType: nodeData.nodeType,
            toolData: nodeData.toolData,
            toolId: nodeData.toolId,
            ...nodeData.data
          },
        };

        // 直接添加新节点到指定位置，不触发布局重新计算
        setNodes((nds) => {
          const updatedNodes = [...nds, newNode];
          console.log('用户拖拽新节点到指定位置，其他节点保持不动');
          return updatedNodes;
        });

        // 保存数据
        setTimeout(() => {
          saveMindmapData();
          console.log('新节点已添加并保存');
        }, 100);
      } catch (error) {
        console.error('Error parsing dropped node data:', error);
      }
    }, [screenToFlowPosition, setNodes, saveMindmapData]);

    useEffect(() => {
        if (onFlowReady) {
            onFlowReady({ setViewport, getViewport, zoomIn, zoomOut, screenToFlowPosition, fitView, getNodes });
        }
    }, [onFlowReady, setViewport, getViewport, zoomIn, zoomOut, screenToFlowPosition, fitView, getNodes]);

    return (
    <div className="react-flow-wrapper" ref={reactFlowWrapperRef}>


            {/* 左侧工具盒子 */}
            <div className="top-left-boxes" style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div
                    className={`box box-1 ${selectedBoxId === 'box-1' ? 'selected' : ''}`}
                    draggable
                    onClick={() => setSelectedBoxId(selectedBoxId === 'box-1' ? null : 'box-1')}
                    onDragStart={(event) => {
                        const nodeData = {
                            type: 'customNode',
                            label: '材料节点',
                            nodeType: 'material-node',
                            inputType: 'file',
                            selectedFiles: [],
                            textContent: '',
                            urlList: [],
                            folderPath: '',
                            batchProcessing: false,
                            previewEnabled: true,
                            maxFileSize: 100,
                            allowedFormats: []
                        };
                        event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
                        event.dataTransfer.effectAllowed = 'move';
                    }}
                >
                    <span className="box-icon">📁</span>
                    <span className="box-text">材料</span>
                </div>
                <div
                    className={`box box-2 ${selectedBoxId === 'box-2' ? 'selected' : ''}`}
                    draggable
                    onClick={() => setSelectedBoxId(selectedBoxId === 'box-2' ? null : 'box-2')}
                    onDragStart={(event) => {
                        const nodeData = {
                            type: 'execution-node',
                            label: '执行',
                            nodeType: 'execution-node'
                        };
                        event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
                        event.dataTransfer.effectAllowed = 'move';
                    }}
                >
                    <span className="box-icon">⚡</span>
                    <span className="box-text">执行</span>
                </div>
                <div
                    className={`box box-3 ${selectedBoxId === 'box-3' ? 'selected' : ''}`}
                    draggable
                    onClick={() => setSelectedBoxId(selectedBoxId === 'box-3' ? null : 'box-3')}
                    onDragStart={(event) => {
                        const nodeData = {
                            type: 'condition-node',
                            label: '条件判断',
                            nodeType: 'condition-node'
                        };
                        event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
                        event.dataTransfer.effectAllowed = 'move';
                    }}
                >
                    <span className="box-icon">🔀</span>
                    <span className="box-text">条件</span>
                </div>
                <div
                    className="box box-4"
                    draggable
                    onDragStart={(event) => {
                        const nodeData = {
                            type: 'result-node',
                            label: '结果汇总',
                            nodeType: 'result-node'
                        };
                        event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
                        event.dataTransfer.effectAllowed = 'move';
                    }}
                >
                    <span className="box-icon">📋</span>
                    <span className="box-text">结果</span>
                </div>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges.map(edge => ({
                  ...edge,
                  selected: edge.id === selectedEdgeId,
                  className: edge.data?.isToolConnection ? 'tool-connection' : '',
                  data: {
                    ...edge.data,
                    onEdgeClick: isWorkflowLocked ? null : onEdgeClick,
                    onDeleteEdge: isWorkflowLocked ? null : onDeleteEdge
                  }
                }))}
                onNodesChange={isWorkflowLocked ? null : onNodesChange}
                onEdgesChange={isWorkflowLocked ? null : onEdgesChange}
                onConnect={isWorkflowLocked ? null : onConnect}
                onConnectStart={isWorkflowLocked ? null : onConnectStart}
                onConnectEnd={isWorkflowLocked ? null : onConnectEnd}
                onEdgeClick={(event, edge) => onEdgeClick(edge.id, edge.data)} // 保持边点击功能
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeContextMenu={isWorkflowLocked ? null : onNodeContextMenu}
                onPaneContextMenu={onPaneContextMenu} // 保持右键菜单功能
                onPaneClick={onPaneClick} // 保持画布点击功能
                onNodeClick={isWorkflowLocked ? null : onNodeClick} // 添加节点点击处理
                onNodeDrag={isWorkflowLocked ? null : onNodeDrag}
                onNodeDragStop={isWorkflowLocked ? null : onNodeDragStop}
                // 禁用自动fitView，保持用户的视野设置
                // fitView
                // 设置默认视野：更远的视角（缩放60%）
                defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineType={ConnectionLineType.Bezier}
                connectionLineStyle={{ strokeWidth: 2, stroke: '#7c3aed' }}
                connectionMode={ConnectionMode.Loose}
                className="mindmap-flow"
        ref={reactFlowWrapperRef}
        onDrop={onDrop}
        onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }}

            >
                <Controls />

                {/* 连接纠正标签 */}
                {edges.map(edge => {
                  if (!edge.data?.connectionCorrected) return null;

                  // 获取连接线的起点和终点坐标
                  const sourceNode = nodes.find(n => n.id === edge.source);
                  const targetNode = nodes.find(n => n.id === edge.target);

                  if (!sourceNode || !targetNode) return null;

                  // 简化的坐标计算（实际应该考虑连接点位置）
                  const sourceX = sourceNode.position.x + 100; // 节点中心偏移
                  const sourceY = sourceNode.position.y + 60;
                  const targetX = targetNode.position.x + 100;
                  const targetY = targetNode.position.y + 60;

                  return (
                    <ConnectionCorrectionLabel
                      key={`correction-${edge.id}`}
                      edge={edge}
                      sourceX={sourceX}
                      sourceY={sourceY}
                      targetX={targetX}
                      targetY={targetY}
                    />
                  );
                })}

                {/* 快捷键帮助按钮 - 放在控制面板下方 */}
                <div className="custom-controls">
                  <button
                    className="control-button keyboard-help-button"
                    onClick={() => setIsShortcutHelpVisible(true)}
                    title="快捷键帮助 (查看所有快捷键)"
                  >
                    ⌨️
                  </button>
                </div>


                <Background variant="dots" gap={12} size={1} />

                {/* 自定义丝滑箭头标记 */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
                  <SmoothArrowMarker id="smooth-arrow" color="#7c3aed" />
                </svg>

                {/* 工作流锁定覆盖层已移除 - 改为只锁定节点编辑功能 */}
            </ReactFlow>

            {/* 流程线预览 */}
            <FlowLinePreview
                previewConnection={previewConnection}
                isConnecting={isConnecting}
            />

        </div>
    );
}


function App() {
  const [runMode, setRunMode] = React.useState('auto');
  const supportedModes = ['auto', 'daily', 'professional']; // custom模式暂未开放
  const [showAIWorkflowModal, setShowAIWorkflowModal] = useState(false);

  const handleModeChange = (e) => {
    const val = e.target.value;
    if (!supportedModes.includes(val)) {
      alert('该模式暂未开放，敬请期待！');
      return; // 不更新
    }
    setRunMode(val);
  };
    const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  // 使用 ref 保持最新的 nodes/edges，避免闭包拿到旧值
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
 
  // 🤖 初始化AI条件分支管理器
  const aiBranchManager = useRef(new AIConditionBranchManager());

  // 🔧 使用useRef保存最新的nodes状态，解决React闭包问题（已合并到通用 nodesRef/edgesRef）
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [layoutRequested, setLayoutRequested] = useState(false);
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);
  const [copiedElements, setCopiedElements] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  // 从localStorage恢复布局状态
  const getStoredLayoutState = () => {
    try {
      const stored = localStorage.getItem('mindmap-layout-state');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        return {
          isSidebarCollapsed: parsed.isSidebarCollapsed ?? false,
          isChatBoxCollapsed: parsed.isChatBoxCollapsed ?? false,
          floatingButtonPosition: parsed.floatingButtonPosition ?? {
            x: window.innerWidth - 40,
            y: window.innerHeight * 0.6 - 20
          }
        };
      }
    } catch (error) {
      console.warn('Failed to restore layout state:', error);
      localStorage.removeItem('mindmap-layout-state'); // 清除无效数据
    }
    return {
      isSidebarCollapsed: false,
      isChatBoxCollapsed: false,
      floatingButtonPosition: {
        x: window.innerWidth - 40,
        y: window.innerHeight * 0.6 - 20
      }
    };
  };

  // 侧边栏收起/展开状态 - 默认展开
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // 聊天框收起/展开状态
  const [isChatBoxCollapsed, setIsChatBoxCollapsed] = useState(() =>
    getStoredLayoutState().isChatBoxCollapsed
  );

  // 快捷键帮助弹窗状态
  const [isShortcutHelpVisible, setIsShortcutHelpVisible] = useState(false);

  // 状态跟踪面板状态 - 从存储中恢复
  const [isStatusTrackingVisible, setIsStatusTrackingVisible] = useState(() => {
    try {
      const stored = localStorage.getItem('mindmap-ui-state');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        return parsed.global?.statusTracking?.showTrackingWindow || false;
      }
    } catch (error) {
      console.warn('恢复文档预览面板状态失败:', error);
    }
    return false;
  });

  // 节点属性面板状态
  const [isNodePropertiesVisible, setIsNodePropertiesVisible] = useState(false);
  
  // 精确操作上下文状态
  const [currentPrecisionContext, setCurrentPrecisionContext] = useState({
    node: null,
    operationId: null,
    operationIndex: null,
    operationType: null,
    filename: null,
    operationContent: null // 新增：存储输入框的具体内容
  });

  // 工具库显示状态
  const [isToolLibraryVisible, setIsToolLibraryVisible] = useState(false);

  // 悬浮按钮位置状态
  const [floatingButtonPosition, setFloatingButtonPosition] = useState(() =>
    getStoredLayoutState().floatingButtonPosition
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 保存布局状态到localStorage
  const saveLayoutState = useCallback(() => {
    try {
      const layoutState = {
        isSidebarCollapsed,
        isChatBoxCollapsed,
        floatingButtonPosition
      };
      localStorage.setItem('mindmap-layout-state', JSON.stringify(layoutState));
    } catch (error) {
      console.warn('Failed to save layout state:', error);
    }
  }, [isSidebarCollapsed, isChatBoxCollapsed, floatingButtonPosition]);

  // 当布局状态改变时保存到localStorage
  useEffect(() => {
    saveLayoutState();
  }, [saveLayoutState]);

  // 保存思维导图数据到localStorage
  const saveMindmapData = useCallback(() => {
    try {
      // 获取当前视口信息
      let viewport = { x: 0, y: 0, zoom: 1 };
      try {
        if (reactFlowInstanceFunctions && reactFlowInstanceFunctions.getViewport) {
          viewport = reactFlowInstanceFunctions.getViewport();
        }
      } catch (viewportError) {
        console.warn('Failed to get viewport, using default:', viewportError);
      }

      const savedAt = new Date().toISOString();
      const mindmapData = {
        nodes,
        edges,
        viewport,
        savedAt,
        // 保存节点的展开状态和其他重要状态
        nodeStates: nodes.reduce((acc, node) => {
          // 获取存储的UI状态
          let uiState = {};
          try {
            const storedUIState = localStorage.getItem('mindmap-ui-state');
            if (storedUIState && storedUIState !== 'undefined' && storedUIState !== 'null') {
              const parsed = JSON.parse(storedUIState);
              uiState = parsed.nodes?.[node.id] || {};
            }
          } catch (error) {
            console.warn('获取UI状态失败:', error);
          }
          
          acc[node.id] = {
            isExpanded: uiState.isExpanded ?? node.data?.isExpanded ?? false,
            isConfigOpen: node.data?.isConfigOpen || false,
            position: node.position,
            // 保存材料节点的详细状态
            selectedFiles: uiState.selectedFiles || node.data?.selectedFiles || [],
            textContent: uiState.textContent || node.data?.textContent || '',
            inputType: uiState.inputType || node.data?.inputType || 'file',
            urlList: uiState.urlList || node.data?.urlList || [],
            folderPath: uiState.folderPath || node.data?.folderPath || ''
          };
          return acc;
        }, {})
      };
      localStorage.setItem('mindmap-data', JSON.stringify(mindmapData));
      setLastLocalSave(savedAt);
      console.log('思维导图数据已保存到本地存储，包含视口和节点状态');
    } catch (error) {
      console.warn('Failed to save mindmap data:', error);
    }
  }, [nodes, edges]);

  // 从localStorage恢复思维导图数据
  const restoreMindmapData = useCallback(() => {
    try {
      const stored = localStorage.getItem('mindmap-data');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        if (parsed.nodes && parsed.edges) {
          // 设置恢复状态标志
          setIsRestoringData(true);
          isDataFromLocalStorage.current = true;

          // 过滤掉"开始"节点
          const filteredNodes = parsed.nodes.filter(node =>
            !(node.data && (node.data.label === '开始' ||
              (node.data.nodeType === 'execution-node' && node.data.label === '开始')))
          );

          // 恢复节点状态（展开状态、位置等）
          const restoredNodes = filteredNodes.map(node => {
            const savedState = parsed.nodeStates?.[node.id];
            if (savedState) {
              return {
                ...node,
                position: savedState.position || node.position,
                data: {
                  ...node.data,
                  isExpanded: savedState.isExpanded || false,
                  isConfigOpen: savedState.isConfigOpen || false,
                  // 恢复材料节点的详细状态
                  selectedFiles: savedState.selectedFiles || node.data?.selectedFiles || [],
                  textContent: savedState.textContent || node.data?.textContent || '',
                  inputType: savedState.inputType || node.data?.inputType || 'file',
                  urlList: savedState.urlList || node.data?.urlList || [],
                  folderPath: savedState.folderPath || node.data?.folderPath || ''
                }
              };
            }
            return node;
          });

          console.log('恢复思维导图数据，保持原有节点位置:', {
            nodes: restoredNodes.length,
            edges: parsed.edges.length,
            viewport: parsed.viewport,
            savedAt: parsed.savedAt,
            preservePositions: true
          });

          setNodes(restoredNodes);

          // 🔧 修复恢复的连接点ID：将简单ID转换为复合ID
          const fixedEdges = parsed.edges.map(edge => {
            let sourceHandle = edge.sourceHandle;
            let targetHandle = edge.targetHandle;

            // 修复源连接点ID
            if (sourceHandle === 'right') sourceHandle = 'right-source';
            else if (sourceHandle === 'left') sourceHandle = 'left-source';
            else if (sourceHandle === 'top') sourceHandle = 'top-source';
            else if (sourceHandle === 'bottom') sourceHandle = 'bottom-source';

            // 修复目标连接点ID
            if (targetHandle === 'left') targetHandle = 'left-target';
            else if (targetHandle === 'right') targetHandle = 'right-target';
            else if (targetHandle === 'top') targetHandle = 'top-target';
            else if (targetHandle === 'bottom') targetHandle = 'bottom-target';

            return {
              ...edge,
              sourceHandle,
              targetHandle
            };
          });
          console.log('🔧 修复恢复的连接点ID:', fixedEdges.length, '条连接');

          setEdges(fixedEdges);
          setLastLocalSave(parsed.savedAt);

          // 设置自动适应视图标记（页面刷新时）
          if (restoredNodes.length > 0) {
            sessionStorage.setItem('autoFitViewOnLoad', 'true');
            console.log('已设置自动适应视图标记');
          }

          // 不再手动处理视口恢复，让useViewportPersistence Hook处理
          // 避免覆盖用户当前的视野设置
          console.log('数据恢复完成，视野由useViewportPersistence Hook管理');

          // 标记初始布局已应用，避免触发自动布局
          initialLayoutApplied.current = true;
          // 确保不会触发重新布局
          setLayoutRequested(false);

          // 延迟重置恢复状态标志，给更多时间确保布局不被触发
          setTimeout(() => {
            setIsRestoringData(false);
            // 再次确保布局标志为false
            setLayoutRequested(false);
          }, 500); // 增加延迟时间
        }
      } else {
        console.log('没有找到保存的思维导图数据');
      }
    } catch (error) {
      console.warn('Failed to restore mindmap data:', error);
      localStorage.removeItem('mindmap-data'); // 清除无效数据
      setIsRestoringData(false);
    }
  }, [setNodes, setEdges]);

  // Function to trigger the toast notification
  const showToast = useCallback((message, type = 'error') => {
    setExecutionResult({ message, type });
    // Automatically hide the toast after a few seconds
    setTimeout(() => setExecutionResult(null), 8000); // 8 seconds
  }, []);

  // 页面加载时恢复数据
  useEffect(() => {
    console.log('页面加载，尝试恢复思维导图数据');
    restoreMindmapData();
  }, []); // 只在组件挂载时执行一次

  // 当节点或边改变时保存数据
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const timeoutId = setTimeout(() => {
        saveMindmapData();
      }, 1000); // 防抖，1秒后保存
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, saveMindmapData]);



  // 页面离开前保存数据
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // 在页面关闭前保存数据
      saveMindmapData();
    };

    const handleUnload = () => {
      // 页面卸载时也保存数据
      saveMindmapData();
    };

    const handleVisibilityChange = () => {
      // 当页面变为隐藏时保存数据（例如切换标签页）
      try {
        if (document.hidden && (nodes.length > 0 || edges.length > 0)) {
          console.log('页面变为隐藏，保存思维导图数据');
          saveMindmapData();
        }
      } catch (error) {
        console.warn('Error in visibility change handler:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveMindmapData]);

  // 重置布局状态
  const resetLayoutState = useCallback(() => {
    try {
      localStorage.removeItem('mindmap-layout-state');
      localStorage.removeItem('mindmap-data');
      // 重置到默认状态
      setIsSidebarCollapsed(false);
      setIsChatBoxCollapsed(false);
      setFloatingButtonPosition({
        x: window.innerWidth - 40,
        y: window.innerHeight * 0.6 - 20
      });
      console.log('Layout state reset successfully');
    } catch (error) {
      console.warn('Failed to reset layout state:', error);
    }
  }, []);

  // 在开发环境中暴露重置函数到全局，方便调试
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.resetMindmapLayout = resetLayoutState;
      console.log('Debug: Use window.resetMindmapLayout() to reset layout state');
    }
  }, [resetLayoutState]);

  const reactFlowWrapper = useRef(null);
  const fileInputRef = useRef(null);
  const initialLayoutApplied = useRef(false);
  // 认证状态管理 - 临时设为已认证状态用于演示
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return true; // 临时绕过认证，直接进入应用
    // const token = localStorage.getItem('access_token');
    // return !!token;
  });

  const [user, setUser] = useState(() => {
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo || userInfo === 'undefined' || userInfo === 'null') {
      return null;
    }
    try {
      return JSON.parse(userInfo);
    } catch (error) {
      console.warn('Failed to parse user_info from localStorage:', error);
      localStorage.removeItem('user_info'); // 清除无效数据
      return null;
    }
  });

  // 从localStorage恢复页面状态，如果没有则默认为'mindmap'
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('currentPage');
    return savedPage || 'mindmap';
  });
  
  // 当前工作流ID状态，用于状态管理演示
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  


  // 监听currentPage变化并保存到localStorage
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);

    // 当切换到思维导图页面时，恢复数据
    if (currentPage === 'mindmap') {
      console.log('切换到思维导图页面，恢复数据和节点位置');
      try {
        // 检查localStorage中是否有保存的数据
        const stored = localStorage.getItem('mindmap-data');
        if (stored && stored !== 'undefined' && stored !== 'null') {
          const parsed = JSON.parse(stored);
          // 如果localStorage中有数据，且与当前数据不同，则恢复
          if (parsed.nodes && parsed.edges) {
            const shouldRestore = nodes.length === 0 && edges.length === 0; // 没有数据时恢复
            const hasPositionChanges = parsed.nodes.some(savedNode => {
              const currentNode = nodes.find(n => n.id === savedNode.id);
              if (!currentNode) return true; // 新节点
              const savedState = parsed.nodeStates?.[savedNode.id];
              if (savedState && savedState.position) {
                // 检查位置是否有变化（允许小的浮点数误差）
                const positionChanged = Math.abs(currentNode.position.x - savedState.position.x) > 1 ||
                                      Math.abs(currentNode.position.y - savedState.position.y) > 1;
                return positionChanged;
              }
              return false;
            });

            if (shouldRestore || hasPositionChanges) {
              console.log('页面切换回思维导图，恢复数据并保持节点位置');
              isPageSwitchRestore.current = true; // 标记为页面切换恢复
              restoreMindmapData();

              // 页面切换回思维导图时也自动适应视图
              if (parsed.nodes && parsed.nodes.length > 0) {
                sessionStorage.setItem('autoFitViewOnLoad', 'true');
                console.log('页面切换回思维导图，已设置自动适应视图标记');
              }
            } else {
              console.log('当前数据已是最新，无需恢复');

              // 即使数据无需恢复，如果有节点也触发适应视图
              if (nodes.length > 0) {
                setTimeout(() => {
                  if (window.reactFlowInstanceFunctions?.fitView) {
                    window.reactFlowInstanceFunctions.fitView({ padding: 0.2, duration: 600 });
                    console.log('页面切换回思维导图，自动适应视图已执行');
                  }
                }, 200);
              }
            }
          }
        } else if (nodes.length === 0 && edges.length === 0) {
          // 如果没有保存的数据且当前也没有数据，尝试恢复
          restoreMindmapData();
        }
      } catch (error) {
        console.warn('Error restoring mindmap data:', error);
        localStorage.removeItem('mindmap-data'); // 清除无效数据
      }
    }
    // 当离开思维导图页面时，保存数据
    else if (nodes.length > 0 || edges.length > 0) {
      console.log('离开思维导图页面，保存数据');
      try {
        saveMindmapData();
      } catch (error) {
        console.warn('Error saving mindmap data:', error);
      }
    }
  }, [currentPage]);

  // 页面加载时不恢复思维导图数据（保持空白状态）
  // useEffect(() => {
  //   restoreMindmapData();
  // }, []);

  // 当切换到思维导图页面时也不恢复数据（保持空白状态）
  // useEffect(() => {
  //   if (currentPage === 'mindmap') {
  //     restoreMindmapData();
  //   }
  // }, [currentPage, restoreMindmapData]);

  // 当前思维导图状态
  const [currentMindmap, setCurrentMindmap] = useState({
    id: null,
    title: '未命名思维导图',
    description: '',
    isNew: true,
    lastSaved: null
  });

  // 本地保存状态
  const [lastLocalSave, setLastLocalSave] = useState(() => {
    try {
      const stored = localStorage.getItem('mindmap-data');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        return parsed.savedAt || null;
      }
    } catch (error) {
      console.warn('Failed to get last save time:', error);
      localStorage.removeItem('mindmap-data'); // 清除无效数据
    }
    return null;
  });

  // 保存对话框状态
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogData, setSaveDialogData] = useState({
    title: '',
    description: ''
  });

  const [messages, setMessages] = useState([
    { id: 1, text: '你好！请用自然语言描述你的工作流吧。', sender: 'ai' },
  ]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [validationSuggestions, setValidationSuggestions] = useState([]);
  const [loadingState, setLoadingState] = useState(null); // null, 'generating', or 'executing'
  const [editingNode, setEditingNode] = useState(null);

  // 智能工作流生成状态（保留isGeneratingWorkflow用于其他地方的兼容性）
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  
  // State for failed runs, with localStorage persistence
  const [failedExecutionContext, setFailedExecutionContext] = useState(() => {
    try {
      const item = window.localStorage.getItem('failedExecutionContext');
      if (!item || item === 'undefined' || item === 'null') {
        return null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error("Error reading failedExecutionContext from localStorage", error);
      window.localStorage.removeItem('failedExecutionContext'); // 清除无效数据
      return null;
    }
  });
  useEffect(() => {
    try {
      if (failedExecutionContext) {
        window.localStorage.setItem('failedExecutionContext', JSON.stringify(failedExecutionContext));
      } else {
        window.localStorage.removeItem('failedExecutionContext');
      }
    } catch (error) {
      console.error("Error writing failedExecutionContext to localStorage", error);
    }
  }, [failedExecutionContext]);

  // NEW: State for paused runs (for approval), with localStorage persistence
  const [pausedForApprovalContext, setPausedForApprovalContext] = useState(() => {
    try {
      const item = window.localStorage.getItem('pausedForApprovalContext');
      if (!item || item === 'undefined' || item === 'null') {
        return null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error("Error reading pausedForApprovalContext from localStorage", error);
      window.localStorage.removeItem('pausedForApprovalContext'); // 清除无效数据
      return null;
    }
  });
  useEffect(() => {
    try {
      if (pausedForApprovalContext) {
        window.localStorage.setItem('pausedForApprovalContext', JSON.stringify(pausedForApprovalContext));
      } else {
        window.localStorage.removeItem('pausedForApprovalContext');
      }
    } catch (error) {
      console.error("Error writing pausedForApprovalContext to localStorage", error);
    }
  }, [pausedForApprovalContext]);


  // State to hold the execution result for toast notifications
  const [executionResult, setExecutionResult] = useState(null);
  const [executionContextState, setExecutionContextState] = useState(null);
  const [showResultPanel, setShowResultPanel] = useState(false);
  
  // 工作流执行状态和结果管理
  const [workflowExecutionStatus, setWorkflowExecutionStatus] = useState({});
  const [executionResults, setExecutionResults] = useState({});

  // 模板选择器状态
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);

  // 增强执行控制台状态
  // const [isConsoleMinimized, setIsConsoleMinimized] = useState(false); // 已移除控制台

  // 边的状态管理
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  // 工作流执行锁定状态
  const [isWorkflowLocked, setIsWorkflowLocked] = useState(false);

  // 边的处理函数
  const handleEdgeClick = useCallback((edgeId, edgeData) => {
    console.log('Edge clicked:', edgeId, edgeData);
    setSelectedEdgeId(edgeId);
  }, []);

  const handleDeleteEdge = useCallback((edgeId) => {
    console.log('Deleting edge:', edgeId);
    setEdges((eds) => eds.filter(edge => edge.id !== edgeId));
    setSelectedEdgeId(null);
  }, [setEdges]);

  // 反转连接方向
  const handleReverseEdge = useCallback((edgeId, edgeData) => {
    console.log('🔄 反转连接方向:', edgeId, edgeData);

    setEdges((eds) => eds.map(edge => {
      if (edge.id === edgeId) {
        // 正确映射handle：将target handle转换为source handle，source handle转换为target handle
        const mapHandle = (handle, newType) => {
          if (!handle) return null;

          // 解析handle格式：position-type (如 "top-source", "left-target")
          const parts = handle.split('-');
          if (parts.length >= 2) {
            const position = parts[0]; // top, bottom, left, right
            return `${position}-${newType}`;
          }

          // 如果handle格式不标准，返回null让系统自动选择
          return null;
        };

        // 交换source和target，并正确映射handle
        const reversedEdge = {
          ...edge,
          source: edge.target,
          target: edge.source,
          sourceHandle: mapHandle(edge.targetHandle, 'source'),
          targetHandle: mapHandle(edge.sourceHandle, 'target'),
          data: {
            ...edge.data,
            manuallyReversed: true,
            originalSource: edge.source,
            originalTarget: edge.target,
            originalSourceHandle: edge.sourceHandle,
            originalTargetHandle: edge.targetHandle
          }
        };

        console.log('✅ 连接方向已反转:', {
          original: `${edge.source}[${edge.sourceHandle}] -> ${edge.target}[${edge.targetHandle}]`,
          reversed: `${reversedEdge.source}[${reversedEdge.sourceHandle}] -> ${reversedEdge.target}[${reversedEdge.targetHandle}]`,
          edgeId: edge.id,
          reversedEdgeData: reversedEdge
        });

        return reversedEdge;
      }
      return edge;
    }));
  }, [setEdges]);

  // 键盘事件处理 - 删除选中的边
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdgeId) {
        event.preventDefault();
        handleDeleteEdge(selectedEdgeId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, handleDeleteEdge]);

  // THIS IS THE FIX: Restore the state and the callback for React Flow instance functions
  const [reactFlowInstanceFunctions, setReactFlowInstanceFunctions] = useState(null);
  const onFlowReady = useCallback((instanceFunctions) => {
      setReactFlowInstanceFunctions(instanceFunctions);
      console.log('ReactFlow实例已准备，视野恢复由useViewportPersistence Hook处理');

      // 设置全局函数供右键菜单使用
      window.reactFlowInstanceFunctions = instanceFunctions;
      
      // 设置全局数据供ResultNode使用
      window.currentNodes = instanceFunctions.getNodes();
      window.currentEdges = edges; // 从当前状态获取
      
      window.addNodeFromContextMenu = (newNode) => {
        setNodes((nds) => [...nds, newNode]);
        saveMindmapData();
        console.log('从右键菜单添加节点:', newNode.data.label);
      };

      // 检查是否需要自动适应视图（页面刷新或首次加载）
      const shouldAutoFitView = sessionStorage.getItem('autoFitViewOnLoad');
      if (shouldAutoFitView === 'true') {
        console.log('检测到需要自动适应视图，延迟执行...');
        setTimeout(() => {
          instanceFunctions.fitView({ padding: 0.2, duration: 800 });
          sessionStorage.removeItem('autoFitViewOnLoad');
          console.log('自动适应视图已执行');
        }, 500); // 延迟500ms确保节点已渲染
      }

      // 不再手动恢复视口，避免与useViewportPersistence Hook冲突
      // 让专门的视野持久化Hook来处理视野的保存和恢复
  }, [setNodes, saveMindmapData]);

  // Use SafeResizeObserver to log dimensions for debugging
  useEffect(() => {
    if (reactFlowWrapper.current) {
      console.log('App - reactFlowWrapper dimensions (from useEffect):', reactFlowWrapper.current.offsetWidth, reactFlowWrapper.current.offsetHeight);

      const resizeObserver = createSafeResizeObserver(entries => {
        for (let entry of entries) {
          console.log('App - SafeResizeObserver on reactFlowWrapper:', entry.contentRect.width, entry.contentRect.height);
        }
      });

      if (reactFlowWrapper.current) {
      resizeObserver.observe(reactFlowWrapper.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [reactFlowWrapper]);

  // 同步思维导图数据到后端
  const syncMindmapToBackend = useCallback(async (nodes, edges) => {
    try {
      await fetch(`${API_BASE}/api/mindmap/current`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
    } catch (error) {
      console.warn('同步思维导图数据到后端失败:', error);
    }
  }, []);

  // onNodesChange and onEdgesChange handlers
  const onNodesChangeInternal = useCallback((changes) => {
    setNodes((nds) => {
      const newNodes = applyNodeChanges(changes, nds);
      // 同步到全局变量供ResultNode使用
      window.currentNodes = newNodes;
      // 同步到后端（异步，不阻塞UI）
      syncMindmapToBackend(newNodes, edges);
      return newNodes;
    });
  }, [setNodes, edges, syncMindmapToBackend]);

  const onEdgesChangeInternal = useCallback((changes) => {
    setEdges((eds) => {
      const newEdges = applyEdgeChanges(changes, eds);
      // 同步到全局变量供ResultNode使用
      window.currentEdges = newEdges;
      // 同步到后端（异步，不阻塞UI）
      syncMindmapToBackend(nodes, newEdges);
      return newEdges;
    });
  }, [setEdges, nodes, syncMindmapToBackend]);



  // Handlers for context menu
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, [setSelectedNodeId]);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setSelectedNodeId(null);
    setSelectedEdgeId(null); // 取消边的选择
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
    });
  }, [setSelectedNodeId]);

  // 空白区域点击处理 - 取消所有选中状态
  const onPaneClick = useCallback((event) => {
    // 只有在直接点击空白区域时才取消选中（不是拖拽结束）
    if (event.detail === 1) { // 单击
      setSelectedNodeId(null);
      setSelectedEdgeId(null); // 取消边的选择
      setContextMenu(null); // 关闭右键菜单
      setIsNodePropertiesVisible(false); // 关闭节点属性面板
    }
  }, [setSelectedNodeId]);



  // 节点点击处理 - 清除精确操作上下文，只显示节点信息
  const onNodeClick = useCallback((event, node) => {
    console.log('Node clicked:', node.id, node.data);
    
    // 清除当前的精确操作上下文，重置为仅显示节点信息
    setCurrentPrecisionContext({
      node: {
        id: node.id,
        label: node.data?.label || '节点',
        data: node.data
      },
      operationId: null,
      operationIndex: null,
      operationType: null,
      filename: null,
      operationContent: null
    });
    
    // 设置选中状态
    setSelectedNodeId(node.id);
    setContextMenu(null); // 关闭右键菜单
    
    // 显示节点属性面板
    setIsNodePropertiesVisible(true);
  }, [setSelectedNodeId]);

  // 关闭节点属性面板
  const closeNodeProperties = useCallback(() => {
    setIsNodePropertiesVisible(false);
    setSelectedNodeId(null);
  }, []);

  // 获取当前选中的节点
  const selectedNode = useMemo(() => {
    return selectedNodeId ? nodes.find(node => node.id === selectedNodeId) : null;
  }, [selectedNodeId, nodes]);

  // 节点更新处理
  const handleNodeUpdate = useCallback((nodeId, newData) => {
    setNodes(nds => 
      nds.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, [setNodes]);

  const onCloseContextMenu = useCallback(() => {
    console.log('onCloseContextMenu triggered.');
    setContextMenu(null);
    console.log('ContextMenu state set to null.');
  }, []);

  // 🎯 智能连接开始处理 - 记录拖拽起始信息
  const onConnectStart = useCallback((event, { nodeId, handleId, handleType }) => {
    console.log('🔗 连接开始:', { nodeId, handleId, handleType });

    // 记录连接开始的信息，用于后续的智能连接点选择
    window.connectionStartInfo = {
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourceHandleType: handleType,
      startTime: Date.now()
    };
  }, []);

  // 🎯 智能连接结束处理 - 在连接完成前选择最佳连接点
  const onConnectEnd = useCallback((event) => {
    console.log('🔗 连接结束:', event);

    // 清理连接开始信息
    if (window.connectionStartInfo) {
      delete window.connectionStartInfo;
    }
  }, []);

  // 🔗 简化连接点计算函数（手动配置优先）
  const calculateOptimalConnectionPoints = useCallback((sourceNode, targetNode, userSpecifiedHandle = null) => {
    console.log('🔗 计算连接点:', sourceNode.id, '->', targetNode.id, userSpecifiedHandle ? `用户指定: ${userSpecifiedHandle}` : '');

    // 🔀 条件节点分支连接处理
    if (sourceNode.type === 'condition-node' && userSpecifiedHandle) {
      // 检查是否为分支连接点
      if (userSpecifiedHandle === 'left-true' || userSpecifiedHandle === 'right-false') {
        const branchType = userSpecifiedHandle === 'left-true' ? 'True' : 'False';
        console.log(`✅ [条件节点] 用户指定${branchType}分支连接点: ${userSpecifiedHandle}`);

        return {
          sourceHandle: userSpecifiedHandle,
          targetHandle: 'top-target'
        };
      }
    }

    // 安全检查：确保节点信息存在
    if (!sourceNode || !targetNode) {
      console.warn('⚠️ 节点信息缺失，使用默认连接点');
      return {
        sourceHandle: 'right-source',
        targetHandle: 'left-target'
      };
    }

    // 简化连接逻辑 - 移除复杂的智能计算

    // 获取节点的 Handle ID 格式
    const getActualHandleId = (node, direction, isSource) => {
      const nodeType = node.data?.nodeType;
      
      if (nodeType === 'material-node' || nodeType === 'execution-node' ||
          nodeType === 'condition-node' || nodeType === 'result-node' ||
          nodeType === 'enhanced-material-node' || nodeType === 'enhanced-execution-node' ||
          nodeType === 'enhanced-condition-node' || nodeType === 'enhanced-result-node') {
        return `${direction}-${isSource ? 'source' : 'target'}`;
      } else {
        return direction;
      }
    };

    // 默认连接：从右到左
    const connection = {
      sourceHandle: getActualHandleId(sourceNode, 'right', true),
      targetHandle: getActualHandleId(targetNode, 'left', false)
    };

    console.log(`🔗 连接: ${sourceNode.id}[${connection.sourceHandle}] -> ${targetNode.id}[${connection.targetHandle}]`);
    return connection;
  }, []);



  const onConnect = useCallback(
    (params) => {
      console.log('🔗 连接触发:', params);
      console.log('📍 原始参数:', JSON.stringify(params, null, 2));

      // 🎯 修复连接方向：使用 connectionStartInfo 来确定真正的起点和终点
      let correctedParams = { ...params };

      if (window.connectionStartInfo) {
        const startInfo = window.connectionStartInfo;
        console.log('🔍 连接开始信息:', startInfo);

        // 如果拖拽开始的节点与 params.source 不同，说明 React Flow 颠倒了方向
        if (startInfo.sourceNodeId !== params.source) {
          console.log('🔄 检测到连接方向被 React Flow 颠倒，正在纠正...');
          correctedParams = {
            source: startInfo.sourceNodeId,
            target: params.source, // 原来的 source 实际上是 target
            sourceHandle: startInfo.sourceHandleId,
            targetHandle: params.sourceHandle // 原来的 sourceHandle 实际上是 targetHandle
          };
          console.log('✅ 连接方向已纠正:', correctedParams);
        }
      }

      // 🎯 智能连接点选择：自动选择最近的连接点
      let optimizedParams = { ...correctedParams };

      // 获取起点和终点节点信息 - 使用nodesRef获取最新状态
      const currentNodes = nodesRef.current;
      console.log('🔍 查找节点:', {
        sourceId: optimizedParams.source,
        targetId: optimizedParams.target,
        totalNodes: currentNodes.length,
        nodeIds: currentNodes.map(n => n.id)
      });

      const sourceNode = currentNodes.find(n => n.id === optimizedParams.source);
      const targetNode = currentNodes.find(n => n.id === optimizedParams.target);

      console.log('🔍 节点查找结果:', {
        sourceNode: sourceNode ? `${sourceNode.id} (${sourceNode.position?.x}, ${sourceNode.position?.y})` : 'NOT_FOUND',
        targetNode: targetNode ? `${targetNode.id} (${targetNode.position?.x}, ${targetNode.position?.y})` : 'NOT_FOUND'
      });

      if (sourceNode && targetNode) {
        // 🤖 检查是否为AI生成的分支连接（条件节点的分支连接点）
        const isAIBranchConnection = (
          params.sourceHandle === 'left-true' ||
          params.sourceHandle === 'right-false' ||
          params.targetHandle === 'left-true' ||
          params.targetHandle === 'right-false'
        );

        if (isAIBranchConnection) {
          console.log('🤖 检测到AI分支连接，保留指定的分支连接点:', {
            sourceHandle: params.sourceHandle,
            targetHandle: params.targetHandle
          });

          // 保留AI指定的分支连接点，不进行重新计算
          optimizedParams.sourceHandle = params.sourceHandle;
          optimizedParams.targetHandle = params.targetHandle;
        } else {
          // 使用智能连接点选择算法，传递用户指定的连接点信息
          const userSpecifiedHandle = params.sourceHandle;
          const optimalConnection = calculateOptimalConnectionPoints(sourceNode, targetNode, userSpecifiedHandle);

          console.log('🎯 智能连接点选择:', {
            original: { sourceHandle: params.sourceHandle, targetHandle: params.targetHandle },
            optimal: { sourceHandle: optimalConnection.sourceHandle, targetHandle: optimalConnection.targetHandle }
          });

          // 应用最优连接点
          optimizedParams.sourceHandle = optimalConnection.sourceHandle;
          optimizedParams.targetHandle = optimalConnection.targetHandle;
        }
      } else {
        console.warn('⚠️ 无法找到源节点或目标节点，跳过智能连接点选择');
      }

      // 🎯 智能连接方向处理：保持用户拖拽的原始方向，不自动颠倒
      let finalParams;

      if (sourceNode && targetNode) {
        const sourcePos = sourceNode.position;
        const targetPos = targetNode.position;

        // 计算相对位置
        const deltaX = targetPos.x - sourcePos.x;
        const deltaY = targetPos.y - sourcePos.y;

        // 🔧 修复：不再自动颠倒连接方向，尊重用户的拖拽意图
        // 直接使用优化后的连接点，保持用户指定的连接方向
        finalParams = {
          source: optimizedParams.source,
          target: optimizedParams.target,
          sourceHandle: optimizedParams.sourceHandle,
          targetHandle: optimizedParams.targetHandle
        };

        console.log('➡️ 保持用户指定的连接方向:', {
          connection: `${finalParams.source} -> ${finalParams.target}`,
          reason: '尊重用户拖拽意图，不自动颠倒方向',
          deltaX,
          deltaY,
          handles: `${finalParams.sourceHandle} -> ${finalParams.targetHandle}`
        });
      } else {
        // 如果找不到节点信息，使用优化后的参数
        finalParams = {
          source: optimizedParams.source,
          target: optimizedParams.target,
          sourceHandle: optimizedParams.sourceHandle,
          targetHandle: optimizedParams.targetHandle
        };

        console.log('⚠️ 未找到节点信息，使用优化后的参数');
      }

      console.log('🎯 最终使用的参数:', JSON.stringify(finalParams, null, 2));

      // 🎯 动态连接点系统：让连接点适应连接线方向
      let connectionCorrected = false;
      let correctionMessage = '';
      let userDirection = null;

      if (sourceNode && targetNode) {
        // 检测用户的连接意图方向
        if (params.sourceHandle && params.targetHandle) {
          const sourceDirection = params.sourceHandle.split('-')[0]; // top, bottom, left, right
          const targetDirection = params.targetHandle.split('-')[0];

          // 根据用户选择的连接点推断连接方向
          if (sourceDirection === 'right' && targetDirection === 'left') {
            userDirection = 'horizontal-right';
          } else if (sourceDirection === 'left' && targetDirection === 'right') {
            userDirection = 'horizontal-left';
          } else if (sourceDirection === 'bottom' && targetDirection === 'top') {
            userDirection = 'vertical-down';
          } else if (sourceDirection === 'top' && targetDirection === 'bottom') {
            userDirection = 'vertical-up';
          }
        }

        // 🎯 使用智能连接点选择算法的结果，不再被动态连接系统覆盖
        console.log('🔗 最终选择的连接点:', {
          sourceHandle: finalParams.sourceHandle,
          targetHandle: finalParams.targetHandle
        });
      }

      // 获取最终的起点和终点节点信息（用于日志显示）- 使用nodesRef获取最新状态
      const finalSourceNode = currentNodes.find(n => n.id === finalParams.source);
      const finalTargetNode = currentNodes.find(n => n.id === finalParams.target);

      console.log('📍 起点节点:', finalSourceNode?.data?.label || finalSourceNode?.id);
      console.log('🎯 终点节点:', finalTargetNode?.data?.label || finalTargetNode?.id);

      // 检查工具节点连接规则
      if (sourceNode?.type === 'tool-node' || sourceNode?.type === 'tool') {
        // 工具节点只能连接到有AI或工具选择的节点
        const targetHasAIOrTool = targetNode?.data?.selectedAI ||
                                 targetNode?.data?.selectedTool ||
                                 targetNode?.data?.toolType ||
                                 targetNode?.type === 'execution-node' ||
                                 targetNode?.type === 'condition-node' ||
                                 targetNode?.type === 'result-node';

        if (!targetHasAIOrTool) {
          console.warn('🚫 工具节点只能连接到有AI或工具选择的节点');
          alert('工具节点只能连接到有AI或工具选择的节点（执行、条件、结果节点）');
          return;
        }
      }

      // 确定连接线颜色和箭头
      const isToolConnection = sourceNode?.type === 'tool-node' || sourceNode?.type === 'tool';

      // 检查是否是执行节点的大圆点连接（条件节点已移除大圆点）
      const isBigDotConnection = sourceNode?.type === 'execution-node' &&
        (finalParams.sourceHandle === 'big-dot-left-source' || finalParams.sourceHandle === 'big-dot-right-source');

      // 检查是否是连接到大圆点的目标连接（条件节点已移除大圆点）
      const isBigDotTargetConnection = targetNode?.type === 'execution-node' &&
        (finalParams.targetHandle === 'big-dot-left-target' || finalParams.targetHandle === 'big-dot-right-target');

      // 检查是否是执行节点或条件节点的特殊连接点（保留原有逻辑用于兼容）
      const isExecutionNodeSpecialConnection = sourceNode?.type === 'execution-node' &&
        (finalParams.sourceHandle === 'left-source' || finalParams.sourceHandle === 'right-source' ||
         finalParams.sourceHandle === 'left-source-alt' || finalParams.sourceHandle === 'right-source-alt');

      // 检测条件节点的分支连接
      const isConditionTrueBranch = sourceNode?.type === 'condition-node' && finalParams.sourceHandle === 'left-true';
      const isConditionFalseBranch = sourceNode?.type === 'condition-node' && finalParams.sourceHandle === 'right-false';

      const isConditionNodeSpecialConnection = sourceNode?.type === 'condition-node' &&
        (finalParams.sourceHandle === 'left-source' || finalParams.sourceHandle === 'right-source' ||
         finalParams.sourceHandle === 'left-source-alt' || finalParams.sourceHandle === 'right-source-alt');

      let edgeStyle;
      let markerEnd;

      if (isToolConnection) {
        edgeStyle = { strokeWidth: 2, stroke: '#fbbf24' }; // 工具连接 - 淡黄色
        markerEnd = 'url(#tool-arrow)';
      } else if (isConditionTrueBranch) {
        // 条件节点True分支 - RGB(11,168,117)
        edgeStyle = {
          strokeWidth: 2,
          stroke: '#0ba875',
          filter: 'drop-shadow(0 1px 3px rgba(11, 168, 117, 0.3))'
        };
        markerEnd = 'url(#smooth-arrow)';
      } else if (isConditionFalseBranch) {
        // 条件节点False分支 - RGB(91,100,114)
        edgeStyle = {
          strokeWidth: 2,
          stroke: '#5b6472',
          filter: 'drop-shadow(0 1px 3px rgba(91, 100, 114, 0.3))'
        };
        markerEnd = 'url(#smooth-arrow)';
      } else if (isBigDotConnection) {
        // 大圆点连接的颜色
        if (finalParams.sourceHandle === 'big-dot-left-source') {
          edgeStyle = { strokeWidth: 2, stroke: '#10b981' }; // 左侧大圆点 - 绿色
        } else if (finalParams.sourceHandle === 'big-dot-right-source') {
          edgeStyle = { strokeWidth: 2, stroke: '#f59e0b' }; // 右侧大圆点 - 黄色
        }
        markerEnd = 'url(#smooth-arrow)';
      } else if (isBigDotTargetConnection) {
        // 连接到大圆点的颜色
        if (finalParams.targetHandle === 'big-dot-left-target') {
          edgeStyle = { strokeWidth: 2, stroke: '#10b981' }; // 左侧大圆点 - 绿色
        } else if (finalParams.targetHandle === 'big-dot-right-target') {
          edgeStyle = { strokeWidth: 2, stroke: '#f59e0b' }; // 右侧大圆点 - 黄色
        }
        markerEnd = 'url(#smooth-arrow)';
      } else if (isExecutionNodeSpecialConnection || isConditionNodeSpecialConnection) {
        // 执行节点和条件节点特殊连接点的颜色 - 统一使用紫色
        edgeStyle = { strokeWidth: 2, stroke: '#7c3aed' }; // 紫色
        markerEnd = 'url(#smooth-arrow)';
      } else {
        edgeStyle = { strokeWidth: 2, stroke: '#7c3aed' }; // 默认 - 紫色
        markerEnd = 'url(#smooth-arrow)';
      }

      // 创建带箭头的连接
      const newEdge = {
        ...finalParams,
        ...defaultEdgeOptions,
        style: edgeStyle,
        markerEnd: markerEnd,
        id: `edge-${finalParams.source}-${finalParams.target}-${Date.now()}`,
        data: {
          sourceNode: finalParams.source,
          targetNode: finalParams.target,
          sourceHandle: finalParams.sourceHandle,
          targetHandle: finalParams.targetHandle,
          isToolConnection,
          isExecutionNodeSpecialConnection,
          isConditionNodeSpecialConnection,
          isBigDotConnection,
          isBigDotTargetConnection,
          // 添加条件分支标识
          branchType: isConditionTrueBranch ? 'condition-true' :
                     isConditionFalseBranch ? 'condition-false' : null,
          branchLabel: isConditionTrueBranch ? '✅ True' :
                      isConditionFalseBranch ? '❌ False' : null,
          // 添加连接纠正信息
          connectionCorrected,
          correctionMessage,
          originalSourceHandle: params.sourceHandle,
          originalTargetHandle: params.targetHandle,
          connectionType: isBigDotConnection ?
            (finalParams.sourceHandle === 'big-dot-left-source' ? 'big-dot-left' : 'big-dot-right') :
            (isBigDotTargetConnection ?
              (finalParams.targetHandle === 'big-dot-left-target' ? 'big-dot-target-left' : 'big-dot-target-right') :
              (isConditionTrueBranch ? 'condition-true' :
               isConditionFalseBranch ? 'condition-false' :
               ((isExecutionNodeSpecialConnection || isConditionNodeSpecialConnection) ?
                (finalParams.sourceHandle === 'left-source' ? 'special-left' : 'special-right') :
                (isToolConnection ? 'tool' : 'default'))))
        }
      };

      console.log('✅ 创建的边:', JSON.stringify(newEdge, null, 2));
      console.log('🏹 箭头应该指向:', targetNode?.data?.label || targetNode?.id);

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, calculateOptimalConnectionPoints] // 移除nodes依赖，使用nodesRef
  );

  // 切换侧边栏收起/展开状态
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // 切换聊天框收起/展开状态
  const toggleChatBox = useCallback(() => {
    setIsChatBoxCollapsed(prev => !prev);
  }, []);

  // 切换工具库显示状态
  const toggleToolLibrary = useCallback(() => {
    setIsToolLibraryVisible(prev => !prev);
  }, []);

  // 显示状态跟踪面板
  const showStatusTracking = useCallback((context = {}) => {
    setIsStatusTrackingVisible(true);
    if (context.node || context.operationId) {
      setCurrentPrecisionContext({
        node: context.node || null,
        operationId: context.operationId || null,
        operationIndex: context.operationIndex || null,
        operationType: context.operationType || null,
        filename: context.filename || null,
        operationContent: context.operationContent || null // 新增：支持直接传递操作内容
      });
    }
    // 保存显示状态
    try {
      const stored = localStorage.getItem('mindmap-ui-state') || '{}';
      const state = JSON.parse(stored);
      state.global = state.global || {};
      state.global.statusTracking = state.global.statusTracking || {};
      state.global.statusTracking.showTrackingWindow = true;
      localStorage.setItem('mindmap-ui-state', JSON.stringify(state));
    } catch (error) {
      console.warn('保存状态跟踪面板状态失败:', error);
    }
  }, []);

  // 隐藏状态跟踪面板
  const hideStatusTracking = useCallback(() => {
    setIsStatusTrackingVisible(false);
    setCurrentPrecisionContext({
      node: null,
      operationId: null,
      operationIndex: null,
      operationType: null,
      filename: null,
      operationContent: null
    });
    // 保存隐藏状态
    try {
      const stored = localStorage.getItem('mindmap-ui-state') || '{}';
      const state = JSON.parse(stored);
      state.global = state.global || {};
      state.global.statusTracking = state.global.statusTracking || {};
      state.global.statusTracking.showTrackingWindow = false;
      localStorage.setItem('mindmap-ui-state', JSON.stringify(state));
    } catch (error) {
      console.warn('保存状态跟踪面板状态失败:', error);
    }
  }, []);

  // 处理文档预览中的文本选择
  const handleTextSelection = useCallback((selectedText, filename) => {
    // 这里可以处理文本选择的逻辑
    console.log('选中文本:', selectedText, '文件:', filename);
    // 可以通过某种方式将选中的文本传递回当前活动的ExecutionNode
  }, []);

  // 处理模板选择
  const handleSelectTemplate = useCallback((templateData) => {
    if (templateData && templateData.nodes && templateData.edges) {
      console.log("Loading template:", templateData);

      // 更新当前思维导图信息
      setCurrentMindmap({
        id: templateData.id,
        title: templateData.title,
        description: templateData.description,
        isFromTemplate: true,
        templateId: templateData.template_id,
        templateName: templateData.template_name
      });

      // 加载模板的节点和边
      setNodes(templateData.nodes);
      setEdges(templateData.edges);

      // 保存到本地存储
      saveMindmapData();

      showToast(`已加载模板: ${templateData.title}`, 'success');
    }
  }, [setNodes, setEdges, saveMindmapData, showToast]);

  // 打开模板选择器
  const openTemplateSelector = useCallback(() => {
    setIsTemplateSelectorOpen(true);
  }, []);

  // 关闭模板选择器
  const closeTemplateSelector = useCallback(() => {
    setIsTemplateSelectorOpen(false);
  }, []);



  // 控制台控制函数已移除

  // 取消工作流执行
  const handleCancelWorkflow = useCallback(() => {
    console.log('用户取消工作流执行');
    setLoadingState(null);
    setIsWorkflowLocked(false); // 解锁工作流

    // 重置所有节点状态
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, status: undefined }
    })));

    // 重置所有边状态
    setEdges(eds => eds.map(e => ({
      ...e,
      data: { ...e.data, status: undefined, errorMessage: undefined }
    })));

    showToast('工作流执行已取消', 'info');
  }, [setNodes, setEdges, showToast]);

  // 检查工作流是否已经执行过
  const hasWorkflowExecuted = useCallback(() => {
    const hasExecutedNodes = nodes.some(node =>
      node.data?.status && ['success', 'error', 'completed', 'failed'].includes(node.data.status)
    );

    const hasExecutedEdges = edges.some(edge =>
      edge.data?.status && ['success', 'error', 'completed', 'failed'].includes(edge.data.status)
    );

    return hasExecutedNodes || hasExecutedEdges;
  }, [nodes, edges]);

  // 重置工作流状态（增强版：同时清理所有缓存）
  const resetWorkflowState = useCallback(async () => {
    console.log('🔄 开始深度重置：工作流状态 + 缓存清理');
    setLoadingState('resetting');
    setIsWorkflowLocked(false);
    setFailedExecutionContext(null);

    try {
      // 1. 调用后端缓存清理API
      console.log('🧹 [重置] 调用后端缓存清理API...');
      showToast('正在清理缓存...', 'info');
      
      const cacheResponse = await fetch(`${API_BASE}/api/clear-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const cacheResult = await cacheResponse.json();
      
      if (cacheResult.success) {
        console.log('✅ [重置] 后端缓存清理成功:', cacheResult.details);
        showToast('后端缓存已清理', 'success');
      } else {
        console.warn('⚠️ [重置] 后端缓存清理部分失败:', cacheResult.message);
        showToast('缓存清理部分成功', 'warning');
      }
    } catch (error) {
      console.error('❌ [重置] 后端缓存清理失败:', error);
      showToast('缓存清理失败，但继续重置前端状态', 'warning');
    }

    const resetSignal = Date.now();

    // 2. 重置所有节点状态并清空输出（增强版）
    setNodes(nds => nds.map(n => ({
      ...n,
      data: {
        ...n.data,
        status: undefined,
        executionResult: undefined,
        result: undefined,
        executionError: undefined,
        error: undefined,
        outputContent: '',
        exportHistory: [],  // 🚨 清除导出历史
        generatedFiles: undefined,
        previewUrl: undefined,
        savedFilePath: undefined,  // 🚨 清除保存路径
        resultContent: undefined,  // 🚨 清除结果内容
        resetSignal
      }
    })));

    // 3. 重置所有边状态
    setEdges(eds => eds.map(e => ({
      ...e,
      data: {
        ...e.data,
        status: undefined,
        errorMessage: undefined,
        animated: false
      }
    })));

    // 4. 清理浏览器本地存储缓存
    try {
      // 清理相关的 localStorage 项目
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('workflow') || key.includes('mindmap') || key.includes('execution'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🧹 [重置] 已清理浏览器缓存:', keysToRemove);
    } catch (error) {
      console.warn('⚠️ [重置] 浏览器缓存清理失败:', error);
    }

    setLoadingState(null);
    showToast('🎉 深度重置完成！工作流状态、导出历史、所有缓存已清理', 'success');
    console.log('✅ [重置] 深度重置完成');
  }, [setNodes, setEdges, showToast]);

  // 控制台最小化/最大化函数已移除



  // 更新边的状态
  const updateEdgeStatus = useCallback((edgeId, status, errorMessage = null) => {
    setEdges((eds) => eds.map(edge =>
      edge.id === edgeId
        ? {
            ...edge,
            data: {
              ...edge.data,
              status,
              errorMessage
            }
          }
        : edge
    ));
  }, [setEdges]);

  // 悬浮按钮拖拽处理
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - floatingButtonPosition.x,
      y: e.clientY - floatingButtonPosition.y
    });
    e.preventDefault();
  }, [floatingButtonPosition]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // 限制在屏幕范围内
    const maxX = window.innerWidth - 40; // 容器宽度
    const maxY = window.innerHeight - 40; // 容器高度

    setFloatingButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);

    // 拖拽结束后自动吸附到最近的边缘
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const buttonWidth = 40;
    const buttonHeight = 40;

    setFloatingButtonPosition(prev => {
      const centerX = prev.x + buttonWidth / 2;
      const centerY = prev.y + buttonHeight / 2;

      // 计算到各边缘的距离
      const distanceToLeft = centerX;
      const distanceToRight = screenWidth - centerX;
      const distanceToTop = centerY;
      const distanceToBottom = screenHeight - centerY;

      // 找到最近的边缘
      const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);

      let newX = prev.x;
      let newY = prev.y;

      if (minDistance === distanceToLeft) {
        // 吸附到左边
        newX = 0;
      } else if (minDistance === distanceToRight) {
        // 吸附到右边
        newX = screenWidth - buttonWidth;
      } else if (minDistance === distanceToTop) {
        // 吸附到顶部
        newY = 0;
      } else {
        // 吸附到底部
        newY = screenHeight - buttonHeight;
      }

      return { x: newX, y: newY };
    });
  }, []);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Function to center main topic using reactFlowInstanceFunctions
  const centerMainTopic = useCallback(() => {
    if (reactFlowInstanceFunctions && reactFlowInstanceFunctions.getNodes && reactFlowInstanceFunctions.setViewport && reactFlowInstanceFunctions.getViewport) {
      const { getNodes, setViewport, getViewport } = reactFlowInstanceFunctions;
      const mainNode = getNodes().find(node => node.id === '1');
      const viewport = getViewport();
      const currentZoom = viewport.zoom;

      if (mainNode) {
        const nodeCenterX = mainNode.position.x + (mainNode.width || 0) / 2;
        const nodeCenterY = mainNode.position.y + (mainNode.height || 0) / 2;

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const viewportCenterX = reactFlowBounds.width / 2;
        const viewportCenterY = reactFlowBounds.height / 2;

        const targetX = viewportCenterX - nodeCenterX * currentZoom;
        const targetY = viewportCenterY - nodeCenterY * currentZoom;

        setViewport({ x: targetX, y: targetY, zoom: currentZoom }, { duration: 300 });
        console.log('centerMainTopic: Centered main topic without changing zoom.');
      } else {
        console.warn('centerMainTopic: Main node (ID 1) not found.');
      }
    } else {
      console.warn('React Flow instance functions (getNodes, setViewport, getViewport) not ready for centering main topic.');
    }
  }, [reactFlowInstanceFunctions, reactFlowWrapper]);

  // Function to toggle visibility of all nodes based on collapse state
  const toggleAllNodesVisibility = useCallback(() => {
    setIsAllCollapsed(prev => !prev);
    setNodes((nds) => {
      const shouldBeHidden = !isAllCollapsed;

      return nds.map(node => {
        if (node.id !== '1' && node.type !== 'group') {
          return { ...node, hidden: shouldBeHidden };
        }
        return node;
      });
    });
    // 禁用自动布局：setLayoutRequested(true);
    console.log('节点可见性已切换，但不触发重新布局');
  }, [isAllCollapsed, setNodes]);

  // 添加一个状态来跟踪是否正在恢复数据
  const [isRestoringData, setIsRestoringData] = useState(false);
  // 添加一个ref来跟踪数据是否来自localStorage
  const isDataFromLocalStorage = useRef(false);
  // 添加一个ref来跟踪是否是页面切换导致的恢复
  const isPageSwitchRestore = useRef(false);

  // 禁用自动布局 - 所有节点位置由用户手动控制
  useEffect(() => {
    console.log('自动布局已禁用，所有节点位置由用户手动控制');

    // 标记初始布局已应用，避免后续触发
    if (!initialLayoutApplied.current) {
      initialLayoutApplied.current = true;
    }

    // 重置布局请求标志
    if (layoutRequested) {
      setLayoutRequested(false);
    }
  }, [layoutRequested]);

  // --- Workflow Validation ---
  const handleValidateWorkflow = useCallback(async (currentNodes) => {
    if (currentNodes.length === 0) {
        setValidationSuggestions([]);
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/validate_workflow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nodes: currentNodes }),
        });
        if (!response.ok) {
            throw new Error('Failed to validate workflow');
        }
        const data = await response.json();
        setValidationSuggestions(data.suggestions || []);
    } catch (error) {
        console.error("Error validating workflow:", error);
        setValidationSuggestions([]);
    }
  }, []);

  // useEffect for automatic validation
  useEffect(() => {
    const handler = setTimeout(() => {
        if (nodes.length > 1) { // Only validate if there's more than the initial node
            handleValidateWorkflow(nodes);
        } else {
            setValidationSuggestions([]);
        }
    }, 1000); // Debounce for 1 second

    return () => {
        clearTimeout(handler);
    };
  }, [nodes, handleValidateWorkflow]);


  // Function to update node data (for CustomNode input changes)
  const onNodeDataChange = useCallback((id, data) => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node));

      // 禁用碰撞检测和自动布局，保持节点在原位
      const isExpansionChange = data && (data.hasOwnProperty('isExpanded') || data.hasOwnProperty('isConfigOpen'));
      if (isExpansionChange) {
        console.log('节点展开/收起，但不触发碰撞检测和重新布局');
      }

      return updatedNodes;
    });

    // If manual override data is provided, trigger the resume workflow
    if (data && data.manualOverride && failedExecutionContext) {
      handleResumeWorkflow(id, data.manualOverride, failedExecutionContext);
    }

    // 禁用自动布局：setLayoutRequested(true);
    console.log('节点数据已更新，但不触发重新布局');
  }, [setNodes, failedExecutionContext]);

  // Function to handle node double click (for expanding nodes)
  const onNodeDoubleClick = useCallback((id, data) => {
    console.log('Node double clicked:', id, data);
    // 可以在这里添加额外的双击处理逻辑
  }, []);

  // 节点尺寸变化回调
  const onNodeSizeChange = useCallback((id, size) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, size } } : n));
    // 禁用自动布局：setLayoutRequested(true);
    console.log('节点尺寸已更新，但不触发重新布局');
  }, [setNodes]);

  // Enhanced node drag handler with collision detection
  const onNodeDrag = useCallback((event, node) => {
    // Update node position immediately without collision detection during drag
    // (collision detection during drag can be too performance-intensive)
    setNodes((nds) => nds.map(n => n.id === node.id ? node : n));
  }, []);

  // Node drag end handler - keep user-dragged node in place, don't move others
  const onNodeDragStop = useCallback((event, node) => {
    console.log('Node drag stopped:', node.id, 'new position:', node.position);
    // 用户手动拖拽的节点保持在指定位置，不触发碰撞检测和其他节点移动
    setNodes((nds) => {
      const updatedNodes = nds.map(n => n.id === node.id ? node : n);
      console.log('用户拖拽节点到指定位置，其他节点保持不动');
      return updatedNodes;
    });

    // 节点拖拽结束后，延迟保存数据以保持新位置
    setTimeout(() => {
      saveMindmapData();
      console.log('节点拖拽结束，已保存新位置');
    }, 100);
  }, [saveMindmapData]);



  // Define custom node types, now including the new end-topic-node and folder-selector-node
  const customNodeTypes = useMemo(() => ({
    // 4个核心功能节点
    'material-node': (props) => <MaterialNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} currentPrecisionContext={currentPrecisionContext} />,
    'execution-node': (props) => <ExecutionNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} showStatusTracking={showStatusTracking} hideStatusTracking={hideStatusTracking} />,
    'condition-node': (props) => <ConditionNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />,
    'result-node': (props) => <ResultNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />,
    
    // 增强版节点类型（向后兼容）
    'enhanced-material-node': (props) => <MaterialNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} currentPrecisionContext={currentPrecisionContext} />,
    'enhanced-execution-node': (props) => <ExecutionNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} showStatusTracking={showStatusTracking} hideStatusTracking={hideStatusTracking} />,
    'enhanced-condition-node': (props) => <ConditionNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />,
    'enhanced-result-node': (props) => <ResultNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />,

    // 为了兼容性，保留 customNode 作为默认节点类型
    'customNode': (props) => {
      // 根据 nodeType 决定使用哪个具体的节点组件
      const nodeType = props.data?.nodeType;
      switch (nodeType) {
        case 'material-node':
          return <MaterialNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />;
        case 'execution-node':
          return <ExecutionNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} showStatusTracking={showStatusTracking} hideStatusTracking={hideStatusTracking} />;
        case 'condition-node':
          return <ConditionNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />;
        case 'result-node':
          return <ResultNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />;
        default:
          // 默认使用材料节点
          return <MaterialNode {...props} onNodeDataChange={onNodeDataChange} onNodeSizeChange={onNodeSizeChange} />;
      }
    },
  }), [onNodeDataChange, onNodeSizeChange, onNodeDoubleClick, showStatusTracking, hideStatusTracking]);

  // ==================== 新建节点（主/子） ====================
  const addNode = useCallback((isChild, parentId = null) => {
    const newNodeId = generateId();
    const defaultNewNodePosition = { x: 0, y: 0 };

    let edgeToAdd = null;

    // 先更新节点列表
    setNodes((nds) => {
      let newNode;

      if (!isChild) {
        newNode = {
          id: newNodeId,
          type: 'customNode',
          data: { label: '新节点', nodeType: 'main-topic-node' },
          position: defaultNewNodePosition,
        };
      } else {
        const parentNode = nds.find((n) => n.id === parentId);
        const parentNodeType = parentNode ? parentNode.data.nodeType : '';

        let newNodeType;
        switch (parentNodeType) {
          case 'main-topic-node':
            newNodeType = 'department-topic-node';
            break;
          case 'department-topic-node':
            newNodeType = 'sub-topic-node';
            break;
          case 'sub-topic-node':
          case 'employee-node':
            newNodeType = 'employee-node';
            break;
          default:
            newNodeType = 'sub-topic-node';
        }

        newNode = {
          id: newNodeId,
          type: 'customNode',
          data: {
            label: '新子节点',
            nodeType: newNodeType,
            params: {},
            // 为材料节点添加初始数据结构
            ...(newNodeType === 'material-node' && {
              inputType: 'file',
              selectedFiles: [],
              textContent: '',
              urlList: [],
              folderPath: '',
              folderFiles: [],
              selectedFolder: null,
              batchProcessing: false,
              previewEnabled: true,
              maxFileSize: 100,
              allowedFormats: []
            })
          },
          position: defaultNewNodePosition,
        };

        // 记录需要新增的边，稍后一次性 setEdges
        edgeToAdd = {
          ...defaultEdgeOptions,
          id: `e-${parentId}-${newNodeId}`,
          source: parentId,
          target: newNodeId,
        };
      }

      return [...nds, newNode];
    });

    // 单独更新边，保证 nodes 与 edges 同步提交
    if (edgeToAdd) {
      setEdges((eds) => [...eds, edgeToAdd]);
    }

    // 禁用自动布局：setLayoutRequested(true);
    console.log('子节点已添加，但不触发重新布局');
  }, [setNodes, setEdges]);

  // ==================== 新建同级节点 ====================
  const addSiblingNode = useCallback((nodeId) => {
    const newSiblingId = generateId();
    let edgeToAdd = null;

    setNodes((nds) => {
      const targetNode = nds.find((n) => n.id === nodeId);
      if (!targetNode) return nds;

      const incomingEdge = edges.find((edge) => edge.target === nodeId);
      if (!incomingEdge) {
        // 没有父节点则无法插入同级
        return nds;
      }

      const parentId = incomingEdge.source;

      edgeToAdd = {
        ...defaultEdgeOptions,
        id: `e-${parentId}-${newSiblingId}`,
        source: parentId,
        target: newSiblingId,
      };

      const newSiblingNode = {
        id: newSiblingId,
        type: 'customNode',
        data: { label: '新同级主题', nodeType: 'sub-topic-node' },
        position: { x: targetNode.position.x + 50, y: targetNode.position.y + 50 },
        parentNode: parentId,
      };

      return [...nds, newSiblingNode];
    });

    if (edgeToAdd) {
      setEdges((eds) => [...eds, edgeToAdd]);
    }

    // 禁用自动布局：setLayoutRequested(true);
    console.log('同级节点已添加，但不触发重新布局');
  }, [edges, setNodes, setEdges]);

  // ==================== 插入父节点 ====================
  const addParentNode = useCallback((childNodeId) => {
    const newParentId = generateId();

    let edgesToAdd = [];
    let edgesToRemoveIds = [];

    setNodes((nds) => {
      const childNode = nds.find((n) => n.id === childNodeId);
      if (!childNode) return nds;

      // 收集需要删除/新增的边信息
      const incomingEdge = edges.find((edge) => edge.target === childNodeId);
      if (incomingEdge) {
        edgesToRemoveIds.push(incomingEdge.id);
        edgesToAdd.push({
          ...defaultEdgeOptions,
          id: `e-${newParentId}-${childNodeId}`,
          source: newParentId,
          target: childNodeId,
        });
      }

      // 新父节点到子节点
      edgesToAdd.push({
        ...defaultEdgeOptions,
        id: `e-${newParentId}-${childNodeId}`,
        source: newParentId,
        target: childNodeId,
      });

      const newParentNode = {
        id: newParentId,
        type: 'customNode',
        data: {
          label: '新父主题',
          nodeType: 'main-topic-node',
          side: childNode.data.side || undefined,
        },
        position: { x: childNode.position.x, y: childNode.position.y - 100 },
      };

      return [...nds, newParentNode];
    });

    // 更新边：先删除、后新增
    setEdges((eds) => {
      let next = eds.filter((e) => !edgesToRemoveIds.includes(e.id));
      next = [...next, ...edgesToAdd];
      return next;
    });

    // 禁用自动布局：setLayoutRequested(true);
    console.log('父节点已添加，但不触发重新布局');
  }, [edges, setNodes, setEdges]);

  // ==================== 删除节点（含所有子孙） ====================
  const deleteNode = useCallback((nodeId) => {
    const nodesToDelete = new Set();

    const collectDescendants = (currentId) => {
      nodesToDelete.add(currentId);
      edges.forEach((e) => {
        if (e.source === currentId) collectDescendants(e.target);
      });
    };

    collectDescendants(nodeId);

    setNodes((nds) => nds.filter((n) => !nodesToDelete.has(n.id)));
    setEdges((eds) => eds.filter((e) => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)));

    setSelectedNodeId(null);
    // 禁用自动布局：setLayoutRequested(true);
    console.log('节点已删除，但不触发重新布局');
  }, [edges, setNodes, setEdges, setSelectedNodeId]);

  // Copy functionality
  const copyNodes = useCallback(() => {
    if (selectedNodeId) {
      const nodesToCopy = nodes.filter(node => node.id === selectedNodeId);
      setCopiedElements(nodesToCopy);
      console.log('Copied elements:', nodesToCopy);
    }
  }, [selectedNodeId, nodes, setCopiedElements]);

  // Paste functionality
  const pasteNodes = useCallback((targetNodeId) => {
    if (copiedElements && copiedElements.length > 0) {
      setNodes((nds) => {
        const newNodes = copiedElements.map(node => {
          const basePosition = node.position || { x: 0, y: 0 };
          let finalPosition = { ...basePosition };

          if (targetNodeId) {
            const targetNode = nds.find(n => n.id === targetNodeId);
            if (targetNode && targetNode.position) {
              finalPosition = {
                x: targetNode.position.x + 50,
                y: targetNode.position.y + 50
              };
            }
          } else {
            finalPosition = {
              x: basePosition.x + 50,
              y: basePosition.y + 50
            };
          }

          return {
            ...node,
            id: generateId(),
            position: finalPosition,
          };
        });

        let newEdges = [...edges];
        if (targetNodeId) {
          newNodes.forEach(newNode => {
            newEdges.push({
              ...defaultEdgeOptions,
              id: generateId(),
              source: targetNodeId,
              target: newNode.id,
            });
          });
        }
        setEdges(newEdges);
        return [...nds, ...newNodes];
      });
      // 禁用自动布局：setLayoutRequested(true);
      console.log('节点已粘贴，但不触发重新布局');
      setCopiedElements(null);
    }
  }, [copiedElements, edges, setNodes, setEdges, setCopiedElements]);

  // Cut functionality (copy and then delete)
  const cutNodes = useCallback(() => {
    if (selectedNodeId) {
      copyNodes();
      deleteNode(selectedNodeId);
    }
  }, [selectedNodeId, copyNodes, deleteNode]);

  // Duplicate functionality (add a copy of the selected node as a sibling)
  const duplicateNode = useCallback(() => {
    if (selectedNodeId) {
      setNodes((nds) => {
        const nodeToDuplicate = nds.find(n => n.id === selectedNodeId);
        if (!nodeToDuplicate) return nds;

        const newDuplicateId = generateId();
        const newDuplicateNode = {
          ...nodeToDuplicate,
          id: newDuplicateId,
          position: nodeToDuplicate.position ?
                    { x: nodeToDuplicate.position.x + 50, y: nodeToDuplicate.position.y + 50 } :
                    { x: 50, y: 50 },
        };

        let newEdges = [...edges];
        const incomingEdge = edges.find(edge => edge.target === selectedNodeId);
        if (incomingEdge) {
          newEdges.push({
            ...defaultEdgeOptions,
            id: generateId(),
            source: incomingEdge.source,
            target: newDuplicateId,
          });
        }
        setEdges(newEdges);
        return [...nds, newDuplicateNode];
      });
      // 禁用自动布局：setLayoutRequested(true);
      console.log('节点已复制，但不触发重新布局');
    }
  }, [selectedNodeId, edges, setNodes, setEdges]);

  // Function to handle creating a new mind map from the InfoPage
  const handleNewMindMap = useCallback(() => {
    // 清除localStorage中的思维导图数据
    localStorage.removeItem('mindmap-data');
    setNodes(initialNodes);
    setEdges(initialEdges);
    // 禁用自动布局：setLayoutRequested(true);
    console.log('新思维导图已创建，但不触发重新布局');
    setCurrentPage('mindmap'); // Navigate back to the mindmap view
    console.log('Initiated creation of a new mind map from InfoPage.');
  }, [setNodes, setEdges, initialNodes, initialEdges]);

  // Function to handle navigation from Sidebar
  const handleNavigate = useCallback((target) => {
    console.log(`Navigating to: ${target}`);
    setCurrentPage(target); // Update currentPage based on navigation target
  }, []);

  // Listen for navigation events from other components
  useEffect(() => {
    const handleNavigationEvent = (event) => {
      handleNavigate(event.detail);
    };

    window.addEventListener('navigate', handleNavigationEvent);
    return () => window.removeEventListener('navigate', handleNavigationEvent);
  }, [handleNavigate]);



  // 🌿 自然错开布局优化函数（避免重叠，错开排列）
  const optimizeStaggeredLayout = useCallback((nodes, edges) => {
    console.log('🌿 开始自然错开布局优化...');

    if (nodes.length === 0) return nodes;

    // 1. 构建连接关系
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const incomingEdges = new Map();
    const outgoingEdges = new Map();

    edges.forEach(edge => {
      if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
      if (!outgoingEdges.has(edge.source)) outgoingEdges.set(edge.source, []);
      incomingEdges.get(edge.target).push(edge);
      outgoingEdges.get(edge.source).push(edge);
    });

    // 2. 检测是否为单条分支工作流
    const hasBranches = Array.from(outgoingEdges.values()).some(edges => edges.length > 1);
    console.log(`🔍 分支检测结果: ${hasBranches ? '多分支工作流' : '单条分支工作流'}`);

    // 3. 如果是单条分支，使用蛇形布局
    if (!hasBranches) {
      console.log('🐍 应用蛇形布局（单条分支）');
      const nodeSpacing = 550; // 节点间距
      const rowSpacing = 450; // 🔧 增加行间距从350到450像素，避免节点碰撞
      const startX = 150;
      const startY = 150;
      const nodesPerRow = 4; // 每行4个节点

      const linearNodes = nodes.map((node, index) => {
        const row = Math.floor(index / nodesPerRow);
        const colInRow = index % nodesPerRow;

        let x, y;

        // 蛇形布局：奇数行从左到右，偶数行从右到左
        if (row % 2 === 0) {
          // 偶数行（0,2,4...）：从左到右
          x = startX + colInRow * nodeSpacing;
        } else {
          // 奇数行（1,3,5...）：从右到左
          x = startX + (nodesPerRow - 1 - colInRow) * nodeSpacing;
        }

        y = startY + row * rowSpacing;

        console.log(`🐍 蛇形节点 ${node.id} -> 第${row + 1}行第${colInRow + 1}列, 位置 (${x}, ${y}), ${row % 2 === 0 ? '从左到右' : '从右到左'}`);

        return {
          ...node,
          position: { x, y }
        };
      });

      console.log('✨ 蛇形布局完成');
      return linearNodes;
    }

    // 4. 多分支工作流：使用树状分散布局
    console.log('🌳 应用树状分散布局（多分支）');

    // 找到根节点
    const rootNodes = nodes.filter(node => !incomingEdges.has(node.id) || incomingEdges.get(node.id).length === 0);
    const rootNode = rootNodes[0] || nodes[0];

    // 构建层级结构
    const levels = new Map();
    const visited = new Set();
    const children = new Map();

    const buildHierarchy = (nodeId, level = 0) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      levels.set(nodeId, level);

      const outgoing = outgoingEdges.get(nodeId) || [];
      const nodeChildren = outgoing.map(edge => edge.target);
      children.set(nodeId, nodeChildren);

      nodeChildren.forEach(childId => {
        buildHierarchy(childId, level + 1);
      });
    };

    buildHierarchy(rootNode.id);

    // 4. 按层级分组
    const levelGroups = new Map();
    levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) levelGroups.set(level, []);
      levelGroups.get(level).push(nodeId);
    });

    // 5. 计算节点尺寸（考虑实际节点大小）
    const getNodeSize = (node) => {
      // 根据节点类型估算尺寸
      const baseWidth = 200;
      const baseHeight = 120;

      if (node.data?.nodeType === 'material-node') {
        return { width: baseWidth + 50, height: baseHeight + 30 }; // 材料节点较大
      } else if (node.data?.nodeType === 'condition-node') {
        return { width: baseWidth, height: baseHeight };
      } else if (node.data?.nodeType === 'result-node') {
        return { width: baseWidth + 20, height: baseHeight + 10 };
      }
      return { width: baseWidth, height: baseHeight };
    };

    // 6. 树状图分散布局算法
    const positions = new Map();
    const minSpacing = 150; // 增加最小间距
    const levelSpacing = 500; // 增加层级间距，更分散
    const staggerOffset = 150; // 增加错开偏移量

    const layoutWithStagger = () => {
      const maxLevel = Math.max(...levels.values());

      for (let level = 0; level <= maxLevel; level++) {
        const levelNodes = levelGroups.get(level) || [];
        const levelNodeCount = levelNodes.length;

        if (levelNodeCount === 0) continue;

        // 计算该层级的树状分散布局
        const baseSpacing = 500; // 增加基础间距
        const totalWidth = levelNodeCount * baseSpacing;
        const startX = -totalWidth / 2;

        levelNodes.forEach((nodeId, index) => {
          const node = nodeMap.get(nodeId);
          const nodeSize = getNodeSize(node);

          // 树状分散基础位置
          let baseX = startX + (index * baseSpacing) + 200;
          let baseY = level * levelSpacing;

          // 🌳 增强的树状错开效果
          const branchFactor = Math.sin(index * 0.8) * staggerOffset; // 正弦波分布
          const staggerX = branchFactor + (index % 2 === 0 ? -1 : 1) * staggerOffset * 0.5;
          const staggerY = (index % 4) * (staggerOffset / 1.5) + Math.cos(index * 0.6) * 40;

          // 根据节点类型添加树状分支偏移
          let typeOffsetX = 0;
          let typeOffsetY = 0;

          if (node.data?.nodeType === 'material-node') {
            typeOffsetX = -60 + (index * 23) % 80; // 材料节点左偏，带随机化
            typeOffsetY = -30 + (index * 17) % 60;
          } else if (node.data?.nodeType === 'condition-node') {
            typeOffsetX = (index * 31) % 100 - 50; // 条件节点随机分布
            typeOffsetY = 40 + (index * 19) % 40;
          } else if (node.data?.nodeType === 'result-node') {
            typeOffsetX = 60 + (index * 29) % 80; // 结果节点右偏，带随机化
            typeOffsetY = -20 + (index * 13) % 50;
          } else if (node.data?.nodeType === 'execution-node') {
            typeOffsetX = (index * 37) % 120 - 60; // 执行节点更大范围分散
            typeOffsetY = (index * 41) % 80 - 40;
          }

          const finalX = baseX + staggerX + typeOffsetX;
          const finalY = baseY + staggerY + typeOffsetY;

          positions.set(nodeId, {
            x: finalX,
            y: finalY,
            width: nodeSize.width,
            height: nodeSize.height
          });

          console.log(`🌳 树状节点 ${nodeId} (${node.data?.nodeType}) -> 层级 ${level}, 位置 (${Math.round(finalX)}, ${Math.round(finalY)}), 分支偏移 (${Math.round(staggerX)}, ${Math.round(staggerY)})`);
        });
      }
    };

    layoutWithStagger();

    // 7. 碰撞检测和避免重叠
    const avoidCollisions = () => {
      const positionArray = Array.from(positions.entries());
      let hasCollision = true;
      let iterations = 0;
      const maxIterations = 10;

      while (hasCollision && iterations < maxIterations) {
        hasCollision = false;
        iterations++;

        for (let i = 0; i < positionArray.length; i++) {
          for (let j = i + 1; j < positionArray.length; j++) {
            const [nodeIdA, posA] = positionArray[i];
            const [nodeIdB, posB] = positionArray[j];

            // 检查重叠
            const dx = Math.abs(posA.x - posB.x);
            const dy = Math.abs(posA.y - posB.y);
            const minDistanceX = (posA.width + posB.width) / 2 + minSpacing;
            const minDistanceY = (posA.height + posB.height) / 2 + minSpacing;

            if (dx < minDistanceX && dy < minDistanceY) {
              hasCollision = true;

              // 计算推开方向
              const pushX = (minDistanceX - dx) / 2;
              const pushY = (minDistanceY - dy) / 2;

              if (posA.x < posB.x) {
                posA.x -= pushX;
                posB.x += pushX;
              } else {
                posA.x += pushX;
                posB.x -= pushX;
              }

              if (posA.y < posB.y) {
                posA.y -= pushY;
                posB.y += pushY;
              } else {
                posA.y += pushY;
                posB.y -= pushY;
              }

              console.log(`🔧 解决碰撞: ${nodeIdA} 和 ${nodeIdB}, 推开距离 (${Math.round(pushX)}, ${Math.round(pushY)})`);
            }
          }
        }
      }

      console.log(`✅ 碰撞检测完成，执行了 ${iterations} 次迭代`);
    };

    avoidCollisions();

    // 8. 应用位置到节点
    const optimizedNodes = nodes.map(node => {
      const pos = positions.get(node.id) || { x: 0, y: 0 };

      const optimizedPosition = {
        x: Math.round(pos.x),
        y: Math.round(pos.y + 100) // 起始Y偏移
      };

      return {
        ...node,
        position: optimizedPosition
      };
    });

    console.log('✨ 自然错开布局优化完成');
    return optimizedNodes;
  }, []);

  const handleMindMapUpdate = useCallback((mindMapData) => {
    if (mindMapData && mindMapData.nodes && mindMapData.edges) {
      console.log("Updating mind map with data from AI:", mindMapData);
      console.log("AI返回的节点类型:", mindMapData.nodes.map(n => `${n.id}: ${n.type}`));

      // 强制展示所有节点，清理后端可能留下的 hidden 标记
      let sanitizedNodes = mindMapData.nodes.map(n => {
        const node = {
          ...n,
          hidden: false,
          // 保留原始节点类型，不强制改为customNode
          type: n.type || 'customNode'  // 使用后端返回的类型，默认为customNode
        };

        // 🔧 修复AI生成的材料节点nodeType问题
        // 如果是材料节点但nodeType错误，则修正为material-node
        if (node.id && node.id.includes('material-node') && node.data && node.data.nodeType === 'customNode') {
          console.log(`🔧 修复材料节点 ${node.id} 的nodeType: customNode -> material-node`);
          node.data = {
            ...node.data,
            nodeType: 'material-node'
          };
        }

        return node;
      });

      // 🌿 应用自然错开布局优化（避免重叠，错开排列）
      sanitizedNodes = optimizeStaggeredLayout(sanitizedNodes, mindMapData.edges);

      // 🔗 优化连接线的连接点选择
      const optimizedEdges = mindMapData.edges.map(edge => {
        const sourceNode = sanitizedNodes.find(n => n.id === edge.source);
        const targetNode = sanitizedNodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          // 传递原始的sourceHandle信息，以便条件节点分支连接处理
          const optimalConnection = calculateOptimalConnectionPoints(sourceNode, targetNode, edge.sourceHandle);

          console.log(`🔗 优化连接线 ${edge.id}: ${edge.sourceHandle || 'right'} -> ${optimalConnection.sourceHandle}, ${edge.targetHandle || 'left'} -> ${optimalConnection.targetHandle}`);

          return {
            ...edge,
            sourceHandle: optimalConnection.sourceHandle,
            targetHandle: optimalConnection.targetHandle,
            data: {
              ...edge.data,
              connectionOptimized: true,
              originalSourceHandle: edge.sourceHandle || 'right',
              originalTargetHandle: edge.targetHandle || 'left'
            }
          };
        }

        return edge;
      });

      setNodes(sanitizedNodes);
      setEdges(optimizedEdges);

      // AI生成工作流后自动适应视图 - 增加延迟确保布局完成
      if (sanitizedNodes.length > 0) {
        console.log('🎨 AI生成工作流完成，准备智能适应视图');
        setTimeout(() => {
          if (window.reactFlowInstanceFunctions?.fitView) {
            window.reactFlowInstanceFunctions.fitView({
              padding: 0.15, // 稍微减少边距
              duration: 1000, // 增加动画时长
              maxZoom: 1.2 // 限制最大缩放
            });
            console.log('✨ AI生成工作流后智能适应视图已执行');
          }
        }, 500); // 增加延迟确保布局优化完成
      }

      console.log('🚀 AI思维导图数据已更新并优化布局');
    } else {
      console.error("Received invalid mind map data:", mindMapData);
    }
  }, [setNodes, setEdges, optimizeStaggeredLayout, calculateOptimalConnectionPoints]);



  const handleSave = useCallback(() => {
    console.log('handleSave called, reactFlowInstanceFunctions:', !!reactFlowInstanceFunctions);
    console.log('currentMindmap:', currentMindmap);

    if (!reactFlowInstanceFunctions) {
      console.warn('React Flow instance not ready for saving.');
      showToast('保存失败：思维导图未准备就绪', 'error');
      return;
    }

    const currentNodes = reactFlowInstanceFunctions.getNodes();
    console.log('Current nodes count:', currentNodes.length);
    console.log('Current nodes:', currentNodes);

    if (currentNodes.length === 0) {
      console.log("No nodes to save.");
      showToast('没有内容可保存', 'warning');
      return;
    }

    // 如果是新思维导图，显示保存对话框
    if (currentMindmap.isNew || !currentMindmap.id) {
      console.log('Showing save dialog for new mindmap');
      setSaveDialogData({
        title: currentMindmap.title,
        description: currentMindmap.description
      });
      setShowSaveDialog(true);
    } else {
      console.log('Saving existing mindmap directly');
      // 直接保存现有思维导图
      performSave();
    }
  }, [reactFlowInstanceFunctions, currentMindmap, showToast]);

  const performSave = useCallback(async (title, description) => {
    console.log('performSave called with title:', title, 'description:', description);

    if (!reactFlowInstanceFunctions) {
      console.error('performSave: reactFlowInstanceFunctions is null');
      return;
    }

    const currentNodes = reactFlowInstanceFunctions.getNodes();
    console.log('performSave: currentNodes:', currentNodes);
    console.log('performSave: edges:', edges);

    try {
      // 准备思维导图数据
      const mindmapData = {
        id: currentMindmap.id || `mindmap_${Date.now()}`,
        title: title || currentMindmap.title,
        description: description || currentMindmap.description,
        nodes: currentNodes.map(({ id, type, position, data, width, height }) => ({
          id,
          type,
          position,
          data,
          width,
          height,
        })),
        edges: edges,
        tags: []
      };

      console.log('performSave: mindmapData to save:', mindmapData);
      console.log('performSave: currentMindmap.isNew:', currentMindmap.isNew);
      console.log('performSave: currentMindmap.id:', currentMindmap.id);

      let result;
      if (currentMindmap.isNew || !currentMindmap.id) {
        // 创建新思维导图
        console.log('performSave: Creating new mindmap');
        result = await mindmapAPI.create(mindmapData);
        console.log('performSave: Create result:', result);
        setCurrentMindmap(prev => ({
          ...prev,
          id: mindmapData.id,
          title: mindmapData.title,
          description: mindmapData.description,
          isNew: false,
          lastSaved: new Date().toISOString()
        }));
        showToast('思维导图已保存', 'success');
      } else {
        // 更新现有思维导图
        console.log('performSave: Updating existing mindmap');
        result = await mindmapAPI.update(currentMindmap.id, mindmapData);
        console.log('performSave: Update result:', result);
        setCurrentMindmap(prev => ({
          ...prev,
          title: mindmapData.title,
          description: mindmapData.description,
          lastSaved: new Date().toISOString()
        }));
        showToast('思维导图已更新', 'success');
      }

      console.log('Save result:', result);
    } catch (error) {
      console.error('保存失败:', error);
      console.error('Error details:', error.stack);
      showToast(`保存失败: ${error.message}`, 'error');
    }
  }, [edges, reactFlowInstanceFunctions, currentMindmap, showToast]);

  const handleSaveDialogConfirm = useCallback(() => {
    performSave(saveDialogData.title, saveDialogData.description);
    setShowSaveDialog(false);
  }, [performSave, saveDialogData]);

  const handleSaveDialogCancel = useCallback(() => {
    setShowSaveDialog(false);
  }, []);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const flowData = JSON.parse(text);

        if (flowData && Array.isArray(flowData.nodes) && Array.isArray(flowData.edges)) {
          setNodes(flowData.nodes);
          setEdges(flowData.edges);
          
          setLayoutRequested(false);
          initialLayoutApplied.current = true;
          
          // 不再手动设置视野，让useViewportPersistence Hook处理
          console.log('流程数据已恢复，视野由useViewportPersistence Hook管理');
        } else {
          alert('文件格式无效或不包含导图数据。');
        }
      } catch (error) {
        console.error("解析文件失败", error);
        alert('读取或解析文件时出错。');
      }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = null;
  }, [setNodes, setEdges, reactFlowInstanceFunctions]);




  // ========== Streaming workflow execution ==========
  const updateNodeStatus = useCallback((nodeId, status) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status } } : n));

    // 更新相关边的状态
    if (status === 'running') {
      // 当节点开始执行时，将输入边设为running状态
      setEdges(eds => eds.map(edge =>
        edge.target === nodeId
          ? { ...edge, data: { ...edge.data, status: 'running', animated: true } }
          : edge
      ));
    } else if (status === 'done') {
      // 当节点执行完成时，将输入边设为success状态，输出边保持准备状态
      setEdges(eds => eds.map(edge => {
        if (edge.target === nodeId) {
          // 输入边设为成功状态
          return { ...edge, className: getEdgeClassName('success'), data: { ...edge.data, status: 'success', animated: false } };
        } else if (edge.source === nodeId) {
          // 🔧 修复：输出边不立即设为running，等待目标节点真正开始时再设置
          return { ...edge, className: getEdgeClassName('ready'), data: { ...edge.data, status: 'ready', animated: false } };
        }
        return edge;
      }));
    } else if (status === 'error') {
      // 当节点执行失败时，将相关边设为error状态
      setEdges(eds => eds.map(edge =>
        (edge.target === nodeId || edge.source === nodeId)
          ? { ...edge, data: { ...edge.data, status: 'error', errorMessage: '节点执行失败' } }
          : edge
      ));
    }

    // 触发全局事件，让执行控制台能够监听到状态变化
    window.dispatchEvent(new CustomEvent('nodeStatusUpdate', {
      detail: { nodeId, status }
    }));
  }, [setEdges]);

  const handleRunWorkflowStream = useCallback(async () => {
    console.log("Running workflow (stream) with nodes and edges:", { nodes, edges });

    // 🔧 修复：点击运行按钮立即开始动画和锁定状态
    setLoadingState('executing');
    setIsWorkflowLocked(true); // 锁定工作流，防止修改
    
    // 🔧 修复：立即开始流程线动画 - 设置第一个节点为准备状态
    const startNodes = nodes.filter(node => {
      const incomingEdges = edges.filter(edge => edge.target === node.id);
      return incomingEdges.length === 0; // 没有输入边的节点是起始节点
    });
    
    if (startNodes.length > 0) {
      // 立即设置起始节点为运行状态，触发流程线动画
      setNodes(nds => nds.map(n => 
        startNodes.some(sn => sn.id === n.id) 
          ? { ...n, data: { ...n.data, status: 'running' } }
          : n
      ));
      
      // 立即更新相关的流程线状态
      setEdges(eds => eds.map(edge => {
        const sourceNode = startNodes.find(sn => sn.id === edge.source);
        if (sourceNode) {
          return { ...edge, data: { ...edge.data, status: 'running', animated: true } };
        }
        return edge;
      }));
      
      console.log('🚀 立即开始工作流动画，起始节点:', startNodes.map(n => n.id));
    }

    // 检查是否有节点已经执行过（有执行状态）
    const hasExecutedNodes = nodes.some(node =>
      node.data?.status && ['success', 'error', 'completed', 'failed'].includes(node.data.status)
    );

    const hasExecutedEdges = edges.some(edge =>
      edge.data?.status && ['success', 'error', 'completed', 'failed'].includes(edge.data.status)
    );

    // 如果工作流已经执行过，先重置状态
    if (hasExecutedNodes || hasExecutedEdges) {
      console.log('检测到工作流已执行过，正在重置状态...');
      resetWorkflowState();
      showToast('工作流状态已重置，重新开始执行', 'info');

      // 等待一小段时间让状态重置完成
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 🔧 新增：运行前验证所有节点配置
    console.log('🔍 运行前验证节点配置...');
    const validationResults = nodes.map(node => ({
      nodeId: node.id,
      ...validateNodeConfiguration(node)
    }));
    
    const criticalErrors = validationResults.filter(result => !result.isValid && !result.canProceed);
    if (criticalErrors.length > 0) {
      // 显示配置错误在边上
      finalizeWorkflowVisuals('validation_failed');
      
      const errorSummary = criticalErrors.map(error => 
        `${error.nodeType}节点: ${error.errorMessage}`
      ).join('\n');
      
      showToast(`工作流配置不完整:\n${errorSummary}`, 'error');
      return;
    }
    
    // 显示警告信息（材料节点未配置等）
    const warnings = validationResults.filter(result => !result.isValid && result.canProceed);
    if (warnings.length > 0) {
      const warningSummary = warnings.map(warning => 
        `${warning.nodeType}节点: ${warning.warningMessage}`
      ).join(', ');
      
      console.log(`⚠️ 工作流警告: ${warningSummary}`);
      showToast(`注意: ${warningSummary}`, 'warning');
    }

    // 标准化工作流数据格式，符合后端WorkflowPayload结构
    const workflowData = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type || 'default',
        position: {
          x: node.position.x,
          y: node.position.y
        },
        data: {
          label: node.data.label || '',
          nodeType: node.data.nodeType || node.type,
          params: node.data.params || {},
          inputs: node.data.inputs || [],
          outputs: node.data.outputs || [],
          description: node.data.description || '',
          category: node.data.category || 'default',
          version: node.data.version || '1.0',
          timeout: node.data.timeout || 30,
          retry_count: node.data.retry_count || 0,
          error_handling: node.data.error_handling || 'stop',
          // 保留所有原始节点数据，确保结果节点的storagePath等特定字段不丢失
          ...node.data
        },
        width: node.width,
        height: node.height
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || 'default',
        targetHandle: edge.targetHandle || 'default',
        type: edge.type || 'default',
        data: edge.data || {}
      })),
      title: currentMindmap.title || '未命名工作流',
      description: currentMindmap.description || ''
    };

    try {
      // 首先尝试使用标准化的工作流执行API
      let useStandardAPI = true;
      let workflowId = null;

      if (useStandardAPI) {
        // 使用标准化的工作流执行API（保留LogicWorld协议的数据格式）
        const executeResponse = await fetch(`${API_BASE}/api/workflow/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            nodes: nodes.map(node => ({
              id: node.id,
              type: node.type || 'default',
              position: {
                x: node.position.x,
                y: node.position.y
              },
              data: {
                // 保留所有原始节点数据，确保结果节点的storagePath等特定字段不丢失
                ...node.data,
                label: node.data.label || '',
                nodeType: node.data.nodeType || node.type,
                params: node.data.params || {},
                inputs: node.data.inputs || [],
                outputs: node.data.outputs || [],
                description: node.data.description || '',
                category: node.data.category || 'default',
                version: node.data.version || '1.0',
                timeout: node.data.timeout || 30,
                retry_count: node.data.retry_count || 0,
                error_handling: node.data.error_handling || 'stop'
              },
              width: node.width,
              height: node.height
            })),
            edges: edges.map(edge => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle || 'default',
              targetHandle: edge.targetHandle || 'default',
              type: edge.type || 'default',
              data: edge.data || {}
            })),
            title: currentMindmap.title || '未命名工作流',
            description: currentMindmap.description || ''
          }),
        });

        if (!executeResponse.ok) {
          throw new Error(`工作流启动失败: ${executeResponse.status}`);
        }

        const executeResult = await executeResponse.json();
        workflowId = executeResult.workflow_id;
        
        // 🎯 更新当前工作流ID，用于状态管理演示
        setCurrentWorkflowId(workflowId);

        console.log('工作流已启动，ID:', workflowId);
        showToast('工作流已启动，正在执行...', 'info');

        // 开始监控工作流执行状态
        await monitorWorkflowExecution(workflowId);
        return;
      }

      // 备用：使用流式API（保持向后兼容）
      let endpoint = '/execute_stream';
      let requestBody = {
        ...workflowData,
        processing_mode: runMode  // 添加处理模式参数
      };

      // 如果是自定义模式，暂时使用默认端点（未来可扩展）
      if (runMode === 'custom') {
        console.log('自定义模式暂未完全实现，使用默认处理');
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok || !response.body) {
        throw new Error(`网络错误: ${response.status}`);
      }

      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep partial
        for (const part of parts) {
          if (!part.startsWith('data:')) continue;
          const dataStr = part.slice(5).trim();
          if (dataStr === '[DONE]') {
            reader.cancel();
            break;
          }
          let payload;
          try { payload = JSON.parse(dataStr); } catch { continue; }

          if (payload.event === 'node_start') {
            updateNodeStatus(payload.node_id, 'running');
            updateEdgesForNode(payload.node_id, 'running');
          } else if (payload.event === 'node_done') {
            updateNodeStatus(payload.node_id, 'done');
            updateEdgesForNode(payload.node_id, 'success');
          } else if (payload.event === 'error') {
            showToast(`执行出错: ${payload.message}`);
          } else if (payload.event === 'final') {
            const res = payload.data;
            // 保存上下文供 ResultPanel 使用
            if (res && res.context) {
              setExecutionContextState(res.context);
            }
            if (res.status === 'success') {
              finalizeWorkflowVisuals('completed');
              showToast(res.result || '执行完毕', 'success');
            } else {
              finalizeWorkflowVisuals('failed');
              showToast('执行失败', 'error');
            }
          }
        }
      }
    } catch (err) {
      console.error('流式执行失败:', err);
      showToast(`流式执行失败: ${err.message}`);
    } finally {
      setLoadingState(null);
      setIsWorkflowLocked(false); // 解锁工作流，允许修改
    }
  }, [nodes, edges, updateNodeStatus, showToast, runMode, resetWorkflowState, currentMindmap]);

  // 在工作流结束时，统一收尾：
  // 1) 将仍为running的边/节点改为最终状态并停止动画
  // 节点配置验证函数
  const validateNodeConfiguration = useCallback((node) => {
    const nodeType = node?.data?.nodeType;
    const nodeData = node?.data;
    
    switch (nodeType) {
      case 'material-node':
      case 'customNode': // 材料节点的别名
        // 材料节点特殊处理：没有配置不算错误，只是警告
        const hasContent = nodeData?.content || nodeData?.inputContent || nodeData?.text;
        return {
          isValid: !!hasContent,
          canProceed: true, // 材料节点即使没配置也可以继续
          warningMessage: hasContent ? null : '未找到材料',
          nodeType: 'material'
        };
        
      case 'execution-node':
        // 执行节点必须配置AI模型和工具
        const hasAI = nodeData?.aiModel || nodeData?.selectedAI;
        const hasTool = nodeData?.toolType || nodeData?.selectedTool;
        const hasTask = nodeData?.task || nodeData?.inputContent || nodeData?.executionDescription;
        
        // 🔧 修复：放宽验证条件，只要有基本配置就可以执行
        // AI模型和工具类型可以有默认值，任务描述是必需的
        const missingItems = [];
        if (!hasTask) missingItems.push('任务描述');
        
        // 如果没有AI模型或工具，给出警告但不阻止执行
        const executionWarnings = [];
        if (!hasAI) executionWarnings.push('AI模型');
        if (!hasTool) executionWarnings.push('工具类型');
        
        const isValid = !!hasTask; // 只要有任务描述就认为有效
        
        return {
          isValid: isValid,
          canProceed: true, // 🔧 修复：允许执行，即使AI模型或工具未配置
          errorMessage: missingItems.length > 0 ? `缺少配置：${missingItems.join('、')}` : null,
          warningMessage: executionWarnings.length > 0 ? `建议配置：${executionWarnings.join('、')}` : null,
          nodeType: 'execution'
        };
        
      case 'result-node':
        // 结果节点必须配置输出格式
        const hasOutputFormat = nodeData?.outputFormat || nodeData?.selectedFormat;
        const hasStoragePath = nodeData?.storagePath || nodeData?.outputPath;
        
        // 🔧 修复：放宽验证条件，提供默认值
        const missingResultItems = [];
        if (!hasOutputFormat) missingResultItems.push('输出格式');
        if (!hasStoragePath) missingResultItems.push('存储路径');
        
        // 如果没有配置，提供默认值但给出警告
        const resultWarnings = [];
        if (!hasOutputFormat) resultWarnings.push('输出格式(将使用默认格式)');
        if (!hasStoragePath) resultWarnings.push('存储路径(将使用默认路径)');
        
        return {
          isValid: true, // 🔧 修复：总是有效，使用默认值
          canProceed: true, // 🔧 修复：允许执行，使用默认配置
          errorMessage: null,
          warningMessage: resultWarnings.length > 0 ? `使用默认配置：${resultWarnings.join('、')}` : null,
          nodeType: 'result'
        };
        
      case 'condition-node':
        // 条件节点必须配置条件表达式
        const hasCondition = nodeData?.condition || nodeData?.expression;
        
        return {
          isValid: !!hasCondition,
          canProceed: false, // 条件节点必须配置条件
          errorMessage: hasCondition ? null : '缺少配置：条件表达式',
          nodeType: 'condition'
        };
        
      default:
        // 未知节点类型，默认认为有效
        return {
          isValid: true,
          canProceed: true,
          nodeType: 'unknown'
        };
    }
  }, []);

  // 🔧 新增：边状态样式生成辅助函数
  const getEdgeClassName = useCallback((status) => {
    const baseClass = 'default-dashed';
    if (!status || status === 'idle') return baseClass;
    return `${baseClass} edge-${status}`;
  }, []);

  // 2) 强制把"指向已完成(成功/失败)节点"的所有入边改为对应最终状态
  const finalizeWorkflowVisuals = useCallback((finalStatus, statusData = null) => {
    const toSuccess = finalStatus === 'completed' || finalStatus === 'success';
    const toError = finalStatus === 'failed' || finalStatus === 'error';

    const latestNodes = nodesRef.current || [];
    const latestEdges = edgesRef.current || [];

    console.log('🔧 finalizeWorkflowVisuals 被调用:', finalStatus, '节点数量:', latestNodes.length, '边数量:', latestEdges.length);

    // 🔧 增强：如果工作流整体失败，不依赖个别节点状态，直接更新所有边
    const shouldForceUpdate = toError || toSuccess;
    
    // 统计每个节点的最终状态（仅关心 success/error）
    const nodeFinalStatusMap = Object.create(null);
    for (const n of latestNodes) {
      const s = n?.data?.status;
      if (s === 'success' || s === 'error') {
        nodeFinalStatusMap[n.id] = s;
      }
    }
    
    // 🔧 智能节点状态验证：检查每个节点的配置完整性
    const nodeValidationMap = Object.create(null);
    for (const n of latestNodes) {
      const validation = validateNodeConfiguration(n);
      nodeValidationMap[n.id] = validation;
      
      // 🔧 修复：优先使用实际执行状态，而不是配置验证状态
      const actualStatus = n?.data?.status;
      if (actualStatus === 'success' || actualStatus === 'error' || actualStatus === 'failed') {
        // 使用实际执行状态
        nodeFinalStatusMap[n.id] = actualStatus === 'error' || actualStatus === 'failed' ? 'error' : 'success';
      } else if (validation.isValid && toSuccess) {
        // 只有在工作流整体成功时才基于配置验证标记为成功
        nodeFinalStatusMap[n.id] = 'success';
      } else if (toError && statusData?.failed_nodes?.includes(n.id)) {
        // 🔧 精确修复：只对真正失败的节点标记为错误，而不是所有未完成的节点
        nodeFinalStatusMap[n.id] = 'error';
      } else if (!validation.isValid) {
        nodeFinalStatusMap[n.id] = 'warning'; // 配置问题标记为警告
      }
      // 🔧 新增：未执行的节点保持原状，不强制改变状态
    }
    
    console.log('🔧 节点状态映射:', nodeFinalStatusMap, '强制更新:', shouldForceUpdate);

    setEdges(prev => {
      const currentEdges = prev && prev.length ? prev : latestEdges;
      return currentEdges.map(edge => {
      const targetFinal = nodeFinalStatusMap[edge.target];
      
      // 🔧 特殊处理：检查目标节点是否为结果节点
      const targetNode = latestNodes.find(n => n.id === edge.target);
      const isResultNode = targetNode?.data?.nodeType === 'result-node' || 
                          targetNode?.type === 'result-node' ||
                          (targetNode?.data?.label && targetNode.data.label.includes('结果'));
      
      // 优先级1：基于目标节点的确定状态更新边
      if (targetFinal) {
        console.log(`🔧 基于目标节点状态更新边 ${edge.source}->${edge.target} 为 ${targetFinal}`);
        
        // 🔧 新增：获取节点的具体错误信息
        let errorMessage = null;
        if (targetFinal === 'error') {
          // 尝试从工作流状态中获取节点的错误信息
          const nodeDetail = statusData?.node_details?.[edge.target];
          const nodeExecution = statusData?.node_executions?.[edge.target];
          
          errorMessage = nodeDetail?.execution_info?.error || 
                        nodeExecution?.error || 
                        targetNode?.data?.errorMessage ||
                        '节点执行失败';
                        
          console.log(`🔧 边 ${edge.source}->${edge.target} 获取错误信息: ${errorMessage}`);
        }
        
        return { 
          ...edge, 
          className: `default-dashed edge-${targetFinal}`, // 🔧 精确边状态样式
          style: { ...edge.style, strokeDasharray: '' }, // 清除内联样式  
          data: { 
            ...edge.data, 
            status: targetFinal, 
            errorMessage: errorMessage,
            animated: false 
          } 
        };
      }
      
      // 🔧 特殊优先级：如果是指向结果节点的边，且工作流已完成，但仅在所有其他方法都失效时才强制更新
      if (isResultNode && toSuccess && !targetFinal && edge?.data?.status === 'running') {
        console.log(`🔧 特殊处理：强制更新指向结果节点的运行中边 ${edge.source}->${edge.target} 为成功状态`);
        return { ...edge, data: { ...edge.data, status: 'success', animated: false } };
      }
      
      // 🔧 精确修复：只有指向真正失败节点的边才标记为失败
      const targetNodeFailed = statusData?.failed_nodes?.includes(edge.target);
      if (toError && targetNodeFailed && (edge?.data?.status === 'running' || edge?.data?.animated)) {
        console.log(`🔧 目标节点失败，更新边 ${edge.source}->${edge.target} 为失败状态`);
        
        // 🔧 获取目标节点的错误信息
        const nodeDetail = statusData?.node_details?.[edge.target];
        const nodeExecution = statusData?.node_executions?.[edge.target];
        const errorMessage = nodeDetail?.execution_info?.error || 
                            nodeExecution?.error || 
                            '节点执行失败';
        
        return { 
          ...edge, 
          className: 'default-dashed edge-error', // 🔧 精确失败边样式
          data: { 
            ...edge.data, 
            status: 'error', 
            errorMessage: errorMessage,
            animated: false 
          } 
        };
      }
      
      // 🔧 精确修复：优先级3 - 更智能的运行中边状态更新
      if (edge?.data?.status === 'running') {
        // 检查目标节点是否真正失败
        const targetReallyFailed = statusData?.failed_nodes?.includes(edge.target);
        let nextStatus = edge.data.status; // 默认保持原状
        
        if (toSuccess) {
          nextStatus = 'success';
        } else if (toError && targetReallyFailed) {
          nextStatus = 'error'; // 只有目标节点真正失败才标记为错误
        } else if (toError && !targetReallyFailed) {
          // 工作流失败但目标节点没失败，停止动画但不改变状态
          nextStatus = 'idle'; // 回到空闲状态
        }
        
        console.log(`🔧 精确更新运行边 ${edge.source}->${edge.target}: ${edge.data.status} → ${nextStatus}`);
        return { 
          ...edge, 
          className: `default-dashed edge-${nextStatus}`, // 🔧 精确边状态样式
          style: { ...edge.style, strokeDasharray: '' }, // 清除内联样式
          data: { ...edge.data, status: nextStatus, animated: false } 
        };
      }
      
      // 优先级4：智能边状态更新，支持详细错误信息
      if (shouldForceUpdate) {
        const sourceValidation = nodeValidationMap[edge.source];
        const targetValidation = nodeValidationMap[edge.target];
        const sourceStatus = nodeFinalStatusMap[edge.source];
        const targetStatus = nodeFinalStatusMap[edge.target];
        
        // 检查是否有配置错误
        const sourceHasError = sourceValidation && !sourceValidation.isValid && !sourceValidation.canProceed;
        const targetHasError = targetValidation && !targetValidation.isValid && !targetValidation.canProceed;
        
        if (sourceHasError || targetHasError) {
          // 显示配置错误
          const errorMessages = [];
          if (sourceHasError) errorMessages.push(`源节点: ${sourceValidation.errorMessage}`);
          if (targetHasError) errorMessages.push(`目标节点: ${targetValidation.errorMessage}`);
          
          console.log(`🔧 边 ${edge.source}->${edge.target} 显示配置错误: ${errorMessages.join('; ')}`);
          return {
            ...edge,
            className: 'error-edge',
            style: { 
              ...edge.style, 
              stroke: '#ff4444', 
              strokeWidth: 2,
              strokeDasharray: '5,5'
            },
            data: { 
              ...edge.data, 
              status: 'error', 
              errorMessage: errorMessages.join('; '),
              animated: false 
            }
          };
        }
        
        // 检查材料节点的警告状态
        const sourceHasWarning = sourceValidation && !sourceValidation.isValid && sourceValidation.canProceed;
        if (sourceHasWarning && targetStatus === 'success') {
          console.log(`🔧 边 ${edge.source}->${edge.target} 显示材料警告: ${sourceValidation.warningMessage}`);
          return {
            ...edge,
            className: 'warning-edge',
            style: { 
              ...edge.style, 
              stroke: '#ffa500', 
              strokeWidth: 2,
              strokeDasharray: '3,3'
            },
            data: { 
              ...edge.data, 
              status: 'warning', 
              warningMessage: sourceValidation.warningMessage,
              animated: false 
            }
          };
        }
        
        // 正常成功状态
        if (sourceStatus === 'success' && targetStatus === 'success' && !edge?.data?.status) {
          console.log(`🔧 边 ${edge.source}->${edge.target} 更新为成功状态`);
          return { 
            ...edge, 
            className: 'success-edge', 
            style: { 
              ...edge.style, 
              stroke: '#22c55e', 
              strokeWidth: 2,
              strokeDasharray: '' 
            }, 
            data: { ...edge.data, status: 'success', animated: false } 
          };
        }
      }
      
      // 优先级5：停止所有剩余的动画
      if (edge?.data?.animated) {
        console.log(`🔧 停止边 ${edge.source}->${edge.target} 的动画`);
        return { 
          ...edge, 
          className: 'default-dashed', 
          style: { ...edge.style, strokeDasharray: '' }, // 清除内联样式
          data: { ...edge.data, animated: false } 
        };
      }
      
      return edge;
      });
    });

    setNodes(prev => {
      const currentNodes = prev && prev.length ? prev : latestNodes;
      return currentNodes.map(node => {
      if (node?.data?.status === 'running') {
        const nextStatus = toSuccess ? 'success' : (toError ? 'error' : node.data.status);
        return { ...node, data: { ...node.data, status: nextStatus } };
      }
      return node;
      });
    });
  }, []); // 移除setEdges和setNodes依赖，避免无限重渲染

  // 监控工作流执行状态
  const monitorWorkflowExecution = useCallback(async (workflowId) => {
    let pollInterval = 500; // 🔧 开始时快速轮询，每500ms一次
    const maxPolls = 300; // 最多轮询5分钟
    let pollCount = 0;
    let fastPollCount = 0; // 快速轮询计数

    // 已移除前端模拟逻辑 - 等待后端真实执行结果
    console.log('⏳ 等待后端真实执行结果，不再使用前端模拟');

    const poll = async () => {
      try {
        // 🔧 增强兼容性：添加更多错误处理和调试信息
        console.log('🔍 正在轮询工作流状态...', workflowId);
        
        const response = await fetch(`${API_BASE}/api/workflow/${workflowId}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          // 🔧 增加超时处理 - 延长到30秒以适应长时间运行的工作流
          signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
        });
        
        console.log('🔍 响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`获取工作流状态失败: ${response.status} ${response.statusText}`);
        }

        const status = await response.json();
        console.log('🔍 解析到的状态数据:', status);
        console.log('工作流状态:', status);

        // 不再使用前端模拟，依赖后端真实执行状态
        const workflowStatus = status.execution_status?.status || status.status;
        console.log('📊 工作流状态:', workflowStatus, '- 后端数据格式:', status.execution_status ? '新格式' : '旧格式');

        // 检查是否完成
        if (workflowStatus === 'completed') {
          // 🔧 重要修复：工作流完成时也要同步节点执行结果
          const nodeExecutions = status.node_details || status.node_executions;
          if (nodeExecutions) {
            console.log('📊 [完成时] 最终同步节点执行状态:', nodeExecutions);
            
            // 🔧 新增：更新executionResults状态，供StatusTrackingPanel使用
            const newExecutionResults = {};
            
            Object.entries(nodeExecutions).forEach(([nodeId, execution]) => {
              // 兼容新旧格式
              const execInfo = execution.execution_info || execution;
              const nodeStatus = execInfo.status || execution.status;
              const nodeResult = execution.business_data || execution.result || execution;
              
              const newStatus = nodeStatus === 'completed' ? 'success' : 
                              nodeStatus === 'failed' ? 'error' : 'idle';
              
              console.log(`🔧 [完成时] 最终更新节点 ${nodeId}:`, nodeResult);
              
              // 🔧 新增：保存执行结果供状态跟踪面板使用
              newExecutionResults[nodeId] = {
                status: newStatus,
                result: nodeResult,
                error: execution.error,
                startTime: execution.start_time,
                endTime: execution.end_time,
                duration: execution.duration
              };
              
              setNodes(prevNodes => {
                return prevNodes.map(node => {
                  if (node.id === nodeId) {
                    return {
                      ...node,
                                             data: {
                         ...node.data,
                                                 status: newStatus,
                        execution_result: nodeResult,
                        executionResult: nodeResult,
                        // 🔧 新增：将字符串化的结果也填充到outputContent，便于节点直接显示
                        outputContent: (() => {
                          // 对于结果节点，优先从原始执行结果中提取content
                          if (execution.result && execution.result.content) {
                            return execution.result.content;
                          }
                          // 对于其他节点，使用通用逻辑
                          if (typeof nodeResult === 'string') {
                            return nodeResult;
                          }
                          return nodeResult?.output || nodeResult?.result || nodeResult?.message || JSON.stringify(nodeResult) || node.data.outputContent;
                        })(),
                         execution_error: execution.error
                       }
                    };
                  }
                  return node;
                });
              });
            });
            
            // 🔧 更新executionResults状态
            setExecutionResults(prev => ({
              ...prev,
              ...newExecutionResults
            }));
            
            // 🔧 更新workflowExecutionStatus状态
            setWorkflowExecutionStatus(prev => {
              const updatedStatus = { ...prev };
              Object.entries(newExecutionResults).forEach(([nodeId, result]) => {
                updatedStatus[nodeId] = result.status;
              });
              return updatedStatus;
            });
          }
          
          // 🔧 新增：处理generated_files，更新结果节点的文件显示
          if (status.generated_files && Array.isArray(status.generated_files) && status.generated_files.length > 0) {
            console.log('📁 工作流完成时处理生成文件:', status.generated_files);
            
            setNodes(prevNodes => {
              return prevNodes.map(node => {
                // 查找结果节点
                if (node.type === 'result-node' || (node.data && node.data.nodeType === 'result-node')) {
                  console.log(`📁 更新结果节点 ${node.id} 的文件显示:`, status.generated_files);
                  
                  // 格式化文件信息供前端显示
                  const formattedFiles = status.generated_files.map(file => ({
                    name: file.name || 'document.docx',
                    size: file.size || 0,
                    type: file.type || 'Word文档',
                    ext: file.ext || 'docx',
                    path: file.path,
                    content: file.content || `文件大小: ${file.size} 字节`
                  }));
                  
                  // 生成文件预览内容
                  const filePreviewContent = formattedFiles.map(file => 
                    `📄 ${file.name} (${file.size} 字节)\n${file.content}`
                  ).join('\n\n');
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      status: 'success',
                      outputContent: filePreviewContent,
                      generatedFiles: formattedFiles, // 存储原始文件信息
                      filesGenerated: true, // 标记已生成文件
                      fileCount: formattedFiles.length
                    }
                  };
                }
                return node;
              });
            });
          }
          
                    // 🔧 微动画：让最后一条边先显示 running 再成功；完成后彻底复原为实线
          const completedNodes = status.completed_nodes || status.completedNodes;
          if (Array.isArray(completedNodes) && completedNodes.length >= 2) {
            const fromId = completedNodes[completedNodes.length - 2];
            const toId = completedNodes[completedNodes.length - 1];
            setEdges(eds => eds.map(edge => (edge.source === fromId && edge.target === toId)
              ? { ...edge, className: getEdgeClassName('running'), data: { ...edge.data, status: 'running', animated: true } }
              : edge
            ));
            setTimeout(() => {
              setEdges(eds => eds.map(edge => (edge.source === fromId && edge.target === toId)
                ? { ...edge, className: getEdgeClassName('success'), data: { ...edge.data, status: 'success', animated: false } }
                : edge
              ));
              finalizeWorkflowVisuals('completed', status);
              showToast('工作流执行完成', 'success');
              if (status.result) {
                setExecutionContextState(status.result);
              }
            }, 500);
          } else {
            finalizeWorkflowVisuals('completed', status);
            showToast('工作流执行完成', 'success');
            if (status.result) {
              setExecutionContextState(status.result);
            }
          }
          return; // 停止轮询
        } else if (workflowStatus === 'failed') {
          finalizeWorkflowVisuals('failed', status);
          showToast(`工作流执行失败: ${status.execution_status?.error || status.error || '未知错误'}`, 'error');
          return; // 停止轮询
        } else if (workflowStatus === 'cancelled') {
          finalizeWorkflowVisuals('failed', status);
          showToast('工作流执行已取消', 'info');
          return; // 停止轮询
        }

        // 更新节点状态显示
        if (status.node_executions) {
          console.log('📊 接收到节点执行状态:', status.node_executions);
          
          // 🔧 新增：收集执行结果供状态跟踪面板使用
          const currentExecutionResults = {};
          
          // 🔧 一处统一更新边状态，避免其它地方重复覆盖
          // 处理节点状态更新并同时更新相关边状态
          Object.entries(status.node_executions).forEach(([nodeId, execution]) => {
            let newStatus = 'idle';
            
            // 根据后端返回的执行状态映射前端状态
            switch (execution.status) {
              case 'running':
                newStatus = 'running';
                break;
              case 'completed':
                newStatus = 'success';
                break;
              case 'failed':
                newStatus = 'error';
                break;
              default:
                newStatus = execution.status || 'idle';
            }
            
            console.log(`🔧 更新节点 ${nodeId}: status: ${newStatus} (来自后端: ${execution.status})`);
            console.log(`🔧 节点 ${nodeId} 执行结果:`, execution.result);
            
            // 🔧 新增：收集执行结果
            currentExecutionResults[nodeId] = {
              status: newStatus,
              result: execution.result,
              error: execution.error,
              startTime: execution.start_time,
              endTime: execution.end_time,
              duration: execution.duration
            };
            
            // 更新节点状态
            setNodes(prevNodes => {
              return prevNodes.map(node => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                                         data: {
                       ...node.data,
                       status: newStatus,
                       execution_result: execution.result,
                       executionResult: execution.result,
                       // 🔧 新增：运行中也把结果填充到outputContent，便于实时显示
                       outputContent: (typeof execution.result === 'string'
                         ? execution.result
                         : (execution.result?.output || execution.result?.result || execution.result?.message || JSON.stringify(execution.result))) || node.data.outputContent,
                       execution_error: execution.error
                     }
                  };
                }
                return node;
              });
            });
            
            // 🔧 同时更新相关边状态，确保执行过程可见
            if (newStatus === 'running') {
              // 当节点开始执行时，将输入边设为running状态
              setEdges(eds => eds.map(edge =>
                edge.target === nodeId
                  ? { ...edge, className: getEdgeClassName('running'), data: { ...edge.data, status: 'running', animated: true } }
                  : edge
              ));
            } else if (newStatus === 'success') {
              // 当节点执行完成时：先让输入边短暂显示 running，再切换为 success，增强可见性
              setEdges(eds => eds.map(edge => {
                if (edge.target === nodeId) {
                  const wasRunning = edge?.data?.status === 'running';
                  return { ...edge, className: getEdgeClassName(wasRunning ? 'success' : 'running'), data: { ...edge.data, status: wasRunning ? 'success' : 'running', animated: !wasRunning } };
                } else if (edge.source === nodeId) {
                  // 仅当下游节点还未开始（不是running/success/error）时，启动下游边
                  const targetNodeId = edge.target;
                  const targetNode = (nodesRef.current || []).find(n => n.id === targetNodeId);
                  const targetStatus = targetNode?.data?.status;
                  const canKickoff = !(targetStatus === 'running' || targetStatus === 'success' || targetStatus === 'error');
                  return canKickoff ? { ...edge, className: getEdgeClassName('running'), data: { ...edge.data, status: 'running', animated: true } } : edge;
                }
                return edge;
              }));
              setTimeout(() => {
                setEdges(eds => eds.map(edge => (
                  edge.target === nodeId
                    ? { ...edge, className: getEdgeClassName('success'), data: { ...edge.data, status: 'success', animated: false } }
                    : edge
                )));
              }, 350);
            } else if (newStatus === 'error') {
              // 当节点执行失败时，将相关边设为error状态
              setEdges(eds => eds.map(edge =>
                (edge.target === nodeId || edge.source === nodeId)
                  ? { ...edge, data: { ...edge.data, status: 'error', animated: false } }
                  : edge
              ));
            }
          });
          
          // 🔧 更新executionResults状态
          setExecutionResults(prev => ({
            ...prev,
            ...currentExecutionResults
          }));
          
          // 🔧 更新workflowExecutionStatus状态
          setWorkflowExecutionStatus(prev => {
            const newStatus = { ...prev };
            Object.entries(currentExecutionResults).forEach(([nodeId, result]) => {
              newStatus[nodeId] = result.status;
            });
            return newStatus;
          });
        }

        // 继续轮询
        pollCount++;
        fastPollCount++;
        
        // 🔧 自适应轮询：前10次快速轮询(500ms)，之后切换到慢速轮询(2000ms)
        if (fastPollCount > 10) {
          pollInterval = 2000; // 切换到慢速轮询
        }
        
        if (pollCount < maxPolls) {
          setTimeout(poll, pollInterval);
        } else {
          showToast('工作流执行超时', 'warning');
        }
      } catch (error) {
        console.error('🚨 获取工作流状态失败:', error);
        console.error('🚨 错误详细信息:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // 🔧 增强兼容性：区分不同类型的错误
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.error('🚨 网络连接错误 - 可能是CORS或网络问题');
          showToast('网络连接失败，请检查后端服务', 'error');
        } else if (error.name === 'AbortError') {
          console.error('🚨 请求超时');
          showToast('请求超时，请重试', 'warning');
        } else {
          showToast(`无法获取工作流状态: ${error.message}`, 'error');
        }
        
        // 🔧 失败时也继续轮询几次
        pollCount++;
        if (pollCount < 3) { // 允许失败3次
          console.log('🔄 轮询失败，3秒后重试...');
          setTimeout(poll, 3000);
        } else {
          console.error('🚨 轮询失败次数过多，停止轮询');
          finalizeWorkflowVisuals('failed');
        }
      }
    };

    await poll();
  }, [showToast, setExecutionContextState, nodes, finalizeWorkflowVisuals]);

  // 更新节点执行状态显示
  const updateNodesExecutionStatus = useCallback((nodeExecutions) => {
    if (!nodeExecutions) return;
    
    console.log('🔄 更新节点执行状态:', nodeExecutions);

    setNodes(prevNodes =>
      prevNodes.map(node => {
        const execution = nodeExecutions[node.id];
        if (execution) {
          console.log(`📝 更新节点 ${node.id}:`, execution);
          // 映射后端状态到前端状态
          let frontendStatus = 'idle';
          switch (execution.status) {
            case 'pending':
              frontendStatus = 'idle';
              break;
            case 'running':
              frontendStatus = 'running';
              // 更新入边状态为运行中
              updateEdgesForNode(node.id, 'running');
              break;
            case 'completed':
              frontendStatus = 'success';
              // 更新入边状态为成功，出边状态为运行中（如果有下游节点）
              updateEdgesForNode(node.id, 'success');
              break;
            case 'failed':
              frontendStatus = 'error';
              // 更新入边状态为失败，同时停止动画
              updateEdgesForNode(node.id, 'error');
              break;
            default:
              frontendStatus = execution.status;
          }

          return {
            ...node,
            data: {
              ...node.data,
              status: frontendStatus,
              executionResult: execution.result,
              executionError: execution.error,
              executionStartTime: execution.start_time,
              executionEndTime: execution.end_time,
              executionDuration: execution.duration
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // 更新与节点相关的边状态
  const updateEdgesForNode = useCallback((nodeId, status) => {
    setEdges(prevEdges =>
      prevEdges.map(edge => {
        // 更新进入该节点的边
        if (edge.target === nodeId) {
          return {
            ...edge,
            className: getEdgeClassName(status),
            data: {
              ...edge.data,
              status: status,
              animated: status === 'running'
            }
          };
        }
        // 🔧 修复：如果节点执行成功，输出边设为ready状态，等待目标节点开始时才变为running
        if (edge.source === nodeId && status === 'success') {
          return {
            ...edge,
            data: {
              ...edge.data,
              status: 'ready', // 输出边准备状态，等待目标节点开始
              animated: false
            }
          };
        }
        // 如果节点执行失败，不激活下游边
        if (edge.source === nodeId && status === 'error') {
          return {
            ...edge,
            data: {
              ...edge.data,
              // 保持原状态，不激活下游边
              animated: false
            }
          };
        }
        return edge;
      })
    );
  }, [setEdges]);

  const handleResumeWorkflow = useCallback(async (nodeId, manualData) => {
    console.log(`Attempting to resume from node ${nodeId}`);
    setLoadingState('executing'); // Show loading overlay

    try {
      const response = await fetch(`${API_BASE}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          edges,
          context: failedExecutionContext?.context, // Pass the context from the failed run
          resume_from_node_id: nodeId,
          manual_data: manualData,
        }),
      });

      const result = await response.json();
      console.log("Workflow resumption result:", result);

      // Handle the response from the resume endpoint similarly to the run endpoint
      if (result.status === 'success') {
        showToast(result.result || "工作流成功恢复并执行完毕！", 'success');
        // Clear the failed state from the node
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'success' } } : n));
        // On success, clear the context
        setFailedExecutionContext(null); 
      } else if (result.status === 'failed') {
        // Handle if the resumed workflow also fails
        const errorMsg = result.error_message || '恢复执行时发生未知错误。';
        showToast(`恢复执行失败: ${errorMsg}`, 'error');
        setFailedExecutionContext({ context: result.context, nodeId: result.error_node_id, error_message: errorMsg });
        // Highlighting is handled by useEffect
      } else if (result.status === 'paused_for_approval') {
          // This can happen if a resume leads to an approval node
          showToast(`工作流已暂停，等待您审核。`, 'info');
          setPausedForApprovalContext({
              context: result.context,
              nodeId: result.node_id,
              dataToApprove: result.data_to_approve,
          });
          setFailedExecutionContext(null); // Clear the old failure context
          // Highlighting is handled by useEffect
      }
    } catch (error) {
      console.error('Failed to resume workflow:', error);
      showToast(`恢复工作流时出错: ${error.message}`, 'error');
    } finally {
      setLoadingState(null);
    }
  }, [nodes, edges, setNodes, failedExecutionContext]);

  // --- NEW: Handler for resuming from an approval node ---
  const handleResumeFromApproval = useCallback(async (approvedData) => {
    if (!pausedForApprovalContext) {
      showToast('无法恢复：未找到暂停状态。', 'error');
      return;
    }

    console.log("Resuming from approval with data:", approvedData);
    setLoadingState('executing');

    const payload = {
      nodes: nodes,
      edges: edges,
      context: pausedForApprovalContext.context,
      resume_from_node_id: pausedForApprovalContext.nodeId,
      approved_data: approvedData,
    };

    try {
      const response = await fetch(`${API_BASE}/resume_from_approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`网络响应错误: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("Approval resume result:", result);
      
      const approvalNodeId = pausedForApprovalContext.nodeId; // Keep track of the ID before clearing
      
      // On any valid response from the resume endpoint, we clear the paused state.
      setPausedForApprovalContext(null); 

      if (result.status === 'success') {
        showToast(result.result || "工作流成功恢复并执行完毕！", 'success');
        setNodes(nds => nds.map(n => n.id === approvalNodeId ? { ...n, data: { ...n.data, status: 'success' } } : n));
      } else if (result.status === 'failed') {
        const errorMsg = result.error_message || '恢复执行时发生未知错误。';
        showToast(`恢复执行失败: ${errorMsg}`, 'error');
        setFailedExecutionContext({ context: result.context, nodeId: result.error_node_id, error_message: errorMsg });
        // Highlighting and node state updates are now handled by the useEffect below
        // We just need to mark the source node as successful
        setNodes(nds => nds.map(n => n.id === approvalNodeId ? { ...n, data: { ...n.data, status: 'success' } } : n));

      } else if (result.status === 'paused_for_approval') {
          showToast(`工作流再次暂停，等待您审核。`, 'info');
          setPausedForApprovalContext({
              context: result.context,
              nodeId: result.node_id,
              dataToApprove: result.data_to_approve,
          });
          // Mark the source node as successful before pausing on the next one
          setNodes(nds => nds.map(n => n.id === approvalNodeId ? { ...n, data: { ...n.data, status: 'success' } } : n));
      }
    } catch (error) {
      console.error('Failed to resume from approval:', error);
      showToast(`从审核节点恢复时出错: ${error.message}`, 'error');
    } finally {
      setLoadingState(null);
    }
  }, [nodes, edges, pausedForApprovalContext, setNodes]);


  // Effect to update nodes with correct data/handlers when contexts change
  useEffect(() => {
    if (nodes.length === 0) return; // Do nothing if there are no nodes
    
    setNodes(nds => {
        let needsUpdate = false;
        const newNodes = nds.map(n => {
            const originalNode = { ...n, data: { ...n.data } }; // Deep copy for comparison
            
            const isFailed = failedExecutionContext && n.id === failedExecutionContext.nodeId;
            const isPaused = pausedForApprovalContext && n.id === pausedForApprovalContext.nodeId;

            let status = 'default';
            if (n.data.status === 'success') status = 'success'; // Keep success state
            if (isFailed) status = 'failed';
            if (isPaused) status = 'paused';
            
            const newData = n.data; // Mutate for efficiency, check at the end
            let nodeChanged = false;

            if(newData.status !== status) {
              newData.status = status;
              nodeChanged = true;
            }

            // Handle passing data/handlers to the approval node
            if (isPaused) {
                if(newData.list_to_approve !== pausedForApprovalContext.dataToApprove) {
                  newData.list_to_approve = pausedForApprovalContext.dataToApprove;
                  nodeChanged = true;
                }
                if(newData.onConfirm !== handleResumeFromApproval) {
                  newData.onConfirm = handleResumeFromApproval; // Pass the handler
                  nodeChanged = true;
                }
            } else if (newData.onConfirm || newData.list_to_approve) {
                // Clean up handler if not paused
                delete newData.onConfirm;
                delete newData.list_to_approve;
                nodeChanged = true;
            }

            // Handle passing error message to the failed node
            if(isFailed) {
              if (newData.error !== failedExecutionContext.error_message) {
                newData.error = failedExecutionContext.error_message;
                nodeChanged = true;
              }
            } else if (newData.error) {
              delete newData.error;
              nodeChanged = true;
            }

            if(nodeChanged) {
                needsUpdate = true;
                return { ...n, data: newData };
            }
            return n; // Return original node if no changes
        });

        return needsUpdate ? newNodes : nds;
    });
}, [failedExecutionContext, pausedForApprovalContext, setNodes, handleResumeFromApproval, nodes.length]);



  const handleSendMessage = useCallback(async (inputValue, messageType = 'normal') => {
    if (loadingState) {
      showToast('请等待当前操作完成。');
      return;
    }

    const userMessage = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setLoadingState('generating'); // Set loading state

    // 如果是智能规划模式或工作流生成模式，直接返回，让ChatBox组件处理
    if (messageType === 'intelligent_planning' || messageType === 'workflow_generation') {
      setLoadingState(null);
      return;
    }

    const controller = new AbortController();
    // Increase timeout to 90 seconds – complex plans may need more time
    const timeoutId = setTimeout(() => {
        controller.abort();
        showToast('AI service timed out after 90 seconds.');
    }, 90000);

    // 智能检测用户意图
    const detectedIntent = await detectIntent(inputValue);
    console.log(`Detected intent: ${detectedIntent} for prompt: "${inputValue}"`);

    try {
      console.log(`🤖 发送聊天请求，API地址: ${API_BASE}/chat`);
      console.log(`📝 发送数据:`, {
        prompt: inputValue,
        intent: detectedIntent,
        model: 'deepseek-chat',
        history: []
      });

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal, // Add the abort signal
        body: JSON.stringify({
          prompt: inputValue,
          intent: detectedIntent,
          model: 'deepseek-chat',
          history: []
        }),
      });

      console.log(`📡 聊天API响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `请求失败，状态码: ${response.status}`);
      }

      const responseData = await response.json();

      // 处理不同类型的响应
      console.log('📋 收到的响应数据:', responseData);

      if (responseData.type === 'chat_response' && responseData.message) {
        // 主服务器聊天响应 - {type: "chat_response", message: "...", timestamp: ...}
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: responseData.message,
          sender: 'ai'
        }]);
      } else if (responseData.response) {
        // 备用格式 - {response: "...", model: "...", intent: "...", ...}
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: responseData.response,
          sender: 'ai'
        }]);
      } else if (responseData && responseData.nodes && responseData.edges) {
        // 思维导图响应
        handleMindMapUpdate(responseData);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: '好的，已为您生成思维导图。',
          sender: 'ai'
        }]);
      } else {
        // 未知响应类型
        console.warn('⚠️ 未知的响应格式:', responseData);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: '收到了一个未知类型的响应。',
          sender: 'ai'
        }]);
      }

    } catch (error) {
      console.error('🚨 连接AI时出错:', error);
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);

      if (error.name === 'AbortError') {
        setMessages(prev => [...prev, { id: Date.now(), text: 'AI 请求超时，请稍后重试或简化问题。', sender: 'ai' }]);
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessages(prev => [...prev, { id: Date.now(), text: `网络连接失败，请检查后端服务是否正常运行。错误: ${error.message}`, sender: 'ai' }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now(), text: `出错了：${error.message}`, sender: 'ai' }]);
      }
    } finally {
        clearTimeout(timeoutId);
        setLoadingState(null); // CRITICAL FIX: Ensure this is always called
    }
  }, [handleMindMapUpdate, showToast]);

  // 为ChatBox提供添加用户消息的方法
  handleSendMessage.addUserMessage = useCallback((userMessage) => {
    setMessages(prev => [...prev, userMessage]);
  }, []);

  // 为ChatBox提供添加AI消息的方法
  handleSendMessage.addAIMessage = useCallback((aiMessage) => {
    setMessages(prev => [...prev, aiMessage]);
  }, []);

  // 为ChatBox提供更新AI消息的方法
  handleSendMessage.updateAIMessage = useCallback((messageId, updates) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  // 为ChatBox提供添加工作流到画布的方法
  handleSendMessage.addWorkflowToCanvas = useCallback((workflowData) => {
    try {
      console.log('🎯 添加工作流到画布:', workflowData);

      // 清空当前画布
      setNodes([]);
      setEdges([]);

      // 添加工作流节点和连接
      if (workflowData.nodes && workflowData.nodes.length > 0) {
        setNodes(workflowData.nodes);
      }

      if (workflowData.connections && workflowData.connections.length > 0) {
        // 🔧 修复连接点ID：将简单ID转换为复合ID
        const fixedConnections = workflowData.connections.map(connection => {
          let sourceHandle = connection.sourceHandle;
          let targetHandle = connection.targetHandle;

          // 修复源连接点ID
          if (sourceHandle === 'right') sourceHandle = 'right-source';
          else if (sourceHandle === 'left') sourceHandle = 'left-source';
          else if (sourceHandle === 'top') sourceHandle = 'top-source';
          else if (sourceHandle === 'bottom') sourceHandle = 'bottom-source';

          // 修复目标连接点ID
          if (targetHandle === 'left') targetHandle = 'left-target';
          else if (targetHandle === 'right') targetHandle = 'right-target';
          else if (targetHandle === 'top') targetHandle = 'top-target';
          else if (targetHandle === 'bottom') targetHandle = 'bottom-target';

          return {
            ...connection,
            sourceHandle,
            targetHandle
          };
        });
        console.log('🔧 修复后的连接:', fixedConnections);
        setEdges(fixedConnections);
      }

      // 更新当前思维导图信息
      setCurrentMindmap({
        id: null,
        title: workflowData.name || '智能生成的工作流',
        description: workflowData.description || '通过AI对话生成的工作流',
        isNew: true,
        lastSaved: null
      });

      // 显示成功提示
      showToast('工作流已成功添加到画布！', 'success');

      // 自动适应视图
      setTimeout(() => {
        if (reactFlowInstanceFunctions?.fitView) {
          reactFlowInstanceFunctions.fitView({ padding: 0.1 });
        }
      }, 100);

    } catch (error) {
      console.error('❌ 添加工作流到画布失败:', error);
      showToast('添加工作流到画布失败', 'error');
    }
  }, [setNodes, setEdges, setCurrentMindmap, showToast, reactFlowInstanceFunctions]);

  // 🚀 智能检测多分支结构（增强版）
  const detectBranchStructure = (steps) => {
    // 检查是否有分支结构信息
    if (steps.branchStructure) {
      console.log('✅ 发现预定义的分支结构:', steps.branchStructure);
      return steps.branchStructure;
    }

    console.log('🔍 开始智能分析工作流分支结构...');

    // 🎯 智能解析条件分支逻辑
    const branchAnalysis = analyzeConditionalBranches(steps);

    if (branchAnalysis.hasBranches) {
      console.log('🌳 检测到多分支条件工作流:', branchAnalysis);

      // 🏗️ 检测是否适合架构图布局
      const isArchitectureStyle = detectArchitecturePattern(steps);

      return {
        type: 'conditional_tree',
        branchPoints: branchAnalysis.branchPoints,
        branchStructure: branchAnalysis.structure,
        layout: isArchitectureStyle ? 'architecture' : 'vertical_tree'
      };
    }

    // 检查步骤中是否有并行分支标记
    const branchSteps = steps.filter(step => step.isParallelBranch || step.isBranchStart);
    const convergenceSteps = steps.filter(step => step.convergencePoint || step.isBranchEnd);

    if (branchSteps.length > 1) {
      // 🏗️ 检测是否适合架构图布局
      const isArchitectureStyle = detectArchitecturePattern(steps);

      return {
        type: 'parallel',
        branchNodes: branchSteps.map(step => step.id),
        convergenceNodes: convergenceSteps.map(step => step.id),
        layout: isArchitectureStyle ? 'architecture' : 'vertical_flow'
      };
    }

    // 简单条件检查（回退逻辑）
    const conditionSteps = steps.filter(step =>
      step.title?.includes('条件') || step.title?.includes('判断') ||
      step.description?.includes('分支') || step.nodeType === 'condition-node'
    );

    if (conditionSteps.length > 0) {
      // 🔧 创建与 calculateConditionalLayout 兼容的数据结构
      const branchPoints = conditionSteps.map((step, index) => ({
        stepIndex: steps.indexOf(step),
        stepId: step.id,
        condition: step.title,
        branches: [
          { stepIndex: steps.indexOf(step) + 1, condition: 'true', label: '✓ 是' },
          { stepIndex: steps.indexOf(step) + 2, condition: 'false', label: '✗ 否' }
        ],
        type: 'condition'
      }));

      return {
        type: 'conditional',
        conditionNodes: conditionSteps.map(step => step.id),
        branchPoints: branchPoints, // 🔧 添加 branchPoints 以兼容布局算法
        layout: 'decision_tree'
      };
    }

    return { type: 'linear', layout: 'snake' };
  };

  // 🏗️ 检测是否适合架构图布局模式
  const detectArchitecturePattern = (steps) => {
    console.log('🏗️ 检测架构图布局模式...');

    // 🎯 架构图特征检测
    const architectureKeywords = [
      '系统', '服务', '模块', '组件', '接口', '数据库', '缓存', '队列',
      '微服务', '架构', '设计', '部署', '监控', '日志', '安全', '网关',
      '负载均衡', '集群', '分布式', '云服务', '容器', 'API', '中间件'
    ];

    const processKeywords = [
      '处理', '分析', '生成', '创建', '发送', '接收', '存储', '查询',
      '验证', '转换', '过滤', '聚合', '计算', '统计', '报告', '通知'
    ];

    let architectureScore = 0;
    let processScore = 0;
    let branchCount = 0;

    // 分析每个步骤
    steps.forEach((step, index) => {
      const content = `${step.title} ${step.description}`.toLowerCase();

      // 检测架构关键词
      architectureKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          architectureScore += 1;
        }
      });

      // 检测处理流程关键词
      processKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          processScore += 1;
        }
      });

      // 检测分支特征
      if (content.includes('分支') || content.includes('并行') || content.includes('同时')) {
        branchCount += 1;
      }
    });

    // 🎯 判断是否适合架构图布局
    const totalSteps = steps.length;
    const architectureRatio = architectureScore / totalSteps;
    const processRatio = processScore / totalSteps;
    const hasManyBranches = branchCount >= 2 || totalSteps >= 15;

    console.log(`🏗️ 架构图模式分析: 架构分=${architectureScore}(${architectureRatio.toFixed(2)}), 流程分=${processScore}(${processRatio.toFixed(2)}), 分支数=${branchCount}, 总步骤=${totalSteps}`);

    // 判断条件：
    // 1. 有较多架构相关关键词
    // 2. 有多个分支或步骤较多
    // 3. 流程复杂度较高
    const isArchitecture = (
      (architectureRatio >= 0.3 && hasManyBranches) ||
      (processRatio >= 0.6 && totalSteps >= 10) ||
      (branchCount >= 3) ||
      (totalSteps >= 20)
    );

    console.log(`🏗️ 架构图布局适用性: ${isArchitecture ? '✅ 适合' : '❌ 不适合'}`);

    return isArchitecture;
  };

  // 🧠 智能分析条件分支逻辑
  const analyzeConditionalBranches = (steps) => {
    const branchPoints = [];
    const structure = [];

    steps.forEach((step, index) => {
      const text = `${step.title || ''} ${step.description || ''}`.toLowerCase();

      // 🔍 检测条件分支模式
      const conditionalPatterns = [
        /如果.*则.*否则/,
        /如果.*否则/,
        /检查.*分支/,
        /判断.*处理/,
        /条件.*执行/,
        /(大于|小于|等于|超过|不足).*则/,
        /(是|不是).*文件.*则/
      ];

      const isConditional = conditionalPatterns.some(pattern => pattern.test(text));

      if (isConditional) {
        console.log(`🔀 发现条件分支点: ${step.title}`);

        // 分析分支选项
        const branches = parseConditionalBranches(text, steps, index);

        branchPoints.push({
          stepIndex: index,
          stepId: step.id || `step-${index + 1}`,
          condition: step.title,
          branches: branches,
          type: 'condition'
        });

        structure.push({
          level: Math.floor(index / 3), // 简单的层级计算
          type: 'branch_point',
          stepIndex: index,
          branchCount: branches.length
        });
      }
    });

    return {
      hasBranches: branchPoints.length > 0,
      branchPoints: branchPoints,
      structure: structure
    };
  };

  // 🔍 解析条件分支选项
  const parseConditionalBranches = (text, steps, currentIndex) => {
    const branches = [];

    // 查找下一个可能的分支步骤
    const nextSteps = steps.slice(currentIndex + 1, currentIndex + 4); // 查看接下来的3个步骤

    nextSteps.forEach((nextStep, relativeIndex) => {
      const nextText = `${nextStep.title || ''} ${nextStep.description || ''}`.toLowerCase();

      // 检测分支选项
      if (nextText.includes('压缩') || nextText.includes('优化') ||
          nextText.includes('转换') || nextText.includes('处理')) {
        branches.push({
          stepIndex: currentIndex + 1 + relativeIndex,
          stepId: nextStep.id || `step-${currentIndex + 2 + relativeIndex}`,
          title: nextStep.title,
          branchType: determineBranchType(nextText)
        });
      }
    });

    // 如果没有找到明确的分支，创建默认分支
    if (branches.length === 0 && currentIndex + 1 < steps.length) {
      branches.push({
        stepIndex: currentIndex + 1,
        stepId: steps[currentIndex + 1].id || `step-${currentIndex + 2}`,
        title: steps[currentIndex + 1].title,
        branchType: 'default'
      });
    }

    return branches;
  };

  // 🎯 确定分支类型
  const determineBranchType = (text) => {
    if (text.includes('压缩')) return 'true';  // 文件大小超过限制
    if (text.includes('优化')) return 'true';  // 是图片文件
    if (text.includes('转换')) return 'false'; // 是文档文件
    if (text.includes('直接')) return 'false'; // 文件大小未超过限制
    return 'true'; // 默认为true分支
  };

  // 🌟 计算并行分支布局 - 上下分布
  const calculateParallelLayout = (step, index, steps, branchStructure) => {
    const centerX = 600; // 中心X坐标
    const topY = 150;    // 顶部Y坐标
    const middleY = 400; // 中间Y坐标（并行分支）
    const bottomY = 650; // 底部Y坐标
    const horizontalSpacing = 300; // 水平间距

    // 如果是准备步骤（起始节点）
    if (index === 0 || (!step.isParallelBranch && !step.convergencePoint)) {
      return {
        x: centerX,
        y: topY,
        branchType: 'preparation'
      };
    }

    // 如果是并行分支
    if (step.isParallelBranch) {
      const branchIndex = step.branchIndex || 0;
      const totalBranches = step.totalBranches || 3;

      // 计算分支的水平分布
      const startX = centerX - ((totalBranches - 1) * horizontalSpacing) / 2;
      const branchX = startX + branchIndex * horizontalSpacing;

      return {
        x: branchX,
        y: middleY, // 所有并行分支在同一水平线上
        branchType: 'parallel_branch'
      };
    }

    // 如果是汇聚节点
    if (step.convergencePoint) {
      return {
        x: centerX,
        y: bottomY,
        branchType: 'convergence'
      };
    }

    // 默认情况（其他节点）
    return {
      x: centerX + index * 450,
      y: topY,
      branchType: 'default'
    };
  };

  // 🏗️ 计算架构图布局（垂直分层架构风格）
  const calculateArchitectureLayout = (step, index, steps, branchStructure) => {
    console.log(`🏗️ 开始计算架构图布局 - 节点 ${index}:`, step.title);

    // 🏗️ 架构图布局参数（垂直分层风格）
    const layerHeight = 500;     // 层级间垂直距离（大间距体现架构层次）
    const nodeSpacing = 280;     // 同层节点间水平距离
    const centerX = 800;         // 中心X坐标
    const startY = 120;          // 起始Y坐标

    // 🎯 分析架构层级（重新设计为垂直分层）
    const architectureLayers = analyzeArchitectureLayers(steps, index);
    const currentLayer = architectureLayers.layer;
    const nodesInLayer = architectureLayers.nodesInCurrentLayer;
    const indexInLayer = architectureLayers.indexInLayer;
    const totalLayers = architectureLayers.totalLayers;

    console.log(`🏗️ 节点 ${index} 架构层级分析: 层级=${currentLayer}/${totalLayers}, 同层节点数=${nodesInLayer.length}, 同层索引=${indexInLayer}`);

    // 📐 计算垂直位置（基于架构层级）
    let y = startY + (currentLayer * layerHeight);

    // 📐 计算水平位置（同层节点居中分布）
    let x;
    const totalNodesInLayer = nodesInLayer.length;

    if (totalNodesInLayer === 1) {
      // 🎯 单节点居中
      x = centerX;
    } else {
      // 🌟 多节点水平居中分布
      const totalWidth = (totalNodesInLayer - 1) * nodeSpacing;
      const leftmostX = centerX - totalWidth / 2;
      x = leftmostX + (indexInLayer * nodeSpacing);
    }

    // 🎨 根据架构层级类型添加微调
    const layerTypeOffset = getArchitectureLayerOffset(step, architectureLayers);
    x += layerTypeOffset.x;
    y += layerTypeOffset.y;

    console.log(`🏗️ 架构布局结果 - 节点 ${index}: 层级=${currentLayer}/${totalLayers}, 层级类型=${architectureLayers.layerType}, 同层位置=${indexInLayer}/${totalNodesInLayer}, 坐标=(${Math.round(x)}, ${Math.round(y)})`);

    return {
      x: Math.round(x),
      y: Math.round(y),
      layer: currentLayer,
      layerType: architectureLayers.layerType,
      indexInLayer: indexInLayer,
      totalInLayer: totalNodesInLayer,
      totalLayers: totalLayers
    };
  };

  // 🌳 计算层级化布局（全新设计）
  const calculateHierarchicalLayout = (step, index, steps, branchStructure) => {
    console.log(`🌳 开始计算层级化布局 - 节点 ${index}:`, step.title);

    // 🎯 分析所有节点的层级关系
    const nodeHierarchy = analyzeNodeHierarchy(steps, branchStructure);
    const currentNodeLevel = nodeHierarchy.levels[index] || 0;
    const nodesInCurrentLevel = nodeHierarchy.levelGroups[currentNodeLevel] || [];
    const indexInLevel = nodesInCurrentLevel.indexOf(index);

    // 📐 层级布局参数
    const levelHeight = 300;     // 层级间垂直距离
    const baseNodeSpacing = 250; // 同层节点间基础距离
    const startX = 200;          // 起始X坐标
    const startY = 150;          // 起始Y坐标

    console.log(`📊 节点 ${index} 层级分析: 层级=${currentNodeLevel}, 同层节点数=${nodesInCurrentLevel.length}, 同层索引=${indexInLevel}`);

    // 🎯 检查当前步骤是否为条件分支点
    const branchPoints = Array.isArray(branchStructure.branchPoints) ? branchStructure.branchPoints : [];
    const isConditionNode = branchPoints.some(bp => bp.stepIndex === index);

    // 📐 计算同层节点的水平分布
    const totalNodesInLevel = nodesInCurrentLevel.length;
    let x, y;

    if (totalNodesInLevel === 1) {
      // 🎯 单节点居中
      x = startX + 800; // 居中位置
    } else {
      // 🌟 多节点均匀分布
      const totalWidth = (totalNodesInLevel - 1) * baseNodeSpacing;
      const leftmostX = startX + 400; // 左边界
      x = leftmostX + (indexInLevel * baseNodeSpacing);
    }

    // 📏 计算垂直位置（基于层级）
    y = startY + (currentNodeLevel * levelHeight);

    // 🎨 根据节点类型添加微调
    const nodeTypeOffset = getNodeTypeLayoutOffset(step, isConditionNode);
    x += nodeTypeOffset.x;
    y += nodeTypeOffset.y;

    console.log(`🎯 层级布局结果 - 节点 ${index}: 层级=${currentNodeLevel}, 同层位置=${indexInLevel}/${totalNodesInLevel}, 最终坐标=(${Math.round(x)}, ${Math.round(y)})`);

    return {
      x: Math.round(x),
      y: Math.round(y),
      level: currentNodeLevel,
      indexInLevel: indexInLevel,
      totalInLevel: totalNodesInLevel,
      branchType: isConditionNode ? 'condition' : 'normal'
    };
  };

  // 🎨 获取节点类型布局偏移
  const getNodeTypeLayoutOffset = (step, isConditionNode) => {
    const nodeType = step.nodeType;
    let offsetX = 0;
    let offsetY = 0;

    // 根据节点类型添加细微偏移，增加视觉层次
    switch (nodeType) {
      case 'material-node':
        offsetX = -20;
        offsetY = -10;
        break;
      case 'execution-node':
        offsetX = 0;
        offsetY = 0;
        break;
      case 'condition-node':
        offsetX = 10;
        offsetY = 15;
        break;
      case 'result-node':
        offsetX = 20;
        offsetY = 10;
        break;
      default:
        offsetX = 0;
        offsetY = 0;
    }

    // 条件节点额外偏移
    if (isConditionNode) {
      offsetY += 20;
    }

    return { x: offsetX, y: offsetY };
  };

  // 🏗️ 检测分支类型（架构图专用）
  const detectBranchType = (step, index, steps, branchStructure) => {
    const totalSteps = steps.length;

    // 🌱 检测根节点（第一个节点）
    if (index === 0) {
      return { type: 'root', branchIndex: 0, totalBranches: 1 };
    }

    // 🔗 检测汇聚节点（最后几个节点或明确标记的汇聚点）
    if (index >= totalSteps - 2 || step.title?.includes('汇聚') || step.title?.includes('整合') || step.title?.includes('最终')) {
      return { type: 'convergence', branchIndex: 0, totalBranches: 1 };
    }

    // 🌿 检测分支起始节点
    const branchPoints = Array.isArray(branchStructure.branchPoints) ? branchStructure.branchPoints : [];
    const isBranchStart = branchPoints.some(bp => bp.stepIndex === index);
    if (isBranchStart) {
      return { type: 'branch_start', branchIndex: 0, totalBranches: branchPoints.length };
    }

    // 🍃 检测分支节点（根据步骤内容和位置）
    const branchKeywords = ['图片', '文档', '视频', '音频', '邮件', '报告', '创建', '生成', '分析', '处理'];
    const stepContent = `${step.title} ${step.description}`.toLowerCase();

    let branchIndex = 0;
    let totalBranches = 1;

    // 根据关键词确定分支类型
    if (stepContent.includes('图片') || stepContent.includes('image')) {
      branchIndex = 0;
      totalBranches = 4; // 图片、文档、视频、音频
    } else if (stepContent.includes('文档') || stepContent.includes('document')) {
      branchIndex = 1;
      totalBranches = 4;
    } else if (stepContent.includes('视频') || stepContent.includes('video')) {
      branchIndex = 2;
      totalBranches = 4;
    } else if (stepContent.includes('音频') || stepContent.includes('audio')) {
      branchIndex = 3;
      totalBranches = 4;
    } else if (stepContent.includes('邮件') || stepContent.includes('mail')) {
      branchIndex = 0;
      totalBranches = 2; // 邮件、报告
    } else if (stepContent.includes('报告') || stepContent.includes('report')) {
      branchIndex = 1;
      totalBranches = 2;
    } else {
      // 根据步骤位置估算分支
      const middleSteps = Math.floor(totalSteps * 0.3);
      const endSteps = Math.floor(totalSteps * 0.8);

      if (index >= middleSteps && index < endSteps) {
        branchIndex = (index - middleSteps) % 3;
        totalBranches = 3;
      }
    }

    return { type: 'branch_node', branchIndex, totalBranches };
  };

  // 🏗️ 获取架构图节点偏移
  const getArchitectureNodeOffset = (step, branchInfo) => {
    const nodeType = step.nodeType;
    let offsetX = 0;
    let offsetY = 0;

    // 根据分支类型调整偏移
    switch (branchInfo.type) {
      case 'root':
        offsetY = -20; // 根节点稍微上移
        break;
      case 'branch_start':
        offsetY = 10;
        break;
      case 'branch_node':
        // 分支节点根据分支索引添加轻微偏移，增加视觉层次
        offsetX = (branchInfo.branchIndex % 2 === 0) ? -15 : 15;
        offsetY = (branchInfo.branchIndex % 3) * 10;
        break;
      case 'convergence':
        offsetY = 20; // 汇聚节点稍微下移
        break;
    }

    // 根据节点类型添加额外偏移
    switch (nodeType) {
      case 'material-node':
        offsetX += -10;
        offsetY += -5;
        break;
      case 'condition-node':
        offsetX += 0;
        offsetY += 15;
        break;
      case 'result-node':
        offsetX += 10;
        offsetY += 5;
        break;
    }

    return { x: offsetX, y: offsetY };
  };

  // 🏗️ 分析架构层级（垂直分层专用）
  const analyzeArchitectureLayers = (steps, currentIndex) => {
    console.log('🏗️ 开始分析架构层级...');

    const totalSteps = steps.length;

    // 🎯 定义架构层级规则
    const getArchitectureLayer = (index, step) => {
      const stepContent = `${step.title} ${step.description}`.toLowerCase();

      // 🌱 输入层（第0层）：起始、准备、输入相关
      if (index === 0 ||
          stepContent.includes('准备') ||
          stepContent.includes('输入') ||
          stepContent.includes('开始') ||
          stepContent.includes('初始')) {
        return { layer: 0, type: 'input' };
      }

      // 🔗 输出层（最后层）：结果、输出、完成相关
      if (index >= totalSteps - 2 ||
          stepContent.includes('结果') ||
          stepContent.includes('输出') ||
          stepContent.includes('完成') ||
          stepContent.includes('最终') ||
          stepContent.includes('汇聚') ||
          stepContent.includes('整合')) {
        return { layer: 999, type: 'output' }; // 临时设为999，后面会调整
      }

      // 🔄 处理层：根据内容和位置确定层级
      const progressRatio = index / (totalSteps - 1);

      // 根据关键词确定处理层级
      if (stepContent.includes('架构') || stepContent.includes('设计')) {
        return { layer: 1, type: 'design' };
      } else if (stepContent.includes('开发') || stepContent.includes('实现')) {
        return { layer: 2, type: 'development' };
      } else if (stepContent.includes('测试') || stepContent.includes('验证')) {
        return { layer: 3, type: 'testing' };
      } else if (stepContent.includes('部署') || stepContent.includes('发布')) {
        return { layer: 4, type: 'deployment' };
      } else {
        // 根据位置分配到中间层
        const middleLayer = Math.floor(progressRatio * 3) + 1;
        return { layer: middleLayer, type: 'processing' };
      }
    };

    // 🎯 分析所有节点的层级
    const layerInfo = steps.map((step, index) => ({
      index,
      ...getArchitectureLayer(index, step)
    }));

    // 🔧 调整输出层为实际最后层
    const maxProcessingLayer = Math.max(...layerInfo.filter(info => info.type !== 'output').map(info => info.layer));
    const outputLayer = maxProcessingLayer + 1;
    layerInfo.forEach(info => {
      if (info.type === 'output') {
        info.layer = outputLayer;
      }
    });

    // 🎯 获取当前节点的层级信息
    const currentNodeInfo = layerInfo[currentIndex];
    const currentLayer = currentNodeInfo.layer;
    const layerType = currentNodeInfo.type;

    // 🎯 获取同层节点
    const nodesInCurrentLayer = layerInfo.filter(info => info.layer === currentLayer);
    const indexInLayer = nodesInCurrentLayer.findIndex(info => info.index === currentIndex);

    const totalLayers = outputLayer + 1;

    console.log(`🏗️ 架构层级分析完成: 总层数=${totalLayers}, 当前节点层级=${currentLayer}(${layerType}), 同层节点=${nodesInCurrentLayer.length}个`);

    return {
      layer: currentLayer,
      layerType: layerType,
      nodesInCurrentLayer: nodesInCurrentLayer,
      indexInLayer: indexInLayer,
      totalLayers: totalLayers,
      allLayerInfo: layerInfo
    };
  };

  // 🏗️ 获取架构层级偏移
  const getArchitectureLayerOffset = (step, architectureLayers) => {
    const nodeType = step.nodeType;
    const layerType = architectureLayers.layerType;
    let offsetX = 0;
    let offsetY = 0;

    // 根据架构层级类型调整偏移
    switch (layerType) {
      case 'input':
        offsetY = -30; // 输入层稍微上移
        break;
      case 'design':
        offsetY = -15;
        break;
      case 'development':
        offsetY = 0;
        break;
      case 'testing':
        offsetY = 15;
        break;
      case 'deployment':
        offsetY = 10;
        break;
      case 'output':
        offsetY = 30; // 输出层稍微下移
        break;
      default:
        offsetY = 0;
    }

    // 根据节点类型添加额外偏移
    switch (nodeType) {
      case 'material-node':
        offsetX += -20;
        offsetY += -10;
        break;
      case 'condition-node':
        offsetX += 0;
        offsetY += 20;
        break;
      case 'result-node':
        offsetX += 20;
        offsetY += 15;
        break;
      default:
        offsetX += 0;
    }

    // 同层多节点时添加轻微随机偏移，增加视觉层次
    if (architectureLayers.nodesInCurrentLayer.length > 1) {
      offsetY += (architectureLayers.indexInLayer % 2 === 0) ? -5 : 5;
    }

    return { x: offsetX, y: offsetY };
  };

  // 🔍 分析节点层级关系
  const analyzeNodeHierarchy = (steps, branchStructure) => {
    console.log('🔍 开始分析节点层级关系...');

    const levels = {}; // 节点索引 -> 层级
    const levelGroups = {}; // 层级 -> 节点索引数组
    const dependencies = {}; // 节点索引 -> 依赖的节点索引数组

    // 🎯 分析分支结构中的依赖关系
    const branchPoints = Array.isArray(branchStructure.branchPoints) ? branchStructure.branchPoints : [];

    // 初始化：所有节点默认为第0层
    steps.forEach((step, index) => {
      levels[index] = 0;
      dependencies[index] = [];
    });

    // 🌳 根据分支点分析层级关系
    branchPoints.forEach(branchPoint => {
      const branchIndex = branchPoint.stepIndex;
      const branches = branchPoint.branches || [];

      console.log(`🌳 分析分支点 ${branchIndex}:`, branchPoint);

      // 分支点本身保持当前层级
      const branchLevel = levels[branchIndex];

      // 分支点的所有子分支节点都在下一层级
      branches.forEach(branch => {
        const branchSteps = branch.steps || [];
        branchSteps.forEach((stepIndex, stepIndexInBranch) => {
          if (typeof stepIndex === 'number' && stepIndex < steps.length) {
            // 分支中的第一个节点在分支点的下一层级
            // 分支中的后续节点依次递增层级
            levels[stepIndex] = branchLevel + 1 + stepIndexInBranch;
            dependencies[stepIndex] = stepIndexInBranch === 0 ? [branchIndex] : [stepIndex - 1];

            console.log(`  📍 分支节点 ${stepIndex} -> 层级 ${levels[stepIndex]}, 依赖 [${dependencies[stepIndex].join(', ')}]`);
          }
        });
      });
    });

    // 🗂️ 按层级分组节点
    Object.keys(levels).forEach(nodeIndex => {
      const level = levels[nodeIndex];
      if (!levelGroups[level]) {
        levelGroups[level] = [];
      }
      levelGroups[level].push(parseInt(nodeIndex));
    });

    // 📊 输出层级分析结果
    Object.keys(levelGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
      console.log(`📊 层级 ${level}: [${levelGroups[level].join(', ')}] (${levelGroups[level].length}个节点)`);
    });

    return { levels, levelGroups, dependencies };
  };

  // 📏 计算线性布局
  const calculateLinearLayout = (index, nodeSpacing, startX, startY) => {
    const nodesPerRow = 4;
    const rowSpacing = 350; // 🔧 增加行间距从250到350像素，避免节点碰撞
    const col = index % nodesPerRow;
    const row = Math.floor(index / nodesPerRow);

    let x;
    if (row % 2 === 0) {
      // 偶数行：从左到右
      x = startX + col * nodeSpacing;
    } else {
      // 奇数行：从右到左
      x = startX + (nodesPerRow - 1 - col) * nodeSpacing;
    }

    return {
      x,
      y: startY + row * rowSpacing, // 🔧 使用变量而不是硬编码
      row,
      col,
      direction: row % 2 === 0 ? '从左到右' : '从右到左'
    };
  };

  // 🎯 智能节点类型分类函数
  const classifyNodeType = (step) => {
    const title = (step.title || '').toLowerCase();
    const description = (step.description || '').toLowerCase();
    const combined = `${title} ${description}`;

    // 条件判断节点
    if (combined.includes('条件') || combined.includes('判断') || combined.includes('检查') ||
        combined.includes('分支') || combined.includes('如果') || combined.includes('决定')) {
      return 'condition-node';
    }

    // 结果输出节点
    if (combined.includes('结果') || combined.includes('输出') || combined.includes('报告') ||
        combined.includes('汇总') || combined.includes('归档') || combined.includes('保存')) {
      return 'result-node';
    }

    // 材料收集节点
    if (combined.includes('收集') || combined.includes('获取') || combined.includes('导入') ||
        combined.includes('上传') || combined.includes('材料') || combined.includes('文件')) {
      return 'enhanced-material-node';
    }

    // 默认为执行节点
    return 'execution-node';
  };

  // 🌳 生成多分支树状连接（增强版）
  const generateBranchConnections = (steps, branchStructure) => {
    const connections = [];

    console.log('🔗 开始生成多分支树状连接:', branchStructure);

    if (branchStructure.type === 'conditional_tree') {
      // 🌳 多分支树状工作流连接逻辑
      return generateTreeBranchConnections(steps, branchStructure);
    } else if (branchStructure.type === 'parallel') {
      // 🔀 并行分支连接逻辑
      return generateParallelBranchConnections(steps, branchStructure);
    } else {
      // 📏 线性连接（包含简单条件节点处理）
      return generateLinearConnections(steps, branchStructure);
    }
  };

  // 🌳 生成树状分支连接
  const generateTreeBranchConnections = (steps, branchStructure) => {
    const connections = [];
    const { branchPoints } = branchStructure;

    console.log('🌳 生成树状分支连接，分支点数量:', branchPoints.length);

    // 1. 生成主干连接（非分支节点之间的线性连接）
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];

      // 检查当前步骤是否为分支点
      const currentBranchPoint = branchPoints.find(bp => bp.stepIndex === i);

      // 检查下一步骤是否为某个分支点的分支节点
      const nextIsBranchNode = branchPoints.some(bp =>
        bp.branches.some(b => b.stepIndex === i + 1)
      );

      if (currentBranchPoint) {
        // 🔀 条件节点 → 分支节点连接
        currentBranchPoint.branches.forEach((branch, branchIndex) => {
          const sourceNode = {
            id: `ai-step-${i + 1}`,
            type: 'condition-node',
            data: { label: currentStep.title, description: currentStep.description || '' }
          };

          const targetNode = {
            id: `ai-step-${branch.stepIndex + 1}`,
            type: classifyNodeType(steps[branch.stepIndex]),
            data: { label: branch.title, description: steps[branch.stepIndex].description || '' }
          };

          // 使用AI分支管理器创建智能分支连接
          const aiConnection = aiBranchManager.current.createAIBranchConnection(
            sourceNode,
            targetNode,
            {
              condition: currentStep.title,
              branchType: branch.branchType,
              branchIndex: branchIndex
            }
          );

          connections.push({
            source: aiConnection.source,
            target: aiConnection.target,
            sourceHandle: aiConnection.sourceHandle,
            targetHandle: aiConnection.targetHandle,
            connectionType: 'tree_condition_branch',
            aiGenerated: true,
            branchType: aiConnection.data.branchType,
            branchIndex: branchIndex,
            style: aiConnection.style
          });

          console.log(`🌿 创建分支连接: ${currentStep.title} → ${branch.title} (${branch.branchType}分支)`);
        });
      } else if (!nextIsBranchNode) {
        // 📏 普通线性连接（非分支节点之间）
        connections.push({
          source: `ai-step-${i + 1}`,
          target: `ai-step-${i + 2}`,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          connectionType: 'tree_linear'
        });

        console.log(`📏 创建线性连接: ${currentStep.title} → ${nextStep.title}`);
      }
    }

    // 2. 生成分支汇聚连接（分支节点 → 汇聚节点）
    branchPoints.forEach((branchPoint, bpIndex) => {
      const convergenceNodeIndex = findConvergenceNode(branchPoint, steps, branchPoints);

      if (convergenceNodeIndex !== -1) {
        branchPoint.branches.forEach((branch) => {
          connections.push({
            source: `ai-step-${branch.stepIndex + 1}`,
            target: `ai-step-${convergenceNodeIndex + 1}`,
            sourceHandle: 'right-source',
            targetHandle: 'left-target',
            connectionType: 'tree_convergence'
          });

          console.log(`🔄 创建汇聚连接: ${branch.title} → ${steps[convergenceNodeIndex].title}`);
        });
      }
    });

    return connections;
  };

  // 🔍 查找分支汇聚节点
  const findConvergenceNode = (branchPoint, steps, branchPoints) => {
    // 查找当前分支点后的第一个非分支节点作为汇聚点
    const maxBranchIndex = Math.max(...branchPoint.branches.map(b => b.stepIndex));

    for (let i = maxBranchIndex + 1; i < steps.length; i++) {
      // 检查这个节点是否是其他分支点的分支节点
      const isOtherBranchNode = branchPoints.some(bp =>
        bp !== branchPoint && bp.branches.some(b => b.stepIndex === i)
      );

      if (!isOtherBranchNode) {
        return i; // 找到汇聚节点
      }
    }

    return -1; // 没有找到汇聚节点
  };

  // 🔀 生成并行分支连接
  const generateParallelBranchConnections = (steps, branchStructure) => {
    const connections = [];
    
    console.log('🔀 生成并行分支连接，分支结构:', branchStructure);
    
    // 1. 创建基本的线性连接（每个步骤到下一个步骤）
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      const currentNodeType = classifyNodeType(currentStep);
      
      if (currentNodeType === 'condition-node') {
        // 条件节点的分支连接
        const sourceNode = {
          id: `ai-step-${i + 1}`,
          type: 'condition-node',
          data: { label: currentStep.title, description: currentStep.description || '' }
        };

        const targetNode = {
          id: `ai-step-${i + 2}`,
          type: classifyNodeType(nextStep),
          data: { label: nextStep.title, description: nextStep.description || '' }
        };

        // 创建AI分支连接
        const aiConnection = aiBranchManager.current?.createAIBranchConnection?.(
          sourceNode, targetNode, { 
            condition: currentStep.title,
            branchType: 'parallel' 
          }
        );

        if (aiConnection) {
          connections.push({
            id: `ai-edge-${i + 1}-${i + 2}`,
            source: aiConnection.source,
            target: aiConnection.target,
            sourceHandle: aiConnection.sourceHandle,
            targetHandle: aiConnection.targetHandle,
            type: 'smoothstep',
            animated: true,
            connectionType: 'parallel_condition',
            aiGenerated: true,
            style: {
              stroke: '#3b82f6',
              strokeWidth: 3,
              ...aiConnection.style
            }
          });
        } else {
          // 降级到简单连接
          connections.push({
            id: `ai-edge-${i + 1}-${i + 2}`,
            source: `ai-step-${i + 1}`,
            target: `ai-step-${i + 2}`,
            sourceHandle: 'right-source',
            targetHandle: 'left-target',
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#f59e0b',
              strokeWidth: 2
            }
          });
        }
      } else {
        // 普通执行节点的连接
        connections.push({
          id: `ai-edge-${i + 1}-${i + 2}`,
          source: `ai-step-${i + 1}`,
          target: `ai-step-${i + 2}`,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          type: 'smoothstep',
          animated: true,
          connectionType: 'parallel_linear',
          style: {
            stroke: '#10b981',
            strokeWidth: 2
          }
        });
      }
      
      console.log(`🔗 创建连接: ${currentStep.title} → ${nextStep.title}`);
    }
    
    // 2. 如果有明确的分支节点和汇聚节点，创建额外的分支连接
    if (branchStructure.branchNodes && branchStructure.convergenceNodes) {
      const { branchNodes, convergenceNodes } = branchStructure;
      
      // 为每个分支节点到汇聚节点创建连接
      branchNodes.forEach((branchNodeIndex, index) => {
        convergenceNodes.forEach((convergenceNodeIndex) => {
          if (branchNodeIndex < convergenceNodeIndex) {
            connections.push({
              id: `ai-branch-edge-${branchNodeIndex + 1}-${convergenceNodeIndex + 1}`,
              source: `ai-step-${branchNodeIndex + 1}`,
              target: `ai-step-${convergenceNodeIndex + 1}`,
              sourceHandle: 'right-source',
              targetHandle: 'left-target',
              type: 'smoothstep',
              animated: true,
              connectionType: 'parallel_convergence',
              style: {
                stroke: '#8b5cf6',
                strokeWidth: 2,
                strokeDasharray: '5,5'
              }
            });
            
            console.log(`🔄 创建汇聚连接: 步骤${branchNodeIndex + 1} → 步骤${convergenceNodeIndex + 1}`);
          }
        });
      });
    }
    
    console.log(`🎯 并行分支连接生成完成，共创建 ${connections.length} 个连接`);
    return connections;
  };

  // 📏 生成线性连接
  const generateLinearConnections = (steps, branchStructure) => {
    const connections = [];

    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      const currentNodeType = classifyNodeType(currentStep);

      if (currentNodeType === 'condition-node') {
        // 简单条件节点处理
        const sourceNode = {
          id: `ai-step-${i + 1}`,
          type: 'condition-node',
          data: { label: currentStep.title, description: currentStep.description || '' }
        };

        const targetNode = {
          id: `ai-step-${i + 2}`,
          type: classifyNodeType(nextStep),
          data: { label: nextStep.title, description: nextStep.description || '' }
        };

        const aiConnection = aiBranchManager.current.createAIBranchConnection(
          sourceNode, targetNode, { condition: currentStep.title }
        );

        connections.push({
          source: aiConnection.source,
          target: aiConnection.target,
          sourceHandle: aiConnection.sourceHandle,
          targetHandle: aiConnection.targetHandle,
          connectionType: 'linear_condition',
          aiGenerated: true,
          branchType: aiConnection.data.branchType,
          style: aiConnection.style
        });
      } else {
        connections.push({
          source: `ai-step-${i + 1}`,
          target: `ai-step-${i + 2}`,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          connectionType: 'linear'
        });
      }
    }

    return connections;
  };

  // 将AI生成的步骤转换为思维导图节点
  const convertAIStepsToMindmapNodes = useCallback((workflowData) => {
    console.log('🔧 开始转换AI步骤为思维导图节点:', workflowData);

    const steps = workflowData.steps || [];
    if (steps.length === 0) {
      throw new Error('没有找到可转换的步骤');
    }

    const nodes = [];
    const edges = [];

    // 树状图节点布局参数
    const nodeSpacing = 450; // 增加节点间距
    const startX = 150;
    const startY = 150;
    const staggerRange = 200; // 错开范围



    // 🚀 检测分支结构（新增逻辑）
    const branchStructure = detectBranchStructure(steps);
    console.log('🔍 检测到的分支结构:', branchStructure);

    // 为每个步骤创建节点
    steps.forEach((step, index) => {
      const nodeType = classifyNodeType(step);
      const nodeId = `ai-step-${index + 1}`;

      let x, y;

      // 🔥 根据分支结构选择布局算法
      if (branchStructure.layout === 'architecture') {
        // 🏗️ 架构图布局（专为多分支设计）
        const layout = calculateArchitectureLayout(step, index, steps, branchStructure);
        x = layout.x;
        y = layout.y;
        console.log(`🏗️ 架构图节点 ${nodeId} -> 类型 ${layout.branchType}, 分支 ${layout.branchIndex}, 位置 (${x}, ${y})`);
      } else if (branchStructure.type === 'conditional_tree' || branchStructure.type === 'conditional' || branchStructure.type === 'parallel') {
        // 🌳 多分支层级布局（重新设计）
        const layout = calculateHierarchicalLayout(step, index, steps, branchStructure);
        x = layout.x;
        y = layout.y;
        console.log(`🌳 层级分支节点 ${nodeId} -> 层级 ${layout.level}, 位置 (${x}, ${y}), 同层第${layout.indexInLevel + 1}个节点`);
      } else {
        // 📏 线性工作流：使用蛇形布局
        const layout = calculateLinearLayout(index, nodeSpacing, startX, startY);
        x = layout.x;
        y = layout.y;
        console.log(`🐍 线性节点 ${nodeId} -> 第${layout.row + 1}行第${layout.col + 1}列, 位置 (${x}, ${y}), 方向: ${layout.direction}`);
      }

      const node = {
        id: nodeId,
        type: 'customNode',
        position: { x, y },
        data: {
          label: step.title || `步骤 ${index + 1}`,
          nodeType: nodeType,
          description: step.description || '执行相关任务',
          // 🎯 分离AI模型和工具类型
          aiModel: step.aiModel || 'DeepSeek聊天模型', // AI模型始终默认为DeepSeek
          tool: step.tool || '智能工具', // 工具类型根据内容匹配
          aiGenerated: true,
          status: 'default',
          // 根据节点类型设置特定数据
          ...(nodeType === 'enhanced-material-node' && {
            inputType: 'file',
            selectedFiles: [],
            textContent: step.description || '',
            urlList: [],
            folderPath: '',
            batchProcessing: false,
            previewEnabled: true,
            maxFileSize: 100,
            allowedFormats: []
          }),
          ...(nodeType === 'execution-node' && {
            executionType: 'auto',
            // 🎯 执行节点特殊处理：AI模型和工具类型分离
            aiModel: step.aiModel || 'DeepSeek聊天模型', // AI模型字段
            toolType: step.tool || 'DeepSeek聊天模型', // 工具类型字段
            toolId: step.tool || 'default',
            parameters: step.parameters || {},
            executionDescription: step.description || '',
            inputContent: step.description || ''
          }),
          ...(nodeType === 'condition-node' && {
            conditionTypes: ['text'],
            conditionConfigs: {
              text: {
                leftOperand: '输入',
                operator: 'contains',
                rightOperand: '条件'
              }
            },
            trueOutput: '条件满足时继续处理',
            falseOutput: '条件不满足时跳过'
          }),
          ...(nodeType === 'result-node' && {
            outputFormat: 'text',
            selectedCategory: 'document',
            result: '',
            inputSources: [],
            storagePath: '',
            autoSave: true,
            compressionEnabled: false,
            encryptionEnabled: false
          })
        }
      };

      nodes.push(node);
      console.log(`🎯 创建${nodeType}节点: ${step.title}`);
    });

    // 🚀 根据分支结构创建智能连接线
    const aiConnections = generateBranchConnections(steps, branchStructure);
    console.log('🔗 生成的分支连接:', aiConnections);

    return {
      nodes,
      edges: aiConnections, // 直接使用生成的连接作为edges
      aiConnections, // 保留AI连接参数，供后续处理
      title: `AI工作流: ${workflowData.userInput?.substring(0, 30) || '智能生成'}...`,
      description: `包含 ${steps.length} 个步骤的AI生成工作流`
    };
  }, []);

  // 为ChatBox提供显示思维导图的方法
  handleSendMessage.showMindmap = useCallback((mindmapData) => {
    try {
      console.log('🧠 显示思维导图:', mindmapData);

      // 清空当前画布
      setNodes([]);
      setEdges([]);

      // 添加思维导图节点
      if (mindmapData.nodes && mindmapData.nodes.length > 0) {
        setNodes(mindmapData.nodes);
      }

      // 🎯 处理AI工作流连接：模拟用户手动连接过程
      if (mindmapData.aiConnections && mindmapData.aiConnections.length > 0) {
        console.log('🤖 开始处理AI工作流连接，模拟用户手动连接过程');

        // 延迟处理连接，确保节点已经渲染完成
        setTimeout(() => {
          mindmapData.aiConnections.forEach((connectionParams, index) => {
            setTimeout(() => {
              console.log(`🔗 模拟用户连接 ${index + 1}/${mindmapData.aiConnections.length}:`, connectionParams);

              // 模拟用户手动连接，触发智能连接算法
              onConnect(connectionParams);
            }, index * 100); // 每个连接间隔100ms，避免冲突
          });
        }, 200); // 等待节点渲染完成
      } else if (mindmapData.edges && mindmapData.edges.length > 0) {
        // 如果没有AI连接参数，使用传统的边设置方式
        setEdges(mindmapData.edges);
      }

      // 更新当前思维导图信息
      setCurrentMindmap({
        id: null,
        title: mindmapData.title || '智能生成的思维导图',
        description: mindmapData.description || '通过AI对话生成的思维导图',
        isNew: true,
        lastSaved: null
      });

      // 显示成功提示
      showToast('思维导图已成功生成！', 'success');

      // 自动适应视图
      setTimeout(() => {
        if (reactFlowInstanceFunctions?.fitView) {
          reactFlowInstanceFunctions.fitView({ padding: 0.1 });
        }
      }, 100);

    } catch (error) {
      console.error('❌ 显示思维导图失败:', error);
      showToast('显示思维导图失败', 'error');
    }
  }, [setNodes, setEdges, setCurrentMindmap, showToast, reactFlowInstanceFunctions, onConnect]);

  // 为ChatBox提供onConnect函数，用于创建连接线
  handleSendMessage.onConnect = onConnect;

  const showValidationAlert = () => {
    const alertMessage = validationSuggestions.map(s => s.suggestion_text).join('\n\n');
    alert(`逻辑检查建议：\n\n${alertMessage}`);
  };

  const handleUpdateNodeData = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // Create a new data object to ensure React detects the change
          const newNodeData = {
            ...node.data,
            ...newData,
          };
  
          // If arguments are being updated, we need to merge them carefully
          if (newData.arguments) {
            newNodeData.arguments = {
              ...node.data.arguments,
              ...newData.arguments,
            };
          }
  
          return {
            ...node,
            data: newNodeData,
          };
        }
        return node;
      })
    );
  };

  const handleNodeLabelUpdate = (nodeId, newLabel) => {
    handleUpdateNodeData(nodeId, { label: newLabel });
  };


  const onAddChild = () => {
    if (!selectedNodeId) {
      alert("Please select a node to add a child to.");
      return;
    }
    const parentId = selectedNodeId;
    const newId = generateId();
    const parentNode = nodes.find(n => n.id === parentId);
    const newNode = {
      id: newId,
      type: 'customNode',
      data: { label: `新子主题`, nodeType: 'sub-topic-node' },
      position: { x: parentNode.position.x, y: parentNode.position.y + 150 },
      parentNode: parentId,
    };
    const newEdge = { id: `e${parentId}-${newId}`, source: parentId, target: newId, type: 'smoothstep' };
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));
  };


  const EditModal = ({ node, onSave, onCancel }) => {
    // Hooks must be called at the top level of the component.
    const [editedArgs, setEditedArgs] = useState(null);
    const [editedLabel, setEditedLabel] = useState('');

    // It's safe to call hooks before this check.
    useEffect(() => {
        if (node) {
            setEditedArgs(node.data.arguments || {});
            setEditedLabel(node.data.label);
        }
    }, [node]);

    if (!node) return null;

    const handleArgChange = (key, value) => {
      setEditedArgs(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
      const updates = {
        label: editedLabel,
      };
      if (node.data.arguments && Object.keys(node.data.arguments).length > 0) {
        updates.arguments = editedArgs;
      }
      onSave(node.id, updates);
      onCancel(); // Close modal on save
    };

    return (
      <div className="edit-modal-overlay">
        <div className="edit-modal">
          <h3>编辑节点: {node.id}</h3>
          <div className="form-group">
            <label>标签</label>
            <input
              type="text"
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
            />
          </div>
          {editedArgs && Object.keys(editedArgs).map(key => (
            <div className="form-group" key={key}>
              <label>{key}</label>
              <textarea
                value={editedArgs[key] || ''}
                onChange={(e) => handleArgChange(key, e.target.value)}
                rows={Math.max(2, String(editedArgs[key] || '').split('\n').length)}
              />
            </div>
          ))}
          <div className="modal-actions">
            <button onClick={handleSave}>Save</button>
            <button onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  // 添加键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event) => {
      // 检查是否在输入框中，如果是则不处理快捷键
      const isInputFocused = document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
         document.activeElement.tagName === 'TEXTAREA' ||
         document.activeElement.contentEditable === 'true');

      if (isInputFocused) return;

      // 如果工作流被锁定，只允许保存快捷键，禁用其他所有快捷键
      if (isWorkflowLocked && !(event.ctrlKey && event.key === 's')) {
        return;
      }

      // Ctrl+S 保存
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+O 打开
      if (event.ctrlKey && event.key === 'o') {
        event.preventDefault();
        handleOpenClick();
        return;
      }

      // Ctrl+N 新建
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        handleNewMindMap();
        return;
      }

      // 只在思维导图页面处理以下快捷键
      if (currentPage !== 'mindmap') return;

      // Ctrl+1 插入材料节点
      if (event.ctrlKey && event.key === '1') {
        event.preventDefault();
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'customNode',
          position: { x: 400, y: 300 },
          data: {
            label: '材料节点',
            nodeType: 'material-node',
            inputType: 'file',
            selectedFiles: [],
            textContent: '',
            urlList: [],
            folderPath: '',
            batchProcessing: false,
            previewEnabled: true,
            maxFileSize: 100,
            allowedFormats: []
          }
        };
        setNodes((nds) => [...nds, newNode]);
        saveMindmapData();
        return;
      }

      // Ctrl+2 插入执行节点
      if (event.ctrlKey && event.key === '2') {
        event.preventDefault();
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'execution-node',
          position: { x: 400, y: 350 },
          data: { label: '执行', nodeType: 'execution-node' }
        };
        setNodes((nds) => [...nds, newNode]);
        saveMindmapData();
        return;
      }

      // Ctrl+3 插入条件节点
      if (event.ctrlKey && event.key === '3') {
        event.preventDefault();
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'condition-node',
          position: { x: 400, y: 400 },
          data: { label: '条件判断', nodeType: 'condition-node' }
        };
        setNodes((nds) => [...nds, newNode]);
        saveMindmapData();
        return;
      }

      // Ctrl+4 插入结果节点
      if (event.ctrlKey && event.key === '4') {
        event.preventDefault();
        const newNode = {
          id: `node_${Date.now()}`,
          type: 'result-node',
          position: { x: 400, y: 450 },
          data: { label: '结果汇总', nodeType: 'result-node' }
        };
        setNodes((nds) => [...nds, newNode]);
        saveMindmapData();
        return;
      }

      // F 适应视图
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        if (reactFlowInstanceFunctions?.fitView) {
          reactFlowInstanceFunctions.fitView({ padding: 0.2, duration: 600 });
        }
        return;
      }

      // Ctrl+A 展开/折叠所有主题
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        toggleAllNodesVisibility();
        return;
      }

      // Ctrl+C 复制节点
      if (event.ctrlKey && event.key === 'c' && selectedNodeId) {
        event.preventDefault();
        copyNodes();
        return;
      }

      // Ctrl+X 剪切节点
      if (event.ctrlKey && event.key === 'x' && selectedNodeId) {
        event.preventDefault();
        cutNodes();
        return;
      }

      // Ctrl+V 粘贴节点
      if (event.ctrlKey && event.key === 'v' && copiedElements) {
        event.preventDefault();
        pasteNodes(selectedNodeId);
        return;
      }

      // Delete 删除节点
      if (event.key === 'Delete' && selectedNodeId) {
        event.preventDefault();
        deleteNode(selectedNodeId);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveMindmapData, showToast, currentPage, selectedNodeId, reactFlowInstanceFunctions,
      toggleAllNodesVisibility, copyNodes, cutNodes, pasteNodes, copiedElements,
      deleteNode, setNodes, handleSave, handleOpenClick, handleNewMindMap, isWorkflowLocked]);

  // 认证处理函数
  const handleLogin = useCallback((loginData) => {
    setIsAuthenticated(true);
    setUser(loginData.user);
    localStorage.setItem('access_token', loginData.access_token);
    localStorage.setItem('user_info', JSON.stringify(loginData.user));
  }, []);

  const handleLogout = useCallback(() => {
    // 先获取token，然后再清除
    const token = localStorage.getItem('access_token');

    // 清除本地状态
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('userInfo'); // 也清除这个

    // 调用后端登出API（如果有token的话）
    if (token) {
      fetch('/api/security/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(err => console.log('Logout API call failed:', err));
    }
  }, []);

  // 如果用户未认证，显示认证模态框
  if (!isAuthenticated) {
    return <AuthModal onLogin={handleLogin} />;
  }

  return (
    <UserProvider>
      <div className={`App ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isChatBoxCollapsed ? 'chatbox-collapsed' : ''} ${!isToolLibraryVisible ? 'tool-library-collapsed' : ''}`}>
      <div className="App-header">
        <div className="header-left">
          {validationSuggestions.length > 0 && (
            <button className="icon-button validation-alert" onClick={showValidationAlert} title="发现逻辑问题">
              <span className="icon">⚠️</span>
            </button>
          )}
          <span className="document-title">我的思维导图</span>
          {lastLocalSave && (
            <span className="save-status" title={`最后保存: ${new Date(lastLocalSave).toLocaleString()}`}>
              💾 已保存
            </span>
          )}
        </div>
        <div className="header-right">
          <button
            className="ai-workflow-btn"
            onClick={() => setShowAIWorkflowModal(true)}
            title="AI工作流构建器"
          >
            🚀 AI工作流
          </button>
          {/* 动态运行/取消/重置按钮 */}
          <button
            className={`icon-button ${isWorkflowLocked ? 'cancel-button' : ''}`}
            onClick={
              isWorkflowLocked 
                ? handleCancelWorkflow 
                : (hasWorkflowExecuted() ? resetWorkflowState : handleRunWorkflowStream)
            }
            disabled={isWorkflowLocked && loadingState !== 'executing'}
            title={isWorkflowLocked ? '取消执行' : (hasWorkflowExecuted() ? '重置到初始状态' : '开始执行')}
          >
            <span className="icon">{isWorkflowLocked ? '⏹️' : (hasWorkflowExecuted() ? '🔄' : '▶️')}</span>
            {isWorkflowLocked ? '取消' : (hasWorkflowExecuted() ? '重置' : '运行')}
          </button>
          <button
            className="icon-button"
            onClick={handleNewMindMap}
            title="新建 (Ctrl+N)"
            disabled={isWorkflowLocked}
          >
            <span className="icon">📄</span>
            新建 (Ctrl+N)
          </button>
          <button
            className="icon-button"
            onClick={() => setCurrentPage('templates')}
            title="选择模板"
            disabled={isWorkflowLocked}
          >
            <span className="icon">🎨</span>
            模板
          </button>
          <button
            className="icon-button"
            onClick={() => setIsNodePropertiesVisible(!isNodePropertiesVisible)}
            title="节点属性和数据映射"
            disabled={isWorkflowLocked}
          >
            <span className="icon">🔗</span>
            数据映射
          </button>

          <button className="icon-button" onClick={() => setCurrentPage('outline')}>
            <span className="icon">📑</span>
            大纲
          </button>
          
          <button className="icon-button" onClick={() => {
            console.log('打开状态跟踪');
            setIsStatusTrackingVisible(true);
          }}>
            <span className="icon">📊</span>
            状态跟踪
          </button>
          {currentPage !== 'mindmap' && (
            <button
              className="icon-button return-to-mindmap"
              onClick={() => {
                console.log('返回思维导图页面');
                setCurrentPage('mindmap');
              }}
              title="返回到思维导图并恢复之前的视图状态"
            >
              <span className="icon">🗺️</span>
            回到视图
            </button>
          )}
        </div>
      </div>
      <div className="app-body">
        {/* 当侧边栏收起时显示的浮动控制按钮 */}
        {isSidebarCollapsed && (
          <div className="floating-controls">
            <button
              className="floating-control-button sidebar-expand-btn"
              onClick={toggleSidebar}
              title="展开侧边栏"
            >
              ☰
            </button>
          </div>
        )}
        {!isSidebarCollapsed && (
          <Sidebar
            onAddNode={addNode}
            onAddSiblingNode={addSiblingNode}
            onDeleteNode={deleteNode}
            onAddParentNode={addParentNode}
            onCopyNodes={copyNodes}
            onPasteNodes={pasteNodes}
            onCutNodes={cutNodes}
            onDuplicateNode={duplicateNode}
            onToggleAllNodesVisibility={toggleAllNodesVisibility}
            onCenterMainTopic={centerMainTopic}
            isAllCollapsed={isAllCollapsed}
            selectedNodeId={selectedNodeId}
            copiedElements={copiedElements}
            onNavigate={handleNavigate}
            onToggleSidebar={toggleSidebar}
            onToggleChatBox={toggleChatBox}
            isChatBoxCollapsed={isChatBoxCollapsed}
          />
        )}
        <div className="main-content">
          {/* 模板市场 - 显示在导航栏下面 */}
          {currentPage === 'templates' && (
            <div className="template-marketplace-below-nav">
              <TemplateMarketplace
                isOpen={true}
                onClose={() => setCurrentPage('mindmap')}
                onSelectTemplate={handleSelectTemplate}
                currentNodes={nodes}
                currentEdges={edges}
              />
            </div>
          )}
        
        {currentPage === 'mindmap' ? (
            <>
          <ReactFlowProvider>
            <MindMapFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChangeInternal}
              onEdgesChange={onEdgesChangeInternal}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              nodeTypes={customNodeTypes}
              onNodeContextMenu={onNodeContextMenu}
              onPaneContextMenu={onPaneContextMenu}
              onPaneClick={onPaneClick}
              onNodeClick={onNodeClick}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onFlowReady={onFlowReady}
              reactFlowWrapperRef={reactFlowWrapper}
              toggleSidebar={toggleSidebar}
              toggleChatBox={toggleChatBox}
              isSidebarCollapsed={isSidebarCollapsed}
              isChatBoxCollapsed={isChatBoxCollapsed}
              currentPage={currentPage}
              setNodes={setNodes}
              saveMindmapData={saveMindmapData}
              setIsShortcutHelpVisible={setIsShortcutHelpVisible}
              onEdgeClick={handleEdgeClick}
              onDeleteEdge={handleDeleteEdge}
              onReverseEdge={handleReverseEdge}
              selectedEdgeId={selectedEdgeId}
              isWorkflowLocked={isWorkflowLocked}
            />
            {contextMenu && reactFlowInstanceFunctions && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onAddSibling={() => addSiblingNode(contextMenu.nodeId)}
                onAddChild={addNode}
                onDeleteNode={() => deleteNode(contextMenu.nodeId)}
                onClose={onCloseContextMenu}
                selectedNodeId={contextMenu.nodeId}
                onZoomIn={reactFlowInstanceFunctions.zoomIn}
                onZoomOut={reactFlowInstanceFunctions.zoomOut}
                onCenterMainTopic={centerMainTopic}
                onToggleAllNodesVisibility={toggleAllNodesVisibility}
                isAllCollapsed={isAllCollapsed}
                addParentNode={addParentNode}
                copyNodes={copyNodes}
                pasteNodes={() => pasteNodes(contextMenu.nodeId)}
                cutNodes={cutNodes}
                duplicateNode={duplicateNode}
                copiedElements={copiedElements}
                screenToFlowPosition={reactFlowInstanceFunctions.screenToFlowPosition}
              />
            )}
          </ReactFlowProvider>
              {!isChatBoxCollapsed && (
                <ChatBox
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  loadingState={loadingState}
                  onClose={toggleChatBox}
                  className="mindmap-chatbox"
                />
              )}

              {/* 右侧状态跟踪面板 - 条件显示 */}
              {isStatusTrackingVisible && (
                <div id="status-tracking-panel" className={`status-tracking-panel ${!isChatBoxCollapsed ? 'adjust-for-chatbox' : ''}`}>
                  <StatusTrackingPanel
                    isOpen={true}
                    onClose={hideStatusTracking}
                    nodes={nodes}
                    edges={edges}
                    workflowExecutionStatus={workflowExecutionStatus}
                    executionResults={executionResults}
                  />
                </div>
              )}

              {/* 节点属性面板 - 条件显示 */}
              {isNodePropertiesVisible && (
                <div className={`node-properties-container ${!isChatBoxCollapsed ? 'adjust-for-chatbox' : ''}`}>
                  <NodePropertiesPanel
                    selectedNode={selectedNode}
                    nodeTypesConfig={{}}
                    nodes={nodes}
                    edges={edges}
                    executionResults={executionResults}
                    onNodeUpdate={handleNodeUpdate}
                    onClose={closeNodeProperties}
                  />
                </div>
              )}

              {/* 工具库 */}
              {isToolLibraryVisible && (
                <ToolLibrary onClose={toggleToolLibrary} isChatBoxCollapsed={isChatBoxCollapsed} className={!isChatBoxCollapsed ? 'adjust-for-chatbox' : ''} />
              )}



              {/* 工具库切换按钮 */}
              <button
                className={`tool-library-toggle-btn ${isToolLibraryVisible ? 'expanded' : 'collapsed'} ${!isChatBoxCollapsed ? 'adjust-for-chatbox' : ''}`}
                onClick={toggleToolLibrary}
                title="工具库"
              >
                🔧
              </button>
              {isChatBoxCollapsed && (
                <div
                  className="chatbox-floating-container"
                  style={{
                    left: `${floatingButtonPosition.x}px`,
                    top: `${floatingButtonPosition.y}px`,
                    right: 'auto',
                    transform: 'none'
                  }}
                >
                  <button
                    className={`chatbox-expand-button-floating ${isDragging ? 'dragging' : ''}`}
                    onClick={toggleChatBox}
                    onMouseDown={handleMouseDown}
                    title="展开AI聊天 (可拖拽移动)"
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  >
                    <div className="floating-button-logo">
                      {/* 这里将来可以替换为实际的logo图片 */}
                      <span className="logo-placeholder">AI</span>
                    </div>
                  </button>
                </div>
              )}
            </>
        ) : currentPage === 'state-demo' ? (
            <StateManagementDemo workflowId={currentWorkflowId} />
        ) : currentPage !== 'templates' ? (
            <InfoPage
              pageType={currentPage}
              onNewMindMap={handleNewMindMap}
            />
        ) : null}
        
        {/* 在非思维导图页面也显示聊天框 */}
        {currentPage !== 'mindmap' && (
          <>
            {/* 聊天框 - 在其他页面也显示 */}
            {!isChatBoxCollapsed && (
              <ChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                onClose={toggleChatBox}
              />
            )}
            {isChatBoxCollapsed && (
              <div
                className="chatbox-floating-container"
                style={{
                  left: `${floatingButtonPosition.x}px`,
                  top: `${floatingButtonPosition.y}px`,
                  right: 'auto',
                  transform: 'none'
                }}
              >
                <button
                  className={`chatbox-expand-button-floating ${isDragging ? 'dragging' : ''}`}
                  onClick={toggleChatBox}
                  onMouseDown={handleMouseDown}
                  title="展开AI聊天 (可拖拽移动)"
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  <div className="floating-button-logo">
                    {/* 这里将来可以替换为实际的logo图片 */}
                    <span className="logo-placeholder">AI</span>
                  </div>
                </button>
              </div>
            )}
          </>
        )}
        </div>


        {/* 抓取结果按钮 */}
        {executionContextState && (
          <button
            style={{ position: 'fixed', right: '12px', bottom: '80px', zIndex: 1002 }}
            onClick={() => setShowResultPanel((v) => !v)}
          >
            抓取结果
          </button>
        )}
        {showResultPanel && (
          <ResultPanel context={executionContextState} onClose={() => setShowResultPanel(false)} />
        )}

        {/* 快捷键帮助弹窗 */}
        {isShortcutHelpVisible && (
          <div className="shortcut-help-overlay" onClick={() => setIsShortcutHelpVisible(false)}>
            <div className="shortcut-help-modal" onClick={(e) => e.stopPropagation()}>
              <div className="shortcut-help-header">
                <h2>⌨️ 快捷键帮助</h2>
                <button
                  className="shortcut-help-close"
                  onClick={() => setIsShortcutHelpVisible(false)}
                >
                  ✕
                </button>
              </div>
              <div className="shortcut-help-content">
                <div className="shortcut-section">
                  <h3>🗂️ 文件操作</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + N</span>
                    <span className="shortcut-desc">新建思维导图</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + S</span>
                    <span className="shortcut-desc">保存思维导图</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + O</span>
                    <span className="shortcut-desc">打开思维导图</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h3>➕ 插入节点</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + 1</span>
                    <span className="shortcut-desc">插入材料节点</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + 2</span>
                    <span className="shortcut-desc">插入执行节点</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + 3</span>
                    <span className="shortcut-desc">插入条件节点</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + 4</span>
                    <span className="shortcut-desc">插入结果节点</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h3>✂️ 编辑操作</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + C</span>
                    <span className="shortcut-desc">复制选中节点</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + X</span>
                    <span className="shortcut-desc">剪切选中节点</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + V</span>
                    <span className="shortcut-desc">粘贴节点</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Delete</span>
                    <span className="shortcut-desc">删除选中节点</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h3>👁️ 视图操作</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">F</span>
                    <span className="shortcut-desc">适应视图</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl + A</span>
                    <span className="shortcut-desc">展开/折叠所有主题</span>
                  </div>
                </div>

                <div className="shortcut-tips">
                  <p>💡 <strong>提示：</strong>在编辑文本时，快捷键会自动禁用，避免冲突。</p>
                  <p>🎯 <strong>右键菜单：</strong>在空白区域或节点上右键可查看更多选项。</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="application/json,.json"
      />

      {/* 执行控制台已移除 - 使用流程线状态显示 */}

            {/* Validation Alert */}
            {validationSuggestions.length > 0 && (
                <div className="validation-alert" onClick={showValidationAlert}>
                    <span className="validation-icon">⚠️</span>
                    <span className="validation-message">发现逻辑问题</span>
                </div>
            )}
            
            {/* NEW: Execution Result Toast */}
            {executionResult && (
                <div className={`execution-toast ${executionResult.type}`} onClick={() => setExecutionResult(null)}>
                    {executionResult.message}
                </div>
            )}



            {/* 保存对话框 */}
            {showSaveDialog && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h3>保存思维导图</h3>
                  <div className="form-group">
                    <label>标题</label>
                    <input
                      type="text"
                      value={saveDialogData.title}
                      onChange={(e) => setSaveDialogData(prev => ({
                        ...prev,
                        title: e.target.value
                      }))}
                      placeholder="请输入思维导图标题"
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>描述（可选）</label>
                    <textarea
                      value={saveDialogData.description}
                      onChange={(e) => setSaveDialogData(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="请输入思维导图描述"
                      rows={3}
                    />
                  </div>
                  <div className="modal-actions">
                    <button
                      onClick={handleSaveDialogConfirm}
                      disabled={!saveDialogData.title.trim()}
                      className="btn-primary"
                    >
                      保存
                    </button>
                    <button onClick={handleSaveDialogCancel} className="btn-secondary">
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}






      </div>

      {/* AI工作流浮窗 */}
      {showAIWorkflowModal && (
        <AIWorkflowModal
          isOpen={showAIWorkflowModal}
          onClose={() => setShowAIWorkflowModal(false)}
          onWorkflowGenerated={(workflowData) => {
            // 工作流生成完成后的处理
            console.log('🚀 工作流生成完成:', workflowData);

            try {
              // 将AI生成的步骤转换为思维导图节点
              const mindmapData = convertAIStepsToMindmapNodes(workflowData);
              console.log('🎯 转换后的思维导图数据:', mindmapData);

              // 清空当前画布
              setNodes([]);
              setEdges([]);

              // 添加新的节点和连接
              if (mindmapData.nodes && mindmapData.nodes.length > 0) {
                setNodes(mindmapData.nodes);
              }

              // 🎯 处理AI工作流连接：使用智能连接系统
              if (mindmapData.aiConnections && mindmapData.aiConnections.length > 0) {
                console.log('🤖 开始处理AI工作流连接，使用智能连接系统');

                // 🔧 使用业界最佳实践：useRef技巧解决React闭包问题
                const processAIConnections = () => {
                  // 使用nodesRef获取最新的节点状态，避免闭包问题
                  const currentNodes = nodesRef.current;

                  console.log('🔍 检查节点状态:', {
                    expectedNodes: mindmapData.nodes.length,
                    actualNodes: currentNodes.length,
                    nodeIds: currentNodes.map(n => n.id)
                  });

                  // 如果节点状态还没有更新，继续等待
                  if (currentNodes.length !== mindmapData.nodes.length) {
                    console.log('⏳ 节点状态还未完全更新，继续等待...');
                    setTimeout(processAIConnections, 50);
                    return;
                  }

                  console.log('✅ 节点状态已更新，开始智能连接处理');

                  // 逐个处理连接，使用智能连接系统
                  mindmapData.aiConnections.forEach((connectionParams, index) => {
                    setTimeout(() => {
                      console.log(`🔗 智能连接 ${index + 1}/${mindmapData.aiConnections.length}:`, connectionParams);

                      // 🎯 使用智能连接系统，现在节点状态已经更新
                      onConnect(connectionParams);
                    }, index * 100); // 每个连接间隔100ms，避免冲突
                  });
                };

                // 开始处理连接，给节点渲染一些时间
                setTimeout(processAIConnections, 200);
              } else if (mindmapData.edges && mindmapData.edges.length > 0) {
                // 如果没有AI连接参数，使用传统的边设置方式
                setEdges(mindmapData.edges);
              }

              // 更新当前思维导图信息
              setCurrentMindmap({
                id: null,
                title: `AI工作流: ${workflowData.userInput?.substring(0, 30) || '智能生成'}...`,
                description: `基于"${workflowData.userInput}"生成的智能工作流，包含${mindmapData.nodes.length}个节点`,
                isNew: true,
                lastSaved: null
              });

              // 显示成功提示
              showToast(`✅ 工作流已生成！包含${mindmapData.nodes.length}个节点`, 'success');

              // 自动适应视图
              setTimeout(() => {
                if (reactFlowInstanceFunctions?.fitView) {
                  reactFlowInstanceFunctions.fitView({ padding: 0.1 });
                }
              }, 100);

            } catch (error) {
              console.error('❌ 转换工作流失败:', error);
              showToast(`转换工作流失败: ${error.message}`, 'error');
            }

            // 自动关闭浮窗
            setShowAIWorkflowModal(false);
          }}
        />
      )}


    </UserProvider>
  );
}

export default App;