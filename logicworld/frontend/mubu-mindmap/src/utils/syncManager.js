/**
 * 同步管理器
 * 负责管理配置页面→工具库→下拉按钮的完整同步链路
 */

/**
 * 同步事件类型
 */
export const SYNC_EVENTS = {
  // 通用工具配置更新
  TOOLS_CONFIG_UPDATED: 'toolsConfigUpdated',
  
  // 工具库更新
  TOOL_LIBRARY_UPDATED: 'toolLibraryUpdated',
  
  // 特定源的工具更新
  AI_TOOLS_UPDATED: 'aiToolsUpdated',
  MCP_TOOLS_UPDATED: 'mcpToolsUpdated',
  API_TOOLS_UPDATED: 'apiToolsUpdated',
  USER_TOOLS_UPDATED: 'userToolsUpdated',
  
  // 工具测试和批准事件
  TOOL_TESTED: 'toolTested',
  TOOL_APPROVAL_REQUESTED: 'toolApprovalRequested',
  TOOL_APPROVED: 'toolApproved',
  
  // 工具管理器事件
  TOOL_MANAGER_INITIALIZED: 'toolManagerInitialized',
  TOOL_MANAGER_REFRESHED: 'toolManagerRefreshed'
};

/**
 * 同步管理器类
 */
export class SyncManager {
  constructor() {
    this.listeners = new Map(); // 事件监听器
    this.syncQueue = []; // 同步队列
    this.isProcessing = false; // 是否正在处理同步
    this.debounceTimers = new Map(); // 防抖定时器
    this.setupGlobalListeners();
  }

  /**
   * 设置全局事件监听器
   */
  setupGlobalListeners() {
    // 监听所有同步事件
    Object.values(SYNC_EVENTS).forEach(eventType => {
      window.addEventListener(eventType, (event) => {
        this.handleSyncEvent(eventType, event.detail || {});
      });
    });

    console.log('同步管理器已初始化，监听事件:', Object.values(SYNC_EVENTS));
  }

  /**
   * 处理同步事件
   */
  handleSyncEvent(eventType, detail) {
    console.log(`同步事件: ${eventType}`, detail);

    // 添加到同步队列
    this.addToSyncQueue({
      type: eventType,
      detail,
      timestamp: Date.now()
    });

    // 处理同步队列
    this.processSyncQueue();
  }

  /**
   * 添加到同步队列
   */
  addToSyncQueue(syncItem) {
    this.syncQueue.push(syncItem);
    
    // 限制队列长度，避免内存泄漏
    if (this.syncQueue.length > 100) {
      this.syncQueue = this.syncQueue.slice(-50);
    }
  }

