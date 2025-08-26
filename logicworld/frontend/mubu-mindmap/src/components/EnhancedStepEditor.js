import React, { useState, useEffect } from 'react';
import ToolCategorySelector from './ToolCategorySelector';
import './EnhancedStepEditor.css';

// 🎯 极简风格的AI步骤编辑器
const EnhancedStepEditor = ({ 
  steps, 
  onStepsChange, 
  isGenerating = false,
  showEditControls = true 
}) => {
  const [editingSteps, setEditingSteps] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [availableTools, setAvailableTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);

  // 🔄 同步步骤数据
  useEffect(() => {
    if (steps && steps.length > 0) {
      const formattedSteps = steps.map((step, index) => ({
        id: step.id || `step_${index + 1}`,
        title: step.title || `步骤 ${index + 1}`,
        description: step.description || '',
        aiExecutionDescription: step.aiExecutionDescription || step.executionDescription || generateSimpleAIDescription(step),
        tool: step.recommendedTool || step.tool || '',
        nodeType: step.nodeType || detectSimpleNodeType(step, index, steps.length),
        status: 'ready'
      }));
      
      setEditingSteps(formattedSteps);
    }
  }, [steps]);

  // 🔧 初始化时同步工具库
  useEffect(() => {
    syncToolsFromLibrary();
  }, []);

  // 🎨 获取工具分组标签
  const getToolGroupLabel = (category) => {
    const groupMap = {
      'AI助手': 'AI工具',
      'Office工具': 'Office',
      '文件工具': '文件',
      '数据工具': '数据',
      '网络工具': '网络',
      '数据库': 'DB',
      '文本工具': '文本',
      '开发工具': '开发',
      '系统工具': '系统'
    };
    return groupMap[category] || '其他';
  };

  // 🎨 获取工具分组颜色
  const getToolGroupColor = (category) => {
    const colorMap = {
      'AI助手': '#3b82f6',     // 蓝色
      'Office工具': '#10b981',  // 绿色
      '文件工具': '#f59e0b',    // 橙色
      '数据工具': '#8b5cf6',    // 紫色
      '网络工具': '#06b6d4',    // 青色
      '数据库': '#ef4444',      // 红色
      '文本工具': '#84cc16',    // 青绿色
      '开发工具': '#6366f1',    // 靛蓝色
      '系统工具': '#64748b'     // 灰色
    };
    return colorMap[category] || '#6b7280';
  };

  // 🔧 从工具库同步所有工具
  const syncToolsFromLibrary = async () => {
    setLoadingTools(true);
    console.log('🔧 开始从工具库加载所有工具...');
    
    try {
      // 第一步：尝试从工具库主接口获取
      try {
        const libraryResponse = await fetch('http://localhost:8000/api/tools/library');
        if (libraryResponse.ok) {
          const libraryData = await libraryResponse.json();
          if (libraryData.tools && libraryData.tools.length > 0) {
            console.log(`🔧 从工具库主接口获取到 ${libraryData.tools.length} 个工具`);
            const formattedTools = libraryData.tools.map(tool => ({
              id: tool.id,
              name: tool.name,
              category: tool.category || '通用工具',
              description: tool.description || '',
              sourceType: tool.source || tool.tool_type || 'system',
              groupLabel: getToolGroupLabel(tool.category),
              groupColor: getToolGroupColor(tool.category),
              icon: tool.icon || '🛠️',
              enabled: tool.enabled !== false,
              tested: tool.tested || false,
              approved: tool.approved || false
            }));
            setAvailableTools(formattedTools);
            console.log(`🔧 工具库主接口同步成功:`, formattedTools);
            return;
          }
        }
      } catch (error) {
        console.warn('🔧 工具库主接口访问失败:', error.message);
      }

      // 第二步：尝试从各个工具源获取
      const toolSources = ['system', 'ai', 'mcp', 'api', 'user'];
      const allToolsFromAPI = [];
      
      for (const source of toolSources) {
        try {
          const response = await fetch(`http://localhost:8000/api/tools/${source}`);
          if (response.ok) {
            const tools = await response.json();
            console.log(`🔧 ${source}工具加载成功: ${tools.length}个`);
            allToolsFromAPI.push(...tools.map(tool => ({ ...tool, sourceType: source })));
          } else {
            console.warn(`⚠️ ${source}工具加载失败`);
          }
        } catch (error) {
          console.warn(`⚠️ ${source}工具加载异常:`, error.message);
        }
      }
      
      // 如果API返回了工具，使用API数据
      if (allToolsFromAPI.length > 0) {
        console.log(`🔧 从分类API获取到 ${allToolsFromAPI.length} 个工具`);
        const formattedTools = allToolsFromAPI.map(tool => ({
          id: tool.id,
          name: tool.name,
          category: tool.category || '通用工具',
          description: tool.description || '',
          sourceType: tool.sourceType || 'api',
          groupLabel: getToolGroupLabel(tool.category),
          groupColor: getToolGroupColor(tool.category),
          icon: tool.icon || '🛠️',
          enabled: tool.available !== false
        }));
        setAvailableTools(formattedTools);
        console.log(`🔧 分类API同步成功:`, formattedTools);
        return;
      }
      
      // 第三步：API无数据时显示空工具列表
      console.log('🔧 API无数据，工具列表为空');
      setAvailableTools([]);
      
    } catch (error) {
      console.error('🚨 工具库同步失败:', error);
      // 不使用任何备选工具，显示空列表
      setAvailableTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  // 🔄 监听工具库更新事件
  useEffect(() => {
    const handleToolLibraryUpdate = () => {
      console.log('🔄 检测到工具库更新，重新加载工具...');
      syncToolsFromLibrary();
    };

    // 监听工具库更新事件
    window.addEventListener('toolLibraryUpdated', handleToolLibraryUpdate);
    window.addEventListener('toolsConfigUpdated', handleToolLibraryUpdate);

    return () => {
      window.removeEventListener('toolLibraryUpdated', handleToolLibraryUpdate);
      window.removeEventListener('toolsConfigUpdated', handleToolLibraryUpdate);
    };
  }, []);

  // 🧠 生成简单的AI执行描述
  const generateSimpleAIDescription = (step) => {
    const title = step.title || '';
    
    if (title.includes('创建') || title.includes('生成')) {
      return 'AI创建内容 → 格式化输出';
    }
    if (title.includes('分析')) {
      return 'AI分析需求 → 输出结果';
    }
    if (title.includes('执行')) {
      return 'AI执行任务 → 处理数据';
    }
    if (title.includes('输出')) {
      return 'AI整合结果 → 最终输出';
    }
    
    return 'AI智能处理 → 生成结果';
  };

  // 🔧 简单的节点类型检测
  const detectSimpleNodeType = (step, index, totalSteps) => {
    if (index === 0) return 'material-node';
    if (index === totalSteps - 1) return 'result-node';
    if (step.title && (step.title.includes('条件') || step.title.includes('判断'))) {
      return 'condition-node';
    }
    return 'execution-node';
  };

  // ✏️ 开始编辑
  const startEdit = (stepId) => {
    setEditingId(stepId);
  };

  // 💾 保存编辑
  const saveEdit = () => {
    setEditingId(null);
    if (onStepsChange) {
      onStepsChange(editingSteps);
    }
  };

  // 🔄 更新步骤字段
  const updateStep = (stepId, field, value) => {
    setEditingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ));
  };

  // 🎨 获取节点图标
  const getNodeIcon = (nodeType) => {
    const icons = {
      'material-node': '📁',
      'execution-node': '⚡', 
      'result-node': '📊',
      'condition-node': '🔀'
    };
    return icons[nodeType] || '⚡';
  };

  // 📝 获取节点类型名称
  const getNodeTypeName = (nodeType) => {
    const names = {
      'material-node': '材料节点',
      'execution-node': '执行节点',
      'result-node': '结果节点',
      'condition-node': '条件节点'
    };
    return names[nodeType] || '执行节点';
  };

  // 📋 渲染步骤卡片 - 极简版
  const renderStepCard = (step) => {
    const isEditing = editingId === step.id;
    
    return (
      <div key={step.id} className="simple-step-card">
        <div className="step-header-simple">
          <div className="step-info">
            <span className="step-num">{step.id}</span>
            <span className="step-icon">{getNodeIcon(step.nodeType)}</span>
          </div>
          {!isEditing ? (
            <button className="edit-btn-simple" onClick={() => startEdit(step.id)}>
              编辑
            </button>
          ) : (
            <button className="save-btn-simple" onClick={saveEdit}>
              保存
            </button>
          )}
        </div>
        
        <div className="step-content-simple">
          {/* 步骤标题 */}
          {isEditing ? (
            <input
              className="title-input-simple"
              value={step.title}
              onChange={(e) => updateStep(step.id, 'title', e.target.value)}
              placeholder="步骤标题"
            />
          ) : (
            <h4 className="step-title-simple">{step.title}</h4>
          )}
          
          {/* AI执行描述 */}
          <div className="ai-desc-simple">
            <span className="ai-label">🤖</span>
            {isEditing ? (
              <input
                className="ai-input-simple"
                value={step.aiExecutionDescription}
                onChange={(e) => updateStep(step.id, 'aiExecutionDescription', e.target.value)}
                placeholder="AI执行描述"
              />
            ) : (
              <span className="ai-text">{step.aiExecutionDescription}</span>
            )}
          </div>
          
          {/* 推荐工具 - 从工具库同步 */}
          <div className="tool-simple">
            <span className="tool-label">🔧</span>
            {isEditing ? (
              <select
                className="tool-select-simple"
                value={step.tool}
                onChange={(e) => updateStep(step.id, 'tool', e.target.value)}
                disabled={loadingTools}
              >
                {loadingTools ? (
                  <option value="">正在加载工具库...</option>
                ) : availableTools.length === 0 ? (
                  <option value="">暂无可用工具</option>
                ) : (
                  availableTools.map(tool => (
                    <option key={tool.id} value={tool.name} title={tool.description}>
                      {tool.name} {tool.category ? `(${tool.category})` : ''}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <span className="tool-text">{step.tool}</span>
            )}
          </div>

          {/* 节点类型 */}
          <div className="node-type-simple">
            <span className="node-label">🎯</span>
            {isEditing ? (
              <select
                className="node-select-simple"
                value={step.nodeType}
                onChange={(e) => updateStep(step.id, 'nodeType', e.target.value)}
              >
                <option value="material-node">📁 材料节点</option>
                <option value="execution-node">⚡ 执行节点</option>
                <option value="condition-node">🔀 条件节点</option>
                <option value="result-node">📊 结果节点</option>
              </select>
            ) : (
              <span className="node-text">{getNodeTypeName(step.nodeType)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="simple-step-editor">
      {/* 简洁的头部 */}
      <div className="editor-header-simple">
        <h3>🎯 步骤编辑器</h3>
        <div className="header-status">
          <span className="step-count">{editingSteps.length} 个步骤</span>
          {loadingTools && <span className="loading-indicator">🔄 同步工具库...</span>}
          {!loadingTools && availableTools.length > 0 && (
            <span className="tools-count">{availableTools.length} 个工具可用</span>
          )}
        </div>
      </div>

      {/* 生成中状态 */}
      {isGenerating && (
        <div className="generating-simple">
          <div className="dots">
            <span></span><span></span><span></span>
          </div>
          <span>AI正在生成步骤...</span>
        </div>
      )}

      {/* 步骤列表 */}
      {editingSteps.length > 0 ? (
        <div className="steps-list-simple">
          {editingSteps.map(renderStepCard)}
        </div>
      ) : !isGenerating ? (
        <div className="empty-simple">
          <span className="empty-icon">📋</span>
          <span>等待生成步骤</span>
        </div>
      ) : null}

      {/* 底部操作 */}
      {editingSteps.length > 0 && !isGenerating && (
        <div className="actions-simple">
          <button className="action-btn secondary">🔄 重新生成</button>
          <button className="action-btn primary">🚀 生成工作流</button>
        </div>
      )}
    </div>
  );
};

export default EnhancedStepEditor; 