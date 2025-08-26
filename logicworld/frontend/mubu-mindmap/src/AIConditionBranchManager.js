/**
 * AI条件分支连接管理器
 * 让AI能够智能地使用条件节点的分支连接点进行工作流生成
 */
class AIConditionBranchManager {
  
  constructor() {
    this.semanticAnalyzer = new SemanticAnalyzer();
    this.branchRules = this.initializeBranchRules();
  }

  /**
   * 初始化分支规则库
   */
  initializeBranchRules() {
    return {
      // True分支关键词（条件满足时）
      trueKeywords: [
        '成功', '通过', '满足', '达到', '完成', '正确', '有效', '存在', '包含',
        '大于', '高于', '超过', '符合', '匹配', '验证通过', '检查通过', '审核通过',
        '质量合格', '格式正确', '数据完整', '权限足够', '资源充足', '条件满足',
        '是', '真', 'true', 'yes', '确认', '同意', '接受', '继续', '执行',
        '正常', '可用', '启用', '激活', '开启', '允许', '批准', '授权'
      ],
      
      // False分支关键词（条件不满足时）
      falseKeywords: [
        '失败', '不通过', '不满足', '未达到', '未完成', '错误', '无效', '不存在', '不包含',
        '小于', '低于', '不足', '不符合', '不匹配', '验证失败', '检查失败', '审核失败',
        '质量不合格', '格式错误', '数据缺失', '权限不足', '资源不足', '条件不满足',
        '否', '假', 'false', 'no', '拒绝', '不同意', '拒绝', '停止', '跳过',
        '异常', '不可用', '禁用', '停用', '关闭', '禁止', '拒绝', '未授权'
      ],

      // 节点类型语义映射
      nodeTypeSemantics: {
        'result-node': { defaultBranch: 'true', confidence: 0.8 },
        'execution-node': { defaultBranch: 'true', confidence: 0.7 },
        'material-node': { defaultBranch: 'true', confidence: 0.6 },
        'error-handler': { defaultBranch: 'false', confidence: 0.9 },
        'fallback-node': { defaultBranch: 'false', confidence: 0.9 },
        'alternative-path': { defaultBranch: 'false', confidence: 0.8 }
      }
    };
  }

  /**
   * AI智能分析目标节点，决定使用哪个分支
   */
  analyzeTargetNodeForBranch(targetNode, conditionContext = null) {
    console.log('🤖 [AI分支分析] 开始分析目标节点:', targetNode);

    const analysis = {
      nodeId: targetNode.id,
      nodeType: targetNode.type,
      label: targetNode.data?.label || '',
      description: targetNode.data?.description || '',
      branchRecommendation: null,
      confidence: 0,
      reasoning: []
    };

    // 1. 基于节点标签的语义分析
    const labelAnalysis = this.analyzeLabelSemantics(analysis.label);
    if (labelAnalysis.branch) {
      analysis.branchRecommendation = labelAnalysis.branch;
      analysis.confidence = labelAnalysis.confidence;
      analysis.reasoning.push(`标签语义分析: "${analysis.label}" → ${labelAnalysis.branch}分支`);
    }

    // 2. 基于节点描述的语义分析
    const descriptionAnalysis = this.analyzeDescriptionSemantics(analysis.description);
    if (descriptionAnalysis.branch) {
      // 如果描述分析与标签分析一致，提高置信度
      if (analysis.branchRecommendation === descriptionAnalysis.branch) {
        analysis.confidence = Math.min(0.95, analysis.confidence + descriptionAnalysis.confidence);
        analysis.reasoning.push(`描述语义分析确认: "${analysis.description}" → ${descriptionAnalysis.branch}分支`);
      } else if (!analysis.branchRecommendation || descriptionAnalysis.confidence > analysis.confidence) {
        analysis.branchRecommendation = descriptionAnalysis.branch;
        analysis.confidence = descriptionAnalysis.confidence;
        analysis.reasoning.push(`描述语义分析: "${analysis.description}" → ${descriptionAnalysis.branch}分支`);
      }
    }

    // 3. 基于节点类型的默认规则
    const typeAnalysis = this.analyzeNodeTypeSemantics(analysis.nodeType);
    if (typeAnalysis.branch && !analysis.branchRecommendation) {
      analysis.branchRecommendation = typeAnalysis.branch;
      analysis.confidence = typeAnalysis.confidence;
      analysis.reasoning.push(`节点类型默认规则: ${analysis.nodeType} → ${typeAnalysis.branch}分支`);
    }

    // 4. 基于条件上下文的分析
    if (conditionContext) {
      const contextAnalysis = this.analyzeConditionContext(conditionContext, targetNode);
      if (contextAnalysis.branch) {
        // 上下文分析具有较高权重
        if (contextAnalysis.confidence > analysis.confidence) {
          analysis.branchRecommendation = contextAnalysis.branch;
          analysis.confidence = contextAnalysis.confidence;
          analysis.reasoning.push(`条件上下文分析: ${contextAnalysis.reasoning} → ${contextAnalysis.branch}分支`);
        }
      }
    }

    // 5. 默认回退策略
    if (!analysis.branchRecommendation) {
      analysis.branchRecommendation = 'true';
      analysis.confidence = 0.5;
      analysis.reasoning.push('默认回退策略: 使用True分支');
    }

    console.log('🎯 [AI分支分析] 分析结果:', analysis);
    return analysis;
  }

