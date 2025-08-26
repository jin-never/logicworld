import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  EnhancedFlowLine,
  FlowLineDragSystem,
  FlowLineConnectionManager,
  FlowLineStatus
} from './FlowLineSystem';
import EnhancedConnectionHandle from './EnhancedConnectionHandle';

// 重新导出EnhancedFlowLine以便在其他地方使用
export { EnhancedFlowLine } from './FlowLineSystem';

/**
 * 流程线集成组件 - 将所有流程线功能整合
 * 提供完整的连线交互体验
 */
export const useFlowLineIntegration = () => {
  const reactFlowInstance = useReactFlow();
  const dragSystemRef = useRef(null);
  const connectionManagerRef = useRef(null);
  const [previewConnection, setPreviewConnection] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // 处理连接更新
  const handleConnectionUpdate = useCallback((type, data) => {
    switch (type) {
      case 'preview-start':
        setPreviewConnection(data);
        setIsConnecting(true);
        break;

      case 'preview-update':
        setPreviewConnection(data);
        break;

      case 'connection-complete':
        console.log('连接完成 (智能方向优化):', data);

        // 添加到连接管理器
        const connection = connectionManagerRef.current?.addConnection(data);
        setPreviewConnection(null);
        setIsConnecting(false);

        // 触发ReactFlow的连接事件
        if (reactFlowInstance && connection) {
          const reactFlowConnection = {
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            id: connection.id,
            type: 'enhanced', // 使用与用户手动连接线相同的类型
            data: {
              ...connection.data,
              status: FlowLineStatus.CONNECTED,
              userDirection: connection.metadata?.userDirection || data.direction,
              // 🎯 传递方向优化的关键信息
              wasReversed: data.data?.wasReversed || false,
              originalDragStart: data.data?.originalDragStart,
              originalDragEnd: data.data?.originalDragEnd,
              directionOptimized: true,
              onLineClick: handleLineClick,
              onDeleteLine: handleDeleteLine
            }
          };

          console.log('🚀 通知主应用创建优化方向的连接:', reactFlowConnection);

          // 通过自定义事件通知主应用
          window.dispatchEvent(new CustomEvent('flowLineConnected', {
            detail: reactFlowConnection
          }));
        }
        break;



      case 'cleanup':
        setPreviewConnection(null);
        setIsConnecting(false);
        break;

      default:
        console.log('未处理的连接更新类型:', type, data);
    }
  }, [reactFlowInstance]);

  // 初始化系统
  useEffect(() => {
    // 初始化连接管理器
    connectionManagerRef.current = new FlowLineConnectionManager();

    // 初始化拖拽系统
    dragSystemRef.current = new FlowLineDragSystem(reactFlowInstance);

    // 添加连接回调
    dragSystemRef.current.addConnectionCallback(handleConnectionUpdate);



    console.log('🚀 流程线系统初始化完成');

    return () => {
      // 清理资源
      if (dragSystemRef.current) {
        dragSystemRef.current.destroy();
      }

    };
  }, [reactFlowInstance, handleConnectionUpdate]);



  // 处理连线点击
  const handleLineClick = useCallback((lineId, data, event) => {
    console.log('连线被点击:', lineId, data);
    
    // 触发选中事件
    window.dispatchEvent(new CustomEvent('flowLineSelected', {
      detail: { lineId, data, event }
    }));
  }, []);

  // 处理连线删除
  const handleDeleteLine = useCallback((lineId) => {
    console.log('删除连线:', lineId);
    
    // 从连接管理器中移除
    const removed = connectionManagerRef.current?.removeConnection(lineId);
    
    if (removed) {
      // 通知主应用
      window.dispatchEvent(new CustomEvent('flowLineDeleted', {
        detail: { lineId }
      }));
    }
  }, []);

  // 处理连接开始
  const handleConnectionStart = useCallback((nodeId, handleId, position, event) => {
    console.log('🔗 开始连接:', { nodeId, handleId, position });
    
    if (dragSystemRef.current) {
      dragSystemRef.current.startConnection(nodeId, handleId, position, event);
    }
  }, []);

  // 处理连接拖拽
  const handleConnectionDrag = useCallback((nodeId, handleId, dragData) => {
    // 可以在这里添加实时反馈逻辑
    console.log('🔄 连接拖拽:', { nodeId, handleId, dragData });
  }, []);

  // 处理连接结束
  const handleConnectionEnd = useCallback((nodeId, handleId, event) => {
    console.log('🔚 连接结束:', { nodeId, handleId });
  }, []);

  // 更新连接状态
  const updateConnectionStatus = useCallback((connectionId, status, metadata = {}) => {
    return connectionManagerRef.current?.updateConnectionStatus(connectionId, status, metadata);
  }, []);

  // 获取连接统计
  const getConnectionStatistics = useCallback(() => {
    return connectionManagerRef.current?.getStatistics() || {};
  }, []);

  // 导出连接数据
  const exportConnections = useCallback(() => {
    return connectionManagerRef.current?.exportConnections() || null;
  }, []);

  // 导入连接数据
  const importConnections = useCallback((data) => {
    return connectionManagerRef.current?.importConnections(data) || false;
  }, []);

  return {
    // 组件
    EnhancedFlowLine,
    EnhancedConnectionHandle,
    
    // 状态
    previewConnection,
    isConnecting,
    
    // 事件处理器
    handleConnectionStart,
    handleConnectionDrag,
    handleConnectionEnd,
    handleLineClick,
    handleDeleteLine,
    
    // 管理方法
    updateConnectionStatus,
    getConnectionStatistics,
    exportConnections,
    importConnections,
    
    // 系统引用
    dragSystem: dragSystemRef.current,
    connectionManager: connectionManagerRef.current
  };
};

