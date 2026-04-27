import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUpdateStore, performUpdate } from '../../stores/useUpdateStore';
import type { UpdateStatus } from '../../stores/useUpdateStore';
import { useAppStore } from '../../stores/useAppStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { PasswordModal } from '../Modal/PasswordModal';
import { ConfirmModal } from '../Modal/ConfirmModal';
import { setLanguage, LANGUAGES } from '../../lib/i18n';
import type { Language } from '../../lib/i18n';
import './Settings.css';

interface SettingsPanelProps {
  onClose: () => void;
}

type PwModal =
  | { mode: 'setup' }
  | { mode: 'change' }
  | { mode: 'unlock'; then: 'change' | 'remove' }
  | null;

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t, i18n } = useTranslation();

  const fileLock = useAppStore((s) => s.fileLock);
  const sessionUnlocked = useAppStore((s) => s.sessionUnlocked);
  const unlockSession = useAppStore((s) => s.unlockSession);
  const setupFilePassword = useAppStore((s) => s.setupFilePassword);
  const changeFilePassword = useAppStore((s) => s.changeFilePassword);

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useSettingsStore((s) => s.setAutoLockMinutes);

  const [appVersion, setAppVersion] = useState('');
  const [pwModal, setPwModal] = useState<PwModal>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | UpdateStatus>('idle');
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const ignoreUpdate = useUpdateStore((s) => s.ignoreUpdate);

  const currentLang = i18n.language as Language;

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  async function handleCheckUpdate() {
    await performUpdate((status) => setUpdateStatus(status));
    setTimeout(() => setUpdateStatus('idle'), 5000);
  }

  const hasPassword = fileLock !== null;

  function handleSetup() {
    setPwModal({ mode: 'setup' });
  }
  function handleChange() {
    setPwModal(sessionUnlocked ? { mode: 'change' } : { mode: 'unlock', then: 'change' });
  }
  function handleRemove() {
    sessionUnlocked ? setConfirmRemove(true) : setPwModal({ mode: 'unlock', then: 'remove' });
  }

  async function handleUnlockConfirm(password: string) {
    const ok = await unlockSession(password);
    if (!ok) throw new Error(t('settings.wrongPassword'));
    const next = pwModal?.mode === 'unlock' ? pwModal.then : null;
    setPwModal(null);
    setTimeout(() => {
      if (next === 'change') setPwModal({ mode: 'change' });
      if (next === 'remove') setConfirmRemove(true);
    }, 50);
  }

  async function handleSetupConfirm(password: string, hint?: string) {
    await setupFilePassword(password, hint ?? '');
    setPwModal(null);
  }

  async function handleChangeConfirm(password: string, hint?: string) {
    await changeFilePassword(password, hint ?? '');
    setPwModal(null);
  }

  async function handleRemoveConfirm() {
    await useAppStore.getState().removeFilePassword();
    setConfirmRemove(false);
  }

  return (
    <>
      <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="settings-panel">
          <div className="settings-header">
            <h2>{t('settings.title')}</h2>
            <button className="settings-close" onClick={onClose}>
              <X />
            </button>
          </div>

          {/* 通用 */}
          <div className="settings-section">
            <div className="settings-section-title">{t('settings.general')}</div>

            <div className="settings-row">
              <span>{t('settings.appearance')}</span>
              <div className="segment-control">
                <button
                  className={theme === 'light' ? 'active' : ''}
                  onClick={() => setTheme('light')}
                >
                  {t('settings.light')}
                </button>
                <button
                  className={theme === 'dark' ? 'active' : ''}
                  onClick={() => setTheme('dark')}
                >
                  {t('settings.dark')}
                </button>
                <button
                  className={theme === 'system' ? 'active' : ''}
                  onClick={() => setTheme('system')}
                >
                  {t('settings.system')}
                </button>
              </div>
            </div>

            <div className="settings-row">
              <span>{t('settings.autoLock')}</span>
              <div className="segment-control">
                <button
                  className={autoLockMinutes === 0 ? 'active' : ''}
                  onClick={() => setAutoLockMinutes(0)}
                >
                  {t('settings.never')}
                </button>
                <button
                  className={autoLockMinutes === 5 ? 'active' : ''}
                  onClick={() => setAutoLockMinutes(5)}
                >
                  {t('settings.min5')}
                </button>
                <button
                  className={autoLockMinutes === 10 ? 'active' : ''}
                  onClick={() => setAutoLockMinutes(10)}
                >
                  {t('settings.min10')}
                </button>
                <button
                  className={autoLockMinutes === 30 ? 'active' : ''}
                  onClick={() => setAutoLockMinutes(30)}
                >
                  {t('settings.min30')}
                </button>
              </div>
            </div>

            {/* 语言选择 */}
            <div className="settings-row">
              <span>{t('settings.language')}</span>
              <div className="segment-control">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    className={currentLang === lang.code ? 'active' : ''}
                    onClick={() => void setLanguage(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 安全 */}
          <div className="settings-section">
            <div className="settings-section-title">{t('settings.security')}</div>
            <div className="settings-row">
              <span>{t('settings.filePassword')}</span>
              <div className="settings-actions">
                {!hasPassword ? (
                  <button onClick={handleSetup}>{t('settings.setPassword')}</button>
                ) : (
                  <>
                    <button onClick={handleChange}>{t('settings.changePassword')}</button>
                    <button className="danger" onClick={handleRemove}>
                      {t('settings.removePassword')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 版本 / 更新 */}
          <div className="settings-version">
            <span>{appVersion ? `v${appVersion}` : ''}</span>
            <button
              className="settings-update-btn"
              onClick={handleCheckUpdate}
              disabled={updateStatus !== 'idle'}
            >
              {updateStatus === 'checking' && t('settings.checking')}
              {updateStatus === 'downloading' && t('settings.downloading')}
              {updateStatus === 'latest' && t('settings.upToDate')}
              {updateStatus === 'network_error' && t('settings.networkError')}
              {updateStatus === 'open_browser' && t('settings.openedBrowser')}
              {updateStatus === 'idle' && t('settings.checkUpdate')}
              {updateAvailable && updateStatus === 'idle' && (
                <span className="update-dot settings-update-dot" />
              )}
            </button>
            {updateAvailable && updateStatus === 'idle' && (
              <button className="settings-update-btn ignore" onClick={ignoreUpdate}>
                {t('settings.ignoreVersion')}
              </button>
            )}
          </div>
          {updateStatus === 'network_error' && (
            <div className="settings-network-error">{t('settings.networkErrorDesc')}</div>
          )}
        </div>
      </div>

      {pwModal?.mode === 'unlock' && (
        <PasswordModal
          mode="enter"
          title={t('settings.unlockFile')}
          hint={fileLock?.hint}
          onConfirm={handleUnlockConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      {pwModal?.mode === 'setup' && (
        <PasswordModal
          mode="set"
          title={t('settings.setupPassword')}
          description={t('settings.passwordLostWarning')}
          onConfirm={handleSetupConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      {pwModal?.mode === 'change' && (
        <PasswordModal
          mode="set"
          title={t('settings.changeFilePassword')}
          description={t('settings.setNewPassword')}
          onConfirm={handleChangeConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      {confirmRemove && (
        <ConfirmModal
          title={t('settings.deletePassword')}
          body={t('settings.deletePasswordConfirm')}
          confirmLabel={t('settings.delete')}
          danger
          onConfirm={handleRemoveConfirm}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </>
  );
}
