/**
 * 工具分类管理组件
 * 提供工具分类的统计、筛选和管理功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TOOL_CATEGORIES } from '../constants/toolCategories';
import { getToolCategoryStats, recommendToolsByCategory } from '../utils/enhancedToolMatcher';
import { getAllTools } from '../utils/toolLibrary';
import './ToolCategoryManager.css';

const ToolCategoryManager = ({
  onToolSelect,
  showStatistics = true,
  showToolList = true,
  allowCategoryFilter = true,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, available, total
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  
  // 获取分类统计数据
  const categoryStats = useMemo(() => {
    return getToolCategoryStats();
  }, []);
  
  // 获取所有工具
  const allTools = useMemo(() => {
    return getAllTools();
  }, []);
  
  // 筛选和排序分类
  const filteredCategories = useMemo(() => {
    let categories = Object.entries(TOOL_CATEGORIES).map(([id, category]) => ({
      id,
      ...category,
      stats: categoryStats[id] || { total: 0, available: 0, unavailable: 0, tools: [] }
    }));
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      categories = categories.filter(category =>
        category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query) ||
        category.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }
    
    // 排序
    categories.sort((a, b) => {
      switch (sortBy) {
        case 'available':
          return b.stats.available - a.stats.available;
        case 'total':
          return b.stats.total - a.stats.total;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    return categories;
  }, [categoryStats, searchQuery, sortBy]);
  
  // 获取选中分类的工具
  const categoryTools = useMemo(() => {
    if (!selectedCategory) return [];
    
    return recommendToolsByCategory(selectedCategory, {
      maxResults: 50,
      includeUnavailable: true
    });
  }, [selectedCategory]);
  
  // 处理分类选择
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
  };
  
  // 处理工具选择
  const handleToolSelect = (tool) => {
    if (onToolSelect) {
      onToolSelect(tool);
    }
  };
  
  // 获取分类使用率颜色
  const getUsageColor = (available, total) => {
    if (total === 0) return '#6c757d';
    const ratio = available / total;
    if (ratio >= 0.8) return '#28a745';
    if (ratio >= 0.5) return '#ffc107';
    return '#dc3545';
  };
  
  return (
    <div className={`tool-category-manager ${className}`}>
      {/* 管理器标题 */}
      <div className="manager-header">
        <h3 className="manager-title">🗂️ 工具分类管理</h3>
        <div className="header-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索分类..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">按名称排序</option>
            <option value="available">按可用工具数排序</option>
            <option value="total">按总工具数排序</option>
          </select>
          
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="网格视图"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="列表视图"
            >
              ☰
            </button>
          </div>
        </div>
      </div>
      
      {/* 统计概览 */}
      {showStatistics && (
        <div className="statistics-overview">
          <div className="stat-card">
            <div className="stat-number">{Object.keys(TOOL_CATEGORIES).length}</div>
            <div className="stat-label">分类总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{allTools.length}</div>
            <div className="stat-label">工具总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{allTools.filter(t => t.available).length}</div>
            <div className="stat-label">可用工具</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {Object.values(categoryStats).filter(s => s.available > 0).length}
            </div>
            <div className="stat-label">活跃分类</div>
          </div>
        </div>
      )}
      
      {/* 分类列表 */}
      <div className={`categories-container ${viewMode}`}>
        {filteredCategories.map(category => (
          <div
            key={category.id}
            className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
            onClick={() => handleCategorySelect(category.id)}
          >
            <div className="category-header">
              <div className="category-icon-name">
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </div>
              <div className="category-stats">
                <span 
                  className="available-count"
                  style={{ color: getUsageColor(category.stats.available, category.stats.total) }}
                >
                  {category.stats.available}/{category.stats.total}
                </span>
              </div>
            </div>
            
            <div className="category-description">
              {category.description}
            </div>
            
            <div className="category-keywords">
              {category.keywords.slice(0, 3).map(keyword => (
                <span key={keyword} className="keyword-tag">
                  {keyword}
                </span>
              ))}
              {category.keywords.length > 3 && (
                <span className="keyword-more">
                  +{category.keywords.length - 3}
                </span>
              )}
            </div>
            
            <div className="category-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${category.stats.total > 0 ? (category.stats.available / category.stats.total) * 100 : 0}%`,
                    backgroundColor: getUsageColor(category.stats.available, category.stats.total)
                  }}
                />
              </div>
              <span className="progress-text">
                {category.stats.total > 0 
                  ? `${Math.round((category.stats.available / category.stats.total) * 100)}% 可用`
                  : '暂无工具'
                }
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* 选中分类的工具列表 */}
      {showToolList && selectedCategory && categoryTools.length > 0 && (
        <div className="category-tools-section">
          <div className="section-header">
            <h4 className="section-title">
              <span className="category-icon">
                {TOOL_CATEGORIES[selectedCategory]?.icon}
              </span>
              {TOOL_CATEGORIES[selectedCategory]?.name} 工具
              <span className="tools-count">({categoryTools.length}个)</span>
            </h4>
          </div>
          
          <div className="tools-grid">
            {categoryTools.map(tool => (
              <div key={tool.id} className="tool-card">
                <div className="tool-header">
                  <span className="tool-name">{tool.name}</span>
                  <span className={`tool-status ${tool.available ? 'available' : 'unavailable'}`}>
                    {tool.available ? '✅' : '❌'}
                  </span>
                </div>
                
                <div className="tool-description">
                  {tool.description || '暂无描述'}
                </div>
                
                {tool.capabilities && tool.capabilities.length > 0 && (
                  <div className="tool-capabilities">
                    {tool.capabilities.slice(0, 3).map(capability => (
                      <span key={capability} className="capability-tag">
                        {capability}
                      </span>
                    ))}
                    {tool.capabilities.length > 3 && (
                      <span className="capability-more">
                        +{tool.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="tool-actions">
                  <button
                    className="select-tool-btn"
                    onClick={() => handleToolSelect(tool)}
                    disabled={!tool.available}
                  >
                    {tool.available ? '选择工具' : '未配置'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 空状态 */}
      {filteredCategories.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">
            未找到匹配的分类，请尝试其他搜索词
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolCategoryManager;

// 导出相关工具函数供其他组件使用
export { getToolCategoryStats, recommendToolsByCategory };
