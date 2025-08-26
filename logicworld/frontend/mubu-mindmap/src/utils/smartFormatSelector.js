/**
 * 前端智能格式选择器 - 根据工具和任务智能推荐文件格式
 */

// 工具能力映射
const toolCapabilities = {
  // Office工具
  word: {
    name: "Microsoft Word",
    supportedFormats: ["docx", "doc", "pdf", "txt"],
    primaryFormat: "docx",
    outputType: "file",
    category: "document",
    description: "文档编辑和写作工具"
  },
  wordmcp: {
    name: "Word MCP Server", 
    supportedFormats: ["docx", "doc", "pdf"],
    primaryFormat: "docx",
    outputType: "file",
    category: "document",
    description: "专业Word文档处理服务 - 支持字体格式、段落样式、脚注尾注、页面设置等33种高级功能"
  },
  excel: {
    name: "Microsoft Excel",
    supportedFormats: ["xlsx", "xls", "csv", "pdf"],
    primaryFormat: "xlsx",
    outputType: "file", 
    category: "spreadsheet",
    description: "电子表格和数据分析工具"
  },
  powerpoint: {
    name: "Microsoft PowerPoint",
    supportedFormats: ["pptx", "ppt", "pdf"],
    primaryFormat: "pptx",
    outputType: "file",
    category: "presentation",
    description: "演示文稿制作工具"
  },
  
  // 文档工具
  pdf: {
    name: "PDF Generator",
    supportedFormats: ["pdf"],
    primaryFormat: "pdf",
    outputType: "file",
    category: "document",
    description: "PDF文档生成工具"
  },
  markdown: {
    name: "Markdown Processor",
    supportedFormats: ["md", "markdown", "html", "pdf"],
    primaryFormat: "md",
    outputType: "file",
    category: "document",
    description: "Markdown文档处理工具"
  },
  
  // 代码工具
  code: {
    name: "Code Generator",
    supportedFormats: ["py", "js", "ts", "java", "cpp", "txt"],
    primaryFormat: "py",
    outputType: "file",
    category: "code",
    description: "代码生成和编程工具"
  },
  
  // 图像工具
  image: {
    name: "Image Generator",
    supportedFormats: ["png", "jpg", "jpeg", "svg", "pdf"],
    primaryFormat: "png",
    outputType: "media",
    category: "image",
    description: "图像生成和处理工具"
  },
  
  // 数据工具
  data: {
    name: "Data Processor",
    supportedFormats: ["json", "csv", "xlsx", "xml", "yaml"],
    primaryFormat: "json",
    outputType: "data",
    category: "structured",
    description: "数据处理和转换工具"
  }
};

// 关键词映射
const keywordMappings = {
  "文档": ["word", "wordmcp"],
  "报告": ["word", "wordmcp"],
  "写作": ["word", "wordmcp"],
  "字体": ["wordmcp"],
  "格式": ["wordmcp"],
  "段落": ["wordmcp"],
  "对齐": ["wordmcp"],
  "间距": ["wordmcp"],
  "脚注": ["wordmcp"],
  "尾注": ["wordmcp"],
  "样式": ["wordmcp"],
  "加粗": ["wordmcp"],
  "斜体": ["wordmcp"],
  "下划线": ["wordmcp"],
  "颜色": ["wordmcp"],
  "页面设置": ["wordmcp"],
  "页边距": ["wordmcp"],
  "页眉": ["wordmcp"],
  "页脚": ["wordmcp"],
  "分栏": ["wordmcp"],
  "表格": ["excel"],
  "数据分析": ["excel"],
  "统计": ["excel"],
  "演示": ["powerpoint"],
  "幻灯片": ["powerpoint"],
  "ppt": ["powerpoint"],
  "代码": ["code"],
  "编程": ["code"],
  "脚本": ["code"],
  "图片": ["image"],
  "图像": ["image"],
  "绘制": ["image"],
  "markdown": ["markdown"],
  "md": ["markdown"]
};

/**
 * 智能格式选择器类
 */
class SmartFormatSelector {
  /**
   * 从任务描述中检测工具
   */
  detectToolsFromTask(taskDescription) {
    if (!taskDescription) return [];
    
    const detectedTools = [];
    const taskLower = taskDescription.toLowerCase();
    
    // 直接工具名称检测
    Object.keys(toolCapabilities).forEach(toolName => {
      if (taskLower.includes(toolName)) {
        detectedTools.push(toolName);
      }
    });
    
    // 关键词映射检测
    Object.entries(keywordMappings).forEach(([keyword, tools]) => {
      if (taskLower.includes(keyword)) {
        detectedTools.push(...tools);
      }
    });
    
    // 去重并保持顺序
    return [...new Set(detectedTools)];
  }

