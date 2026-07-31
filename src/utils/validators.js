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

  if (!username) return { valid: false, username, reason: "required", message: "Username is required." };
  if (username.length < 3 || username.length > 30) {
    return {
      valid: false,
      username,
      reason: "length",
      message: "Use 3-30 letters, numbers, underscores, or periods.",
    };
  }
  if (!/^[a-z0-9_.]+$/.test(username)) {
    return {
      valid: false,
      username,
      reason: "invalid",
      message: "Use 3-30 letters, numbers, underscores, or periods.",
    };
  }
  if (/^[_.]|[_.]$/.test(username)) {
    return {
      valid: false,
      username,
      reason: "separator",
      message: "Username cannot start or end with a separator.",
    };
  }
  if (/[_.]{2,}/.test(username)) {
    return {
      valid: false,
      username,
      reason: "separator",
      message: "Username cannot contain repeated separators.",
    };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, username, reason: "reserved", message: "This username is reserved." };
  }

  return { valid: true, username, reason: null, message: "" };
}
