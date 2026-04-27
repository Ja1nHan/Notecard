import { Lock, LockOpen, Palette, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CardSecondaryActionsProps {
  expanded: boolean;
  locked: boolean;
  cardUnlocked: boolean;
  isTabEncrypted?: boolean;
  onEncrypt: () => void;
  onColorClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: () => void;
}

export function CardSecondaryActions({
  expanded,
  locked,
  cardUnlocked,
  isTabEncrypted,
  onEncrypt,
  onColorClick,
  onDelete,
}: CardSecondaryActionsProps) {
  const { t } = useTranslation();
  const LockIcon = !locked || cardUnlocked ? LockOpen : Lock;
  const lockTitle = !locked
    ? t('cardActions.encrypt')
    : cardUnlocked
      ? t('cardActions.removeEncryption')
      : t('cardActions.unlock');

  return (
    <div className={`actions-secondary${expanded ? ' expanded' : ''}`}>
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
      <button
        className="card-btn del"
        title={t('cardActions.delete')}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 />
      </button>
    </div>
  );
}
