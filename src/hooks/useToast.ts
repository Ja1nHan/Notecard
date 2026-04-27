import { create } from 'zustand';
import type { Toast } from '../types/app';

interface ToastState {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string, actions?: Toast['actions']) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, actions) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const duration = actions?.length ? 30000 : 3000;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, actions }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
