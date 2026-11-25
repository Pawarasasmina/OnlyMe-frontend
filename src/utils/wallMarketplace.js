import { currencyOfWallLocation } from "../../shared/wallCurrency.js";
export const wallCurrencyOfLocation = currencyOfWallLocation;

export function wallCurrencyLabel(currency) {
  if (!currency || ["AED", "SAR", "QAR", "KWD", "BHD", "OMR"].includes(currency)) return currency || "";
  const symbols = { EUR: "€", GBP: "£", USD: "$", JPY: "¥" };
  if (symbols[currency]) return symbols[currency];
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find(part => part.type === "currency")?.value || currency; }
  catch { return currency; }
}

export function normalizeWallPriceInput(value) {
  return String(value ?? "").replace(/[^0-9]/g, "").slice(0, 9).replace(/^0+(?=\d)/, "");
}

export function formatWallPriceInput(value) {
  return normalizeWallPriceInput(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function firstWallPhoto(post) {
  const media = [...(post.media || []), ...(post.images || [])];
  return media.map(item => typeof item === "string" ? { type: "image", url: item } : item).find(item => ["image", "photo"].includes(String(item.type || item.mediaType || "image").toLowerCase()) && (item.url || item.secureUrl));
}
export function wallPricePresentation(post, { locale = "en-US", freeLabel = "Free", location = "" } = {}) {
  if (!["buy & sell", "buy/sell", "offering"].includes(String(post.postType || post.context || "").toLowerCase())) return "";
  const price = post.price;
  let currency = post.currency || post.cur;
  if (price == null || String(price).trim() === "") return "";
  if (!["string", "number"].includes(typeof price) || !Number.isFinite(Number(price)) || Number(price) < 0) return "";
  if (Number(price) === 0) return freeLabel;
  currency = /^[A-Z]{3}$/.test(currency || "") ? currency : wallCurrencyOfLocation(post.location || location, post.countryCode);
  if (!currency) return "";
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(Number(price));
  if (["AED", "SAR", "QAR", "KWD", "BHD", "OMR"].includes(currency)) return currency + " " + number;
  try { return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: digits }).format(Number(price)); }
  catch { return currency + " " + number; }
}
