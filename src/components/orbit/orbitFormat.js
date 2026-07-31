export function formatOrbitLocation(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return [value.city, value.country].filter(Boolean).join(", ");
}

export function formatOrbitStatusLine(item) {
  return [item?.status, formatOrbitLocation(item?.location) || item?.locationLabel].filter(Boolean).join(" - ");
}
