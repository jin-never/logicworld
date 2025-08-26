import React, { useState, useRef, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import './FolderSelectorNode.css';

const FolderSelectorNode = memo(({ id, data, selected, onNodeDataChange }) => {
  const [selectedFolder, setSelectedFolder] = useState(data?.selectedFolder || '');
  const fileInputRef = useRef(null);

  const handleFolderSelect = () => {
    // 创建一个隐藏的文件输入元素来选择文件夹
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFolderChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // 获取第一个文件的路径，然后提取文件夹路径
      const filePath = files[0].webkitRelativePath || files[0].name;
      const folderPath = filePath.split('/')[0] || '选择的文件夹';
      
      setSelectedFolder(folderPath);
      
      // 通知父组件数据变化
      if (onNodeDataChange) {
        onNodeDataChange(id, { 
          ...data, 
          selectedFolder: folderPath,
          label: folderPath || '开始'
        });
      }
    }
  };

  const nodeClasses = [
    'folder-selector-node',
    selected ? 'selected' : '',
    data?.className || ''
  ].join(' ').trim();

  return (
    <div
      className={nodeClasses}
      style={{
        width: '70px',
        height: '28px',
        minWidth: '70px',
        maxWidth: '70px',
        minHeight: '28px',
        maxHeight: '28px'
      }}
    >
      <Handle type="target" position={Position.Top} />
      
      {/* 隐藏的文件输入元素 */}
      <input
        ref={fileInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderChange}
      />
      
      <div className="folder-node-content">
        {/* 主要内容区域 */}
        <div className="folder-main-content">
          <div className="folder-label">
            {selectedFolder || data?.label || '开始'}
          </div>
        </div>
        
        {/* 右上角文件夹图标 */}
        <div className="folder-icon" onClick={handleFolderSelect} title="选择文件夹">
          📁
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

export default FolderSelectorNode;
