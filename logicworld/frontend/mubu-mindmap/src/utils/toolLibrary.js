/**
 * 工具库管理模块
 * 用于管理和获取系统工具库信息
 */

import { TOOL_CATEGORIES } from '../constants/toolCategories';
import { migrateToolsData, validateToolCategories } from './toolDataMigration';

// 保持向后兼容的工具功能分类定义
const LEGACY_TOOL_CATEGORIES = {
  // 1. AI智能类 - 通用AI能力
  ai_intelligence: {
    name: "🤖 AI智能助手",
    description: "通用AI对话、分析、生成能力",
    keywords: ["分析", "生成", "编写", "创建", "设计", "规划", "思考", "建议"],
    tools: ["deepseek_chat", "tongyi_qwen"]
  },

  // 2. 文档处理类 - 文档相关
  document_processing: {
    name: "📄 文档处理",
    description: "文档生成、编辑、管理",
    keywords: ["文档", "报告", "手册", "说明", "需求", "规范", "计划", "方案"],
    tools: ["deepseek_chat", "tongyi_qwen", "file_operations"]
  },

  // 3. 代码开发类 - 编程相关
  code_development: {
    name: "💻 代码开发",
    description: "代码生成、编程、脚本开发",
    keywords: ["代码", "编程", "开发", "脚本", "函数", "算法", "实现", "功能"],
    tools: ["deepseek_chat", "file_operations"]
  },

  // 4. 界面设计类 - UI/UX设计
  ui_design: {
    name: "🎨 界面设计",
    description: "UI/UX设计、原型制作、视觉设计",
    keywords: ["界面", "设计", "UI", "UX", "原型", "布局", "交互", "视觉", "用户体验"],
    tools: ["design_tools", "deepseek_chat"]
  },

  // 5. 数据处理类 - 数据分析
  data_processing: {
    name: "📊 数据处理",
    description: "数据分析、统计、可视化",
    keywords: ["数据", "分析", "统计", "图表", "可视化", "报表", "指标", "模型"],
    tools: ["data_analysis_tools", "database_tools"]
  },

  // 6. 文件管理类 - 文件操作
  file_management: {
    name: "📁 文件管理",
    description: "文件操作、项目结构管理",
    keywords: ["文件", "目录", "结构", "组织", "管理", "保存", "创建", "项目结构"],
    tools: ["file_operations"]
  },

  // 7. 网络通信类 - API和网络
  network_communication: {
    name: "🌐 网络通信",
    description: "API调用、HTTP请求、数据获取",
    keywords: ["API", "请求", "调用", "接口", "网络", "获取", "传输", "连接"],
    tools: ["http_client", "api_caller"]
  },

  // 8. 测试验证类 - 测试相关
  testing_validation: {
    name: "🧪 测试验证",
    description: "测试用例、质量保证、验证",
    keywords: ["测试", "验证", "检查", "质量", "用例", "自动化", "单元测试", "集成测试"],
    tools: ["test_tools", "deepseek_chat"]
  },

  // 9. 项目管理类 - 项目协调
  project_management: {
    name: "📋 项目管理",
    description: "项目规划、进度管理、团队协作",
    keywords: ["项目", "管理", "规划", "进度", "计划", "协作", "团队", "里程碑"],
    tools: ["deepseek_chat", "tongyi_qwen", "intelligent_mode_detection"]
  },

  // 10. 媒体处理类 - 多媒体
  media_processing: {
    name: "🎬 媒体处理",
    description: "视频、音频、图片处理",
    keywords: ["视频", "音频", "图片", "媒体", "编辑", "处理", "转换", "制作"],
    tools: ["video_editor", "audio_processor", "image_processor"]
  },

  // 11. 数据库类 - 数据存储
  database_management: {
    name: "🗄️ 数据库管理",
    description: "数据库设计、查询、管理",
    keywords: ["数据库", "SQL", "查询", "存储", "表", "关系", "索引", "备份"],
    tools: ["database_tools", "deepseek_chat"]
  },

  // 12. 部署运维类 - 系统部署
  deployment_operations: {
    name: "🚀 部署运维",
    description: "系统部署、运维、监控",
    keywords: ["部署", "运维", "服务器", "监控", "配置", "环境", "发布", "维护"],
    tools: ["deployment_tools", "file_operations"]
  },

  // 13. 智能决策类 - 系统决策
  intelligent_decision: {
    name: "🧠 智能决策",
    description: "复杂度评估、模式检测、智能路由",
    keywords: ["评估", "检测", "判断", "选择", "决策", "复杂度", "模式", "智能"],
    tools: ["intelligent_mode_detection"]
  },

  // 14. 安全防护类 - 安全相关
  security_protection: {
    name: "🔒 安全防护",
    description: "安全检测、权限管理、加密",
    keywords: ["安全", "权限", "加密", "防护", "认证", "授权", "漏洞", "防火墙"],
    tools: ["security_tools"]
  },

  // 15. 学习培训类 - 教育培训
  learning_training: {
    name: "📚 学习培训",
    description: "知识问答、教程制作、培训材料",
    keywords: ["学习", "培训", "教程", "知识", "问答", "教育", "指导", "解释"],
    tools: ["deepseek_chat", "tongyi_qwen"]
  },

  // 16. 生活服务类 - 日常生活
  life_services: {
    name: "🏠 生活服务",
    description: "日常生活、娱乐、健康、购物等生活相关服务",
    keywords: [
      // 日常生活
      "生活", "日常", "家庭", "家务", "购物", "消费",
      // 健康相关
      "健康", "运动", "锻炼", "饮食", "营养", "医疗", "保健",
      // 娱乐休闲
      "娱乐", "游戏", "电影", "音乐", "旅游", "休闲", "爱好",
      // 社交情感
      "聊天", "交友", "情感", "心理", "建议", "倾诉",
      // 理财规划
      "理财", "投资", "预算", "省钱", "消费", "财务",
      // 时间管理
      "时间", "日程", "提醒", "习惯", "效率", "生活规划",
      // 美食烹饪
      "美食", "烹饪", "食谱", "做饭", "菜谱", "餐厅",
      // 家居装修
      "装修", "家居", "布置", "收纳", "清洁", "维修"
    ],
    tools: ["deepseek_chat", "tongyi_qwen", "life_assistant"]
  }
};

