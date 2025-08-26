/**
 * 材料节点相关常量
 */

// 输入类型
export const INPUT_TYPES = {
  FILE: 'file',
  TEXT: 'text',
  URL: 'url',
  FOLDER: 'folder'
};

// 视图模式
export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list'
};

// 排序字段
export const SORT_FIELDS = {
  NAME: 'name',
  SIZE: 'size',
  TYPE: 'type',
  DATE: 'date'
};

// 排序顺序
export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc'
};

// 文件分类
export const FILE_CATEGORIES = {
  DOCUMENTS: 'documents',
  IMAGES: 'images',
  VIDEOS: 'videos',
  AUDIO: 'audio',
  ARCHIVES: 'archives',
  CODE: 'code',
  DATA: 'data',
  OTHERS: 'others'
};

// 节点状态
export const NODE_STATES = {
  NORMAL: 'normal',
  EXPANDED: 'expanded',
  CONFIG_OPEN: 'config-open',
  PROCESSING: 'processing',
  DRAG_OVER: 'drag-over',
  SELECTED: 'selected'
};

// 默认配置
export const DEFAULT_CONFIG = {
  inputType: INPUT_TYPES.FILE,
  selectedFiles: [],
  textContent: '',
  urlList: [],
  folderPath: '',
  folderFiles: [],
  selectedFolder: '',
  batchProcessing: false,
  previewEnabled: true,
  maxFileSize: 100, // MB
  allowedFormats: [],
  smartCategorization: false,
  autoPreview: true,
  compressionEnabled: false,
  duplicateDetection: true,
  fileCategories: {},
  searchQuery: '',
  sortBy: SORT_FIELDS.NAME,
  sortOrder: SORT_ORDERS.ASC,
  viewMode: VIEW_MODES.GRID
};

// 动画配置
export const ANIMATION_CONFIG = {
  TRANSITION_DURATION: '0.5s',
  TRANSITION_TIMING: 'cubic-bezier(0.4, 0, 0.2, 1)',
  HOVER_SCALE: 1.02,
  CLICK_SCALE: 0.98,
  DRAG_SCALE: 0.82
};

// 尺寸配置
export const SIZE_CONFIG = {
  NORMAL: {
    MIN_WIDTH: 160,
    MAX_WIDTH: 360,
    HEIGHT: 220,
    SCALE: 0.8
  },
  EXPANDED: {
    MIN_WIDTH: 1200,
    MAX_WIDTH: 1200,
    MIN_HEIGHT: 620
  },
  CONFIG: {
    MIN_WIDTH: 520,
    MAX_WIDTH: 620
  }
};

// 颜色配置
export const COLOR_CONFIG = {
  PRIMARY: '#6366f1',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  LIGHT: '#f8fafc',
  DARK: '#1e293b',
  BORDER: '#e2e8f0',
  TEXT_PRIMARY: '#1e293b',
  TEXT_SECONDARY: '#64748b'
};

// 事件类型
export const EVENT_TYPES = {
  NODE_CLICK: 'node_click',
  NODE_DOUBLE_CLICK: 'node_double_click',
  CONFIG_CLICK: 'config_click',
  EXPAND_CLICK: 'expand_click',
  FILE_SELECT: 'file_select',
  FILE_REMOVE: 'file_remove',
  FILE_PREVIEW: 'file_preview',
  DATA_CHANGE: 'data_change',
  DRAG_OVER: 'drag_over',
  DRAG_LEAVE: 'drag_leave',
  DROP: 'drop'
};

// 错误消息
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: '文件过大',
  INVALID_FILE_TYPE: '不支持的文件类型',
  UPLOAD_FAILED: '文件上传失败',
  PROCESSING_FAILED: '文件处理失败',
  NETWORK_ERROR: '网络错误',
  UNKNOWN_ERROR: '未知错误'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: '文件上传成功',
  FILE_PROCESSED: '文件处理完成',
  DATA_SAVED: '数据保存成功',
  OPERATION_COMPLETED: '操作完成'
};

// 操作类型
export const OPERATION_TYPES = {
  UPLOAD: 'upload',
  REMOVE: 'remove',
  COMPRESS: 'compress',
  CATEGORIZE: 'categorize',
  SEARCH: 'search',
  SORT: 'sort',
  PREVIEW: 'preview'
};

// 键盘快捷键
export const KEYBOARD_SHORTCUTS = {
  EXPAND: 'Enter',
  CONFIG: 'Space',
  DELETE: 'Delete',
  SELECT_ALL: 'Ctrl+A',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  SEARCH: 'Ctrl+F'
};

// 拖拽配置
export const DRAG_CONFIG = {
  ACCEPTED_TYPES: ['Files'],
  MAX_FILES: 100,
  HOVER_DELAY: 100,
  DROP_EFFECT: 'copy'
};

// 预览配置
export const PREVIEW_CONFIG = {
  SUPPORTED_IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
  SUPPORTED_TEXTS: ['txt', 'md', 'json', 'xml', 'html', 'css', 'js'],
  SUPPORTED_VIDEOS: ['mp4', 'webm', 'ogg'],
  SUPPORTED_AUDIO: ['mp3', 'wav', 'ogg'],
  MAX_PREVIEW_SIZE: 10 * 1024 * 1024, // 10MB
  THUMBNAIL_SIZE: 200
};

// 压缩配置
export const COMPRESSION_CONFIG = {
  DEFAULT_QUALITY: 0.8,
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp']
};

// 搜索配置
export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 1,
  DEBOUNCE_DELAY: 300,
  MAX_RESULTS: 100,
  HIGHLIGHT_CLASS: 'search-highlight'
};

// 分页配置
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_VISIBLE_PAGES: 5
};

// 缓存配置
export const CACHE_CONFIG = {
  THUMBNAIL_CACHE_SIZE: 50,
  PREVIEW_CACHE_SIZE: 10,
  STATS_CACHE_TTL: 5000, // 5秒
  FILE_LIST_CACHE_TTL: 10000 // 10秒
};

// 性能配置
export const PERFORMANCE_CONFIG = {
  VIRTUAL_SCROLL_THRESHOLD: 100,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  MAX_CONCURRENT_UPLOADS: 3,
  CHUNK_SIZE: 1024 * 1024 // 1MB
};

// 可访问性配置
export const ACCESSIBILITY_CONFIG = {
  FOCUS_VISIBLE_CLASS: 'focus-visible',
  SCREEN_READER_CLASS: 'sr-only',
  HIGH_CONTRAST_CLASS: 'high-contrast',
  REDUCED_MOTION_CLASS: 'reduced-motion'
};

// 国际化键值
export const I18N_KEYS = {
  MATERIAL_NODE: 'materialNode',
  FILE_MANAGER: 'fileManager',
  UPLOAD_FILES: 'uploadFiles',
  REMOVE_FILES: 'removeFiles',
  PREVIEW_FILE: 'previewFile',
  SEARCH_FILES: 'searchFiles',
  SORT_FILES: 'sortFiles',
  FILE_COUNT: 'fileCount',
  FILE_SIZE: 'fileSize',
  FILE_TYPE: 'fileType',
  LAST_MODIFIED: 'lastModified'
};
