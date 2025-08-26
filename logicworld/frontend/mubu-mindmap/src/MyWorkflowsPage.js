import React, { useState, useEffect } from 'react';
import './MyWorkflowsPage.css';
import AIWorkflowModal from './components/AIWorkflowModal';

// API基础URL - 使用相对路径让代理配置生效
const API_BASE = '';

// 工作流管理API
const workflowAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE}/api/workflows`);
    if (!response.ok) throw new Error('Failed to fetch workflows');
    return response.json();
  },

  delete: async (workflowId) => {
    const response = await fetch(`${API_BASE}/api/workflows/${workflowId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete workflow');
    return response.json();
  },

  updateAccess: async (workflowId) => {
    const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/access`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to update access time');
    return response.json();
  }
};

const MyWorkflowsPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('modified');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);

  // 加载工作流数据
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await workflowAPI.getAll();
      setWorkflows(data);
      setFilteredWorkflows(data);
      setError(null);
    } catch (error) {
      console.error('加载工作流失败:', error);
      setError('加载工作流失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 搜索和过滤
  useEffect(() => {
    let filtered = workflows.filter(workflow => 
      workflow.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(workflow => workflow.category === selectedCategory);
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'created':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'modified':
        default:
          return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      }
    });

    setFilteredWorkflows(filtered);
  }, [workflows, searchTerm, sortBy, selectedCategory]);

  const handleDeleteWorkflow = async (workflowId) => {
    if (!window.confirm('确定要删除这个工作流吗？')) return;
    
    try {
      await workflowAPI.delete(workflowId);
      await loadWorkflows();
    } catch (error) {
      console.error('删除工作流失败:', error);
      alert('删除工作流失败，请稍后重试');
    }
  };

  const handleEditWorkflow = async (workflow) => {
    try {
      await workflowAPI.updateAccess(workflow.id);
      // TODO: 导航到工作流编辑器
      console.log('编辑工作流:', workflow);
    } catch (error) {
      console.error('打开工作流失败:', error);
    }
  };

  const handleAIWorkflowGenerated = async (workflowData) => {
    try {
      console.log('AI生成的工作流:', workflowData);
      
      // 将AI生成的工作流保存到后端
      const response = await fetch(`${API_BASE}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: workflowData.title || 'AI生成工作流',
          description: workflowData.description || workflowData.userInput,
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          node_count: workflowData.nodes?.length || 0,
          edge_count: workflowData.edges?.length || 0,
          category: workflowData.category || 'ai_generated',
          tags: ['AI生成', '自动化'],
          metadata: workflowData.metadata
        })
      });

      if (response.ok) {
        // 刷新工作流列表
        await loadWorkflows();
        setShowAIModal(false);
        alert('AI工作流生成成功！');
      } else {
        throw new Error('保存工作流失败');
      }
    } catch (error) {
      console.error('保存AI工作流失败:', error);
      alert('保存AI工作流失败，请稍后重试');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未知时间';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorkflowIcon = (nodeCount) => {
    if (nodeCount >= 10) return '🏗️';
    if (nodeCount >= 5) return '⚙️';
    return '🔧';
  };

  if (loading) {
    return (
      <div className="workflows-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载工作流中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflows-page">
        <div className="error-container">
          <p>❌ {error}</p>
          <button onClick={loadWorkflows} className="retry-btn">重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="workflows-page">
      <div className="page-header">
        <div className="header-left">
          <h1>我的工作流</h1>
          <p>管理和组织你的自动化工作流</p>
        </div>
        <div className="header-actions">
          <button className="ai-create-btn" onClick={() => setShowAIModal(true)}>
            🤖 AI智能生成
          </button>
          <button className="create-btn" onClick={() => console.log('创建新工作流')}>
            ➕ 手动创建
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索工作流..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">所有分类</option>
            <option value="automation">自动化</option>
            <option value="data">数据处理</option>
            <option value="notification">通知提醒</option>
            <option value="integration">集成</option>
          </select>
          
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="modified">最近修改</option>
            <option value="created">创建时间</option>
            <option value="name">名称排序</option>
          </select>
          
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''} 
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className={`workflows-container ${viewMode}`}>
        {filteredWorkflows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔄</div>
            <h3>还没有工作流</h3>
            <p>创建你的第一个自动化工作流吧！</p>
            <button className="create-first-btn" onClick={() => console.log('创建第一个工作流')}>
              创建工作流
            </button>
          </div>
        ) : (
          filteredWorkflows.map(workflow => (
            <div key={workflow.id} className="workflow-card">
              <div className="workflow-header">
                <div className="workflow-icon">
                  {getWorkflowIcon(workflow.node_count || 0)}
                </div>
                <div className="workflow-info">
                  <h3 className="workflow-title">{workflow.title || '未命名工作流'}</h3>
                  <p className="workflow-description">{workflow.description || '暂无描述'}</p>
                </div>
              </div>
              
              <div className="workflow-meta">
                <div className="meta-item">
                  <span className="meta-label">节点数:</span>
                  <span className="meta-value">{workflow.node_count || 0}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">连接数:</span>
                  <span className="meta-value">{workflow.edge_count || 0}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">最后修改:</span>
                  <span className="meta-value">{formatDate(workflow.updated_at || workflow.created_at)}</span>
                </div>
              </div>
              
              <div className="workflow-actions">
                <button 
                  className="action-btn edit-btn" 
                  onClick={() => handleEditWorkflow(workflow)}
                  title="编辑工作流"
                >
                  ✏️ 编辑
                </button>
                <button 
                  className="action-btn copy-btn" 
                  onClick={() => console.log('复制工作流:', workflow.id)}
                  title="复制工作流"
                >
                  📋 复制
                </button>
                <button 
                  className="action-btn delete-btn" 
                  onClick={() => handleDeleteWorkflow(workflow.id)}
                  title="删除工作流"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI工作流生成模态框 */}
      {showAIModal && (
        <AIWorkflowModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onWorkflowGenerated={handleAIWorkflowGenerated}
        />
      )}
    </div>
  );
};

export default MyWorkflowsPage; 