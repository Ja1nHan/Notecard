import { useEffect, useRef } from 'react';
import type { CardColor } from '../../types/ncard';

interface ColorPopupProps {
  anchorRect: DOMRect;
  current: CardColor;
  onSelect: (color: CardColor) => void;
  onClose: () => void;
}

const SWATCHES: { color: CardColor; bg: string; border?: string }[] = [
  { color: '', bg: 'var(--card-bg)', border: 'var(--border-strong)' },
  { color: 'sage', bg: 'var(--card-sage)' },
  { color: 'blue', bg: 'var(--card-blue)' },
  { color: 'amber', bg: 'var(--card-amber)' },
  { color: 'lavender', bg: 'var(--card-lavender)' },
];

export function ColorPopup({ anchorRect, current, onSelect, onClose }: ColorPopupProps) {
  const ref = useRef<HTMLDivElement>(null);

  const top = anchorRect.bottom + 6;
  const left = Math.min(anchorRect.left, window.innerWidth - 180);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <div ref={ref} className="color-popup" style={{ top, left }}>
      {SWATCHES.map((s) => (
        <div
          key={s.color}
          className={`color-swatch${current === s.color ? ' selected' : ''}`}
          style={{
            background: s.bg,
            borderColor: s.border ?? 'transparent',
          }}
          onClick={() => {
            onSelect(s.color);
            onClose();
          }}
        />
      ))}
    </div>
  );
}
