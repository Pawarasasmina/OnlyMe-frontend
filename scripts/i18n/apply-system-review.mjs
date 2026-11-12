import fs from "node:fs";
const locales = ["en", "ar", "ru", "uk", "es", "pt", "fr", "de"];
const rows = JSON.parse(fs.readFileSync("src/i18n/reviewed-system.json", "utf8"));
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const en = read("src/i18n/locales/en.json"), aliases = read("src/i18n/aliases.json"), options = read("src/i18n/option-messages.json");
const invariant = ["© OpenStreetMap", "· Seen", "Spotlight", "{value0} MB", "{value0} KB", "James Carter", "Dario Conte", "Zoe Miller", "Nora Wells", "Elsa Berg", "Ana Patel", "Luca Romano", "Lina · Paris", "Maya · Dubai"];
const removed = Object.keys(en).filter(key => ["FeedPost", "ProfileMedia", "SeenEngagement"].includes(en[key]));
for (const key of removed) delete en[key];
for (const [source, key] of Object.entries(aliases)) if (removed.includes(key)) delete aliases[source];
for (const [source, key] of Object.entries(options)) if (removed.includes(key)) delete options[source];
for (const row of rows) {
  const keys = Object.keys(en).filter(key => en[key] === row[0]);
  if (!keys.length) {
    const key = `system.label.${row[0].replace(/[^a-zA-Z]/g, "").toLowerCase()}`;
    en[key] = row[0]; keys.push(key);
  }
  aliases[row[0]] = keys[0]; options[row[0]] = keys[0];
}
for (const [index, locale] of locales.entries()) {
  const file = `src/i18n/locales/${locale}.json`, data = locale === "en" ? en : read(file);
  for (const key of removed) delete data[key];
  for (const [key, text] of Object.entries(en)) if (invariant.includes(text)) data[key] = text;
  for (const row of rows) for (const [key, text] of Object.entries(en)) if (text === row[0]) data[key] = row[index];
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
for (const [file, data] of [["src/i18n/aliases.json", aliases], ["src/i18n/option-messages.json", options]]) fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const approved = read("src/i18n/approved-identical.json");
approved.all = [...new Set([...approved.all, ...invariant])];
approved.fr = [...new Set([...approved.fr, "Date"])];
approved.de = [...new Set([...approved.de, "Status: {value0}", "Start ›", "~{value0} min"])];
fs.writeFileSync("src/i18n/approved-identical.json", JSON.stringify(approved, null, 2) + "\n");
