import { Link } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

const STAR = "✦";
function updatedLabel(value) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value || Date.now()).getTime()) / 86400000));
  return days < 1 ? "upd today" : `upd ${days}d`;
}

export default function ProfileExperiences({ creatorUsername = "", experiences = [], onCreate, owner = false }) {
  if (!owner && !experiences.length) return null;
  return <section className="profile-experiences profile-experiences-reference">
    <header><h2>Experiences</h2><span className="profile-experience-head-actions"><Link to={owner ? "/experiences" : `/profile/${encodeURIComponent(creatorUsername)}/experiences`}>See all ›</Link>{owner ? <button aria-label="Create Experience" onClick={onCreate} type="button"><FiPlus /></button> : null}</span></header>
    {experiences.slice(0, 3).map((item) => <Link className="profile-experience-reference-row" key={item.id} to={`/experience/${item.id}`}>
      <span className="profile-experience-reference-cover">{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <i>{STAR}</i>}</span>
      <span className="profile-experience-reference-copy"><strong>{item.title || "Untitled Experience"}</strong><small>{(item.chapters || []).length} chapters · {item.category || "Lifestyle"} · {updatedLabel(item.updatedAt)}</small><span><b>{item.pricing?.mode === "FREE" ? "Free" : <>{STAR}{Number(item.pricing?.starsAmount || 0).toLocaleString()} · one-time</>}</b><em aria-hidden="true"><i /><i /></em><small>{Number(item.ownerCount || 0).toLocaleString()} own it</small></span></span>
    </Link>)}
    {!experiences.length && owner ? <Link className="profile-experience-empty" to="/create/experience"><FiPlus /> Create your first Experience</Link> : null}
  </section>;
}
