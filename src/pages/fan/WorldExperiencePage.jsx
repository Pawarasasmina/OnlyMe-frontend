import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiBookmark, FiImage, FiMoreHorizontal, FiPlay, FiRefreshCw } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { contentService } from "../../services/contentService";
import { resolveMediaUrl } from "../../utils/media";

function primaryImage(content) {
  const media = content?.media?.find((entry) => entry.isPrimary) || content?.media?.[0] || content?.thumbnail;
  return resolveMediaUrl(media?.secureUrl || "");
}

function creatorFirstName(creator) {
  return String(creator?.name || creator?.username || "Creator").split(" ")[0];
}

function chapterList(content) {
  const base = [content?.category, ...(content?.tags || [])].filter(Boolean);
  const labels = base.length ? base : ["origin", "route", "notes"];
  return labels.slice(0, 4).map((label, index) => {
    const title = String(label).replace(/^\w/, (match) => match.toUpperCase());
    return index === 0 ? `Why ${title} matters` : title;
  });
}

function WorldDoor({ content, onStepInside }) {
  const creator = content.creator;

  return (
    <div className="grid min-h-[58dvh] place-items-center rounded-[28px] border border-atseen-line bg-[radial-gradient(circle_at_center,#172130_0%,#090c11_62%,#05070a_100%)] px-5 py-10 text-center shadow-glow">
      <div className="max-w-md">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-black bg-atseen-blue/15 text-sm font-extrabold uppercase tracking-[0.18em] text-atseen-blue shadow-glow" aria-hidden="true">
          World
        </div>
        <h1 className="mt-7 text-3xl font-extrabold tracking-tight text-atseen-text sm:text-4xl">{content.title}</h1>
        <p className="mt-3 text-sm text-atseen-muted">a world by {creatorFirstName(creator)}</p>
        <button
          className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full border border-atseen-blue/40 bg-atseen-blue/10 px-10 text-sm font-extrabold text-atseen-blue transition hover:border-atseen-blue hover:bg-atseen-blue/15"
          onClick={onStepInside}
          type="button"
        >
          Step inside
        </button>
      </div>
    </div>
  );
}

