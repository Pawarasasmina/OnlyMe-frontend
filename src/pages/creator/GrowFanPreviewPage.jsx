import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiCheck, FiStar, FiVolumeX, FiX } from "react-icons/fi";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { creatorService } from "../../services/creatorService";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";

function firstName(value = "") {
  return value.trim().split(/\s+/u)[0] || "this creator";
}

function Avatar({ avatar, name }) {
  const source = resolveMediaUrl(avatar);
  return source
    ? <img alt={name} src={source} />
    : <span>{String(name || "@").slice(0, 1).toUpperCase()}</span>;
}

export default function GrowFanPreviewPage() {
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
    return <main className="grow-fan-preview"><button aria-label="Close preview" className="grow-fan-preview-close" onClick={() => navigate("/grow")} type="button"><FiX /></button><div className="grow-fan-preview-error"><h1>Preview unavailable</h1><p>We couldn’t load your fan view.</p><button onClick={() => { profileQuery.refetch(); growQuery.refetch(); }} type="button">Try again</button></div></main>;
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
    <button aria-label="Close preview" className="grow-fan-preview-close" onClick={() => navigate("/grow")} type="button"><FiX /></button>
    <section className="grow-fan-preview-hero">
      <div className="grow-fan-preview-avatar"><Avatar avatar={profile.avatar} name={profile.displayName} /></div>
      <p>{creatorName.toUpperCase()} INVITED YOU</p>
      <h1>Step into {creatorName}’s world</h1>
      <div className="grow-fan-preview-joined">
        <span>{recent.slice(0, 4).map((row) => <i key={row.id}><Avatar avatar={row.person?.avatar} name={row.person?.name} /></i>)}</span>
        <small>{joinedCount.toLocaleString()} joined through {creatorName}</small>
      </div>
    </section>

    <section className={`grow-fan-preview-experiences ${experiences.length === 1 ? "has-one" : ""}`}>
      {experiences.map((experience) => <Link key={experience.id} to={`/experience/${experience.id}`}>
        {experience.coverMedia?.secureUrl ? <img alt="" src={resolveMediaUrl(experience.coverMedia.secureUrl)} /> : <span className="grow-fan-preview-cover-fallback"><FiStar /></span>}
        <span className="grow-fan-preview-card-shade" />
        <span className="grow-fan-preview-card-title"><i><FiVolumeX /></i><b>{experience.title || "Untitled Experience"}</b></span>
      </Link>)}
      {!experiences.length ? <div className="grow-fan-preview-empty"><FiStar /><b>Your Experiences will appear here</b><small>Publish an Experience to complete the invitation preview.</small></div> : null}
    </section>

    <section className="grow-fan-preview-benefits">
      <p><i><FiCheck /></i><span>The first chapter of everything — free</span></p>
      <p><i><FiStar /></i><span>Founding fan #{Math.max(1, joinedCount + 1).toLocaleString()} — next to your name, for good</span></p>
    </section>

    <div className="grow-fan-preview-cta">
      <Link to={invitationPath}>Join {creatorName}</Link>
      <small>Free · you can leave anytime</small>
    </div>
  </main>;
}
