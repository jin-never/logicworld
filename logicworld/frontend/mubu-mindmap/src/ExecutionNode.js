import React, { useState, useEffect, useRef, memo, useLayoutEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './ExecutionNode.css';
import WordOperationConfig from './components/WordOperationConfig';
// 移除了safeExecute导入，因为它不适用于事件处理函数

// Word操作映射 - 保持不变
const wordActionMap = {
  // 文档管理
  'create_document': '创建文档',
  'open_document': '打开文档',
  'save_document': '保存文档',
  'save_document_as': '另存为',
  'close_document': '关闭文档',
  'copy_document': '复制文档',
  'list_documents': '列出文档',
  
  // 内容创作
  'add_heading': '添加标题',
  'add_paragraph': '添加段落',
  'add_table': '添加表格',
  'add_picture': '插入图片',
  'add_page_break': '分页符',
  
  // 字体格式
  'format_text': '格式化文本',
  'set_font_name': '字体名称',
  'set_font_size': '字体大小',
  'set_font_color': '字体颜色',
  'set_text_bold': '加粗文本',
  'set_text_italic': '斜体文本',
  'set_text_underline': '下划线',
  'create_custom_style': '自定义样式',
  
  // 段落格式
  'set_paragraph_alignment': '段落对齐',
  'set_line_spacing': '行间距',
  'set_paragraph_spacing': '段落间距',
  'set_paragraph_indent': '段落缩进',
  
  // 查找替换
  'find_and_replace': '查找替换',
  'search_and_replace': '高级查找替换',
  'find_text_in_document': '查找文本',
  
  // 高级内容
  'delete_paragraph': '删除段落',
  'get_paragraph_text_from_document': '获取段落文本',
  'insert_header_near_text': '插入标题',
  'insert_line_or_paragraph_near_text': '插入段落',
  'add_footnote_to_document': '添加脚注',
  'add_endnote_to_document': '添加尾注',
  'customize_footnote_style': '脚注样式',
  
  // 表格格式
  'format_table': '表格格式',
  
  // 文档设置
  'set_page_margins': '页边距',
  'set_page_orientation': '页面方向',
  'set_page_size': '页面大小',
  'add_header_footer': '页眉页脚',
  'set_column_layout': '分栏布局',
  'get_page_info': '页面信息',
  
  // 文档保护
  'protect_document': '文档保护',
  'unprotect_document': '移除保护',
  
  // 文档转换
  'convert_to_pdf': '转换PDF',
  
  // 文档信息
  'get_document_text': '提取文本',
  'get_document_info': '文档信息',
  'get_document_outline': '文档大纲',
  'get_document_xml': 'XML结构',
};

// 场景到工具类型的映射
const scenarioToolMap = {
  'Word文档处理': 'Office-Word-MCP-Server',
  'Excel数据处理': 'Excel-MCP-Server',
  'PPT演示制作': 'PowerPoint-MCP-Server',
  '文件操作': 'File-MCP-Server'
};

const ExecutionNode = memo(({ id, data, selected, onNodeDataChange, onNodeSizeChange, showStatusTracking, hideStatusTracking }) => {
  const nodeRef = useRef(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // 🔧 新增：检测节点执行状态并应用对应样式
  const getNodeStatusClass = () => {
    const status = data?.status;
    if (status === 'success' || status === 'completed') return 'status-success';
    if (status === 'error' || status === 'failed') return 'status-error';
    if (status === 'running') return 'status-running';
    return 'status-idle';
  };
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [isHovered, setIsHovered] = useState(false);

  // 🎯 简化后的核心状态 - 只保留必要的状态
  const [nodeData, setNodeData] = useState(() => {
    const toolName = data?.toolName || data?.selectedTool || '';
    const executionDesc = data?.description || data?.inputContent || '';
    
    return {
      label: data?.label || '执行节点',
      nodeType: 'execution-node',
      selectedTool: data?.selectedTool || null,
      toolConfig: data?.toolConfig || {},
      outputContent: data?.outputContent || '',
      timeout: data?.timeout || 30,
      retryCount: data?.retryCount || 3,
      folderPath: data?.folderPath || '',
      wordAction: data?.wordAction || '',
      scenario: data?.scenario || '',
      operation: data?.operation || '',
      precisionOperations: data?.precisionOperations || [
        {
          id: `op_${Date.now()}`,
          requirement: '',
          selectedText: '',
          targetDocument: '',
          status: 'pending'
        }
      ],
      matchContents: data?.matchContents || [''], // 要改的内容数组
      inputContents: data?.inputContents || [''], // 执行内容数组
      ...data,
      aiModel: data?.aiModel || '',
      toolType: data?.toolType || toolName || '',
      inputContent: executionDesc
    };
  });

  const [availableTools, setAvailableTools] = useState([]);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [activeInputField, setActiveInputField] = useState(null);
  const [showToolTypeSelector, setShowToolTypeSelector] = useState(false);

  // 🎯 简化的防抖机制 - 用时间戳避免状态冲突
  const [lastUserAction, setLastUserAction] = useState(0);

  // 🎯 简化的数据同步 - 只在用户没有近期操作时同步父组件数据
  useEffect(() => {
    if (!data) return;
    
    const timeSinceLastAction = Date.now() - lastUserAction;
    
    // 如果用户在300ms内有操作，不要覆盖用户选择
    if (timeSinceLastAction < 300) {
      return;
    }
    
    const hasChanges = 
      data.selectedTool !== nodeData.selectedTool ||
      data.toolType !== nodeData.toolType ||
      data.wordAction !== nodeData.wordAction ||
      data.scenario !== nodeData.scenario ||
      data.operation !== nodeData.operation ||
      data.outputContent !== nodeData.outputContent;
    
    if (hasChanges) {
      setNodeData(prev => ({
        ...prev,
        selectedTool: data.selectedTool || prev.selectedTool,
        toolType: data.toolType || prev.toolType,
        toolConfig: data.toolConfig || prev.toolConfig,
        wordAction: data.wordAction || prev.wordAction,
        scenario: data.scenario || prev.scenario,
        operation: data.operation || prev.operation,
        outputContent: data.outputContent || prev.outputContent
      }));
    }
  }, [data, lastUserAction]);

  // 响应全局重置信号
  useEffect(() => {
    if (data && data.resetSignal) {
      setIsExecuting(false);
      setExecutionProgress(0);
      setExecutionLogs([]);
      setNodeData(prev => ({ ...prev, outputContent: '' }));
      if (onNodeDataChange) {
        onNodeDataChange(id, { ...(data || {}), outputContent: '' });
      }
    }
  }, [data?.resetSignal]);

  // 后端执行结果同步
  useEffect(() => {
    if (!data) return;
    
    const er = data.executionResult;
    if (!er) {
      if (data.outputContent && data.outputContent !== nodeData.outputContent) {
        setNodeData(prev => ({ ...prev, outputContent: data.outputContent }));
        setTimeout(() => {
          if (onNodeDataChange) {
            onNodeDataChange(id, { ...nodeData, outputContent: data.outputContent });
          }
        }, 0);
      }
      return;
    }
    
    let content = '';
    if (typeof er === 'string') {
      content = er;
    } else if (typeof er === 'object' && er !== null) {
      content = JSON.stringify(er, null, 2);
    } else {
      content = String(er);
    }
    
    if (content && content !== nodeData.outputContent) {
      setNodeData(prev => ({ ...prev, outputContent: content }));
      setTimeout(() => {
        if (onNodeDataChange) {
          onNodeDataChange(id, { ...nodeData, outputContent: content });
        }
      }, 0);
    }
  }, [data?.executionResult, data?.outputContent, id, onNodeDataChange]);

  // 🎯 简化的数据更新函数
  const handleDataChange = useCallback((field, value) => {
    setLastUserAction(Date.now()); // 记录用户操作时间
    
    setNodeData(prevNodeData => {
      if (prevNodeData[field] === value) {
        return prevNodeData;
      }
      
      const newData = { ...prevNodeData, [field]: value };
      
      // 当工具类型改变时，自动设置selectedTool对象
      if (field === 'toolType' && value) {
        newData.selectedTool = {
          name: value,
          type: value,
          available: true
        };
      }
      
      // 立即通知父组件状态变化
      if (onNodeDataChange) {
        requestAnimationFrame(() => {
          onNodeDataChange(id, newData);
        });
      }
      
      return newData;
    });
  }, [onNodeDataChange, id]);

  // 🎯 简化的场景选择处理
  const handleScenarioChange = useCallback((e) => {
    try {
      const scenario = e.target.value;
      
      if (scenario === '自定义') {
        setShowToolTypeSelector(true);
        handleDataChange('scenario', scenario);
        handleDataChange('toolType', '');
        handleDataChange('label', '执行节点');
      } else if (scenario) {
        setShowToolTypeSelector(false);
        handleDataChange('scenario', scenario);
        
        const toolType = scenarioToolMap[scenario];
        if (toolType) {
          handleDataChange('toolType', toolType);
        }
        
        handleDataChange('label', '执行节点');
      } else {
        setShowToolTypeSelector(false);
        handleDataChange('scenario', '');
        handleDataChange('toolType', '');
        handleDataChange('label', '执行节点');
      }
    } catch (error) {
      console.error('场景选择处理失败:', error);
    }
  }, [handleDataChange]);

  // 🎯 简化的Word操作选择处理
  const handleWordActionChange = useCallback((e) => {
    try {
      const wordAction = e.target.value;
      handleDataChange('wordAction', wordAction);
      
      // 根据Word操作更新节点标签
      if (wordActionMap[wordAction]) {
        handleDataChange('label', wordActionMap[wordAction]);
      }
    } catch (error) {
      console.error('Word操作选择处理失败:', error);
    }
  }, [handleDataChange]);

  // 监听Word操作变化，自动更新节点名称
  useEffect(() => {
    if (nodeData.wordAction && wordActionMap[nodeData.wordAction]) {
      const newLabel = wordActionMap[nodeData.wordAction];
      handleDataChange('label', newLabel);
    } else if (!nodeData.wordAction && nodeData.toolType === 'Office-Word-MCP-Server') {
      handleDataChange('label', '执行节点');
    }
  }, [nodeData.wordAction, nodeData.toolType, handleDataChange]);

  // 获取可用工具列表
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch('/api/tools/available');
        if (response.ok) {
          const tools = await response.json();
          setAvailableTools(tools);
        }
      } catch (error) {
        console.error('获取工具列表失败:', error);
        // 提供默认工具列表
        setAvailableTools([
          { id: 'word', name: 'Office-Word-MCP-Server', description: 'Word文档处理工具', icon: '📝' },
          { id: 'ai', name: 'AI助手工具', description: '通用AI助手', icon: '🤖' }
        ]);
      }
    };
    
    fetchTools();
  }, []);

  // 布局效果处理
  useLayoutEffect(() => {
    // 暂时禁用尺寸更新以避免ResizeObserver错误
  }, [id, onNodeSizeChange, isConfigOpen]);

  // 配置状态变化通知
  useEffect(() => {
    if (onNodeDataChange && data && data.isConfigOpen !== isConfigOpen) {
      onNodeDataChange(id, { ...data, isConfigOpen });
    }
  }, [isConfigOpen, id, onNodeDataChange, data?.isConfigOpen]);

  // 点击外部关闭工具选择器
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showToolSelector && !event.target.closest('.config-section')) {
        setShowToolSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolSelector]);

  // 工具选择处理
  const handleToolSelect = (tool) => {
    const newData = {
      ...nodeData,
      selectedTool: tool,
      toolType: tool.name,
      toolConfig: tool.config || {}
    };
    setNodeData(newData);
    if (onNodeDataChange) {
      onNodeDataChange(id, newData);
    }
    setShowToolSelector(false);
  };

  // 打开工具库
  const openToolLibraryForField = (fieldName) => {
    setActiveInputField(fieldName);
    
    // 尝试找到并点击工具库按钮
    const toolLibraryButton = document.querySelector('button[title="工具库"]') ||
                             document.querySelector('[data-testid="tool-library"]') ||
                             document.querySelector('.tool-library-trigger');

    if (toolLibraryButton) {
      toolLibraryButton.click();

      setTimeout(() => {
        const event = new CustomEvent('openToolLibrary', {
          detail: {
            targetNodeId: id,
            targetField: fieldName,
            currentValue: fieldName === 'aiModel' ? nodeData.aiModel : nodeData.toolType
          }
        });

        window.dispatchEvent(event);
      }, 200);
    } else {
      alert('请点击右侧工具库按钮选择工具');
    }
  };

  // 执行任务
  const executeTask = async () => {
    if (!nodeData.inputContent.trim()) {
      alert('请输入执行内容');
      return;
    }

    setIsExecuting(true);
    setExecutionProgress(0);
    setExecutionLogs([]);
    handleDataChange('outputContent', '');

    const addLog = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      setExecutionLogs(prev => [...prev, { timestamp, message, type }]);
    };

    try {
      addLog('开始执行任务...', 'info');
      setExecutionProgress(10);

      // 如果选择了工具，使用工具执行
      if (nodeData.selectedTool) {
        addLog(`使用工具: ${nodeData.selectedTool.name}`, 'info');
        setExecutionProgress(30);

        try {
          const response = await fetch('/api/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tool: nodeData.selectedTool,
              input: nodeData.inputContent,
              config: nodeData.toolConfig
            })
          });

          setExecutionProgress(70);
          const result = await response.json();
          setExecutionProgress(90);

          if (result.success) {
            handleDataChange('outputContent', result.output);
            addLog('工具执行成功完成！', 'success');
            setExecutionProgress(100);
          } else {
            throw new Error(result.error || '工具执行失败');
          }
        } catch (error) {
          addLog(`工具执行失败: ${error.message}`, 'error');
          handleDataChange('outputContent', `工具执行失败: ${error.message}`);
          throw error;
        }
      } else {
        // 模拟执行步骤
        const steps = [
          { message: '初始化执行环境...', progress: 20 },
          { message: '解析输入内容...', progress: 30 },
          { message: '加载AI模型...', progress: 50 },
          { message: '处理数据...', progress: 70 },
          { message: '生成输出结果...', progress: 90 },
          { message: '执行完成！', progress: 100 }
        ];

        for (const step of steps) {
          await new Promise(resolve => setTimeout(resolve, 800));
          addLog(step.message, 'success');
          setExecutionProgress(step.progress);
        }

        const result = `执行完成！\n\n输入内容: ${nodeData.inputContent}\n\n执行结果:\n- 处理时间: ${new Date().toLocaleString()}\n- AI模型: ${nodeData.aiModel || '默认模型'}\n- 工具类型: ${nodeData.toolType || '通用工具'}\n- 状态: 成功\n\n输出内容: 这是基于输入内容生成的智能执行结果。`;

        handleDataChange('outputContent', result);
        addLog('任务执行成功完成！', 'success');
      }

    } catch (error) {
      addLog(`执行失败: ${error.message}`, 'error');
      handleDataChange('outputContent', `执行失败: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // 停止执行
  const stopExecution = () => {
    setIsExecuting(false);
    setExecutionProgress(0);
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLogs(prev => [...prev, { timestamp, message: '执行已被用户停止', type: 'warning' }]);
  };

  // 获取节点状态
  const getNodeStatus = () => {
    const executionResult = data?.executionResult;
    if (executionResult) {
      if (typeof executionResult === 'object') {
        if (executionResult.success === false || executionResult.status === 'error') {
          return '执行失败';
        } else if (executionResult.success === true || executionResult.status === 'success') {
          return '执行成功';
        } else if (executionResult.error || executionResult.status === 'failed') {
          return '执行失败';
        }
      }
      if (executionResult && nodeData.outputContent) {
        return '执行成功';
      }
    }

    if (isExecuting) {
      return '执行中';
    }

    const hasAiModel = nodeData.aiModel && nodeData.aiModel.trim() !== '';
    const hasToolType = nodeData.toolType && nodeData.toolType.trim() !== '';
    const hasInputContent = nodeData.inputContent && nodeData.inputContent.trim() !== '';

    if (hasAiModel && hasToolType && hasInputContent) {
      return '就绪';
    }
    return '待配置';
  };

  // 获取状态样式类名
  const getStatusClassName = () => {
    const status = getNodeStatus();
    if (status === '执行成功') return 'success';
    if (status === '执行失败') return 'error';
    if (status === '执行中') return 'running';
    if (status === '就绪') return 'ready';
    return 'pending';
  };

  // 精确操作相关函数
  const isWordPrecisionOperation = () => {
    return nodeData.toolType === 'Office-Word-MCP-Server' && 
           (nodeData.wordAction === 'set_font_name' || 
            nodeData.wordAction === 'set_font_size' ||
            nodeData.wordAction === 'set_font_color' ||
            nodeData.wordAction === 'find_replace' ||
            nodeData.wordAction?.includes('查找') ||
            nodeData.wordAction?.includes('替换'));
  };

  const handleRequirementChange = (operationId, requirement) => {
    const updatedOperations = nodeData.precisionOperations.map(op =>
      op.id === operationId ? { ...op, requirement } : op
    );
    handleDataChange('precisionOperations', updatedOperations);
  };

  const handleAddPrecisionOperation = () => {
    const newOperation = {
      id: `op_${Date.now()}`,
      requirement: '',
      selectedText: '',
      targetDocument: '',
      status: 'pending'
    };
    const updatedOperations = [...nodeData.precisionOperations, newOperation];
    handleDataChange('precisionOperations', updatedOperations);
  };

  const handleDeletePrecisionOperation = (operationId) => {
    const updatedOperations = nodeData.precisionOperations.filter(op => op.id !== operationId);
    handleDataChange('precisionOperations', updatedOperations);
  };

  // 其他处理函数
  const handleConfigToggle = () => {
    setIsConfigOpen(!isConfigOpen);
  };

  const handleNodeClick = () => {
    setClickCount(prev => prev + 1);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount + 1 >= 2) {
        setIsConfigOpen(!isConfigOpen);
      }
      setClickCount(0);
    }, 300);
  };

  const handleOpenStatusTracking = () => {
    if (showStatusTracking) {
      showStatusTracking({
        node: {
          id: id,
          label: nodeData.label || '执行节点',
          data: nodeData
        }
      });
    }
  };

  const handleTextSelection = (filename, selectedText) => {
    const currentInput = nodeData.inputContent || '';
    const updatedInput = currentInput 
      ? `${currentInput}\n文件：${filename}\n目标文本：${selectedText}`
      : `文件：${filename}\n目标文本：${selectedText}`;

    handleDataChange('inputContent', updatedInput.trim());
    if (hideStatusTracking) {
      hideStatusTracking();
    }
  };

  const handleOpenPrecisionTracking = (operationId, operationIndex) => {
    if (showStatusTracking) {
      showStatusTracking({
        node: {
          id: id,
          label: nodeData.label,
          data: nodeData
        },
        operationId: operationId,
        operationIndex: operationIndex,
        operationType: nodeData.wordAction, // 传递当前选择的操作类型
        filename: '成功了.docx'
      });
    }
  };

  // 处理输入框聚焦事件，动态更新状态跟踪内容
  const handleInputFocus = (operationId, operationIndex, operationContent) => {
    if (showStatusTracking) {
      showStatusTracking({
        node: {
          id: id,
          label: nodeData.label,
          data: nodeData
        },
        operationId: operationId,
        operationIndex: operationIndex,
        operationType: nodeData.wordAction, // 传递当前选择的操作类型
        // 注意：不传递filename，避免触发文档重新加载
        // 这样可以保持当前已加载的文档内容，只更新操作上下文
        operationContent: operationContent // 传递当前输入框的内容
      });
    }
  };

  const clearContent = () => {
    handleDataChange('inputContent', '');
    handleDataChange('outputContent', '');
  };

  // Early return if no data
  if (!data) {
    return null;
  }

  const nodeClasses = [
    'custom-node',
    'enhanced-node',
    'execution-node',
    data.nodeType || '',
    selected ? 'selected' : '',
    isConfigOpen ? 'config-open' : '',
    isExecuting ? 'executing' : '',
    isHovered ? 'hovered' : '',
    getNodeStatusClass() // 🔧 新增：执行状态样式
  ].join(' ').trim();

  return (
    <div
      className={nodeClasses}
      onClick={handleNodeClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={nodeRef}
      style={{
        '--execution-progress': `${executionProgress}%`
      }}
    >
      {/* 连接点 */}
      <Handle type="source" position={Position.Top} id="top-source" isConnectable={true} className="connection-handle connection-handle-top" />
      <Handle type="target" position={Position.Top} id="top-target" isConnectable={true} className="connection-handle connection-handle-top" />
      <Handle type="source" position={Position.Left} id="left-source" isConnectable={true} className="connection-handle connection-handle-left" />
      <Handle type="target" position={Position.Left} id="left-target" isConnectable={true} className="connection-handle connection-handle-left" />
      <Handle type="source" position={Position.Right} id="right-source" isConnectable={true} className="connection-handle connection-handle-right" />
      <Handle type="target" position={Position.Right} id="right-target" isConnectable={true} className="connection-handle connection-handle-right" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectable={true} className="connection-handle connection-handle-bottom" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" isConnectable={true} className="connection-handle connection-handle-bottom" />

      {!isConfigOpen ? (
        // 简化视图
        <div className="node-content">
          {/* 执行进度条 */}
          {isExecuting && (
            <div className="execution-progress-bar">
              <div 
                className="execution-progress-fill" 
                style={{ width: `${executionProgress}%` }}
              ></div>
            </div>
          )}

          {/* 节点头部 */}
          <div className="node-header">
            <div className="node-info">
              <span className="node-title" title={`当前标签: ${nodeData.label || '执行节点'}`}>
                {nodeData.label || '执行节点'}
              </span>
              <span className={`node-status ${getStatusClassName()}`}>
                {isExecuting ? `执行中 ${executionProgress}%` : getNodeStatus()}
              </span>
            </div>
          </div>

          {/* 快速信息显示 */}
          <div className="node-quick-info">
            {nodeData.aiModel && (
              <div className="info-item">
                <span className="info-label">AI:</span>
                <span className="info-value">{nodeData.aiModel}</span>
              </div>
            )}
            {nodeData.toolType && (
              <div className="info-item">
                <span className="info-label">工具:</span>
                <span className="info-value">{nodeData.toolType}</span>
              </div>
            )}
            {!nodeData.aiModel && !nodeData.toolType && (
              <div className="config-prompt">
                <span className="prompt-text">请配置AI与工具</span>
              </div>
            )}
          </div>

          {/* 快速操作按钮 */}
          <div className="node-quick-actions">
            {!isExecuting ? (
              <button
                className="quick-action-btn execute-quick-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (nodeData.inputContent.trim()) {
                    executeTask();
                  } else {
                    setIsConfigOpen(true);
                  }
                }}
                title={nodeData.inputContent.trim() ? "快速执行" : "配置后执行"}
              >
                {nodeData.inputContent.trim() ? '▶️' : '🤖'}
              </button>
            ) : (
              <button
                className="quick-action-btn stop-quick-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  stopExecution();
                }}
                title="停止执行"
              >
                ⏹️
              </button>
            )}
            <button
              className="quick-action-btn config-quick-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsConfigOpen(true);
              }}
              title="打开配置"
            >
              🔧
            </button>
          </div>
        </div>
      ) : (
        // 配置界面
        <div className="execution-config">
          <div className="config-header">
            <h3>⚡ 执行节点配置</h3>
            <button className="close-btn" onClick={(e) => { e.stopPropagation(); handleConfigToggle(); }}>×</button>
          </div>

          <div className="config-content" style={{paddingBottom: '20px'}}>
            {/* Word操作配置组件 */}
            <WordOperationConfig
              nodeData={nodeData}
              onDataChange={handleDataChange}
              onOpenStatusTracking={handleOpenStatusTracking}
              openToolLibraryForField={openToolLibraryForField}
              activeInputField={activeInputField}
              availableTools={availableTools}
              showToolSelector={showToolSelector}
              onToolSelect={handleToolSelect}
              showToolTypeSelector={showToolTypeSelector}
            />











            {/* 输出 */}
            <div className="config-section">
              <label>📤 输出</label>
              <textarea
                placeholder="执行结果将显示在这里..."
                value={nodeData.outputContent}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                readOnly
                style={{minHeight: '60px', resize: 'vertical', background: '#f9fafb'}}
              />
            </div>

            {/* 基本设置 */}
            <div className="config-section">
              <label>⚙️ 基本设置</label>
              <div className="settings-grid">
                <div>
                  <label>超时 (秒)</label>
                  <input
                    type="number"
                    value={nodeData.timeout}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleDataChange('timeout', parseInt(e.target.value));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    min="1"
                    max="300"
                  />
                </div>
                <div>
                  <label>重试次数</label>
                  <input
                    type="number"
                    value={nodeData.retryCount}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleDataChange('retryCount', parseInt(e.target.value));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    min="0"
                    max="10"
                  />
                </div>
              </div>

              {/* 执行日志区域 */}
              {executionLogs.length > 0 && (
                <div className="config-section">
                  <label>📋 执行日志</label>
                  <div className="execution-logs">
                    {executionLogs.map((log, index) => (
                      <div key={index} className={`log-entry log-${log.type}`}>
                        <span className="log-timestamp">{log.timestamp}</span>
                        <span className="log-message">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 控制按钮 */}
              <div className="controls-container">
                <div className="controls-row">
                  {/* 移除了存放地址部分 */}
                </div>

                {/* 执行进度显示 */}
                {isExecuting && (
                  <div className="execution-progress-section">
                    <div className="progress-info">
                      <span>执行进度: {executionProgress}%</span>
                      <span>状态: 执行中...</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${executionProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ExecutionNode; 