import React, { useState } from 'react';
import './SecurityComponents.css';

const LoginForm = ({ onLogin }) => {
  const [loginMode, setLoginMode] = useState('password'); // 'password' 或 'sms'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone: '',
    sms_code: '',
    remember_me: false
  });
  const [loading, setLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [error, setError] = useState('');
  const [smsCountdown, setSmsCountdown] = useState(0);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'remember_me' ? checked : value
    }));
  };

  // 发送短信验证码
  const sendSmsCode = async () => {
    if (!formData.phone) {
      setError('请输入手机号码');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setError('请输入有效的手机号码');
      return;
    }

    setSmsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/security/send-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          type: 'login'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 开始倒计时
        setSmsCountdown(60);
        const timer = setInterval(() => {
          setSmsCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.detail || '发送验证码失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 根据登录模式准备不同的请求数据
    let requestData;
    let endpoint;

    if (loginMode === 'password') {
      if (!formData.username || !formData.password) {
        setError('请输入用户名和密码');
        setLoading(false);
        return;
      }
      requestData = {
        username: formData.username,
        password: formData.password,
        remember_me: formData.remember_me
      };
      endpoint = '/api/security/login';
    } else {
      if (!formData.phone || !formData.sms_code) {
        setError('请输入手机号码和验证码');
        setLoading(false);
        return;
      }
      requestData = {
        phone: formData.phone,
        sms_code: formData.sms_code,
        remember_me: formData.remember_me
      };
      endpoint = '/api/security/login-sms';
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        // 保存令牌到localStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_info', JSON.stringify(data.user));

        // 调用父组件的登录回调
        if (onLogin) {
          onLogin(data);
        }

        // 触发导航事件
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
      } else {
        setError(data.detail || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="security-container">
      <div className="security-card">
        <div className="security-header">
          <div className="security-icon">🔒</div>
          <h1>用户登录</h1>
          <p>请输入您的账户信息</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')} className="alert-close">×</button>
          </div>
        )}

        {/* 登录方式切换 */}
        <div className="login-mode-tabs">
          <button
            type="button"
            className={`mode-tab ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => setLoginMode('password')}
          >
            密码登录
          </button>
          <button
            type="button"
            className={`mode-tab ${loginMode === 'sms' ? 'active' : ''}`}
            onClick={() => setLoginMode('sms')}
          >
            验证码登录
          </button>
        </div>

        <form onSubmit={handleSubmit} className="security-form">
          {loginMode === 'password' ? (
            <>
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="请输入用户名"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="请输入密码"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="phone">手机号码</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="请输入手机号码"
                  maxLength="11"
                />
              </div>

              <div className="form-group">
                <label htmlFor="sms_code">验证码</label>
                <div className="sms-input-group">
                  <input
                    type="text"
                    id="sms_code"
                    name="sms_code"
                    value={formData.sms_code}
                    onChange={handleChange}
                    required
                    placeholder="请输入验证码"
                    maxLength="6"
                  />
                  <button
                    type="button"
                    className="sms-button"
                    onClick={sendSmsCode}
                    disabled={smsLoading || smsCountdown > 0}
                  >
                    {smsLoading ? '发送中...' : smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="remember_me"
                checked={formData.remember_me}
                onChange={handleChange}
              />
              <span className="checkmark"></span>
              记住我
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <div className="security-links">
            <button
              type="button"
              className="link-button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'register' }))}
            >
              注册新账户
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => alert('密码重置功能即将推出')}
            >
              忘记密码？
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
