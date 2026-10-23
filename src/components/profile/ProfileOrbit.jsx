import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { resolveMediaUrl } from "../../utils/media";

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
  const isInside = !owner && Boolean(primaryPlanet?.viewer?.isMember || ["ACTIVE_PREMIUM_MEMBER", "ENTITLED_WORLD"].includes(primaryPlanet?.access));
  const memberPreview = primaryPlanet?.memberPreview || [];

  if (isInside) {
    return (
      <section className="profile-planet-orbit profile-world-member-section">
        <div className="profile-orbit-heading">
          <p className="profile-orbit-overline">{creatorName}&apos;s World</p>
        </div>
        <Link aria-label={`Open ${title}`} className="profile-world-member-card" to={worldTarget}>
          <span className="profile-world-member-planet" aria-hidden="true"><i>{faceEmoji}</i><b>{PLANET}</b></span>
          <span className="profile-world-member-copy">
            <strong>{title}</strong>
            <small>One world &mdash; where you step closer</small>
          </span>
          <span className="profile-world-member-status">inside &#10003;</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="profile-world-compact-section">
      <Link aria-label={`Open ${title}`} className={`profile-world-compact-card ${owner ? "is-owner-world" : "is-visitor-world"}`} to={worldTarget}>
        <span className="profile-world-compact-planet" aria-hidden="true"><i>{faceEmoji}</i><b>{PLANET}</b></span>
        <span className="profile-world-compact-copy">
          <strong>{owner ? "Your World" : `${creatorName}'s World`}</strong>
          <small>{title}</small>
          {primaryPlanet ? <span className="profile-world-compact-members">
            {memberPreview.length ? <i>{memberPreview.map((member) => <b key={member.id}>{member.avatar ? <img alt="" src={resolveMediaUrl(member.avatar)} /> : String(member.name || member.username || "?")[0]}</b>)}</i> : null}
            <em>{numberLabel(residents)} {residents === 1 ? "member" : "members"}</em>
            {price ? <><u>·</u><strong>{STAR}{numberLabel(price)}</strong><em>a month</em></> : null}
          </span> : <span className="profile-world-compact-members"><em>Stories, experiences, and members live here</em></span>}
        </span>
        <FiChevronRight />
      </Link>
    </section>
  );
}
