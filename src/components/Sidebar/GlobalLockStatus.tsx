import { useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { PasswordModal } from '../Modal/PasswordModal';
import { useTranslation } from 'react-i18next';

export function GlobalLockStatus() {
  const { t } = useTranslation();
  const fileLock = useAppStore((s) => s.fileLock);
  const sessionUnlocked = useAppStore((s) => s.sessionUnlocked);
  const unlockSession = useAppStore((s) => s.unlockSession);
  const lockSession = useAppStore((s) => s.lockSession);
  const setupFilePassword = useAppStore((s) => s.setupFilePassword);

  const [pwModal, setPwModal] = useState<'unlock' | 'setup' | null>(null);

  async function handleClick() {
    if (!fileLock) {
      setPwModal('setup');
    } else if (sessionUnlocked) {
      await lockSession();
    } else {
      setPwModal('unlock');
    }
  }

  async function handleUnlockConfirm(password: string) {
    const ok = await unlockSession(password);
    if (!ok) throw new Error(t('lockStatus.wrongPassword'));
    setPwModal(null);
  }

  async function handleSetupConfirm(password: string, hint?: string) {
    await setupFilePassword(password, hint ?? '');
    setPwModal(null);
  }

  let IconComponent: typeof Lock = LockOpen;
  let text = t('lockStatus.unencrypted');
  let title = t('lockStatus.setupTitle');
  let colorClass = 'status-unencrypted';

  if (fileLock) {
    if (sessionUnlocked) {
      IconComponent = LockOpen;
      text = t('lockStatus.unlocked');
      title = t('lockStatus.lockTitle');
      colorClass = 'status-unlocked';
    } else {
      IconComponent = Lock;
      text = t('lockStatus.locked');
      title = t('lockStatus.unlockTitle');
      colorClass = 'status-locked';
    }
  }

  return (
    <>
      <div
        className={`sidebar-settings global-lock-status ${colorClass}`}
        onClick={handleClick}
        title={title}
      >
        <IconComponent />
        {text}
      </div>

      {pwModal === 'unlock' && (
        <PasswordModal
          mode="enter"
          title={t('lockStatus.unlockFile')}
          hint={fileLock?.hint}
          onConfirm={handleUnlockConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      {pwModal === 'setup' && (
        <PasswordModal
          mode="set"
          title={t('lockStatus.setupPassword')}
          description={t('lockStatus.passwordLostWarning')}
          onConfirm={handleSetupConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}
    </>
  );
}
