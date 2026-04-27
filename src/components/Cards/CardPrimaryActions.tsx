import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  ChevronsUpDown,
  ChevronsDownUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CardPrimaryActionsProps {
  collapsed: boolean;
  secondaryExpanded: boolean;
  body: string;
  onToggleSecondary: () => void;
  onToggleCollapse: () => void;
}

export function CardPrimaryActions({
  collapsed,
  secondaryExpanded,
  body,
  onToggleSecondary,
  onToggleCollapse,
}: CardPrimaryActionsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    void navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="actions-primary">
      <button
        className="card-btn"
        title={t('cardActions.more')}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSecondary();
        }}
      >
        {secondaryExpanded ? <ChevronRight /> : <ChevronLeft />}
      </button>
      <button
        className="card-btn"
        title={t('cardActions.copy')}
        style={copied ? { color: 'var(--accent)' } : undefined}
        onClick={handleCopy}
      >
        {copied ? <Check /> : <Copy />}
      </button>
      <button
        className="card-btn"
        title={collapsed ? t('cardActions.expand') : t('cardActions.collapse')}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
      >
        {collapsed ? <ChevronsUpDown /> : <ChevronsDownUp />}
      </button>
    </div>
  );
}
