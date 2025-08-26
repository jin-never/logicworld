import ConditionNodeConnectionManager from './ConditionNodeConnectionManager.js';

/**
 * 动态连接点系统
 * 让连接点适应连接线方向，而不是让连接线适应固定的连接点
 * 支持双层连接点系统：普通连接点 + 条件节点专用分支点
 */

export class DynamicConnectionSystem {
  constructor() {
    this.connectionMap = new Map(); // 存储连接信息
    this.nodeConnections = new Map(); // 存储每个节点的连接情况
    this.conditionManager = new ConditionNodeConnectionManager(); // 条件节点连接管理器
  }

  /**
   * 计算两个节点之间的最佳连接点
   * @param {Object} sourceNode - 起始节点
   * @param {Object} targetNode - 目标节点
   * @param {string} userDirection - 用户指定的连接方向
   * @param {Object} connectionContext - 连接上下文信息
   * @returns {Object} 最佳连接点配置
   */
  calculateDynamicConnectionPoints(sourceNode, targetNode, userDirection = null, connectionContext = null) {
    console.log('🎯 计算动态连接点:', sourceNode.id, '->', targetNode.id);

    const sourcePos = sourceNode.position;
    const targetPos = targetNode.position;
    const sourceSize = this.getNodeSize(sourceNode);
    const targetSize = this.getNodeSize(targetNode);

    // 计算节点中心点
    const sourceCenterX = sourcePos.x + sourceSize.width / 2;
    const sourceCenterY = sourcePos.y + sourceSize.height / 2;
    const targetCenterX = targetPos.x + targetSize.width / 2;
    const targetCenterY = targetPos.y + targetSize.height / 2;

    // 计算连接向量
    const deltaX = targetCenterX - sourceCenterX;
    const deltaY = targetCenterY - sourceCenterY;

    // 确定连接方向
    const connectionDirection = this.determineConnectionDirection(deltaX, deltaY, userDirection);
    
    // 根据方向计算最佳连接点
    const connectionPoints = this.getOptimalConnectionPoints(
      sourceNode, targetNode,
      sourceCenterX, sourceCenterY,
      targetCenterX, targetCenterY,
      connectionDirection,
      connectionContext
    );

    console.log('🧭 连接方向:', connectionDirection);
    console.log('🔗 选择的连接点:', connectionPoints);

    return {
      ...connectionPoints,
      direction: connectionDirection,
      distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    };
  }

  /**
   * 确定连接方向
   */
  determineConnectionDirection(deltaX, deltaY, userDirection) {
    if (userDirection) {
      return userDirection;
    }

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // 主要方向判断
    if (absX > absY * 1.5) {
      // 水平方向为主
      return deltaX > 0 ? 'horizontal-right' : 'horizontal-left';
    } else if (absY > absX * 1.5) {
      // 垂直方向为主
      return deltaY > 0 ? 'vertical-down' : 'vertical-up';
    } else {
      // 对角线方向
      if (deltaX > 0 && deltaY > 0) return 'diagonal-bottom-right';
      if (deltaX > 0 && deltaY < 0) return 'diagonal-top-right';
      if (deltaX < 0 && deltaY > 0) return 'diagonal-bottom-left';
      return 'diagonal-top-left';
    }
  }

