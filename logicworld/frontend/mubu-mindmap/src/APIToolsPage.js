import React, { useState, useEffect } from 'react';
import './APIToolsPage.css';

const APIToolsPage = ({ configuredList, onEdit, onDelete, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseUrl: '',
    protocol: 'HTTPS',
    timeout: 60000,
    authType: 'Bearer Token',
    authToken: '',
    methods: 'GET,POST',
    customHeaders: {}
  });

  // API工具分类
  const apiCategories = {
    rest: { name: 'REST API', icon: '🌐', color: '#007bff' },
    graphql: { name: 'GraphQL', icon: '📊', color: '#e10098' },
    webhook: { name: 'Webhook', icon: '🔗', color: '#28a745' },
    database: { name: '数据库', icon: '🗄️', color: '#6f42c1' },
    file: { name: '文件服务', icon: '📁', color: '#fd7e14' },
    auth: { name: '认证服务', icon: '🔐', color: '#dc3545' },
    other: { name: '其他', icon: '⚙️', color: '#6c757d' }
  };

  const getFilteredAndSortedTools = () => {
    let filtered = configuredList || [];

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(tool =>
        (tool.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.baseUrl || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tool => {
        const category = detectCategory(tool.baseUrl || '', tool.name || '');
        return category === selectedCategory;
      });
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'category':
          const categoryA = detectCategory(a.baseUrl || '', a.name || '');
          const categoryB = detectCategory(b.baseUrl || '', b.name || '');
          return categoryA.localeCompare(categoryB);
        case 'status':
          return (b.status || 'inactive').localeCompare(a.status || 'inactive');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const detectCategory = (url, name) => {
    const lowerUrl = url.toLowerCase();
    const lowerName = name.toLowerCase();
    
    if (lowerUrl.includes('graphql') || lowerName.includes('graphql')) return 'graphql';
    if (lowerUrl.includes('webhook') || lowerName.includes('webhook')) return 'webhook';
    if (lowerUrl.includes('database') || lowerUrl.includes('db') || lowerName.includes('数据库')) return 'database';
    if (lowerUrl.includes('file') || lowerUrl.includes('storage') || lowerName.includes('文件')) return 'file';
    if (lowerUrl.includes('auth') || lowerUrl.includes('login') || lowerName.includes('认证')) return 'auth';
    if (lowerUrl.includes('api')) return 'rest';
    return 'other';
  };

  const getStatusBadge = (tool) => {
    const status = tool.status || 'inactive';
    const statusMap = {
      active: { text: '正常', class: 'status-active' },
      inactive: { text: '未激活', class: 'status-inactive' },
      error: { text: '错误', class: 'status-error' },
      testing: { text: '测试中', class: 'status-testing' }
    };
    return statusMap[status] || statusMap.inactive;
  };

  const getMethodBadge = (method) => {
    const methodMap = {
      GET: { class: 'method-get' },
      POST: { class: 'method-post' },
      PUT: { class: 'method-put' },
      DELETE: { class: 'method-delete' },
      PATCH: { class: 'method-patch' }
    };
    return methodMap[method] || { class: 'method-default' };
  };

  const handleTestAPI = async (tool) => {
    console.log('测试API:', tool);
    try {
      const response = await fetch('/api/tools/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool)
      });
      const result = await response.json();
      if (result.success) {
        alert(`${tool.name || 'API工具'} 测试成功！`);
      } else {
        alert(`${tool.name || 'API工具'} 测试失败: ${result.error}`);
      }
    } catch (error) {
      alert(`${tool.name || 'API工具'} 测试失败: ${error.message}`);
    }
  };

  const handleAddTool = () => {
    setEditingTool(null);
    setFormData({
      name: '',
      description: '',
      baseUrl: '',
      protocol: 'HTTPS',
      timeout: 60000,
      authType: 'Bearer Token',
      authToken: '',
      methods: 'GET,POST',
      customHeaders: {}
    });
    setShowAddModal(true);
  };

  const handleEditTool = (tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name || '',
      description: tool.description || '',
      baseUrl: tool.baseUrl || '',
      protocol: tool.protocol || 'HTTPS',
      timeout: tool.timeout || 60000,
      authType: tool.authType || 'Bearer Token',
      authToken: tool.authToken || '',
      methods: tool.methods || 'GET,POST',
      customHeaders: tool.customHeaders || {}
    });
    setShowAddModal(true);
  };

  const handleSaveTool = async () => {
    try {
      const toolData = {
        ...formData,
        id: editingTool ? editingTool.id : `api_tool_${Date.now()}`,
        status: 'inactive'
      };

      const response = await fetch('/api/tools/api-tools', {
        method: editingTool ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      });

      if (response.ok) {
        setShowAddModal(false);
        // 刷新工具列表
        if (onAdd) onAdd();

        // 触发工具库更新事件
        window.dispatchEvent(new Event('toolsConfigUpdated'));

        alert(editingTool ? '工具更新成功！' : '工具添加成功！');
      } else {
        const error = await response.json();
        alert(`保存失败: ${error.message}`);
      }
    } catch (error) {
      alert(`保存失败: ${error.message}`);
    }
  };

  const filteredTools = getFilteredAndSortedTools();

  return (
    <div className="api-tools-page">
      <div className="page-header">
        <div className="header-content">
          <h1>API 工具</h1>
          <p>管理和配置您的API工具连接</p>
        </div>
        <button className="btn-primary" onClick={handleAddTool}>
          + 添加API工具
        </button>
      </div>

      <div className="api-stats">
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-number">{configuredList?.length || 0}</div>
            <div className="stat-label">API工具</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">
              {configuredList?.filter(t => t.status === 'active').length || 0}
            </div>
            <div className="stat-label">正常运行</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">
              {Object.keys(apiCategories).length}
            </div>
            <div className="stat-label">支持类型</div>
          </div>
        </div>
      </div>

      <div className="page-controls">
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="搜索API工具..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="search-button" type="button">
              🔍
            </button>
          </div>
        </div>

        <div className="filter-section">
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="all">所有类型</option>
              {Object.entries(apiCategories).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sort-section">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">按名称排序</option>
              <option value="category">按类型排序</option>
              <option value="status">按状态排序</option>
            </select>
          </div>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className={`tools-container ${viewMode}`}>
        {filteredTools.length > 0 ? (
          filteredTools.map((tool, idx) => {
            const category = detectCategory(tool.baseUrl || '', tool.name || '');
            const categoryInfo = apiCategories[category];
            const status = getStatusBadge(tool);

            return (
              <div key={idx} className="tool-card">
                <div className="card-header">
                  <div className="tool-info">
                    <div className="tool-icon" style={{ backgroundColor: categoryInfo.color }}>
                      {categoryInfo.icon}
                    </div>
                    <div className="tool-details">
                      <h3 className="tool-name">
                        {tool.name || tool.baseUrl || '未命名工具'}
                      </h3>
                      <p className="tool-category">{categoryInfo.name}</p>
                    </div>
                  </div>
                  <div className={`status-badge ${status.class}`}>
                    {status.text}
                  </div>
                </div>

                <div className="card-content">
                  <div className="tool-url">
                    <span className="url-label">API地址:</span>
                    <span className="url-value">
                      {tool.baseUrl || '未设置'}
                    </span>
                  </div>
                  
                  {tool.description && (
                    <p className="tool-description">{tool.description}</p>
                  )}

                  <div className="tool-meta">
                    <div className="meta-item">
                      <span className="meta-icon">🔑</span>
                      <span>认证: {tool.authType || '无'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">📡</span>
                      <span>协议: {tool.protocol || 'HTTP'}</span>
                    </div>
                    {tool.methods && (
                      <div className="meta-item">
                        <span className="meta-icon">⚡</span>
                        <div className="methods-list">
                          {tool.methods.split(',').map(method => (
                            <span 
                              key={method.trim()} 
                              className={`method-badge ${getMethodBadge(method.trim()).class}`}
                            >
                              {method.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="btn-test"
                    onClick={() => handleTestAPI(tool)}
                  >
                    测试API
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleEditTool(tool)}
                  >
                    编辑
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => onDelete(tool)}
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔧</div>
            <h3>
              {searchTerm || selectedCategory !== 'all' 
                ? '没有找到匹配的API工具' 
                : '尚未配置API工具'
              }
            </h3>
            <p>
              {searchTerm || selectedCategory !== 'all'
                ? '尝试调整搜索条件或筛选器'
                : '点击上方"添加API工具"按钮开始配置您的第一个API工具连接'
              }
            </p>
            {!searchTerm && selectedCategory === 'all' && (
              <button className="btn-primary" onClick={onAdd}>
                添加API工具
              </button>
            )}
          </div>
        )}
      </div>

      {/* 支持的API类型展示 */}
      <div className="categories-section">
        <h3>支持的API工具类型</h3>
        <div className="categories-grid">
          {Object.entries(apiCategories).map(([key, category]) => (
            <div key={key} className="category-card">
              <div className="category-icon" style={{ backgroundColor: category.color }}>
                {category.icon}
              </div>
              <span className="category-name">{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default APIToolsPage;
