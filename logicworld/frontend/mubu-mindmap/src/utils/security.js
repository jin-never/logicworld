/**
 * 前端安全工具库
 * 提供XSS防护、CSRF保护、输入验证等安全功能
 */

// XSS防护
export class XSSProtection {
  /**
   * HTML实体编码
   */
  static escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return text.replace(/[&<>"'/]/g, (s) => map[s]);
  }

  /**
   * 清理HTML内容
   */
  static sanitizeHtml(html) {
    if (typeof html !== 'string') return html;
    
    // 移除危险标签
    const dangerousTags = /<(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style)[^>]*>.*?<\/\1>|<(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style)[^>]*\/?>|<\/?(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style)[^>]*>/gi;
    html = html.replace(dangerousTags, '');
    
    // 移除危险属性
    const dangerousAttrs = /(on\w+|javascript:|data:|vbscript:|expression\()/gi;
    html = html.replace(dangerousAttrs, '');
    
    return html;
  }

  /**
   * 验证URL安全性
   */
  static isUrlSafe(url) {
    if (!url || typeof url !== 'string') return false;
    
    // 检查协议
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    try {
      const urlObj = new URL(url);
      return allowedProtocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 安全地设置innerHTML
   */
  static safeSetInnerHTML(element, html) {
    if (!element || typeof html !== 'string') return;
    
    const sanitizedHtml = this.sanitizeHtml(html);
    element.innerHTML = sanitizedHtml;
  }
}

// CSRF保护
export class CSRFProtection {
  static tokenKey = 'csrf_token';
  static sessionKey = 'session_id';

  /**
   * 获取CSRF令牌
   */
  static getToken() {
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
  }

  /**
   * 设置CSRF令牌
   */
  static setToken(token) {
    localStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.tokenKey, token);
  }

  /**
   * 获取会话ID
   */
  static getSessionId() {
    let sessionId = localStorage.getItem(this.sessionKey);
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem(this.sessionKey, sessionId);
    }
    return sessionId;
  }

  /**
   * 生成会话ID
   */
  static generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * 为请求添加CSRF保护头
   */
  static addCSRFHeaders(headers = {}) {
    const token = this.getToken();
    const sessionId = this.getSessionId();
    
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    headers['X-Session-ID'] = sessionId;
    
    return headers;
  }
}

// 输入验证
export class InputValidator {
  /**
   * 验证邮箱格式
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式
   */
  static isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证密码强度
   */
  static validatePassword(password) {
    const result = {
      isValid: false,
      score: 0,
      feedback: []
    };

    if (!password || typeof password !== 'string') {
      result.feedback.push('密码不能为空');
      return result;
    }

    // 长度检查
    if (password.length < 8) {
      result.feedback.push('密码长度至少8位');
    } else {
      result.score += 1;
    }

    // 包含小写字母
    if (/[a-z]/.test(password)) {
      result.score += 1;
    } else {
      result.feedback.push('密码应包含小写字母');
    }

    // 包含大写字母
    if (/[A-Z]/.test(password)) {
      result.score += 1;
    } else {
      result.feedback.push('密码应包含大写字母');
    }

    // 包含数字
    if (/\d/.test(password)) {
      result.score += 1;
    } else {
      result.feedback.push('密码应包含数字');
    }

    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.score += 1;
    } else {
      result.feedback.push('密码应包含特殊字符');
    }

    result.isValid = result.score >= 3 && password.length >= 8;
    return result;
  }

  /**
   * 清理用户输入
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // 移除潜在的恶意字符
    return input
      .replace(/[<>]/g, '') // 移除尖括号
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+=/gi, '') // 移除事件处理器
      .trim();
  }

  /**
   * 验证文件类型
   */
  static isValidFileType(file, allowedTypes = []) {
    if (!file || !file.type) return false;
    
    if (allowedTypes.length === 0) {
      // 默认允许的文件类型
      allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'application/pdf',
        'application/json'
      ];
    }
    
    return allowedTypes.includes(file.type);
  }

  /**
   * 验证文件大小
   */
  static isValidFileSize(file, maxSizeMB = 10) {
    if (!file || !file.size) return false;
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}

// 安全存储
export class SecureStorage {
  /**
   * 安全地存储敏感数据
   */
  static setSecureItem(key, value, useSessionStorage = false) {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      const encryptedValue = btoa(JSON.stringify(value)); // 简单的base64编码
      storage.setItem(key, encryptedValue);
      return true;
    } catch (error) {
      console.error('存储数据失败:', error);
      return false;
    }
  }

  /**
   * 安全地获取敏感数据
   */
  static getSecureItem(key, useSessionStorage = false) {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      const encryptedValue = storage.getItem(key);
      if (!encryptedValue) return null;
      
      return JSON.parse(atob(encryptedValue));
    } catch (error) {
      console.error('获取数据失败:', error);
      return null;
    }
  }

  /**
   * 清除敏感数据
   */
  static removeSecureItem(key, useSessionStorage = false) {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('删除数据失败:', error);
      return false;
    }
  }

  /**
   * 清除所有敏感数据
   */
  static clearAllSecureData() {
    try {
      // 清除认证相关数据
      const sensitiveKeys = [
        'access_token',
        'refresh_token',
        'user_info',
        'csrf_token',
        'session_id'
      ];
      
      sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      return true;
    } catch (error) {
      console.error('清除数据失败:', error);
      return false;
    }
  }
}

// 安全事件监听器
export class SecurityEventListener {
  static listeners = new Map();

  /**
   * 监听安全事件
   */
  static addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * 触发安全事件
   */
  static dispatchSecurityEvent(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('安全事件处理失败:', error);
      }
    });
  }

  /**
   * 检测可疑活动
   */
  static detectSuspiciousActivity() {
    // 检测开发者工具
    let devtools = {open: false, orientation: null};
    const threshold = 160;

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.dispatchSecurityEvent('devtools_opened', {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
        }
      } else {
        devtools.open = false;
      }
    }, 500);

    // 检测右键菜单
    document.addEventListener('contextmenu', (e) => {
      this.dispatchSecurityEvent('context_menu_attempted', {
        timestamp: new Date().toISOString(),
        target: e.target.tagName
      });
    });

    // 检测键盘快捷键
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        this.dispatchSecurityEvent('view_source_attempted', {
          timestamp: new Date().toISOString()
        });
      }
    });
  }
}

// 初始化安全防护
export function initializeSecurity() {
  // 启动安全事件监听
  SecurityEventListener.detectSuspiciousActivity();
  
  // 设置CSP违规报告
  document.addEventListener('securitypolicyviolation', (e) => {
    console.warn('CSP违规:', e.violatedDirective, e.blockedURI);
    SecurityEventListener.dispatchSecurityEvent('csp_violation', {
      violatedDirective: e.violatedDirective,
      blockedURI: e.blockedURI,
      timestamp: new Date().toISOString()
    });
  });
  
  console.log('✅ 前端安全防护已初始化');
}
