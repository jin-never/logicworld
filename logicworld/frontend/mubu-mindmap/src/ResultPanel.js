import React from 'react';
import './ResultPanel.css';

const ResultPanel = ({ context, onClose }) => {
  if (!context) return null;

  // 仅取 fetch-node 的 content
  const entries = Object.entries(context)
    .filter(([key]) => key.includes('fetch-node') && key.endsWith('.content'))
    .map(([key, value], idx) => ({ idx: idx + 1, key, value }));

  if (entries.length === 0) return null;

  return (
    <div className="result-panel">
      <div className="result-header">
        <span>抓取结果</span>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="result-content">
        {entries.map(({ idx, value }) => {
          // 尝试从正文前几行解析标题行（Markdown 一级标题或首行）
          const titleMatch = value.match(/^#+\s*(.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : `来源 ${idx}`;
          const excerpt = value.replace(/\s+/g, ' ').slice(0, 120);
          return (
            <div key={idx} className="result-item">
              <div className="result-title">〔{idx}〕 {title}</div>
              <div className="result-excerpt">{excerpt}...</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultPanel; 