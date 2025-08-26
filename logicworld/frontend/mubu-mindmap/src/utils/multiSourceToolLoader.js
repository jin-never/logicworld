/**
 * 多源工具加载器
 * 统一从AI、MCP、API配置页面获取工具数据
 */

import { ToolDataModel, TOOL_SOURCE_TYPES, APPROVAL_STATUS } from './toolDataModel.js';

/**
 * 多源工具加载器类
 */
export class MultiSourceToolLoader {
  constructor() {
    this.cache = new Map(); // 缓存加载的工具数据
    this.lastLoadTime = new Map(); // 记录每个源的最后加载时间
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存超时
  }

  /**
   * 从所有源加载工具
   */
  async loadAllTools() {
    console.log('开始从所有源加载工具...');
    
    const results = await Promise.allSettled([
      this.loadSystemTools(),
      this.loadAITools(),
      this.loadMCPTools(),
      this.loadAPITools(),
      this.loadUserTools()
    ]);

    const allTools = [];
    const errors = [];

    results.forEach((result, index) => {
      const sources = ['system', 'ai', 'mcp', 'api', 'user'];
      const source = sources[index];
      
      if (result.status === 'fulfilled') {
        allTools.push(...result.value);
        console.log(`${source}工具加载成功: ${result.value.length}个`);
      } else {
        errors.push(`${source}工具加载失败: ${result.reason.message}`);
        console.error(`${source}工具加载失败:`, result.reason);
      }
    });

    if (errors.length > 0) {
      console.warn('部分工具源加载失败:', errors);
    }

    console.log(`工具加载完成，共${allTools.length}个工具`);
    return allTools;
  }

