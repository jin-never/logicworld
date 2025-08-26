import React, { useState, useEffect } from 'react';
import './NodeToolbar.css';

const NodeToolbar = ({ nodeTypesConfig, onAddNode, isVisible, onToggle }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNodes, setFilteredNodes] = useState([]);

  useEffect(() => {
    if (!nodeTypesConfig?.nodeTypes) return;

    let nodes = Object.entries(nodeTypesConfig.nodeTypes);

    // 按分类过滤
    if (selectedCategory !== 'all') {
      const category = nodeTypesConfig.categories?.find(cat => cat.name === selectedCategory);
      if (category) {
        nodes = nodes.filter(([nodeType, config]) => config.category === selectedCategory);
      }
    }

    // 按搜索词过滤
    if (searchTerm) {
      nodes = nodes.filter(([nodeType, config]) => 
        config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nodeType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNodes(nodes);
  }, [nodeTypesConfig, selectedCategory, searchTerm]);

  const handleAddNode = (nodeType, config) => {
    const newNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'enhanced',
      position: { x: 100, y: 100 },
      data: {
        label: config.name,
        nodeType: nodeType,
        description: config.description,
        params: {},
        inputs: config.inputs || [],
        outputs: config.outputs || [],
        category: config.category,
        icon: config.icon,
        // 为材料节点添加初始数据结构
        ...(nodeType === 'material-node' && {
          folderFiles: [],
          selectedFolder: null
        })
      }
    };

    // 设置默认参数值
    if (config.parameters) {
      Object.entries(config.parameters).forEach(([paramName, paramConfig]) => {
        if (paramConfig.default !== undefined) {
          newNode.data.params[paramName] = paramConfig.default;
        }
      });
    }

    onAddNode(newNode);
  };

  if (!isVisible) {
    return (
      <div className="node-toolbar collapsed">
        <button className="toolbar-toggle" onClick={onToggle}>
          <span className="toggle-icon">▶</span>
          <span className="toggle-text">节点库</span>
        </button>
      </div>
    );
  }

  return (
    <div className="node-toolbar expanded">
      <div className="toolbar-header">
        <h3>节点库</h3>
        <button className="toolbar-toggle" onClick={onToggle}>
          <span className="toggle-icon">◀</span>
        </button>
      </div>

      <div className="toolbar-content">
        {/* 搜索框 */}
        <div className="search-section">
          <input
            type="text"
            placeholder="搜索节点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* 分类选择 */}
        <div className="category-section">
          <div className="category-tabs">
            <button
              className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              全部
            </button>
            {nodeTypesConfig?.categories?.map(category => (
              <button
                key={category.name}
                className={`category-tab ${selectedCategory === category.name ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.name)}
                title={category.description}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 节点列表 */}
        <div className="nodes-section">
          {filteredNodes.length === 0 ? (
            <div className="no-nodes">
              {searchTerm ? '未找到匹配的节点' : '此分类下暂无节点'}
            </div>
          ) : (
            <div className="nodes-grid">
              {filteredNodes.map(([nodeType, config]) => (
                <div
                  key={nodeType}
                  className="node-item"
                  onClick={() => handleAddNode(nodeType, config)}
                  title={config.description}
                >
                  <div className="node-item-icon">
                    {config.icon || '⚙️'}
                  </div>
                  <div className="node-item-content">
                    <div className="node-item-name">{config.name}</div>
                    <div className="node-item-description">
                      {config.description}
                    </div>
                    <div className="node-item-category">
                      {config.category}
                    </div>
                  </div>
                  <div className="node-item-add">+</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="help-section">
          <div className="help-title">使用说明</div>
          <div className="help-content">
            <p>• 点击节点卡片添加到画布</p>
            <p>• 拖拽节点进行连接</p>
            <p>• 双击节点编辑名称</p>
            <p>• 选中节点查看属性面板</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeToolbar;
