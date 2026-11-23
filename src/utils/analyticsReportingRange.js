const DUBAI_OFFSET = 4 * 3_600_000;

export const analyticsDubaiDate = value => new Date(value.getTime() + DUBAI_OFFSET).toISOString().slice(0, 10);

export function analyticsRangeForPreset(preset, customStart, customEnd, now = new Date()) {
  // Dubai has no daylight-saving changes. UTC setters operate on Dubai's wall clock.
  const start = new Date(now.getTime() + DUBAI_OFFSET);
  const end = new Date(start);
  if (preset === "7d") start.setUTCDate(start.getUTCDate() - 6);
  else if (preset === "90d") start.setUTCDate(start.getUTCDate() - 89);
  else if (preset === "this_month") start.setUTCDate(1);
  else if (preset === "last_month") { start.setUTCMonth(start.getUTCMonth() - 1, 1); end.setUTCDate(0); }
  else if (preset === "this_year") start.setUTCMonth(0, 1);
  else if (preset === "custom") {
    return { startDate: new Date(`${customStart || analyticsDubaiDate(now)}T00:00:00+04:00`).toISOString(), endDate: new Date(`${customEnd || analyticsDubaiDate(now)}T23:59:59.999+04:00`).toISOString() };
  } else if (preset !== "today") start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { startDate: new Date(start.getTime() - DUBAI_OFFSET).toISOString(), endDate: new Date(end.getTime() - DUBAI_OFFSET).toISOString() };
}
