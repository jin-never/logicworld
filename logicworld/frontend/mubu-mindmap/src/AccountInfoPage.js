import React, { useState, useEffect } from 'react';
import './AccountInfoPage.css';

const AccountInfoPage = () => {
  const [accountData, setAccountData] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [securitySettings, setSecuritySettings] = useState({});

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 从后端获取用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('请先登录');
          return;
        }

        // 获取用户基本信息
        const profileResponse = await fetch('/api/security/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (profileResponse.ok) {
          try {
            const userData = await profileResponse.json();
            setAccountData(prev => ({
              ...prev,
              userId: userData.user_id,
              username: userData.username,
              email: userData.email,
              phone: userData.phone,
              registrationDate: new Date(userData.created_at).toLocaleDateString(),
              lastLogin: userData.last_login ? new Date(userData.last_login).toLocaleString() : '从未登录',
              accountStatus: userData.status,
              emailVerified: userData.email_verified,
              twoFactorEnabled: userData.two_factor_enabled
            }));
          } catch (error) {
            console.error('解析用户信息响应失败:', error);
          }
        } else if (profileResponse.status === 401) {
          setError('登录已过期，请重新登录');
          localStorage.removeItem('access_token');
          return;
        } else {
          setError('获取用户信息失败');
          return;
        }

        // 尝试获取存储使用情况
        try {
          const storageResponse = await fetch('/api/security/user/storage', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (storageResponse.ok) {
            try {
              const storageData = await storageResponse.json();
              setAccountData(prev => ({
                ...prev,
                storageUsed: storageData.used_gb,
                storageLimit: storageData.limit_gb
              }));
            } catch (error) {
              console.error('解析存储信息响应失败:', error);
            }
          }
          // 如果存储API失败，不显示错误，只是不显示存储信息
        } catch (storageErr) {
          console.log('存储信息获取失败:', storageErr);
        }

      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError('网络错误，请稍后重试');
      }
    };

    loadUserInfo();
  }, []);

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('新密码长度至少8位');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch('/api/security/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          confirm_password: passwordForm.confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('密码修改成功');
        setShowPasswordChange(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

        // 更新安全设置中的密码修改时间
        setSecuritySettings(prev => ({
          ...prev,
          passwordLastChanged: new Date().toLocaleDateString()
        }));
      } else {
        setError(data.detail || '密码修改失败');
      }
    } catch (err) {
      console.error('密码修改失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSecurity = async (setting) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const newValue = !securitySettings[setting];

      // 调用后端API更新安全设置
      const response = await fetch('/api/security/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          [setting]: newValue
        })
      });

      if (response.ok) {
        setSecuritySettings(prev => ({
          ...prev,
          [setting]: newValue
        }));
        setSuccess(`${setting === 'twoFactorAuth' ? '双因素认证' : '登录通知'}设置已更新`);
        setTimeout(() => setSuccess(''), 3000);
      } else if (response.status === 401) {
        setError('登录已过期，请重新登录');
        localStorage.removeItem('access_token');
      } else {
        setError('更新设置失败');
      }
    } catch (error) {
      console.error('更新安全设置失败:', error);
      setError('网络错误，请稍后重试');
    }
  };

  // 注销账户
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ 警告：此操作将永久删除您的账户和所有数据，包括：\n\n' +
      '• 所有思维导图和工作流\n' +
      '• 个人设置和偏好\n' +
      '• API密钥和连接配置\n' +
      '• 账户历史记录\n\n' +
      '此操作无法撤销！确定要继续吗？'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      '最后确认：您真的要永久删除账户吗？\n\n' +
      '请输入"DELETE"来确认删除（区分大小写）'
    );

    if (!doubleConfirm) return;

    const userInput = prompt('请输入 "DELETE" 来确认删除账户：');
    if (userInput !== 'DELETE') {
      alert('输入不正确，账户删除已取消。');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch('/api/security/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('账户已成功删除。感谢您使用我们的服务！');

        // 清除所有本地数据
        localStorage.clear();
        sessionStorage.clear();

        // 重新加载页面以触发重新认证
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.detail || '账户删除失败');
      }
    } catch (err) {
      console.error('删除账户失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { text: '正常', class: 'status-active' },
      suspended: { text: '暂停', class: 'status-suspended' },
      pending: { text: '待验证', class: 'status-pending' }
    };
    return statusMap[status] || { text: '未知', class: 'status-unknown' };
  };

  const getSubscriptionBadge = (subscription) => {
    const subMap = {
      free: { text: '免费版', class: 'sub-free' },
      premium: { text: '高级版', class: 'sub-premium' },
      enterprise: { text: '企业版', class: 'sub-enterprise' }
    };
    return subMap[subscription] || { text: '未知', class: 'sub-unknown' };
  };

  return (
    <div className="account-info-page">
      <div className="account-header">
        <h1>账户信息</h1>
        <p>查看和管理您的账户详情与安全设置</p>
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

      <div className="account-content">
        {/* 基本信息 */}
        <div className="info-section">
          <div className="section-header">
            <h2>基本信息</h2>
          </div>

          {accountData && Object.keys(accountData).length > 0 ? (
            <div className="info-grid">
              <div className="info-item">
                <label>用户ID</label>
                <span className="info-value">{accountData.userId}</span>
              </div>

              <div className="info-item">
                <label>用户名</label>
                <span className="info-value">{accountData.username}</span>
              </div>

              <div className="info-item">
                <label>邮箱地址</label>
                <span className="info-value">{accountData.email}</span>
              </div>

              <div className="info-item">
                <label>手机号码</label>
                <span className="info-value">{accountData.phone}</span>
              </div>

              <div className="info-item">
                <label>注册时间</label>
                <span className="info-value">{accountData.registrationDate}</span>
              </div>

              <div className="info-item">
                <label>最后登录</label>
                <span className="info-value">{accountData.lastLogin}</span>
              </div>

              <div className="info-item">
                <label>账户状态</label>
                <span className={`status-badge ${getStatusBadge(accountData.accountStatus).class}`}>
                  {getStatusBadge(accountData.accountStatus).text}
                </span>
              </div>

              <div className="info-item">
                <label>订阅类型</label>
                <span className={`subscription-badge ${getSubscriptionBadge(accountData.subscription).class}`}>
                  {getSubscriptionBadge(accountData.subscription).text}
                </span>
              </div>
            </div>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">⚠️</div>
              <h4>无法加载账户信息</h4>
              <p>后端服务连接失败，请检查网络连接或联系管理员</p>
            </div>
          )}
        </div>

        {/* 存储使用情况 */}
        <div className="info-section">
          <div className="section-header">
            <h2>存储使用情况</h2>
          </div>

          {accountData && accountData.storageUsed !== undefined && accountData.storageLimit !== undefined ? (
            <div className="storage-info">
              <div className="storage-stats">
                <div className="storage-used">
                  <span className="storage-number">{accountData.storageUsed} GB</span>
                  <span className="storage-label">已使用</span>
                </div>
                <div className="storage-total">
                  <span className="storage-number">{accountData.storageLimit} GB</span>
                  <span className="storage-label">总容量</span>
                </div>
              </div>

              <div className="storage-bar">
                <div
                  className="storage-progress"
                  style={{ width: `${(accountData.storageUsed / accountData.storageLimit) * 100}%` }}
                ></div>
              </div>

              <div className="storage-percentage">
                {Math.round((accountData.storageUsed / accountData.storageLimit) * 100)}% 已使用
              </div>
            </div>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">⚠️</div>
              <h4>无法加载存储信息</h4>
              <p>后端服务连接失败，请检查网络连接或联系管理员</p>
            </div>
          )}
        </div>

        {/* 安全设置 */}
        <div className="info-section">
          <div className="section-header">
            <h2>安全设置</h2>
          </div>
          
          <div className="security-settings">
            <div className="security-item">
              <div className="security-info">
                <h4>双重认证</h4>
                <p>为您的账户添加额外的安全保护</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={securitySettings.twoFactorAuth}
                  onChange={() => handleToggleSecurity('twoFactorAuth')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="security-item">
              <div className="security-info">
                <h4>登录通知</h4>
                <p>当有新设备登录时发送邮件通知</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={securitySettings.loginNotifications}
                  onChange={() => handleToggleSecurity('loginNotifications')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="security-item">
              <div className="security-info">
                <h4>密码管理</h4>
                <p>上次更改时间: {securitySettings.passwordLastChanged}</p>
              </div>
              <button 
                className="btn-secondary"
                onClick={() => setShowPasswordChange(true)}
              >
                更改密码
              </button>
            </div>
            
            <div className="security-item">
              <div className="security-info">
                <h4>受信任设备</h4>
                <p>当前有 {securitySettings.trustedDevices} 台受信任设备</p>
              </div>
              <button className="btn-secondary">
                管理设备
              </button>
            </div>
          </div>
        </div>

        {/* 账户操作 */}
        <div className="info-section">
          <div className="section-header">
            <h2>账户操作</h2>
          </div>
          
          <div className="account-actions">
            <button className="btn-primary">
              升级订阅
            </button>
            <button className="btn-secondary">
              导出数据
            </button>
            <button
              className="btn-secondary logout-btn"
              onClick={() => {
                if (window.confirm('确定要退出登录吗？')) {
                  // 先获取token，然后再清除
                  const token = localStorage.getItem('access_token');

                  // 清除所有认证相关的本地存储
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('user_info');
                  localStorage.removeItem('userInfo');

                  // 调用后端登出API（如果有token的话）
                  if (token) {
                    fetch('/api/security/logout', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    }).catch(err => console.log('Logout API call failed:', err));
                  }

                  // 刷新页面以触发重新认证
                  window.location.reload();
                }
              }}
            >
              退出登录
            </button>
            <button
              className="btn-danger"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              {loading ? '处理中...' : '注销账户'}
            </button>
          </div>
        </div>
      </div>

      {/* 密码更改弹窗 */}
      {showPasswordChange && (
        <div className="password-overlay" onClick={() => setShowPasswordChange(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>更改密码</h3>
              <button 
                className="close-btn"
                onClick={() => setShowPasswordChange(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label>当前密码</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  确认更改
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowPasswordChange(false)}
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

export default AccountInfoPage;
