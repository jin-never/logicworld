/**
 * 工具分类管理页面
 * 提供完整的工具分类管理功能，包括统计、筛选、查看和管理
 */

import React, { useState, useEffect } from 'react';
import ToolCategoryManager from './components/ToolCategoryManager';
import SmartToolRecommendation from './components/SmartToolRecommendation';
import { TOOL_CATEGORIES } from './constants/toolCategories';
import { getToolCategoryStats } from './utils/enhancedToolMatcher';
import './ToolCategoryManagementPage.css';

const ToolCategoryManagementPage = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, categories, recommendations, statistics
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [showToolDetails, setShowToolDetails] = useState(false);

  // 获取分类统计数据
  const [categoryStats, setCategoryStats] = useState({});
  
  useEffect(() => {
    const stats = getToolCategoryStats();
    setCategoryStats(stats);
  }, []);

  // 处理工具选择
  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    setShowToolDetails(true);
  };

  // 关闭工具详情
  const closeToolDetails = () => {
    setShowToolDetails(false);
    setSelectedTool(null);
  };

  // 计算总体统计
  const totalStats = {
    totalCategories: Object.keys(TOOL_CATEGORIES).length,
    totalTools: Object.values(categoryStats).reduce((sum, stat) => sum + stat.total, 0),
    availableTools: Object.values(categoryStats).reduce((sum, stat) => sum + stat.available, 0),
    activeCategories: Object.values(categoryStats).filter(stat => stat.available > 0).length
  };

  const availabilityRate = totalStats.totalTools > 0 
    ? (totalStats.availableTools / totalStats.totalTools * 100).toFixed(1)
    : 0;

  return (
    <div className="tool-category-management-page">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">🗂️ 工具分类管理中心</h1>
          <p className="page-description">
            管理和查看所有工具分类，获取智能推荐，优化工具配置
          </p>
        </div>
        
        {/* 快速统计 */}
        <div className="quick-stats">
          <div className="stat-item">
            <div className="stat-value">{totalStats.totalCategories}</div>
            <div className="stat-label">分类总数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{totalStats.totalTools}</div>
            <div className="stat-label">工具总数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{totalStats.availableTools}</div>
            <div className="stat-label">可用工具</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{availabilityRate}%</div>
            <div className="stat-label">可用率</div>
          </div>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="page-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 概览
        </button>
        <button
          className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          🗂️ 分类管理
        </button>
        <button
          className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          🧠 智能推荐
        </button>
        <button
          className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          📈 统计分析
        </button>
      </div>

      {/* 页面内容 */}
      <div className="page-content">
        {/* 概览标签 */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="overview-grid">
              {/* 分类概览卡片 */}
              <div className="overview-card">
                <div className="card-header">
                  <h3 className="card-title">📋 分类概览</h3>
                  <span className="card-badge">{totalStats.activeCategories}/{totalStats.totalCategories} 活跃</span>
                </div>
                <div className="card-content">
                  <div className="category-preview">
                    {Object.entries(categoryStats)
                      .sort(([,a], [,b]) => b.available - a.available)
                      .slice(0, 5)
                      .map(([categoryId, stats]) => {
                        const category = TOOL_CATEGORIES[categoryId];
                        if (!category) return null;
                        
                        return (
                          <div key={categoryId} className="category-preview-item">
                            <span className="category-icon">{category.icon}</span>
                            <span className="category-name">{category.name}</span>
                            <span className="category-count">
                              {stats.available}/{stats.total}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <button 
                    className="view-all-btn"
                    onClick={() => setActiveTab('categories')}
                  >
                    查看全部分类 →
                  </button>
                </div>
              </div>

              {/* 工具状态卡片 */}
              <div className="overview-card">
                <div className="card-header">
                  <h3 className="card-title">🔧 工具状态</h3>
                  <span className="card-badge">{availabilityRate}% 可用</span>
                </div>
                <div className="card-content">
                  <div className="status-chart">
                    <div className="chart-item">
                      <div className="chart-bar">
                        <div 
                          className="chart-fill available"
                          style={{ width: `${availabilityRate}%` }}
                        />
                      </div>
                      <div className="chart-labels">
                        <span className="label available">
                          可用: {totalStats.availableTools}
                        </span>
                        <span className="label unavailable">
                          未配置: {totalStats.totalTools - totalStats.availableTools}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="status-actions">
                    <button className="action-btn primary">
                      配置工具
                    </button>
                    <button 
                      className="action-btn secondary"
                      onClick={() => setActiveTab('statistics')}
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </div>

              {/* 快速操作卡片 */}
              <div className="overview-card">
                <div className="card-header">
                  <h3 className="card-title">⚡ 快速操作</h3>
                </div>
                <div className="card-content">
                  <div className="quick-actions">
                    <button 
                      className="quick-action-btn"
                      onClick={() => setActiveTab('recommendations')}
                    >
                      <span className="action-icon">🧠</span>
                      <span className="action-text">智能推荐</span>
                    </button>

                    <button className="quick-action-btn">
                      <span className="action-icon">⚙️</span>
                      <span className="action-text">批量配置</span>
                    </button>
                    <button className="quick-action-btn">
                      <span className="action-icon">📊</span>
                      <span className="action-text">导出报告</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 分类管理标签 */}
        {activeTab === 'categories' && (
          <div className="categories-content">
            <ToolCategoryManager
              onToolSelect={handleToolSelect}
              showStatistics={true}
              showToolList={true}
              allowCategoryFilter={true}
              className="full-category-manager"
            />
          </div>
        )}

        {/* 智能推荐标签 */}
        {activeTab === 'recommendations' && (
          <div className="recommendations-content">
            <div className="recommendations-header">
              <h3>🧠 智能工具推荐</h3>
              <p>输入您的需求描述，获取个性化的工具推荐</p>
            </div>
            
            <div className="recommendation-input">
              <input
                type="text"
                placeholder="描述您需要完成的任务或功能..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="recommendation-search"
              />
            </div>

            {searchQuery.trim() && (
              <SmartToolRecommendation
                userInput={searchQuery}
                onToolSelect={handleToolSelect}
                maxRecommendations={8}
                showCategoryFilter={true}
                showConfidence={true}
                className="page-recommendations"
              />
            )}

            {!searchQuery.trim() && (
              <div className="recommendation-placeholder">
                <div className="placeholder-icon">✨</div>
                <div className="placeholder-text">
                  <h4>开始智能推荐</h4>
                  <p>在上方输入框中描述您的需求，系统将为您推荐最合适的工具</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 统计分析标签 */}
        {activeTab === 'statistics' && (
          <div className="statistics-content">
            <div className="statistics-header">
              <h3>📈 统计分析</h3>
              <p>详细的工具分类使用情况和配置状态分析</p>
            </div>

            <div className="statistics-grid">
              {Object.entries(categoryStats).map(([categoryId, stats]) => {
                const category = TOOL_CATEGORIES[categoryId];
                if (!category) return null;

                const usageRate = stats.total > 0 ? (stats.available / stats.total * 100).toFixed(1) : 0;
                
                return (
                  <div key={categoryId} className="stat-category-card">
                    <div className="stat-card-header">
                      <span className="stat-category-icon">{category.icon}</span>
                      <div className="stat-category-info">
                        <h4 className="stat-category-name">{category.name}</h4>
                        <p className="stat-category-desc">{category.description}</p>
                      </div>
                    </div>
                    
                    <div className="stat-card-metrics">
                      <div className="metric">
                        <span className="metric-value">{stats.total}</span>
                        <span className="metric-label">总工具数</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{stats.available}</span>
                        <span className="metric-label">可用工具</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{usageRate}%</span>
                        <span className="metric-label">配置率</span>
                      </div>
                    </div>
                    
                    <div className="stat-card-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${usageRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 工具详情模态框 */}
      {showToolDetails && selectedTool && (
        <div className="tool-details-modal">
          <div className="modal-overlay" onClick={closeToolDetails} />
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{selectedTool.name}</h3>
              <button className="modal-close" onClick={closeToolDetails}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="tool-info">
                <div className="info-section">
                  <h4>工具描述</h4>
                  <p>{selectedTool.description || '暂无描述'}</p>
                </div>
                
                {selectedTool.capabilities && selectedTool.capabilities.length > 0 && (
                  <div className="info-section">
                    <h4>支持功能</h4>
                    <div className="capabilities-list">
                      {selectedTool.capabilities.map((capability, index) => (
                        <span key={index} className="capability-tag">
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="info-section">
                  <h4>工具状态</h4>
                  <span className={`status-badge ${selectedTool.available ? 'available' : 'unavailable'}`}>
                    {selectedTool.available ? '✅ 可用' : '❌ 未配置'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn secondary" onClick={closeToolDetails}>
                关闭
              </button>
              {!selectedTool.available && (
                <button className="btn primary">
                  配置工具
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolCategoryManagementPage;

// 导出页面组件供路由使用
export { ToolCategoryManagementPage };
