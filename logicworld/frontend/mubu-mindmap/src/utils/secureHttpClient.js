/**
 * 安全HTTP客户端
 * 提供安全的API请求功能，包含认证、CSRF保护、错误处理等
 */

import axios from 'axios';
import { CSRFProtection, SecureStorage } from './security';

class SecureHttpClient {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || '',
      timeout: 30000,
      withCredentials: true
    });

    this.setupInterceptors();
    this.setupCSRFProtection();
  }

  /**
   * 设置请求和响应拦截器
   */
  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证头
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加CSRF保护头
        config.headers = CSRFProtection.addCSRFHeaders(config.headers);

        // 添加安全头
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.headers['Cache-Control'] = 'no-cache';

        // 记录请求日志
        this.logRequest(config);

        return config;
      },
      (error) => {
        console.error('请求配置错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        // 更新CSRF令牌
        const csrfToken = response.headers['x-csrf-token'];
        if (csrfToken) {
          CSRFProtection.setToken(csrfToken);
        }

        // 记录响应日志
        this.logResponse(response);

        return response;
      },
      (error) => {
        this.handleResponseError(error);
        return Promise.reject(error);
      }
    );
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
      const response = await this.client.get('/api/security/csrf-token');
      const token = response.data.csrf_token;
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
   * 处理响应错误
   */
  handleResponseError(error) {
    if (!error.response) {
      console.error('网络错误:', error);
      this.showErrorMessage('网络连接失败，请检查网络设置');
      return;
    }

    const { status, data } = error.response;

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
        console.error('API错误:', error.response);
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
   * 记录请求日志
   */
  logRequest(config) {
    if (process.env.NODE_ENV === 'development') {
      console.log('API请求:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        headers: this.sanitizeHeaders(config.headers),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 记录响应日志
   */
  logResponse(response) {
    if (process.env.NODE_ENV === 'development') {
      console.log('API响应:', {
        status: response.status,
        url: response.config.url,
        duration: response.config.metadata?.endTime - response.config.metadata?.startTime,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 清理敏感头信息
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'x-csrf-token', 'cookie'];
    
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * 安全的GET请求
   */
  async get(url, config = {}) {
    return this.client.get(url, config);
  }

  /**
   * 安全的POST请求
   */
  async post(url, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  /**
   * 安全的PUT请求
   */
  async put(url, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  /**
   * 安全的DELETE请求
   */
  async delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  /**
   * 安全的PATCH请求
   */
  async patch(url, data = {}, config = {}) {
    return this.client.patch(url, data, config);
  }

  /**
   * 上传文件
   */
  async uploadFile(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    return this.client.post(url, formData, config);
  }

  /**
   * 下载文件
   */
  async downloadFile(url, filename) {
    const response = await this.client.get(url, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data]);
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
   * 批量请求
   */
  async batchRequest(requests) {
    try {
      const promises = requests.map(request => {
        const { method, url, data, config } = request;
        return this.client[method](url, data, config);
      });

      return await Promise.allSettled(promises);
    } catch (error) {
      console.error('批量请求失败:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }
}

// 创建全局实例
const secureHttpClient = new SecureHttpClient();

export default secureHttpClient;
