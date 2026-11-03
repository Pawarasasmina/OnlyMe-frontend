import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LanguageContext } from "./LanguageContext";
import { AuthContext } from "./AuthContext";
import { profileService } from "../services/profileService";
import { activateLanguage, recordLanguageChoice, getLanguage, getRevision, getLocale, msg, subscribeLanguage, formatNumber, formatCurrency, formatDate, formatRelative } from "../i18n/runtime.js";
import { deviceUiLanguage, supportedUiLanguage } from "../utils/uiLanguages";

const STORAGE = "atseen_language", CHOICE = "atseen_language_choice", ACCOUNTS = "atseen_account_languages";
const read = key => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Session language remains usable. */ } };
const readLanguage = () => { try { return supportedUiLanguage(localStorage.getItem(STORAGE)); } catch { return null; } };

export function LanguageProvider({ children }) {
  const auth = useContext(AuthContext);
  const accountId = String(auth?.user?.id || auth?.user?._id || "");
  const account = useRef(accountId);
  account.current = accountId;
  const initialized = useRef(false);
  if (!initialized.current) { activateLanguage(readLanguage() || deviceUiLanguage()); initialized.current = true; }
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => "en");
  const [syncError, setSyncError] = useState(null);
  const saveQueue = useRef(Promise.resolve());

  const persist = useCallback(async (code, owner) => {
    const chosen = supportedUiLanguage(code) || "en";
    const accounts = read(ACCOUNTS) || {};
    if (owner) { accounts[owner] = { language: chosen, pending: true, at: Date.now() }; write(ACCOUNTS, accounts); }
    if (!owner) return { saved: true, guest: true };
    const save = async () => { try {
      if (account.current !== owner) return { saved: false };
      const response = await profileService.updateAccountSettings({ preferredLanguage: chosen === "pt" ? "pt-PT" : chosen });
      const latest = read(ACCOUNTS) || {};
      if (latest[owner]?.language === chosen) { latest[owner] = { language: chosen, pending: false, at: Date.now() }; write(ACCOUNTS, latest); }
      if (account.current === owner && getLanguage() === chosen) setSyncError(null);
      return { saved: true, response };
    } catch {
      if (account.current === owner && getLanguage() === chosen) setSyncError("common.languageSavedLocally");
      return { saved: false };
    } };
    const pending = saveQueue.current.then(save, save);
    saveQueue.current = pending;
    return pending;
  }, []);
  const setLanguage = useCallback(code => {
    const chosen = supportedUiLanguage(code) || "en";
    activateLanguage(chosen);
    recordLanguageChoice();
    write(CHOICE, { language: chosen, owner: account.current || "guest", explicit: true, at: Date.now() });
    return persist(chosen, account.current);
  }, [persist]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE, language); } catch { /* Storage can be disabled. */ }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.language = language;
  }, [language]);

  useEffect(() => {
    if (!accountId) return undefined;
    let cancelled = false;
    const cached = (read(ACCOUNTS) || {})[accountId];
    const choice = read(CHOICE);
    if (cached) activateLanguage(cached.language);
    if (cached?.pending || choice?.explicit && choice.owner === "guest") {
      const chosen = choice?.explicit && choice.owner === "guest" && (!cached?.pending || choice.at >= (cached.at || 0)) ? choice.language : cached.language;
      activateLanguage(chosen);
      write(CHOICE, { ...choice, language: chosen, owner: accountId });
      void persist(chosen, accountId);
    } else {
      const revision = getRevision();
      profileService.getAccountSettings().then(response => {
        if (cancelled || account.current !== accountId || getRevision() !== revision) return;
        const preferences = response.data.data.preferences;
        const stored = preferences?.preferredLanguageExplicit === false ? null : supportedUiLanguage(preferences?.preferredLanguage);
        if (stored) {
          activateLanguage(stored);
          const accounts = read(ACCOUNTS) || {};
          accounts[accountId] = { language: stored, pending: false }; write(ACCOUNTS, accounts);
        }
      }).catch(() => { /* Keep the local language during temporary network failures. */ });
    }
    const retry = () => {
      const pending = (read(ACCOUNTS) || {})[accountId];
      if (pending?.pending && account.current === accountId) void persist(pending.language, accountId);
    };
    window.addEventListener("online", retry);
    return () => { cancelled = true; window.removeEventListener("online", retry); };
  }, [accountId, persist]);

  const value = useMemo(() => ({ language, locale: getLocale(), setLanguage, t: msg, formatNumber, formatCurrency, formatDate, formatRelative, syncError }), [language, setLanguage, syncError]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
