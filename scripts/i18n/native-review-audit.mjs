import fs from "node:fs";

const read = language => JSON.parse(fs.readFileSync(`src/i18n/locales/${language}.json`, "utf8"));
const en = read("en");
const report = {
  status: "Native-speaker review pending in all seven languages. Automated checks and implementation corrections are not linguistic approval.",
  scope: "Catalog completeness, broken replacement characters, and long English strings left unchanged. These checks cannot detect every mistranslation.",
  locales: {},
};
for (const language of ["ar", "ru", "uk", "es", "pt", "fr", "de"]) {
  const catalog = read(language);
  report.locales[language] = {
    nativeReview: "pending",
    keys: Object.keys(catalog).length,
    missingKeys: Object.keys(en).filter(key => !Object.hasOwn(catalog, key)),
    brokenCharacterEntries: Object.entries(catalog).filter(([, text]) => text.includes("\u2047")).map(([key, translation]) => ({ key, source: en[key], translation })),
    potentialUntranslatedText: Object.entries(en).filter(([, source]) => source.length > 24 && !/atseen\.com|legal@/i.test(source)).filter(([key, source]) => catalog[key] === source).map(([key, source]) => ({ key, source })),
  };
}
fs.writeFileSync("docs/i18n/native-review-status.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.locales).map(([language, result]) => [language, {
  missing: result.missingKeys.length,
  broken: result.brokenCharacterEntries.length,
  englishCandidates: result.potentialUntranslatedText.length,
  nativeReview: result.nativeReview,
}]))));
