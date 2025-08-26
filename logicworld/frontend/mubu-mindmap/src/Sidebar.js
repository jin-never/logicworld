import React from 'react';
import './Sidebar.css';
import { useUser } from './UserContext';

const Sidebar = ({ onNavigate, onToggleSidebar, onToggleChatBox, isChatBoxCollapsed }) => {
  const { userInfo } = useUser();

  return (
    <div className="sidebar">
      {/* 控制按钮 */}
      <div className="sidebar-controls">
        <button
          className="sidebar-control-btn sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title="收起侧边栏"
        >
          ✕
        </button>
      </div>

      {/* 个人信息 */}
      <div className="sidebar-section profile-section">
        <div className="avatar-placeholder">
          {userInfo.avatar ? (
            <img src={userInfo.avatar} alt="用户头像" className="avatar-image" />
          ) : (
            <span>👤</span>
          )}
        </div>
        <div className="user-info">
          <h3>{userInfo.username}</h3>
          <p className="motto">{userInfo.motto}</p>
        </div>
        <ul className="profile-options">
          <li onClick={() => onNavigate('personalSettings')}>个人设置</li>
        </ul>
      </div>

      {/* 分割线 */}
      <hr className="section-divider" />

      {/* 工作流管理 */}
      <div className="sidebar-section workflow-management-section">
        <h4>工作流管理</h4>
        <ul className="workflow-options">
          {/* 工作流项目已清理 */}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar; 