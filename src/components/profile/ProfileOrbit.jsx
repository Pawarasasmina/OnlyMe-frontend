import { Link } from "react-router-dom";

const PLANET = String.fromCodePoint(0x1FA90);
const FLEX = String.fromCodePoint(0x1F4AA);

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
  const price = Number(primaryPlanet?.pricing?.starsAmount || 0);
  const capacity = Number(primaryPlanet?.worldSeatCapacity || primaryPlanet?.capacity || primaryPlanet?.seatLimit || 0);
  const residents = Number(
    primaryPlanet?.subscribers ||
    primaryPlanet?.memberCount ||
    primaryPlanet?.steppedInside ||
    primaryPlanet?.viewCount ||
    0,
  );
  const faceEmoji = planetFaceEmoji(primaryPlanet?.planet);
  const cover = primaryPlanet?.coverMedia?.secureUrl || "";
  const meta = primaryPlanet
    ? [
      primaryPlanet.kind === "PREMIUM_WORLD" ? "Premium World" : "World",
      primaryPlanet.status ? primaryPlanet.status.toLowerCase().replaceAll("_", " ") : "",
      capacity ? `${numberLabel(capacity)} seats` : "capacity not set",
    ].filter(Boolean).join(" · ")
    : "Create your subscription World";
  const billing = primaryPlanet
    ? `${numberLabel(residents)} residents${price ? ` · ✦${numberLabel(price)}/mo` : ""}`
    : "Stories, experiences, and members live here";

  return (
    <section className="profile-planet-orbit">
      <div className="profile-orbit-heading">
        <p className="profile-orbit-overline">
          {capabilities.isOwner ? "Your World" : `${creatorName}'s World`}
        </p>
      </div>

      <Link aria-label={`Open ${title}`} className="profile-orbit-sky profile-world-prototype-card" to={worldTarget}>
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
          <em>{meta}</em>
          <small>{billing}</small>
        </span>
      </Link>
    </section>
  );
}
