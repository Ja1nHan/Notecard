import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Language = 'zh-CN' | 'en' | 'ja' | 'zh-TW';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-TW', label: '繁體中文' },
];

const STORAGE_KEY = 'notecard_language';

// 每种语言单独一个 chunk，Vite 自动分割，按需加载
const LOCALE_LOADERS: Record<Language, () => Promise<Record<string, unknown>>> = {
  'zh-CN': () => import('../locales/zh-CN.json').then((m) => m.default),
  en: () => import('../locales/en.json').then((m) => m.default),
  ja: () => import('../locales/ja.json').then((m) => m.default),
  'zh-TW': () => import('../locales/zh-TW.json').then((m) => m.default),
};

const HTML_LANG: Record<Language, string> = {
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  ja: 'ja',
  en: 'en',
};

function detectLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  const nav = navigator.language;
  if (nav.startsWith('zh-TW') || nav.startsWith('zh-HK') || nav.startsWith('zh-Hant'))
    return 'zh-TW';
  if (nav.startsWith('zh')) return 'zh-CN';
  if (nav.startsWith('ja')) return 'ja';
  return 'en';
}

async function ensureLoaded(lang: Language): Promise<void> {
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    const translations = await LOCALE_LOADERS[lang]();
    i18n.addResourceBundle(lang, 'translation', translations);
  }
}

/** 切换语言：按需加载语言包，更新 html[lang] */
export async function setLanguage(lang: Language): Promise<void> {
  localStorage.setItem(STORAGE_KEY, lang);
  await ensureLoaded(lang);
  await i18n.changeLanguage(lang);
  document.documentElement.lang = HTML_LANG[lang];
}

/** 应用启动时调用一次：只加载检测到的语言包 */
export async function initI18n(): Promise<void> {
  const lang = detectLanguage();
  const translations = await LOCALE_LOADERS[lang]();

  await i18n.use(initReactI18next).init({
    resources: { [lang]: { translation: translations } },
    lng: lang,
    fallbackLng: false,
    interpolation: { escapeValue: false },
  });

  document.documentElement.lang = HTML_LANG[lang];
  localStorage.setItem(STORAGE_KEY, lang);
}

export default i18n;
