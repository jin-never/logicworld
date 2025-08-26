/**
 * 工具配置表单组件
 * 用于配置MCP和API工具，包括功能标签选择
 */

import React, { useState, useEffect } from 'react';
import FunctionalCategorySelector from './FunctionalCategorySelector.js';
import { ToolDataModel, TOOL_SOURCE_TYPES, APPROVAL_STATUS, ToolValidator } from '../utils/toolDataModel.js';
import { inferFunctionalCategory } from '../utils/toolDataModel.js';
// import './ToolConfigurationForm.css';

const ToolConfigurationForm = ({
  toolType = 'mcp', // 'mcp' 或 'api'
  initialData = null,
  onSave,
  onCancel,
  onTest,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    functionalCategory: '',
    capabilities: [],
    config: {},
    sensitiveFields: [],
    requiredFields: [],
    enabled: true
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 工具类型选项
  const toolTypeOptions = {
    mcp: [
      { value: 'file_system', label: '文件系统', description: '文件和目录操作' },
      { value: 'database', label: '数据库', description: '数据库连接和查询' },
      { value: 'api_client', label: 'API客户端', description: '外部API调用' },
      { value: 'automation', label: '自动化', description: '任务自动化工具' },
      { value: 'utility', label: '实用工具', description: '通用实用功能' }
    ],
    api: [
      { value: 'rest_api', label: 'REST API', description: 'RESTful API服务' },
      { value: 'graphql', label: 'GraphQL', description: 'GraphQL API服务' },
      { value: 'webhook', label: 'Webhook', description: 'Webhook回调服务' },
      { value: 'data_processing', label: '数据处理', description: '数据处理和分析' },
      { value: 'file_service', label: '文件服务', description: '文件上传下载服务' },
      { value: 'auth_service', label: '认证服务', description: '身份认证和授权' }
    ]
  };

  // 初始化表单数据
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        type: initialData.type || '',
        functionalCategory: initialData.functionalCategory || '',
        capabilities: initialData.capabilities || [],
        config: initialData.config || {},
        sensitiveFields: initialData.sensitiveFields || [],
        requiredFields: initialData.requiredFields || [],
        enabled: initialData.enabled !== undefined ? initialData.enabled : true
      });
    }
  }, [initialData]);

  // 当工具类型改变时，自动推断功能分类
  useEffect(() => {
    if (formData.type && !formData.functionalCategory) {
      const inferredCategory = inferFunctionalCategory(
        formData.type, 
        toolType === 'mcp' ? TOOL_SOURCE_TYPES.MCP : TOOL_SOURCE_TYPES.API,
        formData.capabilities
      );
      setFormData(prev => ({
        ...prev,
        functionalCategory: inferredCategory
      }));
    }
  }, [formData.type, toolType]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleCapabilityAdd = (capability) => {
    if (capability.trim() && !formData.capabilities.includes(capability.trim())) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, capability.trim()]
      }));
    }
  };

  const handleCapabilityRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // 基本验证
    if (!formData.name.trim()) {
      newErrors.name = '工具名称不能为空';
    }

    if (!formData.description.trim()) {
      newErrors.description = '工具描述不能为空';
    }

    if (!formData.type) {
      newErrors.type = '请选择工具类型';
    }

    if (!formData.functionalCategory) {
      newErrors.functionalCategory = '请选择功能分类';
    }

    if (formData.capabilities.length === 0) {
      newErrors.capabilities = '请至少添加一个功能特性';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // 创建工具实例进行测试
      const toolData = new ToolDataModel({
        ...formData,
        id: `${toolType}_${Date.now()}`,
        sourceType: toolType === 'mcp' ? TOOL_SOURCE_TYPES.MCP : TOOL_SOURCE_TYPES.API,
        approvalStatus: APPROVAL_STATUS.PENDING,
        ownerId: 'current_user'
      });

      // 调用测试回调
      const result = await onTest(toolData);
      setTestResult(result);

    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || '测试失败'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // 创建工具实例
      const toolData = new ToolDataModel({
        ...formData,
        id: initialData?.id || `${toolType}_${Date.now()}`,
        sourceType: toolType === 'mcp' ? TOOL_SOURCE_TYPES.MCP : TOOL_SOURCE_TYPES.API,
        approvalStatus: APPROVAL_STATUS.PENDING,
        ownerId: 'current_user',
        tested: true, // 新工具默认已测试，直接可以批准
        testResults: testResult
      });

      // 验证工具数据
      const validation = toolData.validate();
      if (!validation.isValid) {
        setErrors({ general: validation.errors.join(', ') });
        return;
      }

      // 调用保存回调
      await onSave(toolData);

    } catch (error) {
      setErrors({ general: error.message || '保存失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const currentTypeOptions = toolTypeOptions[toolType] || [];

  return (
    <div className={`tool-configuration-form ${className}`}>
      <div className="form-header">
        <h3>配置{toolType.toUpperCase()}工具</h3>
        <p>请填写工具的基本信息和功能分类</p>
      </div>

      <form className="form-content" onSubmit={(e) => e.preventDefault()}>
        {/* 基本信息 */}
        <div className="form-section">
          <h4>基本信息</h4>
          
          <div className="form-group">
            <label htmlFor="tool-name">工具名称 *</label>
            <input
              id="tool-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入工具名称"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="tool-description">工具描述 *</label>
            <textarea
              id="tool-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="详细描述工具的功能和用途"
              rows={3}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <div className="error-message">{errors.description}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="tool-type">工具类型 *</label>
            <select
              id="tool-type"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className={errors.type ? 'error' : ''}
            >
              <option value="">请选择工具类型</option>
              {currentTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            {errors.type && <div className="error-message">{errors.type}</div>}
          </div>

          <div className="form-group">
            <label>功能分类 *</label>
            <FunctionalCategorySelector
              value={formData.functionalCategory}
              onChange={(value) => handleInputChange('functionalCategory', value)}
              placeholder="选择工具的功能分类"
              required
              className={errors.functionalCategory ? 'error' : ''}
            />
            {errors.functionalCategory && <div className="error-message">{errors.functionalCategory}</div>}
          </div>
        </div>

        {/* 功能特性 */}
        <div className="form-section">
          <h4>功能特性</h4>
          <div className="capabilities-input">
            <input
              type="text"
              placeholder="输入功能特性，按回车添加"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCapabilityAdd(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <div className="capabilities-list">
              {formData.capabilities.map((capability, index) => (
                <span key={index} className="capability-tag">
                  {capability}
                  <button
                    type="button"
                    onClick={() => handleCapabilityRemove(index)}
                    className="remove-capability"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {errors.capabilities && <div className="error-message">{errors.capabilities}</div>}
          </div>
        </div>

        {/* 高级设置 */}
        <div className="form-section">
          <div className="section-header">
            <h4>高级设置</h4>
            <button
              type="button"
              className="toggle-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '收起' : '展开'}
            </button>
          </div>
          
          {showAdvanced && (
            <div className="advanced-settings">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => handleInputChange('enabled', e.target.checked)}
                  />
                  启用工具
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {errors.general && (
          <div className="error-banner">
            {errors.general}
          </div>
        )}

        {/* 测试结果 */}
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <div className="test-result-icon">
              {testResult.success ? '✅' : '❌'}
            </div>
            <div className="test-result-message">
              {testResult.message}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            取消
          </button>
          
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleTest}
            disabled={isLoading}
          >
            {isLoading ? '测试中...' : '测试工具'}
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isLoading || !testResult?.success}
          >
            {isLoading ? '保存中...' : '保存工具'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ToolConfigurationForm;
