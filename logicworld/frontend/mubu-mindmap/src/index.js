import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './errorSuppression'; // 导入错误抑制器 - 必须在最前面
import App from './App';

// 全局错误处理：抑制ResizeObserver错误
const originalError = console.error;
console.error = (...args) => {
  // 抑制ResizeObserver相关的错误
  if (
    args.length > 0 && 
    typeof args[0] === 'string' && 
    (
      args[0].includes('ResizeObserver loop completed with undelivered notifications') ||
      args[0].includes('ResizeObserver loop limit exceeded')
    )
  ) {
    return;
  }
  originalError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
