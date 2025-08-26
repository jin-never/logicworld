import React, { useState, useRef, memo, useLayoutEffect, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import './GridPreview.css';


// 后端基地址（前端3000 -> 后端8000）
const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin.replace(':3000', ':8000')
  : '';



function iconForExt(ext) {
  if (!ext) return '📄';
  const e = ext.toLowerCase();
  if (['jpg','jpeg','png','gif','bmp','tiff','svg','webp'].includes(e)) return '🖼️';
  if (['mp3','wav','flac','m4a','aac','ogg'].includes(e)) return '🎵';
  if (['mp4','avi','mov','mkv','wmv','flv'].includes(e)) return '🎬';
  if (['zip','rar','7z'].includes(e)) return '📦';
  if (['doc','docx'].includes(e)) return '📝';
  if (['xls','xlsx','csv'].includes(e)) return '📊';
  if (['ppt','pptx'].includes(e)) return '📑';
  if (['pdf'].includes(e)) return '📕';
  if (['js','ts','py','java','html','css','json','xml','md'].includes(e)) return '��';
  return '📄';
}

async function openPreviewFile(filePath, showInModal = false) {
  try {
    if (!filePath) return;
    const urlExists = `${API_BASE}/api/local-tools/file-manager/exists?filepath=${encodeURIComponent(filePath)}`;
    const resp = await fetch(urlExists);
    if (!resp.ok) throw new Error('文件校验失败');
    const data = await resp.json();
    if (!data.exists) throw new Error('文件不存在');
    const streamUrl = `${API_BASE}/api/local-tools/file-manager/stream?filepath=${encodeURIComponent(filePath)}`;
    
    if (showInModal) {
      // 在当前页面的弹窗中显示产品
      const modal = document.createElement('div');
      modal.className = 'product-preview-modal';
      modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()">
          <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h3>产品预览 - ${filePath.split('/').pop()}</h3>
              <button class="close-btn" onclick="this.closest('.product-preview-modal').remove()">×</button>
            </div>
            <div class="modal-body">
              <iframe src="${streamUrl}" style="width:100%;height:500px;border:none;"></iframe>
            </div>
            <div class="modal-footer">
              <button onclick="window.open('${streamUrl}', '_blank')" class="btn btn-primary">在新标签页中打开</button>
              <button onclick="this.closest('.product-preview-modal').remove()" class="btn btn-secondary">关闭</button>
            </div>
          </div>
        </div>
      `;
      
      // 添加样式
      const style = document.createElement('style');
      style.textContent = `
        .product-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
        }
        .product-preview-modal .modal-overlay {
          background: rgba(0,0,0,0.5);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .product-preview-modal .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 1000px;
          max-height: 90%;
          display: flex;
          flex-direction: column;
        }
        .product-preview-modal .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .product-preview-modal .modal-body {
          flex: 1;
          padding: 20px;
          overflow: auto;
        }
        .product-preview-modal .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .product-preview-modal .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        .product-preview-modal .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .product-preview-modal .btn-primary {
          background: #007bff;
          color: white;
        }
        .product-preview-modal .btn-secondary {
          background: #6c757d;
          color: white;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(modal);
    } else {
      // 原有的新标签页打开方式
      window.open(streamUrl, '_blank');
    }
  } catch (e) {
    console.error('文件预览失败:', e);
    alert(`无法预览文件: ${e.message || e}`);
  }
}

async function openWithSystemApp(filePath) {
  try {
    if (!filePath) return;
    const resp = await fetch(`${API_BASE}/api/local-tools/file-manager/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath: filePath })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `open failed (${resp.status})`);
    }
  } catch (e) {
    console.error('系统打开失败:', e);
    alert(`无法用系统应用打开: ${e.message || e}`);
  }
}

const ResultNode = memo(({ id, data, selected, onNodeDataChange, onNodeSizeChange }) => {
  const nodeRef = useRef(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // 🔧 新增：检测节点执行状态并应用对应样式
  const getNodeStatusClass = () => {
    const status = data?.status;
    if (status === 'success' || status === 'completed') return 'status-success';
    if (status === 'error' || status === 'failed') return 'status-error';
    if (status === 'running') return 'status-running';
    return 'status-idle';
  };
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [exportHistory, setExportHistory] = useState([]);
  const [nodeData, setNodeData] = useState(() => {
    // 从个人设置中获取默认存储路径
    const getDefaultStoragePath = () => {
      try {
        // 尝试两种可能的键名
        let workspaceSettings = JSON.parse(localStorage.getItem('workspaceSettings') || '{}');
        if (!workspaceSettings.defaultOutputPath) {
          workspaceSettings = JSON.parse(localStorage.getItem('workspace-settings') || '{}');
        }
        return workspaceSettings.defaultOutputPath || '';
      } catch {
        return '';
      }
    };
    return {
      ...data,
      storagePath: data.storagePath || getDefaultStoragePath()
    };
  });
  const autoFetchedRef = useRef(false);

  // 在组件初始化时通知父组件初始数据
  useEffect(() => {
    if (onNodeDataChange && nodeData.storagePath) {
      console.log('🔧 ResultNode: 初始化时通知父组件 storagePath:', nodeData.storagePath);
      onNodeDataChange(id, nodeData);
    }
  }, []); // 只在组件挂载时执行一次

  // 监听个人设置变化，自动更新存储路径
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        // 尝试两种可能的键名
        let workspaceSettings = JSON.parse(localStorage.getItem('workspaceSettings') || '{}');
        if (!workspaceSettings.defaultOutputPath) {
          workspaceSettings = JSON.parse(localStorage.getItem('workspace-settings') || '{}');
        }
        const newPath = workspaceSettings.defaultOutputPath || '';
        
        if (newPath !== nodeData.storagePath) {
          const updatedData = { ...nodeData, storagePath: newPath };
          setNodeData(updatedData);
          
          // 通知父组件数据变化
          if (onNodeDataChange) {
            onNodeDataChange(id, updatedData);
          }
        }
      } catch (error) {
        console.error('获取存储路径失败:', error);
      }
    };

    // 监听localStorage变化
    window.addEventListener('storage', handleStorageChange);
    
    // 定期检查路径变化（用于同一页面内的更新）
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [nodeData.storagePath, onNodeDataChange, id]);





  // 文件格式分类（增加“全文件”占位分类，选中后隐藏具体格式）
  const formatCategories = {
    all: { label: '🗂️ 全文件（自动）', formats: {} },
    office: {
      label: '📋 Office',
      formats: {
        doc: { label: 'Word文档 (.doc)', value: 'doc', ext: '.doc' },
        docx: { label: 'Word文档 (.docx)', value: 'docx', ext: '.docx' },
        xls: { label: 'Excel表格 (.xls)', value: 'xls', ext: '.xls' },
        xlsx: { label: 'Excel表格 (.xlsx)', value: 'xlsx', ext: '.xlsx' },
        ppt: { label: 'PowerPoint (.ppt)', value: 'ppt', ext: '.ppt' },
        pptx: { label: 'PowerPoint (.pptx)', value: 'pptx', ext: '.pptx' }
      }
    },
    document: {
      label: '📄 文档类',
      formats: {
        txt: { label: '文本文件 (.txt)', value: 'txt', ext: '.txt' },
        pdf: { label: 'PDF文档 (.pdf)', value: 'pdf', ext: '.pdf' },
        rtf: { label: 'RTF文档 (.rtf)', value: 'rtf', ext: '.rtf' },
        md: { label: 'Markdown (.md)', value: 'md', ext: '.md' },
        epub: { label: 'EPUB电子书 (.epub)', value: 'epub', ext: '.epub' }
      }
    },
    image: {
      label: '🖼️ 图片类',
      formats: {
        jpg: { label: 'JPEG图片 (.jpg)', value: 'jpg', ext: '.jpg' },
        jpeg: { label: 'JPEG图片 (.jpeg)', value: 'jpeg', ext: '.jpeg' },
        png: { label: 'PNG图片 (.png)', value: 'png', ext: '.png' },
        gif: { label: 'GIF动图 (.gif)', value: 'gif', ext: '.gif' },
        bmp: { label: 'BMP图片 (.bmp)', value: 'bmp', ext: '.bmp' },
        tiff: { label: 'TIFF图片 (.tiff)', value: 'tiff', ext: '.tiff' },
        svg: { label: 'SVG矢量图 (.svg)', value: 'svg', ext: '.svg' }
      }
    },
    audio: {
      label: '🎵 音频类',
      formats: {
        mp3: { label: 'MP3音频 (.mp3)', value: 'mp3', ext: '.mp3' },
        wav: { label: 'WAV音频 (.wav)', value: 'wav', ext: '.wav' },
        flac: { label: 'FLAC音频 (.flac)', value: 'flac', ext: '.flac' },
        m4a: { label: 'M4A音频 (.m4a)', value: 'm4a', ext: '.m4a' },
        aac: { label: 'AAC音频 (.aac)', value: 'aac', ext: '.aac' },
        ogg: { label: 'OGG音频 (.ogg)', value: 'ogg', ext: '.ogg' }
      }
    },
    video: {
      label: '🎬 视频类',
      formats: {
        mp4: { label: 'MP4视频 (.mp4)', value: 'mp4', ext: '.mp4' },
        avi: { label: 'AVI视频 (.avi)', value: 'avi', ext: '.avi' },
        mov: { label: 'MOV视频 (.mov)', value: 'mov', ext: '.mov' },
        mkv: { label: 'MKV视频 (.mkv)', value: 'mkv', ext: '.mkv' },
        wmv: { label: 'WMV视频 (.wmv)', value: 'wmv', ext: '.wmv' },
        flv: { label: 'FLV视频 (.flv)', value: 'flv', ext: '.flv' }
      }
    },
    archive: {
      label: '📦 压缩包',
      formats: {
        zip: { label: 'ZIP压缩包 (.zip)', value: 'zip', ext: '.zip' },
        rar: { label: 'RAR压缩包 (.rar)', value: 'rar', ext: '.rar' },
        '7z': { label: '7Z压缩包 (.7z)', value: '7z', ext: '.7z' }
      }
    },
    code: {
      label: '💻 代码类',
      formats: {
        js: { label: 'JavaScript (.js)', value: 'js', ext: '.js' },
        py: { label: 'Python (.py)', value: 'py', ext: '.py' },
        java: { label: 'Java (.java)', value: 'java', ext: '.java' },
        html: { label: 'HTML (.html)', value: 'html', ext: '.html' },
        css: { label: 'CSS (.css)', value: 'css', ext: '.css' },
        json: { label: 'JSON (.json)', value: 'json', ext: '.json' },
        xml: { label: 'XML (.xml)', value: 'xml', ext: '.xml' }
      }
    },
    other: {
      label: '📁 其他',
      formats: {
        log: { label: '日志文件 (.log)', value: 'log', ext: '.log' },
        tmp: { label: '临时文件 (.tmp)', value: 'tmp', ext: '.tmp' },
        bak: { label: '备份文件 (.bak)', value: 'bak', ext: '.bak' },
        cfg: { label: '配置文件 (.cfg)', value: 'cfg', ext: '.cfg' },
        ini: { label: '配置文件 (.ini)', value: 'ini', ext: '.ini' },
        dat: { label: '数据文件 (.dat)', value: 'dat', ext: '.dat' },
        bin: { label: '二进制文件 (.bin)', value: 'bin', ext: '.bin' }
      }
    }
  };

  // 监控状态变化
  useEffect(() => {
    console.log('nodeData 状态变化:', nodeData);
  }, [nodeData]);

  // 监控外部 data 变化
  useEffect(() => {
    console.log('外部 data 变化:', data);
    if (data && (data.selectedCategory !== nodeData.selectedCategory || data.outputFormat !== nodeData.outputFormat)) {
      console.log('外部数据覆盖了内部状态!');
    }
  }, [data, nodeData]);

  // 调试信息
  console.log('formatCategories 对象:', formatCategories);
  console.log('formatCategories 键值:', Object.keys(formatCategories));
  console.log('当前 nodeData:', nodeData);

  // 获取所有格式的平铺对象，用于查找
  const getAllFormats = () => {
    const allFormats = {};
    Object.values(formatCategories).forEach(category => {
      Object.assign(allFormats, category.formats);
    });
    return allFormats;
  };

  // 🆕 文件类型自动识别和格式匹配
  const detectFileTypeAndFormat = (files) => {
    if (!files || files.length === 0) return { category: 'document', format: 'txt' };
    
    // 分析文件扩展名的分布
    const extCounts = {};
    const categoryMapping = {
      office: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
      document: ['txt', 'pdf', 'rtf', 'md', 'epub'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg'],
      audio: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'],
      video: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz'],
      data: ['json', 'xml', 'csv', 'yaml'],
      other: []
    };
    
    files.forEach(file => {
      const ext = (file.ext || file.path?.split('.').pop() || '').toLowerCase();
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    });
    
    // 找到最主要的文件类型
    let dominantCategory = 'document';
    let dominantFormat = 'txt';
    let maxCount = 0;
    
    for (const [category, exts] of Object.entries(categoryMapping)) {
      const categoryCount = exts.reduce((sum, ext) => sum + (extCounts[ext] || 0), 0);
      if (categoryCount > maxCount) {
        maxCount = categoryCount;
        dominantCategory = category;
        
        // 选择该类别中最常见的格式
        const categoryExts = exts.filter(ext => extCounts[ext] > 0);
        if (categoryExts.length > 0) {
          dominantFormat = categoryExts.reduce((a, b) => 
            (extCounts[a] || 0) > (extCounts[b] || 0) ? a : b
          );
        }
      }
    }
    
    console.log(`🎯 [AutoDetect] 检测到主要文件类型: ${dominantCategory}, 格式: ${dominantFormat}`);
    return { category: dominantCategory, format: dominantFormat };
  };

  // 处理数据变化
  const handleDataChange = (key, value) => {
    console.log(`handleDataChange: ${key} = ${value}`);
    const newData = { ...nodeData, [key]: value };
    console.log('新数据:', newData);
    setNodeData(newData);
    if (onNodeDataChange) {
      onNodeDataChange(id, newData);
    }
  };

  // 切换配置界面
  const handleConfigToggle = () => {
    setIsConfigOpen(!isConfigOpen);
  };

  const handleNodeClick = () => {
    setClickCount(prev => prev + 1);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount + 1 >= 2) {
        // 双击 - 展开配置
        setIsConfigOpen(!isConfigOpen);
      }
      // 重置点击计数
      setClickCount(0);
    }, 300); // 300ms内的点击算作双击
  };

  // 处理尺寸变化
  useLayoutEffect(() => {
    if (nodeRef.current && onNodeSizeChange) {
      const rect = nodeRef.current.getBoundingClientRect();
      onNodeSizeChange(id, { width: rect.width, height: rect.height });
    }
  }, [isConfigOpen, id, onNodeSizeChange]);

  // Notify parent when config state changes
  useEffect(() => {
    if (onNodeDataChange && nodeData && nodeData.isConfigOpen !== isConfigOpen) {
      onNodeDataChange(id, { ...nodeData, isConfigOpen });
    }
  }, [isConfigOpen, id, onNodeDataChange, nodeData?.isConfigOpen]);

  // 根据文件格式生成内容
  const generateFormattedContent = () => {
    const { outputFormat, inputSources } = nodeData;
    console.log(`生成内容，当前格式: ${outputFormat}`);

    // 🔧 修复：使用实际的工作流执行结果，而不是模板数据
    console.log('🔍 [ResultNode] 检查inputSources:', inputSources);
    console.log('🔍 [ResultNode] inputSources长度:', inputSources.length);
    
    let actualData = [];
    
    if (inputSources.length > 0) {
      // 使用实际的输入数据
      actualData = inputSources;
      console.log('✅ [ResultNode] 使用实际输入数据，数量:', actualData.length);
    } else {
      // 🚫 如果没有实际数据，不应该生成任何内容
      console.error('❌ [ResultNode] 没有找到实际的工作流执行结果，无法生成内容');
      throw new Error('没有可用的工作流执行结果。请确保前面的执行节点已成功运行并产生输出。');
    }

    // 根据不同格式生成内容
    switch (outputFormat) {
      // 文档类
      case 'txt':
        return actualData.map(item => item.content).join('\n\n');

      case 'doc':
      case 'docx':
        // 后端会使用python-docx生成真正的Word文档
        return `工作流执行结果\n\n创建时间: ${new Date().toLocaleString()}\n\n` +
               actualData.map((item, index) => `${index + 1}. ${item.content}`).join('\n\n');

      case 'pdf':
        return `PDF文档内容\n标题: 工作流执行结果\n生成时间: ${new Date().toLocaleString()}\n\n` +
               actualData.map((item, index) => `章节 ${index + 1}: ${item.content}`).join('\n\n');

      case 'xls':
      case 'xlsx':
        const headers = 'ID\t类型\t内容\t时间';
        const rows = actualData.map((item, index) =>
          `${index + 1}\t${item.type || 'text'}\t${item.content}\t${new Date().toLocaleString()}`
        ).join('\n');
        return `${headers}\n${rows}`;

      case 'ppt':
      case 'pptx':
        return `演示文稿: 工作流结果\n\n` +
               actualData.map((item, index) => `幻灯片 ${index + 1}:\n标题: 结果 ${index + 1}\n内容: ${item.content}\n`).join('\n');

      // 代码类
      case 'js':
        return `// 工作流结果 - JavaScript\nconst results = ${JSON.stringify(actualData, null, 2)};\n\nconsole.log('工作流执行完成:', results);`;

      case 'py':
        return `# 工作流结果 - Python\nimport json\nfrom datetime import datetime\n\nresults = ${JSON.stringify(actualData, null, 2)}\n\nprint("工作流执行完成:", results)`;

      case 'java':
        return `// 工作流结果 - Java\npublic class WorkflowResult {\n    public static void main(String[] args) {\n        System.out.println("工作流执行完成");\n        // 结果数据处理\n    }\n}`;

      case 'html':
        return `<!DOCTYPE html>\n<html>\n<head>\n    <title>工作流结果</title>\n    <meta charset="UTF-8">\n</head>\n<body>\n    <h1>工作流执行结果</h1>\n    ${actualData.map((item, index) =>
          `<div><h2>内容 ${index + 1}</h2><p>${item.content}</p></div>`
        ).join('\n    ')}\n</body>\n</html>`;

      case 'css':
        return `.workflow-result {\n    font-family: Arial, sans-serif;\n    margin: 20px;\n}\n\n.content-item {\n    margin-bottom: 15px;\n    padding: 10px;\n    border-left: 3px solid #007cba;\n}`;

      case 'json':
        return JSON.stringify({
          timestamp: new Date().toISOString(),
          results: actualData,
          total: actualData.length,
          format: outputFormat
        }, null, 2);

      case 'xml':
        return `<?xml version="1.0" encoding="UTF-8"?>\n<results>\n    <timestamp>${new Date().toISOString()}</timestamp>\n    <format>${outputFormat}</format>\n    ${actualData.map((item, index) =>
          `<item id="${index + 1}">\n        <type>${item.type || 'text'}</type>\n        <content>${item.content}</content>\n    </item>`
        ).join('\n    ')}\n</results>`;

      case 'md':
        return `# 工作流结果\n\n**生成时间:** ${new Date().toLocaleString()}\n\n` +
               actualData.map((item, index) => `## 内容 ${index + 1}\n\n${item.content}\n`).join('\n');

      // 其他格式的占位符内容
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'tiff':
      case 'svg':
        return `图片文件内容 (${outputFormat.toUpperCase()})\n文件信息: 工作流生成的图片\n内容数量: ${actualData.length} 项`;

      case 'mp3':
      case 'wav':
      case 'flac':
      case 'm4a':
      case 'aac':
      case 'ogg':
        return `音频文件内容 (${outputFormat.toUpperCase()})\n音频信息: 工作流生成的音频\n时长: 估计 ${actualData.length * 30} 秒`;

      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
      case 'wmv':
      case 'flv':
        return `视频文件内容 (${outputFormat.toUpperCase()})\n视频信息: 工作流生成的视频\n时长: 估计 ${actualData.length * 60} 秒`;

      case 'zip':
      case 'rar':
      case '7z':
        return `压缩包内容 (${outputFormat.toUpperCase()})\n包含文件: ${actualData.length} 个\n压缩信息: 工作流结果打包`;

      default:
        return actualData.map(item => item.content).join('\n\n');
    }
  };

  // 设置储存地址
  const setStoragePath = async () => {
    try {
      // 检查浏览器是否支持 File System Access API
      if ('showDirectoryPicker' in window) {
        // 使用现代 File System Access API
        const directoryHandle = await window.showDirectoryPicker();
        const folderPath = directoryHandle.name;

        // 更新储存路径
        handleDataChange('storagePath', folderPath);
        handleDataChange('directoryHandle', directoryHandle); // 保存目录句柄以便后续使用
        alert(`储存地址已设置为: ${folderPath}`);
      } else {
        // 降级方案：使用传统的文件夹选择
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        input.style.display = 'none';

        input.onchange = (e) => {
          if (e.target.files && e.target.files.length > 0) {
            // 获取选择的文件夹路径
            const file = e.target.files[0];
            const folderPath = file.webkitRelativePath.split('/')[0];

            // 更新储存路径
            handleDataChange('storagePath', folderPath);
            alert(`储存地址已设置为: ${folderPath}`);
          }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('选择文件夹时出错:', error);
        // 如果出错，提供手动输入选项
        const currentPath = nodeData.storagePath || '';
        const newPath = prompt('无法打开文件夹选择器，请手动输入储存地址路径:', currentPath);

        if (newPath !== null) {
          handleDataChange('storagePath', newPath.trim());
          if (newPath.trim()) {
            alert(`储存地址已设置为: ${newPath.trim()}`);
          } else {
            alert('储存地址已清空');
          }
        }
      }
    }
  };

  // 🎯 MVP改进：获取连接的节点ID
  const getConnectedNodeIds = (nodeId) => {
    try {
      // 直接从全局变量获取当前的edges
      let edges = window.currentEdges;
      
      // 如果全局变量不存在，尝试从React Flow实例获取
      if (!edges) {
        const reactFlowInstanceFunctions = window.reactFlowInstanceFunctions;
        if (reactFlowInstanceFunctions && reactFlowInstanceFunctions.getEdges) {
            edges = reactFlowInstanceFunctions.getEdges();
          } else {
          edges = [];
        }
      }
      
      // 找到连接到当前节点的所有输入边
      const inputEdges = edges.filter(edge => edge.target === nodeId);
      return inputEdges.map(edge => edge.source);
    } catch (error) {
      console.error('获取连接节点ID失败:', error);
      return [];
      }
  };

  const fetchInputDataFromConnectedNodes = async (silent = false) => {
    if (!silent) {
      setIsGenerating(true);
      setGenerationProgress(0);
    }

    try {
      // 🎯 MVP改进：优先寻找目标文件而不是新建文件
      let targetFileFromMaterial = null;
      let modifiedFiles = [];
      
      // 获取连接的节点数据
      const connectedNodeIds = getConnectedNodeIds(id);
      if (!silent) {
        console.log('🔍 [ResultNode] 连接的节点:', connectedNodeIds);
      }

      // 🎯 MVP：如果没有连接的节点，直接从全局nodes中查找
      if (connectedNodeIds.length === 0) {
        console.log('🔍 [ResultNode] 没有找到连接的节点，尝试从全局nodes查找');
        
        // 直接从全局变量获取所有节点
        let nodes = window.currentNodes || [];
        if (nodes.length === 0) {
          const reactFlowInstanceFunctions = window.reactFlowInstanceFunctions;
          if (reactFlowInstanceFunctions && reactFlowInstanceFunctions.getNodes) {
            nodes = reactFlowInstanceFunctions.getNodes();
            }
          }
          
        // 查找材料节点和执行节点
        for (const node of nodes) {
          if (node.data && node.data.targetFile) {
            targetFileFromMaterial = {
              title: node.data.targetFile.name,
              path: node.data.targetFile.path,
              size: node.data.targetFile.size,
              type: 'target_file',
              isModified: true
            };
            console.log('🎯 [ResultNode] 从全局nodes找到目标文件:', targetFileFromMaterial);
            break;
          }
        }
      } else {
        // 有连接的节点，按原逻辑处理
        for (const nodeId of connectedNodeIds) {
          try {
            const response = await fetch(`/api/nodes/${nodeId}/data`);
            if (response.ok) {
              const nodeData = await response.json();
              
              // 🎯 MVP：检查材料节点的目标文件
              if (nodeData.targetFile) {
                targetFileFromMaterial = {
                  title: nodeData.targetFile.name,
                  path: nodeData.targetFile.path,
                  size: nodeData.targetFile.size,
                  type: 'target_file', // 标记为目标文件
                  isModified: true // 假设已被修改
                };
                console.log('🎯 [ResultNode] 找到目标文件:', targetFileFromMaterial);
              }
              
              // 检查执行结果中的文件
              if (nodeData.executionResult && nodeData.executionResult.files) {
                modifiedFiles.push(...nodeData.executionResult.files);
              }
            }
          } catch (error) {
            console.warn(`无法获取节点 ${nodeId} 的数据:`, error);
          }
        }
      }

      // 🎯 MVP：优先显示目标文件，其次显示修改后的文件
      let finalFiles = [];
      if (targetFileFromMaterial) {
        finalFiles.push(targetFileFromMaterial);
      }
      finalFiles.push(...modifiedFiles);

      // 更新节点数据
      const updatedNodeData = {
        ...nodeData,
        files: finalFiles,
        ready_to_export: finalFiles.length > 0
      };
      
      setNodeData(updatedNodeData);
      onNodeDataChange?.(id, updatedNodeData);
      
    } catch (error) {
      console.error('获取连接节点数据失败:', error);
    } finally {
      if (!silent) {
        setIsGenerating(false);
        setGenerationProgress(100);
      }
    }
  };

  // 🔧 FIXED: 严格检查是否有真实的工具执行结果
  const hasWorkflowResults = () => {
    // 检查是否有真实生成的文件（由执行节点的工具调用产生）
    const files = [];
    if (nodeData.inputSources && nodeData.inputSources.length > 0) {
      nodeData.inputSources.forEach(source => {
        if (source.content && typeof source.content === 'string') {
          const pathMatch = source.content.match(/([C-Z]:\\[^:\n]*\.(?:docx|pdf|txt|xlsx|pptx|jpg|png|mp3|mp4))/gi);
          if (pathMatch) {
            pathMatch.forEach(path => {
              const fileName = path.split(/[\\\/]/).pop();
              const ext = path.split('.').pop().toLowerCase();
              files.push({ title: fileName, path: path, ext: ext });
            });
          }
        }
      });
    }
    const hasGeneratedFiles = files && files.filter(f => !(f.title && /测试|test/i.test(f.title))).length > 0;
    
    // 检查是否有来自前置节点的真实执行结果
    const hasRealContent = nodeData.inputData && 
                           Object.keys(nodeData.inputData).length > 0 &&
                           Object.values(nodeData.inputData).some(value => 
                             value && value.trim && value.trim().length > 0 &&
                             !value.includes("create_document") && // 排除未执行的工具调用字符串
                             value !== "这是一个演示内容，因为前面的节点没有产生有效输出。" // 排除模拟内容
                           );
    
    // 检查执行节点是否真正成功执行了工具（而不仅仅是AI生成了工具调用字符串）
    const hasSuccessfulToolExecution = nodeData.inputSources && 
                                       nodeData.inputSources.length > 0 &&
                                       nodeData.inputSources.some(source => 
                                         source.type === 'tool_result' || // 真实的工具执行结果
                                         (source.content && !source.content.includes("create_document")) // 不是工具调用字符串
                                       );
    
    // 只有当有真实的工具执行结果时才认为有可导出的内容
    return hasGeneratedFiles || hasSuccessfulToolExecution;
  };

  // 🆕 工作流完成后自动拉取上游输出（静默），以便自动展示文件瓦片
  useEffect(() => {
    const status = data?.status;
    if ((status === 'success' || status === 'done' || status === 'completed') && !autoFetchedRef.current) {
      fetchInputDataFromConnectedNodes(true);
      autoFetchedRef.current = true;
    }
  }, [data?.status, id]);

  // 增强的导出文件功能
  const exportResult = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // 在外部定义变量以便在catch块中使用
    let fileName = 'unknown';

    try {
      // 🔍 NEW: 首先检查是否已经有执行节点生成的文件
      const existingFiles = [];
      if (nodeData.inputSources && nodeData.inputSources.length > 0) {
        nodeData.inputSources.forEach(source => {
          if (source.content && typeof source.content === 'string') {
            const pathMatch = source.content.match(/([C-Z]:\\[^:\n]*\.(?:docx|pdf|txt|xlsx|pptx|jpg|png|mp3|mp4))/gi);
            if (pathMatch) {
              pathMatch.forEach(path => {
                const fileName = path.split(/[\\\/]/).pop();
                const ext = path.split('.').pop().toLowerCase();
                existingFiles.push({ title: fileName, path: path, ext: ext });
              });
            }
          }
        });
      }
      
      const filteredExistingFiles = existingFiles.filter(f => !(f.title && /测试|test/i.test(f.title)));
      if (filteredExistingFiles && filteredExistingFiles.length > 0) {
        // 如果已经有文件，直接显示成功，不需要重新创建
        console.log('✅ [ResultNode] 检测到已生成的文件，跳过重复创建:', existingFiles);
        
        // 模拟进度完成
        const steps = [
          { message: '检测到已生成文件...', progress: 50 },
          { message: '验证文件完整性...', progress: 100 }
        ];

        for (const step of steps) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setGenerationProgress(step.progress);
        }

        const existingFile = filteredExistingFiles[0];
        fileName = existingFile.title || existingFile.path?.split(/[\\\/]/).pop() || 'generated-file';
        
        // 记录导出历史（标记为使用已生成文件）
        const exportRecord = {
          timestamp: new Date().toLocaleString(),
          fileName: fileName,
          format: nodeData.outputFormat,
          filePath: existingFile.path,
          success: true,
          note: '使用已生成的文件'
        };

        setExportHistory(prev => [exportRecord, ...prev.slice(0, 4)]);
        console.log(`✅ [ResultNode] 文件导出完成（使用已生成文件）: ${existingFile.path}`);
        return; // 直接返回，不执行后续的文件创建逻辑
      }

      // 如果没有现有文件，执行原有的导出逻辑
      console.log('📝 [ResultNode] 未检测到已生成文件，开始创建新文件');
      
      // 模拟生成过程
      const steps = [
        { message: '准备导出...', progress: 10 },
        { message: '生成内容...', progress: 30 },
        { message: '格式化数据...', progress: 60 },
        { message: '创建文件...', progress: 80 },
        { message: '完成导出...', progress: 100 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setGenerationProgress(step.progress);
      }

      const content = generateFormattedContent();
      const allFormats = getAllFormats();
      const format = allFormats[nodeData.outputFormat];
      fileName = `workflow-result-${new Date().getTime()}${format?.ext || '.txt'}`;

      const mimeTypes = {
      // 文档类
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // 图片类
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      svg: 'image/svg+xml',
      // 音频类
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      // 视频类
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      // 压缩包
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      // 代码类
      js: 'text/javascript',
      py: 'text/x-python',
      java: 'text/x-java-source',
      html: 'text/html',
      css: 'text/css',
      json: 'application/json',
      xml: 'application/xml',
      md: 'text/markdown'
    };

      // 使用后端API保存文件到指定目录
      try {
        const response = await fetch(`${API_BASE}/api/workflow/save-result-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: content,
            fileName: fileName,
            outputFormat: nodeData.outputFormat,
            storagePath: nodeData.storagePath || './output'
          })
        });

        if (response.ok) {
          const result = await response.json();
          const savedPath = result.filePath || `${nodeData.storagePath || './output'}/${fileName}`;
          
          console.log(`文件已成功保存到: ${savedPath}`);
          // 移除弹窗提示，文件静默保存
        } else {
          throw new Error(`保存失败: ${response.statusText}`);
        }
             } catch (apiError) {
         console.error('后端保存失败，使用浏览器下载:', apiError);
         
         // 降级到浏览器下载
         const format = allFormats[nodeData.outputFormat];
         const mimeType = mimeTypes[format?.ext?.replace('.', '') || 'txt'] || 'text/plain';
         
         const blob = new Blob([content], { type: mimeType });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = fileName;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
         
         console.log(`后端保存失败，文件已下载到浏览器下载文件夹: ${fileName}`);
       }

      // 记录导出历史
      const exportRecord = {
        timestamp: new Date().toLocaleString(),
        fileName,
        format: nodeData.outputFormat,
        size: new Blob([content]).size,
        success: true,
        filePath: `Downloads/${fileName}`
      };

      setExportHistory(prev => [exportRecord, ...prev.slice(0, 4)]); // 保留最近5次导出记录


    } catch (error) {
      console.error('导出文件时出错:', error);

      // 记录失败的导出历史
      const exportRecord = {
        timestamp: new Date().toLocaleString(),
        fileName: fileName,
        format: nodeData.outputFormat,
        error: error.message,
        success: false
      };

      setExportHistory(prev => [exportRecord, ...prev.slice(0, 4)]);
      alert('导出文件失败，请重试');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // 快速预览功能
  const quickPreview = () => {
    const content = generateFormattedContent();
    
    // 在当前页面的弹窗中显示预览
    const modal = document.createElement('div');
    modal.className = 'product-preview-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>产品预览 - ${data.label || '结果节点'}</h3>
            <button class="close-btn" onclick="this.closest('.product-preview-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <div><strong>格式:</strong> ${nodeData.outputFormat}</div>
              <div><strong>生成时间:</strong> ${new Date().toLocaleString()}</div>
              <hr style="margin: 15px 0;">
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;">${content}</pre>
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="this.closest('.product-preview-modal').remove()" class="btn btn-secondary">关闭</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  };

  // 获取状态文本
  const getStatusText = () => {
    if (isGenerating) return '生成中...';
    if (exportHistory.length === 0) return '未导出';
    const latest = exportHistory[0];
    return latest.success ? '已导出' : '导出失败';
  };

  // 获取结果摘要
  const getResultSummary = () => {
    if (!nodeData.outputFormat) {
      return '请选择输出格式...';
    }
    
    // 处理自动格式
    if (nodeData.outputFormat === 'auto') {
      if (nodeData.selectedCategory === 'all') {
        return '🤖 自动格式（根据文件类型智能匹配）';
      } else {
        return '🤖 自动格式';
      }
    }
    
    const allFormats = getAllFormats();
    const format = allFormats[nodeData.outputFormat];
    return `${format?.label || nodeData.outputFormat} 格式`;
  };

  // 清空配置
  const clearConfig = () => {
    const clearedData = {
      outputFormat: '',
      selectedCategory: '',
      result: '',
      inputSources: []
    };

    Object.keys(clearedData).forEach(key => {
      handleDataChange(key, clearedData[key]);
    });
  };

  return (
    <div
      ref={nodeRef}
              className={`custom-node enhanced-node result-node ${isConfigOpen ? 'config-open' : ''} ${isHovered ? 'hovered' : ''} ${isGenerating ? 'generating' : ''} ${getNodeStatusClass()}`}
      onClick={handleNodeClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--generation-progress': `${generationProgress}%`
      }}
    >
      {/* 连接点 - 支持双向连接 */}
      <Handle type="source" position={Position.Top} id="top-source" isConnectable={true} className="connection-handle connection-handle-top" />
      <Handle type="target" position={Position.Top} id="top-target" isConnectable={true} className="connection-handle connection-handle-top" />

      <Handle type="source" position={Position.Left} id="left-source" isConnectable={true} className="connection-handle connection-handle-left" />
      <Handle type="target" position={Position.Left} id="left-target" isConnectable={true} className="connection-handle connection-handle-left" />

      <Handle type="source" position={Position.Right} id="right-source" isConnectable={true} className="connection-handle connection-handle-right" />
      <Handle type="target" position={Position.Right} id="right-target" isConnectable={true} className="connection-handle connection-handle-right" />

      <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectable={true} className="connection-handle connection-handle-bottom" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" isConnectable={true} className="connection-handle connection-handle-bottom" />

      {!isConfigOpen ? (
        // 增强的简化视图
        <div className="node-content">
          {/* 生成进度条 */}
          {isGenerating && (
            <div className="generation-progress-bar">
              <div className="progress-fill" style={{ width: `${generationProgress}%` }}></div>
            </div>
          )}

          <div className="node-header">
            <div className="node-icon-container">
              <span className="node-icon">📋</span>
              {isGenerating && (
                <div className="generation-spinner"></div>
              )}
            </div>
            <div className="node-text-container">
              <span className="node-title">结果节点</span>
              <span className="node-status">
                {isGenerating ? `生成中 ${generationProgress}%` : getStatusText()}
              </span>
            </div>
          </div>

          {/* 格式信息显示 */}
          <div className="format-info">
            {getResultSummary()}
          </div>



          {/* 最近导出记录 */}
          {exportHistory.length > 0 && (
            <div className="recent-export" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '8px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              margin: '6px 0',
              fontSize: '11px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div className={`export-indicator ${exportHistory[0].success ? 'success' : 'error'}`} style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: exportHistory[0].success ? '#059669' : '#dc2626'
                }}>
                  {exportHistory[0].success ? '✅ 已导出' : '❌ 失败'}
                </div>
                <div className="export-timestamp" style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  fontFamily: 'monospace'
                }}>
                  {exportHistory[0].timestamp}
                </div>
              </div>
              <div className="export-filename" style={{
                fontSize: '11px',
                color: '#374151',
                fontWeight: '500',
                wordBreak: 'break-all',
                lineHeight: '1.2'
              }}>
                📄 {exportHistory[0].fileName}
              </div>
            </div>
          )}

          {/* 快速操作按钮 */}
                      <div className="node-quick-actions">
              {/* 获取输入数据按钮 */}
              <button
                className="quick-action-btn fetch-data-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchInputDataFromConnectedNodes();
                }}
                title="从连接的节点获取数据"
              >
                🔄
              </button>
              
              {!isGenerating ? (
                <button
                  className="quick-action-btn export-quick-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 🔧 修复：只有在有实际工作流结果时才允许导出
                    if (!hasWorkflowResults()) {
                      alert('请先执行工作流以获得结果后再导出文件');
                      return;
                    }
                    if (nodeData.outputFormat) {
                      exportResult();
                    } else {
                      setIsConfigOpen(true);
                    }
                  }}
                  title={nodeData.outputFormat ? "快速导出" : "配置格式"}
                >
                  {nodeData.outputFormat ? '💾' : '⚙️'}
                </button>
              ) : (
                <button
                  className="quick-action-btn generating-btn"
                  disabled
                  title="生成中..."
                >
                  ⏳
                </button>
              )}
              <button
                className="quick-action-btn config-quick-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfigOpen(true);
                }}
                title="打开配置"
              >
                🔧
              </button>
            </div>
        </div>
      ) : (
        <div className="result-config" onClick={(e) => e.stopPropagation()}>
          <div className="config-header">
            <h3>📋 结果节点配置</h3>
            <button className="close-btn" onClick={(e) => { e.stopPropagation(); handleConfigToggle(); }}>×</button>
          </div>
          
          <div className="config-content">
            <div className="config-section">
              <label>📂 选择文件类别</label>
              <select
                value={nodeData.selectedCategory}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  const newCategory = e.target.value;
                  console.log(`用户选择类别: ${newCategory}`);
                  let newData = { ...nodeData, selectedCategory: newCategory };
                  if (newCategory === 'all') {
                    newData.outputFormat = 'auto';
                  } else {
                    const firstFormat = formatCategories[newCategory]
                      ? Object.keys(formatCategories[newCategory].formats)[0]
                      : 'txt';
                    newData.outputFormat = firstFormat;
                  }

                  console.log('更新数据:', newData);
                  setNodeData(newData);

                  if (onNodeDataChange) {
                    onNodeDataChange(id, newData);
                  }
                }}
              >
                {Object.entries(formatCategories).map(([key, category]) => {
                  console.log(`渲染类别选项: ${key} - ${category.label}`);
                  return (
                    <option key={key} value={key}>
                      {category.label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 输出格式选择区域 */}
            {nodeData.selectedCategory === 'all' ? (
              <div className="config-section">
                <label>📁 输出格式</label>
                <div style={{
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #ddd6fe 0%, #e0e7ff 100%)',
                  border: '1px solid #a855f7',
                  borderRadius: '6px',
                  color: '#6b21a8',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  🤖 自动（智能匹配文件类型）
                </div>
              </div>
            ) : (
              <div className="config-section">
                <label>📁 选择具体格式</label>
                <select
                  value={nodeData.outputFormat}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newFormat = e.target.value;
                    console.log(`选择格式: ${newFormat}`);
                    handleDataChange('outputFormat', newFormat);
                  }}
                >
                  {nodeData.selectedCategory && formatCategories[nodeData.selectedCategory] ?
                    Object.values(formatCategories[nodeData.selectedCategory].formats).map(format => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    )) :
                    <option value="">请先选择文件类别</option>
                  }
                </select>
              </div>
            )}

            {/* 配置状态和说明区域 */}
            <div className="config-status-section">
              <div className="status-grid">
                <div className="status-card">
                  <div className="status-label">📂 文件类别</div>
                  <div className="status-value">
                    {nodeData.selectedCategory && formatCategories[nodeData.selectedCategory] ?
                      formatCategories[nodeData.selectedCategory].label :
                      '未选择'
                    }
                  </div>
                </div>
                <div className="status-card">
                  <div className="status-label">📄 输出格式</div>
                  <div className="status-value">
                    {nodeData.outputFormat === 'auto' ?
                      '🤖 自动' :
                      nodeData.outputFormat && getAllFormats()[nodeData.outputFormat] ?
                        getAllFormats()[nodeData.outputFormat].label :
                        '未选择'
                    }
                  </div>
                </div>
                <div className="status-card full-width">
                  <div className="status-label">📁 储存地址</div>
                  <div className="status-value">
                    {nodeData.storagePath || '跟随个人设置'}
                    <span className="storage-note">
                      （自动跟随个人设置中的默认存放路径）
                    </span>
                  </div>
                </div>
              </div>

              <div className="help-text">
                💡 <strong>使用说明：</strong>先选择文件类别，再选择具体格式。系统会自动将所有输入内容按照选定格式进行整理和输出。
              </div>
            </div>

            {/* 内容预览区域 */}
            <div className="preview-section">
              <div className="preview-header">
                <label>📋 内容预览</label>
              </div>
              {/* 网格小方块预览 */}
              <div className="grid-preview-container">
                {(() => {
                  // 🆕 从输入源中获取文件
                  const files = [];
                  if (nodeData.inputSources && nodeData.inputSources.length > 0) {
                    nodeData.inputSources.forEach(source => {
                      if (source.content && typeof source.content === 'string') {
                        // 尝试从内容中提取文件路径
                        const pathMatch = source.content.match(/([C-Z]:\\[^:\n]*\.(?:docx|pdf|txt|xlsx|pptx|jpg|png|mp3|mp4))/gi);
                        if (pathMatch) {
                          pathMatch.forEach(path => {
                            const fileName = path.split(/[\\\/]/).pop();
                            const ext = path.split('.').pop().toLowerCase();
                            files.push({ title: fileName, path: path, ext: ext });
                          });
                        }
                      }
                    });
                  }
                  
                  const displayFiles = files.filter(f => !(f.title && /测试|test/i.test(f.title)));
                  if (!displayFiles || displayFiles.length === 0) {
                    return (
                      <div className="grid-empty-state">
                        <div className="grid-empty-icon">🗂️</div>
                        <div className="grid-empty-text">暂无生成文件</div>
                        <div className="grid-empty-hint">运行工作流后，生成的文件会显示在这里</div>
                      </div>
                    );
                  }
                  return (
                    <div className="content-grid">
                      {displayFiles.map((f, idx) => (
                        <div
                          key={`${f.path || 'virtual'}-${idx}`}
                          className={`content-block ${f.isVirtual ? 'virtual-file' : ''}`}
                          title={f.isVirtual ? `${f.title} (点击预览内容)` : f.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (f.isVirtual && f.content) {
                              // 虚拟文件，在弹窗中显示内容预览
                              const modal = document.createElement('div');
                              modal.className = 'product-preview-modal';
                              const contentHtml = (typeof f.content === 'string' ? f.content : JSON.stringify(f.content, null, 2)).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                              modal.innerHTML = `
                                <div class="modal-overlay" onclick="this.parentElement.remove()">
                                  <div class="modal-content" onclick="event.stopPropagation()">
                                    <div class="modal-header">
                                      <h3>📄 ${f.title}</h3>
                                      <button class="close-btn" onclick="this.closest('.product-preview-modal').remove()">×</button>
                                    </div>
                                    <div class="modal-body">
                                      <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; font-family: monospace;">${contentHtml}</pre>
                                    </div>
                                    <div class="modal-footer">
                                      <button onclick="this.closest('.product-preview-modal').remove()" class="btn btn-secondary">关闭</button>
                                    </div>
                                  </div>
                                </div>
                              `;
                              document.body.appendChild(modal);
                            } else if (e.altKey) {
                              openWithSystemApp(f.path);
                            } else {
                              // 默认在弹窗中预览产品
                              openPreviewFile(f.path, true);
                            }
                          }}
                        >
                          <div className="content-ext">.{((f.ext || '').toString()).replace(/^\.+/, '')}</div>
                          <div className="content-block-icon">{iconForExt(f.ext)}</div>
                          <div className="content-block-title">{f.title}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 导出历史记录 */}
            {exportHistory.length > 0 && (
              <div className="export-history-section">
                <label>📋 导出历史</label>
                <div className="export-history-list">
                  {exportHistory.map((record, index) => (
                    <div key={index} className={`export-record ${record.success ? 'success' : 'error'}`}>
                      <div className="export-record-header">
                        <span className="export-record-time">{record.timestamp}</span>
                        <span className={`export-record-status ${record.success ? 'success' : 'error'}`}>
                          {record.success ? '✅ 成功' : '❌ 失败'}
                        </span>
                      </div>
                      <div className="export-record-details">
                        <div 
                          className="export-filename clickable" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (record.success && record.filePath) {
                              openPreviewFile(record.filePath, true);
                            } else {
                              alert('文件路径不可用，无法预览');
                            }
                          }}
                          title="点击预览文件"
                        >
                          {record.fileName}
                        </div>
                        <div className="export-format">格式: {record.format}</div>
                        {record.success && record.size && (
                          <div className="export-size">大小: {(record.size / 1024).toFixed(1)} KB</div>
                        )}
                        {!record.success && record.error && (
                          <div className="export-error">错误: {record.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 生成进度显示 */}
            {isGenerating && (
              <div className="generation-progress-section">
                <div className="progress-info">
                  <span>生成进度: {generationProgress}%</span>
                  <span>状态: 生成中...</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div className="control-buttons">

              <button
                className="btn btn-primary export-btn"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  // 🔧 修复：只有在有实际工作流结果时才允许导出
                  if (!hasWorkflowResults()) {
                    alert('请先执行工作流以获得结果后再导出文件');
                    return;
                  }
                  exportResult(); 
                }}
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ 生成中...' : '💾 导出文件'}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ResultNode;
