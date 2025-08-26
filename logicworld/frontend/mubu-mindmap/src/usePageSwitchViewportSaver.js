import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * 页面切换时的视图保存Hook
 * 当用户从工作流页面切换到其他页面时，自动保存当前视图状态
 * 当用户切换回工作流页面时，自动恢复视图状态
 */
const usePageSwitchViewportSaver = (currentPage, storageKey = 'workflow_viewport') => {
  const { getViewport, setViewport } = useReactFlow();
  const previousPageRef = useRef(currentPage);
  const isInitializedRef = useRef(false);

  // 保存视图状态到localStorage
  const saveViewportState = (viewport) => {
    try {
      const viewportData = {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
        timestamp: Date.now(),
        savedFrom: 'pageSwitch'
      };
      localStorage.setItem(storageKey, JSON.stringify(viewportData));
      console.log('页面切换时保存视图状态:', viewportData);
    } catch (error) {
      console.warn('页面切换时保存视图状态失败:', error);
    }
  };

  // 从localStorage恢复视图状态
  const restoreViewportState = () => {
    try {
      const savedViewport = localStorage.getItem(storageKey);
      if (savedViewport) {
        const viewportData = JSON.parse(savedViewport);
        
        // 验证数据有效性
        if (typeof viewportData.x === 'number' && 
            typeof viewportData.y === 'number' && 
            typeof viewportData.zoom === 'number' &&
            viewportData.zoom > 0) {
          
          console.log('页面切换回思维导图，恢复视图状态:', viewportData);
          
          // 延迟恢复，确保ReactFlow已经渲染完成
          setTimeout(() => {
            setViewport({
              x: viewportData.x,
              y: viewportData.y,
              zoom: viewportData.zoom
            }, { duration: 300 }); // 使用300ms动画让切换更平滑
          }, 100);
          
          return true;
        }
      }
    } catch (error) {
      console.warn('页面切换时恢复视图状态失败:', error);
    }
    return false;
  };

  // 监听页面切换
  useEffect(() => {
    const previousPage = previousPageRef.current;
    
    // 如果从思维导图页面切换到其他页面，保存视图状态
    if (previousPage === 'mindmap' && currentPage !== 'mindmap') {
      try {
        const currentViewport = getViewport();
        saveViewportState(currentViewport);
      } catch (error) {
        console.warn('离开思维导图页面时保存视图失败:', error);
      }
    }
    
    // 如果从其他页面切换到思维导图页面，恢复视图状态
    if (previousPage !== 'mindmap' && currentPage === 'mindmap') {
      // 延迟恢复，确保ReactFlow组件已经完全加载
      const timer = setTimeout(() => {
        const restored = restoreViewportState();
        if (!restored && isInitializedRef.current) {
          console.log('没有找到保存的视图状态，保持当前视图');
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
    
    // 更新前一个页面引用
    previousPageRef.current = currentPage;
    
    // 标记为已初始化
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
    }
  }, [currentPage, getViewport, setViewport, storageKey]);

  // 组件初始化时，如果当前就在思维导图页面，尝试恢复视图
  useEffect(() => {
    if (currentPage === 'mindmap') {
      const timer = setTimeout(() => {
        restoreViewportState();
        isInitializedRef.current = true;
      }, 300); // 稍长的延迟确保组件完全初始化
      
      return () => clearTimeout(timer);
    }
  }, []); // 只在组件挂载时执行一次

  // 返回手动保存和恢复的方法
  return {
    saveCurrentViewport: () => {
      if (currentPage === 'mindmap') {
        try {
          const currentViewport = getViewport();
          saveViewportState(currentViewport);
        } catch (error) {
          console.warn('手动保存视图失败:', error);
        }
      }
    },
    restoreViewport: () => {
      if (currentPage === 'mindmap') {
        return restoreViewportState();
      }
      return false;
    }
  };
};

export default usePageSwitchViewportSaver;
