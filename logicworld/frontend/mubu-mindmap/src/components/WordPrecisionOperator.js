import React, { useState } from 'react';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import './WordPrecisionOperator.css';

const WordPrecisionOperator = ({ 
  filename = '成功了.docx',
  onOperationsChange 
}) => {
  const [operations, setOperations] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentOperationIndex, setCurrentOperationIndex] = useState(null);

  // 添加新的操作框
  const addOperation = () => {
    const newOperation = {
      id: Date.now(),
      selectedText: '',
      action: '',
      value: '',
      position: null,
      runId: null
    };
    const newOperations = [...operations, newOperation];
    setOperations(newOperations);
    if (onOperationsChange) {
      onOperationsChange(newOperations);
    }
  };

  // 删除操作框
  const removeOperation = (index) => {
    const newOperations = operations.filter((_, i) => i !== index);
    setOperations(newOperations);
    if (onOperationsChange) {
      onOperationsChange(newOperations);
    }
  };

  // 点击操作框，打开文档预览弹窗
  const handleOperationClick = (index) => {
    setCurrentOperationIndex(index);
    setShowDialog(true);
  };

  // 处理文档预览中的选择
  const handleDocumentAction = (actionData) => {
    if (currentOperationIndex !== null) {
      const newOperations = [...operations];
      newOperations[currentOperationIndex] = {
        ...newOperations[currentOperationIndex],
        selectedText: actionData.selectedText,
        action: actionData.action,
        value: actionData.value,
        position: actionData.position,
        runId: actionData.selectedRunId
      };
      setOperations(newOperations);
      if (onOperationsChange) {
        onOperationsChange(newOperations);
      }
    }
    setShowDialog(false);
    setCurrentOperationIndex(null);
  };

  return (
    <div className="word-precision-operator">
      <div className="operator-header">
        <h4>📝 Word精确操作</h4>
        <button 
          className="add-operation-btn"
          onClick={addOperation}
          title="添加新的操作"
        >
          ➕ 添加操作
        </button>
      </div>

      {operations.length === 0 && (
        <div className="empty-state">
          <p>点击"添加操作"开始精确定位Word文档中的内容</p>
        </div>
      )}

      <div className="operations-list">
        {operations.map((operation, index) => (
          <div key={operation.id} className="operation-item">
            <div className="operation-header">
              <span className="operation-number">#{index + 1}</span>
              <button 
                className="remove-operation-btn"
                onClick={() => removeOperation(index)}
                title="删除此操作"
              >
                ❌
              </button>
            </div>
            
            <div 
              className="operation-input-box"
              onClick={() => handleOperationClick(index)}
              title="点击进行精确定位"
            >
              {operation.selectedText ? (
                <div className="operation-content">
                  <div className="selected-info">
                    <span className="selected-text">"{operation.selectedText}"</span>
                    <span className="selected-action">{operation.action}</span>
                    <span className="selected-value">{operation.value}</span>
                  </div>
                </div>
              ) : (
                <div className="placeholder-content">
                  <span className="placeholder-icon">🎯</span>
                  <span className="placeholder-text">点击选择文档位置和内容</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 文档预览弹窗 - 固定在右上角 */}
      <DocumentPreviewDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setCurrentOperationIndex(null);
        }}
        filename={filename}
        onAction={handleDocumentAction}
        position="top-right" // 新增位置属性
      />
    </div>
  );
};

export default WordPrecisionOperator; 