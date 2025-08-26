import React, { useState, useMemo } from 'react';
import './DataMappingPanel.css';

const DataMappingPanel = ({ 
  currentNode, 
  nodes = [], 
  edges = [], 
  onMappingChange,
  executionResults = {} // 实际的执行结果数据
}) => {
  const [mappings, setMappings] = useState({});
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  
  // 调试信息
  console.log('DataMappingPanel rendered:', {
    currentNode: currentNode?.id,
    nodesCount: nodes.length,
    edgesCount: edges.length,
    hasExecutionResults: Object.keys(executionResults).length > 0
  });

  // 获取当前节点的前置节点（输入节点）
  const sourceNodes = useMemo(() => {
    return edges
      .filter(edge => edge.target === currentNode.id)
      .map(edge => {
        const sourceNode = nodes.find(node => node.id === edge.source);
        return {
          ...sourceNode,
          edgeId: edge.id,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        };
      })
      .filter(Boolean);
  }, [edges, nodes, currentNode.id]);

  // 获取节点的输出数据结构
  const getNodeOutputData = (node) => {
    const executionResult = executionResults[node.id];
    
    // 如果有实际的执行结果，解析其数据结构
    if (executionResult) {
      try {
        if (typeof executionResult === 'string') {
          return { output: executionResult };
        }
        return executionResult;
      } catch (error) {
        console.warn('解析执行结果失败:', error);
      }
    }
    
    // 根据节点类型生成默认的输出数据结构
    switch (node.type) {
      case 'material-node':
        return {
          files: node.data?.selectedFiles || [],
          text: node.data?.textContent || '',
          urls: node.data?.urlList || []
        };
      
      case 'execution-node':
      case 'enhanced-execution-node':
        return {
          result: node.data?.outputContent || '',
          status: 'completed',
          timestamp: new Date().toISOString()
        };
      
      case 'condition-node':
        return {
          condition_met: true,
          true_output: node.data?.trueOutput || '',
          false_output: node.data?.falseOutput || '',
          evaluation_result: ''
        };
      
      case 'result-node':
        return {
          final_result: node.data?.outputContent || '',
          format: node.data?.outputFormat || 'text',
          file_path: node.data?.storagePath || ''
        };
      
      default:
        return {
          output: node.data?.outputContent || node.data?.content || ''
        };
    }
  };

  // 渲染数据字段的递归函数
  const renderDataField = (key, value, path = '', nodeId, level = 0) => {
    const fullPath = path ? `${path}.${key}` : key;
    const mappingKey = `${nodeId}.${fullPath}`;
    const isExpanded = expandedNodes.has(mappingKey);
    const isSelected = mappings[mappingKey];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <div key={fullPath} className={`data-field object-field level-${level}`}>
          <div className="field-header" onClick={() => toggleExpanded(mappingKey)}>
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
            <span className="field-name">{key}</span>
            <span className="field-type">object</span>
          </div>
          {isExpanded && (
            <div className="field-children">
              {Object.entries(value).map(([subKey, subValue]) => 
                renderDataField(subKey, subValue, fullPath, nodeId, level + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={fullPath} className={`data-field array-field level-${level}`}>
          <div className="field-header" onClick={() => toggleExpanded(mappingKey)}>
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
            <span className="field-name">{key}</span>
            <span className="field-type">array[{value.length}]</span>
          </div>
          {isExpanded && (
            <div className="field-children">
              {value.map((item, index) => 
                renderDataField(`[${index}]`, item, fullPath, nodeId, level + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={fullPath} className={`data-field value-field level-${level} ${isSelected ? 'selected' : ''}`}>
        <input
          type="checkbox"
          checked={!!isSelected}
          onChange={(e) => handleMappingChange(mappingKey, e.target.checked)}
          className="field-checkbox"
        />
        <span className="field-name">{key}</span>
        <span className="field-type">{typeof value}</span>
        <span className="field-value" title={String(value)}>
          {String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value)}
        </span>
      </div>
    );
  };

  const toggleExpanded = (key) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedNodes(newExpanded);
  };

  const handleMappingChange = (mappingKey, isSelected) => {
    const newMappings = { ...mappings };
    if (isSelected) {
      newMappings[mappingKey] = true;
    } else {
      delete newMappings[mappingKey];
    }
    setMappings(newMappings);
    
    // 通知父组件映射变化
    if (onMappingChange) {
      onMappingChange(newMappings);
    }
  };

  // 清除所有映射
  const clearAllMappings = () => {
    setMappings({});
    if (onMappingChange) {
      onMappingChange({});
    }
  };

  // 选择所有映射
  const selectAllMappings = () => {
    const newMappings = {};
    sourceNodes.forEach(node => {
      const outputData = getNodeOutputData(node);
      const addAllFields = (data, path = '', nodeId) => {
        Object.entries(data).forEach(([key, value]) => {
          const fullPath = path ? `${path}.${key}` : key;
          const mappingKey = `${nodeId}.${fullPath}`;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            addAllFields(value, fullPath, nodeId);
          } else {
            newMappings[mappingKey] = true;
          }
        });
      };
      addAllFields(outputData, '', node.id);
    });
    
    setMappings(newMappings);
    if (onMappingChange) {
      onMappingChange(newMappings);
    }
  };

  // 获取已选择的映射数量
  const selectedCount = Object.keys(mappings).length;

  if (sourceNodes.length === 0) {
    return (
      <div className="data-mapping-panel">
        <div className="panel-header">
          <h4>📊 数据映射</h4>
        </div>
        <div className="no-inputs">
          <p>此节点没有输入连接</p>
          <p>连接其他节点后可以配置数据映射</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-mapping-panel">
      <div className="panel-header">
        <h4>📊 数据映射</h4>
        <div className="mapping-controls">
          <span className="selected-count">{selectedCount} 项已选择</span>
          <button onClick={selectAllMappings} className="btn-sm">全选</button>
          <button onClick={clearAllMappings} className="btn-sm">清除</button>
        </div>
      </div>
      
      <div className="mapping-content">
        <div className="mapping-description">
          <p>选择要传递给当前节点的数据字段：</p>
        </div>
        
        {sourceNodes.map(node => {
          const outputData = getNodeOutputData(node);
          return (
            <div key={node.id} className="source-node-section">
              <div className="source-node-header">
                <span className="node-icon">
                  {node.type === 'material-node' && '📁'}
                  {node.type === 'execution-node' && '⚙️'}
                  {node.type === 'condition-node' && '🔀'}
                  {node.type === 'result-node' && '📊'}
                </span>
                <span className="node-label">{node.data?.label || node.id}</span>
                <span className="connection-info">
                  {node.sourceHandle && node.sourceHandle !== 'default' && (
                    <span className="handle-info">来源: {node.sourceHandle}</span>
                  )}
                </span>
              </div>
              
              <div className="node-output-data">
                {Object.entries(outputData).map(([key, value]) => 
                  renderDataField(key, value, '', node.id, 0)
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedCount > 0 && (
        <div className="mapping-summary">
          <h5>已选择的数据字段:</h5>
          <div className="selected-mappings">
            {Object.keys(mappings).map(mappingKey => {
              const [nodeId, ...pathParts] = mappingKey.split('.');
              const path = pathParts.join('.');
              const sourceNode = sourceNodes.find(n => n.id === nodeId);
              return (
                <div key={mappingKey} className="selected-mapping">
                  <span className="mapping-source">{sourceNode?.data?.label || nodeId}</span>
                  <span className="mapping-arrow">→</span>
                  <span className="mapping-path">{path}</span>
                  <button 
                    onClick={() => handleMappingChange(mappingKey, false)}
                    className="remove-mapping"
                    title="删除数据映射"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMappingPanel; 