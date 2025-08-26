import React, { createContext, useContext, useState, useEffect } from 'react';

// 创建用户信息上下文
const UserContext = createContext();

// 用户信息提供者组件
export const UserProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState({
    username: '用户名称',
    email: 'user@example.com',
    motto: '"行胜于言，思而后行"',
    avatar: null
  });

  // 从本地存储加载用户信息
  useEffect(() => {
    // 首先尝试从认证系统获取用户信息
    const authUserInfo = localStorage.getItem('user_info');
    if (authUserInfo) {
      try {
        const parsedAuthUserInfo = JSON.parse(authUserInfo);
        setUserInfo({
          username: parsedAuthUserInfo.username || '用户名称',
          email: parsedAuthUserInfo.email || 'user@example.com',
          motto: '"行胜于言，思而后行"',
          avatar: parsedAuthUserInfo.avatar || null
        });
        return;
      } catch (error) {
        console.error('解析认证用户信息失败:', error);
      }
    }

    // 如果认证信息不存在，尝试旧的用户信息
    const savedUserInfo = localStorage.getItem('userInfo');
    if (savedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(savedUserInfo);
        setUserInfo(parsedUserInfo);
      } catch (error) {
        console.error('解析用户信息失败:', error);
      }
    }
  }, []); // 添加空依赖数组，确保只在组件挂载时执行一次

  // 更新用户信息
  const updateUserInfo = (newUserInfo) => {
    setUserInfo(prev => {
      const updated = { ...prev, ...newUserInfo };
      // 保存到本地存储
      localStorage.setItem('userInfo', JSON.stringify(updated));
      return updated;
    });
  };

  // 重置用户信息
  const resetUserInfo = () => {
    setUserInfo({});
    localStorage.removeItem('userInfo');
  };

  const value = {
    userInfo,
    updateUserInfo,
    resetUserInfo
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// 自定义Hook用于使用用户信息
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
