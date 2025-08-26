/**
 * 工具数据迁移工具
 * 为现有工具数据添加分类信息，确保数据完整性
 */

import { TOOL_CATEGORIES } from '../constants/toolCategories';
import { suggestCategoryByDescription } from './toolLibrary';

/**
 * 工具分类映射表
 * 基于工具名称和描述的手动映射
 */
const TOOL_CATEGORY_MAPPING = {
  // AI智能助手
  'deepseek_chat': 'ai_assistant',
  'tongyi_qwen': 'ai_assistant',
  'intelligent_mode_detection': 'intelligent_decision',
  'claude_sonnet': 'ai_assistant',
  'gpt4': 'ai_assistant',
  'gemini': 'ai_assistant',
  
  // 文档处理
  'document_generator': 'document_processing',
  'pdf_processor': 'document_processing',
  'markdown_converter': 'document_processing',
  'word_processor': 'document_processing',
  'excel_handler': 'document_processing',
  
  // 代码开发
  'code_generator': 'code_development',
  'syntax_checker': 'code_development',
  'code_formatter': 'code_development',
  'git_helper': 'code_development',
  'package_manager': 'code_development',
  
  // 界面设计
  'ui_designer': 'ui_design',
  'prototype_maker': 'ui_design',
  'color_picker': 'ui_design',
  'icon_generator': 'ui_design',
  
  // 数据处理
  'data_analyzer': 'data_processing',
  'chart_generator': 'data_processing',
  'csv_processor': 'data_processing',
  'json_formatter': 'data_processing',
  'database_query': 'database_management',
  
  // 文件管理
  'file_operations': 'file_management',
  'backup_tool': 'file_management',
  'sync_manager': 'file_management',
  'archive_tool': 'file_management',
  
  // 网络通信
  'api_client': 'network_communication',
  'http_tester': 'network_communication',
  'webhook_handler': 'network_communication',
  'rest_client': 'network_communication',
  
  // 测试验证
  'test_runner': 'testing_validation',
  'unit_tester': 'testing_validation',
  'integration_tester': 'testing_validation',
  'performance_tester': 'testing_validation',
  
  // 项目管理
  'task_manager': 'project_management',
  'time_tracker': 'project_management',
  'milestone_tracker': 'project_management',
  'team_collaborator': 'project_management',
  
  // 媒体处理
  'image_processor': 'media_processing',
  'video_editor': 'media_processing',
  'audio_converter': 'media_processing',
  'media_compressor': 'media_processing',
  
  // 部署运维
  'deployment_manager': 'deployment_operations',
  'server_monitor': 'deployment_operations',
  'log_analyzer': 'deployment_operations',
  'performance_monitor': 'deployment_operations',
  
  // 安全防护
  'security_scanner': 'security_protection',
  'encryption_tool': 'security_protection',
  'auth_manager': 'security_protection',
  'vulnerability_checker': 'security_protection',
  
  // 学习培训
  'tutorial_generator': 'learning_training',
  'knowledge_base': 'learning_training',
  'quiz_maker': 'learning_training',
  'course_planner': 'learning_training',
  
  // 生活服务
  'calendar_helper': 'life_services',
  'weather_checker': 'life_services',
  'reminder_tool': 'life_services',
  'note_taker': 'life_services'
};

/**
 * 关键词到分类的映射
 */
