import React, { useState } from 'react';
import './ToolTester.css';

const ToolTester = ({ tool, onTestComplete }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testInput, setTestInput] = useState('{"action": "ping"}');
  const [testHistory, setTestHistory] = useState([]);
  const [currentTest, setCurrentTest] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 使用相对路径，让代理配置生效
  const API_BASE = '';

  // 预定义的测试用例
  const testCases = [
    {
      name: "连接测试",
      description: "验证工具基本连接状态和响应能力",
      payload: getConnectionTestPayload()
    },
    {
      name: "功能测试",
      description: "测试工具的核心功能是否正常工作",
      payload: getFunctionTestPayload()
    },
    {
      name: "参数测试",
      description: "验证工具参数处理和错误处理能力",
      payload: getParameterTestPayload()
    }
  ];

  // 根据工具类型生成不同的测试载荷
  function getConnectionTestPayload() {
    // 使用file_operations工具的基本测试
    return {
      action: "exists",
      path: "."
    };
  }

  function getFunctionTestPayload() {
    // 测试列出当前目录
    return {
      action: "list",
      path: "."
    };
  }

  function getParameterTestPayload() {
    // 测试读取不存在的文件（错误处理）
    return {
      action: "read",
      path: "nonexistent_file.txt"
    };
  }

  // 单个测试执行
  const runSingleTest = async (testPayload, testName = "自定义测试") => {
    const startTime = Date.now();

    try {
      // 动态获取可用工具并测试
      console.log('测试工具:', tool.name, '载荷:', testPayload);

      // 首先获取可用工具列表
      const debugResponse = await fetch(`${API_BASE}/tools/debug`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      let response;
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('后端可用工具:', debugData.tool_names);

        // 如果有可用工具，使用第一个进行测试
        if (debugData.tool_names && debugData.tool_names.length > 0) {
          const firstTool = debugData.tool_names[0];
          console.log('使用工具进行测试:', firstTool);

          response = await fetch(`${API_BASE}/tools/${firstTool}/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
          });
        } else {
          throw new Error('后端没有注册任何工具');
        }
      } else {
        // 如果无法获取调试信息，尝试直接调用一些常见的工具名称
        const commonToolNames = [
          'tools_file_operations_file_operations',
          'tools_simple_document_create_html_document',
          'tools_simple_document_create_simple_document'
        ];

        let toolFound = false;
        for (const toolName of commonToolNames) {
          try {
            response = await fetch(`${API_BASE}/tools/${toolName}/call`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testPayload)
            });

            if (response.ok || response.status !== 404) {
              console.log('找到可用工具:', toolName);
              toolFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!toolFound) {
          throw new Error('无法找到任何可用的工具');
        }
      }

      const result = await response.json();
      const duration = Date.now() - startTime;

      return {
        name: testName,
        success: result.status === 'success',
        message: result.status === 'success' ? '调用成功' : (result.error || '调用失败'),
        data: result.result,
        duration,
        timestamp: new Date().toLocaleTimeString()
      };
    } catch (error) {
      return {
        name: testName,
        success: false,
        message: `网络错误: ${error.message}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toLocaleTimeString()
      };
    }
  };

  // 运行预定义测试用例
  const runPredefinedTests = async () => {
    try {
      console.log('开始测试:', tool.name);
      setTesting(true);
      setTestResult(null);
      setCurrentTest(0);
      const results = [];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`执行测试 ${i + 1}:`, testCase.name);
        setCurrentTest(i + 1);

        const result = await runSingleTest(testCase.payload, testCase.name);
        results.push(result);
        console.log(`测试 ${i + 1} 结果:`, result);

        // 如果基础连接测试失败，停止后续测试
        if (i === 0 && !result.success) {
          console.log('连接测试失败，停止后续测试');
          break;
        }
      }

      setTestHistory(results);
      setTesting(false);
      setCurrentTest(0);

      // 判断整体测试是否成功
      const overallSuccess = results.length > 0 && results[0].success;
      console.log('测试完成，整体结果:', overallSuccess);
      onTestComplete?.(tool, overallSuccess);
    } catch (error) {
      console.error('测试执行出错:', error);
      setTesting(false);
      setCurrentTest(0);
      setTestResult({
        success: false,
        message: `测试执行出错: ${error.message}`
      });
    }
  };

  // 运行自定义测试
  const handleCustomTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      let testPayload;
      try {
        testPayload = JSON.parse(testInput);
      } catch (e) {
        setTestResult({
          success: false,
          message: '测试参数格式错误，请输入有效的JSON'
        });
        setTesting(false);
        return;
      }

      const result = await runSingleTest(testPayload, "自定义测试");
      setTestResult(result);
      setTestHistory(prev => [result, ...prev]);

    } catch (error) {
      setTestResult({
        success: false,
        message: `测试执行错误: ${error.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="tool-tester">
      <div className="tool-info">
        <h3>🔧 {tool.name}</h3>
        <p><strong>命令:</strong> {tool.command} {Array.isArray(tool.args) ? tool.args.join(' ') : tool.args}</p>
        <p><strong>传输方式:</strong> {tool.transport || tool.server_type || 'stdio'}</p>
        <p><strong>描述:</strong> {tool.description || '用户配置的MCP工具'}</p>
      </div>

      {/* 测试模式选择 */}
      <div className="test-mode-selector">
        <button
          className={`mode-btn ${!showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(false)}
        >
          快速测试
        </button>
        <button
          className={`mode-btn ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(true)}
        >
          高级测试
        </button>
      </div>

      {!showAdvanced ? (
        /* 快速测试模式 */
        <div className="quick-test">
          <div className="test-actions">
            <button
              onClick={() => {
                console.log('按钮被点击');
                try {
                  runPredefinedTests();
                } catch (error) {
                  console.error('点击按钮时出错:', error);
                }
              }}
              disabled={testing}
              className={`test-btn primary ${testing ? 'testing' : ''}`}
            >
              {testing ? `🔄 测试进行中... (${currentTest}/${testCases.length})` : '🚀 开始全面测试'}
            </button>
          </div>

          <div className="test-flow-diagram">
            <h4>📋 测试项目</h4>
            <div className="flow-container">
              {testCases.map((testCase, index) => {
                let stepStatus = 'pending'; // pending, running, success, error
                let stepMessage = '⏳ 等待中';
                let stepError = '';

                try {
                  if (testing && currentTest > index + 1) {
                    stepStatus = 'success';
                    stepMessage = '✅ 完成';
                  } else if (testing && currentTest === index + 1) {
                    stepStatus = 'running';
                    stepMessage = '🔄 进行中...';
                  } else if (testHistory && testHistory.length > 0) {
                    const result = testHistory.find(r => r && r.name === testCase.name);
                    if (result) {
                      stepStatus = result.success ? 'success' : 'error';
                      stepMessage = result.success ? `✅ 完成 (${result.duration}ms)` : '❌ 失败';
                      stepError = result.success ? '' : (result.message || '未知错误');
                    }
                  }
                } catch (err) {
                  console.error('渲染步骤状态时出错:', err);
                  stepStatus = 'error';
                  stepMessage = '❌ 渲染错误';
                  stepError = err.message;
                }

                return (
                  <div key={index} className="flow-step-container">
                    <div className={`flow-step ${stepStatus}`}>
                      <div className="step-header">
                        <div className="step-number">{index + 1}</div>
                        <div className="step-title">{testCase.name}</div>
                        <div className="step-status">{stepMessage}</div>
                      </div>
                      <div className="step-description">{testCase.description}</div>
                      {stepError && (
                        <div className="step-error">
                          <div className="error-icon">⚠️</div>
                          <div className="error-message">{stepError}</div>
                          <div className="error-suggestion">
                            {index === 0 && '请检查MCP服务器配置和网络连接'}
                            {index === 1 && '请确认服务器支持tools/list方法'}
                            {index === 2 && '请检查MCP协议版本兼容性'}
                          </div>
                        </div>
                      )}
                    </div>
                    {index < testCases.length - 1 && (
                      <div className={`flow-arrow ${stepStatus === 'success' ? 'active' : ''}`}>
                        ↓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 高级测试模式 */
        <div className="advanced-test">
          <div className="test-input">
            <label>自定义测试参数 (JSON格式)</label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder='{"action": "ping"}'
              rows={6}
              disabled={testing}
            />
          </div>

          <div className="test-actions">
            <button
              onClick={handleCustomTest}
              disabled={testing}
              className={`test-btn ${testing ? 'testing' : ''}`}
            >
              {testing ? '🔄 测试中...' : '⚡ 运行自定义测试'}
            </button>
          </div>
        </div>
      )}

      {/* 测试结果显示 */}
      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          <div className={`result-header ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? '测试成功' : '测试失败'}
            <span className="result-time">({testResult.duration}ms)</span>
          </div>
          <div className="result-message">{testResult.message}</div>
          {testResult.data && (
            <div className="result-data">
              <strong>返回数据:</strong>
              <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* 测试历史 */}
      {testHistory.length > 0 && (
        <div className="test-history">
          <h4>测试历史:</h4>
          <div className="history-list">
            {testHistory.map((result, index) => (
              <div key={index} className={`history-item ${result.success ? 'success' : 'error'}`}>
                <div className="history-header">
                  <span className="test-name">{result.name}</span>
                  <span className="test-time">{result.timestamp}</span>
                  <span className="test-duration">{result.duration}ms</span>
                </div>
                <div className="history-message">{result.message}</div>
                {result.data && (
                  <details className="history-data">
                    <summary>查看返回数据</summary>
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolTester;
