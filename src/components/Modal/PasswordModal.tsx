import { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Modal.css';

interface PasswordModalProps {
  mode: 'set' | 'enter';
  title: string;
  description?: string;
  hint?: string;
  onConfirm: (password: string, hint?: string) => Promise<void>;
  onCancel: () => void;
}

export function PasswordModal({
  mode,
  title,
  description,
  hint,
  onConfirm,
  onCancel,
}: PasswordModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hintText, setHintText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!password) {
      setError(t('password.emptyError'));
      return;
    }
    if (mode === 'set' && password !== confirm) {
      setError(t('password.mismatchError'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(password, mode === 'set' ? hintText : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('password.failedError'));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && !loading) handleSubmit();
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" onKeyDown={handleKey}>
        <h3>{title}</h3>

        {description && <p style={{ marginBottom: '14px' }}>{description}</p>}

        {mode === 'enter' && hint && (
          <p className="pw-modal-hint">
            <Lightbulb size={13} />
            {t('password.hintPrefix', { hint })}
          </p>
        )}

        <div className="pw-modal-fields">
          <input
            ref={inputRef}
            type="password"
            className="pw-modal-input"
            placeholder={
              mode === 'set' ? t('password.setPlaceholder') : t('password.enterPlaceholder')
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          {mode === 'set' && (
            <>
              <input
                type="password"
                className="pw-modal-input"
                placeholder={t('password.confirmPlaceholder')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              <input
                type="text"
                className="pw-modal-input"
                placeholder={t('password.hintPlaceholder')}
                value={hintText}
                onChange={(e) => setHintText(e.target.value)}
              />
            </>
          )}
        </div>

        {error && <p className="pw-modal-error">{error}</p>}

        <div className="modal-btns">
          <button className="btn-cancel" onClick={onCancel} disabled={loading}>
            {t('password.cancel')}
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading
              ? t('password.processing')
              : mode === 'set'
                ? t('password.encrypt')
                : t('password.unlock')}
          </button>
        </div>
      </div>
    </div>
  );
}
