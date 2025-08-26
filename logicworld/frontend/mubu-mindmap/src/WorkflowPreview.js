import React, { useState, useEffect } from 'react';
import './WorkflowPreview.css';

const WorkflowPreview = ({ 
  nodes, 
  edges, 
  onExecute, 
  onClose, 
  isVisible 
}) => {
  const [executionStatus, setExecutionStatus] = useState('idle'); // idle, running, completed, failed
  const [executionResult, setExecutionResult] = useState(null);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);
  const [executionTime, setExecutionTime] = useState(0);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    let interval;
    if (executionStatus === 'running' && startTime) {
      interval = setInterval(() => {
        setExecutionTime(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [executionStatus, startTime]);

  const handleExecute = async () => {
    setExecutionStatus('running');
    setExecutionResult(null);
    setExecutionLogs([]);
    setCurrentNode(null);
    setStartTime(Date.now());
    setExecutionTime(0);

    try {
      // 模拟执行过程
      await simulateExecution();
      
      // 实际执行
      const result = await onExecute({ nodes, edges });
      
      setExecutionStatus('completed');
      setExecutionResult(result);
      addLog('success', '工作流执行完成', result);
    } catch (error) {
      setExecutionStatus('failed');
      setExecutionResult({ error: error.message });
      addLog('error', '工作流执行失败', error.message);
    }
  };

  const simulateExecution = async () => {
    // 按拓扑顺序模拟节点执行
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const inDegree = new Map(nodes.map(node => [node.id, 0]));
    
    // 计算入度
    edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });
    
    // 找到入度为0的节点
    const queue = nodes.filter(node => inDegree.get(node.id) === 0);
    const executionOrder = [];
    
    while (queue.length > 0) {
      const node = queue.shift();
      executionOrder.push(node);
      
      // 更新相邻节点的入度
      edges.forEach(edge => {
        if (edge.source === node.id) {
          const newInDegree = inDegree.get(edge.target) - 1;
          inDegree.set(edge.target, newInDegree);
          if (newInDegree === 0) {
            queue.push(nodeMap.get(edge.target));
          }
        }
      });
    }
    
    // 模拟执行每个节点
    for (const node of executionOrder) {
      setCurrentNode(node.id);
      addLog('info', `开始执行节点: ${node.data.label}`, node.data);
      
      // 模拟执行时间
      const executionDelay = Math.random() * 1000 + 500; // 0.5-1.5秒
      await new Promise(resolve => setTimeout(resolve, executionDelay));
      
      addLog('success', `节点执行完成: ${node.data.label}`, `耗时: ${executionDelay.toFixed(0)}ms`);
    }
    
    setCurrentNode(null);
  };

  const addLog = (type, message, details = null) => {
    const log = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    setExecutionLogs(prev => [...prev, log]);
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏸️';
    }
  };

  const getStatusText = () => {
    switch (executionStatus) {
      case 'running': return '执行中...';
      case 'completed': return '执行完成';
      case 'failed': return '执行失败';
      default: return '准备就绪';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="workflow-preview">
      <div className="preview-header">
        <h3>工作流预览</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="preview-content">
        {/* 工作流信息 */}
        <div className="workflow-info">
          <div className="info-item">
            <span className="info-label">节点数量:</span>
            <span className="info-value">{nodes.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">连接数量:</span>
            <span className="info-value">{edges.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">执行状态:</span>
            <span className={`info-value status-${executionStatus}`}>
              {getStatusIcon()} {getStatusText()}
            </span>
          </div>
          {executionStatus === 'running' && (
            <div className="info-item">
              <span className="info-label">执行时间:</span>
              <span className="info-value">{formatTime(executionTime)}</span>
            </div>
          )}
        </div>

        {/* 节点列表 */}
        <div className="nodes-preview">
          <h4>节点列表</h4>
          <div className="nodes-list">
            {nodes.map(node => (
              <div 
                key={node.id} 
                className={`node-preview-item ${currentNode === node.id ? 'current' : ''}`}
              >
                <div className="node-preview-icon">
                  {node.data.icon || '⚙️'}
                </div>
                <div className="node-preview-content">
                  <div className="node-preview-name">{node.data.label}</div>
                  <div className="node-preview-type">{node.data.nodeType}</div>
                </div>
                {currentNode === node.id && (
                  <div className="node-preview-status">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 执行控制 */}
        <div className="execution-controls">
          <button 
            className="execute-button"
            onClick={handleExecute}
            disabled={executionStatus === 'running'}
          >
            {executionStatus === 'running' ? '执行中...' : '开始执行'}
          </button>
          
          {executionStatus === 'running' && (
            <button 
              className="stop-button"
              onClick={() => setExecutionStatus('idle')}
            >
              停止执行
            </button>
          )}
        </div>

        {/* 执行日志 */}
        {executionLogs.length > 0 && (
          <div className="execution-logs">
            <h4>执行日志</h4>
            <div className="logs-container">
              {executionLogs.map(log => (
                <div key={log.id} className={`log-item log-${log.type}`}>
                  <span className="log-timestamp">{log.timestamp}</span>
                  <span className="log-message">{log.message}</span>
                  {log.details && (
                    <div className="log-details">
                      {typeof log.details === 'object' 
                        ? JSON.stringify(log.details, null, 2)
                        : log.details
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 执行结果 */}
        {executionResult && (
          <div className="execution-result">
            <h4>执行结果</h4>
            <div className="result-container">
              <pre>{JSON.stringify(executionResult, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowPreview;