  /**
   * 加载系统工具
   */
  async loadSystemTools() {
    const cacheKey = 'system';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // 从API加载系统工具
      const response = await fetch('/api/tools/library');
      const tools = [];

      if (response.ok) {
        const result = await response.json();
        if (result.tools && Array.isArray(result.tools)) {
          result.tools.forEach(toolData => {
            // 只加载真正的系统工具
            if (toolData.category === '系统工具' ||
                (toolData.category === 'AI工具' && toolData.is_system_builtin === true)) {
              const tool = new ToolDataModel({
                id: toolData.id,
                name: toolData.name,
                description: toolData.description,
                sourceType: TOOL_SOURCE_TYPES.SYSTEM,
                functionalCategory: toolData.functionalCategory || 'system_tools',
                capabilities: toolData.capabilities || [],
                approvalStatus: APPROVAL_STATUS.APPROVED,
                isPublic: true,
                tested: toolData.tested || true,
                enabled: toolData.enabled || true,
                groupLabel: toolData.category,
                groupColor: toolData.category === 'AI工具' ? '#4CAF50' : '#6c757d'
              });
              tools.push(tool);
            }
          });
        }
      }

      this.setCache(cacheKey, tools);
      return tools;
    } catch (error) {
      console.error('加载系统工具失败:', error);
      return [];
    }
  }

  /**
   * 加载AI工具
   */
  async loadAITools() {
    const cacheKey = 'ai';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('/api/ai/services');
      const tools = [];

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.services)) {
          result.services.forEach(serviceData => {
            const tool = new ToolDataModel({
              id: serviceData.id || `ai_${Date.now()}_${Math.random()}`,
              name: serviceData.name,
              description: serviceData.description || '用户配置的AI服务',
              sourceType: TOOL_SOURCE_TYPES.AI,
              functionalCategory: 'ai_assistant',
              capabilities: serviceData.capabilities || ['AI对话'],
              approvalStatus: APPROVAL_STATUS.NOT_APPLICABLE,
              ownerId: 'current_user',
              config: serviceData.config || {},
              enabled: serviceData.enabled !== undefined ? serviceData.enabled : true,
              groupLabel: 'AI工具',
              groupColor: '#4CAF50'
            });
            tools.push(tool);
          });
        }
      }

      this.setCache(cacheKey, tools);
      return tools;
    } catch (error) {
      console.error('加载AI工具失败:', error);
      return [];
    }
  }

  /**
   * 加载MCP工具
   */
  async loadMCPTools() {
    const cacheKey = 'mcp';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const tools = [];

      // 从API加载
      try {
        const response = await fetch('/api/mcp/tools');
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.tools)) {
            result.tools.forEach(toolData => {
              const tool = new ToolDataModel({
                id: toolData.id || `mcp_${Date.now()}_${Math.random()}`,
                name: toolData.name,
                description: toolData.description || '用户配置的MCP工具',
                sourceType: TOOL_SOURCE_TYPES.MCP,
                functionalCategory: this.inferCategory(toolData.type, 'mcp'),
                capabilities: toolData.capabilities || [toolData.type],
                approvalStatus: toolData.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.PENDING,
                ownerId: 'current_user',
                config: toolData.config || {},
                enabled: toolData.enabled !== undefined ? toolData.enabled : true,
                tested: toolData.tested || false,
                sensitiveFields: toolData.sensitiveFields || [],
                groupLabel: 'MCP工具',
                groupColor: '#FF9800'
              });
              tools.push(tool);
            });
          }
        }
      } catch (apiError) {
        console.warn('从API加载MCP工具失败，尝试从本地存储加载');
      }

      // 从本地存储加载
      const localTools = localStorage.getItem('myMcpTools');
      if (localTools) {
        const mcpTools = JSON.parse(localTools);
        mcpTools.forEach(toolData => {
          // 避免重复添加
          if (!tools.find(t => t.id === toolData.id)) {
            const tool = new ToolDataModel({
              ...toolData,
              sourceType: TOOL_SOURCE_TYPES.MCP,
              functionalCategory: toolData.functionalCategory || this.inferCategory(toolData.type, 'mcp'),
              approvalStatus: toolData.approvalStatus || APPROVAL_STATUS.PENDING,
              ownerId: 'current_user',
              groupLabel: 'MCP工具',
              groupColor: '#FF9800'
            });
            tools.push(tool);
          }
        });
      }

      this.setCache(cacheKey, tools);
      return tools;
    } catch (error) {
      console.error('加载MCP工具失败:', error);
      return [];
    }
  }

  /**
   * 加载API工具
   */
  async loadAPITools() {
    const cacheKey = 'api';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('/api/api/tools');
      const tools = [];

      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result)) {
          result.forEach(toolData => {
            const tool = new ToolDataModel({
              id: toolData.id || `api_${Date.now()}_${Math.random()}`,
              name: toolData.name,
              description: toolData.description || '用户配置的API工具',
              sourceType: TOOL_SOURCE_TYPES.API,
              functionalCategory: toolData.functionalCategory || this.inferCategory(toolData.type, 'api'),
              capabilities: toolData.capabilities || ['API调用'],
              approvalStatus: toolData.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.PENDING,
              ownerId: 'current_user',
              config: toolData.config || toolData,
              enabled: toolData.enabled !== undefined ? toolData.enabled : true,
              tested: toolData.tested || false,
              sensitiveFields: this.extractSensitiveFields(toolData),
              groupLabel: 'API工具',
              groupColor: '#2196F3'
            });
            tools.push(tool);
          });
        }
      }

      this.setCache(cacheKey, tools);
      return tools;
    } catch (error) {
      console.error('加载API工具失败:', error);
      return [];
    }
  }

  /**
   * 加载用户工具
   */
  async loadUserTools() {
    const cacheKey = 'user';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const tools = [];

      // 从localStorage加载用户工具
      const localUserTools = localStorage.getItem('userTools');
      if (localUserTools) {
        const userTools = JSON.parse(localUserTools);
        userTools.forEach(toolData => {
          const tool = new ToolDataModel({
            ...toolData,
            sourceType: TOOL_SOURCE_TYPES.USER,
            approvalStatus: APPROVAL_STATUS.NOT_APPLICABLE,
            ownerId: 'current_user',
            groupLabel: '我的工具',
            groupColor: '#9C27B0'
          });
          tools.push(tool);
        });
      }

      this.setCache(cacheKey, tools);
      return tools;
    } catch (error) {
      console.error('加载用户工具失败:', error);
      return [];
    }
  }

  /**
   * 推断工具分类
   */
  inferCategory(toolType, sourceType) {
    const categoryMap = {
      // MCP工具映射
      'file_system': 'file_management',
      'database': 'database_management',
      'api_client': 'network_communication',
      'automation': 'deployment_operations',
      
      // API工具映射
      'rest_api': 'network_communication',
      'graphql': 'network_communication',
      'webhook': 'network_communication',
      'data_processing': 'data_processing',
      'file_service': 'file_management',
      'auth_service': 'security_protection'
    };

    return categoryMap[toolType] || (sourceType === 'api' ? 'network_communication' : 'system_tools');
  }

  /**
   * 提取敏感字段
   */
  extractSensitiveFields(config) {
    const sensitiveFields = [];
    const sensitiveKeywords = ['key', 'secret', 'token', 'password', 'auth', 'credential'];
    
    Object.keys(config).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeywords.some(keyword => lowerKey.includes(keyword))) {
        sensitiveFields.push(key);
      }
    });
    
    return sensitiveFields;
  }

  /**
   * 获取缓存
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    const lastLoad = this.lastLoadTime.get(key);
    
    if (cached && lastLoad && (Date.now() - lastLoad < this.cacheTimeout)) {
      console.log(`使用缓存的${key}工具数据`);
      return cached;
    }
    
    return null;
  }

  /**
   * 设置缓存
   */
  setCache(key, data) {
    this.cache.set(key, data);
    this.lastLoadTime.set(key, Date.now());
  }

  /**
   * 清除缓存
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
      this.lastLoadTime.delete(key);
    } else {
      this.cache.clear();
      this.lastLoadTime.clear();
    }
  }

  /**
   * 刷新指定源的工具
   */
  async refreshSource(source) {
    this.clearCache(source);
    
    switch (source) {
      case 'system':
        return await this.loadSystemTools();
      case 'ai':
        return await this.loadAITools();
      case 'mcp':
        return await this.loadMCPTools();
      case 'api':
        return await this.loadAPITools();
      case 'user':
        return await this.loadUserTools();
      default:
        throw new Error(`未知的工具源: ${source}`);
    }
  }
}

// 创建全局多源工具加载器实例
export const multiSourceToolLoader = new MultiSourceToolLoader();
