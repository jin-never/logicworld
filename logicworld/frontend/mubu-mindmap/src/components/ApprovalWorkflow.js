/**
 * 批准流程管理组件
 * 用于管理工具的批准申请、审核和系统工具转换
 */

import React, { useState, useEffect } from 'react';
import { toolTestingManager } from '../utils/toolTestingManager.js';
import { APPROVAL_STATUS } from '../utils/toolDataModel.js';
// import './ApprovalWorkflow.css';

const ApprovalWorkflow = ({
  isOpen = false,
  onClose,
  className = ''
}) => {
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected

  // 加载批准申请
  useEffect(() => {
    if (isOpen) {
      loadApprovalRequests();
    }
  }, [isOpen]);

  const loadApprovalRequests = async () => {
    setLoading(true);
    try {
      // 从API或本地存储加载批准申请
      const response = await fetch('/api/tools/approval-requests');
      if (response.ok) {
        const requests = await response.json();
        setApprovalRequests(requests);
      } else {
        // 如果API不可用，从工具测试管理器获取
        const requests = Array.from(toolTestingManager.approvalRequests.values());
        setApprovalRequests(requests);
      }
    } catch (error) {
      console.error('加载批准申请失败:', error);
      // 回退到本地数据
      const requests = Array.from(toolTestingManager.approvalRequests.values());
      setApprovalRequests(requests);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!reviewNotes.trim()) {
      alert('请填写审核意见');
      return;
    }

    setLoading(true);
    try {
      await toolTestingManager.approveTool(requestId, 'admin', reviewNotes);
      
      // 更新申请状态
      setApprovalRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'approved', approvedAt: new Date().toISOString() }
            : req
        )
      );

      setSelectedRequest(null);
      setReviewNotes('');
      alert('工具已批准并加入系统工具库！');

    } catch (error) {
      console.error('批准失败:', error);
      alert(`批准失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!reviewNotes.trim()) {
      alert('请填写拒绝理由');
      return;
    }

    setLoading(true);
    try {
      // 更新申请状态
      setApprovalRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { 
                ...req, 
                status: 'rejected', 
                rejectedAt: new Date().toISOString(),
                reviewNotes: [...(req.reviewNotes || []), {
                  timestamp: new Date().toISOString(),
                  reviewer: 'admin',
                  action: 'rejected',
                  notes: reviewNotes
                }]
              }
            : req
        )
      );

      setSelectedRequest(null);
      setReviewNotes('');
      alert('申请已拒绝');

    } catch (error) {
      console.error('拒绝失败:', error);
      alert(`拒绝失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRequests = () => {
    if (filterStatus === 'all') {
      return approvalRequests;
    }
    return approvalRequests.filter(req => req.status === filterStatus);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '待审核', className: 'status-pending', icon: '⏳' },
      approved: { text: '已批准', className: 'status-approved', icon: '✅' },
      rejected: { text: '已拒绝', className: 'status-rejected', icon: '❌' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`status-badge ${badge.className}`}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <div className={`approval-workflow-overlay ${className}`}>
      <div className="approval-workflow-modal">
        <div className="modal-header">
          <h2>工具批准管理</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* 过滤器 */}
          <div className="filter-section">
            <div className="filter-group">
              <label>状态筛选:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">全部</option>
                <option value="pending">待审核</option>
                <option value="approved">已批准</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>
            <div className="stats">
              <span>共 {getFilteredRequests().length} 个申请</span>
            </div>
          </div>

          {/* 申请列表 */}
          <div className="requests-section">
            {loading ? (
              <div className="loading">加载中...</div>
            ) : getFilteredRequests().length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">暂无批准申请</div>
              </div>
            ) : (
              <div className="requests-list">
                {getFilteredRequests().map(request => (
                  <div 
                    key={request.id} 
                    className={`request-item ${selectedRequest?.id === request.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="request-header">
                      <h4 className="tool-name">{request.toolData.name}</h4>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="request-info">
                      <div className="info-item">
                        <span className="label">工具类型:</span>
                        <span className="value">{request.toolData.sourceType}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">申请时间:</span>
                        <span className="value">{formatDate(request.requestedAt)}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">功能分类:</span>
                        <span className="value">{request.toolData.functionalCategory}</span>
                      </div>
                    </div>

                    <div className="request-description">
                      {request.toolData.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 详情面板 */}
          {selectedRequest && (
            <div className="detail-panel">
              <div className="detail-header">
                <h3>申请详情</h3>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div className="detail-content">
                <div className="detail-section">
                  <h4>工具信息</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">名称:</span>
                      <span className="value">{selectedRequest.toolData.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">类型:</span>
                      <span className="value">{selectedRequest.toolData.sourceType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">分类:</span>
                      <span className="value">{selectedRequest.toolData.functionalCategory}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">测试状态:</span>
                      <span className="value">
                        {selectedRequest.toolData.tested ? '✅ 已测试' : '❌ 未测试'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>配置信息</h4>
                  <div className="config-preview">
                    <pre>{JSON.stringify(selectedRequest.toolData.config, null, 2)}</pre>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>敏感字段</h4>
                  <div className="sensitive-fields">
                    {selectedRequest.toolData.sensitiveFields?.length > 0 ? (
                      <ul>
                        {selectedRequest.toolData.sensitiveFields.map(field => (
                          <li key={field} className="sensitive-field">
                            🔒 {field}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="no-sensitive">无敏感字段</span>
                    )}
                  </div>
                </div>

                {/* 审核操作 */}
                {selectedRequest.status === 'pending' && (
                  <div className="review-section">
                    <h4>审核操作</h4>
                    <div className="review-form">
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="请填写审核意见..."
                        rows={4}
                      />
                      <div className="review-actions">
                        <button
                          className="btn btn-success"
                          onClick={() => handleApprove(selectedRequest.id)}
                          disabled={loading}
                        >
                          {loading ? '处理中...' : '批准'}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleReject(selectedRequest.id)}
                          disabled={loading}
                        >
                          {loading ? '处理中...' : '拒绝'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 审核历史 */}
                {selectedRequest.reviewNotes?.length > 0 && (
                  <div className="review-history">
                    <h4>审核历史</h4>
                    <div className="history-list">
                      {selectedRequest.reviewNotes.map((note, index) => (
                        <div key={index} className="history-item">
                          <div className="history-header">
                            <span className="reviewer">{note.reviewer}</span>
                            <span className="action">{note.action}</span>
                            <span className="timestamp">{formatDate(note.timestamp)}</span>
                          </div>
                          <div className="history-notes">{note.notes}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;
