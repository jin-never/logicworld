import React, { useState, useEffect, useRef } from 'react';
import './ToolCategorySelector.css';

// 🎯 现代化工具选择器组件
const ToolCategorySelector = ({ 
  selectedTool, 
  onToolChange, 
  placeholder = "选择推荐工具",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [toolCategories, setToolCategories] = useState([]);
  const [allTools, setAllTools] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // 🔄 加载真实的工具库数据
  useEffect(() => {
    loadRealToolsData();
  }, []);

  // 🔄 监听外部点击关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setSelectedCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 📥 从真实工具库加载数据
  const loadRealToolsData = async () => {
    try {
      setLoading(true);
      
      // 加载工具分类定义
      const { TOOL_CATEGORIES, getCategoryOptions } = await import('../constants/toolCategories');
      const categoryOptions = getCategoryOptions();
      
      // 加载所有真实工具
      const { getAllTools } = await import('../utils/toolLibrary');
      const tools = await getAllTools(true);
      
      console.log('🔧 真实工具库数据:', { categories: categoryOptions, tools });
      
      // 统计每个分类的工具数量
      const categoriesWithCount = categoryOptions.map(category => {
        const categoryTools = tools.filter(tool => 
          tool.functionalCategory === category.value || 
          tool.category === category.label
        );
        
        return {
          id: category.value,
          name: category.label.replace(/^[🎯🤖📄💻🎨📊📁🌐📋🎬🗄️🚀🔒📚🏠⚙️]\s*/, ''), // 移除前缀图标
          icon: category.icon,
          color: category.color,
          description: category.description,
          toolCount: categoryTools.length,
          available: categoryTools.filter(t => t.enabled !== false).length,
          tools: categoryTools
        };
      }).filter(category => category.toolCount > 0); // 只显示有工具的分类
      
      setToolCategories(categoriesWithCount);
      setAllTools(tools);
      setFilteredTools(tools);
      
    } catch (error) {
      console.error('加载工具库失败:', error);
      
      // 使用模拟数据作为后备
      setToolCategories([
        {
          id: 'ai_assistant',
          name: 'AI助手',
          icon: '🤖',
          color: '#007bff',
          description: 'AI智能对话和内容生成',
          toolCount: 1,
          available: 1,
          tools: [{ id: 'deepseek_chat', name: 'DeepSeek聊天模型', description: 'AI聊天助手', enabled: true }]
        }
      ]);
      
    } finally {
      setLoading(false);
    }
  };

  // 🔍 处理搜索
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredTools(allTools);
      setSelectedCategory(null);
      return;
    }
    
    const filtered = allTools.filter(tool =>
      tool.name?.toLowerCase().includes(query.toLowerCase()) ||
      tool.description?.toLowerCase().includes(query.toLowerCase()) ||
      tool.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    
    setFilteredTools(filtered);
    setSelectedCategory(null);
  };

  // 🎯 处理分类选择
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setFilteredTools(category.tools);
    setSearchQuery('');
  };

  // 🔧 处理工具选择
  const handleToolSelect = (tool) => {
    onToolChange(tool);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  // 🎨 渲染主选择器
  const renderSelector = () => (
    <div 
      className={`modern-selector ${isOpen ? 'open' : ''} ${className}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="selector-content">
        <div className="selected-display">
          {selectedTool ? (
            <div className="selected-tool">
              <span className="tool-icon">{selectedTool.icon || '🔧'}</span>
              <span className="tool-name">{selectedTool.name}</span>
              <span className="tool-source">{getToolSource(selectedTool)}</span>
            </div>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
        </div>
        <div className="selector-arrow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 12L3 7h10l-5 5z"/>
          </svg>
        </div>
      </div>
    </div>
  );

  // 🎨 渲染下拉内容
  const renderDropdown = () => (
    <div className="modern-dropdown">
      {/* 搜索框 */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16">
            <path d="M10.5 6.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM13.5 13.5l-3-3"/>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索工具..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
            autoFocus
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => handleSearch('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 分类网格 */}
      {!searchQuery && !selectedCategory && (
        <div className="categories-section">
          <div className="section-header">
            <h4>🔧 工具分类</h4>
            <span className="total-count">{toolCategories.length}个分类</span>
          </div>
          <div className="categories-grid">
            {toolCategories.map((category) => (
              <div
                key={category.id}
                className="category-card"
                onClick={() => handleCategoryClick(category)}
                style={{ '--category-color': category.color }}
              >
                <div className="category-icon">{category.icon}</div>
                <div className="category-info">
                  <div className="category-name">{category.name}</div>
                  <div className="category-count">{category.available}/{category.toolCount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 工具列表 */}
      <div className="tools-section">
        {selectedCategory && (
          <div className="section-header">
            <button 
              className="back-button"
              onClick={() => {
                setSelectedCategory(null);
                setFilteredTools(allTools);
              }}
            >
              ← 返回分类
            </button>
            <h4>{selectedCategory.icon} {selectedCategory.name}</h4>
            <span className="total-count">{filteredTools.length}个工具</span>
          </div>
        )}
        
        {searchQuery && (
          <div className="section-header">
            <h4>🔍 搜索结果</h4>
            <span className="total-count">找到{filteredTools.length}个工具</span>
          </div>
        )}

        <div className="tools-list">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>正在加载工具...</span>
            </div>
          )}
          
          {!loading && filteredTools.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-message">
                {searchQuery ? '未找到相关工具' : '该分类暂无工具'}
              </div>
            </div>
          )}
          
          {!loading && filteredTools.map((tool) => (
            <div
              key={tool.id}
              className={`tool-item ${!tool.enabled ? 'disabled' : ''}`}
              onClick={() => tool.enabled && handleToolSelect(tool)}
            >
              <div className="tool-icon">{getToolIcon(tool)}</div>
              <div className="tool-content">
                <div className="tool-header">
                  <span className="tool-name">{tool.name}</span>
                  <div className="tool-badges">
                    <span className="tool-source">{getToolSource(tool)}</span>
                    {!tool.enabled && <span className="disabled-badge">不可用</span>}
                  </div>
                </div>
                <div className="tool-description">{tool.description}</div>
                {tool.tags && tool.tags.length > 0 && (
                  <div className="tool-tags">
                    {tool.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="tool-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 🔧 获取工具图标
  const getToolIcon = (tool) => {
    if (tool.icon) return tool.icon;
    
    // 根据工具类型返回默认图标
    const iconMap = {
      'mcp': '🔧',
      'api': '🌐', 
      'ai': '🤖',
      'system': '⚙️',
      'user': '👤'
    };
    
    return iconMap[tool.source] || iconMap[tool.tool_type] || '🛠️';
  };

  // 🏷️ 获取工具来源标签
  const getToolSource = (tool) => {
    const sourceMap = {
      'mcp': 'MCP',
      'api': 'API',
      'ai': 'AI',
      'system': '系统',
      'user': '用户'
    };
    
    return sourceMap[tool.source] || sourceMap[tool.tool_type] || '系统';
  };

  return (
    <div className="tool-category-selector" ref={dropdownRef}>
      {renderSelector()}
      {isOpen && renderDropdown()}
    </div>
  );
};

export default ToolCategorySelector; 