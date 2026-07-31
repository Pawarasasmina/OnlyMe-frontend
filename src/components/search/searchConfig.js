export const SEARCH_TYPES = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "worlds", label: "Worlds" },
  { id: "seens", label: "Seens" },
  { id: "posts", label: "Posts" },
  { id: "places", label: "Places" },
  { id: "journeys", label: "Journeys" },
  { id: "saved", label: "Saved" },
];

export const SORT_OPTIONS = [
  { id: "relevant", label: "Relevant" },
  { id: "newest", label: "Newest" },
  { id: "most_saved", label: "Most saved" },
];

export function normalizeSearchInput(value) {
  return String(value || "").replace(/\s+/gu, " ").trim().slice(0, 100);
}
