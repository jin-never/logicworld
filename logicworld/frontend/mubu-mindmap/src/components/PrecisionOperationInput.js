import React from 'react';
import './PrecisionOperationInput.css';

const PrecisionOperationInput = ({ 
  operation, 
  index, 
  onRequirementChange, 
  onOpenPreview,
  onDelete,
  canDelete = false,
  onInputFocus // 新增：处理输入框聚焦的回调
}) => {
  
  // 处理输入框点击和聚焦事件
  const handleInputInteraction = (event) => {
    // 阻止事件冒泡，防止触发父节点（执行节点）的点击事件
    event.stopPropagation();
    
    if (onInputFocus) {
      onInputFocus(operation.id, index + 1, operation.requirement);
    }
  };

  return (
    <div className="precision-operation">
      <div className="operation-header">
        <span className="operation-title">文档操作 #{index + 1}:</span>
        {canDelete && (
          <button 
            type="button"
            className="delete-operation-btn"
            onClick={() => onDelete(operation.id)}
            title="删除此操作"
          >
            🗑️ 删除
          </button>
        )}
      </div>
      
      <div className="operation-content">
        <textarea
          placeholder="请输入操作要求，例如：将标题字体改为华文彩云"
          value={operation.requirement}
          onChange={(e) => onRequirementChange(operation.id, e.target.value)}
          onClick={handleInputInteraction} // 添加点击事件
          onFocus={handleInputInteraction} // 添加聚焦事件
          className="requirement-input nodrag nowheel"
          rows={2}
        />
        
        <div className="operation-actions">
          {/* 文档选择功能已移除 - 根据用户要求暂时移除，后续酌情开发 */}
          {/* 
          <button 
            type="button"
            onClick={() => onOpenPreview(operation.id, index + 1)}
            className="precision-select-btn"
            disabled={!operation.requirement.trim()}
            title={operation.requirement.trim() ? "文档选择文档内容" : "请先输入操作要求"}
          >
            🎯 文档选择
          </button>
          
          {operation.selectedText && (
            <div className="selected-preview">
              <span className="selected-label">已选择:</span>
              <span className="selected-text">"{operation.selectedText}"</span>
              {operation.targetDocument && (
                <span className="selected-document">来自: {operation.targetDocument}</span>
              )}
            </div>
          )}
          */}
        </div>
      </div>
    </div>
  );
};

export default PrecisionOperationInput; 