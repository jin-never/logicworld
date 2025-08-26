import React, { useState, useEffect } from 'react';
import { WordOperationDetector } from '../utils/wordOperationDetector';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import './WordOperationHint.css';

const WordOperationHint = ({ 
  taskDescription, 
  filename, 
  onOperationUpdate 
}) => {
  const [operationInfo, setOperationInfo] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);

  // 检测任务类型
  useEffect(() => {
    if (taskDescription) {
      const info = WordOperationDetector.generateSuggestion(taskDescription);
      setOperationInfo(info);
      
      // 通知父组件操作类型变化
      if (onOperationUpdate) {
        onOperationUpdate(info);
      }
    }
  }, [taskDescription, onOperationUpdate]);

  // 处理文档预览操作
  const handleDocumentAction = (actionData) => {
    setSelectedOperation(actionData);
    setShowPreview(false);
    
    // 通知父组件选中的操作
    if (onOperationUpdate) {
      onOperationUpdate({
        ...operationInfo,
        selectedAction: actionData
      });
    }
  };

  if (!operationInfo || !operationInfo.needsPreciseLocation) {
    return null;
  }

  return (
    <div className="word-operation-hint">
      <div className="hint-header">
        <div className="hint-icon">🎯</div>
        <div className="hint-title">智能定位建议</div>
        <div className="confidence-badge">
          可信度: {Math.round(operationInfo.confidence * 100)}%
        </div>
      </div>

      <div className="hint-content">
        <div className="operation-info">
          <div className="operation-type">
            <span className="label">操作类型：</span>
            <span className="value">{operationInfo.description}</span>
          </div>
          
          {operationInfo.detectedKeywords.length > 0 && (
            <div className="detected-keywords">
              <span className="label">检测到：</span>
              {operationInfo.detectedKeywords.map((keyword, index) => (
                <span key={index} className="keyword-tag">
                  {keyword}
                </span>
              ))}
            </div>
          )}

          {operationInfo.targetTexts.length > 0 && (
            <div className="target-texts">
              <span className="label">目标文本：</span>
              {operationInfo.targetTexts.map((text, index) => (
                <span key={index} className="target-tag">
                  "{text}"
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="suggestion-box">
          <div className="suggestion-text">
            {operationInfo.suggestion}
          </div>
          
          <button 
            className="preview-button"
            onClick={() => setShowPreview(true)}
            disabled={!filename}
          >
            📄 打开文档精确定位
          </button>
        </div>

        {selectedOperation && (
          <div className="selected-operation">
            <div className="operation-summary">
              <div className="summary-header">✅ 已选择操作：</div>
              <div className="summary-details">
                <div className="detail-item">
                  <span className="detail-label">选中文本：</span>
                  <span className="detail-value">"{selectedOperation.selectedText}"</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">操作类型：</span>
                  <span className="detail-value">{selectedOperation.action}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">参数值：</span>
                  <span className="detail-value">{selectedOperation.value}</span>
                </div>
              </div>
              <button 
                className="reselect-button"
                onClick={() => setShowPreview(true)}
              >
                重新选择
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 文档预览弹窗 */}
      <DocumentPreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        filename={filename}
        onAction={handleDocumentAction}
      />
    </div>
  );
};

export default WordOperationHint; 