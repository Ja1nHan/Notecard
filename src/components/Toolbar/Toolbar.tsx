import { useRef, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useTranslation } from 'react-i18next';
import './Toolbar.css';

export function Toolbar() {
  const { t } = useTranslation();
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const addCard = useAppStore((s) => s.addCard);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function handleNewCard() {
    if (!activeTabId) return;
    addCard(activeTabId);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleNewCard();
      } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, addCard]);

  const isMac = navigator.userAgent.toLowerCase().includes('mac');
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  return (
    <div className="toolbar">
      <span className="tab-headline">{activeTab?.name ?? ''}</span>

      <div className="search-wrap" title={`${t('toolbar.search')} (${modKey}+F)`}>
        <Search />
        <input
          ref={searchInputRef}
          className="search-input"
          type="text"
          placeholder={t('toolbar.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <button
        className="btn-new"
        onClick={handleNewCard}
        title={`${t('toolbar.newCard')} (${modKey}+N)`}
      >
        <Plus />
        {t('toolbar.newCard')}
      </button>
    </div>
  );
}
