import React, { useState, useEffect, useRef, memo, useLayoutEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import FileManagerView from './FileManagerView';
import NodeExpandedView from './NodeExpandedView';
import MaterialNode from './MaterialNode';
import ExecutionNode from './ExecutionNode';
import ConditionNode from './ConditionNode';
import ResultNode from './ResultNode';

const CustomNode = memo(({ id, data, selected, onNodeDataChange, onNodeSizeChange, onNodeDoubleClick }) => {
  const nodeRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [labelText, setLabelText] = useState(data ? data.label : '');
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [nodeProgress, setNodeProgress] = useState(data?.progress || 0);
  const [nodeStatus, setNodeStatus] = useState(data?.status || 'idle');

  useEffect(() => {
    if (data && !isEditing) {
        setLabelText(data.label);
    }
  }, [data?.label, isEditing]);

  useLayoutEffect(() => {
    if (nodeRef.current && onNodeSizeChange) {
      const width = Math.round(nodeRef.current.getBoundingClientRect().width);
      const height = Math.round(nodeRef.current.getBoundingClientRect().height);
      const currentSize = data?.size;
      if (!currentSize || currentSize.width !== width || currentSize.height !== height) {
        onNodeSizeChange(id, { width, height });
      }
    }
  }, [id, onNodeSizeChange, labelText, isExpanded]);

  // Notify parent when expansion state changes
  useEffect(() => {
    if (onNodeDataChange && data && data.isExpanded !== isExpanded) {
      onNodeDataChange(id, { ...data, isExpanded });
    }
  }, [isExpanded, id, onNodeDataChange, data?.isExpanded]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  // If there's no data, we can't render the node.
  // This check is now after all hooks have been called.
  if (!data) {
    return null;
  }

  // 根据节点类型渲染不同的组件
  const nodeType = data.nodeType || data.type || 'material-node';

  // 如果是材料节点，使用材料节点组件
  if (nodeType === 'material-node') {
    return (
      <MaterialNode
        id={id}
        data={data}
        selected={selected}
        onNodeDataChange={onNodeDataChange}
        onNodeSizeChange={onNodeSizeChange}
      />
    );
  }

  // 如果是执行节点，使用执行节点组件
  if (nodeType === 'execution-node') {
    return (
      <ExecutionNode
        id={id}
        data={data}
        selected={selected}
        onNodeDataChange={onNodeDataChange}
        onNodeSizeChange={onNodeSizeChange}
      />
    );
  }

  // 如果是条件节点，使用条件节点组件
  if (nodeType === 'condition-node') {
    return (
      <ConditionNode
        id={id}
        data={data}
        selected={selected}
        onNodeDataChange={onNodeDataChange}
        onNodeSizeChange={onNodeSizeChange}
      />
    );
  }

  // 如果是结果节点，使用结果节点组件
  if (nodeType === 'result-node') {
    return (
      <ResultNode
        id={id}
        data={data}
        selected={selected}
        onNodeDataChange={onNodeDataChange}
        onNodeSizeChange={onNodeSizeChange}
      />
    );
  }

  // Debug: 打印节点数据 (已禁用以减少控制台输出)
  // console.log('CustomNode render - ID:', id, 'Data:', data);

  // 处理节点点击事件 - 增强交互
  const handleNodeClick = () => {
    setClickCount(prev => prev + 1);

    // 添加点击动画效果
    setAnimationClass('node-click-animation');
    setTimeout(() => setAnimationClass(''), 300);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount + 1 >= 2) {
        // 双击 - 展开页面
        console.log('Double click detected! Node data:', data);
        console.log('Node type:', data.nodeType, 'Type:', data.type);

        // 展开动画
        setAnimationClass('node-expand-animation');
        setTimeout(() => {
          setIsExpanded(!isExpanded);
          setAnimationClass('');
        }, 150);

        if (onNodeDoubleClick) {
          onNodeDoubleClick(id, data);
        }
      } else {
        // 单击 - 选中效果
        setAnimationClass('node-select-animation');
        setTimeout(() => setAnimationClass(''), 200);
      }
      // 重置点击计数
      setClickCount(0);
    }, 300);
  };

  // 处理鼠标悬停
  const handleMouseEnter = () => {
    setIsHovered(true);
    setAnimationClass('node-hover-animation');
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setAnimationClass('');
  };

  // 模拟节点进度更新
  const updateNodeProgress = (progress) => {
    setNodeProgress(progress);
    if (onNodeDataChange) {
      onNodeDataChange(id, { ...data, progress });
    }
  };

  // 模拟节点状态更新
  const updateNodeStatus = (status) => {
    setNodeStatus(status);
    if (onNodeDataChange) {
      onNodeDataChange(id, { ...data, status });
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onNodeDataChange && labelText !== data.label) {
      onNodeDataChange(id, { ...data, label: labelText });
    }
  };

  const handleChange = (event) => {
    setLabelText(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleBlur();
    }
  };

  // 获取节点图标
  const getNodeIcon = () => {
    const nodeType = data.nodeType || data.type || 'material-node';
    const iconMap = {
      'material-node': '📁',
      'execution-node': '⚡',
      'condition-node': '🔀',
      'result-node': '📋',
      'start-node': '🚀',
      'end-node': '🎯'
    };
    return iconMap[nodeType] || '📁';
  };

  // 获取节点状态颜色
  const getStatusColor = () => {
    switch (nodeStatus) {
      case 'running': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const nodeClasses = [
    'custom-node',
    'enhanced-node',
    data.nodeType || data.type || 'material-node',
    nodeStatus || 'idle',
    selected ? 'selected' : '',
    isExpanded ? 'expanded' : '',
    isHovered ? 'hovered' : '',
    animationClass,
    data.className || ''
  ].join(' ').trim();

  return (
    <div
      className={nodeClasses}
      onClick={handleNodeClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={nodeRef}
      style={{
        '--status-color': getStatusColor(),
        '--progress': `${nodeProgress}%`
      }}
    >
      {/* 四个方向的连接点 - 支持双向连接 */}
      <Handle type="source" position={Position.Top} id="top-source" isConnectable={true} className="connection-handle connection-handle-top" />
      <Handle type="target" position={Position.Top} id="top-target" isConnectable={true} className="connection-handle connection-handle-top" />

      <Handle type="source" position={Position.Left} id="left-source" isConnectable={true} className="connection-handle connection-handle-left" />
      <Handle type="target" position={Position.Left} id="left-target" isConnectable={true} className="connection-handle connection-handle-left" />

      <Handle type="source" position={Position.Right} id="right-source" isConnectable={true} className="connection-handle connection-handle-right" />
      <Handle type="target" position={Position.Right} id="right-target" isConnectable={true} className="connection-handle connection-handle-right" />

      <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectable={true} className="connection-handle connection-handle-bottom" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" isConnectable={true} className="connection-handle connection-handle-bottom" />

      {!isExpanded ? (
        <div className="node-content">
          {/* 节点状态指示器 */}
          <div className="node-status-bar">
            <div className="status-indicator" style={{ backgroundColor: getStatusColor() }}></div>
            {nodeProgress > 0 && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${nodeProgress}%` }}></div>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="node-edit-container">
              <input
                ref={inputRef}
                value={labelText}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="nodrag node-edit-input"
                placeholder="输入节点名称..."
              />
            </div>
          ) : (
            <div className="node-header">
              <div className="node-icon-container">
                <span className="node-icon">{getNodeIcon()}</span>
                {nodeStatus === 'running' && (
                  <div className="loading-spinner"></div>
                )}
              </div>
              <div className="node-text-container">
                <span className="node-title">{data.label || '材料'}</span>
                {nodeStatus !== 'idle' && (
                  <span className="node-status-text">{nodeStatus}</span>
                )}
              </div>
            </div>
          )}

          {/* 节点详细信息 */}
          <div className="node-details">
            {data.inputs && data.inputs.length > 0 && (
              <div className="node-inputs">
                <span className="detail-label">输入:</span>
                <span className="detail-value">{data.inputs.join(', ')}</span>
              </div>
            )}
            {data.outputs && data.outputs.length > 0 && (
              <div className="node-outputs">
                <span className="detail-label">输出:</span>
                <span className="detail-value">{data.outputs.join(', ')}</span>
              </div>
            )}
          </div>

          {/* 节点操作按钮 */}
          <div className="node-actions">
            <button
              className="action-btn edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="编辑节点"
            >
              ✏️
            </button>
            <button
              className="action-btn expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              title="展开节点"
            >
              🔍
            </button>
          </div>
        </div>
      ) : (
        <div className="expanded-content">
          {/* 展开状态的头部 */}
          <div className="expanded-header">
            <div className="expanded-title">
              <span className="expanded-icon">{getNodeIcon()}</span>
              <span className="expanded-name">{data.label || '节点详情'}</span>
              <span className="node-type-badge">{data.nodeType || data.type || 'material'}</span>
            </div>
            <div className="expanded-controls">
              <button
                className="control-btn minimize-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                title="收起节点"
              >
                ➖
              </button>
              <button
                className="control-btn close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                title="关闭"
              >
                ✖️
              </button>
            </div>
          </div>

          {/* 展开状态的内容区域 */}
          <div className="expanded-body">
            <div className="expanded-content-area">
              <div className="node-expanded-container">
                <NodeExpandedView
                  nodeId={id}
                  nodeData={data}
                  onDataChange={onNodeDataChange}
                  onClose={() => setIsExpanded(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default CustomNode;