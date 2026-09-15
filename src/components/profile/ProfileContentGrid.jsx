import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArchive,
  FiBarChart2,
  FiBookmark,
  FiBookOpen,
  FiCamera,
  FiChevronLeft,
  FiCheck,
  FiEdit3,
  FiFileText,
  FiGrid,
  FiHeadphones,
  FiEye,
  FiImage,
  FiLink,
  FiLock,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPlusCircle,
  FiRepeat,
  FiScissors,
  FiSend,
  FiTrash2,
  FiUploadCloud,
  FiVideo,
  FiX,
  FiZap,
} from "react-icons/fi";
import SeriesPickerSheet from "../publication/SeriesPickerSheet";
import { publicationService } from "../../services/publicationService";

const icons = { IMAGE: FiImage, VIDEO: FiVideo, AUDIO: FiHeadphones, TEXT: FiFileText };

function findMedia(item) {
  if (item?.coverMedia?.secureUrl) return item.coverMedia;
  return item?.chapters
    ?.flatMap((chapter) => chapter.blocks || [])
    ?.find((block) => block.media?.secureUrl)?.media || null;
}

function descriptionFor(item) {
  const summary = item?.summary || item?.description || "";
  if (summary) return summary;
  const textBlock = item?.chapters
    ?.flatMap((chapter) => chapter.blocks || [])
    ?.find((block) => block.text?.trim());
  return textBlock?.text || "A Seen from this profile.";
}

function viewsFor(item) {
  return Number(item?.viewCount || item?.views || item?.steppedInside || item?.metrics?.views || 0);
}

function creatorNameFor(item) {
  const creator = item?.creator || item?.author || {};
  return creator.name || creator.displayName || creator.username || item?.creatorName || "Creator";
}

function seriesFor(item) {
  const value = item?.series?.name || item?.series?.title || item?.seriesName || item?.seriesTitle || item?.collection?.title || item?.collectionName;
  if (value) return value;
  const seriesTag = (item?.tags || []).find((tag) => String(tag).startsWith("series:"));
  return seriesTag ? String(seriesTag).slice(7).replace(/-/g, " ") : "";
}

function seriesIdFor(item) {
  return item?.seriesId || item?.series?.id || item?.series?._id || "";
}

function formatReadTime(chapters = []) {
  const words = chapters.reduce((total, chapter) => total + (chapter.blocks || []).reduce((count, block) => {
    const text = [block.text, block.label, block.url].filter(Boolean).join(" ");
    return count + text.trim().split(/\s+/u).filter(Boolean).length;
  }, 0), 0);
  return Math.max(1, Math.ceil(words / 220));
}

function compactCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return count.toLocaleString();
}

const profileReactionLabel = {
  LIKE: "\uD83E\uDD1D",
  LOVE: "\u2764\uFE0F",
  FIRE: "\uD83D\uDD25",
  INSIGHTFUL: "\uD83D\uDD25",
  CLAP: "\uD83D\uDC4F",
  LAUGH: "\uD83D\uDE02",
  SEE_YOU: "\uD83D\uDC41\uFE0F",
  WOW: "\uD83D\uDE2E",
  TEARY: "\uD83E\uDD79",
  ADMIRE: "\uD83D\uDE0D",
  SAD: "\uD83D\uDE22",
  HUG: "\uD83E\uDEC2",
  STRONG: "\uD83D\uDCAA",
  PRAY: "\uD83D\uDE4F",
  HUNDRED: "\uD83D\uDCAF",
  SPARKLES: "\u2728",
};

function normalizeProfileEngagement(item = {}, liveEngagement = null) {
  const source = liveEngagement || item.engagement || {};
  return {
    reactionBreakdown: source.reactionBreakdown || item.reactionBreakdown || {},
    reactions: Number(source.reactionCount ?? source.reactions ?? item.reactionCount ?? item.reactions) || 0,
    comments: Number(source.commentCount ?? source.comments ?? item.commentCount) || 0,
    reposts: Number(source.shareCount ?? source.reposts ?? item.shareCount) || 0,
    saved: Boolean(source.viewerSaved || item.viewerSaved),
    topReactions: source.topReactions || item.topReactions || [],
  };
}