/**
 * 增强的节点组件包装器
 * 为现有节点添加流程线功能
 */
export const withFlowLineSupport = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const {
      EnhancedConnectionHandle,
      handleConnectionStart,
      handleConnectionDrag,
      handleConnectionEnd
    } = useFlowLineIntegration();

    // 创建增强的连接点
    const createEnhancedHandle = useCallback((handleProps) => {
      return (
        <EnhancedConnectionHandle
          {...handleProps}
          onConnectionStart={handleConnectionStart}
          onConnectionDrag={handleConnectionDrag}
          onConnectionEnd={handleConnectionEnd}
        />
      );
    }, [EnhancedConnectionHandle, handleConnectionStart, handleConnectionDrag, handleConnectionEnd]);

    return (
      <WrappedComponent
        {...props}
        ref={ref}
        createEnhancedHandle={createEnhancedHandle}
      />
    );
  });
};

/**
 * 流程线预览组件
 * 显示拖拽过程中的连线预览
 */
export const FlowLinePreview = ({ previewConnection, isConnecting }) => {
  if (!isConnecting || !previewConnection) {
    return null;
  }

  return (
    <div className="flow-line-preview-container">
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 999
        }}
      >
        <path
          d={`M ${previewConnection.sourceX || 0},${previewConnection.sourceY || 0} 
              Q ${(previewConnection.sourceX + previewConnection.targetX) / 2},${previewConnection.sourceY} 
              ${previewConnection.targetX || 0},${previewConnection.targetY || 0}`}
          stroke="#60a5fa"
          strokeWidth="3"
          strokeDasharray="8 4"
          fill="none"
          strokeLinecap="round"
          className="preview-connection-line"
        />
        
        {/* 方向指示箭头 */}
        <polygon
          points={`${previewConnection.targetX - 8},${previewConnection.targetY - 4} 
                   ${previewConnection.targetX},${previewConnection.targetY} 
                   ${previewConnection.targetX - 8},${previewConnection.targetY + 4}`}
          fill="#60a5fa"
          className="preview-arrow"
        />
      </svg>
      
      {/* 连接状态提示 */}
      <div className="connection-status-indicator">
        <span>正在连接...</span>
        <div className="connection-progress-bar">
          <div className="progress-fill" />
        </div>
      </div>
    </div>
  );
};

export default {
  useFlowLineIntegration,
  withFlowLineSupport,
  FlowLinePreview,
  EnhancedFlowLine,
  EnhancedConnectionHandle
};
