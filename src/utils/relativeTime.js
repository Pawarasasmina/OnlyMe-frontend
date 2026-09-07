export function relativeTime(value, fallback = "now") {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return fallback;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}
