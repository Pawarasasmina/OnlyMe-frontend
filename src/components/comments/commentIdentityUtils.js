export function commentFirstName(author = {}, fallback = "User") {
  const value = String(author.name || author.displayName || author.username || fallback).trim();
  return value.split(/\s+/)[0] || fallback;
}

export function sameCommentAuthor(left = {}, right = {}) {
  const leftId = String(left.id || left._id || "");
  const rightId = String(right.id || right._id || "");
  if (leftId && rightId) return leftId === rightId;
  const leftUsername = String(left.username || "").toLowerCase();
  const rightUsername = String(right.username || "").toLowerCase();
  return Boolean(leftUsername && rightUsername && leftUsername === rightUsername);
}
