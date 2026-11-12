import { IntlMessageFormat } from "intl-messageformat";
import en from "./locales/en.json" with { type: "json" };
import aliases from "./aliases.json" with { type: "json" };
import optionMessages from "./option-messages.json" with { type: "json" };
import enumMessages from "./enum-messages.json" with { type: "json" };
import systemTemplates from "./system-templates.json" with { type: "json" };
import { UI_LANGUAGES, supportedUiLanguage } from "../utils/uiLanguages.js";

export const catalogs = { en };
// Vite serves imported JSON as JavaScript modules. Native JSON import
// attributes on a dynamic import would make browsers reject that MIME type.
// Node's catalog tests use the native loaders below instead.
const browserCatalogs = import.meta.env ? import.meta.glob(["./locales/*.json", "!./locales/en.json"], { import: "default" }) : null;
// This branch is used only by Node. Exclude it from Vite's module graph so the
// same JSON file is not bundled with conflicting import attributes.
const nativeCatalog = code => import(/* @vite-ignore */ `./locales/${code}.json`, { with: { type: "json" } }).then(module => module.default);
const catalogRequests = new Map();
const listeners = new Set(), cache = new Map(), missing = new Map(), rendered = new Map();
let language = "en", requestedLanguage = "en", revision = 0;
export const getLanguage = () => language;
export const getRevision = () => revision;
export const recordLanguageChoice = () => { revision += 1; };
export const aliasesForSource = source => aliases[source];
export const optionLabel = value => {
  const key = optionMessages[value] || aliases[value];
  return key ? msg(key) : value;
};
const normalizedSystemLabels = new Map(Object.entries(aliases).filter(([text]) => /^[A-Za-z][A-Za-z _-]{1,60}$/.test(text)).map(([text, key]) => [text.trim().replace(/[\s-]+/g, "_").toUpperCase(), key]));
export function enumLabel(value) {
  const code = String(value || "UNKNOWN").trim().replace(/[\s-]+/g, "_").toUpperCase();
  const key = enumMessages[code] || normalizedSystemLabels.get(code);
  return key ? msg(key) : optionLabel(value);
}
export const getLocale = () => UI_LANGUAGES.find(item => item.code === language)?.locale || "en-US";
export function subscribeLanguage(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export async function loadLanguage(code) {
  const next = supportedUiLanguage(code) || "en";
  if (!catalogs[next]) {
    let request = catalogRequests.get(next);
    if (!request) {
      const load = browserCatalogs ? browserCatalogs[`./locales/${next}.json`]() : nativeCatalog(next);
      request = load.then(messages => {
        catalogs[next] = messages;
        return catalogs[next];
      }).catch(error => {
        catalogRequests.delete(next);
        throw error;
      });
      catalogRequests.set(next, request);
    }
    await request;
  }
  return next;
}
export function activateLanguage(code) {
  const next = supportedUiLanguage(code) || "en";
  requestedLanguage = next;
  if (!catalogs[next]) {
    // Keep the current catalog readable while the requested language chunk loads.
    // The resolved call below publishes exactly one language-change notification.
    revision += 1;
    return loadLanguage(next).then(() => requestedLanguage === next ? activateLanguage(next) : undefined);
  }
  if (next === language) return;
  language = next; revision += 1;
  listeners.forEach(listener => listener());
}
export function missingTranslations() { return [...missing.values()]; }
function diagnose(key, reason) {
  const id = `${language}:${key}:${reason}`;
  if (missing.has(id)) return;
  missing.set(id, { language, key, reason });
  if (import.meta.env?.DEV) console.warn(`[i18n] ${reason}: ${language}/${key}`);
}
/** Only registered UI messages belong here. Never pass user-authored text to msg. */
export function msg(key, values = {}) {
  const id = Object.hasOwn(en, key) ? key : aliases[key];
  if (!id) {
    diagnose(key, "unregistered message");
    // Legacy source-copy calls remain readable while the audit identifies them.
    return /\s/.test(key) || !/[._]/.test(key) && /[A-Z]/.test(key) ? key : catalogs[language]["common.textUnavailable"] || "Text unavailable";
  }
  const source = en[id];
  const translated = catalogs[language][id];
  if (translated === undefined && language !== "en") diagnose(id, "missing translation");
  const text = translated ?? source;
  try {
    const cacheKey = `${language}:${id}:${text}`;
    let formatter = cache.get(cacheKey);
    if (!formatter) { formatter = new IntlMessageFormat(text, getLocale(), undefined, { ignoreTag: true }); cache.set(cacheKey, formatter); }
    const result = formatter.format(values);
    if (typeof result === "string") {
      if (rendered.size > 2000) rendered.delete(rendered.keys().next().value);
      rendered.set(result, { key: id, values });
    }
    return result;
  } catch {
    diagnose(id, "invalid ICU message or arguments");
    try {
      const fallback = new IntlMessageFormat(source, "en-US", undefined, { ignoreTag: true });
      const defaults = {};
      const walk = nodes => nodes.forEach(node => {
        if (node.type > 0 && node.type < 5) defaults[node.value] = node.type === 1 ? "" : 0;
        if (node.options) { defaults[node.value] = node.type === 5 ? "other" : 0; Object.values(node.options).forEach(option => walk(option.value)); }
      });
      walk(fallback.getAst());
      return fallback.format({ ...defaults, ...Object.fromEntries(Object.entries(values).filter(([, value]) => value != null)) });
    } catch { return catalogs[language]["common.textUnavailable"] || "Text unavailable"; }
  }
}
export const formatNumber = (value, options) => new Intl.NumberFormat(getLocale(), options).format(value);
export const formatCurrency = (value, currency = "USD", options) => formatNumber(value, { style: "currency", currency, ...options });
export function formatDate(value, options = { dateStyle: "medium" }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(getLocale(), options).format(date);
}
export const formatRelative = (value, unit, options = {}) => new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto", ...options }).format(value, unit);
export function localizedTuple(values) {
  return Object.defineProperties([...values], Object.fromEntries(values.flatMap((value, index) => value && typeof value === "object" && value.__uiMessage ? [[index, { get: () => msg(value.__uiMessage, value.values), enumerable: true, configurable: true }]] : [])));
}
/** For explicitly identified system-message state only, never post/chat text. */
export function systemMessage(value) {
  if (typeof value !== "string") return value;
  const original = rendered.get(value);
  if (original) return msg(original.key, original.values);
  if (aliases[value]) return msg(aliases[value]);
  for (const template of systemPatterns) {
    const match = template.pattern.exec(value);
    if (!match) continue;
    const values = Object.fromEntries(template.fields.map((field, index) => [field, match[index + 1]]));
    // These fields contain system vocabulary. Names, quoted titles, and gift
    // names are data and must remain unchanged.
    for (const field of ["target", "reaction", "status"]) {
      if (values[field]) values[field] = enumLabel(values[field]);
    }
    return msg(template.key, values);
  }
  return value;
}

const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const systemPatterns = Object.entries(systemTemplates).map(([key, source]) => {
  const fields = [];
  let offset = 0, pattern = "^";
  for (const match of source.matchAll(/\{(\w+)\}/g)) {
    pattern += escapePattern(source.slice(offset, match.index)) + "(.+?)";
    fields.push(match[1]);
    offset = match.index + match[0].length;
  }
  return { key, fields, pattern: new RegExp(pattern + escapePattern(source.slice(offset)) + "[.!]?$", "u"), specificity: source.replace(/\{\w+\}/g, "").length };
}).sort((a, b) => b.specificity - a.specificity);
