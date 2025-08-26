import React, { useState, useEffect } from 'react';
import './TrashPage.css';

const TrashPage = () => {
  const [trashedItems, setTrashedItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortBy, setSortBy] = useState('deleted');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    // 模拟回收站数据
    const mockData = [
      {
        id: 1,
        title: '旧版项目规划',
        description: '之前的项目规划版本，已被新版本替代',
        category: 'work',
        deletedDate: '2024-07-14',
        originalPath: '工作文件夹',
        size: '2.3 MB',
        daysLeft: 16,
        thumbnail: null
      },
      {
        id: 2,
        title: '临时会议记录',
        description: '临时会议的记录，会议已结束',
        category: 'work',
        deletedDate: '2024-07-12',
        originalPath: '会议记录',
        size: '1.1 MB',
        daysLeft: 18,
        thumbnail: null
      },
      {
        id: 3,
        title: '学习笔记草稿',
        description: '学习笔记的草稿版本',
        category: 'study',
        deletedDate: '2024-07-10',
        originalPath: '学习资料',
        size: '0.8 MB',
        daysLeft: 20,
        thumbnail: null
      },
      {
        id: 4,
        title: '过期的旅行计划',
        description: '已经过期的旅行计划',
        category: 'personal',
        deletedDate: '2024-07-08',
        originalPath: '个人文件',
        size: '1.5 MB',
        daysLeft: 22,
        thumbnail: null
      },
      {
        id: 5,
        title: '测试导图',
        description: '用于测试功能的临时导图',
        category: 'project',
        deletedDate: '2024-07-05',
        originalPath: '测试文件夹',
        size: '0.5 MB',
        daysLeft: 25,
        thumbnail: null
      }
    ];
    setTrashedItems(mockData);
  }, []);

  const handleRestore = (id) => {
    const item = trashedItems.find(item => item.id === id);
    if (window.confirm(`确定要恢复 "${item.title}" 吗？`)) {
      setTrashedItems(prev => prev.filter(item => item.id !== id));
      alert('已恢复到原位置');
    }
  };

  const handlePermanentDelete = (id) => {
    const item = trashedItems.find(item => item.id === id);
    if (window.confirm(`确定要永久删除 "${item.title}" 吗？此操作无法撤销！`)) {
      setTrashedItems(prev => prev.filter(item => item.id !== id));
      alert('已永久删除');
    }
  };

  const handleBatchRestore = () => {
    if (selectedItems.length === 0) return;
    if (window.confirm(`确定要恢复选中的 ${selectedItems.length} 个项目吗？`)) {
      setTrashedItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      alert('已批量恢复');
    }
  };

  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;
    if (window.confirm(`确定要永久删除选中的 ${selectedItems.length} 个项目吗？此操作无法撤销！`)) {
      setTrashedItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      alert('已批量删除');
    }
  };

  const handleEmptyTrash = () => {
    if (trashedItems.length === 0) return;
    if (window.confirm('确定要清空回收站吗？所有项目将被永久删除，此操作无法撤销！')) {
      setTrashedItems([]);
      setSelectedItems([]);
      alert('回收站已清空');
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === trashedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(trashedItems.map(item => item.id));
    }
  };

  const getSortedItems = () => {
    const sorted = [...trashedItems];
    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'deleted':
        return sorted.sort((a, b) => new Date(b.deletedDate) - new Date(a.deletedDate));
      case 'size':
        return sorted.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
      case 'daysLeft':
        return sorted.sort((a, b) => a.daysLeft - b.daysLeft);
      default:
        return sorted;
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      work: '💼',
      study: '📚',
      personal: '👤',
      project: '🚀'
    };
    return icons[category] || '📋';
  };

  const getDaysLeftColor = (days) => {
    if (days <= 7) return '#dc3545'; // 红色
    if (days <= 14) return '#ffc107'; // 黄色
    return '#28a745'; // 绿色
  };

  const sortedItems = getSortedItems();

  return (
    <div className="trash-page">
      <div className="page-header">
        <div className="header-content">
          <h1>回收站</h1>
          <p>管理已删除的思维导图，30天后将自动永久删除</p>
        </div>
        <div className="header-actions">
          {trashedItems.length > 0 && (
            <button
              className="btn-danger"
              onClick={handleEmptyTrash}
            >
              清空回收站
            </button>
          )}
        </div>
      </div>

      {trashedItems.length > 0 && (
        <div className="controls-section">
          <div className="selection-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedItems.length === trashedItems.length}
                onChange={handleSelectAll}
              />
              全选 ({selectedItems.length}/{trashedItems.length})
            </label>

            {selectedItems.length > 0 && (
              <div className="batch-actions">
                <button
                  className="btn-success"
                  onClick={handleBatchRestore}
                >
                  批量恢复 ({selectedItems.length})
                </button>
                <button
                  className="btn-danger"
                  onClick={handleBatchDelete}
                >
                  批量删除 ({selectedItems.length})
                </button>
              </div>
            )}
          </div>

          <div className="sort-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="deleted">删除时间</option>
              <option value="title">标题</option>
              <option value="size">文件大小</option>
              <option value="daysLeft">剩余天数</option>
            </select>
          </div>
        </div>
      )}

      <div className="trash-container">
        {sortedItems.length > 0 ? (
          sortedItems.map(item => (
            <div key={item.id} className="trash-item">
              <div className="item-checkbox">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                />
              </div>

              <div className="item-thumbnail">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <span className="category-icon">{getCategoryIcon(item.category)}</span>
                  </div>
                )}
              </div>

              <div className="item-content">
                <div className="item-header">
                  <h3 className="item-title">{item.title}</h3>
                  <div
                    className="days-left"
                    style={{ color: getDaysLeftColor(item.daysLeft) }}
                  >
                    {item.daysLeft}天后永久删除
                  </div>
                </div>

                <p className="item-description">{item.description}</p>

                <div className="item-meta">
                  <div className="meta-item">
                    <span className="meta-label">原路径:</span>
                    <span className="meta-value">{item.originalPath}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">删除时间:</span>
                    <span className="meta-value">{item.deletedDate}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">大小:</span>
                    <span className="meta-value">{item.size}</span>
                  </div>
                </div>
              </div>

              <div className="item-actions">
                <button
                  className="btn-restore"
                  onClick={() => handleRestore(item.id)}
                  title="恢复"
                >
                  ↩️ 恢复
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handlePermanentDelete(item.id)}
                  title="永久删除"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🗑️</div>
            <h3>回收站为空</h3>
            <p>没有已删除的思维导图</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashPage;
