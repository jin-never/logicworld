import React, { useState } from 'react';
import './GenericConfigForm.css';
import { summarizeDescription } from './services/aiSummaryService';
import { safeExecute } from './utils/errorSuppressor';

// GenericConfigForm renders dynamic form based on a schema
// Props:
//   schema: { title, fields }
//   initialValues?: object
//   onSave: (finalConfig) => void
//   onCancel?: () => void
const GenericConfigForm = ({ schema, initialValues = {}, onSave, onCancel, hideTitle = false, isSaving = false }) => {
  const [formData, setFormData] = useState(() => {
    // merge defaults from schema placeholder (if number) etc.
    const obj = {};
    schema.fields.forEach((f) => {
      obj[f.key] = initialValues[f.key] ?? '';
    });
    return obj;
  });

  // AI总结相关状态
  const [originalDescriptions, setOriginalDescriptions] = useState({});
  const [summarizingFields, setSummarizingFields] = useState(new Set());

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // 处理字段变化
  const handleFieldChange = (key, newValue) => {
    setFormData(prev => ({ ...prev, [key]: newValue }));
  };

  const handleSubmit = () => {
    // 增强的必填字段验证
    const missing = schema.fields.filter((f) => {
      if (!f.required) return false;
      const value = formData[f.key];
      // 检查空值、空字符串、只有空格的字符串
      return !value || (typeof value === 'string' && !value.trim());
    });

    if (missing.length) {
      alert(`请填写以下必填字段：${missing.map((m) => m.label).join('、')}`);
      return;
    }
    onSave?.(formData);
  };

  const renderField = (field) => {
    const { key, label, type, placeholder, options } = field;
    const value = formData[key] ?? '';
    switch (type) {
      case 'password':
      case 'text':
        return (
          <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      case 'select':
        return (
          <select value={value} onChange={(e) => {
            safeExecute(() => {
              handleChange(key, e.target.value);
            }, `GenericConfigForm-${key}-select`);
          }}>
            {(options || []).map((opt) => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      default:
        return null;
      case 'kvlist':
        return (
          <KVListInput value={value} onChange={(v) => handleChange(key, v)} />
        );
    }
  };

  // 特殊处理 Transport 字段
  const transportField = schema.fields.find(f => f.key === 'transport');
  const otherFields = schema.fields.filter(f => f.key !== 'transport');

  return (
    <div className={hideTitle ? "config-form-content" : "generic-config-card"}>
      {!hideTitle && <h2>{schema.title}</h2>}

      {/* Transport 选择器 */}
      {transportField && (
        <div className="transport-selector">
          <label>
            {transportField.label}
            {transportField.required ? <span> *</span> : null}
          </label>
          {renderField(transportField)}
        </div>
      )}

      {/* 其他字段 */}
      <div className="form-container">
        {otherFields.map((field) => (
          <div key={field.key} className="form-row">
            <label>
              {field.label}
              {field.required ? <span> *</span> : null}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button
          className="primary-btn"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
        {onCancel && (
          <button className="secondary-btn" onClick={onCancel} disabled={isSaving}>取消</button>
        )}
      </div>
    </div>
  );
};

// --- 子组件 Key-Value List Input ---
const KVListInput = ({ value, onChange }) => {
  const list = Array.isArray(value) ? value : [{ key: '', value: '' }];

  const update = (idx, field, val) => {
    const copy = list.map((row, i) => (i === idx ? { ...row, [field]: val } : row));
    onChange(copy);
  };

  const addRow = () => {
    onChange([...list, { key: '', value: '' }]);
  };

  const removeRow = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {list.map((row, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center', width: '100%' }}>
          <input
            placeholder="KEY"
            style={{ flex: 1, minWidth: 0 }}
            value={row.key}
            onChange={(e) => update(idx, 'key', e.target.value)}
          />
          <input
            placeholder="VALUE"
            style={{ flex: 1.2, minWidth: 0 }}
            value={row.value}
            onChange={(e) => update(idx, 'value', e.target.value)}
          />
          <button
            onClick={() => removeRow(idx)}
            style={{ flexShrink: 0, minWidth: '32px' }}
          >
            -
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow}>+ 添加变量</button>
    </div>
  );
};

export default GenericConfigForm; 