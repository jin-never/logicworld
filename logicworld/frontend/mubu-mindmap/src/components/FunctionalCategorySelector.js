/**
 * 功能分类选择器组件
 * 用于在工具配置时选择功能标签
 */

import React, { useState, useRef, useEffect } from 'react';
import { TOOL_CATEGORIES, getCategoryOptions, searchCategories } from '../constants/toolCategories.js';
import './FunctionalCategorySelector.css';

const FunctionalCategorySelector = ({
  value = '',
  onChange,
  placeholder = '选择功能分类',
  disabled = false,
  required = false,
  showSearch = true,
  className = '',
  multiple = false,
  maxSelections = 5
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // 获取所有分类选项
  const allCategories = getCategoryOptions();

  // 获取当前选中的分类信息
  const selectedCategories = multiple
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : (value ? [value] : []);
  const selectedCategory = !multiple && value ? TOOL_CATEGORIES[value] : null;

  // 初始化过滤的分类
  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredCategories(searchCategories(searchTerm));
    } else {
      setFilteredCategories(allCategories);
    }
  }, [searchTerm]);

  // 处理点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 打开下拉框时聚焦搜索框
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleSelect = (categoryId) => {
    if (multiple) {
      const currentSelections = selectedCategories;
      const isSelected = currentSelections.includes(categoryId);

      if (isSelected) {
        // 取消选择
        const newSelections = currentSelections.filter(id => id !== categoryId);
        onChange(newSelections);
      } else {
        // 添加选择
        if (currentSelections.length < maxSelections) {
          const newSelections = [...currentSelections, categoryId];
          onChange(newSelections);
        } else {
          // 达到最大选择数量，显示提示
          alert(`最多只能选择 ${maxSelections} 个功能分类`);
          return;
        }
      }
      // 多选模式下不关闭下拉框
    } else {
      // 单选模式
      onChange(categoryId);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && filteredCategories.length === 1) {
      handleSelect(filteredCategories[0].value);
    }
  };

  return (
    <div 
      className={`functional-category-selector ${className} ${disabled ? 'disabled' : ''}`}
      ref={dropdownRef}
    >
      {/* 选择器按钮 */}
      <div
        className={`selector-button ${isOpen ? 'open' : ''} ${selectedCategories.length > 0 ? 'selected' : ''}`}
        onClick={handleToggle}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="selected-content">
          {multiple ? (
            selectedCategories.length > 0 ? (
              <div className="multiple-selections">
                {selectedCategories.length === 1 ? (
                  // 单个选择时显示完整信息
                  <>
                    <span className="category-icon">{TOOL_CATEGORIES[selectedCategories[0]]?.icon}</span>
                    <span className="category-name">{TOOL_CATEGORIES[selectedCategories[0]]?.name}</span>
                  </>
                ) : (
                  // 多个选择时显示数量
                  <span className="multiple-count">已选择 {selectedCategories.length} 个分类</span>
                )}
              </div>
            ) : (
              <span className="placeholder">{placeholder}</span>
            )
          ) : (
            selectedCategory ? (
              <>
                <span className="category-icon">{selectedCategory.icon}</span>
                <span className="category-name">{selectedCategory.name}</span>
              </>
            ) : (
              <span className="placeholder">{placeholder}</span>
            )
          )}
        </div>
        <div className="dropdown-arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path 
              d="M1 1.5L6 6.5L11 1.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* 下拉选项 */}
      {isOpen && (
        <div className="dropdown-menu">
          {/* 搜索框 */}
          {showSearch && (
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="搜索分类..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
              />
              <div className="search-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path 
                    d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* 分类选项列表 */}
          <div className="options-container">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const isSelected = selectedCategories.includes(category.value);
                return (
                  <div
                    key={category.value}
                    className={`option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(category.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="option-content">
                      <span
                        className="option-icon"
                        style={{ color: category.color }}
                      >
                        {category.icon}
                      </span>
                      <div className="option-text">
                        <div className="option-name">{category.label}</div>
                        <div className="option-description">{category.description}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="check-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M13.333 4L6 11.333 2.667 8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="no-options">
                <div className="no-options-icon">🔍</div>
                <div className="no-options-text">
                  {searchTerm ? `未找到匹配 "${searchTerm}" 的分类` : '暂无可用分类'}
                </div>
              </div>
            )}
          </div>

          {/* 分类统计 */}
          <div className="category-stats">
            <span className="stats-text">
              共 {allCategories.length} 个分类
              {searchTerm && ` · 找到 ${filteredCategories.length} 个匹配项`}
            </span>
          </div>
        </div>
      )}

      {/* 必填标识 */}
      {required && !selectedCategory && (
        <div className="required-indicator">*</div>
      )}
    </div>
  );
};

export default FunctionalCategorySelector;
