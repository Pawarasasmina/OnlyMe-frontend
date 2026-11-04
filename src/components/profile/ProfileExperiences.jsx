import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

const STAR = "✦";
function updatedLabel(value) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value || Date.now()).getTime()) / 86400000));
  return days < 1 ? __msg("profile.updToday") : `upd ${days}d`;
}

export default function ProfileExperiences({ creatorUsername = "", experiences = [], onCreate, owner = false }) {
  __useUiLanguage();
  if (!owner && !experiences.length) return null;
  return <section className="profile-experiences profile-experiences-reference">
    <header><h2>{__msg("profile.experiences")}</h2><span className="profile-experience-head-actions"><Link to={owner ? "/experiences" : `/profile/${encodeURIComponent(creatorUsername)}/experiences`}>{__msg("profile.seeAll_c3ddfe")}</Link>{owner ? <button aria-label={__msg("profile.createExperience")} onClick={onCreate} type="button"><FiPlus /></button> : null}</span></header>
    {experiences.slice(0, 3).map((item) => <Link className="profile-experience-reference-row" key={item.id} to={`/experience/${item.id}`}>
      <span className="profile-experience-reference-cover">{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <i>{STAR}</i>}</span>
      <span className="profile-experience-reference-copy"><strong>{item.title || __msg("profile.untitledExperience")}</strong><small>{(item.chapters || []).length} {__msg("profile.chapters_7790c6")} {item.category || __msg("profile.lifestyle")} · {updatedLabel(item.updatedAt)}</small><span><b>{item.pricing?.mode === "FREE" ? __msg("profile.free") : <>{STAR}{Number(item.pricing?.starsAmount || 0).toLocaleString(__uiLocale())} {__msg("profile.oneTime")}</>}</b><em aria-hidden="true"><i /><i /></em><small>{Number(item.ownerCount || 0).toLocaleString(__uiLocale())} {__msg("profile.ownIt")}</small></span></span>
    </Link>)}
    {!experiences.length && owner ? <Link className="profile-experience-empty" to="/create/experience"><FiPlus /> {__msg("profile.createYourFirstExperience")}</Link> : null}
  </section>;
}
