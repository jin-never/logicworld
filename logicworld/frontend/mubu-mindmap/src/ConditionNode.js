import React, { useState, useRef, memo, useLayoutEffect, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

const ConditionNode = memo(({ id, data, selected, onNodeDataChange, onNodeSizeChange }) => {
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
  const [isHovered, setIsHovered] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [nodeData, setNodeData] = useState({
    conditionType: data?.conditionType || '',
    conditionTypes: data?.conditionTypes || [],
    // 每个条件类型的独立配置
    conditionConfigs: data?.conditionConfigs || {},
    leftOperand: data?.leftOperand || '',
    operator: data?.operator || '',
    rightOperand: data?.rightOperand || '',
    trueOutput: data?.trueOutput || '',
    falseOutput: data?.falseOutput || '',
    formatType: data?.formatType || '',
    result: data?.result || null,
    ...data
  });

  useLayoutEffect(() => {
    if (nodeRef.current && onNodeSizeChange) {
      const width = Math.round(nodeRef.current.getBoundingClientRect().width);
      const height = Math.round(nodeRef.current.getBoundingClientRect().height);
      const currentSize = data?.size;
      if (!currentSize || currentSize.width !== width || currentSize.height !== height) {
        onNodeSizeChange(id, { width, height });
      }
    }
  }, [id, onNodeSizeChange, isConfigOpen]);

  // Notify parent when config state changes
  useEffect(() => {
    if (onNodeDataChange && data && data.isConfigOpen !== isConfigOpen) {
      onNodeDataChange(id, { ...data, isConfigOpen });
    }
  }, [isConfigOpen, id, onNodeDataChange, data?.isConfigOpen]);

  // Sync external data changes to local state
  useEffect(() => {
    if (data) {
      setNodeData(prevData => ({
        ...prevData,
        conditionType: data.conditionType || '',
        conditionTypes: data.conditionTypes || [],
        conditionConfigs: data.conditionConfigs || {},
        leftOperand: data.leftOperand || '',
        operator: data.operator || '',
        rightOperand: data.rightOperand || '',
        trueOutput: data.trueOutput || '',
        falseOutput: data.falseOutput || '',
        formatType: data.formatType || '',
        result: data.result || null,
        ...data
      }));
    }
  }, [data]);

  // 自动更新分支输出建议（当条件配置发生变化时）
  useEffect(() => {
    const suggestions = generateBranchSuggestions();

    // 只有在分支输出为空或者是之前的建议内容时才自动更新
    const shouldUpdateTrue = !nodeData.trueOutput ||
      nodeData.trueOutput.startsWith('✅ 满足') ||
      nodeData.trueOutput === '条件满足时的输出内容...';

    const shouldUpdateFalse = !nodeData.falseOutput ||
      nodeData.falseOutput.startsWith('❌ 不满足') ||
      nodeData.falseOutput === '条件不满足时的输出内容...';

    if (shouldUpdateTrue || shouldUpdateFalse) {
      const newData = { ...nodeData };

      if (shouldUpdateTrue) {
        newData.trueOutput = suggestions.trueSuggestion;
      }

      if (shouldUpdateFalse) {
        newData.falseOutput = suggestions.falseSuggestion;
      }

      setNodeData(newData);

      // 通知父组件
      if (onNodeDataChange) {
        onNodeDataChange(id, newData);
      }

      console.log('🔄 分支输出已自动更新:', {
        updateTrue: shouldUpdateTrue,
        updateFalse: shouldUpdateFalse,
        trueSuggestion: suggestions.trueSuggestion,
        falseSuggestion: suggestions.falseSuggestion
      });
    }
  }, [nodeData.conditionTypes, nodeData.conditionConfigs]); // 监听条件类型和配置的变化

  if (!data) {
    return null;
  }

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
        // 双击 - 展开配置
        setIsConfigOpen(!isConfigOpen);
      }
      // 重置点击计数
      setClickCount(0);
    }, 300); // 300ms内的点击算作双击
  };

  const handleDataChange = (field, value) => {
    const newData = { ...nodeData, [field]: value };
    setNodeData(newData);
    if (onNodeDataChange) {
      onNodeDataChange(id, newData);
    }
  };

  // 操作符配置
  const operators = {
    text: [
      { value: 'contains', label: '包含' },
      { value: 'equals', label: '等于' },
      { value: 'notEquals', label: '不等于' },
      { value: 'startsWith', label: '开始于' },
      { value: 'endsWith', label: '结束于' }
    ],
    number: [
      { value: 'equals', label: '等于' },
      { value: 'notEquals', label: '不等于' },
      { value: 'greater', label: '大于' },
      { value: 'less', label: '小于' },
      { value: 'greaterEqual', label: '大于等于' },
      { value: 'lessEqual', label: '小于等于' }
    ],
    existence: [
      { value: 'exists', label: '存在' },
      { value: 'notExists', label: '不存在' },
      { value: 'isEmpty', label: '为空' },
      { value: 'isNotEmpty', label: '不为空' }
    ],
    fileFormat: [
      { value: 'isType', label: '是该类型' },
      { value: 'isNotType', label: '不是该类型' }
    ]
  };

  // 文件格式配置
  const fileFormats = {
    document: ['.doc', '.docx', '.pdf', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'],
    audio: ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'],
    video: ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'],
    archive: ['.zip', '.rar', '.7z', '.tar', '.gz']
  };

  const handleConditionTypeChange = (value) => {
    console.log('🎯 条件类型变化:', { value, currentTypes: nodeData.conditionTypes });

    const currentTypes = nodeData.conditionTypes || [];
    const currentConfigs = nodeData.conditionConfigs || {};
    let newTypes;
    let newConfigs = { ...currentConfigs };

    if (currentTypes.includes(value)) {
      // 如果已选中，则取消选择
      newTypes = currentTypes.filter(type => type !== value);
      // 删除该类型的配置
      delete newConfigs[value];
      console.log('❌ 取消选择:', value, '新类型:', newTypes);
    } else {
      // 如果未选中，则添加选择
      newTypes = [...currentTypes, value];
      // 为新类型创建默认配置
      newConfigs[value] = {
        leftOperand: '',
        operator: '',
        rightOperand: '',
        formatType: value === 'fileFormat' ? '' : undefined
      };
      console.log('✅ 添加选择:', value, '新类型:', newTypes);
    }

    // 立即更新本地状态
    const newData = {
      ...nodeData,
      conditionTypes: newTypes,
      conditionConfigs: newConfigs,
      conditionType: newTypes[0] || '',
      operator: '' // 清空操作符
    };

    setNodeData(newData);

    // 通知父组件
    if (onNodeDataChange) {
      onNodeDataChange(id, newData);
    }

    console.log('📝 状态更新完成:', { conditionTypes: newTypes, conditionConfigs: newConfigs });
  };

  // 处理特定条件类型的配置更新
  const handleConditionConfigChange = (conditionType, field, value) => {
    console.log('🔧 更新条件配置:', { conditionType, field, value });

    const currentConfigs = nodeData.conditionConfigs || {};
    const newConfigs = {
      ...currentConfigs,
      [conditionType]: {
        ...currentConfigs[conditionType],
        [field]: value
      }
    };

    const newData = {
      ...nodeData,
      conditionConfigs: newConfigs
    };

    setNodeData(newData);

    // 通知父组件
    if (onNodeDataChange) {
      onNodeDataChange(id, newData);
    }

    console.log('📝 条件配置更新完成:', { conditionType, newConfig: newConfigs[conditionType] });
  };

  // 生成智能分支输出建议
  const generateBranchSuggestions = () => {
    const selectedTypes = nodeData.conditionTypes || [];
    const configs = nodeData.conditionConfigs || {};

    if (selectedTypes.length === 0) {
      return {
        trueSuggestion: "条件满足时的输出内容...",
        falseSuggestion: "条件不满足时的输出内容..."
      };
    }

    // 收集所有配置的条件描述
    const conditionDescriptions = selectedTypes.map((type, index) => {
      const config = configs[type] || {};
      const { leftOperand, operator, rightOperand, formatType } = config;

      const typeMap = {
        text: '📝',
        number: '🔢',
        existence: '❓',
        fileFormat: '📁'
      };

      const operatorMap = {
        // 文本操作符
        contains: '包含',
        equals: '等于',
        notEquals: '不等于',
        startsWith: '开始于',
        endsWith: '结束于',
        // 数值操作符
        gt: '大于',
        lt: '小于',
        gte: '大于等于',
        lte: '小于等于',
        // 存在性操作符
        exists: '存在',
        notExists: '不存在',
        isEmpty: '为空',
        isNotEmpty: '不为空',
        // 文件格式操作符
        isType: '是该类型',
        isNotType: '不是该类型'
      };

      // 如果条件还没有完全配置，显示占位符
      if (!leftOperand && !operator) {
        return `${typeMap[type]} [条件${index + 1}待配置]`;
      }

      const operatorText = operatorMap[operator] || operator || '[操作符待选择]';
      const leftText = leftOperand || '[左操作数待填写]';
      let rightText = rightOperand || '[右操作数待填写]';

      // 对于文件格式判断，如果有格式类型，添加到描述中
      if (type === 'fileFormat' && formatType) {
        const formatMap = {
          document: '📄 文档类',
          image: '🖼️ 图片类',
          audio: '🎵 音频类',
          video: '🎬 视频类',
          archive: '📦 压缩包',
          specific: '🎯 具体格式'
        };
        rightText = formatMap[formatType] || formatType;
      }

      return `${typeMap[type]} ${leftText} ${operatorText} ${rightText}`;
    });

    if (conditionDescriptions.length === 0) {
      return {
        trueSuggestion: "条件满足时的输出内容...",
        falseSuggestion: "条件不满足时的输出内容..."
      };
    }

    // 区分已配置和未配置的条件
    const configuredConditions = conditionDescriptions.filter(desc => !desc.includes('待配置') && !desc.includes('待填写') && !desc.includes('待选择'));
    const unconfiguredConditions = conditionDescriptions.filter(desc => desc.includes('待配置') || desc.includes('待填写') || desc.includes('待选择'));

    let conditionText = '';
    if (configuredConditions.length > 0) {
      conditionText = configuredConditions.join(' 且 ');
      if (unconfiguredConditions.length > 0) {
        conditionText += ` (还有${unconfiguredConditions.length}个条件待配置)`;
      }
    } else {
      conditionText = `${selectedTypes.length}个条件待配置`;
    }

    return {
      trueSuggestion: `✅ 满足所有条件: ${conditionText}\n继续处理...`,
      falseSuggestion: `❌ 不满足条件: ${conditionText}\n跳过处理或执行其他操作...`
    };
  };

  const handleFormatTypeChange = (value) => {
    handleDataChange('formatType', value);
    if (value && value !== 'specific') {
      handleDataChange('rightOperand', value);
    }
  };

  // 增强的条件测试功能
  const testCondition = async () => {
    if (!isNodeConfigured()) {
      alert('请填写完整的条件信息：条件类型、左操作数、操作符、右操作数');
      return;
    }

    setIsEvaluating(true);

    try {
      // 模拟异步评估过程
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = evaluateMultiCondition(
        nodeData.leftOperand,
        nodeData.operator,
        nodeData.rightOperand,
        nodeData.conditionTypes
      );
      const timestamp = new Date().toLocaleTimeString();

      const testResult = {
        timestamp,
        leftOperand: nodeData.leftOperand,
        operator: nodeData.operator,
        rightOperand: nodeData.rightOperand,
        result,
        success: true
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 4)]); // 保留最近5次测试结果
      handleDataChange('result', result);

    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      const testResult = {
        timestamp,
        leftOperand: nodeData.leftOperand,
        operator: nodeData.operator,
        rightOperand: nodeData.rightOperand,
        error: error.message,
        success: false
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 4)]);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 批量测试功能
  const batchTest = async () => {
    const testCases = [
      { left: nodeData.leftOperand, op: nodeData.operator, right: nodeData.rightOperand },
      { left: 'test1', op: nodeData.operator, right: nodeData.rightOperand },
      { left: 'test2', op: nodeData.operator, right: nodeData.rightOperand },
    ];

    setIsEvaluating(true);
    const results = [];

    for (const testCase of testCases) {
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const result = evaluateMultiCondition(
          testCase.left,
          testCase.op,
          testCase.right,
          nodeData.conditionTypes
        );
        results.push({
          timestamp: new Date().toLocaleTimeString(),
          leftOperand: testCase.left,
          operator: testCase.op,
          rightOperand: testCase.right,
          result,
          success: true
        });
      } catch (error) {
        results.push({
          timestamp: new Date().toLocaleTimeString(),
          leftOperand: testCase.left,
          operator: testCase.op,
          rightOperand: testCase.right,
          error: error.message,
          success: false
        });
      }
    }

    setTestResults(results);
    setIsEvaluating(false);
  };

  // 检查节点是否已配置完整
  const isNodeConfigured = () => {
    const selectedTypes = nodeData.conditionTypes || [];
    const configs = nodeData.conditionConfigs || {};

    // 如果没有选择任何条件类型，则未配置
    if (selectedTypes.length === 0) {
      return false;
    }

    // 检查每个选中的条件类型是否都已完整配置
    return selectedTypes.every(type => {
      const config = configs[type] || {};
      const { leftOperand, operator, rightOperand } = config;

      // 每个条件都需要有左操作数、操作符、右操作数
      return leftOperand && operator && rightOperand;
    });
  };

  // 获取状态文本
  const getStatusText = () => {
    if (!isNodeConfigured()) return '待配置';
    if (testResults.length === 0) return '就绪';
    const latest = testResults[0];
    if (!latest.success) return '错误';
    return latest.result ? 'True' : 'False';
  };

  // 获取状态标签的样式
  const getStatusStyle = () => {
    const status = getStatusText();
    switch (status) {
      case '就绪':
        return {
          backgroundColor: '#bbf7d0', // 浅绿色背景
          color: '#166534', // 深绿色文字
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500'
        };
      case '待配置':
        return {
          backgroundColor: '#6b7280', // 灰色背景
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500'
        };
      case '错误':
        return {
          backgroundColor: '#dc2626', // 红色背景
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500'
        };
      case 'True':
        return {
          backgroundColor: '#059669', // 深绿色背景
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500'
        };
      case 'False':
        return {
          backgroundColor: '#dc2626', // 红色背景
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500'
        };
      case '评估中...':
        return {
          backgroundColor: '#d97706', // 橙色背景
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500'
        };
      default:
        return {
          backgroundColor: '#6b7280', // 默认灰色背景
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500'
        };
    }
  };

  // 获取条件摘要
  const getConditionSummary = () => {
    if (!isNodeConfigured()) {
      return '请配置条件...';
    }

    const selectedTypes = nodeData.conditionTypes || [];
    const configs = nodeData.conditionConfigs || {};

    if (selectedTypes.length === 0) {
      return '请配置条件...';
    }

    // 生成每个条件的摘要
    const conditionSummaries = selectedTypes.map(type => {
      const config = configs[type] || {};
      const { leftOperand, operator, rightOperand } = config;

      const typeMap = {
        text: '📝',
        number: '🔢',
        existence: '❓',
        fileFormat: '📁'
      };

      const typeIcon = typeMap[type] || type;
      const operatorLabel = getOperatorLabel(operator);

      return `${typeIcon} ${leftOperand} ${operatorLabel} ${rightOperand}`;
    });

    // 如果只有一个条件，直接返回
    if (conditionSummaries.length === 1) {
      return conditionSummaries[0];
    }

    // 多个条件用 "且" 连接，但限制长度
    const summary = conditionSummaries.join(' 且 ');
    if (summary.length > 50) {
      return `${conditionSummaries.length}个条件已配置`;
    }

    return summary;
  };

  // 获取操作符标签
  const getOperatorLabel = (op) => {
    const labels = {
      'equals': '等于',
      'notEquals': '不等于',
      'greater': '大于',
      'less': '小于',
      'greaterEqual': '大于等于',
      'lessEqual': '小于等于',
      'contains': '包含',
      'startsWith': '开始于',
      'endsWith': '结束于',
      'exists': '存在',
      'notExists': '不存在',
      'isEmpty': '为空',
      'isNotEmpty': '不为空',
      'isType': '是该类型',
      'isNotType': '不是该类型',
      // 兼容旧的操作符
      '==': '等于',
      '!=': '不等于',
      '>': '大于',
      '<': '小于',
      '>=': '大于等于',
      '<=': '小于等于'
    };
    return labels[op] || op;
  };

  // 条件评估函数
  const evaluateCondition = (left, operator, right) => {
    const leftValue = String(left);
    const rightValue = String(right);

    switch (operator) {
      case 'contains':
        return leftValue.includes(rightValue);
      case 'equals':
        return leftValue === rightValue;
      case 'notEquals':
        return leftValue !== rightValue;
      case 'startsWith':
        return leftValue.startsWith(rightValue);
      case 'endsWith':
        return leftValue.endsWith(rightValue);
      case 'greater':
        return Number(leftValue) > Number(rightValue);
      case 'less':
        return Number(leftValue) < Number(rightValue);
      case 'greaterEqual':
        return Number(leftValue) >= Number(rightValue);
      case 'lessEqual':
        return Number(leftValue) <= Number(rightValue);
      case 'exists':
        return leftValue !== '' && leftValue !== null && leftValue !== undefined;
      case 'notExists':
        return leftValue === '' || leftValue === null || leftValue === undefined;
      case 'isEmpty':
        return leftValue.trim() === '';
      case 'isNotEmpty':
        return leftValue.trim() !== '';
      case 'isType':
        return checkFileFormat(leftValue, rightValue);
      case 'isNotType':
        return !checkFileFormat(leftValue, rightValue);
      default:
        throw new Error('不支持的操作符');
    }
  };

  // 多条件类型评估函数
  const evaluateMultiCondition = (left, operator, right, conditionTypes) => {
    const types = conditionTypes || (nodeData.conditionType ? [nodeData.conditionType] : ['text']);

    // 如果只有一种类型，使用原有逻辑
    if (types.length === 1) {
      return evaluateCondition(left, operator, right);
    }

    // 多种类型时，根据类型组合进行评估
    const results = [];

    for (const type of types) {
      try {
        let result;
        switch (type) {
          case 'text':
            // 文本比较：强制字符串比较
            result = evaluateCondition(String(left), operator, String(right));
            break;
          case 'number':
            // 数值比较：尝试数值转换
            if (!isNaN(left) && !isNaN(right)) {
              result = evaluateCondition(left, operator, right);
            } else {
              result = false; // 无法转换为数值时返回false
            }
            break;
          case 'existence':
            // 存在性判断：检查值是否存在
            result = evaluateCondition(left, operator, right);
            break;
          case 'fileFormat':
            // 文件格式判断：检查文件扩展名
            result = evaluateCondition(left, operator, right);
            break;
          default:
            result = evaluateCondition(left, operator, right);
        }
        results.push({ type, result });
      } catch (error) {
        results.push({ type, result: false, error: error.message });
      }
    }

    // 多条件组合策略：任一条件满足即为true（OR逻辑）
    // 可以根据需要改为AND逻辑或其他组合策略
    return results.some(r => r.result);
  };

  // 检查文件格式
  const checkFileFormat = (filename, formatType) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    if (fileFormats[formatType]) {
      return fileFormats[formatType].includes(ext);
    } else {
      return ext === formatType.toLowerCase();
    }
  };

  const saveCondition = () => {
    const configData = {
      conditionType: nodeData.conditionType,
      leftOperand: nodeData.leftOperand,
      operator: nodeData.operator,
      rightOperand: nodeData.rightOperand,
      trueOutput: nodeData.trueOutput,
      falseOutput: nodeData.falseOutput
    };
    alert('配置已保存:\n' + JSON.stringify(configData, null, 2));
  };

  const clearCondition = () => {
    const clearedData = {
      conditionType: '',
      leftOperand: '',
      operator: '',
      rightOperand: '',
      trueOutput: '',
      falseOutput: '',
      formatType: '',
      result: null
    };

    Object.keys(clearedData).forEach(key => {
      handleDataChange(key, clearedData[key]);
    });
  };

  const selectFolder = () => {
    // 文件夹选择功能 - 这里可以集成文件选择器
    const path = prompt('请输入存放路径:');
    if (path) {
      handleDataChange('folderPath', path);
    }
  };

  return (
    <div
      ref={nodeRef}
              className={`custom-node enhanced-node condition-node ${isConfigOpen ? 'config-open' : ''} ${isHovered ? 'hovered' : ''} ${isEvaluating ? 'evaluating' : ''} ${getNodeStatusClass()}`}
      onClick={handleNodeClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 🔗 第一层：普通连接点系统 - 遵循智能连接逻辑 */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        isConnectable={true}
        className="connection-handle connection-handle-top normal-handle"
        title="普通输出连接点"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        isConnectable={true}
        className="connection-handle connection-handle-top normal-handle"
        title="普通输入连接点"
      />

      {/* 普通左侧连接点 */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        isConnectable={true}
        className="connection-handle connection-handle-left normal-handle"
        title="普通输出连接点"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        isConnectable={true}
        className="connection-handle connection-handle-left normal-handle"
        title="普通输入连接点"
      />

      {/* 🔀 第二层：专用分支连接点系统 - True分支 */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-true"
        isConnectable={true}
        className="connection-handle connection-handle-left branch-handle true-branch-handle"
        style={{
          top: '75%',
          width: '16px',
          height: '16px',
          background: 'linear-gradient(135deg, #0ba875 0%, #059669 100%)',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(11, 168, 117, 0.4)',
          zIndex: 20
        }}
        title="True分支 - 条件满足时的执行路径"
        data-branch-type="true"
        data-icon="✓"
      />

      {/* True分支图标 */}
      <div
        className="branch-icon true-branch-icon"
        style={{
          position: 'absolute',
          left: '-8px',
          top: '75%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'white',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 25
        }}
      >
        ✓
      </div>

      {/* 普通右侧连接点 */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        isConnectable={true}
        className="connection-handle connection-handle-right normal-handle"
        title="普通输出连接点"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        isConnectable={true}
        className="connection-handle connection-handle-right normal-handle"
        title="普通输入连接点"
      />

      {/* 🔀 第二层：专用分支连接点系统 - False分支 */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-false"
        isConnectable={true}
        className="connection-handle connection-handle-right branch-handle false-branch-handle"
        style={{
          top: '75%',
          width: '16px',
          height: '16px',
          background: 'linear-gradient(135deg, #5b6472 0%, #4b5563 100%)',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(91, 100, 114, 0.4)',
          zIndex: 20
        }}
        title="False分支 - 条件不满足时的执行路径"
        data-branch-type="false"
        data-icon="✗"
      />

      {/* False分支图标 */}
      <div
        className="branch-icon false-branch-icon"
        style={{
          position: 'absolute',
          right: '-8px',
          top: '75%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'white',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 25
        }}
      >
        ✗
      </div>

      {/* 普通底部连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        isConnectable={true}
        className="connection-handle connection-handle-bottom normal-handle"
        title="普通输出连接点"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        isConnectable={true}
        className="connection-handle connection-handle-bottom normal-handle"
        title="普通输入连接点"
      />



      {!isConfigOpen ? (
        // 增强的简化视图
        <div className="node-content">
          <div className="node-header">
            <div className="node-icon-container">
              <span className="node-icon">🔀</span>
              {isEvaluating && (
                <div className="evaluation-spinner"></div>
              )}
            </div>
            <div className="node-text-container">
              <span className="node-title">条件节点</span>
              <span className="node-status" style={getStatusStyle()}>
                {isEvaluating ? '评估中...' : getStatusText()}
              </span>
            </div>
          </div>

          {/* 条件摘要显示 */}
          <div className="condition-summary">
            {getConditionSummary()}
          </div>

          {/* 最近测试结果 */}
          {testResults.length > 0 && (
            <div className="recent-test-result">
              <div className={`test-result-indicator ${testResults[0].success ? 'success' : 'error'}`}>
                {testResults[0].success ?
                  (testResults[0].result ? '✅ True' : '❌ False') :
                  '⚠️ Error'
                }
              </div>
              <div className="test-timestamp">{testResults[0].timestamp}</div>
            </div>
          )}

          {/* 快速操作按钮 */}
          <div className="node-quick-actions">
            <button
              className="quick-action-btn test-quick-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (isNodeConfigured()) {
                  testCondition();
                } else {
                  setIsConfigOpen(true);
                }
              }}
              disabled={isEvaluating}
              title={isNodeConfigured() ? "快速测试" : "配置条件"}
            >
              {isEvaluating ? '⏳' : (isNodeConfigured() ? '🧪' : '⚙️')}
            </button>
            <button
              className="quick-action-btn config-quick-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsConfigOpen(true);
              }}
              title="打开配置"
            >
              ❌
            </button>
          </div>
        </div>
      ) : (
        // 配置界面
        <div className="condition-config" onClick={(e) => e.stopPropagation()}>
          <div className="config-header">
            <h3>🔀 条件节点配置</h3>
            <button className="close-btn" onClick={(e) => { e.stopPropagation(); handleConfigToggle(); }}>×</button>
          </div>
          
          <div className="config-content">
            {/* 条件类型选择 - 多选 */}
            <div className="config-section">
              <label>🎯 条件类型 (可多选)</label>
              <div className="condition-types-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                marginTop: '8px'
              }}>
                {[
                  { value: 'text', label: '📝 文本比较' },
                  { value: 'number', label: '🔢 数值比较' },
                  { value: 'existence', label: '❓ 存在性判断' },
                  { value: 'fileFormat', label: '📁 文件格式判断' }
                ].map(type => (
                  <label key={type.value} className="condition-type-checkbox" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: (nodeData.conditionTypes || []).includes(type.value) ? '#f0f9ff' : 'white',
                    borderColor: (nodeData.conditionTypes || []).includes(type.value) ? '#3b82f6' : '#e5e7eb'
                  }}>
                    <input
                      type="checkbox"
                      checked={(nodeData.conditionTypes || []).includes(type.value)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleConditionTypeChange(type.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{type.label}</span>
                  </label>
                ))}
              </div>
              {(nodeData.conditionTypes || []).length > 0 && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 8px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#64748b'
                }}>
                  已选择: {(() => {
                    const selectedTypes = nodeData.conditionTypes || [];
                    if (selectedTypes.length === 0) return '无';

                    const typeMap = {
                      text: '📝 文本比较',
                      number: '🔢 数值比较',
                      existence: '❓ 存在性判断',
                      fileFormat: '📁 文件格式判断'
                    };

                    return selectedTypes.map(type => typeMap[type]).filter(Boolean).join(', ');
                  })()}
                </div>
              )}
            </div>

            {/* 条件构建器 - 为每个选中的类型创建独立配置 */}
            <div className="condition-builder">
              {(nodeData.conditionTypes || []).length > 0 ? (
                (nodeData.conditionTypes || []).map((conditionType, index) => {
                  const config = (nodeData.conditionConfigs || {})[conditionType] || {};
                  const typeMap = {
                    text: '📝 文本比较',
                    number: '🔢 数值比较',
                    existence: '❓ 存在性判断',
                    fileFormat: '📁 文件格式判断'
                  };

                  return (
                    <div key={conditionType} className="condition-group" style={{
                      marginBottom: '16px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc'
                    }}>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {typeMap[conditionType]}
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '400',
                          color: '#6b7280',
                          backgroundColor: '#e5e7eb',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          条件 {index + 1}
                        </span>
                      </h4>

                      <div className="condition-row">
                        <div>
                          <label>左操作数</label>
                          <input
                            type="text"
                            placeholder="输入变量或值"
                            value={config.leftOperand || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleConditionConfigChange(conditionType, 'leftOperand', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <label>操作符</label>
                          <select
                            value={config.operator || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleConditionConfigChange(conditionType, 'operator', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="operator-select"
                          >
                            <option value="">选择操作符</option>
                            {operators[conditionType] && operators[conditionType].map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label>右操作数</label>
                          <input
                            type="text"
                            placeholder="输入比较值"
                            value={config.rightOperand || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleConditionConfigChange(conditionType, 'rightOperand', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* 文件格式选项 */}
                      {conditionType === 'fileFormat' && (
                        <div className="file-format-options" style={{ marginTop: '12px' }}>
                          <label>📁 文件格式类型</label>
                          <select
                            value={config.formatType || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleConditionConfigChange(conditionType, 'formatType', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">选择格式类型</option>
                            <option value="document">📄 文档类</option>
                            <option value="image">🖼️ 图片类</option>
                            <option value="audio">🎵 音频类</option>
                            <option value="video">🎬 视频类</option>
                            <option value="archive">📦 压缩包</option>
                            <option value="specific">🎯 具体格式</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px dashed #d1d5db'
                }}>
                  请先选择条件类型
                </div>
              )}

              {/* 概念提示 */}
              {(nodeData.conditionTypes || []).length > 0 && (
                <div className="concept-tips" style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe'
                }}>
                  <div className="tip-item">
                    <strong>左操作数：</strong>要判断的数据源，如变量名、文件路径等
                  </div>
                  <div className="tip-item">
                    <strong>操作符：</strong>比较方式，根据数据类型自动匹配
                  </div>
                  <div className="tip-item">
                    <strong>右操作数：</strong>比较的目标值，用于判断条件是否成立
                  </div>
                </div>
              )}
              </div>

            {/* 分支输出 */}
            <div className="branch-outputs">
              {(() => {
                const suggestions = generateBranchSuggestions();
                return (
                  <>
                    <div className="branch-section true-branch">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <label>True分支输出</label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDataChange('trueOutput', suggestions.trueSuggestion);
                          }}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="使用智能建议"
                        >
                          💡 智能填充
                        </button>
                      </div>
                      <textarea
                        placeholder={suggestions.trueSuggestion}
                        value={nodeData.trueOutput}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleDataChange('trueOutput', e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        rows="3"
                        style={{
                          fontSize: '12px',
                          lineHeight: '1.4'
                        }}
                      />
                    </div>
                    <div className="branch-section false-branch">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <label>False分支输出</label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDataChange('falseOutput', suggestions.falseSuggestion);
                          }}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="使用智能建议"
                        >
                          💡 智能填充
                        </button>
                      </div>
                      <textarea
                        placeholder={suggestions.falseSuggestion}
                        value={nodeData.falseOutput}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleDataChange('falseOutput', e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        rows="3"
                        style={{
                          fontSize: '12px',
                          lineHeight: '1.4'
                        }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 测试结果历史 */}
            {testResults.length > 0 && (
              <div className="test-results-section">
                <label>🧪 测试结果历史</label>
                <div className="test-results-list">
                  {testResults.map((result, index) => (
                    <div key={index} className={`test-result-item ${result.success ? 'success' : 'error'}`}>
                      <div className="test-result-header">
                        <span className="test-result-time">{result.timestamp}</span>
                        <span className={`test-result-status ${result.success ? 'success' : 'error'}`}>
                          {result.success ?
                            (result.result ? '✅ True' : '❌ False') :
                            '⚠️ Error'
                          }
                        </span>
                      </div>
                      <div className="test-result-condition">
                        {result.leftOperand} {getOperatorLabel(result.operator)} {result.rightOperand}
                      </div>
                      {!result.success && (
                        <div className="test-result-error">{result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="control-buttons">
              <button
                className="btn btn-primary test-btn"
                onClick={(e) => { e.stopPropagation(); testCondition(); }}
                disabled={isEvaluating}
              >
                {isEvaluating ? '⏳ 评估中...' : '🧪 测试条件'}
              </button>
              <button
                className="btn btn-primary batch-test-btn"
                onClick={(e) => { e.stopPropagation(); batchTest(); }}
                disabled={isEvaluating}
              >
                📊 批量测试
              </button>
              <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); clearCondition(); }}>
                🗑️ 清空
              </button>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setTestResults([]);
                }}
                disabled={testResults.length === 0}
              >
                🧹 清空历史
              </button>
              <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); saveCondition(); }}>
                💾 保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ConditionNode;