  /**
   * 根据连接方向获取最佳连接点
   */
  getOptimalConnectionPoints(sourceNode, targetNode, sourceCenterX, sourceCenterY, targetCenterX, targetCenterY, direction, connectionContext = null) {
    const sourceSize = this.getNodeSize(sourceNode);
    const targetSize = this.getNodeSize(targetNode);

    let sourceHandle, targetHandle;

    switch (direction) {
      case 'horizontal-right':
        sourceHandle = 'right-source';
        targetHandle = 'left-target';
        break;
      case 'horizontal-left':
        sourceHandle = 'left-source';
        targetHandle = 'right-target';
        break;
      case 'vertical-down':
        sourceHandle = 'bottom-source';
        targetHandle = 'top-target';
        break;
      case 'vertical-up':
        sourceHandle = 'top-source';
        targetHandle = 'bottom-target';
        break;
      case 'diagonal-bottom-right':
        // 选择最接近对角线方向的连接点
        sourceHandle = Math.abs(targetCenterX - sourceCenterX) > Math.abs(targetCenterY - sourceCenterY) 
          ? 'right-source' : 'bottom-source';
        targetHandle = sourceHandle === 'right-source' ? 'left-target' : 'top-target';
        break;
      case 'diagonal-top-right':
        sourceHandle = Math.abs(targetCenterX - sourceCenterX) > Math.abs(targetCenterY - sourceCenterY) 
          ? 'right-source' : 'top-source';
        targetHandle = sourceHandle === 'right-source' ? 'left-target' : 'bottom-target';
        break;
      case 'diagonal-bottom-left':
        sourceHandle = Math.abs(targetCenterX - sourceCenterX) > Math.abs(targetCenterY - sourceCenterY) 
          ? 'left-source' : 'bottom-source';
        targetHandle = sourceHandle === 'left-source' ? 'right-target' : 'top-target';
        break;
      case 'diagonal-top-left':
        sourceHandle = Math.abs(targetCenterX - sourceCenterX) > Math.abs(targetCenterY - sourceCenterY) 
          ? 'left-source' : 'top-source';
        targetHandle = sourceHandle === 'left-source' ? 'right-target' : 'bottom-target';
        break;
      default:
        // 默认右到左连接
        sourceHandle = 'right-source';
        targetHandle = 'left-target';
    }

    // 🔀 处理条件节点的特殊分支连接点
    if (sourceNode.type === 'condition-node') {
      sourceHandle = this.handleConditionNodeConnection(sourceHandle, sourceNode, targetNode, connectionContext);
    }

    return {
      sourceHandle,
      targetHandle
    };
  }

  /**
   * 处理条件节点的双层连接系统
   */
  handleConditionNodeConnection(defaultHandle, sourceNode, targetNode = null, connectionContext = null) {
    console.log('🔀 [条件节点] 双层连接系统处理:', {
      sourceNode: sourceNode.id,
      defaultHandle,
      targetNode: targetNode?.id,
      context: connectionContext
    });

    // 获取当前连接信息（从系统中获取）
    const allConnections = this.getAllConnections();

    // 🎯 第一层：检查是否为分支连接点
    if (this.conditionManager.isBranchHandle(defaultHandle)) {
      return this.handleBranchConnection(defaultHandle, sourceNode, targetNode, connectionContext, allConnections);
    }

    // 🎯 第二层：普通连接点 - 使用智能连接系统
    if (this.conditionManager.isNormalHandle(defaultHandle)) {
      return this.handleNormalConnection(defaultHandle, sourceNode, targetNode, connectionContext);
    }

    // 🎯 第三层：智能推断连接类型
    return this.smartInferConnection(sourceNode, targetNode, connectionContext, allConnections);
  }

  /**
   * 处理分支连接
   */
  handleBranchConnection(sourceHandle, sourceNode, targetNode, context, allConnections) {
    const branchType = sourceHandle === 'right-true' ? 'True' : 'False';
    console.log(`✅ [分支连接] 使用${branchType}分支连接点`);

    // 检查分支冲突
    const existingBranch = this.conditionManager.checkBranchConflict(sourceNode, sourceHandle, allConnections);
    if (existingBranch) {
      console.warn(`⚠️ [分支冲突] ${branchType}分支已存在连接`);
      return this.conditionManager.handleBranchConflict(sourceNode, sourceHandle, targetNode, allConnections);
    }

    return sourceHandle;
  }

  /**
   * 处理普通连接
   */
  handleNormalConnection(sourceHandle, sourceNode, targetNode, context) {
    console.log('🔗 [普通连接] 使用智能连接系统');

    // 调用原有的智能连接逻辑 - 这里需要重构以避免循环调用
    return sourceHandle; // 暂时返回原始handle，后续优化
  }

