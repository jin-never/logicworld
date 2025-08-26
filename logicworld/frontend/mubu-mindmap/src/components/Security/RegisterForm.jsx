import React, { useState } from 'react';
import './SecurityComponents.css';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    sms_code: '',
    password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [smsCountdown, setSmsCountdown] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('请输入用户名');
      return false;
    }

    if (!formData.email.trim()) {
      setError('请输入邮箱地址');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('请输入手机号码');
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setError('请输入有效的手机号码');
      return false;
    }

    if (!formData.sms_code.trim()) {
      setError('请输入短信验证码');
      return false;
    }

    if (formData.password.length < 8) {
      setError('密码长度至少8位');
      return false;
    }

    // 检查密码复杂度
    if (!/[A-Z]/.test(formData.password)) {
      setError('密码必须包含大写字母');
      return false;
    }

    if (!/[a-z]/.test(formData.password)) {
      setError('密码必须包含小写字母');
      return false;
    }

    if (!/[0-9]/.test(formData.password)) {
      setError('密码必须包含数字');
      return false;
    }

    if (formData.password !== formData.confirm_password) {
      setError('密码确认不匹配');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/security/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('注册成功！请检查您的邮箱进行验证。');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
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

  return (
    <div className="security-container">
      <div className="security-card">
        <div className="security-header">
          <div className="security-icon">👤</div>
          <h1>用户注册</h1>
          <p>创建您的新账户</p>
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

        <form onSubmit={handleSubmit} className="security-form">
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
            <label htmlFor="email">邮箱地址</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="请输入邮箱地址"
            />
          </div>

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
            <label htmlFor="sms_code">短信验证码</label>
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

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="请输入密码（至少8位，包含大小写字母和数字）"
            />
            {formData.password && (
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
            <label htmlFor="confirm_password">确认密码</label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
              placeholder="请再次输入密码"
              className={formData.confirm_password && formData.password !== formData.confirm_password ? 'error' : ''}
            />
            {formData.confirm_password && formData.password !== formData.confirm_password && (
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

          <div className="security-links">
            <span>已有账户？</span>
            <button
              type="button"
              className="link-button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }))}
            >
              立即登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
