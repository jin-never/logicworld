/**
 * 安全的ResizeObserver包装器
 * 处理ResizeObserver的常见错误和异常
 */

export class SafeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observer = null;
    this.isActive = false;
    
    try {
      this.observer = new ResizeObserver(this.handleResize.bind(this));
    } catch (error) {
      console.warn('ResizeObserver不支持或创建失败:', error);
    }
  }
  
  handleResize(entries) {
    try {
      // 使用requestAnimationFrame来避免ResizeObserver循环错误
      requestAnimationFrame(() => {
        try {
          if (this.isActive && this.callback) {
            this.callback(entries);
          }
        } catch (error) {
          // 忽略ResizeObserver相关的错误
          if (!error.message.includes('ResizeObserver')) {
            console.error('ResizeObserver callback error:', error);
          }
        }
      });
    } catch (error) {
      // 静默处理错误
    }
  }
  
  observe(element) {
    if (!this.observer || !element) {
      return;
    }
    
    try {
      this.isActive = true;
      this.observer.observe(element);
    } catch (error) {
      console.warn('ResizeObserver observe失败:', error);
    }
  }
  
  unobserve(element) {
    if (!this.observer || !element) {
      return;
    }
    
    try {
      this.observer.unobserve(element);
    } catch (error) {
      // 静默处理错误
    }
  }
  
  disconnect() {
    if (!this.observer) {
      return;
    }
    
    try {
      this.isActive = false;
      this.observer.disconnect();
    } catch (error) {
      // 静默处理错误
    }
  }
}

// 导出便捷函数
export function createSafeResizeObserver(callback) {
  return new SafeResizeObserver(callback);
} 