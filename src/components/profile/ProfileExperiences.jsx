import { Link } from "react-router-dom";
import { FiArrowUpRight, FiCheck, FiLock, FiPlus } from "react-icons/fi";

export default function ProfileExperiences({ experiences = [], owner = false, creatorName = "Creator" }) {
  if (!owner && !experiences.length) return null;
  return (
    <section className="profile-experiences">
      <header>
        <div><small>STRUCTURED JOURNEYS</small><h2>Experiences</h2><p>Go deeper, chapter by chapter.</p></div>
        {owner && experiences.length < 3 ? <Link aria-label="Create Premium Experience" to="/create/experience"><FiPlus /></Link> : null}
      </header>
      <div className="profile-experience-grid">
        {experiences.map((item) => {
          const accessible = owner || ["ENTITLED_EXPERIENCE", "ACTIVE_PREMIUM_MEMBER"].includes(item.access);
          const target = owner && ["DRAFT", "CHANGES_REQUESTED"].includes(item.status) ? `/studio/experiences/${item.id}/edit` : `/experience/${item.id}`;
          return <Link className="profile-experience-card" key={item.id} to={target}>
            <span className="profile-experience-cover">{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <i>✦</i>}<b>{accessible ? <><FiCheck /> Yours</> : <><FiLock /> Preview</>}</b></span>
            <span className="profile-experience-copy"><small>{item.category || "EXPERIENCE"} · {(item.chapters || []).length} chapters</small><strong>{item.title || "Untitled Experience"}</strong><em>{owner ? item.status?.replaceAll("_", " ") : `An experience by ${creatorName}`}</em></span>
            <FiArrowUpRight />
          </Link>;
        })}
      </div>
      {owner && !experiences.length ? <Link className="profile-experience-empty" to="/create/experience"><FiPlus /> Create your first Premium Experience</Link> : null}
      {owner ? <small className="profile-experience-capacity">{experiences.length} of 3 active Premium Experiences</small> : null}
    </section>
  );
}
