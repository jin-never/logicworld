import React, { useState, useEffect } from 'react';
import './ToolLibrary.css';

const ToolLibrary = ({ onClose, isChatBoxCollapsed, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetNodeInfo, setTargetNodeInfo] = useState(null);

  // 工具来源映射
  const getSourceDisplayName = (source) => {
    const sourceMap = {
      'ai_config': 'AI工具',
      'api_config': 'API工具',
      'system_tools': '系统工具',
      'user': '我的工具',
      'system': '系统工具',
      'mcp': 'MCP工具',
      'api': 'API工具'
    };
    return sourceMap[source] || source;
  };

  // 截断描述文本
  const truncateDescription = (description, maxLength = 50) => {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  // 从后端加载工具库
  const loadToolsLibrary = async () => {
    setIsLoading(true);
    try {
      // 加载主工具库
      const response = await fetch('http://localhost:8000/api/tools/library');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.tools && Array.isArray(data.tools)) {
          let convertedTools = data.tools.map(tool => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            category: tool.category || '系统工具',
            icon: tool.icon || '🛠️',
            enabled: tool.enabled !== false,
            source: tool.source || 'system',
            tool_type: tool.tool_type,
            tags: tool.tags || [],
            tested: tool.tested || false,
            approved: tool.approved || false,
            config: tool.config || {}
          }));

          // 加载MCP工具
          try {
            const mcpResponse = await fetch('http://localhost:8000/api/mcp-tools');
            if (mcpResponse.ok) {
              const mcpData = await mcpResponse.json();
              if (mcpData.tools && Array.isArray(mcpData.tools)) {
                const mcpTools = mcpData.tools
                  .filter(tool => tool.enabled !== false)
                  .map(tool => ({
                    id: `mcp_${tool.name}`,
                    name: tool.name,
                    description: tool.description || 'MCP工具',
                    category: 'MCP工具',
                    icon: '🔧',
                    enabled: tool.enabled !== false,
                    source: 'mcp',
                    tool_type: 'mcp',
                    tags: [],
                    tested: tool.tested || false,
                    approved: tool.approved || false,
                    config: tool.config || {}
                  }));
                convertedTools = [...convertedTools, ...mcpTools];
              }
            }

            // 加载API工具
            const apiResponse = await fetch('http://localhost:8000/api/api-tools');
            if (apiResponse.ok) {
              const apiData = await apiResponse.json();
              if (apiData.tools && Array.isArray(apiData.tools)) {
                const apiTools = apiData.tools
                  .filter(tool => tool.enabled !== false)
                  .map(tool => ({
                    id: `api_${tool.name}`,
                    name: tool.name,
                    description: tool.description || 'API工具',
                    category: 'API工具',
                    icon: '🌐',
                    enabled: tool.enabled !== false,
                    source: 'api',
                    tool_type: 'api',
                    tags: [],
                    tested: tool.tested || false,
                    approved: tool.approved || false,
                    config: tool.config || {}
                  }));
                convertedTools = [...convertedTools, ...apiTools];
              }
            }
          } catch (err) {
            console.warn('加载MCP/API工具失败:', err.message);
          }

          setTools(convertedTools);
          console.log('工具库加载完成，工具数量:', convertedTools.length);
          return;
        }
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);

    } catch (err) {
      console.error('无法连接到后端API，工具库为空:', err.message);
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadToolsLibrary();
  }, []);

  // 监听工具库打开事件
  useEffect(() => {
    const handleOpenToolLibrary = (event) => {
      const { targetNodeId, targetField, currentValue } = event.detail || {};
      console.log('🔧 [ToolLibrary] 接收到打开工具库事件:', { targetNodeId, targetField, currentValue });

      if (targetNodeId && targetField) {
        setTargetNodeInfo({
          nodeId: targetNodeId,
          field: targetField,
          currentValue: currentValue
        });
      }
    };

    window.addEventListener('openToolLibrary', handleOpenToolLibrary);
    return () => {
      window.removeEventListener('openToolLibrary', handleOpenToolLibrary);
    };
  }, []);

  // 处理工具点击
  const handleToolClick = (tool) => {
    console.log('🔧 [ToolLibrary] 工具被点击:', tool);

    // 如果有目标节点信息，发送工具选择事件
    if (targetNodeInfo) {
      window.dispatchEvent(new CustomEvent('toolLibrarySelection', {
        detail: {
          targetNodeId: targetNodeInfo.nodeId,
          targetField: targetNodeInfo.field,
          toolName: tool.name,
          toolInfo: tool
        }
      }));

      setTargetNodeInfo(null);
    }
  };

  // 根据工具类型获取CSS类名
  const getToolIconClass = (tool) => {
    const toolName = tool.name.toLowerCase();
    
    if (toolName.includes('search') || toolName.includes('搜索')) {
      return 'search-tool';
    } else if (toolName.includes('file') || toolName.includes('文件')) {
      return 'file-tool';
    } else if (toolName.includes('api') || toolName.includes('网络')) {
      return 'network-tool';
    } else if (toolName.includes('ai') || toolName.includes('智能')) {
      return 'ai-tool';
    } else if (toolName.includes('mcp')) {
      return 'mcp-tool';
    } else {
      return 'utility-tool';
    }
  };

  // 过滤工具
  const filteredTools = tools.filter(tool => {
    if (!searchTerm) return true;
    
    return tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (tool.tags && tool.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
  });

  return (
    <div
      className={`tool-library-panel ${className}`}
      style={{
        position: 'absolute',
        top: '0',
        right: className.includes('adjust-for-chatbox') ? '390px' : '20px',
        width: '400px',
        height: '100%',
        background: 'rgba(240, 242, 245, 1)',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 10px -5px rgba(0, 0, 0, 0.1)',
        zIndex: 1000
      }}
    >
      {/* 头部 */}
      <div style={{
        padding: '20px',
        background: 'rgba(240, 242, 245, 1)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0
        }}>🔧 工具库</h2>

        {/* 目标节点信息提示 */}
        {targetNodeInfo && (
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '6px',
            padding: '8px 12px',
            margin: '8px 0',
            fontSize: '12px',
            color: '#1565c0'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '2px' }}>
              🎯 正在为执行节点选择工具
            </div>
            <div>
              字段: {targetNodeInfo.field === 'aiModel' ? 'AI选择' : '工具类型'}
              {targetNodeInfo.currentValue && (
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  (当前: {targetNodeInfo.currentValue})
                </span>
              )}
            </div>
          </div>
        )}

        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: 0,
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* 内容区域 */}
      <div style={{
        flex: 1,
        padding: '20px',
        background: 'rgba(240, 242, 245, 1)',
        overflowY: 'auto'
      }}>
        {/* 搜索 */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="搜索工具..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: 'white',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* 工具统计 */}
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          共找到 {filteredTools.length} 个工具
        </div>

        {/* 工具列表 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '12px'
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              正在加载工具库...
            </div>
          ) : filteredTools.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>未找到工具</h3>
              <p style={{ margin: 0 }}>尝试调整搜索条件</p>
            </div>
          ) : (
            filteredTools.map(tool => (
              <div
                key={tool.id}
                className="tool-card"
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: 'white',
                  transition: 'all 0.2s ease',
                  boxShadow: 'none'
                }}
                onClick={() => handleToolClick(tool)}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`tool-icon ${getToolIconClass(tool)}`}>
                      {tool.icon || '🔧'}
                    </div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      margin: 0
                    }}>{tool.name}</h3>
                  </div>
                  
                  {tool.enabled && (
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: '#dcfce7',
                      color: '#166534'
                    }}>可用</span>
                  )}
                </div>
                
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  lineHeight: '1.5',
                  marginBottom: '12px'
                }}>{truncateDescription(tool.description)}</p>
                
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af'
                }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: '#f3f4f6',
                    color: '#374151'
                  }}>
                    {getSourceDisplayName(tool.source)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolLibrary;
