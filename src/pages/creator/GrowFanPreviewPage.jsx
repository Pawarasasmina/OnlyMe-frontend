import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiCheck, FiStar, FiVolumeX, FiX } from "react-icons/fi";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { creatorService } from "../../services/creatorService";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";

function firstName(value = "") {
  return value.trim().split(/\s+/u)[0] || __msg("stories.thisCreator");
}

function Avatar({ avatar, name }) {
  __useUiLanguage();
  const source = resolveMediaUrl(avatar);
  return source
    ? <img alt={name} src={source} />
    : <span>{String(name || "@").slice(0, 1).toUpperCase()}</span>;
}

export default function GrowFanPreviewPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const profileQuery = useQuery({
    queryKey: ["unified-profile", "me"],
    queryFn: () => profileService.getUnifiedMe().then((response) => response.data.data),
    staleTime: 30000,
  });
  const growQuery = useQuery({
    queryKey: ["creator-grow"],
    queryFn: () => creatorService.getGrow().then((response) => response.data.data),
    staleTime: 30000,
  });

  if (profileQuery.isLoading || growQuery.isLoading) {
    return <main className="grow-fan-preview grow-fan-preview-loading"><LoadingSkeleton className="h-28" count={3} /></main>;
  }
  if (profileQuery.isError || growQuery.isError) {
    return <main className="grow-fan-preview"><button aria-label={__msg("admin.closePreview")} className="grow-fan-preview-close" onClick={() => navigate("/grow")} type="button"><FiX /></button><div className="grow-fan-preview-error"><h1>{__msg("creator.previewUnavailable")}</h1><p>{__msg("creator.weCouldnTLoadYourFanView")}</p><button onClick={() => { profileQuery.refetch(); growQuery.refetch(); }} type="button">{__msg("discover.tryAgain")}</button></div></main>;
  }

  const data = profileQuery.data || {};
  const grow = growQuery.data || {};
  const profile = data.profile || {};
  const creatorName = firstName(profile.displayName);
  const experiences = (data.experiences || []).slice(0, 2);
  const recent = grow.recent || [];
  const joinedCount = Number(grow.counts?.total || 0);
  const invitationPath = `/invite/${encodeURIComponent(grow.codes?.creator || "")}`;

  return <main className="grow-fan-preview">
    <button aria-label={__msg("admin.closePreview")} className="grow-fan-preview-close" onClick={() => navigate("/grow")} type="button"><FiX /></button>
    <section className="grow-fan-preview-hero">
      <div className="grow-fan-preview-avatar"><Avatar avatar={profile.avatar} name={profile.displayName} /></div>
      <p>{creatorName.toUpperCase()} {__msg("profile.invitedYou")}</p>
      <h1>{__msg("creator.stepInto")} {creatorName}{__msg("creator.sWorld")}</h1>
      <div className="grow-fan-preview-joined">
        <span>{recent.slice(0, 4).map((row) => <i key={row.id}><Avatar avatar={row.person?.avatar} name={row.person?.name} /></i>)}</span>
        <small>{joinedCount.toLocaleString(__uiLocale())} {__msg("creator.joinedThrough")} {creatorName}</small>
      </div>
    </section>

    <section className={`grow-fan-preview-experiences ${experiences.length === 1 ? "has-one" : ""}`}>
      {experiences.map((experience) => <Link key={experience.id} to={`/experience/${experience.id}`}>
        {experience.coverMedia?.secureUrl ? <img alt="" src={resolveMediaUrl(experience.coverMedia.secureUrl)} /> : <span className="grow-fan-preview-cover-fallback"><FiStar /></span>}
        <span className="grow-fan-preview-card-shade" />
        <span className="grow-fan-preview-card-title"><i><FiVolumeX /></i><b>{experience.title || __msg("profile.untitledExperience")}</b></span>
      </Link>)}
      {!experiences.length ? <div className="grow-fan-preview-empty"><FiStar /><b>{__msg("creator.yourExperiencesWillAppearHere")}</b><small>{__msg("creator.publishAnExperienceToCompleteTheInvitationPreview")}</small></div> : null}
    </section>

    <section className="grow-fan-preview-benefits">
      <p><i><FiCheck /></i><span>{__msg("creator.theFirstChapterOfEverythingFree")}</span></p>
      <p><i><FiStar /></i><span>{__msg("creator.foundingFan")}{Math.max(1, joinedCount + 1).toLocaleString(__uiLocale())} {__msg("creator.nextToYourNameForGood")}</span></p>
    </section>

    <div className="grow-fan-preview-cta">
      <Link to={invitationPath}>{__msg("profile.join")} {creatorName}</Link>
      <small>{__msg("creator.freeYouCanLeaveAnytime")}</small>
    </div>
  </main>;
}
