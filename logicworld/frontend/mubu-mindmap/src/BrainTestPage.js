import React, { useState, useEffect } from 'react';
import './BrainTestPage.css';
import { safeExecute } from './utils/errorSuppressor';

const BrainTestPage = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('semantic');
  const [complexity, setComplexity] = useState('medium');
  const [processingMode, setProcessingMode] = useState('normal'); // 新增：处理模式
  const [modeInfo, setModeInfo] = useState(null); // 新增：模式信息
  const [userId, setUserId] = useState('test_user');
  const [sessionId, setSessionId] = useState('test_session');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState(null);

  // API基础URL
  const API_BASE_URL = '';

  // 预设问题
  const presetQuestions = [
    {
      text: "什么是人工智能？",
      mode: "semantic",
      complexity: "low"
    },
    {
      text: "如果人工智能继续发展，会对人类社会产生什么影响？请从经济、社会、伦理等多个角度分析。",
      mode: "reasoning",
      complexity: "high"
    },
    {
      text: "设计一个智能家居系统，需要考虑技术实现、用户体验、安全性和成本控制。",
      mode: "collaborative",
      complexity: "expert"
    },
    {
      text: "我喜欢简洁的回答，请告诉我什么是机器学习？",
      mode: "adaptive",
      complexity: "medium"
    }
  ];

  // 获取系统状态
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/brain/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('获取状态失败:', error);
    }
  };

  // 获取当前模式信息
  const fetchModeInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/brain/mode/current`);
      const data = await response.json();
      setModeInfo(data);
      setProcessingMode(data.current_mode);
    } catch (error) {
      console.error('获取模式信息失败:', error);
    }
  };

  // 切换处理模式
  const switchProcessingMode = async (newMode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/brain/mode/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: newMode }),
      });

      if (response.ok) {
        const data = await response.json();
        setProcessingMode(newMode);
        setModeInfo(data.mode_info);
        console.log('模式切换成功:', data);
      } else {
        console.error('模式切换失败:', response.status);
      }
    } catch (error) {
      console.error('模式切换错误:', error);
    }
  };

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/brain/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchStats();
    fetchModeInfo();
  }, []);

  // 处理请求
  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      const requestData = {
        input_text: input,
        user_id: userId,
        session_id: sessionId,
        mode: mode,
        complexity: complexity,
        context: {},
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web_interface'
        }
      };

      const response = await fetch(`${API_BASE_URL}/brain/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResponse(data);
      
      // 添加到历史记录
      setHistory(prev => [...prev, {
        input: input,
        output: data.output,
        confidence: data.confidence,
        timestamp: data.timestamp,
        mode: mode,
        complexity: complexity,
        processing_path: data.processing_path
      }]);

      // 清空输入
      setInput('');
      
      // 更新统计信息
      fetchStats();
      
    } catch (error) {
      console.error('请求失败:', error);
      setResponse({
        output: `请求失败: ${error.message}`,
        confidence: 0,
        processing_path: ['error'],
        reasoning_trace: [],
        memory_updates: [],
        metadata: { error: true },
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // 使用预设问题
  const selectPresetQuestion = (question) => {
    setInput(question.text);
    setMode(question.mode);
    setComplexity(question.complexity);
  };

  // 提供反馈
  const provideFeedback = async (requestId, score) => {
    try {
      await fetch(`${API_BASE_URL}/brain/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: requestId,
          feedback_score: score,
          feedback_text: '',
          user_id: userId
        }),
      });
      console.log('反馈已提交');
    } catch (error) {
      console.error('反馈提交失败:', error);
    }
  };

  return (
    <div className="brain-test-page">
      <div className="brain-test-header">
        <h1>🧠 逻辑智慧系统测试</h1>
        
        {/* 系统状态 */}
        {status && (
          <div className={`status-alert ${status.initialized ? 'success' : 'warning'}`}>
            <div className="status-content">
              <div>初始化状态: {status.initialized ? '✅ 已初始化' : '❌ 未初始化'}</div>
              <div>活跃模块: {status.modules?.join(', ') || '无'}</div>
              <div>API版本: {status.api_version}</div>
            </div>
          </div>
        )}
      </div>

      <div className="brain-test-content">
        {/* 左侧：输入和配置 */}
        <div className="brain-test-left">
          <div className="config-card">
            <h3>输入配置</h3>
            
            {/* 用户配置 */}
            <div className="config-section">
              <label>用户配置</label>
              <div className="config-row">
                <input
                  type="text"
                  placeholder="用户ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="会话ID"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                />
              </div>
            </div>

            {/* 处理模式 */}
            <div className="config-section">
              <label>处理模式</label>
              <select value={mode} onChange={(e) => {
                safeExecute(() => {
                  setMode(e.target.value);
                }, 'BrainTestPage-mode-select');
              }}>
                <option value="simple">简单处理</option>
                <option value="semantic">语义理解</option>
                <option value="reasoning">复杂推理</option>
                <option value="collaborative">多代理协作</option>
                <option value="adaptive">自适应学习</option>
              </select>
            </div>

            {/* 复杂度 */}
            <div className="config-section">
              <label>复杂度级别</label>
              <select value={complexity} onChange={(e) => {
                safeExecute(() => {
                  setComplexity(e.target.value);
                }, 'BrainTestPage-complexity-select');
              }}>
                <option value="low">低 (简单问答)</option>
                <option value="medium">中 (需要推理)</option>
                <option value="high">高 (复杂分析)</option>
                <option value="expert">专家 (专业级别)</option>
              </select>
            </div>
          </div>

          {/* 预设问题 */}
          <div className="preset-card">
            <h3>预设问题</h3>
            <div className="preset-questions">
              {presetQuestions.map((question, index) => (
                <button
                  key={index}
                  className="preset-question"
                  onClick={() => selectPresetQuestion(question)}
                >
                  <div className="question-text">{question.text}</div>
                  <div className="question-tags">
                    <span className="tag mode">{question.mode}</span>
                    <span className="tag complexity">{question.complexity}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 输入区域 */}
          <div className="input-card">
            <h3>输入内容</h3>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入您的问题或请求..."
              rows={4}
              maxLength={1000}
            />
            <div className="input-footer">
              <span className="char-count">{input.length}/1000</span>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
              >
                {loading ? '处理中...' : '发送到逻辑智慧'}
              </button>
            </div>
          </div>
        </div>

        {/* 右侧：输出和分析 */}
        <div className="brain-test-right">
          {/* 响应结果 */}
          {response && (
            <div className="response-card">
              <div className="response-header">
                <h3>逻辑智慧响应</h3>
                <div className="response-meta">
                  <span className={`confidence ${response.confidence > 0.8 ? 'high' : response.confidence > 0.5 ? 'medium' : 'low'}`}>
                    置信度: {(response.confidence * 100).toFixed(1)}%
                  </span>
                  <div className="feedback-buttons">
                    <button onClick={() => provideFeedback(response.request_id, 1.0)}>👍</button>
                    <button onClick={() => provideFeedback(response.request_id, 0.0)}>👎</button>
                  </div>
                </div>
              </div>

              <div className="response-content">
                <div className="output-section">
                  <strong>输出:</strong>
                  <div className="output-text">{response.output}</div>
                </div>

                <details className="processing-details">
                  <summary>处理详情</summary>
                  <div className="details-content">
                    <div>
                      <strong>处理路径:</strong>
                      <div className="processing-path">
                        {response.processing_path.map((step, index) => (
                          <span key={index} className="path-step">{step}</span>
                        ))}
                      </div>
                    </div>

                    {response.reasoning_trace && response.reasoning_trace.length > 0 && (
                      <div>
                        <strong>推理轨迹:</strong>
                        <div className="reasoning-trace">
                          {response.reasoning_trace.slice(0, 3).map((trace, index) => (
                            <div key={index} className="trace-item">
                              <code>{trace.module}</code>: {trace.action}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {response.memory_updates && response.memory_updates.length > 0 && (
                      <div>
                        <strong>记忆更新:</strong> {response.memory_updates.length} 项更新
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* 统计信息 */}
          {stats && (
            <div className="stats-card">
              <h3>系统统计</h3>
              <div className="stats-content">
                {stats.learning_stats && (
                  <div className="stat-section">
                    <strong>学习统计:</strong>
                    <div className="stat-items">
                      <div>总事件: {stats.learning_stats.total_events}</div>
                      <div>成功适应: {stats.learning_stats.successful_adaptations}</div>
                      <div>知识更新: {stats.learning_stats.knowledge_updates}</div>
                    </div>
                  </div>
                )}
                
                {stats.agent_stats && (
                  <div className="stat-section">
                    <strong>代理统计:</strong>
                    <div className="stat-items">
                      <div>总代理: {stats.agent_stats.total_agents}</div>
                      <div>活跃任务: {stats.agent_stats.active_tasks}</div>
                    </div>
                  </div>
                )}

                {stats.memory_stats && (
                  <div className="stat-section">
                    <strong>记忆统计:</strong>
                    <div className="stat-items">
                      <div>记忆节点: {stats.memory_stats.nodes_count}</div>
                      <div>知识边: {stats.memory_stats.edges_count}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="history-card">
          <h3>交互历史</h3>
          <div className="history-list">
            {history.slice(-5).reverse().map((item, index) => (
              <div key={index} className="history-item">
                <div className="history-question">
                  <strong>Q:</strong> {item.input.substring(0, 100)}...
                </div>
                <div className="history-answer">
                  <strong>A:</strong> {item.output.substring(0, 100)}...
                </div>
                <div className="history-meta">
                  <span className="tag mode">{item.mode}</span>
                  <span className="tag complexity">{item.complexity}</span>
                  <span className={`tag confidence ${item.confidence > 0.8 ? 'high' : 'medium'}`}>
                    {(item.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrainTestPage;
