import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './DocumentPreviewDialog.css';
import { safeExecute } from '../utils/errorSuppressor';
import { saveDocumentDialogState, getDocumentDialogState } from '../utils/statePersistence';

const DocumentPreviewDialog = ({ 
  isOpen, 
  onClose, 
  filename, 
  onAction,
  position = 'center', // 新增位置参数
  // 精确操作上下文
  currentNode = null,
  currentOperationId = null,
  currentOperationIndex = null,
  currentOperationType = null,
  currentOperationContent = null, // 新增：当前操作的具体内容
  onTextSelection = null,
  nodes = [] // 新增：所有节点数据
}) => {
  // 从存储中恢复对话框状态
  const storedDialogState = getDocumentDialogState();
  
  const [documentContent, setDocumentContent] = useState(storedDialogState.documentContent || null);
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [actionType, setActionType] = useState('set_font_name');
  const [actionValue, setActionValue] = useState('');
  
  // 新增：文档选择器状态
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState(storedDialogState.availableDocuments || []);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(storedDialogState.selectedDocument || null);
  
  // 新增：材料节点文件夹小窗口状态 - 页面刷新时保持打开状态
  const [showMaterialWindow, setShowMaterialWindow] = useState(storedDialogState.showMaterialWindow || false);
  
  // 新增：Word风格显示模式状态
  const [wordViewMode, setWordViewMode] = useState(storedDialogState.wordViewMode || false);
  const [zoomLevel, setZoomLevel] = useState(storedDialogState.zoomLevel || 100);
  
  // 新增：编辑模式状态
  const [isEditMode, setIsEditMode] = useState(storedDialogState.isEditMode || false);
  const [editableContent, setEditableContent] = useState(storedDialogState.editableContent || '');

  // 保存对话框状态
  useEffect(() => {
    const dialogState = {
      documentContent,
      availableDocuments,
      selectedDocument,
      showMaterialWindow,
      wordViewMode,
      zoomLevel,
      isEditMode,
      editableContent
    };
    saveDocumentDialogState(dialogState);
  }, [documentContent, availableDocuments, selectedDocument, showMaterialWindow, wordViewMode, zoomLevel, isEditMode, editableContent]);

  // 当设置了操作上下文且有文档内容时，自动切换到文档显示模式
  useEffect(() => {
    if (currentOperationId && documentContent && showMaterialWindow) {
      console.log('🔄 检测到操作上下文和文档内容，自动切换到文档显示模式');
      setShowMaterialWindow(false);
    }
  }, [currentOperationId, documentContent, showMaterialWindow]);

  // 动态生成预览标题的函数
  const generatePreviewTitle = useCallback(() => {
    let title = '文档预览';
    
    // 1. 检查是否选择了节点
    if (!currentNode) {
      title += ' - 未选择节点';
      return title;
    }
    
    // 2. 显示节点名称 - 从节点的实际标签中获取
    let nodeName = '未知节点';
    if (currentNode.data?.label) {
      nodeName = currentNode.data.label;
    } else if (currentNode.label) {
      nodeName = currentNode.label;
    } else if (currentNode.data?.type) {
      // 根据节点类型设置默认名称
      const nodeTypeMap = {
        'material-node': '材料节点',
        'execution-node': '执行节点', 
        'condition-node': '条件节点',
        'result-node': '结果节点'
      };
      nodeName = nodeTypeMap[currentNode.data.type] || '执行节点';
    }
    
    title += ` - ${nodeName}`;
    
    // 3. 检查是否有精确选择框
    if (currentOperationType && currentOperationIndex) {
      // 获取操作类型名称（可以根据operationType映射为更友好的名称）
      const operationTypeMap = {
        'set_font_name': '设置字体名称',
        'set_font_color': '设置字体颜色',
        'set_font_size': '设置字体大小',
        'set_text_bold': '设置加粗',
        'set_text_italic': '设置斜体',
        'set_text_underline': '设置下划线',
        'insert_text': '插入文本',
        'delete_text': '删除文本',
        'replace_text': '替换文本',
        'format_text': '格式化文本',
        'add_heading': '添加标题',
        'add_paragraph': '添加段落',
        'add_table': '添加表格',
        'create_document': '创建文档',
        'open_document': '打开文档',
        'save_document': '保存文档'
      };
      
      const operationName = operationTypeMap[currentOperationType] || '文档操作';
      title += ` - ${operationName} #${currentOperationIndex}`;
    }
    
    return title;
  }, [currentNode, currentOperationType, currentOperationIndex]);

  // 为材料节点文件夹小窗口生成简洁标题的函数
  const generateMaterialWindowTitle = useCallback(() => {
    return '📁 材料节点文件';
  }, []);

  // 获取文档内容
  const fetchDocumentContent = async (docFilename) => {
    if (!docFilename) return;
    
    setLoading(true);
    try {
      console.log('🌐 正在获取文档内容:', docFilename);
      const response = await fetch(`/api/document/preview/${encodeURIComponent(docFilename)}`);
      console.log('🌐 API响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📄 获取到的文档数据:', data);
        console.log('📄 段落数量:', data.total_paragraphs);
        console.log('📄 内容长度:', data.content?.length);
        setDocumentContent(data);
        setSelectedDocument(docFilename);
      } else {
        const errorText = await response.text();
        console.error('❌ API请求失败:', response.status, errorText);
        setDocumentContent(null);
      }
    } catch (error) {
      console.error('❌ 获取文档内容出错:', error);
      setDocumentContent(null);
    } finally {
      setLoading(false);
    }
  };

  // 获取材料节点文档列表
  const fetchMaterialDocuments = async () => {
    setLoadingDocuments(true);
    try {
      // 从nodes中查找材料节点
      console.log('所有节点:', nodes.map(n => ({ id: n.id, type: n.type, label: n.data?.label, nodeType: n.data?.nodeType })));
      
      const materialNodes = nodes.filter(node => 
        node.type === 'material-node' || 
        node.data?.nodeType === 'material-node' ||
        node.data?.nodeType === 'customNode' || // 兼容旧版本
        node.data?.label?.includes('材料')
      );
      
      console.log('找到的材料节点:', materialNodes);
      
      // 收集所有材料节点中的文件
      let allDocuments = [];
      
      materialNodes.forEach((materialNode, nodeIndex) => {
        if (materialNode.data?.selectedFiles && materialNode.data.selectedFiles.length > 0) {
          console.log(`材料节点 ${nodeIndex + 1}:`, materialNode);
          console.log(`材料节点 ${nodeIndex + 1} 文件:`, materialNode.data.selectedFiles);
          
          // 转换文件格式为文档列表格式
          const nodeDocuments = materialNode.data.selectedFiles
            .filter(file => {
              console.log('检查文件:', { name: file.name, type: file.type, fullPath: file.fullPath });
              
              // 从fullPath或name中提取文件名
              const fileName = file.name || (file.fullPath ? file.fullPath.split('\\').pop() : '');
              console.log('提取的文件名:', fileName);
              
              // 支持所有类型的文件，不仅仅是Word文档
              return fileName && (
                fileName.endsWith('.docx') || 
                fileName.endsWith('.doc') ||
                fileName.endsWith('.pdf') ||
                fileName.endsWith('.txt') ||
                fileName.endsWith('.md') ||
                fileName.endsWith('.html') ||
                fileName.endsWith('.xlsx') ||
                fileName.endsWith('.pptx') ||
                file.type?.includes('word') ||
                file.type?.includes('officedocument') ||
                file.type?.includes('pdf') ||
                file.type?.includes('text') ||
                file.isScannedFile // 扫描到的文件
              );
            })
            .map(file => {
              // 从fullPath或name中提取文件名
              const fileName = file.name || (file.fullPath ? file.fullPath.split('\\').pop() : '');
              
              console.log('🔍 处理材料节点文件:', {
                name: file.name,
                fileName: fileName,
                fullPath: file.fullPath,
                size: file.size,
                type: file.type,
                hasFileObject: !!file.file,
                fileObjectSize: file.file?.size,
                fileObjectType: file.file?.type
              });
              
              return {
                filename: fileName,
                displayName: fileName, // 保留完整文件名包括后缀
                size: file.size || file.originalSize || 0,
                modified: file.lastModified || Date.now(),
                path: file.fullPath || fileName,
                source: `material-node-${nodeIndex + 1}`,
                nodeId: materialNode.id,
                nodeLabel: materialNode.data?.label || `材料节点${nodeIndex + 1}`,
                file: file.file || file // 保留原始文件对象，优先使用file.file
              };
            });
          
          allDocuments = allDocuments.concat(nodeDocuments);
        }
      });
      
      // 按修改时间排序，最新的在前面
      allDocuments.sort((a, b) => (b.modified || 0) - (a.modified || 0));
      
      console.log('收集到的所有文档:', allDocuments);
      setAvailableDocuments(allDocuments);
      return allDocuments;
      
    } catch (error) {
      console.error('Error fetching material documents:', error);
      
      // 降级：尝试后端API
      try {
        const response = await fetch('/api/material-node/documents');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAvailableDocuments(data.documents);
            return data.documents;
          }
        }
      } catch (apiError) {
        console.warn('后端API也失败了:', apiError);
      }
      
      setAvailableDocuments([]);
      return [];
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    if (isOpen && filename) {
      fetchDocumentContent(filename);
    }
  }, [isOpen, filename]);

  // 处理更换文档
  const handleChangeDocument = async (event) => {
    console.log('点击更换文档按钮');
    
    // 无论是否已有文档，都显示材料节点文件夹小窗口
    await handleOpenMaterialWindow(event);
  };

  // 新增：处理打开材料节点文件夹小窗口
  const handleOpenMaterialWindow = async (event) => {
    console.log('打开材料节点文件夹小窗口');
    
    // 加载材料节点文档
    setLoadingDocuments(true);
    await fetchMaterialDocuments();
    setShowMaterialWindow(true);
  };

  // 新增：刷新材料节点文件
  const handleRefreshMaterialFiles = async () => {
    console.log('刷新材料节点文件');
    setLoadingDocuments(true);
    await fetchMaterialDocuments();
  };

  // 获取文件图标
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'docx':
      case 'doc':
        return '📄';
      case 'pdf':
        return '📕';
      case 'xlsx':
      case 'xls':
        return '📊';
      case 'pptx':
      case 'ppt':
        return '📈';
      case 'txt':
      case 'md':
        return '📝';
      case 'html':
        return '🌐';
      default:
        return '📄';
    }
  };



  // 处理文件夹选择
  const handleSelectFolder = async () => {
    try {
      // 首先尝试使用指定的路径 C:\Users\ZhuanZ\Desktop\AI HTML
      const specifiedPath = "C:\\Users\\ZhuanZ\\Desktop\\AI HTML";
      
      // 先尝试通过后端API检查指定路径
      console.log('尝试使用指定路径:', specifiedPath);
      const documents = await fetchMaterialDocuments();
      
      if (documents.length > 0) {
        console.log('在指定路径中找到文档:', documents.length);
        setAvailableDocuments(documents);
        // 自动选择第一个文档
        await fetchDocumentContent(documents[0].filename);
        return;
      }
      
      // 如果指定路径没有文档，则提示用户并尝试文件夹选择器
      // eslint-disable-next-line no-restricted-globals
      const useFileSelector = confirm(
        `指定路径 "${specifiedPath}" 中没有找到Word文档。\n\n` +
        `你可以选择：\n` +
        `- 确定：使用浏览器文件夹选择器\n` +
        `- 取消：关闭此对话框\n\n` +
        `建议：将Word文档放在 "${specifiedPath}" 文件夹中，然后重新点击此按钮。`
      );
      
      if (!useFileSelector) {
        return;
      }
      
      // 使用现代文件夹选择API
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await window.showDirectoryPicker();
        
        // 获取文件夹路径（注意：浏览器API限制，我们只能获取文件夹名称）
        const folderName = directoryHandle.name;
        console.log('选择的文件夹:', folderName);
        
        // 扫描文件夹中的Word文档
        const documents = [];
        for await (const [name, handle] of directoryHandle.entries()) {
          if (handle.kind === 'file' && name.endsWith('.docx') && !name.startsWith('~$')) {
            const file = await handle.getFile();
            documents.push({
              filename: file.name,
              displayName: file.name.replace('.docx', ''),
              size: file.size,
              modified: file.lastModified / 1000, // 转换为秒
              fileHandle: handle, // 保存文件句柄用于后续读取
              file: file
            });
          }
        }
        
        // 按修改时间排序
        documents.sort((a, b) => b.modified - a.modified);
        
        if (documents.length > 0) {
          setAvailableDocuments(documents);
          // 自动选择第一个文档
          await loadDocumentFromFile(documents[0]);
        } else {
          // eslint-disable-next-line no-restricted-globals
          alert(`文件夹 "${folderName}" 中没有找到Word文档（.docx文件）`);
        }
        
      } else {
        // 降级方案：提示用户手动上传文件
        // eslint-disable-next-line no-restricted-globals
        alert(
          '您的浏览器不支持文件夹选择功能。\n' +
          '请使用Chrome、Edge或Firefox的最新版本。\n\n' +
          `建议操作：\n` +
          `1. 将Word文档放在：${specifiedPath}\n` +
          `2. 重新点击"打开材料节点文件夹"按钮\n` +
          `3. 或者将Word文档拖拽到材料节点中`
        );
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('选择文件夹失败:', error);
        // eslint-disable-next-line no-restricted-globals
        alert('选择文件夹失败，请重试。');
      }
    }
  };

  // 从文件加载文档内容
  const loadDocumentFromFile = async (document) => {
    setLoading(true);
    try {
      // 检查是否有文件路径信息，优先使用路径解析
      if (document.path || (document.file && document.file.fullPath)) {
        const filePath = document.path || document.file.fullPath;
        console.log('📁 使用文件路径解析:', filePath);
        
        const response = await fetch(`/api/document/parse-path?file_path=${encodeURIComponent(filePath)}`);
        console.log('📤 路径解析响应状态:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ 路径解析成功:', data);
          console.log('✅ 解析后段落数:', data.total_paragraphs);
          setDocumentContent(data);
          setSelectedDocument(document.filename);
          return;
        } else {
          const errorText = await response.text();
          console.error('❌ 路径解析失败:', response.status, errorText);
          // 如果路径解析失败，继续尝试文件上传解析
        }
      }
      
      // 备用方案：使用文件上传解析
      if (document.file) {
        console.log('📁 开始解析本地文件:', document.file.name);
        console.log('📁 文件大小:', document.file.size, 'bytes');
        console.log('📁 文件类型:', document.file.type);
        
        // 使用File API读取文档内容
        const arrayBuffer = await document.file.arrayBuffer();
        console.log('📁 文件内容读取完成，大小:', arrayBuffer.byteLength);
        
        // 将文档内容发送到后端解析
        const formData = new FormData();
        formData.append('file', document.file);
        
        console.log('📤 发送文件到后端解析...');
        const response = await fetch('/api/document/parse-upload', {
          method: 'POST',
          body: formData
        });
        
        console.log('📤 后端解析响应状态:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ 文档解析成功:', data);
          console.log('✅ 解析后段落数:', data.total_paragraphs);
          console.log('✅ 解析后内容:', data.content);
          setDocumentContent(data);
          setSelectedDocument(document.filename);
        } else {
          const errorText = await response.text();
          console.error('❌ 后端解析失败:', response.status, errorText);
          // 降级：显示基本信息
          setDocumentContent({
            filename: document.filename,
            content: [],
            total_paragraphs: 0,
            message: '文档解析功能开发中...'
          });
          setSelectedDocument(document.filename);
        }
      }
    } catch (error) {
      console.error('加载文档内容失败:', error);
      setDocumentContent({
        filename: document.filename,
        content: [],
        total_paragraphs: 0,
        error: '加载失败'
      });
      setSelectedDocument(document.filename);
    } finally {
      setLoading(false);
    }
  };

  // 选择文档 - 修改为在小弹窗中显示文档内容
  const handleSelectDocument = async (document) => {
    console.log('🔍 选择文档:', document);
    console.log('🔍 文档是否有file对象:', !!document.file);
    
    // 不关闭材料窗口，而是在同一个窗口中显示文档内容
    // setShowMaterialWindow(false); // 注释掉这行
    setLoading(true);
    setDocumentContent(null); // 清空之前的内容
    
    try {
      if (document.file) {
        // 如果是从文件夹选择的文档，使用loadDocumentFromFile
        console.log('📁 使用loadDocumentFromFile处理文件');
        await loadDocumentFromFile(document);
      } else {
        // 如果是从后端API获取的文档，使用fetchDocumentContent
        console.log('🌐 使用fetchDocumentContent处理文件:', document.filename);
        await fetchDocumentContent(document.filename);
      }
    } catch (error) {
      console.error('❌ 文档加载失败:', error);
      setDocumentContent(null);
      setLoading(false);
    }
    
    setShowDocumentSelector(false);
  };

  // 处理操作确认
  const handleConfirmAction = () => {
    if (!selectedText) {
      alert('请先选择要操作的文本');
      return;
    }

    const actionData = {
      action: actionType,
      selectedText,
      selectedRunId,
      value: actionValue,
      filename: selectedDocument || filename
    };

    onAction(actionData);
    onClose();
  };

  // 处理文本选择
  const handleTextSelect = (text, runId) => {
    setSelectedText(text);
    setSelectedRunId(runId);
    
    // 如果有回调函数，调用它
    if (onTextSelection) {
      onTextSelection(text, selectedDocument || filename);
    }
  };

  // 编辑器内容变化处理
  const handleEditorChange = (event) => {
    const content = event.target.innerText;
    setEditableContent(content);
  };

  // 编辑器引用
  const editorRef = useRef(null);

  // 更新编辑器内容
  const updateEditorContent = (content) => {
    if (editorRef.current && content !== editorRef.current.innerText) {
      editorRef.current.innerText = content;
    }
  };

  // 当内容变化时更新编辑器显示
  useEffect(() => {
    if (isEditMode && editableContent) {
      updateEditorContent(editableContent);
    }
  }, [editableContent, isEditMode]);

  // 处理键盘快捷键
  const handleKeyDown = (event) => {
    // Ctrl+Z 撤销 (简单实现)
    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      document.execCommand('undo');
    }
    // Ctrl+Y 重做 (简单实现)  
    if (event.ctrlKey && event.key === 'y') {
      event.preventDefault();
      document.execCommand('redo');
    }
  };

  // 处理编辑器点击事件
  const handleEditorClick = (event) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // 处理编辑器获得焦点
  const handleEditorFocus = (event) => {
    // 确保光标可见
    if (editorRef.current) {
      editorRef.current.style.caretColor = '#000';
    }
  };

  // 初始化编辑器内容
  useEffect(() => {
    if (documentContent && documentContent.content) {
      // 将文档内容转换为纯文本
      const plainText = documentContent.content.map(paragraph => 
        paragraph.runs.map(run => run.text).join('')
      ).join('\n\n');
      
      // 只有当内容不同时才更新
      if (plainText !== editableContent) {
        setEditableContent(plainText);
        
        // 直接更新编辑器内容
        if (editorRef.current) {
          editorRef.current.innerText = plainText;
        }
      }
    }
  }, [documentContent]);

  // 当切换到编辑模式时，确保编辑器有内容并获得焦点
  useEffect(() => {
    if (isEditMode && editorRef.current) {
      if (editableContent) {
        editorRef.current.innerText = editableContent;
      }
      
      // 延迟获得焦点，确保DOM已更新
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          
          // 将光标移动到内容末尾
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(editorRef.current);
          range.collapse(false); // 移动到末尾
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }, 100);
    }
  }, [isEditMode]);

  // Word风格文档渲染函数
  const renderWordStyleDocument = () => {
    if (!documentContent || !documentContent.content) {
      // 如果没有文档内容但处于编辑模式，显示空白编辑器
      if (isEditMode) {
        return (
          <div className="word-document-container">
            <div className="word-page">
              <div className="word-page-content">
                <div
                  ref={editorRef}
                  contentEditable={true}
                  className="word-editor"
                  onInput={handleEditorChange}
                  onKeyDown={handleKeyDown}
                  onClick={handleEditorClick}
                  onFocus={handleEditorFocus}
                  suppressContentEditableWarning={true}
                  placeholder="开始输入您的文档内容..."
                  style={{
                    minHeight: '500px',
                    outline: 'none',
                    whiteSpace: 'pre-wrap',
                    caretColor: '#000'
                  }}
                />
              </div>
            </div>
          </div>
        );
      }
      return null;
    }

    return (
      <div className="word-document-container">
        {/* Word页面 */}
        <div className="word-page">
          <div className="word-page-content">
            {isEditMode ? (
              // 编辑模式：显示contentEditable编辑器
              <div
                ref={editorRef}
                contentEditable={true}
                className="word-editor"
                onInput={handleEditorChange}
                onKeyDown={handleKeyDown}
                onClick={handleEditorClick}
                onFocus={handleEditorFocus}
                suppressContentEditableWarning={true}
                placeholder="编辑文档内容..."
                style={{
                  minHeight: '500px',
                  outline: 'none',
                  whiteSpace: 'pre-wrap',
                  caretColor: '#000'
                }}
              />
            ) : (
              // 预览模式：显示原始文档内容
              documentContent.content.map((paragraph, pIndex) => (
                <div key={pIndex} className="word-paragraph">
                  {paragraph.runs.map((run, rIndex) => (
                    <span
                      key={rIndex}
                      className="word-text-run"
                      style={{
                        fontFamily: run.font_name !== '默认字体' ? run.font_name : undefined
                      }}
                    >
                      {run.text}
                    </span>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // 调试信息
  console.log('🔍 DocumentPreviewDialog 状态:', {
    isOpen,
    loading,
    showMaterialWindow,
    hasDocumentContent: !!documentContent,
    documentContentType: typeof documentContent,
    selectedDocument,
    renderCondition: {
      showMaterialWindowCondition: showMaterialWindow,
      emptyStateCondition: !documentContent && !showMaterialWindow && !loading,
      loadingCondition: loading,
      hasContentCondition: !!documentContent
    }
  });
  
  // 更详细的文档内容调试
  if (documentContent) {
    console.log('📄 文档内容详情:', {
      content: documentContent.content,
      totalParagraphs: documentContent.total_paragraphs,
      contentLength: documentContent.content?.length
    });
  }

  // 如果position是panel，直接渲染在容器内，不使用Portal
  if (position === 'panel') {
    return (
      <div className="document-preview-content">
        <div className="document-preview-dialog-in-panel">
          
          {/* 文档选择器 */}
          {showDocumentSelector && (
            <div className="document-selector-overlay">
              <div className="document-selector">
                <div className="selector-header">
                  <h3>📁 选择文档</h3>
                  <button 
                    className="close-btn" 
                    onClick={() => setShowDocumentSelector(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="selector-body">
                  {loadingDocuments ? (
                    <div className="loading-state">正在加载文档列表...</div>
                  ) : availableDocuments.length > 0 ? (
                    <div className="document-list">
                      {availableDocuments.map((doc, index) => (
                        <div 
                          key={index}
                          className="document-item"
                          onClick={() => handleSelectDocument(doc)}
                        >
                          <div className="doc-icon">📄</div>
                          <div className="doc-info">
                            <div className="doc-name">{doc.displayName}</div>
                            <div className="doc-details">
                              {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.modified * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-documents">
                      <p>📂 材料节点文件夹中没有找到Word文档</p>
                      <p>请确保材料节点已选择包含.docx文件的文件夹</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!documentContent && !showMaterialWindow && !loading ? (
            /* 空文档状态：中央布局 */
            <div className="empty-document-layout">
              <button className="close-btn close-btn-top-right" onClick={onClose}>×</button>
              
              <div className="empty-content-center">
                <div className="node-operation-info">
                  <h3>{generatePreviewTitle()}</h3>
                  {currentNode && currentOperationId && (
                    <div className="current-operation-display">
                      <strong>当前操作:</strong> 
                      {(() => {
                        // 优先使用传递的operationContent，否则从节点数据中查找
                        if (currentOperationContent) {
                          return currentOperationContent;
                        }
                        const operation = currentNode.data?.precisionOperations?.find(
                          op => op.id === currentOperationId
                        );
                        return operation ? operation.requirement : '未找到操作要求';
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="material-folder-container">
                  {!showMaterialWindow ? (
                    <button 
                      className="central-action-btn"
                      onClick={handleChangeDocument}
                      disabled={loadingDocuments}
                    >
                      {loadingDocuments ? '🔄 正在加载...' : '📁 打开材料节点文件夹'}
                    </button>
                  ) : (
                    /* 材料节点文件夹小窗口 - 内置在绿色方框内 */
                    <div className="material-window-embedded">
                      <div className="material-window-header">
                        <span className="material-window-title">{generateMaterialWindowTitle()}</span>
                        <div className="material-window-actions">
                          <button 
                            className="refresh-btn"
                            onClick={handleRefreshMaterialFiles}
                            disabled={loadingDocuments}
                            title="刷新文件列表"
                          >
                            🔄
                          </button>
                          <button 
                            className="close-btn"
                            onClick={() => setShowMaterialWindow(false)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      <div className="material-window-body">
                        {loadingDocuments ? (
                          <div className="loading-state">🔄 正在加载文件...</div>
                        ) : availableDocuments.length > 0 ? (
                          <div className="material-file-list">
                            {availableDocuments.map((doc, index) => (
                              <div 
                                key={index}
                                className="material-file-item"
                                onClick={() => {
                                  handleSelectDocument(doc);
                                  setShowMaterialWindow(false);
                                }}
                              >
                                <div className="file-icon">{getFileIcon(doc.filename)}</div>
                                <div className="file-info">
                                  <div className="file-name">{doc.displayName}</div>
                                  <div className="file-details">
                                    {doc.nodeLabel ? `来自: ${doc.nodeLabel}` : ''}
                                    {doc.size ? ` • ${(doc.size / 1024).toFixed(1)} KB` : ''} 
                                    {doc.modified ? ` • ${new Date(doc.modified * 1000).toLocaleDateString()}` : ''}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-files-message">
                            <p>📂 未找到文件</p>
                            <p>请确保材料节点中有文件</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : loading ? (
            /* 加载状态 */
            <div className="empty-document-layout">
              <button className="close-btn close-btn-top-right" onClick={onClose}>×</button>
              
              <div className="empty-content-center">
                <div className="content-loading">
                  <div className="loading-icon">🔄</div>
                  <div className="loading-message">正在加载文档内容...</div>
                  <div className="loading-details">请稍候，正在解析文档格式</div>
                </div>
              </div>
            </div>
          ) : showMaterialWindow ? (
            /* 材料节点小窗口状态 - 即使有文档也可以切换到此状态 */
            <div className="empty-document-layout">
              <button className="close-btn close-btn-top-right" onClick={onClose}>×</button>
              
              <div className="empty-content-center">
                <div className="node-operation-info">
                  <h3>{generatePreviewTitle()}</h3>
                  {currentNode && currentOperationId && (
                    <div className="current-operation-display">
                      <strong>当前操作:</strong> 
                      {(() => {
                        // 优先使用传递的operationContent，否则从节点数据中查找
                        if (currentOperationContent) {
                          return currentOperationContent;
                        }
                        const operation = currentNode.data?.precisionOperations?.find(
                          op => op.id === currentOperationId
                        );
                        return operation ? operation.requirement : '未找到操作要求';
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="material-folder-container">
                  {/* 材料节点文件夹小窗口 - 内置在绿色方框内 */}
                  <div className="material-window-embedded">
                    <div className="material-window-header">
                      <span className="material-window-title">{generateMaterialWindowTitle()}</span>
                      <div className="material-window-actions">
                        <button 
                          className="refresh-btn"
                          onClick={handleRefreshMaterialFiles}
                          disabled={loadingDocuments}
                          title="刷新文件列表"
                        >
                          🔄
                        </button>
                        <button 
                          className="close-btn"
                          onClick={() => setShowMaterialWindow(false)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    <div className="material-window-body">
                      {loadingDocuments ? (
                        <div className="loading-state">🔄 正在加载文件...</div>
                      ) : availableDocuments.length > 0 ? (
                        <div className="material-file-list">
                          {availableDocuments.map((doc, index) => (
                            <div 
                              key={index}
                              className="material-file-item"
                              onClick={() => {
                                handleSelectDocument(doc);
                                setShowMaterialWindow(false);
                              }}
                            >
                              <div className="file-icon">{getFileIcon(doc.filename)}</div>
                              <div className="file-info">
                                <div className="file-name">{doc.displayName}</div>
                                <div className="file-details">
                                  {doc.nodeLabel ? `来自: ${doc.nodeLabel}` : ''}
                                  {doc.size ? ` • ${(doc.size / 1024).toFixed(1)} KB` : ''} 
                                  {doc.modified ? ` • ${new Date(doc.modified * 1000).toLocaleDateString()}` : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-files-message">
                          <p>📂 未找到文件</p>
                          <p>请确保材料节点中有文件</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 有文档状态：正常布局 */
            <>
              <div className="dialog-header">
                <h3>
                  {generatePreviewTitle()}
                </h3>
                <div className="header-actions">
                  <button 
                    className="change-document-btn"
                    onClick={handleChangeDocument}
                    title="更换文档"
                  >
                    更换文档
                  </button>
                  <button className="close-btn" onClick={onClose}>×</button>
                </div>
              </div>

              <div className="dialog-body">
                {/* 显示当前操作信息 */}
                {currentNode && currentOperationId && (
                  <div className="current-operation-info">
                    <strong>当前操作:</strong> 
                    {(() => {
                      // 优先使用传递的operationContent，否则从节点数据中查找
                      if (currentOperationContent) {
                        return currentOperationContent;
                      }
                      const operation = currentNode.data?.precisionOperations?.find(
                        op => op.id === currentOperationId
                      );
                      return operation ? operation.requirement : '未找到操作要求';
                    })()}
                  </div>
                )}

                {loading ? (
                  <div className="content-loading">
                    <div className="loading-icon">🔄</div>
                    <div className="loading-message">正在加载文档内容...</div>
                    <div className="loading-details">请稍候，正在解析文档格式</div>
                  </div>
                ) : documentContent ? (
                  <div className="document-content">
                    {documentContent.content && documentContent.content.length > 0 ? (
                      wordViewMode ? (
                        // Word风格页面视图
                        renderWordStyleDocument()
                      ) : (
                        // 传统列表视图
                        <>
                          <div className="document-info">
                            <span>📄 {selectedDocument} ({documentContent.total_paragraphs} 段落)</span>
                            <div className="view-mode-switcher" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                              <button 
                                className={`word-toolbar-button ${wordViewMode ? 'active' : ''}`}
                                onClick={() => setWordViewMode(true)}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              >
                                📄 页面视图
                              </button>
                              {wordViewMode && (
                                <button 
                                  className={`word-toolbar-button ${isEditMode ? 'active' : ''}`}
                                  onClick={() => setIsEditMode(!isEditMode)}
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  {isEditMode ? '👁️ 预览' : '✏️ 编辑'}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {documentContent.content.map((paragraph, pIndex) => (
                            <div key={pIndex} className="paragraph">
                              <div className="paragraph-label">段落 {pIndex + 1}:</div>
                              <div className="paragraph-content">
                                {paragraph.runs.map((run, rIndex) => (
                                  <span
                                    key={rIndex}
                                    className={`text-run ${selectedRunId === run.run_id ? 'selected' : ''}`}
                                    onClick={() => handleTextSelect(run.text, run.run_id)}
                                    title={`字体: ${run.font_name}`}
                                  >
                                    {run.text}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      )
                    ) : (
                      <div className="content-loading-failed">
                        <div className="failed-icon">⚠️</div>
                        <div className="failed-message">加载内容失败</div>
                        <div className="failed-details">
                          文档 "{selectedDocument}" 中没有找到可显示的内容
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="content-loading-failed">
                    <div className="failed-icon">❌</div>
                    <div className="failed-message">无法加载文档内容</div>
                    <div className="failed-details">请检查文档格式是否正确</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // 原有的居中弹窗代码保持不变
  return createPortal(
    <div className="document-preview-overlay">
      <div className="document-preview-dialog">
        <div className="dialog-header">
          <h3>📄 文档预览 - {filename}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="dialog-body">
          {loading ? (
            <div className="loading">正在加载文档内容...</div>
          ) : documentContent ? (
            <div className="document-content">
              {documentContent.content.map((paragraph, pIndex) => (
                <div key={pIndex} className="paragraph">
                  <div className="paragraph-label">段落 {pIndex + 1}:</div>
                  <div className="paragraph-content">
                    {paragraph.runs.map((run, rIndex) => (
                      <span
                        key={rIndex}
                        className={`text-run ${selectedRunId === run.run_id ? 'selected' : ''}`}
                        onClick={() => handleTextSelect(run.text, run.run_id)}
                        title={`字体: ${run.font_name}`}
                      >
                        {run.text}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="error-message">无法加载文档内容</div>
          )}
          
          {selectedText && (
            <div className="action-panel">
              <div className="selected-text">
                <strong>已选择文本:</strong> "{selectedText}"
              </div>
              
              <div className="action-controls">
                <select 
                  value={actionType} 
                  onChange={(e) => {
                    safeExecute(() => {
                      setActionType(e.target.value);
                    }, 'DocumentPreviewDialog-actionType-select');
                  }}
                >
                  <option value="set_font_name">设置字体</option>
                  <option value="set_font_size">设置字号</option>
                  <option value="set_font_color">设置颜色</option>
                </select>
                
                <input
                  type="text"
                  placeholder="请输入值（如：华文彩云）"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                />
                
                <button onClick={handleConfirmAction}>确认操作</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DocumentPreviewDialog; 