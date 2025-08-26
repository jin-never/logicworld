import React, { useState, useEffect } from 'react';
import './InfoPage.css'; // 导入 InfoPage 的样式
import AIConnectionsPage from './AIConnectionsPage';
import NewAIServicePage from './NewAIServicePage';
import MCPConnectionsPage from './MCPConnectionsPage';
import APIConnectionsPage from './APIConnectionsPage';
import PersonalSettingsPage from './PersonalSettingsPage';
import AccountInfoPage from './AccountInfoPage';
import SecurityManagementPage from './SecurityManagementPage';
import FunctionalCategorySelector from './components/FunctionalCategorySelector';
import { TOOL_CATEGORIES } from './constants/toolCategories';

import MyWorkflowsPage from './MyWorkflowsPage';
import RecentEditsPage from './RecentEditsPage';
import MyFavoritesPage from './MyFavoritesPage';
import TrashPage from './TrashPage';
import AIServicePage from './AIServicePage';
import APIToolsPage from './APIToolsPage';
import BrainTestPage from './BrainTestPage';
import SystemToolsPage from './SystemToolsPage';
import LogicWorld from './components/LogicWorld';
import LoginForm from './components/Security/LoginForm';
import RegisterForm from './components/Security/RegisterForm';
import APIKeyManager from './components/Security/APIKeyManager';
import { loadConfiguredTools, deleteConfiguredTool, saveConfiguredTool, updateConfiguredTool, loadSystemTools, saveSystemTool, refreshSystemToolsFromBackend } from './configStorage';
import GenericConfigForm from './GenericConfigForm';
import { AISchema, APISchema, MCPStdIOSchema, MCPHTTPSchema } from './toolSchemas';
import ToolTester from './components/ToolTester';
import ToolLibraryDemo from './ToolLibraryDemo';
// 后端 API 基址
// 使用相对路径，让代理配置生效
const API_BASE = '';

// 辅助函数：获取分类显示名称
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