  /**
   * 从工作流节点中检测工具
   */
  detectToolsFromWorkflow(nodes, edges, currentNodeId) {
    const detectedTools = [];
    
    // 找到指向当前结果节点的边
    const incomingEdges = edges.filter(edge => edge.target === currentNodeId);
    
    // 遍历前置节点
    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      if (sourceNode) {
        // 检查执行节点的任务描述
        if (sourceNode.type === 'execution-node' || sourceNode.data?.nodeType === 'execution-node') {
          const taskDescription = sourceNode.data?.label || sourceNode.data?.task || '';
          const toolsFromTask = this.detectToolsFromTask(taskDescription);
          detectedTools.push(...toolsFromTask);
        }
        
        // 检查执行结果中的工具信息
        if (sourceNode.data?.result) {
          const result = sourceNode.data.result;
          if (typeof result === 'string') {
            const toolsFromResult = this.detectToolsFromTask(result);
            detectedTools.push(...toolsFromResult);
          } else if (result.tool_execution?.format_analysis?.detected_tools) {
            detectedTools.push(...result.tool_execution.format_analysis.detected_tools);
          }
        }
      }
    });
    
    return [...new Set(detectedTools)];
  }

  /**
   * 为工具建议格式
   */
  suggestFormatForTools(tools) {
    if (!tools || tools.length === 0) {
      return {
        outputType: 'file',
        outputFormat: 'txt',
        category: 'document',
        reason: '通用文本格式',
        supportedFormats: ['txt', 'md', 'pdf']
      };
    }

    // 优先使用第一个检测到的工具
    const primaryTool = tools[0];
    const capability = toolCapabilities[primaryTool];

    if (capability) {
      return {
        outputType: capability.outputType,
        outputFormat: capability.primaryFormat,
        category: capability.category,
        reason: `${capability.name}的推荐格式`,
        supportedFormats: capability.supportedFormats,
        toolName: capability.name
      };
    }

    // 回退到默认
    return {
      outputType: 'file',
      outputFormat: 'txt',
      category: 'document',
      reason: '默认文本格式',
      supportedFormats: ['txt']
    };
  }

  /**
   * 生成智能文件名
   */
  generateSmartFileName(taskDescription, fileFormat) {
    if (!taskDescription) return `output.${fileFormat}`;

    // 提取关键词作为文件名
    const keywords = [];
    
    // 提取中文关键词
    const chineseWords = taskDescription.match(/[\u4e00-\u9fff]+/g) || [];
    chineseWords.forEach(word => {
      if (word.length >= 2 && !['一个', '的', '和', '或者', '文档', '文件'].includes(word)) {
        keywords.push(word);
      }
    });
    
    // 提取英文关键词
    const englishWords = taskDescription.match(/[a-zA-Z]+/g) || [];
    englishWords.forEach(word => {
      if (word.length >= 3 && !['and', 'the', 'for', 'with', 'doc', 'file'].includes(word.toLowerCase())) {
        keywords.push(word);
      }
    });
    
    // 生成文件名
    let filename = 'generated_content';
    if (keywords.length > 0) {
      filename = keywords.slice(0, 3).join('_'); // 最多用3个关键词
    }
    
    // 清理文件名中的特殊字符
    filename = filename.replace(/[<>:"/\\|?*]/g, '_');
    
    return `${filename}.${fileFormat}`;
  }

  /**
   * 完整的智能分析
   */
  analyzeAndSuggest(taskDescription, nodes = [], edges = [], currentNodeId = null) {
    try {
      // 从任务描述检测工具
      const toolsFromTask = this.detectToolsFromTask(taskDescription || '');
      
      // 从工作流检测工具
      const toolsFromWorkflow = currentNodeId ? 
        this.detectToolsFromWorkflow(nodes, edges, currentNodeId) : [];
      
      // 合并并去重
      const allDetectedTools = [...new Set([...toolsFromTask, ...toolsFromWorkflow])];
      
      // 获取格式建议
      const formatSuggestion = this.suggestFormatForTools(allDetectedTools);
      
      // 生成智能文件名
      const smartFileName = this.generateSmartFileName(
        taskDescription || '输出文件', 
        formatSuggestion.outputFormat
      );
      
      return {
        detectedTools: allDetectedTools,
        toolsFromTask,
        toolsFromWorkflow,
        ...formatSuggestion,
        fileName: smartFileName,
        confidence: allDetectedTools.length > 0 ? 'high' : 'low',
        isSmartAnalysis: true
      };
      
    } catch (error) {
      console.error('智能格式分析失败:', error);
      return {
        detectedTools: [],
        outputType: 'file',
        outputFormat: 'txt',
        category: 'document',
        reason: '分析失败，使用默认格式',
        supportedFormats: ['txt'],
        fileName: 'output.txt',
        confidence: 'low',
        isSmartAnalysis: false,
        error: error.message
      };
    }
  }
}

// 导出单例
export const smartFormatSelector = new SmartFormatSelector();
export default smartFormatSelector; 