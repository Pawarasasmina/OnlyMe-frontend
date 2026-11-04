import { getLanguage, getLocale, formatRelative } from "../i18n/runtime.js";
export function relativeTime(value, fallback = "now") {
  if (!value) return fallback === "now" && getLanguage() !== "en" ? formatRelative(0, "second") : fallback;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return fallback === "now" && getLanguage() !== "en" ? formatRelative(0, "second") : fallback;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (getLanguage() !== "en") {
    const [unit, divisor] = diffSeconds < 60 ? ["second", 1] : diffSeconds < 3600 ? ["minute", 60] : diffSeconds < 86400 ? ["hour", 3600] : ["day", 86400];
    return formatRelative(-Math.floor(diffSeconds / divisor), unit, { style: "short" });
  }
  if (diffSeconds < 60) return `${diffSeconds}s`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`;
  return new Intl.DateTimeFormat(getLocale(), { month: "short", day: "numeric" }).format(new Date(timestamp));
}
