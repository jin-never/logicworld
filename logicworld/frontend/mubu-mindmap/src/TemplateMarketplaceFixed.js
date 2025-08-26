import React, { useState, useEffect } from 'react';
import './TemplateSelector.css';

const TemplateMarketplace = ({ isOpen, onClose, onSelectTemplate, currentNodes, currentEdges }) => {
  // 基础状态
  const [currentTab, setCurrentTab] = useState('browse');
  const [templates, setTemplates] = useState([]);
  const [myTemplates, setMyTemplates] = useState([]);
  const [savedMindmaps, setSavedMindmaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 上传相关状态
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'all',
    market: 'free',
    tags: []
  });
  const [selectedMindmap, setSelectedMindmap] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // 模板详情相关状态
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDetail, setTemplateDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [detailTab, setDetailTab] = useState('info');
  const [isLiked, setIsLiked] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);

  // 分类选项
  const categories = ['all', '项目管理', '商业分析', '教育培训', '软件开发', '数据科学', '创意设计', '生活办公', '其他'];
  const [selectedCategory, setSelectedCategory] = useState('all'); // 新增状态
  const [selectedMarket, setSelectedMarket] = useState('all'); // 新增市场类型筛选状态

  // 加载模板数据
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/template-marketplace');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates || []);
      } else {
        setError('加载模板失败');
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载我的模板
  const loadMyTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/my-templates');
      const data = await response.json();
      
      if (data.success) {
        setMyTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('加载我的模板失败:', error);
    }
  };

  // 加载保存的思维导图
  const loadSavedMindmaps = async () => {
    try {
      const mindmaps = [];
      
      // 从localStorage获取当前思维导图
      const currentMindmap = localStorage.getItem('mindmap-data');
      if (currentMindmap) {
        const data = JSON.parse(currentMindmap);
        mindmaps.push({
          id: 'current',
          title: '当前思维导图',
          description: '当前正在编辑的思维导图',
          nodes: currentNodes || [],
          edges: currentEdges || [],
          created_at: new Date().toISOString()
        });
      }
      
      // 从后端获取保存的思维导图
      const response = await fetch('http://localhost:8000/api/mindmaps');
      if (response.ok) {
        const data = await response.json();
        if (data.mindmaps) {
          mindmaps.push(...data.mindmaps.map(mindmap => ({
            id: mindmap.id,
            title: mindmap.title || '未命名思维导图',
            description: mindmap.description || '保存的思维导图',
            nodes: mindmap.nodes || [],
            edges: mindmap.edges || [],
            created_at: mindmap.created_at
          })));
        }
      }
      
      setSavedMindmaps(mindmaps);
    } catch (error) {
      console.error('加载保存的思维导图失败:', error);
    }
  };

  // 使用模板
  const handleUseTemplate = (template) => {
    // 确认对话框
    const confirmed = window.confirm(`确定要使用模板"${template.title}"吗？这将替换当前的思维导图内容。`);
    if (confirmed && onSelectTemplate) {
      // 调用父组件的模板选择回调
      onSelectTemplate({
        nodes: template.nodes || [],
        edges: template.edges || [],
        templateInfo: {
          id: template.id,
          title: template.title,
          author: template.author?.name || '未知作者'
        }
      });
      
      // 关闭模板市场，返回思维导图编辑页面
      onClose();
      
      // 显示成功提示
      setTimeout(() => {
        alert(`已成功应用模板"${template.title}"！`);
      }, 500);
    }
  };

  // 收藏/取消收藏模板
  const handleToggleFavorite = async (templateId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/template/${templateId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'anonymous'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsFavorited(data.favorited);
        setTotalFavorites(data.total_favorites);
        
        // 如果在详情页，更新模板详情
        if (templateDetail && templateDetail.id === templateId) {
          setTemplateDetail(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              favorites: data.total_favorites
            }
          }));
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      setError('收藏操作失败，请重试');
    }
  };

  // 显示模板详情 - 改为切换标签页
  const handleTemplateDetail = (template) => {
    setSelectedTemplate(template);
    setCurrentTab('template-detail');
    loadTemplateDetail(template.id);
  };

  // 加载模板详情
  const loadTemplateDetail = async (templateId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/template/${templateId}`);
      const data = await response.json();
      
      if (data.success) {
        setTemplateDetail(data.template);
        setComments(data.comments || []);
        setTotalLikes(data.template.stats?.likes || 0);
        setTotalFavorites(data.template.stats?.favorites || 0);
        setIsLiked(data.is_liked || false);
        setIsFavorited(data.is_favorited || false);
      }
    } catch (error) {
      console.error('加载模板详情失败:', error);
    }
  };

  // 提交评论（无姓名输入）
  const handleSubmitComment = async () => {
    if (!newComment.trim() && newRating === 0) {
      setError('请输入评论内容或给出评分');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/template/${templateDetail.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: newComment.trim(),
          rating: newRating > 0 ? newRating : null,
          user_name: '当前用户' // 使用固定用户名，不再需要输入
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNewComment('');
        setNewRating(0);
        loadTemplateDetail(templateDetail.id); // 重新加载以更新统计信息
      } else {
        setError('评论提交失败: ' + data.error);
      }
    } catch (error) {
      console.error('提交评论失败:', error);
      setError('评论提交失败，请重试');
    }
  };

  // 初始化
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadMyTemplates();
      loadSavedMindmaps();
    }
  }, [isOpen]);

  // 星级评分组件
  const StarRating = ({ rating, onRatingChange, readonly = false }) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
            onClick={!readonly ? () => onRatingChange(star) : undefined}
            style={{ cursor: readonly ? 'default' : 'pointer' }}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  // 渲染浏览模板
  const renderBrowseTemplates = () => {
    // 双重筛选：按分类和市场类型
    let filteredTemplates = templates;
    
    // 按分类筛选
    if (selectedCategory !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.category === selectedCategory);
    }
    
    // 按市场类型筛选
    if (selectedMarket !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.market === selectedMarket);
    }

    return (
      <div className="browse-templates">
        {/* 重新设计的分类筛选器 */}
        <div className="category-filter">
          {/* 市场类型和模板分类在同一行 */}
          <div className="filter-section horizontal-layout">
            {/* 市场类型筛选 - 左侧 */}
            <div className="filter-group">
              <div className="filter-header">
                <span className="filter-label">💰 市场类型</span>
              </div>
              <div className="filter-tabs market-tabs">
                <button 
                  className={`filter-tab market-tab ${selectedMarket === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedMarket('all')}
                >
                  🌟 全部市场
                </button>
                <button 
                  className={`filter-tab market-tab free ${selectedMarket === 'free' ? 'active' : ''}`}
                  onClick={() => setSelectedMarket('free')}
                >
                  🆓 免费模板
                </button>
                <button 
                  className={`filter-tab market-tab premium ${selectedMarket === 'premium' ? 'active' : ''}`}
                  onClick={() => setSelectedMarket('premium')}
                >
                  💎 付费模板
                </button>
              </div>
            </div>

            {/* 模板分类筛选 - 右侧 */}
            <div className="filter-group">
              <div className="filter-header">
                <span className="filter-label">📂 模板分类</span>
              </div>
              <div className="filter-tabs category-tabs">
                <button 
                  className={`filter-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  全部分类
                </button>
                <button 
                  className={`filter-tab ${selectedCategory === '项目管理' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('项目管理')}
                >
                  项目管理
                </button>
                <button 
                  className={`filter-tab ${selectedCategory === '数据科学' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('数据科学')}
                >
                  数据科学
                </button>
                <button 
                  className={`filter-tab ${selectedCategory === '软件开发' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('软件开发')}
                >
                  软件开发
                </button>
                <button 
                  className={`filter-tab ${selectedCategory === '产品设计' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('产品设计')}
                >
                  产品设计
                </button>
                <button 
                  className={`filter-tab ${selectedCategory === '生活办公' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('生活办公')}
                >
                  生活办公
                </button>
                <button 
                  className={`filter-tab ${selectedCategory === '学习教育' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('学习教育')}
                >
                  学习教育
                </button>
              </div>
            </div>
          </div>

          {/* 筛选结果统计 */}
          <div className="filter-stats">
            <span>找到 <strong>{filteredTemplates.length}</strong> 个模板</span>
          </div>
        </div>
        
        <div className="templates-grid">
          {loading ? (
            <div className="loading">正在加载模板...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="no-templates">
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h4>没有找到匹配的模板</h4>
                <p>尝试调整筛选条件或浏览其他分类</p>
                <button 
                  className="reset-filter-btn"
                  onClick={() => {
                    setSelectedMarket('all');
                    setSelectedCategory('all');
                  }}
                >
                  🔄 查看全部模板
                </button>
              </div>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div key={template.id} className="template-card">
                {/* 市场类型标识 */}
                <div className="template-market-badge">
                  {template.market === 'free' ? (
                    <span className="market-badge free">🆓 免费</span>
                  ) : template.market === 'premium' ? (
                    <span className="market-badge premium">💎 付费</span>
                  ) : (
                    <span className="market-badge free">🆓 免费</span>
                  )}
                </div>
                
                <div className="template-preview">
                  📊 {template.metadata?.nodeCount || 0} 节点 • {template.metadata?.edgeCount || 0} 连接
                </div>
                <div className="template-info">
                  <h4>{template.title}</h4>
                  <p>{template.description}</p>
                  <div className="template-meta">
                    <span>👨‍💼 {template.author?.name || '未知作者'}</span>
                    <span>⭐ {template.stats?.rating || 0} ({template.stats?.total_ratings || 0}评分)</span>
                  </div>
                  <div className="template-actions">
                    <button 
                      className="use-template-btn"
                      onClick={() => handleUseTemplate(template)}
                    >
                      🚀 使用模板
                    </button>
                    <button 
                      className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
                      onClick={() => handleToggleFavorite(template.id)}
                    >
                      {isFavorited ? '❤️ 已收藏' : '🤍 收藏'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 渲染模板详情页面
  const renderTemplateDetail = () => (
    <div className="template-detail-page">
      <div className="detail-header-nav">
        <button 
          className="back-to-browse-btn"
          onClick={() => setCurrentTab('browse')}
        >
          ← 返回浏览
        </button>
        <div className="detail-title-area">
          <h3>📄 {templateDetail?.title || selectedTemplate?.title}</h3>
          <div className="detail-stats-inline">
            <StarRating rating={templateDetail?.stats?.rating || 0} readonly />
            <span>{templateDetail?.stats?.rating || 0} ({templateDetail?.stats?.total_ratings || 0}评分)</span>
            <span>👥 {templateDetail?.stats?.downloads || 0} 下载</span>
            <span>❤️ {totalLikes} 点赞</span>
            <span>⭐ {totalFavorites} 收藏</span>
          </div>
        </div>
        <button 
          className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
          onClick={() => handleToggleFavorite(templateDetail?.id)}
        >
          {isFavorited ? '❤️ 已收藏' : '🤍 收藏模板'}
        </button>
      </div>

      <div className="detail-sub-nav">
        <button 
          className={`tab-btn ${detailTab === 'info' ? 'active' : ''}`}
          onClick={() => setDetailTab('info')}
        >
          📋 基本信息
        </button>
        <button 
          className={`tab-btn ${detailTab === 'comments' ? 'active' : ''}`}
          onClick={() => setDetailTab('comments')}
        >
          💬 评论 ({comments.length})
        </button>
      </div>

      <div className="detail-tab-content">
        {detailTab === 'info' && (
          <div className="info-tab">
            <div className="template-detailed-info">
              {/* 模板概览 */}
              <div className="info-section template-overview">
                <h4>📋 模板概览</h4>
                <div className="overview-grid">
                  <div className="overview-item">
                    <div className="item-icon">📊</div>
                    <div className="item-content">
                      <div className="item-label">模板规模</div>
                      <div className="item-value">{templateDetail?.metadata?.nodeCount || 0} 节点 • {templateDetail?.metadata?.edgeCount || 0} 连接</div>
                    </div>
                  </div>
                  <div className="overview-item">
                    <div className="item-icon">📂</div>
                    <div className="item-content">
                      <div className="item-label">模板分类</div>
                      <div className="item-value">{templateDetail?.category || '未分类'}</div>
                    </div>
                  </div>
                  <div className="overview-item">
                    <div className="item-icon">📅</div>
                    <div className="item-content">
                      <div className="item-label">发布时间</div>
                      <div className="item-value">{new Date(templateDetail?.created_at || Date.now()).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="overview-item">
                    <div className="item-icon">🔄</div>
                    <div className="item-content">
                      <div className="item-label">最后更新</div>
                      <div className="item-value">{new Date(templateDetail?.updated_at || templateDetail?.created_at || Date.now()).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 模板描述 */}
              <div className="info-section template-description">
                <h4>📝 模板描述</h4>
                <div className="description-content">
                  <p>{templateDetail?.description || selectedTemplate?.description}</p>
                </div>
              </div>

              {/* 作者信息 */}
              <div className="info-section author-info">
                <h4>👨‍💼 作者信息</h4>
                <div className="author-card">
                  <div className="author-avatar">
                    <div className="avatar-icon">👤</div>
                  </div>
                  <div className="author-details">
                    <div className="author-name">{templateDetail?.author?.name || '未知作者'}</div>
                    <div className="author-stats">
                      <span className="author-stat">
                        <span className="stat-icon">📊</span>
                        <span className="stat-text">发布了 {myTemplates.length} 个模板</span>
                      </span>
                      <span className="author-stat">
                        <span className="stat-icon">⭐</span>
                        <span className="stat-text">平均评分 4.5</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 标签信息 */}
              {templateDetail?.tags && templateDetail.tags.length > 0 && (
                <div className="info-section template-tags">
                  <h4>🏷️ 模板标签</h4>
                  <div className="tags-container">
                    {templateDetail.tags.map((tag, index) => (
                      <span key={index} className="tag-item">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 使用统计 */}
              <div className="info-section usage-stats">
                <h4>📈 使用统计</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👁️</div>
                    <div className="stat-content">
                      <div className="stat-number">{templateDetail?.stats?.views || 0}</div>
                      <div className="stat-label">浏览次数</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📥</div>
                    <div className="stat-content">
                      <div className="stat-number">{templateDetail?.stats?.downloads || 0}</div>
                      <div className="stat-label">下载次数</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">❤️</div>
                    <div className="stat-content">
                      <div className="stat-number">{totalLikes}</div>
                      <div className="stat-label">点赞数</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-content">
                      <div className="stat-number">{totalFavorites}</div>
                      <div className="stat-label">收藏数</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 评分详情 */}
              <div className="info-section rating-details">
                <h4>⭐ 评分详情</h4>
                <div className="rating-breakdown">
                  <div className="overall-rating">
                    <div className="rating-score">
                      <span className="score-number">{templateDetail?.stats?.rating || 0}</span>
                      <span className="score-text">/ 5.0</span>
                    </div>
                    <div className="rating-stars">
                      <StarRating rating={templateDetail?.stats?.rating || 0} readonly />
                    </div>
                    <div className="rating-count">
                      基于 {templateDetail?.stats?.total_ratings || 0} 个评分
                    </div>
                  </div>
                  <div className="rating-bars">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = templateDetail?.stats?.rating_breakdown?.[star] || 0;
                      const total = templateDetail?.stats?.total_ratings || 1;
                      const percentage = (count / total) * 100;
                      return (
                        <div key={star} className="rating-bar">
                          <span className="bar-label">{star}星</span>
                          <div className="bar-container">
                            <div className="bar-fill" style={{width: `${percentage}%`}}></div>
                          </div>
                          <span className="bar-count">({count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 模板兼容性 */}
              <div className="info-section compatibility-info">
                <h4>🔧 兼容性信息</h4>
                <div className="compatibility-grid">
                  <div className="compatibility-item">
                    <div className="comp-icon">✅</div>
                    <div className="comp-text">支持所有主流浏览器</div>
                  </div>
                  <div className="compatibility-item">
                    <div className="comp-icon">📱</div>
                    <div className="comp-text">移动端友好</div>
                  </div>
                  <div className="compatibility-item">
                    <div className="comp-icon">💾</div>
                    <div className="comp-text">支持本地保存</div>
                  </div>
                  <div className="compatibility-item">
                    <div className="comp-icon">🔄</div>
                    <div className="comp-text">支持导入导出</div>
                  </div>
                </div>
              </div>

              {/* 使用建议 */}
              <div className="info-section usage-tips">
                <h4>💡 使用建议</h4>
                <div className="tips-list">
                  <div className="tip-item">
                    <div className="tip-icon">🎯</div>
                    <div className="tip-text">
                      <strong>适用场景：</strong>
                      {templateDetail?.category === '项目管理' && '项目规划、团队协作、进度跟踪'}
                      {templateDetail?.category === '数据科学' && '数据分析、机器学习、统计建模'}
                      {templateDetail?.category === '软件开发' && '系统设计、代码架构、开发流程'}
                      {templateDetail?.category === '商业分析' && '商业模式、市场分析、战略规划'}
                      {!templateDetail?.category && '多种业务场景，灵活应用'}
                    </div>
                  </div>
                  <div className="tip-item">
                    <div className="tip-icon">🔥</div>
                    <div className="tip-text">
                      <strong>使用技巧：</strong>根据实际需求调整节点内容，添加个性化信息
                    </div>
                  </div>
                  <div className="tip-item">
                    <div className="tip-icon">⚠️</div>
                    <div className="tip-text">
                      <strong>注意事项：</strong>使用前建议备份当前思维导图，避免数据丢失
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailTab === 'comments' && (
          <div className="comments-tab">
            <div className="comment-form">
              <h5>💬 发表评论</h5>
              <div className="rating-input">
                <span>评分：</span>
                <StarRating rating={newRating} onRatingChange={setNewRating} />
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="分享您对这个模板的看法..."
                className="comment-textarea"
                rows="4"
              />
              <button 
                className="submit-comment-btn"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() && newRating === 0}
              >
                🚀 发表评论
              </button>
            </div>

            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="no-comments">暂无评论，成为第一个评论者吧！</div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">👤 {comment.user_name}</span>
                      {comment.rating && (
                        <StarRating rating={comment.rating} readonly />
                      )}
                      <span className="comment-date">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="comment-content">
                      {comment.comment || '(仅评分，无评论内容)'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染上传模板页面
  const renderUploadTemplate = () => (
    <div className="upload-template-page">
      <div className="upload-progress-bar">
        <div className="progress-steps">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className={`progress-step ${uploadStep >= step ? 'active' : ''} ${uploadStep === step ? 'current' : ''}`}>
              <div className="step-number">{step}</div>
              <div className="step-label">
                {step === 1 && '基本信息'}
                {step === 2 && '选择思维导图'}
                {step === 3 && '市场设置'}
                {step === 4 && '确认发布'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="upload-content">
        {uploadStep === 1 && renderUploadStep1()}
        {uploadStep === 2 && renderUploadStep2()}
        {uploadStep === 3 && renderUploadStep3()}
        {uploadStep === 4 && renderUploadStep4()}
      </div>

      <div className="upload-actions">
        {uploadStep > 1 && (
          <button className="prev-btn" onClick={() => setUploadStep(uploadStep - 1)}>
            ← 上一步
          </button>
        )}
        {uploadStep < 4 && (
          <button 
            className="next-btn" 
            onClick={() => setUploadStep(uploadStep + 1)}
            disabled={!isStepValid()}
          >
            下一步 →
          </button>
        )}
        {uploadStep === 4 && (
          <button 
            className="publish-btn" 
            onClick={handleSubmitTemplate}
            disabled={!agreedToTerms}
          >
            🚀 发布模板
          </button>
        )}
      </div>
    </div>
  );

  // 检查当前步骤是否有效
  const isStepValid = () => {
    switch (uploadStep) {
      case 1:
        return uploadForm.title.trim() && uploadForm.description.trim();
      case 2:
        return selectedMindmap !== null;
      case 3:
        return uploadForm.category !== 'all';
      default:
        return true;
    }
  };

  // 步骤1：基本信息
  const renderUploadStep1 = () => (
    <div className="upload-step step-1">
      <h3>📝 模板基本信息</h3>
      <div className="form-group">
        <label>模板标题 *</label>
        <input
          type="text"
          value={uploadForm.title}
          onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
          placeholder="请输入模板标题"
          className="input-field"
        />
      </div>
      <div className="form-group">
        <label>模板描述 *</label>
        <textarea
          value={uploadForm.description}
          onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
          placeholder="详细描述模板的用途、特点和适用场景"
          className="textarea-field"
          rows="4"
        />
      </div>
      <div className="form-group">
        <label>标签</label>
        <input
          type="text"
          value={uploadForm.tags.join(', ')}
          onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
          placeholder="输入标签，用逗号分隔（如：项目管理, 流程图, 商业）"
          className="input-field"
        />
      </div>
    </div>
  );

  // 步骤2：选择思维导图
  const renderUploadStep2 = () => (
    <div className="upload-step step-2">
      <h3>🗺️ 选择思维导图</h3>
      <div className="mindmap-selection">
        {savedMindmaps.length === 0 ? (
          <div className="no-mindmaps">
            <p>暂无保存的思维导图</p>
            <p>请先在思维导图编辑器中创建并保存思维导图</p>
          </div>
        ) : (
          <div className="mindmap-grid">
            {savedMindmaps.map(mindmap => (
              <div 
                key={mindmap.id} 
                className={`mindmap-card ${selectedMindmap?.id === mindmap.id ? 'selected' : ''}`}
                onClick={() => setSelectedMindmap(mindmap)}
              >
                <div className="mindmap-preview">
                  📊 {mindmap.nodes?.length || 0} 节点 • {mindmap.edges?.length || 0} 连接
                </div>
                <div className="mindmap-info">
                  <h4>{mindmap.title}</h4>
                  <p>{mindmap.description}</p>
                  <div className="mindmap-date">
                    {new Date(mindmap.created_at).toLocaleDateString()}
                  </div>
                </div>
                {selectedMindmap?.id === mindmap.id && (
                  <div className="selected-indicator">✓</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedMindmap && (
        <div className="selected-info">
          <h4>已选择：{selectedMindmap.title}</h4>
          <button 
            className="clear-selection-btn"
            onClick={() => setSelectedMindmap(null)}
          >
            ✕ 取消选择
          </button>
        </div>
      )}
    </div>
  );

  // 步骤3：市场设置
  const renderUploadStep3 = () => (
    <div className="upload-step step-3">
      <h3>🏪 市场设置</h3>
      <div className="form-group">
        <label>模板分类 *</label>
        <select
          value={uploadForm.category}
          onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
          className="select-field"
        >
          <option value="all">请选择分类</option>
          {categories.slice(1).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>发布市场</label>
        <div className="market-options">
          <label className="radio-option">
            <input
              type="radio"
              value="free"
              checked={uploadForm.market === 'free'}
              onChange={(e) => setUploadForm({...uploadForm, market: e.target.value})}
            />
            <span>🆓 免费市场</span>
            <p>所有用户都可以免费使用此模板</p>
          </label>
          <label className="radio-option disabled">
            <input type="radio" value="premium" disabled />
            <span>💎 付费市场（开发中）</span>
            <p>用户需要付费购买此模板</p>
          </label>
        </div>
      </div>
    </div>
  );

  // 步骤4：确认发布
  const renderUploadStep4 = () => (
    <div className="upload-step step-4">
      <h3>✅ 确认发布</h3>
      <div className="publish-summary">
        <div className="summary-section">
          <h4>📋 模板信息</h4>
          <div className="info-item">
            <span className="label">标题：</span>
            <span className="value">{uploadForm.title}</span>
          </div>
          <div className="info-item">
            <span className="label">描述：</span>
            <span className="value">{uploadForm.description}</span>
          </div>
          <div className="info-item">
            <span className="label">分类：</span>
            <span className="value">{uploadForm.category}</span>
          </div>
          <div className="info-item">
            <span className="label">标签：</span>
            <span className="value">{uploadForm.tags.join(', ') || '无'}</span>
          </div>
        </div>
        
        <div className="summary-section">
          <h4>🗺️ 思维导图</h4>
          <div className="info-item">
            <span className="label">名称：</span>
            <span className="value">{selectedMindmap?.title}</span>
          </div>
          <div className="info-item">
            <span className="label">节点数：</span>
            <span className="value">{selectedMindmap?.nodes?.length || 0}</span>
          </div>
          <div className="info-item">
            <span className="label">连接数：</span>
            <span className="value">{selectedMindmap?.edges?.length || 0}</span>
          </div>
        </div>

        <div className="summary-section">
          <h4>🏪 发布设置</h4>
          <div className="info-item">
            <span className="label">市场：</span>
            <span className="value">{uploadForm.market === 'free' ? '🆓 免费市场' : '💎 付费市场'}</span>
          </div>
        </div>
      </div>

      <div className="terms-agreement">
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
          />
          <span>我已阅读并同意《模板发布协议》和《社区规范》</span>
        </label>
      </div>
    </div>
  );

  // 提交模板
  const handleSubmitTemplate = async () => {
    if (!agreedToTerms) {
      alert('请先同意服务条款');
      return;
    }

    try {
      const templateData = {
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        tags: uploadForm.tags,
        market: uploadForm.market,
        nodes: selectedMindmap?.nodes || [],
        edges: selectedMindmap?.edges || [],
        metadata: {
          nodeCount: selectedMindmap?.nodes?.length || 0,
          edgeCount: selectedMindmap?.edges?.length || 0
        },
        author: {
          name: '当前用户', // 实际应用中应该从用户系统获取
          id: 'current_user'
        }
      };

      const response = await fetch('http://localhost:8000/api/template-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('🎉 模板发布成功！');
        // 重置表单
        setUploadForm({
          title: '',
          description: '',
          category: 'all',
          market: 'free',
          tags: []
        });
        setSelectedMindmap(null);
        setUploadStep(1);
        setAgreedToTerms(false);
        
        // 刷新模板列表
        loadTemplates();
        loadMyTemplates();
        
        // 切换到浏览页面
        setCurrentTab('browse');
      } else {
        alert('发布失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('提交模板失败:', error);
      alert('发布失败，请检查网络连接');
    }
  };

  // 渲染我的模板页面
  const renderMyTemplates = () => (
    <div className="my-templates-page">
      <div className="my-templates-header">
        <h3>📚 我的模板</h3>
        <p>管理您发布的模板</p>
      </div>

      <div className="my-templates-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-number">{myTemplates.length}</div>
            <div className="stat-label">已发布模板</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-info">
            <div className="stat-number">{myTemplates.reduce((sum, t) => sum + (t.stats?.downloads || 0), 0)}</div>
            <div className="stat-label">总下载量</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-number">{myTemplates.reduce((sum, t) => sum + (t.stats?.total_ratings || 0), 0)}</div>
            <div className="stat-label">总评价数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div className="stat-info">
            <div className="stat-number">{myTemplates.reduce((sum, t) => sum + (t.stats?.likes || 0), 0)}</div>
            <div className="stat-label">总点赞数</div>
          </div>
        </div>
      </div>

      <div className="my-templates-list">
        {loading ? (
          <div className="loading">正在加载我的模板...</div>
        ) : myTemplates.length === 0 ? (
          <div className="no-templates">
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h4>还没有发布任何模板</h4>
              <p>点击"上传模板"开始分享您的思维导图模板</p>
              <button 
                className="upload-first-btn"
                onClick={() => setCurrentTab('upload')}
              >
                🚀 发布第一个模板
              </button>
            </div>
          </div>
        ) : (
          <div className="templates-grid">
            {myTemplates.map(template => (
              <div key={template.id} className="my-template-card">
                <div className="template-status">
                  <span className={`status-badge ${template.status || 'published'}`}>
                    {template.status === 'published' ? '✅ 已发布' : 
                     template.status === 'pending' ? '⏳ 审核中' : 
                     template.status === 'rejected' ? '❌ 已拒绝' : '✅ 已发布'}
                  </span>
                </div>
                
                <div className="template-preview">
                  📊 {template.metadata?.nodeCount || 0} 节点 • {template.metadata?.edgeCount || 0} 连接
                </div>
                
                <div className="template-info">
                  <h4>{template.title}</h4>
                  <p>{template.description}</p>
                  
                  <div className="template-meta">
                    <span>📅 {new Date(template.created_at || Date.now()).toLocaleDateString()}</span>
                    <span>📂 {template.category}</span>
                  </div>
                  
                  <div className="template-stats">
                    <div className="stat-item">
                      <span className="stat-icon">👁️</span>
                      <span className="stat-value">{template.stats?.downloads || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">⭐</span>
                      <span className="stat-value">{template.stats?.rating || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">💬</span>
                      <span className="stat-value">{template.stats?.total_ratings || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">❤️</span>
                      <span className="stat-value">{template.stats?.likes || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="template-actions">
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => handleEditMyTemplate(template)}
                  >
                    ✏️ 编辑
                  </button>
                  <button 
                    className="action-btn view-btn"
                    onClick={() => handleTemplateDetail(template)}
                  >
                    👁️ 查看
                  </button>
                  <button 
                    className="action-btn analytics-btn"
                    onClick={() => handleViewAnalytics(template)}
                  >
                    📊 数据
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteMyTemplate(template)}
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 编辑我的模板
  const handleEditMyTemplate = (template) => {
    alert(`编辑模板"${template.title}"功能开发中...`);
  };

  // 查看模板分析
  const handleViewAnalytics = (template) => {
    alert(`模板"${template.title}"的数据分析：\n\n📊 下载量：${template.stats?.downloads || 0}\n⭐ 平均评分：${template.stats?.rating || 0}\n💬 评论数：${template.stats?.total_ratings || 0}\n❤️ 点赞数：${template.stats?.likes || 0}`);
  };

  // 删除我的模板
  const handleDeleteMyTemplate = (template) => {
    const confirmed = window.confirm(`确定要删除模板"${template.title}"吗？此操作不可撤销。`);
    if (confirmed) {
      alert(`模板"${template.title}"删除功能开发中...`);
    }
  };

  // 主渲染
  return (
    <div className="template-marketplace-fullscreen">
      <div className="marketplace-nav">
        <button 
          className={`nav-tab ${currentTab === 'browse' ? 'active' : ''}`}
          onClick={() => setCurrentTab('browse')}
        >
          🔍 浏览模板
        </button>
        <button 
          className={`nav-tab ${currentTab === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentTab('upload')}
        >
          📤 上传模板
        </button>
        <button 
          className={`nav-tab ${currentTab === 'my-templates' ? 'active' : ''}`}
          onClick={() => setCurrentTab('my-templates')}
        >
          📚 我的模板
        </button>
      </div>

      <div className="marketplace-content">
        {currentTab === 'browse' && renderBrowseTemplates()}
        {currentTab === 'upload' && renderUploadTemplate()}
        {currentTab === 'my-templates' && renderMyTemplates()}
        {currentTab === 'template-detail' && selectedTemplate && renderTemplateDetail()}
      </div>

      {error && (
        <div className="error-toast">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default TemplateMarketplace; 