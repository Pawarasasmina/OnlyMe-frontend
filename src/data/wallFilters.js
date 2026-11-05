/* i18n-source-migrated */
import { msg as __msg } from "../i18n/runtime.js";
export const WALL_FILTER_TYPES = [
  { value: "buy_sell", sourceLabel: "Buy & Sell", get label() { return __msg("fanWeb.buySell"); } },
  { value: "all", sourceLabel: "All posts", get label() { return __msg("data.allPosts"); } },
  { value: "looking_for", sourceLabel: "Looking for", get label() { return __msg("fanWeb.lookingFor"); } },
  { value: "offering", sourceLabel: "Offering", get label() { return __msg("fanWeb.offering"); } },
  { value: "question", sourceLabel: "Questions", get label() { return __msg("data.questions"); } },
  { value: "event", sourceLabel: "Events", get label() { return __msg("data.events"); } },
  { value: "need_help", sourceLabel: "Need Help", get label() { return __msg("data.needHelp"); } },
  { value: "recommendation", sourceLabel: "Recommendation", get label() { return __msg("fanWeb.recommendation"); } },
  { value: "right_now", sourceLabel: "Right Now", get label() { return __msg("data.rightNow"); } },
];
export const WALL_FILTER_TOPICS = [
  { value: "meet_people", sourceLabel: "Meet people", get label() { return __msg("data.meetPeople"); } },
  { value: "housing", sourceLabel: "Housing", get label() { return __msg("data.housing"); } },
  { value: "kids_family", sourceLabel: "Kids & Family", get label() { return __msg("data.kidsFamily"); } },
  { value: "all", sourceLabel: "All topics", get label() { return __msg("data.allTopics"); } },
  { value: "buy_sell", sourceLabel: "Buy / Sell", get label() { return __msg("data.buySell"); } },
  { value: "places", sourceLabel: "Places", get label() { return __msg("data.places"); } },
  { value: "food", sourceLabel: "Food", get label() { return __msg("fanWeb.food"); } },
  { value: "travel", sourceLabel: "Travel", get label() { return __msg("data.travel"); } },
  { value: "work", sourceLabel: "Work", get label() { return __msg("data.work"); } },
  { value: "wellness", sourceLabel: "Wellness", get label() { return __msg("data.wellness"); } },
  { value: "learning", sourceLabel: "Learning", get label() { return __msg("data.learning"); } },
  { value: "lifestyle", sourceLabel: "Lifestyle", get label() { return __msg("profile.lifestyle"); } },
  { value: "services", sourceLabel: "Services", get label() { return __msg("data.services"); } },
  { value: "community", sourceLabel: "Community", get label() { return __msg("data.community"); } },
];
export const WALL_FILTER_SORTS = [
  { value: "recent", sourceLabel: "Recent", get label() { return __msg("fanWeb.recent"); } },
  { value: "popular", sourceLabel: "Popular", get label() { return __msg("data.popular"); } },
  { value: "nearby", sourceLabel: "Nearby", get label() { return __msg("discover.nearby"); } },
];
export const DEFAULT_WALL_FILTERS = { type: "all", topic: "all", rightNow: false, scope: "worldwide", sort: "recent", location: "", near: "" };
