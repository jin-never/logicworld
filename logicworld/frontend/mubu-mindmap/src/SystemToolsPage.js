import React, { useState, useEffect } from 'react';
import './SystemToolsPage.css';

// API基础URL - 直接连接到8000端口
const API_BASE = 'http://localhost:8000';

const SystemToolsPage = () => {
  const [systemTools, setSystemTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');


  // 功能分类映射
  const functionalCategoryMap = {
    'ai_assistant': '🤖 AI智能助手',
    'document_processing': '📄 文档处理',
    'code_development': '💻 代码开发',
    'ui_design': '🎨 界面设计',
    'data_processing': '📊 数据处理',
    'file_management': '📁 文件管理',
    'network_communication': '🌐 网络通信',
    'project_management': '📋 项目管理',
    'media_processing': '🎬 媒体处理',
    'database_management': '🗄️ 数据库管理',
    'deployment_operations': '🚀 部署运维',
    'security_protection': '🔒 安全防护',
    'learning_training': '📚 学习培训',
    'life_services': '🏠 生活服务',
    'system_tools': '⚙️ 系统工具'
  };

  // 工具来源映射
  const getSourceDisplayName = (source) => {
    const sourceMap = {
      'ai_config': 'AI工具',
      'api_config': 'API工具',
      'system_tools': '系统工具',
      'user': '我的工具',
      'system': '系统工具'
    };
    return sourceMap[source] || source;
  };

  // 加载系统工具
  const loadSystemTools = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/tools/library`);
      if (response.ok) {
        const data = await response.json();
        // 过滤出系统工具和系统内置的AI工具
        const systemToolsList = data.tools ? data.tools.filter(tool =>
          tool.category === '系统工具' ||
          (tool.category === 'AI工具' && tool.is_system_builtin === true)
        ) : [];
        setSystemTools(systemToolsList);
      } else {
        console.error('Failed to load system tools');
        setSystemTools([]);
      }
    } catch (error) {
      console.error('Error loading system tools:', error);
      setSystemTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystemTools();
  }, []);





















  // 过滤工具
  const filteredTools = systemTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.functionalCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });



  return (
    <div className="system-tools-page">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">⚙️</div>
          <div className="header-text">
            <h1>系统工具</h1>
            <p>管理和测试系统内置工具，包括文件管理、网络诊断、文本处理等功能</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{systemTools.length}</span>
            <span className="stat-label">系统工具</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{systemTools.filter(t => t.tested).length}</span>
            <span className="stat-label">已测试</span>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="tools-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索系统工具..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-btn">🔍</button>
        </div>
        
        <div className="filter-controls">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">所有类型</option>
            <option value="ai_assistant">🤖 AI智能助手</option>
            <option value="document_processing">📄 文档处理</option>
            <option value="code_development">💻 代码开发</option>
            <option value="ui_design">🎨 界面设计</option>
            <option value="data_processing">📊 数据处理</option>
            <option value="file_management">📁 文件管理</option>
            <option value="network_communication">🌐 网络通信</option>
            <option value="testing_validation">🧪 测试验证</option>
            <option value="project_management">📋 项目管理</option>
            <option value="media_processing">🎬 媒体处理</option>
            <option value="database_management">🗄️ 数据库管理</option>
            <option value="deployment_operations">🚀 部署运维</option>
            <option value="intelligent_decision">🧠 智能决策</option>
            <option value="security_protection">🔒 安全防护</option>
            <option value="learning_training">📚 学习培训</option>
            <option value="life_services">🏠 生活服务</option>
            <option value="system_tools">⚙️ 系统工具</option>
          </select>
          
          <button 
            className="btn-refresh"
            onClick={loadSystemTools}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '🔄 刷新'}
          </button>
        </div>
      </div>

      {/* 工具列表 */}
      <div className="tools-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-icon">⚙️</div>
            <h3>加载系统工具中...</h3>
          </div>
        ) : filteredTools.length > 0 ? (
          <div className="tools-grid">
            {filteredTools.map(tool => {

              
              return (
                <div key={tool.id} className="tool-card">
                  <div className="tool-header">
                    <div className="tool-icon">{tool.icon}</div>
                    <div className="tool-info">
                      <h3>{tool.name}</h3>
                      <div className="tool-categories">
                        <p className="tool-functional-category">
                          {Array.isArray(tool.functionalCategory)
                            ? tool.functionalCategory.map(cat => functionalCategoryMap[cat] || cat).join(', ')
                            : (functionalCategoryMap[tool.functionalCategory] || '未分类')
                          }
                        </p>
                        {/* 只有当功能分类不是"⚙️ 系统工具"时，才显示系统工具分类 */}
                        {(Array.isArray(tool.functionalCategory)
                          ? !tool.functionalCategory.includes('system_tools')
                          : functionalCategoryMap[tool.functionalCategory] !== '⚙️ 系统工具'
                        ) && (
                          <p className="tool-system-category">
                            ⚙️ 系统工具
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="tool-status status-tested">
                      已测试
                    </div>
                  </div>
                  
                  <div className="tool-description">
                    {tool.description}
                  </div>

                  <div className="tool-source-info">
                    来源: {getSourceDisplayName(tool.source)}
                  </div>

                  {tool.tags && tool.tags.length > 0 && (
                    <div className="tool-tags">
                      {tool.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  

                  


                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">⚙️</div>
            <h3>
              {searchTerm || selectedCategory !== 'all' 
                ? '没有找到匹配的系统工具' 
                : '暂无系统工具'
              }
            </h3>
            <p>
              {searchTerm || selectedCategory !== 'all'
                ? '尝试调整搜索条件或筛选器'
                : '系统工具正在加载中，请稍候...'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemToolsPage;
