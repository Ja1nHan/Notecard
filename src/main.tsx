import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initI18n } from './lib/i18n';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import './styles/global.css';

// 禁用默认右键菜单（提升原生应用体验）
// 仅允许在输入框或可编辑区域（如卡片正文、标题）使用右键菜单（用于复制/粘贴）
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  const isEditable =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]');

  // 如果不是可编辑区域，且没有按住 Alt 键（保留 Alt+右键 方便开发时强制呼出菜单检查元素），则阻止默认菜单
  if (!isEditable && !e.altKey) {
    e.preventDefault();
  }
});

// 只加载当前语言包后再挂载，其余语言包在用户切换时按需加载
initI18n().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  // React 挂载完成后再显示窗口：
  // 此时 tauri-plugin-window-state 已完成尺寸/位置恢复，
  // 窗口直接以正确的大小出现，消除启动时的尺寸跳变
  void getCurrentWebviewWindow().show();
});
