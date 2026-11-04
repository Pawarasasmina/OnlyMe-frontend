import { aliasesForSource, getLanguage, msg } from "./runtime.js";

const codes = {
  INVALID_CREDENTIALS: "common.errorCredentials",
  UNAUTHORIZED: "common.errorSignIn",
  FORBIDDEN: "common.errorForbidden",
  NOT_FOUND: "common.errorNotFound",
  VALIDATION_ERROR: "common.errorValidation",
  RATE_LIMITED: "common.errorRateLimit",
};
export function localizedApiError(error) {
  const data = error?.response?.data;
  const source = typeof data?.message === "string" ? data.message : "";
  const known = aliasesForSource(source);
  if (known) return msg(known);
  if (codes[data?.code]) return msg(codes[data.code]);
  if (getLanguage() === "en" && source && !/<[a-z!]/i.test(source)) return source;
  const status = error?.response?.status;
  return msg(!status ? "common.errorNetwork" : status === 401 ? "common.errorSignIn" : status === 403 ? "common.errorForbidden" : status === 404 ? "common.errorNotFound" : status === 429 ? "common.errorRateLimit" : status < 500 ? "common.errorValidation" : "common.errorServer");
}
export function localizedValidationErrors(value) {
  if (typeof value === "string") return getLanguage() === "en" ? value : msg(aliasesForSource(value) || "common.errorValidation");
  if (Array.isArray(value)) return value.map(localizedValidationErrors);
  if (!value || typeof value !== "object") return value;
  const identifiers = new Set(["field", "path", "value", "code", "param", "type", "location", "received", "expected"]);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, identifiers.has(key) ? entry : localizedValidationErrors(entry)]));
}
