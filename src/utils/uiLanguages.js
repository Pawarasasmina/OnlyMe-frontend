export const UI_LANGUAGES = [
  { code: "en", name: "English", locale: "en-US" },
  { code: "ar", name: "العربية", locale: "ar" },
  { code: "ru", name: "Русский", locale: "ru-RU" },
  { code: "uk", name: "Українська", locale: "uk-UA" },
  { code: "es", name: "Español", locale: "es-ES" },
  { code: "pt", name: "Português", locale: "pt-PT" },
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "de", name: "Deutsch", locale: "de-DE" },
];

export function supportedUiLanguage(value) {
  const code = String(value || "").toLowerCase().split(/[-_]/)[0];
  return UI_LANGUAGES.some(item => item.code === code) ? code : null;
}

export function deviceUiLanguage() {
  return (navigator.languages?.length ? navigator.languages : [navigator.language]).map(supportedUiLanguage).find(Boolean) || "en";
}

export function localizedLanguageName(code, language) {
  try {
    const locale = UI_LANGUAGES.find(item => item.code === language)?.locale || "en-US";
    return new Intl.DisplayNames([locale], { type: "language" }).of(code === "pt" ? "pt-PT" : code);
  } catch { return UI_LANGUAGES.find(item => item.code === code)?.name || code; }
}