function profileReactionCluster(engagement) {
  const top = engagement.topReactions?.length
    ? engagement.topReactions
    : Object.entries(engagement.reactionBreakdown || {})
      .filter(([, count]) => Number(count) > 0)
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .map(([key]) => key);
  return top.slice(0, 3).map((key) => profileReactionLabel[key] || profileReactionLabel.FIRE).join("") || profileReactionLabel.LIKE;
}

function ProfileSeenEngagementBar({ item }) {
  const engagementQuery = useQuery({
    enabled: Boolean(item?.id),
    queryKey: ["seen-engagement", item?.id],
    queryFn: () => publicationService.getSeenEngagement(item.id).then((response) => response.data.data.engagement),
    retry: false,
    staleTime: 30000,
  });
  const engagement = normalizeProfileEngagement(item, engagementQuery.data);
  const target = `/seen/${item.id}`;
  return (
    <div className="seen-engagement-bar profile-seen-engagement-bar">
      <div className="seen-engagement-left">
        <Link aria-label={`Open reactions for ${item.title || "Seen"}`} className="seen-reactions" to={target}>
          <span>{profileReactionCluster(engagement)}</span>
          <b>{compactCount(engagement.reactions)}</b>
        </Link>
        <Link aria-label={`Open comments for ${item.title || "Seen"}`} to={target}>
          <FiMessageSquare />
          <b>{compactCount(engagement.comments)}</b>
        </Link>
        <Link aria-label={`Open reposts for ${item.title || "Seen"}`} to={target}>
          <FiRepeat />
          <b>{compactCount(engagement.reposts)}</b>
        </Link>
      </div>
      <div className="seen-engagement-right">
        <Link aria-label={`Save ${item.title || "Seen"}`} className={engagement.saved ? "is-selected" : ""} to={target}><FiBookmark fill={engagement.saved ? "currentColor" : "none"} /></Link>
        <Link aria-label={`Share ${item.title || "Seen"}`} to={target}><FiSend /></Link>
      </div>
    </div>
  );
}

function ProfileSeenActionRow({ danger = false, icon: Icon, onClick, subtitle = "", title, to = "" }) {
  const content = (
    <>
      <Icon aria-hidden="true" />
      <span>
        <b>{title}</b>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </>
  );
  if (to) {
    return <Link className={danger ? "is-danger seen-owner-action-row" : "seen-owner-action-row"} onClick={onClick} to={to}>{content}</Link>;
  }
  return <button className={danger ? "is-danger seen-owner-action-row" : "seen-owner-action-row"} onClick={onClick} type="button">{content}</button>;
}