function WorldHero({ content }) {
  const cover = primaryImage(content);

  return (
    <section className="overflow-hidden rounded-[28px] border border-atseen-line bg-[#080b10] shadow-glow">
      <div className="relative aspect-[4/5] min-h-[430px] bg-atseen-surface sm:aspect-[16/10] sm:min-h-[360px]">
        {cover ? (
          <img alt={`${content.title} cover`} className="h-full w-full object-cover" src={cover} />
        ) : (
          <div className="grid h-full place-items-center text-4xl text-atseen-blue/70">
            <FiImage aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b10] via-black/25 to-black/25" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-white">
            <FiPlay aria-hidden="true" />
            0:30 - playing
          </p>
          <h1 className="max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{content.title}</h1>
        </div>
      </div>
    </section>
  );
}

function CreatorSummary({ content }) {
  const creator = content.creator || {};

  return (
    <section className="rounded-[24px] border border-atseen-line bg-atseen-surface p-4">
      <Link className="inline-flex max-w-full items-center gap-3 rounded-2xl transition hover:text-atseen-blue" to={creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/orbit"}>
        <FanAvatar name={creator.name} size="h-11 w-11" src={creator.avatar} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-atseen-text">
            {creator.name || "Creator"}
            {creator.isVerified ? <VerifiedBadge /> : null}
          </span>
          <span className="mt-0.5 block text-xs text-atseen-muted">30 seconds - why this world exists</span>
        </span>
      </Link>
      {content.description ? <p className="mt-5 text-base leading-8 text-white/90">{content.description}</p> : null}
      {content.body ? <p className="mt-3 text-sm leading-7 text-atseen-muted">{content.body}</p> : null}
    </section>
  );
}

function WorldGallery({ content }) {
  const gallery = [content.thumbnail, ...(content.media || [])].filter(Boolean).slice(0, 3);
  if (!gallery.length) return null;

  return (
    <section className="grid grid-cols-3 gap-3">
      {gallery.map((item, index) => {
        const src = resolveMediaUrl(item.secureUrl);
        return (
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface" key={`${item.assetId || src}-${index}`}>
            {src ? (
              <img alt={`${content.title} moment ${index + 1}`} className="h-full w-full object-cover" src={src} />
            ) : (
              <div className="grid h-full place-items-center text-atseen-blue">
                <FiImage aria-hidden="true" />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function JourneyPanel({ chapters }) {
  return (
    <section className="rounded-[24px] border border-atseen-line bg-atseen-surface p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">The Journey</p>
      <div className="mt-4 grid gap-2">
        {chapters.map((chapter, index) => (
          <button
            className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-left transition hover:border-atseen-blue/50"
            key={`${chapter}-${index}`}
            type="button"
          >
            <span className="w-5 text-xs font-bold text-atseen-dim">{index + 1}</span>
            <span className="min-w-0 flex-1 text-sm font-bold text-atseen-text">{chapter}</span>
            <span className="text-atseen-blue">&gt;</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WorldMetaPanel({ content }) {
  return (
    <section className="rounded-[24px] border border-atseen-blue/25 bg-atseen-blue/10 p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">World</p>
      <p className="mt-2 text-sm font-bold text-atseen-text">{content.category || "Experience"}</p>
      {content.tags?.length ? <p className="mt-2 text-xs leading-5 text-atseen-muted">{content.tags.slice(0, 4).join(" / ")}</p> : null}
    </section>
  );
}

function WorldInside({ content }) {
  const chapters = chapterList(content);

  return (
    <div className="grid gap-4">
      <WorldHero content={content} />
      <CreatorSummary content={content} />
      <WorldGallery content={content} />
      <JourneyPanel chapters={chapters} />
      <WorldMetaPanel content={content} />
    </div>
  );
}

function WorldExperiencePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inside, setInside] = useState(false);
  const query = useQuery({
    queryKey: ["world", id],
    queryFn: () => contentService.getPublishedContent(id).then((response) => response.data.data.content),
    enabled: Boolean(id),
  });
  const content = query.data;
  const title = useMemo(() => content?.title || "World", [content?.title]);

  return (
    <div className="text-atseen-text">
      <main className="w-full">
        <div className="mb-4 flex items-center gap-3 rounded-[24px] border border-atseen-line bg-atseen-surface/70 p-3">
          <button aria-label="Go back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-atseen-line bg-atseen-surface text-atseen-text transition hover:border-atseen-blue" onClick={() => navigate(-1)} type="button">
            <FiArrowLeft aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold text-atseen-text">{inside ? title : "Step inside"}</h1>
            <p className="truncate text-xs text-atseen-muted">Worlds live on profiles and Orbit - never as a follower-count feed.</p>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-atseen-line bg-atseen-surface text-atseen-blue" type="button" aria-label="Save world">
            <FiBookmark aria-hidden="true" />
          </button>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-atseen-line bg-atseen-surface text-atseen-muted" type="button" aria-label="More world actions">
            <FiMoreHorizontal aria-hidden="true" />
          </button>
        </div>

        {query.isLoading ? (
          <div className="grid min-h-[58dvh] place-items-center rounded-[28px] border border-atseen-line bg-atseen-surface">
            <FiRefreshCw className="animate-spin text-2xl text-atseen-blue" aria-hidden="true" />
          </div>
        ) : query.isError ? (
          <div className="grid min-h-[58dvh] place-items-center rounded-[28px] border border-atseen-line bg-atseen-surface p-8 text-center">
            <div>
              <h2 className="text-xl font-extrabold">We could not load this World.</h2>
              <button className="mt-5 rounded-full border border-atseen-blue/40 px-5 py-2 text-sm font-bold text-atseen-blue" onClick={() => query.refetch()} type="button">Try again</button>
            </div>
          </div>
        ) : inside ? (
          <WorldInside content={content} />
        ) : (
          <WorldDoor content={content} onStepInside={() => setInside(true)} />
        )}
      </main>
    </div>
  );
}

export default WorldExperiencePage;
