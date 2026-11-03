import { getLocale as __uiLocale } from "../i18n/runtime.js";
export function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat(__uiLocale(), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
