import React, { memo, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import './ToolNode.css';

const ToolNode = memo(({ id, data, selected, onNodeDataChange }) => {
  const [toolData, setToolData] = useState(data.toolData || data.tool || data);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(data.isExpanded || false);
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = React.useRef(null);

  // 实时同步工具数据
  useEffect(() => {
    const syncToolData = async () => {
      // 获取工具名称，优先从params中获取
      const toolName = data.params?.tool_name || data.tool_name || data.name || data.id;

      console.log('ToolNode同步数据:', {
        nodeId: id,
        toolName,
        dataParams: data.params,
        dataStructure: data
      });

      if (!toolName) {
        console.log('未找到工具名称，跳过同步');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/tools/library');
        const result = await response.json();

        console.log('工具库API响应:', result);

        if (result.status === 'success' && result.tools) {
          // 查找匹配的工具
          const matchedTool = result.tools.find(tool => {
            const match = tool.id === toolName ||
                         tool.name === toolName ||
                         tool.id.includes(toolName) ||
                         toolName.includes(tool.id);

            if (match) {
              console.log('找到匹配工具:', tool);
            }
            return match;
          });

          if (matchedTool) {
            console.log('更新工具数据:', matchedTool);
            // 更新工具数据，保留原有的其他属性
            setToolData({
              ...toolData,
              ...matchedTool,
              // 保留节点特有的属性
              params: data.params || {},
              inputs: data.inputs || [],
              outputs: data.outputs || [],
              // 确保显示更新后的描述
              description: matchedTool.description
            });
          } else {
            console.log('未找到匹配的工具，工具名称:', toolName);
            console.log('可用工具:', result.tools.map(t => ({ id: t.id, name: t.name })));
          }
        }
      } catch (error) {
        console.error('同步工具数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 初始同步
    syncToolData();

    // 监听工具库更新事件
    const handleToolsUpdate = () => {
      console.log('收到工具库更新事件，重新同步');
      syncToolData();
    };

    window.addEventListener('toolsConfigUpdated', handleToolsUpdate);

    return () => {
      window.removeEventListener('toolsConfigUpdated', handleToolsUpdate);
    };
  }, [data.params?.tool_name, data.tool_name, data.name, data.id]);

  // 处理双击展开/收起
  const handleNodeClick = () => {
    setClickCount(prev => prev + 1);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount + 1 >= 2) {
        // 双击 - 切换展开状态
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);

        // 通知父组件更新节点数据
        if (onNodeDataChange) {
          onNodeDataChange(id, {
            ...data,
            isExpanded: newExpanded
          });
        }
      }
      // 重置点击计数
      setClickCount(0);
    }, 300); // 300ms内的点击算作双击
  };

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const tool = toolData;
  
  // 获取工具图标
  const getToolIcon = () => {
    if (tool.category === 'AI工具') {
      return '🤖';
    }
    switch (tool.category) {
      case 'API工具':
        return '🔗';
      case 'MCP工具':
        return '🔧';
      case '我的工具':
        return '⚙️';
      default:
        return tool.icon || '🛠️';
    }
  };

  // 获取工具类型标识颜色
  const getToolAccentColor = () => {
    if (tool.category === 'AI工具') {
      return '#8b5cf6';
    }
    switch (tool.category) {
      case 'API工具':
        return '#3b82f6';
      case 'MCP工具':
        return '#10b981';
      case '我的工具':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const accentColor = getToolAccentColor();

  // 根据展开状态和描述长度调整样式
  const getDescriptionClass = () => {
    if (!isExpanded) return 'collapsed';

    const description = tool.description || '';
    const length = description.length;

    if (length <= 50) {
      return 'short';
    } else if (length <= 120) {
      return 'medium';
    } else {
      return 'long';
    }
  };

  // 根据展开状态动态调整节点样式
  const getNodeStyle = () => {
    if (!isExpanded) {
      // 收起状态：允许更宽的宽度以支持标题换行
      return {
        minWidth: '160px',
        maxWidth: '240px',
        minHeight: '60px'
      };
    }

    // 展开状态：根据描述长度调整
    const description = tool.description || '';
    const length = description.length;

    let minWidth = 200;
    let maxWidth = 320;

    if (length <= 50) {
      minWidth = 180;
      maxWidth = 300;
    } else if (length <= 120) {
      minWidth = 220;
      maxWidth = 340;
    } else {
      minWidth = 260;
      maxWidth = 380;
    }

    return {
      minWidth: `${minWidth}px`,
      maxWidth: `${maxWidth}px`
    };
  };

  return (
    <div
      className={`custom-node tool-node ${selected ? 'selected' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={getNodeStyle()}
      onClick={handleNodeClick}
    >
      {/* 四个方向的连接点 - 支持双向连接 */}
      <Handle type="source" position={Position.Top} id="top-source" isConnectable={true} className="connection-handle connection-handle-top" />
      <Handle type="target" position={Position.Top} id="top-target" isConnectable={true} className="connection-handle connection-handle-top" />

      <Handle type="source" position={Position.Left} id="left-source" isConnectable={true} className="connection-handle connection-handle-left" />
      <Handle type="target" position={Position.Left} id="left-target" isConnectable={true} className="connection-handle connection-handle-left" />

      <Handle type="source" position={Position.Right} id="right-source" isConnectable={true} className="connection-handle connection-handle-right" />
      <Handle type="target" position={Position.Right} id="right-target" isConnectable={true} className="connection-handle connection-handle-right" />

      <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectable={true} className="connection-handle connection-handle-bottom" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" isConnectable={true} className="connection-handle connection-handle-bottom" />

      {/* 工具类型标识 */}
      <div
        className="tool-type-badge"
        style={{ backgroundColor: accentColor }}
      />

      {/* 节点内容 */}
      <div className="node-content">
        <div className="node-header">
          <div className="node-main-content">
            <div className="node-icon-container">
              <span className="node-icon" style={{ color: accentColor }}>
                {getToolIcon()}
              </span>
              {/* 可以在这里添加加载动画 */}
            </div>
            <div className="node-text-container">
              <div className="node-title">{tool.name}</div>
              {isExpanded && <div className="node-subtitle">{tool.category}</div>}
            </div>
          </div>
          {/* 展开状态指示器 */}
          <div className="expand-indicator">
            {isExpanded ? '🔽' : '▶️'}
          </div>
        </div>

        {/* 状态标签 - 始终显示 */}
        {!isExpanded && (
          <div className="tool-status-badges">
            {tool.tested && (
              <span className="status-badge tested">
                已测试
              </span>
            )}
            {tool.enabled && (
              <span className="status-badge enabled">
                已启用
              </span>
            )}
          </div>
        )}

        {/* 只在展开时显示详细信息 */}
        {isExpanded && (
          <div className="tool-expanded-content">
            {/* 工具描述 */}
            <div className="tool-description">
              {isLoading ? (
                <span style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  正在同步工具信息...
                </span>
              ) : (
                tool.description || '暂无描述'
              )}
            </div>

            {/* 工具信息卡片 */}
            <div className="tool-info-card">
              <div className="info-row">
                <span className="info-label">来源</span>
                <span className="info-value">{tool.category || '系统工具'}</span>
              </div>
              {tool.tool_type && (
                <div className="info-row">
                  <span className="info-label">类型</span>
                  <span className="info-value">{tool.tool_type}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">状态</span>
                <div className="status-tags">
                  {tool.tested && (
                    <span className="status-tag tested">已测试</span>
                  )}
                  {tool.enabled && (
                    <span className="status-tag enabled">已启用</span>
                  )}
                  {!tool.tested && !tool.enabled && (
                    <span className="status-tag inactive">未配置</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
});

ToolNode.displayName = 'ToolNode';

export default ToolNode;
