export const PREAUTH_INTERESTS_KEY = "atseen_pre_auth_interests";

export function readPreAuthInterests() {
  try {
    const value = JSON.parse(localStorage.getItem(PREAUTH_INTERESTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function writePreAuthInterests(interests) {
  localStorage.setItem(PREAUTH_INTERESTS_KEY, JSON.stringify(interests));
}

export function clearPreAuthInterests() {
  localStorage.removeItem(PREAUTH_INTERESTS_KEY);
}
