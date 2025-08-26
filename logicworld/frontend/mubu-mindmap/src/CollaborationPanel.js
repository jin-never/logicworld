import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CollaborationPanel.css';

const CollaborationPanel = ({ 
  workflowId, 
  currentUser, 
  onCollaborationEvent,
  isVisible = true 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [comments, setComments] = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [versionHistory, setVersionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('collaborators');
  const [newComment, setNewComment] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket连接管理
  const connectWebSocket = useCallback(() => {
    if (!workflowId || !currentUser) return;

    const wsUrl = `ws://localhost:8000/ws/collaboration/${workflowId}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('协作WebSocket连接已建立');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // 发送用户信息
      wsRef.current.send(JSON.stringify({
        type: 'user_joined',
        user_id: currentUser.id,
        user_name: currentUser.name,
        workflow_id: workflowId
      }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleCollaborationMessage(message);
      } catch (error) {
        console.error('解析协作消息失败:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('协作WebSocket连接已关闭');
      setIsConnected(false);
      
      // 尝试重连
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`尝试重连 (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          connectWebSocket();
        }, delay);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('协作WebSocket错误:', error);
    };
  }, [workflowId, currentUser]);

  // 处理协作消息
  const handleCollaborationMessage = (message) => {
    const { type, data, user_id, user_name, timestamp } = message;

    switch (type) {
      case 'user_joined':
        if (data.user_presence) {
          setCollaborators(prev => {
            const filtered = prev.filter(c => c.user_id !== user_id);
            return [...filtered, data.user_presence];
          });
        }
        break;

      case 'user_left':
        setCollaborators(prev => prev.filter(c => c.user_id !== user_id));
        break;

      case 'presence_update':
        if (data.users) {
          setCollaborators(data.users);
        }
        break;

      case 'cursor_moved':
        // 更新协作者光标位置
        setCollaborators(prev => prev.map(c => 
          c.user_id === user_id 
            ? { ...c, cursor_position: data.position }
            : c
        ));
        break;

      case 'node_selected':
        // 更新协作者选择的节点
        setCollaborators(prev => prev.map(c => 
          c.user_id === user_id 
            ? { ...c, selected_nodes: data.selected_nodes }
            : c
        ));
        break;

      case 'comment_added':
        setComments(prev => [...prev, data]);
        break;

      case 'conflict_detected':
        // 显示冲突提示
        showConflictNotification(data);
        break;

      case 'sync_response':
        // 处理同步响应
        if (onCollaborationEvent) {
          onCollaborationEvent('sync_received', data);
        }
        break;

      default:
        // 转发其他事件给父组件
        if (onCollaborationEvent) {
          onCollaborationEvent(type, { data, user_id, user_name, timestamp });
        }
    }
  };

  // 显示冲突通知
  const showConflictNotification = (conflictData) => {
    // 这里可以显示一个通知组件
    console.warn('检测到编辑冲突:', conflictData);
  };

  // 发送协作消息
  const sendCollaborationMessage = (type, data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type,
        workflow_id: workflowId,
        data
      }));
    }
  };

  // 添加评论
  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTarget) return;

    const commentData = {
      content: newComment,
      target_type: selectedTarget.type,
      target_id: selectedTarget.id,
      position: selectedTarget.position
    };

    sendCollaborationMessage('comment_added', commentData);
    setNewComment('');
    setSelectedTarget(null);
  };

  // 创建分享链接
  const handleCreateShareLink = async (shareScope, options = {}) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          share_scope: shareScope,
          ...options
        })
      });

      if (response.ok) {
        const result = await response.json();
        setShareLinks(prev => [...prev, result]);
      }
    } catch (error) {
      console.error('创建分享链接失败:', error);
    }
  };

  // 获取版本历史
  const fetchVersionHistory = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/versions`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        const versions = await response.json();
        setVersionHistory(versions);
      }
    } catch (error) {
      console.error('获取版本历史失败:', error);
    }
  };

  // 恢复版本
  const handleRestoreVersion = async (versionId) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        // 刷新版本历史
        await fetchVersionHistory();
        
        // 通知父组件
        if (onCollaborationEvent) {
          onCollaborationEvent('version_restored', { versionId });
        }
      }
    } catch (error) {
      console.error('恢复版本失败:', error);
    }
  };

  // 初始化
  useEffect(() => {
    if (workflowId && currentUser && isVisible) {
      connectWebSocket();
      fetchVersionHistory();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [workflowId, currentUser, isVisible, connectWebSocket]);

  // 光标移动事件
  const handleCursorMove = useCallback((position) => {
    sendCollaborationMessage('cursor_moved', { position });
  }, []);

  // 节点选择事件
  const handleNodeSelection = useCallback((selectedNodes) => {
    sendCollaborationMessage('node_selected', { selected_nodes: selectedNodes });
  }, []);

  // 暴露方法给父组件
  useEffect(() => {
    if (onCollaborationEvent) {
      onCollaborationEvent('methods_ready', {
        sendMessage: sendCollaborationMessage,
        handleCursorMove,
        handleNodeSelection,
        setCommentTarget: setSelectedTarget
      });
    }
  }, [onCollaborationEvent, handleCursorMove, handleNodeSelection]);

  if (!isVisible) return null;

  return (
    <div className="collaboration-panel">
      <div className="panel-header">
        <h3>协作</h3>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">
            {isConnected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      <div className="panel-tabs">
        <button 
          className={`tab-button ${activeTab === 'collaborators' ? 'active' : ''}`}
          onClick={() => setActiveTab('collaborators')}
        >
          协作者 ({collaborators.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          评论 ({comments.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          版本
        </button>
        <button 
          className={`tab-button ${activeTab === 'share' ? 'active' : ''}`}
          onClick={() => setActiveTab('share')}
        >
          分享
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'collaborators' && (
          <div className="collaborators-section">
            {collaborators.length === 0 ? (
              <div className="empty-state">暂无其他协作者</div>
            ) : (
              <div className="collaborators-list">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.user_id} className="collaborator-item">
                    <div 
                      className="collaborator-avatar"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      {collaborator.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="collaborator-info">
                      <div className="collaborator-name">{collaborator.user_name}</div>
                      <div className="collaborator-status">
                        {collaborator.current_action || '在线'}
                      </div>
                    </div>
                    {collaborator.selected_nodes && collaborator.selected_nodes.length > 0 && (
                      <div className="selected-indicator">
                        选中 {collaborator.selected_nodes.length} 个节点
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="comments-section">
            <div className="add-comment">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="添加评论..."
                rows={3}
              />
              <div className="comment-actions">
                <button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || !selectedTarget}
                  className="add-comment-button"
                >
                  添加评论
                </button>
                {selectedTarget && (
                  <div className="comment-target">
                    评论目标: {selectedTarget.type} {selectedTarget.id}
                  </div>
                )}
              </div>
            </div>

            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.comment_id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{comment.user_name}</span>
                    <span className="comment-time">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="comment-content">{comment.content}</div>
                  <div className="comment-target">
                    {comment.target_type}: {comment.target_id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="versions-section">
            <div className="versions-list">
              {versionHistory.map((version) => (
                <div key={version.version_id} className="version-item">
                  <div className="version-header">
                    <span className="version-number">v{version.version_number}</span>
                    <span className="version-author">{version.author_name}</span>
                  </div>
                  <div className="version-message">{version.commit_message}</div>
                  <div className="version-time">
                    {new Date(version.created_at).toLocaleString()}
                  </div>
                  <div className="version-actions">
                    <button 
                      onClick={() => handleRestoreVersion(version.version_id)}
                      className="restore-button"
                    >
                      恢复此版本
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'share' && (
          <div className="share-section">
            <div className="share-actions">
              <button 
                onClick={() => handleCreateShareLink('team')}
                className="share-button"
              >
                创建团队分享链接
              </button>
              <button 
                onClick={() => handleCreateShareLink('public')}
                className="share-button"
              >
                创建公开分享链接
              </button>
            </div>

            <div className="share-links">
              {shareLinks.map((link) => (
                <div key={link.share_id} className="share-link-item">
                  <div className="share-link-info">
                    <div className="share-scope">{link.share_scope}</div>
                    <div className="share-link">{link.share_link}</div>
                    <div className="share-stats">
                      访问次数: {link.access_count}
                    </div>
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(link.share_link)}
                    className="copy-button"
                  >
                    复制链接
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationPanel;
