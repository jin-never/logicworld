import React, { useState, useEffect } from 'react';
import './AIWorkflowModal.css';
import EnhancedStepEditor from './EnhancedStepEditor';

// 🌳 增强分支工作流可视化组件
const BranchWorkflowVisualizer = ({ steps, isGenerating }) => {
  // 智能检测工作流类型和分支结构
  const detectWorkflowStructure = (steps) => {
    if (!steps || steps.length === 0) return { type: 'empty' };

    // 检查预定义的分支结构
    if (steps.branchStructure) {
      return { ...steps.branchStructure, predefined: true };
    }

    // 智能分析步骤内容
    const analysisResult = analyzeStepsForBranches(steps);
    
    // 检查是否有并行分支标记
    const parallelBranches = steps.filter(step => 
      step.isParallelBranch || step.isBranchStart || 
      analysisResult.parallelSteps.includes(step.id)
    );
    const convergencePoints = steps.filter(step => 
      step.convergencePoint || step.isBranchEnd ||
      analysisResult.convergenceSteps.includes(step.id)
    );
    
    // 检查是否有条件分支
    const conditionSteps = steps.filter(step => 
      step.nodeType === 'condition-node' ||
      analysisResult.conditionSteps.includes(step.id) ||
      step.title?.includes('条件') || 
      step.title?.includes('判断') ||
      step.title?.includes('检查') ||
      step.title?.includes('选择') ||
      step.title?.includes('决定')
    );

    // 检测混合工作流（既有并行又有条件）
    if (parallelBranches.length > 1 && conditionSteps.length > 0) {
      return {
        type: 'mixed',
        parallelBranches: parallelBranches.map(step => step.id),
        conditionBranches: conditionSteps.map(step => step.id),
        convergenceNodes: convergencePoints.map(step => step.id),
        complexity: 'high',
        description: `包含${parallelBranches.length}个并行分支和${conditionSteps.length}个条件判断`
      };
    }

    // 智能分析多分支并行结构
    if (parallelBranches.length > 1) {
      const branchGroups = groupParallelBranches(steps, parallelBranches);
      return {
        type: 'parallel',
        branchNodes: parallelBranches.map(step => step.id),
        convergenceNodes: convergencePoints.map(step => step.id),
        totalBranches: parallelBranches.length,
        branchGroups: branchGroups,
        complexity: parallelBranches.length > 3 ? 'high' : 'medium'
      };
    }

    // 智能分析条件分支结构
    if (conditionSteps.length > 0) {
      const branchTree = buildConditionalTree(steps, conditionSteps);
      return {
        type: 'conditional',
        conditionNodes: conditionSteps.map(step => step.id),
        branchPoints: conditionSteps.map(step => ({
          stepId: step.id,
          condition: step.title,
          branches: detectBranchOptions(step),
          nextSteps: findNextSteps(steps, step)
        })),
        branchTree: branchTree,
        complexity: conditionSteps.length > 2 ? 'high' : 'medium'
      };
    }

    return { 
      type: 'linear',
      complexity: 'low',
      description: `${steps.length}个顺序执行的步骤`
    };
  };

  // 分析步骤内容识别分支特征
  const analyzeStepsForBranches = (steps) => {
    const parallelKeywords = ['并行', '同时', '分别', '各自', '同步'];
    const conditionKeywords = ['如果', '判断', '检查', '验证', '选择', '决定', '条件'];
    const convergenceKeywords = ['汇总', '合并', '整合', '收集', '统一'];

    const parallelSteps = [];
    const conditionSteps = [];
    const convergenceSteps = [];

    steps.forEach(step => {
      const text = `${step.title} ${step.description || ''}`.toLowerCase();
      
      if (parallelKeywords.some(keyword => text.includes(keyword))) {
        parallelSteps.push(step.id);
      }
      if (conditionKeywords.some(keyword => text.includes(keyword))) {
        conditionSteps.push(step.id);
      }
      if (convergenceKeywords.some(keyword => text.includes(keyword))) {
        convergenceSteps.push(step.id);
      }
    });

    return { parallelSteps, conditionSteps, convergenceSteps };
  };

  // 将并行分支进行分组
  const groupParallelBranches = (steps, parallelBranches) => {
    const groups = [];
    let currentGroup = [];
    
    parallelBranches.forEach((branch, index) => {
      currentGroup.push(branch);
      
      // 如果是最后一个或下一个不是连续的，结束当前组
      if (index === parallelBranches.length - 1 || 
          parallelBranches[index + 1].id !== branch.id + 1) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
    });
    
    return groups;
  };

  // 构建条件分支树
  const buildConditionalTree = (steps, conditionSteps) => {
    return conditionSteps.map(conditionStep => {
      const nextSteps = findNextSteps(steps, conditionStep);
      return {
        condition: conditionStep,
        branches: nextSteps
      };
    });
  };

  // 检测分支选项（true/false, 多选项等）
  const detectBranchOptions = (step) => {
    const text = `${step.title} ${step.description || ''}`.toLowerCase();
    
    if (text.includes('通过') && text.includes('失败')) {
      return [{ label: '✓ 通过', value: 'pass' }, { label: '✗ 失败', value: 'fail' }];
    }
    if (text.includes('成功') && text.includes('失败')) {
      return [{ label: '✓ 成功', value: 'success' }, { label: '✗ 失败', value: 'error' }];
    }
    if (text.includes('有') && text.includes('无')) {
      return [{ label: '✓ 有', value: 'exists' }, { label: '✗ 无', value: 'none' }];
    }
    
    return [{ label: '✓ 是', value: 'true' }, { label: '✗ 否', value: 'false' }];
  };

  // 找到步骤的后续步骤
  const findNextSteps = (steps, currentStep) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep.id);
    return steps.slice(currentIndex + 1, currentIndex + 3); // 获取后续2个步骤
  };

  const workflowStructure = detectWorkflowStructure(steps);
  console.log('🔍 检测到的工作流结构:', workflowStructure);

  // 渲染线性工作流
  const renderLinearWorkflow = () => (
    <div className="linear-workflow">
      {steps.map((step, index) => (
        <div key={step.id} className="linear-step-container">
          <div className={`step-item linear ${step.status || 'generated'}`}>
            <div className="step-number">{step.id}</div>
            <div className="step-content">
              <h4 className="step-title">{step.title}</h4>
              <p className="step-description">{step.description}</p>
              <div className="step-tool">
                <span className="tool-label">推荐工具：</span>
                <span className="tool-name">{step.tool}</span>
              </div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className="step-connector linear">
              <div className="connector-line visible"></div>
              <div className="connector-arrow visible">↓</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // 渲染并行分支工作流
  const renderParallelWorkflow = () => {
    const { branchNodes, convergenceNodes, totalBranches } = workflowStructure;
    const beforeBranch = steps.filter(step => !branchNodes.includes(step.id) && !convergenceNodes.includes(step.id));
    const branchSteps = steps.filter(step => branchNodes.includes(step.id));
    const afterBranch = steps.filter(step => convergenceNodes.includes(step.id));

    return (
      <div className="parallel-workflow">
        {/* 分支前的步骤 */}
        {beforeBranch.map((step, index) => (
          <div key={`pre-${step.id}`} className="linear-step-container">
            <div className={`step-item linear ${step.status || 'generated'}`}>
              <div className="step-number">{step.id}</div>
              <div className="step-content">
                <h4 className="step-title">{step.title}</h4>
                <p className="step-description">{step.description}</p>
                <div className="step-tool">
                  <span className="tool-label">推荐工具：</span>
                  <span className="tool-name">{step.tool}</span>
                </div>
              </div>
            </div>
            <div className="step-connector">
              <div className="connector-line"></div>
              <div className="connector-arrow">↓</div>
            </div>
          </div>
        ))}

        {/* 分支分叉点 */}
        {branchSteps.length > 0 && (
          <div className="branch-section">
            <div className="branch-split-indicator">
              <div className="split-line"></div>
              <div className="split-text">🔀 分为 {totalBranches} 个并行分支</div>
            </div>
            
            <div className="parallel-branches">
              {branchSteps.map((step, index) => (
                <div key={step.id} className="branch-column">
                  <div className="branch-header">
                    <span className="branch-label">分支 {index + 1}</span>
                  </div>
                  <div className={`step-item branch ${step.status || 'generated'}`}>
                    <div className="step-number">{step.id}</div>
                    <div className="step-content">
                      <h4 className="step-title">{step.title}</h4>
                      <p className="step-description">{step.description}</p>
                      <div className="step-tool">
                        <span className="tool-label">推荐工具：</span>
                        <span className="tool-name">{step.tool}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="branch-merge-indicator">
              <div className="merge-line"></div>
              <div className="merge-text">🔄 分支汇聚</div>
            </div>
          </div>
        )}

        {/* 汇聚后的步骤 */}
        {afterBranch.map((step, index) => (
          <div key={`post-${step.id}`} className="linear-step-container">
            <div className={`step-item linear ${step.status || 'generated'}`}>
              <div className="step-number">{step.id}</div>
              <div className="step-content">
                <h4 className="step-title">{step.title}</h4>
                <p className="step-description">{step.description}</p>
                <div className="step-tool">
                  <span className="tool-label">推荐工具：</span>
                  <span className="tool-name">{step.tool}</span>
                </div>
              </div>
            </div>
            {index < afterBranch.length - 1 && (
              <div className="step-connector">
                <div className="connector-line"></div>
                <div className="connector-arrow">↓</div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染条件分支工作流
  const renderConditionalWorkflow = () => {
    const { conditionNodes, branchPoints } = workflowStructure;
    
    return (
      <div className="conditional-workflow">
        {steps.map((step, index) => {
          const isCondition = conditionNodes.includes(step.id);
          
          return (
            <div key={step.id} className="conditional-step-container">
              <div className={`step-item ${isCondition ? 'condition' : 'linear'} ${step.status || 'generated'}`}>
                <div className="step-number">{step.id}</div>
                <div className="step-content">
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-description">{step.description}</p>
                  <div className="step-tool">
                    <span className="tool-label">推荐工具：</span>
                    <span className="tool-name">{step.tool}</span>
                  </div>
                  {isCondition && (
                    <div className="condition-branches">
                      <div className="branch-option true">✓ 是</div>
                      <div className="branch-option false">✗ 否</div>
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`step-connector ${isCondition ? 'conditional' : 'linear'}`}>
                  <div className="connector-line visible"></div>
                  <div className="connector-arrow visible">{isCondition ? '⚡' : '↓'}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 根据工作流类型选择渲染方式
  const renderWorkflow = () => {
    switch (workflowStructure.type) {
      case 'parallel':
        return renderParallelWorkflow();
      case 'conditional':
      case 'conditional_tree':
        return renderConditionalWorkflow();
      case 'linear':
      default:
        return renderLinearWorkflow();
    }
  };

  // 渲染混合工作流
  const renderMixedWorkflow = () => {
    const { parallelBranches, conditionBranches, convergenceNodes } = workflowStructure;
    
    return (
      <div className="mixed-workflow">
        <div className="workflow-complexity-badge">
          <span className="complexity-indicator high">🌟 高复杂度工作流</span>
          <span className="complexity-desc">{workflowStructure.description}</span>
        </div>
        
        {steps.map((step, index) => {
          const isParallel = parallelBranches.includes(step.id);
          const isCondition = conditionBranches.includes(step.id);
          const isConvergence = convergenceNodes.includes(step.id);
          
          let stepType = 'linear';
          let stepIcon = '📋';
          
          if (isParallel && isCondition) {
            stepType = 'hybrid';
            stepIcon = '🔀🔍';
          } else if (isParallel) {
            stepType = 'parallel';
            stepIcon = '🔀';
          } else if (isCondition) {
            stepType = 'condition';
            stepIcon = '🔍';
          } else if (isConvergence) {
            stepType = 'convergence';
            stepIcon = '🔄';
          }
          
          return (
            <div key={step.id} className="mixed-step-container">
              <div className={`step-item mixed ${stepType} ${step.status || 'generated'}`}>
                <div className="step-number">
                  <span className="step-icon">{stepIcon}</span>
                  <span className="step-id">{step.id}</span>
                </div>
                <div className="step-content">
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-description">{step.description}</p>
                  <div className="step-metadata">
                    <div className="step-tool">
                      <span className="tool-label">推荐工具：</span>
                      <span className="tool-name">{step.tool}</span>
                    </div>
                    <div className="step-type-badge">
                      {stepType === 'hybrid' && <span className="badge hybrid">并行+条件</span>}
                      {stepType === 'parallel' && <span className="badge parallel">并行分支</span>}
                      {stepType === 'condition' && <span className="badge condition">条件判断</span>}
                      {stepType === 'convergence' && <span className="badge convergence">分支汇聚</span>}
                    </div>
                  </div>
                  {isCondition && (
                    <div className="condition-branches enhanced">
                      {detectBranchOptions(step).map((option, i) => (
                        <div key={i} className={`branch-option ${option.value}`}>
                          {option.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                        {index < steps.length - 1 && (
            <div className={`step-connector enhanced ${stepType}`}>
              <div className="connector-line visible"></div>
              <div className="connector-arrow visible">
                {stepType === 'hybrid' ? '⚡🔀' : 
                 stepType === 'parallel' ? '🔀' :
                 stepType === 'condition' ? '🔍' :
                 stepType === 'convergence' ? '🔄' : '↓'}
              </div>
            </div>
          )}
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染工作流类型指示器
  const renderWorkflowTypeIndicator = () => {
    const { type, complexity, description } = workflowStructure;
    
    const typeConfig = {
      parallel: { icon: '🔀', name: '并行分支工作流', color: '#3b82f6' },
      conditional: { icon: '🔍', name: '条件分支工作流', color: '#f59e0b' },
      mixed: { icon: '🌟', name: '混合分支工作流', color: '#8b5cf6' },
      linear: { icon: '📝', name: '线性工作流', color: '#10b981' },
      empty: { icon: '⏳', name: '等待生成', color: '#6b7280' }
    };
    
    const config = typeConfig[type] || typeConfig.linear;
    
    return (
      <div className="workflow-type-indicator enhanced">
        <div className="type-info">
          <span className="type-badge" style={{ backgroundColor: config.color }}>
            {config.icon} {config.name}
          </span>
          {complexity && (
            <span className={`complexity-badge ${complexity}`}>
              {complexity === 'high' ? '🔥 复杂' : 
               complexity === 'medium' ? '⚡ 中等' : '✨ 简单'}
            </span>
          )}
        </div>
        <div className="workflow-stats">
          <span className="step-count">{steps.length} 个步骤</span>
          {description && <span className="workflow-desc">{description}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="branch-workflow-visualizer enhanced">
      {renderWorkflowTypeIndicator()}
      
      <div className="workflow-content">
        {workflowStructure.type === 'mixed' ? renderMixedWorkflow() : renderWorkflow()}
        
        {isGenerating && (
          <div className="generation-overlay">
            <div className="generation-progress">
              <div className="progress-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="progress-text">AI正在智能分析分支结构...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// AI工作流浮窗组件 - 全新设计
const AIWorkflowModal = ({ isOpen, onClose, onWorkflowGenerated }) => {
  const [userInput, setUserInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [generatedSteps, setGeneratedSteps] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // 智能规划相关状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [workflowSummary, setWorkflowSummary] = useState(null);
  const [showStreamingOutput, setShowStreamingOutput] = useState(false);

  // 工作流示例提示
  const workflowExamples = [
    "创建一个云原生微服务架构部署工作流：包含容器化、Kubernetes部署、服务网格、监控告警、CI/CD流水线等架构组件",
    "设计一个完整的项目管理工作流：项目立项、需求分析、团队组建、任务分解、进度跟踪、风险管理、项目交付",
    "建立一个数据科学分析流程：数据收集、清洗预处理、特征工程、模型训练、验证评估、部署监控",
    "构建一个电商订单处理工作流：订单接收、库存检查、支付处理、物流配送、售后服务、数据分析",
    "制作一个内容创作发布流程：主题策划、资料收集、内容撰写、审核修改、多平台发布、效果分析"
  ];

  // 支持的文件类型
  const supportedFileTypes = {
    documents: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'],
    images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
    videos: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
    data: ['.csv', '.xlsx', '.xls', '.json', '.xml', '.yaml', '.yml'],
    code: ['.js', '.py', '.java', '.cpp', '.html', '.css', '.php', '.rb', '.go', '.rs'],
    audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
    archives: ['.zip', '.rar', '.7z', '.tar', '.gz']
  };

  // 获取所有支持的文件扩展名
  const getAllSupportedExtensions = () => {
    return Object.values(supportedFileTypes).flat().join(',');
  };

  // 文件上传处理
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: null
    }));

    // 为图片文件生成预览
    newFiles.forEach(fileObj => {
      if (fileObj.file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileObj.preview = e.target.result;
          setUploadedFiles(prev => [...prev]);
        };
        reader.readAsDataURL(fileObj.file);
      }
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // 删除文件
  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // 智能规划流式处理函数
  const handleIntelligentPlanningStream = async () => {
    if (!userInput.trim()) {
      alert('请输入工作流描述');
      return;
    }

    setIsStreaming(true);
    setStreamingContent('');
    setWorkflowSummary(null);
    setShowStreamingOutput(true);
    setGeneratedSteps([]);

    try {
      console.log('🧠 发送流式智能规划请求:', userInput);

      // 尝试连接真实的AI API
      const response = await fetch('http://localhost:8000/api/intelligent-planning/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: userInput,
          session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          context: {}
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API调用失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'intent') {
                console.log('🎯 识别意图:', data.intent);
              } else if (data.type === 'chunk') {
                accumulatedText += data.content;
                setStreamingContent(accumulatedText);
              } else if (data.type === 'complete') {
                console.log('✅ 流式输出完成');

                // 检测是否是工作流内容并生成摘要
                const isWorkflow = detectWorkflowContent(accumulatedText);
                if (isWorkflow) {
                  const summary = parseWorkflowContent(accumulatedText);
                  setWorkflowSummary(summary);
                  console.log('🔧 检测到工作流内容，生成摘要:', summary);
                }
                break;
              }
            } catch (e) {
              console.warn('解析流式数据失败:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('🚨 AI调用失败，降级到模拟响应:', error);
      // 降级到模拟响应
      await simulateStreamingResponse();
    } finally {
      setIsStreaming(false);
    }
  };

  // 生成步骤
  // 真正的AI步骤生成函数
  const generateSteps = async () => {
    if (!userInput.trim()) {
      alert('请输入工作流需求');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedSteps([]);

    try {
      console.log('🚀 开始AI步骤生成:', userInput);

      // 第一阶段：分析需求
      setGenerationProgress(25);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 第二阶段：AI思考
      setGenerationProgress(50);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 第三阶段：调用真正的AI API生成步骤
      setGenerationProgress(75);

      const response = await fetch('/api/intelligent-workflow/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: userInput,
          context: {
            uploadedFiles: uploadedFiles,
            userPreferences: {}
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI生成失败: ${response.status}`);
      }

      const result = await response.json();
      console.log('🎯 AI生成结果:', result);
      console.log('🔍 检查数据结构:');
      console.log('  result.success:', result.success);
      console.log('  result.workflow:', result.workflow);
      console.log('  result.workflow.steps:', result.workflow?.steps);
      console.log('  完整workflow对象键值:', result.workflow ? Object.keys(result.workflow) : 'workflow为空');

      // 第四阶段：处理AI返回的步骤并匹配工具
      if (result.success && result.workflow && result.workflow.steps) {
        const aiSteps = result.workflow.steps.map((step, index) => ({
          id: index + 1,
          title: step.title || `步骤 ${index + 1}`,
          description: step.description || step.content || '执行相关任务',
          tool: step.tool || step.toolName || '智能工具',
          aiGenerated: true,
          parameters: step.parameters || {},
          executionDescription: step.executionDescription || step.aiDescription,
          status: 'generated'
        }));

        // 逐步显示AI生成的步骤
        for (let i = 0; i < aiSteps.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setGeneratedSteps(prev => [...prev, aiSteps[i]]);
        }

        setGenerationProgress(100);
        console.log('✅ AI步骤生成完成:', aiSteps);
      } else {
        throw new Error('AI返回的数据格式不正确');
      }

    } catch (error) {
      console.error('🚨 AI步骤生成失败:', error);

      // 降级到智能模拟生成
      console.log('🔄 降级到智能模拟生成');
      await generateIntelligentMockSteps();

    } finally {
      setIsGenerating(false);
    }
  };

  // 模拟流式响应（降级方案）
  const simulateStreamingResponse = async () => {
    const mockResponse = `# 📋 执行步骤

## 📋 ▶️ 步骤1：需求分析与架构设计
**执行描述**：整理微服务架构需求，设计系统组件划分，确定服务边界和通信协议

## 📋 ▶️ 步骤2：容器化应用开发
**执行描述**：为每个微服务编写Dockerfile，配置容器运行环境，优化镜像大小

## 📋 ▶️ 步骤3：Kubernetes资源配置
**执行描述**：编写Kubernetes部署文件，配置Service、Deployment、ConfigMap等资源

## 📋 ▶️ 步骤4：服务网格集成
**执行描述**：设计服务间通信策略，配置Istio或其他服务网格组件

## 📋 ▶️ 步骤5：监控告警系统搭建
**执行描述**：设计指标采集方案，配置Prometheus、Grafana等监控工具`;

    // 模拟流式输出
    const words = mockResponse.split('');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += words[i];
      setStreamingContent(currentText);

      // 随机延迟，模拟真实的流式输出
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // 生成工作流摘要
    const summary = parseWorkflowContent(mockResponse);
    setWorkflowSummary(summary);
  };

  // 检测工作流内容
  const detectWorkflowContent = (text) => {
    const workflowKeywords = ['步骤', '执行', '流程', '阶段', '任务', '工作流', '规划'];
    return workflowKeywords.some(keyword => text.includes(keyword));
  };

  // 解析工作流内容
  const parseWorkflowContent = (text) => {
    const lines = text.split('\n');
    const steps = [];
    let currentStep = null;

    for (const line of lines) {
      if (line.includes('步骤') && line.includes('▶️')) {
        if (currentStep) steps.push(currentStep);
        const match = line.match(/步骤(\d+)：(.+)/);
        if (match) {
          currentStep = {
            id: match[1],
            title: match[2],
            description: ''
          };
        }
      } else if (line.includes('执行描述') && currentStep) {
        const match = line.match(/执行描述.*?：(.+)/);
        if (match) {
          currentStep.description = match[1];
        }
      }
    }

    if (currentStep) steps.push(currentStep);

    return {
      title: '📋 **执行步骤**',
      stepCount: steps.length,
      steps: steps.slice(0, 5) // 只显示前5个步骤的摘要
    };
  };

  // 生成思维导图
  const generateMindmapFromSummary = () => {
    if (!workflowSummary) return;

    // 将工作流摘要转换为思维导图节点
    const nodes = [];
    const edges = [];

    // 为每个步骤创建节点
    workflowSummary.steps.forEach((step, index) => {
      const nodeId = `step-${step.id}`;
      nodes.push({
        id: nodeId,
        type: 'execution-node',
        position: { x: 200 + (index % 3) * 300, y: 200 + Math.floor(index / 3) * 200 },
        data: {
          label: step.title,
          nodeType: 'execution-node',
          description: step.description,
          aiModel: 'DeepSeek聊天模型',
          toolType: index % 2 === 0 ? 'DeepSeek聊天模型' : '文件操作工具',
          inputContent: step.description,
          status: 'ready'
        }
      });

      // 创建连接线
      if (index > 0) {
        edges.push({
          id: `step-${workflowSummary.steps[index-1].id}-to-${nodeId}`,
          source: `step-${workflowSummary.steps[index-1].id}`,
          target: nodeId,
          type: 'smoothstep'
        });
      }
    });

    // 调用回调函数生成思维导图
    if (onWorkflowGenerated) {
      onWorkflowGenerated(nodes, edges);
    }

    // 关闭模态框
    onClose();
  };

  // 分层精确工具匹配算法（解决硬编码问题）
  const performThreeLayerToolMatching = async (stepDescription, stepTitle) => {
    console.log('🎯 开始分层精确工具匹配:', { stepDescription, stepTitle });

    try {
      const text = `${stepTitle} ${stepDescription}`.toLowerCase().trim();

      // 动态获取所有可用工具（解决硬编码问题）
      const { getAllTools } = await import('../utils/toolLibrary.js');
      const allTools = await getAllTools();

      console.log('🔍 输入文本:', text);
      console.log('🔍 可用工具:', allTools.map(t => ({ name: t.name, id: t.id, available: t.available })));

      // 动态构建工具关键词映射（非硬编码）
      const toolKeywordMapping = await buildDynamicToolMapping(allTools);
      console.log('🗺️ 动态工具映射:', toolKeywordMapping);

      // 第1层：精确关键词匹配 (置信度95%)
      const exactMatch = performExactKeywordMatch(text, toolKeywordMapping, allTools);
      if (exactMatch) {
        console.log('🎯 第1层精确匹配成功:', exactMatch);
        return exactMatch;
      }

      // 第2层：模糊关键词匹配 (置信度70%)
      const fuzzyMatch = performFuzzyKeywordMatch(text, toolKeywordMapping, allTools);
      if (fuzzyMatch) {
        console.log('🔍 第2层模糊匹配成功:', fuzzyMatch);
        return fuzzyMatch;
      }

      // 第3层：功能描述匹配 (置信度50%)
      const functionMatch = performFunctionMatch(text, toolKeywordMapping, allTools);
      if (functionMatch) {
        console.log('⚡ 第3层功能匹配成功:', functionMatch);
        return functionMatch;
      }

      // 第4层：默认工具降级 (置信度30%)
      const defaultMatch = getDefaultTool(allTools);
      console.log('🔄 降级到默认工具:', defaultMatch);
      return defaultMatch;

    } catch (error) {
      console.error('🚨 工具匹配失败:', error);
      return {
        name: 'DeepSeek聊天模型',
        confidence: 0.2,
        source: 'error_fallback',
        error: error.message
      };
    }
  };

  // 获取默认AI模型（始终返回DeepSeek）
  const getDefaultAIModel = () => {
    console.log('🤖 使用默认AI模型: DeepSeek聊天模型');
    return {
      name: 'DeepSeek聊天模型',
      id: 'deepseek_chat',
      confidence: 1.0,
      source: 'default_ai_model',
      layer: 0
    };
  };

  // 动态构建工具关键词映射（解决硬编码问题）
  const buildDynamicToolMapping = async (allTools) => {
    const mapping = {};

    allTools.forEach(tool => {
      if (!tool.available) return;

      // 根据工具信息动态生成关键词
      const keywords = generateKeywordsForTool(tool);
      mapping[tool.id] = {
        tool: tool,
        exact: keywords.exact,
        fuzzy: keywords.fuzzy,
        functions: keywords.functions
      };
    });

    return mapping;
  };

  // 根据工具信息动态生成关键词
  const generateKeywordsForTool = (tool) => {
    const exact = [];
    const fuzzy = [];
    const functions = [];

    // 从工具名称提取关键词
    const toolName = tool.name.toLowerCase();
    const toolId = tool.id.toLowerCase();

    // Excel工具关键词
    if (toolName.includes('excel') || toolId.includes('excel')) {
      exact.push('excel', 'xls', 'xlsx');
      fuzzy.push('表格', '数据表', '工作表', '电子表格', '数据');
      functions.push('计算', '统计', '分析', '图表');
    }

    // Word工具关键词
    if (toolName.includes('word') || toolId.includes('word') || toolName.includes('文档')) {
      exact.push('word', 'doc', 'docx');
      fuzzy.push('文档', '报告', '文字', '写作', '编辑');
      functions.push('写作', '编辑', '格式化', '排版');
    }

    // PowerPoint工具关键词
    if (toolName.includes('powerpoint') || toolId.includes('powerpoint') || toolName.includes('ppt')) {
      exact.push('powerpoint', 'ppt', 'pptx');
      fuzzy.push('幻灯片', '演示', '展示', '演讲');
      functions.push('演示', '展示', '汇报');
    }

    // 文件管理工具关键词
    if (toolName.includes('file') || toolName.includes('文件') || toolId.includes('file')) {
      exact.push('file', 'folder', 'directory');
      fuzzy.push('文件', '目录', '文件夹', '管理');
      functions.push('管理', '组织', '存储', '备份');
    }

    // 文本处理工具关键词
    if (toolName.includes('text') || toolName.includes('文本') || toolId.includes('text')) {
      exact.push('text', 'txt');
      fuzzy.push('文本', '文字', '内容');
      functions.push('处理', '格式化', '编辑');
    }

    // AI聊天工具关键词
    if (toolName.includes('chat') || toolName.includes('ai') || toolName.includes('deepseek')) {
      exact.push('chat', 'ai', 'deepseek');
      fuzzy.push('聊天', '对话', '智能', '助手');
      functions.push('分析', '思考', '建议', '咨询', '生成', '创建');
    }

    // 从工具描述中提取更多关键词
    if (tool.description) {
      const desc = tool.description.toLowerCase();
      // 这里可以添加更复杂的NLP处理来提取关键词
    }

    return { exact, fuzzy, functions };
  };

  // 第1层：精确关键词匹配 (置信度95%)
  const performExactKeywordMatch = (text, toolMapping, allTools) => {
    console.log('🎯 第1层：精确关键词匹配');

    for (const [toolId, config] of Object.entries(toolMapping)) {
      const { tool, exact } = config;

      for (const keyword of exact) {
        if (text.includes(keyword)) {
          console.log(`✅ 精确匹配: "${keyword}" → ${tool.name}`);
          return {
            name: tool.name,
            id: tool.id,
            confidence: 0.95,
            source: 'exact_keyword_match',
            matchedKeyword: keyword,
            layer: 1
          };
        }
      }
    }

    console.log('❌ 第1层精确匹配未找到结果');
    return null;
  };

  // 第2层：模糊关键词匹配 (置信度70%)
  const performFuzzyKeywordMatch = (text, toolMapping, allTools) => {
    console.log('🔍 第2层：模糊关键词匹配');

    const matches = [];

    for (const [toolId, config] of Object.entries(toolMapping)) {
      const { tool, fuzzy } = config;
      let score = 0;
      const matchedKeywords = [];

      for (const keyword of fuzzy) {
        if (text.includes(keyword)) {
          score += 10;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        matches.push({
          name: tool.name,
          id: tool.id,
          confidence: Math.min(0.7, score / 20),
          source: 'fuzzy_keyword_match',
          matchedKeywords: matchedKeywords,
          score: score,
          layer: 2
        });
        console.log(`🔍 模糊匹配: ${matchedKeywords.join(', ')} → ${tool.name} (分数: ${score})`);
      }
    }

    if (matches.length > 0) {
      // 返回分数最高的匹配
      const bestMatch = matches.sort((a, b) => b.score - a.score)[0];
      console.log(`✅ 第2层最佳匹配: ${bestMatch.name}`);
      return bestMatch;
    }

    console.log('❌ 第2层模糊匹配未找到结果');
    return null;
  };

  // 第3层：功能描述匹配 (置信度50%)
  const performFunctionMatch = (text, toolMapping, allTools) => {
    console.log('⚡ 第3层：功能描述匹配');

    const matches = [];

    for (const [toolId, config] of Object.entries(toolMapping)) {
      const { tool, functions } = config;
      let score = 0;
      const matchedFunctions = [];

      for (const func of functions) {
        if (text.includes(func)) {
          score += 5;
          matchedFunctions.push(func);
        }
      }

      if (score > 0) {
        matches.push({
          name: tool.name,
          id: tool.id,
          confidence: Math.min(0.5, score / 15),
          source: 'function_match',
          matchedFunctions: matchedFunctions,
          score: score,
          layer: 3
        });
        console.log(`⚡ 功能匹配: ${matchedFunctions.join(', ')} → ${tool.name} (分数: ${score})`);
      }
    }

    if (matches.length > 0) {
      // 返回分数最高的匹配
      const bestMatch = matches.sort((a, b) => b.score - a.score)[0];
      console.log(`✅ 第3层最佳匹配: ${bestMatch.name}`);
      return bestMatch;
    }

    console.log('❌ 第3层功能匹配未找到结果');
    return null;
  };

  // 第4层：获取默认工具 (置信度30%)
  const getDefaultTool = (allTools) => {
    console.log('🔄 第4层：默认工具降级');

    // 优先选择AI聊天工具作为默认
    const aiTool = allTools.find(tool =>
      tool.available && (
        tool.name.includes('DeepSeek') ||
        tool.name.includes('AI') ||
        tool.name.includes('聊天') ||
        tool.id.includes('chat') ||
        tool.id.includes('deepseek')
      )
    );

    if (aiTool) {
      console.log(`🔄 使用AI工具作为默认: ${aiTool.name}`);
      return {
        name: aiTool.name,
        id: aiTool.id,
        confidence: 0.3,
        source: 'default_ai_tool',
        layer: 4
      };
    }

    // 如果没有AI工具，选择第一个可用工具
    const firstAvailable = allTools.find(tool => tool.available);
    if (firstAvailable) {
      console.log(`🔄 使用第一个可用工具作为默认: ${firstAvailable.name}`);
      return {
        name: firstAvailable.name,
        id: firstAvailable.id,
        confidence: 0.2,
        source: 'first_available_tool',
        layer: 4
      };
    }

    // 最后的降级选项
    console.log('🔄 使用硬编码默认工具');
    return {
      name: 'DeepSeek聊天模型',
      confidence: 0.1,
      source: 'hardcoded_fallback',
      layer: 4
    };
  };



  // 已删除复杂的评分算法，使用简化的直接关键字匹配

  // 已删除复杂的语义匹配，使用简化的直接关键字匹配

  // 已删除复杂的结果融合，使用简化的直接关键字匹配

  // 智能模拟步骤生成（整合三层匹配）
  const generateIntelligentMockSteps = async () => {
    const input = userInput.toLowerCase();
    let steps = [];

    // 使用AI生成基础步骤结构
    const baseSteps = await generateBaseSteps(input);

    // 为每个步骤进行三层工具匹配
    for (let i = 0; i < baseSteps.length; i++) {
      const step = baseSteps[i];

      // 获取默认AI模型（始终使用DeepSeek）
      const defaultAI = getDefaultAIModel();

      // 执行三层工具匹配（用于工具类型）
      const matchedTool = await performThreeLayerToolMatching(step.description, step.title);

      steps.push({
        ...step,
        // AI模型始终使用DeepSeek
        aiModel: defaultAI.name,
        aiModelId: defaultAI.id,
        aiConfidence: defaultAI.confidence,
        aiSource: defaultAI.source,
        // 工具类型根据内容智能匹配
        tool: matchedTool.name,
        toolConfidence: matchedTool.confidence,
        toolSource: matchedTool.source,
        matchingDetails: matchedTool.details,
        status: 'generated'  // 添加状态，确保步骤可见
      });

      // 实时显示步骤
      setGeneratedSteps(prev => [...prev, steps[i]]);
      setGenerationProgress(75 + (i + 1) / baseSteps.length * 25);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    console.log('🤖 三层匹配智能步骤生成完成:', steps);
  };

  // 智能判断是否需要质量检查步骤
  const needsQualityCheck = (input) => {
    const complexityIndicators = [
      '项目管理', '流程', '系统', '平台', '架构', '设计',
      '审核', '检查', '验证', '测试', '评估', '监控',
      '多步骤', '复杂', '完整', '详细', '标准化',
      '团队', '协作', '管理', '控制', '规范'
    ];

    const highRiskIndicators = [
      '重要', '关键', '正式', '官方', '合同', '协议',
      '报告', '分析', '统计', '数据处理', '批量'
    ];

    const simpleTaskIndicators = [
      '写一份', '创建一个', '简单', '快速', '草稿',
      '个人', '临时', '测试', '试试', '看看'
    ];

    // 简单任务不需要质量检查
    if (simpleTaskIndicators.some(indicator => input.includes(indicator))) {
      return false;
    }

    // 复杂或高风险任务需要质量检查
    if (complexityIndicators.some(indicator => input.includes(indicator)) ||
        highRiskIndicators.some(indicator => input.includes(indicator))) {
      return true;
    }

    // 根据输入长度判断复杂度
    if (input.length > 50) {
      return true;
    }

    // 默认不添加质量检查（更简洁）
    return false;
  };

  // 智能步骤生成（无数量限制，根据用户需求动态生成）
  const generateBaseSteps = async (input) => {
    console.log('🎯 开始智能步骤生成，输入:', input);

    try {
      // 尝试调用后端AI生成步骤
      const aiSteps = await generateStepsFromAI(input);
      if (aiSteps && aiSteps.length > 0) {
        console.log(`✅ AI生成了 ${aiSteps.length} 个步骤`);
        return aiSteps;
      }
    } catch (error) {
      console.log('🔄 AI生成失败，使用智能解析:', error.message);
    }

    // 降级到智能文本解析生成步骤
    return await generateStepsFromTextAnalysis(input);
  };

  // 从AI后端生成步骤
  const generateStepsFromAI = async (input) => {
    const response = await fetch('/api/ai/generate-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: input,
        max_steps: 20, // 最多20个步骤，但不强制限制
        generate_detailed: true
      })
    });

    if (!response.ok) {
      throw new Error(`AI服务响应错误: ${response.status}`);
    }

    const data = await response.json();
    return data.steps || [];
  };

  // 智能文本解析生成步骤（无限制）
  const generateStepsFromTextAnalysis = async (input) => {
    console.log('🧠 使用智能文本解析生成步骤');

    const steps = [];
    let stepId = 1;

    // 分析用户输入，提取关键动作和对象
    const actions = extractActionsFromText(input);
    const objects = extractObjectsFromText(input);
    const workflow = analyzeWorkflowStructure(input);

    console.log('📝 提取的动作:', actions);
    console.log('📦 提取的对象:', objects);
    console.log('🔄 工作流结构:', workflow);

    // 根据分析结果生成步骤
    if (workflow.type === 'sequential') {
      // 顺序工作流
      steps.push(...generateSequentialSteps(actions, objects, stepId));
    } else if (workflow.type === 'parallel') {
      // 并行工作流
      steps.push(...generateParallelSteps(actions, objects, stepId));
    } else if (workflow.type === 'conditional') {
      // 条件工作流
      steps.push(...generateConditionalSteps(actions, objects, stepId));
    } else {
      // 混合工作流
      steps.push(...generateMixedSteps(actions, objects, stepId));
    }

    // 如果步骤太少，添加通用步骤
    if (steps.length < 3) {
      steps.push(...generateMinimalSteps(input, steps.length + 1));
    }

    console.log(`🎯 生成了 ${steps.length} 个步骤`);
    return steps;
  };

  // 从文本中提取动作词
  const extractActionsFromText = (input) => {
    const actionWords = [
      '创建', '生成', '制作', '编写', '设计', '开发',
      '分析', '处理', '计算', '统计', '评估', '检查',
      '收集', '整理', '组织', '管理', '存储', '备份',
      '发送', '接收', '传输', '同步', '更新', '修改',
      '转换', '导入', '导出', '合并', '拆分', '压缩',
      '优化', '改进', '调整', '配置', '设置', '安装'
    ];

    const foundActions = [];
    actionWords.forEach(action => {
      if (input.includes(action)) {
        foundActions.push(action);
      }
    });

    return foundActions.length > 0 ? foundActions : ['处理', '生成'];
  };

  // 从文本中提取对象
  const extractObjectsFromText = (input) => {
    const objectPatterns = [
      { pattern: /word|doc|docx|文档/gi, type: 'Word文档' },
      { pattern: /excel|xls|xlsx|表格|电子表格/gi, type: 'Excel表格' },
      { pattern: /powerpoint|ppt|pptx|幻灯片|演示/gi, type: 'PowerPoint演示' },
      { pattern: /pdf/gi, type: 'PDF文档' },
      { pattern: /图片|图像|照片|jpg|png|gif/gi, type: '图片文件' },
      { pattern: /视频|mp4|avi|mov/gi, type: '视频文件' },
      { pattern: /数据库|database|sql/gi, type: '数据库' },
      { pattern: /网页|html|网站/gi, type: '网页' },
      { pattern: /邮件|email|mail/gi, type: '邮件' },
      { pattern: /报告|报表|总结/gi, type: '报告' }
    ];

    const foundObjects = [];
    objectPatterns.forEach(({ pattern, type }) => {
      if (pattern.test(input)) {
        foundObjects.push(type);
      }
    });

    return foundObjects.length > 0 ? foundObjects : ['文件'];
  };

  // 🚀 智能提取并行任务（新增函数）
  const extractParallelTasks = (input, actions, objects) => {
    console.log('🔍 开始提取并行任务:', { input, actions, objects });

    const lowerInput = input.toLowerCase();
    const parallelTasks = [];

    // 🔥 方案1：从用户描述中直接提取明确的并行任务
    const explicitTasks = extractExplicitParallelTasks(lowerInput);
    if (explicitTasks.length > 0) {
      console.log('✅ 提取到明确的并行任务:', explicitTasks);
      return explicitTasks;
    }

    // 🔥 方案2：基于动作和对象组合生成并行任务
    const combinedTasks = generateCombinedParallelTasks(actions, objects);
    if (combinedTasks.length > 0) {
      console.log('✅ 生成组合并行任务:', combinedTasks);
      return combinedTasks;
    }

    // 🔥 方案3：默认的数据处理并行任务
    const defaultTasks = generateDefaultParallelTasks();
    console.log('✅ 使用默认并行任务:', defaultTasks);
    return defaultTasks;
  };

  // 提取明确的并行任务
  const extractExplicitParallelTasks = (input) => {
    const tasks = [];

    // 识别"数据分析、数据清洗、数据可视化"这种模式
    const taskPattern = /([^、，,]+)、([^、，,]+)、([^、，,]+)/g;
    const matches = [...input.matchAll(taskPattern)];

    if (matches.length > 0) {
      matches.forEach(match => {
        for (let i = 1; i < match.length; i++) {
          if (match[i] && match[i].trim()) {
            tasks.push({
              name: match[i].trim(),
              description: `执行${match[i].trim()}相关操作`,
              icon: getTaskIcon(match[i].trim())
            });
          }
        }
      });
    }

    // 识别"三个任务"、"多个分支"等数量描述
    if (tasks.length === 0) {
      const numberPattern = /([一二三四五六七八九十\d]+)个.*?(任务|分支|步骤|流程)/g;
      const numberMatches = [...input.matchAll(numberPattern)];

      if (numberMatches.length > 0) {
        const count = parseChineseNumber(numberMatches[0][1]) || 3;
        for (let i = 0; i < Math.min(count, 5); i++) {
          tasks.push({
            name: `并行任务${i + 1}`,
            description: `执行第${i + 1}个并行处理任务`,
            icon: '⚡'
          });
        }
      }
    }

    return tasks;
  };

  // 基于动作和对象组合生成并行任务
  const generateCombinedParallelTasks = (actions, objects) => {
    const tasks = [];

    // 如果有多个对象，为每个对象创建并行任务
    if (objects.length > 1) {
      objects.forEach((object, index) => {
        tasks.push({
          name: `${actions[0] || '处理'}${object}`,
          description: `并行${actions[0] || '处理'}${object}相关内容`,
          icon: getObjectIcon(object)
        });
      });
    }
    // 如果有多个动作，为每个动作创建并行任务
    else if (actions.length > 1) {
      actions.forEach((action, index) => {
        tasks.push({
          name: `${action}${objects[0] || '数据'}`,
          description: `并行执行${action}操作`,
          icon: getStepIcon(action)
        });
      });
    }

    return tasks;
  };

  // 生成默认并行任务
  const generateDefaultParallelTasks = () => {
    return [
      {
        name: '数据分析',
        description: '对数据进行统计分析和模式识别',
        icon: '📊'
      },
      {
        name: '数据清洗',
        description: '清理和标准化数据格式',
        icon: '🧹'
      },
      {
        name: '数据可视化',
        description: '创建图表和可视化展示',
        icon: '📈'
      }
    ];
  };

  // 获取任务图标
  const getTaskIcon = (taskName) => {
    const iconMap = {
      '数据分析': '📊', '分析': '📊', '统计': '📊',
      '数据清洗': '🧹', '清洗': '🧹', '整理': '🧹',
      '数据可视化': '📈', '可视化': '📈', '图表': '📈',
      '数据处理': '⚙️', '处理': '⚙️',
      '数据收集': '📥', '收集': '📥',
      '数据存储': '💾', '存储': '💾',
      '数据验证': '✅', '验证': '✅', '检查': '✅'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (taskName.includes(key)) {
        return icon;
      }
    }
    return '⚡';
  };

  // 获取对象图标
  const getObjectIcon = (objectName) => {
    const iconMap = {
      'Word文档': '📄', 'Excel表格': '📊', 'PowerPoint演示': '📽️',
      'PDF文档': '📕', '图片文件': '🖼️', '视频文件': '🎬',
      '数据库': '🗄️', '网页': '🌐', '邮件': '📧', '报告': '📋'
    };
    return iconMap[objectName] || '📁';
  };

  // 解析中文数字
  const parseChineseNumber = (str) => {
    const numberMap = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
    };
    return numberMap[str] || parseInt(str) || 3;
  };

  // 分析工作流结构（增强版）
  const analyzeWorkflowStructure = (input) => {
    const lowerInput = input.toLowerCase();

    const sequentialWords = ['首先', '然后', '接着', '最后', '第一步', '第二步', '依次', '按顺序', '逐步'];
    const parallelWords = ['同时', '并行', '一起', '同步', '并发'];
    // 更精确的条件关键词，避免误判
    const conditionalWords = ['如果不符合', '如果符合', '当满足', '根据条件', '判断是否', '选择分支', '条件分支', '分情况'];

    let sequentialScore = 0;
    let parallelScore = 0;
    let conditionalScore = 0;

    // 更精确的匹配逻辑
    sequentialWords.forEach(word => {
      if (input.includes(word)) sequentialScore++;
    });

    parallelWords.forEach(word => {
      if (input.includes(word)) parallelScore++;
    });

    conditionalWords.forEach(word => {
      if (input.includes(word)) conditionalScore++;
    });

    // 🔥 关键修复：特殊处理"并行分支"组合
    if (lowerInput.includes('并行') && lowerInput.includes('分支')) {
      parallelScore += 3; // 给并行分支更高的权重
      console.log('🔍 检测到并行分支组合，增强并行工作流得分');
    }

    // 🔥 识别具体的分支数量（如"三个分支"、"多个分支"）
    const branchNumbers = lowerInput.match(/([一二三四五六七八九十\d]+)个.*?分支/g);
    if (branchNumbers) {
      parallelScore += 2; // 明确提到分支数量，很可能是并行工作流
      console.log('🔍 检测到具体分支数量，增强并行工作流得分:', branchNumbers);
    }

    // 🔥 识别"分为...分支"的模式
    if (lowerInput.includes('分为') && lowerInput.includes('分支')) {
      parallelScore += 2;
      console.log('🔍 检测到"分为...分支"模式，增强并行工作流得分');
    }

    console.log(`📊 工作流类型得分: 顺序=${sequentialScore}, 并行=${parallelScore}, 条件=${conditionalScore}`);

    // 特殊情况：如果是问题或咨询，默认为顺序工作流
    if (input.includes('问') || input.includes('咨询') || input.includes('了解') || input.includes('如何')) {
      return { type: 'sequential', score: 10 };
    }

    // 🔥 优化的优先级判断逻辑：并行优先
    if (parallelScore >= 2) return { type: 'parallel', score: parallelScore };
    if (conditionalScore >= 2) return { type: 'conditional', score: conditionalScore };
    if (parallelScore > 0) return { type: 'parallel', score: parallelScore };
    if (sequentialScore > 0) return { type: 'sequential', score: sequentialScore };

    return { type: 'sequential', score: 0 }; // 默认为顺序工作流
  };

  // 生成顺序工作流步骤
  const generateSequentialSteps = (actions, objects, startId) => {
    const steps = [];
    let currentId = startId;

    // 为每个动作和对象组合生成步骤
    actions.forEach((action, actionIndex) => {
      objects.forEach((object, objectIndex) => {
        steps.push({
          id: currentId++,
          title: `${getStepIcon(action)} ${action}${object}`,
          description: `执行${action}操作，处理${object}相关内容`
        });
      });
    });

    // 添加整合和输出步骤
    if (objects.length > 1) {
      steps.push({
        id: currentId++,
        title: '🔗 结果整合',
        description: `整合所有${objects.join('、')}的处理结果`
      });
    }

    steps.push({
      id: currentId++,
      title: '📊 最终输出',
      description: '生成最终的工作流执行结果和报告'
    });

    return steps;
  };

  // 🚀 生成真正的并行分支工作流步骤
  const generateParallelSteps = (actions, objects, startId) => {
    const steps = [];
    let currentId = startId;

    // 🔥 智能识别并行任务数量和类型
    const parallelTasks = extractParallelTasks(userInput, actions, objects);
    console.log('🔍 识别的并行任务:', parallelTasks);

    // 准备阶段
    steps.push({
      id: currentId++,
      title: '📋 数据准备',
      description: '准备并行处理所需的数据和环境',
      nodeType: 'execution-node',
      isBranchStart: false,
      isBranchEnd: false
    });

    // 🔥 创建真正的并行分支结构
    const branchSteps = [];
    parallelTasks.forEach((task, index) => {
      branchSteps.push({
        id: currentId++,
        title: `${task.icon} ${task.name}`,
        description: task.description,
        nodeType: 'execution-node',
        isBranchStart: true,
        isBranchEnd: false,
        branchIndex: index,
        totalBranches: parallelTasks.length,
        isParallelBranch: true
      });
    });

    // 添加分支步骤到主步骤列表
    steps.push(...branchSteps);

    // 汇聚步骤
    steps.push({
      id: currentId++,
      title: '🔄 结果汇聚',
      description: `汇聚所有${parallelTasks.length}个并行分支的处理结果`,
      nodeType: 'result-node',
      isBranchStart: false,
      isBranchEnd: true,
      convergencePoint: true
    });

    // 🔥 添加分支连接信息
    steps.branchStructure = {
      type: 'parallel',
      startNodeId: steps[0].id,
      branchNodes: branchSteps.map(step => step.id),
      convergenceNodeId: steps[steps.length - 1].id,
      layout: 'vertical_flow'
    };

    console.log('🚀 生成的并行分支结构:', steps.branchStructure);
    return steps;
  };

  // 生成条件工作流步骤
  const generateConditionalSteps = (actions, objects, startId) => {
    const steps = [];
    let currentId = startId;

    // 条件判断步骤
    steps.push({
      id: currentId++,
      title: '🔍 条件检查',
      description: '检查处理条件和环境状态，确定执行路径'
    });

    // 为不同条件分支生成步骤
    objects.forEach((object, index) => {
      steps.push({
        id: currentId++,
        title: `🔀 ${object}处理分支`,
        description: `根据检查结果决定如何处理${object}`
      });

      actions.forEach(action => {
        steps.push({
          id: currentId++,
          title: `${getStepIcon(action)} ${action}${object}`,
          description: `当满足条件时，对${object}执行${action}操作`
        });
      });
    });

    // 条件汇总
    steps.push({
      id: currentId++,
      title: '🎯 结果汇总',
      description: '汇总所有分支的处理结果，生成最终输出'
    });

    return steps;
  };

  // 生成混合工作流步骤
  const generateMixedSteps = (actions, objects, startId) => {
    const steps = [];
    let currentId = startId;

    // 分析和准备
    steps.push({
      id: currentId++,
      title: '📋 需求分析',
      description: '分析工作流需求和处理目标'
    });

    // 为每个动作生成详细步骤
    actions.forEach(action => {
      steps.push({
        id: currentId++,
        title: `${getStepIcon(action)} ${action}准备`,
        description: `准备执行${action}操作所需的资源`
      });

      objects.forEach(object => {
        steps.push({
          id: currentId++,
          title: `${getStepIcon(action)} ${action}${object}`,
          description: `对${object}执行${action}操作`
        });
      });
    });

    // 质量检查和输出
    steps.push({
      id: currentId++,
      title: '✅ 质量检查',
      description: '检查所有处理结果的质量和完整性'
    });

    steps.push({
      id: currentId++,
      title: '📊 结果输出',
      description: '输出最终的工作流执行结果'
    });

    return steps;
  };

  // 生成最小步骤集
  const generateMinimalSteps = (input, startId) => {
    return [
      {
        id: startId,
        title: '📋 需求分析',
        description: `分析用户需求：${input.substring(0, 100)}`
      },
      {
        id: startId + 1,
        title: '⚡ 任务执行',
        description: '执行核心任务和处理流程'
      },
      {
        id: startId + 2,
        title: '📊 结果输出',
        description: '生成和输出最终结果'
      }
    ];
  };

  // 获取步骤图标
  const getStepIcon = (action) => {
    const iconMap = {
      '创建': '🆕', '生成': '⚡', '制作': '🔨', '编写': '✍️', '设计': '🎨', '开发': '💻',
      '分析': '🔍', '处理': '⚙️', '计算': '🧮', '统计': '📊', '评估': '📈', '检查': '✅',
      '收集': '📥', '整理': '📋', '组织': '🗂️', '管理': '👥', '存储': '💾', '备份': '🔄',
      '发送': '📤', '接收': '📨', '传输': '🔗', '同步': '🔄', '更新': '🔄', '修改': '✏️',
      '转换': '🔄', '导入': '📥', '导出': '📤', '合并': '🔗', '拆分': '✂️', '压缩': '🗜️',
      '优化': '⚡', '改进': '📈', '调整': '⚙️', '配置': '🔧', '设置': '⚙️', '安装': '📦'
    };

    return iconMap[action] || '⚡';
  };

  // 主要输入界面
  const renderWorkflowInput = () => (
    <div className="workflow-input-main">
      <div className="input-header">
        <h3>🚀 用自然语言描述您的工作流</h3>
        <p>详细描述您想要创建的工作流程，AI将为您生成完整的步骤</p>
      </div>

      <div className="examples-section">
        <h4>💡 示例参考</h4>
        <div className="examples-list">
          {workflowExamples.map((example, index) => (
            <div
              key={index}
              className="example-item"
              onClick={() => setUserInput(example)}
            >
              <span className="example-icon">💡</span>
              <span className="example-text">{example}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="input-form">
        <div className="form-group">
          <label>详细描述</label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="请用自然语言详细描述您的工作流程，例如：&#10;&#10;创建一个完整的项目管理工作流：&#10;1. 项目立项和需求分析&#10;2. 团队组建和资源分配&#10;3. 项目计划制定和时间安排&#10;4. 任务分解和里程碑设置&#10;5. 进度跟踪和风险管理&#10;6. 项目交付和总结评估&#10;&#10;描述越详细，AI生成的工作流越准确！"
            className="workflow-description-input"
            rows="10"
          />
        </div>

        <div className="form-group">
          <label>上传相关文件（可选）</label>
          <div className="file-upload-area">
            <div className="upload-buttons">
              <label className="upload-btn">
                📁 上传文件
                <input
                  type="file"
                  multiple
                  accept={getAllSupportedExtensions()}
                  onChange={handleFileUpload}
                />
              </label>
              <label className="upload-btn">
                📹 上传视频
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <button onClick={() => removeFile(file.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="generate-actions">
        <button
          className="generate-steps-btn"
          onClick={generateSteps}
          disabled={!userInput.trim() || isGenerating}
        >
          {isGenerating ? '🔄 AI正在生成...' : '⚡ 生成步骤'}
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="ai-workflow-modal-overlay" onClick={onClose}>
      <div className="ai-workflow-modal-three-column" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚀 AI工作流构建器</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content-two-column">
          {/* 左侧：输入区域 */}
          <div className="input-panel">
            {renderWorkflowInput()}
          </div>

          {/* 右侧：生成步骤区域 */}
          <div className="generation-panel">
            <div className="generation-header">
              <h3>🔄 AI生成过程</h3>
              <p>实时查看AI分析和生成步骤，支持编辑每个步骤的描述和工具选择</p>
            </div>

            {!isGenerating && generatedSteps.length === 0 && (
              <div className="generation-waiting">
                <div className="waiting-icon">⏳</div>
                <h4>等待开始生成</h4>
                <p>填写左侧信息后点击生成按钮</p>
                <div className="generation-steps-preview">
                  <div className="step-preview">
                    <span className="step-icon">🔍</span>
                    <span>1. 分析需求</span>
                  </div>
                  <div className="step-preview">
                    <span className="step-icon">🧠</span>
                    <span>2. AI思考</span>
                  </div>
                  <div className="step-preview">
                    <span className="step-icon">⚡</span>
                    <span>3. 生成步骤</span>
                  </div>
                  <div className="step-preview">
                    <span className="step-icon">✨</span>
                    <span>4. 工具匹配</span>
                  </div>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="generation-process">
                <div className="process-step active">
                  <div className="step-icon">🔍</div>
                  <div className="step-content">
                    <h4>正在分析需求</h4>
                    <p>AI正在理解您的工作流描述...</p>
                  </div>
                </div>

                <div className={`process-step ${generationProgress > 25 ? 'active' : ''}`}>
                  <div className="step-icon">🧠</div>
                  <div className="step-content">
                    <h4>AI深度思考</h4>
                    <p>分析最佳工作流结构...</p>
                  </div>
                </div>

                <div className={`process-step ${generationProgress > 50 ? 'active' : ''}`}>
                  <div className="step-icon">⚡</div>
                  <div className="step-content">
                    <h4>生成工作流步骤</h4>
                    <p>创建详细的执行步骤...</p>
                  </div>
                </div>

                <div className={`process-step ${generationProgress > 75 ? 'active' : ''}`}>
                  <div className="step-icon">🔧</div>
                  <div className="step-content">
                    <h4>智能工具匹配</h4>
                    <p>为每个步骤推荐最佳工具...</p>
                  </div>
                </div>

                <div className="overall-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">{generationProgress}% 完成</div>
                </div>
              </div>
            )}

            {/* 🎯 增强的步骤编辑器 - 替换原有的步骤展示 */}
            <div className="enhanced-steps-container">
              <EnhancedStepEditor
                  steps={generatedSteps}
                onStepsChange={(updatedSteps) => {
                  console.log('🔄 步骤已更新:', updatedSteps);
                  setGeneratedSteps(updatedSteps);
                }}
                  isGenerating={isGenerating}
                showEditControls={true}
              />

              {generatedSteps.length > 0 && !isGenerating && (
                <div className="generation-actions">
                  <button
                    className="regenerate-btn"
                    onClick={() => {
                      setGeneratedSteps([]);
                      setIsGenerating(false);
                      setGenerationProgress(0);
                    }}
                  >
                    🔄 重新生成
                  </button>
                  <button
                    className="create-workflow-btn-inline"
                    onClick={() => {
                      const workflowData = {
                        userInput,
                        uploadedFiles,
                        steps: generatedSteps
                      };
                      onWorkflowGenerated(workflowData);
                      onClose(); // 自动关闭页面
                    }}
                  >
                    🚀 生成工作流
                  </button>
              </div>
            )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIWorkflowModal;
