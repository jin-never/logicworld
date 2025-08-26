import React, { useState, useEffect, useRef } from 'react';
import './WorkflowExecutionPanel.css';

const WorkflowExecutionPanel = ({
  isOpen,
  onClose,
  nodes,
  edges,
  title = "Untitled Workflow",
  description = "",
  onResetWorkflow
}) => {
  const [workflowId, setWorkflowId] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [executionStartTime, setExecutionStartTime] = useState(null);
  const [executionDuration, setExecutionDuration] = useState(0);
  
  const statusPollingRef = useRef(null);
  const durationTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !workflowId) {
      // 重置状态
      resetState();
    }
    
    return () => {
      // 清理定时器
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isOpen]);

  const resetState = () => {
    setWorkflowId(null);
    setWorkflowStatus(null);
    setNodeStatuses({});
    setIsExecuting(false);
    setError(null);
    setLogs([]);
    setExecutionStartTime(null);
    setExecutionDuration(0);
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const startExecution = async () => {
    try {
      setIsExecuting(true);
      setError(null);
      setExecutionStartTime(new Date());
      
      addLog('开始执行工作流...', 'info');
      
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nodes,
          edges,
          title,
          description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start workflow execution');
      }

      const data = await response.json();
      setWorkflowId(data.workflow_id);
      addLog(`工作流已启动，ID: ${data.workflow_id}`, 'success');
      
      // 开始状态轮询
      startStatusPolling(data.workflow_id);
      
      // 开始计时
      startDurationTimer();
      
    } catch (err) {
      setError(err.message);
      setIsExecuting(false);
      addLog(`执行失败: ${err.message}`, 'error');
    }
  };

  const startStatusPolling = (id) => {
    statusPollingRef.current = setInterval(async () => {
      try {
        // 获取工作流状态
        const workflowResponse = await fetch(`/api/workflow/${id}/status`);
        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json();
          setWorkflowStatus(workflowData);
          
          // 检查是否完成
          if (workflowData.status === 'completed' || workflowData.status === 'failed') {
            setIsExecuting(false);
            clearInterval(statusPollingRef.current);
            clearInterval(durationTimerRef.current);
            
            if (workflowData.status === 'completed') {
              addLog('工作流执行完成！', 'success');
            } else {
              addLog(`工作流执行失败: ${workflowData.error}`, 'error');
            }
          }
        }
        
        // 获取节点状态
        const nodeStatusPromises = nodes.map(async (node) => {
          try {
            const nodeResponse = await fetch(`/api/workflow/${id}/nodes/${node.id}/status`);
            if (nodeResponse.ok) {
              const nodeData = await nodeResponse.json();
              return { [node.id]: nodeData };
            }
          } catch (err) {
            console.error(`Failed to get status for node ${node.id}:`, err);
          }
          return null;
        });
        
        const nodeResults = await Promise.all(nodeStatusPromises);
        const newNodeStatuses = {};
        nodeResults.forEach(result => {
          if (result) {
            Object.assign(newNodeStatuses, result);
          }
        });
        
        setNodeStatuses(newNodeStatuses);
        
      } catch (err) {
        console.error('Status polling error:', err);
      }
    }, 2000); // 每2秒轮询一次
  };

  const startDurationTimer = () => {
    durationTimerRef.current = setInterval(() => {
      if (executionStartTime) {
        const now = new Date();
        const duration = Math.floor((now - executionStartTime) / 1000);
        setExecutionDuration(duration);
      }
    }, 1000);
  };

  const pauseExecution = async () => {
    if (!workflowId) return;
    
    try {
      const response = await fetch(`/api/workflow/${workflowId}/pause`, {
        method: 'POST'
      });
      
      if (response.ok) {
        addLog('工作流已暂停', 'info');
      } else {
        throw new Error('Failed to pause workflow');
      }
    } catch (err) {
      addLog(`暂停失败: ${err.message}`, 'error');
    }
  };

  const resumeExecution = async () => {
    if (!workflowId) return;

    try {
      const response = await fetch(`/api/workflow/${workflowId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nodes,
          edges,
          title,
          description
        })
      });

      if (response.ok) {
        addLog('工作流已恢复', 'info');
        setIsExecuting(true);
      } else {
        throw new Error('Failed to resume workflow');
      }
    } catch (err) {
      addLog(`恢复失败: ${err.message}`, 'error');
    }
  };

  const resetExecution = async () => {
    if (!workflowId) return;

    try {
      setIsExecuting(true);
      setError(null);
      setExecutionStartTime(new Date());

      // 重置节点状态
      setNodeStatuses({});

      // 重置前端工作流状态
      if (onResetWorkflow) {
        onResetWorkflow();
      }

      addLog('重置工作流状态...', 'info');

      const response = await fetch(`/api/workflow/${workflowId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nodes,
          edges,
          title,
          description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reset workflow');
      }

      const data = await response.json();
      setWorkflowId(data.workflow_id);
      addLog(`工作流已重置并重新启动，ID: ${data.workflow_id}`, 'success');

      // 开始状态轮询
      startStatusPolling(data.workflow_id);

      // 开始计时
      startDurationTimer();

    } catch (err) {
      setError(err.message);
      setIsExecuting(false);
      addLog(`重置失败: ${err.message}`, 'error');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'paused': return '⏸️';
      case 'retrying': return '🔁';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#6b7280';
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'paused': return '#f59e0b';
      case 'retrying': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="execution-panel-overlay">
      <div className="execution-panel">
        <div className="panel-header">
          <h2>🚀 工作流执行控制台</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="panel-content">
          {/* 工作流信息 */}
          <div className="workflow-info">
            <h3>{title}</h3>
            {description && <p>{description}</p>}
            <div className="workflow-stats">
              <span>📊 {nodes.length} 个节点</span>
              <span>🔗 {edges.length} 个连接</span>
              {executionDuration > 0 && (
                <span>⏱ {formatDuration(executionDuration)}</span>
              )}
            </div>
          </div>

          {/* 执行控制 */}
          <div className="execution-controls">
            {!workflowId && (
              <button
                className="start-btn"
                onClick={startExecution}
                disabled={isExecuting}
              >
                {isExecuting ? '启动中...' : '🚀 开始执行'}
              </button>
            )}

            {workflowId && isExecuting && (
              <button className="pause-btn" onClick={pauseExecution}>
                ⏸️ 暂停
              </button>
            )}

            {workflowId && !isExecuting && workflowStatus?.status === 'paused' && (
              <button className="resume-btn" onClick={resumeExecution}>
                ▶️ 恢复
              </button>
            )}

            {workflowId && !isExecuting && ['completed', 'failed', 'cancelled'].includes(workflowStatus?.status) && (
              <button className="reset-btn" onClick={resetExecution}>
                🔄 重新执行
              </button>
            )}
          </div>

          {/* 工作流状态 */}
          {workflowStatus && (
            <div className="workflow-status">
              <h4>工作流状态</h4>
              <div className="status-item">
                <span className="status-icon" style={{ color: getStatusColor(workflowStatus.status) }}>
                  {getStatusIcon(workflowStatus.status)}
                </span>
                <span className="status-text">{workflowStatus.status}</span>
                {workflowStatus.current_node && (
                  <span className="current-node">当前节点: {workflowStatus.current_node}</span>
                )}
              </div>
            </div>
          )}

          {/* 节点状态 */}
          <div className="nodes-status">
            <h4>节点执行状态</h4>
            <div className="nodes-grid">
              {nodes.map(node => {
                const nodeStatus = nodeStatuses[node.id];
                const status = nodeStatus?.status || 'pending';
                
                return (
                  <div key={node.id} className="node-status-item">
                    <div className="node-header">
                      <span className="node-icon" style={{ color: getStatusColor(status) }}>
                        {getStatusIcon(status)}
                      </span>
                      <span className="node-name">{node.data?.label || node.id}</span>
                    </div>
                    <div className="node-details">
                      <span className="node-type">{node.type}</span>
                      {nodeStatus?.duration && (
                        <span className="node-duration">{nodeStatus.duration.toFixed(1)}s</span>
                      )}
                    </div>
                    {nodeStatus?.error && (
                      <div className="node-error">{nodeStatus.error}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 执行日志 */}
          <div className="execution-logs">
            <h4>执行日志</h4>
            <div className="logs-container">
              {logs.map((log, index) => (
                <div key={index} className={`log-item ${log.type}`}>
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="no-logs">暂无日志</div>
              )}
            </div>
          </div>

          {/* 错误显示 */}
          {error && (
            <div className="error-display">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error}</span>
            </div>
          )}
        </div>

        <div className="panel-footer">
          <button className="secondary-btn" onClick={onClose}>
            关闭
          </button>
          {workflowId && (
            <button 
              className="secondary-btn"
              onClick={() => {
                // TODO: 实现结果查看功能
                console.log('View results for workflow:', workflowId);
              }}
            >
              查看结果
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowExecutionPanel;
