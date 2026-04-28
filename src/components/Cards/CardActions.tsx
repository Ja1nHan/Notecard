import { useState } from 'react';
import {
  Check,
  Copy,
  ChevronsUpDown,
  ChevronsDownUp,
  Lock,
  LockOpen,
  Palette,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CardActionsProps {
  collapsed: boolean;
  body: string;
  locked: boolean;
  cardUnlocked: boolean;
  isTabEncrypted?: boolean;
  onToggleCollapse: () => void;
  onEncrypt: () => void;
  onColorClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: () => void;
}

export function CardActions({
  collapsed,
  body,
  locked,
  cardUnlocked,
  isTabEncrypted,
  onToggleCollapse,
  onEncrypt,
  onColorClick,
  onDelete,
}: CardActionsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    void navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const LockIcon = !locked || cardUnlocked ? LockOpen : Lock;
  const lockTitle = !locked
    ? t('cardActions.encrypt')
    : cardUnlocked
      ? t('cardActions.removeEncryption')
      : t('cardActions.unlock');

  return (
    <>
      {/* 复制 */}
      <button
        className="card-btn"
        title={t('cardActions.copy')}
        style={copied ? { color: 'var(--accent)' } : undefined}
        onClick={handleCopy}
      >
        {copied ? <Check /> : <Copy />}
      </button>

      {/* 颜色 */}
      <button
        className="card-btn"
        title={t('cardActions.changeColor')}
        onClick={(e) => {
          e.stopPropagation();
          onColorClick(e);
        }}
      >
        <Palette />
      </button>

      {/* 加密（标签页已加密时隐藏） */}
      {!isTabEncrypted && (
        <button
          className={`card-btn${locked ? ' lock-active' : ''}`}
          title={lockTitle}
          onClick={(e) => {
            e.stopPropagation();
            onEncrypt();
          }}
        >
          <LockIcon />
        </button>
      )}

      {/* 折叠 / 展开 */}
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

      {/* 删除 — 推到最右侧，图标常显红色 */}
      <button
        className="card-btn del"
        title={t('cardActions.delete')}
        style={{ marginLeft: 'auto' }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 />
      </button>
    </>
  );
}
