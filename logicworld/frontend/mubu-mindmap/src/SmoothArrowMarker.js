import React from 'react';

const SmoothArrowMarker = ({ id = 'smooth-arrow', color = '#7c3aed' }) => {
  return (
    <defs>
      {/* 丝滑连接的三角形箭头 */}
      <marker
        id={id}
        markerWidth="6"
        markerHeight="5"
        refX="1"
        refY="2.5"
        orient="auto"
        markerUnits="strokeWidth"
        viewBox="0 0 6 5"
        style={{ overflow: 'visible' }}
      >
        {/* 丝滑连接的三角形箭头 */}
        <path
          d="M 0,0 L 0,5 L 5,2.5 z"
          fill={color}
          stroke="white"
          strokeWidth="0.25"
          style={{
            filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2))'
          }}
        />
      </marker>
      
      {/* 选中状态的智能三角形箭头 */}
      <marker
        id={`${id}-selected`}
        markerWidth="16"
        markerHeight="14"
        refX="10"
        refY="7"
        orient="auto"
        markerUnits="strokeWidth"
        viewBox="0 0 16 14"
      >
        {/* 更大的三角形箭头，表示选中状态 */}
        <path
          d="M 0,0 L 0,14 L 13,7 z"
          fill="#3b82f6"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="0.5"
          style={{
            filter: 'drop-shadow(0 2px 6px rgba(59, 130, 246, 0.4))'
          }}
        />
        {/* 选中状态的内部高光 */}
        <path
          d="M 1.5,2 L 1.5,12 L 10,7 z"
          fill="rgba(255, 255, 255, 0.5)"
          stroke="none"
        />
        {/* 脉冲动画效果 */}
        <circle cx="6" cy="7" r="1.5" fill="rgba(255, 255, 255, 0.8)">
          <animate
            attributeName="r"
            values="1;2;1"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </marker>

      {/* 执行动画状态的智能三角形箭头 */}
      <marker
        id={`${id}-animated`}
        markerWidth="14"
        markerHeight="12"
        refX="9"
        refY="6"
        orient="auto"
        markerUnits="strokeWidth"
        viewBox="0 0 14 12"
      >
        {/* 执行中的三角形箭头，带有能量流动效果 */}
        <path
          d="M 0,0 L 0,12 L 11,6 z"
          fill="#60a5fa"
          stroke="rgba(96, 165, 250, 0.6)"
          strokeWidth="0.5"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(96, 165, 250, 0.3))'
          }}
        >
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
        {/* 能量流动效果 */}
        <path
          d="M 1.5,2 L 1.5,10 L 8.5,6 z"
          fill="rgba(255, 255, 255, 0.6)"
          stroke="none"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.8;0.3"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
        {/* 执行脉冲点 */}
        <circle cx="5" cy="6" r="1" fill="rgba(255, 255, 255, 0.9)">
          <animate
            attributeName="r"
            values="0.5;1.5;0.5"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </circle>
      </marker>

      {/* 工具连接专用的智能三角形箭头 */}
      <marker
        id="tool-arrow"
        markerWidth="12"
        markerHeight="10"
        refX="8"
        refY="5"
        orient="auto"
        markerUnits="strokeWidth"
        viewBox="0 0 12 10"
      >
        {/* 工具连接的三角形箭头 */}
        <path
          d="M 0,0 L 0,10 L 10,5 z"
          fill="#fbbf24"
          stroke="rgba(251, 191, 36, 0.4)"
          strokeWidth="0.3"
          style={{
            filter: 'drop-shadow(0 1px 3px rgba(251, 191, 36, 0.3))'
          }}
        />
        {/* 工具箭头的内部高光 */}
        <path
          d="M 1,2 L 1,8 L 8,5 z"
          fill="rgba(255, 255, 255, 0.4)"
          stroke="none"
        />
      </marker>

      {/* 工具连接选中状态的智能三角形箭头 */}
      <marker
        id="tool-arrow-selected"
        markerWidth="14"
        markerHeight="12"
        refX="9"
        refY="6"
        orient="auto"
        markerUnits="strokeWidth"
        viewBox="0 0 14 12"
      >
        {/* 选中状态的工具三角形箭头 */}
        <path
          d="M 0,0 L 0,12 L 11,6 z"
          fill="#f59e0b"
          stroke="rgba(245, 158, 11, 0.6)"
          strokeWidth="0.5"
          style={{
            filter: 'drop-shadow(0 2px 5px rgba(245, 158, 11, 0.4))'
          }}
        />
        {/* 选中工具箭头的内部高光 */}
        <path
          d="M 1.5,2 L 1.5,10 L 8.5,6 z"
          fill="rgba(255, 255, 255, 0.6)"
          stroke="none"
        />
      </marker>
    </defs>
  );
};

export default SmoothArrowMarker;
