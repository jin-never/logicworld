import React, { useState, useEffect } from 'react';
import './RecentEditsPage.css';

const RecentEditsPage = () => {
  const [recentEdits, setRecentEdits] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    // 模拟最近编辑数据
    const mockData = [
      {
        id: 1,
        title: '项目规划思维导图',
        lastEdit: '2024-07-16 14:30:25',
        editType: 'modified',
        changes: '添加了3个新节点',
        category: 'work',
        thumbnail: null
      },
      {
        id: 2,
        title: '学习计划',
        lastEdit: '2024-07-16 10:15:42',
        editType: 'created',
        changes: '创建了新的思维导图',
        category: 'study',
        thumbnail: null
      },
      {
        id: 3,
        title: '旅行计划',
        lastEdit: '2024-07-15 16:45:18',
        editType: 'modified',
        changes: '更新了行程安排',
        category: 'personal',
        thumbnail: null
      },
      {
        id: 4,
        title: '产品功能分析',
        lastEdit: '2024-07-15 09:22:33',
        editType: 'modified',
        changes: '重新组织了功能模块',
        category: 'work',
        thumbnail: null
      },
      {
        id: 5,
        title: '读书笔记',
        lastEdit: '2024-07-14 20:18:55',
        editType: 'modified',
        changes: '添加了新的章节笔记',
        category: 'study',
        thumbnail: null
      },
      {
        id: 6,
        title: '会议记录',
        lastEdit: '2024-07-13 14:30:12',
        editType: 'created',
        changes: '创建了会议记录导图',
        category: 'work',
        thumbnail: null
      }
    ];
    setRecentEdits(mockData);
  }, []);

  const getFilteredEdits = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return recentEdits.filter(edit => {
      const editDate = new Date(edit.lastEdit);
      switch (timeFilter) {
        case 'today':
          return editDate >= today;
        case 'yesterday':
          return editDate >= yesterday && editDate < today;
        case 'week':
          return editDate >= weekAgo;
        default:
          return true;
      }
    });
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const editTime = new Date(dateString);
    const diffMs = now - editTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else {
      return `${diffDays}天前`;
    }
  };

  const getEditTypeIcon = (type) => {
    switch (type) {
      case 'created':
        return '✨';
      case 'modified':
        return '✏️';
      case 'deleted':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getEditTypeName = (type) => {
    switch (type) {
      case 'created':
        return '创建';
      case 'modified':
        return '修改';
      case 'deleted':
        return '删除';
      default:
        return '编辑';
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

  const filteredEdits = getFilteredEdits();

  return (
    <div className="recent-edits-page">
      <div className="page-header">
        <div className="header-content">
          <h1>最近编辑</h1>
          <p>查看您最近的编辑活动和修改记录</p>
        </div>
      </div>

      <div className="filter-section">
        <div className="time-filters">
          <button
            className={`filter-btn ${timeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTimeFilter('all')}
          >
            <span>全部</span>
          </button>
          <button
            className={`filter-btn ${timeFilter === 'today' ? 'active' : ''}`}
            onClick={() => setTimeFilter('today')}
          >
            <span>今天</span>
          </button>
          <button
            className={`filter-btn ${timeFilter === 'yesterday' ? 'active' : ''}`}
            onClick={() => setTimeFilter('yesterday')}
          >
            <span>昨天</span>
          </button>
          <button
            className={`filter-btn ${timeFilter === 'week' ? 'active' : ''}`}
            onClick={() => setTimeFilter('week')}
          >
            <span>本周</span>
          </button>
        </div>
      </div>

      <div className="edits-container">
        {filteredEdits.length > 0 ? (
          filteredEdits.map(edit => (
            <div key={edit.id} className="edit-item">
              <div className="edit-thumbnail">
                {edit.thumbnail ? (
                  <img src={edit.thumbnail} alt={edit.title} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <span className="category-icon">{getCategoryIcon(edit.category)}</span>
                  </div>
                )}
              </div>

              <div className="edit-content">
                <div className="edit-header">
                  <h3 className="edit-title">{edit.title}</h3>
                  <div className="edit-type">
                    <span className="type-icon">{getEditTypeIcon(edit.editType)}</span>
                    <span className="type-text">{getEditTypeName(edit.editType)}</span>
                  </div>
                </div>

                <p className="edit-changes">{edit.changes}</p>

                <div className="edit-meta">
                  <span className="edit-time">{getTimeAgo(edit.lastEdit)}</span>
                  <span className="edit-date">{edit.lastEdit}</span>
                </div>
              </div>

              <div className="edit-actions">
                <button className="btn-action" title="打开">
                  📂
                </button>
                <button className="btn-action" title="查看详情">
                  👁️
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>暂无编辑记录</h3>
            <p>
              {timeFilter === 'all'
                ? '您还没有编辑过任何思维导图'
                : '在选定的时间范围内没有编辑记录'
              }
            </p>
            <button className="load-more-btn">
              创建新导图
            </button>
          </div>
        )}
      </div>

      {filteredEdits.length > 0 && (
        <div className="load-more-section">
          <button className="load-more-btn">
            加载更多记录
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentEditsPage;
