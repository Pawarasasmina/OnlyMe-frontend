import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiClock, FiEdit3, FiEye } from "react-icons/fi";
import PlanetSlot from "./PlanetSlot";
import { resolveMediaUrl } from "../../utils/media";
import { publicationService } from "../../services/publicationService";

function OwnerPlanetAction({ planet }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const startRevision = async () => {
    if (!confirm("Edit this published planet? The approved version will remain live for fans until your new revision is approved.")) return;
    setStarting(true);
    setError("");
    try {
      await publicationService.startPublishedRevision(planet.id, planet.statusVersion);
      navigate(`/studio/worlds/${planet.id}/edit`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to start planet revision");
      setStarting(false);
    }
  };
  if (["DRAFT", "CHANGES_REQUESTED"].includes(planet.status))
    return (
      <Link to={`/studio/worlds/${planet.id}/edit`}>
        <FiEdit3 /> {planet.status === "CHANGES_REQUESTED" ? "Edit and resubmit" : "Continue editing"}
      </Link>
    );
  if (planet.status === "PUBLISHED")
    return (
      <>
        <button disabled={starting} onClick={startRevision} type="button">
          <FiEdit3 /> {starting ? "Opening editor…" : "Edit and resubmit"}
        </button>
        <Link to={`/world/${planet.id}`}>
          <FiEye /> View live
        </Link>
        {error ? <small className="profile-world-action-error">{error}</small> : null}
      </>
    );
  if (planet.status === "PENDING_REVIEW")
    return (
      <button disabled type="button">
        <FiClock /> Waiting for approval
      </button>
    );
  return (
    <span><FiEye /> {planet.status.replaceAll("_", " ")}</span>
  );
}

export default function ProfileOrbit({ capabilities, planets = [], profile, role }) {
  const premiumPlanets = planets.filter((planet) => planet.kind === "PREMIUM_WORLD");
  if ((!profile?.isCreator && role !== "creator") || (!premiumPlanets.length && !capabilities.isOwner)) return null;
  const bySlot = Object.fromEntries(
    premiumPlanets.map((planet) => [planet.planet?.slot, planet]),
  );
  const primaryPlanet = bySlot.PREMIUM || premiumPlanets[0];
  const visible = [primaryPlanet].filter(Boolean);
  const subscribed = !capabilities.isOwner && primaryPlanet?.access === "ACTIVE_PREMIUM_MEMBER";

  if (subscribed) {
    const creatorFirstName = profile?.displayName?.split(" ")[0] || "Creator";
    return (
      <section className="profile-subscribed-world">
        <header><h2>{creatorFirstName}&apos;s World</h2><p>One world — where you step closer.</p></header>
        <Link aria-label={`Open ${primaryPlanet.title}`} className="profile-subscribed-world-card" to={`/world/${primaryPlanet.id}`}>
          <span className="profile-subscribed-stars" aria-hidden="true" />
          <span className="profile-subscribed-orbit orbit-one" aria-hidden="true" />
          <span className="profile-subscribed-orbit orbit-two" aria-hidden="true" />
          <span className="profile-subscribed-symbols" aria-hidden="true"><i>🧠</i><b>{primaryPlanet.planet?.emoji || "🪐"}</b></span>
          <span className="profile-subscribed-copy"><strong>{primaryPlanet.title}</strong><small>you&apos;re inside ✓</small></span>
        </Link>
      </section>
    );
  }

  return (
    <section className="profile-planet-orbit">
      <div className="profile-orbit-heading">
        <div>
          <p className="profile-orbit-overline">{capabilities.isOwner ? "Your World" : `${profile?.displayName?.split(" ")[0] || "Creator"}'s World`}</p>
          <h2>One world - everything about you, by subscription.</h2>
        </div>
      </div>

      <div className="profile-orbit-sky" aria-label="Creator World orbit">
        <div className="profile-orbit-stars" />
        <div className="profile-orbit-ring ring-one" />
        <div className="profile-orbit-ring ring-two" />
        <div className="profile-orbit-person">
          {profile?.avatar ? (
            <img alt={profile.displayName} src={resolveMediaUrl(profile.avatar)} />
          ) : (
            <span>{profile?.displayName?.slice(0, 1) || "@"}</span>
          )}
          <small>@{profile?.username}</small>
        </div>
        <div className="profile-orbit-position position-front">
          <PlanetSlot compact owner={capabilities.isOwner} planet={primaryPlanet} premium />
        </div>
      </div>

      {visible.length ? (
        <div className="profile-world-list">
          {visible.map((planet) => {
            const editable =
              capabilities.isOwner &&
              ["DRAFT", "CHANGES_REQUESTED"].includes(planet.status);
            const target = capabilities.isOwner
              ? editable
                ? `/studio/worlds/${planet.id}/edit`
                : planet.status === "PUBLISHED"
                  ? `/world/${planet.id}`
                  : "/profile"
              : `/world/${planet.id}`;
            return (
              <article
                className={`profile-world-card ${capabilities.isOwner ? "has-owner-actions" : ""}`}
                key={planet.id}
              >
                {planet.coverMedia?.secureUrl ? (
                  <Link className="profile-world-cover" to={target}>
                    <img alt="" src={planet.coverMedia.secureUrl} />
                    <span>{planet.planet?.emoji || "🪐"}</span>
                  </Link>
                ) : null}
                <PlanetSlot
                  owner={capabilities.isOwner}
                  planet={planet}
                  premium={planet.kind === "PREMIUM_WORLD"}
                />
                {capabilities.isOwner ? (
                  <div className="profile-world-owner-actions">
                    <OwnerPlanetAction planet={planet} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="profile-orbit-empty">
          Create your World.
        </p>
      )}
      <p className="profile-orbit-whisper">
        {capabilities.isOwner
          ? "Manage your World here. Published versions are visible to fans."
          : "Tap a planet to step inside."}
      </p>
    </section>
  );
}
