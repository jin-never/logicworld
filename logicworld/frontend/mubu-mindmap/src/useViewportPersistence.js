import { useEffect, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * 视图持久化Hook
 * 自动保存和恢复用户的视图位置、缩放级别
 * 支持页面切换时的视图状态保持
 */
const useViewportPersistence = (storageKey = 'workflow_viewport', isActive = true) => {
  const { getViewport, setViewport } = useReactFlow();
  const saveTimeoutRef = useRef(null);
  const isRestoringRef = useRef(false);

  // 保存视图状态到localStorage
  const saveViewport = useCallback((viewport) => {
    if (isRestoringRef.current) {
      console.log('正在恢复视图中，跳过保存');
      return; // 恢复过程中不保存
    }

    try {
      const viewportData = {
        x: Math.round(viewport.x * 100) / 100, // 保留2位小数
        y: Math.round(viewport.y * 100) / 100,
        zoom: Math.round(viewport.zoom * 100) / 100,
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(viewportData));
      console.log('🔄 用户视图状态已保存:', {
        位置: `(${viewportData.x}, ${viewportData.y})`,
        缩放: `${Math.round(viewportData.zoom * 100)}%`,
        时间: new Date(viewportData.timestamp).toLocaleTimeString()
      });
    } catch (error) {
      console.warn('保存视图状态失败:', error);
    }
  }, [storageKey]);

  // 防抖保存
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const currentViewport = getViewport();
        saveViewport(currentViewport);
      } catch (error) {
        console.warn('获取视图状态失败:', error);
      }
    }, 300); // 300ms防抖
  }, [getViewport, saveViewport]);

  // 从localStorage恢复视图状态
  const restoreViewport = useCallback(() => {
    try {
      const savedViewport = localStorage.getItem(storageKey);
      if (savedViewport) {
        const viewportData = JSON.parse(savedViewport);

        // 验证数据有效性
        if (typeof viewportData.x === 'number' &&
            typeof viewportData.y === 'number' &&
            typeof viewportData.zoom === 'number' &&
            viewportData.zoom > 0) {

          isRestoringRef.current = true;

          console.log('📍 恢复用户上次的视图状态:', {
            位置: `(${viewportData.x}, ${viewportData.y})`,
            缩放: `${Math.round(viewportData.zoom * 100)}%`,
            保存时间: new Date(viewportData.timestamp).toLocaleString()
          });

          setViewport({
            x: viewportData.x,
            y: viewportData.y,
            zoom: viewportData.zoom
          }, { duration: 300 }); // 使用平滑动画恢复

          // 恢复完成后允许保存
          setTimeout(() => {
            isRestoringRef.current = false;
            console.log('✅ 视图恢复完成，现在可以保存新的视图变化');
          }, 500);

          return true;
        } else {
          console.log('❌ 保存的视图数据无效:', viewportData);
        }
      } else {
        console.log('📭 没有找到保存的视图数据，使用默认视图');
      }
    } catch (error) {
      console.warn('恢复视图状态失败:', error);
    }
    return false;
  }, [storageKey, setViewport]);

  // 监听视图变化事件
  useEffect(() => {
    if (!isActive) return; // 只有在思维导图页面激活时才监听事件

    let isMouseDown = false;
    let isDragging = false;

    const handleMouseDown = () => {
      isMouseDown = true;
      isDragging = false;
    };

    const handleMouseMove = () => {
      if (isMouseDown) {
        isDragging = true;
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        // 拖拽结束后保存视图
        debouncedSave();
      }
      isMouseDown = false;
      isDragging = false;
    };

    const handleWheel = () => {
      // 缩放后保存视图
      debouncedSave();
    };

    const handleTouchEnd = () => {
      // 触摸结束后保存视图
      debouncedSave();
    };

    // 获取ReactFlow容器
    const reactFlowWrapper = document.querySelector('.react-flow');
    if (reactFlowWrapper) {
      reactFlowWrapper.addEventListener('mousedown', handleMouseDown);
      reactFlowWrapper.addEventListener('mousemove', handleMouseMove);
      reactFlowWrapper.addEventListener('mouseup', handleMouseUp);
      reactFlowWrapper.addEventListener('wheel', handleWheel, { passive: true });
      reactFlowWrapper.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (reactFlowWrapper) {
        reactFlowWrapper.removeEventListener('mousedown', handleMouseDown);
        reactFlowWrapper.removeEventListener('mousemove', handleMouseMove);
        reactFlowWrapper.removeEventListener('mouseup', handleMouseUp);
        reactFlowWrapper.removeEventListener('wheel', handleWheel);
        reactFlowWrapper.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [debouncedSave, isActive]); // 添加isActive依赖

  // 页面加载时恢复视图
  useEffect(() => {
    if (!isActive) return; // 只有在思维导图页面激活时才恢复视图

    // 延迟恢复，确保ReactFlow完全初始化
    const timer = setTimeout(() => {
      const restored = restoreViewport();
      if (!restored) {
        console.log('没有找到保存的视图状态，使用默认视图');
      } else {
        console.log('思维导图页面激活，视图状态已恢复');
      }
    }, 300); // 增加延迟确保组件完全加载

    return () => clearTimeout(timer);
  }, [restoreViewport, isActive]); // 页面切换时重新恢复视图

  // 页面卸载前保存视图
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isActive) return; // 只有在思维导图页面时才保存
      try {
        const currentViewport = getViewport();
        saveViewport(currentViewport);
        console.log('页面卸载前已保存视图状态');
      } catch (error) {
        console.warn('页面卸载前保存视图失败:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!isActive) return; // 只有在思维导图页面时才保存
      if (document.hidden) {
        try {
          const currentViewport = getViewport();
          saveViewport(currentViewport);
          console.log('页面隐藏时已保存视图状态');
        } catch (error) {
          console.warn('页面隐藏时保存视图失败:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getViewport, saveViewport, isActive]);

  // 页面切换时保存当前视图状态
  useEffect(() => {
    return () => {
      // 组件卸载时（页面切换时）保存视图状态
      if (isActive) {
        try {
          const currentViewport = getViewport();
          saveViewport(currentViewport);
          console.log('页面切换时已保存视图状态');
        } catch (error) {
          console.warn('页面切换时保存视图失败:', error);
        }
      }
    };
  }, [isActive, getViewport, saveViewport]);

  return {
    saveViewport: debouncedSave,
    restoreViewport,
    manualSave: () => {
      try {
        const currentViewport = getViewport();
        saveViewport(currentViewport);
      } catch (error) {
        console.warn('手动保存视图失败:', error);
      }
    }
  };
};

export default useViewportPersistence;
