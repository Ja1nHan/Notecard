import { z } from 'zod';
import type { NCardFile } from '../types/ncard';

// 合理的业务上限常量，防止恶意大文件 OOM / 主线程挂起
const MAX_TABS = 200;
const MAX_CARDS_PER_TAB = 1000;
const MAX_TITLE_LEN = 500;
const MAX_BODY_LEN = 200_000; // 200 KB 纯文本
const MAX_NAME_LEN = 200;
const MAX_HINT_LEN = 200;
const MAX_B64_LEN = 1024; // nonce/cipher/salt base64 上限

const lockedContentSchema = z.object({
  nonce: z.string().max(MAX_B64_LEN),
  cipher: z.string().max(10_000_000), // 密文可能很长，给 10 MB 上限
});

const fileLockSchema = z.object({
  hint: z.string().max(MAX_HINT_LEN),
  salt: z.string().max(MAX_B64_LEN),
  verifyNonce: z.string().max(MAX_B64_LEN),
  verifyCipher: z.string().max(MAX_B64_LEN),
});

const cardColorSchema = z.enum(['', 'sage', 'blue', 'amber', 'lavender']);

const nCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(MAX_TITLE_LEN),
  body: z.string().max(MAX_BODY_LEN),
  color: cardColorSchema,
  collapsed: z.boolean(),
  locked: z.boolean(),
  lockedContent: lockedContentSchema.nullable(),
});

const nTabSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(MAX_NAME_LEN),
  encrypted: z.boolean(),
  cards: z.array(nCardSchema).max(MAX_CARDS_PER_TAB),
  lockedContent: lockedContentSchema.nullable(),
});

const nCardFileSchema = z.object({
  format: z.literal('notecard'),
  formatVersion: z.literal(1), // 固定版本，拒绝未来未知格式
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  fileLock: fileLockSchema.nullable(),
  tabs: z.array(nTabSchema).max(MAX_TABS),
});

export function parseNCardFile(content: string): NCardFile {
  const raw: unknown = JSON.parse(content);
  return nCardFileSchema.parse(raw) as NCardFile;
}
