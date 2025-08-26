import React, { useState, useEffect, useCallback } from 'react';
import './SecurityManagementPage.css';

const SecurityManagementPage = () => {
  const [securityData, setSecurityData] = useState({
    auditLogs: [],
    securityEvents: [],
    loginHistory: [],
    apiKeyUsage: [],
    threatDetection: {
      suspiciousLogins: 0,
      failedAttempts: 0,
      blockedIPs: 0,
      anomalousActivity: 0
    },
    encryptionStatus: {
      masterKeyRotation: '未知',
      userKeysCount: 0,
      encryptedDataSize: '0 MB',
      integrityChecks: '未知'
    }
  });

  // API密钥管理状态
  const [apiKeys, setApiKeys] = useState([]);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyDialogMode, setApiKeyDialogMode] = useState('create');
  const [selectedApiKey, setSelectedApiKey] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState(new Set());
  const [apiKeyForm, setApiKeyForm] = useState({
    service_name: '',
    service_type: 'ai',
    key_name: '',
    api_key: '',
    expires_at: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('audit');
  const [timeRange, setTimeRange] = useState('7d');

  const loadSecurityAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('请先登录');
        return;
      }

      // 尝试从后端获取安全审计数据
      const auditResponse = await fetch(`/api/security/audit-logs?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const threatResponse = await fetch('/api/security/threat-detection', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const loginHistoryResponse = await fetch('/api/security/login-history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const encryptionStatusResponse = await fetch('/api/security/encryption-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let auditData, threatData, loginData, encryptionData;

      // 如果后端API可用，使用真实数据，否则使用模拟数据
      if (auditResponse.ok) {
        try {
          auditData = await auditResponse.json();
        } catch (error) {
          console.error('解析审计日志响应失败:', error);
        }
      }
      if (threatResponse.ok) {
        try {
          threatData = await threatResponse.json();
        } catch (error) {
          console.error('解析威胁检测响应失败:', error);
        }
      }
      if (loginHistoryResponse.ok) {
        try {
          loginData = await loginHistoryResponse.json();
        } catch (error) {
          console.error('解析登录历史响应失败:', error);
        }
      }
      if (encryptionStatusResponse.ok) {
        try {
          encryptionData = await encryptionStatusResponse.json();
        } catch (error) {
          console.error('解析加密状态响应失败:', error);
        }
      }

      // 只使用真实数据，如果没有数据则保持空状态
      const realData = {
        auditLogs: auditData?.logs || [],
        securityEvents: threatData?.events || [],
        loginHistory: loginData?.history || [],
        apiKeyUsage: encryptionData?.apiKeyUsage || [],
        threatDetection: threatData?.threatDetection || null,
        encryptionStatus: encryptionData?.encryptionStatus || null
      };

      // 只更新真实数据
      const updatedData = {
        auditLogs: realData.auditLogs,
        securityEvents: realData.securityEvents,
        loginHistory: realData.loginHistory,
        apiKeyUsage: realData.apiKeyUsage
      };

      // 更新威胁检测数据（仅真实数据）
      if (realData.threatDetection) {
        updatedData.threatDetection = realData.threatDetection;
      }

      // 更新加密状态数据（仅真实数据）
      if (realData.encryptionStatus) {
        updatedData.encryptionStatus = realData.encryptionStatus;
      }

      setSecurityData(prev => ({
        ...prev,
        ...updatedData
      }));
    } catch (err) {
      console.error('获取安全审计数据失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // 加载API密钥列表
  const loadAPIKeys = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch('/api/security/api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.api_keys || []);
      } else if (response.status === 401) {
        setError('登录已过期，请重新登录');
        localStorage.removeItem('access_token');
      } else {
        // 其他HTTP错误，但连接是成功的
        console.error('API密钥请求失败:', response.status, response.statusText);
        setApiKeys([]);
      }
    } catch (err) {
      console.error('获取API密钥失败:', err);
      setError('网络错误，请稍后重试');
    }
  };

  // 加载安全审计数据
  useEffect(() => {
    loadSecurityAuditData();
    if (activeTab === 'apikeys') {
      loadAPIKeys();
    }
  }, [timeRange, activeTab, loadSecurityAuditData]);

  // 导出安全报告
  const exportSecurityReport = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('请先登录');
        return;
      }

      // 模拟导出功能
      const reportData = {
        generatedAt: new Date().toISOString(),
        timeRange: timeRange,
        summary: {
          totalEvents: securityData.auditLogs.length,
          securityIncidents: securityData.securityEvents.length,
          loginAttempts: securityData.loginHistory.length,
          apiKeyUsage: securityData.apiKeyUsage.length
        },
        details: securityData
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('安全报告已导出');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('导出报告失败:', err);
      setError('导出失败，请稍后重试');
    }
  };

  // API密钥管理函数
  const handleOpenApiKeyDialog = (mode, key = null) => {
    setApiKeyDialogMode(mode);
    setSelectedApiKey(key);

    if (mode === 'create') {
      setApiKeyForm({
        service_name: '',
        service_type: 'ai',
        key_name: '',
        api_key: '',
        expires_at: ''
      });
    } else if (mode === 'edit' && key) {
      setApiKeyForm({
        service_name: key.service_name,
        service_type: key.service_type,
        key_name: key.key_name,
        api_key: '',
        expires_at: key.expires_at || ''
      });
    }

    setShowApiKeyDialog(true);
  };

  const handleCloseApiKeyDialog = () => {
    setShowApiKeyDialog(false);
    setSelectedApiKey(null);
    setApiKeyForm({
      service_name: '',
      service_type: 'ai',
      key_name: '',
      api_key: '',
      expires_at: ''
    });
  };

  const handleApiKeyFormChange = (e) => {
    const { name, value } = e.target;
    setApiKeyForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitApiKey = async () => {
    try {
      const token = localStorage.getItem('access_token');
      let url = '/api/security/api-keys';
      let method = 'POST';

      if (apiKeyDialogMode === 'edit' && selectedApiKey) {
        url = `/api/security/api-keys/${selectedApiKey.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiKeyForm)
      });

      if (response.ok) {
        setSuccess(apiKeyDialogMode === 'create' ? 'API密钥创建成功' : 'API密钥更新成功');
        handleCloseApiKeyDialog();
        loadAPIKeys();
      } else {
        const data = await response.json();
        setError(data.detail || '操作失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  const handleDeleteApiKey = async (keyId) => {
    if (!window.confirm('确定要删除这个API密钥吗？此操作不可撤销。')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`/api/security/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('API密钥删除成功');
        loadAPIKeys();
      } else {
        setError('删除失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  const handleViewApiKey = async (keyId) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`/api/security/api-keys/${keyId}/decrypt`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // 显示密钥（临时）
        setVisibleKeys(prev => new Set([...prev, keyId]));

        // 5秒后自动隐藏
        setTimeout(() => {
          setVisibleKeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(keyId);
            return newSet;
          });
        }, 5000);

        setSuccess('密钥已显示，5秒后自动隐藏');
      } else {
        setError('获取密钥失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  // 获取严重性等级的样式类
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'ERROR': return 'severity-error';
      case 'WARNING': return 'severity-warning';
      case 'INFO': return 'severity-info';
      default: return 'severity-info';
    }
  };

  // 获取状态的样式类
  const getStatusClass = (status) => {
    switch (status) {
      case 'SUCCESS': return 'status-success';
      case 'FAILED': return 'status-failed';
      case 'BLOCKED': return 'status-blocked';
      case 'ACTIVE': return 'status-active';
      default: return 'status-unknown';
    }
  };

  // 渲染审计日志标签页
  const renderAuditTab = () => (
    <div className="audit-content">
      <div className="audit-header">
        <h3>安全审计日志</h3>
        <div className="audit-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="1d">最近1天</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
          <button className="btn-secondary" onClick={exportSecurityReport}>
            📊 导出报告
          </button>
        </div>
      </div>

      <div className="audit-logs">
        {securityData.auditLogs && securityData.auditLogs.length > 0 ? (
          securityData.auditLogs.map(log => (
            <div key={log.id} className="audit-log-item">
              <div className="log-header">
                <span className={`log-severity ${getSeverityClass(log.severity)}`}>
                  {log.severity}
                </span>
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-ip">IP: {log.ip}</span>
              </div>
              <div className="log-event">{log.event}</div>
              <div className="log-details">{log.details}</div>
            </div>
          ))
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">📝</div>
            <h4>暂无审计日志</h4>
            <p>当前没有审计日志记录</p>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染威胁检测标签页
  const renderThreatTab = () => (
    <div className="threat-content">
      {securityData.threatDetection ? (
        <>
          <div className="threat-overview">
            <h3>威胁检测概览</h3>
            <div className="threat-stats">
              <div className="threat-stat-item">
                <div className="stat-number">{securityData.threatDetection.suspiciousLogins}</div>
                <div className="stat-label">可疑登录</div>
              </div>
              <div className="threat-stat-item">
                <div className="stat-number">{securityData.threatDetection.failedAttempts}</div>
                <div className="stat-label">失败尝试</div>
              </div>
              <div className="threat-stat-item">
                <div className="stat-number">{securityData.threatDetection.blockedIPs}</div>
                <div className="stat-label">被阻止IP</div>
              </div>
              <div className="threat-stat-item">
                <div className="stat-number">{securityData.threatDetection.anomalousActivity}</div>
                <div className="stat-label">异常活动</div>
              </div>
            </div>
          </div>

          <div className="security-events">
            <h4>安全事件</h4>
            {securityData.securityEvents && securityData.securityEvents.length > 0 ? (
              securityData.securityEvents.map(event => (
                <div key={event.id} className="security-event-item">
                  <div className="event-header">
                    <span className="event-type">{event.type}</span>
                    <span className={`event-status ${getStatusClass(event.status)}`}>
                      {event.status}
                    </span>
                    <span className="event-timestamp">{event.timestamp}</span>
                  </div>
                  <div className="event-description">{event.description}</div>
                </div>
              ))
            ) : (
              <p>暂无安全事件</p>
            )}
          </div>
        </>
      ) : (
        <div className="no-data-message">
          <div className="no-data-icon">🛡️</div>
          <h4>暂无威胁检测数据</h4>
          <p>当前没有检测到安全威胁</p>
        </div>
      )}
    </div>
  );

  // 渲染登录历史标签页
  const renderLoginTab = () => (
    <div className="login-content">
      <h3>登录历史</h3>
      <div className="login-history">
        {securityData.loginHistory && securityData.loginHistory.length > 0 ? (
          securityData.loginHistory.map(login => (
            <div key={login.id} className="login-item">
              <div className="login-header">
                <span className={`login-status ${getStatusClass(login.status)}`}>
                  {login.status === 'SUCCESS' ? '✅' : '❌'}
                </span>
                <span className="login-timestamp">{login.timestamp}</span>
                <span className="login-ip">IP: {login.ip}</span>
              </div>
              <div className="login-details">
                <span className="login-location">📍 {login.location}</span>
                <span className="login-device">💻 {login.device}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">🔐</div>
            <h4>暂无登录历史</h4>
            <p>当前没有登录历史记录</p>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染加密状态标签页
  const renderEncryptionTab = () => (
    <div className="encryption-content">
      <h3>数据加密状态</h3>
      {securityData.encryptionStatus ? (
        <>
          <div className="encryption-overview">
            <div className="encryption-stat-grid">
              <div className="encryption-stat-item">
                <div className="stat-icon">🔐</div>
                <div className="stat-info">
                  <div className="stat-label">主密钥轮换</div>
                  <div className="stat-value">{securityData.encryptionStatus.masterKeyRotation}</div>
                </div>
              </div>
              <div className="encryption-stat-item">
                <div className="stat-icon">🔑</div>
                <div className="stat-info">
                  <div className="stat-label">用户密钥数量</div>
                  <div className="stat-value">{securityData.encryptionStatus.userKeysCount}</div>
                </div>
              </div>
              <div className="encryption-stat-item">
                <div className="stat-icon">💾</div>
                <div className="stat-info">
                  <div className="stat-label">加密数据大小</div>
                  <div className="stat-value">{securityData.encryptionStatus.encryptedDataSize}</div>
                </div>
              </div>
              <div className="encryption-stat-item">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <div className="stat-label">完整性检查</div>
                  <div className="stat-value">{securityData.encryptionStatus.integrityChecks}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="api-key-usage">
            <h4>API密钥使用统计</h4>
            {securityData.apiKeyUsage && securityData.apiKeyUsage.length > 0 ? (
              securityData.apiKeyUsage.map((usage, index) => (
                <div key={index} className="api-usage-item">
                  <div className="usage-header">
                    <span className="service-name">{usage.service}</span>
                    <span className={`usage-status ${getStatusClass(usage.status)}`}>
                      {usage.status}
                    </span>
                  </div>
                  <div className="usage-stats">
                    <span className="usage-requests">📊 {usage.requests} 次请求</span>
                    <span className="usage-last-used">🕒 最后使用: {usage.lastUsed}</span>
                  </div>
                </div>
              ))
            ) : (
              <p>暂无API密钥使用数据</p>
            )}
          </div>
        </>
      ) : (
        <div className="no-data-message">
          <div className="no-data-icon">🔒</div>
          <h4>暂无加密状态数据</h4>
          <p>当前没有加密状态信息</p>
        </div>
      )}
    </div>
  );

  // 渲染API密钥管理标签页
  const renderApiKeysTab = () => (
    <div className="apikeys-content">
      <div className="apikeys-header">
        <h3>API密钥管理</h3>
        <button
          className="btn-primary"
          onClick={() => handleOpenApiKeyDialog('create')}
        >
          ➕ 添加密钥
        </button>
      </div>

      <div className="apikeys-table">
        <table className="security-table">
          <thead>
            <tr>
              <th>服务名称</th>
              <th>密钥名称</th>
              <th>类型</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>最后使用</th>
              <th>过期时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div className="empty-content">
                    <div className="empty-icon">🔑</div>
                    <h4>暂无API密钥</h4>
                    <p>点击"添加密钥"开始配置您的AI服务密钥</p>
                  </div>
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr key={key.id}>
                  <td>
                    <div className="service-info">
                      <span className="service-icon">🔐</span>
                      <span className="service-name">{key.service_name}</span>
                    </div>
                  </td>
                  <td>{key.key_name}</td>
                  <td>
                    <span className="type-chip">{key.service_type}</span>
                  </td>
                  <td>
                    <span className={`status-chip status-${key.key_status}`}>
                      {key.key_status === 'active' ? '✅ 活跃' : '❌ 停用'}
                    </span>
                  </td>
                  <td>
                    {key.created_at
                      ? new Date(key.created_at).toLocaleDateString()
                      : '未知'
                    }
                  </td>
                  <td>
                    {key.last_used
                      ? new Date(key.last_used).toLocaleDateString()
                      : '从未使用'
                    }
                  </td>
                  <td>
                    {key.expires_at
                      ? new Date(key.expires_at).toLocaleDateString()
                      : '永不过期'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        onClick={() => handleViewApiKey(key.id)}
                        title="查看密钥"
                      >
                        {visibleKeys.has(key.id) ? '🙈' : '👁️'}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenApiKeyDialog('edit', key)}
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDeleteApiKey(key.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="security-management-page">
      <div className="security-header">
        <h1>安全管理中心</h1>
        <p>安全审计、威胁检测和数据加密监控</p>
      </div>

      {/* 错误和成功消息 */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')} className="alert-close">×</button>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="security-tabs">
        <button
          className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📋 安全审计
        </button>
        <button
          className={`tab-button ${activeTab === 'threat' ? 'active' : ''}`}
          onClick={() => setActiveTab('threat')}
        >
          🛡️ 威胁检测
        </button>
        <button
          className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          🔐 登录历史
        </button>
        <button
          className={`tab-button ${activeTab === 'encryption' ? 'active' : ''}`}
          onClick={() => setActiveTab('encryption')}
        >
          🔒 数据加密
        </button>
        <button
          className={`tab-button ${activeTab === 'apikeys' ? 'active' : ''}`}
          onClick={() => setActiveTab('apikeys')}
        >
          🔑 API密钥
        </button>
      </div>

      {/* 标签页内容 */}
      <div className="security-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>加载安全数据中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'audit' && renderAuditTab()}
            {activeTab === 'threat' && renderThreatTab()}
            {activeTab === 'login' && renderLoginTab()}
            {activeTab === 'encryption' && renderEncryptionTab()}
            {activeTab === 'apikeys' && renderApiKeysTab()}
          </>
        )}
      </div>

      {/* API密钥管理弹窗 */}
      {showApiKeyDialog && (
        <div className="security-overlay" onClick={handleCloseApiKeyDialog}>
          <div className="security-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{apiKeyDialogMode === 'create' ? '添加API密钥' : '编辑API密钥'}</h3>
              <button
                className="close-btn"
                onClick={handleCloseApiKeyDialog}
              >
                ×
              </button>
            </div>

            <form className="apikey-form" onSubmit={(e) => { e.preventDefault(); handleSubmitApiKey(); }}>
              <div className="form-group">
                <label>服务名称</label>
                <select
                  name="service_name"
                  value={apiKeyForm.service_name}
                  onChange={handleApiKeyFormChange}
                  required
                  className="form-input"
                >
                  <option value="">请选择服务</option>
                  <option value="DeepSeek">DeepSeek</option>
                  <option value="OpenAI">OpenAI</option>
                  <option value="Claude">Claude (Anthropic)</option>
                  <option value="通义千问">通义千问 (阿里云)</option>
                  <option value="文心一言">文心一言 (百度)</option>
                  <option value="智谱AI">智谱AI</option>
                  <option value="Gemini">Gemini (Google)</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div className="form-group">
                <label>服务类型</label>
                <select
                  name="service_type"
                  value={apiKeyForm.service_type}
                  onChange={handleApiKeyFormChange}
                  className="form-input"
                >
                  <option value="ai">AI服务</option>
                  <option value="api">API服务</option>
                  <option value="database">数据库</option>
                  <option value="storage">存储服务</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="form-group">
                <label>密钥名称</label>
                <input
                  type="text"
                  name="key_name"
                  value={apiKeyForm.key_name}
                  onChange={handleApiKeyFormChange}
                  required
                  placeholder="为这个密钥起一个便于识别的名称"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>API密钥</label>
                <input
                  type="password"
                  name="api_key"
                  value={apiKeyForm.api_key}
                  onChange={handleApiKeyFormChange}
                  required={apiKeyDialogMode === 'create'}
                  placeholder={apiKeyDialogMode === 'edit' ? '留空表示不修改密钥值' : '请输入API密钥'}
                  className="form-input"
                />
                <small className="form-help">
                  密钥将使用AES-256-GCM算法加密存储
                </small>
              </div>

              <div className="form-group">
                <label>过期时间（可选）</label>
                <input
                  type="datetime-local"
                  name="expires_at"
                  value={apiKeyForm.expires_at}
                  onChange={handleApiKeyFormChange}
                  className="form-input"
                />
                <small className="form-help">
                  留空表示永不过期
                </small>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {apiKeyDialogMode === 'create' ? '创建密钥' : '更新密钥'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseApiKeyDialog}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityManagementPage;
