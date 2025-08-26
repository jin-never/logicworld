import React from 'react';
import { TOOL_CATEGORIES } from '../constants/toolCategories';

/**
 * 工具分类选择器组件
 * 用于在工具配置页面选择功能分类
 */
const CategorySelector = ({ 
  value, 
  onChange, 
  required = true, 
  style = {},
  placeholder = "请选择功能分类",
  showDescription = false,
  disabled = false
}) => {
  return (
    <div style={{ marginBottom: '16px', ...style }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontWeight: 'bold',
        color: '#374151',
        fontSize: '14px'
      }}>
        功能分类 {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          backgroundColor: disabled ? '#f9fafb' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? '#9ca3af' : '#374151'
        }}
        required={required}
      >
        <option value="">{placeholder}</option>
        {Object.entries(TOOL_CATEGORIES).map(([categoryId, category]) => (
          <option key={categoryId} value={categoryId}>
            {category.name}
          </option>
        ))}
      </select>
      
      {/* 显示选中分类的描述 */}
      {showDescription && value && TOOL_CATEGORIES[value] && (
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          marginTop: '6px',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          border: '1px solid #e5e7eb'
        }}>
          <strong>{TOOL_CATEGORIES[value].name}：</strong>
          {TOOL_CATEGORIES[value].description}
        </div>
      )}
      
      {/* 帮助文本 */}
      <div style={{ 
        fontSize: '12px', 
        color: '#6b7280', 
        marginTop: '4px' 
      }}>
        选择工具的功能分类，用于智能匹配和分类管理
      </div>
    </div>
  );
};

export default CategorySelector;
