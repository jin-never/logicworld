/**
 * 工具管理器
 * 统一管理来自不同源的工具，实现工具的增删改查、批准流程、同步机制等
 */

import {
  ToolDataModel,
  TOOL_SOURCE_TYPES,
  APPROVAL_STATUS,
  inferFunctionalCategory,
  ToolValidator
} from './toolDataModel.js';
import { toolTestingManager } from './toolTestingManager.js';
import { multiSourceToolLoader } from './multiSourceToolLoader.js';

/**
 * 工具管理器类
 */
export class ToolManager {
  constructor() {
    this.tools = new Map(); // 使用Map存储工具，key为工具ID
    this.eventListeners = new Map(); // 事件监听器
    this.initialized = false;
  }

  /**
   * 初始化工具管理器
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('开始初始化工具管理器...');

      // 使用多源工具加载器加载所有工具
      const allTools = await multiSourceToolLoader.loadAllTools();

      // 将工具添加到管理器中
      allTools.forEach(tool => {
        this.tools.set(tool.id, tool);
      });

      this.initialized = true;
      this.emit('initialized', { toolCount: this.tools.size });

      console.log(`工具管理器初始化完成，共加载 ${this.tools.size} 个工具`);
    } catch (error) {
      console.error('工具管理器初始化失败:', error);

      // 回退到传统加载方式
      try {
        await this.loadSystemTools();
        await this.loadUserTools();
        await this.loadAITools();
        await this.loadMCPTools();
        await this.loadAPITools();

        this.initialized = true;
        this.emit('initialized', { toolCount: this.tools.size });

        console.log(`工具管理器回退初始化完成，共加载 ${this.tools.size} 个工具`);
      } catch (fallbackError) {
        console.error('工具管理器回退初始化也失败:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * 加载系统工具
   */
  async loadSystemTools() {
    try {
      // 从现有的工具库加载系统工具
      const { SYSTEM_TOOLS } = await import('./toolLibrary.js');
      
      Object.values(SYSTEM_TOOLS).forEach(group => {
        group.tools.forEach(toolData => {
          const tool = new ToolDataModel({
            ...toolData,
            sourceType: TOOL_SOURCE_TYPES.SYSTEM,
            approvalStatus: APPROVAL_STATUS.APPROVED,
            isPublic: true,
            tested: true
          });
          this.tools.set(tool.id, tool);
        });
      });
      
      console.log('系统工具加载完成');
    } catch (error) {
      console.error('加载系统工具失败:', error);
    }
  }

  /**
   * 加载用户工具
   */
  async loadUserTools() {
    try {
      // 从localStorage加载用户工具（模拟）
      const userToolsData = localStorage.getItem('userTools');
      if (userToolsData) {
        const userTools = JSON.parse(userToolsData);
        userTools.forEach(toolData => {
          const tool = new ToolDataModel({
            ...toolData,
            sourceType: TOOL_SOURCE_TYPES.USER,
            approvalStatus: APPROVAL_STATUS.NOT_APPLICABLE,
            ownerId: 'current_user' // 模拟当前用户ID
          });
          this.tools.set(tool.id, tool);
        });
      }
      
      console.log('用户工具加载完成');
    } catch (error) {
      console.error('加载用户工具失败:', error);
    }
  }

