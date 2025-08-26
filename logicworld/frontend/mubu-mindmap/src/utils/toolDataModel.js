/**
 * 工具数据模型定义
 * 支持完整的工具管理系统，包括多源工具、标签系统、批准流程等
 */

/**
 * 工具来源类型
 */
export const TOOL_SOURCE_TYPES = {
  SYSTEM: 'system',      // 系统内置工具
  AI: 'ai',             // AI配置页面的工具
  MCP: 'mcp',           // MCP配置页面的工具
  API: 'api',           // API配置页面的工具
  USER: 'user'          // 用户自定义工具
};

/**
 * 工具批准状态
 */
export const APPROVAL_STATUS = {
  PENDING: 'pending',       // 待批准
  APPROVED: 'approved',     // 已批准
  REJECTED: 'rejected',     // 已拒绝
  NOT_APPLICABLE: 'n/a'     // 不适用（如AI工具）
};

/**
 * 敏感信息类型
 */
export const SENSITIVE_FIELD_TYPES = {
  API_KEY: 'api_key',           // API密钥
  SECRET: 'secret',             // 密钥
  TOKEN: 'token',               // 令牌
  PASSWORD: 'password',         // 密码
  PRIVATE_KEY: 'private_key',   // 私钥
  CONNECTION_STRING: 'connection_string'  // 连接字符串
};

/**
 * 完整的工具数据模型
 */
export class ToolDataModel {
  constructor(data = {}) {
    // 基本信息
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.version = data.version || '1.0.0';
    this.author = data.author || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    // 标签系统
    this.sourceType = data.sourceType || TOOL_SOURCE_TYPES.USER;
    this.functionalCategory = data.functionalCategory || 'system_tools';
    this.capabilities = data.capabilities || [];
    this.tags = data.tags || [];

    // 批准和权限
    this.approvalStatus = data.approvalStatus || APPROVAL_STATUS.NOT_APPLICABLE;
    this.approvedBy = data.approvedBy || null;
    this.approvedAt = data.approvedAt || null;
    this.ownerId = data.ownerId || null;
    this.isPublic = data.isPublic || false;

    // 状态信息
    this.enabled = data.enabled !== undefined ? data.enabled : true;
    this.available = data.available !== undefined ? data.available : true;
    this.tested = data.tested || false;
    this.testResults = data.testResults || null;

    // 配置信息
    this.config = data.config || {};
    this.sensitiveFields = data.sensitiveFields || [];
    this.requiredFields = data.requiredFields || [];
    this.optionalFields = data.optionalFields || [];

    // 使用统计
    this.usageCount = data.usageCount || 0;
    this.lastUsedAt = data.lastUsedAt || null;
    this.rating = data.rating || 0;
    this.reviews = data.reviews || [];
  }

  /**
   * 检查工具是否包含敏感信息
   */
  hasSensitiveInfo() {
    return this.sensitiveFields.length > 0;
  }

  /**
   * 获取过滤敏感信息后的配置
   */
  getPublicConfig() {
    if (!this.hasSensitiveInfo()) {
      return this.config;
    }

    const publicConfig = { ...this.config };
    this.sensitiveFields.forEach(field => {
      if (publicConfig[field]) {
        delete publicConfig[field];
      }
    });
    return publicConfig;
  }

  /**
   * 检查用户是否可以使用此工具
   */
  canUserAccess(userId) {
    // 系统工具所有人都可以访问
    if (this.sourceType === TOOL_SOURCE_TYPES.SYSTEM) {
      return true;
    }

    // 已批准的工具所有人都可以访问
    if (this.approvalStatus === APPROVAL_STATUS.APPROVED) {
      return true;
    }

    // 用户自己的工具
    if (this.ownerId === userId) {
      return true;
    }

    return false;
  }

  /**
   * 检查工具是否需要批准
   */
  needsApproval() {
    return [TOOL_SOURCE_TYPES.MCP, TOOL_SOURCE_TYPES.API].includes(this.sourceType) &&
           this.approvalStatus === APPROVAL_STATUS.PENDING;
  }

  /**
   * 转换为系统工具
   */
  convertToSystemTool() {
    const systemTool = new ToolDataModel({
      ...this,
      sourceType: TOOL_SOURCE_TYPES.SYSTEM,
      approvalStatus: APPROVAL_STATUS.APPROVED,
      isPublic: true,
      config: this.getPublicConfig(), // 移除敏感信息
      ownerId: null // 系统工具没有所有者
    });
    return systemTool;
  }

  /**
   * 验证工具数据完整性
   */
  validate() {
    const errors = [];

    if (!this.id) errors.push('工具ID不能为空');
    if (!this.name) errors.push('工具名称不能为空');
    if (!this.description) errors.push('工具描述不能为空');
    if (!Object.values(TOOL_SOURCE_TYPES).includes(this.sourceType)) {
      errors.push('无效的工具来源类型');
    }
    if (!Object.values(APPROVAL_STATUS).includes(this.approvalStatus)) {
      errors.push('无效的批准状态');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      author: this.author,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      sourceType: this.sourceType,
      functionalCategory: this.functionalCategory,
      capabilities: this.capabilities,
      tags: this.tags,
      approvalStatus: this.approvalStatus,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      ownerId: this.ownerId,
      isPublic: this.isPublic,
      enabled: this.enabled,
      available: this.available,
      tested: this.tested,
      testResults: this.testResults,
      config: this.config,
      sensitiveFields: this.sensitiveFields,
      requiredFields: this.requiredFields,
      optionalFields: this.optionalFields,
      usageCount: this.usageCount,
      lastUsedAt: this.lastUsedAt,
      rating: this.rating,
      reviews: this.reviews
    };
  }

