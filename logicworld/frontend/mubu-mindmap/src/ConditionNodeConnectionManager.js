/**
 * 条件节点连接管理器
 * 实现双层连接点系统：普通连接点 + 专用分支点
 */
class ConditionNodeConnectionManager {
  
  constructor() {
    this.connectionMap = new Map();
  }

  /**
   * 判断是否为分支连接点
   */
  isBranchHandle(handleId) {
    return handleId === 'right-true' || handleId === 'left-false';
  }

  /**
   * 判断是否为普通连接点
   */
  isNormalHandle(handleId) {
    const normalHandles = [
      'top-source', 'top-target',
      'bottom-source', 'bottom-target', 
      'left-source', 'left-target',
      'right-source', 'right-target'
    ];
    return normalHandles.includes(handleId);
  }

  /**
   * 智能识别连接意图
   */
  identifyConnectionIntent(sourceHandle, targetNode, dragContext = null) {
    console.log('🎯 [连接意图识别]', { sourceHandle, targetNode: targetNode?.id, dragContext });

    // 🎯 优先级1: 用户明确拖拽到分支点
    if (this.isBranchHandle(sourceHandle)) {
      const branchType = sourceHandle === 'right-true' ? 'true' : 'false';
      console.log(`✅ [分支连接] 用户明确选择${branchType}分支`);
      return {
        type: 'branch',
        branchType: branchType,
        handle: sourceHandle,
        confidence: 1.0
      };
    }
    
    // 🎯 优先级2: 用户拖拽到普通连接点
    if (this.isNormalHandle(sourceHandle)) {
      console.log('🔗 [普通连接] 使用智能连接系统');
      return {
        type: 'normal',
        handle: sourceHandle,
        useSmartConnection: true,
        confidence: 0.8
      };
    }
    
    // 🎯 优先级3: AI生成连接 - 语义分析
    if (dragContext?.isAIGenerated && targetNode) {
      const branchType = this.analyzeBranchSemantic(targetNode, dragContext);
      console.log(`🤖 [AI生成] 语义分析推荐${branchType}分支`);
      return {
        type: 'branch',
        branchType: branchType,
        handle: branchType === 'true' ? 'right-true' : 'left-false',
        confidence: 0.7
      };
    }
    
    // 🎯 默认: 智能推断
    return this.smartInferConnectionType(targetNode, dragContext);
  }

  /**
   * 语义分析判断分支类型
   */
  analyzeBranchSemantic(targetNode, context = null) {
    const label = targetNode.data?.label?.toLowerCase() || '';
    const description = targetNode.data?.description?.toLowerCase() || '';
    const nodeType = targetNode.type;
    
    console.log('🔍 [语义分析]', { label, description, nodeType });

    // 积极关键词 → True分支
    const positiveKeywords = [
      '成功', '完成', '通过', '继续', '执行', '处理', 
      '生成', '创建', '保存', '发送', '启动', '开始',
      '确认', '同意', '接受', '批准', '验证', '正确'
    ];
    
    // 消极关键词 → False分支  
    const negativeKeywords = [
      '失败', '错误', '跳过', '取消', '停止', '终止', 
      '拒绝', '忽略', '删除', '回滚', '重试', '异常',
      '警告', '提醒', '通知', '记录', '日志'
    ];
    
    // 检查积极关键词
    const hasPositive = positiveKeywords.some(keyword => 
      label.includes(keyword) || description.includes(keyword));
    
    // 检查消极关键词
    const hasNegative = negativeKeywords.some(keyword => 
      label.includes(keyword) || description.includes(keyword));
    
    if (hasPositive && !hasNegative) {
      console.log('✅ [语义分析] 检测到积极关键词，推荐True分支');
      return 'true';
    }
    
    if (hasNegative && !hasPositive) {
      console.log('❌ [语义分析] 检测到消极关键词，推荐False分支');
      return 'false';
    }
    
    // 基于节点类型判断
    if (nodeType === 'execution-node' || nodeType === 'material-node') {
      console.log('🔧 [节点类型] 执行类节点，推荐True分支');
      return 'true';
    }
    
    if (nodeType === 'result-node') {
      if (label.includes('错误') || label.includes('失败')) {
        console.log('📋 [结果节点] 错误结果，推荐False分支');
        return 'false';
      } else {
        console.log('📋 [结果节点] 正常结果，推荐True分支');
        return 'true';
      }
    }
    
    // 默认True分支
    console.log('🎯 [默认策略] 使用True分支');
    return 'true';
  }

