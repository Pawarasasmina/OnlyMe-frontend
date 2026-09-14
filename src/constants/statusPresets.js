export const STATUS_PRESETS = Object.freeze({
  at_seen: { color: "#9CCBFF", defaultDurationHours: 2, emoji: "\uD83D\uDC41", label: "At seen" },
  right_now: { color: "#6ECF97", defaultDurationHours: 2, emoji: "\u26A1", label: "Right now" },
  at_gym: { color: "#F3A85E", defaultDurationHours: 3, emoji: "\uD83C\uDFCB\uFE0F", label: "At the gym" },
  celebrating: { color: "#F6D365", defaultDurationHours: 4, emoji: "\uD83C\uDF89", label: "Celebrating" },
  coffee_break: { color: "#C8A27A", defaultDurationHours: 2, emoji: "\u2615", label: "Coffee break" },
  traveling: { color: "#B092FF", defaultDurationHours: 6, emoji: "\u2708\uFE0F", label: "Traveling" },
  working: { color: "#9CCBFF", defaultDurationHours: 4, emoji: "\uD83D\uDCBB", label: "Working" },
  relaxing: { color: "#A7D8C4", defaultDurationHours: 3, emoji: "\uD83C\uDF19", label: "Relaxing" },
});

export const STATUS_PRESET_OPTIONS = Object.entries(STATUS_PRESETS).map(([presetKey, preset]) => ({
  presetKey,
  ...preset,
}));

export const CUSTOM_STATUS_PRESET_KEY = "custom";
export const STATUS_LABEL_MAX_LENGTH = 120;

const cp = (...values) => String.fromCodePoint(...values);

export const PROFILE_STATUS_SUGGESTIONS = Object.freeze([
  `${cp(0x1F441)} At seen`,
  `${cp(0x1F3BE)} Tennis?`,
  `${cp(0x1F305)} Morning person`,
  `${cp(0x1F4AA)} At the gym`,
  `${cp(0x1F4DA)} Reading`,
  `${cp(0x2615)} Coffee walk`,
  `${cp(0x1F3A7)} Deep work`,
  `${cp(0x2708, 0xFE0F)} Traveling`,
  `${cp(0x270D, 0xFE0F)} New Seen soon`,
  `${cp(0x1F4D6)} Writing a chapter`,
  `${cp(0x1F4AC)} Replying to everyone`,
  `${cp(0x1F4DE)} Open for calls`,
  `${cp(0x1F30D)} My World is open`,
]);
