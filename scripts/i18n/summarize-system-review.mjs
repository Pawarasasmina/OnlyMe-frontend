import fs from "node:fs";
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const en = read("src/i18n/locales/en.json");
const rows = read("docs/i18n/system-translation-review.json");
const reviewed = new Set(read("src/i18n/reviewed-system.json").map(row => row[0]));
const invariant = new Set(read("src/i18n/approved-identical.json").all);
const explicit = new Set(["activity.savePeopleCount", "activity.savedByPeople", "social.item", "payments.activeSubscriptions", "system.perMonth", "system.perMonthFull", "system.previewUsage", "system.chapterPosition", "system.interestsRemaining", "system.interestsSelected", "system.noMatchingTargets", "system.herWorld", "system.languageLoadError"]);
const locales = ["ar", "ru", "uk", "es", "pt", "fr", "de"];
const summary = locales.map(language => ({
  language,
  status: "native-language-review-required",
  scope: "New or repaired static-catalog drafts in this update. Existing translations retain their previous review status. Keys and placeholders have been validated; that does not certify linguistic quality.",
  keys: [...new Set(rows.filter(row => row.language === language).flatMap(row => row.keys || []).filter(key => en[key] && !reviewed.has(en[key]) && !invariant.has(en[key]) && !explicit.has(key)))].sort(),
}));
fs.writeFileSync("docs/i18n/system-translation-review.json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(Object.fromEntries(summary.map(row => [row.language, row.keys.length]))));