  /**
   * 加载AI工具
   */
  async loadAITools() {
    try {
      // 从AI配置页面加载工具
      const response = await fetch('/api/ai/services');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.services)) {
          result.services.forEach(serviceData => {
            const tool = new ToolDataModel({
              id: serviceData.id || `ai_${Date.now()}`,
              name: serviceData.name,
              description: serviceData.description || '用户配置的AI服务',
              sourceType: TOOL_SOURCE_TYPES.AI,
              functionalCategory: 'ai_assistant',
              capabilities: serviceData.capabilities || ['AI对话'],
              approvalStatus: APPROVAL_STATUS.NOT_APPLICABLE,
              ownerId: 'current_user',
              config: serviceData.config || {},
              enabled: serviceData.enabled !== undefined ? serviceData.enabled : true
            });
            this.tools.set(tool.id, tool);
          });
        }
      }
      
      console.log('AI工具加载完成');
    } catch (error) {
      console.warn('加载AI工具失败，可能是API不可用:', error);
    }
  }

  /**
   * 加载MCP工具
   */
  async loadMCPTools() {
    try {
      // 从MCP配置页面加载工具
      const response = await fetch('/api/mcp/tools');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.tools)) {
          result.tools.forEach(toolData => {
            const tool = new ToolDataModel({
              id: toolData.id || `mcp_${Date.now()}`,
              name: toolData.name,
              description: toolData.description || '用户配置的MCP工具',
              sourceType: TOOL_SOURCE_TYPES.MCP,
              functionalCategory: inferFunctionalCategory(toolData.type, TOOL_SOURCE_TYPES.MCP),
              capabilities: toolData.capabilities || [toolData.type],
              approvalStatus: toolData.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.PENDING,
              ownerId: 'current_user',
              config: toolData.config || {},
              enabled: toolData.enabled !== undefined ? toolData.enabled : true,
              tested: toolData.tested || false,
              sensitiveFields: toolData.sensitiveFields || []
            });
            this.tools.set(tool.id, tool);
          });
        }
      }
      
      console.log('MCP工具加载完成');
    } catch (error) {
      console.warn('加载MCP工具失败，可能是API不可用:', error);
    }
  }

  /**
   * 加载API工具
   */
  async loadAPITools() {
    try {
      // 从API配置页面加载工具
      const response = await fetch('/api/api/tools');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.tools)) {
          result.tools.forEach(toolData => {
            const tool = new ToolDataModel({
              id: toolData.id || `api_${Date.now()}`,
              name: toolData.name,
              description: toolData.description || '用户配置的API工具',
              sourceType: TOOL_SOURCE_TYPES.API,
              functionalCategory: inferFunctionalCategory(toolData.type, TOOL_SOURCE_TYPES.API),
              capabilities: toolData.capabilities || [toolData.type],
              approvalStatus: toolData.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.PENDING,
              ownerId: 'current_user',
              config: toolData.config || {},
              enabled: toolData.enabled !== undefined ? toolData.enabled : true,
              tested: toolData.tested || false,
              sensitiveFields: toolData.sensitiveFields || []
            });
            this.tools.set(tool.id, tool);
          });
        }
      }
      
      console.log('API工具加载完成');
    } catch (error) {
      console.warn('加载API工具失败，可能是API不可用:', error);
    }
  }

  /**
   * 获取所有工具
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }

  /**
   * 根据用户权限获取可访问的工具
   */
  getAccessibleTools(userId = 'current_user') {
    return this.getAllTools().filter(tool => tool.canUserAccess(userId));
  }

  /**
   * 获取用户的工具（我的工具）
   */
  getUserTools(userId = 'current_user') {
    return this.getAllTools().filter(tool => {
      // AI工具（用户自己的）
      if (tool.sourceType === TOOL_SOURCE_TYPES.AI && tool.ownerId === userId) {
        return true;
      }

      // 未批准的MCP/API工具
      if ([TOOL_SOURCE_TYPES.MCP, TOOL_SOURCE_TYPES.API].includes(tool.sourceType) &&
          tool.ownerId === userId &&
          tool.approvalStatus !== APPROVAL_STATUS.APPROVED) {
        return true;
      }

      // 用户自定义工具
      if (tool.sourceType === TOOL_SOURCE_TYPES.USER && tool.ownerId === userId) {
        return true;
      }

      return false;
    });
  }

  /**
   * 获取"我的工具"分类的详细信息
   */
  getMyToolsCategories(userId = 'current_user') {
    const userTools = this.getUserTools(userId);

    const categories = {
      ai_tools: {
        name: '我的AI工具',
        icon: '🤖',
        description: '用户配置的AI服务',
        tools: userTools.filter(tool => tool.sourceType === TOOL_SOURCE_TYPES.AI),
        color: '#4CAF50'
      },
      pending_mcp: {
        name: '待批准MCP工具',
        icon: '⏳',
        description: '已测试但待批准的MCP工具',
        tools: userTools.filter(tool =>
          tool.sourceType === TOOL_SOURCE_TYPES.MCP &&
          tool.approvalStatus === APPROVAL_STATUS.PENDING
        ),
        color: '#FF9800'
      },
      pending_api: {
        name: '待批准API工具',
        icon: '⏳',
        description: '已测试但待批准的API工具',
        tools: userTools.filter(tool =>
          tool.sourceType === TOOL_SOURCE_TYPES.API &&
          tool.approvalStatus === APPROVAL_STATUS.PENDING
        ),
        color: '#2196F3'
      },
      draft_tools: {
        name: '草稿工具',
        icon: '📝',
        description: '未完成测试的工具',
        tools: userTools.filter(tool =>
          [TOOL_SOURCE_TYPES.MCP, TOOL_SOURCE_TYPES.API].includes(tool.sourceType) &&
          !tool.tested
        ),
        color: '#9E9E9E'
      },
      custom_tools: {
        name: '自定义工具',
        icon: '🛠️',
        description: '用户创建的自定义工具',
        tools: userTools.filter(tool => tool.sourceType === TOOL_SOURCE_TYPES.USER),
        color: '#9C27B0'
      }
    };

    // 过滤掉空分类
    Object.keys(categories).forEach(key => {
      if (categories[key].tools.length === 0) {
        delete categories[key];
      }
    });

    return categories;
  }

  /**
   * 获取"我的工具"统计信息
   */
  getMyToolsStats(userId = 'current_user') {
    const userTools = this.getUserTools(userId);

    const stats = {
      total: userTools.length,
      ai: userTools.filter(tool => tool.sourceType === TOOL_SOURCE_TYPES.AI).length,
      mcp: userTools.filter(tool => tool.sourceType === TOOL_SOURCE_TYPES.MCP).length,
      api: userTools.filter(tool => tool.sourceType === TOOL_SOURCE_TYPES.API).length,
      user: userTools.filter(tool => tool.sourceType === TOOL_SOURCE_TYPES.USER).length,
      tested: userTools.filter(tool => tool.tested).length,
      pending: userTools.filter(tool => tool.approvalStatus === APPROVAL_STATUS.PENDING).length,
      approved: userTools.filter(tool => tool.approvalStatus === APPROVAL_STATUS.APPROVED).length
    };

    return stats;
  }

  /**
   * 根据功能分类获取工具
   */
  getToolsByCategory(category) {
    return this.getAllTools().filter(tool => tool.functionalCategory === category);
  }

  /**
   * 根据来源类型获取工具
   */
  getToolsBySource(sourceType) {
    return this.getAllTools().filter(tool => tool.sourceType === sourceType);
  }

  /**
   * 添加工具
   */
  addTool(toolData) {
    const tool = new ToolDataModel(toolData);
    const validation = tool.validate();
    
    if (!validation.isValid) {
      throw new Error(`工具验证失败: ${validation.errors.join(', ')}`);
    }
    
    this.tools.set(tool.id, tool);
    this.emit('toolAdded', { tool });
    
    return tool;
  }

  /**
   * 更新工具
   */
  updateTool(toolId, updates) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`工具不存在: ${toolId}`);
    }
    
    Object.assign(tool, updates);
    tool.updatedAt = new Date().toISOString();
    
    const validation = tool.validate();
    if (!validation.isValid) {
      throw new Error(`工具验证失败: ${validation.errors.join(', ')}`);
    }
    
    this.emit('toolUpdated', { tool });
    
    return tool;
  }

  /**
   * 删除工具
   */
  deleteTool(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`工具不存在: ${toolId}`);
    }
    
    this.tools.delete(toolId);
    this.emit('toolDeleted', { tool });
    
    return true;
  }

  /**
   * 测试工具
   */
  async testTool(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`工具不存在: ${toolId}`);
    }

    try {
      let testResult;

      // 根据工具类型选择测试方法
      if (tool.sourceType === TOOL_SOURCE_TYPES.MCP) {
        testResult = await toolTestingManager.testMCPTool(tool);
      } else if (tool.sourceType === TOOL_SOURCE_TYPES.API) {
        testResult = await toolTestingManager.testAPITool(tool);
      } else {
        // 其他类型的工具使用通用测试
        testResult = {
          success: true,
          message: '工具测试通过',
          timestamp: new Date().toISOString(),
          details: { type: 'generic_test' }
        };
      }

      // 更新工具状态
      tool.tested = testResult.success;
      tool.testResults = testResult;
      tool.updatedAt = new Date().toISOString();

      this.emit('toolTested', { tool, testResult });

      return testResult;
    } catch (error) {
      const testResult = {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };

      tool.testResults = testResult;
      tool.updatedAt = new Date().toISOString();

      this.emit('toolTested', { tool, testResult });

      throw error;
    }
  }

  /**
   * 申请工具批准
   */
  async requestApproval(toolId, reason = '') {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`工具不存在: ${toolId}`);
    }

    // 使用测试管理器处理批准申请
    const approvalRequest = await toolTestingManager.requestApproval(tool, reason);

    // 更新工具状态
    tool.approvalStatus = APPROVAL_STATUS.PENDING;
    tool.approvalRequestId = approvalRequest.id;
    tool.updatedAt = new Date().toISOString();

    this.emit('approvalRequested', { tool, approvalRequest });

    return approvalRequest;
  }

  /**
   * 批准工具
   */
  async approveTool(toolId, approverId, notes = '') {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`工具不存在: ${toolId}`);
    }

    // 使用测试管理器处理批准
    const approvalRequestId = tool.approvalRequestId;
    if (approvalRequestId) {
      const systemTool = await toolTestingManager.approveTool(approvalRequestId, approverId, notes);

      // 添加到系统工具中
      this.tools.set(systemTool.id, systemTool);

      // 更新原工具状态
      tool.approvalStatus = APPROVAL_STATUS.APPROVED;
      tool.approvedBy = approverId;
      tool.approvedAt = new Date().toISOString();
      tool.updatedAt = new Date().toISOString();

      this.emit('toolApproved', { tool, systemTool });

      return systemTool;
    } else {
      // 如果没有批准申请ID，使用传统方法
      const systemTool = tool.convertToSystemTool();
      systemTool.approvedBy = approverId;
      systemTool.approvedAt = new Date().toISOString();

      // 添加到系统工具中
      this.tools.set(systemTool.id, systemTool);

      // 更新原工具状态
      tool.approvalStatus = APPROVAL_STATUS.APPROVED;
      tool.approvedBy = approverId;
      tool.approvedAt = new Date().toISOString();
      tool.updatedAt = new Date().toISOString();

      this.emit('toolApproved', { tool, systemTool });

      return systemTool;
    }
  }

  /**
   * 事件监听
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件监听器执行失败 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 刷新工具数据
   */
  async refresh() {
    this.tools.clear();
    this.initialized = false;
    multiSourceToolLoader.clearCache();
    await this.initialize();
  }

  /**
   * 刷新特定源的工具
   */
  async refreshSource(source) {
    try {
      console.log(`刷新${source}工具...`);

      // 移除该源的现有工具
      const toolsToRemove = [];
      this.tools.forEach((tool, id) => {
        if (tool.sourceType === source) {
          toolsToRemove.push(id);
        }
      });

      toolsToRemove.forEach(id => {
        this.tools.delete(id);
      });

      // 重新加载该源的工具
      const newTools = await multiSourceToolLoader.refreshSource(source);

      // 添加新工具
      newTools.forEach(tool => {
        this.tools.set(tool.id, tool);
      });

      this.emit('sourceRefreshed', { source, toolCount: newTools.length });

      console.log(`${source}工具刷新完成，共${newTools.length}个工具`);
      return newTools;
    } catch (error) {
      console.error(`刷新${source}工具失败:`, error);
      throw error;
    }
  }
}

// 创建全局工具管理器实例
export const toolManager = new ToolManager();
