/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
export const SEARCH_TYPES = [
  { id: "all", get label() { return __msg("search.top"); } },
  { id: "people", get label() { return __msg("search.people"); } },
  { id: "seens", label: "Seen" },
  { id: "experiences", get label() { return __msg("profile.experiences"); } },
  { id: "worlds", get label() { return __msg("orbit.worlds"); } },
  { id: "wall_notes", get label() { return __msg("fanWeb.wall"); } },
];

export const SORT_OPTIONS = [
  { id: "relevant", get label() { return __msg("search.relevant"); } },
  { id: "newest", get label() { return __msg("search.newest"); } },
  { id: "most_saved", get label() { return __msg("search.mostSaved"); } },
];

export function normalizeSearchInput(value) {
  return String(value || "").replace(/\s+/gu, " ").trim().slice(0, 100);
}
