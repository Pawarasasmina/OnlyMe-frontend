import { Link } from "react-router-dom";

const PLANET = String.fromCodePoint(0x1FA90);
const FLEX = String.fromCodePoint(0x1F4AA);
const STAR = String.fromCharCode(10022);

function planetFaceEmoji(planet = {}) {
  return planet.faceEmoji || (planet.emoji && planet.emoji !== PLANET ? planet.emoji : "") || FLEX;
}

function numberLabel(value, fallback = 0) {
  const number = Number(value ?? fallback) || 0;
  return number.toLocaleString();
}

export default function ProfileOrbit({ capabilities, planets = [], profile, role }) {
  const premiumPlanets = planets.filter((planet) => planet.kind === "PREMIUM_WORLD");
  if ((!profile?.isCreator && role !== "creator") || (!premiumPlanets.length && !capabilities.isOwner)) return null;

  const bySlot = Object.fromEntries(premiumPlanets.map((planet) => [planet.planet?.slot, planet]));
  const primaryPlanet = bySlot.PREMIUM || premiumPlanets[0];
  const creatorName = profile?.displayName?.split(" ")[0] || "Creator";
  const title = primaryPlanet?.title || "Set up your World";
  const worldTarget = primaryPlanet?.id ? `/world/${primaryPlanet.id}` : "/create/premium-world";
  const owner = Boolean(capabilities.isOwner);
  const price = Number(primaryPlanet?.pricing?.starsAmount || 0);
  const residents = Number(
    primaryPlanet?.subscribers ||
    primaryPlanet?.memberCount ||
    primaryPlanet?.steppedInside ||
    primaryPlanet?.viewCount ||
    0,
  );
  const faceEmoji = planetFaceEmoji(primaryPlanet?.planet);
  const cover = primaryPlanet?.coverMedia?.secureUrl || "";
  const billing = primaryPlanet
    ? `${numberLabel(residents)} residents${price ? ` ${STAR}${numberLabel(price)}/mo` : ""}`
    : "Stories, experiences, and members live here";
  const actionLabel = owner ? "Manage \u203a" : primaryPlanet?.viewer?.isMember ? "Open \u203a" : "Join \u203a";
  const cardClass = `profile-orbit-sky profile-world-prototype-card ${owner ? "is-owner-world" : "is-visitor-world"}`;

  return (
    <section className="profile-planet-orbit">
      <div className="profile-orbit-heading">
        <p className="profile-orbit-overline">
          {owner ? "Your World" : `${creatorName}'s World`}
        </p>
        <p className="profile-orbit-subcopy">One world &mdash; where you step closer.</p>
      </div>

      <Link aria-label={`Open ${title}`} className={cardClass} to={worldTarget}>
        {cover ? <img alt="" className="profile-world-prototype-cover" src={cover} /> : null}
        <span className="profile-orbit-stars" aria-hidden="true" />
        <span className="profile-orbit-ring ring-one" aria-hidden="true" />
        <span className="profile-orbit-ring ring-two" aria-hidden="true" />
        <span className="profile-world-prototype-planet" aria-hidden="true">
          <i>{faceEmoji}</i>
          <b>{PLANET}</b>
        </span>
        <span className="profile-world-prototype-copy">
          <strong>{title}</strong>
          {owner ? <em>{billing}</em> : null}
          <small>{actionLabel}</small>
        </span>
      </Link>
    </section>
  );
}
