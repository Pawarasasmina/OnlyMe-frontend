const CYRILLIC = {
  а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", ё: "e", є: "ye", ж: "zh", з: "z", и: "i", і: "i", ї: "yi", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export const normalizeUsernameInput = (value = "") => String(value)
  .replace(/^@+/, "")
  .toLowerCase()
  .replace(/[^a-z0-9._]/g, "")
  .slice(0, 30);

export const usernameFromName = (...parts) => parts.join(" ")
  .toLowerCase()
  .replace(/[а-яёіїєґ]/g, (character) => CYRILLIC[character] ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, ".")
  .replace(/^\.+|\.+$/g, "")
  .replace(/\.{2,}/g, ".")
  .slice(0, 30);

const fitUsername = (value) => value
  .replace(/^\.+|\.+$/g, "")
  .replace(/\.{2,}/g, ".")
  .slice(0, 30)
  .replace(/[._]+$/g, "");

export function usernameSuggestions(firstName, lastName) {
  const first = usernameFromName(firstName).replaceAll(".", "");
  const last = usernameFromName(lastName).replaceAll(".", "");
  if (!first) return [];
  const seed = [...`${first}${last}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  const number = 10 + (seed % 90);
  const candidates = last ? [
    `${first}.${last}`,
    `${first}${last}`,
    `${first}_${last}`,
    `${first}.${last[0]}`,
    `${first[0]}.${last}`,
    `${first}${last}${number}`,
    `the.${first}${last}`,
  ] : [first, `${first}.${number}`, `the.${first}`, `${first}_${number}`];
  return [...new Set(candidates.map(fitUsername))].filter(value => !usernameValidationError(value));
}

export function usernameValidationError(value) {
  if (value.length < 3) return "Username must be at least 3 characters";
  if (value.length > 30) return "Username must be 30 characters or less";
  if (!/^[a-z0-9._]+$/.test(value)) return "Use only lowercase letters, numbers, periods, and underscores";
  if (value.startsWith(".") || value.endsWith(".") || value.includes("..")) return "A period cannot start, end, or repeat";
  return "";
}
