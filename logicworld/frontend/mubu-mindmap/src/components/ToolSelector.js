import React, { useState, useEffect } from 'react';
import { generateToolSelectorOptions, getToolByName, isMissingToolText, getAllTools } from '../utils/toolLibrary';
import SmartToolRecommendation from './SmartToolRecommendation';
import './ToolSelector.css';

// 智能默认工具选择函数
const selectSmartDefault = (executionDescription) => {
  const description = executionDescription?.toLowerCase() || '';
  const allTools = getAllTools();
  const availableTools = allTools.filter(tool => tool.available && tool.enabled !== false);

  // 根据描述内容智能选择默认工具
  if (description.includes('文件') || description.includes('文档')) {
    const fileTool = availableTools.find(tool =>
      tool.name.includes('文件') || tool.functionalCategory === 'file_management'
    );
    if (fileTool) return fileTool;
  }

  if (description.includes('网络') || description.includes('连接') || description.includes('ping')) {
    const networkTool = availableTools.find(tool =>
      tool.name.includes('网络') || tool.name.includes('Ping') || tool.functionalCategory === 'network_communication'
    );
    if (networkTool) return networkTool;
  }

  if (description.includes('数据') || description.includes('分析')) {
    const dataTool = availableTools.find(tool =>
      tool.name.includes('数据') || tool.functionalCategory === 'data_processing'
    );
    if (dataTool) return dataTool;
  }

  if (description.includes('文本') || description.includes('处理')) {
    const textTool = availableTools.find(tool =>
      tool.name.includes('文本') || tool.functionalCategory === 'document_processing'
    );
    if (textTool) return textTool;
  }

  // 如果没有特定匹配，优先选择AI工具
  const aiTool = availableTools.find(tool =>
    tool.functionalCategory === 'ai_assistant' && tool.available
  );
  if (aiTool) return aiTool;

  // 最后回退到第一个可用工具
  if (availableTools.length > 0) {
    return availableTools[0];
  }

  // 如果没有可用工具，返回缺失提示
  return {
    id: 'missing',
    name: '⚠️ 请配置对应功能的工具',
    description: '当前没有适合的工具可用，请配置相应功能的工具',
    available: false,
    groupLabel: '⚠️ 系统状态',
    groupColor: '#dc3545'
  };
};

/**
 * 动态工具选择器组件
 */
