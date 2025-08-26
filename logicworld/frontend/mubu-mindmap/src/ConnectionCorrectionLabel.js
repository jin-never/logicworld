import React, { useState, useEffect } from 'react';
import './ConnectionCorrectionLabel.css';

/**
 * 连接纠正标签组件
 * 显示在被系统纠正的连接线上，提示用户连接点已被自动匹配
 */
const ConnectionCorrectionLabel = ({
  edge,
  sourceX,
  sourceY,
  targetX,
  targetY
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  // 自动隐藏逻辑 - 移到条件检查之前
  useEffect(() => {
    if (!edge.data?.connectionCorrected) return;

    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300); // 等待淡出动画完成
    }, 3000); // 3秒后开始淡出

    return () => clearTimeout(timer);
  }, [edge.data?.connectionCorrected]);

  // 如果连接没有被纠正，不显示标签
  if (!edge.data?.connectionCorrected) {
    return null;
  }

  // 计算标签位置（连接线中点）
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  if (!isVisible) return null;

  return (
    <div
      className={`connection-correction-label ${isAnimating ? 'animate-in' : 'animate-out'}`}
      style={{
        position: 'absolute',
        left: labelX,
        top: labelY,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      <div className="correction-badge">
        <div className="correction-icon">🎯</div>
        <div className="correction-text">
          <div className="correction-title">动态连接优化</div>
          <div className="correction-detail">连接点已适应连线方向</div>
        </div>
      </div>
      
      {/* 详细信息气泡 */}
      <div className="correction-tooltip">
        <div className="tooltip-content">
          <div className="tooltip-title">动态连接系统</div>
          <div className="tooltip-message">{edge.data.correctionMessage}</div>
          <div className="tooltip-original">
            用户选择: {edge.data.originalSourceHandle || '自动'} → {edge.data.originalTargetHandle || '自动'}
          </div>
          <div className="tooltip-corrected">
            系统优化: {edge.data.sourceHandle} → {edge.data.targetHandle}
          </div>
          <div className="tooltip-direction">
            连接方向: {edge.data.direction || '智能选择'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionCorrectionLabel;
