export const FALLBACK_PROFILE_LANGUAGES = [
  { code: "en-US", name: "English" }, { code: "ar-SA", name: "Arabic" }, { code: "ru-RU", name: "Russian" }, { code: "es-ES", name: "Spanish" }, { code: "fr-FR", name: "French" }, { code: "pt-BR", name: "Portuguese" }, { code: "si-LK", name: "Sinhala" }, { code: "ta-IN", name: "Tamil" },
];
export function profileLanguageCode(value, options = FALLBACK_PROFILE_LANGUAGES) {
  const code = String(value || "en").replace(/_/g, "-").toLowerCase();
  return options.find((option) => option.code.toLowerCase() === code)?.code || options.find((option) => option.code.toLowerCase().split("-")[0] === code)?.code || value;
}