const ToolSelector = ({
  defaultValue = '',
  executionDescription = '', // 执行描述，用于智能匹配
  onChange,
  className = '',
  placeholder = '请选择工具',
  showDescription = false,
  showSmartRecommendation = true // 是否显示智能推荐
}) => {
  const [selectedTool, setSelectedTool] = useState(defaultValue);
  const [toolOptions, setToolOptions] = useState([]);
  const [selectedToolInfo, setSelectedToolInfo] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // 初始化工具选项
  useEffect(() => {
    const options = generateToolSelectorOptions();
    setToolOptions(options);
  }, []);

  // 智能匹配逻辑
  useEffect(() => {
    // 如果有明确的defaultValue，直接使用
    if (defaultValue && defaultValue !== '请选择工具' && defaultValue !== '🔄 匹配中...') {
      setSelectedTool(defaultValue);
      const toolInfo = getToolByName(defaultValue);
      if (toolInfo) {
        setSelectedToolInfo(toolInfo);
      }
      return;
    }

    // 如果有执行描述，进行简单智能匹配
    if (executionDescription && executionDescription.trim()) {
      console.log('🧠 开始智能工具匹配，执行描述:', executionDescription);

      // 使用简化的智能匹配（基于真实工具库）
      // 注意：这里我们不直接调用smartMatchTool，因为它在ChatBox.js中定义
      // 而是使用selectSmartDefault作为主要匹配逻辑
      const matchedTool = selectSmartDefault(executionDescription);

      if (matchedTool) {
        console.log('✅ 智能匹配结果:', matchedTool.name);
        setSelectedTool(matchedTool.name);
        setSelectedToolInfo(matchedTool);

        // 通知父组件智能匹配的结果
        if (onChange) {
          onChange(matchedTool.name, matchedTool);
        }
      } else {
        console.log('❌ 未找到匹配的工具，使用默认工具');
        // 设置默认工具
        const defaultTool = { name: '🤖 DeepSeek聊天模型', available: true };
        setSelectedTool(defaultTool.name);
        setSelectedToolInfo(defaultTool);
        if (onChange) {
          onChange(defaultTool.name, defaultTool);
        }
      }

      // 显示推荐面板
      if (showSmartRecommendation) {
        setShowRecommendations(true);
      }
    } else {
      // 没有执行描述时，显示"匹配中"状态
      setSelectedTool('🔄 匹配中...');
      setShowRecommendations(false);
    }
  }, [defaultValue, executionDescription]); // 移除onChange依赖，避免无限循环

  // 处理工具选择变更
  const handleToolChange = (event) => {
    const toolName = event.target.value;
    setSelectedTool(toolName);
    
    // 获取工具详细信息
    const toolInfo = getToolByName(toolName);
    setSelectedToolInfo(toolInfo);
    
    // 调用外部onChange回调
    if (onChange) {
      onChange(toolName, toolInfo);
    }
  };

  // 判断是否为缺失工具
  const isMissingTool = (toolName) => {
    return isMissingToolText(toolName);
  };

  // 判断是否为匹配中状态
  const isMatching = selectedTool === '🔄 匹配中...';

  // 判断当前选择的是否为缺失工具
  const isCurrentlyMissing = isMissingTool(selectedTool);

  return (
    <div className={`tool-selector-container ${className}`}>
      <div className="tool-input-container">
        {/* 如果正在匹配中，显示匹配状态 */}
        {isMatching ? (
          <div className="tool-matching-display">
            <input
              type="text"
              className="tool-matching-input"
              value="🔄 匹配中..."
              readOnly
              placeholder="🔄 匹配中..."
            />
            <span className="matching-icon">🔄</span>
          </div>
        ) : /* 如果是缺失工具，显示为只读输入框 */
        isCurrentlyMissing ? (
          <div className="tool-missing-display">
            <input
              type="text"
              className="tool-missing-input"
              value={selectedTool}
              readOnly
              placeholder="⚠️ 请配置对应功能的工具"
            />
            <span className="missing-icon">⚠️</span>
          </div>
        ) : (
          <>
            <select
              className="tool-selector"
              value={selectedTool}
              onChange={handleToolChange}
            >
              <option value="">{placeholder}</option>

              {toolOptions.map((group, groupIndex) => (
                <optgroup
                  key={groupIndex}
                  label={group.label}
                  style={{ color: group.color }}
                >
                  {group.options.map((tool, toolIndex) => (
                    <option
                      key={`${groupIndex}-${toolIndex}`}
                      value={tool.value}
                      disabled={!tool.available}
                      className={tool.available ? '' : 'tool-unavailable'}
                    >
                      {tool.label}
                      {!tool.available ? ' (未配置)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <span className="dropdown-icon">▼</span>
          </>
        )}
      </div>
      
      {/* 工具描述信息 */}
      {showDescription && selectedToolInfo && (
        <div className="tool-description-panel">
          <div className="tool-info-header">
            <span className="tool-name">{selectedToolInfo.name}</span>
            <span 
              className="tool-group" 
              style={{ color: selectedToolInfo.groupColor }}
            >
              {selectedToolInfo.groupLabel}
            </span>
          </div>
          <div className="tool-description">
            {selectedToolInfo.description}
          </div>
          <div className="tool-capabilities">
            <strong>支持功能：</strong>
            <div className="capabilities-list">
              {selectedToolInfo.capabilities.map((capability, index) => (
                <span key={index} className="capability-tag">
                  {capability}
                </span>
              ))}
            </div>
          </div>
          <div className="tool-status">
            <span className={`status-indicator ${selectedToolInfo.available ? 'available' : 'unavailable'}`}>
              {selectedToolInfo.available ? '✅ 可用' : '❌ 未配置'}
            </span>
          </div>
        </div>
      )}

      {/* 智能工具推荐 */}
      {showSmartRecommendation && showRecommendations && executionDescription && (
        <SmartToolRecommendation
          userInput={executionDescription}
          onToolSelect={(tool) => {
            setSelectedTool(tool.name);
            setSelectedToolInfo(tool);
            if (onChange) {
              onChange(tool.name, tool);
            }
            setShowRecommendations(false);
          }}
          maxRecommendations={5}
          showCategoryFilter={true}
          showConfidence={true}
          className="tool-selector-recommendations"
        />
      )}
    </div>
  );
};

export default ToolSelector;
