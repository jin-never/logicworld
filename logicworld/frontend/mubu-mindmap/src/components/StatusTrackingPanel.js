import React, { useMemo } from 'react';
import './StatusTrackingPanel.css';

const StatusTrackingPanel = ({ 
  isOpen, 
  onClose, 
  nodes = [], 
  edges = [], 
  workflowExecutionStatus = {}, 
  executionResults = {} 
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, running, completed, failed, pending

  // 🔧 精确合并节点信息和执行状态
  const nodeStatusList = useMemo(() => {
    return nodes.map(node => {
      // 优先使用节点本身的状态，然后是工作流执行状态，最后是默认值
      let status = 'pending';
      
      // 1. 优先使用节点自身的执行状态
      if (node.data?.status) {
        const nodeStatus = node.data.status;
        // 状态映射：统一不同的状态名称
        if (nodeStatus === 'success' || nodeStatus === 'completed') {
          status = 'completed';
        } else if (nodeStatus === 'error' || nodeStatus === 'failed') {
          status = 'failed';
        } else if (nodeStatus === 'running') {
          status = 'running';
        } else {
          status = 'pending';
        }
      } else if (workflowExecutionStatus[node.id]) {
        // 2. 使用工作流状态作为备用
        status = workflowExecutionStatus[node.id];
      }
      
      const result = executionResults[node.id] || null;
      
      return {
        id: node.id,
        label: node.data?.label || node.id,
        type: node.type || 'default',
        status: status,
        result: result,
        position: node.position,
        data: node.data,
        // 🔧 新增：显示原始状态用于调试
        rawStatus: node.data?.status,
        workflowStatus: workflowExecutionStatus[node.id]
      };
    });
  }, [nodes, workflowExecutionStatus, executionResults]);

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (filter === 'all') return nodeStatusList;
    return nodeStatusList.filter(node => node.status === filter);
  }, [nodeStatusList, filter]);

  // 🔧 精确状态统计
  const statusStats = useMemo(() => {
    const stats = {
      total: nodeStatusList.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0
    };
    
    nodeStatusList.forEach(node => {
      // 确保状态统计准确
      const status = node.status;
      if (stats.hasOwnProperty(status)) {
        stats[status]++;
      } else {
        // 处理未知状态，默认归类为pending
        stats.pending++;
      }
    });
    
    return stats;
  }, [nodeStatusList]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed':
      case 'success': return '✅';
      case 'failed':
      case 'error': return '❌';
      case 'pending':
      case 'idle': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return '#1890ff';
      case 'completed':
      case 'success': return '#52c41a';
      case 'failed':
      case 'error': return '#ff4d4f';
      case 'pending':
      case 'idle': return '#faad14';
      default: return '#d9d9d9';
    }
  };

  const getNodeTypeIcon = (type) => {
    switch (type) {
      case 'materialNode': return '📋';
      case 'executionNode': return '⚙️';
      case 'conditionNode': return '🔀';
      case 'resultNode': return '📊';
      default: return '🔵';
    }
  };

  const formatResult = (result) => {
    if (!result) return '暂无结果';
    
    if (typeof result === 'string') {
      return result.length > 100 ? result.substring(0, 100) + '...' : result;
    }
    
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    
    return String(result);
  };

  if (!isOpen) return null;

  return (
    <div className="status-tracking-panel">
      <div className="panel-header">
        <h3>状态跟踪</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {/* 状态统计 */}
      <div className="status-stats">
        <div className="stat-item">
          <span className="stat-label">总数</span>
          <span className="stat-value">{statusStats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">等待</span>
          <span className="stat-value" style={{color: getStatusColor('pending')}}>{statusStats.pending}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">执行中</span>
          <span className="stat-value" style={{color: getStatusColor('running')}}>{statusStats.running}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">完成</span>
          <span className="stat-value" style={{color: getStatusColor('completed')}}>{statusStats.completed}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">失败</span>
          <span className="stat-value" style={{color: getStatusColor('failed')}}>{statusStats.failed}</span>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="filter-buttons">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          等待中
        </button>
        <button 
          className={filter === 'running' ? 'active' : ''}
          onClick={() => setFilter('running')}
        >
          执行中
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          已完成
        </button>
        <button 
          className={filter === 'failed' ? 'active' : ''}
          onClick={() => setFilter('failed')}
        >
          失败
        </button>
      </div>

      {/* 节点列表 */}
      <div className="nodes-list">
        {filteredNodes.map(node => (
          <div 
            key={node.id} 
            className={`node-item ${selectedNodeId === node.id ? 'selected' : ''}`}
            onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
          >
            <div className="node-header">
              <div className="node-info">
                <span className="node-type-icon">{getNodeTypeIcon(node.type)}</span>
                <span className="node-label">{node.label}</span>
              </div>
              <div className="node-status">
                <span className="status-icon">{getStatusIcon(node.status)}</span>
                <span 
                  className="status-text"
                  style={{color: getStatusColor(node.status)}}
                >
                  {node.status}
                </span>
              </div>
            </div>
            
            {selectedNodeId === node.id && (
              <div className="node-details">
                <div className="detail-item">
                  <span className="detail-label">节点ID:</span>
                  <span className="detail-value">{node.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">节点类型:</span>
                  <span className="detail-value">{node.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">当前状态:</span>
                  <span className="detail-value" style={{color: getStatusColor(node.status)}}>
                    {node.status}
                  </span>
                </div>
                {(node.rawStatus || node.workflowStatus) && (
                  <div className="detail-item">
                    <span className="detail-label">状态来源:</span>
                    <div className="detail-value">
                      {node.rawStatus && (
                        <div>节点状态: <span style={{color: getStatusColor(node.rawStatus)}}>{node.rawStatus}</span></div>
                      )}
                      {node.workflowStatus && (
                        <div>工作流状态: <span style={{color: getStatusColor(node.workflowStatus)}}>{node.workflowStatus}</span></div>
                      )}
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">位置:</span>
                  <span className="detail-value">
                    ({Math.round(node.position.x)}, {Math.round(node.position.y)})
                  </span>
                </div>
                {node.result && (
                  <div className="detail-item">
                    <span className="detail-label">执行结果:</span>
                    <div className="detail-result">
                      <pre>{formatResult(node.result)}</pre>
                    </div>
                  </div>
                )}
                {node.data && Object.keys(node.data).length > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">节点数据:</span>
                    <div className="detail-data">
                      <pre>{JSON.stringify(node.data, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredNodes.length === 0 && (
        <div className="empty-state">
          <p>暂无{filter === 'all' ? '' : filter + '状态的'}节点</p>
        </div>
      )}
    </div>
  );
};

export default StatusTrackingPanel; 