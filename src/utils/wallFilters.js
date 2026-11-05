import { DEFAULT_WALL_FILTERS, WALL_FILTER_TYPES, WALL_FILTER_TOPICS, WALL_FILTER_SORTS } from "../data/wallFilters.js";
const allowed = (options, value, fallback) => options.some((option) => option.value === value) ? value : fallback;
export function readWallFilters(params) {
  const location = params.get("location") || params.get("city") || "";
  return {
    type: params.get("type") === "right_now" ? "all" : allowed(WALL_FILTER_TYPES, params.get("type"), "all"),
    topic: allowed(WALL_FILTER_TOPICS, params.get("topic"), "all"),
    rightNow: params.get("type") === "right_now" || ["true", "1"].includes(params.get("rightNow")),
    sort: allowed(WALL_FILTER_SORTS, params.get("sort"), "recent"),
    scope: ["nearby", "city", "country", "custom", "worldwide"].includes(params.get("scope")) ? params.get("scope") : location ? "custom" : "worldwide",
    location,
    near: params.get("near") || "",
  };
}
export function writeWallFilters(current, filters) {
  const params = new URLSearchParams(current);
  for (const name of ["note", "filter", "city", "country", "location", "type", "topic", "rightNow", "scope", "sort", "near"]) params.delete(name);
  for (const [name, value] of Object.entries(filters)) {
    if (value && value !== DEFAULT_WALL_FILTERS[name]) params.set(name, value);
  }
  return params;
}
export function toggleWallFilter(filters, key, field) {
  if (key === "right_now") return { ...filters, rightNow: !filters.rightNow };
  return { ...filters, [field]: filters[field] === key ? "all" : key };
}
// Keep the server's ranking when combining pages, including shared post IDs.
export function mergeWallPages(current, next) {
  const posts = new Map(current.map((post) => [post.id, post]));
  next.forEach((post) => posts.set(post.id, post));
  return [...posts.values()];
}
