import { Link } from "react-router-dom";
import { FiArrowUpRight, FiCheck, FiLock, FiPlus } from "react-icons/fi";

export default function ProfileExperiences({ experiences = [], owner = false, creatorName = "Creator" }) {
  if (!owner && !experiences.length) return null;
  return (
    <section className="profile-experiences">
      <header>
        <div>{!owner ? <small>STRUCTURED JOURNEYS</small> : null}<h2>Experiences {!owner ? <span className="profile-coming-soon-badge">Coming soon</span> : null}</h2>{!owner ? <p>Guided creator journeys, chapter by chapter.</p> : null}</div>
        {owner ? <span className="profile-experience-head-actions">{experiences.length > 1 ? <span>See all</span> : null}{experiences.length < 3 ? <Link aria-label="Create Premium Experience" to="/create/experience"><FiPlus /></Link> : null}</span> : null}
      </header>
      <div className="profile-experience-grid">
        {experiences.map((item) => {
          const free = item.pricing?.mode === "FREE";
          const accessible = owner || free || ["PUBLIC_FULL", "ENTITLED_EXPERIENCE", "ACTIVE_PREMIUM_MEMBER"].includes(item.access);
          const purchased = !owner && !free && accessible;
          const ownerCount = Number(item.ownerCount) || 0;
          const ownerLabel = `${ownerCount} ${ownerCount === 1 ? "owner" : "owners"}`;
          return <Link className="profile-experience-card" key={item.id} to={`/experience/${item.id}`}>
            <span className="profile-experience-cover">{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <i>✦</i>}{!owner ? <b>{free ? <><FiCheck /> Free</> : purchased ? <><FiCheck /> Yours</> : <><FiLock /> ✦{item.pricing?.starsAmount} once</>}</b> : null}</span>
            <span className="profile-experience-copy"><small>{item.category || "EXPERIENCE"} · {(item.chapters || []).length} chapters</small><strong>{item.title || "Untitled Experience"}</strong><em>{owner ? free ? `Free · ${ownerLabel}` : `✦${Number(item.pricing?.starsAmount || 0).toLocaleString()} · one-time   ${ownerLabel}` : free ? `Free · view every chapter · ${ownerLabel}` : purchased ? `Purchased · permanent access · ${ownerLabel}` : `Premium · one-time unlock by ${creatorName} · ${ownerLabel}`}</em></span>
            <FiArrowUpRight />
          </Link>;
        })}
      </div>
      {owner && !experiences.length ? <Link className="profile-experience-empty" to="/create/experience"><FiPlus /> Create your first Premium Experience</Link> : null}
    </section>
  );
}