  /**
   * 分析标签语义
   */
  analyzeLabelSemantics(label) {
    if (!label) return { branch: null, confidence: 0 };

    const lowerLabel = label.toLowerCase();
    
    // 检查True分支关键词
    const trueMatches = this.branchRules.trueKeywords.filter(keyword => 
      lowerLabel.includes(keyword.toLowerCase())
    );
    
    // 检查False分支关键词
    const falseMatches = this.branchRules.falseKeywords.filter(keyword => 
      lowerLabel.includes(keyword.toLowerCase())
    );

    if (trueMatches.length > falseMatches.length) {
      return {
        branch: 'true',
        confidence: Math.min(0.9, 0.6 + (trueMatches.length * 0.1)),
        matches: trueMatches
      };
    } else if (falseMatches.length > trueMatches.length) {
      return {
        branch: 'false',
        confidence: Math.min(0.9, 0.6 + (falseMatches.length * 0.1)),
        matches: falseMatches
      };
    }

    return { branch: null, confidence: 0 };
  }

  /**
   * 分析描述语义
   */
  analyzeDescriptionSemantics(description) {
    if (!description) return { branch: null, confidence: 0 };

    const lowerDescription = description.toLowerCase();
    
    // 检查True分支关键词
    const trueMatches = this.branchRules.trueKeywords.filter(keyword => 
      lowerDescription.includes(keyword.toLowerCase())
    );
    
    // 检查False分支关键词
    const falseMatches = this.branchRules.falseKeywords.filter(keyword => 
      lowerDescription.includes(keyword.toLowerCase())
    );

    if (trueMatches.length > falseMatches.length) {
      return {
        branch: 'true',
        confidence: Math.min(0.8, 0.5 + (trueMatches.length * 0.1)),
        matches: trueMatches
      };
    } else if (falseMatches.length > trueMatches.length) {
      return {
        branch: 'false',
        confidence: Math.min(0.8, 0.5 + (falseMatches.length * 0.1)),
        matches: falseMatches
      };
    }

    return { branch: null, confidence: 0 };
  }

  /**
   * 分析节点类型语义
   */
  analyzeNodeTypeSemantics(nodeType) {
    const typeRule = this.branchRules.nodeTypeSemantics[nodeType];
    if (typeRule) {
      return {
        branch: typeRule.defaultBranch,
        confidence: typeRule.confidence
      };
    }
    return { branch: null, confidence: 0 };
  }

  /**
   * 分析条件上下文
   */
  analyzeConditionContext(conditionContext, targetNode) {
    // 这里可以根据条件节点的具体配置来分析
    // 例如：如果条件是"文件大小 > 10MB"，那么连接到"压缩处理"节点应该是true分支
    
    if (conditionContext.condition) {
      const condition = conditionContext.condition.toLowerCase();
      
      // 分析条件表达式
      if (condition.includes('成功') || condition.includes('通过') || condition.includes('满足')) {
        return {
          branch: 'true',
          confidence: 0.8,
          reasoning: '条件表达式暗示成功路径'
        };
      } else if (condition.includes('失败') || condition.includes('错误') || condition.includes('不满足')) {
        return {
          branch: 'false',
          confidence: 0.8,
          reasoning: '条件表达式暗示失败路径'
        };
      }
    }

    return { branch: null, confidence: 0 };
  }

