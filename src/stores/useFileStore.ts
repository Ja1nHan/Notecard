import { create } from 'zustand';

interface FileState {
  filePath: string | null;
  isDirty: boolean;
  createdAt: string | null;
  updatedAt: string | null;

  setFilePath: (path: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setFileMeta: (createdAt: string, updatedAt: string) => void;
  reset: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  filePath: null,
  isDirty: false,
  createdAt: null,
  updatedAt: null,

  setFilePath: (path) => set({ filePath: path }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setFileMeta: (createdAt, updatedAt) => set({ createdAt, updatedAt }),
  reset: () => set({ filePath: null, isDirty: false, createdAt: null, updatedAt: null }),
}));
