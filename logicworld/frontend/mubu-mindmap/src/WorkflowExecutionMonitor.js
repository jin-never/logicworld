import React, { useState, useEffect, useRef, useCallback } from 'react';
import './WorkflowExecutionMonitor.css';

const WorkflowExecutionMonitor = ({ 
  workflowId, 
  onStatusUpdate, 
  onClose,
  isVisible = true 
}) => {
  const [executionStatus, setExecutionStatus] = useState('idle');
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [executionLogs, setExecutionLogs] = useState([]);
  const [executionMetrics, setExecutionMetrics] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const logsContainerRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const wsRef = useRef(null);

  // WebSocket连接用于实时更新
  const connectWebSocket = useCallback(() => {
    if (!workflowId) return;

    const wsUrl = `ws://localhost:8000/ws/workflow/${workflowId}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket连接已建立');
      addLog('已连接到实时监控', 'info');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealtimeUpdate(data);
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket连接已关闭');
      // 尝试重连
      setTimeout(() => {
        if (workflowId && executionStatus === 'running') {
          connectWebSocket();
        }
      }, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket错误:', error);
      addLog('实时监控连接失败，切换到轮询模式', 'warning');
      startPolling();
    };
  }, [workflowId, executionStatus]);

  // 处理实时更新
  const handleRealtimeUpdate = (data) => {
    switch (data.type) {
      case 'workflow_status':
        setExecutionStatus(data.status);
        setExecutionMetrics(prev => ({ ...prev, ...data.metrics }));
        onStatusUpdate?.(data);
        break;
      case 'node_status':
        setNodeStatuses(prev => ({
          ...prev,
          [data.nodeId]: {
            status: data.status,
            progress: data.progress,
            startTime: data.startTime,
            endTime: data.endTime,
            error: data.error
          }
        }));
        break;
      case 'execution_log':
        addLog(data.message, data.level, data.nodeId);
        break;
      case 'metrics_update':
        setExecutionMetrics(prev => ({ ...prev, ...data.metrics }));
        break;
    }
  };

  // 轮询状态更新（WebSocket失败时的备用方案）
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/workflow/${workflowId}/status`);
        if (response.ok) {
          const data = await response.json();
          setExecutionStatus(data.status);
          setNodeStatuses(data.nodeStatuses || {});
          setExecutionMetrics(data.metrics || {});
          onStatusUpdate?.(data);

          // 如果工作流完成，停止轮询
          if (['completed', 'failed', 'cancelled'].includes(data.status)) {
            clearInterval(pollingIntervalRef.current);
          }
        }
      } catch (error) {
        console.error('获取工作流状态失败:', error);
      }
    }, 2000);
  }, [workflowId, onStatusUpdate]);

  // 添加日志
  const addLog = (message, level = 'info', nodeId = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp,
      message,
      level,
      nodeId
    };

    setExecutionLogs(prev => {
      const updated = [...prev, newLog];
      // 限制日志数量，避免内存泄漏
      return updated.slice(-100);
    });
  };

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [executionLogs, autoScroll]);

  // 初始化监控
  useEffect(() => {
    if (workflowId && isVisible) {
      // 优先尝试WebSocket连接
      connectWebSocket();
      
      // 如果WebSocket不可用，使用轮询
      const wsTimeout = setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          startPolling();
        }
      }, 5000);

      return () => {
        clearTimeout(wsTimeout);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [workflowId, isVisible, connectWebSocket, startPolling]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return '#1890ff';
      case 'completed': return '#52c41a';
      case 'failed': return '#ff4d4f';
      case 'paused': return '#faad14';
      case 'cancelled': return '#8c8c8c';
      default: return '#d9d9d9';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '⚡';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'paused': return '⏸️';
      case 'cancelled': return '⏹️';
      default: return '⭕';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (!isVisible) return null;

  return (
    <div className="workflow-execution-monitor">
      <div className="monitor-header">
        <div className="header-left">
          <span className="status-indicator" style={{ backgroundColor: getStatusColor(executionStatus) }}>
            {getStatusIcon(executionStatus)}
          </span>
          <h4>执行监控</h4>
          <span className="workflow-id">#{workflowId?.slice(-8)}</span>
        </div>
        <div className="header-controls">
          <button 
            className="control-button" 
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          <button className="control-button" onClick={onClose} title="关闭">
            ×
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="monitor-content">
          {/* 执行指标 */}
          <div className="metrics-section">
            <div className="metric-item">
              <span className="metric-label">状态</span>
              <span className="metric-value" style={{ color: getStatusColor(executionStatus) }}>
                {executionStatus}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">耗时</span>
              <span className="metric-value">
                {formatDuration(executionMetrics.duration)}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">进度</span>
              <span className="metric-value">
                {executionMetrics.completedNodes || 0}/{executionMetrics.totalNodes || 0}
              </span>
            </div>
          </div>

          {/* 节点状态 */}
          <div className="nodes-section">
            <div className="section-header">
              <h5>节点状态</h5>
              <span className="node-count">
                {Object.keys(nodeStatuses).length} 个节点
              </span>
            </div>
            <div className="nodes-grid">
              {Object.entries(nodeStatuses).map(([nodeId, status]) => (
                <div key={nodeId} className={`node-status-card ${status.status}`}>
                  <div className="node-header">
                    <span 
                      className="node-status-dot" 
                      style={{ backgroundColor: getStatusColor(status.status) }}
                    />
                    <span className="node-name">{status.name || nodeId}</span>
                  </div>
                  <div className="node-details">
                    <span className="node-status-text">{status.status}</span>
                    {status.progress > 0 && (
                      <div className="node-progress">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {status.error && (
                    <div className="node-error">{status.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 执行日志 */}
          <div className="logs-section">
            <div className="section-header">
              <h5>执行日志</h5>
              <div className="log-controls">
                <label className="auto-scroll-toggle">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  自动滚动
                </label>
                <button 
                  className="clear-logs-button"
                  onClick={() => setExecutionLogs([])}
                >
                  清空
                </button>
              </div>
            </div>
            <div className="logs-container" ref={logsContainerRef}>
              {executionLogs.map((log) => (
                <div key={log.id} className={`log-entry ${log.level}`}>
                  <span className="log-timestamp">{log.timestamp}</span>
                  {log.nodeId && (
                    <span className="log-node-id">[{log.nodeId}]</span>
                  )}
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              {executionLogs.length === 0 && (
                <div className="no-logs">暂无日志</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowExecutionMonitor;
