import React, { useState, useEffect, useRef } from 'react';
import './LogicWorld.css';

const LogicWorld = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const API_BASE = '';
  const LOGICWORLD_API = `${API_BASE}/api/logicworld`;

  useEffect(() => {
    checkSystemHealth();
    loadSystemStats();
    // 添加欢迎消息
    setChatMessages([{
      id: 'welcome',
      type: 'assistant',
      content: '您好！我是 LogicWorld 智能助手。我已经完美集成到您的 mubu-mindmap 平台中。我可以帮您处理各种任务，包括数据分析、报告生成、文档处理等。请告诉我您需要什么帮助？',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${LOGICWORLD_API}/health`);
      const data = await response.json();
      setSystemHealth(data);
      setIsInitialized(data.initialized);
    } catch (error) {
      console.error('健康检查失败:', error);
      setSystemHealth({ status: 'error', initialized: false });
    }
  };

  const loadSystemStats = async () => {
    try {
      const response = await fetch(`${LOGICWORLD_API}/stats`);
      const data = await response.json();
      setSystemStats(data);
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const initializeSystem = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${LOGICWORLD_API}/initialize`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setIsInitialized(true);
        await checkSystemHealth();
        await loadSystemStats();
        addSystemMessage('LogicWorld Protocol 初始化成功！系统已就绪。');
      } else {
        addSystemMessage('初始化失败，请检查系统配置。');
      }
    } catch (error) {
      addSystemMessage(`初始化错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${LOGICWORLD_API}/sync`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        addSystemMessage(`数据同步成功: 用户 ${data.users.success}/${data.users.total}, 工具 ${data.tools.success}/${data.tools.total}`);
        await loadSystemStats();
      } else {
        addSystemMessage(`数据同步失败: ${data.error}`);
      }
    } catch (error) {
      addSystemMessage(`同步错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addSystemMessage = (content) => {
    const message = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || processing) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true
    };

    setChatMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputMessage('');
    setProcessing(true);

    try {
      const response = await fetch(`${LOGICWORLD_API}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputMessage,
          context: {
            source: 'mubu_mindmap_platform',
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? {
              ...msg,
              content: generateResponseContent(result),
              result: result,
              loading: false
            }
          : msg
      ));

    } catch (error) {
      setChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? {
              ...msg,
              content: '抱歉，处理您的请求时出现了错误。请稍后重试。',
              loading: false
            }
          : msg
      ));
    } finally {
      setProcessing(false);
    }
  };

  const generateResponseContent = (result) => {
    if (!result.success) {
      return `处理失败：${result.error}`;
    }

    const { routing_decision, confidence_score, reasoning } = result.result;
    
    return `我已经理解您的需求，并选择了最佳的处理策略：

🎯 **路由策略**: ${getRouteTypeText(routing_decision.type)}
📊 **置信度**: ${(confidence_score * 100).toFixed(1)}%
🧠 **推理过程**: ${reasoning}

${getRouteDescription(routing_decision.type)}`;
  };

  const getRouteTypeText = (type) => {
    const typeMap = {
      'single_capsule': '单一胶囊调用',
      'workflow': '工作流执行',
      'fallback_chain': '降级处理链',
      'parallel_execution': '并行执行',
      'sequential_chain': '顺序执行链'
    };
    return typeMap[type] || type;
  };

  const getRouteDescription = (type) => {
    const descriptions = {
      'single_capsule': '✅ 已为您匹配到最合适的知识胶囊来处理这个任务。',
      'workflow': '🔄 将通过预定义的工作流来完成这个复杂任务。',
      'fallback_chain': '🛡️ 使用备用处理链确保任务能够完成。',
      'parallel_execution': '⚡ 将并行执行多个任务以提高效率。',
      'sequential_chain': '📋 将按顺序执行一系列相关任务。'
    };
    return descriptions[type] || '正在处理您的请求...';
  };

  const quickActions = [
    '帮我分析思维导图数据',
    '生成思维导图报告',
    '优化思维导图结构',
    '创建工作流程',
    '数据可视化分析',
    '智能内容推荐'
  ];

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <div key={message.id} className={`message ${message.type}-message`}>
        <div className="message-avatar">
          {isUser ? '👤' : isSystem ? '⚙️' : '🤖'}
        </div>
        <div className="message-content">
          {message.loading ? (
            <div className="loading-message">
              <span className="loading-dots">正在处理</span>
            </div>
          ) : (
            <div className="message-text">{message.content}</div>
          )}
          <div className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="logicworld-container">
      <div className="logicworld-header">
        <h1>🤖 LogicWorld Protocol</h1>
        <p>智能知识胶囊系统已完美集成到您的 mubu-mindmap 平台</p>
      </div>

      <div className="logicworld-content">
        {/* 系统状态面板 */}
        <div className="status-panel">
          <div className="status-card">
            <h3>系统状态</h3>
            <div className="status-indicators">
              <div className={`status-item ${systemHealth?.status === 'healthy' ? 'healthy' : 'error'}`}>
                <span className="status-icon">{systemHealth?.status === 'healthy' ? '🟢' : '🔴'}</span>
                <span>系统健康</span>
              </div>
              <div className={`status-item ${isInitialized ? 'healthy' : 'warning'}`}>
                <span className="status-icon">{isInitialized ? '🟢' : '🟡'}</span>
                <span>初始化状态</span>
              </div>
            </div>
            <div className="status-actions">
              <button 
                onClick={initializeSystem} 
                disabled={loading || isInitialized}
                className="btn btn-primary"
              >
                {loading ? '初始化中...' : isInitialized ? '已初始化' : '初始化系统'}
              </button>
              <button 
                onClick={syncData} 
                disabled={loading || !isInitialized}
                className="btn btn-secondary"
              >
                {loading ? '同步中...' : '同步数据'}
              </button>
            </div>
          </div>

          {/* 统计信息 */}
          {systemStats && (
            <div className="stats-card">
              <h3>系统统计</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{systemStats.users_synced}</span>
                  <span className="stat-label">已同步用户</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{systemStats.tools_converted}</span>
                  <span className="stat-label">知识胶囊</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{systemStats.requests_processed}</span>
                  <span className="stat-label">处理请求</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{systemStats.active_workflows}</span>
                  <span className="stat-label">活跃工作流</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 智能助手面板 */}
        <div className="chat-panel">
          <div className="chat-header">
            <h3>🗣️ 智能助手</h3>
            <p>与 LogicWorld 智能助手对话，让 AI 帮您处理各种任务</p>
          </div>
          
          <div className="chat-messages">
            {chatMessages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="quick-actions">
            <h4>快速操作</h4>
            <div className="quick-buttons">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-btn"
                  onClick={() => setInputMessage(action)}
                  disabled={processing}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          
          <div className="chat-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="输入您的需求，例如：帮我分析思维导图数据..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={processing || !isInitialized}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || processing || !isInitialized}
              className="send-btn"
            >
              {processing ? '处理中...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicWorld;
