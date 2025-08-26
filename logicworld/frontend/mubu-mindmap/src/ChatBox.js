import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatBox.css';
import ToolSelector from './components/ToolSelector';
import { TOOL_CATEGORIES, getCategoryOptions } from './constants/toolCategories';

// 工具选择器组件 - 带分类下拉功能
const ToolSelectorWithDropdown = ({ defaultValue, placeholder, onChange, style }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [inputValue, setInputValue] = useState(defaultValue || '无适合工具');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // 工具分组数据（从后端API获取，无硬编码数据）
  const toolGroups = [];

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSelectedCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理分类选择
  const handleCategorySelect = (groupId) => {
    setSelectedCategory(selectedCategory === groupId ? null : groupId);
  };

  // 处理工具选择
  const handleToolSelect = (tool) => {
    setInputValue(tool.name);
    setIsDropdownOpen(false);
    setSelectedCategory(null);
    if (onChange) {
      onChange({ target: { value: tool.name } });
    }
  };

  // 切换下拉菜单
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    setSelectedCategory(null);
  };

  // 监听外部值变化
  useEffect(() => {
    if (defaultValue !== inputValue) {
      setInputValue(defaultValue || '');
    }
  }, [defaultValue]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (onChange) {
      onChange(e);
    }
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
    setSelectedCategory(null);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }} ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        style={{
          padding: '8px 35px 8px 12px',
          border: '2px solid #e1e5e9',
          borderRadius: '8px',
          fontSize: '14px',
          width: '280px',
          backgroundColor: '#f8f9fa',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        placeholder={placeholder}
        onFocus={(e) => {
          e.target.style.borderColor = '#007bff';
          e.target.style.backgroundColor = '#fff';
          e.target.style.boxShadow = '0 0 0 3px rgba(0,123,255,0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e1e5e9';
          e.target.style.backgroundColor = '#f8f9fa';
          e.target.style.boxShadow = 'none';
        }}
      />
      <button
        onClick={toggleDropdown}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          color: '#6c757d',
          padding: '4px',
          borderRadius: '4px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#e9ecef';
          e.target.style.color = '#495057';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = '#6c757d';
        }}
      >
        {isDropdownOpen ? '▲' : '▼'}
      </button>

      {/* 下拉菜单 */}
      {isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          border: '2px solid #e1e5e9',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {toolGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* 分类标题 */}
              <div
                onClick={() => handleCategorySelect(groupIndex)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: selectedCategory === groupIndex ? '#f8f9fa' : '#fff',
                  borderBottom: '1px solid #e9ecef',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: '500',
                  color: group.color || '#495057',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== groupIndex) {
                    e.target.style.backgroundColor = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== groupIndex) {
                    e.target.style.backgroundColor = '#fff';
                  }
                }}
              >
                <span>{group.label}</span>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>
                  {selectedCategory === groupIndex ? '▲' : '▼'}
                </span>
              </div>

              {/* 工具列表 */}
              {selectedCategory === groupIndex && (
                <div style={{ backgroundColor: '#f8f9fa' }}>
                  {group.tools.length > 0 ? (
                    group.tools.map((tool, toolIndex) => (
                      <div
                        key={toolIndex}
                        onClick={() => handleToolSelect(tool)}
                        style={{
                          padding: '10px 24px',
                          cursor: tool.available ? 'pointer' : 'not-allowed',
                          borderBottom: toolIndex < group.tools.length - 1 ? '1px solid #e9ecef' : 'none',
                          opacity: tool.available ? 1 : 0.5,
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (tool.available) {
                            e.target.style.backgroundColor = '#e9ecef';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {tool.name} {!tool.available && '(不可用)'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {tool.description}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '10px 24px',
                      color: '#6c757d',
                      fontStyle: 'italic'
                    }}>
                      无
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ToolInputWithDropdown 组件定义
const ToolInputWithDropdown = ({ defaultValue, placeholder, onChange, style, ...props }) => {
  const [value, setValue] = useState(defaultValue || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [toolGroups, setToolGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取系统真实的工具库数据
  useEffect(() => {
    const fetchSystemTools = async () => {
      setLoading(true);
      try {
        // 添加缓存机制，避免频繁调用API
        const cacheKey = 'toolLibraryCache';
        const cacheTime = 5 * 60 * 1000; // 5分钟缓存
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < cacheTime) {
            console.log('使用缓存的工具库数据');
            processToolsData(data);
            setLoading(false);
            return;
          }
        }

        // 使用新的工具管理器获取所有工具数据
        let data = null;

        try {
          const { toolManager } = await import('./utils/toolManager.js');

          // 确保工具管理器已初始化
          if (!toolManager.initialized) {
            await toolManager.initialize();
          }

          // 获取所有工具
          const allTools = toolManager.getAllTools();
          const userTools = toolManager.getUserTools();

          // 按来源分组工具数据
          data = {
            all: allTools,
            user: userTools,
            ai: allTools.filter(tool => tool.sourceType === 'ai'),
            mcp: allTools.filter(tool => tool.sourceType === 'mcp'),
            api: allTools.filter(tool => tool.sourceType === 'api'),
            system: allTools.filter(tool => tool.sourceType === 'system')
          };

          console.log('工具管理器数据加载完成:', {
            total: allTools.length,
            user: userTools.length,
            ai: data.ai.length,
            mcp: data.mcp.length,
            api: data.api.length,
            system: data.system.length
          });

        } catch (error) {
          console.error('工具管理器加载失败，回退到传统方式:', error);

          // 回退到原有的API调用方式
          const [aiResponse, mcpResponse, apiResponse, systemResponse, userResponse] = await Promise.allSettled([
            fetch('/api/ai/services'),
            fetch('/api/mcp/tools'),
            fetch('/api/api/tools'),
            fetch('/api/system/tools'),
            fetch('/api/tools/user-tools')
          ]);

          data = {
            ai: aiResponse.status === 'fulfilled' ? await aiResponse.value.json() : null,
            mcp: mcpResponse.status === 'fulfilled' ? await mcpResponse.value.json() : null,
            api: apiResponse.status === 'fulfilled' ? await apiResponse.value.json() : null,
            system: systemResponse.status === 'fulfilled' ? await systemResponse.value.json() : null,
            user: userResponse.status === 'fulfilled' ? await userResponse.value.json() : null
          };
        }

        // 处理工具数据
        if (data) {
          processToolsData(data);

          // 缓存数据
          localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('获取工具库失败:', error);
        setToolGroups([]);
      } finally {
        setLoading(false);
      }
    };

    const processToolsData = (data) => {
      const groups = [];

      try {
        // 检查是否是新的工具管理器数据结构
        if (data.all && Array.isArray(data.all)) {
          // 新的工具管理器数据结构
          console.log('处理工具管理器数据结构');

          // 按来源分组统计
          const sourceStats = {
            ai: data.ai?.length || 0,
            mcp: data.mcp?.length || 0,
            api: data.api?.length || 0,
            system: data.system?.length || 0,
            user: data.user?.length || 0
          };

          // 添加基础分类
          if (sourceStats.ai > 0) {
            groups.push({
              id: 'AI工具',
              label: `🤖 AI工具 (${sourceStats.ai}个工具)`,
              tools: data.ai.map(tool => ({
                name: tool.name,
                description: tool.description,
                enabled: tool.enabled,
                icon: '🤖'
              })),
              count: sourceStats.ai,
              type: 'basic'
            });
          }

          if (sourceStats.mcp > 0) {
            groups.push({
              id: 'MCP工具',
              label: `🔌 MCP工具 (${sourceStats.mcp}个工具)`,
              tools: data.mcp.map(tool => ({
                name: tool.name,
                description: tool.description,
                enabled: tool.enabled,
                icon: '🔌'
              })),
              count: sourceStats.mcp,
              type: 'basic'
            });
          }

          if (sourceStats.api > 0) {
            groups.push({
              id: 'API工具',
              label: `🔗 API工具 (${sourceStats.api}个工具)`,
              tools: data.api.map(tool => ({
                name: tool.name,
                description: tool.description,
                enabled: tool.enabled,
                icon: '🔗'
              })),
              count: sourceStats.api,
              type: 'basic'
            });
          }

          if (sourceStats.user > 0) {
            groups.push({
              id: '我的工具',
              label: `👤 我的工具 (${sourceStats.user}个工具)`,
              tools: data.user.map(tool => ({
                name: tool.name,
                description: tool.description,
                enabled: tool.enabled,
                icon: '👤'
              })),
              count: sourceStats.user,
              type: 'basic'
            });
          }

          // 收集所有真实工具数据
          const allRealTools = data.all.map(tool => ({
            ...tool,
            source: tool.sourceType,
            category: tool.functionalCategory
          }));

          // 处理功能分类
          processToolsByCategory(allRealTools, groups);

        } else {
          // 传统的API数据结构
          console.log('处理传统API数据结构');
          processLegacyToolsData(data, groups);
        }

        setToolGroups(groups);
        console.log('工具库数据处理完成，分组数量:', groups.length);

      } catch (error) {
        console.error('处理工具数据失败:', error);
        setToolGroups([]);
      }
    };

    // 处理功能分类的工具
    const processToolsByCategory = (allRealTools, groups) => {
      // 按功能分类分组工具
      const categoryGroups = {};

      allRealTools.forEach(tool => {
        const category = tool.category || 'system_tools';
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(tool);
      });

      // 为每个分类创建分组
      Object.entries(categoryGroups).forEach(([categoryId, tools]) => {
        const categoryInfo = getFunctionalCategoryInfo(categoryId);

        groups.push({
          id: categoryId,
          label: `${categoryInfo.icon} ${categoryInfo.name} (${tools.length}个工具)`,
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            enabled: tool.enabled || tool.available,
            icon: categoryInfo.icon,
            source: tool.source,
            approved: tool.approved
          })),
          count: tools.length,
          type: 'functional'
        });
      });
    };

    // 处理传统API数据结构
    const processLegacyToolsData = (data, groups) => {
        // 处理AI工具数据
        if (data.ai && data.ai.status === 'success') {
          const aiData = data.ai.data || {};
          const configuredServices = aiData.configuredServices || 0;
          const activeConnections = aiData.activeConnections || 0;
          const supportedProviders = aiData.supportedProviders || 7;
          const totalAiTools = configuredServices; // 使用实际的AI工具总数

          groups.push({
            id: 'AI工具',
            label: `🤖 AI工具 (${totalAiTools}个工具)`,
            tools: [
              { name: '已配置服务', description: `${configuredServices}个已配置的AI服务`, enabled: true, icon: '⚙️' },
              { name: '活跃连接', description: `${activeConnections}个活跃连接`, enabled: true, icon: '🔗' },
              { name: '支持提供商', description: `${supportedProviders}个支持的提供商`, enabled: true, icon: '🏢' }
            ],
            count: totalAiTools,
            type: 'basic'
          });
        }

        // 处理MCP工具数据
        if (data.mcp && data.mcp.status === 'success') {
          const mcpData = data.mcp.data || {};
          const allTools = mcpData.allTools || 0;
          const myTools = mcpData.myTools || 0;
          const platformTools = mcpData.platformTools || 0;
          const approvedTools = mcpData.approvedTools || 0;
          const pendingTools = mcpData.pendingTools || 0;
          const totalMcpTools = allTools; // 使用实际的MCP工具总数

          groups.push({
            id: 'MCP工具',
            label: `🔌 MCP工具 (${totalMcpTools}个工具)`,
            tools: [
              { name: '全部工具', description: `${allTools}个MCP工具`, enabled: true, icon: '📊' },
              { name: '我的工具', description: `${myTools}个我的工具`, enabled: true, icon: '🔧' },
              { name: '平台工具', description: `${platformTools}个平台工具`, enabled: true, icon: '🌐' },
              { name: '已批准', description: `${approvedTools}个已批准工具`, enabled: true, icon: '✅' },
              { name: '待批准', description: `${pendingTools}个待批准工具`, enabled: true, icon: '⏳' }
            ],
            count: totalMcpTools,
            type: 'basic'
          });
        }

        // 处理API工具数据
        if (data.api && data.api.status === 'success') {
          const apiData = data.api.data || {};
          const apiTools = apiData.apiTools || 0;
          const runningTools = apiData.runningTools || 0;
          const supportedTypes = apiData.supportedTypes || 7;
          const totalApiTools = apiTools; // 使用实际的API工具总数

          groups.push({
            id: 'API工具',
            label: `🔗 API工具 (${totalApiTools}个工具)`,
            tools: [
              { name: 'API工具', description: `${apiTools}个API工具`, enabled: true, icon: '🔗' },
              { name: '正常运行', description: `${runningTools}个正常运行`, enabled: true, icon: '✅' },
              { name: '支持类型', description: `${supportedTypes}个支持类型`, enabled: true, icon: '📊' }
            ],
            count: totalApiTools,
            type: 'basic'
          });
        }

        // 处理系统工具数据
        if (data.system && data.system.status === 'success') {
          const systemData = data.system.data || {};
          const systemTools = systemData.tools || [];

          if (systemTools.length > 0) {
            groups.push({
              id: '系统工具',
              label: `⚙️ 系统工具 (${systemTools.length}个工具)`,
              tools: systemTools.map(tool => ({
                name: tool.name,
                description: tool.description || '暂无描述',
                enabled: tool.enabled !== false,
                icon: tool.icon || '🛠️'
              })),
              count: systemTools.length,
              type: 'basic'
            });
          }
        }

        // 收集所有真实工具数据
        const allRealTools = [];

        // 从AI工具数据中提取工具
        if (data.ai && data.ai.status === 'success' && data.ai.data && data.ai.data.tools) {
          data.ai.data.tools.forEach(tool => {
            allRealTools.push({
              ...tool,
              source: 'ai',
              category: tool.functionalCategory || 'ai_assistant' // 默认分类
            });
          });
        }

        // 从MCP工具数据中提取工具
        if (data.mcp && data.mcp.status === 'success' && data.mcp.data && data.mcp.data.tools) {
          data.mcp.data.tools.forEach(tool => {
            allRealTools.push({
              ...tool,
              source: 'mcp',
              category: tool.functionalCategory || 'automation' // 默认分类
            });
          });
        }

        // 从API工具数据中提取工具
        if (data.api && data.api.status === 'success' && data.api.data && data.api.data.tools) {
          data.api.data.tools.forEach(tool => {
            allRealTools.push({
              ...tool,
              source: 'api',
              category: tool.functionalCategory || 'web_services' // 默认分类
            });
          });
        }

        // 从系统工具数据中提取工具
        if (data.system && data.system.status === 'success' && data.system.data && data.system.data.tools) {
          data.system.data.tools.forEach(tool => {
            allRealTools.push({
              ...tool,
              source: 'system',
              category: tool.functionalCategory || 'system_tools' // 默认分类
            });
          });
        }

        // 从用户工具数据中提取工具
        if (data.user && data.user.success && Array.isArray(data.user.tools)) {
          data.user.tools.forEach(tool => {
            // 只显示已批准的工具或用户自己的工具
            if (tool.approved || tool.source === 'user') {
              allRealTools.push({
                ...tool,
                source: 'user',
                category: mapUserToolCategory(tool.category, tool.type),
                available: tool.enabled && (tool.approved || tool.source === 'user'),
                userOwned: tool.source === 'user',
                approved: tool.approved || false
              });
            }
          });
        }

        // 按功能分类对工具进行分组
        const categoryOptions = getCategoryOptions();
        categoryOptions.forEach(category => {
          // 找到属于该分类的工具
          const categoryTools = allRealTools.filter(tool =>
            tool.category === category.value ||
            tool.functionalCategory === category.value
          );

          const toolCount = categoryTools.length;
          const displayTools = [];

          if (toolCount === 0) {
            displayTools.push({
              name: '无',
              description: '该分类下暂无可用工具',
              enabled: false,
              icon: '❌'
            });
          } else {
            // 使用真实工具数据
            categoryTools.forEach(tool => {
              displayTools.push({
                name: tool.name || tool.title || '未命名工具',
                description: tool.description || '暂无描述',
                enabled: tool.enabled !== false,
                icon: tool.icon || category.icon,
                source: tool.source
              });
            });
          }

          groups.push({
            id: category.value,
            label: `${category.label} (${toolCount}个工具)`, // 在标签中显示真实工具数量
            tools: displayTools,
            count: Math.max(1, toolCount),
            type: 'functional',
            color: category.color
          });
        });

        // 按类型和预定义顺序排序
        groups.sort((a, b) => {
          // 基础分类优先
          if (a.type !== b.type) {
            return a.type === 'basic' ? -1 : 1;
          }

          // 基础分类内按预定义顺序排序
          if (a.type === 'basic') {
            const order = ['AI工具', 'MCP工具', 'API工具', '系统工具'];
            const aIndex = order.indexOf(a.id);
            const bIndex = order.indexOf(b.id);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
          }

          return a.label.localeCompare(b.label);
        });

        // 处理功能分类
        processToolsByCategory(allRealTools, groups);
    };

    fetchSystemTools();

    // 监听工具配置更新事件
    const handleToolsConfigUpdated = () => {
      console.log('检测到工具配置更新，刷新工具库');
      // 清除缓存
      localStorage.removeItem('toolLibraryCache');
      // 重新获取工具数据
      fetchSystemTools();
    };

    // 监听工具库更新事件
    const handleToolLibraryUpdated = (event) => {
      console.log('检测到工具库更新事件:', event.detail);
      // 清除缓存
      localStorage.removeItem('toolLibraryCache');
      // 重新获取工具数据
      fetchSystemTools();
    };

    // 监听特定源的工具更新事件
    const handleSourceUpdated = (event) => {
      console.log(`检测到${event.type}更新事件`);
      // 清除缓存
      localStorage.removeItem('toolLibraryCache');
      // 重新获取工具数据
      fetchSystemTools();
    };

    // 添加所有事件监听器
    window.addEventListener('toolsConfigUpdated', handleToolsConfigUpdated);
    window.addEventListener('toolLibraryUpdated', handleToolLibraryUpdated);
    window.addEventListener('aiToolsUpdated', handleSourceUpdated);
    window.addEventListener('mcpToolsUpdated', handleSourceUpdated);
    window.addEventListener('apiToolsUpdated', handleSourceUpdated);
    window.addEventListener('userToolsUpdated', handleSourceUpdated);

    return () => {
      window.removeEventListener('toolsConfigUpdated', handleToolsConfigUpdated);
      window.removeEventListener('toolLibraryUpdated', handleToolLibraryUpdated);
      window.removeEventListener('aiToolsUpdated', handleSourceUpdated);
      window.removeEventListener('mcpToolsUpdated', handleSourceUpdated);
      window.removeEventListener('apiToolsUpdated', handleSourceUpdated);
      window.removeEventListener('userToolsUpdated', handleSourceUpdated);
    };
  }, []);

  // 获取分类图标
  const getCategoryIcon = (category) => {
    const iconMap = {
      'AI工具': '🤖',
      'API工具': '🔗',
      'MCP工具': '🔌',
      '系统工具': '⚙️',
      '我的工具': '🔧',
      '托管平台工具': '☁️',
      '其他工具': '🛠️'
    };
    return iconMap[category] || '🛠️';
  };

  // 获取功能分类信息
  const getFunctionalCategoryInfo = (categoryId) => {
    // 使用从 toolCategories.js 导入的分类定义
    const category = TOOL_CATEGORIES[categoryId];
    if (category) {
      return {
        label: category.name,
        icon: category.icon
      };
    }

    // 如果没有找到，返回默认值
    return {
      label: `🛠️ ${categoryId}`,
      icon: '🛠️'
    };
  };

  // 将用户工具分类映射到功能分类
  const mapUserToolCategory = (category, type) => {
    const categoryMap = {
      'api': 'network_communication',
      'file': 'file_management',
      'data': 'data_processing',
      'ai': 'ai_assistant',
      'search': 'network_communication',
      'utility': 'system_tools',
      '我的工具': 'system_tools'
    };

    return categoryMap[type] || categoryMap[category] || 'system_tools';
  };





  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleToolSelect = (tool) => {
    setValue(tool.name);
    setIsDropdownOpen(false);
    setSelectedCategory(null);
    if (onChange) {
      onChange({ target: { value: tool.name } });
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            if (onChange) onChange(e);
          }}
          style={{
            ...style,
            paddingRight: '25px'
          }}
          {...props}
        />
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{
            position: 'absolute',
            right: '5px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#666'
          }}
        >
          {isDropdownOpen ? '▲' : '▼'}
        </button>
      </div>

      {isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          height: '280px', // 固定高度
          display: 'flex',
          flexDirection: 'column'
        }}>
          {!selectedCategory ? (
            // 显示分类列表
            <div className="tool-dropdown-scroll" style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}>
              {loading ? (
                <div style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  <div style={{ marginBottom: '8px' }}>🔄</div>
                  加载工具库中...
                </div>
              ) : toolGroups.length === 0 ? (
                <div style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '14px'
                }}>
                  暂无可用工具
                </div>
              ) : (
                toolGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => handleCategorySelect(group.id)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <span style={{ fontSize: '16px' }}>{group.label.split(' ')[0]}</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{group.label.split(' ').slice(1).join(' ')}</span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '12px',
                      color: '#999',
                      backgroundColor: '#f0f0f0',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {group.count || group.tools?.length || 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            // 显示选中分类的工具列表
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 固定的头部 */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0
              }}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#007bff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  ← 返回
                </button>
                <span style={{ fontSize: '16px' }}>{toolGroups.find(g => g.id === selectedCategory)?.label.split(' ')[0]}</span>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{toolGroups.find(g => g.id === selectedCategory)?.label.split(' ').slice(1).join(' ')}</span>
              </div>

              {/* 可滚动的工具列表 */}
              <div className="tool-dropdown-scroll" style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                {toolGroups.find(g => g.id === selectedCategory)?.tools?.length > 0 ? (
                  toolGroups.find(g => g.id === selectedCategory).tools.map((tool, index) => (
                    <div
                      key={index}
                      onClick={() => handleToolSelect(tool)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{tool.name}</div>
                      {tool.description && (
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                          {tool.description}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    暂无工具
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// AI生成步骤模块已移除 - 根据用户要求移除

// 固定模板渲染函数已移除 - 根据用户要求移除



// 简单实用的工具匹配逻辑
// 基于真实工具库数据进行匹配

// 缓存工具库数据
let cachedToolsLibrary = null;
let toolsLibraryPromise = null;



// 获取真实工具库数据
const getToolsLibrary = async () => {
  if (cachedToolsLibrary) {
    return cachedToolsLibrary;
  }

  if (toolsLibraryPromise) {
    return toolsLibraryPromise;
  }

  toolsLibraryPromise = fetch('http://localhost:8000/api/tools/library')
    .then(response => response.json())
    .then(data => {
      if (data.tools) {
        cachedToolsLibrary = data.tools;
        console.log('📚 工具库加载成功，工具数量:', data.tools.length);
        return data.tools;
      }
      return [];
    })
    .catch(error => {
      console.error('❌ 工具库加载失败:', error);
      return [];
    });

  return toolsLibraryPromise;
};

// 基于任务类型的简单分类
const getTaskCategory = (description) => {
  const desc = description.toLowerCase();

  // 文件操作类
  if (desc.includes('文件') || desc.includes('保存') || desc.includes('生成') ||
      desc.includes('输出') || desc.includes('整合')) {
    return 'file_management';
  }

  // 数据分析类
  if (desc.includes('数据') || desc.includes('分析') || desc.includes('统计') ||
      desc.includes('图表') || desc.includes('指标')) {
    return 'data_analysis';
  }

  // 文档处理类
  if (desc.includes('文档') || desc.includes('报告') || desc.includes('word') ||
      desc.includes('excel') || desc.includes('ppt')) {
    return 'document_processing';
  }

  // 设计类
  if (desc.includes('设计') || desc.includes('界面') || desc.includes('布局') ||
      desc.includes('美化') || desc.includes('样式')) {
    return 'design';
  }

  // 默认为通用AI
  return 'ai_assistant';
};

// 计算工具与描述的匹配分数
const calculateMatchScore = (tool, description) => {
  let score = 0;
  const desc = description.toLowerCase();
  const toolName = tool.name.toLowerCase();
  const toolDesc = (tool.description || '').toLowerCase();

  // 工具名称匹配（权重最高）
  if (toolName.includes('文件') && desc.includes('文件')) score += 10;
  if (toolName.includes('数据') && desc.includes('数据')) score += 10;
  if (toolName.includes('文档') && (desc.includes('文档') || desc.includes('报告'))) score += 10;
  if (toolName.includes('ai') || toolName.includes('智能')) score += 5;

  // 工具描述匹配
  const descWords = desc.split(/\s+/);
  descWords.forEach(word => {
    if (word.length > 1 && toolDesc.includes(word)) {
      score += 2;
    }
  });

  // 分类匹配
  const taskCategory = getTaskCategory(description);
  if (tool.functionalCategory === taskCategory) {
    score += 8;
  }

  return score;
};

// 新的智能工具匹配函数
const smartMatchTool = async (executionDescription) => {
  if (!executionDescription) {
    return { name: '🤖 DeepSeek聊天模型', available: true };
  }

  console.log('🔍 智能工具匹配 - 输入描述:', executionDescription);

  try {
    // 获取真实工具库数据
    const toolsLibrary = await getToolsLibrary();

    if (!toolsLibrary || toolsLibrary.length === 0) {
      console.log('⚠️ 工具库为空，使用默认工具');
      return { name: '🤖 DeepSeek聊天模型', available: true };
    }

    // 只考虑启用的工具
    const availableTools = toolsLibrary.filter(tool => tool.enabled !== false);
    console.log('📋 可用工具数量:', availableTools.length);

    // 计算每个工具的匹配分数
    const toolScores = availableTools.map(tool => ({
      tool,
      score: calculateMatchScore(tool, executionDescription)
    })).filter(item => item.score > 0);

    // 按分数排序
    toolScores.sort((a, b) => b.score - a.score);

    if (toolScores.length > 0) {
      const bestMatch = toolScores[0];
      console.log('✅ 智能匹配结果:', bestMatch.tool.name);
      console.log('🎯 匹配分数:', bestMatch.score);

      return {
        name: bestMatch.tool.name,
        description: bestMatch.tool.description,
        available: true
      };
    }

    // 没有匹配时，根据任务类型选择默认工具
    const taskCategory = getTaskCategory(executionDescription);
    const defaultTool = getDefaultToolByCategory(taskCategory, availableTools);

    console.log('🔄 使用默认工具:', defaultTool.name);
    return defaultTool;

  } catch (error) {
    console.error('❌ 工具匹配失败:', error);
    return { name: '🤖 DeepSeek聊天模型', available: true };
  }
};

// 根据分类获取默认工具
const getDefaultToolByCategory = (category, availableTools) => {
  // 优先查找对应分类的工具
  const categoryTool = availableTools.find(tool =>
    tool.functionalCategory === category ||
    tool.category?.includes(category)
  );

  if (categoryTool) {
    return {
      name: categoryTool.name,
      description: categoryTool.description,
      available: true
    };
  }

  // 查找AI工具作为通用选择
  const aiTool = availableTools.find(tool =>
    tool.name.includes('AI') ||
    tool.name.includes('智能') ||
    tool.name.includes('DeepSeek') ||
    tool.name.includes('通义')
  );

  if (aiTool) {
    return {
      name: aiTool.name,
      description: aiTool.description,
      available: true
    };
  }

  // 最终回退
  return { name: '🤖 DeepSeek聊天模型', available: true };
};

// 实时智能工具匹配函数 - 在生成过程中实时匹配
const performRealtimeToolMatching = (messageContent, messageId) => {
  console.log('🔍 开始实时智能工具匹配');

  try {
    // 查找当前正在生成的消息容器
    const messageContainer = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageContainer) {
      console.log('⚠️ 未找到消息容器，跳过实时匹配');
      return;
    }

    // 查找所有"推荐工具："后面的输入框
    const toolInputs = messageContainer.querySelectorAll('input[placeholder*="工具名称"]');
    console.log(`🔍 找到 ${toolInputs.length} 个工具输入框`);

    toolInputs.forEach((input, index) => {
      // 检查是否已经填充了工具
      if (input.value && input.value !== '🔄 匹配中...' && !input.value.includes('匹配中')) {
        console.log(`⚠️ 工具输入框 ${index + 1} 已有值，跳过: ${input.value}`);
        return;
      }

      // 查找对应的执行描述
      let executionInput = null;
      let currentElement = input.parentElement;

      // 向上查找，直到找到包含执行描述的容器
      while (currentElement && !executionInput) {
        executionInput = currentElement.querySelector('input[placeholder*="执行描述"], textarea[placeholder*="执行描述"]');
        if (!executionInput) {
          currentElement = currentElement.parentElement;
        }
      }

      if (!executionInput || !executionInput.value) {
        console.log(`⚠️ 工具输入框 ${index + 1} 没有找到执行描述或执行描述为空`);
        return;
      }

      const executionDescription = executionInput.value.trim();
      console.log(`🔍 工具输入框 ${index + 1} 的执行描述:`, executionDescription);

      // 设置匹配中状态
      input.value = '🔄 匹配中...';
      input.placeholder = '🔄 匹配中...';

      // 进行异步智能匹配
      smartMatchTool(executionDescription).then(matchedTool => {
        if (matchedTool) {
          console.log(`✅ 工具输入框 ${index + 1} 匹配结果:`, matchedTool.name);

          // 直接更新input的值
          input.value = matchedTool.name;
          input.placeholder = '输入工具名称...';

          // 触发input事件
          const inputEvent = new Event('input', { bubbles: true });
          input.dispatchEvent(inputEvent);

          // 触发change事件
          const changeEvent = new Event('change', { bubbles: true });
          input.dispatchEvent(changeEvent);

          console.log(`🎯 工具输入框 ${index + 1} 已更新为:`, matchedTool.name);
        } else {
          console.log(`❌ 工具输入框 ${index + 1} 未找到匹配的工具`);
          // 设置为默认工具
          input.value = '🤖 DeepSeek聊天模型';
          input.placeholder = '输入工具名称...';

          // 触发事件
          const inputEvent = new Event('input', { bubbles: true });
          input.dispatchEvent(inputEvent);
          const changeEvent = new Event('change', { bubbles: true });
          input.dispatchEvent(changeEvent);

          console.log(`🎯 工具输入框 ${index + 1} 设置为默认工具: DeepSeek聊天模型`);
        }
      }).catch(error => {
        console.error(`❌ 工具输入框 ${index + 1} 匹配失败:`, error);
        // 设置为默认工具
        input.value = '🤖 DeepSeek聊天模型';
        input.placeholder = '输入工具名称...';
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);
        console.log(`🎯 工具输入框 ${index + 1} 设置为默认工具: DeepSeek聊天模型`);
      });
    });

  } catch (error) {
    console.error('❌ 实时智能工具匹配失败:', error);
  }
};

// 延迟智能工具匹配函数 - 保留作为备用
const performDelayedToolMatching = (messageContent) => {
  console.log('🔍 开始分析完整消息内容进行智能工具匹配');

  try {
    // 使用更全面的方法查找所有input和textbox元素
    const allInputs = document.querySelectorAll('input, textbox, [role="textbox"]');
    console.log(`🔍 页面中总共找到 ${allInputs.length} 个input/textbox元素`);

    let matchingInputs = [];

    // 遍历所有input/textbox元素，查找包含"匹配中"的元素
    allInputs.forEach((input, index) => {
      const value = input.value || '';
      const placeholder = input.placeholder || '';
      const textContent = input.textContent || '';
      const innerText = input.innerText || '';

      // 查找包含"匹配中"的元素或工具名称输入框
      if (value.includes('匹配中') || placeholder.includes('匹配中') ||
          textContent.includes('匹配中') || innerText.includes('匹配中') ||
          placeholder.includes('输入工具名称') || placeholder.includes('工具名称')) {
        console.log(`🔍 找到匹配中的元素 ${index}:`, {
          tagName: input.tagName,
          value: value,
          placeholder: placeholder,
          textContent: textContent,
          innerText: innerText,
          element: input
        });
        matchingInputs.push(input);
      }
    });

    console.log(`📋 找到 ${matchingInputs.length} 个匹配中的工具选择器`);

    // 如果没有找到，尝试更宽泛的搜索
    if (matchingInputs.length === 0) {
      console.log('🔍 使用更宽泛的搜索方式...');

      allInputs.forEach((input, index) => {
        const value = input.value || '';
        const placeholder = input.placeholder || '';
        const textContent = input.textContent || '';
        const innerText = input.innerText || '';

        // 查找包含旋转图标的元素
        if (value.includes('🔄') || placeholder.includes('🔄') ||
            textContent.includes('🔄') || innerText.includes('🔄')) {
          console.log(`🔍 找到包含旋转图标的元素 ${index}:`, {
            tagName: input.tagName,
            value: value,
            placeholder: placeholder,
            textContent: textContent,
            innerText: innerText,
            element: input
          });
          matchingInputs.push(input);
        }
      });

      console.log(`📋 宽泛搜索找到 ${matchingInputs.length} 个工具选择器`);
    }

    // 处理找到的工具相关输入框
    matchingInputs.forEach((input, index) => {
      console.log(`🔍 处理工具输入框 ${index + 1}:`, input);

      // 判断是否是工具名称输入框
      const placeholder = input.placeholder || '';
      const isToolNameInput = placeholder.includes('输入工具名称') || placeholder.includes('工具名称');

      if (!isToolNameInput) {
        console.log(`⚠️ 跳过非工具名称输入框 ${index + 1}`);
        return;
      }

      // 查找对应的执行描述输入框
      // 首先尝试在同一个父容器中查找
      let executionInput = null;
      let currentElement = input.parentElement;

      // 向上查找，直到找到包含执行描述的容器
      while (currentElement && !executionInput) {
        executionInput = currentElement.querySelector('input[placeholder*="执行描述"], textarea[placeholder*="执行描述"]');
        if (!executionInput) {
          currentElement = currentElement.parentElement;
        }
      }

      if (!executionInput || !executionInput.value) {
        console.log(`⚠️ 工具输入框 ${index + 1} 没有找到执行描述或执行描述为空`);
        return;
      }

      const executionDescription = executionInput.value.trim();
      console.log(`🔍 工具输入框 ${index + 1} 的执行描述:`, executionDescription);

      // 进行异步智能匹配
      smartMatchTool(executionDescription).then(matchedTool => {
        if (matchedTool) {
          console.log(`✅ 工具输入框 ${index + 1} 匹配结果:`, matchedTool.name);

          // 直接更新input的值
          input.value = matchedTool.name;

          // 触发input事件
          const inputEvent = new Event('input', { bubbles: true });
          input.dispatchEvent(inputEvent);

          // 触发change事件
          const changeEvent = new Event('change', { bubbles: true });
          input.dispatchEvent(changeEvent);

          console.log(`🎯 工具输入框 ${index + 1} 已更新为:`, matchedTool.name);
        } else {
          console.log(`❌ 工具输入框 ${index + 1} 未找到匹配的工具`);
          // 设置为默认工具
          input.value = '🤖 DeepSeek聊天模型';

          // 触发事件
          const inputEvent = new Event('input', { bubbles: true });
          input.dispatchEvent(inputEvent);
          const changeEvent = new Event('change', { bubbles: true });
          input.dispatchEvent(changeEvent);

          console.log(`🎯 工具输入框 ${index + 1} 设置为默认工具: DeepSeek聊天模型`);
        }
      }).catch(error => {
        console.error(`❌ 工具输入框 ${index + 1} 匹配失败:`, error);
        // 设置为默认工具
        input.value = '🤖 DeepSeek聊天模型';
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);
        console.log(`🎯 工具输入框 ${index + 1} 设置为默认工具: DeepSeek聊天模型`);
      });
    });

  } catch (error) {
    console.error('❌ 延迟智能工具匹配失败:', error);
  }
};

// ChatBox 组件：在页面右侧展示聊天记录，并允许用户输入消息
// 现在支持智能意图识别和自动选择回复方式
const ChatBox = ({ messages, onSendMessage, loadingState, onClose, className, isCollapsed }) => {
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  // 生成会话ID
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [sessionId]);

  // 当新的消息到来时，自动滚动到底部
  useEffect(() => {
    // 确保滚动只在聊天容器内进行，不影响整个页面
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.closest('.chatbox-messages');
      if (chatContainer) {
        // 使用容器的scrollTop而不是scrollIntoView，避免影响页面布局
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (trimmed && !isStreaming) {
      // 立即清空输入框，提升用户体验
      setInputValue('');

      // 重置 textarea 高度
      const textarea = document.querySelector('.chatbox-input textarea');
      if (textarea) {
        textarea.style.height = '40px';
      }

      // 智能意图识别和自动路由
      await handleIntelligentMessage(trimmed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };



  // 智能消息处理函数 - 自动判断意图并选择合适的回复方式
  const handleIntelligentMessage = async (userInput) => {
    try {
      console.log('🤖 开始智能消息处理:', userInput);

      // 第一步：意图识别
      const intent = await detectIntent(userInput);
      console.log('🎯 识别意图:', intent);

      // 第二步：根据意图选择处理方式
      if (intent === 'workflow_generation') {
        // 工作流生成意图：生成思维导图工作流
        console.log('🔄 使用工作流生成模式');
        onSendMessage(userInput, 'workflow_generation');
        await handleWorkflowGeneration(userInput);
      } else if (intent === 'planning' || intent === 'mindmap' || intent === 'task_planning') {
        // 规划类意图：使用流式输出
        console.log('📋 使用智能规划模式（流式输出）');
        onSendMessage(userInput, 'intelligent_planning');
        await handleIntelligentPlanningStream(userInput);
      } else {
        // 聊天类意图：使用普通聊天（只添加用户消息，不调用App.js的API处理）
        console.log('💬 使用普通聊天模式');

        // 只添加用户消息到界面，不触发App.js的API调用
        const userMessage = { id: Date.now(), text: userInput, sender: 'user' };
        if (onSendMessage.addUserMessage) {
          onSendMessage.addUserMessage(userMessage);
        }

        // ChatBox内部处理聊天API调用
        await handleChatMessage(userInput, intent);
      }
    } catch (error) {
      console.error('🚨 智能消息处理失败:', error);
      // 降级到普通聊天（不重复调用onSendMessage，因为上面已经调用过了）
      await handleChatMessage(userInput, 'chat');
    }
  };



  // 意图识别函数
  const detectIntent = async (text) => {
    try {
      // 使用现有的意图识别逻辑
      const response = await fetch('/detect_intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.intent || 'chat';
      } else {
        console.warn('意图识别API失败，使用快速规则');
        return quickIntentDetection(text);
      }
    } catch (error) {
      console.warn('意图识别失败，使用快速规则:', error);
      return quickIntentDetection(text);
    }
  };

  // 快速意图识别（本地规则）
  const quickIntentDetection = (text) => {
    const planningKeywords = [
      '制定', '规划', '计划', '学习', '安排', '设计', '创建', '生成', '建立',
      'plan', 'create', 'make', 'design', 'generate', 'build', 'develop'
    ];

    // 工作流生成关键词
    const workflowKeywords = [
      '工作流', '流程', '步骤', '思维导图', '流程图', '任务流程', '操作流程',
      'workflow', 'process', 'steps', 'mindmap', 'flowchart', 'procedure'
    ];

    const textLower = text.toLowerCase();
    const hasPlanningKeyword = planningKeywords.some(keyword =>
      textLower.includes(keyword)
    );
    const hasWorkflowKeyword = workflowKeywords.some(keyword =>
      textLower.includes(keyword)
    );

    // 工作流生成意图检测
    if (hasWorkflowKeyword ||
        (hasPlanningKeyword && (textLower.includes('流程') || textLower.includes('步骤') || textLower.includes('导图')))) {
      return 'workflow_generation';
    }

    // 长文本且包含规划关键词 -> planning
    if (text.length > 50 && hasPlanningKeyword) {
      return 'planning';
    }

    // 包含明确的规划关键词 -> planning
    if (hasPlanningKeyword) {
      return 'planning';
    }

    // 默认为聊天
    return 'chat';
  };

  // 普通聊天处理函数
  const handleChatMessage = async (userInput, intent) => {
    try {
      console.log('💬 发送普通聊天请求:', userInput);

      // 创建AI消息占位符
      const messageId = Date.now() + 1;
      const initialMessage = {
        id: messageId,
        text: '',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'chat',
        isThinking: true  // 标记为思考状态
      };

      if (onSendMessage.addAIMessage) {
        onSendMessage.addAIMessage(initialMessage);
      }

      // 尝试调用真实的AI API (流式输出)
      try {
        const response = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: userInput,
            intent: intent,
            model: 'deepseek-chat',
            history: []
          }),
        });

        if (response.ok) {
          // 检查是否是流式响应
          const contentType = response.headers.get('content-type');
          console.log('🔍 响应Content-Type:', contentType);
          if (contentType && contentType.includes('text/event-stream')) {
            console.log('✅ 检测到流式响应，开始处理...');
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            let roleInfo = null;

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));

                      if (data.type === 'role_info') {
                        roleInfo = data.role_info;
                        console.log('🎭 角色信息:', roleInfo);
                      } else if (data.type === 'chat_start') {
                        // 开始流式输出，清空思考状态
                        accumulatedText = '';
                        const streamingMessage = {
                          id: messageId,
                          text: '',
                          sender: 'ai',
                          timestamp: new Date().toISOString(),
                          type: 'chat',
                          isStreaming: true,
                          isThinking: false,  // 清除思考状态
                          roleInfo: roleInfo
                        };
                        if (onSendMessage.updateAIMessage) {
                          onSendMessage.updateAIMessage(messageId, streamingMessage);
                        }
                      } else if (data.type === 'chat_chunk') {
                        // 累积文本内容
                        accumulatedText += data.content;
                        console.log(`📝 收到chunk: "${data.content}", 累积文本: "${accumulatedText}"`);

                        // 强制DOM更新，确保每个chunk都能立即显示
                        const streamingMessage = {
                          id: messageId,
                          text: accumulatedText,
                          sender: 'ai',
                          timestamp: new Date().toISOString(),
                          type: 'chat',
                          isStreaming: true,
                          roleInfo: roleInfo
                        };
                        if (onSendMessage.updateAIMessage) {
                          onSendMessage.updateAIMessage(messageId, streamingMessage);
                          // 强制React重新渲染
                          await new Promise(resolve => setTimeout(resolve, 0));
                        }
                      } else if (data.type === 'chat_end') {
                        // 流式输出结束
                        const finalMessage = {
                          id: messageId,
                          text: accumulatedText,
                          sender: 'ai',
                          timestamp: new Date().toISOString(),
                          type: 'chat',
                          isStreaming: false,
                          roleInfo: roleInfo
                        };
                        if (onSendMessage.updateAIMessage) {
                          onSendMessage.updateAIMessage(messageId, finalMessage);
                        }
                      } else if (data.type === 'error') {
                        throw new Error(data.message);
                      }
                    } catch (parseError) {
                      console.warn('解析流式数据失败:', parseError, line);
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }
            return;
          } else if (contentType && contentType.includes('application/json')) {
            // 降级到非流式响应
            const data = await response.json();
            const finalMessage = {
              id: messageId,
              text: data.response || data.message || '抱歉，我现在无法回答这个问题。',
              sender: 'ai',
              timestamp: new Date().toISOString(),
              type: 'chat'
            };
            if (onSendMessage.updateAIMessage) {
              onSendMessage.updateAIMessage(messageId, finalMessage);
            }
            return;
          } else {
            // 非JSON响应，可能是代理错误页面
            const text = await response.text();
            throw new Error(`服务器返回非预期响应: ${text.substring(0, 100)}...`);
          }
        } else {
          // 尝试读取错误响应
          const errorText = await response.text();
          if (errorText.includes('Proxy error')) {
            throw new Error('后端服务未启动，代理连接失败');
          } else {
            throw new Error(`API响应错误: ${response.status} - ${errorText.substring(0, 100)}`);
          }
        }
      } catch (apiError) {
        console.warn('💬 API调用失败，使用本地响应:', apiError.message);

        // 降级到本地响应
        await new Promise(resolve => setTimeout(resolve, 1000));
        const chatResponse = generateChatResponse(userInput);

        // 更新消息内容
        const finalMessage = {
          id: messageId,
          text: chatResponse,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: 'chat'
        };

        if (onSendMessage.updateAIMessage) {
          onSendMessage.updateAIMessage(messageId, finalMessage);
        }
      }
    } catch (error) {
      console.error('💬 聊天处理失败:', error);

      // 显示错误消息
      const errorMessage = {
        id: Date.now() + 1,
        text: `出错了：${error.message}`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'error'
      };

      if (onSendMessage.addAIMessage) {
        onSendMessage.addAIMessage(errorMessage);
      }
    }
  };

  // 生成聊天响应
  const generateChatResponse = (userInput) => {
    const input = userInput.toLowerCase();

    // 问候语
    if (input.includes('你好') || input.includes('hello') || input.includes('hi')) {
      return '你好！我是AI智能助手，很高兴为您服务！有什么可以帮助您的吗？ 😊';
    }

    // 感谢
    if (input.includes('谢谢') || input.includes('thank')) {
      return '不客气！如果还有其他问题，随时可以问我。我很乐意帮助您！ 🤗';
    }

    // 告别
    if (input.includes('再见') || input.includes('bye') || input.includes('goodbye')) {
      return '再见！祝您有美好的一天！如果以后有任何问题，随时欢迎回来找我。 👋';
    }

    // 询问能力
    if (input.includes('你能') || input.includes('你会') || input.includes('功能')) {
      return `我是一个智能助手，可以帮助您：

🤖 **智能对话**：回答各种问题，进行日常交流
📋 **智能规划**：制定学习计划、工作安排等
💡 **建议咨询**：提供专业建议和解决方案
🔍 **信息整理**：帮助分析和整理信息

您可以直接告诉我您的需求，我会自动选择最合适的方式来帮助您！`;
    }

    // 学习相关
    if (input.includes('学习') || input.includes('教程') || input.includes('怎么学')) {
      return `关于学习，我有一些建议：

📚 **制定计划**：如果您想要详细的学习计划，可以告诉我具体想学什么，我会为您制定完整的规划
🎯 **明确目标**：先确定学习目标和时间安排
💪 **持续练习**：理论结合实践，多动手操作
🤝 **交流讨论**：遇到问题及时提问

您想学习什么内容呢？我可以为您制定详细的学习计划！`;
    }

    // 技术相关
    if (input.includes('编程') || input.includes('代码') || input.includes('开发')) {
      return `编程学习是一个很棒的选择！

🚀 **热门技术栈**：
- 前端：React、Vue、JavaScript、TypeScript
- 后端：Python、Node.js、Java、Go
- 数据库：MySQL、MongoDB、Redis
- 工具：Git、Docker、VS Code

💡 **学习建议**：
1. 选择一个方向深入学习
2. 多做项目实践
3. 阅读优秀的开源代码
4. 参与技术社区交流

您对哪个技术栈比较感兴趣？我可以为您制定具体的学习路线！`;
    }

    // 默认响应
    const responses = [
      `关于「${userInput}」，这确实是一个很有意思的话题！`,
      `您提到的「${userInput}」让我想到了很多相关的内容。`,
      `「${userInput}」是一个值得深入探讨的问题。`,
      `我理解您对「${userInput}」的关注。`,
      `关于「${userInput}」，我来为您分析一下。`
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return `${randomResponse}

如果您需要更详细的规划或分析，请告诉我具体的需求，我会为您制定完整的方案！

💡 **提示**：您可以说"制定一个学习计划"或"帮我规划一下"来获得更详细的智能规划服务。`;
  };

  // 工作流生成处理函数
  const handleWorkflowGeneration = async (userInput) => {
    // 创建AI消息占位符
    const messageId = Date.now() + 1;

    try {
      console.log('🔄 开始生成工作流:', userInput);

      const initialMessage = {
        id: messageId,
        text: '正在分析您的需求并生成工作流...',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'workflow_generation',
        isThinking: true
      };

      if (onSendMessage.addAIMessage) {
        onSendMessage.addAIMessage(initialMessage);
      }

      // 调用工作流生成API
      const response = await fetch('/api/intelligent-workflow/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: userInput,
          context: {}
        }),
      });

      if (!response.ok) {
        throw new Error(`工作流生成失败: ${response.status}`);
      }

      const workflowData = await response.json();
      console.log('🎯 工作流生成成功:', workflowData);

      // 更新消息内容
      const successMessage = {
        id: messageId,
        text: `已为您生成工作流「${workflowData.workflow.name}」！\n\n📋 **工作流包含**：\n- ${workflowData.workflow.nodes.length} 个节点\n- ${workflowData.workflow.connections.length} 个连接\n\n✨ 工作流已自动添加到画布中，您可以直接使用或进一步编辑。`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'workflow_generation',
        isThinking: false,
        workflowData: workflowData
      };

      if (onSendMessage.updateAIMessage) {
        onSendMessage.updateAIMessage(messageId, successMessage);
      }

      // 将工作流添加到画布
      if (onSendMessage.addWorkflowToCanvas) {
        onSendMessage.addWorkflowToCanvas(workflowData.workflow);
      }

    } catch (error) {
      console.error('🚨 工作流生成失败:', error);

      // 更新错误消息
      const errorMessage = {
        id: messageId,
        text: `抱歉，工作流生成失败了。错误信息：${error.message}\n\n💡 您可以尝试重新描述您的需求，或者使用更具体的描述。`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'workflow_generation',
        isThinking: false,
        isError: true
      };

      if (onSendMessage.updateAIMessage) {
        onSendMessage.updateAIMessage(messageId, errorMessage);
      }
    }
  };

  // 流式智能规划处理函数
  const handleIntelligentPlanningStream = async (userInput) => {
    setIsStreaming(true);

    try {
      console.log('🧠 发送流式智能规划请求:', userInput);

      // 创建一个空的AI消息，用于流式更新
      const messageId = Date.now() + 1;
      setStreamingMessageId(messageId);

      const initialMessage = {
        id: messageId,
        text: '',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        type: 'intelligent_planning',
        isStreaming: true
      };

      // 添加初始空消息
      if (onSendMessage.addAIMessage) {
        onSendMessage.addAIMessage(initialMessage);
      }

      // 测试模式：模拟流式输出（仅在包含"测试模拟"关键词时启用）
      if (userInput.includes('测试模拟')) {
        await simulateStreamingResponse(messageId, userInput);
        return;
      }

      // 尝试连接真实的AI API
      try {
        const response = await fetch('http://localhost:8000/api/intelligent-planning/analyze-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_input: userInput,
            session_id: sessionId,
            context: {}
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'intent') {
                console.log('🎯 识别意图:', data.intent);
              } else if (data.type === 'start') {
                console.log('🚀 开始流式输出，总长度:', data.total_length);
              } else if (data.type === 'chunk') {
                // 逐字添加到累积文本
                const previousText = accumulatedText;
                accumulatedText += data.char;

                // 检测是否有新的步骤生成（检测步骤标题模式）
                const stepPatterns = [
                  /### ▶️ \*\*步骤\d+[：:]/,
                  /## ▶️ \*\*步骤\d+[：:]/,
                  /\*\*推荐工具\*\*[：:]/,
                  /\*\*执行描述\*\*[：:]/
                ];

                let hasNewStep = false;
                for (const pattern of stepPatterns) {
                  if (pattern.test(accumulatedText) && !pattern.test(previousText)) {
                    hasNewStep = true;
                    console.log('🔍 检测到新步骤生成，准备实时工具匹配');
                    break;
                  }
                }

                // 检测是否是JSON格式，如果是则尝试转换为用户友好格式
                let displayText = accumulatedText;
                if (accumulatedText.trim().startsWith('{') && accumulatedText.includes('"detailedSteps"')) {
                  try {
                    // 尝试解析JSON并转换为用户友好格式
                    let jsonText = accumulatedText.trim();
                    if (jsonText.includes('```json')) {
                      const startIndex = jsonText.indexOf('{');
                      const endIndex = jsonText.lastIndexOf('}') + 1;
                      if (startIndex !== -1 && endIndex > startIndex) {
                        jsonText = jsonText.substring(startIndex, endIndex);
                      }
                    }

                    const jsonData = JSON.parse(jsonText);
                    if (jsonData.detailedSteps && Array.isArray(jsonData.detailedSteps)) {
                      displayText = generateUserFriendlyText(jsonData);
                      console.log('🎨 流式输出：JSON转换为用户友好格式');
                    }
                  } catch (e) {
                    // JSON解析失败，继续显示原始文本
                    console.log('🔄 流式输出：JSON解析失败，显示原始文本');
                  }
                }

                // 更新消息
                if (onSendMessage.updateAIMessage) {
                  onSendMessage.updateAIMessage(messageId, {
                    text: displayText,
                    rawText: accumulatedText, // 保留原始文本
                    isStreaming: true
                  });
                }

                // 如果检测到新步骤，延迟触发实时工具匹配
                if (hasNewStep) {
                  setTimeout(() => {
                    console.log('🚀 触发实时工具匹配');
                    performRealtimeToolMatching(accumulatedText, messageId);
                  }, 100); // 短延迟确保DOM更新
                }

              } else if (data.type === 'complete') {
                console.log('✅ 流式输出完成');

                // 检测是否是工作流内容
                const isWorkflow = detectWorkflowContent(accumulatedText);
                let workflowSummary = null;

                if (isWorkflow) {
                  workflowSummary = parseWorkflowContent(accumulatedText);
                  console.log('🔧 检测到工作流内容，生成摘要:', workflowSummary);
                }

                // 标记流式输出完成
                if (onSendMessage.updateAIMessage) {
                  onSendMessage.updateAIMessage(messageId, {
                    text: accumulatedText,
                    isStreaming: false,
                    rawData: data,
                    isWorkflow: isWorkflow,
                    workflowSummary: workflowSummary,
                    isCollapsed: isWorkflow // 工作流默认收缩显示
                  });
                }

                // 流式输出完成后，触发智能工具匹配
                if (isWorkflow) {
                  setTimeout(() => {
                    console.log('🚀 开始执行流式输出完成后的智能工具匹配');
                    performDelayedToolMatching(accumulatedText);
                  }, 500); // 延迟500ms确保DOM更新完成
                }

              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('解析SSE数据失败:', parseError);
            }
          }
        }
      }

      } catch (apiError) {
        console.warn('🧠 API调用失败，降级到模拟响应:', apiError);

        // 降级到模拟流式输出
        await simulateStreamingResponse(messageId, userInput);
        return;
      }
    } catch (error) {
      console.error('流式智能规划请求失败:', error);

      // 尝试降级到模拟响应
      try {
        console.log('🔄 尝试降级到模拟响应...');
        await simulateStreamingResponse(streamingMessageId, userInput);
      } catch (fallbackError) {
        console.error('模拟响应也失败了:', fallbackError);

        // 最终错误处理
        if (onSendMessage.updateAIMessage && streamingMessageId) {
          onSendMessage.updateAIMessage(streamingMessageId, {
            text: `智能规划分析失败: ${error.message}`,
            type: 'error',
            isStreaming: false
          });
        }
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  // 模拟流式输出函数
  const simulateStreamingResponse = async (messageId, userInput) => {
    const sampleResponse = `# ${userInput.includes('Vue') ? 'Vue.js' : userInput.includes('React') ? 'React' : 'JavaScript'} 学习计划

## 🎯 学习目标
通过系统性学习，掌握现代前端开发技能，能够独立完成项目开发。

## 📋 第1周：基础准备
### 环境搭建
- 安装 Node.js 和 npm
- 配置开发环境
- 学习基本的命令行操作

### 前置知识复习
- **HTML5** 语义化标签
- **CSS3** 布局和动画
- **JavaScript ES6+** 语法

## 📋 第2周：核心概念
### 组件化开发
- 理解组件的概念
- 学习组件的生命周期
- 掌握组件间通信

### 状态管理
- 本地状态管理
- 全局状态管理
- 数据流向理解

## 📋 第3周：实战练习
### 项目实践
- 创建第一个应用
- 实现常见功能
- 调试和优化

### 最佳实践
- 代码规范
- 性能优化
- 测试方法

## 📊 时间安排表

| 周次 | 主要内容 | 学习时间 | 实践项目 |
|------|----------|----------|----------|
| 第1周 | 基础准备 | 10小时 | 环境搭建 |
| 第2周 | 核心概念 | 15小时 | 组件练习 |
| 第3周 | 实战练习 | 20小时 | 完整项目 |

## 💡 学习建议
1. **循序渐进**：不要急于求成，扎实掌握每个概念
2. **多动手**：理论结合实践，多写代码
3. **持续学习**：技术更新快，保持学习热情

---
*祝您学习愉快！如有问题随时交流。*`;

    let accumulatedText = '';

    // 模拟逐字输出
    for (let i = 0; i < sampleResponse.length; i++) {
      accumulatedText += sampleResponse[i];

      // 更新消息
      if (onSendMessage.updateAIMessage) {
        onSendMessage.updateAIMessage(messageId, {
          text: accumulatedText,
          isStreaming: true
        });
      }

      // 模拟打字机延迟（可调整速度）
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    // 标记完成
    if (onSendMessage.updateAIMessage) {
      onSendMessage.updateAIMessage(messageId, {
        text: accumulatedText,
        isStreaming: false,
        rawData: { session_id: sessionId }
      });
    }
  };






  // 简化的步骤内容解析 - 使用更可靠的方法
  const parseStepContent = (text) => {
    console.log('🔍 [parseStepContent] 开始解析步骤内容');
    console.log('🔍 [parseStepContent] 原始文本长度:', text.length);
    console.log('🔍 [parseStepContent] 原始文本前200字符:', text.substring(0, 200));

    // 尝试直接从文本中提取结构化信息
    const lines = text.split('\n');
    let title = '';
    const steps = [];
    const detailedSteps = [];

    console.log('🔍 [parseStepContent] 总行数:', lines.length);

    // 提取标题
    for (const line of lines) {
      if (line.match(/^#{1,3}\s*(.+)/)) {
        title = line.replace(/^#{1,3}\s*/, '').trim();
        break;
      }
    }

    // 尝试从DOM中提取实际的步骤信息（包括用户填写的工具和执行描述）
    const extractedSteps = extractStepsFromDOM();
    if (extractedSteps.length > 0) {
      console.log('🔍 [parseStepContent] 从DOM中提取到步骤信息:', extractedSteps);
      return {
        title: title || '执行步骤',
        stepCount: extractedSteps.length,
        steps: extractedSteps.map(step => step.title).slice(0, 5),
        detailedSteps: extractedSteps
      };
    }

    // 解析详细步骤信息
    let currentStep = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 匹配步骤标题：### 📋 ▶️ **步骤1：标题** 或 ## 步骤1: 标题 或 ## 1. 标题
      let stepMatch = null;
      let stepTitle = '';

      // 尝试匹配不同的步骤格式 - 更宽松的匹配
      // 匹配任何包含"步骤"和数字的行，包括新的格式：### ▶️ **步骤1：标题**
      if (line.includes('步骤') && line.match(/步骤\s*\d+/)) {
        console.log('🔍 [parseStepContent] 找到步骤行:', line);
        // 提取步骤标题，去除所有格式符号
        const cleanLine = line.replace(/^#{1,6}\s*/, '').replace(/▶️\s*/, '').replace(/\*\*/g, '').trim();
        console.log('🔍 [parseStepContent] 清理后的行:', cleanLine);
        const match = cleanLine.match(/步骤\s*(\d+)[：:]\s*(.+)/);
        if (match) {
          stepMatch = match;
          stepTitle = match[2].trim();
          console.log('🔍 [parseStepContent] 匹配成功，步骤标题:', stepTitle);
        } else {
          console.log('🔍 [parseStepContent] 正则匹配失败');
        }
      }
      // 匹配格式：### 1. 标题
      else if (line.match(/^#{2,3}\s*\d+\./)) {
        stepMatch = line.match(/^#{2,3}\s*(\d+)\.\s*(.+)/);
        if (stepMatch) {
          stepTitle = stepMatch[2];
        }
      }

      if (stepMatch) {
        // 保存上一个步骤
        if (currentStep) {
          detailedSteps.push(currentStep);
          steps.push(currentStep.title);
        }

        // 开始新步骤 - 提取步骤标题
        stepTitle = stepTitle.trim();
        currentStep = {
          title: stepTitle,
          content: '',
          tool: '',
          parameters: '',
          aiDescription: ''
        };
      }
      // 解析步骤详细信息
      else if (currentStep) {
        // 处理第一行内容（步骤描述）
        if (line.startsWith('- ') && !line.includes('**') && !currentStep.content) {
          currentStep.content = line.replace(/^-\s*/, '').trim();
        }
        // 处理带标签的行 - 使用更简单可靠的解析方法
        else if (line.startsWith('**') || line.startsWith('- **') || (line.startsWith('- ') && line.includes('**'))) {
          console.log('🔍 [parseStepContent] 处理标签行:', line);

          // 简化的解析逻辑：直接查找关键词和冒号
          const cleanLine = line.replace(/^-?\s*/, '').trim(); // 移除开头的 "- "

          if (cleanLine.includes('操作内容：') || cleanLine.includes('操作内容:')) {
            const content = cleanLine.split(/[：:]/)[1]?.trim();
            if (content) {
              currentStep.content = content;
              console.log('✅ [parseStepContent] 提取到操作内容:', content);
            }
          }
          else if (cleanLine.includes('建议工具：') || cleanLine.includes('推荐工具：') ||
                   cleanLine.includes('建议工具:') || cleanLine.includes('推荐工具:')) {
            // 直接分割字符串获取工具名称
            const toolParts = cleanLine.split(/[：:]/);
            if (toolParts.length >= 2) {
              const toolName = toolParts[1].trim();
              if (toolName) {
                currentStep.tool = toolName;
                currentStep.toolName = toolName;
                console.log('✅ [parseStepContent] 提取到工具:', toolName);
              }
            }
          }
          else if (cleanLine.includes('参数信息：') || cleanLine.includes('参数信息:')) {
            const params = cleanLine.split(/[：:]/)[1]?.trim();
            if (params) {
              currentStep.parameters = params;
              console.log('✅ [parseStepContent] 提取到参数信息:', params);
            }
          }
          else if (cleanLine.includes('AI执行描述：') || cleanLine.includes('执行描述：') ||
                   cleanLine.includes('执行指令：') || cleanLine.includes('AI执行描述:') ||
                   cleanLine.includes('执行描述:') || cleanLine.includes('执行指令:')) {
            // 直接分割字符串获取执行描述
            const descParts = cleanLine.split(/[：:]/);
            if (descParts.length >= 2) {
              const description = descParts[1].trim();
              if (description) {
                currentStep.aiDescription = description;
                currentStep.executionDescription = description;
                console.log('✅ [parseStepContent] 提取到执行描述:', description);
              }
            }
          }
        }
      }
    }

    // 保存最后一个步骤
    if (currentStep) {
      detailedSteps.push(currentStep);
      steps.push(currentStep.title);
    }

    // 如果没有解析到步骤，尝试从列表项中提取（支持学习路径格式）
    if (detailedSteps.length === 0) {
      console.log('🔍 [parseStepContent] 没有找到标准步骤格式，尝试从列表项提取');

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 匹配列表项格式：• 书籍：、• 在线课程：、• 工具：等
        if (trimmedLine.match(/^[•·*-]\s*(.+)[：:]?\s*$/)) {
          const itemText = trimmedLine.replace(/^[•·*-]\s*/, '').replace(/[：:]\s*$/, '').trim();

          // 过滤掉无效的项目
          if (itemText && itemText !== '...' && itemText.length > 2 && !itemText.includes('个步骤')) {
            const step = {
              title: itemText,
              content: itemText,
              tool: 'DeepSeek聊天模型',
              toolName: 'DeepSeek聊天模型',
              parameters: '',
              aiDescription: `完成${itemText}相关任务`,
              executionDescription: `完成${itemText}相关任务`
            };

            // 根据内容类型智能选择工具
            if (itemText.includes('基础') || itemText.includes('入门') || itemText.includes('学习') || itemText.includes('理论')) {
              step.tool = 'DeepSeek聊天模型';
              step.toolName = 'DeepSeek聊天模型';
              step.executionDescription = `学习${itemText}的相关知识和技能`;
            } else if (itemText.includes('实践') || itemText.includes('项目') || itemText.includes('开发') || itemText.includes('编程')) {
              step.tool = '代码执行工具';
              step.toolName = '代码执行工具';
              step.executionDescription = `通过实际项目练习${itemText}`;
            } else if (itemText.includes('工具') || itemText.includes('环境') || itemText.includes('配置')) {
              step.tool = '文件操作工具';
              step.toolName = '文件操作工具';
              step.executionDescription = `配置和使用${itemText}`;
            }

            steps.push(step.title);
            detailedSteps.push(step);
            console.log('✅ [parseStepContent] 从列表项提取步骤:', step.title);
          }
        }

        // 匹配学习阶段格式：一、基础准备阶段、二、核心爬虫技术等
        else if (trimmedLine.match(/^[一二三四五六七八九十]+[、．]\s*(.+)$/)) {
          const stageMatch = trimmedLine.match(/^[一二三四五六七八九十]+[、．]\s*(.+)$/);
          if (stageMatch) {
            const stageTitle = stageMatch[1].trim();
            const step = {
              title: stageTitle,
              content: stageTitle,
              tool: 'DeepSeek聊天模型',
              toolName: 'DeepSeek聊天模型',
              parameters: '',
              aiDescription: `完成${stageTitle}阶段的学习任务`,
              executionDescription: `完成${stageTitle}阶段的学习任务`
            };

            steps.push(step.title);
            detailedSteps.push(step);
            console.log('✅ [parseStepContent] 从学习阶段提取步骤:', step.title);
          }
        }
      }
    }

    console.log('🔍 [parseStepContent] 解析完成');
    console.log('🔍 [parseStepContent] 标题:', title);
    console.log('🔍 [parseStepContent] 步骤数量:', steps.length);
    console.log('🔍 [parseStepContent] 步骤列表:', steps);
    console.log('🔍 [parseStepContent] 详细步骤:', detailedSteps);

    // 详细打印每个步骤的工具信息
    detailedSteps.forEach((step, index) => {
      console.log(`🔍 [parseStepContent] 步骤${index + 1}:`, {
        title: step.title,
        tool: step.tool,
        toolName: step.toolName,
        executionDescription: step.executionDescription,
        aiDescription: step.aiDescription
      });
    });

    const result = {
      title: title || '执行步骤',
      stepCount: steps.length,
      steps: steps.slice(0, 5), // 最多显示5个步骤概要
      detailedSteps: detailedSteps // 完整的步骤信息
    };

    console.log('🔍 [parseStepContent] 返回结果:', result);
    return result;
  };

  // 新增：简单可靠的步骤解析方法
  const parseStepContentSimple = (text) => {
    console.log('🔍 [parseStepContentSimple] 开始简单解析');

    // 使用正则表达式直接提取步骤信息
    const stepPattern = /###\s*▶️\s*\*\*步骤(\d+)：([^*]+)\*\*/g;
    const toolPattern = /\*\*推荐工具\*\*[：:]\s*([^\n]+)/g;
    const descPattern = /\*\*执行描述\*\*[：:]\s*([^\n]+)/g;

    const steps = [];
    const detailedSteps = [];
    let stepMatch;

    // 提取所有步骤标题
    while ((stepMatch = stepPattern.exec(text)) !== null) {
      const stepNumber = parseInt(stepMatch[1]);
      const stepTitle = stepMatch[2].trim();

      console.log(`🔍 找到步骤${stepNumber}: ${stepTitle}`);

      steps.push(stepTitle);

      // 为每个步骤创建详细信息
      detailedSteps.push({
        title: stepTitle,
        content: `步骤${stepNumber}的具体内容`,
        tool: '',
        toolName: '',
        parameters: '',
        aiDescription: '',
        executionDescription: ''
      });
    }

    // 提取工具信息
    const tools = [];
    let toolMatch;
    while ((toolMatch = toolPattern.exec(text)) !== null) {
      tools.push(toolMatch[1].trim());
      console.log('🔍 找到工具:', toolMatch[1].trim());
    }

    // 提取执行描述
    const descriptions = [];
    let descMatch;
    while ((descMatch = descPattern.exec(text)) !== null) {
      descriptions.push(descMatch[1].trim());
      console.log('🔍 找到执行描述:', descMatch[1].trim());
    }

    // 将工具和描述分配给步骤
    detailedSteps.forEach((step, index) => {
      if (tools[index]) {
        step.tool = tools[index];
        step.toolName = tools[index];
      }
      if (descriptions[index]) {
        step.aiDescription = descriptions[index];
        step.executionDescription = descriptions[index];
      }
    });

    console.log('🔍 [parseStepContentSimple] 解析完成，步骤数量:', detailedSteps.length);
    console.log('🔍 [parseStepContentSimple] 详细步骤:', detailedSteps);

    return {
      title: '📋 **执行步骤**',
      stepCount: detailedSteps.length,
      steps: steps.slice(0, 5),
      detailedSteps: detailedSteps
    };
  };

  // 从DOM中提取步骤信息（包括用户填写的工具和执行描述）
  const extractStepsFromDOM = () => {
    console.log('🔍 [extractStepsFromDOM] 开始从DOM中提取步骤信息');

    const extractedSteps = [];

    try {
      // 查找所有步骤标题
      const stepHeaders = document.querySelectorAll('h3[id*="步骤"], h3:contains("步骤")');
      console.log('🔍 [extractStepsFromDOM] 找到步骤标题数量:', stepHeaders.length);

      // 如果没有找到步骤标题，尝试更宽泛的搜索
      if (stepHeaders.length === 0) {
        const allH3 = document.querySelectorAll('h3');
        console.log('🔍 [extractStepsFromDOM] 所有h3标签数量:', allH3.length);

        allH3.forEach((h3, index) => {
          const text = h3.textContent || '';
          console.log(`🔍 [extractStepsFromDOM] h3[${index}]:`, text);

          if (text.includes('步骤') && text.match(/步骤\s*\d+/)) {
            console.log('🔍 [extractStepsFromDOM] 找到匹配的步骤:', text);

            // 提取步骤信息
            const stepInfo = extractStepInfoFromElement(h3);
            if (stepInfo) {
              extractedSteps.push(stepInfo);
            }
          }
        });
      } else {
        // 处理找到的步骤标题
        stepHeaders.forEach((header, index) => {
          console.log(`🔍 [extractStepsFromDOM] 处理步骤 ${index + 1}:`, header.textContent);
          const stepInfo = extractStepInfoFromElement(header);
          if (stepInfo) {
            extractedSteps.push(stepInfo);
          }
        });
      }

    } catch (error) {
      console.error('🔍 [extractStepsFromDOM] 提取步骤信息时出错:', error);
    }

    console.log('🔍 [extractStepsFromDOM] 提取完成，步骤数量:', extractedSteps.length);
    console.log('🔍 [extractStepsFromDOM] 提取的步骤:', extractedSteps);

    return extractedSteps;
  };

  // 从单个步骤元素中提取详细信息
  const extractStepInfoFromElement = (stepHeader) => {
    try {
      // 提取步骤标题
      const titleText = stepHeader.textContent || '';
      const titleMatch = titleText.match(/步骤\s*(\d+)[：:]\s*(.+)/);
      const stepTitle = titleMatch ? titleMatch[2].trim() : titleText.trim();

      console.log('🔍 [extractStepInfoFromElement] 步骤标题:', stepTitle);

      // 查找该步骤对应的容器
      let stepContainer = stepHeader.parentElement;
      while (stepContainer && !stepContainer.querySelector('input[placeholder*="工具名称"], input[placeholder*="执行描述"]')) {
        stepContainer = stepContainer.parentElement;
        if (stepContainer === document.body) break;
      }

      if (!stepContainer) {
        console.log('🔍 [extractStepInfoFromElement] 未找到步骤容器');
        return null;
      }

      // 提取工具名称
      const toolInput = stepContainer.querySelector('input[placeholder*="工具名称"]');
      const toolName = toolInput ? toolInput.value.trim() : '';

      // 提取执行描述
      const descInput = stepContainer.querySelector('input[placeholder*="执行描述"], textarea[placeholder*="执行描述"]');
      const executionDescription = descInput ? descInput.value.trim() : '';

      console.log('🔍 [extractStepInfoFromElement] 工具名称:', toolName);
      console.log('🔍 [extractStepInfoFromElement] 执行描述:', executionDescription);

      return {
        title: stepTitle,
        content: executionDescription || stepTitle,
        tool: toolName || 'DeepSeek聊天模型',
        parameters: '',
        aiDescription: executionDescription || stepTitle,
        executionDescription: executionDescription,
        toolName: toolName
      };

    } catch (error) {
      console.error('🔍 [extractStepInfoFromElement] 提取步骤信息时出错:', error);
      return null;
    }
  };

  // 处理生成工作流按钮点击
  const handleGenerateWorkflow = (message) => {
    try {
      console.log('🔄 开始生成工作流，消息数据:', message);

      // 检查消息是否包含步骤数据
      if (!message.stepSummary || !message.stepSummary.detailedSteps) {
        console.error('❌ 消息中没有找到步骤数据');
        alert('无法生成工作流：未找到步骤数据');
        return;
      }

      const steps = message.stepSummary.detailedSteps;
      console.log('📋 找到步骤数据:', steps);

      // 将步骤转换为思维导图节点
      const workflowData = convertStepsToWorkflow(steps, message.stepSummary.title);
      console.log('🎯 转换后的工作流数据:', workflowData);

      // 调用App.js的addWorkflowToCanvas方法
      if (onSendMessage.addWorkflowToCanvas) {
        onSendMessage.addWorkflowToCanvas(workflowData);
        console.log('✅ 工作流已添加到画布');
      } else {
        console.error('❌ addWorkflowToCanvas方法不可用');
        alert('无法添加工作流到画布：方法不可用');
      }

    } catch (error) {
      console.error('❌ 生成工作流失败:', error);
      alert(`生成工作流失败: ${error.message}`);
    }
  };

  // 将步骤转换为工作流数据
  const convertStepsToWorkflow = (steps, title) => {
    const nodes = [];
    const connections = [];

    // 创建开始节点
    const startNode = {
      id: 'start-node',
      type: 'customNode',
      position: { x: 100, y: 100 },
      data: {
        label: '开始',
        nodeType: 'start-topic-node',
        description: '工作流开始节点'
      }
    };
    nodes.push(startNode);

    // 为每个步骤创建节点
    let previousNodeId = 'start-node';
    steps.forEach((step, index) => {
      const nodeId = `step-${index + 1}`;

      // 创建步骤节点
      const stepNode = {
        id: nodeId,
        type: 'customNode',
        position: {
          x: 100 + (index + 1) * 300,
          y: 100
        },
        data: {
          label: step.title || `步骤 ${index + 1}`,
          nodeType: 'execution-node',
          description: step.content || step.aiDescription || '',
          tool: step.tool || '',
          parameters: step.parameters || '',
          aiDescription: step.aiDescription || '',
          // 添加执行节点特有的属性
          executionType: 'manual',
          status: 'pending',
          progress: 0
        }
      };
      nodes.push(stepNode);

      // 创建连接
      const connection = {
        id: `edge-${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2 }
      };
      connections.push(connection);

      previousNodeId = nodeId;
    });

    // 创建结束节点
    const endNodeId = 'end-node';
    const endNode = {
      id: endNodeId,
      type: 'customNode',
      position: {
        x: 100 + (steps.length + 1) * 300,
        y: 100
      },
      data: {
        label: '完成',
        nodeType: 'result-node',
        description: '工作流完成节点'
      }
    };
    nodes.push(endNode);

    // 连接最后一个步骤到结束节点
    const finalConnection = {
      id: `edge-${previousNodeId}-${endNodeId}`,
      source: previousNodeId,
      target: endNodeId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#7c3aed', strokeWidth: 2 }
    };
    connections.push(finalConnection);

    return {
      name: title || '智能生成的工作流',
      description: `包含 ${steps.length} 个步骤的工作流`,
      nodes: nodes,
      connections: connections
    };
  };

  // 智能节点类型识别 - 针对Office场景优化的关键词匹配逻辑
  const identifyNodeType = (stepTitle, stepDescription, stepIndex, totalSteps) => {
    const text = `${stepTitle} ${stepDescription}`.toLowerCase();

    // 针对Office场景优化的关键词映射
    const taskTypeKeywords = {
      'material-node': [
        // 明确需要用户提供文件的场景
        '上传', '导入', '选择文件', '打开文件', '加载文件', '读取文件',
        '扫描文件夹', '收集现有', '获取用户', '用户提供', '现有文档',
        '已有文件', '本地文件', '外部文件'
      ],
      'execution-node': [
        // Office操作和AI执行任务
        '创建', '生成', '制作', '编写', '设置', '配置', '格式化', '调整',
        '输入', '添加', '插入', '编辑', '修改', '处理', '转换', '分析',
        '计算', '统计', '整理', '排序', '筛选', '合并', '拆分', '压缩',
        '保存', '存储', '备份', '同步', '发送', '传输', '执行', '运行',
        '操作', '实现', '应用', '使用', '调用', '启动'
      ],
      'condition-node': [
        // 明确的条件判断场景
        '如果', '是否', '判断是否', '检查是否', '确认是否', '验证是否',
        '根据条件', '条件分支', '分支判断', '选择路径', '决定是否',
        '满足条件', '不满足', '符合要求', '达到标准'
      ],
      'result-node': [
        // 最终输出和交付场景
        '最终输出', '最终结果', '交付成果', '完成产品', '生成报告',
        '输出文档', '导出文件', '发布内容', '提交结果', '展示成果',
        '完成工作流', '结束流程', '归档结果'
      ]
    };

    // 特殊规则：针对Office场景的智能判断

    // 规则1：最后一个步骤通常是结果节点（除非明确是执行动作）
    if (stepIndex === totalSteps - 1) {
      // 检查是否是明确的执行动作
      const executionActions = ['保存', '存储', '备份', '发送', '传输', '验证', '检查'];
      const isExecutionAction = executionActions.some(action => text.includes(action));

      if (!isExecutionAction && (
        text.includes('输出') || text.includes('结果') || text.includes('完成') ||
        text.includes('交付') || text.includes('展示') || text.includes('报告')
      )) {
        return 'result-node';
      }
    }

    // 规则2：明确的条件判断关键词
    const conditionKeywords = ['如果', '是否', '判断是否', '检查是否', '根据条件', '条件分支'];
    if (conditionKeywords.some(keyword => text.includes(keyword))) {
      return 'condition-node';
    }

    // 规则3：明确需要用户提供文件的场景
    const userFileKeywords = ['上传', '选择文件', '打开文件', '用户提供', '现有文档', '已有文件'];
    if (userFileKeywords.some(keyword => text.includes(keyword))) {
      return 'material-node';
    }

    // 规则4：Office特殊处理 - 这些在Office场景中都是执行动作
    const officeExecutionKeywords = [
      '保存文档', '验证文档', '检查文档', '确认文档', '测试文档',
      '保存文件', '验证文件', '检查文件', '确认文件', '测试文件',
      '保存内容', '验证内容', '检查内容', '确认内容'
    ];
    if (officeExecutionKeywords.some(keyword => text.includes(keyword))) {
      return 'execution-node';
    }

    // 规则5：使用关键词评分，但权重调整
    const scores = {};
    for (const [nodeType, keywords] of Object.entries(taskTypeKeywords)) {
      let score = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          // 根据节点类型调整权重
          if (nodeType === 'execution-node') {
            score += 1.5; // 执行节点权重更高，因为大部分Office操作都是执行
          } else {
            score += 1;
          }
        }
      });
      scores[nodeType] = score;
    }

    // 返回得分最高的节点类型，如果都是0则默认为执行节点
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return 'execution-node';
    }

    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  };

  // 将步骤转换为思维导图数据 - 使用智能节点分类并自动创建连接线
  const convertStepsToMindmap = (steps, title) => {
    console.log('🔧 [convertStepsToMindmap] 开始转换，步骤数量:', steps.length);
    console.log('🔧 [convertStepsToMindmap] 传入的步骤数据:', steps);

    // 详细打印每个步骤的工具信息
    steps.forEach((step, index) => {
      console.log(`🔧 [convertStepsToMindmap] 步骤${index + 1}:`, {
        title: step.title,
        tool: step.tool,
        toolName: step.toolName,
        executionDescription: step.executionDescription,
        aiDescription: step.aiDescription
      });
    });

    const nodes = [];
    const edges = []; // 重新启用自动连接

    // 不创建中心节点，直接使用线性工作流

    // 为每个步骤创建智能分类的节点
    const nodeSpacing = 280;
    const startY = 100;

    // 使用线性布局，更适合工作流展示
    steps.forEach((step, index) => {
      const nodeId = `step-${index + 1}`;

      // 智能识别节点类型 - 传入步骤索引和总数
      const nodeType = identifyNodeType(
        step.title || '',
        step.content || step.aiDescription || '',
        index,
        steps.length
      );

      // 计算节点位置（水平线性布局）
      const x = 150 + index * nodeSpacing;
      const y = startY;

      // 创建智能分类的步骤节点，使用提取到的工具信息
      const stepNode = {
        id: nodeId,
        type: nodeType,
        position: { x, y },
        data: {
          label: step.title || `步骤 ${index + 1}`,
          nodeType: nodeType,
          description: step.executionDescription || step.content || step.aiDescription || '',
          tool: step.toolName || step.tool || '',
          parameters: step.parameters || '',
          aiDescription: step.executionDescription || step.aiDescription || '',
          executionDescription: step.executionDescription || '',
          toolName: step.toolName || step.tool || '',
          status: 'default'
        }
      };
      nodes.push(stepNode);

      // 不再自动创建连接线，让用户手动拖拽连接
      // 这样用户可以根据自己的需求自由连接节点，使用真实的拖拽连接系统
    });

    // 创建线性连接
    steps.forEach((step, index) => {
      if (index > 0) {
        const prevNodeId = `step-${index}`;
        const currentNodeId = `step-${index + 1}`;

        const edge = {
          id: `edge-${prevNodeId}-${currentNodeId}`,
          source: prevNodeId,
          target: currentNodeId,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#7c3aed',
            strokeWidth: 2
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#7c3aed'
          }
        };
        edges.push(edge);
        console.log(`🔗 创建连接: ${prevNodeId} → ${currentNodeId}`);
      }
    });

    return {
      title: title || '智能生成的工作流',
      description: `包含 ${steps.length} 个步骤的Office工作流`,
      nodes: nodes,
      edges: edges
    };
  };

  // 生成用户友好的显示文本
  const generateUserFriendlyText = (stepSummary) => {
    if (!stepSummary || !stepSummary.detailedSteps) {
      return '生成步骤时出现问题，请重试。';
    }

    let friendlyText = `# ${stepSummary.title || '执行步骤'}\n\n`;
    friendlyText += `共 ${stepSummary.stepCount || stepSummary.detailedSteps.length} 个步骤：\n\n`;

    stepSummary.detailedSteps.forEach((step, index) => {
      friendlyText += `## ▶️ **步骤${index + 1}：${step.title || step.stepTitle || `步骤${index + 1}`}**\n\n`;

      if (step.content) {
        friendlyText += `**操作内容：** ${step.content}\n\n`;
      }

      if (step.tool || step.toolName) {
        friendlyText += `**推荐工具：** ${step.tool || step.toolName}\n\n`;
      }

      if (step.parameters) {
        friendlyText += `**参数信息：** ${step.parameters}\n\n`;
      }

      if (step.executionDescription || step.aiDescription) {
        friendlyText += `**执行描述：** ${step.executionDescription || step.aiDescription}\n\n`;
      }

      friendlyText += '---\n\n';
    });

    return friendlyText;
  };

  // 检测是否是工作流内容
  const detectWorkflowContent = (text) => {
    const workflowKeywords = [
      '工作流程', '工作流', '思维导图工作流', '步骤', '阶段',
      '▶️', '执行步骤', '里程碑', '任务分析', '资源评估'
    ];

    return workflowKeywords.some(keyword => text.includes(keyword));
  };

  // 解析工作流内容，提取标题和步骤
  const parseWorkflowContent = (text) => {
    const lines = text.split('\n');
    let title = '';
    const steps = [];

    // 提取标题（通常是第一个 # 或 ## 标题）
    for (const line of lines) {
      if (line.match(/^#{1,3}\s*(.+)/)) {
        title = line.replace(/^#{1,3}\s*/, '').trim();
        break;
      }
    }

    // 提取步骤（查找包含"步骤"的行）
    for (const line of lines) {
      // 匹配格式：### 📋 ▶️ **步骤1：标题** 或类似格式
      if (line.includes('步骤') && line.match(/步骤\s*\d+/)) {
        // 提取步骤标题，去除所有格式符号
        const cleanLine = line.replace(/^#{1,6}\s*/, '').replace(/📋\s*/, '').replace(/▶️\s*/, '').replace(/\*\*/g, '').trim();
        const match = cleanLine.match(/步骤\s*(\d+)[：:]\s*(.+)/);
        if (match) {
          const stepTitle = match[2].trim();
          if (stepTitle && !steps.includes(stepTitle)) {
            steps.push(stepTitle);
          }
        }
      }
      // 兼容其他格式：▶️ 或数字开头的行
      else if (line.match(/^#{3,4}\s*▶️\s*\d+\.?\s*(.+)/) ||
               line.match(/^▶️\s*\d+\.?\s*(.+)/) ||
               line.match(/^\d+\.?\s*(.+)/)) {
        const stepText = line.replace(/^#{3,4}\s*▶️\s*\d+\.?\s*/, '')
                            .replace(/^▶️\s*\d+\.?\s*/, '')
                            .replace(/^\d+\.?\s*/, '')
                            .trim();
        if (stepText && !steps.includes(stepText)) {
          steps.push(stepText);
        }
      }
    }

    return {
      title: title || '工作流程',
      stepCount: steps.length,
      steps: steps.slice(0, 5) // 最多显示5个步骤概要
    };
  };

  // 格式化智能规划响应
  const formatIntelligentPlanningResponse = (result) => {
    if (!result) {
      return '智能规划分析完成，但没有返回有效数据。';
    }

    console.log('格式化智能规划响应，原始数据:', result);
    console.log('原始数据类型:', typeof result);
    console.log('原始数据键:', Object.keys(result));

    // API响应结构：{status, response_type, message, timestamp, data}
    // 我们需要从根级别提取response_type和message
    const { response_type, intent, message, steps, summary } = result;

    console.log('提取的字段:', {
      response_type,
      intent,
      message: message ? message.substring(0, 100) + '...' : 'undefined',
      steps,
      summary
    });

    // 如果message存在，直接返回它
    if (message) {
      console.log('返回message内容:', message.substring(0, 100) + '...');
      return message;
    }

    let formattedText = '';

    // 添加意图识别信息
    if (intent) {
      formattedText += `🎯 **识别意图**: ${intent}\n\n`;
    }

    // 根据响应类型格式化内容
    switch (response_type) {
      case 'quick_answer':
        formattedText += `💡 **快速回答**:\n${message || ''}`;
        break;

      case 'execution_plan':
        formattedText += `📋 **执行计划**:\n\n`;
        if (message) {
          formattedText += `${message}\n\n`;
        }
        if (steps && steps.length > 0) {
          formattedText += `**详细步骤**:\n`;
          steps.forEach((step, index) => {
            formattedText += `${index + 1}. ${step.title || step.name || step}\n`;
            if (step.description) {
              formattedText += `   ${step.description}\n`;
            }
          });
        }
        if (summary) {
          formattedText += `\n**总结**: ${summary.overview || summary}`;
        }
        break;

      case 'clarification_needed':
        formattedText += `❓ **需要澄清**:\n${message || ''}`;
        break;

      case 'quick_chat':
        formattedText += `💬 **聊天回复**:\n${message || ''}`;
        break;

      default:
        formattedText += message || '智能规划分析完成。';
    }

    return formattedText;
  };

  // 调试信息
  return (
    <div className={`chatbox-wrapper ${isCollapsed ? 'collapsed' : ''}`}>

      <div className={`chatbox-container ${className || ''}`}>
        <div className="chatbox-header">
          <div className="chatbox-title">
            <span>🤖 AI智能助手</span>
          </div>
          <button className="chatbox-close-btn" onClick={onClose} title="关闭聊天框">
            ✕
          </button>
        </div>
      <div className="chatbox-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender} ${msg.type || ''}`} data-streaming={msg.isStreaming} data-message-id={msg.id}>
            {msg.type === 'intelligent_planning' || msg.type === 'step_generation' ? (
              <div className="intelligent-planning-message">
                {/* 工作流/步骤收缩卡片显示 */}
                {((msg.isWorkflow && msg.isCollapsed && msg.workflowSummary) ||
                  (msg.isSteps && msg.isCollapsed && msg.stepSummary)) ? (
                  <div className="workflow-card">
                    <div className="workflow-header">
                      <h3 className="workflow-title">
                        {msg.isSteps ? '🚀' : '📋'} {(msg.stepSummary || msg.workflowSummary).title}
                      </h3>
                    </div>
                    <div className="workflow-summary">
                      <p className="step-count">包含 {(msg.stepSummary || msg.workflowSummary).stepCount} 个步骤：</p>
                      <ul className="step-list">
                        {(msg.stepSummary || msg.workflowSummary).steps.map((step, index) => (
                          <li key={index} className="step-item">• {step}</li>
                        ))}
                        {(msg.stepSummary || msg.workflowSummary).stepCount > 5 && (
                          <li className="step-item more">• ...</li>
                        )}
                      </ul>
                    </div>
                    <div className="workflow-actions">
                      <button
                        className="workflow-btn expand-btn"
                        onClick={() => {
                          if (onSendMessage.updateAIMessage) {
                            onSendMessage.updateAIMessage(msg.id, {
                              ...msg,
                              isCollapsed: false
                            });

                            // 展开后自动滚动到步骤开头
                            setTimeout(() => {
                              const messageElement = document.querySelector(`[data-message-id="${msg.id}"]`);
                              if (messageElement) {
                                messageElement.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start'
                                });
                              }
                            }, 100);

                            // 展开详细步骤后，延迟触发智能工具匹配
                            setTimeout(() => {
                              console.log('🚀 用户展开详细步骤，触发智能工具匹配');
                              performDelayedToolMatching(msg.content);
                            }, 1500); // 延迟1.5秒确保DOM完全渲染和滚动完成
                          }
                        }}
                      >
                        📄 展开{msg.isSteps ? '步骤' : '详情'}
                      </button>
                      <button
                        className="workflow-btn mindmap-btn"
                        onClick={async () => {
                          try {
                            console.log('🧠 开始生成思维导图...');

                            // 获取步骤数据
                            const stepData = msg.stepSummary || msg.workflowSummary;
                            console.log('步骤数据:', stepData);

                            // 解析步骤内容 - 优先尝试JSON格式
                            let stepResult = null;

                            try {
                              // 首先尝试解析JSON格式
                              console.log('🔍 尝试解析JSON格式');

                              // 提取JSON部分（去掉```json和```包装）
                              let jsonText = msg.text;
                              if (jsonText.includes('```json')) {
                                const startIndex = jsonText.indexOf('{');
                                const endIndex = jsonText.lastIndexOf('}') + 1;
                                if (startIndex !== -1 && endIndex > startIndex) {
                                  jsonText = jsonText.substring(startIndex, endIndex);
                                }
                              }

                              const jsonData = JSON.parse(jsonText);
                              if (jsonData.detailedSteps && Array.isArray(jsonData.detailedSteps)) {
                                stepResult = jsonData;
                                console.log('✅ JSON解析成功:', stepResult);
                              }
                            } catch (jsonError) {
                              console.log('❌ JSON解析失败:', jsonError);
                              console.log('❌ 尝试解析的文本:', msg.text.substring(0, 200));
                            }

                            // 如果JSON解析失败，使用简单解析方法
                            if (!stepResult) {
                              console.log('🔄 使用简单解析方法');
                              stepResult = parseStepContentSimple(msg.text || '');

                              // 如果简单解析也失败，回退到原方法
                              if (stepResult.detailedSteps.length === 0) {
                                console.log('🔄 回退到原解析方法');
                                stepResult = parseStepContent(msg.text || '');
                              }
                            }

                            console.log('解析的步骤:', stepResult);

                            // 获取详细步骤数组
                            const steps = stepResult.detailedSteps || [];

                            if (steps.length === 0) {
                              console.warn('⚠️ 没有找到可转换的步骤');
                              alert('没有找到可转换的步骤，请确保步骤格式正确');
                              return;
                            }

                            // 转换为思维导图格式
                            const mindmapData = convertStepsToMindmap(steps, stepResult.title || '工作流程');
                            console.log('生成的思维导图数据:', mindmapData);

                            // 调用父组件的函数来显示思维导图
                            if (onSendMessage.showMindmap) {
                              onSendMessage.showMindmap(mindmapData);
                              console.log('✅ 思维导图已生成并显示');

                              // 如果有createConnections函数，调用它来创建连接线
                              if (mindmapData.createConnections && onSendMessage.onConnect) {
                                console.log('🔗 调用createConnections创建连接线...');
                                mindmapData.createConnections(onSendMessage.onConnect);
                              }
                            } else {
                              console.warn('⚠️ showMindmap 函数不可用');
                              alert('思维导图功能暂时不可用，请稍后再试');
                            }

                          } catch (error) {
                            console.error('❌ 生成思维导图失败:', error);
                            alert('生成思维导图失败，请稍后再试');
                          }
                        }}
                      >
                        🧠 生成思维导图
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 正常的详细内容显示 */
                  <div className="expanded-content-container">
                    {/* 使用传统的markdown显示 - AI生成步骤模块已移除 */}
                      <div className="planning-content">
                        <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="planning-h1">{children}</h1>,
                          h2: ({children}) => <h2 className="planning-h2">{children}</h2>,
                          h3: ({children}) => <h3 className="planning-h3">{children}</h3>,
                          h4: ({children}) => <h4 className="planning-h4">{children}</h4>,
                          p: ({children}) => <p className="planning-p">{children}</p>,
                          ul: ({children}) => <ul className="planning-ul">{children}</ul>,
                          ol: ({children}) => <ol className="planning-ol">{children}</ol>,
                          li: ({children}) => {
                            // 将children转换为字符串进行检查
                            const getTextContent = (element) => {
                              if (typeof element === 'string') return element;
                              if (element && element.props && element.props.children) {
                                if (Array.isArray(element.props.children)) {
                                  return element.props.children.map(getTextContent).join('');
                                }
                                return getTextContent(element.props.children);
                              }
                              return '';
                            };

                            const textContent = React.Children.toArray(children).map(getTextContent).join('');

                            // 检查是否是推荐工具列表项
                            if (textContent.includes('推荐工具：')) {
                              // 匹配两种格式：推荐工具：[工具名] 或 推荐工具：工具名
                              const match = textContent.match(/推荐工具：(?:\[([^\]]+)\]|(.+))$/);
                              const toolText = match ? (match[1] || match[2] || '').trim() : '';

                              // 智能推断执行描述
                              let executionDescription = '';
                              try {
                                // 根据步骤标题和内容智能推断执行描述
                                const messageContent = msg.content || '';

                                // 查找包含当前工具推荐的步骤
                                const lines = messageContent.split('\n');
                                let currentStepTitle = '';
                                let currentStepContent = '';

                                for (let i = 0; i < lines.length; i++) {
                                  const line = lines[i].trim();

                                  // 检测步骤标题
                                  if (line.includes('步骤') && line.includes('：')) {
                                    currentStepTitle = line;
                                    currentStepContent = '';

                                    // 收集步骤内容直到下一个步骤或推荐工具
                                    for (let j = i + 1; j < lines.length; j++) {
                                      const nextLine = lines[j].trim();
                                      if (nextLine.includes('步骤') && nextLine.includes('：')) {
                                        break;
                                      }
                                      if (nextLine.includes('推荐工具') && nextLine.includes(toolText)) {
                                        // 找到了对应的工具推荐，使用当前步骤信息
                                        break;
                                      }
                                      if (nextLine && !nextLine.includes('推荐工具') && !nextLine.includes('执行描述')) {
                                        currentStepContent += nextLine + ' ';
                                      }
                                    }

                                    // 检查是否找到了对应的工具
                                    const remainingContent = lines.slice(i).join('\n');
                                    if (remainingContent.includes(`推荐工具：${toolText}`) ||
                                        remainingContent.includes(`推荐工具：[${toolText}]`)) {
                                      break;
                                    }
                                  }
                                }

                                // 根据步骤标题和内容智能生成执行描述
                                if (currentStepTitle.includes('需求分析')) {
                                  executionDescription = '收集并整理用户需求，明确功能模块和优先级';
                                } else if (currentStepTitle.includes('界面设计') || currentStepTitle.includes('原型')) {
                                  executionDescription = '设计软件的界面布局和用户交互流程';
                                } else if (currentStepTitle.includes('数据分析') || currentStepTitle.includes('脚本编写')) {
                                  executionDescription = '开发数据处理和分析的核心算法';
                                } else if (currentStepTitle.includes('项目结构') || currentStepTitle.includes('文件')) {
                                  executionDescription = '建立完整的项目目录体系和文件结构';
                                } else if (currentStepTitle.includes('测试')) {
                                  executionDescription = '设计并实现测试方案和测试用例';
                                } else if (currentStepTitle.includes('配置')) {
                                  executionDescription = '创建项目所需的配置文件和环境设置';
                                } else if (currentStepTitle.includes('文档')) {
                                  executionDescription = '整理项目相关文档和技术资料';
                                } else if (currentStepContent) {
                                  // 使用步骤内容的第一句话
                                  executionDescription = currentStepContent.trim().split('。')[0];
                                }

                                // 暂时注释掉调试日志，避免控制台被淹没
                                // console.log('🔍 工具匹配调试信息:', {
                                //   toolText,
                                //   currentStepTitle,
                                //   executionDescription,
                                //   hasExecutionDesc: executionDescription.length > 0
                                // });

                              } catch (error) {
                                console.warn('提取执行描述失败:', error);
                              }

                              return (
                                <li className="planning-li tool-selector-li">
                                  <strong>推荐工具</strong>：
                                  <ToolInputWithDropdown
                                    defaultValue={toolText || '🔄 匹配中...'}
                                    placeholder="🔄 匹配中..."
                                    onChange={(e) => {
                                      console.log('工具名称变更:', e.target.value);
                                    }}
                                    style={{
                                      marginLeft: '8px',
                                      padding: '4px 8px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px',
                                      minWidth: '200px'
                                    }}
                                  />
                                </li>
                              );
                            }

                            // 检查是否是执行描述列表项
                            if (textContent.includes('执行描述：') || textContent.includes('执行指令：')) {
                              const match = textContent.match(/(?:执行描述|执行指令)：\s*([^$]+)/) || textContent.match(/(?:执行描述|执行指令)：\[📝\s*([^\]]+)\]/);
                              const commandText = match ? match[1] : '';

                              return (
                                <li className="planning-li command-input-li">
                                  <strong>执行描述</strong>：
                                  <div className="command-input-container">
                                    <textarea
                                      className="command-input"
                                      defaultValue={commandText}
                                      placeholder="请用自然语言描述这个步骤要做什么..."
                                      rows="2"
                                      onChange={(e) => {
                                        console.log('执行描述变更:', e.target.value);
                                      }}
                                    />
                                  </div>
                                </li>
                              );
                            }

                            // 普通列表项
                            return <li className="planning-li">{children}</li>;
                          },
                          table: ({children}) => <table className="planning-table">{children}</table>,
                          thead: ({children}) => <thead className="planning-thead">{children}</thead>,
                          tbody: ({children}) => <tbody className="planning-tbody">{children}</tbody>,
                          tr: ({children}) => <tr className="planning-tr">{children}</tr>,
                          th: ({children}) => <th className="planning-th">{children}</th>,
                          td: ({children}) => <td className="planning-td">{children}</td>,
                          strong: ({children}) => <strong className="planning-strong">{children}</strong>,
                          em: ({children}) => <em className="planning-em">{children}</em>,
                          code: ({children}) => <code className="planning-code">{children}</code>,
                          a: ({href, children}) => <a href={href} className="planning-link" target="_blank" rel="noopener noreferrer">{children}</a>,
                          hr: () => <hr className="planning-hr" />
                        }}
                      >
                        {(() => {
                          // 去除markdown代码块包裹，提取纯markdown内容
                          let content = msg.text;
                          if (content.startsWith('```markdown\n') && content.endsWith('\n```')) {
                            content = content.slice(12, -4); // 去除 ```markdown\n 和 \n```
                          } else if (content.startsWith('```\n') && content.endsWith('\n```')) {
                            content = content.slice(4, -4); // 去除 ```\n 和 \n```
                          }
                          return content;
                        })()}
                      </ReactMarkdown>
                      </div>
                    {msg.isStreaming && <span className="streaming-cursor"></span>}

                    {/* 收缩按钮 - 只在工作流或步骤展开时显示 */}
                    {!msg.isStreaming && (msg.isWorkflow || msg.isSteps) && (
                      <div className="collapse-action">
                        <button
                          className="workflow-btn collapse-btn"
                          onClick={() => {
                            if (onSendMessage.updateAIMessage) {
                              onSendMessage.updateAIMessage(msg.id, {
                                ...msg,
                                isCollapsed: true
                              });
                            }
                          }}
                        >
                          📦 收缩
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {msg.rawData && (
                  <div className="planning-metadata">
                    <small>会话ID: {msg.rawData.session_id}</small>
                  </div>
                )}
              </div>
            ) : (
              <div className="chat-message-content">
                {msg.isThinking ? (
                  <div className="thinking-message">
                    <span>正在思考</span>
                    <div className="thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({children}) => <h1 className="chat-h1">{children}</h1>,
                        h2: ({children}) => <h2 className="chat-h2">{children}</h2>,
                        h3: ({children}) => <h3 className="chat-h3">{children}</h3>,
                        h4: ({children}) => <h4 className="chat-h4">{children}</h4>,
                        p: ({children}) => <p className="chat-p">{children}</p>,
                        ul: ({children}) => <ul className="chat-ul">{children}</ul>,
                        ol: ({children}) => <ol className="chat-ol">{children}</ol>,
                        li: ({children}) => <li className="chat-li">{children}</li>,
                        table: ({children}) => <table className="chat-table">{children}</table>,
                        thead: ({children}) => <thead className="chat-thead">{children}</thead>,
                        tbody: ({children}) => <tbody className="chat-tbody">{children}</tbody>,
                        tr: ({children}) => <tr className="chat-tr">{children}</tr>,
                        th: ({children}) => <th className="chat-th">{children}</th>,
                        td: ({children}) => <td className="chat-td">{children}</td>,
                        strong: ({children}) => <strong className="chat-strong">{children}</strong>,
                        em: ({children}) => <em className="chat-em">{children}</em>,
                        code: ({children}) => <code className="chat-code">{children}</code>,
                        blockquote: ({children}) => <blockquote className="chat-blockquote">{children}</blockquote>,
                        a: ({href, children}) => <a href={href} className="chat-link" target="_blank" rel="noopener noreferrer">{children}</a>,
                        hr: () => <hr className="chat-hr" />
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                    {msg.isStreaming && <span className="streaming-cursor"></span>}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {loadingState === 'generating' && (
          <div className="message ai">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chatbox-input">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入您的问题或需求..."
          rows={1}
          style={{
            resize: 'none',
            overflow: 'hidden',
            minHeight: '40px',
            maxHeight: '120px',
            lineHeight: '1.4'
          }}
          onInput={(e) => {
            // 自动调整高度
            e.target.style.height = 'auto';
            const newHeight = Math.min(e.target.scrollHeight, 120);
            e.target.style.height = newHeight + 'px';

            // 如果内容超过最大高度，确保滚动到底部显示最新输入
            if (e.target.scrollHeight > 120) {
              e.target.scrollTop = e.target.scrollHeight;
            }
          }}
        />
        <button
          onClick={handleSend}
          className={`send-btn ${isStreaming ? 'streaming' : ''}`}
          disabled={isStreaming}
        >
          {isStreaming ? '⏳ 处理中...' : '发送'}
        </button>

      </div>
      </div>
    </div>
  );
};

export default ChatBox;