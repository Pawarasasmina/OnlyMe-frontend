export const IDLE_MOTIONS = ["beat", "sway", "hover", "floaty", "glowp", "rev", "spin", "coin", "flick", "bob2", "pulse"];
export const CELEBRATION_TIERS = ["AUTO", "SMALL", "MID", "BIG", "LEGENDARY", "VAULT"];
export const EFFECT_FAMILIES = ["glass", "fash", "mech", "energy", "launch", "celebr", "lux", "royal", "soft"];
export const OBJECT_EFFECTS = ["none", "car", "moto", "boatx", "laptop", "guitar", "volt", "fire", "drone", "watch", "phones", "camera", "rocketx", "moon", "chessx", "trophy", "bottle", "heartglass", "neon", "ring", "lux", "royal", "jetx", "spin360"];
const VAULT_NAMES = new Set(["Eternity", "Golden Hour", "Nocturne", "Crystal City", "The Universe", "Iced Out", "Private Island", "Wheels Up", "Flagship", "Beyond", "The Imperial"]);
const LEGENDARY_NAMES = new Set(["Fit Check", "Off Road", "The Treasure", "The Deal", "Forever", "Heart of Chrome", "The Moon", "The Peak", "Midnight Moto", "Your World", "First Class", "Full Send", "Time Creates Legends", "Showstopper", "Royalty", "Night Rider", "Dark Water", "Offshore", "The Crown"]);
const OBJECT_PRESETS = {
  car: ["Night Rider", "Off Road", "Full Send", "Showstopper"], moto: ["Midnight Moto"], boatx: ["Offshore", "Flagship", "Dark Water"], laptop: ["Deep Work", "Pole Position"], guitar: ["Unplugged"], volt: ["Voltage"], fire: ["Spark", "Inner Fire"], drone: ["Eyes Up", "Beam Me Up"], watch: ["On Time", "Stargazer", "Full Throttle", "Keep Going", "Eternity", "Heirloom"], phones: ["Lost in Music", "In Sync", "Player One", "Soft Sound", "B-Side"], camera: ["The Moment", "Main Character", "Rewind"], rocketx: ["To The Moon", "Sent With Love", "Liftoff"], moon: ["The Moon", "Little World", "Crystal City", "The Universe", "Private Island", "The Peak", "Take Your Time"], chessx: ["Grandmaster", "Royalty"], trophy: ["Time Creates Legends", "Proud of You", "First Class", "The Deal", "The Treasure", "Golden Hour", "Nocturne", "Iced Out", "The Win"], bottle: ["Focus & Drive", "Aura", "Top Shelf", "Sweet Sip"], heartglass: ["I Love You", "Take My Heart", "Heart of Chrome", "Caught Feelings", "The Pearl", "My Star", "Butterflies", "Forever"], neon: ["Dream Plan Do"], ring: ["Call Me", "Text Me Back"], lux: ["Beyond"], royal: ["The Imperial"], jetx: ["Wheels Up"], spin360: ["Fit Check"]
};
const EFFECT_BY_NAME = Object.fromEntries(Object.entries(OBJECT_PRESETS).flatMap(([effect, names]) => names.map((name) => [name, effect])));
const MOTION_OVERRIDES = { "My Star": "spin", Aura: "spin", Beyond: "spin", "The Universe": "spin", "Stay Focused": "coin", "The Pearl": "floaty", Butterflies: "hover", "Balloon Friend": "floaty", "Make a Wish": "floaty", "Moon Chair": "floaty", "Little World": "floaty", "Beam Me Up": "hover", "Take Your Time": "floaty", "Soft Spot": "beat" };

export function prototypeGiftPreset(gift) {
  const objectEffect = EFFECT_BY_NAME[gift?.name] || "none";
  const idleMotion = MOTION_OVERRIDES[gift?.name] || (["heartglass"].includes(objectEffect) ? "beat" : ["car", "moto"].includes(objectEffect) ? "rev" : objectEffect === "boatx" ? "bob2" : objectEffect === "fire" ? "flick" : ["neon", "volt"].includes(objectEffect) ? "pulse" : ["drone"].includes(objectEffect) ? "hover" : ["rocketx", "moon", "lux"].includes(objectEffect) ? "floaty" : objectEffect === "royal" ? "glowp" : "sway");
  const effectFamily = objectEffect !== "none" ? "glass" : LEGENDARY_NAMES.has(gift?.name) ? "lux" : "glass";
  return { idleMotion, objectEffect, effectFamily, showShine: resolvedGiftTier(gift) !== "SMALL", showHalo: ["BIG", "LEGENDARY", "VAULT"].includes(resolvedGiftTier(gift)) };
}

export function resolvedGiftTier(gift) {
  if (gift?.celebrationTier && gift.celebrationTier !== "AUTO") return gift.celebrationTier;
  if (gift?.category?.name === "The Vault" || VAULT_NAMES.has(gift?.name)) return "VAULT";
  if (gift?.category?.name === "Legendary" || LEGENDARY_NAMES.has(gift?.name)) return "LEGENDARY";
  const stars = Number(gift?.stars || 0);
  if (stars >= 100) return "BIG";
  if (stars >= 25) return "MID";
  return "SMALL";
}

export default function GiftArt({ gift, imageUrl, alt, className = "", imageClassName = "", style, decorative = false, allowShine = false }) {
  const preset = prototypeGiftPreset(gift);
  const shownGift = gift?.animationConfigured ? gift : { ...gift, ...preset };
  const staggerKey = String(gift?.id || gift?.key || gift?.name || "gift");
  const delay = [...staggerKey].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 9, 0);
  const imageStyle = { transform: `translate(${Number(shownGift?.imagePositionX || 0)}%, ${Number(shownGift?.imagePositionY || 0)}%) scale(${Number(shownGift?.displayScale || 100) / 100})`, ...style };
  return <span className={`gift-art gm-${shownGift?.idleMotion || "hover"}${shownGift?.showHalo ? " g-halo" : ""} ${className}`.trim()} style={{ "--md": `${-delay * .61}s` }}>
    <span className="gift-art-image"><img alt={decorative ? "" : (alt ?? gift?.name ?? "Gift")} aria-hidden={decorative || undefined} className={imageClassName} src={imageUrl || gift?.imageUrl} style={imageStyle} /></span>
    {allowShine && shownGift?.showShine ? <i className="gift-art-shine" /> : null}
  </span>;
}
