import React, { useState, useEffect, useRef } from 'react';
import './EnhancedExecutionConsole.css';

const EnhancedExecutionConsole = ({
  isExecuting,
  nodes,
  edges,
  currentMindmap,
  runMode,
  onCancel,
  onMinimize,
  onMaximize,
  isMinimized = false
}) => {
  const [executionLogs, setExecutionLogs] = useState([]);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [executionStartTime, setExecutionStartTime] = useState(null);
  const [executionDuration, setExecutionDuration] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const logsEndRef = useRef(null);
  const durationTimerRef = useRef(null);

  // 监听执行状态变化
  useEffect(() => {
    if (isExecuting && !executionStartTime) {
      setExecutionStartTime(new Date());
      addLog('🚀 开始执行工作流...', 'info');
      
      // 重置状态
      setNodeStatuses({});
      setExecutionLogs([]);
    } else if (!isExecuting && executionStartTime) {
      addLog('✅ 工作流执行完成', 'success');
      setExecutionStartTime(null);
    }
  }, [isExecuting]);

  // 计时器
  useEffect(() => {
    if (isExecuting && executionStartTime) {
      durationTimerRef.current = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now - executionStartTime) / 1000);
        setExecutionDuration(duration);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isExecuting, executionStartTime]);

  // 自动滚动到底部
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);

  // 监听全局节点状态更新事件
  useEffect(() => {
    const handleNodeStatusUpdate = (event) => {
      const { nodeId, status } = event.detail;
      setNodeStatuses(prev => ({
        ...prev,
        [nodeId]: status
      }));
      
      // 添加日志
      const node = nodes.find(n => n.id === nodeId);
      const nodeName = node?.data?.label || nodeId;
      
      switch (status) {
        case 'running':
          addLog(`⚡ 开始执行: ${nodeName}`, 'info');
          break;
        case 'done':
          addLog(`✅ 完成: ${nodeName}`, 'success');
          break;
        case 'error':
          addLog(`❌ 失败: ${nodeName}`, 'error');
          break;
        default:
          break;
      }
    };

    // 添加事件监听器
    window.addEventListener('nodeStatusUpdate', handleNodeStatusUpdate);
    
    return () => {
      window.removeEventListener('nodeStatusUpdate', handleNodeStatusUpdate);
    };
  }, [nodes]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLogs(prev => [...prev, { timestamp, message, type, id: Date.now() }]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🔄';
      case 'done': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return '#3b82f6';
      case 'done': return '#10b981';
      case 'error': return '#ef4444';
      case 'pending': return '#6b7280';
      default: return '#e5e7eb';
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'auto': return '🤖';
      case 'daily': return '📋';
      case 'professional': return '🏢';
      case 'custom': return '🛠️';
      default: return '⚙️';
    }
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'auto': return '自动模式';
      case 'daily': return '日常模式';
      case 'professional': return '专业模式';
      case 'custom': return '自定义模式';
      default: return '未知模式';
    }
  };

  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (onMaximize && !isMaximized) {
      onMaximize();
    }
  };

  if (!isExecuting) return null;

  return (
    <div className={`execution-console ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''}`}>
      <div className="console-header">
        <div className="header-left">
          <span className="console-title">🚀 工作流执行控制台</span>
          <div className="execution-info">
            <span className="mode-badge">
              {getModeIcon(runMode)} {getModeLabel(runMode)}
            </span>
            {executionDuration > 0 && (
              <span className="duration-badge">
                ⏱ {formatDuration(executionDuration)}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-controls">
          <button
            className="control-btn minimize-btn"
            onClick={onMinimize}
            title="最小化"
          >
            ➖
          </button>
          <button
            className="control-btn maximize-btn"
            onClick={handleToggleMaximize}
            title={isMaximized ? "还原" : "最大化"}
          >
            {isMaximized ? '🗗' : '🗖'}
          </button>
          <button
            className="control-btn close-btn"
            onClick={onCancel}
            title={isExecuting ? "取消执行" : "关闭"}
          >
            ✖
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="console-content">
          {/* 工作流信息 */}
          <div className="workflow-summary">
            <h4>{currentMindmap?.title || '未命名工作流'}</h4>
            <div className="summary-stats">
              <span>📊 {nodes.length} 个节点</span>
              <span>🔗 {edges.length} 个连接</span>
              <span>🎯 {Object.values(nodeStatuses).filter(s => s === 'done').length}/{nodes.length} 已完成</span>
            </div>
          </div>

          {/* 节点状态网格 */}
          <div className="nodes-status-grid">
            <h5>节点执行状态</h5>
            <div className="nodes-grid">
              {nodes.map(node => {
                const status = nodeStatuses[node.id] || 'pending';
                return (
                  <div key={node.id} className={`node-status-card ${status}`}>
                    <div className="node-header">
                      <span 
                        className="status-indicator"
                        style={{ color: getStatusColor(status) }}
                      >
                        {getStatusIcon(status)}
                      </span>
                      <span className="node-name">
                        {node.data?.label || node.id}
                      </span>
                    </div>
                    <div className="node-type">{node.type}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 执行日志 */}
          <div className="execution-logs">
            <h5>执行日志</h5>
            <div className="logs-container">
              {executionLogs.map(log => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              {executionLogs.length === 0 && (
                <div className="no-logs">等待执行日志...</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* 最小化状态的简化显示 */}
      {isMinimized && (
        <div className="minimized-content">
          <div className="mini-progress">
            <span className="mini-status">
              {Object.values(nodeStatuses).filter(s => s === 'done').length}/{nodes.length} 完成
            </span>
            <span className="mini-duration">
              {executionDuration > 0 && formatDuration(executionDuration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedExecutionConsole;
