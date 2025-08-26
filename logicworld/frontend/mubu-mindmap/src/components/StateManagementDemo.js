import React, { useState, useEffect } from 'react';
import './StateManagementDemo.css';

const StateManagementDemo = ({ workflowId }) => {
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  // 获取工作流状态数据
  const fetchWorkflowStatus = async () => {
    if (!workflowId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/workflow/${workflowId}/status`);
      const data = await response.json();
      setWorkflowData(data);
    } catch (error) {
      console.error('获取工作流状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowStatus();
    // 定期更新状态
    const interval = setInterval(fetchWorkflowStatus, 2000);
    return () => clearInterval(interval);
  }, [workflowId]);

  if (loading && !workflowData) {
    return <div className="state-demo-loading">🔄 加载状态数据...</div>;
  }

  if (!workflowData) {
    return <div className="state-demo-empty">请选择一个工作流查看状态分离效果</div>;
  }

  return (
    <div className="state-management-demo">
      <div className="demo-header">
        <h2>🎯 状态与业务分离展示</h2>
        <p>工作流ID: <code>{workflowData.workflow_id}</code></p>
        <div className="refresh-button" onClick={fetchWorkflowStatus}>
          🔄 刷新
        </div>
      </div>

      <div className="demo-tabs">
        <div 
          className={`tab ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          📊 总览
        </div>
        <div 
          className={`tab ${selectedTab === 'execution' ? 'active' : ''}`}
          onClick={() => setSelectedTab('execution')}
        >
          🔧 执行状态
        </div>
        <div 
          className={`tab ${selectedTab === 'business' ? 'active' : ''}`}
          onClick={() => setSelectedTab('business')}
        >
          📋 业务数据
        </div>
        <div 
          className={`tab ${selectedTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setSelectedTab('nodes')}
        >
          🔍 节点详情
        </div>
      </div>

      <div className="demo-content">
        {selectedTab === 'overview' && (
          <OverviewTab workflowData={workflowData} />
        )}
        {selectedTab === 'execution' && (
          <ExecutionTab workflowData={workflowData} />
        )}
        {selectedTab === 'business' && (
          <BusinessTab workflowData={workflowData} />
        )}
        {selectedTab === 'nodes' && (
          <NodesTab workflowData={workflowData} />
        )}
      </div>
    </div>
  );
};

// 总览标签页
const OverviewTab = ({ workflowData }) => (
  <div className="overview-tab">
    <div className="comparison-container">
      <div className="old-format">
        <h3>🔴 改进前：混乱格式</h3>
        <div className="code-block">
          <pre>{JSON.stringify({
            "status": "completed",
            "result": {
              "node_type": "execution",        // 执行信息
              "task": "创建Word文档",           // 业务信息  
              "result": "文档创建成功",         // 业务结果
              "document_path": "/path.docx",   // 业务数据
              "success": true,                 // 状态信息
              "executed_at": "2025-08-13...", // 执行信息
              "ai_model": "deepseek-chat"      // 业务元数据
            }
          }, null, 2)}</pre>
        </div>
        <div className="problem-note">
          ❌ 问题：状态信息和业务数据混在一起，难以管理
        </div>
      </div>

      <div className="new-format">
        <h3>🟢 改进后：清晰分离</h3>
        <div className="code-block">
          <pre>{JSON.stringify({
            execution_status: workflowData.execution_status,
            business_results: workflowData.business_results,
            node_details: "... (见节点详情标签页)"
          }, null, 2)}</pre>
        </div>
        <div className="advantage-note">
          ✅ 优势：状态和业务数据完全分离，结构清晰
        </div>
      </div>
    </div>
  </div>
);

// 执行状态标签页
const ExecutionTab = ({ workflowData }) => (
  <div className="execution-tab">
    <h3>🔧 纯执行状态信息</h3>
    <div className="status-grid">
      <div className="status-card">
        <div className="status-label">执行状态</div>
        <div className={`status-value ${workflowData.execution_status.status}`}>
          {getStatusIcon(workflowData.execution_status.status)} {workflowData.execution_status.status}
        </div>
      </div>
      
      <div className="status-card">
        <div className="status-label">执行时长</div>
        <div className="status-value">
          {workflowData.execution_status.duration ? 
            `${workflowData.execution_status.duration.toFixed(2)}秒` : 
            '计算中...'
          }
        </div>
      </div>

      <div className="status-card">
        <div className="status-label">开始时间</div>
        <div className="status-value">
          {workflowData.execution_status.start_time ? 
            new Date(workflowData.execution_status.start_time).toLocaleString() : 
            '未开始'
          }
        </div>
      </div>

      <div className="status-card">
        <div className="status-label">当前节点</div>
        <div className="status-value">
          {workflowData.execution_status.current_node || '无'}
        </div>
      </div>
    </div>

    {workflowData.execution_status.error && (
      <div className="error-card">
        <h4>❌ 执行错误</h4>
        <p>{workflowData.execution_status.error}</p>
      </div>
    )}
  </div>
);

// 业务数据标签页
const BusinessTab = ({ workflowData }) => (
  <div className="business-tab">
    <h3>📋 纯业务数据信息</h3>
    
    <div className="business-section">
      <h4>📊 执行结果</h4>
      <div className="result-summary">
        <div className="result-item">
          <span className="label">已完成节点:</span>
          <span className="value">{workflowData.business_results.completed_nodes.length}</span>
        </div>
        <div className="result-item">
          <span className="label">失败节点:</span>
          <span className="value">{workflowData.business_results.failed_nodes.length}</span>
        </div>
        <div className="result-item">
          <span className="label">生成文档:</span>
          <span className="value">{workflowData.business_results.generated_documents.length}</span>
        </div>
      </div>
    </div>

    {workflowData.business_results.generated_documents.length > 0 && (
      <div className="business-section">
        <h4>📄 生成的文档</h4>
        <div className="document-list">
          {workflowData.business_results.generated_documents.map((doc, index) => (
            <div key={index} className="document-item">
              📄 {doc.split('\\').pop() || doc.split('/').pop()}
              <div className="document-path">{doc}</div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="business-section">
      <h4>📝 内容摘要</h4>
      <p>{workflowData.business_results.content_summary || '暂无内容'}</p>
    </div>
  </div>
);

// 节点详情标签页
const NodesTab = ({ workflowData }) => (
  <div className="nodes-tab">
    <h3>🔍 节点执行详情</h3>
    {Object.entries(workflowData.node_details).map(([nodeId, nodeData]) => (
      <div key={nodeId} className="node-detail-card">
        <div className="node-header">
          <h4>节点: {nodeId}</h4>
          <div className={`node-status ${nodeData.execution_info.status}`}>
            {getStatusIcon(nodeData.execution_info.status)} {nodeData.execution_info.status}
          </div>
        </div>

        <div className="node-content">
          <div className="execution-info">
            <h5>🔧 执行信息</h5>
            <div className="info-grid">
              <div>执行时长: {nodeData.execution_info.duration?.toFixed(2) || '0'}秒</div>
              <div>重试次数: {nodeData.execution_info.retry_count}</div>
              <div>开始时间: {nodeData.execution_info.start_time ? 
                new Date(nodeData.execution_info.start_time).toLocaleString() : '未开始'}</div>
            </div>
            {nodeData.execution_info.error && (
              <div className="error-info">❌ {nodeData.execution_info.error}</div>
            )}
          </div>

          <div className="business-info">
            <h5>📋 业务数据</h5>
            <div className="business-grid">
              <div>节点类型: {nodeData.business_data.node_type}</div>
              <div>任务: {nodeData.business_data.task}</div>
              <div>AI模型: {nodeData.business_data.ai_metadata.model}</div>
              {nodeData.business_data.file_paths.document && (
                <div>生成文档: {nodeData.business_data.file_paths.document.split('\\').pop()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// 辅助函数
const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
    case 'success':
      return '✅';
    case 'running':
      return '🔄';
    case 'failed':
    case 'error':
      return '❌';
    case 'pending':
      return '⏳';
    default:
      return '❓';
  }
};

export default StateManagementDemo; 