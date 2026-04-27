import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Plus, FolderOpen, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createNewFile, openFile, openFileByPath } from '../../lib/file_io';

export function FileMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  useEffect(() => {
    const loadRecent = () => {
      try {
        const data = localStorage.getItem('notecard_recent_files');
        if (data) setRecentFiles(JSON.parse(data));
      } catch (e) {}
    };

    loadRecent();
    window.addEventListener('notecard_recent_files_updated', loadRecent);
    return () => window.removeEventListener('notecard_recent_files_updated', loadRecent);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleNewFile() {
    setIsOpen(false);
    try {
      await createNewFile();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleOpenFile() {
    setIsOpen(false);
    try {
      await openFile();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleOpenRecent(path: string) {
    setIsOpen(false);
    try {
      await openFileByPath(path);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="file-menu-wrapper" ref={menuRef} style={{ position: 'relative' }}>
      <button
        className="file-menu-btn"
        title={t('fileMenu.ops')}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreHorizontal />
      </button>

      {isOpen && (
        <div
          className="file-menu-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-modal)',
            minWidth: '200px',
            zIndex: 1000,
            padding: '4px 0',
          }}
        >
          <div
            className="file-menu-item"
            onClick={handleNewFile}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <Plus size={16} />
            {t('fileMenu.new')}
          </div>
          <div
            className="file-menu-item"
            onClick={handleOpenFile}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <FolderOpen size={16} />
            {t('fileMenu.open')}
          </div>

          {recentFiles.length > 0 && (
            <>
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              <div
                style={{
                  padding: '4px 16px',
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  fontWeight: 500,
                }}
              >
                {t('fileMenu.recent')}
              </div>
              {recentFiles.map((path) => {
                const name = path.split(/[\\/]/).pop();
                return (
                  <div
                    key={path}
                    className="file-menu-item"
                    onClick={() => handleOpenRecent(path)}
                    title={path}
                    style={{
                      padding: '6px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <History size={16} color="var(--text-3)" />
                    <span
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
