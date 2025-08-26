/**
 * 工具分类常量定义
 * 定义了所有工具分类的详细信息，包括名称、图标、描述和关键词
 */

export const TOOL_CATEGORIES = {
  // AI智能助手
  ai_assistant: {
    name: '🤖 AI智能助手',
    icon: '🤖',
    description: '🤖 AI智能助手：智能对话、内容生成、问答咨询',
    keywords: ['AI', '智能', '助手', '对话', '生成', '问答', '咨询', '聊天', '机器人'],
    color: '#007bff'
  },

  // 文档处理
  document_processing: {
    name: '📄 文档处理',
    icon: '📄',
    description: '📄 文档处理：文档编辑、格式转换、内容管理',
    keywords: ['文档', '编辑', '处理', '转换', '格式', 'PDF', 'Word', '内容', '管理'],
    color: '#28a745'
  },

  // 代码开发
  code_development: {
    name: '💻 代码开发',
    icon: '💻',
    description: '💻 代码开发：编程工具、代码生成、开发辅助',
    keywords: ['代码', '编程', '开发', '生成', '工具', '辅助', '程序', '软件'],
    color: '#17a2b8'
  },

  // 界面设计
  ui_design: {
    name: '🎨 界面设计',
    icon: '🎨',
    description: '🎨 界面设计：UI设计、原型制作、视觉设计',
    keywords: ['UI', '设计', '界面', '原型', '视觉', '美工', '布局', '样式'],
    color: '#e83e8c'
  },

  // 数据处理
  data_processing: {
    name: '📊 数据处理',
    icon: '📊',
    description: '📊 数据处理：数据分析、统计计算、可视化',
    keywords: ['数据', '分析', '统计', '计算', '可视化', '图表', '报表', '处理'],
    color: '#fd7e14'
  },

  // 文件管理
  file_management: {
    name: '📁 文件管理',
    icon: '📁',
    description: '📁 文件管理：文件操作、存储管理、备份同步',
    keywords: ['文件', '管理', '存储', '备份', '同步', '操作', '目录', '文件夹'],
    color: '#6f42c1'
  },

  // 网络通信
  network_communication: {
    name: '🌐 网络通信',
    icon: '🌐',
    description: '🌐 网络通信：API调用、HTTP请求、数据获取',
    keywords: ['网络', '通信', 'API', 'HTTP', '请求', '数据', '获取', '调用'],
    color: '#20c997'
  },



  // 项目管理
  project_management: {
    name: '📋 项目管理',
    icon: '📋',
    description: '📋 项目管理：任务管理、进度跟踪、协作工具',
    keywords: ['项目', '管理', '任务', '进度', '跟踪', '协作', '计划', '团队'],
    color: '#ffc107'
  },

  // 媒体处理
  media_processing: {
    name: '🎬 媒体处理',
    icon: '🎬',
    description: '🎬 媒体处理：图像处理、视频编辑、音频工具',
    keywords: ['媒体', '图像', '视频', '音频', '处理', '编辑', '转换', '压缩'],
    color: '#dc3545'
  },

  // 数据库管理
  database_management: {
    name: '🗄️ 数据库管理',
    icon: '🗄️',
    description: '🗄️ 数据库管理：数据库操作、查询工具、数据管理',
    keywords: ['数据库', '查询', 'SQL', '数据', '管理', '存储', '操作', '备份'],
    color: '#495057'
  },

  // 部署运维
  deployment_operations: {
    name: '🚀 部署运维',
    icon: '🚀',
    description: '🚀 部署运维：应用部署、服务器管理、运维工具',
    keywords: ['部署', '运维', '服务器', '管理', '监控', '自动化', '环境', '配置'],
    color: '#343a40'
  },



  // 安全防护
  security_protection: {
    name: '🔒 安全防护',
    icon: '🔒',
    description: '🔒 安全防护：安全检查、加密工具、权限管理',
    keywords: ['安全', '防护', '加密', '权限', '检查', '保护', '认证', '授权'],
    color: '#dc3545'
  },

  // 学习培训
  learning_training: {
    name: '📚 学习培训',
    icon: '📚',
    description: '📚 学习培训：教育工具、培训资源、知识管理',
    keywords: ['学习', '培训', '教育', '知识', '资源', '教学', '课程', '指导'],
    color: '#28a745'
  },

  // 生活服务
  life_services: {
    name: '🏠 生活服务',
    icon: '🏠',
    description: '🏠 生活服务：日常工具、便民服务、生活助手',
    keywords: ['生活', '服务', '日常', '便民', '工具', '助手', '实用', '个人'],
    color: '#6f42c1'
  },

  // 系统工具
  system_tools: {
    name: '⚙️ 系统工具',
    icon: '⚙️',
    description: '⚙️ 系统工具：系统监控、文件操作、网络诊断、时间管理',
    keywords: ['系统', '监控', '文件', '网络', '诊断', 'ping', '时间', '管理', '本地'],
    color: '#6c757d'
  }
};

/**
 * 获取所有分类选项（用于下拉选择器）
 */
export function getCategoryOptions() {
  return Object.entries(TOOL_CATEGORIES).map(([id, category]) => ({
    value: id,
    label: category.name,
    description: category.description,
    icon: category.icon,
    color: category.color
  }));
}

/**
 * 根据ID获取分类信息
 */
export function getCategoryById(categoryId) {
  return TOOL_CATEGORIES[categoryId] || null;
}

/**
 * 根据关键词搜索分类
 */
export function searchCategories(keyword) {
  if (!keyword) return [];
  
  const searchTerm = keyword.toLowerCase();
  return Object.entries(TOOL_CATEGORIES)
    .filter(([id, category]) => {
      return category.name.toLowerCase().includes(searchTerm) ||
             category.description.toLowerCase().includes(searchTerm) ||
             category.keywords.some(k => k.toLowerCase().includes(searchTerm));
    })
    .map(([id, category]) => ({ id, ...category }));
}

/**
 * 获取分类统计信息
 */
export function getCategoryStats() {
  return {
    total: Object.keys(TOOL_CATEGORIES).length,
    categories: Object.keys(TOOL_CATEGORIES)
  };
}

// 导出默认分类ID
export const DEFAULT_CATEGORY = 'ai_assistant';

// 导出分类颜色映射
export const CATEGORY_COLORS = Object.fromEntries(
  Object.entries(TOOL_CATEGORIES).map(([id, category]) => [id, category.color])
);
