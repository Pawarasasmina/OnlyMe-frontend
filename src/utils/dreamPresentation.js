export function dreamProgress(dream) {
  const received = Number(dream?.receivedStars);
  const goal = Number(dream?.goalStars);
  if (!Number.isFinite(received) || !Number.isFinite(goal) || goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(received / goal * 100)));
}

// A local generated cover, like the prototype's dCov(), without remote placeholder photos.
export function dreamFallbackCover(title = "") {
  let hash = 0;
  for (const character of String(title)) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  const hue = 195 + hash % 65;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="hsl(${hue},55%,35%)"/><stop offset="1" stop-color="hsl(${hue + 30},45%,12%)"/></linearGradient></defs><path fill="url(#bg)" d="M0 0h88v88H0z"/><circle cx="67" cy="20" r="27" fill="#bfe3ff" opacity=".16"/><circle cx="12" cy="76" r="37" fill="#9ccbff" opacity=".12"/><path d="m44 22 5.5 16.5L66 44l-16.5 5.5L44 66l-5.5-16.5L22 44l16.5-5.5z" fill="#d5ebff" opacity=".85"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
