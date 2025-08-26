import React, { useState, useEffect } from 'react';
import './AIServicePage.css';

const AIServicePage = ({ configuredList, onEdit, onDelete, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');

  // AI服务提供商信息
  const aiProviders = {
    deepseek: { name: 'DeepSeek', icon: '🚀', color: '#6366f1' },
    qwen: { name: '通义千问', icon: '🌟', color: '#ff6b35' },
    zhipu: { name: '智谱AI', icon: '🧠', color: '#4c9aff' },
    baidu: { name: '百度文心', icon: '🎯', color: '#3385ff' },
    moonshot: { name: 'Moonshot AI', icon: '🌙', color: '#8b5cf6' },
    doubao: { name: '豆包', icon: '🎪', color: '#f59e0b' },
    custom: { name: '自定义', icon: '⚙️', color: '#6b7280' }
  };

  const getFilteredAndSortedTools = () => {
    let filtered = configuredList || [];

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(tool =>
        (tool.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.apiUrl || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 提供商过滤
    if (selectedProvider !== 'all') {
      filtered = filtered.filter(tool => {
        const provider = detectProvider(tool.apiUrl || tool.baseUrl || '');
        return provider === selectedProvider;
      });
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'provider':
          const providerA = detectProvider(a.apiUrl || a.baseUrl || '');
          const providerB = detectProvider(b.apiUrl || b.baseUrl || '');
          return providerA.localeCompare(providerB);
        case 'status':
          return (b.status || 'inactive').localeCompare(a.status || 'inactive');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const detectProvider = (url) => {
    if (!url) return 'custom';
    if (url.includes('deepseek.com')) return 'deepseek';
    if (url.includes('dashscope.aliyuncs.com')) return 'qwen';
    if (url.includes('bigmodel.cn')) return 'zhipu';
    if (url.includes('baidubce.com')) return 'baidu';
    if (url.includes('moonshot.cn')) return 'moonshot';
    if (url.includes('volces.com')) return 'doubao';
    if (url.includes('openai.com')) return 'openai';
    if (url.includes('anthropic.com')) return 'anthropic';
    return 'custom';
  };

  const getStatusBadge = (tool) => {
    const status = tool.status || 'inactive';
    const statusMap = {
      active: { text: '活跃', class: 'status-active' },
      inactive: { text: '未激活', class: 'status-inactive' },
      error: { text: '错误', class: 'status-error' }
    };
    return statusMap[status] || statusMap.inactive;
  };

  const handleTestConnection = async (tool) => {
    // 这里可以添加测试连接的逻辑
    console.log('测试连接:', tool);
    // 模拟测试
    setTimeout(() => {
      alert(`${tool.name || '工具'} 连接测试完成`);
    }, 1000);
  };

  const filteredTools = getFilteredAndSortedTools();

  return (
    <div className="ai-service-page">
      <div className="page-header">
        <div className="header-content">
          <h1>AI 服务连接</h1>
          <p>管理和配置您的AI服务提供商连接</p>
        </div>
        <button className="btn-primary" onClick={onAdd}>
          + 添加AI服务
        </button>
      </div>

      <div className="service-stats">
        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <div className="stat-number">{configuredList?.length || 0}</div>
            <div className="stat-label">已配置服务</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">
              {configuredList?.filter(t => t.status === 'active').length || 0}
            </div>
            <div className="stat-label">活跃连接</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-number">
              {Object.keys(aiProviders).length}
            </div>
            <div className="stat-label">支持提供商</div>
          </div>
        </div>
      </div>

      <div className="page-controls">
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="搜索AI服务..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="search-button" type="button">
              🔍
            </button>
          </div>
        </div>

        <div className="filter-section">
          <div className="provider-filter">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="provider-select"
            >
              <option value="all">所有提供商</option>
              {Object.entries(aiProviders).map(([key, provider]) => (
                <option key={key} value={key}>
                  {provider.icon} {provider.name}
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
              <option value="provider">按提供商排序</option>
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

      <div className={`services-container ${viewMode}`}>
        {filteredTools.length > 0 ? (
          filteredTools.map((tool, idx) => {
            const provider = detectProvider(tool.apiUrl || tool.baseUrl || '');
            const providerInfo = aiProviders[provider];
            const status = getStatusBadge(tool);

            return (
              <div key={idx} className="service-card">
                <div className="card-header">
                  <div className="service-info">
                    <div className="service-icon" style={{ backgroundColor: providerInfo.color }}>
                      {providerInfo.icon}
                    </div>
                    <div className="service-details">
                      <h3 className="service-name">
                        {tool.name || tool.apiUrl || '未命名服务'}
                      </h3>
                      <p className="service-provider">{providerInfo.name}</p>
                    </div>
                  </div>
                  <div className={`status-badge ${status.class}`}>
                    {status.text}
                  </div>
                </div>

                <div className="card-content">
                  <div className="service-url">
                    <span className="url-label">API地址:</span>
                    <span className="url-value">
                      {tool.apiUrl || tool.baseUrl || '未设置'}
                    </span>
                  </div>
                  
                  {tool.description && (
                    <p className="service-description">{tool.description}</p>
                  )}

                  <div className="service-meta">
                    <div className="meta-item">
                      <span className="meta-icon">🔑</span>
                      <span>API密钥: {tool.apiKey ? '已配置' : '未配置'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">🌐</span>
                      <span>协议: HTTPS</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="btn-test"
                    onClick={() => handleTestConnection(tool)}
                  >
                    测试连接
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => onEdit(tool)}
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
            <div className="empty-icon">🤖</div>
            <h3>
              {searchTerm || selectedProvider !== 'all' 
                ? '没有找到匹配的AI服务' 
                : '尚未配置AI服务'
              }
            </h3>
            <p>
              {searchTerm || selectedProvider !== 'all'
                ? '尝试调整搜索条件或筛选器'
                : '点击上方"添加AI服务"按钮开始配置您的第一个AI服务连接'
              }
            </p>
            {!searchTerm && selectedProvider === 'all' && (
              <button className="btn-primary" onClick={onAdd}>
                添加AI服务
              </button>
            )}
          </div>
        )}
      </div>

      {/* 支持的提供商展示 */}
      <div className="providers-section">
        <h3>支持的AI服务提供商</h3>
        <div className="providers-grid">
          {Object.entries(aiProviders).map(([key, provider]) => (
            <div key={key} className="provider-card">
              <div className="provider-icon" style={{ backgroundColor: provider.color }}>
                {provider.icon}
              </div>
              <span className="provider-name">{provider.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIServicePage;
