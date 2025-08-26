import React, { useState, useMemo } from 'react';
import './FolderExpandedView.css';

// 文件类型分类配置
const fileCategories = {
    office: {
      name: 'Office',
      extensions: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
      icon: '📋',
      color: '#2563eb'
    },
    document: {
      name: '文档',
      extensions: ['.txt', '.pdf', '.rtf', '.odt', '.pages', '.md', '.markdown', '.tex', '.epub', '.mobi'],
      icon: '📄',
      color: '#3b82f6'
    },
    spreadsheet: {
      name: '表格',
      extensions: ['.csv', '.ods', '.numbers', '.tsv'],
      icon: '📊',
      color: '#059669'
    },
    image: {
      name: '图片',
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif', '.raw', '.heic', '.avif'],
      icon: '🖼️',
      color: '#10b981'
    },
    video: {
      name: '视频',
      extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.3gp', '.ogv', '.ts'],
      icon: '🎬',
      color: '#7c3aed'
    },
    audio: {
      name: '音频',
      extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.ape'],
      icon: '🎵',
      color: '#f59e0b'
    },
    code: {
      name: '代码',
      extensions: ['.js', '.html', '.css', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.ts', '.jsx', '.tsx', '.vue', '.swift', '.kt', '.rs', '.scala', '.sh', '.bat', '.ps1', '.sql', '.json', '.xml', '.yaml', '.yml'],
      icon: '💻',
      color: '#6366f1'
    },
    archive: {
      name: '压缩',
      extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.lzma', '.dmg', '.iso'],
      icon: '📦',
      color: '#8b5cf6'
    },
    font: {
      name: '字体',
      extensions: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
      icon: '🔤',
      color: '#ec4899'
    },
    other: {
      name: '其他',
      extensions: ['.log', '.tmp', '.bak', '.cfg', '.ini', '.conf', '.dat', '.bin', '.exe', '.msi', '.deb', '.rpm', '.apk', '.ipa', '.dmg', '.pkg', '.torrent', '.lnk', '.url', '.desktop', '.app'],
      icon: '📁',
      color: '#6b7280'
    }
  };

// 获取文件扩展名
const getFileExtension = (filename) => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

// 根据文件扩展名确定分类
const getFileCategory = (filename) => {
  const extension = getFileExtension(filename);

  for (const [categoryKey, category] of Object.entries(fileCategories)) {
    if (categoryKey !== 'other' && category.extensions.includes(extension)) {
      return categoryKey;
    }
  }
  return 'other';
};

const FolderExpandedView = ({ folderData, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 格式化修改时间
  const formatModifiedTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  // 分类和过滤文件
  const categorizedFiles = useMemo(() => {
    if (!folderData?.folderFiles) return {};

    const categories = {};
    
    // 初始化所有分类
    Object.keys(fileCategories).forEach(key => {
      categories[key] = [];
    });

    // 分类文件
    folderData.folderFiles.forEach(file => {
      const category = getFileCategory(file.name);
      categories[category].push(file);
    });

    // 过滤搜索结果
    if (searchTerm) {
      Object.keys(categories).forEach(key => {
        categories[key] = categories[key].filter(file => 
          file.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    return categories;
  }, [folderData?.folderFiles, searchTerm]);

  // 获取显示的文件列表
  const displayFiles = useMemo(() => {
    if (selectedCategory === 'all') {
      return Object.values(categorizedFiles).flat();
    }
    return categorizedFiles[selectedCategory] || [];
  }, [categorizedFiles, selectedCategory]);

  // 计算统计信息
  const statistics = useMemo(() => {
    const stats = {};
    Object.entries(categorizedFiles).forEach(([key, files]) => {
      stats[key] = {
        count: files.length,
        totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0)
      };
    });
    return stats;
  }, [categorizedFiles]);

  if (!folderData) {
    return null;
  }

  return (
    <div className="folder-expanded-content">
      {/* 搜索栏 */}
      <div className="folder-search-bar">
        <input
          type="text"
          placeholder="搜索文件..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="folder-search-input"
        />
      </div>

      {/* 分类标签 */}
      <div className="folder-category-tabs">
        <button
          className={`folder-category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setSelectedCategory('all'); }}
        >
          全部 ({Object.values(statistics).reduce((sum, stat) => sum + stat.count, 0)})
        </button>
        {Object.entries(fileCategories).map(([key, category]) => {
          const stat = statistics[key] || { count: 0, totalSize: 0 };
          // "其他"分类始终显示，其他分类只在有文件时显示
          if (key !== 'other' && stat.count === 0) {
            return null;
          }
          return (
            <button
              key={key}
              className={`folder-category-tab ${selectedCategory === key ? 'active' : ''} ${stat.count === 0 ? 'disabled' : ''}`}
              onClick={(e) => { e.stopPropagation(); setSelectedCategory(key); }}
              disabled={stat.count === 0}
            >
              {category.icon} {category.name} ({stat.count})
            </button>
          );
        })}
      </div>

      {/* 统计信息 */}
      <div className="folder-statistics">
        <div className="folder-stats-grid">
          {Object.entries(fileCategories).map(([key, category]) => {
            const stat = statistics[key] || { count: 0, totalSize: 0 };
            // 只显示有文件的分类的统计卡片
            if (stat.count > 0) {
              return (
                <div
                  key={key}
                  className={`folder-stat-card ${selectedCategory === key ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedCategory(key); }}
                  title={`点击查看${category.name}文件`}
                >
                  <span className="folder-stat-icon">{category.icon}</span>
                  <span className="folder-stat-text">
                    {stat.count} 个 · {formatFileSize(stat.totalSize)}
                  </span>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* 文件列表 */}
      <div className="folder-files-section">
        <div className="folder-files-header">
          {selectedCategory === 'all' ? '所有文件' : fileCategories[selectedCategory]?.name}
          ({displayFiles.length})
        </div>
        <div className="folder-files-list">
          {displayFiles.length === 0 ? (
            <div className="folder-empty-state">
              <div className="folder-empty-icon">📂</div>
              <div className="folder-empty-text">
                {searchTerm ? '没有找到匹配的文件' : '此分类暂无文件'}
              </div>
            </div>
          ) : (
            <>
              {displayFiles.slice(0, 50).map((file, index) => {
                const category = getFileCategory(file.name);
                const categoryInfo = fileCategories[category];

                return (
                  <div key={index} className="folder-file-item" title={`${file.name} (${formatFileSize(file.size || 0)})`}>
                    <span className="folder-file-icon" style={{ color: categoryInfo.color }}>
                      {categoryInfo.icon}
                    </span>
                    <div className="folder-file-info">
                      <div className="folder-file-name">
                        {file.name}
                      </div>
                      <div className="folder-file-details">
                        <span className="folder-file-size">
                          {formatFileSize(file.size || 0)}
                        </span>
                        <span className="folder-file-type">
                          {categoryInfo.name}
                        </span>
                        {file.lastModified && (
                          <span className="folder-file-time">
                            {formatModifiedTime(file.lastModified)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {displayFiles.length > 50 && (
                <div className="folder-more-files">
                  <span className="folder-more-icon">⋯</span>
                  还有 {displayFiles.length - 50} 个文件未显示
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderExpandedView;
