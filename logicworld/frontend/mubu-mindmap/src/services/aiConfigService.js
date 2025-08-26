// AI配置服务 - 连接前端配置页面与后端API
const API_BASE = '';

/**
 * AI配置服务类
 * 提供与后端AI工具配置API的交互功能
 */
class AIConfigService {
  
  /**
   * 获取所有AI工具配置
   */
  async getAllConfigs() {
    try {
      const response = await fetch(`${API_BASE}/ai-tools`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取AI配置失败:', error);
      throw new Error('获取AI配置失败，请检查网络连接');
    }
  }

  /**
   * 创建新的AI工具配置
   * @param {Object} config - AI工具配置对象
   */
  async createConfig(config) {
    try {
      // 转换前端配置格式到后端格式
      const backendConfig = this.transformToBackendFormat(config);
      
      const response = await fetch(`${API_BASE}/ai-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendConfig)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('创建AI配置失败:', error);
      throw new Error(error.message || '创建AI配置失败，请检查输入信息');
    }
  }

  /**
   * 更新AI工具配置
   * @param {string} toolId - 工具ID
   * @param {Object} config - 更新的配置对象
   */
  async updateConfig(toolId, config) {
    try {
      const backendConfig = this.transformToBackendFormat(config);
      
      const response = await fetch(`${API_BASE}/ai-tools/${toolId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendConfig)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('更新AI配置失败:', error);
      throw new Error(error.message || '更新AI配置失败，请检查输入信息');
    }
  }

  /**
   * 删除AI工具配置
   * @param {string} toolId - 工具ID
   */
  async deleteConfig(toolId) {
    try {
      const response = await fetch(`${API_BASE}/ai-tools/${toolId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('删除AI配置失败:', error);
      throw new Error(error.message || '删除AI配置失败');
    }
  }

  /**
   * 测试AI工具连接
   * @param {string} toolId - 工具ID
   */
  async testConnection(toolId) {
    try {
      const response = await fetch(`${API_BASE}/ai-tools/${toolId}/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('测试AI连接失败:', error);
      throw new Error(error.message || '测试AI连接失败');
    }
  }

  /**
   * 测试配置连接（在保存前测试）
   * @param {Object} config - 配置对象
   */
  async testConfigConnection(config) {
    try {
      // 创建临时配置用于测试
      const tempConfig = this.transformToBackendFormat(config);
      tempConfig.id = `temp_${Date.now()}`;
      
      // 先创建临时配置
      const createResponse = await fetch(`${API_BASE}/ai-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tempConfig)
      });

      if (!createResponse.ok) {
        throw new Error('配置验证失败');
      }

      // 测试连接
      const testResponse = await fetch(`${API_BASE}/ai-tools/${tempConfig.id}/test`, {
        method: 'POST'
      });

      // 删除临时配置
      await fetch(`${API_BASE}/ai-tools/${tempConfig.id}`, {
        method: 'DELETE'
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        throw new Error(errorData.detail || '连接测试失败');
      }

      return await testResponse.json();
    } catch (error) {
      console.error('测试配置连接失败:', error);
      throw new Error(error.message || '测试配置连接失败');
    }
  }

  /**
   * 将前端配置格式转换为后端格式
   * @param {Object} frontendConfig - 前端配置对象
   */
  transformToBackendFormat(frontendConfig) {
    const { provider, formData, ...rest } = frontendConfig;
    
    return {
      id: frontendConfig.id || `${provider}_${Date.now()}`,
      name: formData.name || `${provider}配置`,
      description: `${provider}AI服务配置`,
      provider: provider,
      model: formData.model || '',
      api_key: formData.apiKey || '',
      base_url: formData.baseUrl || formData.apiUrl || '',
      max_tokens: parseInt(formData.maxTokens) || 4000,
      temperature: parseFloat(formData.temperature) || 0.7,
      enabled: true,
      ...rest
    };
  }

  /**
   * 将后端配置格式转换为前端格式
   * @param {Object} backendConfig - 后端配置对象
   */
  transformToFrontendFormat(backendConfig) {
    return {
      id: backendConfig.id,
      provider: backendConfig.provider,
      formData: {
        name: backendConfig.name,
        apiKey: backendConfig.api_key,
        baseUrl: backendConfig.base_url,
        apiUrl: backendConfig.base_url,
        model: backendConfig.model,
        maxTokens: backendConfig.max_tokens?.toString() || '4000',
        temperature: backendConfig.temperature?.toString() || '0.7'
      },
      enabled: backendConfig.enabled
    };
  }

  /**
   * 获取提供商的默认配置
   * @param {string} provider - 提供商名称
   */
  getProviderDefaults(provider) {
    const defaults = {
      qwen: {
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen-turbo',
        maxTokens: '4000',
        temperature: '0.7'
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        maxTokens: '4000',
        temperature: '0.7'
      },
      zhipu: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4',
        maxTokens: '4000',
        temperature: '0.7'
      },
      moonshot: {
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k',
        maxTokens: '4000',
        temperature: '0.7'
      }
    };

    return defaults[provider] || {};
  }
}

// 导出单例实例
export const aiConfigService = new AIConfigService();
export default aiConfigService;
