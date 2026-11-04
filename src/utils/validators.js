/* i18n-source-migrated */
import { msg as __msg } from "../i18n/runtime.js";
export function isEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

export function isStrongPassword(value) {
  return typeof value === "string"
    && value.length >= 8
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /[0-9]/.test(value);
}

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "atseen",
  "fan",
  "fans",
  "help",
  "login",
  "moderator",
  "profile",
  "register",
  "root",
  "seen",
  "settings",
  "signup",
  "support",
  "system",
  "creator",
  "creators",
  "dashboard",
  "user",
  "users",
  "onlyme",
]);

export function normalizeUsername(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

export function validateUsernameFormat(value) {
  const username = normalizeUsername(value);

  if (!username) return { valid: false, username, reason: "required", message: __msg("settings.usernameIsRequired") };
  if (username.length < 3 || username.length > 30) {
    return {
      valid: false,
      username,
      reason: "length",
      message: __msg("utils.use330LettersNumbersUnderscoresOrPeriods"),
    };
  }
  if (!/^[a-z0-9_.]+$/.test(username)) {
    return {
      valid: false,
      username,
      reason: "invalid",
      message: __msg("utils.use330LettersNumbersUnderscoresOrPeriods"),
    };
  }
  if (/^[_.]|[_.]$/.test(username)) {
    return {
      valid: false,
      username,
      reason: "separator",
      message: __msg("utils.usernameCannotStartOrEndWithASeparator"),
    };
  }
  if (/[_.]{2,}/.test(username)) {
    return {
      valid: false,
      username,
      reason: "separator",
      message: __msg("utils.usernameCannotContainRepeatedSeparators"),
    };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, username, reason: "reserved", message: __msg("settings.thisUsernameIsReserved") };
  }

  return { valid: true, username, reason: null, message: "" };
}
