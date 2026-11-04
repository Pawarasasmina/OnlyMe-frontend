import { useContext, useSyncExternalStore } from "react";
import { LanguageContext } from "../context/LanguageContext.js";
import { subscribeLanguage, getLanguage, getLocale, activateLanguage, msg, formatNumber, formatCurrency, formatDate, formatRelative } from "../i18n/runtime.js";

export function useLanguage() {
  const context = useContext(LanguageContext);
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => "en");
  return context || { language, locale: getLocale(), setLanguage: activateLanguage, t: msg, formatNumber, formatCurrency, formatDate, formatRelative };
}
