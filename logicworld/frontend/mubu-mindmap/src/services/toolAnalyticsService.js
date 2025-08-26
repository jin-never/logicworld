/**
 * 工具库统计分析服务
 * 提供工具使用情况、分类分析、趋势统计等功能
 */

import { TOOL_CATEGORIES } from '../constants/toolCategories';
import { getAllTools } from '../utils/toolLibrary';
import { getToolCategoryStats } from '../utils/enhancedToolMatcher';

/**
 * 获取工具库总体统计
 */
export function getOverallStats() {
  const allTools = getAllTools();
  const categoryStats = getToolCategoryStats();
  
  const totalTools = allTools.length;
  const availableTools = allTools.filter(tool => tool.available).length;
  const unavailableTools = totalTools - availableTools;
  const totalCategories = Object.keys(TOOL_CATEGORIES).length;
  const activeCategories = Object.values(categoryStats).filter(stat => stat.available > 0).length;
  
  return {
    totalTools,
    availableTools,
    unavailableTools,
    totalCategories,
    activeCategories,
    availabilityRate: totalTools > 0 ? (availableTools / totalTools * 100) : 0,
    categoryActivationRate: totalCategories > 0 ? (activeCategories / totalCategories * 100) : 0
  };
}

/**
 * 获取分类分布统计
 */
export function getCategoryDistribution() {
  const categoryStats = getToolCategoryStats();
  
  return Object.entries(categoryStats).map(([categoryId, stats]) => {
    const category = TOOL_CATEGORIES[categoryId];
    return {
      id: categoryId,
      name: category?.name || categoryId,
      icon: category?.icon || '🔧',
      color: category?.color || '#6c757d',
      total: stats.total,
      available: stats.available,
      unavailable: stats.unavailable,
      availabilityRate: stats.total > 0 ? (stats.available / stats.total * 100) : 0,
      tools: stats.tools
    };
  }).sort((a, b) => b.total - a.total);
}

/**
 * 获取工具可用性分析
 */
export function getAvailabilityAnalysis() {
  const distribution = getCategoryDistribution();
  
  const highAvailability = distribution.filter(cat => cat.availabilityRate >= 80);
  const mediumAvailability = distribution.filter(cat => cat.availabilityRate >= 50 && cat.availabilityRate < 80);
  const lowAvailability = distribution.filter(cat => cat.availabilityRate < 50);
  
  return {
    high: {
      categories: highAvailability,
      count: highAvailability.length,
      percentage: distribution.length > 0 ? (highAvailability.length / distribution.length * 100) : 0
    },
    medium: {
      categories: mediumAvailability,
      count: mediumAvailability.length,
      percentage: distribution.length > 0 ? (mediumAvailability.length / distribution.length * 100) : 0
    },
    low: {
      categories: lowAvailability,
      count: lowAvailability.length,
      percentage: distribution.length > 0 ? (lowAvailability.length / distribution.length * 100) : 0
    }
  };
}

/**
 * 获取工具配置建议
 */
export function getConfigurationRecommendations() {
  const distribution = getCategoryDistribution();
  const recommendations = [];
  
  // 找出需要配置的分类
  const needConfiguration = distribution.filter(cat => cat.availabilityRate < 50 && cat.total > 0);
  
  needConfiguration.forEach(category => {
    recommendations.push({
      type: 'configuration',
      priority: category.total > 2 ? 'high' : 'medium',
      category: category,
      title: `配置${category.name}工具`,
      description: `该分类有${category.total}个工具，但只有${category.available}个可用，建议配置剩余工具以提高可用性`,
      action: 'configure_category',
      actionData: { categoryId: category.id }
    });
  });
  
  // 找出完全没有工具的分类
  const emptyCategories = Object.entries(TOOL_CATEGORIES)
    .filter(([categoryId]) => !distribution.find(cat => cat.id === categoryId))
    .map(([categoryId, category]) => ({ id: categoryId, ...category }));
  
  emptyCategories.forEach(category => {
    recommendations.push({
      type: 'addition',
      priority: 'low',
      category: category,
      title: `添加${category.name}工具`,
      description: `该分类目前没有任何工具，建议添加相关工具以完善工具库`,
      action: 'add_tools',
      actionData: { categoryId: category.id }
    });
  });
  
  // 按优先级排序
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  
  return recommendations;
}

/**
 * 获取工具使用趋势（模拟数据）
 */
export function getUsageTrends() {
  const distribution = getCategoryDistribution();
  
  // 生成模拟的7天使用数据
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const trends = {};
  
  distribution.forEach(category => {
    if (category.available > 0) {
      trends[category.id] = {
        name: category.name,
        icon: category.icon,
        color: category.color,
        data: days.map(() => Math.floor(Math.random() * category.available * 10))
      };
    }
  });
  
  return {
    days,
    categories: trends
  };
}

/**
 * 获取工具健康度评分
 */
