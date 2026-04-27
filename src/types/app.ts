import type { NCard, NTab } from './ncard';

export interface AppCard extends NCard {
  cardUnlocked: boolean;
}

export interface AppTab extends Omit<NTab, 'cards'> {
  unlocked: boolean;
  cards: AppCard[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  actions?: Array<{ label: string; onClick: () => void }>;
}
