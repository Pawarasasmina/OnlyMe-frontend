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
        <FiEdit3 /> Edit planet details
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
      <span>
        <FiClock /> Under review
      </span>
    );
  return (
    <Link to={`/studio/worlds/${planet.id}`}>
      <FiEye /> View details
    </Link>
  );
}

export default function ProfileOrbit({ capabilities, planets = [], profile, role }) {
  if (role !== "creator" || (!planets.length && !capabilities.isOwner)) return null;
  const bySlot = Object.fromEntries(
    planets.map((planet) => [planet.planet?.slot, planet]),
  );
  const visible = [bySlot.WORLD_1, bySlot.WORLD_2, bySlot.PREMIUM].filter(Boolean);

  return (
    <section className="profile-planet-orbit">
      <div className="profile-orbit-heading">
        <div>
          <p className="profile-orbit-overline">Orbit</p>
          <h2>
            {capabilities.isOwner
              ? "Your worlds"
              : `${profile?.displayName || "Creator"}’s worlds`}
          </h2>
        </div>
        {capabilities.isOwner ? <Link to="/studio/worlds">Manage</Link> : null}
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
        <div className="profile-orbit-position position-left">
          <PlanetSlot compact owner={capabilities.isOwner} planet={bySlot.WORLD_1} />
        </div>
        <div className="profile-orbit-position position-right">
          <PlanetSlot compact owner={capabilities.isOwner} planet={bySlot.WORLD_2} />
        </div>
        <div className="profile-orbit-position position-front">
          <PlanetSlot compact owner={capabilities.isOwner} planet={bySlot.PREMIUM} premium />
        </div>
      </div>

      {visible.length ? (
        <div className="profile-world-list">
          {visible.map((planet) => {
            const editable =
              capabilities.isOwner &&
              ["DRAFT", "CHANGES_REQUESTED"].includes(planet.status);
            const target = editable
              ? `/studio/worlds/${planet.id}/edit`
              : planet.status === "PUBLISHED"
                ? `/world/${planet.id}`
                : `/studio/worlds/${planet.id}`;
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
          Light a planet to place your first World in Orbit.
        </p>
      )}
      <p className="profile-orbit-whisper">
        {capabilities.isOwner
          ? "Edit draft planets here. Published Worlds are visible to fans."
          : "Tap a planet to step inside."}
      </p>
    </section>
  );
}