  /**
   * 从JSON创建实例
   */
  static fromJSON(json) {
    return new ToolDataModel(json);
  }
}

/**
 * 工具分类映射
 */
export const TOOL_CATEGORY_MAPPING = {
  // AI工具映射
  'chat': 'ai_assistant',
  'text_generation': 'ai_assistant',
  'code_generation': 'code_development',
  'image_generation': 'media_processing',
  'translation': 'ai_assistant',
  'analysis': 'data_processing',

  // MCP工具映射
  'file_system': 'file_management',
  'database': 'database_management',
  'api_client': 'network_communication',
  'automation': 'deployment_operations',
  'monitoring': 'deployment_operations',
  'testing': 'testing_validation',

  // API工具映射
  'rest_api': 'network_communication',
  'graphql': 'network_communication',
  'webhook': 'network_communication',
  'data_processing': 'data_processing',
  'file_service': 'file_management',
  'auth_service': 'security_protection',
  'payment': 'life_services',
  'notification': 'network_communication',
  'email': 'network_communication',
  'sms': 'network_communication',

  // 文档和内容
  'document': 'document_processing',
  'pdf': 'document_processing',
  'excel': 'document_processing',
  'word': 'document_processing',

  // 媒体处理
  'image': 'media_processing',
  'video': 'media_processing',
  'audio': 'media_processing',

  // 项目管理
  'project': 'project_management',
  'task': 'project_management',
  'calendar': 'project_management',

  // 设计工具
  'design': 'ui_design',
  'prototype': 'ui_design',
  'ui': 'ui_design',
  'ux': 'ui_design',

  // 学习和培训
  'education': 'learning_training',
  'training': 'learning_training',
  'course': 'learning_training',

  // 安全工具
  'security': 'security_protection',
  'encryption': 'security_protection',
  'auth': 'security_protection',
  'permission': 'security_protection',

  // 智能决策
  'decision': 'intelligent_decision',
  'recommendation': 'intelligent_decision',
  'optimization': 'intelligent_decision',

  // 通用映射
  'utility': 'system_tools',
  'system': 'system_tools',
  'tool': 'system_tools',
  'other': 'system_tools',
  'misc': 'system_tools'
};

/**
 * 根据工具类型和来源自动推断功能分类
 */
export function inferFunctionalCategory(toolType, sourceType, capabilities = []) {
  // 首先尝试从工具类型映射
  if (TOOL_CATEGORY_MAPPING[toolType]) {
    return TOOL_CATEGORY_MAPPING[toolType];
  }

  // 尝试从工具类型的部分匹配
  const lowerToolType = toolType.toLowerCase();
  for (const [key, category] of Object.entries(TOOL_CATEGORY_MAPPING)) {
    if (lowerToolType.includes(key) || key.includes(lowerToolType)) {
      return category;
    }
  }

  // 根据功能特性推断
  if (capabilities && capabilities.length > 0) {
    const capabilityText = capabilities.join(' ').toLowerCase();

    // AI相关关键词
    if (/ai|智能|聊天|对话|生成|分析|推荐/.test(capabilityText)) {
      return 'ai_assistant';
    }

    // 文件相关关键词
    if (/文件|file|存储|storage|上传|下载/.test(capabilityText)) {
      return 'file_management';
    }

    // 数据相关关键词
    if (/数据|data|统计|分析|图表|报表/.test(capabilityText)) {
      return 'data_processing';
    }

    // 网络相关关键词
    if (/网络|api|http|请求|通信|调用/.test(capabilityText)) {
      return 'network_communication';
    }

    // 文档相关关键词
    if (/文档|document|pdf|word|excel|编辑/.test(capabilityText)) {
      return 'document_processing';
    }

    // 媒体相关关键词
    if (/图像|视频|音频|媒体|image|video|audio/.test(capabilityText)) {
      return 'media_processing';
    }

    // 安全相关关键词
    if (/安全|加密|认证|权限|security|auth/.test(capabilityText)) {
      return 'security_protection';
    }

    // 测试相关关键词
    if (/测试|验证|检查|test|validation/.test(capabilityText)) {
      return 'testing_validation';
    }

    // 项目管理相关关键词
    if (/项目|任务|管理|计划|协作|project|task/.test(capabilityText)) {
      return 'project_management';
    }

    // 设计相关关键词
    if (/设计|ui|ux|界面|原型|design/.test(capabilityText)) {
      return 'ui_design';
    }
  }

  // 根据来源类型推断
  switch (sourceType) {
    case TOOL_SOURCE_TYPES.AI:
      return 'ai_assistant';
    case TOOL_SOURCE_TYPES.MCP:
      return 'system_tools';
    case TOOL_SOURCE_TYPES.API:
      return 'network_communication';
    default:
      return 'system_tools';
  }
}

/**
 * 工具数据验证器
 */
export class ToolValidator {
  static validateBasicInfo(tool) {
    const errors = [];
    if (!tool.name || tool.name.trim().length === 0) {
      errors.push('工具名称不能为空');
    }
    if (!tool.description || tool.description.trim().length === 0) {
      errors.push('工具描述不能为空');
    }
    return errors;
  }

  static validateConfig(tool) {
    const errors = [];
    
    // 检查必需字段
    tool.requiredFields.forEach(field => {
      if (!tool.config[field]) {
        errors.push(`必需字段 ${field} 不能为空`);
      }
    });

    return errors;
  }

  static validateForApproval(tool) {
    const errors = [];
    
    // 基本信息验证
    errors.push(...this.validateBasicInfo(tool));
    
    // 配置验证
    errors.push(...this.validateConfig(tool));
    
    // 测试状态验证
    if (!tool.tested) {
      errors.push('工具必须先通过测试才能申请批准');
    }

    return errors;
  }
}