// 系统工具库定义已移除 - 现在完全从后端API加载实际配置的工具
/*
export const SYSTEM_TOOLS = {
  // AI智能工具
  ai_tools: {
    label: "🤖 AI智能工具",
    color: "#0d6efd",
    tools: [
      {
        id: "deepseek_chat",
        name: "🤖 DeepSeek聊天模型",
        description: "AI智能核心工具，支持文档生成、代码生成、架构设计等",
        capabilities: ["文档生成", "代码生成", "架构设计", "测试相关", "项目管理", "UI/UX设计"],
        functionalCategory: "ai_assistant",
        available: true
      },
      {
        id: "tongyi_qwen",
        name: "🤖 通义千问模型",
        description: "中文AI专家，专注中文文档和本土化方案",
        capabilities: ["中文文档", "本土化方案", "知识问答"],
        functionalCategory: "ai_assistant",
        available: true
      },
      {
        id: "intelligent_mode_detection",
        name: "🧠 智能模式检测系统",
        description: "智能决策助手，自动评估任务复杂度并选择最佳处理模式",
        capabilities: ["复杂度分析", "智能路由"],
        functionalCategory: "intelligent_decision",
        available: true
      }
    ]
  },

  // 文件管理工具
  file_tools: {
    label: "📁 文件管理工具",
    color: "#198754",
    tools: [
      {
        id: "file_operations",
        name: "📁 文件操作工具",
        description: "文件管理专家，处理项目结构、配置文件、部署脚本等",
        capabilities: ["项目结构", "配置文件", "部署脚本", "文档管理"],
        functionalCategory: "file_management",
        available: true
      },
      {
        id: "document_generator",
        name: "📄 文档生成工具",
        description: "专业文档生成工具，支持多种格式",
        capabilities: ["技术文档", "用户手册", "API文档"],
        functionalCategory: "document_processing",
        available: false
      },
      {
        id: "project_structure",
        name: "🗂️ 项目结构工具",
        description: "项目结构管理和组织工具",
        capabilities: ["目录结构", "文件组织", "模板生成"],
        functionalCategory: "file_management",
        available: false
      }
    ]
  },

  // 开发工具
  dev_tools: {
    label: "💻 开发工具",
    color: "#6f42c1",
    tools: [
      {
        id: "code_generator",
        name: "⚙️ 代码生成工具",
        description: "智能代码生成和优化工具",
        capabilities: ["代码生成", "代码优化", "重构建议"],
        functionalCategory: "code_development",
        available: false
      },
      {
        id: "config_manager",
        name: "🔧 配置管理工具",
        description: "项目配置文件管理工具",
        capabilities: ["配置生成", "环境管理", "部署配置"],
        functionalCategory: "deployment_operations",
        available: false
      },
      {
        id: "test_tools",
        name: "🧪 测试工具",
        description: "自动化测试工具集",
        capabilities: ["单元测试", "集成测试", "性能测试"],
        functionalCategory: "testing_validation",
        available: false
      }
    ]
  },

  // 网络工具
  network_tools: {
    label: "🌐 网络工具",
    color: "#fd7e14",
    tools: [
      {
        id: "http_client",
        name: "🌐 HTTP请求工具",
        description: "HTTP请求和API调用工具",
        capabilities: ["HTTP请求", "API测试", "数据获取"],
        functionalCategory: "network_communication",
        available: false
      },
      {
        id: "api_caller",
        name: "📡 API调用工具",
        description: "专业API调用和集成工具",
        capabilities: ["API集成", "数据同步", "服务调用"],
        functionalCategory: "network_communication",
        available: false
      },
      {
        id: "web_scraper",
        name: "🔗 网络爬虫工具",
        description: "网页数据抓取和分析工具",
        capabilities: ["数据抓取", "内容分析", "信息提取"],
        functionalCategory: "network_communication",
        available: false
      }
    ]
  },

  // 数据处理工具
  data_tools: {
    label: "📊 数据处理工具",
    color: "#20c997",
    tools: [
      {
        id: "data_analyzer",
        name: "📊 数据分析工具",
        description: "数据分析和处理工具",
        capabilities: ["数据分析", "统计计算", "趋势分析"],
        functionalCategory: "data_processing",
        available: false
      },
      {
        id: "chart_generator",
        name: "📈 图表生成工具",
        description: "数据可视化和图表生成工具",
        capabilities: ["图表生成", "数据可视化", "报表制作"],
        functionalCategory: "data_processing",
        available: false
      },
      {
        id: "database_tools",
        name: "🗄️ 数据库工具",
        description: "数据库操作和管理工具",
        capabilities: ["数据库查询", "数据迁移", "结构管理"],
        functionalCategory: "database_management",
        available: false
      }
    ]
  },

  // 专业软件工具
  professional_tools: {
    label: "🎨 专业软件工具",
    color: "#e91e63",
    tools: [
      {
        id: "design_tools",
        name: "🎨 设计工具",
        description: "UI/UX设计和图形设计工具",
        capabilities: ["界面设计", "图形设计", "原型制作"],
        functionalCategory: "ui_design",
        available: false
      },
      {
        id: "video_editor",
        name: "🎬 视频编辑工具",
        description: "视频编辑和后期制作工具",
        capabilities: ["视频编辑", "特效制作", "格式转换"],
        functionalCategory: "media_processing",
        available: false
      },
      {
        id: "audio_processor",
        name: "🎵 音频处理工具",
        description: "音频编辑和处理工具",
        capabilities: ["音频编辑", "格式转换", "音效处理"],
        functionalCategory: "media_processing",
        available: false
      },
      {
        id: "3d_modeling",
        name: "🏗️ 3D建模工具",
        description: "3D建模和渲染工具",
        capabilities: ["3D建模", "材质贴图", "渲染输出"],
        functionalCategory: "ui_design",
        available: false
      }
    ]
  }
};
*/

