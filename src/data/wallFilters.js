export const WALL_FILTER_TYPES = [
  { value: "buy_sell", label: "Buy & Sell" },
  { value: "all", label: "All posts" },
  { value: "looking_for", label: "Looking for" },
  { value: "offering", label: "Offering" },
  { value: "question", label: "Questions" },
  { value: "event", label: "Events" },
  { value: "need_help", label: "Need Help" },
  { value: "recommendation", label: "Recommendation" },
  { value: "right_now", label: "Right Now" },
];
export const WALL_FILTER_TOPICS = [
  { value: "meet_people", label: "Meet people" },
  { value: "housing", label: "Housing" },
  { value: "kids_family", label: "Kids & Family" },
  { value: "all", label: "All topics" },
  { value: "buy_sell", label: "Buy / Sell" },
  { value: "places", label: "Places" },
  { value: "food", label: "Food" },
  { value: "travel", label: "Travel" },
  { value: "work", label: "Work" },
  { value: "wellness", label: "Wellness" },
  { value: "learning", label: "Learning" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "services", label: "Services" },
  { value: "community", label: "Community" },
];
export const WALL_FILTER_SORTS = [
  { value: "recent", label: "Recent" },
  { value: "popular", label: "Popular" },
  { value: "nearby", label: "Nearby" },
];
export const DEFAULT_WALL_FILTERS = { type: "all", topic: "all", scope: "worldwide", sort: "recent", location: "", near: "" };
