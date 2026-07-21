import { Link } from "react-router-dom";
import { FiGlobe, FiLock } from "react-icons/fi";

export default function PlanetSlot({ planet, premium = false, owner = false, compact = false }) {
  if (!planet) { if (!owner) return null; return <Link className={`planet-slot-empty ${compact ? "is-compact" : ""}`} to={premium ? "/create/premium-world" : "/create/world"}><FiGlobe /><span>Create {premium ? "Premium World" : "World"}</span></Link>; }
  const published = planet.status === "PUBLISHED";
  const editable = owner && ["DRAFT", "CHANGES_REQUESTED"].includes(planet.status);
  const target = editable
    ? `/studio/worlds/${planet.id}/edit`
    : published
      ? `/world/${planet.id}`
      : `/studio/worlds/${planet.id}`;
  const chapters = planet.chapters || [];
  const locked = chapters.filter((chapter) => chapter.locked).length;
  return <Link aria-label={`${planet.kind === "PREMIUM_WORLD" ? "Premium World" : "World"}: ${planet.title}`} className={`planet-slot ${premium ? "is-premium" : ""} ${compact ? "is-compact" : ""}`} to={target}><span className="planet-slot-orb"><span>{planet.planet?.emoji || (premium ? "💠" : "🪐")}</span></span>{compact ? null : <span className="planet-slot-copy"><span className="planet-slot-overline">{premium ? "Premium planet" : "Private World"}</span><strong>{planet.title}</strong><small>{chapters.length ? `${chapters.length} chapters${locked ? ` · ${locked} locked` : ""}` : "New world"}</small>{published ? <span className="planet-slot-price">✦{planet.pricing?.starsAmount}{planet.pricing?.mode === "MONTHLY" ? "/month" : " once"}</span> : owner ? <span className="planet-slot-status"><FiLock /> {planet.status.replaceAll("_", " ")}</span> : null}</span>}</Link>;
}
