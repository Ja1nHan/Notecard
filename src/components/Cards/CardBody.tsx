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

/** 浏览器 innerText 末尾有时会多一个 \n，统一去掉再比较/存储 */
function normalizeText(s: string): string {
  return s.replace(/\n$/, '');
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
    if (!bodyRef.current) return;
    // 用 innerText 比较：它能正确感知 <br> 对应的换行，避免不必要的 DOM 重置
    if (normalizeText(bodyRef.current.innerText) !== body) {
      // innerText setter 会把 \n 转换为 <br>，在 pre-wrap 下正确渲染多行
      bodyRef.current.innerText = body;
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
        // innerText 能正确捕获 <br> 对应的 \n，textContent 会丢失换行
        onChange(normalizeText((e.currentTarget as HTMLDivElement).innerText));
      }}
      onCompositionEnd={(e) => {
        onChange(normalizeText((e.currentTarget as HTMLDivElement).innerText));
      }}
      onBlur={(e) => {
        onChange(normalizeText((e.currentTarget as HTMLDivElement).innerText));
      }}
    />
  );
}