const KEYWORD_CATEGORY_MAPPING = {
  // AI相关关键词
  'ai': 'ai_assistant',
  'intelligent': 'ai_assistant',
  'smart': 'ai_assistant',
  'chat': 'ai_assistant',
  'conversation': 'ai_assistant',
  'generate': 'ai_assistant',
  'assistant': 'ai_assistant',
  
  // 文档相关关键词
  'document': 'document_processing',
  'pdf': 'document_processing',
  'word': 'document_processing',
  'excel': 'document_processing',
  'markdown': 'document_processing',
  'text': 'document_processing',
  
  // 代码相关关键词
  'code': 'code_development',
  'programming': 'code_development',
  'development': 'code_development',
  'syntax': 'code_development',
  'compiler': 'code_development',
  'debug': 'code_development',
  
  // 设计相关关键词
  'design': 'ui_design',
  'ui': 'ui_design',
  'ux': 'ui_design',
  'interface': 'ui_design',
  'prototype': 'ui_design',
  'visual': 'ui_design',
  
  // 数据相关关键词
  'data': 'data_processing',
  'analytics': 'data_processing',
  'chart': 'data_processing',
  'graph': 'data_processing',
  'statistics': 'data_processing',
  'visualization': 'data_processing',
  
  // 文件相关关键词
  'file': 'file_management',
  'folder': 'file_management',
  'directory': 'file_management',
  'backup': 'file_management',
  'sync': 'file_management',
  'storage': 'file_management',
  
  // 网络相关关键词
  'api': 'network_communication',
  'http': 'network_communication',
  'request': 'network_communication',
  'network': 'network_communication',
  'client': 'network_communication',
  'server': 'network_communication',
  
  // 测试相关关键词
  'test': 'testing_validation',
  'testing': 'testing_validation',
  'validation': 'testing_validation',
  'verify': 'testing_validation',
  'check': 'testing_validation',
  'quality': 'testing_validation',
  
  // 项目管理相关关键词
  'project': 'project_management',
  'task': 'project_management',
  'management': 'project_management',
  'planning': 'project_management',
  'collaboration': 'project_management',
  'team': 'project_management',
  
  // 媒体相关关键词
  'image': 'media_processing',
  'video': 'media_processing',
  'audio': 'media_processing',
  'media': 'media_processing',
  'photo': 'media_processing',
  'picture': 'media_processing',
  
  // 数据库相关关键词
  'database': 'database_management',
  'sql': 'database_management',
  'query': 'database_management',
  'table': 'database_management',
  'record': 'database_management',
  
  // 部署相关关键词
  'deploy': 'deployment_operations',
  'deployment': 'deployment_operations',
  'hosting': 'deployment_operations',
  'monitor': 'deployment_operations',
  'log': 'deployment_operations',
  'performance': 'deployment_operations',
  
  // 安全相关关键词
  'security': 'security_protection',
  'secure': 'security_protection',
  'encryption': 'security_protection',
  'auth': 'security_protection',
  'authentication': 'security_protection',
  'protection': 'security_protection',
  
  // 学习相关关键词
  'learn': 'learning_training',
  'learning': 'learning_training',
  'training': 'learning_training',
  'education': 'learning_training',
  'tutorial': 'learning_training',
  'course': 'learning_training',
  
  // 生活服务相关关键词
  'calendar': 'life_services',
  'reminder': 'life_services',
  'note': 'life_services',
  'weather': 'life_services',
  'personal': 'life_services',
  'daily': 'life_services'
};

/**
 * 为工具分配分类
 * @param {Object} tool - 工具对象
 * @returns {string} - 分类ID
 */
export function assignToolCategory(tool) {
  if (!tool) return 'ai_assistant'; // 默认分类
  
  // 1. 首先检查手动映射表
  if (tool.id && TOOL_CATEGORY_MAPPING[tool.id]) {
    return TOOL_CATEGORY_MAPPING[tool.id];
  }
  
  // 2. 基于工具名称进行关键词匹配
  if (tool.name) {
    const nameWords = tool.name.toLowerCase().split(/\s+/);
    for (const word of nameWords) {
      if (KEYWORD_CATEGORY_MAPPING[word]) {
        return KEYWORD_CATEGORY_MAPPING[word];
      }
    }
  }
  
  // 3. 基于工具描述进行关键词匹配
  if (tool.description) {
    const descWords = tool.description.toLowerCase().split(/\s+/);
    for (const word of descWords) {
      if (KEYWORD_CATEGORY_MAPPING[word]) {
        return KEYWORD_CATEGORY_MAPPING[word];
      }
    }
    
    // 4. 使用现有的智能分类建议功能
    const suggestedCategory = suggestCategoryByDescription(tool.description);
    if (suggestedCategory && TOOL_CATEGORIES[suggestedCategory]) {
      return suggestedCategory;
    }
  }
  
  // 5. 基于工具能力进行匹配
  if (tool.capabilities && Array.isArray(tool.capabilities)) {
    for (const capability of tool.capabilities) {
      const capabilityWords = capability.toLowerCase().split(/\s+/);
      for (const word of capabilityWords) {
        if (KEYWORD_CATEGORY_MAPPING[word]) {
          return KEYWORD_CATEGORY_MAPPING[word];
        }
      }
    }
  }
  
  // 6. 默认返回AI助手分类
  return 'ai_assistant';
}

/**
 * 批量迁移工具数据
 * @param {Array} tools - 工具数组
 * @returns {Array} - 迁移后的工具数组
 */
export function migrateToolsData(tools) {
  if (!Array.isArray(tools)) {
    console.warn('工具数据不是数组格式，跳过迁移');
    return tools;
  }
  
  const migratedTools = tools.map(tool => {
    // 如果工具已经有分类，保持不变
    if (tool.functionalCategory && TOOL_CATEGORIES[tool.functionalCategory]) {
      return tool;
    }
    
    // 为工具分配分类
    const category = assignToolCategory(tool);
    
    return {
      ...tool,
      functionalCategory: category,
      // 添加迁移标记
      _migrated: true,
      _migratedAt: new Date().toISOString()
    };
  });
  
  console.log(`✅ 工具数据迁移完成，共处理 ${tools.length} 个工具`);
  
  // 统计迁移结果
  const migrationStats = {};
  migratedTools.forEach(tool => {
    const category = tool.functionalCategory;
    migrationStats[category] = (migrationStats[category] || 0) + 1;
  });
  
  console.log('📊 迁移统计:', migrationStats);
  
  return migratedTools;
}

/**
 * 验证工具分类的有效性
 * @param {Array} tools - 工具数组
 * @returns {Object} - 验证结果
 */
