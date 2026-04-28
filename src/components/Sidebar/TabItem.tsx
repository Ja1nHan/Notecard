import { useRef, useEffect } from 'react';
import { Lock, LockOpen, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../stores/useAppStore';
import { useTranslation } from 'react-i18next';
import type { AppTab } from '../../types/app';

interface TabItemProps {
  tab: AppTab;
  isActive: boolean;
  onEncryptClick: (tabId: string) => void;
  onDeleteClick: (tabId: string) => void;
}

export function TabItem({ tab, isActive, onEncryptClick, onDeleteClick }: TabItemProps) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLSpanElement>(null);

  const { setNodeRef, listeners, transform, transition, isDragging, isOver, active } = useSortable({
    id: tab.id,
    data: { type: 'tab' },
  });
  // 仅当拖拽的是卡片时才高亮（拖 Tab 本身重排时不高亮）
  const isCardDropTarget = isOver && active?.data.current?.type === 'card';

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  const renameTab = useAppStore((s) => s.renameTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  function handleItemClick() {
    if (nameRef.current?.contentEditable === 'true') return;
    setActiveTab(tab.id);
  }

  function startEdit() {
    if (nameRef.current?.contentEditable === 'true') return;
    if (nameRef.current) {
      nameRef.current.contentEditable = 'true';
      nameRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(nameRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  function handleNameClick(e: React.MouseEvent) {
    if (!isActive) return;
    e.stopPropagation();
    startEdit();
  }

  // 新建标签自动进入编辑模式（默认名称为 '新类别' 的哨兵值）
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      if (tab.name === '新类别' && isActive) {
        startEdit();
      }
    }
  }, [isActive, tab.name]);

  function handleNameBlur() {
    if (!nameRef.current) return;
    nameRef.current.contentEditable = 'false';
    const newName = nameRef.current.textContent?.trim();
    if (newName) renameTab(tab.id, newName);
    else if (nameRef.current) nameRef.current.textContent = tab.name;
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameRef.current?.blur();
    }
  }

  function renderBadge() {
    const count = tab.cards.length;
    return count > 0 ? <span className="tab-card-count">{count}</span> : null;
  }

  const encryptTitle = !tab.encrypted
    ? t('tab.encryptCategory')
    : tab.unlocked
      ? t('tab.removeEncryption')
      : t('tab.unlockCategory');

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-tab-id={tab.id}
      className={['tab-item', isActive ? 'active' : '', isCardDropTarget ? 'card-drop-target' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={handleItemClick}
      {...listeners}
    >
      {tab.encrypted ? (
        <div style={{ width: '7px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <Lock size={15} color="var(--accent)" />
        </div>
      ) : (
        <div className="tab-dot" />
      )}
      <span
        ref={nameRef}
        className="tab-name-text"
        onClick={handleNameClick}
        onBlur={handleNameBlur}
        onKeyDown={handleNameKeyDown}
        suppressContentEditableWarning
      >
        {tab.name}
      </span>
      {renderBadge()}
      <button
        className="tab-encrypt"
        title={encryptTitle}
        onClick={(e) => {
          e.stopPropagation();
          onEncryptClick(tab.id);
        }}
      >
        {tab.encrypted && tab.unlocked ? <LockOpen /> : <Lock />}
      </button>
      <button
        className="tab-close"
        title={t('tab.deleteCategory')}
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick(tab.id);
        }}
      >
        <X />
      </button>
    </div>
  );
}
