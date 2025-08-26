import React, { useState, useEffect } from 'react';
import './TemplateSelector.css';

const TemplateMarketplace = ({ isOpen, onClose, onSelectTemplate, currentNodes, currentEdges }) => {
  // 基本状态
  const [currentTab, setCurrentTab] = useState('browse'); // browse, upload, my-templates
  const [currentMarket, setCurrentMarket] = useState('free'); // free, premium
  const [templates, setTemplates] = useState([]);
  const [myTemplates, setMyTemplates] = useState([]);
  const [savedMindmaps, setSavedMindmaps] = useState([]); // 用户保存的思维导图
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular'); // popular, newest, rating, downloads
  const [categories] = useState([
    'all', '项目管理', '商业分析', '教育培训', '软件开发', '数据科学', '创意设计', '生活办公', '其他'
  ]);

  // 上传模板状态
  const [uploadStep, setUploadStep] = useState(1); // 1: 基本信息, 2: 选择思维导图, 3: 市场选择, 4: 确认发布
  const [selectedMindmap, setSelectedMindmap] = useState(null); // 选择的思维导图
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'other',
    tags: '',
    marketType: 'free', // free, premium
    isPublic: true,
    price: 0
  });

  // 模板详情模态框
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDetail, setShowTemplateDetail] = useState(false);

  // 编辑模板状态
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '项目管理',
    tags: '',
    marketType: 'free',
    isPublic: true
  });

  // 模板详情页面状态
  const [templateDetail, setTemplateDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [userName, setUserName] = useState('');
  const [detailTab, setDetailTab] = useState('info'); // info, comments, reviews
  const [isLiked, setIsLiked] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);

  // 同意条款状态
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 获取用户保存的思维导图数据
  const loadSavedMindmaps = async () => {
    try {
      setLoading(true);
      
      // 1. 从localStorage获取当前正在编辑的思维导图
      const currentMindmapData = getCurrentMindmap();
      
      // 2. 从后端API获取所有保存的思维导图
      const savedMindmapsData = await fetchSavedMindmaps();
      
      // 3. 合并数据
      const allMindmaps = [];
      
      // 添加当前思维导图（如果存在）
      if (currentMindmapData) {
        allMindmaps.push(currentMindmapData);
      }
      
      // 添加后端保存的思维导图
      if (savedMindmapsData && savedMindmapsData.length > 0) {
        allMindmaps.push(...savedMindmapsData);
      }
      
      // 去重（基于节点数量和创建时间）
      const uniqueMindmaps = deduplicateMindmaps(allMindmaps);
      
      setSavedMindmaps(uniqueMindmaps);
      console.log('✅ 已加载思维导图数据:', uniqueMindmaps);
      
    } catch (error) {
      console.error('❌ 加载思维导图数据失败:', error);
      setError('加载思维导图数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 从localStorage获取当前思维导图
  const getCurrentMindmap = () => {
    try {
      const stored = localStorage.getItem('mindmap-data');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        if (parsed.nodes && parsed.edges && parsed.nodes.length > 0) {
          // 生成思维导图标题（基于节点内容）
          const title = generateMindmapTitle(parsed.nodes);
          
          return {
            id: 'current_mindmap',
            title: title,
            description: `当前编辑中的思维导图 (${parsed.nodes.length}个节点)`,
            nodes: parsed.nodes,
            edges: parsed.edges,
            nodeCount: parsed.nodes.length,
            edgeCount: parsed.edges.length,
            lastModified: parsed.savedAt || new Date().toISOString(),
            source: 'localStorage',
            isCurrent: true
          };
        }
      }
    } catch (error) {
      console.warn('读取localStorage思维导图数据失败:', error);
    }
    return null;
  };

  // 从后端获取保存的思维导图
  const fetchSavedMindmaps = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mindmaps');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 后端返回的思维导图数据:', data);
      
      return data.map((mindmap, index) => ({
        id: mindmap.id || `mindmap_${index}`,
        title: mindmap.title || `思维导图 ${index + 1}`,
        description: mindmap.description || `包含${mindmap.nodes?.length || 0}个节点的思维导图`,
        nodes: mindmap.nodes || [],
        edges: mindmap.edges || [],
        nodeCount: mindmap.nodes?.length || 0,
        edgeCount: mindmap.edges?.length || 0,
        lastModified: mindmap.updated_at || mindmap.created_at || new Date().toISOString(),
        source: 'backend',
        isPublic: mindmap.is_public || false,
        tags: mindmap.tags || [],
        isFavorite: mindmap.is_favorite || false
      }));
      
    } catch (error) {
      console.warn('从后端获取思维导图失败:', error.message);
      return [];
    }
  };

  // 生成思维导图标题
  const generateMindmapTitle = (nodes) => {
    if (!nodes || nodes.length === 0) return '空白思维导图';
    
    // 寻找开始节点或根节点
    const startNode = nodes.find(node => 
      node.data?.nodeType === 'start-topic-node' || 
      node.data?.label === '开始' ||
      node.id === '1'
    );
    
    if (startNode && startNode.data?.label && startNode.data.label !== '开始') {
      return startNode.data.label;
    }
    
    // 寻找第一个子节点
    const subNode = nodes.find(node => 
      node.data?.nodeType === 'sub-topic-node' ||
      (node.data?.label && node.data.label !== '开始' && node.data.label !== '新子节点')
    );
    
    if (subNode && subNode.data?.label) {
      return subNode.data.label;
    }
    
    // 基于节点数量生成标题
    return `${nodes.length}节点思维导图`;
  };

  // 去重思维导图
  const deduplicateMindmaps = (mindmaps) => {
    const seen = new Set();
    return mindmaps.filter(mindmap => {
      const key = `${mindmap.nodeCount}_${mindmap.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // 在组件加载时获取数据
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadSavedMindmaps();
      loadMyTemplates();
    }
  }, [isOpen]);

  // 获取模板数据
  const loadTemplates = async () => {
    try {
    setLoading(true);
      // 从后端获取模板数据，如果失败则使用空数组
      const response = await fetch('http://localhost:8000/api/template-marketplace');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        console.warn('获取模板数据失败，使用空列表');
        setTemplates([]);
      }
    } catch (error) {
      console.warn('获取模板数据失败:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取我的模板
  const loadMyTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/my-templates');
      if (response.ok) {
        const data = await response.json();
        setMyTemplates(data.templates || []);
      } else {
        setMyTemplates([]);
      }
    } catch (error) {
      console.warn('获取我的模板失败:', error);
      setMyTemplates([]);
    }
  };

  // 提交模板
  const handleSubmitTemplate = async () => {
    if (!selectedMindmap) {
      alert('请选择要上传的思维导图');
      return;
    }

    if (!agreedToTerms) {
      alert('请先同意模板市场服务条款');
      return;
    }

    try {
      setLoading(true);
      
      const templateData = {
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        marketType: uploadForm.marketType,
        isPublic: uploadForm.isPublic,
        price: uploadForm.price,
        nodes: selectedMindmap.nodes,
        edges: selectedMindmap.edges,
        metadata: {
          nodeCount: selectedMindmap.nodeCount,
          edgeCount: selectedMindmap.edgeCount,
          originalTitle: selectedMindmap.title,
          source: selectedMindmap.source
        }
      };

      const response = await fetch('http://localhost:8000/api/template-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        const result = await response.json();
        alert('模板上传成功！');
        
        // 重置表单
        setUploadForm({
          title: '',
          description: '',
          category: 'other',
          tags: '',
          marketType: 'free',
          isPublic: true,
          price: 0
        });
        setSelectedMindmap(null);
        setUploadStep(1);
        setAgreedToTerms(false); // 重置同意条款
        
        // 刷新我的模板列表
        loadMyTemplates();
        
        // 切换到我的模板标签
        setCurrentTab('my-templates');
        
      } else {
        const error = await response.json();
        alert(`上传失败: ${error.message || '未知错误'}`);
      }
      
    } catch (error) {
      console.error('上传模板失败:', error);
      alert('上传失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 思维导图选择处理（修复取消选择的问题）
  const handleMindmapSelection = (mindmap) => {
    if (selectedMindmap?.id === mindmap.id) {
      // 如果点击的是已选中的思维导图，则取消选择
      setSelectedMindmap(null);
    } else {
      // 否则选择新的思维导图
      setSelectedMindmap(mindmap);
    }
  };

  // 我的模板页面事件处理函数
  const handleEditTemplate = (template) => {
    console.log('编辑模板:', template);
    setEditingTemplate(template);
    setEditForm({
      title: template.title || '',
      description: template.description || '',
      category: template.category || '项目管理',
      tags: template.tags?.join(', ') || '',
      marketType: template.marketType || 'free',
      isPublic: template.isPublic !== false
    });
  };

  const handleViewAnalytics = (template) => {
    console.log('查看模板数据分析:', template);
    alert(`模板数据分析\n模板: ${template.title}\n下载次数: ${template.stats?.downloads || 0}\n评分: ${template.stats?.rating || 0}`);
    // TODO: 实现数据分析功能
  };

  const handleDeleteTemplate = (template) => {
    console.log('删除模板:', template);
    const confirmed = window.confirm(`确定要删除模板"${template.title}"吗？\n此操作不可撤销。`);
    if (confirmed) {
      // TODO: 实现删除模板功能
      alert('删除功能开发中');
    }
  };

  // 浏览模板页面事件处理函数
  const handleTemplateDetail = async (template) => {
    console.log('查看模板详情:', template);
    setSelectedTemplate(template);
    setShowTemplateDetail(true);
    setDetailTab('info');
    
    // 加载完整的模板详情数据
    await loadTemplateDetail(template.id);
  };

  // 加载模板详情数据
  const loadTemplateDetail = async (templateId) => {
    try {
      setDetailLoading(true);
      
      const response = await fetch(`http://localhost:8000/api/template/${templateId}`);
      const data = await response.json();
      
      if (data.success) {
        setTemplateDetail(data.template);
        setComments(data.template.comments || []);
        setTotalLikes(data.template.stats?.likes || 0);
        setIsLiked(false); // TODO: 从用户数据中获取
      } else {
        console.error('加载模板详情失败:', data.error);
        setError('加载模板详情失败');
      }
    } catch (error) {
      console.error('加载模板详情出错:', error);
      setError('网络错误，请重试');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUseTemplate = (template) => {
    console.log('使用模板:', template);
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      alert(`使用模板: ${template.title}\n节点数: ${template.metadata?.nodeCount || 0}\n功能开发中...`);
    }
  };

  const handleCloseTemplateDetail = () => {
    setShowTemplateDetail(false);
    setSelectedTemplate(null);
    setTemplateDetail(null);
    setComments([]);
    setNewComment('');
    setNewRating(0);
    setUserName('');
    setDetailTab('info');
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() && !newRating) {
      alert('请输入评论内容或给出评分');
      return;
    }

    if (!userName.trim()) {
      alert('请输入您的姓名');
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
          user_name: userName.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // 添加新评论到列表顶部
        setComments(prev => [data.comment, ...prev]);
        
        // 清空表单
        setNewComment('');
        setNewRating(0);
        
        // 重新加载模板详情以更新统计数据
        await loadTemplateDetail(templateDetail.id);
        
        alert('评论提交成功！');
      } else {
        alert('评论提交失败: ' + data.error);
      }
    } catch (error) {
      console.error('提交评论失败:', error);
      alert('网络错误，请重试');
    }
  };

  // 点赞/取消点赞
  const handleToggleLike = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/template/${templateDetail.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userName || 'anonymous'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsLiked(data.liked);
        setTotalLikes(data.total_likes);
      } else {
        alert('操作失败: ' + data.error);
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      alert('网络错误，请重试');
    }
  };

  // 加载更多评论
  const loadMoreComments = async () => {
    try {
      setCommentsLoading(true);
      
      const response = await fetch(`http://localhost:8000/api/template/${templateDetail.id}/comments?page=1&limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // 星级评分组件
  const StarRating = ({ rating, onRatingChange, readonly = false }) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${readonly ? 'readonly' : ''}`}
            onClick={() => !readonly && onRatingChange && onRatingChange(star)}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  // 保存编辑的模板
  const handleSaveEditedTemplate = async () => {
    if (!editForm.title.trim()) {
      alert('请输入模板标题');
      return;
    }

    try {
      setLoading(true);

      const updatedTemplate = {
        ...editingTemplate,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        tags: editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        marketType: editForm.marketType,
        isPublic: editForm.isPublic,
        metadata: {
          ...editingTemplate.metadata,
          lastModified: new Date().toISOString()
        }
      };

      // TODO: 调用后端API更新模板
      console.log('保存编辑的模板:', updatedTemplate);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 更新本地状态
      setMyTemplates(prev => prev.map(template => 
        template.id === editingTemplate.id ? updatedTemplate : template
      ));
      
      // 关闭编辑弹窗
      setEditingTemplate(null);
      setEditForm({
        title: '',
        description: '',
        category: '项目管理',
        tags: '',
        marketType: 'free',
        isPublic: true
      });
      
      alert('模板更新成功！');
      
    } catch (error) {
      console.error('保存模板失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 渲染思维导图选择
  const renderMindmapSelection = () => (
    <div className="mindmap-selection">
      <div className="selection-info">
        <p>请选择要上传到模板市场的思维导图工作流：</p>
        {selectedMindmap && (
          <div className="selected-info">
            <span className="selected-icon">✓</span>
            已选择：{selectedMindmap.title}
            <button 
              className="clear-selection-btn"
              onClick={() => setSelectedMindmap(null)}
              title="取消选择"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {savedMindmaps.length === 0 ? (
        <div className="no-mindmaps">
          <div className="empty-icon">📭</div>
          <h4>暂无保存的思维导图</h4>
          <p>请先创建并保存思维导图，然后再上传到模板市场</p>
        </div>
      ) : (
        <div className="mindmap-grid">
          {savedMindmaps.map((mindmap) => (
            <div
              key={mindmap.id}
              className={`mindmap-item ${selectedMindmap?.id === mindmap.id ? 'selected' : ''}`}
              onClick={() => handleMindmapSelection(mindmap)}
            >
              <div className="mindmap-preview">
                <div className="preview-icon">
                  {mindmap.isCurrent ? '🔄' : '📊'}
                </div>
        </div>

              <div className="mindmap-info">
                <h5>{mindmap.title}</h5>
                <p className="mindmap-description">{mindmap.description}</p>
                <div className="mindmap-stats">
                  <span className="stat">
                    <span className="stat-icon">📍</span>
                    {mindmap.nodeCount} 节点
                  </span>
                  <span className="stat">
                    <span className="stat-icon">🔗</span>
                    {mindmap.edgeCount} 连线
                  </span>
                  <span className="stat">
                    <span className="stat-icon">⏰</span>
                    {formatDate(mindmap.lastModified)}
                  </span>
                </div>
                <div className="mindmap-badges">
                  {mindmap.isCurrent && <span className="badge current">当前编辑</span>}
                  {mindmap.source === 'localStorage' && <span className="badge local">本地数据</span>}
                  {mindmap.source === 'backend' && <span className="badge server">服务器数据</span>}
                </div>
              </div>
              
              <div className="mindmap-actions">
                {selectedMindmap?.id === mindmap.id && (
                  <div className="selected-indicator">
                    <span className="checkmark">✓</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 格式化日期
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '未知时间';
    }
  };

  // 渲染浏览模板
  const renderBrowseTemplates = () => (
    <div className="browse-templates">
      <div className="market-tabs">
        <button 
          className={`market-tab ${currentMarket === 'free' ? 'active' : ''}`}
          onClick={() => setCurrentMarket('free')}
        >
          🆓 免费市场
        </button>
        <button 
          className={`market-tab ${currentMarket === 'premium' ? 'active' : 'disabled'}`}
          onClick={() => setCurrentMarket('premium')}
          disabled
        >
          💎 付费市场 (即将开放)
        </button>
        </div>

      <div className="search-filters">
        <div className="search-bar">
              <input
                type="text"
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-btn">🔍</button>
        </div>
        
        <div className="filters">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? '所有分类' : cat}
              </option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="popular">最受欢迎</option>
            <option value="newest">最新发布</option>
            <option value="rating">评分最高</option>
            <option value="downloads">下载最多</option>
          </select>
            </div>
          </div>

      <div className="templates-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>正在加载模板...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h4>暂无模板</h4>
            <p>模板市场正在建设中，敬请期待！</p>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-preview">
                <div className="preview-placeholder">
                  📊 {template.nodeCount || 0} 节点
                </div>
              </div>
              
              <div className="template-info">
                <h4>{template.title}</h4>
                <p>{template.description}</p>
                
                <div className="template-meta">
                  <span className="author">👨‍💼 {template.author?.name || '未知作者'}</span>
                                      <div className="rating">
                      ⭐ {template.stats?.rating || 0} ({template.stats?.reviews?.length || 0}评价)
                    </div>
                    <div className="downloads">
                      📥 {template.stats?.downloads || 0}下载
                    </div>
                </div>
                
                <div className="template-tags">
                  {template.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
              
              <div className="template-actions">
                <button 
                  className="use-btn"
                  onClick={() => handleUseTemplate(template)}
                >
                  ✨ 使用
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // 渲染上传模板
  const renderUploadTemplate = () => (
    <div className="upload-template">
      <div className="upload-steps">
        <div className={`step ${uploadStep === 1 ? 'active' : uploadStep > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">基本信息</span>
        </div>
        <div className={`step ${uploadStep === 2 ? 'active' : uploadStep > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">选择思维导图</span>
        </div>
        <div className={`step ${uploadStep === 3 ? 'active' : uploadStep > 3 ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">市场选择</span>
        </div>
        <div className={`step ${uploadStep === 4 ? 'active' : ''}`}>
          <span className="step-number">4</span>
          <span className="step-label">确认发布</span>
        </div>
      </div>

      <div className="upload-content">
        {uploadStep === 1 && (
          <div className="step-content">
            <h3>📝 基本信息</h3>
            <div className="form-group">
              <label>模板标题 *</label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                placeholder="为您的模板起一个吸引人的标题"
              />
            </div>
            
            <div className="form-group">
              <label>模板描述 *</label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                placeholder="详细描述您的模板适用场景和特色功能"
                rows="4"
              />
            </div>
            
            <div className="form-group">
              <label>分类 *</label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
              >
                {categories.filter(cat => cat !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>标签 (用逗号分隔)</label>
              <input
                type="text"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                placeholder="项目管理, 敏捷开发, 团队协作"
              />
          </div>

            <div className="step-actions">
              <button 
                className="next-btn"
                onClick={() => setUploadStep(2)}
                disabled={!uploadForm.title || !uploadForm.description}
              >
                下一步 →
              </button>
        </div>
          </div>
        )}

        {uploadStep === 2 && (
          <div className="step-content">
            <h3>📊 选择思维导图</h3>
            {renderMindmapSelection()}
            
            <div className="step-actions">
              <button 
                className="prev-btn"
                onClick={() => setUploadStep(1)}
              >
                ← 上一步
              </button>
                <button
                className="next-btn"
                onClick={() => setUploadStep(3)}
                disabled={!selectedMindmap}
              >
                下一步 →
                </button>
            </div>
            </div>
          )}

        {uploadStep === 3 && (
          <div className="step-content">
            <h3>🏪 市场选择</h3>
            
            <div className="market-options">
              <div className={`market-option ${uploadForm.marketType === 'free' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  id="free-market"
                  name="marketType"
                  value="free"
                  checked={uploadForm.marketType === 'free'}
                  onChange={(e) => setUploadForm({...uploadForm, marketType: e.target.value})}
                />
                <label htmlFor="free-market">
                  <div className="option-header">
                    <span className="option-icon">🆓</span>
                    <span className="option-title">免费市场</span>
                  </div>
                  <p>所有用户都可以免费下载和使用您的模板</p>
                </label>
        </div>

              <div className={`market-option disabled ${uploadForm.marketType === 'premium' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  id="premium-market"
                  name="marketType"
                  value="premium"
                  disabled
                  checked={uploadForm.marketType === 'premium'}
                  onChange={(e) => setUploadForm({...uploadForm, marketType: e.target.value})}
                />
                <label htmlFor="premium-market">
                  <div className="option-header">
                    <span className="option-icon">💎</span>
                    <span className="option-title">付费市场 (即将开放)</span>
                  </div>
                  <p>用户需要付费购买您的模板，您可以获得收益分成</p>
                </label>
              </div>
            </div>

            <div className="privacy-settings">
              <h4>隐私设置</h4>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={uploadForm.isPublic}
                  onChange={(e) => setUploadForm({...uploadForm, isPublic: e.target.checked})}
                />
                <span>公开发布 (所有人可见)</span>
              </label>
            </div>

            <div className="step-actions">
              <button 
                className="prev-btn"
                onClick={() => setUploadStep(2)}
              >
                ← 上一步
              </button>
              <button 
                className="next-btn"
                onClick={() => setUploadStep(4)}
              >
                下一步 →
              </button>
            </div>
            </div>
          )}

        {uploadStep === 4 && (
          <div className="step-content">
            <h3>🚀 确认发布</h3>
            
            <div className="publish-preview">
              {/* 简洁的配置预览卡片 */}
              <div className="config-cards">
                <div className="config-card">
                  <div className="card-icon">📝</div>
                  <div className="card-content">
                    <h4>基本信息</h4>
                    <div className="info-row">
                      <span className="label">标题</span>
                      <span className="value">{uploadForm.title}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">分类</span>
                      <span className="value">{uploadForm.category}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">标签</span>
                      <span className="value">{uploadForm.tags || '无'}</span>
                    </div>
                  </div>
                  </div>

                <div className="config-card">
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <h4>思维导图</h4>
                    <div className="info-row">
                      <span className="label">名称</span>
                      <span className="value">{selectedMindmap?.title}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">规模</span>
                      <span className="value">{selectedMindmap?.nodeCount}节点 {selectedMindmap?.edgeCount}连线</span>
                    </div>
                    <div className="info-row">
                      <span className="label">来源</span>
                      <span className="value badge-source">{selectedMindmap?.source === 'localStorage' ? '本地' : '服务器'}</span>
                    </div>
                    </div>
                  </div>

                <div className="config-card">
                  <div className="card-icon">🏪</div>
                  <div className="card-content">
                    <h4>发布设置</h4>
                    <div className="info-row">
                      <span className="label">市场</span>
                      <span className="value market-badge">
                        {uploadForm.marketType === 'free' ? '🆓 免费市场' : '💎 付费市场'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">可见性</span>
                      <span className="value">{uploadForm.isPublic ? '🌍 公开' : '🔒 私有'}</span>
                    </div>
                    {uploadForm.marketType === 'premium' && (
                      <div className="info-row">
                        <span className="label">价格</span>
                        <span className="value">¥{uploadForm.price}</span>
            </div>
          )}
                  </div>
                </div>
              </div>

              {/* 描述信息 */}
              <div className="description-preview">
                <h4>📄 模板描述</h4>
                <div className="description-content">
                  {uploadForm.description || '暂无描述'}
                </div>
              </div>

              {/* 发布条款 */}
              <div className="publish-terms">
                <label className="terms-checkbox">
                  <input 
                    type="checkbox" 
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  我同意模板市场服务条款，确认提供的内容为原创或已获得授权
                </label>
              </div>
            </div>

            <div className="step-actions">
                    <button 
                className="prev-btn"
                onClick={() => setUploadStep(3)}
              >
                ← 上一步
                    </button>
                    <button 
                className="publish-btn"
                onClick={handleSubmitTemplate}
                disabled={loading || !agreedToTerms}
              >
                {loading ? '🔄 发布中...' : '🚀 确认发布'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染我的模板
  const renderMyTemplates = () => (
    <div className="my-templates">
      <div className="my-templates-header">
        <h3>📚 我的模板</h3>
        <div className="templates-stats">
          <div className="stat-item">
            <span className="stat-number">{myTemplates.length}</span>
            <span className="stat-label">已发布</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {myTemplates.reduce((sum, t) => sum + (t.downloads || 0), 0)}
            </span>
            <span className="stat-label">总下载</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">¥0</span>
            <span className="stat-label">总收益</span>
          </div>
        </div>
      </div>

      {myTemplates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📱</div>
          <h4>还没有发布任何模板</h4>
          <p>点击"上传模板"开始分享您的创作</p>
          <button 
            className="upload-first-btn"
            onClick={() => setCurrentTab('upload')}
          >
            🚀 上传第一个模板
                    </button>
                  </div>
      ) : (
        <div className="my-templates-grid">
          {myTemplates.map((template) => (
            <div key={template.id} className="my-template-card">
              <div className="template-preview">
                <div className="preview-placeholder">
                  📊 {template.nodeCount || 0} 节点
                </div>
              </div>
              
              <div className="template-info">
                <h4>{template.title}</h4>
                <p>{template.description}</p>
                
                    <div className="template-meta">
                  <span className="category">🏷️ {template.category}</span>
                  <span className="status">✅ 已发布</span>
                  <span className="market-type">
                    {template.marketType === 'free' ? '🆓 免费模板' : '💎 付费模板'}
                  </span>
                </div>
                
                <div className="template-stats">
                  <span className="stat">{template.stats?.downloads || 0}下载</span>
                  <span className="stat">{template.stats?.rating || 0}星评分</span>
                  <span className="stat">({template.stats?.reviews?.length || 0}评价)</span>
                </div>
              </div>
              
              <div className="template-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEditTemplate(template)}
                >
                  ✏️ 编辑
                </button>
                <button 
                  className="analytics-btn"
                  onClick={() => handleViewAnalytics(template)}
                >
                  📊 数据分析
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteTemplate(template)}
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="template-marketplace-fullscreen">
        <div className="marketplace-header">
          <div className="header-left">
            <h2>🎨 模板市场</h2>
            <p>发现和分享优质的思维导图模板</p>
          </div>
          <button className="back-btn" onClick={onClose}>← 返回思维导图</button>
        </div>

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
        </div>

        {error && (
          <div className="error-toast">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
      </div>

      {/* 模板详情弹窗 - 完全重新设计 */}
      {showTemplateDetail && selectedTemplate && (
        <div className="template-detail-overlay">
          <div className="template-detail-modal-enhanced">
            <div className="detail-header-enhanced">
              <div className="header-left">
                <h3>📄 {templateDetail?.title || selectedTemplate.title}</h3>
                <div className="header-stats">
                  <span className="stat-item">
                    <StarRating rating={templateDetail?.stats?.rating || 0} readonly />
                    <span className="rating-text">{templateDetail?.stats?.rating || 0} ({templateDetail?.stats?.total_ratings || 0}评分)</span>
                      </span>
                  <span className="stat-item">
                    <span className={`like-btn ${isLiked ? 'liked' : ''}`} onClick={handleToggleLike}>
                      {isLiked ? '❤️' : '🤍'} {totalLikes}
                      </span>
                  </span>
                  <span className="stat-item">📥 {templateDetail?.stats?.downloads || 0}下载</span>
                    </div>
              </div>
              <button className="close-btn" onClick={handleCloseTemplateDetail}>✕</button>
                  </div>

            <div className="detail-tabs">
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
                💬 评论 ({templateDetail?.stats?.comments_count || 0})
              </button>
              <button 
                className={`tab-btn ${detailTab === 'preview' ? 'active' : ''}`}
                onClick={() => setDetailTab('preview')}
              >
                👁️ 预览
              </button>
                  </div>

            <div className="detail-content-enhanced">
              {detailLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner">⏳</div>
                  <p>加载模板详情中...</p>
                    </div>
              ) : (
                <>
                  {detailTab === 'info' && (
                    <div className="info-tab-content">
                      <div className="template-preview-section">
                        <div className="preview-large">
                          <div className="preview-content">
                            📊 {templateDetail?.metadata?.nodeCount || 0} 节点 • {templateDetail?.metadata?.edgeCount || 0} 连接
                          </div>
                    </div>
                  </div>

                      <div className="template-info-section">
                        <div className="info-card">
                          <h5>📝 描述</h5>
                          <p>{templateDetail?.description || selectedTemplate.description}</p>
                        </div>
                        
                        <div className="info-cards-row">
                          <div className="info-card">
                            <h5>👨‍💼 作者</h5>
                            <p>{templateDetail?.author?.name || selectedTemplate.author?.name || '未知作者'}</p>
                          </div>
                          <div className="info-card">
                            <h5>🏷️ 分类</h5>
                            <p>{templateDetail?.category || selectedTemplate.category}</p>
                          </div>
                        </div>
                        
                        <div className="info-card">
                          <h5>🏷️ 标签</h5>
                          <div className="tags-container">
                            {(templateDetail?.tags || selectedTemplate.tags || []).map((tag, index) => (
                              <span key={index} className="tag-enhanced">{tag}</span>
                      ))}
                          </div>
                        </div>
                        
                        <div className="info-card">
                          <h5>📊 统计信息</h5>
                          <div className="stats-grid">
                            <div className="stat-box">
                              <span className="stat-number">{templateDetail?.stats?.downloads || 0}</span>
                              <span className="stat-label">下载次数</span>
                            </div>
                            <div className="stat-box">
                              <span className="stat-number">{templateDetail?.stats?.total_ratings || 0}</span>
                              <span className="stat-label">评分人数</span>
                            </div>
                            <div className="stat-box">
                              <span className="stat-number">{templateDetail?.stats?.comments_count || 0}</span>
                              <span className="stat-label">评论数量</span>
                            </div>
                            <div className="stat-box">
                              <span className="stat-number">{totalLikes}</span>
                              <span className="stat-label">点赞数量</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === 'comments' && (
                    <div className="comments-tab-content">
                      {/* 评论输入区域 */}
                      <div className="comment-input-section">
                        <h5>💬 发表评论</h5>
                        <div className="comment-form">
                          <div className="form-row">
                            <input
                              type="text"
                              placeholder="请输入您的姓名"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              className="user-name-input"
                            />
                            <div className="rating-input">
                              <span>评分：</span>
                              <StarRating 
                                rating={newRating} 
                                onRatingChange={setNewRating}
                              />
                            </div>
                          </div>
                          <textarea
                            placeholder="分享您对这个模板的看法..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="comment-textarea"
                            rows="3"
                          />
                          <button 
                            className="submit-comment-btn"
                            onClick={handleSubmitComment}
                            disabled={(!newComment.trim() && !newRating) || !userName.trim()}
                          >
                            🚀 发表评论
                          </button>
                        </div>
                      </div>

                      {/* 评论列表 */}
                      <div className="comments-list-section">
                        <h5>💬 用户评论 ({templateDetail?.stats?.comments_count || 0})</h5>
                        {comments.length > 0 ? (
                          <div className="comments-list">
                            {comments.map((comment, index) => (
                              <div key={comment.id || index} className="comment-item">
                                <div className="comment-header">
                                  <span className="comment-author">👤 {comment.user_name}</span>
                                  {comment.rating && (
                                    <div className="comment-rating">
                                      <StarRating rating={comment.rating} readonly />
                                    </div>
                                  )}
                                  <span className="comment-date">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="comment-content">
                                  {comment.comment}
                                </div>
                                <div className="comment-actions">
                                  <button className="comment-like-btn">
                                    👍 {comment.likes || 0}
                                  </button>
                                  <button className="comment-reply-btn">
                                    💬 回复
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-comments">
                            <p>🤔 暂无评论，成为第一个评论者吧！</p>
                          </div>
                        )}
                        
                        {templateDetail?.stats?.comments_count > comments.length && (
                          <button 
                            className="load-more-btn"
                            onClick={loadMoreComments}
                            disabled={commentsLoading}
                          >
                            {commentsLoading ? '⏳ 加载中...' : '📖 加载更多评论'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {detailTab === 'preview' && (
                    <div className="preview-tab-content">
                      <div className="preview-section">
                        <h5>👁️ 模板预览</h5>
                        <div className="template-preview-full">
                          <div className="preview-placeholder-full">
                            <div className="preview-info">
                              <h6>📊 模板结构</h6>
                              <p>节点数量: {templateDetail?.metadata?.nodeCount || 0}</p>
                              <p>连接数量: {templateDetail?.metadata?.edgeCount || 0}</p>
                              <p>复杂度: {templateDetail?.metadata?.complexity || '中等'}</p>
                            </div>
                            <div className="preview-mockup">
                              {/* 这里可以添加实际的思维导图预览 */}
                              <div className="node-mockup">📋 开始</div>
                              <div className="arrow-mockup">⬇️</div>
                              <div className="node-mockup">⚙️ 处理</div>
                              <div className="arrow-mockup">⬇️</div>
                              <div className="node-mockup">✅ 完成</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="detail-actions-enhanced">
                    <button 
                className="use-template-btn-enhanced"
                      onClick={() => {
                  handleUseTemplate(templateDetail || selectedTemplate);
                  handleCloseTemplateDetail();
                      }}
                    >
                ✨ 使用此模板
                    </button>
                    <button 
                className="download-btn"
                onClick={() => alert('下载功能开发中')}
              >
                📥 下载模板
              </button>
              <button 
                className="share-btn"
                onClick={() => alert('分享功能开发中')}
              >
                🔗 分享模板
              </button>
              <button 
                className="cancel-btn-enhanced"
                onClick={handleCloseTemplateDetail}
                    >
                取消
                    </button>
                  </div>
                </div>
            </div>
          )}

      {/* 编辑模板弹窗 */}
      {editingTemplate && (
        <div className="edit-template-overlay">
          <div className="edit-template-modal">
            <div className="edit-header">
              <h3>✏️ 编辑模板</h3>
              <button className="close-btn" onClick={() => setEditingTemplate(null)}>✕</button>
        </div>

            <div className="edit-content">
              <div className="edit-form">
                <div className="form-group">
                  <label>模板标题</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    placeholder="请输入模板标题"
                  />
          </div>
                
                <div className="form-group">
                  <label>模板描述</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    placeholder="请描述这个模板的用途和特点"
                    rows="4"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>分类</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    >
                      {categories.filter(cat => cat !== 'all').map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>市场类型</label>
                    <select
                      value={editForm.marketType}
                      onChange={(e) => setEditForm({...editForm, marketType: e.target.value})}
                    >
                      <option value="free">免费模板</option>
                      <option value="premium">付费模板</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>标签 (用逗号分隔)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                    placeholder="例如: 项目管理, 流程图, 团队协作"
                  />
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editForm.isPublic}
                      onChange={(e) => setEditForm({...editForm, isPublic: e.target.checked})}
                    />
                    公开模板 (其他用户可以查看和使用)
                  </label>
                </div>
              </div>
              
              <div className="edit-actions">
                <button 
                  className="save-template-btn"
                  onClick={handleSaveEditedTemplate}
                  disabled={!editForm.title.trim()}
                >
                  💾 保存更改
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => setEditingTemplate(null)}
                >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
      )}
    </>
  );
};

export default TemplateMarketplace;
