import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { FiGlobe, FiLock } from "react-icons/fi";

export default function PlanetSlot({ planet, premium = false, owner = false, compact = false }) {
  __useUiLanguage();
  if (!planet) { if (!owner) return null; return <Link className={`planet-slot-empty ${compact ? "is-compact" : ""}`} to={premium ? "/create/premium-world" : "/create/world"}><FiGlobe /><span>{__msg("fanWeb.create")} {premium ? __msg("financial.premiumWorld") : __msg("admin.world")}</span></Link>; }
  const published = planet.status === "PUBLISHED";
  const editable = owner && ["DRAFT", "CHANGES_REQUESTED"].includes(planet.status);
  const target = owner
    ? editable
      ? `/studio/worlds/${planet.id}/edit`
      : published
        ? `/world/${planet.id}`
        : "/profile"
    : `/world/${planet.id}`;
  const chapters = planet.chapters || [];
  const locked = chapters.filter((chapter) => chapter.locked).length;
  return <Link aria-label={`${planet.kind === "PREMIUM_WORLD" ? __msg("financial.premiumWorld") : __msg("admin.world")}: ${planet.title}`} className={`planet-slot ${premium ? "is-premium" : ""} ${compact ? "is-compact" : ""}`} to={target}><span className="planet-slot-orb"><span>{planet.planet?.emoji || (premium ? "💠" : "🪐")}</span></span>{compact ? null : <span className="planet-slot-copy"><span className="planet-slot-overline">{premium ? __msg("profile.premiumPlanet") : __msg("profile.privateWorld")}</span><strong dir="auto">{planet.title}</strong><small>{chapters.length ? __msg("profile.chapters", { value0: chapters.length, value1: locked ? __msg("profile.value0Locked", { value0: locked }) : "" }) : __msg("profile.newWorld")}</small>{published ? <span className="planet-slot-price">✦{planet.pricing?.starsAmount}{planet.pricing?.mode === "MONTHLY" ? __msg("system.perMonthFull") : __msg("profile.once")}</span> : owner ? <span className="planet-slot-status"><FiLock /> {__enumLabel(planet.status.replaceAll("_", " "))}</span> : null}</span>}</Link>;
}
