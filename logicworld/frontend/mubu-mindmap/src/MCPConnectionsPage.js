import React, { useState, useEffect } from 'react';
import './MCPConnectionsPage.css';
import { saveConfiguredTool, safeJoin } from './configStorage';
import GenericConfigForm from './GenericConfigForm';
import { MCPStdIOSchema, MCPHTTPSchema } from './toolSchemas';
import { summarizeDescription } from './services/aiSummaryService';
import CategorySelector from './components/CategorySelector';
import FunctionalCategorySelector from './components/FunctionalCategorySelector';
import { ToolDataModel, TOOL_SOURCE_TYPES, APPROVAL_STATUS, ToolValidator } from './utils/toolDataModel';
import { toolManager } from './utils/toolManager';
import { TOOL_CATEGORIES } from './constants/toolCategories';

// 辅助函数：提取敏感字段
const extractSensitiveFields = (config) => {
  const sensitiveFields = [];
  const sensitiveKeywords = ['key', 'secret', 'token', 'password', 'auth', 'credential'];

  Object.keys(config).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeywords.some(keyword => lowerKey.includes(keyword))) {
      sensitiveFields.push(key);
    }
  });

  return sensitiveFields;
};

// 辅助函数：提取必需字段
const extractRequiredFields = (config) => {
  const requiredFields = [];

  // 根据传输类型确定必需字段
  const transport = config.transport || config.server_type || 'stdio';
  if (transport === 'stdio') {
    requiredFields.push('command');
  } else if (transport === 'http') {
    requiredFields.push('url');
  }

  return requiredFields;
};

// 辅助函数：将分类ID转换为中文名称
const getCategoryDisplayName = (categoryId) => {
  const category = TOOL_CATEGORIES[categoryId];
  return category ? category.name : categoryId;
};

// 辅助函数：处理分类数组显示
const formatCategories = (categories) => {
  if (!categories) return '';

  if (Array.isArray(categories)) {
    return categories.map(getCategoryDisplayName).join(', ');
  } else {
    return getCategoryDisplayName(categories);
  }
};

