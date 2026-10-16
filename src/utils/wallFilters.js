import { DEFAULT_WALL_FILTERS, WALL_FILTER_TYPES, WALL_FILTER_TOPICS, WALL_FILTER_SORTS } from "../data/wallFilters.js";
const allowed = (options, value, fallback) => options.some((option) => option.value === value) ? value : fallback;
export function readWallFilters(params) {
  const location = params.get("location") || params.get("city") || "";
  return {
    type: allowed(WALL_FILTER_TYPES, params.get("type"), "all"),
    topic: allowed(WALL_FILTER_TOPICS, params.get("topic"), "all"),
    sort: allowed(WALL_FILTER_SORTS, params.get("sort"), "recent"),
    scope: ["nearby", "city", "country", "custom", "worldwide"].includes(params.get("scope")) ? params.get("scope") : location ? "custom" : "worldwide",
    location,
    near: params.get("near") || "",
  };
}
export function writeWallFilters(current, filters) {
  const params = new URLSearchParams(current);
  for (const name of ["filter", "city", "country", "location", "type", "topic", "scope", "sort", "near"]) params.delete(name);
  for (const [name, value] of Object.entries(filters)) {
    if (value && value !== DEFAULT_WALL_FILTERS[name]) params.set(name, value);
  }
  return params;
}
// Keep the server's ranking when combining pages, including shared post IDs.
export function mergeWallPages(current, next) {
  const posts = new Map(current.map((post) => [post.id, post]));
  next.forEach((post) => posts.set(post.id, post));
  return [...posts.values()];
}
