import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import './DynamicConnectionHandle.css';

/**
 * 动态连接点组件
 * 根据连接情况动态调整连接点的位置和样式
 */
const DynamicConnectionHandle = ({
  nodeId,
  position,
  type,
  id,
  isConnectable = true,
  className = '',
  style = {},
  onConnectionUpdate,
  ...props
}) => {
  const [isActive, setIsActive] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [dynamicPosition, setDynamicPosition] = useState(position);
  const [dynamicStyle, setDynamicStyle] = useState(style);
  const handleRef = useRef(null);

  // 监听连接变化
  useEffect(() => {
    const handleConnectionChange = (event) => {
      if (event.detail.nodeId === nodeId) {
        updateConnectionState(event.detail);
      }
    };

    window.addEventListener('dynamicConnectionUpdate', handleConnectionChange);
    return () => window.removeEventListener('dynamicConnectionUpdate', handleConnectionChange);
  }, [nodeId]);

  // 更新连接状态
  const updateConnectionState = (connectionInfo) => {
    setConnectionCount(connectionInfo.connectionCount || 0);
    
    // 根据连接情况调整连接点样式
    if (connectionInfo.isOptimal) {
      setDynamicStyle(prev => ({
        ...prev,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
        transform: 'scale(1.2)'
      }));
    } else {
      setDynamicStyle(prev => ({
        ...prev,
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
        transform: 'scale(1.0)'
      }));
    }
  };

  // 处理连接点激活
  const handleMouseEnter = () => {
    setIsActive(true);
    // 通知系统连接点被激活
    if (onConnectionUpdate) {
      onConnectionUpdate({
        nodeId,
        handleId: id,
        position: dynamicPosition,
        type,
        isActive: true
      });
    }
  };

  const handleMouseLeave = () => {
    setIsActive(false);
    if (onConnectionUpdate) {
      onConnectionUpdate({
        nodeId,
        handleId: id,
        position: dynamicPosition,
        type,
        isActive: false
      });
    }
  };

  // 计算动态样式
  const getHandleStyle = () => {
    const baseStyle = {
      width: '10px',
      height: '10px',
      border: '2px solid white',
      borderRadius: '50%',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isActive ? 1 : 0.7,
      ...dynamicStyle
    };

    // 根据连接数量调整大小
    if (connectionCount > 0) {
      baseStyle.transform = `scale(${1 + connectionCount * 0.1})`;
    }

    // 激活状态的特殊样式
    if (isActive) {
      baseStyle.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.4), 0 4px 16px rgba(59, 130, 246, 0.3)';
      baseStyle.zIndex = 1001;
    }

    return baseStyle;
  };

  // 获取连接点类名
  const getHandleClassName = () => {
    const classes = [
      'dynamic-connection-handle',
      `dynamic-handle-${position.toLowerCase()}`,
      `dynamic-handle-${type}`,
      className
    ];

    if (isActive) classes.push('active');
    if (connectionCount > 0) classes.push('connected');

    return classes.filter(Boolean).join(' ');
  };

  return (
    <div className="dynamic-handle-container">
      <Handle
        ref={handleRef}
        type={type}
        position={dynamicPosition}
        id={id}
        isConnectable={isConnectable}
        style={getHandleStyle()}
        className={getHandleClassName()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      />
      
      {/* 连接数量指示器 */}
      {connectionCount > 0 && (
        <div className="connection-count-indicator">
          <span className="count-badge">{connectionCount}</span>
        </div>
      )}
      
      {/* 方向指示器 */}
      {isActive && (
        <div className={`direction-indicator direction-${position.toLowerCase()}`}>
          {getDirectionIcon(position)}
        </div>
      )}
    </div>
  );
};

// 获取方向图标
const getDirectionIcon = (position) => {
  const icons = {
    [Position.Top]: '↑',
    [Position.Bottom]: '↓',
    [Position.Left]: '←',
    [Position.Right]: '→'
  };
  return icons[position] || '•';
};

export default DynamicConnectionHandle;
