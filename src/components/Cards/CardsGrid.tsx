import { useRef, useState } from 'react';
import { Layers, Lock, SearchX } from 'lucide-react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useAppStore } from '../../stores/useAppStore';
import { SortableCard } from './SortableCard';
import { PasswordModal } from '../Modal/PasswordModal';
import { useSearchHighlight } from '../../hooks/useSearchHighlight';
import { useTranslation } from 'react-i18next';
import './Cards.css';

export function CardsGrid() {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sessionUnlocked = useAppStore((s) => s.sessionUnlocked);
  const fileLock = useAppStore((s) => s.fileLock);
  const unlockSession = useAppStore((s) => s.unlockSession);
  const unlockTab = useAppStore((s) => s.unlockTab);

  const [unlockModal, setUnlockModal] = useState(false);

  useSearchHighlight(gridRef, searchQuery);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="empty">
        <Layers />
        <p>{t('cards.noCategory')}</p>
      </div>
    );
  }

  if (activeTab.encrypted && !activeTab.unlocked) {
    async function handleUnlockClick() {
      if (sessionUnlocked) {
        try {
          await unlockTab(activeTabId);
        } catch (err) {
          console.error('unlock tab failed:', err);
        }
      } else {
        setUnlockModal(true);
      }
    }

    async function handlePasswordConfirm(password: string) {
      const ok = await unlockSession(password);
      if (!ok) throw new Error(t('lockStatus.wrongPassword'));
      setUnlockModal(false);
      try {
        await unlockTab(activeTabId);
      } catch (err) {
        console.error('unlock tab failed:', err);
      }
    }

    return (
      <>
        <div className="empty" style={{ flexDirection: 'column', gap: '14px' }}>
          <Lock size={38} color="var(--text-3)" />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)', margin: 0 }}>
            {t('cards.categoryEncrypted')}
          </h3>
          {fileLock?.hint && (
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
              {t('cards.hint', { hint: fileLock.hint })}
            </p>
          )}
          <button
            className="btn-primary"
            style={{ marginTop: '4px', padding: '8px 20px', fontSize: '13px' }}
            onClick={handleUnlockClick}
          >
            {sessionUnlocked ? t('cards.viewContent') : t('cards.unlock')}
          </button>
        </div>

        {unlockModal && (
          <PasswordModal
            mode="enter"
            title={t('cards.unlockFile')}
            hint={fileLock?.hint}
            onConfirm={handlePasswordConfirm}
            onCancel={() => setUnlockModal(false)}
          />
        )}
      </>
    );
  }

  const q = searchQuery.toLowerCase();
  const cards = activeTab.cards.filter((c) => {
    if (!q) return true;
    if (c.title.toLowerCase().includes(q)) return true;
    if (!c.locked && c.body.toLowerCase().includes(q)) return true;
    return false;
  });

  if (!cards.length) {
    return (
      <div className="empty">
        {searchQuery ? (
          <>
            <SearchX />
            <p>{t('cards.noResults')}</p>
          </>
        ) : (
          <>
            <Layers />
            <p>{t('cards.empty')}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
      <div className="cards-area" ref={gridRef}>
        <div className="cards-grid">
          {cards.map((card) => (
            <SortableCard key={card.id} tabId={activeTabId} card={card} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
}
