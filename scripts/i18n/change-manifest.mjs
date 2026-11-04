import fs from "node:fs";
import path from "node:path";
import { filesIn } from "./audit.mjs";

const baseline = "tmp/i18n-before";
const source = filesIn("src").filter(file => /\.(?:jsx?|css|json)$/.test(file));
const modified = [], withoutSnapshot = [];
if (!fs.existsSync(path.join(baseline, "src"))) throw new Error("Pre-localization source snapshot is unavailable; cannot infer a reliable change manifest.");
for (const file of source) {
  const before = path.join(baseline, file);
  if (!fs.existsSync(before)) withoutSnapshot.push(file.replaceAll("\\", "/"));
  else if (!fs.readFileSync(file).equals(fs.readFileSync(before))) modified.push(file.replaceAll("\\", "/"));
}
const report = {
  baseline: "Partial per-file source snapshots taken before localization edits, including pre-existing user changes",
  note: "Files without snapshots cannot be classified as new or modified from this evidence. Supporting package/configuration/test/backend changes are documented separately in REPORT.md. This is not a list of all uncommitted project changes.",
  withoutSnapshot,
  modified,
};
fs.writeFileSync("docs/i18n/changed-source-files.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ withoutSnapshot: withoutSnapshot.length, modified: modified.length }));