/**
 * 获取所有工具分组 - 现在从API加载
 */
export function getToolGroups() {
  // 静态工具库已移除，现在从API加载
  return [];
}

/**
 * 获取所有可用工具 - 现在从API加载
 */
export function getAvailableTools() {
  // 静态工具库已移除，现在从API加载
  return [];
}

/**
 * 获取所有工具（包括不可用的和用户工具）
 */
export async function getAllTools(includeUserTools = true) {
  try {
    // 使用新的工具管理器
    const { toolManager } = await import('./toolManager.js');

    // 确保工具管理器已初始化
    if (!toolManager.initialized) {
      await toolManager.initialize();
    }

    if (includeUserTools) {
      return toolManager.getAccessibleTools();
    } else {
      // 只返回系统工具
      return toolManager.getToolsBySource('system');
    }
  } catch (error) {
    console.error('获取工具失败，尝试使用多源加载器:', error);

    try {
      // 尝试使用多源加载器
      const { multiSourceToolLoader } = await import('./multiSourceToolLoader.js');
      const allTools = await multiSourceToolLoader.loadAllTools();

      if (includeUserTools) {
        return allTools;
      } else {
        return allTools.filter(tool => tool.sourceType === 'system');
      }
    } catch (loaderError) {
      console.error('多源加载器也失败，回退到传统方式:', loaderError);

      // 回退到原有逻辑
      const allTools = [];

      // 系统工具现在从API加载，不再使用静态定义
      // 这部分逻辑已移至multiSourceToolLoader

      // 添加用户工具（如果需要）
      if (includeUserTools) {
        try {
          const userTools = await fetchUserTools();
          userTools.forEach(tool => {
            allTools.push({
              ...tool,
              groupLabel: '我的工具',
              groupColor: '#9C27B0',
              source: 'user'
            });
          });
        } catch (error) {
          console.warn('获取用户工具失败:', error);
        }
      }

      return allTools;
    }
  }
}

