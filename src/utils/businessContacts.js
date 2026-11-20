export function businessContactHrefs(contact = {}) {
  const enabled = new Set(contact.enabled || []);
  const phone = String(contact.call || "").replace(/[^+\d]/g, "");
  const directions = String(contact.directions || "").trim();
  const website = String(contact.website || "").trim();
  const hrefs = {};
  if (enabled.has("call") && /\d/.test(phone)) hrefs.call = `tel:${phone}`;
  if (enabled.has("directions") && directions) hrefs.directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directions)}`;
  try {
    const url = new URL(website);
    if (enabled.has("website") && ["http:", "https:"].includes(url.protocol)) hrefs.website = url.href;
  } catch { /* An empty or invalid contact has no public action. */ }
  return hrefs;
}
