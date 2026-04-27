import { useRef, useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import type { AppCard } from '../../types/app';
import type { CardColor } from '../../types/ncard';
import { CardPrimaryActions } from './CardPrimaryActions';
import { CardSecondaryActions } from './CardSecondaryActions';
import { CardBody } from './CardBody';
import { ColorPopup } from './ColorPopup';
import { ConfirmModal } from '../Modal/ConfirmModal';
import { PasswordModal } from '../Modal/PasswordModal';
import { useTranslation } from 'react-i18next';

interface CardProps {
  tabId: string;
  card: AppCard;
}

export function Card({ tabId, card }: CardProps) {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLDivElement>(null);
  const cardEl = useRef<HTMLDivElement>(null);

  const [secondaryExpanded, setSecondaryExpanded] = useState(false);
  const [colorAnchor, setColorAnchor] = useState<DOMRect | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const updateCardTitle = useAppStore((s) => s.updateCardTitle);
  const updateCardBody = useAppStore((s) => s.updateCardBody);
  const deleteCard = useAppStore((s) => s.deleteCard);
  const setCardColor = useAppStore((s) => s.setCardColor);
  const toggleCardCollapsed = useAppStore((s) => s.toggleCardCollapsed);
  const sessionUnlocked = useAppStore((s) => s.sessionUnlocked);
  const fileLock = useAppStore((s) => s.fileLock);
  const unlockSession = useAppStore((s) => s.unlockSession);
  const lockCard = useAppStore((s) => s.lockCard);
  const unlockCard = useAppStore((s) => s.unlockCard);
  const removeCardEncryption = useAppStore((s) => s.removeCardEncryption);
  const setupFilePassword = useAppStore((s) => s.setupFilePassword);

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const colorClass = card.color ? ` ${card.color}` : '';

  function ensureSessionThen(action: () => Promise<void>) {
    if (sessionUnlocked) {
      action();
    } else {
      setPendingAction(() => action);
      setShowSessionModal(true);
    }
  }

  function handleColorClick(e: React.MouseEvent<HTMLButtonElement>) {
    setColorAnchor((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
  }

  function handleColorSelect(color: CardColor) {
    setCardColor(tabId, card.id, color);
  }

  function handleEncryptToggle() {
    if (card.locked && card.cardUnlocked) {
      setShowRemoveModal(true);
    } else if (!card.locked) {
      if (!fileLock) {
        setShowSetupModal(true);
      } else {
        ensureSessionThen(() => lockCard(tabId, card.id));
      }
    } else {
      ensureSessionThen(() => unlockCard(tabId, card.id));
    }
  }

  function handleBodyUnlockClick() {
    ensureSessionThen(() => unlockCard(tabId, card.id));
  }

  async function handleSessionConfirm(password: string) {
    const ok = await unlockSession(password);
    if (!ok) throw new Error(t('card.wrongPassword'));
    setShowSessionModal(false);
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
  }

  async function handleSetupConfirm(password: string, hint?: string) {
    await setupFilePassword(password, hint ?? '');
    setShowSetupModal(false);
    await lockCard(tabId, card.id);
  }

  async function handleRemoveConfirm(password: string) {
    const ok = await unlockSession(password);
    if (!ok) throw new Error(t('card.wrongPassword'));
    setShowRemoveModal(false);
    removeCardEncryption(tabId, card.id);
  }

  const titleInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (titleInputRef.current && titleInputRef.current.textContent !== card.title) {
      titleInputRef.current.textContent = card.title;
    }
  }, [card.title]);

  const collapseTimeoutRef = useRef<number | null>(null);

  function handleMouseLeave() {
    if (secondaryExpanded) {
      collapseTimeoutRef.current = window.setTimeout(() => {
        setSecondaryExpanded(false);
      }, 3000);
    }
  }

  function handleMouseEnter() {
    if (collapseTimeoutRef.current) {
      window.clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) window.clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  const isTabEncrypted = useAppStore((s) => s.tabs.find((t) => t.id === tabId)?.encrypted);

  return (
    <>
      <div
        ref={cardEl}
        className={`card${colorClass}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="card-actions-wrapper">
          <CardSecondaryActions
            expanded={secondaryExpanded}
            locked={card.locked}
            cardUnlocked={card.cardUnlocked}
            isTabEncrypted={!!isTabEncrypted}
            onEncrypt={handleEncryptToggle}
            onColorClick={handleColorClick}
            onDelete={() => setConfirmDelete(true)}
          />
          <CardPrimaryActions
            collapsed={card.collapsed}
            secondaryExpanded={secondaryExpanded}
            body={card.body}
            onToggleSecondary={() => setSecondaryExpanded((v) => !v)}
            onToggleCollapse={() => toggleCardCollapsed(tabId, card.id)}
          />
        </div>

        <div ref={titleRef} className="card-title">
          <div
            ref={titleInputRef}
            className={`card-title-input ${card.title ? '' : 'is-empty'}`}
            contentEditable={!(card.locked && !card.cardUnlocked) ? 'plaintext-only' : 'false'}
            suppressContentEditableWarning
            data-placeholder={t('card.titlePlaceholder')}
            onInput={(e) => {
              if ((e.nativeEvent as InputEvent).isComposing) return;
              updateCardTitle(
                tabId,
                card.id,
                (e.currentTarget as HTMLDivElement).textContent || '',
              );
            }}
            onCompositionEnd={(e) => {
              updateCardTitle(
                tabId,
                card.id,
                (e.currentTarget as HTMLDivElement).textContent || '',
              );
            }}
            onBlur={(e) => {
              updateCardTitle(
                tabId,
                card.id,
                (e.currentTarget as HTMLDivElement).textContent || '',
              );
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                cardEl.current?.querySelector<HTMLElement>('.card-body')?.focus();
              }
            }}
          />
        </div>

        <div className="card-sep" />

        <CardBody
          body={card.body}
          collapsed={card.collapsed}
          locked={card.locked}
          cardUnlocked={card.cardUnlocked}
          onChange={(v) => updateCardBody(tabId, card.id, v)}
          onUnlockClick={handleBodyUnlockClick}
          onExpandClick={() => toggleCardCollapsed(tabId, card.id)}
        />

        {card.locked && (
          <div className="card-locked-badge-float" title={t('card.encryptedBadge')}>
            <Lock />
          </div>
        )}
      </div>

      {colorAnchor && (
        <ColorPopup
          anchorRect={colorAnchor}
          current={card.color}
          onSelect={handleColorSelect}
          onClose={() => setColorAnchor(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={t('card.deleteTitle')}
          body={`${t('card.deleteTitle')}「<strong>${card.title || t('card.untitled')}</strong>」？`}
          confirmLabel={t('card.delete')}
          danger
          onConfirm={() => {
            deleteCard(tabId, card.id);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {showSessionModal && (
        <PasswordModal
          mode="enter"
          title={t('card.unlockFile')}
          hint={fileLock?.hint}
          onConfirm={handleSessionConfirm}
          onCancel={() => {
            setShowSessionModal(false);
            setPendingAction(null);
          }}
        />
      )}

      {showSetupModal && (
        <PasswordModal
          mode="set"
          title={t('card.setupPassword')}
          description={t('card.passwordLostWarning')}
          onConfirm={handleSetupConfirm}
          onCancel={() => setShowSetupModal(false)}
        />
      )}

      {showRemoveModal && (
        <PasswordModal
          mode="enter"
          title={t('card.verifyToRemove')}
          hint={fileLock?.hint}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setShowRemoveModal(false)}
        />
      )}
    </>
  );
}
