/**
 * 统计数字验证工具
 * 用于验证各个页面显示的统计数字是否与实际数据一致
 */

/**
 * 验证MCP页面统计数字
 */
export function validateMCPStats(configuredList, systemTools) {
  const stats = {
    // 计算实际数字
    actual: {
      totalCount: configuredList.length,
      myToolsCount: configuredList.length,
      approvedCount: configuredList.filter(t => t.approved).length,
      pendingCount: configuredList.filter(t => t.tested && !t.approved).length,
      systemToolsCount: systemTools.length
    },
    
    // 验证逻辑
    validation: {
      isValid: true,
      errors: []
    }
  };

  // 验证统计数字的一致性
  if (stats.actual.totalCount !== stats.actual.myToolsCount) {
    stats.validation.isValid = false;
    stats.validation.errors.push('总工具数与我的工具数不一致');
  }

  if (stats.actual.approvedCount + stats.actual.pendingCount > stats.actual.totalCount) {
    stats.validation.isValid = false;
    stats.validation.errors.push('已批准和待批准工具数之和超过总数');
  }

  return stats;
}

/**
 * 验证API页面统计数字
 */
export function validateAPIStats(configuredList, apiCategories) {
  const stats = {
    actual: {
      totalTools: configuredList?.length || 0,
      activeTools: configuredList?.filter(t => t.status === 'active').length || 0,
      supportedTypes: Object.keys(apiCategories || {}).length
    },
    
    validation: {
      isValid: true,
      errors: []
    }
  };

  // 验证活跃工具数不超过总数
  if (stats.actual.activeTools > stats.actual.totalTools) {
    stats.validation.isValid = false;
    stats.validation.errors.push('活跃工具数超过总工具数');
  }

  return stats;
}

/**
 * 验证ChatBox工具下拉菜单统计数字
 */
export function validateChatBoxStats(toolsData) {
  const stats = {
    ai: {
      actual: {
        configuredServices: toolsData.ai?.data?.configuredServices || 0,
        activeConnections: toolsData.ai?.data?.activeConnections || 0,
        supportedProviders: toolsData.ai?.data?.supportedProviders || 0
      }
    },
    
    mcp: {
      actual: {
        allTools: toolsData.mcp?.data?.allTools || 0,
        myTools: toolsData.mcp?.data?.myTools || 0,
        platformTools: toolsData.mcp?.data?.platformTools || 0,
        approvedTools: toolsData.mcp?.data?.approvedTools || 0,
        pendingTools: toolsData.mcp?.data?.pendingTools || 0
      }
    },
    
    api: {
      actual: {
        apiTools: toolsData.api?.data?.apiTools || 0,
        runningTools: toolsData.api?.data?.runningTools || 0,
        supportedTypes: toolsData.api?.data?.supportedTypes || 0
      }
    },
    
    validation: {
      isValid: true,
      errors: []
    }
  };

  // 验证MCP工具统计
  const mcpTotal = stats.mcp.actual.myTools + stats.mcp.actual.platformTools;
  if (mcpTotal !== stats.mcp.actual.allTools) {
    stats.validation.isValid = false;
    stats.validation.errors.push('MCP工具：我的工具+平台工具 ≠ 全部工具');
  }

  // 验证API工具统计
  if (stats.api.actual.runningTools > stats.api.actual.apiTools) {
    stats.validation.isValid = false;
    stats.validation.errors.push('API工具：运行中工具数超过总工具数');
  }

  return stats;
}

/**
 * 验证工具库分类统计
 */
export function validateToolLibraryStats(tools, categories) {
  const stats = {
    actual: {
      totalTools: tools.length,
      myTools: tools.filter(t => t.category === '我的工具').length,
      platformTools: tools.filter(t => t.category === '托管平台工具').length,
      categoryStats: {}
    },
    
    validation: {
      isValid: true,
      errors: []
    }
  };

  // 计算各分类的工具数
  categories.forEach(category => {
    if (category.id === 'all') {
      stats.actual.categoryStats[category.id] = tools.length;
    } else if (category.id === '我的工具') {
      stats.actual.categoryStats[category.id] = stats.actual.myTools;
    } else if (category.id === '托管平台工具') {
      stats.actual.categoryStats[category.id] = stats.actual.platformTools;
    } else {
      stats.actual.categoryStats[category.id] = tools.filter(t => t.functionalCategory === category.id).length;
    }
  });

  // 验证分类统计与显示的数字是否一致
  categories.forEach(category => {
    const actualCount = stats.actual.categoryStats[category.id];
    const displayedCount = category.count;
    
    if (actualCount !== displayedCount) {
      stats.validation.isValid = false;
      stats.validation.errors.push(`分类"${category.name}"：实际${actualCount}个，显示${displayedCount}个`);
    }
  });

  return stats;
}

/**
 * 生成统计验证报告
 */
export function generateStatsReport(validationResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      errors: []
    },
    details: validationResults
  };

  // 统计检查结果
  Object.values(validationResults).forEach(result => {
    report.summary.totalChecks++;
    
    if (result.validation.isValid) {
      report.summary.passedChecks++;
    } else {
      report.summary.failedChecks++;
      report.summary.errors.push(...result.validation.errors);
    }
  });

  return report;
}

/**
 * 控制台输出统计验证报告
 */
export function logStatsReport(report) {
  console.log('\n📊 统计数字验证报告');
  console.log('='.repeat(50));
  console.log(`检查时间: ${new Date(report.timestamp).toLocaleString()}`);
  console.log(`总检查项: ${report.summary.totalChecks}`);
  console.log(`通过检查: ${report.summary.passedChecks}`);
  console.log(`失败检查: ${report.summary.failedChecks}`);
  
  if (report.summary.failedChecks > 0) {
    console.log('\n❌ 发现的问题:');
    report.summary.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ 所有统计数字验证通过！');
  }
  
  console.log('='.repeat(50));
}

/**
 * 自动验证所有页面的统计数字
 */
export async function validateAllStats() {
  const results = {};
  
  try {
    // 这里可以添加实际的数据获取逻辑
    // 目前只是示例结构
    
    console.log('🔍 开始验证统计数字...');
    
    // 示例：验证MCP页面
    // const mcpData = await getMCPData();
    // results.mcp = validateMCPStats(mcpData.configuredList, mcpData.systemTools);
    
    // 示例：验证API页面
    // const apiData = await getAPIData();
    // results.api = validateAPIStats(apiData.configuredList, apiData.apiCategories);
    
    // 示例：验证ChatBox
    // const chatBoxData = await getChatBoxData();
    // results.chatBox = validateChatBoxStats(chatBoxData);
    
    // 示例：验证工具库
    // const toolLibraryData = await getToolLibraryData();
    // results.toolLibrary = validateToolLibraryStats(toolLibraryData.tools, toolLibraryData.categories);
    
    const report = generateStatsReport(results);
    logStatsReport(report);
    
    return report;
  } catch (error) {
    console.error('统计验证失败:', error);
    return null;
  }
}

// 在开发环境下提供全局访问
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.validateStats = validateAllStats;
  window.statsValidation = {
    validateMCPStats,
    validateAPIStats,
    validateChatBoxStats,
    validateToolLibraryStats,
    generateStatsReport,
    logStatsReport
  };
}
