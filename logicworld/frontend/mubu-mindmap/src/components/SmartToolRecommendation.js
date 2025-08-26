/**
 * 智能工具推荐组件
 * 基于用户输入提供智能工具推荐，使用真实的工具库数据
 */

import React, { useState, useEffect } from 'react';
import './SmartToolRecommendation.css';
import { smartMatchTool, getAllTools, getToolCategories } from '../utils/toolLibrary';

const SmartToolRecommendation = ({
  userInput = '',
  onToolSelect,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  // 当用户输入变化时，异步获取推荐
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userInput.trim()) {
        setRecommendations([]);
        return;
      }

      setLoading(true);
      try {
        const recs = await getSmartRecommendations();
        setRecommendations(recs);
      } catch (error) {
        console.error('获取推荐失败:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchRecommendations, 300); // 防抖
    return () => clearTimeout(debounceTimer);
  }, [userInput]);

  // 智能工具推荐逻辑
  const getSmartRecommendations = async () => {
    if (!userInput.trim()) {
      return [];
    }

    const recommendations = [];

    try {
      // 使用智能匹配算法获取最佳工具
      const bestTool = await smartMatchTool(userInput);
      if (bestTool) {
        recommendations.push({
          ...bestTool,
          confidence: bestTool.available ? 0.9 : 0.3,
          reason: '基于内容智能匹配'
        });
      }

      // 获取所有可用工具作为备选推荐
      const allTools = await getAllTools();
      const availableTools = allTools.filter(tool =>
        tool.available &&
        tool.id !== bestTool?.id &&
        tool.capabilities.some(cap =>
          userInput.toLowerCase().includes(cap.toLowerCase()) ||
          cap.toLowerCase().includes(userInput.toLowerCase().split(' ')[0])
        )
      );

      // 添加最多2个备选工具
      availableTools.slice(0, 2).forEach(tool => {
        recommendations.push({
          ...tool,
          confidence: 0.7,
          reason: '相关功能匹配'
        });
      });

      // 如果没有找到任何推荐，添加默认AI工具
      if (recommendations.length === 0) {
        const defaultTools = allTools.filter(tool =>
          tool.available && (tool.id === 'deepseek_chat' || tool.id === 'tongyi_qwen')
        );
        defaultTools.forEach((tool, index) => {
          recommendations.push({
            ...tool,
            confidence: 0.6 - index * 0.1,
            reason: '通用AI助手'
          });
        });
      }

      return recommendations.slice(0, 3); // 最多返回3个推荐
    } catch (error) {
      console.error('获取工具推荐失败:', error);
      return [];
    }
  };

  // 处理工具选择
  const handleToolSelect = (tool) => {
    if (onToolSelect) {
      onToolSelect({
        id: tool.id,
        name: tool.name,
        available: tool.available,
        description: tool.description,
        groupLabel: tool.groupLabel,
        groupColor: tool.groupColor
      });
    }
  };

  return (
    <div className={`smart-tool-recommendation ${className}`}>
      {/* 简化的推荐标题 */}
      <div className="recommendation-header">
        <h4 className="recommendation-title">
          🧠 智能工具推荐
          {loading && <span className="loading-indicator">加载中...</span>}
          {!loading && recommendations.length > 0 && (
            <span className="match-count">({recommendations.length}个推荐)</span>
          )}
        </h4>
      </div>

      {/* 推荐工具列表 */}
      {recommendations.length > 0 ? (
        <div className="recommendations-list">
          {recommendations.map((recommendation, index) => (
            <div key={index} className={`recommendation-item ${!recommendation.available ? 'unavailable' : ''}`}>
              <div className="tool-info">
                <div className="tool-header">
                  <span className="tool-name">{recommendation.name}</span>
                  <span className="tool-confidence">
                    {(recommendation.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="tool-description">
                  {recommendation.description}
                </div>
                <div className="tool-reason">
                  <span className="reason-label">推荐理由：</span>
                  {recommendation.reason}
                </div>
                {recommendation.groupLabel && (
                  <div className="tool-group" style={{ color: recommendation.groupColor }}>
                    {recommendation.groupLabel}
                  </div>
                )}
              </div>

              <div className="tool-actions">
                <button
                  className={`select-tool-btn ${!recommendation.available ? 'disabled' : ''}`}
                  onClick={() => recommendation.available && handleToolSelect(recommendation)}
                  disabled={!recommendation.available}
                >
                  {recommendation.available ? '选择' : '不可用'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : userInput.trim() ? (
        <div className="no-recommendations">
          <div className="no-recommendations-text">
            未找到匹配的工具，将使用默认AI工具
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-text">
            输入任务描述，获取智能工具推荐
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartToolRecommendation;