/**
 * 获取用户工具（我的工具）
 */
export async function getUserTools() {
  try {
    // 使用新的工具管理器
    const { toolManager } = await import('./toolManager.js');

    // 确保工具管理器已初始化
    if (!toolManager.initialized) {
      await toolManager.initialize();
    }

    return toolManager.getUserTools();
  } catch (error) {
    console.error('获取用户工具失败，回退到传统方式:', error);
    return await fetchUserTools();
  }
}

/**
 * 获取"我的工具"分类信息
 */
export async function getMyToolsCategories() {
  try {
    // 使用新的工具管理器
    const { toolManager } = await import('./toolManager.js');

    // 确保工具管理器已初始化
    if (!toolManager.initialized) {
      await toolManager.initialize();
    }

    return toolManager.getMyToolsCategories();
  } catch (error) {
    console.error('获取我的工具分类失败:', error);
    return {};
  }
}

/**
 * 获取"我的工具"统计信息
 */
export async function getMyToolsStats() {
  try {
    // 使用新的工具管理器
    const { toolManager } = await import('./toolManager.js');

    // 确保工具管理器已初始化
    if (!toolManager.initialized) {
      await toolManager.initialize();
    }

    return toolManager.getMyToolsStats();
  } catch (error) {
    console.error('获取我的工具统计失败:', error);
    return {
      total: 0,
      ai: 0,
      mcp: 0,
      api: 0,
      user: 0,
      tested: 0,
      pending: 0,
      approved: 0
    };
  }
}

/**
 * 获取用户工具（传统方式，作为回退）
 */
async function fetchUserTools() {
  try {
    // 首先尝试从localStorage获取模拟的用户工具
    const localUserTools = localStorage.getItem('userTools');
    if (localUserTools) {
      const tools = JSON.parse(localUserTools);
      console.log('从localStorage获取用户工具:', tools);
      return tools.map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        capabilities: tool.config?.capabilities || [tool.type],
        functionalCategory: mapUserToolCategory(tool.category, tool.type),
        available: tool.enabled && (tool.approved || tool.source === 'user'), // 批准的工具或用户自己的工具可用
        approved: tool.approved || false,
        userOwned: tool.source === 'user' // 标记是否为用户自己的工具
      }));
    }

    // 如果localStorage没有，尝试从API获取
    const response = await fetch('/api/tools/user-tools');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.success && Array.isArray(result.tools)) {
      return result.tools.map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        capabilities: tool.config?.capabilities || [tool.type],
        functionalCategory: mapUserToolCategory(tool.category, tool.type),
        available: tool.enabled && (tool.approved || tool.source === 'user'), // 批准的工具或用户自己的工具可用
        approved: tool.approved || false,
        userOwned: tool.source === 'user' // 标记是否为用户自己的工具
      }));
    }
    return [];
  } catch (error) {
    console.warn('获取用户工具失败，返回空数组:', error);
    return [];
  }
}

/**
 * 将用户工具分类映射到功能分类
 */
