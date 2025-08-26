/**
 * 安全功能使用示例组件
 * 展示如何在React组件中使用安全工具
 */

import React, { useState, useEffect } from 'react';
import secureHttpClient from '../utils/secureHttpClient';
// 如果不想使用axios，可以使用原生fetch版本：
// import secureHttpClient from '../utils/secureHttpClientFetch';
import { XSSProtection, CSRFProtection, SecureStorage } from '../utils/security';

const SecurityExample = () => {
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 组件加载时检查用户登录状态
    checkAuthStatus();
  }, []);

  /**
   * 检查认证状态
   */
  const checkAuthStatus = async () => {
    try {
      const response = await secureHttpClient.get('/api/security/me');
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.log('用户未登录');
    }
  };

  /**
   * 用户登录
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 使用XSS防护清理输入
      const cleanUsername = XSSProtection.sanitizeInput(loginForm.username);
      const cleanPassword = XSSProtection.sanitizeInput(loginForm.password);

      const response = await secureHttpClient.post('/api/security/login', {
        username: cleanUsername,
        password: cleanPassword
      });

      const data = await response.json();
      
      if (data.access_token) {
        // 安全存储令牌
        secureHttpClient.setAuthToken(data.access_token);
        SecureStorage.setSecureItem('user_info', data.user);
        
        setUser(data.user);
        setMessage('登录成功！');
        setLoginForm({ username: '', password: '' });
      }
    } catch (error) {
      setMessage(`登录失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 用户注册
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 验证密码匹配
      if (registerForm.password !== registerForm.confirmPassword) {
        throw new Error('密码不匹配');
      }

      // 使用XSS防护清理输入
      const cleanData = {
        username: XSSProtection.sanitizeInput(registerForm.username),
        email: XSSProtection.sanitizeInput(registerForm.email),
        password: XSSProtection.sanitizeInput(registerForm.password),
        confirm_password: XSSProtection.sanitizeInput(registerForm.confirmPassword)
      };

      const response = await secureHttpClient.post('/api/security/register', cleanData);
      const data = await response.json();
      
      setMessage('注册成功！请登录。');
      setRegisterForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      setMessage(`注册失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 用户登出
   */
  const handleLogout = async () => {
    try {
      await secureHttpClient.post('/api/security/logout');
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 清理本地数据
      secureHttpClient.clearAuthToken();
      SecureStorage.clearAllSecureData();
      setUser(null);
      setMessage('已登出');
    }
  };

  /**
   * 获取安全仪表板数据
   */
  const fetchSecurityDashboard = async () => {
    try {
      setLoading(true);
      const response = await secureHttpClient.get('/api/security/security-dashboard');
      const data = await response.json();
      console.log('安全仪表板数据:', data);
      setMessage('安全仪表板数据已加载，请查看控制台');
    } catch (error) {
      setMessage(`获取安全数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 测试XSS防护
   */
  const testXSSProtection = () => {
    const maliciousInput = '<script>alert("XSS攻击")</script><img src="x" onerror="alert(\'XSS\')">恶意内容';
    const cleanInput = XSSProtection.sanitizeInput(maliciousInput);
    const encodedInput = XSSProtection.encodeHTML(maliciousInput);
    
    console.log('原始输入:', maliciousInput);
    console.log('清理后:', cleanInput);
    console.log('编码后:', encodedInput);
    
    setMessage('XSS防护测试完成，请查看控制台');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🛡️ 安全系统示例</h1>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: message.includes('失败') ? '#ffebee' : '#e8f5e8',
          border: `1px solid ${message.includes('失败') ? '#f44336' : '#4caf50'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      {user ? (
        <div>
          <h2>欢迎, {user.username}!</h2>
          <p>角色: {user.role}</p>
          <p>邮箱: {user.email}</p>
          
          <div style={{ margin: '20px 0' }}>
            <button 
              onClick={handleLogout}
              style={{ marginRight: '10px', padding: '8px 16px' }}
            >
              登出
            </button>
            
            {user.role === 'SUPER_ADMIN' && (
              <button 
                onClick={fetchSecurityDashboard}
                disabled={loading}
                style={{ marginRight: '10px', padding: '8px 16px' }}
              >
                {loading ? '加载中...' : '获取安全仪表板'}
              </button>
            )}
            
            <button 
              onClick={testXSSProtection}
              style={{ padding: '8px 16px' }}
            >
              测试XSS防护
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '40px' }}>
            {/* 登录表单 */}
            <div style={{ flex: 1 }}>
              <h2>登录</h2>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="用户名"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({
                      ...loginForm,
                      username: e.target.value
                    })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="password"
                    placeholder="密码"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({
                      ...loginForm,
                      password: e.target.value
                    })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ width: '100%', padding: '10px' }}
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>
              
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                默认管理员账户: admin / admin123
              </p>
            </div>

            {/* 注册表单 */}
            <div style={{ flex: 1 }}>
              <h2>注册</h2>
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="用户名"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({
                      ...registerForm,
                      username: e.target.value
                    })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="email"
                    placeholder="邮箱"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({
                      ...registerForm,
                      email: e.target.value
                    })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="password"
                    placeholder="密码"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({
                      ...registerForm,
                      password: e.target.value
                    })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="password"
                    placeholder="确认密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({
                      ...registerForm,
                      confirmPassword: e.target.value
                    })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ width: '100%', padding: '10px' }}
                >
                  {loading ? '注册中...' : '注册'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>🔧 安全功能说明</h3>
        <ul>
          <li><strong>XSS防护</strong>: 自动清理和编码用户输入</li>
          <li><strong>CSRF保护</strong>: 自动添加CSRF令牌到请求</li>
          <li><strong>安全存储</strong>: 加密存储敏感数据</li>
          <li><strong>JWT认证</strong>: 安全的令牌认证机制</li>
          <li><strong>权限控制</strong>: 基于角色的访问控制</li>
          <li><strong>安全监控</strong>: 实时威胁检测和审计</li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityExample;
