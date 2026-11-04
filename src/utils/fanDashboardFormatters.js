import { getLocale as __uiLocale } from "../i18n/runtime.js";
import { msg as __msg } from "../i18n/runtime.js";
export function formatDate(value, options = {}) {
  if (!value) {
    return __msg("admin.notAvailable");
  }

  return new Intl.DateTimeFormat(__uiLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return __msg("admin.notAvailable");
  }

  return new Intl.DateTimeFormat(__uiLocale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCoins(value) {
  return `✦ ${new Intl.NumberFormat(__uiLocale()).format(Number(value) || 0)}`;
}