  /**
   * 智能推断连接类型
   */
  smartInferConnection(sourceNode, targetNode, context, allConnections) {
    // 使用条件节点连接管理器进行智能推断
    const intent = this.conditionManager.identifyConnectionIntent(null, targetNode, context);

    if (intent.type === 'branch') {
      console.log(`🧠 [智能推断] 推荐使用${intent.branchType}分支`);

      // 检查推荐的分支是否可用
      const conflict = this.conditionManager.checkBranchConflict(sourceNode, intent.handle, allConnections);
      if (conflict) {
        console.log('🔄 [智能推断] 推荐分支已占用，寻找替代方案');
        return this.conditionManager.handleBranchConflict(sourceNode, intent.handle, targetNode, allConnections);
      }

      return intent.handle;
    } else {
      console.log('🧠 [智能推断] 推荐使用普通连接');
      return this.handleNormalConnection('right-source', sourceNode, targetNode, context);
    }
  }

  /**
   * 判断目标节点是否表示积极结果
   */
  isPositiveOutcome(label, nodeType) {
    const positiveKeywords = ['成功', '完成', '通过', '继续', '执行', '处理', '生成', '创建', '保存'];
    const negativeKeywords = ['失败', '错误', '跳过', '取消', '停止', '终止', '拒绝'];

    const lowerLabel = label.toLowerCase();

    // 检查积极关键词
    if (positiveKeywords.some(keyword => lowerLabel.includes(keyword))) {
      return true;
    }

    // 检查消极关键词
    if (negativeKeywords.some(keyword => lowerLabel.includes(keyword))) {
      return false;
    }

    // 根据节点类型判断
    if (nodeType === 'execution-node' || nodeType === 'material-node') {
      return true; // 执行节点和材料节点通常是积极流程
    }

    // 默认为积极结果
    return true;
  }

  /**
   * 获取节点尺寸
   */
  getNodeSize(node) {
    // 根据节点类型返回预估尺寸
    const sizeMap = {
      'material-node': { width: 200, height: 120 },
      'execution-node': { width: 200, height: 120 },
      'condition-node': { width: 200, height: 120 },
      'result-node': { width: 200, height: 120 },
      'tool-node': { width: 180, height: 100 }
    };
    
    return sizeMap[node.type] || { width: 200, height: 120 };
  }

  /**
   * 获取所有连接信息
   */
  getAllConnections() {
    // 这里需要从外部系统获取连接信息
    // 暂时返回空数组，后续需要与App.js中的edges状态集成
    return [];
  }

  /**
   * 记录连接信息
   */
  recordConnection(sourceNodeId, targetNodeId, connectionInfo) {
    const connectionId = `${sourceNodeId}-${targetNodeId}`;
    this.connectionMap.set(connectionId, connectionInfo);

    // 更新节点连接记录
    this.addNodeConnection(sourceNodeId, connectionId);
    this.addNodeConnection(targetNodeId, connectionId);
  }

  /**
   * 添加节点连接记录
   */
  addNodeConnection(nodeId, connectionId) {
    if (!this.nodeConnections.has(nodeId)) {
      this.nodeConnections.set(nodeId, []);
    }
    this.nodeConnections.get(nodeId).push(connectionId);
  }

  /**
   * 获取节点的所有连接
   */
  getNodeConnections(nodeId) {
    return this.nodeConnections.get(nodeId) || [];
  }

  /**
   * 移除连接记录
   */
  removeConnection(sourceNodeId, targetNodeId) {
    const connectionId = `${sourceNodeId}-${targetNodeId}`;
    this.connectionMap.delete(connectionId);
    
    // 从节点连接记录中移除
    [sourceNodeId, targetNodeId].forEach(nodeId => {
      const connections = this.nodeConnections.get(nodeId) || [];
      const index = connections.indexOf(connectionId);
      if (index > -1) {
        connections.splice(index, 1);
      }
    });
  }

  /**
   * 清理所有连接记录
   */
  clear() {
    this.connectionMap.clear();
    this.nodeConnections.clear();
  }
}

// 创建全局实例
export const dynamicConnectionSystem = new DynamicConnectionSystem();