function mapUserToolCategory(category, type) {
  const categoryMap = {
    'api': 'network_communication',
    'file': 'file_management',
    'data': 'data_processing',
    'ai': 'ai_assistant',
    'search': 'network_communication',
    'utility': 'system_tools',
    '我的工具': 'system_tools'
  };

  return categoryMap[type] || categoryMap[category] || 'system_tools';
}

/**
 * 根据ID查找工具 - 现在从API加载
 */
export function getToolById(toolId) {
  // 静态工具库已移除，现在从API加载
  return null;
}

/**
 * 根据名称查找工具 - 现在从API加载
 */
export function getToolByName(toolName) {
  // 静态工具库已移除，现在从API加载
  return null;
}

/**
 * 根据能力搜索工具 - 现在从API加载
 */
export function searchToolsByCapability(capability) {
  // 静态工具库已移除，现在从API加载
  return [];
}

/**
 * 生成工具选择器选项 - 现在从API加载
 */
export function generateToolSelectorOptions() {
  // 静态工具库已移除，现在从API加载
  return [];
}

/**
 * 检查是否为缺失工具的文本
 */
export function isMissingToolText(text) {
  return text && (text.includes('⚠️') || text.includes('请配置') || text.includes('需外部工具'));
}

/**
 * 获取所有工具分类
 */
export function getToolCategories() {
  return Object.entries(TOOL_CATEGORIES).map(([categoryId, category]) => ({
    id: categoryId,
    ...category
  }));
}

/**
 * 根据分类ID获取分类信息
 */
export function getCategoryById(categoryId) {
  return TOOL_CATEGORIES[categoryId] || null;
}

/**
 * 根据工具描述自动推荐分类
 */
export function suggestCategoryByDescription(description) {
  if (!description) return null;

  const text = description.toLowerCase();
  let bestCategory = null;
  let bestScore = 0;

  for (const [categoryId, category] of Object.entries(TOOL_CATEGORIES)) {
    const score = category.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestCategory = categoryId;
    }
  }

  return bestCategory;
}

/**
 * 智能工具匹配算法
 * 根据执行描述内容自动匹配最合适的工具
 */
