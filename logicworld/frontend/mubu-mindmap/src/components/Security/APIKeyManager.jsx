import React, { useState, useEffect } from 'react';
import './SecurityComponents.css';

const APIKeyManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 对话框状态
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedKey, setSelectedKey] = useState(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    service_name: '',
    service_type: 'ai',
    key_name: '',
    api_key: '',
    expires_at: ''
  });
  
  // 显示密钥状态
  const [visibleKeys, setVisibleKeys] = useState(new Set());

  // 服务选项
  const serviceOptions = [
    { value: 'deepseek', label: 'DeepSeek', type: 'ai' },
    { value: 'openai', label: 'OpenAI', type: 'ai' },
    { value: 'claude', label: 'Claude', type: 'ai' },
    { value: 'qwen', label: '通义千问', type: 'ai' },
    { value: 'smithery', label: 'Smithery', type: 'mcp' },
    { value: 'custom', label: '自定义服务', type: 'tool' }
  ];

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch('/api/security/api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      } else {
        setError('获取API密钥列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, key = null) => {
    setDialogMode(mode);
    setSelectedKey(key);
    
    if (mode === 'create') {
      setFormData({
        service_name: '',
        service_type: 'ai',
        key_name: '',
        api_key: '',
        expires_at: ''
      });
    } else if (mode === 'edit' && key) {
      setFormData({
        service_name: key.service_name,
        service_type: key.service_type,
        key_name: key.key_name,
        api_key: '',
        expires_at: key.expires_at || ''
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedKey(null);
    setError('');
    setSuccess('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('access_token');
      let url = '/api/security/api-keys';
      let method = 'POST';
      
      if (dialogMode === 'edit' && selectedKey) {
        url = `/api/security/api-keys/${selectedKey.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(dialogMode === 'create' ? 'API密钥创建成功' : 'API密钥更新成功');
        handleCloseDialog();
        loadAPIKeys();
      } else {
        setError(data.detail || '操作失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  const handleDelete = async (keyId) => {
    if (!window.confirm('确定要删除这个API密钥吗？')) {
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

  const handleViewKey = async (keyId) => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`/api/security/api-keys/${keyId}/decrypt`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
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
        
        // 这里可以显示解密后的密钥，但出于安全考虑，我们只是标记为可见
        console.log('解密的API密钥:', data.api_key);
      } else {
        setError('获取密钥失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'revoked': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '活跃';
      case 'expired': return '已过期';
      case 'revoked': return '已撤销';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div className="api-key-manager">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="api-key-manager">
      <div className="api-key-header">
        <h1>API密钥管理</h1>
        <button
          className="btn btn-primary"
          onClick={() => handleOpenDialog('create')}
        >
          ➕ 添加密钥
        </button>
      </div>

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

      <div className="api-key-table">
        <table className="table">
          <thead>
            <tr>
              <th>服务名称</th>
              <th>密钥名称</th>
              <th>类型</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>最后使用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  暂无API密钥，点击"添加密钥"开始配置
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr key={key.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      🔐 {key.service_name}
                    </div>
                  </td>
                  <td>{key.key_name}</td>
                  <td>
                    <span className="status-chip">{key.service_type}</span>
                  </td>
                  <td>
                    <span className={`status-chip status-${key.key_status}`}>
                      {getStatusText(key.key_status)}
                    </span>
                  </td>
                  <td>
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {key.last_used
                      ? new Date(key.last_used).toLocaleDateString()
                      : '从未使用'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        onClick={() => handleViewKey(key.id)}
                        title="查看密钥"
                      >
                        {visibleKeys.has(key.id) ? '🙈' : '👁️'}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenDialog('edit', key)}
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => handleDelete(key.id)}
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

      {/* 添加/编辑对话框 */}
      {openDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{dialogMode === 'create' ? '添加API密钥' : '编辑API密钥'}</h2>
              <button className="modal-close" onClick={handleCloseDialog}>×</button>
            </div>

            <form className="security-form">
              <div className="form-group">
                <label htmlFor="service_name">服务名称</label>
                <select
                  id="service_name"
                  name="service_name"
                  value={formData.service_name}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">请选择服务</option>
                  {serviceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="key_name">密钥名称</label>
                <input
                  type="text"
                  id="key_name"
                  name="key_name"
                  value={formData.key_name}
                  onChange={handleFormChange}
                  required
                  placeholder="为这个API密钥起一个便于识别的名称"
                />
              </div>

              <div className="form-group">
                <label htmlFor="api_key">API密钥</label>
                <input
                  type="password"
                  id="api_key"
                  name="api_key"
                  value={formData.api_key}
                  onChange={handleFormChange}
                  required={dialogMode === 'create'}
                  placeholder={dialogMode === 'edit' ? '留空表示不修改密钥值' : '请输入API密钥'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="expires_at">过期时间（可选）</label>
                <input
                  type="datetime-local"
                  id="expires_at"
                  name="expires_at"
                  value={formData.expires_at}
                  onChange={handleFormChange}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>留空表示永不过期</small>
              </div>

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}
            </form>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCloseDialog}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {dialogMode === 'create' ? '添加' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIKeyManager;
