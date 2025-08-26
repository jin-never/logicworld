// State persistence utility for maintaining UI state across page refreshes
// Handles node expansion, dialog visibility, and document information
import React from 'react';

const STATE_STORAGE_KEY = 'workflow-ui-state';

/**
 * Save UI state to localStorage
 * @param {string} nodeId - Node ID
 * @param {Object} state - State object to save
 */
export const saveNodeState = (nodeId, state) => {
  try {
    const existingState = getStoredState();
    existingState.nodes[nodeId] = {
      ...existingState.nodes[nodeId],
      ...state,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(existingState));
    console.log(`💾 已保存节点 ${nodeId} 的状态:`, state);
  } catch (error) {
    console.warn('保存节点状态失败:', error);
  }
};

/**
 * Save global UI state
 * @param {Object} globalState - Global state object
 */
export const saveGlobalState = (globalState) => {
  try {
    const existingState = getStoredState();
    existingState.global = {
      ...existingState.global,
      ...globalState,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(existingState));
    console.log('💾 已保存全局UI状态:', globalState);
  } catch (error) {
    console.warn('保存全局状态失败:', error);
  }
};

/**
 * Get stored state from localStorage
 */
export const getStoredState = () => {
  try {
    const stored = localStorage.getItem(STATE_STORAGE_KEY);
    if (stored && stored !== 'undefined' && stored !== 'null') {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('读取存储状态失败:', error);
    localStorage.removeItem(STATE_STORAGE_KEY);
  }
  
  return {
    nodes: {},
    global: {},
    lastUpdated: Date.now()
  };
};

/**
 * Get state for a specific node
 * @param {string} nodeId - Node ID
 */
export const getNodeState = (nodeId) => {
  const state = getStoredState();
  return state.nodes[nodeId] || {};
};

/**
 * Get global UI state
 */
export const getGlobalState = () => {
  const state = getStoredState();
  return state.global || {};
};

/**
 * Remove state for a specific node
 * @param {string} nodeId - Node ID
 */
export const removeNodeState = (nodeId) => {
  try {
    const existingState = getStoredState();
    delete existingState.nodes[nodeId];
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(existingState));
    console.log(`🗑️ 已删除节点 ${nodeId} 的状态`);
  } catch (error) {
    console.warn('删除节点状态失败:', error);
  }
};

/**
 * Clear all stored UI state
 */
export const clearAllState = () => {
  try {
    localStorage.removeItem(STATE_STORAGE_KEY);
    console.log('🧹 已清除所有UI状态');
  } catch (error) {
    console.warn('清除状态失败:', error);
  }
};

/**
 * Save Document Preview Dialog state
 * @param {Object} dialogState - Dialog state
 */
export const saveDocumentDialogState = (dialogState) => {
  saveGlobalState({
    documentDialog: dialogState
  });
};

/**
 * Get Document Preview Dialog state
 */
export const getDocumentDialogState = () => {
  const globalState = getGlobalState();
  return globalState.documentDialog || {};
};

/**
 * Hook for automatic state persistence
 * @param {string} nodeId - Node ID
 * @param {Object} currentState - Current state
 * @param {number} debounceMs - Debounce delay in milliseconds
 */
export const useStatePersistence = (nodeId, currentState, debounceMs = 500) => {
  const timeoutRef = React.useRef(null);
  
  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (nodeId && currentState) {
        saveNodeState(nodeId, currentState);
      }
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodeId, currentState, debounceMs]);
  
  // Return stored state on mount
  return React.useMemo(() => {
    if (nodeId) {
      return getNodeState(nodeId);
    }
    return {};
  }, [nodeId]);
};

/**
 * Initialize state from storage
 * @param {string} nodeId - Node ID
 */
export const initializeNodeState = (nodeId) => {
  return getNodeState(nodeId);
};

export default {
  saveNodeState,
  saveGlobalState,
  getStoredState,
  getNodeState,
  getGlobalState,
  removeNodeState,
  clearAllState,
  saveDocumentDialogState,
  getDocumentDialogState,
  useStatePersistence,
  initializeNodeState
}; 