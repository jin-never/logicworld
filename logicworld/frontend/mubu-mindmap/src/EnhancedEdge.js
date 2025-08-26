import React, { useState, useCallback } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import './EnhancedEdge.css';

const EnhancedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data = {},
  markerEnd,
  selected,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);



  // 获取边的路径
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });



  // 根据状态动态选择箭头
  const markerId = (status) => `edge-marker-${id}-${status}`;
  const markerEndToUse =
    data.status === 'running'
      ? `url(#${markerId('running')})`
      : 'url(#smooth-arrow)';

  // 根据状态确定样式
  const getEdgeStyle = () => {
    // Remove strokeDasharray from passed style to avoid conflicts
    const { strokeDasharray, ...cleanStyle } = style || {};
    
    const baseStyle = {
      strokeWidth: 4,
      stroke: '#7c3aed',
      // Remove strokeDasharray from inline styles, let CSS classes handle it
      ...cleanStyle,
    };

              if (data.status === 'running') {
      return {
        ...baseStyle,
        strokeWidth: 5,
        stroke: '#60a5fa',
        // Remove strokeDasharray from inline styles, let CSS classes handle it
        filter: 'drop-shadow(0 0 12px rgba(96, 165, 250, 0.7))',
      };
    }

        if (data.status === 'success') {
      return {
        ...baseStyle,
        stroke: '#10b981',
        strokeWidth: 4,
        filter: 'none',
      };
    }

    if (data.status === 'error') {
      return {
        ...baseStyle,
        stroke: '#ef4444',
        strokeWidth: 4,
        // Remove strokeDasharray from inline styles, let CSS classes handle it
        filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.6))',
      };
    }

    if (selected) {
      return {
        ...baseStyle,
        strokeWidth: 5,
        // Remove strokeDasharray from inline styles, let CSS classes handle it
        filter: 'drop-shadow(0 0 10px rgba(124, 58, 237, 0.6))',
      };
    }

    if (isHovered) {
      return {
        ...baseStyle,
        strokeWidth: 5,
        // Remove strokeDasharray from inline styles, let CSS classes handle it
        filter: 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.5))',
      };
    }

    return baseStyle;
  };

  // 霓虹发光底层路径（增强科技感）
  const getGlowStyle = () => {
    if (data.status === 'running') {
      return {
        stroke: '#60a5fa',
        strokeWidth: 8,
        strokeOpacity: 0.22,
        strokeDasharray: '32 16',
        filter: 'drop-shadow(0 0 10px rgba(96,165,250,0.7))',
      };
    }
    if (data.status === 'success') {
      return {
        stroke: '#10b981',
        strokeWidth: 8,
        strokeOpacity: 0.2,
        strokeDasharray: '0',
        filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.6))',
      };
    }
    if (data.status === 'error') {
      return {
        stroke: '#ef4444',
        strokeWidth: 8,
        strokeOpacity: 0.2,
        strokeDasharray: '6 3',
        filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))',
      };
    }
    return null;
  };

  // 处理边的点击：直接显示删除按钮
  const handleEdgeClick = useCallback((event) => {
    event.stopPropagation();
    if (props.onEdgeClick) {
      props.onEdgeClick(id, data);
    }
  }, [id, data, props.onEdgeClick]);

  const handleErrorClick = useCallback((event) => {
    event.stopPropagation();
    setShowTooltip(!showTooltip);
  }, [showTooltip]);



  const glowStyle = getGlowStyle();

  return (
    <>
      {/* 状态箭头定义（每条边独立ID，避免冲突） */}
      <defs>
        <marker id={markerId('running')} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" opacity="0.9" />
        </marker>
        <marker id={markerId('success')} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
        </marker>
        <marker id={markerId('error')} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
        </marker>
      </defs>

      {/* 霓虹发光底层路径（仅在运行态叠加） */}
      {data.status === 'running' && glowStyle && (
        <BaseEdge
          path={edgePath}
          markerEnd={markerEndToUse}
          style={glowStyle}
          className={`enhanced-edge-glow running`}
        />
      )}

      {/* 主路径 */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEndToUse}
        style={getEdgeStyle()}
        onClick={handleEdgeClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`enhanced-edge ${data.status || ''} ${selected ? 'selected' : ''}`}
      />

      <EdgeLabelRenderer>


        {/* 成功标记 */}
        {data.status === 'success' && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 16,
              pointerEvents: 'all',
            }}
            className="edge-success-badge"
          >
            ✓
          </div>
        )}



        {/* 错误标记和问号 */}
        {data.status === 'error' && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            className="edge-error-marks"
          >
            <span className="edge-error-mark">✗</span>
            <button
              className="edge-error-info"
              onClick={handleErrorClick}
              title="查看错误信息"
            >
              ?
            </button>
          </div>
        )}

        {/* 错误信息提示框 */}
        {data.status === 'error' && showTooltip && data.errorMessage && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'rgba(31, 41, 55, 0.95)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 8,
              boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
              maxWidth: 280,
              fontSize: 12,
            }}
          >
            {data.errorMessage}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default EnhancedEdge;