function ProfileSeenActionsSheet({ item, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const title = item?.title || "Untitled Seen";
  const chapterCount = item?.chapters?.length || Number(item?.chapterCount || 0);
  const chapterWord = chapterCount === 1 ? "chapter" : "chapters";
  const seriesName = seriesFor(item);
  const metadata = ["Seen", `${chapterCount || 1} ${chapterWord}`].join(" - ");
  const editTarget = `/studio/seens/${item.id}/edit?from=seen`;

  return (
    <div className="seen-feed-options-layer seen-owner-options-layer profile-seen-actions-layer">
      <button aria-label="Close Seen owner actions" className="seen-feed-options-scrim" onClick={onClose} type="button" />
      <section aria-label={`Manage ${title}`} aria-modal="true" className="seen-owner-actions-sheet" role="dialog">
        <span className="seen-feed-options-handle" aria-hidden="true" />
        <header className="seen-owner-actions-header">
          <h2>{title}</h2>
          <p>{metadata}</p>
        </header>
        <div className="seen-owner-actions-list">
          <ProfileSeenActionRow icon={FiUploadCloud} onClick={onClose} title="Share" to={`/seen/${item.id}`} />
          <ProfileSeenActionRow icon={FiPlusCircle} onClick={onClose} title="Add to your story" to={`/seen/${item.id}`} />
          <ProfileSeenActionRow icon={FiBarChart2} onClick={onClose} title="Insights" to={`/seen/${item.id}`} />
          <ProfileSeenActionRow icon={FiEdit3} onClick={onClose} title="Edit" to={editTarget} />
          <ProfileSeenActionRow icon={FiImage} onClick={onClose} title="Change cover" to={`${editTarget}&focus=cover`} />
          <ProfileSeenActionRow icon={FiZap} onClick={onClose} title={isPinnedSeen(item) ? "Unpin" : "Pin to profile"} to={`/seen/${item.id}`} />
          <ProfileSeenActionRow icon={FiGrid} onClick={onClose} title={seriesName ? `Series: ${seriesName}` : "Add to a series"} to={`/seen/${item.id}`} />
          <ProfileSeenActionRow icon={FiArchive} onClick={onClose} subtitle="hidden from profile, stats stay" title="Archive" to={`/seen/${item.id}`} />
          <ProfileSeenActionRow danger icon={FiTrash2} onClick={onClose} subtitle="gone for everyone" title="Delete" to={`/seen/${item.id}`} />
        </div>
      </section>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function reactionsFor(item = {}) {
  const breakdown = item.engagement?.reactionBreakdown || item.reactionBreakdown || {};
  const total = Number(item.engagement?.reactionCount || item.reactionCount || item.reactions || 0);
  const icons = { LIKE: "🤝", LOVE: "❤️", FIRE: "🔥", SAD: "😢", CLAP: "👏" };
  const top = Object.entries(breakdown).filter(([, count]) => Number(count) > 0).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3).map(([key]) => icons[key] || "🔥");
  return { icons: top.join(""), total };
}

function isPinnedSeen(item = {}) {
  return Boolean(item.pinned || item.pin || item.isPinned);
}

function SeriesSeenRow({ item, onMore, owner, showChapterList = false }) {
  const media = findMedia(item);
  const chapters = item.chapters || [];
  const chapterCount = chapters.length || Number(item.chapterCount || 0);
  const chapterWord = chapterCount === 1 ? "chapter" : "chapters";
  const seenTarget = `/seen/${item.id}`;
  const description = descriptionFor(item);
  const firstChapter = chapters[0];
  const views = viewsFor(item);
  const pinned = isPinnedSeen(item);

  return (
    <article className="profile-series-feed-item" data-profile-seen-row={item.id}>
      <div className="profile-series-feed-top">
        <Link className="profile-series-feed-cover" to={seenTarget}>
          {media?.secureUrl ? <img alt={`${item.title} cover`} loading="lazy" src={media.secureUrl} /> : <span><FiBookOpen /></span>}
        </Link>
        <div className="profile-series-feed-copy">
          <div className="profile-series-feed-actions">
            <span><FiEye /> {compactCount(views)}</span>
            {owner ? <span aria-hidden="true"><FiBookmark /></span> : null}
            <button aria-label={`More actions for ${item.title || "Seen"}`} onClick={() => onMore(item)} type="button"><FiMoreHorizontal /></button>
          </div>
          <Link to={seenTarget}>
            {pinned ? <span className="profile-series-feed-pinned">PINNED</span> : null}
            <h3>{item.title || "Untitled Seen"}</h3>
            <small>{[item.category, `${chapterCount} ${chapterWord}`, `~${formatReadTime(chapters)} min`].filter(Boolean).join(" - ")}</small>
            {description ? <p>{description}</p> : null}
          </Link>
        </div>
      </div>
      {showChapterList ? (
        <div className="profile-series-feed-chapters">
          {chapters.slice(0, 3).map((chapter, index) => (
            <Link className="profile-series-feed-chapter" key={chapter.stableChapterId || `${item.id}-${index}`} to={`${seenTarget}?chapter=${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{chapter.title || `Chapter ${index + 1}`}</b>
            </Link>
          ))}
        </div>
      ) : firstChapter ? <Link className="profile-series-feed-chapter" to={`${seenTarget}?chapter=0`}><span>01</span><b>{firstChapter.title || "Chapter 1"}</b></Link> : null}
      <ProfileSeenEngagementBar item={item} />
    </article>
  );
}

function SeenListDetailView({ focusSeenId = "", items, onBack, onMore, owner }) {
  useEffect(() => {
    if (!focusSeenId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const selector = `[data-profile-seen-row="${CSS.escape(String(focusSeenId))}"]`;
      document.querySelector(selector)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusSeenId]);

  return (
    <section className="profile-series-feed-view profile-seen-list-feed-view">
      <header className="profile-series-feed-head">
        <button aria-label="Back to Seens" className="profile-series-feed-back" onClick={onBack} type="button"><FiChevronLeft /></button>
        <h2>My Seens</h2>
        <b>{items.length}</b>
      </header>
      <div className="profile-series-feed-list">
        {items.map((item) => <SeriesSeenRow item={item} key={item.id} onMore={onMore} owner={owner} showChapterList />)}
      </div>
      {!items.length ? <p className="profile-empty-state">No Seens yet.</p> : null}
    </section>
  );
}

function SeriesDetailView({ activeSeries, items, onBack, onMore, owner }) {
  const name = activeSeries?.name || activeSeries?.title || "Untitled Series";
  return (
    <section className="profile-series-feed-view">
      <header className="profile-series-feed-head">
        <button aria-label="Back to Seens" className="profile-series-feed-back" onClick={onBack} type="button"><FiChevronLeft /></button>
        <h2>{name}</h2>
        <span>SERIES</span>
        <b>{items.length}</b>
      </header>
      {activeSeries?.description ? <p className="profile-series-feed-description">{activeSeries.description}</p> : null}
      <div className="profile-series-feed-list">
        {items.map((item) => <SeriesSeenRow item={item} key={item.id} onMore={onMore} owner={owner} />)}
      </div>
      {!items.length ? <p className="profile-empty-state">No Seens in this Series yet.</p> : null}
    </section>
  );
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function SeenShareSheet({ item, onClose, shareUrl }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const title = item?.title || "Untitled Seen";
  const creatorName = creatorNameFor(item);
  const shortUrl = shareUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");

  const copy = async () => {
    setError("");
    try {
      const ok = await copyText(shareUrl);
      if (!ok) throw new Error("Copy failed");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      return true;
    } catch {
      setError("Could not copy link.");
      return false;
    }
  };

  const shareStory = async () => {
    await copy();
    onClose();
    navigate("/create");
  };

  const shareWhatsApp = () => {
    const text = `${title} on @seen - ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div aria-modal="true" className="profile-share-backdrop is-seen-share" onMouseDown={onClose} role="dialog">
      <section className="profile-share-sheet is-seen-share" onMouseDown={(event) => event.stopPropagation()}>
        <span className="profile-share-handle" />
        <h2>Share</h2>
        <div className="profile-share-preview">
          <i className="profile-share-seen-mark"><FiEye aria-hidden="true" /></i>
          <strong>{title}</strong>
          <small>a Seen by {creatorName}</small>
          <span>{shortUrl}</span>
        </div>
        <div className="profile-share-actions">
          <button onClick={copy} type="button">
            <i>{copied ? <FiCheck /> : <FiLink />}</i>
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
          <button onClick={shareStory} type="button">
            <i><FiCamera /></i>
            <span>Your story</span>
          </button>
          <button onClick={shareWhatsApp} type="button">
            <i><FiMessageSquare /></i>
            <span>WhatsApp</span>
          </button>
        </div>
        {error ? <p className="profile-share-error">{error}</p> : null}
      </section>
    </div>
  );
}

function SeenPreviewSheet({ item, onClose, onSeriesChanged, owner }) {
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [localItem, setLocalItem] = useState(item);
  const media = findMedia(item);
  const chapters = item?.chapters || [];
  const views = viewsFor(item);
  const isVideo = ["video", "VIDEO"].includes(media?.resourceType || media?.mediaType || media?.type);
  const editTarget = `/studio/seens/${item.id}/edit?from=drafts`;
  const seenTarget = `/seen/${item.id}`;
  const shareUrl = typeof window === "undefined" ? seenTarget : `${window.location.origin}${seenTarget}`;
  const localSeries = seriesFor(localItem);

  return (
    <div aria-modal="true" className="profile-seen-preview-backdrop" onMouseDown={onClose} role="dialog">
      <section className="profile-seen-preview-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="profile-seen-preview-handle" />
        <div className="profile-seen-preview-media">
          {media?.secureUrl ? (
            isVideo ? <video muted playsInline src={media.secureUrl} /> : <img alt={`${item.title} cover`} src={media.secureUrl} />
          ) : <span className="profile-seen-preview-fallback"><FiBookOpen /></span>}
          <span className="profile-seen-preview-shade" />
          {isVideo ? <em><FiVideo /> 0:15</em> : null}
          <h2>{item.title || "Untitled Seen"}</h2>
        </div>

        <p className="profile-seen-preview-views">
          <FiEye aria-hidden="true" />
          <b>{views ? views.toLocaleString() : "0"}</b> stepped inside
        </p>
        <p className="profile-seen-preview-description">{descriptionFor(item)}</p>

        {chapters.length ? (
          <div className="profile-seen-preview-chapters">
            {chapters.slice(0, 3).map((chapter, index) => (
              <Link className="profile-seen-preview-chapter" key={chapter.stableChapterId || `${item.id}-${index}`} to={seenTarget}>
                <span>{index + 1}</span>
                <b>{chapter.title || `Chapter ${index + 1}`}</b>
              </Link>
            ))}
          </div>
        ) : null}

        {owner || localSeries ? <button className="profile-seen-preview-series" disabled={!owner} onClick={() => owner && setSeriesOpen(true)} type="button">
          <span><FiGrid /></span>
          <span>
            <b>{localSeries ? `Series: ${localSeries}` : "Add to a series"}</b>
            <small>{owner ? (localSeries ? "Tap to change or remove" : "Group Seens into one book") : "Part of this creator's Series"}</small>
          </span>
          {owner ? <i aria-hidden="true">&rsaquo;</i> : null}
        </button> : null}

        <button className="profile-seen-preview-story" type="button"><FiScissors /> Add to your story</button>

        <div className="profile-seen-preview-actions">
          {owner ? <Link to={editTarget}>Edit</Link> : <Link to={seenTarget}>Open</Link>}
          <button onClick={() => setShareOpen(true)} type="button">Share</button>
          <button aria-label="Close Seen preview" className="is-close" onClick={onClose} type="button"><FiX /></button>
        </div>
        {shareOpen ? <SeenShareSheet item={item} onClose={() => setShareOpen(false)} shareUrl={shareUrl} /> : null}
        {seriesOpen ? (
          <SeriesPickerSheet
            isOpen={seriesOpen}
            onClose={() => setSeriesOpen(false)}
            onSelected={(next) => {
              const updated = next ? { ...localItem, series: next, seriesId: next.id } : { ...localItem, series: null, seriesId: null };
              setLocalItem(updated);
              onSeriesChanged?.(updated);
            }}
            seenId={item.id}
            selectedSeries={localItem.series}
            selectedSeriesId={seriesIdFor(localItem)}
          />
        ) : null}
      </section>
    </div>
  );
}

function ProfileContentGrid({
  activeSeriesId = "",
  activeSeenListId = "",
  content = [],
  emptyText = "",
  kind = "content",
  onActiveSeriesChange,
  onActiveSeenListChange,
  owner = false,
  reposted = false,
  series = [],
}) {
  const [activeSeen, setActiveSeen] = useState(null);
  const [actionSeen, setActionSeen] = useState(null);
  const [localActiveSeriesId, setLocalActiveSeriesId] = useState("");
  const visibleContent = useMemo(() => kind === "seens" ? (content || []).filter((item) => item.status === "PUBLISHED" || item.publishedAt) : content || [], [content, kind]);
  const [localContent, setLocalContent] = useState(null);
  const effectiveContent = localContent || visibleContent;
  useEffect(() => {
    setLocalContent(null);
  }, [visibleContent]);

  if (kind === "seens") {
    if (!effectiveContent.length && !series.length) return <div className="profile-empty-state">{emptyText || "No published Seens yet."}</div>;
    const seriesGroups = new Map(series.map((item) => [String(item.id), { ...item, seens: [] }]));
    effectiveContent.forEach((item) => {
      const id = seriesIdFor(item);
      if (!id) return;
      if (!seriesGroups.has(String(id))) seriesGroups.set(String(id), { id: String(id), name: seriesFor(item), title: seriesFor(item), seens: [] });
      seriesGroups.get(String(id)).seens.push(item);
    });
    const seriesTiles = [...seriesGroups.values()].filter((item) => owner || item.seenCount || item.seens.length);
    const selectedSeriesId = activeSeriesId || localActiveSeriesId;
    const activeSeries = selectedSeriesId ? seriesGroups.get(String(selectedSeriesId)) : null;
    const items = activeSeries ? (seriesGroups.get(String(activeSeries.id))?.seens || []) : effectiveContent.filter((item) => !seriesIdFor(item));
    const openSeries = (seriesItem) => {
      const nextId = String(seriesItem.id);
      setLocalActiveSeriesId(nextId);
      onActiveSeriesChange?.(nextId);
    };
    const closeSeries = () => {
      setLocalActiveSeriesId("");
      onActiveSeriesChange?.("");
    };
    const closeSeenList = () => {
      onActiveSeenListChange?.("");
    };
    if (activeSeenListId) {
      return (
        <>
          <SeenListDetailView
            focusSeenId={activeSeenListId}
            items={effectiveContent}
            onBack={closeSeenList}
            onMore={setActionSeen}
            owner={owner}
          />
          {activeSeen ? <SeenPreviewSheet item={activeSeen} onClose={() => setActiveSeen(null)} onSeriesChanged={(updated) => {
            setLocalContent((current) => (current || effectiveContent).map((item) => item.id === updated.id ? updated : item));
            setActiveSeen(updated);
          }} owner={owner} /> : null}
          {actionSeen ? <ProfileSeenActionsSheet item={actionSeen} onClose={() => setActionSeen(null)} /> : null}
        </>
      );
    }
    if (activeSeries) {
      return (
        <>
          <SeriesDetailView
            activeSeries={activeSeries}
            items={items}
            onBack={closeSeries}
            onMore={setActionSeen}
            owner={owner}
          />
          {activeSeen ? <SeenPreviewSheet item={activeSeen} onClose={() => setActiveSeen(null)} onSeriesChanged={(updated) => {
            setLocalContent((current) => (current || effectiveContent).map((item) => item.id === updated.id ? updated : item));
            setActiveSeen(updated);
          }} owner={owner} /> : null}
          {actionSeen ? <ProfileSeenActionsSheet item={actionSeen} onClose={() => setActionSeen(null)} /> : null}
        </>
      );
    }
    return (
      <>
        <div className="profile-seens-grid">
          {seriesTiles.map((seriesItem) => {
            const media = seriesItem.coverMedia || findMedia(seriesItem.seens?.[0]) || seriesItem.previewSeens?.find((item) => item.coverMedia)?.coverMedia;
            const count = seriesItem.seenCount ?? seriesItem.seens?.length ?? 0;
            const name = seriesItem.name || seriesItem.title || "Untitled Series";
            return <button className="profile-seen-tile profile-series-tile" key={seriesItem.id} onClick={() => openSeries(seriesItem)} type="button">
              {media?.secureUrl ? <img alt={`${name} series cover`} loading="lazy" src={media.secureUrl} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
              <span className="profile-seen-shade" />
              <span className="profile-seen-badge">SERIES <b>{count}</b></span>
              <span className="profile-seen-copy"><strong>{name}</strong><small>{count} {count === 1 ? "Seen" : "Seens"}</small></span>
            </button>;
          })}
          {items.map((item) => {
            const chapters = item.chapters?.length || 0;
            const tile = (
              <>
                {item.coverMedia?.secureUrl ? <img alt={`${item.title} cover`} loading="lazy" src={item.coverMedia.secureUrl} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
                <span className="profile-seen-shade" />
                {reposted ? <span className="profile-seen-badge"><FiRepeat /> REPOST</span> : null}
                <span className="profile-seen-copy">
                  <strong>{item.title}</strong>
                  <small>{chapters} {chapters === 1 ? "chapter" : "chapters"}</small>
                </span>
              </>
            );

            return (
              <button className="profile-seen-tile" key={item.id} onClick={() => onActiveSeenListChange ? onActiveSeenListChange(item.id) : setActiveSeen(item)} type="button">
                {tile}
              </button>
            );
          })}
        </div>
        {activeSeen ? <SeenPreviewSheet item={activeSeen} onClose={() => setActiveSeen(null)} onSeriesChanged={(updated) => {
          setLocalContent((current) => (current || effectiveContent).map((item) => item.id === updated.id ? updated : item));
          setActiveSeen(updated);
        }} owner={owner} /> : null}
      </>
    );
  }

  if (!visibleContent.length) return <div className="profile-empty-state">{emptyText || "No published content yet."}</div>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {visibleContent.map((item) => {
        const Icon = item.locked ? FiLock : icons[item.contentType] || FiFileText;
        const media = item.media?.find((entry) => entry.isPrimary) || item.media?.[0] || item.thumbnail;
        const image = !item.locked && media?.mediaType === "IMAGE" ? media.secureUrl : null;
        return (
          <article className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-atseen-line bg-atseen-surface" key={item.id}>
            {image ? <img alt="" className="h-full w-full object-cover" src={image} /> : <Icon className="text-3xl text-atseen-blue/60" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
              <p className="line-clamp-2 text-xs font-bold text-white">{item.title}</p>
              {item.locked ? <p className="mt-1 text-[10px] text-atseen-muted">Locked content</p> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default ProfileContentGrid;