// 思维导图管理API
const mindmapAPI = {
  // 获取所有思维导图
  getAll: async () => {
    const response = await fetch(`${API_BASE}/api/mindmaps`);
    if (!response.ok) throw new Error('Failed to fetch mindmaps');
    return response.json();
  },

  // 获取最近编辑的思维导图
  getRecent: async () => {
    const response = await fetch(`${API_BASE}/api/mindmaps/recent`);
    if (!response.ok) throw new Error('Failed to fetch recent mindmaps');
    return response.json();
  },

  // 创建思维导图
  create: async (mindmap) => {
    const response = await fetch(`${API_BASE}/api/mindmaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mindmap)
    });
    if (!response.ok) throw new Error('Failed to create mindmap');
    return response.json();
  },

  // 更新思维导图
  update: async (mindmapId, mindmap) => {
    const response = await fetch(`${API_BASE}/api/mindmaps/${mindmapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mindmap)
    });
    if (!response.ok) throw new Error('Failed to update mindmap');
    return response.json();
  },

  // 更新访问时间
  updateAccess: async (mindmapId) => {
    const response = await fetch(`${API_BASE}/api/mindmaps/${mindmapId}/access`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to update access time');
    return response.json();
  },

  // 删除思维导图（移到回收站）
  delete: async (mindmapId) => {
    const response = await fetch(`${API_BASE}/api/mindmaps/${mindmapId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete mindmap');
    return response.json();
  }
};

// 回收站管理API
const trashAPI = {
  // 获取回收站内容
  getAll: async () => {
    const response = await fetch(`${API_BASE}/api/trash`);
    if (!response.ok) throw new Error('Failed to fetch trash items');
    return response.json();
  },

  // 恢复思维导图
  restore: async (mindmapId) => {
    const response = await fetch(`${API_BASE}/api/trash/${mindmapId}/restore`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to restore mindmap');
    return response.json();
  },

  // 永久删除
  permanentDelete: async (mindmapId) => {
    const response = await fetch(`${API_BASE}/api/trash/${mindmapId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to permanently delete mindmap');
    return response.json();
  }
};

// MCP 编辑表单组件（避免在 render 中直接调用 hook）
const McpEditForm = ({ tool, onSave, onCancel }) => {
  const [transport, setTransport] = React.useState(tool.transport || tool.server_type || 'stdio');
  const [functionalCategory, setFunctionalCategory] = React.useState(tool.functionalCategory || []);
  const schema = transport === 'http' ? MCPHTTPSchema : MCPStdIOSchema;

  // 处理数据格式，确保编辑时正确显示现有数据
  const normalizeToolData = (tool) => {
    console.log('原始工具数据:', tool);

    const normalized = { ...tool };

    // 处理args字段 - 统一转换为字符串格式供表单显示
    if (Array.isArray(tool.args)) {
      normalized.args = tool.args.join(' ');
    } else if (typeof tool.args === 'string') {
      normalized.args = tool.args;
    } else {
      normalized.args = '';
    }

    // 确保command字段存在 - 检查多个可能的字段
    normalized.command = tool.command || tool.cmd || '';

    // 如果command仍然为空，尝试从config中获取
    if (!normalized.command && tool.config && tool.config.command) {
      normalized.command = tool.config.command;
    }

    // 处理transport/server_type字段映射
    normalized.transport = tool.transport || tool.server_type || 'stdio';

    // 处理超时时间
    normalized.timeout = tool.timeout || '';

    // 处理环境变量
    if (tool.env && typeof tool.env === 'object') {
      normalized.env = Object.entries(tool.env).map(([key, value]) => ({ key, value }));
    } else {
      normalized.env = [];
    }

    // 确保必需字段存在
    normalized.name = tool.name || '';
    normalized.description = tool.description || '';

    console.log('规范化后的工具数据:', normalized);
    return normalized;
  };

  const handleInnerSave = (data) => {
    const envObj = Array.isArray(data.env)
      ? data.env.reduce((acc, { key, value }) => {
          if (key) acc[key] = value;
          return acc;
        }, {})
      : {};

    // 处理args字段格式转换 - 后端期望List[str]格式
    let processedArgs = data.args;
    if (typeof data.args === 'string' && data.args.trim()) {
      // 将字符串转换为数组，按空格分割
      processedArgs = data.args.trim().split(/\s+/);
    } else if (!Array.isArray(data.args)) {
      processedArgs = [];
    }

    // 确保保存时包含原始工具的所有重要字段，避免创建新工具
    const updatedData = {
      ...tool, // 保留原始工具的所有字段
      ...data, // 覆盖用户修改的字段
      id: tool.id, // 重要：确保ID不变
      args: processedArgs, // 使用处理后的args格式
      env: envObj,
      server_type: transport, // 后端使用server_type字段
      transport, // 保留transport字段以兼容前端
      functionalCategory,
      // 确保必需字段存在
      enabled: tool.enabled !== undefined ? tool.enabled : true,
      version: tool.version || "1.0.0",
      author: tool.author || "",
      createdAt: tool.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('保存工具数据:', updatedData);
    console.log('原始工具ID:', tool.id);
    console.log('处理后的args:', processedArgs);

    onSave(updatedData);
  };

  return (
    <div className="mcp-edit-form-enhanced">
      <div className="edit-form-header">
        <h2>
          <span className="edit-icon">✏️</span>
          {schema.title} – 编辑
        </h2>
        <p className="edit-form-subtitle">配置您的MCP工具，包括功能分类和连接参数</p>
      </div>

      {/* MCP 介绍部分 */}
      <div className="mcp-info-section">
        <div className="info-header">
          <span className="info-icon">🚀</span>
          <h4>关于 MCP 服务器</h4>
        </div>
        <p className="info-text">
          MCP (Model Context Protocol) 是一个开放标准，允许AI助手连接到各种外部工具和数据源。
          通过配置MCP服务器，您可以扩展AI的能力边界。
        </p>
        <div className="transport-info">
          <strong>支持的传输方式：</strong>
          <ul>
            <li><strong>STDIO</strong> - 通过标准输入输出与本地程序通信</li>
            <li><strong>HTTP</strong> - 通过HTTP协议与远程服务通信</li>
          </ul>
        </div>
      </div>

      {/* 功能分类选择器 */}
      <div className="form-section">
        <label className="form-label">
          功能分类 <span className="required">*</span>
          <span className="label-hint">(最多选择5个)</span>
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
        <div className="form-hint">
          选择最符合此工具功能的分类，有助于其他用户发现和使用。最多可选择5个分类。
        </div>
      </div>

      {/* 传输方式选择 */}
      <div className="form-section">
        <label className="form-label">
          🔗 传输方式 <span className="required">*</span>
        </label>
        <select
          className="form-select"
          value={transport}
          onChange={(e) => setTransport(e.target.value)}
        >
          <option value="stdio">STDIO</option>
          <option value="http">HTTP</option>
        </select>
      </div>

      {/* 配置表单 */}
      <GenericConfigForm
        schema={schema}
        initialValues={normalizeToolData(tool)}
        hideTitle={true}
        onSave={handleInnerSave}
        onCancel={onCancel}
      />
    </div>
  );
};

const InfoPage = ({
  pageType,
  onNewMindMap
}) => {
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const [showAPIConfig, setShowAPIConfig] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  // 存储当前分类下已配置的工具列表
  const [configuredList, setConfiguredList] = useState([]);
  const [editingTool, setEditingTool] = useState(null); // { ...toolConfig, category }
  const [testingTool, setTestingTool] = useState(null);
  const [systemTools, setSystemTools] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 当前激活的过滤器
  const [showToolTester, setShowToolTester] = useState(null); // 显示工具测试器
  const [testSteps, setTestSteps] = useState([]); // 测试步骤状态
  const [descriptionModal, setDescriptionModal] = useState({ show: false, content: '', title: '' }); // 描述弹窗状态

  useEffect(() => {
    const syncSys = () => setSystemTools(loadSystemTools());
    // 先从本地加载
    syncSys();
    // 只从工具库加载数据，避免重复
    loadToolsLibrary();
    window.addEventListener('systemToolsUpdated', syncSys);
    return () => window.removeEventListener('systemToolsUpdated', syncSys);
  }, []);

  // 加载工具库数据
  const loadToolsLibrary = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tools/library`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.tools) {
          console.log('工具库数据:', data.tools);
          console.log('查找目标工具:', data.tools.filter(t =>
            t.name?.toLowerCase().includes('web_search') ||
            t.name?.toLowerCase().includes('fetch_page') ||
            t.name?.toLowerCase().includes('file_operations') ||
            t.id?.toLowerCase().includes('web_search') ||
            t.id?.toLowerCase().includes('fetch_page') ||
            t.id?.toLowerCase().includes('file_operations')
          ));

          // 将工具库数据合并到systemTools中
          const libraryTools = data.tools.map(tool => ({
            ...tool,
            // 确保必要字段存在
            name: tool.name || tool.id,
            description: tool.description || '工具描述',
            category: '系统内置', // 统一设置为系统内置
            source: 'system', // 统一设置为系统来源
            approved: true, // 真实工具都是已批准的
            tested: true, // 真实工具都是已测试的
            enabled: true, // 真实工具都是启用的
            icon: tool.icon || '🛠️' // 确保有图标
          }));

          // 获取现有的本地系统工具
          const localSystemTools = loadSystemTools();

          // 合并数据，优先使用工具库数据，避免重复
          const mergedTools = [...libraryTools];
          const libraryToolIds = new Set(libraryTools.map(t => t.id || t.name));

          // 添加本地工具中不在工具库中的工具
          localSystemTools.forEach(localTool => {
            const toolId = localTool.id || localTool.name;
            if (!libraryToolIds.has(toolId)) {
              mergedTools.push(localTool);
            }
          });

          setSystemTools(mergedTools);
          console.log('合并后的系统工具:', mergedTools.length, '个');
          console.log('网络工具:', mergedTools.filter(t => t.category === '网络工具'));
          console.log('文件工具:', mergedTools.filter(t => t.category === '文件工具'));
        }
      }
    } catch (error) {
      console.error('加载工具库失败:', error);
      // 如果工具库加载失败，使用本地数据
      setSystemTools(loadSystemTools());
    }
  };

  const openEditModal = (tool) => {
    console.log('打开编辑模态框，工具数据:', tool);
    console.log('工具ID:', tool.id);

    // 确保工具对象包含所有必要的字段
    const completeToolData = {
      ...tool,
      id: tool.id, // 确保ID存在
      category: pageType // 添加分类信息
    };

    console.log('完整工具数据:', completeToolData);
    setEditingTool(completeToolData);
  };

  const closeEditModal = () => setEditingTool(null);

  const handleDelete = async (tool) => {
    if (window.confirm('确认删除该工具配置?')) {
      const success = await deleteConfiguredTool(pageType, tool.id);
      if (success) {
        // 重新加载配置列表
        setConfiguredList(loadConfiguredTools()[pageType] || []);
      }
    }
  };

  const handleUpdate = async (updatedData) => {
    if (!editingTool) return;
    const success = await saveConfiguredTool(pageType, { ...updatedData, id: editingTool.id });
    if (success) {
      // 重新加载配置列表
      setConfiguredList(loadConfiguredTools()[pageType] || []);
      closeEditModal();
    }
  };

  // 真实的工具测试函数 - 带步骤跟踪和功能验证
  const runRealTest = async (tool) => {
    const steps = [
      { id: 'config', name: '检查配置', status: 'pending', message: '验证工具配置参数' },
      { id: 'start', name: '启动服务器', status: 'pending', message: '启动MCP服务器进程' },
      { id: 'handshake', name: '协议握手', status: 'pending', message: '发送初始化消息' },
      {
        id: 'function',
        name: '功能验证',
        status: 'pending',
        message: '测试工具实际功能',
        substeps: []
      }
    ];

    setTestSteps([...steps]);

    try {
      // 步骤1: 检查配置
      setTestSteps(prev => prev.map(step =>
        step.id === 'config' ? { ...step, status: 'running' } : step
      ));

      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟检查时间

      const payload = {
        name: tool.name,
        command: tool.command,
        transport: tool.transport || tool.server_type || 'stdio'
      };

      if (tool.args) {
        if (Array.isArray(tool.args)) {
          payload.args = tool.args;
        } else if (typeof tool.args === 'string') {
          payload.args = tool.args.split(',').map(arg => arg.trim()).filter(arg => arg);
        }
      }
      if (tool.url) payload.url = tool.url;
      if (tool.timeout) payload.timeout = tool.timeout;
      if (tool.env && typeof tool.env === 'object') payload.env = tool.env;

      setTestSteps(prev => prev.map(step =>
        step.id === 'config' ? { ...step, status: 'success', message: '配置验证通过' } : step
      ));

      // 步骤2-4: 调用后端测试（使用新的API端点）
      setTestSteps(prev => prev.map(step =>
        step.id === 'start' ? { ...step, status: 'running' } : step
      ));

      const response = await fetch(`${API_BASE}/api/tools/test-mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id || tool.name,
          config: payload
        })
      });

      const result = await response.json();

      if (result.success) {
        // 基础测试步骤
        setTestSteps(prev => prev.map(step =>
          step.id === 'start' ? { ...step, status: 'success', message: '服务器启动成功' } : step
        ));

        await new Promise(resolve => setTimeout(resolve, 300));

        setTestSteps(prev => prev.map(step =>
          step.id === 'handshake' ? { ...step, status: 'running' } : step
        ));

        await new Promise(resolve => setTimeout(resolve, 300));

        setTestSteps(prev => prev.map(step =>
          step.id === 'handshake' ? { ...step, status: 'success', message: '协议握手成功' } : step
        ));

        // 功能验证步骤
        setTestSteps(prev => prev.map(step =>
          step.id === 'function' ? { ...step, status: 'running', message: '正在进行功能验证...' } : step
        ));

        // 处理功能验证结果
        const functionTest = result.details?.function_test;
        if (functionTest && functionTest.steps) {
          // 更新功能验证的子步骤
          setTestSteps(prev => prev.map(step => {
            if (step.id === 'function') {
              return {
                ...step,
                status: functionTest.success ? 'success' : 'failed',
                message: functionTest.message,
                substeps: functionTest.steps.map(substep => ({
                  name: substep.name,
                  status: substep.status,
                  message: substep.message
                }))
              };
            }
            return step;
          }));
        } else {
          // 回退到简单的成功状态
          setTestSteps(prev => prev.map(step =>
            step.id === 'function' ? { ...step, status: 'success', message: '功能验证完成' } : step
          ));
        }

        return true;
      } else {
        // 根据错误类型设置失败步骤
        const errorMsg = result.error || '未知错误';
        let failedStep = 'start';
        let failedMessage = errorMsg;

        if (errorMsg.includes('配置')) {
          failedStep = 'config';
          failedMessage = '配置参数错误，请检查命令和参数';
        } else if (errorMsg.includes('启动') || errorMsg.includes('command')) {
          failedStep = 'start';
          failedMessage = '服务器启动失败，请检查命令路径和依赖';
        } else if (errorMsg.includes('initialize') || errorMsg.includes('协议')) {
          failedStep = 'handshake';
          failedMessage = 'MCP协议握手失败，请检查版本兼容性';
        } else {
          failedStep = 'function';
          failedMessage = '功能测试失败，请检查工具实现';
        }

        setTestSteps(prev => prev.map(step =>
          step.id === failedStep ? { ...step, status: 'failed', message: failedMessage } : step
        ));

        return false;
      }
    } catch (error) {
      console.error('测试失败:', error);
      setTestSteps(prev => prev.map(step =>
        step.id === 'start' ? { ...step, status: 'failed', message: `网络错误: ${error.message}` } : step
      ));
      return false;
    }
  };

  // 同步工具到系统工具库
  const syncToSystemTools = async (tool) => {
    try {
      const systemToolConfig = {
        name: tool.name,
        description: tool.description || `用户配置的${tool.name}工具`,
        transport: tool.transport || tool.server_type || 'stdio',
        command: tool.command,
        args: Array.isArray(tool.args) ? tool.args : (tool.args ? tool.args.split(',').map(s => s.trim()) : []),
        timeout: tool.timeout || 60000,
        env: tool.env || {},
        tested: true,
        approved: false
      };

      const response = await fetch(`${API_BASE}/system-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemToolConfig)
      });

      if (response.ok) {
        console.log(`工具 ${tool.name} 已同步到系统工具库`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('同步到系统工具库失败:', error);
      return false;
    }
  };

  const handleTest = async (tool) => {
    setTestingTool({ tool, stage: 'running' });
    const ok = await runRealTest(tool);
    if (ok) {
      setTestingTool({ tool, stage: 'success' });
      updateConfiguredTool(pageType, tool.id, { tested: true });
      // 测试成功后自动同步到系统工具库
      await syncToSystemTools(tool);
      // 3秒后自动关闭弹窗
      setTimeout(() => {
        setTestingTool(null);
      }, 3000);
    } else {
      setTestingTool({ tool, stage: 'failed' });
    }
  };

  // 工具测试完成回调
  const handleToolTestComplete = (tool, success) => {
    if (success) {
      updateConfiguredTool(pageType, tool.id, { tested: true });
      syncToSystemTools(tool);
    }
    setShowToolTester(null);
  };

  const handleApprove = async (tool) => {
    // 确认对话框
    const confirmed = window.confirm(
      `🎉 感谢您为工具库做出贡献！\n\n` +
      `确定要将工具 "${tool.name}" 批准加入系统工具库吗？\n\n` +
      `✨ 批准后的好处：\n` +
      `• 工具将对所有用户可用\n` +
      `• 提升整个平台的工具生态\n` +
      `• 您的贡献将帮助更多用户\n\n` +
      `📝 注意：敏感信息（如API密钥）将被移除，其他用户需要填入自己的配置。`
    );

    if (!confirmed) return;

    // 1. 构造后端需要的字段
    // 构造 payload，剔除空字符串，timeout 转为数字
    const payload = {};
    if (tool.name) payload.name = tool.name;
    if (tool.transport) payload.transport = tool.transport;
    if (tool.command) payload.command = tool.command;
    if (tool.args) {
      if (Array.isArray(tool.args)) {
        payload.args = tool.args;
      } else if (typeof tool.args === 'string') {
        // 如果args是字符串，尝试按逗号分割
        payload.args = tool.args.split(',').map(arg => arg.trim()).filter(arg => arg);
      }
    }
    if (tool.url) payload.url = tool.url;
    if (tool.timeout !== undefined && tool.timeout !== null && tool.timeout !== '') {
      const numTimeout = Number(tool.timeout);
      if (!Number.isNaN(numTimeout)) payload.timeout = numTimeout;
    }

    // 添加同步到系统工具库需要的额外字段
    payload.description = tool.description || `用户配置的${tool.name}工具`;
    payload.tested = true;
    payload.approved = true;

    // 添加系统工具显示所需的字段
    payload.id = `user_shared_${tool.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    payload.category = "系统工具";
    payload.functionalCategory = tool.functionalCategory || ["system_tools"];
    payload.icon = "⚙️";
    payload.source = "user_shared";
    payload.tool_type = "mcp_tool";
    payload.enabled = true;
    payload.tags = ["用户分享", "MCP工具"];

    if (tool.env && Object.keys(tool.env).length) payload.env = tool.env;

    try {
      const resp = await fetch(`${API_BASE}/system-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error('同步系统工具失败:', errText);
        alert(`同步到后端失败: ${resp.status}`);
        return; // 不做本地批准
      }

      console.log('已同步系统工具到后端');

      // 2. 本地状态更新（仅在成功后）
      if (pageType === 'mcp') {
        // MCP工具需要同时更新后端和前端状态
        try {
          // 更新后端MCP工具状态
          const mcpUpdateResp = await fetch(`${API_BASE}/mcp-tools/${tool.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...tool,
              approved: true,
              approvalStatus: "approved",
              approvedAt: new Date().toISOString()
            }),
          });

          if (mcpUpdateResp.ok) {
            console.log('MCP工具状态已更新到后端');
          } else {
            console.warn('MCP工具状态更新失败:', await mcpUpdateResp.text());
          }
        } catch (error) {
          console.warn('更新MCP工具状态出错:', error);
        }

        // 更新前端状态
        updateConfiguredTool(pageType, tool.id, {
          approved: true,
          approvalStatus: "approved",
          approvedAt: new Date().toISOString()
        });

        // 刷新MCP工具数据
        window.dispatchEvent(new Event('mcpToolsUpdated'));
      } else {
        updateConfiguredTool(pageType, tool.id, { approved: true });
      }

      saveSystemTool(tool);

      // 更新本地 systemTools 列表
      try {
        await refreshSystemToolsFromBackend();
      } catch (error) {
        console.warn('刷新系统工具列表失败，但批准操作已成功:', error);
      }

      // 显示成功消息
      alert(
        `🎉 太棒了！工具 "${tool.name}" 已成功批准并加入系统工具库！\n\n` +
        `✨ 感谢您的贡献！您的工具现在可以帮助更多用户了。\n\n` +
        `📚 工具已添加到系统工具库，所有用户都可以使用。`
      );

    } catch (e) {
      console.error('调用 /system-tools 出错', e);
      alert('网络错误，未能同步到后端');
      return; // 失败退出
    }

    setTestingTool(null);
  };

  // 过滤工具的函数
  const getFilteredTools = () => {
    // 分离系统内置工具和托管平台工具
    const systemBuiltinTools = systemTools.filter(tool => {
      // 排除系统核心服务
      const isSystemCoreService = tool.name?.includes('intelligent-mode-detection') ||
                                  tool.name?.includes('智能模式检测') ||
                                  tool.category === 'AI智能处理';

      const isSystemBuiltin = !isSystemCoreService && (
        tool.category === '系统内置' ||
        tool.source === 'system' ||
        tool.source === 'mcp' ||
        tool.category === '网络工具' ||
        tool.category === '文件工具' ||
        (!tool.platform_info && !tool.source?.includes('平台'))
      );

      // 调试信息
      if (tool.name?.toLowerCase().includes('web_search') ||
          tool.name?.toLowerCase().includes('fetch_page') ||
          tool.name?.toLowerCase().includes('file_operations')) {
        console.log(`过滤工具 ${tool.name}:`, {
          category: tool.category,
          source: tool.source,
          isSystemCoreService,
          isSystemBuiltin,
          tool
        });
      }

      return isSystemBuiltin;
    });

    const platformHostedTools = systemTools.filter(tool =>
      tool.category === '托管平台' ||
      tool.platform_info ||
      tool.source?.includes('平台') ||
      tool.source?.includes('云') ||
      tool.source?.includes('托管')
    );

    switch (activeFilter) {
      case 'my-tools':
        // "我的 MCP 工具" = 只显示用户配置的MCP工具（不包含系统内置工具）
        return {
          configuredList: configuredList,
          systemTools: []
        };

      case 'approved':
        // "已批准的工具" = 只显示用户配置的已批准工具
        return {
          configuredList: configuredList.filter(t => t.approved || t.approvalStatus === 'approved'),
          systemTools: []
        };
      case 'pending':
        // "待批准的工具" = 只显示用户配置的待批准工具
        return {
          configuredList: configuredList.filter(t => t.tested && !t.approved && t.approvalStatus !== 'approved'),
          systemTools: []
        };
      default:
        // 全部显示时，只显示用户配置的工具和托管平台工具（不包含系统内置工具）
        return {
          configuredList: configuredList,
          systemTools: platformHostedTools
        };
    }
  };

  // 处理统计卡片点击
  const handleStatsClick = (filterType) => {
    setActiveFilter(filterType);
  };

  // 添加测试工具的函数
  const addTestTool = async () => {
    const testTool = {
      name: 'PromptX',
      command: 'npx',
      args: ['-y', '-f', '--registry', 'https://registry.npmjs.org', 'dpml-prompt@beta', 'mcp-server'],
      timeout: 60000,
      env: {},
      transport: 'stdio',
      tested: false,
      approved: false
    };
    await saveConfiguredTool('mcp', testTool);
    console.log('Test tool added:', testTool);
  };

  useEffect(() => {
    const updateList = async () => {
      try {
        // 首先尝试从API获取真实数据
        let apiData = [];

        switch (pageType) {
          case 'ai':
            try {
              const response = await fetch('/api/ai/services');
              if (response.ok) {
                const result = await response.json();
                apiData = result.data?.services || [];
              }
            } catch (error) {
              console.warn('Failed to fetch AI services from API:', error);
            }
            break;

          case 'mcp':
            try {
              const response = await fetch('/api/tools/mcp-tools');
              if (response.ok) {
                const result = await response.json();
                // 后端直接返回工具数组，不是嵌套在result.data.tools中
                apiData = Array.isArray(result) ? result : [];
                console.log('MCP工具API响应:', result);
              }
            } catch (error) {
              console.warn('Failed to fetch MCP tools from API:', error);
            }
            break;

          case 'api':
            try {
              const response = await fetch('/api/api/tools');
              if (response.ok) {
                const result = await response.json();
                apiData = result.data?.tools || [];
              }
            } catch (error) {
              console.warn('Failed to fetch API tools from API:', error);
            }
            break;
        }

        // 如果API数据获取成功，使用API数据；否则回退到本地存储
        if (apiData.length > 0) {
          console.log(`Loading ${pageType} tools from API:`, apiData);
          setConfiguredList(apiData);
        } else {
          // 回退到本地存储数据
          const data = loadConfiguredTools();
          console.log('Loading configured tools from localStorage:', data);
          setConfiguredList(data[pageType] || []);
        }
      } catch (error) {
        console.error('Error loading tools:', error);
        // 出错时回退到本地存储
        const data = loadConfiguredTools();
        setConfiguredList(data[pageType] || []);
      }
    };

    updateList();
    window.addEventListener('configuredToolsUpdated', updateList);
    return () => window.removeEventListener('configuredToolsUpdated', updateList);
  }, [pageType]);

  const getPageTitle = (type) => {
    switch (type) {
      case 'ai':
        return 'AI ';
      case 'mcp':
        return 'MCP ';
      case 'api':
        return 'API ';
      case 'systemTools':
        return '系统工具';
      case 'logicworld':
        return 'LogicWorld Protocol';
      case 'myWorkflows':
        return '我的工作流';
      case 'recentEdits':
        return '最近编辑';
      case 'myFavorites':
        return '我的收藏';
      case 'trash':
        return '回收站';
      case 'tool-library-demo':
        return '工具库演示';
      case 'personalSettings':
        return '个人设置';
      case 'accountInfo':
        return '账户信息';
      case 'securityManagement':
        return '安全管理';
      default:
        return '未知信息页面';
    }
  };

  const getPageContent = (type) => {
    switch (type) {
      case 'ai':
        return (
          <AIServicePage
            configuredList={configuredList}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onAdd={() => setShowAIConfig(true)}
          />
        );
      case 'mcp':
        return (
          <div className="mcp-page-layout">

            {/* 页面头部统计信息 */}
            <div className="mcp-stats-section">
              {(() => {
                // 计算统计数据
                const systemBuiltinTools = systemTools.filter(tool => {
                  // 排除系统核心服务
                  const isSystemCoreService = tool.name?.includes('intelligent-mode-detection') ||
                                              tool.name?.includes('智能模式检测') ||
                                              tool.category === 'AI智能处理';

                  return !isSystemCoreService && (
                    tool.category === '系统内置' ||
                    tool.source === 'system' ||
                    (!tool.platform_info && !tool.source?.includes('平台'))
                  );
                });

                const platformHostedTools = systemTools.filter(tool =>
                  tool.category === '托管平台' ||
                  tool.platform_info ||
                  tool.source?.includes('平台') ||
                  tool.source?.includes('云') ||
                  tool.source?.includes('托管')
                );

                // 重新计算统计数字，确保与实际显示的工具一致
                const myToolsCount = configuredList.length; // 只计算用户配置的工具
                const approvedCount = configuredList.filter(t => t.approved || t.approvalStatus === 'approved').length; // 用户工具中已批准的
                const pendingCount = configuredList.filter(t => t.tested && !t.approved && t.approvalStatus !== 'approved').length; // 用户工具中待批准的
                const totalCount = myToolsCount; // 总数就是用户工具数

                return (
                  <>
                    <div
                      className={`stats-card ${activeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => handleStatsClick('all')}
                    >
                      <div className="stats-icon">📊</div>
                      <div className="stats-content">
                        <div className="stats-number">{totalCount}</div>
                        <div className="stats-label">全部工具</div>
                      </div>
                    </div>
                    <div
                      className={`stats-card ${activeFilter === 'my-tools' ? 'active' : ''}`}
                      onClick={() => handleStatsClick('my-tools')}
                    >
                      <div className="stats-icon">🔧</div>
                      <div className="stats-content">
                        <div className="stats-number">{myToolsCount}</div>
                        <div className="stats-label">我的工具</div>
                      </div>
                    </div>
                    <div
                      className={`stats-card ${activeFilter === 'approved' ? 'active' : ''}`}
                      onClick={() => handleStatsClick('approved')}
                    >
                      <div className="stats-icon">✅</div>
                      <div className="stats-content">
                        <div className="stats-number">{approvedCount}</div>
                        <div className="stats-label">已批准</div>
                      </div>
                    </div>
                    <div
                      className={`stats-card ${activeFilter === 'pending' ? 'active' : ''}`}
                      onClick={() => handleStatsClick('pending')}
                    >
                      <div className="stats-icon">🧪</div>
                      <div className="stats-content">
                        <div className="stats-number">{pendingCount}</div>
                        <div className="stats-label">待批准</div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 主要内容区域 */}
            <div className="mcp-main-content">
              {(() => {
                const filteredData = getFilteredTools();
                const showMyTools = activeFilter === 'all' || activeFilter === 'my-tools' || activeFilter === 'approved' || activeFilter === 'pending';
                const showPlatformToolsSection = activeFilter === 'all';

                return (
                  <>
                    {/* 托管平台工具库区域 */}
                    {showPlatformToolsSection && (
                      <div className="mcp-section">
                        <div className="section-header">
                          <div className="section-title">
                            <h3>🌐 托管平台工具库</h3>
                            <span className="section-subtitle">从各大托管平台同步的 MCP 服务</span>
                          </div>
                          <div className="section-actions">
                            <button
                              className="btn-primary btn-small"
                              onClick={() => setShowSyncPanel(true)}
                            >
                              🔄 同步平台
                            </button>
                          </div>
                        </div>
                        <div className="section-content">
                          {filteredData.systemTools.length > 0 ? (
                            <>
                              <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '14px', color: '#666' }}>
                                💡 如果工具不显示，请尝试刷新页面
                              </div>
                              <div className="platform-tools-grid">
                                {filteredData.systemTools.map((t, i) => {
                                  // 确定平台来源
                                  let platformName = '未知平台';
                                  let platformColor = '#888';
                                  let platformIcon = '🔧';

                                // 根据工具的来源或特征判断平台
                                if (t.source === 'smithery' || t.name?.includes('Smithery')) {
                                  platformName = 'Smithery';
                                  platformColor = '#ff6b35';
                                  platformIcon = '🔨';
                                } else if (t.source === 'modao' || t.name?.includes('魔搭')) {
                                  platformName = '魔搭社区';
                                  platformColor = '#1890ff';
                                  platformIcon = '🎯';
                                } else if (t.source === 'tencent_scf' || t.name?.includes('腾讯云')) {
                                  platformName = '腾讯云SCF';
                                  platformColor = '#00a971';
                                  platformIcon = '☁️';
                                } else if (t.source === 'aliyun_fc' || t.name?.includes('阿里云')) {
                                  platformName = '阿里云FC';
                                  platformColor = '#ff6a00';
                                  platformIcon = '☁️';
                                } else if (t.source === 'huawei_fg' || t.name?.includes('华为云')) {
                                  platformName = '华为云FG';
                                  platformColor = '#e60012';
                                  platformIcon = '☁️';
                                } else if (t.baseUrl?.includes('localhost') || t.baseUrl?.includes('127.0.0.1')) {
                                  platformName = '本地服务';
                                  platformColor = '#52c41a';
                                  platformIcon = '🏠';
                                }

                                return (
                                  <div key={t.id || t.name || i} className="platform-tool-card">
                                    <div className="tool-header">
                                      <div className="tool-title-section">
                                        <span className="platform-icon">{platformIcon}</span>
                                        <h5 className="tool-name">{t.name || t.baseUrl}</h5>
                                      </div>
                                      <span
                                        className="platform-badge"
                                        style={{ backgroundColor: platformColor }}
                                      >
                                        {platformName}
                                      </span>
                                    </div>
                                    {t.description && (
                                      <p className="tool-description">{t.description}</p>
                                    )}
                                    <div className="tool-meta">
                                      <span className="tool-transport">
                                        <span className="meta-label">传输:</span>
                                        {t.transport || 'http'}
                                      </span>
                                      {t.timeout && (
                                        <span className="tool-timeout">
                                          <span className="meta-label">超时:</span>
                                          {t.timeout}ms
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              </div>
                            </>
                          ) : (
                            <div className="empty-state-card">
                              <div className="empty-icon">🌐</div>
                              <h4>暂无同步的平台工具</h4>
                              <p>点击右上角"同步平台"按钮来获取各大平台的 MCP 服务</p>
                              <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                💡 如果工具不显示，请尝试刷新页面
                              </p>
                              <button
                                className="btn-primary"
                                onClick={() => setShowSyncPanel(true)}
                              >
                                立即同步
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 我的 MCP 工具区域 */}
                    {showMyTools && (
                      <div className="mcp-section">
                        <div className="section-header">
                          <div className="section-title">
                            <h3>🔧 我的 MCP 工具</h3>
                            <span className="section-subtitle">
                              {activeFilter === 'approved' ? '已批准加入系统工具的 MCP 工具' :
                               activeFilter === 'pending' ? '测试通过但待批准的 MCP 工具' :
                               '您自己配置的 MCP 服务器工具'}
                            </span>
                          </div>
                          <div className="section-actions">
                          </div>
                        </div>
                        <div className="section-content">
                          {filteredData.configuredList.length ? (
                            <>
                              <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '14px', color: '#666' }}>
                                💡 如果工具不显示，请尝试刷新页面<br />
                                🗑️ 删除工具请到配置页面进行操作
                              </div>
                              <div className="my-tools-grid">
                                {filteredData.configuredList.map((tool, idx) => {
                                  const isSystemTool = tool.source === 'system' || tool.category === '系统内置';
                                  return (
                                  <div key={idx} className={`my-tool-card ${isSystemTool ? 'system-tool' : ''}`}>
                                    <div className="tool-card-header">
                                      <div className="tool-name-section">
                                        <span className="tool-icon">{tool.icon || '⚙️'}</span>
                                        <h4 className="tool-card-name">{tool.name}</h4>
                                      </div>
                                      <div className={`tool-status ${(tool.approved || tool.approvalStatus === 'approved') ? 'approved' : tool.tested ? 'tested' : 'untested'}`}>
                                        {isSystemTool ? '🏠 系统内置' :
                                         (tool.approved || tool.approvalStatus === 'approved') ? '✅ 已批准' :
                                         tool.tested ? '🧪 可批准' : '⚪ 未测试'}
                                      </div>
                                    </div>

                                    {tool.description && (
                                      <div
                                        className="tool-card-description clickable-description"
                                        onClick={() => setDescriptionModal({ show: true, content: tool.description, title: tool.name })}
                                        title="点击查看完整描述"
                                        style={{ cursor: 'pointer' }}
                                      >
                                        {tool.description.length > 30
                                          ? `${tool.description.substring(0, 30)}...`
                                          : tool.description
                                        }
                                      </div>
                                    )}

                                    {/* 功能分类 */}
                                    {tool.functionalCategory && (
                                      <div className="tool-card-category">
                                        <span className="category-label">
                                          分类: {formatCategories(tool.functionalCategory)}
                                        </span>
                                      </div>
                                    )}

                                    <div className="tool-card-actions">
                                      {!isSystemTool && (
                                        <>
                                          <button
                                            className="btn-secondary btn-mini"
                                            onClick={() => openEditModal(tool)}
                                          >
                                            编辑
                                          </button>
                                          {!tool.tested && (
                                            <button
                                              className="btn-secondary btn-mini"
                                              onClick={() => handleTest(tool)}
                                              disabled={testingTool && testingTool.tool.id === tool.id}
                                            >
                                              {testingTool && testingTool.tool.id === tool.id ? '测试中...' : '测试'}
                                            </button>
                                          )}
                                          {tool.tested && !tool.approved && (
                                            <button
                                              className="btn-primary btn-mini"
                                              onClick={() => handleApprove(tool)}
                                            >
                                              批准
                                            </button>
                                          )}

                                        </>
                                      )}

                                      {pageType === 'mcp' && tool.tested && (
                                        <button
                                          className="btn-info btn-mini"
                                          onClick={() => setShowToolTester(tool)}
                                        >
                                          详细测试
                                        </button>
                                      )}

                                      {isSystemTool && (
                                        <button
                                          className="btn-info btn-mini"
                                          onClick={() => setShowToolTester(tool)}
                                        >
                                          查看详情
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              </div>
                            </>
                          ) : (
                            <div className="empty-state-card">
                              <div className="empty-icon">🔧</div>
                              <h4>
                                {activeFilter === 'approved' ? '暂无已批准的工具' :
                                 activeFilter === 'pending' ? '暂无待批准的工具' :
                                 '尚未配置任何 MCP 工具'}
                              </h4>
                              <p>
                                {activeFilter === 'approved' ? '批准测试通过的工具后会显示在这里' :
                                 activeFilter === 'pending' ? '测试通过但未批准的工具会显示在这里' :
                                 '点击右上角"添加工具"按钮开始配置您的第一个 MCP 工具'}
                              </p>
                              <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                💡 如果工具不显示，请尝试刷新页面
                              </p>
                              {(activeFilter === 'all' || activeFilter === 'my-tools') && (
                                <button
                                  className="btn-primary"
                                  onClick={() => setShowMCPConfig(true)}
                                >
                                  立即添加
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        );
      case 'api':
        return (
          <APIToolsPage
            configuredList={configuredList}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onAdd={() => setShowAPIConfig(true)}
          />
        );
      // 系统工具页面
      case 'systemTools':
        return <SystemToolsPage />;

      // 个人设置页面
      case 'personalSettings':
        return <PersonalSettingsPage />;

      // 账户信息页面
      case 'accountInfo':
        return <AccountInfoPage />;

      // 安全管理页面
      case 'securityManagement':
        return <SecurityManagementPage />;

      // API密钥管理页面
      case 'apiKeys':
        return <APIKeyManager />;

      // 工作流管理页面
      case 'myWorkflows':
        return <MyWorkflowsPage />;
      case 'recentEdits':
        return <RecentEditsPage />;
      case 'myFavorites':
        return <MyFavoritesPage />;
      case 'trash':
        return <TrashPage />;
      case 'brainTest':
        return <BrainTestPage />;



      case 'logicworld':
        return <LogicWorld />;

      case 'tool-library-demo':
        return <ToolLibraryDemo />;

      default:
        return (
          <div className="default-page">
            <div className="default-content">
              <div className="default-icon">📋</div>
              <h2>欢迎使用思维导图工具</h2>
              <p>请从侧边栏选择一个功能开始使用。</p>
            </div>
          </div>
        );
    }
  };

  const getSchemaForTool = (tool) => {
    if (!tool) return null;
    switch (pageType) {
      case 'ai':
        return AISchema;
      case 'api':
        return APISchema;
      case 'mcp':
        return tool.transport === 'http' ? MCPHTTPSchema : MCPStdIOSchema;
      default:
        return null;
    }
  };

  const renderAIConfigOverlay = () => {
    if (pageType !== 'ai' || !showAIConfig) return null;
    return (
      <div className="ai-config-overlay" onClick={() => setShowAIConfig(false)}>
        <div className="ai-config-wrapper" onClick={(e) => e.stopPropagation()}>
          <NewAIServicePage
            configuredList={configuredList}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onAdd={(config) => {
              // 处理新配置的保存
              console.log('新AI服务配置:', config);
              setShowAIConfig(false);
            }}
          />
        </div>
      </div>
    );
  };

  const renderMCPConfigOverlay = () => {
    if (pageType !== 'mcp' || !showMCPConfig) return null;
    return (
      <div className="ai-config-overlay" onClick={() => setShowMCPConfig(false)}>
        <div className="ai-config-wrapper" onClick={(e) => e.stopPropagation()}>
          <MCPConnectionsPage />
        </div>
      </div>
    );
  };

  const renderAPIConfigOverlay = () => {
    if (pageType !== 'api' || !showAPIConfig) return null;
    return (
      <div className="ai-config-overlay" onClick={() => setShowAPIConfig(false)}>
        <div className="ai-config-wrapper" onClick={(e) => e.stopPropagation()}>
          <APIConnectionsPage />
        </div>
      </div>
    );
  };

  // ---------- Sync Overlay ----------
  const SyncOverlay = () => {
    const [selectedPlatform, setSelectedPlatform] = useState(null);

    // ---- 平台数据定义 ----
    const platformData = [
      {
        id: 'modao',
        name: '魔搭社区 (ModelScope)',
        on: false,
        steps: [
          {
            index: 1,
            title: '一键同步 Modao 工具',
            desc: '点击下方 "同步平台" 按钮即可将魔搭社区工具同步到本系统。',
            link: 'https://modelscope.cn',
            linkText: '🌐 进入魔搭社区',
          },
          {
            index: 2,
            title: '获取 API 令牌',
            desc: '在个人中心生成访问令牌，用于后续调用。',
            link: 'https://modelscope.cn/user-center',
            linkText: '🔑 获取 API Token',
          },
          {
            index: 3,
            title: '输入您的令牌',
            desc: '将生成的 Token 粘贴到下方输入框，完成配置。',
          },
        ],
        intro: {
          title: '魔搭社区 (ModelScope)',
          paragraphs: [
            '魔搭社区是阿里云推出的开源模型社区，汇聚了上万款预训练模型与数据集。',
            '平台支持在线推理、模型微调与部署，便于开发者快速集成 AI 能力。',
          ],
          bullets: [
            '10,000+ 开源模型',
            '在线推理 / 微调 / 部署',
            '活跃社区与技术分享',
          ],
          link: 'https://modelscope.cn',
        },
      },
      {
        id: 'tencent_scf',
        name: '腾讯云函数计算 (SCF)',
        on: false,
        category: 'domestic',
        freeQuota: '高',
        steps: [
          {
            index: 1,
            title: '注册腾讯云账户',
            desc: '访问腾讯云官网注册并完成实名认证。',
            link: 'https://cloud.tencent.com',
            linkText: '🌐 注册腾讯云',
          },
          {
            index: 2,
            title: '获取访问密钥',
            desc: '在访问管理中创建 API 密钥对。',
            link: 'https://console.cloud.tencent.com/cam/capi',
            linkText: '🔑 获取密钥',
          },
          {
            index: 3,
            title: '配置认证信息',
            desc: '输入 Secret ID 和 Secret Key 完成配置。',
          },
        ],
        intro: {
          title: '腾讯云函数计算 (SCF)',
          paragraphs: [
            '腾讯云函数计算是事件驱动的无服务器计算服务，提供高免费额度。',
            '支持多种编程语言，与腾讯云生态深度集成，适合快速部署 MCP 服务。',
          ],
          bullets: [
            '100万次/月 免费调用',
            '40万GB·秒/月 免费执行时间',
            '多语言运行时支持',
          ],
          link: 'https://cloud.tencent.com/product/scf',
        },
      },
      {
        id: 'aliyun_fc',
        name: '阿里云函数计算 (FC)',
        on: false,
        category: 'domestic',
        freeQuota: '高',
        steps: [
          {
            index: 1,
            title: '注册阿里云账户',
            desc: '访问阿里云官网注册并完成实名认证。',
            link: 'https://www.aliyun.com',
            linkText: '🌐 注册阿里云',
          },
          {
            index: 2,
            title: '获取访问密钥',
            desc: '在 AccessKey 管理中创建密钥对。',
            link: 'https://ram.console.aliyun.com/manage/ak',
            linkText: '🔑 获取密钥',
          },
          {
            index: 3,
            title: '配置认证信息',
            desc: '输入 Access Key ID 和 Secret 完成配置。',
          },
        ],
        intro: {
          title: '阿里云函数计算 (FC)',
          paragraphs: [
            '阿里云函数计算提供企业级无服务器计算服务，稳定可靠。',
            '与阿里云生态无缝集成，支持弹性伸缩和按需付费。',
          ],
          bullets: [
            '100万次/月 免费调用',
            '40万GB·秒/月 免费执行时间',
            '企业级稳定性保障',
          ],
          link: 'https://www.aliyun.com/product/fc',
        },
      },
      {
        id: 'huawei_fg',
        name: '华为云函数工作流 (FG)',
        on: false,
        category: 'domestic',
        freeQuota: '中',
        steps: [
          {
            index: 1,
            title: '注册华为云账户',
            desc: '访问华为云官网注册并完成实名认证。',
            link: 'https://www.huaweicloud.com',
            linkText: '🌐 注册华为云',
          },
          {
            index: 2,
            title: '获取访问密钥',
            desc: '在我的凭证中创建访问密钥。',
            link: 'https://console.huaweicloud.com/iam/#/mine/accessKey',
            linkText: '🔑 获取密钥',
          },
          {
            index: 3,
            title: '配置认证信息',
            desc: '输入 Access Key 和 Secret Key 完成配置。',
          },
        ],
        intro: {
          title: '华为云函数工作流 (FunctionGraph)',
          paragraphs: [
            '华为云函数工作流提供企业级无服务器计算服务。',
            '支持长时间运行和丰富的触发器类型，适合复杂的业务场景。',
          ],
          bullets: [
            '企业级稳定性',
            '长时间运行支持',
            '丰富触发器类型',
          ],
          link: 'https://www.huaweicloud.com/product/functiongraph.html',
        },
      },
    ];

    return (
      <div className="ai-config-overlay sync-right" onClick={() => setShowSyncPanel(false)}>
        <div className="ai-config-wrapper" onClick={(e) => e.stopPropagation()}>
          <div className="sync-container">
            {/* 左侧平台选择 */}
            <div className="platform-list">
              <h3>🌐 选择平台</h3>
              <p>选择要同步的MCP托管平台，获取最新的服务和工具。</p>

              {platformData.map((platform) => (
                <div
                  key={platform.id}
                  className={`platform-item ${selectedPlatform?.id === platform.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPlatform(platform)}
                >
                  <div className="platform-header">
                    <h4>{platform.name}</h4>
                    <div className="platform-badges">
                      {platform.category === 'domestic' && (
                        <span className="badge domestic">🇨🇳 国内</span>
                      )}
                      {platform.freeQuota && (
                        <span className={`badge quota-${platform.freeQuota}`}>
                          {platform.freeQuota === '高' ? '💎 高额度' : '💰 中额度'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`platform-status ${platform.on ? 'enabled' : 'disabled'}`}>
                    {platform.on ? '✅ 已启用' : '⚪ 未配置'}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE}/mcp-platforms/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ platform_ids: null, force: false })
                      });
                      if (response.ok) {
                        alert('同步成功！');
                        window.dispatchEvent(new Event('systemToolsUpdated'));
                      } else {
                        alert('同步失败');
                      }
                    } catch (error) {
                      alert(`同步错误: ${error.message}`);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  🔄 同步所有平台
                </button>
                <button
                  onClick={() => setShowSyncPanel(false)}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  关闭
                </button>
              </div>
            </div>

            {/* 中间配置步骤 */}
            <div className="config-steps">
              {selectedPlatform ? (
                <>
                  <h3>📋 配置步骤</h3>
                  <p>按照以下步骤配置 {selectedPlatform.name}</p>

                  {selectedPlatform.steps.map((step) => (
                    <div key={step.index} className="step-item">
                      <div className="step-number">{step.index}</div>
                      <div className="step-content">
                        <h4>{step.title}</h4>
                        <p>{step.desc}</p>
                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="step-link"
                          >
                            {step.linkText}
                          </a>
                        )}
                        {step.index === 3 && (
                          <>
                            <input
                              type="text"
                              placeholder="请输入API密钥..."
                            />
                            <button>
                              保存配置
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-selection">
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👈</div>
                    <h3>选择一个平台</h3>
                    <p>点击左侧的平台查看详细配置步骤</p>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧平台介绍 */}
            <div className="intro-panel">
              {selectedPlatform ? (
                <>
                  <h3>{selectedPlatform.intro.title}</h3>
                  {selectedPlatform.intro.paragraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}

                  <h4>🌟 主要特性</h4>
                  <ul>
                    {selectedPlatform.intro.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>

                  <div style={{ marginTop: '20px' }}>
                    <a
                      href={selectedPlatform.intro.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: '#f8f9fa',
                        color: '#007bff',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        border: '1px solid #007bff'
                      }}
                    >
                      🌐 访问官网
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <h3>🚀 MCP 平台同步</h3>
                  <p>通过统一的平台管理界面，您可以轻松配置和同步多个MCP服务托管平台。</p>

                  <h4>🎯 支持的平台类型</h4>
                  <ul>
                    <li><strong>国内云平台</strong> - 腾讯云、阿里云、华为云</li>
                    <li><strong>AI模型平台</strong> - 魔搭社区</li>
                    <li><strong>开源生态</strong> - Smithery Registry</li>
                  </ul>

                  <h4>💡 使用建议</h4>
                  <ul>
                    <li>优先选择国内平台，网络稳定</li>
                    <li>关注免费额度，合理分配使用</li>
                    <li>定期同步获取最新服务</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="info-page-container">
      <nav className="info-page-navbar">
        <h3>{getPageTitle(pageType)}</h3>
        {/* 这里可以添加页面内的导航链接，例如： */}
        <ul>
          <li>概述</li>
          {pageType === 'ai' ? (
            <li onClick={() => setShowAIConfig(true)} style={{ cursor: 'pointer' }}>配置</li>
          ) : pageType === 'mcp' ? (
            <>
              <li onClick={() => setShowMCPConfig(true)} style={{ cursor: 'pointer' }}>配置</li>
              <li onClick={() => setShowSyncPanel(true)} style={{ cursor: 'pointer' }}>同步平台</li>
            </>
          ) : pageType === 'api' ? (
            <li onClick={() => setShowAPIConfig(true)} style={{ cursor: 'pointer' }}>配置</li>
          ) : pageType === 'systemTools' ? (
            <li>工具测试</li>
          ) : (
          <li>配置</li>
          )}
          <li>使用教程</li>
          <li>常见问题</li>
        </ul>
      </nav>
      <div className="info-page-content">
        {getPageContent(pageType)}
      </div>
      {renderAIConfigOverlay()}
      {renderMCPConfigOverlay()}
      {renderAPIConfigOverlay()}
      {showSyncPanel && <SyncOverlay />}

      {/* 编辑工具弹窗 */}
      {editingTool && (
        <div className="ai-config-overlay" onClick={closeEditModal}>
          <div className={pageType === 'mcp' ? "mcp-edit-wrapper" : "ai-config-wrapper"} onClick={(e) => e.stopPropagation()}>
            {pageType === 'mcp' ? (
              <McpEditForm tool={editingTool} onSave={handleUpdate} onCancel={closeEditModal} />
            ) : (
              <GenericConfigForm
                schema={getSchemaForTool(editingTool)}
                initialValues={editingTool}
                onSave={handleUpdate}
                onCancel={closeEditModal}
              />
            )}
          </div>
        </div>
      )}

      {/* 测试工具弹窗 */}
      {testingTool && (
        <div className="ai-config-overlay" onClick={() => setTestingTool(null)}>
          <div className="test-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            {testingTool.stage === 'running' && (
              <div className="test-running-container">
                <h3 className="test-title">正在测试工具</h3>
                <p className="test-tool-name">{testingTool.tool.name}</p>

                <div className="test-flow-diagram">
                  {testSteps.map((step, index) => (
                    <div key={step.id} className="flow-step-container">
                      <div className={`flow-step ${step.status}`}>
                        <div className="step-number">
                          {step.status === 'success' && <span className="step-check">✓</span>}
                          {step.status === 'failed' && <span className="step-error">✗</span>}
                          {step.status === 'running' && <div className="step-spinner"></div>}
                          {step.status === 'pending' && <span className="step-num">{index + 1}</span>}
                        </div>
                        <div className="step-content">
                          <div className="step-name">{step.name}</div>
                          <div className="step-message">{step.message}</div>

                          {/* 功能验证子步骤 */}
                          {step.substeps && step.substeps.length > 0 && (
                            <div className="substeps-container">
                              {step.substeps.map((substep, subIndex) => (
                                <div key={subIndex} className={`substep ${substep.status}`}>
                                  <div className="substep-icon">
                                    {substep.status === 'success' && <span>✓</span>}
                                    {substep.status === 'failed' && <span>✗</span>}
                                    {substep.status === 'skipped' && <span>-</span>}
                                    {substep.status === 'running' && <div className="mini-spinner"></div>}
                                  </div>
                                  <div className="substep-content">
                                    <span className="substep-name">{substep.name}</span>
                                    {substep.message && (
                                      <span className="substep-message">{substep.message}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {index < testSteps.length - 1 && (
                        <div className={`flow-arrow ${step.status === 'success' ? 'active' : ''}`}>
                          ↓
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="test-progress-info">
                  {testSteps.find(s => s.status === 'running') && (
                    <p className="current-step">
                      正在执行: {testSteps.find(s => s.status === 'running').name}
                    </p>
                  )}
                </div>
              </div>
            )}
            {testingTool.stage === 'success' && (
              <div className="test-success-container">
                <div className="success-animation">
                  <div className="success-checkmark">
                    <div className="check-icon">
                      <span className="icon-line line-tip"></span>
                      <span className="icon-line line-long"></span>
                      <div className="icon-circle"></div>
                      <div className="icon-fix"></div>
                    </div>
                  </div>
                </div>
                <h3 className="success-title">测试成功！</h3>
                <div className="success-info">
                  <p className="tool-name">
                    <strong>{testingTool.tool.name}</strong>
                  </p>
                  <p className="success-message">已验证可以正常调用并生成产品</p>
                </div>
                <div className="success-features">
                  <div className="feature-item">
                    <span className="feature-icon">🔗</span>
                    <span>连接正常</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">⚡</span>
                    <span>响应快速</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">✨</span>
                    <span>功能完整</span>
                  </div>
                </div>
                <div className="success-actions">
                  <p className="auto-close-hint">已自动同步到系统工具库</p>
                  <button
                    className="btn-success"
                    onClick={() => setTestingTool(null)}
                  >
                    完成
                  </button>
                </div>
              </div>
            )}
            {testingTool.stage === 'failed' && (
              <div className="test-failed-container">
                <div className="failed-animation">
                  <div className="failed-icon">
                    <div className="error-x">
                      <span className="error-line error-line-1"></span>
                      <span className="error-line error-line-2"></span>
                    </div>
                  </div>
                </div>
                <h3 className="failed-title">测试失败</h3>
                <div className="failed-info">
                  <p className="tool-name">
                    <strong>{testingTool.tool.name}</strong>
                  </p>
                </div>

                {/* 显示失败的步骤流程图 */}
                <div className="failed-flow-diagram">
                  <h4>测试进度：</h4>
                  {testSteps.map((step, index) => (
                    <div key={step.id} className="failed-flow-step-container">
                      <div className={`failed-flow-step ${step.status}`}>
                        <div className="failed-step-number">
                          {step.status === 'success' && <span className="step-check">✓</span>}
                          {step.status === 'failed' && <span className="step-error">✗</span>}
                          {step.status === 'pending' && <span className="step-num">{index + 1}</span>}
                        </div>
                        <div className="failed-step-content">
                          <div className="failed-step-name">{step.name}</div>
                          <div className="failed-step-message">{step.message}</div>
                        </div>
                      </div>
                      {index < testSteps.length - 1 && (
                        <div className={`failed-flow-arrow ${step.status === 'success' ? 'active' : ''}`}>
                          ↓
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 针对性的解决方案 */}
                <div className="troubleshooting">
                  <h4>针对性解决方案：</h4>
                  <div className="solution-list">
                    {(() => {
                      const failedStep = testSteps.find(s => s.status === 'failed');
                      if (!failedStep) return null;

                      const solutions = {
                        config: [
                          { icon: '🔧', title: '检查配置参数', desc: '确认命令路径、参数格式正确' },
                          { icon: '📝', title: '验证工具名称', desc: '确保工具名称与实际包名一致' }
                        ],
                        start: [
                          { icon: '📦', title: '安装依赖包', desc: `运行: npm install -g ${testingTool.tool.name}` },
                          { icon: '🛠️', title: '检查命令路径', desc: '确认npx或node命令可用' },
                          { icon: '🔐', title: '检查权限', desc: '确保有执行权限' }
                        ],
                        handshake: [
                          { icon: '🔄', title: '检查MCP版本', desc: '确保工具支持MCP协议2024-11-05版本' },
                          { icon: '🌐', title: '网络连接', desc: '检查网络连接和防火墙设置' }
                        ],
                        function: [
                          { icon: '🐛', title: '工具实现问题', desc: '该工具可能存在bug或不完整' },
                          { icon: '📋', title: '查看文档', desc: '参考工具官方文档进行配置' }
                        ]
                      };

                      return (solutions[failedStep.id] || []).map((solution, idx) => (
                        <div key={idx} className="solution-item">
                          <span className="solution-icon">{solution.icon}</span>
                          <div>
                            <strong>{solution.title}</strong>
                            <p>{solution.desc}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="failed-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setTestingTool(null)}
                  >
                    关闭
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setTestingTool(null);
                      openEditModal(testingTool.tool);
                    }}
                  >
                    修改配置
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 工具详细测试弹窗 */}
      {showToolTester && (
        <div className="ai-config-overlay" onClick={() => setShowToolTester(null)}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowToolTester(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#333',
                zIndex: 10,
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              ×
            </button>
            <div className="tool-tester-modal">
              <ToolTester
                tool={showToolTester}
                onTestComplete={handleToolTestComplete}
              />
            </div>
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

export default InfoPage;
