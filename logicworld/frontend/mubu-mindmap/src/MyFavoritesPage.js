import React, { useState, useEffect } from 'react';
import './MyFavoritesPage.css';

const MyFavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    // 模拟收藏数据
    const mockFavorites = [
      {
        id: 1,
        title: '项目规划思维导图',
        description: '2024年度项目规划和里程碑设置',
        category: 'work',
        favoriteDate: '2024-07-15',
        collection: 'work-plans',
        author: '我',
        isPublic: false,
        thumbnail: null,
        tags: ['项目管理', '规划']
      },
      {
        id: 2,
        title: 'React学习路线',
        description: 'React和前端技术学习路线图',
        category: 'study',
        favoriteDate: '2024-07-14',
        collection: 'learning',
        author: '张三',
        isPublic: true,
        thumbnail: null,
        tags: ['React', '前端', '学习']
      },
      {
        id: 3,
        title: '产品设计流程',
        description: '完整的产品设计流程和方法论',
        category: 'work',
        favoriteDate: '2024-07-12',
        collection: 'design',
        author: '李四',
        isPublic: true,
        thumbnail: null,
        tags: ['产品设计', '流程']
      },
      {
        id: 4,
        title: '健身计划',
        description: '个人健身训练计划和营养搭配',
        category: 'personal',
        favoriteDate: '2024-07-10',
        collection: 'personal',
        author: '我',
        isPublic: false,
        thumbnail: null,
        tags: ['健身', '健康']
      }
    ];

    const mockCollections = [
      { id: 'work-plans', name: '工作规划', count: 1, color: '#007bff' },
      { id: 'learning', name: '学习资料', count: 1, color: '#28a745' },
      { id: 'design', name: '设计相关', count: 1, color: '#ffc107' },
      { id: 'personal', name: '个人生活', count: 1, color: '#dc3545' }
    ];

    setFavorites(mockFavorites);
    setCollections(mockCollections);
  }, []);

  const getFilteredFavorites = () => {
    if (selectedCollection === 'all') {
      return favorites;
    }
    return favorites.filter(fav => fav.collection === selectedCollection);
  };

  const handleOpenMindMap = (id) => {
    // 这里可以添加打开思维导图的逻辑
    console.log('打开思维导图:', id);
    // 例如：window.location.href = `/mindmap/${id}`;
  };

  const handleRemoveFromFavorites = (id) => {
    if (window.confirm('确定要从收藏中移除这个思维导图吗？')) {
      setFavorites(prev => prev.filter(fav => fav.id !== id));
    }
  };

  const handleMoveToCollection = (favoriteId, collectionId) => {
    setFavorites(prev => prev.map(fav =>
      fav.id === favoriteId ? { ...fav, collection: collectionId } : fav
    ));
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      const newCollection = {
        id: Date.now().toString(),
        name: newCollectionName.trim(),
        count: 0,
        color: '#6c757d'
      };
      setCollections(prev => [...prev, newCollection]);
      setNewCollectionName('');
      setShowNewCollection(false);
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

  const filteredFavorites = getFilteredFavorites();

  return (
    <div className="my-favorites-page">
      <div className="page-header">
        <div className="header-content">
          <h1>我的收藏</h1>
          <p>管理您收藏的思维导图和收藏夹</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowNewCollection(true)}
        >
          + 新建收藏夹
        </button>
      </div>

      <div className="page-layout">
        <div className="collections-sidebar">
          <div className="collections-header">
            <h3>收藏夹</h3>
          </div>

          <div className="collections-list">
            <div
              className={`collection-item ${selectedCollection === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCollection('all')}
            >
              <div className="collection-info">
                <span className="collection-icon">📁</span>
                <span className="collection-name">全部收藏</span>
              </div>
              <span className="collection-count">{favorites.length}</span>
            </div>

            {collections.map(collection => (
              <div
                key={collection.id}
                className={`collection-item ${selectedCollection === collection.id ? 'active' : ''}`}
                onClick={() => setSelectedCollection(collection.id)}
              >
                <div className="collection-info">
                  <span
                    className="collection-color"
                    style={{ backgroundColor: collection.color }}
                  ></span>
                  <span className="collection-name">{collection.name}</span>
                </div>
                <span className="collection-count">{collection.count}</span>
              </div>
            ))}
          </div>

          {showNewCollection && (
            <div className="new-collection-form">
              <input
                type="text"
                placeholder="收藏夹名称"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
              />
              <div className="form-actions">
                <button onClick={handleCreateCollection} className="btn-primary btn-sm">
                  创建
                </button>
                <button onClick={() => setShowNewCollection(false)} className="btn-secondary btn-sm">
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="favorites-content">
          <div className="content-header">
            <div className="view-controls">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                网格视图
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                列表视图
              </button>
            </div>
          </div>

          <div className={`favorites-container ${viewMode}`}>
            {filteredFavorites.length > 0 ? (
              filteredFavorites.map(favorite => (
                <div key={favorite.id} className="favorite-card">
                  <div className="card-thumbnail" onClick={() => handleOpenMindMap(favorite.id)}>
                    {favorite.thumbnail ? (
                      <img src={favorite.thumbnail} alt={favorite.title} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <span className="category-icon">{getCategoryIcon(favorite.category)}</span>
                      </div>
                    )}
                  </div>

                  <div className="card-content">
                    <div className="card-header">
                      <h3 className="card-title">{favorite.title}</h3>
                      <div className="card-actions">
                        <button
                          className="btn-action"
                          onClick={() => handleRemoveFromFavorites(favorite.id)}
                          title="取消收藏"
                        >
                          ❤️
                        </button>
                      </div>
                    </div>

                    <p className="card-description">{favorite.description}</p>

                    <div className="card-meta">
                      <div className="meta-item">
                        <span className="meta-label">作者:</span>
                        <span className="meta-value">{favorite.author}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">收藏:</span>
                        <span className="meta-value">{favorite.favoriteDate}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">状态:</span>
                        <span className="meta-value">
                          {favorite.isPublic ? '🌐 公开' : '🔒 私有'}
                        </span>
                      </div>
                    </div>

                    {favorite.tags && favorite.tags.length > 0 && (
                      <div className="card-tags">
                        {favorite.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">⭐</div>
                <h3>暂无收藏</h3>
                <p>
                  {selectedCollection === 'all'
                    ? '您还没有收藏任何思维导图'
                    : '此收藏夹中暂无内容'
                  }
                </p>
                <button className="btn-primary">
                  浏览思维导图
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyFavoritesPage;
