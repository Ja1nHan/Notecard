import { useState, useCallback, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useAppStore } from '../stores/useAppStore';
import { TabItem } from '../components/Sidebar/TabItem';
import { PasswordModal } from '../components/Modal/PasswordModal';
import { ConfirmModal } from '../components/Modal/ConfirmModal';
import { AppPointerSensor } from './dnd-sensor';
import { useTranslation } from 'react-i18next';

interface DraggingInfo {
  type: 'card' | 'tab';
  id: string;
  tabId?: string; // only for card
}

interface PendingMove {
  cardId: string;
  fromTabId: string;
  toTabId: string;
}

export function DragProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const reorderCards = useAppStore((s) => s.reorderCards);
  const reorderTabs = useAppStore((s) => s.reorderTabs);
  const moveCard = useAppStore((s) => s.moveCard);
  const unlockTab = useAppStore((s) => s.unlockTab);
  const sessionUnlocked = useAppStore((s) => s.sessionUnlocked);
  const fileLock = useAppStore((s) => s.fileLock);
  const unlockSession = useAppStore((s) => s.unlockSession);

  const [dragging, setDragging] = useState<DraggingInfo | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showPlaintextWarn, setShowPlaintextWarn] = useState(false);

  const sensors = useSensors(
    useSensor(AppPointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // 若 session 在等待确认期间被自动锁定，丢弃挂起的移动操作，避免静默失败
  useEffect(() => {
    if (!sessionUnlocked && (showPlaintextWarn || showPwModal)) {
      setShowPlaintextWarn(false);
      setShowPwModal(false);
      setPendingMove(null);
    }
  }, [sessionUnlocked, showPlaintextWarn, showPwModal]);

  function handleDragStart({ active }: DragStartEvent) {
    const data = active.data.current;
    setDragging({
      type: data?.type ?? 'card',
      id: active.id as string,
      tabId: data?.tabId,
    });
  }

  // 实际执行移动（已通过所有校验）
  const executeMoveCard = useCallback(
    (move: PendingMove) => {
      moveCard(move.fromTabId, move.toTabId, move.cardId);
      setPendingMove(null);
    },
    [moveCard],
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // ── Tab 重排 ──────────────────────────────────────────
    if (activeType === 'tab' && overType === 'tab') {
      reorderTabs(active.id as string, over.id as string);
      return;
    }

    // ── 同 Tab 内卡片排序 ─────────────────────────────────
    if (activeType === 'card' && overType === 'card') {
      const fromTabId = active.data.current?.tabId as string;
      const toTabId = over.data.current?.tabId as string;
      if (fromTabId === toTabId) {
        reorderCards(fromTabId, active.id as string, over.id as string);
      }
      return;
    }

    // ── 卡片拖入另一个 Tab ────────────────────────────────
    if (activeType === 'card' && overType === 'tab') {
      const fromTabId = active.data.current?.tabId as string;
      const toTabId = over.id as string;
      if (fromTabId === toTabId) return;

      const fromTab = tabs.find((t) => t.id === fromTabId);
      const toTab = tabs.find((t) => t.id === toTabId);
      if (!fromTab || !toTab) return;

      const card = fromTab.cards.find((c) => c.id === active.id);
      if (!card) return;

      const move: PendingMove = { cardId: card.id, fromTabId, toTabId };
      // 任意一方加密，且 session 未解锁 → 先解锁 session
      const needsAuth = (fromTab.encrypted || toTab.encrypted) && !sessionUnlocked;

      if (needsAuth) {
        setPendingMove(move);
        setShowPwModal(true);
      } else {
        void applyMove(move);
      }
    }
  }

  /**
   * 通过鉴权后的实际移动流程：
   * 1. 目标 Tab 加密但未展开 → 先 unlockTab（防止卡片被 lockedContent 覆盖丢失）
   * 2. 从加密 Tab 移到普通 Tab 且卡片无自身加密 → 明文警告
   * 3. 否则直接执行
   */
  async function applyMove(move: PendingMove) {
    const fromTab = tabs.find((t) => t.id === move.fromTabId);
    const toTab = tabs.find((t) => t.id === move.toTabId);
    const card = fromTab?.cards.find((c) => c.id === move.cardId);

    if (toTab?.encrypted && !toTab.unlocked) {
      try {
        await unlockTab(move.toTabId);
      } catch {
        return; // 解锁失败，放弃移动
      }
    }

    const needsPlaintextWarn = fromTab?.encrypted && !toTab?.encrypted && !card?.locked;
    if (needsPlaintextWarn) {
      setPendingMove(move);
      setShowPlaintextWarn(true);
    } else {
      executeMoveCard(move);
    }
  }

  async function handlePasswordConfirm(password: string) {
    const ok = await unlockSession(password);
    if (!ok) throw new Error(t('tabList.wrongPassword'));
    setShowPwModal(false);
    if (!pendingMove) return;
    await applyMove(pendingMove);
  }

  const draggingCard =
    dragging?.type === 'card'
      ? tabs.flatMap((t) => t.cards).find((c) => c.id === dragging.id)
      : null;
  const draggingTab = dragging?.type === 'tab' ? tabs.find((t) => t.id === dragging.id) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      {children}

      <DragOverlay dropAnimation={null}>
        {draggingCard ? (
          // 紧凑 chip：不遮挡侧边栏，标题一目了然
          <div className="card-drag-chip">{draggingCard.title || t('card.untitled')}</div>
        ) : draggingTab ? (
          <div className="tab-drag-overlay">
            <TabItem
              tab={draggingTab}
              isActive={draggingTab.id === activeTabId}
              onEncryptClick={() => {}}
              onDeleteClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* 需要解锁 Session */}
      {showPwModal && (
        <PasswordModal
          mode="enter"
          title={t('tabList.unlockFile')}
          hint={fileLock?.hint}
          onConfirm={handlePasswordConfirm}
          onCancel={() => {
            setShowPwModal(false);
            setPendingMove(null);
          }}
        />
      )}

      {/* 明文警告 */}
      {showPlaintextWarn && pendingMove && (
        <ConfirmModal
          title={t('moveCard.plaintextTitle')}
          body={t('moveCard.plaintextBody')}
          confirmLabel={t('moveCard.confirmMove')}
          onConfirm={() => {
            setShowPlaintextWarn(false);
            executeMoveCard(pendingMove);
          }}
          onCancel={() => {
            setShowPlaintextWarn(false);
            setPendingMove(null);
          }}
        />
      )}
    </DndContext>
  );
}