export function validateToolCategories(tools) {
  if (!Array.isArray(tools)) {
    return { valid: false, errors: ['工具数据不是数组格式'] };
  }
  
  const errors = [];
  const warnings = [];
  const stats = {
    total: tools.length,
    categorized: 0,
    uncategorized: 0,
    invalidCategories: 0
  };
  
  tools.forEach((tool, index) => {
    if (!tool.functionalCategory) {
      stats.uncategorized++;
      warnings.push(`工具 ${tool.name || tool.id || index} 缺少分类信息`);
    } else if (!TOOL_CATEGORIES[tool.functionalCategory]) {
      stats.invalidCategories++;
      errors.push(`工具 ${tool.name || tool.id || index} 的分类 "${tool.functionalCategory}" 无效`);
    } else {
      stats.categorized++;
    }
  });
  
  const valid = errors.length === 0;
  const completeness = stats.total > 0 ? (stats.categorized / stats.total * 100) : 0;
  
  return {
    valid,
    completeness: Math.round(completeness),
    stats,
    errors,
    warnings,
    summary: `${stats.categorized}/${stats.total} 个工具已正确分类 (${completeness.toFixed(1)}%)`
  };
}

/**
 * 生成迁移报告
 * @param {Array} originalTools - 原始工具数据
 * @param {Array} migratedTools - 迁移后工具数据
 * @returns {Object} - 迁移报告
 */
export function generateMigrationReport(originalTools, migratedTools) {
  const originalValidation = validateToolCategories(originalTools);
  const migratedValidation = validateToolCategories(migratedTools);
  
  const categoryDistribution = {};
  migratedTools.forEach(tool => {
    const category = tool.functionalCategory;
    if (category) {
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    }
  });
  
  return {
    timestamp: new Date().toISOString(),
    migration: {
      originalCount: originalTools.length,
      migratedCount: migratedTools.length,
      newlyCategorized: migratedValidation.stats.categorized - originalValidation.stats.categorized,
      completenessImprovement: migratedValidation.completeness - originalValidation.completeness
    },
    validation: {
      before: originalValidation,
      after: migratedValidation
    },
    categoryDistribution,
    recommendations: generateMigrationRecommendations(migratedValidation, categoryDistribution)
  };
}

/**
 * 生成迁移建议
 */
function generateMigrationRecommendations(validation, distribution) {
  const recommendations = [];
  
  if (validation.completeness < 100) {
    recommendations.push({
      type: 'completion',
      priority: 'high',
      message: `还有 ${validation.stats.uncategorized} 个工具未分类，建议手动检查和分类`
    });
  }
  
  if (validation.errors.length > 0) {
    recommendations.push({
      type: 'validation',
      priority: 'critical',
      message: `发现 ${validation.errors.length} 个无效分类，需要立即修复`
    });
  }
  
  // 检查分类分布是否均衡
  const totalTools = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const avgToolsPerCategory = totalTools / Object.keys(TOOL_CATEGORIES).length;
  
  const overloadedCategories = Object.entries(distribution)
    .filter(([, count]) => count > avgToolsPerCategory * 2)
    .map(([category]) => category);
  
  if (overloadedCategories.length > 0) {
    recommendations.push({
      type: 'balance',
      priority: 'medium',
      message: `分类 ${overloadedCategories.join(', ')} 工具数量过多，建议考虑细分`
    });
  }
  
  return recommendations;
}

/**
 * 执行完整的数据迁移流程
 * @param {Array} tools - 原始工具数据
 * @param {Object} options - 迁移选项
 * @returns {Object} - 迁移结果
 */
export function executeMigration(tools, options = {}) {
  const {
    dryRun = false,
    generateReport = true,
    logProgress = true
  } = options;

  if (logProgress) {
    console.log('🚀 开始工具数据迁移...');
  }

  // 1. 验证原始数据
  const originalValidation = validateToolCategories(tools);
  if (logProgress) {
    console.log('📋 原始数据验证:', originalValidation.summary);
  }

  // 2. 执行迁移
  const migratedTools = dryRun ? tools : migrateToolsData(tools);

  // 3. 验证迁移结果
  const migratedValidation = validateToolCategories(migratedTools);
  if (logProgress) {
    console.log('✅ 迁移后验证:', migratedValidation.summary);
  }

  // 4. 生成报告
  const report = generateReport ? generateMigrationReport(tools, migratedTools) : null;

  return {
    success: migratedValidation.valid,
    originalTools: tools,
    migratedTools,
    validation: {
      original: originalValidation,
      migrated: migratedValidation
    },
    report,
    dryRun
  };
}

/**
 * 导出迁移工具函数
 */
const toolDataMigration = {
  assignToolCategory,
  migrateToolsData,
  validateToolCategories,
  generateMigrationReport,
  executeMigration,
  TOOL_CATEGORY_MAPPING,
  KEYWORD_CATEGORY_MAPPING
};

export default toolDataMigration;
