import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import './FlowLineSystem.css';

/**
 * 增强的流程线系统 - 提供沉浸式的连线体验
 * 特点：
 * 1. 遵从用户拖拽方向，连线方向与拖拽方向完全一致
 * 2. 丝滑的动画效果和视觉反馈
 * 3. 智能的连接点检测和路径优化
 * 4. 沉浸式的交互体验
 */

// 流程线状态枚举
export const FlowLineStatus = {
  IDLE: 'idle',
  CONNECTING: 'connecting', 
  CONNECTED: 'connected',
  EXECUTING: 'executing',
  SUCCESS: 'success',
  ERROR: 'error'
};

// 连接方向枚举
export const ConnectionDirection = {
  AUTO: 'auto',
  FORWARD: 'forward',   // 正向：从source到target
  BACKWARD: 'backward', // 反向：从target到source
  BIDIRECTIONAL: 'bidirectional' // 双向
};

/**
 * 增强的流程线组件
 */
export const EnhancedFlowLine = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data = {},
  markerEnd,
  selected,
  animated = false,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [connectionStrength, setConnectionStrength] = useState(1);
  const lineRef = useRef(null);

  // 获取贝塞尔路径
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 计算连接强度（基于距离和角度）
  const calculateConnectionStrength = useCallback(() => {
    const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
    const normalizedDistance = Math.min(distance / 300, 1); // 300px为基准距离
    return Math.max(0.3, 1 - normalizedDistance * 0.7); // 保持最小30%强度
  }, [sourceX, sourceY, targetX, targetY]);

  // 根据状态和用户交互确定样式
  const getFlowLineStyle = useCallback(() => {
    const strength = connectionStrength;

    // 检测条件分支类型
    const isConditionTrueBranch = data.branchType === 'condition-true' || data.sourceHandle === 'left-true';
    const isConditionFalseBranch = data.branchType === 'condition-false' || data.sourceHandle === 'right-false';

    // 根据分支类型确定默认颜色（移除AI生成的特殊处理）
    let defaultColor = '#7c3aed'; // 默认紫色
    if (isConditionTrueBranch) {
      defaultColor = '#0ba875'; // True分支 - RGB(11,168,117)
    } else if (isConditionFalseBranch) {
      defaultColor = '#5b6472'; // False分支 - RGB(91,100,114)
    }

    const baseStyle = {
      strokeWidth: 2 + strength,
      stroke: data.color || defaultColor,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      // 恢复虚线样式
      strokeDasharray: '16 12',
      ...style,
    };

    // 连接中状态 - 实时跟随用户拖拽
    if (data.status === FlowLineStatus.CONNECTING) {
      return {
        ...baseStyle,
        strokeWidth: 3,
        stroke: '#60a5fa',
        strokeDasharray: '8 4',
        filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.6))',
        animation: 'flow-connecting 1s linear infinite',
      };
    }

    // 执行中状态 - 能量流动效果
    if (data.status === FlowLineStatus.EXECUTING) {
      return {
        ...baseStyle,
        strokeWidth: 4,
        stroke: '#10b981',
        strokeDasharray: '12 6',
        filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.8))',
        animation: 'flow-executing 0.8s linear infinite',
      };
    }

    // 成功状态
    if (data.status === FlowLineStatus.SUCCESS) {
      return {
        ...baseStyle,
        stroke: '#10b981',
        strokeWidth: 2,
        filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))',
      };
    }

    // 错误状态
    if (data.status === FlowLineStatus.ERROR) {
      return {
        ...baseStyle,
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDasharray: '6 3',
        filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))',
      };
    }

    // 选中状态
    if (selected) {
      return {
        ...baseStyle,
        strokeWidth: 4,
        filter: 'drop-shadow(0 0 10px rgba(124, 58, 237, 0.6))',
      };
    }

    // 悬停状态
    if (isHovered) {
      const hoverColor = 'rgba(124, 58, 237, 0.4)'; // 统一使用默认悬停颜色
      return {
        ...baseStyle,
        strokeWidth: 3,
        filter: `drop-shadow(0 0 6px ${hoverColor})`,
      };
    }

    return baseStyle;
  }, [data.status, data.color, selected, isHovered, connectionStrength, style]);

  // 处理连线点击
  const handleLineClick = useCallback((event) => {
    event.stopPropagation();
    if (props.onLineClick) {
      props.onLineClick(id, data, event);
    }
  }, [id, data, props.onLineClick]);

  // 处理连线删除
  const handleDeleteLine = useCallback((event) => {
    event.stopPropagation();
    if (props.onDeleteLine) {
      props.onDeleteLine(id);
    }
  }, [id, props.onDeleteLine]);

  // 处理连线方向反转
  const handleReverseLine = useCallback((event) => {
    event.stopPropagation();
    console.log('🔄 反转连接方向:', id, data);

    // 触发反转事件
    window.dispatchEvent(new CustomEvent('flowLineReversed', {
      detail: { lineId: id, data }
    }));

    if (props.onReverseLine) {
      props.onReverseLine(id, data);
    }
  }, [id, data, props.onReverseLine]);

  // 更新连接强度
  useEffect(() => {
    const strength = calculateConnectionStrength();
    setConnectionStrength(strength);
  }, [calculateConnectionStrength]);

  return (
    <>
      <BaseEdge
        ref={lineRef}
        path={edgePath}
        markerEnd={markerEnd}
        style={getFlowLineStyle()}
        onClick={handleLineClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`enhanced-flow-line ${data.status || FlowLineStatus.IDLE} ${selected ? 'selected' : ''}`}
      />

      <EdgeLabelRenderer>
        {/* 连接强度指示器 */}
        {(isHovered || selected) && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="connection-strength-indicator"
          >
            <div 
              className="strength-bar"
              style={{ 
                width: `${connectionStrength * 20}px`,
                opacity: connectionStrength 
              }}
            />
          </div>
        )}

        {/* 状态指示器 */}
        {data.status === FlowLineStatus.SUCCESS && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="flow-status-indicator success"
          >
            ✓
          </div>
        )}

        {data.status === FlowLineStatus.ERROR && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="flow-status-indicator error"
            onClick={() => setShowTooltip(!showTooltip)}
          >
            ✗
          </div>
        )}

        {/* 错误信息提示 */}
        {data.status === FlowLineStatus.ERROR && showTooltip && data.errorMessage && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 30}px)`,
              pointerEvents: 'all',
            }}
            className="flow-error-tooltip"
          >
            <div className="tooltip-content">
              <div className="tooltip-header">
                <span>连接错误</span>
                <button onClick={() => setShowTooltip(false)}>✕</button>
              </div>
              <div className="tooltip-body">
                {data.errorMessage}
              </div>
            </div>
          </div>
        )}

        {/* 反转方向按钮 */}
        {(selected || isHovered) && !data.locked && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX - 25}px,${labelY - 25}px)`,
              pointerEvents: 'all',
            }}
            className="flow-reverse-button"
          >
            <button
              onClick={handleReverseLine}
              title="反转连接方向"
              className="reverse-btn"
            >
              🔄
            </button>
          </div>
        )}

        {/* 删除按钮 */}
        {(selected || isHovered) && !data.locked && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX + 25}px,${labelY - 25}px)`,
              pointerEvents: 'all',
            }}
            className="flow-delete-button"
          >
            <button
              onClick={handleDeleteLine}
              title="删除连接"
              className="delete-btn"
            >
              🗑️
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

/**
 * 拖拽交互系统 - 处理连线的拖拽交互
 */
export class FlowLineDragSystem {
  constructor(reactFlowInstance) {
    this.reactFlowInstance = reactFlowInstance;
    this.isDragging = false;
    this.dragStartNode = null;
    this.dragStartHandle = null;
    this.currentMousePos = { x: 0, y: 0 };
    this.previewLine = null;
    this.dragDirection = null;
    this.connectionCallbacks = new Set();

    this.initEventListeners();
  }

  // 初始化事件监听器
  initEventListeners() {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  // 开始拖拽连接
  startConnection(nodeId, handleId, handlePosition, event) {
    this.isDragging = true;
    this.dragStartNode = nodeId;
    this.dragStartHandle = handleId;
    this.dragStartPosition = handlePosition;

    // 记录拖拽开始位置
    const rect = event.target.getBoundingClientRect();
    this.dragStartScreenPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    // 创建预览连线
    this.createPreviewLine(event);

    // 高亮所有可连接的节点
    this.highlightConnectableNodes(nodeId);

    console.log('🔗 开始连接拖拽:', { nodeId, handleId, handlePosition });
  }

  // 创建预览连线
  createPreviewLine(event) {
    const flowBounds = this.reactFlowInstance.getBounds();
    const startPos = this.reactFlowInstance.screenToFlowPosition({
      x: this.dragStartScreenPos.x,
      y: this.dragStartScreenPos.y
    });

    this.previewLine = {
      id: 'preview-line',
      source: this.dragStartNode,
      sourceHandle: this.dragStartHandle,
      target: 'preview-target',
      targetX: startPos.x,
      targetY: startPos.y,
      data: {
        status: FlowLineStatus.CONNECTING,
        isPreview: true
      }
    };

    // 触发预览线更新
    this.notifyConnectionUpdate('preview-start', this.previewLine);
  }

  // 处理鼠标移动
  handleMouseMove(event) {
    if (!this.isDragging) return;

    this.currentMousePos = { x: event.clientX, y: event.clientY };

    // 更新拖拽方向
    this.updateDragDirection();

    // 更新预览线位置
    this.updatePreviewLine(event);

    // 检测悬停的连接点
    this.detectHoverTarget(event);
  }

  // 更新拖拽方向
  updateDragDirection() {
    const deltaX = this.currentMousePos.x - this.dragStartScreenPos.x;
    const deltaY = this.currentMousePos.y - this.dragStartScreenPos.y;

    // 计算拖拽角度
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

    // 确定主要方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.dragDirection = deltaX > 0 ? 'right' : 'left';
    } else {
      this.dragDirection = deltaY > 0 ? 'down' : 'up';
    }

    // 触发方向变化事件
    this.notifyConnectionUpdate('direction-change', {
      direction: this.dragDirection,
      angle: angle,
      delta: { x: deltaX, y: deltaY }
    });
  }

  // 更新预览线
  updatePreviewLine(event) {
    if (!this.previewLine) return;

    const flowPos = this.reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });

    this.previewLine.targetX = flowPos.x;
    this.previewLine.targetY = flowPos.y;
    this.previewLine.data.direction = this.dragDirection;

    // 触发预览线更新
    this.notifyConnectionUpdate('preview-update', this.previewLine);
  }

  // 检测悬停目标
  detectHoverTarget(event) {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const handleElement = element?.closest('.react-flow__handle');

    if (handleElement) {
      const nodeElement = handleElement.closest('.react-flow__node');
      if (nodeElement) {
        const nodeId = nodeElement.getAttribute('data-id');
        const handleId = handleElement.getAttribute('data-handleid');

        if (nodeId !== this.dragStartNode) {
          this.highlightTargetNode(nodeId, handleId);
          this.previewLine.target = nodeId;
          this.previewLine.targetHandle = handleId;
        }
      }
    } else {
      this.clearTargetHighlight();
      this.previewLine.target = 'preview-target';
      this.previewLine.targetHandle = null;
    }
  }

  // 处理鼠标释放
  handleMouseUp(event) {
    if (!this.isDragging) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const handleElement = element?.closest('.react-flow__handle');

    if (handleElement) {
      const nodeElement = handleElement.closest('.react-flow__node');
      if (nodeElement) {
        const targetNodeId = nodeElement.getAttribute('data-id');
        const targetHandleId = handleElement.getAttribute('data-handleid');

        if (targetNodeId !== this.dragStartNode) {
          // 完成连接
          this.completeConnection(targetNodeId, targetHandleId);
        }
      }
    }

    // 清理拖拽状态
    this.cleanup();
  }

  // 完成连接
  completeConnection(targetNodeId, targetHandleId) {
    // 🎯 核心改进：根据用户拖拽方向智能调整连接的起点和终点
    // 确保线的流动方向（箭头指向）与用户拖拽方向完全一致

    const originalSource = this.dragStartNode;
    const originalTarget = targetNodeId;
    const originalSourceHandle = this.dragStartHandle;
    const originalTargetHandle = targetHandleId;

    // 分析拖拽方向，决定是否需要颠倒起点和终点
    const shouldReverse = this.shouldReverseConnection(this.dragDirection);

    let finalSource, finalTarget, finalSourceHandle, finalTargetHandle;

    if (shouldReverse) {
      // 颠倒起点和终点，让箭头指向用户拖拽的方向
      finalSource = originalTarget;
      finalTarget = originalSource;
      finalSourceHandle = originalTargetHandle;
      finalTargetHandle = originalSourceHandle;

      console.log('🔄 根据拖拽方向颠倒连接:', {
        dragDirection: this.dragDirection,
        original: `${originalSource} -> ${originalTarget}`,
        reversed: `${finalSource} -> ${finalTarget}`
      });
    } else {
      // 保持原始方向
      finalSource = originalSource;
      finalTarget = originalTarget;
      finalSourceHandle = originalSourceHandle;
      finalTargetHandle = originalTargetHandle;

      console.log('➡️ 保持原始连接方向:', {
        dragDirection: this.dragDirection,
        connection: `${finalSource} -> ${finalTarget}`
      });
    }

    const connectionData = {
      source: finalSource,
      sourceHandle: finalSourceHandle,
      target: finalTarget,
      targetHandle: finalTargetHandle,
      direction: this.dragDirection,
      data: {
        status: FlowLineStatus.CONNECTED,
        userDirection: this.dragDirection,
        originalDragStart: originalSource,
        originalDragEnd: originalTarget,
        wasReversed: shouldReverse,
        createdAt: Date.now()
      }
    };

    console.log('✅ 完成连接 (方向已优化):', connectionData);

    // 触发连接完成事件
    this.notifyConnectionUpdate('connection-complete', connectionData);
  }

  // 判断是否需要颠倒连接方向
  shouldReverseConnection(dragDirection) {
    // 🎯 这里是核心逻辑：根据拖拽方向决定是否颠倒连接
    // 目标是让箭头指向用户拖拽的方向

    // 获取拖拽起点和终点的位置信息
    const startPos = this.dragStartScreenPos;
    const endPos = this.currentMousePos;

    if (!startPos || !endPos) return false;

    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;

    // 根据拖拽方向和位置关系决定是否需要颠倒
    switch (dragDirection) {
      case 'right':
        // 向右拖拽：如果终点在起点左边，需要颠倒
        return deltaX < 0;

      case 'left':
        // 向左拖拽：如果终点在起点右边，需要颠倒
        return deltaX > 0;

      case 'down':
        // 向下拖拽：如果终点在起点上方，需要颠倒
        return deltaY < 0;

      case 'up':
        // 向上拖拽：如果终点在起点下方，需要颠倒
        return deltaY > 0;

      default:
        return false;
    }
  }

  // 高亮可连接节点
  highlightConnectableNodes(excludeNodeId) {
    const nodes = document.querySelectorAll('.react-flow__node');
    nodes.forEach(node => {
      const nodeId = node.getAttribute('data-id');
      if (nodeId !== excludeNodeId) {
        node.classList.add('connectable-highlight');
      }
    });
  }

  // 高亮目标节点
  highlightTargetNode(nodeId, handleId) {
    this.clearTargetHighlight();
    const node = document.querySelector(`[data-id="${nodeId}"]`);
    if (node) {
      node.classList.add('connection-target-highlight');
    }

    const handle = document.querySelector(`[data-id="${nodeId}"] [data-handleid="${handleId}"]`);
    if (handle) {
      handle.classList.add('handle-target-highlight');
    }
  }

  // 清除目标高亮
  clearTargetHighlight() {
    document.querySelectorAll('.connection-target-highlight').forEach(el => {
      el.classList.remove('connection-target-highlight');
    });
    document.querySelectorAll('.handle-target-highlight').forEach(el => {
      el.classList.remove('handle-target-highlight');
    });
  }

  // 清理拖拽状态
  cleanup() {
    this.isDragging = false;
    this.dragStartNode = null;
    this.dragStartHandle = null;
    this.previewLine = null;
    this.dragDirection = null;

    // 清除所有高亮
    document.querySelectorAll('.connectable-highlight').forEach(el => {
      el.classList.remove('connectable-highlight');
    });
    this.clearTargetHighlight();

    // 触发清理事件
    this.notifyConnectionUpdate('cleanup', null);
  }

  // 添加连接回调
  addConnectionCallback(callback) {
    this.connectionCallbacks.add(callback);
  }

  // 移除连接回调
  removeConnectionCallback(callback) {
    this.connectionCallbacks.delete(callback);
  }

  // 通知连接更新
  notifyConnectionUpdate(type, data) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(type, data);
      } catch (error) {
        console.error('连接回调执行错误:', error);
      }
    });
  }

  // 销毁系统
  destroy() {
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.connectionCallbacks.clear();
  }
}

/**
 * 流程线连接管理器 - 管理所有连接的生命周期
 */
export class FlowLineConnectionManager {
  constructor() {
    this.connections = new Map();
    this.connectionHistory = [];
    this.maxHistorySize = 100;
    this.listeners = new Set();
  }

  // 添加连接
  addConnection(connectionData) {
    const id = connectionData.id || this.generateConnectionId(connectionData);
    const connection = {
      id,
      ...connectionData,
      createdAt: Date.now(),
      status: FlowLineStatus.CONNECTED,
      metadata: {
        userDirection: connectionData.direction,
        dragPath: connectionData.dragPath || [],
        connectionStrength: this.calculateConnectionStrength(connectionData),
        ...connectionData.metadata
      }
    };

    this.connections.set(id, connection);
    this.addToHistory('add', connection);
    this.notifyListeners('connection-added', connection);

    console.log('➕ 添加连接:', connection);
    return connection;
  }

  // 移除连接
  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.addToHistory('remove', connection);
      this.notifyListeners('connection-removed', connection);
      console.log('➖ 移除连接:', connection);
      return true;
    }
    return false;
  }

  // 更新连接状态
  updateConnectionStatus(connectionId, status, metadata = {}) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      const oldStatus = connection.status;
      connection.status = status;
      connection.metadata = { ...connection.metadata, ...metadata };
      connection.updatedAt = Date.now();

      this.addToHistory('update', connection, { oldStatus, newStatus: status });
      this.notifyListeners('connection-updated', connection);

      console.log('🔄 更新连接状态:', { connectionId, oldStatus, newStatus: status });
      return connection;
    }
    return null;
  }

  // 获取连接
  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  // 获取所有连接
  getAllConnections() {
    return Array.from(this.connections.values());
  }

  // 获取节点的连接
  getNodeConnections(nodeId) {
    return this.getAllConnections().filter(conn =>
      conn.source === nodeId || conn.target === nodeId
    );
  }

  // 检查连接是否存在
  hasConnection(sourceId, targetId) {
    return this.getAllConnections().some(conn =>
      (conn.source === sourceId && conn.target === targetId) ||
      (conn.source === targetId && conn.target === sourceId)
    );
  }

  // 生成连接ID
  generateConnectionId(connectionData) {
    const timestamp = Date.now();
    const hash = this.simpleHash(`${connectionData.source}-${connectionData.target}-${timestamp}`);
    return `flow-line-${hash}`;
  }

  // 简单哈希函数
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  // 计算连接强度
  calculateConnectionStrength(connectionData) {
    // 基于节点类型、距离、用户交互等因素计算连接强度
    let strength = 1.0;

    // 根据节点类型调整
    if (connectionData.sourceType === 'tool-node' || connectionData.targetType === 'tool-node') {
      strength *= 0.8; // 工具连接稍弱
    }

    // 根据用户拖拽路径调整
    if (connectionData.dragPath && connectionData.dragPath.length > 0) {
      const pathComplexity = connectionData.dragPath.length / 10;
      strength *= Math.max(0.5, 1 - pathComplexity * 0.1);
    }

    return Math.max(0.1, Math.min(1.0, strength));
  }

  // 添加到历史记录
  addToHistory(action, connection, extra = {}) {
    const historyEntry = {
      action,
      connection: { ...connection },
      timestamp: Date.now(),
      ...extra
    };

    this.connectionHistory.unshift(historyEntry);

    // 限制历史记录大小
    if (this.connectionHistory.length > this.maxHistorySize) {
      this.connectionHistory = this.connectionHistory.slice(0, this.maxHistorySize);
    }
  }

  // 获取历史记录
  getHistory(limit = 10) {
    return this.connectionHistory.slice(0, limit);
  }

  // 添加监听器
  addListener(callback) {
    this.listeners.add(callback);
  }

  // 移除监听器
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // 通知监听器
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('连接管理器监听器错误:', error);
      }
    });
  }

  // 清除所有连接
  clearAllConnections() {
    const connections = this.getAllConnections();
    this.connections.clear();
    this.addToHistory('clear-all', null, { clearedConnections: connections });
    this.notifyListeners('all-connections-cleared', connections);
    console.log('🧹 清除所有连接:', connections.length);
  }

  // 导出连接数据
  exportConnections() {
    return {
      connections: this.getAllConnections(),
      history: this.getHistory(),
      exportedAt: Date.now()
    };
  }

  // 导入连接数据
  importConnections(data) {
    if (data.connections && Array.isArray(data.connections)) {
      this.clearAllConnections();
      data.connections.forEach(conn => {
        this.connections.set(conn.id, conn);
      });
      this.notifyListeners('connections-imported', data.connections);
      console.log('📥 导入连接数据:', data.connections.length);
      return true;
    }
    return false;
  }

  // 获取统计信息
  getStatistics() {
    const connections = this.getAllConnections();
    const statusCounts = {};
    const typeCounts = {};

    connections.forEach(conn => {
      statusCounts[conn.status] = (statusCounts[conn.status] || 0) + 1;

      const type = conn.metadata?.isToolConnection ? 'tool' : 'normal';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return {
      total: connections.length,
      statusCounts,
      typeCounts,
      averageStrength: connections.reduce((sum, conn) => sum + (conn.metadata?.connectionStrength || 1), 0) / connections.length || 0,
      oldestConnection: connections.reduce((oldest, conn) =>
        !oldest || conn.createdAt < oldest.createdAt ? conn : oldest, null),
      newestConnection: connections.reduce((newest, conn) =>
        !newest || conn.createdAt > newest.createdAt ? conn : newest, null)
    };
  }
}
