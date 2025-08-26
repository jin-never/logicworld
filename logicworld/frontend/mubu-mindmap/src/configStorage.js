export const loadConfiguredTools = () => {
  try {
    return JSON.parse(localStorage.getItem('configuredTools') || '{}');
  } catch (_) {
    return {};
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

// 新增：创建或更新工具配置
// 若 toolConfig 中已包含 id，则视为更新；否则视为创建并自动生成 id。
export const saveConfiguredTool = async (category, toolConfig) => {
  if (!category) return null;

  try {
    const data = loadConfiguredTools();
    if (!Array.isArray(data[category])) {
      data[category] = [];
    }

    // 更新 or 创建判断
    let { id } = toolConfig;
    const list = data[category];
    let index = -1;
    if (id) {
      index = list.findIndex((t) => t.id === id);
    }

    const isUpdate = index >= 0;

    // 如果是新创建，生成ID
    if (!isUpdate) {
      id = generateId();
      toolConfig = { ...toolConfig, id };
    }

    // 调用后端API
    let apiEndpoint = '';
    let method = isUpdate ? 'PUT' : 'POST';

    switch (category) {
      case 'ai':
        apiEndpoint = isUpdate ? `/api/tools/ai-tools/${id}` : '/api/tools/ai-tools';
        break;
      case 'api':
        apiEndpoint = isUpdate ? `/api/tools/api-tools/${id}` : '/api/tools/api-tools';
        break;
      case 'mcp':
        apiEndpoint = isUpdate ? `/api/tools/mcp-tools/${id}` : '/api/tools/mcp-tools';
        break;
      default:
        // 对于其他类型，只进行本地保存
        break;
    }

    if (apiEndpoint) {
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolConfig)
      });

      if (!response.ok) {
        throw new Error('Failed to save tool to backend');
      }
    }

    // 更新本地存储
    if (isUpdate) {
      // 更新已有
      list[index] = { ...list[index], ...toolConfig };
    } else {
      // 创建新配置
      list.push({ ...toolConfig, id });
    }

    data[category] = list;
    localStorage.setItem('configuredTools', JSON.stringify(data));
    window.dispatchEvent(new Event('configuredToolsUpdated'));

    // 触发工具库更新事件
    window.dispatchEvent(new Event('toolsConfigUpdated'));

    return id;
  } catch (error) {
    console.error('保存工具失败:', error);
    alert('保存工具失败: ' + error.message);
    return null;
  }
};

// 根据 id 更新指定工具
export const updateConfiguredTool = (category, id, newPartialConfig = {}) => {
  if (!category || !id) return false;
  const data = loadConfiguredTools();
  const list = Array.isArray(data[category]) ? data[category] : [];
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...newPartialConfig, id };
  data[category] = list;
  localStorage.setItem('configuredTools', JSON.stringify(data));
  window.dispatchEvent(new Event('configuredToolsUpdated'));
  return true;
};

// 删除指定工具
export const deleteConfiguredTool = async (category, id) => {
  if (!category || !id) return false;

  try {
    // 调用后端API删除工具
    let apiEndpoint = '';
    switch (category) {
      case 'ai':
        apiEndpoint = `/api/tools/ai-tools/${id}`;
        break;
      case 'api':
        apiEndpoint = `/api/tools/api-tools/${id}`;
        break;
      case 'mcp':
        apiEndpoint = `/api/tools/mcp-tools/${id}`;
        break;
      default:
        // 对于其他类型，只进行本地删除
        break;
    }

    if (apiEndpoint) {
      const response = await fetch(apiEndpoint, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete tool from backend');
      }
    }

    // 从本地存储中删除
    const data = loadConfiguredTools();
    const list = Array.isArray(data[category]) ? data[category] : [];
    const newList = list.filter((t) => t.id !== id);
    if (newList.length === list.length) return false; // 未找到
    data[category] = newList;
    localStorage.setItem('configuredTools', JSON.stringify(data));
    window.dispatchEvent(new Event('configuredToolsUpdated'));

    // 触发工具库更新事件
    window.dispatchEvent(new Event('toolsConfigUpdated'));

    return true;
  } catch (error) {
    console.error('删除工具失败:', error);
    alert('删除工具失败: ' + error.message);
    return false;
  }
};

// ------------ 系统工具库 (管理员或批准后存放) ------------
export const loadSystemTools = () => {
  try {
    return JSON.parse(localStorage.getItem('systemTools') || '[]');
  } catch (_) {
    return [];
  }
};

export const saveSystemTool = (tool) => {
  if (!tool) return;
  const list = loadSystemTools();
  // 去重判断 name
  if (!list.some((t) => (t.name || t.baseUrl) === (tool.name || tool.baseUrl))) {
    list.push(tool);
    localStorage.setItem('systemTools', JSON.stringify(list));
    window.dispatchEvent(new Event('systemToolsUpdated'));
  }
};

// 后端 API 地址 - 使用相对路径让代理配置生效
const API_BASE = process.env.REACT_APP_API_BASE || '';

// 安全的数组处理函数
const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(item => item);
  }
  return [];
};

// 安全的join函数
const safeJoin = (value, separator = ' ') => {
  const arr = ensureArray(value);
  return arr.join(separator);
};

export const refreshSystemToolsFromBackend = async () => {
  try {
    const resp = await fetch(`${API_BASE}/system-tools`);
    if (resp.ok) {
      const list = await resp.json();
      if (Array.isArray(list)) {
        localStorage.setItem('systemTools', JSON.stringify(list));
        window.dispatchEvent(new Event('systemToolsUpdated'));
      }
    } else {
      console.error('获取 system-tools 失败', resp.status);
    }
  } catch (e) {
    console.error('刷新 system-tools 出错', e);
  }
};

// 导出辅助函数
export { ensureArray, safeJoin };