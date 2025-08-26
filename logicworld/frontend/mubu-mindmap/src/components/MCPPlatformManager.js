import React, { useState, useEffect } from 'react';
import './MCPPlatformManager.css';

const API_BASE = process.env.REACT_APP_API_BASE || '';

// 真实MCP服务器配置
const REAL_MCP_SERVERS = [
  {
    id: 'filesystem',
    name: '文件系统操作',
    description: '支持文件读写、目录操作、权限管理',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', './'],
    category: '系统工具',
    requiresConfig: false,
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
  },
  {
    id: 'sqlite',
    name: 'SQLite数据库',
    description: '支持SQL查询、数据管理、表操作',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-sqlite'],
    category: '数据库',
    requiresConfig: true,
    configFields: [
      { key: 'database_path', label: '数据库路径', type: 'text', placeholder: './database.db', required: true }
    ],
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite'
  },
  {
    id: 'github',
    name: 'GitHub集成',
    description: '支持仓库管理、Issue处理、PR操作',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-github'],
    category: '开发工具',
    requiresConfig: true,
    configFields: [
      { key: 'GITHUB_PERSONAL_ACCESS_TOKEN', label: 'GitHub Token', type: 'password', placeholder: 'ghp_...', required: true }
    ],
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github'
  },
  {
    id: 'brave-search',
    name: 'Brave搜索',
    description: '支持网页搜索、实时信息获取',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-brave-search'],
    category: '搜索工具',
    requiresConfig: true,
    configFields: [
      { key: 'BRAVE_API_KEY', label: 'Brave API Key', type: 'password', placeholder: 'BSA...', required: true }
    ],
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search'
  },
  {
    id: 'time',
    name: '时间日期工具',
    description: '支持时间计算、日期格式化、时区转换',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-time'],
    category: '实用工具',
    requiresConfig: false,
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time'
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer网页操作',
    description: '支持网页自动化、截图、数据抓取',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-puppeteer'],
    category: '自动化工具',
    requiresConfig: false,
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer'
  }
];

