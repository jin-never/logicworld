import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import './NodeExpandedView.css';

const NodeExpandedView = ({ nodeData, onClose, onDataChange, nodeId }) => {
  const [selectedAI, setSelectedAI] = useState(nodeData?.selectedAI || null);
  const [selectedTool, setSelectedTool] = useState(nodeData?.selectedTool || null);

  // 监听工具连接事件
  useEffect(() => {
    const handleToolConnection = (event) => {
      const { tool, targetType, connectionValid } = event.detail;

      if (connectionValid) {
        if (targetType === 'AI') {
          setSelectedAI(tool);
          // 更新节点数据
          if (onDataChange) {
            onDataChange(nodeId, {
              ...nodeData,
              selectedAI: tool
            });
          }
        } else if (targetType === 'Tool') {
          setSelectedTool(tool);
          // 更新节点数据
          if (onDataChange) {
            onDataChange(nodeId, {
              ...nodeData,
              selectedTool: tool
            });
          }
        }
      }
    };

    window.addEventListener('toolConnected', handleToolConnection);
    return () => window.removeEventListener('toolConnected', handleToolConnection);
  }, [nodeData, onDataChange, nodeId]);

  // 处理连接点的拖拽事件
  const handleConnectionDrop = (event, targetType) => {
    event.preventDefault();
    const toolData = event.dataTransfer.getData('application/reactflow');

    if (toolData) {
      try {
        const tool = JSON.parse(toolData);

        // 验证连接是否正确
        const isValidConnection = validateConnection(tool, targetType);

        // 触发连接事件
        window.dispatchEvent(new CustomEvent('toolConnected', {
          detail: {
            tool: tool.toolData || tool,
            targetType,
            connectionValid: isValidConnection,
            nodeId
          }
        }));

        if (!isValidConnection) {
          // 显示错误提示
          showConnectionError(tool, targetType);
        }
      } catch (error) {
        console.error('解析工具数据失败:', error);
      }
    }
  };

  // 验证连接是否正确
  const validateConnection = (tool, targetType) => {
    if (targetType === 'AI') {
      return tool.category === 'AI工具' || tool.type === 'ai';
    } else if (targetType === 'Tool') {
      return tool.category !== 'AI工具' && tool.type !== 'ai';
    }
    return false;
  };

  // 显示连接错误
  const showConnectionError = (tool, targetType) => {
    const expectedType = targetType === 'AI' ? 'AI工具' : '执行工具';
    const actualType = tool.category || tool.type || '未知类型';
    alert(`连接错误：${tool.name} 是 ${actualType}，无法连接到 ${expectedType} 区域`);
  };

  // 清除AI选择
  const handleClearAI = () => {
    setSelectedAI(null);
    if (onDataChange) {
      onDataChange(nodeId, {
        ...nodeData,
        selectedAI: null
      });
    }
  };

  // 清除工具选择
  const handleClearTool = () => {
    setSelectedTool(null);
    if (onDataChange) {
      onDataChange(nodeId, {
        ...nodeData,
        selectedTool: null
      });
    }
  };

  // 获取节点图标
  const getNodeIcon = () => {
    switch (nodeData?.nodeType || nodeData?.type) {
      case 'material-node':
      case 'material':
        return '📋';
      case 'execution-node':
      case 'execution':
        return '⚡';
      case 'condition-node':
      case 'condition':
        return '🔀';
      case 'result-node':
      case 'result':
        return '📊';
      default:
        return '📋';
    }
  };

  return (
    <div className="node-expanded-view">
      {/* 头部 */}
      <div className="expanded-header">
        <div className="expanded-title">
          <span className="expanded-icon">{getNodeIcon()}</span>
          <span className="expanded-name">{nodeData?.label || '节点详情'}</span>
          <span className="node-type-badge">{nodeData?.nodeType || nodeData?.type || 'material'}</span>
        </div>
        <div className="expanded-controls">
          <button
            className="control-btn close-btn"
            onClick={onClose}
            title="关闭"
          >
            ✖️
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="expanded-body">
        <div className="expanded-content-area">
          
          {/* AI选择区域 */}
          <div className="selection-section">
            <div className="section-header">
              <span className="section-icon">🤖</span>
              <span className="section-title">AI助手</span>
            </div>
            <div className="selection-content">
              {/* 左侧连接点 */}
              <div
                className="connection-point left"
                onDrop={(e) => handleConnectionDrop(e, 'AI')}
                onDragOver={(e) => e.preventDefault()}
                title="拖拽AI工具到此处连接"
              >
                <div className="connection-dot"></div>
              </div>

              {selectedAI ? (
                <div className="selected-item">
                  <div className="selected-item-info">
                    <div className="selected-item-name">{selectedAI.name}</div>
                    <div className="selected-item-description">{selectedAI.description}</div>
                    <div className="selected-item-category">{selectedAI.category}</div>
                  </div>
                  <button
                    className="clear-selection-btn"
                    onClick={handleClearAI}
                    title="清除选择"
                  >
                    ✖️
                  </button>
                </div>
              ) : (
                <div
                  className="selection-placeholder"
                  onDrop={(e) => handleConnectionDrop(e, 'AI')}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="placeholder-icon">🤖</div>
                  <div className="placeholder-text">
                    拖拽AI工具到此处连接
                  </div>
                </div>
              )}

              {/* 右侧连接点 */}
              <div
                className="connection-point right"
                onDrop={(e) => handleConnectionDrop(e, 'AI')}
                onDragOver={(e) => e.preventDefault()}
                title="拖拽AI工具到此处连接"
              >
                <div className="connection-dot"></div>
              </div>
            </div>
          </div>

          {/* 工具选择区域 */}
          <div className="selection-section">
            <div className="section-header">
              <span className="section-icon">🛠️</span>
              <span className="section-title">执行工具</span>
            </div>
            <div className="selection-content">
              {/* 左侧连接点 */}
              <div
                className="connection-point left"
                onDrop={(e) => handleConnectionDrop(e, 'Tool')}
                onDragOver={(e) => e.preventDefault()}
                title="拖拽执行工具到此处连接"
              >
                <div className="connection-dot"></div>
              </div>

              {selectedTool ? (
                <div className="selected-item">
                  <div className="selected-item-info">
                    <div className="selected-item-name">{selectedTool.name}</div>
                    <div className="selected-item-description">{selectedTool.description}</div>
                    <div className="selected-item-category">{selectedTool.category}</div>
                  </div>
                  <button
                    className="clear-selection-btn"
                    onClick={handleClearTool}
                    title="清除选择"
                  >
                    ✖️
                  </button>
                </div>
              ) : (
                <div
                  className="selection-placeholder"
                  onDrop={(e) => handleConnectionDrop(e, 'Tool')}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="placeholder-icon">🛠️</div>
                  <div className="placeholder-text">
                    拖拽执行工具到此处连接
                  </div>
                </div>
              )}

              {/* 右侧连接点 */}
              <div
                className="connection-point right"
                onDrop={(e) => handleConnectionDrop(e, 'Tool')}
                onDragOver={(e) => e.preventDefault()}
                title="拖拽执行工具到此处连接"
              >
                <div className="connection-dot"></div>
              </div>
            </div>
          </div>

          {/* 配置区域 */}
          <div className="config-section">
            <div className="section-header">
              <span className="section-icon">⚙️</span>
              <span className="section-title">节点配置</span>
            </div>
            <div className="config-content">
              <div className="config-item">
                <label className="config-label">节点名称</label>
                <input 
                  type="text" 
                  className="config-input"
                  value={nodeData?.label || ''}
                  onChange={(e) => onDataChange && onDataChange(nodeId, {
                    ...nodeData,
                    label: e.target.value
                  })}
                  placeholder="输入节点名称"
                />
              </div>
              <div className="config-item">
                <label className="config-label">节点描述</label>
                <textarea 
                  className="config-textarea"
                  value={nodeData?.description || ''}
                  onChange={(e) => onDataChange && onDataChange(nodeId, {
                    ...nodeData,
                    description: e.target.value
                  })}
                  placeholder="输入节点描述"
                  rows={3}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NodeExpandedView;