  /**
   * 处理同步队列
   */
  async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.syncQueue.length > 0) {
        const syncItem = this.syncQueue.shift();
        await this.processSyncItem(syncItem);
      }
    } catch (error) {
      console.error('处理同步队列失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理单个同步项
   */
  async processSyncItem(syncItem) {
    const { type, detail } = syncItem;

    try {
      switch (type) {
        case SYNC_EVENTS.TOOLS_CONFIG_UPDATED:
          await this.handleToolsConfigUpdated(detail);
          break;
          
        case SYNC_EVENTS.AI_TOOLS_UPDATED:
        case SYNC_EVENTS.MCP_TOOLS_UPDATED:
        case SYNC_EVENTS.API_TOOLS_UPDATED:
        case SYNC_EVENTS.USER_TOOLS_UPDATED:
          await this.handleSourceToolsUpdated(type, detail);
          break;
          
        case SYNC_EVENTS.TOOL_TESTED:
          await this.handleToolTested(detail);
          break;
          
        case SYNC_EVENTS.TOOL_APPROVED:
          await this.handleToolApproved(detail);
          break;
          
        default:
          console.log(`未处理的同步事件类型: ${type}`);
      }
    } catch (error) {
      console.error(`处理同步项失败 (${type}):`, error);
    }
  }

  /**
   * 处理工具配置更新
   */
  async handleToolsConfigUpdated(detail) {
    console.log('处理工具配置更新');

    // 使用防抖，避免频繁更新
    this.debounce('toolsConfigUpdate', async () => {
      try {
        // 刷新工具管理器
        const { toolManager } = await import('./toolManager.js');
        await toolManager.refresh();

        // 触发工具库更新事件
        this.emit(SYNC_EVENTS.TOOL_LIBRARY_UPDATED, {
          source: 'config_update',
          timestamp: new Date().toISOString()
        });

        console.log('工具配置更新处理完成');
      } catch (error) {
        console.error('处理工具配置更新失败:', error);
      }
    }, 1000);
  }

  /**
   * 处理特定源的工具更新
   */
  async handleSourceToolsUpdated(eventType, detail) {
    const sourceMap = {
      [SYNC_EVENTS.AI_TOOLS_UPDATED]: 'ai',
      [SYNC_EVENTS.MCP_TOOLS_UPDATED]: 'mcp',
      [SYNC_EVENTS.API_TOOLS_UPDATED]: 'api',
      [SYNC_EVENTS.USER_TOOLS_UPDATED]: 'user'
    };

    const source = sourceMap[eventType];
    if (!source) return;

    console.log(`处理${source}工具更新`);

    // 使用防抖，避免频繁更新
    this.debounce(`${source}ToolsUpdate`, async () => {
      try {
        // 刷新特定源的工具
        const { toolManager } = await import('./toolManager.js');
        await toolManager.refreshSource(source);

        // 触发工具库更新事件
        this.emit(SYNC_EVENTS.TOOL_LIBRARY_UPDATED, {
          source,
          timestamp: new Date().toISOString()
        });

        console.log(`${source}工具更新处理完成`);
      } catch (error) {
        console.error(`处理${source}工具更新失败:`, error);
      }
    }, 1000);
  }

  /**
   * 处理工具测试完成
   */
  async handleToolTested(detail) {
    console.log('处理工具测试完成事件', detail);

    // 如果测试成功，可能需要更新UI状态
    if (detail.testResult?.success) {
      // 触发工具库更新，以反映测试状态
      this.emit(SYNC_EVENTS.TOOL_LIBRARY_UPDATED, {
        source: 'tool_tested',
        toolId: detail.tool?.id,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 处理工具批准完成
   */
  async handleToolApproved(detail) {
    console.log('处理工具批准完成事件', detail);

    // 工具批准后需要刷新工具库
    this.debounce('toolApproved', async () => {
      try {
        const { toolManager } = await import('./toolManager.js');
        await toolManager.refresh();

        // 触发工具库更新事件
        this.emit(SYNC_EVENTS.TOOL_LIBRARY_UPDATED, {
          source: 'tool_approved',
          toolId: detail.tool?.id,
          systemToolId: detail.systemTool?.id,
          timestamp: new Date().toISOString()
        });

        console.log('工具批准处理完成');
      } catch (error) {
        console.error('处理工具批准失败:', error);
      }
    }, 1000);
  }

  /**
   * 防抖函数
   */
  debounce(key, func, delay) {
    // 清除之前的定时器
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      func();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * 触发事件
   */
  emit(eventType, detail = {}) {
    const event = new CustomEvent(eventType, { detail });
    window.dispatchEvent(event);
    console.log(`触发同步事件: ${eventType}`, detail);
  }

  /**
   * 手动触发工具配置更新
   */
  triggerToolsConfigUpdate(source = 'manual') {
    this.emit(SYNC_EVENTS.TOOLS_CONFIG_UPDATED, {
      source,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 手动触发特定源的工具更新
   */
  triggerSourceUpdate(source) {
    const eventMap = {
      'ai': SYNC_EVENTS.AI_TOOLS_UPDATED,
      'mcp': SYNC_EVENTS.MCP_TOOLS_UPDATED,
      'api': SYNC_EVENTS.API_TOOLS_UPDATED,
      'user': SYNC_EVENTS.USER_TOOLS_UPDATED
    };

    const eventType = eventMap[source];
    if (eventType) {
      this.emit(eventType, {
        source: 'manual',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.syncQueue.length,
      activeDebounces: this.debounceTimers.size
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清除所有防抖定时器
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // 清空同步队列
    this.syncQueue = [];
    
    console.log('同步管理器已清理');
  }
}

// 创建全局同步管理器实例
export const syncManager = new SyncManager();
