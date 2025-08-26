import React, { useState, useEffect } from 'react';
import './PersonalSettingsPage.css';
import { useUser } from './UserContext';

const PersonalSettingsPage = () => {
  const { userInfo, updateUserInfo } = useUser();

  // 本地编辑状态，用于编辑时的临时存储
  const [localUserInfo, setLocalUserInfo] = useState({
    username: '',
    email: '',
    motto: '',
    avatar: null,
    userId: '',
    role: '',
    status: '',
    emailVerified: false,
    twoFactorEnabled: false,
    createdAt: '',
    lastLogin: ''
  });

  // 用户偏好设置状态
  const [preferences, setPreferences] = useState({});

  // 工作区设置状态
  const [workspaceSettings, setWorkspaceSettings] = useState(() => {
    // 尝试从localStorage加载工作区设置
    try {
      const savedSettings = localStorage.getItem('workspaceSettings');
      console.log('PersonalSettingsPage - 加载保存的设置:', savedSettings);
      if (savedSettings && savedSettings !== '{}') {
        const parsed = JSON.parse(savedSettings);
        console.log('PersonalSettingsPage - 解析后的设置:', parsed);
        
        // 确保必要字段存在
        const result = {
          defaultOutputPath: parsed.defaultOutputPath || '', // 确保包含defaultOutputPath
          enableDateFolders: parsed.enableDateFolders || false,
          enableProjectFolders: parsed.enableProjectFolders || false,
          fileNamingPattern: parsed.fileNamingPattern || '文档_时间戳_类型',
          fileTypes: parsed.fileTypes || {
            documents: '',
            data: '',
            images: '',
            media: ''
          },
          cloudSync: parsed.cloudSync || {
            enabled: false,
            provider: 'none',
            syncPath: ''
          },
          ...parsed // 包含所有其他设置
        };
        console.log('PersonalSettingsPage - 最终初始化结果:', result);
        return result;
      }
    } catch (error) {
      console.error('加载工作区设置失败:', error);
    }
    
    // 返回默认设置
    const defaultSettings = {
      defaultOutputPath: '', // 添加默认输出路径字段
      enableDateFolders: false,
      enableProjectFolders: false,
      fileNamingPattern: '文档_时间戳_类型',
    fileTypes: {
      documents: '',
      data: '',
      images: '',
      media: ''
    },
    cloudSync: {
      enabled: false,
      provider: 'none',
      syncPath: ''
    }
    };
    console.log('PersonalSettingsPage - 使用默认设置:', defaultSettings);
    return defaultSettings;
  });

  // 从后端加载用户信息和设置
  useEffect(() => {
    loadUserProfile();
    loadUserPreferences();
    loadWorkspaceSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 确保输入框显示正确的默认路径
  useEffect(() => {
    console.log('PersonalSettingsPage - workspaceSettings 更新:', workspaceSettings);
    if (workspaceSettings.defaultOutputPath) {
      console.log('PersonalSettingsPage - 默认路径已设置:', workspaceSettings.defaultOutputPath);
    }
  }, [workspaceSettings]);

  // 同步全局用户信息到本地状态
  useEffect(() => {
    if (userInfo) {
      setLocalUserInfo(prev => ({
        ...prev,
        ...userInfo
      }));
    }
  }, [userInfo]);

  // 从后端获取用户资料
  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('未找到访问令牌，使用默认用户信息');
        return;
      }

      const response = await fetch('/api/security/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const updatedUserInfo = {
          ...(userInfo || {}),
          username: userData.username || '',
          email: userData.email || '',
          userId: userData.user_id || '',
          role: userData.role || '',
          status: userData.status || '',
          emailVerified: userData.email_verified || false,
          twoFactorEnabled: userData.two_factor_enabled || false,
          createdAt: userData.created_at || '',
          lastLogin: userData.last_login || ''
        };

        // 更新全局用户信息
        updateUserInfo(updatedUserInfo);
        setLocalUserInfo(updatedUserInfo);
      } else if (response.status === 401) {
        console.log('登录已过期，请重新登录');
        localStorage.removeItem('access_token');
      } else {
        console.log('获取用户信息失败，使用本地缓存');
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  };

  // 从后端获取用户偏好设置
  const loadUserPreferences = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('未找到访问令牌，使用本地偏好设置');
        return;
      }

      const response = await fetch('/api/user-preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.preferences) {
          setPreferences(data.preferences);
        }
      } else {
        console.log('获取用户偏好设置失败，使用本地缓存');
      }
    } catch (err) {
      console.error('获取用户偏好设置失败:', err);
    }
  };

  // 从后端获取工作区设置
  const loadWorkspaceSettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('未找到访问令牌，使用本地工作区设置');
        // 尝试从localStorage加载 - 但只有当前状态为空时才加载
        if (!workspaceSettings.defaultOutputPath) {
          const savedSettings = localStorage.getItem('workspaceSettings');
          if (savedSettings && savedSettings !== '{}') {
            const parsed = JSON.parse(savedSettings);
            if (parsed.defaultOutputPath) {
              console.log('loadWorkspaceSettings - 从localStorage恢复:', parsed);
              setWorkspaceSettings(parsed);
            }
          }
        } else {
          console.log('loadWorkspaceSettings - 当前状态已有数据，跳过加载');
        }
        return;
      }

      const response = await fetch('/api/workspace-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings && data.settings.defaultOutputPath) {
          console.log('loadWorkspaceSettings - 从后端获取:', data.settings);
          setWorkspaceSettings(data.settings);
        } else {
          console.log('loadWorkspaceSettings - 后端没有有效数据，保持当前状态');
        }
      } else {
        console.log('获取工作区设置失败，使用本地缓存');
        // 尝试从localStorage加载 - 但只有当前状态为空时才加载
        if (!workspaceSettings.defaultOutputPath) {
          const savedSettings = localStorage.getItem('workspaceSettings');
          if (savedSettings && savedSettings !== '{}') {
            const parsed = JSON.parse(savedSettings);
            if (parsed.defaultOutputPath) {
              console.log('loadWorkspaceSettings - 从localStorage恢复(失败后):', parsed);
              setWorkspaceSettings(parsed);
            }
          }
        }
      }
    } catch (err) {
      console.error('获取工作区设置失败:', err);
      // 尝试从localStorage加载 - 但只有当前状态为空时才加载
      if (!workspaceSettings.defaultOutputPath) {
        try {
          const savedSettings = localStorage.getItem('workspaceSettings');
          if (savedSettings && savedSettings !== '{}') {
            const parsed = JSON.parse(savedSettings);
            if (parsed.defaultOutputPath) {
              console.log('loadWorkspaceSettings - 从localStorage恢复(异常后):', parsed);
              setWorkspaceSettings(parsed);
            }
          }
        } catch (parseErr) {
          console.error('解析本地工作区设置失败:', parseErr);
        }
      } else {
        console.log('loadWorkspaceSettings - 异常情况下当前状态已有数据，保持不变');
      }
    }
  };



  const [isEditing, setIsEditing] = useState(false);

  const handleUserInfoChange = (field, value) => {
    setLocalUserInfo(prev => ({
      ...(prev || {}),
      [field]: value
    }));
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences(prev => ({
      ...(prev || {}),
      [field]: value
    }));
  };

  const handleWorkspaceSettingChange = (field, value) => {
    setWorkspaceSettings(prev => ({
      ...(prev || {}),
      [field]: value
    }));
  };

  const handleFileTypeChange = (type, path) => {
    setWorkspaceSettings(prev => ({
      ...(prev || {}),
      fileTypes: {
        ...(prev?.fileTypes || {}),
        [type]: path
      }
    }));
  };

  const handleCloudSyncChange = (field, value) => {
    setWorkspaceSettings(prev => ({
      ...(prev || {}),
      cloudSync: {
        ...(prev?.cloudSync || {}),
        [field]: value
      }
    }));
  };

  const selectFolder = async () => {
    try {
      // 使用现代浏览器的文件系统访问API
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker();
        // 尝试获取完整路径，如果不支持则使用文件夹名称
        let folderPath = dirHandle.name;
        try {
          // 某些浏览器支持获取完整路径
          if (dirHandle.getDirectoryHandle) {
            folderPath = await dirHandle.resolve ? await dirHandle.resolve() : dirHandle.name;
          }
        } catch (e) {
          console.log('无法获取完整路径，使用文件夹名称');
        }
        handleWorkspaceSettingChange('defaultOutputPath', folderPath);
      } else {
        // 降级方案：让用户手动输入路径
        const path = prompt('请输入作品存放路径 (例如: C:\\Users\\用户名\\Desktop\\我的作品):', workspaceSettings.defaultOutputPath);
        if (path) {
          handleWorkspaceSettingChange('defaultOutputPath', path);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('选择文件夹失败:', error);
        // 降级方案：让用户手动输入路径
        const path = prompt('选择文件夹失败，请手动输入路径 (例如: C:\\Users\\用户名\\Desktop\\我的作品):', workspaceSettings.defaultOutputPath);
        if (path) {
          handleWorkspaceSettingChange('defaultOutputPath', path);
        }
      }
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token');

      // 如果有token，尝试保存到后端
      if (token) {
        // 保存用户基本信息到后端
        const userUpdateResponse = await fetch('/api/security/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            username: localUserInfo.username,
            email: localUserInfo.email,
            motto: localUserInfo.motto,
            avatar: localUserInfo.avatar
          })
        });

        if (userUpdateResponse.ok) {
          console.log('用户信息保存成功');
          // 更新全局用户信息
          updateUserInfo(localUserInfo);
        } else if (userUpdateResponse.status === 401) {
          console.log('登录已过期，请重新登录');
          localStorage.removeItem('access_token');
          throw new Error('登录已过期');
        } else {
          console.log('后端保存用户信息失败，使用本地存储');
          throw new Error('后端保存失败');
        }

        // 保存作品存放设置到后端
        const workspaceResponse = await fetch('/api/workspace-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(workspaceSettings)
        });

        if (workspaceResponse.ok) {
          console.log('作品存放设置保存成功');
        } else {
          console.log('作品存放设置保存到后端失败，使用本地存储');
          localStorage.setItem('workspaceSettings', JSON.stringify(workspaceSettings));
        }

        // 保存应用偏好设置到后端
        const preferencesResponse = await fetch('/api/user-preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            theme: preferences.theme,
            language: preferences.language,
            autoSave: preferences.autoSave,
            notifications: preferences.notifications,
            defaultView: preferences.defaultView,
            shortcuts: preferences.shortcuts
          })
        });

        if (preferencesResponse.ok) {
          console.log('应用偏好设置保存成功');
        } else {
          console.log('应用偏好设置保存到后端失败，使用本地存储');
          localStorage.setItem('userPreferences', JSON.stringify(preferences));
        }

      } else {
        // 没有token，直接保存到本地存储
        throw new Error('未登录');
      }

      setIsEditing(false);
      alert('所有设置已保存成功！\n✅ 个人信息\n✅ 应用偏好\n✅ 作品存放设置');

    } catch (error) {
      console.error('保存设置失败:', error);

      // 降级到localStorage
      localStorage.setItem('workspaceSettings', JSON.stringify(workspaceSettings));
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      localStorage.setItem('userInfo', JSON.stringify(localUserInfo));

      // 更新全局用户信息
      updateUserInfo(localUserInfo);
      setIsEditing(false);

      if (error.message === '登录已过期') {
        alert('登录已过期，设置已保存到本地。请重新登录以同步到服务器。');
      } else {
        alert('设置已保存到本地存储！\n✅ 个人信息\n✅ 应用偏好\n✅ 作品存放设置');
      }
    }
  };

  const handleCancel = () => {
    // 取消编辑时，重置本地状态为全局状态
    setLocalUserInfo(userInfo);
    setIsEditing(false);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleUserInfoChange('avatar', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="personal-settings-page">
      <div className="settings-header">
        <h1>个人设置</h1>
        <p>管理您的个人信息和应用偏好设置</p>
      </div>

      <div className="settings-content">
        {/* 个人信息设置 */}
        <div className="settings-section">
          <div className="section-header">
            <h2>个人信息</h2>
            <button
              className={`btn-secondary ${isEditing ? 'active' : ''}`}
              onClick={isEditing ? handleCancel : () => setIsEditing(true)}
            >
              {isEditing ? '取消编辑' : '编辑信息'}
            </button>
          </div>
          
          <div className="user-info-form">
            <div className="avatar-section">
              <div className="avatar-container">
                {localUserInfo.avatar ? (
                  <img src={localUserInfo.avatar} alt="用户头像" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <span>👤</span>
                  </div>
                )}
                {isEditing && (
                  <label className="avatar-upload">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <span className="upload-btn">更换头像</span>
                  </label>
                )}
              </div>
            </div>

            <div className="form-fields">
              <div className="form-group">
                <label>用户名</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={localUserInfo?.username || ''}
                    onChange={(e) => handleUserInfoChange('username', e.target.value)}
                    className="form-input"
                  />
                ) : (
                  <span className="form-value">{localUserInfo?.username || ''}</span>
                )}
              </div>

              <div className="form-group">
                <label>邮箱</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={localUserInfo?.email || ''}
                    onChange={(e) => handleUserInfoChange('email', e.target.value)}
                    className="form-input"
                  />
                ) : (
                  <span className="form-value">{localUserInfo?.email || ''}</span>
                )}
              </div>

              <div className="form-group">
                <label>个人座右铭</label>
                {isEditing ? (
                  <textarea
                    value={localUserInfo?.motto || ''}
                    onChange={(e) => handleUserInfoChange('motto', e.target.value)}
                    className="form-textarea"
                    rows="2"
                  />
                ) : (
                  <span className="form-value">{localUserInfo?.motto || ''}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 应用偏好设置 */}
        <div className="settings-section">
          <div className="section-header">
            <h2>应用偏好</h2>
          </div>
          
          <div className="preferences-grid">
            <div className="preference-item">
              <label>主题</label>
              <select
                value={preferences?.theme || 'light'}
                onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                className="form-select"
              >
                <option value="light">浅色主题</option>
                <option value="dark">深色主题</option>
                <option value="auto">跟随系统</option>
              </select>
            </div>

            <div className="preference-item">
              <label>语言</label>
              <select
                value={preferences?.language || 'zh-CN'}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                className="form-select"
              >
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>

            <div className="preference-item">
              <label>默认视图</label>
              <select
                value={preferences?.defaultView || 'mindmap'}
                onChange={(e) => handlePreferenceChange('defaultView', e.target.value)}
                className="form-select"
              >
                <option value="mindmap">思维导图</option>
                <option value="list">列表视图</option>
                <option value="grid">网格视图</option>
              </select>
            </div>

            <div className="preference-item">
              <label>动画速度</label>
              <select
                value={preferences?.animationSpeed || 'normal'}
                onChange={(e) => handlePreferenceChange('animationSpeed', e.target.value)}
                className="form-select"
              >
                <option value="slow">慢速</option>
                <option value="normal">正常</option>
                <option value="fast">快速</option>
                <option value="none">无动画</option>
              </select>
            </div>

            <div className="preference-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.autoSave}
                  onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                />
                <span className="checkbox-label">自动保存</span>
              </label>
            </div>

            <div className="preference-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences?.notifications || false}
                  onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                />
                <span className="checkbox-label">桌面通知</span>
              </label>
            </div>

            <div className="preference-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences?.gridSnap || false}
                  onChange={(e) => handlePreferenceChange('gridSnap', e.target.checked)}
                />
                <span className="checkbox-label">网格对齐</span>
              </label>
            </div>
          </div>
        </div>

        {/* 作品存放设置 */}
        <div className="settings-section">
          <div className="section-header">
            <h2>作品存放设置</h2>
            <span className="section-description">配置AI工作流生成的作品存放位置和组织方式</span>
          </div>

          <div className="workspace-settings">
            {/* 默认存放路径 */}
            <div className="setting-group">
              <label className="setting-label">默认存放路径</label>
              <div className="path-input-group">
                <input
                  type="text"
                  value={workspaceSettings?.defaultOutputPath || ''}
                  onChange={(e) => handleWorkspaceSettingChange('defaultOutputPath', e.target.value)}
                  className="form-input path-input"
                  placeholder="选择作品存放的默认路径"
                />
                <button
                  className="btn-secondary select-folder-btn"
                  onClick={selectFolder}
                  title="选择文件夹"
                >
                  📁 选择
                </button>
              </div>
            </div>

            {/* 文件组织方式 */}
            <div className="setting-group">
              <label className="setting-label">文件组织方式</label>
              <div className="organization-options">
                <div className="checkbox-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={workspaceSettings?.enableDateFolders || false}
                      onChange={(e) => handleWorkspaceSettingChange('enableDateFolders', e.target.checked)}
                    />
                    <span>按日期分类 (如: 2025/01/18/)</span>
                  </label>
                </div>
                <div className="checkbox-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={workspaceSettings?.enableProjectFolders || false}
                      onChange={(e) => handleWorkspaceSettingChange('enableProjectFolders', e.target.checked)}
                    />
                    <span>按项目分类 (如: 项目名称/)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 文件命名规则 */}
            <div className="setting-group">
              <label className="setting-label">文件命名规则</label>
              <select
                value={workspaceSettings?.fileNamingPattern || 'timestamp'}
                onChange={(e) => handleWorkspaceSettingChange('fileNamingPattern', e.target.value)}
                className="form-select"
              >
                <option value="document_{timestamp}_{type}">文档_时间戳_类型</option>
                <option value="{type}_{timestamp}">类型_时间戳</option>
                <option value="{timestamp}_{type}">时间戳_类型</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            {/* 文件类型分类 */}
            <div className="setting-group">
              <label className="setting-label">文件类型分类存放</label>
              <div className="file-types-grid">
                <div className="file-type-item">
                  <label>📄 文档类</label>
                  <input
                    type="text"
                    value={workspaceSettings?.fileTypes?.documents || ''}
                    onChange={(e) => handleFileTypeChange('documents', e.target.value)}
                    className="form-input small"
                    placeholder="\\Documents\\"
                  />
                </div>
                <div className="file-type-item">
                  <label>📊 数据类</label>
                  <input
                    type="text"
                    value={workspaceSettings?.fileTypes?.data || ''}
                    onChange={(e) => handleFileTypeChange('data', e.target.value)}
                    className="form-input small"
                    placeholder="\\Data\\"
                  />
                </div>
                <div className="file-type-item">
                  <label>📷 图片类</label>
                  <input
                    type="text"
                    value={workspaceSettings?.fileTypes?.images || ''}
                    onChange={(e) => handleFileTypeChange('images', e.target.value)}
                    className="form-input small"
                    placeholder="\\Images\\"
                  />
                </div>
                <div className="file-type-item">
                  <label>🎵 媒体类</label>
                  <input
                    type="text"
                    value={workspaceSettings?.fileTypes?.media || ''}
                    onChange={(e) => handleFileTypeChange('media', e.target.value)}
                    className="form-input small"
                    placeholder="\\Media\\"
                  />
                </div>
              </div>
            </div>

            {/* 云同步设置 */}
            <div className="setting-group">
              <label className="setting-label">云同步设置</label>
              <div className="cloud-sync-options">
                <div className="checkbox-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={workspaceSettings?.cloudSync?.enabled || false}
                      onChange={(e) => handleCloudSyncChange('enabled', e.target.checked)}
                    />
                    <span>启用云同步</span>
                  </label>
                </div>

                {workspaceSettings?.cloudSync?.enabled && (
                  <div className="cloud-provider-selection">
                    <select
                      value={workspaceSettings?.cloudSync?.provider || 'none'}
                      onChange={(e) => handleCloudSyncChange('provider', e.target.value)}
                      className="form-select"
                    >
                      <option value="none">选择云服务提供商</option>
                      <option value="onedrive">OneDrive</option>
                      <option value="baidu">百度网盘</option>
                      <option value="aliyun">阿里云盘</option>
                    </select>

                    {workspaceSettings?.cloudSync?.provider !== 'none' && (
                      <input
                        type="text"
                        value={workspaceSettings?.cloudSync?.syncPath || ''}
                        onChange={(e) => handleCloudSyncChange('syncPath', e.target.value)}
                        className="form-input"
                        placeholder="云端同步路径"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 保存按钮 - 始终显示 */}
        <div className="settings-actions">
          <button className="btn-primary" onClick={handleSave}>
            保存所有设置
          </button>
          {isEditing && (
            <button className="btn-secondary" onClick={handleCancel}>
              取消编辑
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalSettingsPage;
