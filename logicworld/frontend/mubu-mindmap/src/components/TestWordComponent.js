import React from 'react';

const TestWordComponent = () => {
  return (
    <div style={{
      background: '#f0f8ff',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '16px',
      margin: '12px 0'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#007bff' }}>
        📝 Word精确操作测试
      </h4>
      <div style={{
        background: 'white',
        border: '2px dashed #007bff',
        borderRadius: '6px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer'
      }}>
        <span style={{ fontSize: '18px' }}>🎯</span>
        <span style={{ marginLeft: '8px' }}>点击选择文档位置和内容</span>
      </div>
      <button style={{
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        marginTop: '12px',
        cursor: 'pointer'
      }}>
        ➕ 添加操作
      </button>
    </div>
  );
};

export default TestWordComponent; 