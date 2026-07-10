export function isEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

export function isStrongPassword(value) {
  return typeof value === "string" && value.length >= 8;
}
