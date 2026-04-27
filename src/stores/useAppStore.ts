import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import type { AppCard, AppTab } from '../types/app';
import type { FileLock, LockedContent, NCardFile } from '../types/ncard';

interface AppState {
  tabs: AppTab[];
  activeTabId: string;
  searchQuery: string;

  // Phase 5.1: 文件级单一密码体系
  sessionUnlocked: boolean; // 本次运行是否已通过密码验证
  fileLock: FileLock | null; // 当前文件的密码锁

  setActiveTab: (id: string) => void;
  setSearchQuery: (q: string) => void;

  addTab: () => AppTab;
  renameTab: (id: string, name: string) => void;
  deleteTab: (id: string) => void;
  reorderTabs: (fromId: string, toId: string) => void;

  addCard: (tabId: string) => AppCard;
  updateCardTitle: (tabId: string, cardId: string, title: string) => void;
  updateCardBody: (tabId: string, cardId: string, body: string) => void;
  deleteCard: (tabId: string, cardId: string) => void;
  setCardColor: (tabId: string, cardId: string, color: AppCard['color']) => void;
  toggleCardCollapsed: (tabId: string, cardId: string) => void;
  reorderCards: (tabId: string, fromId: string, toId: string) => void;

  // Phase 5.1: 统一 session 加解密
  unlockSession: (password: string) => Promise<boolean>;
  lockSession: () => Promise<void>;
  setupFilePassword: (password: string, hint: string) => Promise<void>;
  changeFilePassword: (newPassword: string, hint: string) => Promise<void>;
  removeFilePassword: () => Promise<void>;

  // 卡片级加密（基于 session key）
  lockCard: (tabId: string, cardId: string) => Promise<void>;
  unlockCard: (tabId: string, cardId: string) => Promise<void>;
  removeCardEncryption: (tabId: string, cardId: string) => void;

  // 标签级加密（基于 session key）
  lockTab: (tabId: string) => Promise<void>;
  unlockTab: (tabId: string) => Promise<void>;
  removeTabEncryption: (tabId: string) => void;

  // Phase 6: 文件生命周期
  loadFromFile: (file: NCardFile) => void;
}

function nextId() {
  return crypto.randomUUID();
}

function mapTab<T extends AppTab>(tabs: T[], id: string, fn: (t: T) => T): T[] {
  return tabs.map((t) => (t.id === id ? fn(t) : t));
}

