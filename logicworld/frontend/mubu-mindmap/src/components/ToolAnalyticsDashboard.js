/**
 * 工具分析仪表板组件
 * 展示工具库的统计分析、趋势图表和健康度评估
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  getOverallStats,
  getCategoryDistribution,
  getAvailabilityAnalysis,
  getConfigurationRecommendations,
  getToolHealthScore,
  getToolHeatmapData,
  generateStatsReport
} from '../services/toolAnalyticsService';
import './ToolAnalyticsDashboard.css';

const ToolAnalyticsDashboard = ({
  refreshInterval = 30000, // 30秒刷新间隔
  showExportButton = true,
  className = ''
}) => {
  const [activeMetric, setActiveMetric] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // 获取统计数据
  const overallStats = useMemo(() => getOverallStats(), []);
  const categoryDistribution = useMemo(() => getCategoryDistribution(), []);
  const availabilityAnalysis = useMemo(() => getAvailabilityAnalysis(), []);
  const recommendations = useMemo(() => getConfigurationRecommendations(), []);
  const healthScore = useMemo(() => getToolHealthScore(), []);
  const heatmapData = useMemo(() => getToolHeatmapData(), []);

  // 自动刷新数据
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // 导出报告
  const handleExportReport = () => {
    setIsLoading(true);
    try {
      const report = generateStatsReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tool-analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出报告失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取健康度颜色
  const getHealthColor = (score) => {
    if (score >= 90) return '#28a745';
    if (score >= 80) return '#17a2b8';
    if (score >= 70) return '#ffc107';
    if (score >= 60) return '#fd7e14';
    return '#dc3545';
  };

  // 获取优先级颜色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className={`tool-analytics-dashboard ${className}`}>
      {/* 仪表板标题 */}
      <div className="dashboard-header">
        <div className="header-info">
          <h2 className="dashboard-title">📊 工具库分析仪表板</h2>
          <div className="last-updated">
            最后更新: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        
        {showExportButton && (
          <button
            className="export-btn"
            onClick={handleExportReport}
            disabled={isLoading}
          >
            {isLoading ? '导出中...' : '📄 导出报告'}
          </button>
        )}
      </div>

      {/* 核心指标卡片 */}
      <div className="metrics-grid">
        {/* 总体统计 */}
        <div className="metric-card overview">
          <div className="metric-header">
            <h3 className="metric-title">📈 总体统计</h3>
          </div>
          <div className="metric-content">
            <div className="stat-row">
              <span className="stat-label">工具总数</span>
              <span className="stat-value">{overallStats.totalTools}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">可用工具</span>
              <span className="stat-value available">{overallStats.availableTools}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">未配置</span>
              <span className="stat-value unavailable">{overallStats.unavailableTools}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">可用率</span>
              <span className="stat-value rate">
                {overallStats.availabilityRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 健康度评分 */}
        <div className="metric-card health">
          <div className="metric-header">
            <h3 className="metric-title">💚 健康度评分</h3>
          </div>
          <div className="metric-content">
            <div className="health-score">
              <div 
                className="score-circle"
                style={{ 
                  background: `conic-gradient(${healthScore.color} ${healthScore.score * 3.6}deg, #e9ecef 0deg)`
                }}
              >
                <div className="score-inner">
                  <span className="score-number">{healthScore.score}</span>
                  <span className="score-grade">{healthScore.grade}</span>
                </div>
              </div>
            </div>
            <div className="health-description">
              {healthScore.description}
            </div>
            <div className="health-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">可用性</span>
                <span className="breakdown-value">{healthScore.breakdown.availability}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">分类激活</span>
                <span className="breakdown-value">{healthScore.breakdown.categoryActivation}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">分布均衡</span>
                <span className="breakdown-value">{healthScore.breakdown.distribution}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 分类分析 */}
        <div className="metric-card categories">
          <div className="metric-header">
            <h3 className="metric-title">🗂️ 分类分析</h3>
          </div>
          <div className="metric-content">
            <div className="availability-levels">
              <div className="level-item high">
                <div className="level-info">
                  <span className="level-label">高可用 (≥80%)</span>
                  <span className="level-count">{availabilityAnalysis.high.count}</span>
                </div>
                <div className="level-bar">
                  <div 
                    className="level-fill"
                    style={{ width: `${availabilityAnalysis.high.percentage}%` }}
                  />
                </div>
              </div>
              
              <div className="level-item medium">
                <div className="level-info">
                  <span className="level-label">中等 (50-80%)</span>
                  <span className="level-count">{availabilityAnalysis.medium.count}</span>
                </div>
                <div className="level-bar">
                  <div 
                    className="level-fill"
                    style={{ width: `${availabilityAnalysis.medium.percentage}%` }}
                  />
                </div>
              </div>
              
              <div className="level-item low">
                <div className="level-info">
                  <span className="level-label">低可用 (<50%)</span>
                  <span className="level-count">{availabilityAnalysis.low.count}</span>
                </div>
                <div className="level-bar">
                  <div 
                    className="level-fill"
                    style={{ width: `${availabilityAnalysis.low.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 详细分析区域 */}
      <div className="analysis-section">
        {/* 分析标签 */}
        <div className="analysis-tabs">
          <button
            className={`tab-btn ${activeMetric === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveMetric('overview')}
          >
            📊 概览
          </button>
          <button
            className={`tab-btn ${activeMetric === 'distribution' ? 'active' : ''}`}
            onClick={() => setActiveMetric('distribution')}
          >
            📈 分布
          </button>
          <button
            className={`tab-btn ${activeMetric === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveMetric('heatmap')}
          >
            🔥 热力图
          </button>
          <button
            className={`tab-btn ${activeMetric === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveMetric('recommendations')}
          >
            💡 建议
          </button>
        </div>

        {/* 分析内容 */}
        <div className="analysis-content">
          {/* 概览 */}
          {activeMetric === 'overview' && (
            <div className="overview-analysis">
              <div className="top-categories">
                <h4>🏆 工具数量排行</h4>
                <div className="category-ranking">
                  {categoryDistribution.slice(0, 8).map((category, index) => (
                    <div key={category.id} className="ranking-item">
                      <span className="rank">#{index + 1}</span>
                      <span className="category-icon">{category.icon}</span>
                      <span className="category-name">{category.name}</span>
                      <span className="category-stats">
                        {category.available}/{category.total}
                      </span>
                      <div className="category-bar">
                        <div 
                          className="bar-fill"
                          style={{ 
                            width: `${category.availabilityRate}%`,
                            backgroundColor: category.availabilityRate >= 80 ? '#28a745' : 
                                           category.availabilityRate >= 50 ? '#ffc107' : '#dc3545'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 分布分析 */}
          {activeMetric === 'distribution' && (
            <div className="distribution-analysis">
              <div className="distribution-chart">
                <h4>📊 分类工具分布</h4>
                <div className="chart-container">
                  {categoryDistribution.map(category => (
                    <div key={category.id} className="chart-bar">
                      <div className="bar-info">
                        <span className="bar-icon">{category.icon}</span>
                        <span className="bar-label">{category.name}</span>
                        <span className="bar-value">{category.total}</span>
                      </div>
                      <div className="bar-visual">
                        <div 
                          className="bar-available"
                          style={{ 
                            width: `${category.total > 0 ? (category.available / Math.max(...categoryDistribution.map(c => c.total)) * 100) : 0}%`,
                            backgroundColor: category.color
                          }}
                        />
                        <div 
                          className="bar-unavailable"
                          style={{ 
                            width: `${category.total > 0 ? (category.unavailable / Math.max(...categoryDistribution.map(c => c.total)) * 100) : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 热力图 */}
          {activeMetric === 'heatmap' && (
            <div className="heatmap-analysis">
              <h4>🔥 工具可用性热力图</h4>
              <div className="heatmap-grid">
                {heatmapData.map(item => (
                  <div 
                    key={item.id}
                    className="heatmap-cell"
                    style={{
                      backgroundColor: `${item.color}${Math.round(item.intensity * 255).toString(16).padStart(2, '0')}`,
                      border: `2px solid ${item.color}`
                    }}
                    title={`${item.name}: ${item.value}/${item.total} (${(item.intensity * 100).toFixed(1)}%)`}
                  >
                    <div className="cell-icon">{item.icon}</div>
                    <div className="cell-value">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="heatmap-legend">
                <span className="legend-label">强度:</span>
                <div className="legend-gradient">
                  <span className="legend-min">0%</span>
                  <div className="gradient-bar" />
                  <span className="legend-max">100%</span>
                </div>
              </div>
            </div>
          )}

          {/* 配置建议 */}
          {activeMetric === 'recommendations' && (
            <div className="recommendations-analysis">
              <h4>💡 配置建议</h4>
              <div className="recommendations-list">
                {recommendations.length > 0 ? (
                  recommendations.slice(0, 10).map((rec, index) => (
                    <div key={index} className="recommendation-item">
                      <div className="rec-header">
                        <div className="rec-priority">
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(rec.priority) }}
                          >
                            {rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                        <div className="rec-info">
                          <h5 className="rec-title">{rec.title}</h5>
                          <p className="rec-description">{rec.description}</p>
                        </div>
                      </div>
                      <div className="rec-actions">
                        <button className="rec-action-btn">
                          立即配置
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-recommendations">
                    <div className="no-rec-icon">✅</div>
                    <div className="no-rec-text">
                      <h5>配置状况良好</h5>
                      <p>当前没有紧急的配置建议，工具库状态良好</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolAnalyticsDashboard;

// 导出相关工具函数
export {
  getOverallStats,
  getCategoryDistribution,
  getToolHealthScore
} from '../services/toolAnalyticsService';