  /**
   * 智能推断连接类型
   */
  smartInferConnectionType(targetNode, context = null) {
    if (!targetNode) {
      return {
        type: 'normal',
        handle: 'right-source',
        useSmartConnection: true,
        confidence: 0.5
      };
    }

    // 基于目标节点语义推断应该使用哪种连接
    const branchType = this.analyzeBranchSemantic(targetNode, context);
    
    console.log(`🧠 [智能推断] 推荐使用${branchType}分支连接`);
    
    return {
      type: 'branch',
      branchType: branchType,
      handle: branchType === 'true' ? 'right-true' : 'left-false',
      confidence: 0.6
    };
  }

  /**
   * 检查分支连接冲突
   */
  checkBranchConflict(sourceNode, targetHandle, allConnections) {
    if (!allConnections) return null;
    
    const existingConnections = allConnections.filter(conn => 
      conn.source === sourceNode.id && conn.sourceHandle === targetHandle
    );
    
    return existingConnections.length > 0 ? existingConnections[0] : null;
  }

  /**
   * 获取节点的现有分支连接
   */
  getExistingBranches(sourceNodeId, allConnections) {
    if (!allConnections) return { true: false, false: false };
    
    const nodeConnections = allConnections.filter(conn => conn.source === sourceNodeId);
    
    return {
      true: nodeConnections.some(conn => conn.sourceHandle === 'right-true'),
      false: nodeConnections.some(conn => conn.sourceHandle === 'left-false')
    };
  }

  /**
   * 处理分支连接冲突
   */
  handleBranchConflict(sourceNode, requestedHandle, targetNode, allConnections) {
    const branchType = requestedHandle === 'right-true' ? 'True' : 'False';
    console.warn(`⚠️ [分支冲突] ${branchType}分支已存在连接`);
    
    // 检查另一个分支是否可用
    const existingBranches = this.getExistingBranches(sourceNode.id, allConnections);
    
    if (requestedHandle === 'right-true' && !existingBranches.false) {
      console.log('🔄 [冲突解决] True分支已占用，切换到False分支');
      return 'left-false';
    }
    
    if (requestedHandle === 'left-false' && !existingBranches.true) {
      console.log('🔄 [冲突解决] False分支已占用，切换到True分支');
      return 'right-true';
    }
    
    // 如果两个分支都被占用，返回原请求（让用户决定是否替换）
    console.log('🚫 [冲突解决] 两个分支都已占用，保持原请求');
    return requestedHandle;
  }

  /**
   * 记录连接信息
   */
  recordConnection(sourceNodeId, targetNodeId, connectionInfo) {
    const connectionId = `${sourceNodeId}-${targetNodeId}`;
    this.connectionMap.set(connectionId, {
      ...connectionInfo,
      timestamp: Date.now()
    });
    
    console.log('📝 [连接记录]', { connectionId, connectionInfo });
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(sourceNodeId, allConnections) {
    if (!allConnections) return {};
    
    const nodeConnections = allConnections.filter(conn => conn.source === sourceNodeId);
    const branchConnections = nodeConnections.filter(conn => this.isBranchHandle(conn.sourceHandle));
    const normalConnections = nodeConnections.filter(conn => this.isNormalHandle(conn.sourceHandle));
    
    return {
      total: nodeConnections.length,
      branch: branchConnections.length,
      normal: normalConnections.length,
      trueBranch: nodeConnections.some(conn => conn.sourceHandle === 'right-true'),
      falseBranch: nodeConnections.some(conn => conn.sourceHandle === 'left-false')
    };
  }
}

export default ConditionNodeConnectionManager;
