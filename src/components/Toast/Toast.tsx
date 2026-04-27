import type { LucideProps } from 'lucide-react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '../../hooks/useToast';
import './Toast.css';

const ICONS: Record<string, React.FC<LucideProps>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            onClick={() => !t.actions?.length && removeToast(t.id)}
          >
            {Icon && <Icon />}
            <span className="toast-message">{t.message}</span>
            {t.actions?.map((a, i) => (
              <button
                key={i}
                className={`toast-action${i > 0 ? ' secondary' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                  a.onClick();
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
