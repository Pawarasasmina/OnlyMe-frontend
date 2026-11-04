import { IntlMessageFormat } from "intl-messageformat";
import en from "./locales/en.json" with { type: "json" };
import ar from "./locales/ar.json" with { type: "json" };
import ru from "./locales/ru.json" with { type: "json" };
import uk from "./locales/uk.json" with { type: "json" };
import es from "./locales/es.json" with { type: "json" };
import pt from "./locales/pt.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import de from "./locales/de.json" with { type: "json" };
import aliases from "./aliases.json" with { type: "json" };
import optionMessages from "./option-messages.json" with { type: "json" };
import enumMessages from "./enum-messages.json" with { type: "json" };
import { UI_LANGUAGES, supportedUiLanguage } from "../utils/uiLanguages.js";

export const catalogs = { en, ar, ru, uk, es, pt, fr, de };
const listeners = new Set(), cache = new Map(), missing = new Map(), rendered = new Map();
let language = "en", revision = 0;
export const getLanguage = () => language;
export const getRevision = () => revision;
export const recordLanguageChoice = () => { revision += 1; };
export const aliasesForSource = source => aliases[source];
export const optionLabel = value => optionMessages[value] ? msg(optionMessages[value]) : value;
export function enumLabel(value) {
  const code = String(value || "UNKNOWN").trim().replace(/[\s-]+/g, "_").toUpperCase();
  return enumMessages[code] ? msg(enumMessages[code]) : optionLabel(value);
}
export const getLocale = () => UI_LANGUAGES.find(item => item.code === language)?.locale || "en-US";
export function subscribeLanguage(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function activateLanguage(code) {
  const next = supportedUiLanguage(code) || "en";
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
  return original ? msg(original.key, original.values) : aliases[value] ? msg(aliases[value]) : value;
}
