/**
 * WebSocket客户端 - 用于接收工具库实时更新通知
 */

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1秒
    this.isConnecting = false;
    this.isManuallyDisconnected = false;
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // 心跳相关
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatIntervalTime = 30000; // 30秒
    this.heartbeatTimeoutTime = 5000; // 5秒
    
    // 自动连接
    this.connect();
  }
  
  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    
    this.isConnecting = true;
    this.isManuallyDisconnected = false;
    
    try {
      // 构建WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '8000'; // 后端端口
      const wsUrl = `${protocol}//${host}:${port}/ws/tools`;
      
      console.log(`🔌 连接WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
      
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }
  
  onOpen(event) {
    console.log('✅ WebSocket连接已建立');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // 开始心跳
    this.startHeartbeat();
    
    // 触发连接事件
    this.emit('connected', { timestamp: new Date().toISOString() });
  }
  
  onMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('📨 收到WebSocket消息:', message);
      
      // 处理不同类型的消息
      switch (message.type) {
        case 'connection_established':
          console.log(`🆔 客户端ID: ${message.client_id}`);
          break;
          
        case 'pong':
          // 心跳响应
          this.clearHeartbeatTimeout();
          break;
          
        case 'tool_update':
          this.handleToolUpdate(message);
          break;
          
        case 'tools_library_refresh':
          this.handleToolsLibraryRefresh(message);
          break;
          
        default:
          console.log('未知消息类型:', message.type);
      }
      
      // 触发通用消息事件
      this.emit('message', message);
      
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  }
  
  onClose(event) {
    console.log('🔌 WebSocket连接已关闭:', event.code, event.reason);
    this.isConnecting = false;
    
    // 停止心跳
    this.stopHeartbeat();
    
    // 触发断开连接事件
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      timestamp: new Date().toISOString()
    });
    
    // 如果不是手动断开，尝试重连
    if (!this.isManuallyDisconnected && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }
  
  onError(error) {
    console.error('❌ WebSocket错误:', error);
    this.emit('error', { error, timestamp: new Date().toISOString() });
  }
  
  handleToolUpdate(message) {
    const { source, action, tool_data } = message;
    console.log(`🔧 工具更新通知: ${source} - ${action}`, tool_data);
    
    // 触发特定源的工具更新事件
    const eventMap = {
      'ai': 'aiToolsUpdated',
      'mcp': 'mcpToolsUpdated', 
      'api': 'apiToolsUpdated',
      'system': 'systemToolsUpdated'
    };
    
    const eventName = eventMap[source];
    if (eventName) {
      // 触发DOM事件，与现有同步系统兼容
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { action, tool_data, timestamp: message.timestamp }
      }));
      
      // 触发内部事件
      this.emit('toolUpdate', { source, action, tool_data, timestamp: message.timestamp });
    }
  }
  
  handleToolsLibraryRefresh(message) {
    const { reason } = message;
    console.log(`📚 工具库刷新通知: ${reason}`);
    
    // 触发DOM事件
    window.dispatchEvent(new CustomEvent('toolsConfigUpdated', {
      detail: { reason, timestamp: message.timestamp }
    }));
    
    // 触发内部事件
    this.emit('toolsLibraryRefresh', { reason, timestamp: message.timestamp });
  }
  
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // 发送心跳包
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
        
        // 设置心跳超时
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('💔 心跳超时，关闭连接');
          this.ws.close();
        }, this.heartbeatTimeoutTime);
      }
    }, this.heartbeatIntervalTime);
  }
  
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clearHeartbeatTimeout();
  }
  
  clearHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
  
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket未连接，无法发送消息:', message);
    }
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ 达到最大重连次数，停止重连');
      this.emit('maxReconnectAttemptsReached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避
    
    console.log(`🔄 ${delay}ms后尝试第${this.reconnectAttempts}次重连...`);
    
    setTimeout(() => {
      if (!this.isManuallyDisconnected) {
        this.connect();
      }
    }, delay);
  }
  
  disconnect() {
    this.isManuallyDisconnected = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
    }
  }
  
  // 事件系统
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const callbacks = this.eventListeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件回调执行失败 (${event}):`, error);
        }
      });
    }
  }
  
  // 获取连接状态
  getConnectionState() {
    return {
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      isManuallyDisconnected: this.isManuallyDisconnected
    };
  }
}

// 创建全局WebSocket客户端实例
export const websocketClient = new WebSocketClient();

// 便捷的事件监听函数
export const onToolUpdate = (callback) => websocketClient.on('toolUpdate', callback);
export const onToolsLibraryRefresh = (callback) => websocketClient.on('toolsLibraryRefresh', callback);
export const onWebSocketConnected = (callback) => websocketClient.on('connected', callback);
export const onWebSocketDisconnected = (callback) => websocketClient.on('disconnected', callback);

// 导出默认实例
export default websocketClient;
