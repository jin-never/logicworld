import React, { useState, useEffect } from 'react';
import './WordOperationConfig.css';

const WordOperationConfig = ({
  nodeData,
  onDataChange,
  onOpenStatusTracking,
  openToolLibraryForField,
  activeInputField,
  availableTools,
  showToolSelector,
  onToolSelect,
  showToolTypeSelector
}) => {
  const [localData, setLocalData] = useState(nodeData);

  useEffect(() => {
    setLocalData(nodeData);
  }, [nodeData]);

  const handleLocalChange = (field, value) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onDataChange(field, value);
  };

  const handleWordActionChange = (e) => {
    const action = e.target.value;
    handleLocalChange('wordAction', action);
    
    // 根据操作类型设置默认值
    if (action === 'add_paragraph') {
      if (!localData.inputContents || localData.inputContents.length === 0) {
        handleLocalChange('inputContents', ['']);
      }
      if (!localData.matchContents || localData.matchContents.length === 0) {
        handleLocalChange('matchContents', ['']);
      }
    }
  };

  const handleScenarioChange = (e) => {
    const scenario = e.target.value;
    handleLocalChange('scenario', scenario);
    
    // 根据场景自动设置工具类型
    if (scenario === 'Word文档处理') {
      handleLocalChange('toolType', 'Office-Word-MCP-Server');
    }
  };

  const addMatchContent = () => {
    const newContents = [...(localData.matchContents || ['']), ''];
    handleLocalChange('matchContents', newContents);
  };

  const removeMatchContent = (index) => {
    const newContents = (localData.matchContents || []).filter((_, i) => i !== index);
    handleLocalChange('matchContents', newContents.length > 0 ? newContents : ['']);
  };

  const updateMatchContent = (index, value) => {
    const newContents = [...(localData.matchContents || [''])];
    newContents[index] = value;
    handleLocalChange('matchContents', newContents);
  };

  const addInputContent = () => {
    const newContents = [...(localData.inputContents || ['']), ''];
    handleLocalChange('inputContents', newContents);
  };

  const removeInputContent = (index) => {
    const newContents = (localData.inputContents || []).filter((_, i) => i !== index);
    handleLocalChange('inputContents', newContents.length > 0 ? newContents : ['']);
  };

  const updateInputContent = (index, value) => {
    const newContents = [...(localData.inputContents || [''])];
    newContents[index] = value;
    handleLocalChange('inputContents', newContents);
  };

  // 判断是否为简单的文档管理操作
  const isSimpleDocumentOperation = (action) => {
    const simpleOperations = [
      // 基础文档管理
      'create_document',
      'open_document', 
      'save_document',
      'save_document_as',
      'close_document',
      'copy_document',
      'list_documents',
      // 简单插入操作
      'insert_header_near_text',
      'insert_line_or_paragraph_near_text',
      // 简单查找操作
      'find_and_replace',
      'search_and_replace',
      // 文档保护操作
      'protect_document',
      'unprotect_document'
    ];
    return simpleOperations.includes(action);
  };

  // 获取操作的中文显示名称
  const getOperationDisplayName = (action) => {
    const operationNames = {
      // 基础文档管理
      'create_document': '创建文档',
      'open_document': '打开文档',
      'save_document': '保存文档',
      'save_document_as': '另存为',
      'close_document': '关闭文档',
      'copy_document': '复制文档',
      'list_documents': '列出文档',
      // 简单插入操作
      'insert_header_near_text': '在文本附近插入标题',
      'insert_line_or_paragraph_near_text': '在文本附近插入段落',
      // 简单查找操作
      'find_and_replace': '查找替换',
      'search_and_replace': '高级查找替换',
      // 文档保护操作
      'protect_document': '文档保护',
      'unprotect_document': '移除文档保护'
    };
    return operationNames[action] || action;
  };

  // 渲染简单操作的输入框
  const renderSimpleOperationInput = (action) => {
    switch (action) {
      // 基础文档管理 - 需要执行要求输入
      case 'create_document':
      case 'open_document':
      case 'save_document':
      case 'close_document':
      case 'list_documents':
        return (
          <div>
            <div style={{ 
              background: '#f0f9ff', 
              border: '1px solid #bae6fd', 
              borderRadius: '8px', 
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
                ✨ {getOperationDisplayName(action)}
              </div>
              <div style={{ fontSize: '14px', color: '#0284c7' }}>
                这是一个简单的文档管理操作
              </div>
            </div>
            
            {/* 执行要求输入框 */}
            <div className="input-field">
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                📋 执行要求
              </label>
              <textarea
                placeholder="请输入执行此操作的具体要求..."
                value={localData.executionRequirements || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('executionRequirements', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        );

      // 需要文件路径的操作
      case 'save_document_as':
      case 'copy_document':
        return (
          <div>
            <div className="input-field" style={{marginBottom: '16px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '8px'}}>
                📁 文件路径
              </label>
            <input
              type="text"
              placeholder="请输入文件保存路径..."
              value={localData.filePath || ''}
              onChange={(e) => {
                e.stopPropagation();
                handleLocalChange('filePath', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="nodrag nowheel"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #c4b5fd',
                borderRadius: '4px',
                fontSize: '14px',
                background: '#faf5ff'
              }}
            />
            </div>
            
            {/* 执行要求输入框 */}
            <div className="input-field">
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                📋 执行要求
              </label>
              <textarea
                placeholder="请输入执行此操作的具体要求..."
                value={localData.executionRequirements || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('executionRequirements', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        );



      // 需要插入内容的操作
      case 'insert_header_near_text':
      case 'insert_line_or_paragraph_near_text':
        return (
          <div>
            <div className="input-field" style={{marginBottom: '12px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                🔍 参考文本
              </label>
              <textarea
                placeholder="请输入作为参考的文本内容..."
                value={localData.referenceText || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('referenceText', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '40px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
            <div className="input-field" style={{marginBottom: '16px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px'}}>
                📝 插入内容
              </label>
              <textarea
                placeholder="请输入要插入的内容..."
                value={localData.insertContent || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('insertContent', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#fef2f2',
                  resize: 'vertical'
                }}
              />
            </div>
            
            {/* 执行要求输入框 */}
            <div className="input-field">
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                📋 执行要求
              </label>
              <textarea
                placeholder="请输入执行此操作的具体要求..."
                value={localData.executionRequirements || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('executionRequirements', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        );

      // 查找替换操作
      case 'find_and_replace':
      case 'search_and_replace':
        return (
          <div>
            <div className="input-field" style={{marginBottom: '16px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                🔍 查找内容
              </label>
              <textarea
                placeholder="请输入要查找的文本内容..."
                value={localData.searchText || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('searchText', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '40px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
            <div className="input-field" style={{marginBottom: '16px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px'}}>
                🔄 替换内容
              </label>
              <textarea
                placeholder="请输入要替换成的内容..."
                value={localData.replaceText || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('replaceText', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '40px',
                  padding: '8px',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#fef2f2',
                  resize: 'vertical'
                }}
              />
            </div>
            
            {/* 执行要求输入框 */}
            <div className="input-field">
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                📋 执行要求
              </label>
              <textarea
                placeholder="请输入执行此操作的具体要求..."
                value={localData.executionRequirements || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('executionRequirements', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        );

      // 文档保护操作
      case 'protect_document':
        return (
          <div>
            <div className="input-field" style={{marginBottom: '16px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px'}}>
                🔒 保护密码
              </label>
            <input
              type="password"
              placeholder="请输入文档保护密码..."
              value={localData.protectionPassword || ''}
              onChange={(e) => {
                e.stopPropagation();
                handleLocalChange('protectionPassword', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="nodrag nowheel"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                fontSize: '14px',
                background: '#fef2f2'
              }}
            />
            </div>
            
            {/* 执行要求输入框 */}
            <div className="input-field">
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                📋 执行要求
              </label>
              <textarea
                placeholder="请输入执行此操作的具体要求..."
                value={localData.executionRequirements || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('executionRequirements', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        );

      // 移除文档保护操作 - 只显示执行要求
      case 'unprotect_document':
        return (
          <div>
            {/* 执行要求输入框 */}
            <div className="input-field">
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px'}}>
                📋 执行要求
              </label>
              <textarea
                placeholder="请输入执行此操作的具体要求..."
                value={localData.executionRequirements || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('executionRequirements', e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nowheel"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f0fdf4',
                  resize: 'vertical'
                }}
              />
            </div>
            
            {/* 隐藏的输入框 - 后端保留数据结构 */}
            <div style={{ display: 'none' }}>
              <input
                type="text"
                value={localData.documentPath || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLocalChange('documentPath', e.target.value);
                }}
              />
            </div>
          </div>
        );

      // 默认情况
      default:
        return (
          <div style={{ 
            background: '#f0f9ff', 
            border: '1px solid #bae6fd', 
            borderRadius: '8px', 
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
              ✨ {getOperationDisplayName(action)}
            </div>
            <div style={{ fontSize: '14px', color: '#0284c7' }}>
              操作已配置完成
            </div>
          </div>
        );
    }
  };

  return (
    <div className="word-operation-config">
      {/* AI选择 */}
      <div className="config-section ai-selection">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <label>AI选择</label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="请从工具库里面点击所需AI"
            value={localData.aiModel || ''}
            onClick={(e) => {
              e.stopPropagation();
              openToolLibraryForField('aiModel');
            }}
            readOnly
            style={{
              background: activeInputField === 'aiModel' ? '#e3f2fd' : '#f9fafb',
              cursor: 'pointer',
              border: activeInputField === 'aiModel' ? '2px solid #2196f3' : '1px solid #ddd',
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            className="nodrag nowheel"
          />

        </div>
      </div>

      {/* 使用场景 */}
      <div className="config-section">
        <label>使用场景</label>
        <select 
          value={localData.scenario || ''}
          onChange={handleScenarioChange}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">选择使用场景</option>
          <option value="Word文档处理">📄 Word文档处理</option>
          <option value="Excel数据处理">📊 Excel数据处理</option>
          <option value="PPT演示制作">📽️ PPT演示制作</option>
          <option value="文件操作">📁 文件操作</option>
          <option value="自定义">⚙️ 自定义</option>
        </select>
      </div>

      {/* 自定义场景的节点名称编辑 */}
      {localData.scenario === '自定义' && (
        <div className="config-section">
          <label>节点名称</label>
          <input
            type="text"
            placeholder="请输入节点名称"
            value={localData.label || ''}
            onChange={(e) => {
              e.stopPropagation();
              handleLocalChange('label', e.target.value);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {/* 工具类型 - 仅在自定义场景显示 */}
      {(showToolTypeSelector && localData.scenario === '自定义') && (
        <div className="config-section">
          <label>🛠️ 工具类型</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="请从工具库里面点击所需工具"
              value={localData.toolType || ''}
              onClick={(e) => {
                e.stopPropagation();
                openToolLibraryForField('toolType');
              }}
              readOnly
              style={{
                background: activeInputField === 'toolType' ? '#e3f2fd' : '#f9fafb',
                cursor: 'pointer',
                width: '100%',
                padding: '8px 12px',
                border: activeInputField === 'toolType' ? '2px solid #2196f3' : '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            {showToolSelector && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                {availableTools.length > 0 ? (
                  availableTools.map(tool => (
                    <div
                      key={tool.id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToolSelect(tool);
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'white';
                      }}
                    >
                      <span>{tool.icon || '🛠️'}</span>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{tool.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{tool.description}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    暂无可用工具
                  </div>
                )}
              </div>
            )}
          </div>
          {localData.selectedTool && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: '500', color: '#0369a1' }}>已选择工具:</div>
              <div style={{ color: '#0284c7' }}>{localData.selectedTool.name}</div>
              <div style={{ color: '#0891b2', marginTop: '2px' }}>{localData.selectedTool.description}</div>
            </div>
          )}
        </div>
      )}

      {/* Word MCP 操作选择 */}
      {localData.toolType === 'Office-Word-MCP-Server' && (
        <div className="config-section">
          <label>📝 Word操作</label>
          <select 
            value={localData.wordAction || ''} 
            onChange={handleWordActionChange}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              fontSize: '14px'
            }}
          >
            <option value="">选择Word操作</option>
            
            <optgroup label="📁 文档管理">
              <option value="create_document">创建文档</option>
              <option value="open_document">打开文档</option>
              <option value="save_document">保存文档</option>
              <option value="save_document_as">另存为</option>
              <option value="close_document">关闭文档</option>
              <option value="copy_document">复制文档</option>
              <option value="list_documents">列出文档</option>
            </optgroup>
            
            <optgroup label="📝 内容创作">
              <option value="add_heading">添加标题</option>
              <option value="add_paragraph">添加正文段落</option>
              <option value="add_table">添加表格</option>
              <option value="add_picture">插入图片</option>
              <option value="add_page_break">添加分页符</option>
            </optgroup>
            
            <optgroup label="🎨 字体格式">
              <option value="format_text">格式化文本</option>
              <option value="set_font_name">设置字体名称</option>
              <option value="set_font_size">设置字体大小</option>
              <option value="set_font_color">设置字体颜色</option>
              <option value="set_text_bold">设置加粗</option>
              <option value="set_text_italic">设置斜体</option>
              <option value="set_text_underline">设置下划线</option>
              <option value="create_custom_style">创建自定义样式</option>
            </optgroup>
            
            <optgroup label="📝 段落格式">
              <option value="set_paragraph_alignment">设置段落对齐</option>
              <option value="set_line_spacing">设置行间距</option>
              <option value="set_paragraph_spacing">设置段落间距</option>
              <option value="set_paragraph_indent">设置段落缩进</option>
            </optgroup>
            
            <optgroup label="🔍 查找替换">
              <option value="find_and_replace">查找替换</option>
              <option value="search_and_replace">高级查找替换</option>
            </optgroup>
            
            <optgroup label="📑 高级内容">
              <option value="delete_paragraph">删除段落</option>
              <option value="insert_header_near_text">在文本附近插入标题</option>
              <option value="insert_line_or_paragraph_near_text">在文本附近插入段落</option>
              <option value="add_footnote_to_document">添加脚注</option>
              <option value="add_endnote_to_document">添加尾注</option>
              <option value="customize_footnote_style">自定义脚注样式</option>
            </optgroup>
            
            <optgroup label="🗂️ 表格格式">
              <option value="format_table">格式化表格</option>
            </optgroup>
            
            <optgroup label="⚙️ 文档设置">
              <option value="set_page_margins">设置页边距</option>
              <option value="set_page_orientation">设置页面方向</option>
              <option value="set_page_size">设置页面大小</option>
              <option value="add_header_footer">页眉页脚</option>
              <option value="set_column_layout">设置分栏布局</option>
              <option value="get_page_info">获取页面信息</option>
            </optgroup>
            
            <optgroup label="🔒 文档保护">
              <option value="protect_document">文档保护</option>
              <option value="unprotect_document">移除文档保护</option>
            </optgroup>
            
            <optgroup label="⚡ 组合功能">
              <option value="create_document_with_content">创建文档并写入内容</option>
            </optgroup>
          </select>
          
          {localData.wordAction && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: '500', color: '#0369a1' }}>已选择操作:</div>
              <div style={{ color: '#0284c7' }}>{localData.wordAction}</div>
            </div>
          )}
        </div>
      )}

      {/* 输入配置 - 仅对需要详细配置的操作显示 */}
      {localData.wordAction && !isSimpleDocumentOperation(localData.wordAction) && (
        <div className="config-section input-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <label>输入配置</label>
          </div>
          
          {/* 要改的内容区域 */}
          <div className="match-content-section" style={{marginBottom: '16px'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#f59e0b'}}>要改的内容</label>
            </div>
            
            {/* 要改内容列表 */}
            {(localData.matchContents || ['']).map((content, index) => (
              <div key={index} style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px'
              }}>
                <textarea
                  placeholder="请输入要在文件中查找匹配的内容..."
                  value={content}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateMatchContent(index, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="nodrag nowheel"
                  style={{
                    minHeight: '40px',
                    resize: 'vertical',
                    width: '100%',
                    background: '#fffbeb',
                    border: '1px solid #fbbf24',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    padding: '8px',
                    fontSize: '14px'
                  }}
                />

              </div>
            ))}
            

          </div>

          {/* 执行内容区域 */}
          <div className="execution-content-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: '#10b981'}}>执行要求</label>
            </div>
            
            {/* 执行内容列表 */}
            {(localData.inputContents || ['']).map((content, index) => (
              <div key={index} style={{
                background: '#f0fdf4',
                border: '1px solid #10b981',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px'
              }}>
                <textarea
                  placeholder="请输入执行内容..."
                  value={content}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateInputContent(index, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="nodrag nowheel"
                  style={{
                    minHeight: '40px',
                    resize: 'vertical',
                    width: '100%',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    padding: '8px',
                    fontSize: '14px'
                  }}
                />

              </div>
            ))}
            

          </div>
        </div>
      )}

      {/* 简单操作输入 - 对简单操作提供必要的输入框 */}
      {localData.wordAction && isSimpleDocumentOperation(localData.wordAction) && (
        <div className="config-section simple-operation-input">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <label>📝 执行要求</label>
          </div>
          
          {/* 根据操作类型显示不同的输入框 */}
          {renderSimpleOperationInput(localData.wordAction)}
        </div>
      )}
    </div>
  );
};

export default WordOperationConfig; 