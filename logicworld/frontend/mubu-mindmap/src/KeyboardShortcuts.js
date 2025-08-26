import React, { useState } from 'react';
import './KeyboardShortcuts.css';

const KeyboardShortcuts = () => {
  const [isVisible, setIsVisible] = useState(false);

  const shortcuts = [
    {
      category: '节点操作',
      items: [
        { key: 'Tab', description: '添加子节点' },
        { key: 'Shift + Tab', description: '添加同级节点' },
        { key: 'Enter', description: '添加同级节点' },
        { key: 'Delete / Backspace', description: '删除选中节点' },
        { key: 'Escape', description: '取消选择' },
      ]
    },
    {
      category: '编辑操作',
      items: [
        { key: 'Ctrl + C', description: '复制节点' },
        { key: 'Ctrl + V', description: '粘贴节点' },
        { key: 'Ctrl + X', description: '剪切节点' },
        { key: 'Ctrl + D', description: '复制节点' },
        { key: '双击节点', description: '编辑节点文本' },
      ]
    },
    {
      category: '视图操作',
      items: [
        { key: 'Ctrl + L', description: '重新布局' },
        { key: 'Ctrl + F', description: '适应视图' },
        { key: '鼠标滚轮', description: '缩放画布' },
        { key: '拖拽空白区域', description: '移动画布' },
      ]
    },
    {
      category: '节点交互',
      items: [
        { key: '右键节点', description: '显示上下文菜单' },
        { key: '拖拽节点', description: '移动节点位置' },
        { key: '点击节点', description: '选择节点' },
        { key: '拖拽连接点', description: '创建连接' },
      ]
    }
  ];

  return (
    <>
      <button 
        className="shortcuts-toggle-btn"
        onClick={() => setIsVisible(!isVisible)}
        title="键盘快捷键帮助"
      >
        ⌨️
      </button>
      
      {isVisible && (
        <div className="shortcuts-overlay" onClick={() => setIsVisible(false)}>
          <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-header">
              <h3>键盘快捷键</h3>
              <button 
                className="shortcuts-close"
                onClick={() => setIsVisible(false)}
              >
                ×
              </button>
            </div>
            
            <div className="shortcuts-content">
              {shortcuts.map((category, index) => (
                <div key={index} className="shortcuts-category">
                  <h4>{category.category}</h4>
                  <div className="shortcuts-list">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="shortcut-item">
                        <span className="shortcut-key">{item.key}</span>
                        <span className="shortcut-description">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="shortcuts-footer">
              <p>💡 提示：在思维导图页面使用这些快捷键可以大大提高编辑效率</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcuts;
