import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAppStore } from '../../stores/useAppStore';
import { TabItem } from './TabItem';
import { PasswordModal } from '../Modal/PasswordModal';
import { ConfirmModal } from '../Modal/ConfirmModal';
import { useTranslation } from 'react-i18next';

type PwModalState =
  | { mode: 'unlock_session'; pendingAction: () => Promise<void> }
  | { mode: 'setup_file_pw'; pendingTabId: string }
  | { mode: 'remove_tab_encryption'; pendingTabId: string }
  | null;

export function TabList() {
  const { t } = useTranslation();
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const deleteTab = useAppStore((s) => s.deleteTab);
  const sessionUnlocked = useAppStore((s) => s.sessionUnlocked);
  const fileLock = useAppStore((s) => s.fileLock);
  const unlockSession = useAppStore((s) => s.unlockSession);
  const setupFilePassword = useAppStore((s) => s.setupFilePassword);
  const lockTab = useAppStore((s) => s.lockTab);
  const unlockTab = useAppStore((s) => s.unlockTab);
  const removeTabEncryption = useAppStore((s) => s.removeTabEncryption);

  const [pwModal, setPwModal] = useState<PwModalState>(null);

  function ensureSessionThen(action: () => Promise<void>) {
    if (sessionUnlocked) {
      action();
    } else {
      setPwModal({ mode: 'unlock_session', pendingAction: action });
    }
  }

  function handleEncryptClick(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    if (!tab.encrypted) {
      if (!fileLock) {
        setPwModal({ mode: 'setup_file_pw', pendingTabId: tabId });
      } else {
        ensureSessionThen(() => lockTab(tabId));
      }
    } else if (tab.unlocked) {
      setPwModal({ mode: 'remove_tab_encryption', pendingTabId: tabId });
    } else {
      ensureSessionThen(() => unlockTab(tabId));
    }
  }

  const [tabToDelete, setTabToDelete] = useState<string | null>(null);

  function handleDeleteClick(tabId: string) {
    setTabToDelete(tabId);
  }

  async function handleUnlockSessionConfirm(password: string) {
    const ok = await unlockSession(password);
    if (!ok) throw new Error(t('tabList.wrongPassword'));
    if (pwModal?.mode === 'unlock_session') {
      await pwModal.pendingAction();
    }
    setPwModal(null);
  }

  async function handleSetupFilePasswordConfirm(password: string, hint?: string) {
    await setupFilePassword(password, hint ?? '');
    if (pwModal?.mode === 'setup_file_pw') {
      await lockTab(pwModal.pendingTabId);
    }
    setPwModal(null);
  }

  async function handleRemoveTabEncryptionConfirm(password: string) {
    const ok = await unlockSession(password);
    if (!ok) throw new Error(t('tabList.wrongPassword'));
    if (pwModal?.mode === 'remove_tab_encryption') {
      removeTabEncryption(pwModal.pendingTabId);
    }
    setPwModal(null);
  }

  return (
    <>
      <SortableContext items={tabs.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onEncryptClick={handleEncryptClick}
            onDeleteClick={handleDeleteClick}
          />
        ))}
      </SortableContext>

      {pwModal?.mode === 'unlock_session' && (
        <PasswordModal
          mode="enter"
          title={t('tabList.unlockFile')}
          hint={fileLock?.hint}
          onConfirm={handleUnlockSessionConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      {pwModal?.mode === 'setup_file_pw' && (
        <PasswordModal
          mode="set"
          title={t('tabList.setupPassword')}
          description={t('tabList.passwordLostWarning')}
          onConfirm={handleSetupFilePasswordConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      {pwModal?.mode === 'remove_tab_encryption' && (
        <PasswordModal
          mode="enter"
          title={t('tabList.verifyToRemove')}
          hint={fileLock?.hint}
          onConfirm={handleRemoveTabEncryptionConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      {tabToDelete && (
        <ConfirmModal
          title={t('tabList.deleteCategory')}
          body={`${t('tabList.deleteCategory')}「<strong>${tabs.find((t) => t.id === tabToDelete)?.name || t('tabList.untitled')}</strong>」？`}
          confirmLabel={t('tabList.delete')}
          danger
          onConfirm={() => {
            deleteTab(tabToDelete);
            setTabToDelete(null);
          }}
          onCancel={() => setTabToDelete(null)}
        />
      )}
    </>
  );
}