export async function smartMatchTool(executionDescription) {
  if (!executionDescription) {
    return null;
  }

  const description = executionDescription.toLowerCase();
  const allTools = await getAllTools();

  // 定义关键词匹配规则
  const matchingRules = [
    // AI智能工具匹配规则
    {
      keywords: ['文档', '需求', '分析', '设计', '规划', '编写', '生成', '创建文档', '技术文档', '用户手册'],
      toolIds: ['deepseek_chat', 'tongyi_qwen'],
      priority: 10
    },
    {
      keywords: ['代码', '编程', '开发', '实现', '功能', '模块', '业务逻辑', '算法'],
      toolIds: ['deepseek_chat'],
      priority: 10
    },
    {
      keywords: ['中文', '本土化', '中国', '汉语'],
      toolIds: ['tongyi_qwen'],
      priority: 15
    },
    {
      keywords: ['复杂度', '评估', '分析', '选择', '判断', '决策'],
      toolIds: ['intelligent_mode_detection'],
      priority: 12
    },

    // 文件管理工具匹配规则
    {
      keywords: ['文件', '目录', '项目结构', '配置文件', '创建', '组织', '管理'],
      toolIds: ['file_operations'],
      priority: 10
    },
    {
      keywords: ['部署', '脚本', '构建', '环境', '配置', '服务器'],
      toolIds: ['file_operations'],
      priority: 8
    },

    // 专业软件工具匹配规则
    {
      keywords: ['界面', 'ui', 'ux', '设计', '布局', '交互', '视觉', '原型'],
      toolIds: ['design_tools'],
      priority: 5
    },
    {
      keywords: ['视频', '编辑', '剪辑', '特效', '后期'],
      toolIds: ['video_editor'],
      priority: 5
    },
    {
      keywords: ['音频', '声音', '音效', '录音'],
      toolIds: ['audio_processor'],
      priority: 5
    },
    {
      keywords: ['3d', '建模', '渲染', '材质', '贴图'],
      toolIds: ['3d_modeling'],
      priority: 5
    },

    // 网络工具匹配规则
    {
      keywords: ['http', 'api', '请求', '调用', '接口', '数据获取'],
      toolIds: ['http_client', 'api_caller'],
      priority: 5
    },
    {
      keywords: ['爬虫', '抓取', '网页', '数据采集'],
      toolIds: ['web_scraper'],
      priority: 5
    },

    // 数据处理工具匹配规则
    {
      keywords: ['数据', '分析', '统计', '计算', '处理'],
      toolIds: ['data_analyzer'],
      priority: 5
    },
    {
      keywords: ['图表', '可视化', '报表', '图形'],
      toolIds: ['chart_generator'],
      priority: 5
    },
    {
      keywords: ['数据库', '查询', 'sql', '存储'],
      toolIds: ['database_tools'],
      priority: 5
    },

    // 开发工具匹配规则
    {
      keywords: ['测试', '单元测试', '集成测试', '测试用例'],
      toolIds: ['test_tools'],
      priority: 8
    }
  ];

  // 计算每个工具的匹配分数
  const toolScores = new Map();

  matchingRules.forEach(rule => {
    const matchCount = rule.keywords.filter(keyword =>
      description.includes(keyword)
    ).length;

    if (matchCount > 0) {
      rule.toolIds.forEach(toolId => {
        const currentScore = toolScores.get(toolId) || 0;
        const newScore = currentScore + (matchCount * rule.priority);
        toolScores.set(toolId, newScore);
      });
    }
  });

  // 找到分数最高的可用工具
  let bestTool = null;
  let bestScore = 0;

  for (const [toolId, score] of toolScores.entries()) {
    if (score > bestScore) {
      const tool = getToolById(toolId);
      if (tool && tool.available) {
        bestTool = tool;
        bestScore = score;
      }
    }
  }

  // 如果没有匹配到可用工具，返回默认工具或缺失提示
  if (!bestTool) {
    // 优先返回可用的AI工具作为默认选择
    const defaultTool = getToolById('deepseek_chat') || getToolById('tongyi_qwen');
    if (defaultTool && defaultTool.available) {
      return defaultTool;
    }

    // 如果没有可用的AI工具，返回缺失工具提示
    return {
      id: 'missing',
      name: '⚠️ 请配置对应功能的工具',
      description: '当前没有适合的工具可用，请配置相应功能的工具',
      available: false,
      groupLabel: '⚠️ 系统状态',
      groupColor: '#dc3545'
    };
  }

  return bestTool;
}

// 重新导出 TOOL_CATEGORIES 以保持向后兼容性
export { TOOL_CATEGORIES };

/**
 * 工具同步事件处理器
 */
export class ToolSyncHandler {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 监听工具配置更新事件
    window.addEventListener('toolsConfigUpdated', this.handleToolsConfigUpdated.bind(this));

    // 监听特定源的工具更新事件
    window.addEventListener('aiToolsUpdated', () => this.handleSourceUpdated('ai'));
    window.addEventListener('mcpToolsUpdated', () => this.handleSourceUpdated('mcp'));
    window.addEventListener('apiToolsUpdated', () => this.handleSourceUpdated('api'));
    window.addEventListener('userToolsUpdated', () => this.handleSourceUpdated('user'));
  }

  async handleToolsConfigUpdated(event) {
    console.log('检测到工具配置更新事件');

    try {
      // 获取工具管理器
      const { toolManager } = await import('./toolManager.js');

      // 刷新所有工具
      await toolManager.refresh();

      // 触发工具库更新事件
      window.dispatchEvent(new CustomEvent('toolLibraryUpdated', {
        detail: { source: 'all', timestamp: new Date().toISOString() }
      }));

      console.log('工具库已刷新');
    } catch (error) {
      console.error('处理工具配置更新失败:', error);
    }
  }

  async handleSourceUpdated(source) {
    console.log(`检测到${source}工具更新`);

    try {
      // 获取工具管理器
      const { toolManager } = await import('./toolManager.js');

      // 刷新特定源的工具
      await toolManager.refreshSource(source);

      // 触发工具库更新事件
      window.dispatchEvent(new CustomEvent('toolLibraryUpdated', {
        detail: { source, timestamp: new Date().toISOString() }
      }));

      console.log(`${source}工具已刷新`);
    } catch (error) {
      console.error(`处理${source}工具更新失败:`, error);
    }
  }
}

// 创建全局工具同步处理器
export const toolSyncHandler = new ToolSyncHandler();
