/**
 * AI描述总结服务
 * 将用户输入的长描述总结为50字以内的简洁描述
 */

const API_BASE = '';

/**
 * 使用AI总结工具描述
 * @param {string} originalDescription - 原始描述
 * @returns {Promise<string>} - 总结后的描述（50字以内）
 */
export const summarizeDescription = async (originalDescription) => {
  if (!originalDescription || originalDescription.trim().length === 0) {
    return '';
  }

  // 如果描述已经很短，直接返回
  if (originalDescription.length <= 80) {
    return originalDescription.trim();
  }

  try {
    const response = await fetch(`${API_BASE}/api/ai/summarize-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: originalDescription,
        maxLength: 80  // 增加到80字，保留更多关键信息
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.summary || intelligentFallbackSummarize(originalDescription);
  } catch (error) {
    console.error('AI总结失败:', error);

    // 使用智能降级处理
    return intelligentFallbackSummarize(originalDescription);
  }
};

/**
 * 智能降级处理：基于规则的文本总结
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} - 处理后的文本
 */
const intelligentFallbackSummarize = (text, maxLength = 80) => {
  if (!text) return '';

  // 清理文本
  const cleaned = text.trim().replace(/\s+/g, ' ');

  // 提取关键信息的模式
  const patterns = [
    /([^：:]*(?:工具|服务|系统|平台|应用))[：:]([^。！？.!?]*)/g,  // 工具类型：功能描述
    /(支持|提供|包括|具有)([^。！？.!?]*)/g,  // 功能描述
    /(适用于|用于|面向)([^。！？.!?]*)/g,  // 应用场景
  ];

  const extractedInfo = [];

  // 尝试提取结构化信息
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(cleaned)) !== null) {
      const info = match[0].trim();
      if (info && info.length > 5) {  // 过滤太短的信息
        extractedInfo.push(info);
      }
    }
  });

  // 如果提取到结构化信息，组合使用
  if (extractedInfo.length > 0) {
    const summary = extractedInfo.slice(0, 3).join('、');  // 最多3个关键信息
    if (summary.length <= maxLength) {
      return summary;
    } else {
      return smartTruncate(summary, maxLength);
    }
  }

  // 否则使用改进的句子提取
  const sentences = cleaned.split(/[。！？.!?]/);

  // 找到最有信息量的句子
  let bestSentence = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > bestSentence.length && trimmed.length <= maxLength) {
      // 优先选择包含关键词的句子
      if (['工具', '支持', '功能', '用于', '适用'].some(keyword => trimmed.includes(keyword))) {
        bestSentence = trimmed;
      }
    }
  }

  if (bestSentence) {
    return bestSentence;
  }

  // 最后的降级方案：智能截取
  return smartTruncate(cleaned, maxLength);
};

/**
 * 智能截取文本，尽量保持完整性
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} - 截取后的文本
 */
const smartTruncate = (text, maxLength) => {
  if (text.length <= maxLength) {
    return text;
  }

  // 尝试在标点符号处截取
  const punctuationMarks = ['，', '、', '；', ',', ';', ' '];

  for (let i = maxLength - 1; i >= Math.floor(maxLength / 2); i--) {
    if (punctuationMarks.includes(text[i])) {
      return text.substring(0, i);
    }
  }

  // 如果没有合适的标点符号，直接截取
  return text.substring(0, maxLength);
};

/**
 * 降级总结方案：简单的文本处理
 * @param {string} text - 原始文本
 * @returns {string} - 处理后的文本
 */
const fallbackSummarize = (text) => {
  if (!text) return '';
  
  // 移除多余的空白字符
  const cleaned = text.trim().replace(/\s+/g, ' ');
  
  // 尝试找到第一句话
  const firstSentence = cleaned.split(/[。！？.!?]/)[0];
  
  // 如果第一句话合适，使用第一句话
  if (firstSentence.length <= 50 && firstSentence.length > 0) {
    return firstSentence;
  }

  // 否则截取前50个字符
  return cleaned.substring(0, 50);
};

/**
 * 验证总结结果
 * @param {string} summary - 总结文本
 * @returns {boolean} - 是否有效
 */
export const validateSummary = (summary) => {
  return summary && 
         typeof summary === 'string' && 
         summary.trim().length > 0 && 
         summary.length <= 50;
};

/**
 * 批量总结多个描述
 * @param {Array<string>} descriptions - 描述数组
 * @returns {Promise<Array<string>>} - 总结结果数组
 */
export const batchSummarizeDescriptions = async (descriptions) => {
  const promises = descriptions.map(desc => summarizeDescription(desc));
  return Promise.all(promises);
};