  /**
   * 为AI生成的连接创建分支连接配置
   */
  createAIBranchConnection(sourceNode, targetNode, conditionContext = null) {
    console.log('🤖 [AI分支连接] 创建智能分支连接:', sourceNode.id, '->', targetNode.id);

    // 分析目标节点，决定使用哪个分支
    const branchAnalysis = this.analyzeTargetNodeForBranch(targetNode, conditionContext);
    
    // 根据分析结果选择连接点ID
    const sourceHandle = branchAnalysis.branchRecommendation === 'true' ? 'left-true' : 'right-false';
    
    const connectionConfig = {
      source: sourceNode.id,
      target: targetNode.id,
      sourceHandle: sourceHandle,
      targetHandle: 'top-target', // 目标节点使用默认输入连接点
      type: 'enhanced',
      animated: false,
      style: {
        strokeWidth: 2,
        stroke: branchAnalysis.branchRecommendation === 'true' ? '#0ba875' : '#5b6472',
        filter: `drop-shadow(0 1px 3px ${branchAnalysis.branchRecommendation === 'true' ? 'rgba(11, 168, 117, 0.3)' : 'rgba(91, 100, 114, 0.3)'})`
      },
      markerEnd: 'url(#smooth-arrow)',
      data: {
        branchType: `condition-${branchAnalysis.branchRecommendation}`,
        branchLabel: branchAnalysis.branchRecommendation === 'true' ? '✅ True' : '❌ False',
        aiGenerated: true,
        aiAnalysis: branchAnalysis,
        sourceNode: sourceNode.id,
        targetNode: targetNode.id,
        sourceHandle: sourceHandle,
        targetHandle: 'top-target'
      }
    };

    console.log('✅ [AI分支连接] 连接配置已生成:', connectionConfig);
    return connectionConfig;
  }

  /**
   * 批量处理AI生成的条件分支连接
   */
  processAIConditionConnections(conditionNode, targetNodes, conditionContext = null) {
    console.log('🤖 [批量AI分支] 处理条件节点的多个分支连接:', conditionNode.id);

    const connections = [];
    const branchUsage = { true: false, false: false };

    for (const targetNode of targetNodes) {
      const branchAnalysis = this.analyzeTargetNodeForBranch(targetNode, conditionContext);
      const branchType = branchAnalysis.branchRecommendation;

      // 检查分支是否已被使用
      if (branchUsage[branchType]) {
        console.warn(`⚠️ [分支冲突] ${branchType}分支已被使用，跳过节点:`, targetNode.id);
        continue;
      }

      const connection = this.createAIBranchConnection(conditionNode, targetNode, conditionContext);
      connections.push(connection);
      branchUsage[branchType] = true;

      // 如果两个分支都已使用，停止处理
      if (branchUsage.true && branchUsage.false) {
        break;
      }
    }

    console.log('📊 [批量AI分支] 处理完成:', {
      totalTargets: targetNodes.length,
      connectionsCreated: connections.length,
      branchUsage
    });

    return connections;
  }
}

/**
 * 简单的语义分析器
 */
class SemanticAnalyzer {
  
  /**
   * 分析文本的情感倾向
   */
  analyzeSentiment(text) {
    // 简化的情感分析实现
    const positiveWords = ['成功', '完成', '正确', '通过', '满足'];
    const negativeWords = ['失败', '错误', '不通过', '不满足', '异常'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', confidence: positiveCount / (positiveCount + negativeCount) };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', confidence: negativeCount / (positiveCount + negativeCount) };
    }
    
    return { sentiment: 'neutral', confidence: 0.5 };
  }
}

// 导出管理器
window.AIConditionBranchManager = AIConditionBranchManager;
export default AIConditionBranchManager;
