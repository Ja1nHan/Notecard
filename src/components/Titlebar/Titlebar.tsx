import { invoke } from '@tauri-apps/api/core';
import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { FileMenu } from './FileMenu';
import { requestClose } from '../../App';
import { useTranslation } from 'react-i18next';
import './Titlebar.css';

async function handleToggleMaximize() {
  const win = getCurrentWindow();
  const isMax = await win.isMaximized();
  if (isMax) {
    await invoke('plugin:window|unmaximize', { label: 'main' });
  } else {
    await invoke('plugin:window|maximize', { label: 'main' });
  }
}

import { useFileStore } from '../../stores/useFileStore';

export function Titlebar() {
  const { t } = useTranslation();
  const filePath = useFileStore((s) => s.filePath);
  const isDirty = useFileStore((s) => s.isDirty);

  const fileName = filePath ? filePath.split(/[\\/]/).pop() : 'NoteCard';

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <div className="logo" title={filePath || 'NoteCard'}>
          <div className="logo-mark">
            <img
              src="/app-icon.png"
              width={28}
              height={28}
              alt="NoteCard"
              style={{ display: 'block' }}
            />
          </div>
          {fileName}
        </div>
        <FileMenu />
        {isDirty && (
          <span
            className="dirty-dot"
            style={{ width: 6, height: 6, background: 'var(--text-3)', borderRadius: '50%' }}
          ></span>
        )}
      </div>

      <div className="titlebar-drag-zone" data-tauri-drag-region />

      <div className="wincontrols">
        <button
          className="winbtn"
          onClick={() => void invoke('plugin:window|minimize', { label: 'main' })}
          title={t('titlebar.minimize')}
        >
          <Minus />
        </button>
        <button
          className="winbtn"
          onClick={() => void handleToggleMaximize()}
          title={t('titlebar.maximize')}
        >
          <Square />
        </button>
        <button
          className="winbtn close"
          onClick={() => void requestClose()}
          title={t('titlebar.close')}
        >
          <X />
        </button>
      </div>
    </div>
  );
}
