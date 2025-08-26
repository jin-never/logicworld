import React, { useState, useEffect, useCallback, useRef } from 'react';
import './FlowlineStateIntegration.css';

/**
 * 流程线状态集成组件
 * 负责将后端状态管理系统与前端可视化流程线深度集成
 */
const FlowlineStateIntegration = ({ 
  workflowId, 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange,
  isExecuting 
}) => {
  const [stateData, setStateData] = useState(null);
  const [realTimeEvents, setRealTimeEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // 🔧 WebSocket连接管理 (实时状态更新)
  const connectWebSocket = useCallback(() => {
    if (!workflowId) return;

    try {
      const ws = new WebSocket(`ws://localhost:8000/ws/workflow/${workflowId}/state`);
      
      ws.onopen = () => {
        console.log('🔗 WebSocket连接已建立');
        setConnectionStatus('connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealTimeStateUpdate(data);
        } catch (error) {
          console.error('WebSocket消息解析失败:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket连接已断开');
        setConnectionStatus('disconnected');
        // 自动重连
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        setConnectionStatus('error');
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket连接失败，回退到轮询模式:', error);
      startPolling();
    }
  }, [workflowId]);

  // 🔧 轮询模式 (WebSocket失败时的备选方案)
  const startPolling = useCallback(() => {
    if (!workflowId) return;

    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/workflow/${workflowId}/flowline-sync`);
        const data = await response.json();
        handleStateUpdate(data);
        setConnectionStatus('polling');
      } catch (error) {
        console.error('轮询状态更新失败:', error);
        setConnectionStatus('error');
      }
    };

    poll(); // 立即执行一次
    pollIntervalRef.current = setInterval(poll, 1000); // 每秒轮询
  }, [workflowId]);

  // 🎯 处理实时状态更新
  const handleRealTimeStateUpdate = useCallback((eventData) => {
    console.log('📡 收到实时状态更新:', eventData);
    
    // 添加到事件日志
    setRealTimeEvents(prev => [
      ...prev.slice(-19), // 保留最近20条
      {
        ...eventData,
        id: Date.now(),
        timestamp: new Date().toISOString()
      }
    ]);

    // 根据事件类型更新流程线
    switch (eventData.event) {
      case 'node_started':
        updateNodeVisualState(eventData.node_id, 'running');
        break;
      case 'node_completed':
        updateNodeVisualState(eventData.node_id, 'success', eventData.data);
        break;
      case 'node_failed':
        updateNodeVisualState(eventData.node_id, 'error', { error: eventData.data.error });
        break;
      case 'data_flow_updated':
        updateDataFlowVisualization(eventData.node_id, eventData.data);
        break;
      case 'workflow_completed':
        updateWorkflowCompleted();
        break;
    }
  }, []);

  // 🎯 处理状态数据更新
  const handleStateUpdate = useCallback((data) => {
    setStateData(data);
    
    // 批量更新节点状态
    if (data.node_states) {
      const updatedNodes = nodes.map(node => {
        const nodeState = data.node_states[node.id];
        if (nodeState) {
          return {
            ...node,
            data: {
              ...node.data,
              status: nodeState.status,
              progress: nodeState.progress,
              execution_duration: nodeState.duration,
              execution_error: nodeState.error,
              outputContent: nodeState.outputs?.content || node.data.outputContent,
              // 🔧 新增：执行结果存储
              execution_result: {
                outputs: nodeState.outputs,
                status: nodeState.status,
                timestamp: new Date().toISOString()
              }
            }
          };
        }
        return node;
      });
      
      onNodesChange(updatedNodes);
    }

    // 更新边的状态
    if (data.edge_states) {
      const updatedEdges = edges.map(edge => {
        const edgeState = data.edge_states[edge.id];
        if (edgeState) {
          return {
            ...edge,
            animated: edgeState.active,
            style: {
              ...edge.style,
              stroke: edgeState.active ? '#4CAF50' : '#ddd'
            }
          };
        }
        return edge;
      });
      
      onEdgesChange(updatedEdges);
    }
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  // 🎯 更新单个节点可视化状态
  const updateNodeVisualState = useCallback((nodeId, status, data = {}) => {
    onNodesChange(prevNodes => 
      prevNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              status: status,
              execution_error: data.error,
              outputContent: data.content || data.result?.content || node.data.outputContent,
              // 🔧 状态变更时间戳
              statusUpdatedAt: new Date().toISOString(),
              // 🔧 执行结果更新
              execution_result: {
                ...node.data.execution_result,
                ...data,
                status: status,
                timestamp: new Date().toISOString()
              }
            }
          };
        }
        return node;
      })
    );
  }, [onNodesChange]);

  // 🎯 更新数据流可视化
  const updateDataFlowVisualization = useCallback((nodeId, flowData) => {
    // 高亮显示数据流路径
    const sourceEdges = edges.filter(edge => edge.source === nodeId);
    
    onEdgesChange(prevEdges => 
      prevEdges.map(edge => {
        if (sourceEdges.some(se => se.id === edge.id)) {
          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              stroke: '#2196F3',
              strokeWidth: 2
            },
            data: {
              ...edge.data,
              flowData: flowData.updated_outputs
            }
          };
        }
        return edge;
      })
    );

    // 3秒后恢复正常状态
    setTimeout(() => {
      onEdgesChange(prevEdges => 
        prevEdges.map(edge => {
          if (sourceEdges.some(se => se.id === edge.id)) {
            return {
              ...edge,
              animated: false,
              style: {
                ...edge.style,
                stroke: '#ddd',
                strokeWidth: 1
              }
            };
          }
          return edge;
        })
      );
    }, 3000);
  }, [edges, onEdgesChange]);

  // 🎯 工作流完成时的可视化效果
  const updateWorkflowCompleted = useCallback(() => {
    // 所有边显示成功状态
    onEdgesChange(prevEdges => 
      prevEdges.map(edge => ({
        ...edge,
        style: {
          ...edge.style,
          stroke: '#4CAF50',
          strokeWidth: 2
        }
      }))
    );

    // 触发完成动画
    setTimeout(() => {
      onEdgesChange(prevEdges => 
        prevEdges.map(edge => ({
          ...edge,
          style: {
            ...edge.style,
            stroke: '#ddd',
            strokeWidth: 1
          }
        }))
      );
    }, 5000);
  }, [onEdgesChange]);

  // 🔧 生命周期管理
  useEffect(() => {
    if (workflowId && isExecuting) {
      // 优先尝试WebSocket连接
      connectWebSocket();
    }

    return () => {
      // 清理连接
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [workflowId, isExecuting, connectWebSocket]);

  // 🎯 手动刷新状态
  const refreshState = useCallback(async () => {
    if (!workflowId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/workflow/${workflowId}/status`);
      const data = await response.json();
      handleStateUpdate(data);
    } catch (error) {
      console.error('手动刷新状态失败:', error);
    }
  }, [workflowId, handleStateUpdate]);

  // 🎯 导出状态分析数据
  const exportStateAnalysis = useCallback(() => {
    if (!stateData) return;

    const analysis = {
      workflow_id: workflowId,
      execution_summary: {
        total_nodes: Object.keys(stateData.node_states || {}).length,
        completed_nodes: Object.values(stateData.node_states || {}).filter(state => state.status === 'success').length,
        failed_nodes: Object.values(stateData.node_states || {}).filter(state => state.status === 'error').length,
        total_duration: Object.values(stateData.node_states || {}).reduce((sum, state) => sum + (state.duration || 0), 0)
      },
      real_time_events: realTimeEvents,
      data_flow: stateData.data_flow,
      generated_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${workflowId}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workflowId, stateData, realTimeEvents]);

  return (
    <div className="flowline-state-integration">
      {/* 状态连接指示器 */}
      <div className={`connection-indicator ${connectionStatus}`}>
        <div className="indicator-dot"></div>
        <span className="indicator-text">
          {connectionStatus === 'connected' && '🔗 实时连接'}
          {connectionStatus === 'polling' && '🔄 轮询模式'}
          {connectionStatus === 'disconnected' && '🔌 连接断开'}
          {connectionStatus === 'error' && '❌ 连接错误'}
        </span>
      </div>

      {/* 状态控制面板 */}
      <div className="state-control-panel">
        <button onClick={refreshState} className="refresh-btn">
          🔄 刷新状态
        </button>
        <button onClick={exportStateAnalysis} className="export-btn" disabled={!stateData}>
          📊 导出分析
        </button>
      </div>

      {/* 实时事件日志 */}
      {realTimeEvents.length > 0 && (
        <div className="real-time-events">
          <h4>📡 实时事件</h4>
          <div className="events-list">
            {realTimeEvents.slice(-5).map(event => (
              <div key={event.id} className={`event-item ${event.event}`}>
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="event-type">{event.event}</span>
                <span className="event-node">{event.node_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据流可视化信息 */}
      {stateData?.data_flow && (
        <div className="data-flow-info">
          <h4>🔗 数据流</h4>
          <div className="flow-summary">
            {Object.entries(stateData.data_flow).map(([nodeId, outputs]) => (
              <div key={nodeId} className="flow-node">
                <strong>{nodeId}:</strong>
                {Object.keys(outputs).join(', ') || '无输出'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowlineStateIntegration; 