function mapCard(
  tabs: AppTab[],
  tabId: string,
  cardId: string,
  fn: (c: AppCard) => AppCard,
): AppTab[] {
  return mapTab(tabs, tabId, (t) => ({
    ...t,
    cards: t.cards.map((c) => (c.id === cardId ? fn(c) : c)),
  }));
}

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [],
  activeTabId: '',
  searchQuery: '',

  // Phase 5.1: 文件级单一密码体系
  sessionUnlocked: false,
  fileLock: null,

  setActiveTab: (id) => set({ activeTabId: id }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  addTab: () => {
    const id = nextId();
    const newTab: AppTab = {
      id,
      name: '新类别',
      encrypted: false,
      unlocked: false,
      lockedContent: null,
      cards: [],
    };
    set((s) => ({ tabs: [...s.tabs, newTab], activeTabId: id }));
    return newTab;
  },

  renameTab: (id, name) => set((s) => ({ tabs: mapTab(s.tabs, id, (t) => ({ ...t, name })) })),

  deleteTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId = s.activeTabId === id ? (tabs[0]?.id ?? '') : s.activeTabId;
      return { tabs, activeTabId };
    }),

  reorderTabs: (fromId, toId) =>
    set((s) => {
      const tabs = [...s.tabs];
      const fromIndex = tabs.findIndex((t) => t.id === fromId);
      const toIndex = tabs.findIndex((t) => t.id === toId);
      if (fromIndex < 0 || toIndex < 0) return {};
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { tabs };
    }),

  addCard: (tabId) => {
    const id = nextId();
    const newCard: AppCard = {
      id,
      title: '',
      body: '',
      color: '',
      collapsed: false,
      locked: false,
      lockedContent: null,
      cardUnlocked: false,
    };
    set((s) => ({
      tabs: mapTab(s.tabs, tabId, (t) => ({ ...t, cards: [...t.cards, newCard] })),
    }));
    return newCard;
  },

  updateCardTitle: (tabId, cardId, title) =>
    set((s) => ({ tabs: mapCard(s.tabs, tabId, cardId, (c) => ({ ...c, title })) })),

  updateCardBody: (tabId, cardId, body) =>
    set((s) => ({ tabs: mapCard(s.tabs, tabId, cardId, (c) => ({ ...c, body })) })),

  deleteCard: (tabId, cardId) =>
    set((s) => ({
      tabs: mapTab(s.tabs, tabId, (t) => ({
        ...t,
        cards: t.cards.filter((c) => c.id !== cardId),
      })),
    })),

  setCardColor: (tabId, cardId, color) =>
    set((s) => ({ tabs: mapCard(s.tabs, tabId, cardId, (c) => ({ ...c, color })) })),

  toggleCardCollapsed: (tabId, cardId) =>
    set((s) => ({
      tabs: mapCard(s.tabs, tabId, cardId, (c) => ({ ...c, collapsed: !c.collapsed })),
    })),

  reorderCards: (tabId, fromId, toId) =>
    set((s) => {
      const tabs = [...s.tabs];
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      if (tabIndex < 0) return {};
      const newCards = [...tabs[tabIndex].cards];
      const fromIndex = newCards.findIndex((c) => c.id === fromId);
      const toIndex = newCards.findIndex((c) => c.id === toId);
      if (fromIndex < 0 || toIndex < 0) return {};
      const [moved] = newCards.splice(fromIndex, 1);
      newCards.splice(toIndex, 0, moved);
      tabs[tabIndex] = { ...tabs[tabIndex], cards: newCards };
      return { tabs };
    }),

  unlockSession: async (password) => {
    const { fileLock } = get();
    if (!fileLock) return false;
    try {
      const ok = await invoke<boolean>('unlock_session', { password, fileLock });
      if (ok) {
        set({ sessionUnlocked: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  lockSession: async () => {
    const s = get();
    const newTabs = await Promise.all(
      s.tabs.map(async (tab) => {
        if (tab.encrypted) {
          if (tab.unlocked) {
            try {
              const lockedContent = await invoke<LockedContent>('encrypt_content', {
                plaintext: JSON.stringify(tab.cards),
              });
              return { ...tab, unlocked: false, cards: [], lockedContent };
            } catch (e) {
              console.error(e);
              return { ...tab, unlocked: false, cards: [] };
            }
          }
          return { ...tab, unlocked: false, cards: [] };
        } else {
          const newCards = await Promise.all(
            tab.cards.map(async (card) => {
              if (card.locked) {
                if (card.cardUnlocked) {
                  try {
                    const lockedContent = await invoke<LockedContent>('encrypt_content', {
                      plaintext: card.body,
                    });
                    return { ...card, cardUnlocked: false, body: '', lockedContent };
                  } catch (e) {
                    console.error(e);
                    return { ...card, cardUnlocked: false, body: '' };
                  }
                }
                return { ...card, cardUnlocked: false, body: '' };
              }
              return card;
            }),
          );
          return { ...tab, unlocked: false, cards: newCards };
        }
      }),
    );

    await invoke('lock_session');
    set({
      sessionUnlocked: false,
      tabs: newTabs,
    });
  },

  setupFilePassword: async (password, hint) => {
    const fileLock = await invoke<FileLock>('setup_file_password', { password, hint });
    set({ fileLock, sessionUnlocked: true });
  },

  changeFilePassword: async (newPassword, hint) => {
    const s = get();

    // 类型化中间结构：把"解密后的明文"与"原 tab 对象"完全分开，
    // 避免给现有对象附加临时字段（tempCards / tempBody）
    type EncryptedTabDecrypted = {
      kind: 'encrypted';
      tab: AppTab;
      plainCards: AppCard[]; // 解密得到的卡片列表
    };
    type PlainCardDecrypted = {
      card: AppCard;
      plainBody: string; // 解密得到的正文（非加密卡片直接取 body）
    };
    type PlainTabDecrypted = {
      kind: 'plain';
      tab: AppTab;
      cards: PlainCardDecrypted[];
    };
    type TabDecrypted = EncryptedTabDecrypted | PlainTabDecrypted;

    // 阶段 1：用旧密钥解密所有内容
    const decryptedTabs: TabDecrypted[] = await Promise.all(
      s.tabs.map(async (tab): Promise<TabDecrypted> => {
        if (tab.encrypted) {
          // 已在内存中展开时直接使用，否则从 lockedContent 解密
          let plainCards: AppCard[] = tab.cards;
          if (!tab.unlocked && tab.lockedContent) {
            try {
              const pt = await invoke<string>('decrypt_content', { locked: tab.lockedContent });
              plainCards = JSON.parse(pt) as AppCard[];
            } catch (e) {
              console.error(e);
              // 解密失败保持 tab.cards（通常为空数组）
            }
          }
          return { kind: 'encrypted', tab, plainCards };
        } else {
          const cards: PlainCardDecrypted[] = await Promise.all(
            tab.cards.map(async (card): Promise<PlainCardDecrypted> => {
              if (card.locked && !card.cardUnlocked && card.lockedContent) {
                try {
                  const pt = await invoke<string>('decrypt_content', {
                    locked: card.lockedContent,
                  });
                  return { card, plainBody: pt };
                } catch (e) {
                  console.error(e);
                }
              }
              // 非加密卡片或已展开的卡片直接取 body
              return { card, plainBody: card.body };
            }),
          );
          return { kind: 'plain', tab, cards };
        }
      }),
    );

    // 阶段 2：切换后端密钥
    const fileLock = await invoke<FileLock>('change_file_password', { newPassword, hint });

    // 阶段 3：用新密钥重新加密，结果直接构造为 AppTab[]，不产生任何多余字段
    const reencryptedTabs: AppTab[] = await Promise.all(
      decryptedTabs.map(async (item): Promise<AppTab> => {
        if (item.kind === 'encrypted') {
          try {
            const lockedContent = await invoke<LockedContent>('encrypt_content', {
              plaintext: JSON.stringify(item.plainCards),
            });
            return { ...item.tab, lockedContent, unlocked: false, cards: [] };
          } catch (e) {
            console.error(e);
            return { ...item.tab, unlocked: false, cards: [] };
          }
        } else {
          const newCards: AppCard[] = await Promise.all(
            item.cards.map(async ({ card, plainBody }): Promise<AppCard> => {
              if (card.locked) {
                try {
                  const lockedContent = await invoke<LockedContent>('encrypt_content', {
                    plaintext: plainBody,
                  });
                  return { ...card, lockedContent, cardUnlocked: false, body: '' };
                } catch (e) {
                  console.error(e);
                  return { ...card, cardUnlocked: false, body: '' };
                }
              }
              return card; // 非加密卡片原样返回，不附加任何多余字段
            }),
          );
          return { ...item.tab, cards: newCards };
        }
      }),
    );

    set({ fileLock, tabs: reencryptedTabs });
  },

  removeFilePassword: async () => {
    const s = get();
    // 1. 全部解密，并直接解除所有加密属性
    const newTabs = await Promise.all(
      s.tabs.map(async (tab) => {
        if (tab.encrypted) {
          let finalCards = tab.cards;
          if (!tab.unlocked && tab.lockedContent) {
            try {
              const pt = await invoke<string>('decrypt_content', { locked: tab.lockedContent });
              finalCards = JSON.parse(pt) as AppCard[];
            } catch (e) {
              console.error(e);
            }
          }
          return {
            ...tab,
            encrypted: false,
            unlocked: false,
            lockedContent: null,
            cards: finalCards,
          };
        } else {
          const newCards = await Promise.all(
            tab.cards.map(async (card) => {
              if (card.locked) {
                let finalBody = card.body;
                if (!card.cardUnlocked && card.lockedContent) {
                  try {
                    finalBody = await invoke<string>('decrypt_content', {
                      locked: card.lockedContent,
                    });
                  } catch (e) {
                    console.error(e);
                  }
                }
                return {
                  ...card,
                  locked: false,
                  cardUnlocked: false,
                  lockedContent: null,
                  body: finalBody,
                };
              }
              return card;
            }),
          );
          return { ...tab, cards: newCards };
        }
      }),
    );

    // 2. 后端清除密钥
    await invoke('lock_session'); // 清除后端密钥状态
    set({ fileLock: null, sessionUnlocked: false, tabs: newTabs });
  },

  lockCard: async (tabId, cardId) => {
    const s = get();
    const tab = s.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    const card = tab.cards.find((c) => c.id === cardId);
    if (!card) return;

    try {
      const lockedContent = await invoke<LockedContent>('encrypt_content', {
        plaintext: card.body,
      });
      set((st) => ({
        tabs: mapCard(st.tabs, tabId, cardId, (c) => ({
          ...c,
          locked: true,
          lockedContent,
          body: '',
          cardUnlocked: false,
        })),
      }));
    } catch (e) {
      console.error(e);
    }
  },

  unlockCard: async (tabId, cardId) => {
    const s = get();
    const tab = s.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    const card = tab.cards.find((c) => c.id === cardId);
    if (!card || !card.lockedContent) return;

    try {
      const plaintext = await invoke<string>('decrypt_content', { locked: card.lockedContent });
      set((st) => ({
        tabs: mapCard(st.tabs, tabId, cardId, (c) => ({
          ...c,
          body: plaintext,
          cardUnlocked: true,
        })),
      }));
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  removeCardEncryption: (tabId, cardId) => {
    set((s) => ({
      tabs: mapCard(s.tabs, tabId, cardId, (c) => ({
        ...c,
        locked: false,
        lockedContent: null,
      })),
    }));
  },

  lockTab: async (tabId) => {
    const s = get();
    const tab = s.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    try {
      const lockedContent = await invoke<LockedContent>('encrypt_content', {
        plaintext: JSON.stringify(tab.cards),
      });
      set((st) => ({
        tabs: mapTab(st.tabs, tabId, (t) => ({
          ...t,
          encrypted: true,
          lockedContent,
          unlocked: false,
          cards: [],
        })),
      }));
    } catch (e) {
      console.error(e);
    }
  },

  unlockTab: async (tabId) => {
    const s = get();
    const tab = s.tabs.find((t) => t.id === tabId);
    if (!tab || !tab.lockedContent) return;

    try {
      const plaintext = await invoke<string>('decrypt_content', { locked: tab.lockedContent });
      const cards = JSON.parse(plaintext) as AppCard[];
      set((st) => ({
        tabs: mapTab(st.tabs, tabId, (t) => ({
          ...t,
          unlocked: true,
          cards,
        })),
      }));
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  removeTabEncryption: (tabId) => {
    set((s) => ({
      tabs: mapTab(s.tabs, tabId, (t) => ({
        ...t,
        encrypted: false,
        lockedContent: null,
      })),
    }));
  },

  loadFromFile: (file) => {
    const seenTabIds = new Set<string>();
    const appTabs = file.tabs.map((tab) => {
      let tabId = tab.id;
      if (seenTabIds.has(tabId)) {
        tabId = crypto.randomUUID();
      }
      seenTabIds.add(tabId);

      const seenCardIds = new Set<string>();
      const deduplicatedCards = tab.encrypted
        ? []
        : tab.cards.map((card) => {
            let cardId = card.id;
            if (seenCardIds.has(cardId)) {
              cardId = crypto.randomUUID();
            }
            seenCardIds.add(cardId);
            return {
              ...card,
              id: cardId,
              cardUnlocked: false,
            };
          });

      return {
        ...tab,
        id: tabId,
        unlocked: false, // 默认锁定显示
        cards: deduplicatedCards,
      };
    });

    set({
      tabs: appTabs,
      activeTabId: appTabs.length > 0 ? appTabs[0].id : '',
      fileLock: file.fileLock,
      sessionUnlocked: false,
      searchQuery: '',
    });
  },
}));
