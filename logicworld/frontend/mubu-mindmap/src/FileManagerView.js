import React, { useState, useMemo, useCallback, memo } from 'react';
import './FileManagerView.css';
import { getFileIcon, formatFileSize, filterAndSortFiles } from './utils/fileUtils';

const FileManagerView = memo(({ nodeData, onClose, onDataChange }) => {
  const [searchTerm, setSearchTerm] = useState(nodeData?.searchQuery || '');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState(nodeData?.viewMode || 'grid');
  const [sortBy, setSortBy] = useState(nodeData?.sortBy || 'name');
  const [sortOrder, setSortOrder] = useState(nodeData?.sortOrder || 'asc');
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // 获取文件列表
  const files = nodeData?.selectedFiles || [];

  // 文件过滤和排序 - 使用工具函数
  const filteredAndSortedFiles = useMemo(() => {
    return filterAndSortFiles(files, searchTerm, sortBy, sortOrder);
  }, [files, searchTerm, sortBy, sortOrder]);

  // 文件预览
  const handleFilePreview = useCallback((file) => {
    setPreviewFile(file);
    setShowPreview(true);
  }, []);

  // 这些函数现在从工具文件导入

  // 处理文件夹选择
  const handleFolderSelect = useCallback(() => {
    // 创建一个隐藏的input元素来选择文件夹
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true; // 允许选择文件夹
    input.multiple = true;

    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        console.log('选择的文件夹包含文件:', files);
        // 这里可以处理选择的文件夹中的文件
        // 例如：上传文件、显示文件列表等
        if (onDataChange) {
          const processedFiles = files.map((file, index) => ({
            id: `file_${Date.now()}_${index}`,
            name: file.name,
            size: file.size,
            type: file.type,
            extension: file.name.split('.').pop()?.toLowerCase() || '',
            lastModified: file.lastModified
          }));

          onDataChange({
            ...nodeData,
            selectedFiles: [...(nodeData?.selectedFiles || []), ...processedFiles]
          });
        }
      }
    };

    input.click();
  }, [nodeData, onDataChange]);

  return (
    <>
      <div className="file-manager-container">
        {/* 顶部标题栏 - 重新设计 */}
        <div className="file-manager-header">
          <div className="header-left">
            <span className="folder-icon">📁</span>
            <h2>材料库</h2>
            <span className="material-count">{files.length} 个文件</span>
          </div>
          <div className="header-right">
            <button className="settings-btn" title="设置">⚙️</button>
            <button className="close-btn" onClick={onClose} title="关闭">✕</button>
          </div>
        </div>

        {/* 文件管理器内容 */}
        <div className="file-manager-content">
          {/* 工具栏 - 重新设计 */}
          <div className="toolbar">
            <div className="toolbar-left">
              <span className="file-manager-icon">📊</span>
              <span className="toolbar-title">文件管理中心</span>
            </div>
            <div className="toolbar-right">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="🔍 搜索文件名、类型或内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <button className="upload-btn" onClick={handleFolderSelect}>
                📤 添加文件
              </button>
            </div>
          </div>

          {/* 文件列表 */}
          <div className="file-list">
            {filteredAndSortedFiles.length > 0 ? (
              filteredAndSortedFiles.map(file => (
                <div
                  key={file.id}
                  className={`file-item ${viewMode} ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
                  onClick={() => handleFilePreview(file)}
                >
                  <div className="file-icon">{getFileIcon(file)}</div>
                  <div className="file-info">
                    <div className="file-name" title={file.name}>
                      {file.name}
                      {file.compressed && <span className="compressed-badge">压缩</span>}
                    </div>
                    <div className="file-details">
                      {formatFileSize(file.size)} • {file.extension?.toUpperCase() || 'Unknown'}
                      {file.lastModified && ` • ${new Date(file.lastModified).toLocaleDateString()}`}
                    </div>
                  </div>
                  {nodeData?.previewEnabled && (
                    <div className="file-actions">
                      <button
                        className="preview-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFilePreview(file);
                        }}
                        title="预览文件"
                      >
                        👁️
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state" onClick={handleFolderSelect}>
                <div className="empty-icon">📁</div>
                <div className="empty-text">开始构建您的材料库</div>
                <div className="empty-hint">
                  拖拽文件到此处或点击上传按钮<br/>
                  支持多种格式：文档、图片、音频、视频等
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 文件预览模态框 */}
      {showPreview && previewFile && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewFile.name}</h3>
              <button
                className="close-preview-btn"
                onClick={() => setShowPreview(false)}
              >
                ✕
              </button>
            </div>
            <div className="preview-body">
              <div className="file-preview-info">
                <div className="preview-icon">{getFileIcon(previewFile)}</div>
                <div className="preview-details">
                  <p><strong>文件名:</strong> {previewFile.name}</p>
                  <p><strong>大小:</strong> {formatFileSize(previewFile.size)}</p>
                  <p><strong>类型:</strong> {previewFile.extension?.toUpperCase() || 'Unknown'}</p>
                  {previewFile.lastModified && (
                    <p><strong>修改时间:</strong> {new Date(previewFile.lastModified).toLocaleString()}</p>
                  )}
                  {previewFile.compressed && (
                    <p><strong>状态:</strong> <span className="compressed-badge">已压缩</span></p>
                  )}
                </div>
              </div>

              {/* 这里可以添加实际的文件预览内容 */}
              <div className="preview-placeholder">
                <p>文件预览功能正在开发中...</p>
                <p>支持的格式: 图片、文本、PDF等</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default FileManagerView;
