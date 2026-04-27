import { useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CardBodyProps {
  body: string;
  collapsed: boolean;
  locked: boolean;
  cardUnlocked: boolean;
  onChange: (value: string) => void;
  onUnlockClick: () => void;
  onExpandClick?: () => void;
}

export function CardBody({
  body,
  collapsed,
  locked,
  cardUnlocked,
  onChange,
  onUnlockClick,
  onExpandClick,
}: CardBodyProps) {
  const { t } = useTranslation();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current && bodyRef.current.textContent !== body) {
      bodyRef.current.textContent = body;
    }
  }, [body, collapsed]);

  if (locked && !cardUnlocked) {
    return (
      <div
        key="locked"
        className="card-locked-body"
        onClick={(e) => {
          e.stopPropagation();
          onUnlockClick();
        }}
      >
        <Lock />
        {t('cardBody.locked')}
      </div>
    );
  }

  if (collapsed) {
    const preview = body.split('\n').slice(0, 2).join('\n') || ' ';
    return (
      <div
        key="preview"
        className="card-body-preview"
        onClick={onExpandClick}
        style={{ cursor: onExpandClick ? 'pointer' : 'default' }}
      >
        {preview}
      </div>
    );
  }

  return (
    <div
      key="editable"
      ref={bodyRef}
      className="card-body"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={t('cardBody.placeholder')}
      onInput={(e) => {
        if ((e.nativeEvent as InputEvent).isComposing) return;
        onChange((e.currentTarget as HTMLDivElement).textContent ?? '');
      }}
      onCompositionEnd={(e) => {
        onChange((e.currentTarget as HTMLDivElement).textContent ?? '');
      }}
      onBlur={(e) => {
        onChange((e.currentTarget as HTMLDivElement).textContent ?? '');
      }}
    />
  );
}
