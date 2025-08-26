/**
 * 我的工具面板组件
 * 显示用户的所有工具，包括AI工具、待批准工具、草稿工具等
 */

import React, { useState, useEffect } from 'react';
import { toolManager } from '../utils/toolManager.js';
import { APPROVAL_STATUS } from '../utils/toolDataModel.js';
// import './MyToolsPanel.css';

const MyToolsPanel = ({
  isOpen = false,
  onClose,
  onToolSelect,
  className = ''
}) => {
  const [myToolsCategories, setMyToolsCategories] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 加载我的工具数据
  useEffect(() => {
    if (isOpen) {
      loadMyTools();
    }
  }, [isOpen]);

  const loadMyTools = async () => {
    setLoading(true);
    try {
      // 确保工具管理器已初始化
      if (!toolManager.initialized) {
        await toolManager.initialize();
      }

      // 获取我的工具分类和统计信息
      const categories = toolManager.getMyToolsCategories();
      const toolStats = toolManager.getMyToolsStats();

      setMyToolsCategories(categories);
      setStats(toolStats);
    } catch (error) {
      console.error('加载我的工具失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取过滤后的工具
  const getFilteredTools = () => {
    let tools = [];

    if (selectedCategory === 'all') {
      // 获取所有工具
      Object.values(myToolsCategories).forEach(category => {
        tools.push(...category.tools);
      });
    } else {
      // 获取特定分类的工具
      const category = myToolsCategories[selectedCategory];
      if (category) {
        tools = category.tools;
      }
    }

    // 应用搜索过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      tools = tools.filter(tool => 
        tool.name.toLowerCase().includes(term) ||
        tool.description.toLowerCase().includes(term)
      );
    }

    return tools;
  };

  const getStatusBadge = (tool) => {
    if (tool.approvalStatus === APPROVAL_STATUS.PENDING) {
      return <span className="status-badge status-pending">⏳ 待批准</span>;
    }
    if (tool.approvalStatus === APPROVAL_STATUS.APPROVED) {
      return <span className="status-badge status-approved">✅ 已批准</span>;
    }
    if (tool.tested) {
      return <span className="status-badge status-tested">🧪 已测试</span>;
    }
    return <span className="status-badge status-draft">📝 草稿</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <div className={`my-tools-panel-overlay ${className}`}>
      <div className="my-tools-panel">
        <div className="panel-header">
          <h2>我的工具</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* 统计信息 */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{stats.total || 0}</span>
              <span className="stat-label">总工具数</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.tested || 0}</span>
              <span className="stat-label">已测试</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.pending || 0}</span>
              <span className="stat-label">待批准</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.approved || 0}</span>
              <span className="stat-label">已批准</span>
            </div>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="filter-section">
          <div className="category-filters">
            <button
              className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              全部 ({stats.total || 0})
            </button>
            {Object.entries(myToolsCategories).map(([key, category]) => (
              <button
                key={key}
                className={`filter-btn ${selectedCategory === key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(key)}
              >
                {category.icon} {category.name} ({category.tools.length})
              </button>
            ))}
          </div>

          <div className="search-section">
            <input
              type="text"
              placeholder="搜索工具..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* 工具列表 */}
        <div className="tools-section">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : getFilteredTools().length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛠️</div>
              <div className="empty-text">
                {searchTerm ? '未找到匹配的工具' : '暂无工具'}
              </div>
              <div className="empty-hint">
                {!searchTerm && '去配置页面添加您的第一个工具吧！'}
              </div>
            </div>
          ) : (
            <div className="tools-list">
              {getFilteredTools().map(tool => (
                <div 
                  key={tool.id} 
                  className="tool-item"
                  onClick={() => onToolSelect && onToolSelect(tool)}
                >
                  <div className="tool-header">
                    <h4 className="tool-name">{tool.name}</h4>
                    <div className="tool-badges">
                      <span className="source-badge" style={{ backgroundColor: tool.groupColor }}>
                        {tool.sourceType.toUpperCase()}
                      </span>
                      {getStatusBadge(tool)}
                    </div>
                  </div>

                  <div className="tool-description">
                    {tool.description}
                  </div>

                  <div className="tool-meta">
                    <div className="meta-item">
                      <span className="meta-label">分类:</span>
                      <span className="meta-value">{tool.functionalCategory}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">创建时间:</span>
                      <span className="meta-value">{formatDate(tool.createdAt)}</span>
                    </div>
                    {tool.testResults && (
                      <div className="meta-item">
                        <span className="meta-label">测试结果:</span>
                        <span className={`meta-value ${tool.testResults.success ? 'success' : 'error'}`}>
                          {tool.testResults.success ? '✅ 通过' : '❌ 失败'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="tool-capabilities">
                    {tool.capabilities && tool.capabilities.length > 0 && (
                      <div className="capabilities-list">
                        {tool.capabilities.map((capability, index) => (
                          <span key={index} className="capability-tag">
                            {capability}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="panel-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => loadMyTools()}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyToolsPanel;
