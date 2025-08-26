import React, { useState, useEffect } from 'react';
import './ToolPanel.css';

const ToolPanel = ({ isOpen, onToggle, onToolSelect, selectedNodeId }) => {
  const [tools, setTools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 不再提供任何假工具数据
  useEffect(() => {
    setTools([]);
  }, []);

  const categories = ['all']; // 没有工具，只保留"全部"分类

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToolClick = (tool) => {
    if (onToolSelect) {
      onToolSelect(tool);
    }
  };

  const handleDragStart = (e, tool) => {
    e.dataTransfer.setData('application/json', JSON.stringify(tool));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case '系统内置': return '⚙️';
      case '用户配置': return '👤';
      case '托管平台': return '☁️';
      default: return '🔧';
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case '系统内置': return '#4caf50';
      case '用户配置': return '#2196f3';
      case '托管平台': return '#ff9800';
      default: return '#666';
    }
  };

  return (
    <div className={`tool-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="tool-panel-header">
        <h3>工具库</h3>
        <button className="toggle-btn" onClick={onToggle}>
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      <div className="tool-panel-content">
          {/* 搜索框 */}
          <div className="search-section">
            <input
              type="text"
              placeholder="搜索工具..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* 分类筛选 */}
          <div className="category-section">
            <div className="category-tabs">
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? '全部' : category}
                </button>
              ))}
            </div>
          </div>

          {/* 工具列表 */}
          <div className="tools-list">
            {filteredTools.map(tool => (
              <div
                key={tool.id}
                className="tool-item"
                onClick={() => handleToolClick(tool)}
                draggable
                onDragStart={(e) => handleDragStart(e, tool)}
                title={`${tool.description}\n来源: ${tool.source}`}
              >
                <div className="tool-header">
                  <span className="tool-name">{tool.name}</span>
                  <span 
                    className="tool-source"
                    style={{ color: getSourceColor(tool.source) }}
                  >
                    {getSourceIcon(tool.source)} {tool.source}
                  </span>
                </div>
                <div className="tool-description">{tool.description}</div>
                <div className="tool-category">{tool.category}</div>
              </div>
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="no-tools">
              未找到匹配的工具
            </div>
          )}
        </div>
    </div>
  );
};

export default ToolPanel;
