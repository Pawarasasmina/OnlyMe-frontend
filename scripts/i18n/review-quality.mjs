import fs from "node:fs";

const read = name => JSON.parse(fs.readFileSync(name, "utf8"));
const en = read("src/i18n/locales/en.json");
const reviewed = read("src/i18n/reviewed.json");
const reviewedSources = new Set([
  ...Object.values(reviewed.messages).map(row => row[0]),
  ...reviewed.sourceOverrides.map(row => row[0]),
  ...["reviewed-labels", "reviewed-details", "reviewed-final-labels", "reviewed-activity", "reviewed-verification"].flatMap(name => read(`src/i18n/${name}.json`).map(row => row[0])),
  ...Object.keys(read("src/i18n/reviewed-settings.json")).map(key => en[key]),
  ...Object.values(read("src/i18n/reviewed-reasons.json")).map(row => row[0]),
  ...Object.values(read("src/i18n/reviewed-counts.json")).map(row => row[0]),
]);
const patterns = {
  pt: /\b(?:vocês?|sua|suas|seu|seus|senha|tela|salvar)\b/iu,
  fr: /\b(?:vous|votre|vos|veuillez)\b/iu,
  de: /\b(?:Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer)\b/u,
};
const locales = {};
for (const locale of ["ar", "ru", "uk", "es", "pt", "fr", "de"]) {
  const catalog = read(`src/i18n/locales/${locale}.json`);
  const candidates = [];
  for (const [key, source] of Object.entries(en)) {
    if (reviewedSources.has(source)) continue;
    const translation = catalog[key] || "";
    const reasons = [];
    if (patterns[locale]?.test(translation)) reasons.push("Check informal address / regional vocabulary in context");
    if (source.length >= 120 && translation.length < source.length * 0.3) reasons.push("Possible omitted content");
    if (reasons.length) candidates.push({ key, source, translation, reasons });
  }
  locales[locale] = { candidates: candidates.length, messages: candidates };
}
const reviewedKeys = Object.values(en).filter(source => reviewedSources.has(source)).length;
const report = {
  status: "Linguistic review in progress; structural key coverage is not linguistic approval",
  note: "Heuristics only. Third-person pronouns may be correct. Absence from this report does not establish translation quality. Reviewed resources were checked during implementation, not certified by a professional translator.",
  keys: Object.keys(en).length,
  keysWithImplementationReview: reviewedKeys,
  keysWithoutRecordedImplementationReview: Object.keys(en).length - reviewedKeys,
  locales,
};
fs.writeFileSync("docs/i18n/linguistic-review.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, locales: Object.fromEntries(Object.entries(locales).map(([locale, item]) => [locale, item.candidates])) }, null, 2));