const MCPPlatformManager = () => {
  const [platforms, setPlatforms] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    platform_id: '',
    platform_name: '',
    base_url: '',
    api_key: '',
    region: '',
    timeout: 30,
    enabled: true,
    extra_config: {}
  });

  // MCP服务器配置相关状态
  const [activeTab, setActiveTab] = useState('platforms'); // 'platforms' 或 'mcp-servers'
  const [mcpServers, setMcpServers] = useState([]);
  const [selectedMcpServer, setSelectedMcpServer] = useState(null);
  const [showMcpConfig, setShowMcpConfig] = useState(false);
  const [mcpConfigForm, setMcpConfigForm] = useState({});

  // 加载平台状态
  const loadPlatformStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/mcp-platforms/status`);
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data);
      } else {
        console.error('Failed to load platform status');
      }
    } catch (error) {
      console.error('Error loading platform status:', error);
    } finally {
      setLoading(false);
    }
  };

  // 测试平台连接
  const testConnection = async (platformId) => {
    try {
      const response = await fetch(`${API_BASE}/mcp-platforms/${platformId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.connection_success) {
        alert(`${result.platform_name} 连接成功！`);
      } else {
        alert(`${result.platform_name} 连接失败: ${result.last_error || '未知错误'}`);
      }
      
      // 重新加载状态
      loadPlatformStatus();
    } catch (error) {
      alert(`连接测试失败: ${error.message}`);
    }
  };

  // 同步服务
  const syncServices = async (platformIds = null) => {
    setSyncing(true);
    setSyncResults(null);
    
    try {
      const response = await fetch(`${API_BASE}/mcp-platforms/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform_ids: platformIds,
          force: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSyncResults(data);
        
        // 刷新系统工具列表
        window.dispatchEvent(new Event('systemToolsUpdated'));
      } else {
        alert('同步失败');
      }
    } catch (error) {
      alert(`同步错误: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // 更新平台配置
  const updatePlatformConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/mcp-platforms/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configForm)
      });

      if (response.ok) {
        alert('配置更新成功！');
        setShowConfig(false);
        loadPlatformStatus();
      } else {
        alert('配置更新失败');
      }
    } catch (error) {
      alert(`配置更新错误: ${error.message}`);
    }
  };

  // MCP服务器配置功能
  const loadMcpServers = async () => {
    try {
      const response = await fetch(`${API_BASE}/mcp-servers`);
      if (response.ok) {
        const data = await response.json();
        setMcpServers(data);
      }
    } catch (error) {
      console.error('Error loading MCP servers:', error);
    }
  };

  const configureMcpServer = (server) => {
    setSelectedMcpServer(server);
    setShowMcpConfig(true);

    // 初始化配置表单
    const initialConfig = {};
    if (server.requiresConfig && server.configFields) {
      server.configFields.forEach(field => {
        initialConfig[field.key] = '';
      });
    }
    setMcpConfigForm(initialConfig);
  };

  const saveMcpServerConfig = async () => {
    if (!selectedMcpServer) return;

    const serverConfig = {
      id: selectedMcpServer.id,
      name: selectedMcpServer.name,
      transport: selectedMcpServer.transport,
      command: selectedMcpServer.command,
      args: [...selectedMcpServer.args],
      env: { ...mcpConfigForm },
      timeout: 60000,
      enabled: true
    };

    // 对于SQLite，需要将数据库路径添加到args中
    if (selectedMcpServer.id === 'sqlite' && mcpConfigForm.database_path) {
      serverConfig.args.push(mcpConfigForm.database_path);
    }

    try {
      const response = await fetch(`${API_BASE}/mcp-servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serverConfig)
      });

      if (response.ok) {
        alert('MCP服务器配置成功！');
        setShowMcpConfig(false);
        loadMcpServers();
        // 刷新系统工具列表
        window.dispatchEvent(new Event('systemToolsUpdated'));
      } else {
        alert('配置失败');
      }
    } catch (error) {
      alert(`配置错误: ${error.message}`);
    }
  };

  // 打开配置对话框
  const openConfig = (platform) => {
    // 根据平台类型设置不同的默认配置
    const getDefaultConfig = (platformId) => {
      switch (platformId) {
        case 'modao':
          return {
            api_key: '',
            region: '',
            extra_config: {
              graphql_endpoint: 'https://www.modelscope.cn/api/graphql',
              cookie: ''
            }
          };
        case 'tencent_scf':
          return {
            api_key: '',
            region: 'ap-guangzhou',
            extra_config: {
              secret_id: '',
              secret_key: ''
            }
          };
        case 'aliyun_fc':
          return {
            api_key: '',
            region: 'cn-hangzhou',
            extra_config: {
              access_key_id: '',
              access_key_secret: ''
            }
          };
        default:
          return {
            api_key: '',
            region: '',
            extra_config: {}
          };
      }
    };

    const defaultConfig = getDefaultConfig(platform.platform_id);

    setConfigForm({
      platform_id: platform.platform_id,
      platform_name: platform.platform_name,
      base_url: platform.base_url || '',
      ...defaultConfig,
      timeout: 30,
      enabled: platform.enabled
    });
    setSelectedPlatform(platform);
    setShowConfig(true);
  };

  useEffect(() => {
    loadPlatformStatus();
    loadMcpServers();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#52c41a';
      case 'connecting': return '#1890ff';
      case 'error': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '活跃';
      case 'connecting': return '连接中';
      case 'error': return '错误';
      case 'inactive': return '未激活';
      default: return '未知';
    }
  };

  return (
    <div className="mcp-platform-manager">
      <div className="manager-header">
        <h2>MCP 工具配置</h2>

        {/* 标签页导航 */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'mcp-servers' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp-servers')}
          >
            MCP 服务器配置
          </button>
          <button
            className={`tab-button ${activeTab === 'platforms' ? 'active' : ''}`}
            onClick={() => setActiveTab('platforms')}
          >
            托管平台管理
          </button>
        </div>
      </div>

      {/* MCP服务器配置标签页 */}
      {activeTab === 'mcp-servers' && (
        <div className="mcp-servers-section">
          <div className="section-header">
            <h3>可用的 MCP 服务器</h3>
            <p className="section-description">选择并配置您需要的 MCP 服务器</p>
          </div>

          <div className="servers-grid">
            {REAL_MCP_SERVERS.map(server => (
              <div key={server.id} className="server-card">
                <div className="server-header">
                  <h4>{server.name}</h4>
                  <span className="server-category">{server.category}</span>
                </div>

                <p className="server-description">{server.description}</p>

                <div className="server-info">
                  <div className="info-item">
                    <span className="info-label">传输方式:</span>
                    <span className="info-value">{server.transport}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">需要配置:</span>
                    <span className="info-value">{server.requiresConfig ? '是' : '否'}</span>
                  </div>
                </div>

                <div className="server-actions">
                  <button
                    onClick={() => configureMcpServer(server)}
                    className="btn-primary btn-small"
                  >
                    {server.requiresConfig ? '配置并启用' : '直接启用'}
                  </button>
                  <a
                    href={server.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-small"
                  >
                    文档
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 托管平台管理标签页 */}
      {activeTab === 'platforms' && (
        <div className="platforms-section">
          <div className="section-header">
            <h3>托管平台管理</h3>
            <div className="header-actions">
              <button
                onClick={loadPlatformStatus}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? '刷新中...' : '刷新状态'}
              </button>
              <button
                onClick={() => syncServices()}
                disabled={syncing}
                className="btn-primary"
              >
                {syncing ? '同步中...' : '同步所有服务'}
              </button>
            </div>
          </div>

          {/* 平台列表 */}
          <div className="platforms-grid">
        {Object.entries(platforms).map(([platformId, platform]) => (
          <div key={platformId} className="platform-card">
            <div className="platform-header">
              <h3>{platform.platform_name}</h3>
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(platform.status) }}
                title={getStatusText(platform.status)}
              />
            </div>
            
            <div className="platform-info">
              <p><strong>状态:</strong> {getStatusText(platform.status)}</p>
              <p><strong>URL:</strong> {platform.base_url}</p>
              <p><strong>启用:</strong> {platform.enabled ? '是' : '否'}</p>
              {platform.last_error && (
                <p className="error-text"><strong>错误:</strong> {platform.last_error}</p>
              )}
            </div>
            
            <div className="platform-actions">
              <button 
                onClick={() => testConnection(platformId)}
                className="btn-secondary btn-small"
              >
                测试连接
              </button>
              <button 
                onClick={() => syncServices([platformId])}
                disabled={syncing}
                className="btn-secondary btn-small"
              >
                同步服务
              </button>
              <button 
                onClick={() => openConfig(platform)}
                className="btn-secondary btn-small"
              >
                配置
              </button>
            </div>
          </div>
        ))}
          </div>

          {/* 同步结果 */}
      {syncResults && (
        <div className="sync-results">
          <h3>同步结果</h3>
          <div className="results-summary">
            <p>总平台数: {syncResults.summary.total_platforms}</p>
            <p>成功: {syncResults.summary.successful}</p>
            <p>失败: {syncResults.summary.failed}</p>
            <p>新增服务: {syncResults.summary.total_services_added}</p>
          </div>
          
          <div className="results-details">
            {syncResults.results.map((result, index) => (
              <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                <h4>{result.platform}</h4>
                <p>{result.message}</p>
                {result.errors.length > 0 && (
                  <ul className="error-list">
                    {result.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      )}

      {/* MCP服务器配置对话框 */}
      {showMcpConfig && selectedMcpServer && (
        <div className="config-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>配置 {selectedMcpServer.name}</h3>
              <button
                onClick={() => setShowMcpConfig(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="config-form">
              {/* 工具介绍部分 */}
              <div className="tool-introduction">
                <div className="intro-header">
                  <div className="tool-icon">
                    {selectedMcpServer.category === '系统工具' && '🗂️'}
                    {selectedMcpServer.category === '数据库' && '🗄️'}
                    {selectedMcpServer.category === '开发工具' && '⚙️'}
                    {selectedMcpServer.category === '搜索工具' && '🔍'}
                    {selectedMcpServer.category === '实用工具' && '🛠️'}
                    {selectedMcpServer.category === '自动化工具' && '🤖'}
                    {!['系统工具', '数据库', '开发工具', '搜索工具', '实用工具', '自动化工具'].includes(selectedMcpServer.category) && '🔧'}
                  </div>
                  <div className="tool-title">
                    <h4>{selectedMcpServer.name}</h4>
                    <span className="tool-category">{selectedMcpServer.category}</span>
                  </div>
                </div>

                <div className="tool-description">
                  <p>{selectedMcpServer.description}</p>
                </div>

                {/* 功能特性 */}
                <div className="tool-features">
                  <h5>🌟 主要功能</h5>
                  <div className="features-list">
                    {selectedMcpServer.id === 'filesystem' && (
                      <>
                        <span className="feature-tag">📁 文件读写</span>
                        <span className="feature-tag">📂 目录操作</span>
                        <span className="feature-tag">🔐 权限管理</span>
                        <span className="feature-tag">🔍 文件搜索</span>
                      </>
                    )}
                    {selectedMcpServer.id === 'sqlite' && (
                      <>
                        <span className="feature-tag">📊 SQL查询</span>
                        <span className="feature-tag">🗃️ 数据管理</span>
                        <span className="feature-tag">📋 表操作</span>
                        <span className="feature-tag">🔄 数据导入导出</span>
                      </>
                    )}
                    {selectedMcpServer.id === 'github' && (
                      <>
                        <span className="feature-tag">📦 仓库管理</span>
                        <span className="feature-tag">🐛 Issue处理</span>
                        <span className="feature-tag">🔀 PR操作</span>
                        <span className="feature-tag">📈 统计分析</span>
                      </>
                    )}
                    {selectedMcpServer.id === 'brave-search' && (
                      <>
                        <span className="feature-tag">🌐 网页搜索</span>
                        <span className="feature-tag">⚡ 实时信息</span>
                        <span className="feature-tag">🎯 精准结果</span>
                        <span className="feature-tag">🔒 隐私保护</span>
                      </>
                    )}
                    {selectedMcpServer.id === 'time' && (
                      <>
                        <span className="feature-tag">⏰ 时间计算</span>
                        <span className="feature-tag">📅 日期格式化</span>
                        <span className="feature-tag">🌍 时区转换</span>
                        <span className="feature-tag">📊 时间统计</span>
                      </>
                    )}
                    {selectedMcpServer.id === 'puppeteer' && (
                      <>
                        <span className="feature-tag">🤖 网页自动化</span>
                        <span className="feature-tag">📸 页面截图</span>
                        <span className="feature-tag">🕷️ 数据抓取</span>
                        <span className="feature-tag">🎭 模拟操作</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 使用场景 */}
                <div className="use-cases">
                  <h5>💡 使用场景</h5>
                  <ul>
                    {selectedMcpServer.id === 'filesystem' && (
                      <>
                        <li>批量处理文件和文档</li>
                        <li>自动化文件整理和备份</li>
                        <li>日志文件分析和处理</li>
                      </>
                    )}
                    {selectedMcpServer.id === 'sqlite' && (
                      <>
                        <li>轻量级数据存储和查询</li>
                        <li>数据分析和报表生成</li>
                        <li>应用程序数据管理</li>
                      </>
                    )}
                    {selectedMcpServer.id === 'github' && (
                      <>
                        <li>自动化代码仓库管理</li>
                        <li>Issue和PR的批量处理</li>
                        <li>项目统计和分析报告</li>
                      </>
                    )}
                    {selectedMcpServer.id === 'brave-search' && (
                      <>
                        <li>实时信息搜索和获取</li>
                        <li>市场调研和竞品分析</li>
                        <li>新闻和趋势监控</li>
                      </>
                    )}
                    {selectedMcpServer.id === 'time' && (
                      <>
                        <li>跨时区会议安排</li>
                        <li>项目时间计算和规划</li>
                        <li>日程管理和提醒</li>
                      </>
                    )}
                    {selectedMcpServer.id === 'puppeteer' && (
                      <>
                        <li>网站测试和监控</li>
                        <li>数据采集和分析</li>
                        <li>自动化表单填写</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* 技术信息部分 */}
              <div className="server-info-section">
                <h5>🔧 技术信息</h5>
                <div className="tech-info">
                  <div className="info-item">
                    <span className="info-label">传输方式:</span>
                    <span className="info-value">{selectedMcpServer.transport.toUpperCase()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">执行命令:</span>
                    <span className="info-value">{selectedMcpServer.command} {selectedMcpServer.args.join(' ')}</span>
                  </div>
                  {selectedMcpServer.documentation && (
                    <div className="info-item">
                      <span className="info-label">文档链接:</span>
                      <a
                        href={selectedMcpServer.documentation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-link"
                      >
                        📖 查看官方文档
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {selectedMcpServer.requiresConfig && selectedMcpServer.configFields && (
                <div className="config-fields">
                  <h4>配置参数</h4>
                  {selectedMcpServer.configFields.map(field => (
                    <div key={field.key} className="form-group">
                      <label>{field.label}:</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={mcpConfigForm[field.key] || ''}
                        onChange={(e) => setMcpConfigForm({
                          ...mcpConfigForm,
                          [field.key]: e.target.value
                        })}
                        required={field.required}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="form-actions">
                <button
                  onClick={() => setShowMcpConfig(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={saveMcpServerConfig}
                  className="btn-primary"
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 平台配置对话框 */}
      {showConfig && (
        <div className="config-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>配置 {selectedPlatform?.platform_name}</h3>
              <button 
                onClick={() => setShowConfig(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="config-form">
              <div className="form-group">
                <label>平台名称:</label>
                <input
                  type="text"
                  value={configForm.platform_name}
                  onChange={(e) => setConfigForm({...configForm, platform_name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>基础 URL:</label>
                <input
                  type="text"
                  value={configForm.base_url}
                  onChange={(e) => setConfigForm({...configForm, base_url: e.target.value})}
                />
              </div>
              
              {/* 根据平台类型显示不同的配置字段 */}

              {selectedPlatform?.platform_id === 'modao' && (
                <>
                  <div className="form-group">
                    <label>魔搭 Token:</label>
                    <input
                      type="password"
                      value={configForm.api_key}
                      onChange={(e) => setConfigForm({...configForm, api_key: e.target.value})}
                      placeholder="输入魔搭 API Token"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cookie (可选):</label>
                    <input
                      type="text"
                      value={configForm.extra_config?.cookie || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        extra_config: {...configForm.extra_config, cookie: e.target.value}
                      })}
                      placeholder="用于绕过登录验证的 Cookie"
                    />
                  </div>
                </>
              )}

              {selectedPlatform?.platform_id === 'tencent_scf' && (
                <>
                  <div className="form-group">
                    <label>Secret ID:</label>
                    <input
                      type="text"
                      value={configForm.extra_config?.secret_id || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        extra_config: {...configForm.extra_config, secret_id: e.target.value}
                      })}
                      placeholder="腾讯云 Secret ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>Secret Key:</label>
                    <input
                      type="password"
                      value={configForm.extra_config?.secret_key || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        extra_config: {...configForm.extra_config, secret_key: e.target.value}
                      })}
                      placeholder="腾讯云 Secret Key"
                    />
                  </div>
                  <div className="form-group">
                    <label>区域:</label>
                    <select
                      value={configForm.region}
                      onChange={(e) => setConfigForm({...configForm, region: e.target.value})}
                    >
                      <option value="ap-guangzhou">广州 (ap-guangzhou)</option>
                      <option value="ap-shanghai">上海 (ap-shanghai)</option>
                      <option value="ap-beijing">北京 (ap-beijing)</option>
                      <option value="ap-chengdu">成都 (ap-chengdu)</option>
                    </select>
                  </div>
                </>
              )}

              {selectedPlatform?.platform_id === 'aliyun_fc' && (
                <>
                  <div className="form-group">
                    <label>Access Key ID:</label>
                    <input
                      type="text"
                      value={configForm.extra_config?.access_key_id || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        extra_config: {...configForm.extra_config, access_key_id: e.target.value}
                      })}
                      placeholder="阿里云 Access Key ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>Access Key Secret:</label>
                    <input
                      type="password"
                      value={configForm.extra_config?.access_key_secret || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        extra_config: {...configForm.extra_config, access_key_secret: e.target.value}
                      })}
                      placeholder="阿里云 Access Key Secret"
                    />
                  </div>
                  <div className="form-group">
                    <label>区域:</label>
                    <select
                      value={configForm.region}
                      onChange={(e) => setConfigForm({...configForm, region: e.target.value})}
                    >
                      <option value="cn-hangzhou">杭州 (cn-hangzhou)</option>
                      <option value="cn-shanghai">上海 (cn-shanghai)</option>
                      <option value="cn-beijing">北京 (cn-beijing)</option>
                      <option value="cn-shenzhen">深圳 (cn-shenzhen)</option>
                    </select>
                  </div>
                </>
              )}
              
              <div className="form-group">
                <label>超时时间 (秒):</label>
                <input
                  type="number"
                  value={configForm.timeout}
                  onChange={(e) => setConfigForm({...configForm, timeout: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={configForm.enabled}
                    onChange={(e) => setConfigForm({...configForm, enabled: e.target.checked})}
                  />
                  启用此平台
                </label>
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowConfig(false)} className="btn-secondary">
                取消
              </button>
              <button onClick={updatePlatformConfig} className="btn-primary">
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPPlatformManager;
