import React, { useState, useEffect } from 'react';
import './NewAIServicePage.css';
import { aiConfigService } from './services/aiConfigService';
import CategorySelector from './components/CategorySelector';

const NewAIServicePage = ({ configuredList, onEdit, onDelete, onAdd }) => {
  const [selectedProvider, setSelectedProvider] = useState('qwen');
  const [configStep, setConfigStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    apiUrl: '',
    model: '',
    description: '',
    functionalCategory: ''  // 新增：功能分类
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [configuredServices, setConfiguredServices] = useState([]);
  const [loading, setLoading] = useState(false);

  // AI服务提供商配置
  const aiProviders = {
    qwen: {
      name: '通义千问',
      icon: '🌟',
      color: '#ff6b35',
      description: '阿里巴巴 · 推荐新手',
      defaultUrl: 'https://dashscope.aliyuncs.com/api/v1/',
      models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
      fields: [
        { key: 'apiKey', label: 'API密钥 (API Key)', type: 'password', required: true },
        { key: 'apiUrl', label: 'API地址', type: 'text', required: true },
        { key: 'model', label: '模型名称', type: 'select', required: true }
      ]
    },
    deepseek: {
      name: 'DeepSeek',
      icon: '🚀',
      color: '#6366f1',
      description: '代码助手 · 编程专用',
      defaultUrl: 'https://api.deepseek.com/v1/',
      models: ['deepseek-chat', 'deepseek-coder'],
      fields: [
        { key: 'apiKey', label: 'API密钥 (API Key)', type: 'password', required: true },
        { key: 'apiUrl', label: 'API地址', type: 'text', required: true },
        { key: 'model', label: '模型名称', type: 'select', required: true }
      ]
    },
    zhipu: {
      name: '智谱AI',
      icon: '🧠',
      color: '#4c9aff',
      description: '清华技术 · 长文本',
      defaultUrl: 'https://open.bigmodel.cn/api/paas/v4/',
      models: ['glm-4', 'glm-4-turbo', 'glm-3-turbo'],
      fields: [
        { key: 'apiKey', label: 'API密钥 (API Key)', type: 'password', required: true },
        { key: 'apiUrl', label: 'API地址', type: 'text', required: true },
        { key: 'model', label: '模型名称', type: 'select', required: true }
      ]
    },
    baidu: {
      name: '百度文心',
      icon: '🎯',
      color: '#3385ff',
      description: '百度AI · 中文优化',
      defaultUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/',
      models: ['ernie-bot', 'ernie-bot-turbo', 'ernie-bot-4'],
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
        { key: 'apiUrl', label: 'API地址', type: 'text', required: true },
        { key: 'model', label: '模型名称', type: 'select', required: true }
      ]
    },
    openai: {
      name: 'OpenAI',
      icon: '🤖',
      color: '#10a37f',
      description: 'ChatGPT · 需科学上网',
      defaultUrl: 'https://api.openai.com/v1/',
      models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
      fields: [
        { key: 'apiKey', label: 'API密钥 (API Key)', type: 'password', required: true },
        { key: 'apiUrl', label: 'API地址', type: 'text', required: true },
        { key: 'model', label: '模型名称', type: 'select', required: true }
      ]
    },
    custom: {
      name: '自定义服务',
      icon: '⚙️',
      color: '#6b7280',
      description: '自定义 · 高级用户',
      defaultUrl: '',
      models: [],
      fields: [
        { key: 'name', label: '服务名称', type: 'text', required: true },
        { key: 'apiKey', label: 'API密钥', type: 'password', required: true },
        { key: 'apiUrl', label: 'API地址', type: 'text', required: true },
        { key: 'model', label: '模型名称', type: 'text', required: true }
      ]
    }
  };

  // 初始化表单数据
  useEffect(() => {
    const provider = aiProviders[selectedProvider];
    setFormData({
      name: provider.name,
      apiKey: '',
      apiUrl: provider.defaultUrl,
      model: provider.models[0] || '',
      description: provider.description,
      functionalCategory: ''  // 新增：功能分类
    });
    setConfigStep(1);
    setTestResult(null);
  }, [selectedProvider]);

  // 处理表单输入
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 加载已配置的服务
  useEffect(() => {
    loadConfiguredServices();
  }, []);

  const loadConfiguredServices = async () => {
    try {
      setLoading(true);
      const services = await aiConfigService.getAllConfigs();
      setConfiguredServices(services);
    } catch (error) {
      console.error('加载配置失败:', error);
      setTestResult({ success: false, message: '加载配置失败: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 处理提供商选择
  const handleProviderSelect = (providerId) => {
    setSelectedProvider(providerId);
  };

  // 测试连接并保存配置
  const handleTestConnection = async () => {
    setIsConfiguring(true);
    setTestResult(null);

    try {
      // 验证必填字段
      const provider = aiProviders[selectedProvider];
      const missingFields = provider.fields
        .filter(field => field.required && !formData[field.key])
        .map(field => field.label);

      if (missingFields.length > 0) {
        throw new Error(`请填写必填字段: ${missingFields.join(', ')}`);
      }

      // 准备配置数据
      const configData = {
        provider: selectedProvider,
        formData: {
          ...formData,
          name: formData.name || `${provider.name}配置`,
          ...aiConfigService.getProviderDefaults(selectedProvider)
        }
      };

      // 测试连接
      const testResult = await aiConfigService.testConfigConnection(configData);

      if (testResult.success) {
        // 保存配置
        const savedConfig = await aiConfigService.createConfig(configData);

        setTestResult({
          success: true,
          message: `连接测试成功！配置已保存。模型: ${testResult.model_info || 'N/A'}`
        });
        setConfigStep(3);

        // 重新加载配置列表
        await loadConfiguredServices();

        // 通知父组件
        if (onAdd) {
          onAdd(savedConfig);
        }
      } else {
        throw new Error(testResult.message || '连接测试失败');
      }
    } catch (error) {
      console.error('配置保存失败:', error);
      setTestResult({
        success: false,
        message: error.message || '连接测试失败，请检查配置信息。'
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  // 保存配置
  const handleSaveConfig = () => {
    const config = {
      id: Date.now().toString(),
      provider: selectedProvider,
      ...formData,
      createdAt: new Date().toISOString()
    };
    
    if (onAdd) {
      onAdd(config);
    }
    
    // 重置表单
    setConfigStep(1);
    setSelectedProvider('qwen');
    setTestResult(null);
  };

  // 获取已配置的服务状态
  const getProviderStatus = (providerId) => {
    const configured = configuredServices?.find(service =>
      service.provider === providerId
    );
    return configured ? 'configured' : 'unconfigured';
  };

  if (loading) {
    return (
      <div className="new-ai-service-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载配置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="new-ai-service-page">
      <div className="service-container">
        {/* 左侧：服务提供商选择 */}
        <div className="providers-panel">
          <div className="panel-header">
            <h3>📋 选择AI服务</h3>
            <p>点击下方服务商开始配置</p>
          </div>
          
          <div className="providers-list">
            {Object.entries(aiProviders).map(([id, provider]) => (
              <div
                key={id}
                className={`provider-card ${selectedProvider === id ? 'active' : ''}`}
                onClick={() => handleProviderSelect(id)}
              >
                <div className="provider-icon" style={{ color: provider.color }}>
                  {provider.icon}
                </div>
                <div className="provider-info">
                  <h4>{provider.name}</h4>
                  <p>{provider.description}</p>
                </div>
                <div className={`provider-status ${getProviderStatus(id)}`}>
                  {getProviderStatus(id) === 'configured' ? '已配置' : '未配置'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 中间：配置表单 */}
        <div className="config-content">
          <div className="config-header">
            <h2>
              <span style={{ color: aiProviders[selectedProvider].color }}>
                {aiProviders[selectedProvider].icon}
              </span>
              配置{aiProviders[selectedProvider].name}
            </h2>
            <p>网络巴巴AI助手，免费使用，中文支持好</p>
          </div>

          <div className="config-form">
            {/* 功能分类选择器 */}
            <CategorySelector
              value={formData.functionalCategory}
              onChange={(category) => handleInputChange('functionalCategory', category)}
              required={true}
              showDescription={true}
            />

            {aiProviders[selectedProvider].fields.map((field) => (
              <div key={field.key} className="form-group">
                <label>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                  >
                    {aiProviders[selectedProvider].models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={`请输入${field.label}`}
                  />
                )}
              </div>
            ))}

            {/* 服务描述字段 */}
            <div className="form-group">
              <label>
                服务描述
                <span style={{ color: '#6b7280', fontWeight: 'normal' }}> (可选)</span>
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="描述这个AI服务的主要用途和特点，有助于智能匹配和推荐"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                例如：用于代码生成和编程辅助、文档写作、数据分析等
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn-secondary"
                onClick={() => setConfigStep(1)}
              >
                重置配置
              </button>
              <button 
                className="btn-primary"
                onClick={handleTestConnection}
                disabled={isConfiguring}
              >
                {isConfiguring ? '测试中...' : '保存配置'}
              </button>
            </div>

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：配置流程 */}
        <div className="process-panel">
          <h3>⚡ 配置流程</h3>
          
          <div className="process-steps">
            <div className={`step ${configStep >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>选择配置服务</h4>
                <p>从左侧选择要配置的AI服务提供商</p>
              </div>
            </div>

            <div className={`step ${configStep >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>保存并开始</h4>
                <p>填写API密钥等配置信息并保存</p>
              </div>
            </div>

            <div className={`step ${configStep >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>完成配置</h4>
                <p>配置成功，可以开始使用AI服务</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAIServicePage;
