// Word操作类型检测器
export const WordOperationDetector = {
  
  // 需要精确定位的操作类型
  PRECISE_OPERATIONS: {
    FONT_OPERATIONS: {
      keywords: ['字体', '字号', '颜色', '加粗', '斜体', '下划线', '华文彩云', '宋体', '黑体'],
      operations: ['set_font_name', 'set_font_size', 'set_font_color', 'set_font_bold'],
      description: '字体格式设置'
    },
    TEXT_INSERTION: {
      keywords: ['插入', '添加', '在.*前面', '在.*后面', '在.*位置'],
      operations: ['insert_text', 'add_text', 'insert_before', 'insert_after'],
      description: '文本插入操作'
    },
    TEXT_REPLACEMENT: {
      keywords: ['替换', '修改', '改为', '变成', '更换'],
      operations: ['replace_text', 'modify_text', 'change_text'],
      description: '文本替换操作'
    },
    TEXT_DELETION: {
      keywords: ['删除', '移除', '去掉', '清除'],
      operations: ['delete_text', 'remove_text', 'clear_text'],
      description: '文本删除操作'
    },
    FORMATTING: {
      keywords: ['格式', '样式', '对齐', '缩进', '行距'],
      operations: ['set_alignment', 'set_indent', 'set_line_spacing'],
      description: '段落格式设置'
    }
  },

  // 不需要精确定位的操作（整篇文档操作）
  DOCUMENT_OPERATIONS: {
    keywords: ['创建文档', '保存文档', '打开文档', '新建', '另存为'],
    operations: ['create_document', 'save_document', 'open_document'],
    description: '文档级操作'
  },

  /**
   * 检测任务描述中是否包含需要精确定位的操作
   * @param {string} taskDescription - 任务描述
   * @returns {Object} 检测结果
   */
  detectOperation(taskDescription) {
    const result = {
      needsPreciseLocation: false,
      operationType: null,
      detectedKeywords: [],
      suggestedOperations: [],
      description: '',
      confidence: 0
    };

    if (!taskDescription) return result;

    const text = taskDescription.toLowerCase();

    // 检查是否是文档级操作（不需要精确定位）
    for (const keyword of this.DOCUMENT_OPERATIONS.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        result.needsPreciseLocation = false;
        result.operationType = 'document';
        result.description = this.DOCUMENT_OPERATIONS.description;
        return result;
      }
    }

    // 检查精确操作类型
    let maxConfidence = 0;
    let bestMatch = null;

    for (const [opType, config] of Object.entries(this.PRECISE_OPERATIONS)) {
      let matchCount = 0;
      const matchedKeywords = [];

      for (const keyword of config.keywords) {
        const regex = new RegExp(keyword.toLowerCase(), 'i');
        if (regex.test(text)) {
          matchCount++;
          matchedKeywords.push(keyword);
        }
      }

      if (matchCount > 0) {
        const confidence = matchCount / config.keywords.length;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = {
            type: opType,
            config: config,
            keywords: matchedKeywords,
            confidence: confidence
          };
        }
      }
    }

    if (bestMatch) {
      result.needsPreciseLocation = true;
      result.operationType = bestMatch.type;
      result.detectedKeywords = bestMatch.keywords;
      result.suggestedOperations = bestMatch.config.operations;
      result.description = bestMatch.config.description;
      result.confidence = bestMatch.confidence;
    }

    return result;
  },

  /**
   * 提取目标文本（需要操作的具体文字）
   * @param {string} taskDescription - 任务描述
   * @returns {Array} 可能的目标文本
   */
  extractTargetText(taskDescription) {
    const targetTexts = [];
    
    // 常见的目标文本提取模式
    const patterns = [
      /将(.+?)这.*?字.*?改为/g,      // "将XXX这几个字改为"
      /将(.+?)字体改为/g,           // "将XXX字体改为"
      /给(.+?)设置/g,              // "给XXX设置"
      /把(.+?)改成/g,              // "把XXX改成"
      /修改(.+?)为/g,              // "修改XXX为"
      /替换(.+?)为/g,              // "替换XXX为"
      /删除(.+?)$/g,               // "删除XXX"
      /在(.+?)后面插入/g,          // "在XXX后面插入"
      /在(.+?)前面插入/g,          // "在XXX前面插入"
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(taskDescription)) !== null) {
        const text = match[1].trim();
        if (text && !targetTexts.includes(text)) {
          targetTexts.push(text);
        }
      }
    }

    return targetTexts;
  },

  /**
   * 生成操作建议
   * @param {string} taskDescription - 任务描述
   * @returns {Object} 操作建议
   */
  generateSuggestion(taskDescription) {
    const detection = this.detectOperation(taskDescription);
    const targetTexts = this.extractTargetText(taskDescription);

    return {
      ...detection,
      targetTexts,
      suggestion: detection.needsPreciseLocation 
        ? `检测到${detection.description}操作，建议使用文档预览功能精确选择目标文本：${targetTexts.join(', ')}`
        : '这是文档级操作，无需精确定位'
    };
  }
};

// 预设的操作模板
export const WORD_OPERATION_TEMPLATES = {
  set_font_name: {
    name: '设置字体',
    needsTarget: true,
    needsValue: true,
    valueType: 'font_name',
    template: 'set_font_name(font_name="{value}", filename="{filename}", target_text="{target}")'
  },
  set_font_color: {
    name: '设置字体颜色',
    needsTarget: true,
    needsValue: true,
    valueType: 'color',
    template: 'set_font_color(color="{value}", filename="{filename}", target_text="{target}")'
  },
  insert_text: {
    name: '插入文本',
    needsTarget: true,
    needsValue: true,
    valueType: 'text',
    template: 'insert_text(text="{value}", filename="{filename}", position="{target}")'
  },
  replace_text: {
    name: '替换文本',
    needsTarget: true,
    needsValue: true,
    valueType: 'text',
    template: 'replace_text(old_text="{target}", new_text="{value}", filename="{filename}")'
  }
};

export default WordOperationDetector; 