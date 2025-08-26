import React, { useState, useEffect, useCallback } from 'react';
import './OutputFileBrowser.css';

const OutputFileBrowser = ({ isVisible, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  console.log('OutputFileBrowser rendered, isVisible:', isVisible);

  // 文件类型与应用程序的映射
  const getFileTypeInfo = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const fileTypeMap = {
      // Office文档
      'docx': { 
        icon: '📄', 
        color: '#2B5CB0', 
        app: 'Microsoft Word',
        category: 'document'
      },
      'doc': { 
        icon: '📄', 
        color: '#2B5CB0', 
        app: 'Microsoft Word',
        category: 'document'
      },
      'xlsx': { 
        icon: '📊', 
        color: '#1D7044', 
        app: 'Microsoft Excel',
        category: 'spreadsheet'
      },
      'xls': { 
        icon: '📊', 
        color: '#1D7044', 
        app: 'Microsoft Excel',
        category: 'spreadsheet'
      },
      'pptx': { 
        icon: '📽️', 
        color: '#D24726', 
        app: 'Microsoft PowerPoint',
        category: 'presentation'
      },
      'ppt': { 
        icon: '📽️', 
        color: '#D24726', 
        app: 'Microsoft PowerPoint',
        category: 'presentation'
      },
      
      // PDF文档
      'pdf': { 
        icon: '📕', 
        color: '#FF0000', 
        app: 'PDF阅读器',
        category: 'document'
      },
      
      // 文本文档
      'txt': { 
        icon: '📝', 
        color: '#666666', 
        app: '记事本',
        category: 'text'
      },
      'md': { 
        icon: '📋', 
        color: '#084C61', 
        app: 'Markdown编辑器',
        category: 'text'
      },
      
      // 图片文件
      'jpg': { 
        icon: '🖼️', 
        color: '#FF6B6B', 
        app: '图片查看器',
        category: 'image'
      },
      'jpeg': { 
        icon: '🖼️', 
        color: '#FF6B6B', 
        app: '图片查看器',
        category: 'image'
      },
      'png': { 
        icon: '🖼️', 
        color: '#4ECDC4', 
        app: '图片查看器',
        category: 'image'
      },
      'gif': { 
        icon: '🎞️', 
        color: '#FFE66D', 
        app: '图片查看器',
        category: 'image'
      },
      
      // 其他文件
      'zip': { 
        icon: '🗜️', 
        color: '#FFA726', 
        app: '压缩软件',
        category: 'archive'
      },
      'json': { 
        icon: '⚙️', 
        color: '#FFC107', 
        app: '代码编辑器',
        category: 'data'
      }
    };

    return fileTypeMap[extension] || { 
      icon: '📄', 
      color: '#757575', 
      app: '默认应用',
      category: 'unknown'
    };
  };

  // 获取文件列表
  const fetchFiles = useCallback(async () => {
    console.log('开始获取文件列表...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/files/output');
      if (!response.ok) {
        throw new Error('获取文件列表失败');
      }
      
      const data = await response.json();
      console.log('API响应:', data);
      
      // 为每个文件添加类型信息
      const filesWithTypeInfo = data.files.map(file => ({
        ...file,
        typeInfo: getFileTypeInfo(file.name)
      }));
      
      setFiles(filesWithTypeInfo);
      console.log('文件列表已更新:', filesWithTypeInfo);
    } catch (err) {
      console.error('获取文件列表错误:', err);
      setError(err.message);
      
      // 模拟一些文件数据作为演示
      const mockFiles = [
        { name: 'document.docx', size: 36864, modified: new Date().toISOString() },
        { name: 'hello.docx', size: 36864, modified: new Date().toISOString() },
        { name: '晋.docx', size: 36864, modified: new Date().toISOString() },
        { name: '项目测试报告.docx', size: 36864, modified: new Date().toISOString() },
        { name: '演示文档.txt', size: 1039, modified: new Date().toISOString() }
      ].map(file => ({
        ...file,
        typeInfo: getFileTypeInfo(file.name)
      }));
      
      setFiles(mockFiles);
      console.log('使用模拟数据:', mockFiles);
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开文件
  const openFile = useCallback(async (file) => {
    try {
      console.log('打开文件:', file.name);
      
      // 构建文件URL
      const fileUrl = `/api/files/output/${encodeURIComponent(file.name)}`;
      
      // 根据文件类型决定打开方式
      const { category } = file.typeInfo;
      
      if (category === 'document' || category === 'spreadsheet' || category === 'presentation') {
        // Office文档：尝试在新窗口中打开
        window.open(fileUrl, '_blank');
      } else if (category === 'image') {
        // 图片：在新窗口中预览
        window.open(fileUrl, '_blank');
      } else if (category === 'text') {
        // 文本文件：在浏览器中打开
        window.open(fileUrl, '_blank');
      } else {
        // 其他文件：下载
        downloadFile(file);
      }
      
      setSelectedFile(file);
      
      // 显示操作提示
      console.log(`正在使用 ${file.typeInfo.app} 打开文件: ${file.name}`);
      
    } catch (err) {
      console.error('打开文件失败:', err);
      alert(`打开文件失败: ${err.message}`);
    }
  }, []);

  // 下载文件
  const downloadFile = useCallback(async (file) => {
    try {
      console.log('下载文件:', file.name);
      
      const response = await fetch(`/api/files/output/${encodeURIComponent(file.name)}`);
      if (!response.ok) {
        throw new Error('下载文件失败');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`文件已下载: ${file.name}`);
    } catch (err) {
      console.error('下载文件失败:', err);
      alert(`下载文件失败: ${err.message}`);
    }
  }, []);

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 初始化时获取文件列表
  useEffect(() => {
    if (isVisible) {
      console.log('文件浏览器变为可见，获取文件列表');
      fetchFiles();
    }
  }, [isVisible, fetchFiles]);

  if (!isVisible) {
    console.log('OutputFileBrowser not visible, returning null');
    return null;
  }

  console.log('OutputFileBrowser is visible, rendering...');

  return (
    <div className="output-file-browser-overlay">
      <div className="output-file-browser">
        <div className="file-browser-header">
          <h3>📁 输出文件浏览器</h3>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={fetchFiles}
              disabled={loading}
            >
              🔄 刷新
            </button>
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="file-browser-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>正在加载文件列表...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <p>使用模拟数据进行演示</p>
              <button onClick={fetchFiles}>重试</button>
            </div>
          )}

          {!loading && files.length === 0 && (
            <div className="empty-state">
              <p>📂 output 目录暂无文件</p>
              <p>运行工作流后，生成的文件将会显示在这里</p>
            </div>
          )}

          {!loading && files.length > 0 && (
            <div className="files-list">
              <div className="files-header">
                <span className="col-name">文件名</span>
                <span className="col-type">类型</span>
                <span className="col-size">大小</span>
                <span className="col-modified">修改时间</span>
                <span className="col-actions">操作</span>
              </div>
              
              {files.map((file, index) => (
                <div 
                  key={index} 
                  className={`file-item ${selectedFile?.name === file.name ? 'selected' : ''}`}
                  onDoubleClick={() => openFile(file)}
                >
                  <div className="file-info">
                    <span 
                      className="file-icon"
                      style={{ color: file.typeInfo.color }}
                    >
                      {file.typeInfo.icon}
                    </span>
                    <span className="file-name" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  
                  <div className="file-type">
                    <span className="app-name">{file.typeInfo.app}</span>
                  </div>
                  
                  <div className="file-size">
                    {formatFileSize(file.size)}
                  </div>
                  
                  <div className="file-modified">
                    {formatDate(file.modified)}
                  </div>
                  
                  <div className="file-actions">
                    <button 
                      className="open-btn"
                      onClick={() => openFile(file)}
                      title={`用 ${file.typeInfo.app} 打开`}
                    >
                      📂 打开
                    </button>
                    <button 
                      className="download-btn"
                      onClick={() => downloadFile(file)}
                      title="下载文件"
                    >
                      💾 下载
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="file-browser-footer">
          <p className="file-count">
            {files.length > 0 ? `共 ${files.length} 个文件` : ''}
          </p>
          <p className="tip">
            💡 双击文件可直接打开，或使用右侧按钮进行操作
          </p>
        </div>
      </div>
    </div>
  );
};

export default OutputFileBrowser; 