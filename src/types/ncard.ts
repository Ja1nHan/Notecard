export type CardColor = '' | 'sage' | 'blue' | 'amber' | 'lavender';

/** 用 session_key 加密后的密文载体 */
export interface LockedContent {
  nonce: string; // base64，12 字节 AES nonce
  cipher: string; // base64，AES-GCM 密文
}

/** 文件级密码锁，存在 .ncard 文件头 */
export interface FileLock {
  hint: string; // 密码提示（明文，用户自填）
  salt: string; // base64，Argon2id 盐
  verifyNonce: string; // base64，用于验证密码的 AES nonce
  verifyCipher: string; // base64，加密 "NOTECARD_VERIFY_1" 的密文
}

export interface NCard {
  id: string;
  title: string;
  body: string; // 已加密时为空字符串
  color: CardColor;
  collapsed: boolean;
  locked: boolean;
  lockedContent: LockedContent | null;
}

export interface NTab {
  id: string;
  name: string;
  encrypted: boolean;
  cards: NCard[];
  lockedContent: LockedContent | null;
}

export interface NCardFile {
  format: 'notecard';
  formatVersion: number;
  createdAt: string;
  updatedAt: string;
  fileLock: FileLock | null;
  tabs: NTab[];
}
