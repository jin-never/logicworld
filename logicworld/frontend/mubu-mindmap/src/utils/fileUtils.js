/**
 * 文件处理工具函数
 */

// 文件图标映射
export const FILE_ICON_MAP = {
  // 文档类
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  txt: '📄',
  rtf: '📄',
  odt: '📄',
  
  // 表格类
  xls: '📊',
  xlsx: '📊',
  csv: '📊',
  
  // 演示文稿
  ppt: '📽️',
  pptx: '📽️',
  
  // 图片类
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  bmp: '🖼️',
  svg: '🖼️',
  webp: '🖼️',
  ico: '🖼️',
  
  // 视频类
  mp4: '🎬',
  avi: '🎬',
  mov: '🎬',
  wmv: '🎬',
  flv: '🎬',
  webm: '🎬',
  mkv: '🎬',
  
  // 音频类
  mp3: '🎵',
  wav: '🎵',
  flac: '🎵',
  aac: '🎵',
  ogg: '🎵',
  wma: '🎵',
  
  // 压缩包
  zip: '📦',
  rar: '📦',
  '7z': '📦',
  tar: '📦',
  gz: '📦',
  bz2: '📦',
  
  // 代码文件
  js: '💻',
  html: '🌐',
  css: '🎨',
  py: '🐍',
  java: '☕',
  cpp: '⚙️',
  c: '⚙️',
  php: '🐘',
  rb: '💎',
  go: '🐹',
  rs: '🦀',
  ts: '📘',
  jsx: '⚛️',
  vue: '💚',
  
  // 其他
  json: '📋',
  xml: '📋',
  yaml: '📋',
  yml: '📋',
  md: '📝',
  log: '📜'
};

// 文件分类映射
export const FILE_CATEGORY_MAP = {
  documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'],
  images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
  videos: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  code: ['js', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'ts', 'jsx', 'vue'],
  data: ['json', 'xml', 'yaml', 'yml', 'csv', 'log']
};

/**
 * 获取文件图标
 * @param {Object} file - 文件对象
 * @returns {string} 文件图标
 */
export const getFileIcon = (file) => {
  const extension = file.extension?.toLowerCase() || '';
  return FILE_ICON_MAP[extension] || '📄';
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 智能文件分类
 * @param {Array} files - 文件数组
 * @returns {Object} 分类后的文件对象
 */
export const categorizeFiles = (files) => {
  const categories = {
    documents: [],
    images: [],
    videos: [],
    audio: [],
    archives: [],
    code: [],
    data: [],
    others: []
  };

  files.forEach(file => {
    const extension = file.extension?.toLowerCase() || '';
    let categorized = false;

    for (const [category, extensions] of Object.entries(FILE_CATEGORY_MAP)) {
      if (extensions.includes(extension)) {
        categories[category].push(file);
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      categories.others.push(file);
    }
  });

  return categories;
};

/**
 * 文件搜索和过滤
 * @param {Array} files - 文件数组
 * @param {string} query - 搜索查询
 * @param {string} sortBy - 排序字段
 * @param {string} sortOrder - 排序顺序
 * @returns {Array} 过滤和排序后的文件数组
 */
export const filterAndSortFiles = (files, query = '', sortBy = 'name', sortOrder = 'asc') => {
  let filtered = files;

  // 搜索过滤
  if (query) {
    filtered = files.filter(file => 
      file.name.toLowerCase().includes(query.toLowerCase()) ||
      file.type.toLowerCase().includes(query.toLowerCase()) ||
      (file.extension && file.extension.toLowerCase().includes(query.toLowerCase()))
    );
  }

  // 排序
  filtered.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'size':
        aValue = a.size || 0;
        bValue = b.size || 0;
        break;
      case 'type':
        aValue = a.extension || '';
        bValue = b.extension || '';
        break;
      case 'date':
        aValue = a.lastModified || 0;
        bValue = b.lastModified || 0;
        break;
      default: // name
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (sortOrder === 'desc') {
      return aValue < bValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });

  return filtered;
};

/**
 * 重复文件检测
 * @param {Array} files - 文件数组
 * @returns {Array} 重复文件数组
 */
export const detectDuplicates = (files) => {
  const duplicates = [];
  const seen = new Map();

  files.forEach(file => {
    const key = `${file.name}_${file.size}`;
    if (seen.has(key)) {
      duplicates.push(file);
    } else {
      seen.set(key, file);
    }
  });

  return duplicates;
};

/**
 * 生成文件统计信息
 * @param {Array} files - 文件数组
 * @param {boolean} enableDuplicateDetection - 是否启用重复检测
 * @returns {Object} 统计信息对象
 */
export const generateFileStats = (files, enableDuplicateDetection = false) => {
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  const categories = categorizeFiles(files);
  const duplicates = enableDuplicateDetection ? detectDuplicates(files) : [];
  const largestFile = files.reduce((largest, file) => 
    (file.size || 0) > (largest?.size || 0) ? file : largest, null
  );

  return {
    count: files.length,
    totalSize: formatFileSize(totalSize),
    totalSizeBytes: totalSize,
    categories,
    duplicatesCount: duplicates.length,
    duplicates,
    largestFile,
    categoryCount: Object.keys(categories).filter(cat => categories[cat].length > 0).length
  };
};

/**
 * 验证文件类型
 * @param {Object} file - 文件对象
 * @param {Array} allowedFormats - 允许的格式数组
 * @returns {boolean} 是否允许的文件类型
 */
export const validateFileType = (file, allowedFormats = []) => {
  if (!allowedFormats.length) return true;
  
  const extension = file.extension?.toLowerCase() || '';
  return allowedFormats.includes(extension);
};

/**
 * 验证文件大小
 * @param {Object} file - 文件对象
 * @param {number} maxSizeMB - 最大文件大小（MB）
 * @returns {boolean} 是否符合大小限制
 */
export const validateFileSize = (file, maxSizeMB = 100) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return (file.size || 0) <= maxSizeBytes;
};

/**
 * 处理文件上传
 * @param {FileList} fileList - 文件列表
 * @param {Object} options - 处理选项
 * @returns {Array} 处理后的文件数组
 */
export const processFileUpload = (fileList, options = {}) => {
  const {
    allowedFormats = [],
    maxSizeMB = 100,
    enableValidation = true
  } = options;

  const files = Array.from(fileList);
  const processedFiles = [];
  const errors = [];

  files.forEach((file, index) => {
    const processedFile = {
      id: `file_${Date.now()}_${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      extension: file.name.split('.').pop()?.toLowerCase() || '',
      lastModified: file.lastModified,
      file: file // 保留原始文件对象
    };

    if (enableValidation) {
      // 验证文件类型
      if (!validateFileType(processedFile, allowedFormats)) {
        errors.push({
          file: processedFile,
          error: `不支持的文件类型: ${processedFile.extension}`
        });
        return;
      }

      // 验证文件大小
      if (!validateFileSize(processedFile, maxSizeMB)) {
        errors.push({
          file: processedFile,
          error: `文件过大: ${formatFileSize(processedFile.size)} (最大: ${maxSizeMB}MB)`
        });
        return;
      }
    }

    processedFiles.push(processedFile);
  });

  return {
    files: processedFiles,
    errors
  };
};
