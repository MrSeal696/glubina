// Переводы. Ключ — русский текст: русская версия работает без словаря,
// остальные языки берут перевод из src/locales/<язык>.js. {name} — подстановки.
import { BRAND, BRAND_SLUG } from './brand.js?v=20261020b';
import en from './locales/en.js?v=20261020b';
import pt from './locales/pt.js?v=20261020b';

export const LANGS = [['ru', 'Русский', 'RU'], ['en', 'English', 'EN'], ['pt', 'Português (BR)', 'PT']];
const DICTS = { en, pt };
const LOCALE = { ru: 'ru', en: 'en', pt: 'pt-BR' };
const STORE_KEY = 'glubina-lang';
const CYR = /[А-Яа-яЁё]/;
const norm = s => s.replace(/\s+/g, ' ').trim();

function detect() {
  try { const s = localStorage.getItem(STORE_KEY); if (s && DICTS[s] || s === 'ru') return s; } catch (e) {}
  const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
  if (/^(ru|uk|be|kk)/.test(nav)) return 'ru';
  if (nav.startsWith('pt')) return 'pt';
  return 'en';
}

export let lang = detect();
export const locale = () => LOCALE[lang];
export const brand = () => BRAND[lang];
export const brandSlug = () => BRAND_SLUG[lang];
export const missing = new Set();

export function setLang(l) {
  if (l !== 'ru' && !DICTS[l]) return;
  lang = l;
  try { localStorage.setItem(STORE_KEY, l); } catch (e) {}
}

export function $t(key, vars) {
  let s = String(key);
  if (lang !== 'ru') {
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), k = norm(m[2]), v = DICTS[lang][k];
    if (v == null) { if (CYR.test(k)) missing.add(k); }
    else s = m[1] + v + m[3];
  }
  s = s.replace(/\{brand\}/g, BRAND[lang]);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

// Множественное число через Intl.PluralRules: русский — one/few/many, остальные — one/other.
const PLURALS = {
  ru: { plan: { one: 'план', few: 'плана', many: 'планов' }, floor: { one: 'этаж', few: 'этажа', many: 'этажей' },
        hall: { one: 'зал', few: 'зала', many: 'залов' }, block: { one: 'блок', few: 'блока', many: 'блоков' } },
  en: { plan: { one: 'plan', other: 'plans' }, floor: { one: 'floor', other: 'floors' },
        hall: { one: 'room', other: 'rooms' }, block: { one: 'block', other: 'blocks' } },
  pt: { plan: { one: 'plano', other: 'planos' }, floor: { one: 'andar', other: 'andares' },
        hall: { one: 'sala', other: 'salas' }, block: { one: 'bloco', other: 'blocos' } },
};
export function pl(n, key) {
  const f = PLURALS[lang][key], cat = new Intl.PluralRules(LOCALE[lang]).select(n);
  return f[cat] || f.other || f.many;
}

// Статичная разметка: при запуске запоминаем русские тексты и атрибуты, потом переводим по запросу.
const nodes = [], attrs = [];
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'content'];
export function recordStatic(root = document) {
  const w = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (CYR.test(n.data)) nodes.push({ n, ru: n.data });
  root.querySelectorAll(ATTRS.map(a => `[${a}]`).join(',')).forEach(el => ATTRS.forEach(a => {
    const v = el.getAttribute(a); if (v && CYR.test(v)) attrs.push({ el, a, ru: v });
  }));
}
export function applyStatic() {
  for (const { n, ru } of nodes) n.data = $t(ru);
  for (const { el, a, ru } of attrs) el.setAttribute(a, $t(ru));
  document.documentElement.lang = LOCALE[lang];
  document.title = $t('{brand} — планировщик баз для Minecraft');
  document.querySelectorAll('.brand .word').forEach(el => { el.textContent = BRAND[lang]; });
}
