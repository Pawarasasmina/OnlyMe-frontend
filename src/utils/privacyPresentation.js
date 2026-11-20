export function clearReadReceipts(value) {
  if (Array.isArray(value)) return value.map(clearReadReceipts);
  if (!value || typeof value !== "object") return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clearReadReceipts(item)]));
  if (Object.hasOwn(result, "readAt")) { result.delivered = Boolean(result.delivered || result.readAt); result.readAt = null; }
  if (Array.isArray(result.readBy)) result.readBy = [];
  return result;
}

export const isAtSeenStatus = status => Boolean(status && status.isActive !== false && (status.presetKey === "at_seen" || String(status.label || "").replace(/[^a-z]/gi, "").toLowerCase() === "atseen"));
