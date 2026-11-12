import { localizedTuple as __uiTuple } from "../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../i18n/runtime.js";
export const STATUS_PRESETS = Object.freeze({
  at_seen: { color: "#9CCBFF", defaultDurationHours: 2, emoji: "\uD83D\uDC41", get label() { return __msg("constants.atSeen"); } },
  right_now: { color: "#6ECF97", defaultDurationHours: 2, emoji: "\u26A1", get label() { return __msg("constants.rightNow"); } },
  at_gym: { color: "#F3A85E", defaultDurationHours: 3, emoji: "\uD83C\uDFCB\uFE0F", get label() { return __msg("constants.atTheGym"); } },
  celebrating: { color: "#F6D365", defaultDurationHours: 4, emoji: "\uD83C\uDF89", get label() { return __msg("constants.celebrating"); } },
  coffee_break: { color: "#C8A27A", defaultDurationHours: 2, emoji: "\u2615", get label() { return __msg("constants.coffeeBreak"); } },
  traveling: { color: "#B092FF", defaultDurationHours: 6, emoji: "\u2708\uFE0F", get label() { return __msg("constants.traveling"); } },
  working: { color: "#9CCBFF", defaultDurationHours: 4, emoji: "\uD83D\uDCBB", get label() { return __msg("constants.working"); } },
  relaxing: { color: "#A7D8C4", defaultDurationHours: 3, emoji: "\uD83C\uDF19", get label() { return __msg("constants.relaxing"); } },
});

export const STATUS_PRESET_OPTIONS = Object.entries(STATUS_PRESETS).map(([presetKey, preset]) => ({
  presetKey,
  ...preset,
  get label() { return preset.label; },
}));

export const CUSTOM_STATUS_PRESET_KEY = "custom";
export const STATUS_LABEL_MAX_LENGTH = 120;

const cp = (...values) => String.fromCodePoint(...values);

export const PROFILE_STATUS_SUGGESTIONS = Object.freeze(__uiTuple(__uiTuple([
  { __uiMessage: "statusPresets.value0AtSeen", values: { value0: cp(0x1F441) } },
  { __uiMessage: "statusPresets.value0Tennis", values: { value0: cp(0x1F3BE) } },
  { __uiMessage: "statusPresets.value0MorningPerson", values: { value0: cp(0x1F305) } },
  { __uiMessage: "statusPresets.value0AtTheGym", values: { value0: cp(0x1F4AA) } },
  { __uiMessage: "statusPresets.value0Reading", values: { value0: cp(0x1F4DA) } },
  { __uiMessage: "statusPresets.value0CoffeeWalk", values: { value0: cp(0x2615) } },
  { __uiMessage: "statusPresets.value0DeepWork", values: { value0: cp(0x1F3A7) } },
  { __uiMessage: "statusPresets.value0Traveling", values: { value0: cp(0x2708, 0xFE0F) } },
  { __uiMessage: "statusPresets.value0NewSeenSoon", values: { value0: cp(0x270D, 0xFE0F) } },
  { __uiMessage: "statusPresets.value0WritingAChapter", values: { value0: cp(0x1F4D6) } },
  { __uiMessage: "statusPresets.value0ReplyingToEveryone", values: { value0: cp(0x1F4AC) } },
  { __uiMessage: "statusPresets.value0OpenForCalls", values: { value0: cp(0x1F4DE) } },
  { __uiMessage: "statusPresets.value0MyWorldIsOpen", values: { value0: cp(0x1F30D) } },
])));
