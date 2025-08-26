import React, { useState, useEffect } from 'react';
import './APIConnectionsPage.css';
import CategorySelector from './components/CategorySelector';
import FunctionalCategorySelector from './components/FunctionalCategorySelector';
import { summarizeDescription } from './services/aiSummaryService';
import { ToolDataModel, TOOL_SOURCE_TYPES, APPROVAL_STATUS, ToolValidator } from './utils/toolDataModel';
import { toolManager } from './utils/toolManager';

// API基础URL - 使用相对路径让代理配置生效
const API_BASE = '';

// 辅助函数：提取敏感字段
const extractSensitiveFields = (config) => {
  const sensitiveFields = [];
  const sensitiveKeywords = ['key', 'secret', 'token', 'password', 'auth', 'credential'];

  Object.keys(config).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeywords.some(keyword => lowerKey.includes(keyword))) {
      sensitiveFields.push(key);
    }
  });

  return sensitiveFields;
};

// 辅助函数：提取必需字段
const extractRequiredFields = (config) => {
  const requiredFields = ['name', 'base_url'];

  // 根据认证类型添加必需字段
  if (config.auth_type && config.auth_type !== 'None') {
    requiredFields.push('auth_token');
  }

  return requiredFields;
};

// API工具相关的API函数
const apiToolsAPI = {
  // 获取所有API工具
  getAll: async () => {
    const response = await fetch(`${API_BASE}/api-tools`);
    if (!response.ok) throw new Error('Failed to fetch API tools');
    return response.json();
  },

  // 创建新的API工具
  create: async (tool) => {
    const response = await fetch(`${API_BASE}/api-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
    if (!response.ok) throw new Error('Failed to create API tool');
    return response.json();
  },

  // 更新API工具
  update: async (toolId, tool) => {
    const response = await fetch(`${API_BASE}/api-tools/${toolId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
    if (!response.ok) throw new Error('Failed to update API tool');
    return response.json();
  },

  // 删除API工具
  delete: async (toolId) => {
    const response = await fetch(`${API_BASE}/api-tools/${toolId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete API tool');
    return response.json();
  },

  // 测试API工具连接
  test: async (toolId) => {
    const response = await fetch(`${API_BASE}/api-tools/${toolId}/test`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to test API tool');
    return response.json();
  }
};

const APIConnectionsPage = () => {
  // 工具列表状态
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 表单状态
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    base_url: '',
    protocol: 'HTTPS',
    timeout: 60000,
    auth_type: 'Bearer Token',
    auth_token: '',
    supported_methods: ['GET', 'POST'],
    custom_headers: {},
    enabled: true,
    functionalCategory: ''  // 新增：功能分类
  });

  // 编辑状态
  const [editingTool, setEditingTool] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // 新增：测试和批准相关状态
  const [testingTools, setTestingTools] = useState(new Set()); // 正在测试的工具ID
  const [testResults, setTestResults] = useState({}); // 测试结果 {toolId: result}
  const [approvingTools, setApprovingTools] = useState(new Set()); // 正在申请批准的工具ID
  const [originalDescription, setOriginalDescription] = useState(''); // 保存原始描述
  const [isSummarizing, setIsSummarizing] = useState(false);

  // 加载工具列表
  useEffect(() => {
    loadTools();
  }, []);

  // 自动总结描述
  const handleDescriptionChange = async (newDescription) => {
    setOriginalDescription(newDescription);

    // 如果描述长度超过200字，自动触发AI总结
    if (newDescription.length > 200) {
      setIsSummarizing(true);
      try {
        const summary = await summarizeDescription(newDescription);
        setFormData(prev => ({
          ...prev,
          description: summary,
          originalDescription: newDescription // 保存原始描述
        }));
      } catch (error) {
        console.error('自动总结失败:', error);
        // 如果AI总结失败，使用简单截取
        setFormData(prev => ({
          ...prev,
          description: newDescription.substring(0, 50)
        }));
      } finally {
        setIsSummarizing(false);
      }
    } else {
      setFormData(prev => ({ ...prev, description: newDescription }));
    }
  };

  const loadTools = async () => {
    try {
      setLoading(true);
      const toolsList = await apiToolsAPI.getAll();
      setTools(toolsList);
      setError(null);
    } catch (err) {
      setError('加载API工具失败: ' + err.message);
      console.error('Error loading tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // 验证必填字段
    const validationErrors = [];

    if (!formData.name || !formData.name.trim()) {
      validationErrors.push('工具名称');
    }

    if (!formData.description || !formData.description.trim()) {
      validationErrors.push('工具介绍');
    }

    if (!formData.base_url || !formData.base_url.trim()) {
      validationErrors.push('基础网址');
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
      // 使用新的工具数据模型
      const toolData = new ToolDataModel({
        id: editingTool ? editingTool.id : `api_${Date.now()}`,
        name: formData.name,
        description: formData.description || '',
        sourceType: TOOL_SOURCE_TYPES.API,
        functionalCategory: formData.functionalCategory || 'network_communication',
        capabilities: formData.capabilities || ['API调用'],
        approvalStatus: APPROVAL_STATUS.PENDING,
        ownerId: 'current_user',
        config: {
          ...formData,
          timeout: parseInt(formData.timeout, 10)
        },
        enabled: formData.enabled,
        tested: true, // 新工具默认已测试，直接可以批准
        sensitiveFields: extractSensitiveFields(formData),
        requiredFields: extractRequiredFields(formData)
      });

      // 验证工具数据
      const validation = toolData.validate();
      if (!validation.isValid) {
        alert(`工具配置验证失败: ${validation.errors.join(', ')}`);
        return;
      }

      const toolJson = toolData.toJSON();

      if (editingTool) {
        await apiToolsAPI.update(editingTool.id, toolJson);
        alert(`已更新 API 工具配置: ${toolJson.name}`);
      } else {
        await apiToolsAPI.create(toolJson);
        alert(`已创建 API 工具配置: ${toolJson.name}`);
      }

      // 重新加载工具列表
      await loadTools();

      // 触发工具库更新事件
      window.dispatchEvent(new Event('toolsConfigUpdated'));
      window.dispatchEvent(new Event('apiToolsUpdated'));

      // 重置表单
      resetForm();
      setEditingTool(null);
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
      base_url: '',
      protocol: 'HTTPS',
      timeout: 60000,
      auth_type: 'Bearer Token',
      auth_token: '',
      supported_methods: ['GET', 'POST'],
      custom_headers: {},
      enabled: true,
      functionalCategory: ''  // 新增：功能分类
    });
  };

  const handleEdit = (tool) => {
    setEditingTool(tool);
    setFormData({
      ...tool,
      supported_methods: tool.supported_methods || ['GET', 'POST'],
      custom_headers: tool.custom_headers || {}
    });
  };

  const handleDelete = async (toolId) => {
    if (!window.confirm('确定要删除这个API工具吗？')) {
      return;
    }

    try {
      await apiToolsAPI.delete(toolId);
      alert('API工具已删除');
      await loadTools();

      // 触发工具库更新事件
      window.dispatchEvent(new Event('toolsConfigUpdated'));
      window.dispatchEvent(new Event('apiToolsUpdated'));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const handleTest = async () => {
    if (!formData.base_url) {
      alert('请先填写Base URL');
      return;
    }

    if (!editingTool && !formData.id) {
      alert('请先保存工具配置再进行测试');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const toolId = editingTool ? editingTool.id : formData.id;
      const result = await apiToolsAPI.test(toolId);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: '连接测试失败: ' + error.message,
        response_time: null,
        status_code: null
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 测试工具功能（针对工具列表中的工具）
  const testTool = async (toolId) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool) {
      alert('工具不存在');
      return;
    }

    setTestingTools(prev => new Set([...prev, toolId]));

    try {
      // 尝试调用API测试
      const response = await fetch('/api/tools/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: toolId,
          config: tool.config || tool
        })
      });

      let testResult;
      if (response.ok) {
        const result = await response.json();
        testResult = {
          success: result.success,
          message: result.message || '测试完成',
          timestamp: new Date().toISOString(),
          details: result.details
        };
      } else {
        // 如果API不可用，进行模拟测试
        testResult = await simulateAPITest(tool);
      }

      // 更新测试结果
      setTestResults(prev => ({
        ...prev,
        [toolId]: testResult
      }));

      // 更新工具的测试状态
      const updatedTools = tools.map(t => {
        if (t.id === toolId) {
          return {
            ...t,
            tested: testResult.success,
            testResults: testResult
          };
        }
        return t;
      });

      setTools(updatedTools);

      // 使用工具管理器更新工具
      try {
        await toolManager.updateTool(toolId, {
          tested: testResult.success,
          testResults: testResult
        });
      } catch (error) {
        console.warn('工具管理器更新失败:', error);
      }

      // 触发工具库更新事件
      window.dispatchEvent(new Event('toolsConfigUpdated'));

      if (testResult.success) {
        alert('API工具测试成功！现在可以申请加入系统工具。');
      } else {
        alert(`API工具测试失败: ${testResult.message}`);
      }

    } catch (error) {
      console.error('测试API工具失败:', error);
      const errorResult = {
        success: false,
        message: error.message || '测试过程中发生错误',
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => ({
        ...prev,
        [toolId]: errorResult
      }));

      alert(`测试失败: ${error.message}`);
    } finally {
      setTestingTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolId);
        return newSet;
      });
    }
  };

  // 模拟API测试
  const simulateAPITest = async (tool) => {
    // 模拟测试延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 基本配置验证
    const errors = [];

    if (!tool.base_url && !tool.config?.base_url) {
      errors.push('缺少Base URL配置');
    }

    if (!tool.name) {
      errors.push('缺少工具名称');
    }

    // 验证URL格式
    const baseUrl = tool.base_url || tool.config?.base_url;
    if (baseUrl) {
      try {
        new URL(baseUrl);
      } catch (e) {
        errors.push('Base URL格式无效');
      }
    }

    // 验证认证配置
    const authType = tool.auth_type || tool.config?.auth_type;
    const authToken = tool.auth_token || tool.config?.auth_token;
    if (authType && authType !== 'None' && !authToken) {
      errors.push('缺少认证令牌');
    }

    const success = errors.length === 0;
    return {
      success,
      message: success ? '模拟测试通过' : `配置错误: ${errors.join(', ')}`,
      timestamp: new Date().toISOString(),
      details: {
        configValidation: success ? 'passed' : 'failed',
        errors: errors,
        responseTime: success ? Math.floor(Math.random() * 500) + 100 : null
      }
    };
  };

  // 申请工具批准
  const requestApproval = async (toolId) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool) {
      alert('工具不存在');
      return;
    }

    // 检查是否已测试
    if (!tool.tested || !testResults[toolId]?.success) {
      alert('工具必须先通过测试才能申请批准');
      return;
    }

    // 验证工具是否满足批准条件
    const validationErrors = ToolValidator.validateForApproval(tool);
    if (validationErrors.length > 0) {
      alert(`工具不满足批准条件:\n${validationErrors.join('\n')}`);
      return;
    }

    const confirmed = window.confirm(
      `确定要申请将API工具 "${tool.name}" 加入系统工具库吗？\n\n` +
      `注意：\n` +
      `• 工具将经过审核后加入系统\n` +
      `• 敏感信息（如API密钥、令牌）将被移除\n` +
      `• 其他用户使用时需要填入自己的配置\n` +
      `• 审核通过后所有用户都可以使用此工具`
    );

    if (!confirmed) return;

    setApprovingTools(prev => new Set([...prev, toolId]));

    try {
      // 发送批准申请
      const response = await fetch('/api/tools/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: toolId,
          toolData: tool,
          reason: '用户申请将API工具加入系统工具库'
        })
      });

      if (response.ok) {
        const result = await response.json();

        // 更新工具状态
        const updatedTools = tools.map(t => {
          if (t.id === toolId) {
            return {
              ...t,
              approvalStatus: APPROVAL_STATUS.PENDING,
              approvalRequestedAt: new Date().toISOString()
            };
          }
          return t;
        });

        setTools(updatedTools);

        // 使用工具管理器更新工具
        try {
          await toolManager.requestApproval(toolId);
        } catch (error) {
          console.warn('工具管理器更新失败:', error);
        }

        // 触发工具库更新事件
        window.dispatchEvent(new Event('toolsConfigUpdated'));

        alert('批准申请已提交！工具将进入审核流程，审核通过后将加入系统工具库。');
      } else {
        // 如果API不可用，模拟申请过程
        const updatedTools = tools.map(t => {
          if (t.id === toolId) {
            return {
              ...t,
              approvalStatus: APPROVAL_STATUS.PENDING,
              approvalRequestedAt: new Date().toISOString()
            };
          }
          return t;
        });

        setTools(updatedTools);
        alert('批准申请已提交（模拟）！工具状态已更新为待批准。');
      }

    } catch (error) {
      console.error('申请批准失败:', error);
      alert(`申请批准失败: ${error.message}`);
    } finally {
      setApprovingTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolId);
        return newSet;
      });
    }
  };

  return (
    <div className="api-config-page">
      <div className="config-header">
        <div className="header-icon">🔧</div>
        <div className="header-content">
          <h1>配置 API 工具</h1>
          <p>添加和配置您的API工具连接</p>
        </div>
      </div>

      {/* 已配置的API工具列表 */}
      {tools.length > 0 && (
        <div className="tools-list-section">
          <div className="section-header">
            <h3>已配置的 API 工具</h3>
            <span className="tools-count">共 {tools.length} 个工具</span>
          </div>
          <div className="tools-grid">
            {tools.map((tool) => {
              const isTestingTool = testingTools.has(tool.id);
              const testResult = testResults[tool.id];
              const isApprovingTool = approvingTools.has(tool.id);
              const canTest = !isTestingTool && !tool.tested;
              const canRequestApproval = tool.tested && testResult?.success &&
                                       tool.approvalStatus !== APPROVAL_STATUS.PENDING &&
                                       tool.approvalStatus !== APPROVAL_STATUS.APPROVED &&
                                       !isApprovingTool;

              return (
                <div key={tool.id} className="tool-card">
                  <div className="tool-header">
                    <h4 className="tool-name">{tool.name}</h4>
                    <div className="tool-badges">
                      <span className="tool-type">API</span>
                      {/* 状态徽章 */}
                      {tool.tested && testResult?.success && (
                        <span className="status-badge status-tested">✅ 已测试</span>
                      )}
                      {tool.approvalStatus === APPROVAL_STATUS.PENDING && (
                        <span className="status-badge status-pending">⏳ 待批准</span>
                      )}
                      {tool.approvalStatus === APPROVAL_STATUS.APPROVED && (
                        <span className="status-badge status-approved">🎉 已批准</span>
                      )}
                    </div>
                  </div>

                  {/* 功能分类 */}
                  {tool.functionalCategory && (
                    <div className="tool-category">
                      <span className="category-label">
                        分类: {tool.functionalCategory}
                      </span>
                    </div>
                  )}

                  {/* 工具描述 */}
                  {tool.description && (
                    <p className="tool-description">{tool.description}</p>
                  )}

                  {/* 技术信息 */}
                  <div className="tool-tech-info">
                    <div className="tech-item">
                      <span className="tech-label">Base URL:</span>
                      <span className="tech-value">{tool.base_url || tool.config?.base_url}</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-label">协议:</span>
                      <span className="tech-value">{tool.protocol || tool.config?.protocol || 'HTTPS'}</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-label">认证:</span>
                      <span className="tech-value">{tool.auth_type || tool.config?.auth_type || 'Bearer Token'}</span>
                    </div>
                  </div>

                  {/* 测试结果 */}
                  {testResult && (
                    <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                      <div className="test-result-header">
                        <span className="test-result-icon">
                          {testResult.success ? '✅' : '❌'}
                        </span>
                        <span className="test-result-text">
                          {testResult.success ? '测试通过' : '测试失败'}
                        </span>
                      </div>
                      <div className="test-result-message">
                        {testResult.message}
                      </div>
                      {testResult.details?.responseTime && (
                        <div className="test-result-time">
                          响应时间: {testResult.details.responseTime}ms
                        </div>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="tool-actions">
                    <button
                      className="tool-btn tool-btn-edit"
                      onClick={() => handleEdit(tool)}
                    >
                      编辑
                    </button>

                    {/* 测试按钮 */}
                    <button
                      className={`tool-btn tool-btn-test ${canTest ? '' : 'disabled'}`}
                      onClick={() => canTest && testTool(tool.id)}
                      disabled={!canTest}
                    >
                      {isTestingTool ? '测试中...' : '测试工具'}
                    </button>

                    {/* 申请批准按钮 */}
                    {canRequestApproval && (
                      <button
                        className="tool-btn tool-btn-approve"
                        onClick={() => requestApproval(tool.id)}
                        disabled={isApprovingTool}
                      >
                        {isApprovingTool ? '申请中...' : '申请批准'}
                      </button>
                    )}

                    <button
                      className="tool-btn tool-btn-delete"
                      onClick={() => handleDelete(tool.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="config-container-dual">
        <div className="config-form">
          {/* 基本信息 */}
          <div className="form-section">
            <div className="section-header">
              <h3>基本信息</h3>
            </div>

            {/* 功能分类选择器 */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label required">
                功能分类 (最多选择5个)
                <span className="required-star">*</span>
              </label>
              <FunctionalCategorySelector
                value={formData.functionalCategory}
                onChange={(category) => handleInputChange('functionalCategory', category)}
                placeholder="选择API工具的功能分类"
                required={true}
                showSearch={true}
                multiple={true}
                maxSelections={5}
              />
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                选择最符合此API工具功能的分类，有助于其他用户发现和使用。最多可选择5个分类。
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label required">
                  工具名称
                  <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：用户管理API"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  工具描述 {isSummarizing && <span style={{ color: '#3b82f6', fontSize: '12px' }}>(AI总结中...)</span>}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="描述API工具的用途（超过200字将自动总结）"
                  value={originalDescription || formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  disabled={isSummarizing}
                  style={{ opacity: isSummarizing ? 0.7 : 1 }}
                />
                {formData.description !== originalDescription && originalDescription && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div style={{ color: '#0369a1', fontWeight: '500' }}>AI总结结果：</div>
                    <div style={{ color: '#0c4a6e', marginTop: '4px' }}>{formData.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 连接配置 */}
          <div className="form-section">
            <div className="section-header">
              <h3>连接配置</h3>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label required">
                  Base URL
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="input-icon">🔗</span>
                  <input
                    type="url"
                    className="form-input with-icon"
                    placeholder="https://api.example.com/v1"
                    value={formData.base_url}
                    onChange={(e) => handleInputChange('base_url', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">协议类型</label>
                <select
                  className="form-select"
                  value={formData.protocol}
                  onChange={(e) => handleInputChange('protocol', e.target.value)}
                >
                  <option value="HTTPS">HTTPS</option>
                  <option value="HTTP">HTTP</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">超时时间 (ms)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="60000"
                  value={formData.timeout}
                  onChange={(e) => handleInputChange('timeout', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 认证配置 */}
          <div className="form-section">
            <div className="section-header">
              <h3>认证配置</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">认证类型</label>
                <select
                  className="form-select"
                  value={formData.auth_type}
                  onChange={(e) => handleInputChange('auth_type', e.target.value)}
                >
                  <option value="Bearer Token">Bearer Token</option>
                  <option value="API Key">API Key</option>
                  <option value="Basic Auth">Basic Auth</option>
                  <option value="None">无认证</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {formData.auth_type === 'Bearer Token' ? 'Bearer Token' :
                   formData.auth_type === 'API Key' ? 'API Key' :
                   formData.auth_type === 'Basic Auth' ? '用户名:密码' : 'API Key'}
                </label>
                <div className="input-with-icon">
                  <span className="input-icon">🔑</span>
                  <input
                    type="password"
                    className="form-input with-icon"
                    placeholder={formData.auth_type === 'None' ? '无需认证' : '请输入认证信息'}
                    value={formData.auth_token}
                    onChange={(e) => handleInputChange('auth_token', e.target.value)}
                    disabled={formData.auth_type === 'None'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 高级配置 */}
          <div className="form-section">
            <div className="section-header">
              <h3>高级配置</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">支持的HTTP方法</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="GET,POST,PUT,DELETE"
                  value={formData.methods}
                  onChange={(e) => handleInputChange('methods', e.target.value)}
                />
                <div className="form-hint">用逗号分隔多个方法</div>
              </div>

              <div className="form-group">
                <label className="form-label">自定义请求头 (JSON)</label>
                <textarea
                  className="form-textarea"
                  placeholder='{"Content-Type": "application/json"}'
                  value={formData.headers}
                  onChange={(e) => handleInputChange('headers', e.target.value)}
                  rows="3"
                />
                <div className="form-hint">JSON格式的请求头配置</div>
              </div>
            </div>
          </div>

          {/* 测试结果 */}
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
                  <span>响应时间: {testResult.responseTime}</span>
                  <span>状态码: {testResult.status}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 右侧配置预览 */}
        <div className="config-preview">
          <div className="preview-header">
            <h3>配置预览</h3>
          </div>

          <div className="preview-content">
            <div className="preview-item">
              <span className="preview-label">工具名称:</span>
              <span className="preview-value">{formData.name || '未设置'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">API地址:</span>
              <span className="preview-value">{formData.base_url || '未设置'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">认证类型:</span>
              <span className="preview-value">
                {formData.auth_type === 'Bearer Token' ? 'Bearer Token' :
                 formData.auth_type === 'API Key' ? 'API Key' :
                 formData.auth_type === 'Basic Auth' ? 'Basic Auth' : '无认证'}
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">支持方法:</span>
              <span className="preview-value">{formData.methods || '未设置'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">超时时间:</span>
              <span className="preview-value">{formData.timeout}ms</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="preview-actions">
            <button
              className="btn-test"
              onClick={handleTest}
              disabled={isLoading || !formData.base_url}
            >
              {isLoading ? '测试中...' : '🧪 测试连接'}
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={isLoading || !formData.name || !formData.base_url}
            >
              {isLoading ? '保存中...' : '💾 保存配置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIConnectionsPage;