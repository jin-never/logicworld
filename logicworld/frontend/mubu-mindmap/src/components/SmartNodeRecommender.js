import React, { useState, useEffect, useCallback } from 'react';
import './SmartNodeRecommender.css';

/**
 * 智能节点推荐系统
 * 基于当前工作流上下文推荐合适的下一个节点
 */
const SmartNodeRecommender = ({ 
  currentNodes, 
  currentEdges, 
  selectedNodeId, 
  onRecommendationSelect,
  isVisible = false,
  position = { x: 0, y: 0 }
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confidence, setConfidence] = useState(0);

  // 节点类型库
  const nodeLibrary = {
    input: [
      {
        id: 'file_input',
        type: 'MaterialNode',
        title: '文件输入',
        description: '从文件读取数据',
        icon: '📁',
        category: 'input',
        followedBy: ['data_transform', 'text_analysis', 'condition_check']
      },
      {
        id: 'api_input',
        type: 'MaterialNode',
        title: 'API输入',
        description: '从API获取数据',
        icon: '🌐',
        category: 'input',
        followedBy: ['data_transform', 'condition_check', 'ai_process']
      },
      {
        id: 'database_input',
        type: 'MaterialNode',
        title: '数据库输入',
        description: '从数据库查询数据',
        icon: '📊',
        category: 'input',
        followedBy: ['data_transform', 'data_analysis', 'condition_check']
      }
    ],
    process: [
      {
        id: 'data_transform',
        type: 'ExecutionNode',
        title: '数据转换',
        description: '转换数据格式',
        icon: '🔄',
        category: 'process',
        followedBy: ['data_analysis', 'condition_check', 'file_output']
      },
      {
        id: 'ai_process',
        type: 'ExecutionNode',
        title: 'AI处理',
        description: '使用AI处理数据',
        icon: '🤖',
        category: 'process',
        followedBy: ['condition_check', 'text_analysis', 'file_output']
      },
      {
        id: 'text_analysis',
        type: 'ExecutionNode',
        title: '文本分析',
        description: '分析文本内容',
        icon: '📝',
        category: 'process',
        followedBy: ['condition_check', 'file_output', 'email_send']
      },
      {
        id: 'image_process',
        type: 'ExecutionNode',
        title: '图像处理',
        description: '处理图像数据',
        icon: '🖼️',
        category: 'process',
        followedBy: ['condition_check', 'file_output', 'api_output']
      },
      {
        id: 'data_analysis',
        type: 'ExecutionNode',
        title: '数据分析',
        description: '统计分析数据',
        icon: '📈',
        category: 'process',
        followedBy: ['condition_check', 'report_generate', 'file_output']
      }
    ],
    condition: [
      {
        id: 'condition_check',
        type: 'ConditionNode',
        title: '条件判断',
        description: '根据条件分支',
        icon: '❓',
        category: 'condition',
        followedBy: ['file_output', 'email_send', 'api_output', 'notification']
      },
      {
        id: 'approval_gate',
        type: 'ConditionNode',
        title: '审批节点',
        description: '等待人工审批',
        icon: '✋',
        category: 'condition',
        followedBy: ['email_send', 'notification', 'file_output']
      }
    ],
    output: [
      {
        id: 'file_output',
        type: 'ResultNode',
        title: '文件输出',
        description: '保存结果到文件',
        icon: '💾',
        category: 'output',
        followedBy: []
      },
      {
        id: 'email_send',
        type: 'ResultNode',
        title: '邮件发送',
        description: '发送邮件通知',
        icon: '📧',
        category: 'output',
        followedBy: []
      },
      {
        id: 'api_output',
        type: 'ResultNode',
        title: 'API输出',
        description: '推送数据到API',
        icon: '🚀',
        category: 'output',
        followedBy: []
      },
      {
        id: 'notification',
        type: 'ResultNode',
        title: '消息通知',
        description: '发送消息通知',
        icon: '📱',
        category: 'output',
        followedBy: []
      },
      {
        id: 'report_generate',
        type: 'ResultNode',
        title: '报表生成',
        description: '生成数据报表',
        icon: '📋',
        category: 'output',
        followedBy: ['email_send', 'file_output']
      }
    ]
  };

  // 分析工作流上下文
  const analyzeWorkflowContext = useCallback(() => {
    if (!currentNodes || currentNodes.length === 0) {
      return {
        stage: 'start',
        lastNodeType: null,
        dataFlow: 'unknown',
        complexity: 'simple'
      };
    }

    const lastNode = selectedNodeId 
      ? currentNodes.find(n => n.id === selectedNodeId)
      : currentNodes[currentNodes.length - 1];

    if (!lastNode) {
      return {
        stage: 'start',
        lastNodeType: null,
        dataFlow: 'unknown',
        complexity: 'simple'
      };
    }

    // 分析节点类型
    const nodeType = lastNode.data?.nodeType || lastNode.type || 'unknown';
    
    // 分析数据流
    let dataFlow = 'unknown';
    const hasInputNodes = currentNodes.some(n => 
      n.data?.nodeType?.includes('material') || 
      n.data?.category === 'input'
    );
    const hasProcessNodes = currentNodes.some(n => 
      n.data?.nodeType?.includes('execution') || 
      n.data?.category === 'process'
    );
    const hasOutputNodes = currentNodes.some(n => 
      n.data?.nodeType?.includes('result') || 
      n.data?.category === 'output'
    );

    if (hasInputNodes && !hasProcessNodes && !hasOutputNodes) {
      dataFlow = 'input_stage';
    } else if (hasInputNodes && hasProcessNodes && !hasOutputNodes) {
      dataFlow = 'processing_stage';
    } else if (hasInputNodes && hasProcessNodes && hasOutputNodes) {
      dataFlow = 'complete_flow';
    }

    // 分析复杂度
    const complexity = currentNodes.length > 5 ? 'complex' : 
                      currentNodes.length > 2 ? 'medium' : 'simple';

    return {
      stage: dataFlow,
      lastNodeType: nodeType,
      nodeCount: currentNodes.length,
      complexity,
      lastNode
    };
  }, [currentNodes, selectedNodeId]);

  // 生成智能推荐
  const generateRecommendations = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const context = analyzeWorkflowContext();
      const allNodes = Object.values(nodeLibrary).flat();
      const usedNodeTypes = currentNodes.map(n => n.data?.category || n.data?.nodeType);
      
      let recommendations = [];
      let baseConfidence = 0.5;

      // 基于上下文的推荐逻辑
      if (context.stage === 'start') {
        // 开始阶段，推荐输入节点
        recommendations = nodeLibrary.input.map(node => ({
          ...node,
          confidence: 0.9,
          reason: '工作流开始，建议添加数据输入节点'
        }));
        baseConfidence = 0.9;
      } else if (context.lastNode) {
        // 基于最后一个节点推荐
        const lastNodeData = context.lastNode.data;
        let potentialNext = [];

        // 查找当前节点类型的推荐后续节点
        for (const category of Object.values(nodeLibrary)) {
          for (const node of category) {
            if (node.id === lastNodeData?.nodeType || 
                node.category === lastNodeData?.category) {
              potentialNext = node.followedBy || [];
              break;
            }
          }
        }

        // 根据推荐的后续节点生成建议
        for (const nextNodeId of potentialNext) {
          const nextNode = allNodes.find(n => n.id === nextNodeId);
          if (nextNode && !usedNodeTypes.includes(nextNode.category)) {
            recommendations.push({
              ...nextNode,
              confidence: 0.8,
              reason: `适合在${lastNodeData?.label || '当前节点'}之后执行`
            });
          }
        }

        // 如果没有明确的后续推荐，基于工作流阶段推荐
        if (recommendations.length === 0) {
          if (context.stage === 'input_stage') {
            recommendations = nodeLibrary.process.slice(0, 3).map(node => ({
              ...node,
              confidence: 0.7,
              reason: '输入完成，建议添加数据处理节点'
            }));
          } else if (context.stage === 'processing_stage') {
            recommendations = [
              ...nodeLibrary.condition.slice(0, 1),
              ...nodeLibrary.output.slice(0, 2)
            ].map(node => ({
              ...node,
              confidence: 0.6,
              reason: '处理完成，建议添加条件判断或输出节点'
            }));
          }
        }

        baseConfidence = 0.7;
      }

      // 智能排序（按置信度和相关性）
      recommendations.sort((a, b) => b.confidence - a.confidence);
      
      // 限制推荐数量
      recommendations = recommendations.slice(0, 5);

      setRecommendations(recommendations);
      setConfidence(baseConfidence);
      
    } catch (error) {
      console.error('生成推荐失败:', error);
      setRecommendations([]);
      setConfidence(0);
    }
    
    setIsLoading(false);
  }, [analyzeWorkflowContext, currentNodes, nodeLibrary]);

  // 当节点变化时重新生成推荐
  useEffect(() => {
    if (isVisible) {
      generateRecommendations();
    }
  }, [isVisible, selectedNodeId, currentNodes, generateRecommendations]);

  // 处理推荐选择
  const handleRecommendationClick = (recommendation) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: recommendation.type,
      data: {
        label: recommendation.title,
        nodeType: recommendation.type.toLowerCase().replace('node', '-node'),
        icon: recommendation.icon,
        description: recommendation.description,
        category: recommendation.category,
        aiRecommended: true,
        confidence: recommendation.confidence
      },
      position: { x: position.x, y: position.y + 100 }
    };

    onRecommendationSelect?.(newNode, recommendation);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="smart-node-recommender"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000
      }}
    >
      <div className="recommender-header">
        <div className="recommender-title">
          <span className="title-icon">🧠</span>
          <span className="title-text">智能推荐</span>
          {confidence > 0 && (
            <span className="confidence-badge">
              {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      <div className="recommendations-list">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>分析中...</span>
          </div>
        ) : recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <div 
              key={rec.id} 
              className="recommendation-item"
              onClick={() => handleRecommendationClick(rec)}
            >
              <div className="rec-icon">{rec.icon}</div>
              <div className="rec-content">
                <div className="rec-title">{rec.title}</div>
                <div className="rec-description">{rec.description}</div>
                <div className="rec-reason">{rec.reason}</div>
              </div>
              <div className="rec-confidence">
                {Math.round(rec.confidence * 100)}%
              </div>
            </div>
          ))
        ) : (
          <div className="empty-recommendations">
            <span className="empty-icon">💡</span>
            <span className="empty-text">暂无推荐</span>
          </div>
        )}
      </div>

      <div className="recommender-footer">
        <span className="footer-text">基于工作流上下文智能推荐</span>
      </div>
    </div>
  );
};

export default SmartNodeRecommender; 