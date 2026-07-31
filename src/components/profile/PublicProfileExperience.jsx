import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight, FiEye, FiImage, FiLock, FiMapPin, FiMessageCircle, FiMoreHorizontal, FiZap } from "react-icons/fi";
import SeeYouButton from "../orbit/SeeYouButton";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useAuth } from "../../hooks/useAuth";
import { orbitService } from "../../services/orbitService";
import { resolveMediaUrl } from "../../utils/media";

function metricLabel(value) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(value);
}

function contentImage(item) {
  const media = item?.media?.find((entry) => entry.isPrimary) || item?.media?.[0] || item?.thumbnail;
  return media?.secureUrl || "";
}

function DirectAccessCard({ profile }) {
  if (!profile.ppmEnabled) return null;
  return (
    <Link className="group flex items-center gap-3 rounded-2xl border border-atseen-blue/35 bg-atseen-blue/10 px-4 py-3 transition hover:border-atseen-blue" to="/messages">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-atseen-blue/35 bg-atseen-bg text-atseen-blue">
        <FiZap aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-atseen-text">Direct Access</span>
        <span className="mt-0.5 block truncate text-[11px] text-atseen-muted">Ask a private question. Priority reply when available.</span>
      </span>
      <FiChevronRight className="text-atseen-blue transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function DreamCard({ dream }) {
  if (!dream) return null;
  const complete = dream.status === "completed";
  return (
    <section className="rounded-2xl border border-atseen-line bg-atseen-surface p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-atseen-text">
        <span aria-hidden="true">{"\u2726"}</span>
        My Dream Experience
      </p>
      <div className="rounded-2xl bg-atseen-bg/70 p-4">
        <p className="flex items-center gap-2 text-sm font-extrabold text-atseen-text">
          <span aria-hidden="true">{dream.emoji || "\u2726"}</span>
          {dream.title}
        </p>
        <p className="mt-2 text-xs italic leading-5 text-atseen-muted">
          {complete ? "This dream is complete and ready to revisit." : "A public dream this creator is building with their community."}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className={complete ? "font-bold text-atseen-success" : "font-bold text-atseen-blue"}>
            {complete ? "Dream Completed" : "Dream Active"}
          </span>
          <Link className="font-bold text-atseen-blue hover:text-white" to="/messages">View Experience</Link>
        </div>
      </div>
    </section>
  );
}

function SeeMe({ content = [] }) {
  const previews = content.slice(0, 3);
  if (!previews.length) return null;
  return (
    <section>
      <h2 className="text-sm font-extrabold text-atseen-text">See me</h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {previews.map((item) => {
          const image = contentImage(item);
          return (
            <Link className="relative aspect-video overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface transition hover:border-atseen-blue/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-atseen-blue sm:aspect-[4/3]" key={item.id} to={`/worlds/${item.id}`}>
              {image ? <img alt={`${item.title} preview`} className="h-full w-full object-cover" src={resolveMediaUrl(image)} /> : <div className="grid h-full place-items-center text-atseen-blue"><FiImage /></div>}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 p-2">
                <p className="line-clamp-1 text-[10px] font-bold text-white">{item.title}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MostUseful({ item }) {
  if (!item) return null;
  const image = contentImage(item);
  const tags = item.tags?.slice(0, 2).join(" · ");
  return (
    <section>
      <h2 className="text-sm font-extrabold text-atseen-text">Most useful</h2>
      <Link className="mt-3 block overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface transition hover:border-atseen-blue/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-atseen-blue" to={`/worlds/${item.id}`}>
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
          <div className="min-w-0">
            <p className="text-[11px] text-atseen-muted">
              <span className="text-atseen-blue">{"\u2726"}</span> {item.category || "World"}{tags ? ` · ${tags}` : ""}
            </p>
            <h3 className="mt-2 line-clamp-2 text-base font-extrabold leading-6 text-atseen-text">{item.title}</h3>
            {item.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-atseen-muted">{item.description}</p> : null}
          </div>
          <div className="aspect-[16/10] overflow-hidden rounded-xl bg-atseen-bg">
            {image ? <img alt={`${item.title} preview`} className="h-full w-full object-cover" src={resolveMediaUrl(image)} /> : <div className="grid h-full place-items-center text-atseen-blue"><FiImage /></div>}
          </div>
        </div>
      </Link>
    </section>
  );
}

function Experiences({ content = [] }) {
  return (
    <section>
      <h2 className="text-sm font-extrabold text-atseen-text">Experiences</h2>
      {content.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {content.slice(0, 6).map((item) => {
            const image = contentImage(item);
            return (
              <Link className="relative aspect-square overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface transition hover:border-atseen-blue/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-atseen-blue" key={item.id} to={`/worlds/${item.id}`}>
                {image ? <img alt={`${item.title} cover`} className="h-full w-full object-cover" src={resolveMediaUrl(image)} /> : <div className="grid h-full place-items-center text-atseen-blue"><FiImage /></div>}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <p className="line-clamp-2 text-xs font-bold text-white">{item.title}</p>
                  {item.locked ? <p className="mt-1 flex items-center gap-1 text-[10px] text-white/60"><FiLock /> Locked</p> : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-atseen-line p-6 text-center text-sm text-atseen-muted">Public experiences will appear here.</div>
      )}
    </section>
  );
}

function PublicProfileExperience({ data }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dream, profile, publicContent = [], publicMetrics = {}, viewerCapabilities = {} } = data;
  const sentSignalsQuery = useQuery({
    queryKey: ["orbit", "signals", "sent", user?.id || user?._id],
    queryFn: () => orbitService.getSentSignals().then((response) => response.data.data.signals || []),
    enabled: Boolean((user?.id || user?._id) && profile?.id),
    staleTime: 30_000,
  });
  const cover = resolveMediaUrl(profile.cover);
  const avatar = resolveMediaUrl(profile.avatar);
  const statusLine = [profile.orbitStatus, profile.location].filter(Boolean).join(" - ");
  const seenTargetIds = new Set((sentSignalsQuery.data || []).map((signal) => signal.targetUserId));
  const hasSeenSignal = seenTargetIds.has(profile.id);

  return (
    <div className="min-h-screen bg-atseen-bg px-4 py-5 text-atseen-text sm:px-6">
      <main className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1.05fr)_380px]">
        <section className="overflow-hidden rounded-[26px] border border-atseen-line bg-[#080b10] shadow-glow">
          <div className="relative h-[190px] bg-[radial-gradient(circle_at_top,#202936,#080b10_70%)] sm:h-[230px]">
            {cover ? <img alt={`${profile.displayName} cover`} className="h-full w-full object-cover opacity-80" src={cover} /> : null}
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#080b10]" />
            <button aria-label="Go back" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:border-atseen-blue" onClick={() => navigate(-1)} type="button">
              <FiArrowLeft aria-hidden="true" />
            </button>
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <SeeYouButton compact hasSeenSignal={hasSeenSignal} targetName={profile.displayName} targetUserId={profile.id} />
              {viewerCapabilities.canMessage ? (
                <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 text-xs font-bold text-white backdrop-blur transition hover:border-atseen-blue" to="/messages">
                  <FiMessageCircle aria-hidden="true" />
                  Message
                </Link>
              ) : null}
              <button className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur" type="button" aria-label="More profile actions">
                <FiMoreHorizontal aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="px-5 pb-5 pt-5 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <FanAvatar className="border-4 border-atseen-bg shadow-glow" name={profile.displayName} size="h-[112px] w-[112px]" src={avatar} />
                <h1 className="mt-4 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-atseen-text">
                  {profile.displayName}
                  {profile.verified ? <VerifiedBadge /> : null}
                </h1>
                <p className="mt-1 text-sm text-atseen-muted">@{profile.username}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-atseen-line bg-atseen-surface px-5 py-3 text-center sm:min-w-[300px]">
                <div><p className="text-lg font-extrabold">{metricLabel(publicMetrics.publishedContentCount)}</p><p className="text-[10px] text-atseen-muted">Posts</p></div>
                <div><p className="text-lg font-extrabold">{metricLabel(publicMetrics.supporterCount)}</p><p className="text-[10px] text-atseen-muted">Supporters</p></div>
                <div><p className="text-lg font-extrabold">{metricLabel(publicMetrics.worldCount)}</p><p className="text-[10px] text-atseen-muted">Worlds</p></div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {profile.orbitStatus ? <span className="rounded-full border border-atseen-line bg-atseen-surface px-3 py-1.5 text-xs font-bold text-atseen-text"><span className="mr-1 text-atseen-blue">{"\u25cf"}</span>{profile.orbitStatus}</span> : null}
              {profile.location ? <span className="inline-flex items-center gap-1 text-xs text-atseen-muted"><FiMapPin className="text-atseen-blue" /> {profile.location}</span> : null}
              {profile.categories?.slice(0, 4).map((category) => <span className="rounded-full bg-atseen-blue/10 px-3 py-1.5 text-xs font-semibold text-atseen-blue" key={category}>{category}</span>)}
            </div>

            {profile.orbitQuote || profile.bio ? <p className="mt-4 max-w-2xl text-sm italic leading-6 text-atseen-muted">&quot;{profile.orbitQuote || profile.bio}&quot;</p> : null}
            {statusLine ? <p className="mt-2 text-xs text-atseen-dim">{statusLine}</p> : null}
          </div>
        </section>

        <aside className="grid gap-4 lg:row-span-2 lg:content-start">
          <DreamCard dream={dream} />
          <DirectAccessCard profile={profile} />
          <section className="rounded-2xl border border-atseen-line bg-atseen-surface p-4">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Orbit actions</p>
            <div className="grid grid-cols-2 gap-2">
              <SeeYouButton hasSeenSignal={hasSeenSignal} targetName={profile.displayName} targetUserId={profile.id} />
              <Link className="inline-flex items-center justify-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-sm font-bold text-atseen-text transition hover:border-atseen-blue/50" to="/messages">
                <FiMessageCircle aria-hidden="true" />
                Message
              </Link>
            </div>
            <p className="mt-3 flex items-center gap-1 text-[11px] text-atseen-muted"><FiEye /> Private signals do not appear publicly.</p>
          </section>
        </aside>

        <section className="grid gap-6 rounded-[26px] border border-atseen-line bg-[#080b10] p-5 sm:p-6">
          <SeeMe content={publicContent} />
          <MostUseful item={publicContent[0]} />
          <Experiences content={publicContent} />
        </section>
      </main>
    </div>
  );
}

export default PublicProfileExperience;
