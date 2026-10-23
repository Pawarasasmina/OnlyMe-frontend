export const FALLBACK_PROFILE_LANGUAGES = [
  { code: "en-US", name: "English" }, { code: "ar-SA", name: "Arabic" }, { code: "ru-RU", name: "Russian" }, { code: "uk-UA", name: "Ukrainian" }, { code: "es-ES", name: "Spanish" }, { code: "pt-PT", name: "Portuguese (Portugal)" }, { code: "fr-FR", name: "French" }, { code: "de-DE", name: "German" },
];
export function profileLanguageCode(value, options = FALLBACK_PROFILE_LANGUAGES) {
  const code = String(value || "en").replace(/_/g, "-").toLowerCase();
  return options.find((option) => option.code.toLowerCase() === code)?.code || options.find((option) => option.code.toLowerCase().split("-")[0] === code)?.code || value;
}
