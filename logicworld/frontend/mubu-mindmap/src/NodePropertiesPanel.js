import React, { useState, useEffect } from 'react';
import './NodePropertiesPanel.css';
import DataMappingPanel from './components/DataMappingPanel';

const NodePropertiesPanel = ({ 
  selectedNode, 
  nodeTypesConfig, 
  onNodeUpdate, 
  onClose,
  nodes = [],
  edges = [],
  executionResults = {}
}) => {
  const [nodeData, setNodeData] = useState(null);
  const [parameters, setParameters] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    console.log('NodePropertiesPanel - selectedNode changed:', selectedNode?.id);
    if (selectedNode) {
      setNodeData(selectedNode.data);
      setParameters(selectedNode.data.params || {});
      setErrors({});
    }
  }, [selectedNode]);

  if (!selectedNode || !nodeData) {
    return (
      <div className="node-properties-panel">
        <div className="panel-header">
          <h3>节点属性</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="panel-content">
          <p className="no-selection">请选择一个节点来编辑其属性</p>
        </div>
      </div>
    );
  }

  const nodeTypeConfig = nodeTypesConfig?.nodeTypes?.[nodeData.nodeType];

  const handleLabelChange = (value) => {
    const updatedData = { ...nodeData, label: value };
    setNodeData(updatedData);
    onNodeUpdate(selectedNode.id, updatedData);
  };

  const handleDescriptionChange = (value) => {
    const updatedData = { ...nodeData, description: value };
    setNodeData(updatedData);
    onNodeUpdate(selectedNode.id, updatedData);
  };

  const handleParameterChange = (paramName, value) => {
    const updatedParams = { ...parameters, [paramName]: value };
    setParameters(updatedParams);
    
    const updatedData = { ...nodeData, params: updatedParams };
    setNodeData(updatedData);
    onNodeUpdate(selectedNode.id, updatedData);
  };

  const validateParameter = (paramName, value, paramConfig) => {
    const newErrors = { ...errors };
    
    // 必填验证
    if (paramConfig.required && (!value || value.toString().trim() === '')) {
      newErrors[paramName] = '此字段为必填项';
    } else {
      delete newErrors[paramName];
    }
    
    // 类型验证
    if (value && paramConfig.type) {
      switch (paramConfig.type) {
        case 'number':
          if (isNaN(value)) {
            newErrors[paramName] = '请输入有效的数字';
          } else {
            const num = parseFloat(value);
            if (paramConfig.min !== undefined && num < paramConfig.min) {
              newErrors[paramName] = `值不能小于 ${paramConfig.min}`;
            }
            if (paramConfig.max !== undefined && num > paramConfig.max) {
              newErrors[paramName] = `值不能大于 ${paramConfig.max}`;
            }
          }
          break;
        case 'json':
          try {
            JSON.parse(value);
          } catch (e) {
            newErrors[paramName] = '请输入有效的JSON格式';
          }
          break;
        default:
          // 其他类型不需要特殊验证
          break;
      }
    }
    
    setErrors(newErrors);
  };

  const renderParameterInput = (paramName, paramConfig) => {
    const value = parameters[paramName] || paramConfig.default || '';
    const hasError = errors[paramName];
    
    // 检查条件显示
    if (paramConfig.condition) {
      const conditionKey = Object.keys(paramConfig.condition)[0];
      const conditionValue = paramConfig.condition[conditionKey];
      if (parameters[conditionKey] !== conditionValue) {
        return null;
      }
    }

    const handleChange = (newValue) => {
      handleParameterChange(paramName, newValue);
      validateParameter(paramName, newValue, paramConfig);
    };

    switch (paramConfig.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={hasError ? 'error' : ''}
          >
            {paramConfig.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            min={paramConfig.min}
            max={paramConfig.max}
            step={paramConfig.step || 'any'}
            className={hasError ? 'error' : ''}
          />
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => handleChange(e.target.checked)}
          />
        );

      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={paramConfig.placeholder}
            className={hasError ? 'error' : ''}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={paramConfig.placeholder}
            rows={4}
            className={hasError ? 'error' : ''}
          />
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={paramConfig.placeholder}
            rows={6}
            className={`json-input ${hasError ? 'error' : ''}`}
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={paramConfig.placeholder}
            className={hasError ? 'error' : ''}
          />
        );
    }
  };

  return (
    <div className="node-properties-panel">
      <div className="panel-header">
        <h3>节点属性</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        {/* 基本信息 */}
        <div className="section">
          <h4>基本信息</h4>
          
          <div className="form-group">
            <label>节点类型</label>
            <div className="node-type-display">
              <span className="node-type-icon">
                {nodeTypeConfig?.icon || '⚙️'}
              </span>
              <span className="node-type-name">
                {nodeTypeConfig?.name || nodeData.nodeType}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>节点名称</label>
            <input
              type="text"
              value={nodeData.label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="输入节点名称"
            />
          </div>

          <div className="form-group">
            <label>描述</label>
            <textarea
              value={nodeData.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="输入节点描述"
              rows={2}
            />
          </div>
        </div>

        {/* 参数配置 */}
        {nodeTypeConfig?.parameters && (
          <div className="section">
            <h4>参数配置</h4>
            
            {Object.entries(nodeTypeConfig.parameters).map(([paramName, paramConfig]) => (
              <div key={paramName} className="form-group">
                <label>
                  {paramConfig.label}
                  {paramConfig.required && <span className="required">*</span>}
                </label>
                
                {renderParameterInput(paramName, paramConfig)}
                
                {errors[paramName] && (
                  <div className="error-message">{errors[paramName]}</div>
                )}
                
                {paramConfig.description && (
                  <div className="help-text">{paramConfig.description}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 输入输出 */}
        <div className="section">
          <h4>输入输出</h4>
          
          <div className="form-group">
            <label>输入连接</label>
            <div className="io-list">
              {(() => {
                const inputConnections = edges.filter(edge => edge.target === selectedNode.id);
                return inputConnections.length > 0 ? (
                  inputConnections.map((edge, index) => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    return (
                      <span key={index} className="io-tag input-tag">
                        {sourceNode?.data?.label || edge.source}
                        {edge.sourceHandle !== 'default' && ` (${edge.sourceHandle})`}
                      </span>
                    );
                  })
              ) : (
                  <span className="no-io">无输入连接</span>
                );
              })()}
            </div>
          </div>

          <div className="form-group">
            <label>输出连接</label>
            <div className="io-list">
              {(() => {
                const outputConnections = edges.filter(edge => edge.source === selectedNode.id);
                return outputConnections.length > 0 ? (
                  outputConnections.map((edge, index) => {
                    const targetNode = nodes.find(n => n.id === edge.target);
                    return (
                      <span key={index} className="io-tag output-tag">
                        {targetNode?.data?.label || edge.target}
                        {edge.targetHandle !== 'default' && ` (${edge.targetHandle})`}
                      </span>
                    );
                  })
              ) : (
                  <span className="no-io">无输出连接</span>
                );
              })()}
            </div>
          </div>

          <div className="form-group">
            <label>可用数据字段</label>
            <div className="io-list">
              {(() => {
                const getNodeOutputFields = (nodeType) => {
                  switch (nodeType) {
                    case 'material-node':
                      return ['files', 'text', 'urls'];
                    case 'execution-node':
                    case 'enhanced-execution-node':
                      return ['result', 'status', 'timestamp'];
                    case 'condition-node':
                      return ['condition_met', 'true_output', 'false_output'];
                    case 'result-node':
                      return ['final_result', 'format', 'file_path'];
                    default:
                      return ['output'];
                  }
                };
                
                const outputFields = getNodeOutputFields(nodeData.nodeType);
                return outputFields.map((field, index) => (
                  <span key={index} className="io-tag data-field-tag">{field}</span>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* 数据映射 */}
        <div className="section">
          <h4>数据映射</h4>
          <DataMappingPanel
            currentNode={selectedNode}
            nodes={nodes}
            edges={edges}
            executionResults={executionResults}
            onMappingChange={(mappings) => {
              const updatedData = { ...nodeData, inputMappings: mappings };
              setNodeData(updatedData);
              onNodeUpdate(selectedNode.id, updatedData);
            }}
          />
        </div>

        {/* 高级设置 */}
        <div className="section">
          <h4>高级设置</h4>
          
          <div className="form-group">
            <label>超时时间 (秒)</label>
            <input
              type="number"
              value={nodeData.timeout || ''}
              onChange={(e) => {
                const updatedData = { ...nodeData, timeout: parseInt(e.target.value) || null };
                setNodeData(updatedData);
                onNodeUpdate(selectedNode.id, updatedData);
              }}
              min="1"
              placeholder="默认无超时"
            />
          </div>

          <div className="form-group">
            <label>重试次数</label>
            <input
              type="number"
              value={nodeData.retry_count || 0}
              onChange={(e) => {
                const updatedData = { ...nodeData, retry_count: parseInt(e.target.value) || 0 };
                setNodeData(updatedData);
                onNodeUpdate(selectedNode.id, updatedData);
              }}
              min="0"
              max="10"
            />
          </div>

          <div className="form-group">
            <label>错误处理</label>
            <select
              value={nodeData.error_handling || 'stop'}
              onChange={(e) => {
                const updatedData = { ...nodeData, error_handling: e.target.value };
                setNodeData(updatedData);
                onNodeUpdate(selectedNode.id, updatedData);
              }}
            >
              <option value="stop">停止执行</option>
              <option value="continue">继续执行</option>
              <option value="retry">重试</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodePropertiesPanel;
