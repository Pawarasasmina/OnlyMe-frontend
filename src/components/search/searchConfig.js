export const SEARCH_TYPES = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "seens", label: "Seens" },
  { id: "experiences", label: "Experiences" },
  { id: "worlds", label: "Worlds" },
  { id: "wall_notes", label: "Wall Notes" },
];

export const SORT_OPTIONS = [
  { id: "relevant", label: "Relevant" },
  { id: "newest", label: "Newest" },
  { id: "most_saved", label: "Most saved" },
];

export function normalizeSearchInput(value) {
  return String(value || "").replace(/\s+/gu, " ").trim().slice(0, 100);
}