// 简化的MCP配置页面
const MCPConnectionsPage = () => {
  // 状态管理
  const [myTools, setMyTools] = useState([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [transport, setTransport] = useState('stdio');
  const [isLoading, setIsLoading] = useState(false);
  const [originalDescription, setOriginalDescription] = useState(''); // 保存原始描述
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [functionalCategory, setFunctionalCategory] = useState(''); // 新增：功能分类

  // 批准相关状态
  const [approvingTools, setApprovingTools] = useState(new Set()); // 正在申请批准的工具ID

  // 描述弹窗状态
  const [descriptionModal, setDescriptionModal] = useState({ show: false, content: '', title: '' });

  // 从后端API加载已配置的工具
  useEffect(() => {
    const loadToolsFromBackend = async () => {
      try {
        const response = await fetch('/api/tools/mcp-tools');
        if (response.ok) {
          const tools = await response.json();
          setMyTools(tools);
          // 同时更新localStorage作为备份
          localStorage.setItem('myMcpTools', JSON.stringify(tools));
        } else {
          // 如果后端请求失败，回退到localStorage
          const savedTools = localStorage.getItem('myMcpTools');
          if (savedTools) {
            setMyTools(JSON.parse(savedTools));
          }
        }
      } catch (error) {
        console.error('Failed to load MCP tools from backend:', error);
        // 如果后端请求失败，回退到localStorage
        const savedTools = localStorage.getItem('myMcpTools');
        if (savedTools) {
          setMyTools(JSON.parse(savedTools));
        }
      }
    };

    loadToolsFromBackend();
  }, []);

  // 保存状态管理
  const [isSaving, setIsSaving] = useState(false);

  // 保存工具配置
  const handleSave = async (config) => {
    // 防重复提交
    if (isSaving) {
      console.log('正在保存中，忽略重复请求');
      return;
    }

    // 验证必填字段
    const validationErrors = [];

    // 检查基本必填字段
    if (!config.name || !config.name.trim()) {
      validationErrors.push('服务器名称');
    }

    if (!config.description || !config.description.trim()) {
      validationErrors.push('工具介绍');
    }

    if (!config.command || !config.command.trim()) {
      validationErrors.push('命令');
    }

    // 检查功能分类
    if (!functionalCategory ||
        (typeof functionalCategory === 'string' && !functionalCategory.trim()) ||
        (Array.isArray(functionalCategory) && functionalCategory.length === 0)) {
      validationErrors.push('功能分类');
    }

    // 如果有验证错误，显示提示并返回
    if (validationErrors.length > 0) {
      alert(`请填写以下必填字段：${validationErrors.join('、')}`);
      return;
    }

    // 检查是否已存在同名工具
    const existingTool = myTools.find(tool => tool.name === config.name);
    if (existingTool) {
      alert(`工具 "${config.name}" 已存在！请使用不同的名称或编辑现有工具。`);
      return;
    }

    setIsSaving(true);

    // 使用新的工具数据模型
    const toolData = new ToolDataModel({
      id: Date.now().toString(),
      name: config.name,
      description: config.description || '',
      sourceType: TOOL_SOURCE_TYPES.MCP,
      functionalCategory: functionalCategory || 'system_tools',
      capabilities: config.capabilities || ['MCP工具'],
      approvalStatus: APPROVAL_STATUS.PENDING,
      ownerId: 'current_user',
      config: {
        ...config,
        transport: transport
      },
      enabled: true,
      tested: true, // 新工具默认已测试，直接可以批准
      sensitiveFields: extractSensitiveFields(config),
      requiredFields: extractRequiredFields(config)
    });

    // 验证工具数据
    const validation = toolData.validate();
    if (!validation.isValid) {
      alert(`工具配置验证失败: ${validation.errors.join(', ')}`);
      return;
    }

    const newTool = toolData.toJSON();

    // 转换为后端期望的MCP工具格式
    const mcpToolData = {
      id: newTool.id,
      name: newTool.name,
      description: newTool.description,
      server_type: transport,
      command: config.command,
      args: config.args ? (Array.isArray(config.args) ? config.args : config.args.split(',').map(arg => arg.trim())) : [],
      url: config.url,
      enabled: newTool.enabled,
      functionalCategory: functionalCategory,
      // 兼容字段
      version: newTool.version,
      author: newTool.author,
      createdAt: newTool.createdAt,
      updatedAt: newTool.updatedAt,
      sourceType: newTool.sourceType,
      capabilities: newTool.capabilities,
      tags: newTool.tags,
      approvalStatus: newTool.approvalStatus,
      approvedBy: newTool.approvedBy,
      approvedAt: newTool.approvedAt,
      ownerId: newTool.ownerId,
      isPublic: newTool.isPublic,
      available: newTool.available,
      tested: newTool.tested,
      testResults: newTool.testResults,
      config: newTool.config,
      sensitiveFields: newTool.sensitiveFields,
      requiredFields: newTool.requiredFields,
      optionalFields: newTool.optionalFields,
      usageCount: newTool.usageCount,
      lastUsedAt: newTool.lastUsedAt
    };

    try {
      // 保存到后端，添加超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch('/api/tools/mcp-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpToolData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to save MCP tool to backend');
      }

      const updatedTools = [...myTools, newTool];
      setMyTools(updatedTools);
      localStorage.setItem('myMcpTools', JSON.stringify(updatedTools));

      // 触发工具库更新事件
      window.dispatchEvent(new Event('toolsConfigUpdated'));
      window.dispatchEvent(new Event('mcpToolsUpdated'));

      setShowConfigForm(false);
      alert('MCP 服务器配置成功！');
    } catch (error) {
      console.error('保存MCP工具失败:', error);

      let errorMessage = '保存失败: ';
      if (error.name === 'AbortError') {
        errorMessage += '请求超时，请检查网络连接或稍后重试';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += '无法连接到服务器，请检查后端服务是否正常运行';
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);

      // 即使保存失败，也先保存到本地存储作为备份
      try {
        const updatedTools = [...myTools, newTool];
        setMyTools(updatedTools);
        localStorage.setItem('myMcpTools', JSON.stringify(updatedTools));

        // 触发工具库更新事件
        window.dispatchEvent(new Event('toolsConfigUpdated'));
        window.dispatchEvent(new Event('mcpToolsUpdated'));

        setShowConfigForm(false);
        alert('后端保存失败，但已保存到本地。工具可以正常使用，请稍后检查网络连接。');
      } catch (localError) {
        console.error('本地保存也失败:', localError);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 删除工具的简化版本（通过索引）
  const deleteTool = async (index) => {
    if (window.confirm('确定要删除这个 MCP 服务器配置吗？')) {
      const toolToDelete = myTools[index];

      try {
        // 从后端删除
        if (toolToDelete && toolToDelete.id) {
          const response = await fetch(`/api/tools/mcp-tools/${toolToDelete.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to delete MCP tool from backend');
          }
        }

        const updatedTools = myTools.filter((_, idx) => idx !== index);
        setMyTools(updatedTools);
        localStorage.setItem('myMcpTools', JSON.stringify(updatedTools));

        // 触发工具库更新事件
        window.dispatchEvent(new Event('toolsConfigUpdated'));
        window.dispatchEvent(new Event('mcpToolsUpdated'));

        alert('MCP 服务器配置已删除');
      } catch (error) {
        console.error('删除MCP工具失败:', error);
        alert('删除失败: ' + error.message);
      }
    }
  };

  // 测试功能已移除 - 工具可以直接使用

  // 模拟测试功能已移除 - 工具可以直接使用

  // 申请工具批准
  const requestApproval = async (toolId) => {
    const tool = myTools.find(t => t.id === toolId);
    if (!tool) {
      alert('工具不存在');
      return;
    }

    // 测试要求已移除 - 工具可以直接申请批准

    // 验证工具是否满足批准条件
    const validationErrors = ToolValidator.validateForApproval(tool);
    if (validationErrors.length > 0) {
      alert(`工具不满足批准条件:\n${validationErrors.join('\n')}`);
      return;
    }

    const confirmed = window.confirm(
      `确定要申请将工具 "${tool.name}" 加入系统工具库吗？\n\n` +
      `注意：\n` +
      `• 工具将经过审核后加入系统\n` +
      `• 敏感信息（如API密钥）将被移除\n` +
      `• 其他用户使用时需要填入自己的配置\n` +
      `• 审核通过后所有用户都可以使用此工具`
    );

    if (!confirmed) return;

    setApprovingTools(prev => new Set([...prev, toolId]));

    try {
      // 发送批准申请
      const response = await fetch('/api/tools/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: toolId,
          toolData: tool,
          reason: '用户申请将MCP工具加入系统工具库'
        })
      });

      if (response.ok) {
        const result = await response.json();

        // 更新工具状态
        const updatedTools = myTools.map(t => {
          if (t.id === toolId) {
            return {
              ...t,
              approvalStatus: APPROVAL_STATUS.PENDING,
              approvalRequestedAt: new Date().toISOString()
            };
          }
          return t;
        });

        setMyTools(updatedTools);
        localStorage.setItem('myMcpTools', JSON.stringify(updatedTools));

        // 使用工具管理器更新工具
        try {
          await toolManager.requestApproval(toolId);
        } catch (error) {
          console.warn('工具管理器更新失败:', error);
        }

        // 触发工具库更新事件
        window.dispatchEvent(new Event('toolsConfigUpdated'));

        alert('批准申请已提交！工具将进入审核流程，审核通过后将加入系统工具库。');
      } else {
        // 如果API不可用，模拟申请过程
        const updatedTools = myTools.map(t => {
          if (t.id === toolId) {
            return {
              ...t,
              approvalStatus: APPROVAL_STATUS.PENDING,
              approvalRequestedAt: new Date().toISOString()
            };
          }
          return t;
        });

        setMyTools(updatedTools);
        localStorage.setItem('myMcpTools', JSON.stringify(updatedTools));

        alert('批准申请已提交（模拟）！工具状态已更新为待批准。');
      }

    } catch (error) {
      console.error('申请批准失败:', error);
      alert(`申请批准失败: ${error.message}`);
    } finally {
      setApprovingTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolId);
        return newSet;
      });
    }
  };

  // 获取当前传输方式的配置模式
  const getCurrentSchema = () => {
    return transport === 'stdio' ? MCPStdIOSchema : MCPHTTPSchema;
  };

  return (
    <div className="mcp-connections-page">
      {/* 页面头部 */}
      <div className="mcp-page-header">
        <div className="mcp-header-icon">🔧</div>
        <div className="mcp-header-content">
          <h1>MCP 工具配置</h1>
          <p>配置和管理您的 MCP 服务器连接</p>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mcp-stats-grid">
        <div className="mcp-stat-card">
          <div className="mcp-stat-number">{myTools.length}</div>
          <div className="mcp-stat-label">已配置服务器</div>
        </div>
        <div className="mcp-stat-card">
          <div className="mcp-stat-number">{myTools.filter(t => t.transport === 'stdio').length}</div>
          <div className="mcp-stat-label">STDIO 连接</div>
        </div>
        <div className="mcp-stat-card">
          <div className="mcp-stat-number">{myTools.filter(t => t.transport === 'http').length}</div>
          <div className="mcp-stat-label">HTTP 连接</div>
        </div>
      </div>

      {/* 主要内容区域 - 单列布局 */}
      <div className="mcp-main-content-single">
        {/* 配置区域 */}
        <div className="mcp-config-section">
          {myTools.length === 0 ? (
            /* 空状态 */
            <div className="mcp-empty-state">
              <span className="mcp-empty-icon">🚀</span>
              <h3 className="mcp-empty-title">开始配置 MCP 服务器</h3>
              <p className="mcp-empty-description">
                MCP (Model Context Protocol) 让您能够连接各种外部工具和服务，扩展AI的能力边界。
              </p>
              <button
                className="mcp-add-button"
                onClick={() => setShowConfigForm(true)}
              >
                <span>+</span>
                添加 MCP 服务器
              </button>
            </div>
          ) : (
            /* 工具列表 */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '20px', fontWeight: '700' }}>
                  已配置的 MCP 服务器
                </h3>
                <button
                  className="mcp-add-button"
                  onClick={() => setShowConfigForm(true)}
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  <span>+</span>
                  添加服务器
                </button>
              </div>
              <div className="mcp-tools-grid">
                {myTools.map((tool, idx) => {
                  const isApprovingTool = approvingTools.has(tool.id);
                  const canRequestApproval = tool.approvalStatus !== APPROVAL_STATUS.PENDING &&
                                           tool.approvalStatus !== APPROVAL_STATUS.APPROVED &&
                                           !isApprovingTool;

                  return (
                    <div key={idx} className="mcp-tool-card">
                      <div className="mcp-tool-header">
                        <h4 className="mcp-tool-name">{tool.name}</h4>
                        <div className="mcp-tool-badges">
                          <span className="mcp-tool-type">
                            {(tool.transport === 'stdio' || tool.server_type === 'stdio') ? 'STDIO' : 'HTTP'}
                          </span>
                          {/* 状态徽章 */}
                          {/* 测试状态显示已移除 */}
                          {tool.approvalStatus === APPROVAL_STATUS.PENDING && (
                            <span className="status-badge status-pending">⏳ 待批准</span>
                          )}
                          {tool.approvalStatus === APPROVAL_STATUS.APPROVED && (
                            <span className="status-badge status-approved">🎉 已批准</span>
                          )}
                        </div>
                      </div>

                      {/* 功能分类 */}
                      {tool.functionalCategory && (
                        <div className="mcp-tool-category">
                          <span className="category-label">
                            分类: {formatCategories(tool.functionalCategory)}
                          </span>
                        </div>
                      )}

                      {/* 用户描述 */}
                      {tool.description && (
                        <p
                          className="mcp-tool-description user-description clickable-description"
                          onClick={() => setDescriptionModal({ show: true, content: tool.description, title: tool.name })}
                          title="点击查看完整描述"
                        >
                          {tool.description.length > 30
                            ? `${tool.description.substring(0, 30)}...`
                            : tool.description
                          }
                        </p>
                      )}

                      {/* 技术信息 */}
                      <p className="mcp-tool-tech-info">
                        {(tool.transport === 'stdio' || tool.server_type === 'stdio')
                          ? `命令: ${tool.command} ${safeJoin(tool.args, ' ')}`
                          : `端点: ${tool.url || '未配置'}`
                        }
                      </p>

                      {/* 测试结果显示已移除 */}

                      {/* 操作按钮 */}
                      <div className="mcp-tool-actions">




                        {/* 申请批准按钮 */}
                        {canRequestApproval && (
                          <button
                            className="mcp-tool-btn mcp-tool-btn-approve"
                            onClick={() => requestApproval(tool.id)}
                            disabled={isApprovingTool}
                          >
                            {isApprovingTool ? '申请中...' : '申请批准'}
                          </button>
                        )}

                        <button
                          className="mcp-tool-btn mcp-tool-btn-delete"
                          onClick={() => deleteTool(idx)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MCP协议介绍面板 */}
        <div className="mcp-info-panel">
          <h3 className="mcp-info-title">
            <span>📚</span>
            MCP 协议介绍
          </h3>
          <div className="mcp-info-content">
            <p>Model Context Protocol (MCP) 是一个开放标准，用于连接AI助手与外部数据源和工具。</p>

            <h4 style={{ margin: '20px 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#495057' }}>
              支持的连接类型
            </h4>
            <ul className="mcp-info-list">
              <li>STDIO - 通过标准输入输出通信</li>
              <li>HTTP - 通过HTTP协议通信</li>
              <li>WebSocket - 实时双向通信</li>
            </ul>

            <h4 style={{ margin: '20px 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#495057' }}>
              常见用途
            </h4>
            <ul className="mcp-info-list">
              <li>文件系统访问</li>
              <li>数据库查询</li>
              <li>API 集成</li>
              <li>工具链集成</li>
            </ul>

            <h4 style={{ margin: '20px 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#495057' }}>
              配置提示
            </h4>
            <ul className="mcp-info-list">
              <li>确保服务器路径正确</li>
              <li>检查端口是否被占用</li>
              <li>验证权限配置</li>
              <li>测试连接稳定性</li>
            </ul>

            <div style={{
              marginTop: '24px',
              marginBottom: '8px', /* 添加底部外边距 */
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <p style={{
                margin: 0,
                fontSize: '13px', /* 稍微增大字体 */
                color: '#6c757d',
                lineHeight: '1.5'
              }}>
                💡 提示：配置完成后，请测试连接以确保服务器正常工作。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 配置表单弹窗 */}
      {showConfigForm && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e9ecef'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                配置 MCP 服务器
              </h3>
              <button
                onClick={() => setShowConfigForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            {/* MCP 服务器介绍部分 */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '20px', marginRight: '8px' }}>🚀</span>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                  关于 MCP 服务器
                </h4>
              </div>
              <p style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#6c757d',
                lineHeight: '1.5'
              }}>
                MCP (Model Context Protocol) 是一个开放标准，允许AI助手连接到各种外部工具和数据源。
                通过配置MCP服务器，您可以扩展AI的能力边界。
              </p>
              <div style={{ fontSize: '13px', color: '#868e96' }}>
                <strong>支持的传输方式：</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  <li><strong>STDIO</strong> - 通过标准输入输出与本地程序通信</li>
                  <li><strong>HTTP</strong> - 通过HTTP协议与远程服务通信</li>
                </ul>
              </div>
            </div>

            {/* 功能分类选择器 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                功能分类 * (最多选择5个)
              </label>
              <FunctionalCategorySelector
                value={functionalCategory}
                onChange={setFunctionalCategory}
                placeholder="选择工具的功能分类"
                required={true}
                showSearch={true}
                multiple={true}
                maxSelections={5}
              />
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                选择最符合此工具功能的分类，有助于其他用户发现和使用。最多可选择5个分类。
              </div>
            </div>

            {/* 传输方式选择 */}
            <div className="form-row" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                传输方式
              </label>
              <select 
                value={transport} 
                onChange={(e) => setTransport(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="stdio">STDIO</option>
                <option value="http">HTTP</option>
              </select>
            </div>



            <GenericConfigForm
              schema={getCurrentSchema()}
              onSave={handleSave}
              onCancel={() => setShowConfigForm(false)}
              hideTitle={true}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {/* 描述详情弹窗 */}
      {descriptionModal.show && (
        <div className="description-modal-overlay" onClick={() => setDescriptionModal({ show: false, content: '', title: '' })}>
          <div className="description-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="description-modal-header">
              <h3 className="description-modal-title">{descriptionModal.title} - 工具描述</h3>
              <button
                className="description-modal-close"
                onClick={() => setDescriptionModal({ show: false, content: '', title: '' })}
              >
                ✕
              </button>
            </div>
            <div className="description-modal-body">
              <p className="description-modal-text">{descriptionModal.content}</p>
            </div>
            <div className="description-modal-footer">
              <button
                className="description-modal-btn"
                onClick={() => setDescriptionModal({ show: false, content: '', title: '' })}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPConnectionsPage;
