import React, { useState, useEffect } from 'react';
import { WordOperationDetector } from '../utils/wordOperationDetector';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import './WordOperationHint.css';

const WordOperationHint = ({ 
  taskDescription, 
  filename, 
  onOperationUpdate,
  children // 新增：用于包装输入框
}) => {
  const [suggestion, setSuggestion] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);

  useEffect(() => {
    if (taskDescription) {
      const result = WordOperationDetector.generateSuggestion(taskDescription);
      if (result.needsPreciseLocation) {
        setSuggestion(result);
        if (onOperationUpdate) {
          onOperationUpdate(result);
        }
      } else {
        setSuggestion(null);
        if (onOperationUpdate) {
          onOperationUpdate({ needsPreciseLocation: false });
        }
      }
    }
  }, [taskDescription, onOperationUpdate]);

  const handleFrameClick = () => {
    if (suggestion?.needsPreciseLocation) {
      setShowDialog(true);
    }
  };

  const handleDocumentAction = (actionData) => {
    setSelectedOperation(actionData);
    setShowDialog(false);
    
    if (onOperationUpdate) {
      onOperationUpdate({
        ...suggestion,
        selectedAction: actionData
      });
    }
  };

  // 如果需要精确定位，返回带边框的容器
  if (suggestion?.needsPreciseLocation) {
    return (
      <div className="word-operation-hint-wrapper">
        {/* 可点击的边框容器 */}
        <div 
          className="precision-frame" 
          onClick={handleFrameClick}
          title="点击进行精确定位"
        >
          {children}
          
          {/* 定位提示标签 */}
          <div className="precision-indicator">
            <span className="precision-icon">🎯</span>
            <span className="precision-text">点击定位</span>
          </div>
        </div>

        {/* 检测到的操作信息 */}
        <div className="operation-info">
          <span className="operation-type">{suggestion.operationType}</span>
          {suggestion.targetTexts.length > 0 && (
            <span className="target-hint">
              可能目标: {suggestion.targetTexts.join(', ')}
            </span>
          )}
        </div>

        {/* 已选择的操作显示 */}
        {selectedOperation && (
          <div className="selected-operation">
            <span className="selected-icon">✅</span>
            <span className="selected-text">
              已选定: "{selectedOperation.selectedText}" → {selectedOperation.action}: {selectedOperation.value}
            </span>
          </div>
        )}

        {/* 文档预览弹窗 */}
        <DocumentPreviewDialog
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          filename={filename}
          onAction={handleDocumentAction}
        />
      </div>
    );
  }

  // 如果不需要精确定位，直接返回子组件
  return children || null;
};

export default WordOperationHint; 