import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import './EnhancedConnectionHandle.css';

/**
 * 增强的连接点组件 - 提供智能的连接交互
 * 特点：
 * 1. 智能检测拖拽方向
 * 2. 实时视觉反馈
 * 3. 连接强度指示
 * 4. 沉浸式交互体验
 */

const EnhancedConnectionHandle = ({
  type = 'source',
  position = Position.Right,
  id,
  nodeId,
  isConnectable = true,
  onConnectionStart,
  onConnectionEnd,
  onConnectionDrag,
  className = '',
  style = {},
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStrength, setConnectionStrength] = useState(0);
  const handleRef = useRef(null);
  const dragStartPos = useRef(null);

  // 处理鼠标进入
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // 触发连接点高亮事件
    if (props.onHighlight) {
      props.onHighlight(nodeId, id, true);
    }
  }, [nodeId, id, props.onHighlight]);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovered(false);
      // 取消连接点高亮
      if (props.onHighlight) {
        props.onHighlight(nodeId, id, false);
      }
    }
  }, [isDragging, nodeId, id, props.onHighlight]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((event) => {
    if (!isConnectable) return;

    setIsDragging(true);
    setIsConnecting(true);
    dragStartPos.current = { x: event.clientX, y: event.clientY };

    // 触发连接开始事件
    if (onConnectionStart) {
      onConnectionStart(nodeId, id, position, event);
    }

    // 添加全局事件监听器
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    event.preventDefault();
    event.stopPropagation();
  }, [isConnectable, nodeId, id, position, onConnectionStart]);

  // 处理全局鼠标移动
  const handleGlobalMouseMove = useCallback((event) => {
    if (!isDragging || !dragStartPos.current) return;

    // 计算拖拽距离和方向
    const deltaX = event.clientX - dragStartPos.current.x;
    const deltaY = event.clientY - dragStartPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 更新连接强度（基于拖拽距离）
    const strength = Math.min(distance / 100, 1);
    setConnectionStrength(strength);

    // 触发连接拖拽事件
    if (onConnectionDrag) {
      onConnectionDrag(nodeId, id, {
        deltaX,
        deltaY,
        distance,
        strength,
        currentPos: { x: event.clientX, y: event.clientY }
      });
    }
  }, [isDragging, nodeId, id, onConnectionDrag]);

  // 处理全局鼠标释放
  const handleGlobalMouseUp = useCallback((event) => {
    if (!isDragging) return;

    setIsDragging(false);
    setIsConnecting(false);
    setConnectionStrength(0);

    // 移除全局事件监听器
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);

    // 检测目标连接点
    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    const targetHandle = targetElement?.closest('.react-flow__handle');

    if (targetHandle && targetHandle !== handleRef.current) {
      // 找到有效的连接目标
      const targetNodeId = targetHandle.getAttribute('data-nodeid');
      const targetHandleId = targetHandle.getAttribute('data-handleid');

      if (targetNodeId && targetHandleId) {
        // 验证连接的有效性
        const connectionData = {
          source: nodeId,
          sourceHandle: id,
          target: targetNodeId,
          targetHandle: targetHandleId,
          connectionStrength: connectionStrength
        };

        // 触发连接验证和创建事件
        if (props.onConnectionValidate) {
          const isValid = props.onConnectionValidate(connectionData);
          if (isValid && onConnectionEnd) {
            onConnectionEnd(nodeId, id, event, connectionData);
          } else if (!isValid && props.onConnectionError) {
            props.onConnectionError(connectionData, '连接类型不匹配');
          }
        } else if (onConnectionEnd) {
          onConnectionEnd(nodeId, id, event, connectionData);
        }
      }
    } else {
      // 没有找到有效目标，触发连接取消事件
      if (props.onConnectionCancel) {
        props.onConnectionCancel(nodeId, id);
      }
    }

    // 如果鼠标不在连接点上，取消高亮
    if (!handleRef.current?.contains(targetElement)) {
      setIsHovered(false);
      if (props.onHighlight) {
        props.onHighlight(nodeId, id, false);
      }
    }
  }, [isDragging, nodeId, id, onConnectionEnd, connectionStrength, props]);

  // 清理事件监听器
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // 获取连接点样式
  const getHandleStyle = useCallback(() => {
    const baseStyle = {
      width: '12px',
      height: '12px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      border: '2px solid white',
      borderRadius: '50%',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: isConnectable ? 'crosshair' : 'not-allowed',
      zIndex: 1000,
      ...style
    };

    // 连接中状态
    if (isConnecting) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        transform: 'scale(1.5)',
        boxShadow: `0 0 0 ${4 + connectionStrength * 8}px rgba(16, 185, 129, ${0.3 + connectionStrength * 0.3})`,
        animation: 'connection-pulse 1s infinite'
      };
    }

    // 悬停状态
    if (isHovered) {
      return {
        ...baseStyle,
        transform: 'scale(1.3)',
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.4)',
        background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'
      };
    }

    // 不可连接状态
    if (!isConnectable) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
        opacity: 0.5
      };
    }

    return baseStyle;
  }, [isConnecting, isHovered, isConnectable, connectionStrength, style]);

  // 获取连接点类名
  const getHandleClassName = useCallback(() => {
    const classes = [
      'enhanced-connection-handle',
      `handle-${type}`,
      `handle-${position.toLowerCase()}`,
      className
    ];

    if (isHovered) classes.push('hovered');
    if (isDragging) classes.push('dragging');
    if (isConnecting) classes.push('connecting');
    if (!isConnectable) classes.push('disabled');

    return classes.filter(Boolean).join(' ');
  }, [type, position, className, isHovered, isDragging, isConnecting, isConnectable]);

  return (
    <div className="enhanced-handle-container">
      <Handle
        ref={handleRef}
        type={type}
        position={position}
        id={id}
        isConnectable={isConnectable}
        style={getHandleStyle()}
        className={getHandleClassName()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        {...props}
      />
      
      {/* 连接强度指示器 */}
      {isConnecting && connectionStrength > 0 && (
        <div className="connection-strength-ring">
          <div 
            className="strength-fill"
            style={{
              transform: `scale(${0.5 + connectionStrength * 0.5})`,
              opacity: connectionStrength
            }}
          />
        </div>
      )}

      {/* 方向指示器 */}
      {isHovered && !isDragging && (
        <div className={`direction-indicator direction-${position.toLowerCase()}`}>
          {getDirectionIcon(position)}
        </div>
      )}

      {/* 连接提示 */}
      {isHovered && !isDragging && isConnectable && (
        <div className="connection-tooltip">
          <span>拖拽以连接</span>
        </div>
      )}
    </div>
  );
};

// 获取方向图标
const getDirectionIcon = (position) => {
  switch (position) {
    case Position.Top: return '↑';
    case Position.Right: return '→';
    case Position.Bottom: return '↓';
    case Position.Left: return '←';
    default: return '•';
  }
};

export default EnhancedConnectionHandle;
