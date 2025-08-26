import React, { useState } from 'react';
import './SecurityComponents.css';

const AuthModal = ({ onLogin, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginMode, setLoginMode] = useState('password'); // 'password' 或 'sms'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 登录表单数据
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
    phone: '',
    sms_code: '',
    remember_me: false
  });
  
  // 注册表单数据
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    phone: '',
    sms_code: '',
    password: '',
    confirm_password: ''
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);

  const handleLoginChange = (e) => {
    const { name, value, checked } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: name === 'remember_me' ? checked : value
    }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));

    // 计算密码强度
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'error';
    if (passwordStrength < 75) return 'warning';
    return 'success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return '弱';
    if (passwordStrength < 50) return '较弱';
    if (passwordStrength < 75) return '中等';
    if (passwordStrength < 100) return '较强';
    return '强';
  };

  // 发送登录短信验证码
  const sendLoginSmsCode = async () => {
    if (!loginData.phone) {
      setError('请输入手机号码');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(loginData.phone)) {
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
          phone: loginData.phone,
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 根据登录模式准备不同的请求数据
    let requestData;
    let endpoint;

    if (loginMode === 'password') {
      if (!loginData.username || !loginData.password) {
        setError('请输入用户名和密码');
        setLoading(false);
        return;
      }
      requestData = {
        username: loginData.username,
        password: loginData.password,
        remember_me: loginData.remember_me
      };
      endpoint = '/api/security/login';
    } else {
      if (!loginData.phone || !loginData.sms_code) {
        setError('请输入手机号码和验证码');
        setLoading(false);
        return;
      }
      requestData = {
        phone: loginData.phone,
        sms_code: loginData.sms_code,
        remember_me: loginData.remember_me
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
      } else {
        setError(data.detail || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 发送短信验证码
  const sendSmsCode = async () => {
    if (!registerData.phone) {
      setError('请输入手机号码');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(registerData.phone)) {
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
          phone: registerData.phone,
          type: 'register'
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

  const validateRegisterForm = () => {
    if (!registerData.username.trim()) {
      setError('请输入用户名');
      return false;
    }

    if (!registerData.email.trim()) {
      setError('请输入邮箱地址');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }

    if (!registerData.phone.trim()) {
      setError('请输入手机号码');
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(registerData.phone)) {
      setError('请输入有效的手机号码');
      return false;
    }

    if (!registerData.sms_code.trim()) {
      setError('请输入短信验证码');
      return false;
    }

    if (registerData.password.length < 8) {
      setError('密码长度至少8位');
      return false;
    }

    if (registerData.password !== registerData.confirm_password) {
      setError('密码确认不匹配');
      return false;
    }

    return true;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateRegisterForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/security/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('注册成功！请使用新账户登录。');
        // 3秒后自动切换到登录页面
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 3000);
      } else {
        setError(data.detail || '注册失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setLoginMode('password'); // 重置登录模式为密码登录
    setError('');
    setSuccess('');
    setLoginData({ username: '', password: '', phone: '', sms_code: '', remember_me: false });
    setRegisterData({ username: '', email: '', phone: '', sms_code: '', password: '', confirm_password: '' });
    setPasswordStrength(0);
    setSmsCountdown(0);
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              登录
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              注册
            </button>
          </div>
        </div>

        <div className="auth-modal-content">
          <div className="auth-header">
            <div className="auth-icon">{isLogin ? '🔐' : '👤'}</div>
            <h1>{isLogin ? '欢迎回来' : '创建账户'}</h1>
            <p>{isLogin ? '请登录您的账户' : '注册新用户账户'}</p>
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

          {isLogin ? (
            <>
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

              {/* 登录表单 */}
              <form onSubmit={handleLoginSubmit} className="auth-form">
                {loginMode === 'password' ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="login-username">用户名</label>
                      <input
                        type="text"
                        id="login-username"
                        name="username"
                        value={loginData.username}
                        onChange={handleLoginChange}
                        required
                        placeholder="请输入用户名"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="login-password">密码</label>
                      <input
                        type="password"
                        id="login-password"
                        name="password"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        required
                        placeholder="请输入密码"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="login-phone">手机号码</label>
                      <input
                        type="tel"
                        id="login-phone"
                        name="phone"
                        value={loginData.phone}
                        onChange={handleLoginChange}
                        required
                        placeholder="请输入手机号码"
                        maxLength="11"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="login-sms-code">验证码</label>
                      <div className="sms-input-group">
                        <input
                          type="text"
                          id="login-sms-code"
                          name="sms_code"
                          value={loginData.sms_code}
                          onChange={handleLoginChange}
                          required
                          placeholder="请输入验证码"
                          maxLength="6"
                        />
                        <button
                          type="button"
                          className="sms-button"
                          onClick={sendLoginSmsCode}
                          disabled={smsLoading || smsCountdown > 0}
                        >
                          {smsLoading ? '发送中...' : smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}
                        </button>
                      </div>
                      <small className="form-hint" style={{color: '#666', fontSize: '12px', marginTop: '4px'}}>
                        💡 开发环境测试验证码：123456
                      </small>
                    </div>
                  </>
                )}

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="remember_me"
                      checked={loginData.remember_me}
                      onChange={handleLoginChange}
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
            </form>
            </>
          ) : (
            // 注册表单
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="register-username">用户名</label>
                <input
                  type="text"
                  id="register-username"
                  name="username"
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  required
                  placeholder="请输入用户名"
                />
              </div>

              <div className="form-group">
                <label htmlFor="register-email">邮箱地址</label>
                <input
                  type="email"
                  id="register-email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  required
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div className="form-group">
                <label htmlFor="register-phone">手机号码</label>
                <input
                  type="tel"
                  id="register-phone"
                  name="phone"
                  value={registerData.phone}
                  onChange={handleRegisterChange}
                  required
                  placeholder="请输入手机号码"
                  maxLength="11"
                />
              </div>

              <div className="form-group">
                <label htmlFor="register-sms-code">短信验证码</label>
                <div className="sms-input-group">
                  <input
                    type="text"
                    id="register-sms-code"
                    name="sms_code"
                    value={registerData.sms_code}
                    onChange={handleRegisterChange}
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
                <small className="form-hint" style={{color: '#666', fontSize: '12px', marginTop: '4px'}}>
                  💡 开发环境测试验证码：123456
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="register-password">密码</label>
                <input
                  type="password"
                  id="register-password"
                  name="password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  required
                  placeholder="请输入密码（至少8位）"
                />
                {registerData.password && (
                  <div className="password-strength">
                    <div className="strength-info">
                      <span>密码强度</span>
                      <span className={`strength-text strength-${getPasswordStrengthColor()}`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="strength-bar">
                      <div 
                        className={`strength-fill strength-${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="register-confirm-password">确认密码</label>
                <input
                  type="password"
                  id="register-confirm-password"
                  name="confirm_password"
                  value={registerData.confirm_password}
                  onChange={handleRegisterChange}
                  required
                  placeholder="请再次输入密码"
                  className={registerData.confirm_password && registerData.password !== registerData.confirm_password ? 'error' : ''}
                />
                {registerData.confirm_password && registerData.password !== registerData.confirm_password && (
                  <div className="field-error">密码不匹配</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              {isLogin ? '还没有账户？' : '已有账户？'}
              <button
                type="button"
                className="link-button"
                onClick={switchMode}
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
