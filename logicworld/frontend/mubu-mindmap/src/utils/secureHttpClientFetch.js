/**
 * 安全HTTP客户端 - 使用原生 fetch API
 * 提供安全的API请求功能，包含认证、CSRF保护、错误处理等
 */

import { CSRFProtection, SecureStorage } from './security';

class SecureHttpClientFetch {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || '';
    this.timeout = 30000;
    this.setupCSRFProtection();
  }

  /**
   * 设置CSRF保护
   */
  setupCSRFProtection() {
    // 在页面加载时获取CSRF令牌
    this.refreshCSRFToken();
  }

  /**
   * 刷新CSRF令牌
   */
  async refreshCSRFToken() {
    try {
      const response = await this.request('/api/security/csrf-token', {
        method: 'GET'
      });
      const data = await response.json();
      const token = data.csrf_token;
      if (token) {
        CSRFProtection.setToken(token);
      }
    } catch (error) {
      console.warn('获取CSRF令牌失败:', error);
    }
  }

  /**
   * 获取认证令牌
   */
  getAuthToken() {
    return localStorage.getItem('access_token') || 
           sessionStorage.getItem('access_token');
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token) {
    localStorage.setItem('access_token', token);
    sessionStorage.setItem('access_token', token);
  }

  /**
   * 清除认证令牌
   */
  clearAuthToken() {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
  }

  /**
   * 构建请求头
   */
  buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
      ...customHeaders
    };

    // 添加认证头
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 添加CSRF保护头
    const csrfHeaders = CSRFProtection.addCSRFHeaders({});
    Object.assign(headers, csrfHeaders);

    return headers;
  }

  /**
   * 处理响应
   */
  async handleResponse(response) {
    // 更新CSRF令牌
    const csrfToken = response.headers.get('x-csrf-token');
    if (csrfToken) {
      CSRFProtection.setToken(csrfToken);
    }

    // 检查响应状态
    if (!response.ok) {
      await this.handleResponseError(response);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * 处理响应错误
   */
  async handleResponseError(response) {
    const status = response.status;

    try {
      const data = await response.json();
      
      switch (status) {
        case 401:
          this.handleUnauthorized();
          break;
        case 403:
          this.handleForbidden(data);
          break;
        case 429:
          this.handleRateLimit(data);
          break;
        case 500:
          this.handleServerError(data);
          break;
        default:
          console.error('API错误:', response);
      }
    } catch (e) {
      console.error('解析错误响应失败:', e);
    }
  }

  /**
   * 处理未授权错误
   */
  handleUnauthorized() {
    console.warn('认证失败，清除本地令牌');
    this.clearAuthToken();
    SecureStorage.clearAllSecureData();
    
    // 重定向到登录页面
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  /**
   * 处理权限不足错误
   */
  handleForbidden(data) {
    console.warn('权限不足:', data);
    this.showErrorMessage(data?.detail || '权限不足，无法访问该资源');
  }

  /**
   * 处理速率限制错误
   */
  handleRateLimit(data) {
    console.warn('请求过于频繁:', data);
    this.showErrorMessage('请求过于频繁，请稍后再试');
  }

  /**
   * 处理服务器错误
   */
  handleServerError(data) {
    console.error('服务器错误:', data);
    this.showErrorMessage('服务器内部错误，请稍后重试');
  }

  /**
   * 显示错误消息
   */
  showErrorMessage(message) {
    // 这里可以集成具体的消息提示组件
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else {
      alert(message);
    }
  }

  /**
   * 基础请求方法
   */
  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    const config = {
      method: 'GET',
      headers: this.buildHeaders(options.headers),
      credentials: 'include',
      ...options
    };

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, config);
      clearTimeout(timeoutId);
      
      return await this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post(url, data = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT请求
   */
  async put(url, data = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE请求
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  async patch(url, data = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * 上传文件
   */
  async uploadFile(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = this.buildHeaders();
    delete headers['Content-Type']; // 让浏览器自动设置

    return this.request(url, {
      method: 'POST',
      headers,
      body: formData
    });
  }

  /**
   * 下载文件
   */
  async downloadFile(url, filename) {
    const response = await this.request(url);
    const blob = await response.blob();
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.get('/health');
      return response.ok;
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }
}

// 创建全局实例
const secureHttpClientFetch = new SecureHttpClientFetch();

export default secureHttpClientFetch;