export function getToolHealthScore() {
  const overallStats = getOverallStats();
  const availabilityAnalysis = getAvailabilityAnalysis();
  
  // 计算各项指标得分（满分100）
  const availabilityScore = overallStats.availabilityRate;
  const categoryActivationScore = overallStats.categoryActivationRate;
  const distributionScore = availabilityAnalysis.high.percentage * 0.8 + 
                           availabilityAnalysis.medium.percentage * 0.5 + 
                           availabilityAnalysis.low.percentage * 0.2;
  
  // 综合得分
  const totalScore = (availabilityScore * 0.4 + categoryActivationScore * 0.3 + distributionScore * 0.3);
  
  let grade = 'F';
  let color = '#dc3545';
  let description = '工具库配置严重不足，需要大量改进';
  
  if (totalScore >= 90) {
    grade = 'A+';
    color = '#28a745';
    description = '工具库配置优秀，各项指标表现出色';
  } else if (totalScore >= 80) {
    grade = 'A';
    color = '#28a745';
    description = '工具库配置良好，大部分工具可用';
  } else if (totalScore >= 70) {
    grade = 'B';
    color = '#17a2b8';
    description = '工具库配置中等，还有改进空间';
  } else if (totalScore >= 60) {
    grade = 'C';
    color = '#ffc107';
    description = '工具库配置一般，建议增加工具配置';
  } else if (totalScore >= 50) {
    grade = 'D';
    color = '#fd7e14';
    description = '工具库配置较差，需要重点改进';
  }
  
  return {
    score: Math.round(totalScore),
    grade,
    color,
    description,
    breakdown: {
      availability: Math.round(availabilityScore),
      categoryActivation: Math.round(categoryActivationScore),
      distribution: Math.round(distributionScore)
    }
  };
}

/**
 * 获取工具使用热力图数据
 */
export function getToolHeatmapData() {
  const distribution = getCategoryDistribution();
  
  return distribution.map(category => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    value: category.available,
    total: category.total,
    intensity: category.total > 0 ? (category.available / category.total) : 0,
    color: category.color
  }));
}

/**
 * 导出统计报告
 */
export function generateStatsReport() {
  const overallStats = getOverallStats();
  const categoryDistribution = getCategoryDistribution();
  const availabilityAnalysis = getAvailabilityAnalysis();
  const recommendations = getConfigurationRecommendations();
  const healthScore = getToolHealthScore();
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      title: '工具库统计分析报告',
      period: '当前状态',
      overallStats,
      healthScore
    },
    details: {
      categoryDistribution,
      availabilityAnalysis,
      recommendations: recommendations.slice(0, 10) // 只包含前10个建议
    },
    insights: generateInsights(overallStats, availabilityAnalysis, healthScore)
  };
  
  return report;
}

/**
 * 生成分析洞察
 */
function generateInsights(overallStats, availabilityAnalysis, healthScore) {
  const insights = [];
  
  // 总体状况洞察
  if (overallStats.availabilityRate >= 80) {
    insights.push({
      type: 'positive',
      title: '工具配置状况良好',
      description: `当前有${overallStats.availabilityRate.toFixed(1)}%的工具可用，配置状况良好`
    });
  } else if (overallStats.availabilityRate >= 50) {
    insights.push({
      type: 'warning',
      title: '工具配置有待改进',
      description: `当前只有${overallStats.availabilityRate.toFixed(1)}%的工具可用，建议增加工具配置`
    });
  } else {
    insights.push({
      type: 'critical',
      title: '工具配置严重不足',
      description: `当前只有${overallStats.availabilityRate.toFixed(1)}%的工具可用，急需改进配置`
    });
  }
  
  // 分类激活洞察
  if (availabilityAnalysis.high.count > 0) {
    insights.push({
      type: 'positive',
      title: '高可用分类表现优秀',
      description: `有${availabilityAnalysis.high.count}个分类的工具可用率超过80%`
    });
  }
  
  if (availabilityAnalysis.low.count > 0) {
    insights.push({
      type: 'warning',
      title: '部分分类需要关注',
      description: `有${availabilityAnalysis.low.count}个分类的工具可用率低于50%，需要重点配置`
    });
  }
  
  // 健康度洞察
  if (healthScore.score >= 80) {
    insights.push({
      type: 'positive',
      title: '工具库健康度优秀',
      description: `综合健康度评分${healthScore.score}分，等级${healthScore.grade}`
    });
  } else if (healthScore.score >= 60) {
    insights.push({
      type: 'info',
      title: '工具库健康度中等',
      description: `综合健康度评分${healthScore.score}分，等级${healthScore.grade}，还有提升空间`
    });
  } else {
    insights.push({
      type: 'critical',
      title: '工具库健康度需要改进',
      description: `综合健康度评分${healthScore.score}分，等级${healthScore.grade}，建议优先改进`
    });
  }
  
  return insights;
}

/**
 * 获取实时统计数据（用于仪表板）
 */
export function getRealTimeStats() {
  return {
    timestamp: Date.now(),
    ...getOverallStats(),
    healthScore: getToolHealthScore(),
    topCategories: getCategoryDistribution().slice(0, 5),
    recentRecommendations: getConfigurationRecommendations().slice(0, 3)
  };
}
