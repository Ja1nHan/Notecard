import { useSortable } from '@dnd-kit/sortable';
import type { AppCard } from '../../types/app';
import { Card } from './Card';

interface SortableCardProps {
  tabId: string;
  card: AppCard;
}

export function SortableCard({ tabId, card }: SortableCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  // Strip scaleX/scaleY — CSS columns layout breaks under scale transforms
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="card-wrapper" {...attributes} {...listeners}>
      <Card tabId={tabId} card={card} />
    </div>
  );
}
