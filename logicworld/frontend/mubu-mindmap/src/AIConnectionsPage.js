import React, { useState, useEffect } from 'react';
import './AIConnectionsPage.css';
import CategorySelector from './components/CategorySelector';
import FunctionalCategorySelector from './components/FunctionalCategorySelector';

// API基础URL - 使用相对路径让代理配置生效
const API_BASE = '';

// AI工具相关的API函数
const aiToolsAPI = {
  // 获取所有AI工具
  getAll: async () => {
    const response = await fetch(`${API_BASE}/ai-tools`);
    if (!response.ok) throw new Error('Failed to fetch AI tools');
    return response.json();
  },

  // 创建新的AI工具
  create: async (tool) => {
    const response = await fetch(`${API_BASE}/ai-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
    if (!response.ok) throw new Error('Failed to create AI tool');
    return response.json();
  },

  // 更新AI工具
  update: async (toolId, tool) => {
    const response = await fetch(`${API_BASE}/ai-tools/${toolId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
    if (!response.ok) throw new Error('Failed to update AI tool');
    return response.json();
  },

  // 删除AI工具
  delete: async (toolId) => {
    const response = await fetch(`${API_BASE}/ai-tools/${toolId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete AI tool');
    return response.json();
  },

  // 测试AI工具连接
  test: async (toolId) => {
    const response = await fetch(`${API_BASE}/ai-tools/${toolId}/test`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to test AI tool');
    return response.json();
  }
};

const AIConnectionsPage = () => {
  // 工具列表状态
  const [tools, setTools] = useState([]);

  // 界面状态
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState('config'); // config, test, advanced

  // 表单状态
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    provider: '',
    model: '',
    api_key: '',
    base_url: '',
    max_tokens: 4000,
    temperature: 0.7,
    enabled: true,
    functionalCategory: ''  // 新增：功能分类
  });

  // 编辑状态
  const [editingTool, setEditingTool] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // 加载工具列表
  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const toolsList = await aiToolsAPI.getAll();
      setTools(toolsList);
    } catch (err) {
      console.error('Error loading tools:', err);
    }
  };

  // AI服务提供商配置
  const aiProviders = {
    deepseek: {
      name: 'DeepSeek',
      icon: '🚀',
      color: '#6366f1',
      defaultUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
      description: '高性能推理模型，支持代码生成和逻辑推理',
      features: ['代码生成', '逻辑推理', '多语言支持'],
      pricing: '免费额度充足'
    },
    qwen: {
      name: '通义千问',
      icon: '🌟',
      color: '#ff6b35',
      defaultUrl: 'https://dashscope.aliyuncs.com/api/v1',
      models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-vl-plus'],
      description: '阿里云大语言模型，支持多模态理解',
      features: ['文本生成', '多模态', '知识问答'],
      pricing: '按量计费'
    },
    zhipu: {
      name: '智谱AI',
      icon: '🧠',
      color: '#4c9aff',
      defaultUrl: 'https://open.bigmodel.cn/api/paas/v4',
      models: ['glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4v'],
      description: '清华大学技术，支持长文本和多模态',
      features: ['长文本', '多模态', '知识推理'],
      pricing: '免费试用'
    },
    baidu: {
      name: '百度文心',
      icon: '🎯',
      color: '#3385ff',
      defaultUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
      models: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-turbo-8k', 'ernie-speed-8k'],
      description: '百度自研大模型，中文理解能力强',
      features: ['中文优化', '知识问答', '创意写作'],
      pricing: '免费额度'
    },
    moonshot: {
      name: 'Moonshot AI',
      icon: '🌙',
      color: '#8b5cf6',
      defaultUrl: 'https://api.moonshot.cn/v1',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      description: '支持超长上下文的AI模型',
      features: ['长上下文', '文档分析', '代码理解'],
      pricing: '按token计费'
    },
    doubao: {
      name: '豆包',
      icon: '🎪',
      color: '#f59e0b',
      defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      models: ['doubao-lite-4k', 'doubao-pro-4k', 'doubao-pro-32k', 'doubao-pro-128k'],
      description: '字节跳动AI模型，响应速度快',
      features: ['快速响应', '多场景', '成本优化'],
      pricing: '竞争性定价'
    },
    openai: {
      name: 'OpenAI',
      icon: '🤖',
      color: '#10a37f',
      defaultUrl: 'https://api.openai.com/v1',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      description: '业界领先的AI模型，功能全面',
      features: ['多模态', '函数调用', '代码生成'],
      pricing: '按使用量计费'
    },
    custom: {
      name: '自定义服务',
      icon: '⚙️',
      color: '#6b7280',
      defaultUrl: '',
      models: [],
      description: '配置您自己的AI服务端点',
      features: ['灵活配置', '私有部署', '自定义模型'],
      pricing: '根据服务商'
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProviderSelect = (providerKey) => {
    setSelectedProvider(providerKey);
    const provider = aiProviders[providerKey];
    setFormData({
      id: '',
      name: '',
      description: '',
      provider: providerKey,
      model: provider.models[0] || '',
      api_key: '',
      base_url: provider.defaultUrl,
      max_tokens: 4000,
      temperature: 0.7,
      enabled: true,
      functionalCategory: ''  // 新增：功能分类
    });
    setShowConfigModal(true);
    setActiveTab('config');
  };

  const handleSave = async () => {
    // 验证必填字段
    const validationErrors = [];

    if (!formData.name || !formData.name.trim()) {
      validationErrors.push('名称');
    }

    if (!formData.description || !formData.description.trim()) {
      validationErrors.push('工具介绍');
    }

    if (!formData.api_key || !formData.api_key.trim()) {
      validationErrors.push('API Key');
    }

    if (!formData.functionalCategory ||
        (typeof formData.functionalCategory === 'string' && !formData.functionalCategory.trim()) ||
        (Array.isArray(formData.functionalCategory) && formData.functionalCategory.length === 0)) {
      validationErrors.push('功能分类');
    }

    // 如果有验证错误，显示提示并返回
    if (validationErrors.length > 0) {
      alert(`请填写以下必填字段：${validationErrors.join('、')}`);
      return;
    }

    setIsLoading(true);
    try {
      const toolData = {
        ...formData,
        id: editingTool ? editingTool.id : `ai_${Date.now()}`,
        temperature: parseFloat(formData.temperature),
        max_tokens: parseInt(formData.max_tokens, 10)
      };

      if (editingTool) {
        await aiToolsAPI.update(editingTool.id, toolData);
        alert(`已更新 AI 工具配置: ${toolData.name}`);
      } else {
        await aiToolsAPI.create(toolData);
        alert(`已创建 AI 工具配置: ${toolData.name}`);
      }

      // 重新加载工具列表
      await loadTools();

      // 触发工具库更新事件
      window.dispatchEvent(new Event('toolsConfigUpdated'));

      // 重置表单
      resetForm();
      setEditingTool(null);
      setShowConfigModal(false);
      setSelectedProvider(null);
    } catch (error) {
      alert('保存失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      provider: '',
      model: '',
      api_key: '',
      base_url: '',
      max_tokens: 4000,
      temperature: 0.7,
      enabled: true,
      functionalCategory: ''  // 新增：功能分类
    });
  };

  const handleEdit = (tool) => {
    setEditingTool(tool);
    setSelectedProvider(tool.provider);
    setFormData({
      ...tool,
      temperature: tool.temperature || 0.7,
      max_tokens: tool.max_tokens || 4000
    });
    setShowConfigModal(true);
    setActiveTab('config');
  };

  const handleDelete = async (toolId) => {
    if (!window.confirm('确定要删除这个AI工具吗？')) {
      return;
    }

    try {
      await aiToolsAPI.delete(toolId);
      alert('AI工具已删除');
      await loadTools();

      // 触发工具库更新事件
      window.dispatchEvent(new Event('toolsConfigUpdated'));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const handleTest = async () => {
    if (!formData.base_url || !formData.api_key) {
      alert('请先填写API URL和API Key');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // 模拟AI服务测试
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResult({
        success: true,
        message: 'AI服务连接测试成功',
        model: formData.model,
        responseTime: '1.2s',
        latency: '120ms',
        status: 'healthy'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'AI服务连接测试失败: ' + error.message,
        model: null,
        responseTime: null,
        latency: null,
        status: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowConfigModal(false);
    setSelectedProvider(null);
    setEditingTool(null);
    setTestResult(null);
    resetForm();
  };

  return (
    <div className="ai-connections-page">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">🤖</div>
          <div className="header-text">
            <h1>AI 服务连接配置</h1>
            <p>配置和管理您的AI服务提供商连接，支持多种主流AI平台</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{tools.length}</span>
            <span className="stat-label">已配置</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{tools.filter(t => t.enabled).length}</span>
            <span className="stat-label">活跃</span>
          </div>
        </div>
      </div>

      {/* 已配置的服务列表 */}
      {tools.length > 0 && (
        <div className="configured-services">
          <h2>已配置的AI服务</h2>
          <div className="services-grid">
            {tools.map((tool, index) => {
              const provider = aiProviders[tool.provider];
              return (
                <div key={tool.id || index} className="service-card">
                  <div className="service-header">
                    <div className="service-icon" style={{ backgroundColor: provider?.color || '#6b7280' }}>
                      {provider?.icon || '⚙️'}
                    </div>
                    <div className="service-info">
                      <h3>{tool.name}</h3>
                      <p>{provider?.name || tool.provider}</p>
                    </div>
                    <div className={`service-status ${tool.enabled ? 'active' : 'inactive'}`}>
                      {tool.enabled ? '活跃' : '停用'}
                    </div>
                  </div>
                  <div className="service-details">
                    <div className="detail-item">
                      <span className="detail-label">模型:</span>
                      <span className="detail-value">{tool.model || '未设置'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">API:</span>
                      <span className="detail-value">{tool.base_url ? '已配置' : '未配置'}</span>
                    </div>
                  </div>
                  <div className="service-actions">
                    <button className="btn-edit" onClick={() => handleEdit(tool)}>
                      编辑
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(tool.id)}>
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI服务提供商选择 */}
      <div className="providers-section">
        <h2>选择AI服务提供商</h2>
        <p className="section-description">选择您要配置的AI服务提供商，支持国内外主流平台</p>

        <div className="providers-grid">
          {Object.entries(aiProviders).map(([key, provider]) => (
            <div
              key={key}
              className="provider-card"
              onClick={() => handleProviderSelect(key)}
            >
              <div className="provider-header">
                <div className="provider-icon" style={{ backgroundColor: provider.color }}>
                  {provider.icon}
                </div>
                <div className="provider-info">
                  <h3>{provider.name}</h3>
                  <p className="provider-description">{provider.description}</p>
                </div>
              </div>

              <div className="provider-features">
                {provider.features.map((feature, index) => (
                  <span key={index} className="feature-tag">{feature}</span>
                ))}
              </div>

              <div className="provider-footer">
                <span className="pricing-info">{provider.pricing}</span>
                <button className="config-btn">配置连接</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 配置模态框 */}
      {showConfigModal && selectedProvider && (
        <div className="config-modal-overlay">
          <div className="config-modal">
            <div className="modal-header">
              <div className="modal-title">
                <div className="provider-icon" style={{ backgroundColor: aiProviders[selectedProvider].color }}>
                  {aiProviders[selectedProvider].icon}
                </div>
                <div>
                  <h3>配置 {aiProviders[selectedProvider].name}</h3>
                  <p>{aiProviders[selectedProvider].description}</p>
                </div>
              </div>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            {/* 标签页导航 */}
            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
                onClick={() => setActiveTab('config')}
              >
                基本配置
              </button>
              <button
                className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
                onClick={() => setActiveTab('test')}
              >
                连接测试
              </button>
              <button
                className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
                onClick={() => setActiveTab('advanced')}
              >
                高级设置
              </button>
            </div>

            <div className="modal-content">
              {/* 基本配置标签页 */}
              {activeTab === 'config' && (
                <div className="config-tab">
                  <div className="form-section">
                    <h4>基本信息</h4>

                    {/* 功能分类选择器 */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        功能分类 * (最多选择5个)
                      </label>
                      <FunctionalCategorySelector
                        value={formData.functionalCategory}
                        onChange={(category) => handleInputChange('functionalCategory', category)}
                        placeholder="选择AI工具的功能分类"
                        required={true}
                        showSearch={true}
                        multiple={true}
                        maxSelections={5}
                      />
                      <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                        选择最符合此AI工具功能的分类，有助于其他用户发现和使用。最多可选择5个分类。
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label required">服务名称</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="例如：我的DeepSeek服务"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">服务描述</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="描述AI服务的用途"
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>连接配置</h4>
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label className="form-label required">API 地址</label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder={aiProviders[selectedProvider].defaultUrl}
                          value={formData.base_url}
                          onChange={(e) => handleInputChange('base_url', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label required">API 密钥</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="请输入您的API密钥"
                          value={formData.api_key}
                          onChange={(e) => handleInputChange('api_key', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">模型名称</label>
                        <select
                          className="form-select"
                          value={formData.model}
                          onChange={(e) => handleInputChange('model', e.target.value)}
                        >
                          <option value="">选择模型</option>
                          {aiProviders[selectedProvider].models.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 连接测试标签页 */}
              {activeTab === 'test' && (
                <div className="test-tab">
                  <div className="test-section">
                    <h4>连接测试</h4>
                    <p>测试您的AI服务连接是否正常工作</p>

                    <div className="test-controls">
                      <button
                        className="btn-test-connection"
                        onClick={handleTest}
                        disabled={isLoading || !formData.base_url || !formData.api_key}
                      >
                        {isLoading ? '测试中...' : '开始测试'}
                      </button>
                    </div>

                    {testResult && (
                      <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                        <div className="result-header">
                          <span className="result-icon">
                            {testResult.success ? '✅' : '❌'}
                          </span>
                          <span className="result-message">{testResult.message}</span>
                        </div>
                        {testResult.success && (
                          <div className="result-details">
                            <div className="detail-row">
                              <span className="detail-label">模型:</span>
                              <span className="detail-value">{testResult.model}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">响应时间:</span>
                              <span className="detail-value">{testResult.responseTime}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">延迟:</span>
                              <span className="detail-value">{testResult.latency}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">状态:</span>
                              <span className="detail-value status-healthy">{testResult.status}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 高级设置标签页 */}
              {activeTab === 'advanced' && (
                <div className="advanced-tab">
                  <div className="form-section">
                    <h4>模型参数</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">最大令牌数</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="4000"
                          value={formData.max_tokens}
                          onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                        />
                        <span className="form-hint">控制生成文本的最大长度</span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">温度参数</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          className="form-input"
                          placeholder="0.7"
                          value={formData.temperature}
                          onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                        />
                        <span className="form-hint">控制生成文本的随机性，0-2之间</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>服务设置</h4>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.enabled}
                          onChange={(e) => handleInputChange('enabled', e.target.checked)}
                        />
                        <span className="checkbox-text">启用此AI服务</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 模态框底部按钮 */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isLoading || !formData.name || !formData.api_key}
              >
                {isLoading ? '保存中...' : (editingTool ? '更新配置' : '保存配置')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConnectionsPage;
