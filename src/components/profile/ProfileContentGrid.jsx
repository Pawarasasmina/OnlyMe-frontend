import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArchive,
  FiBarChart2,
  FiBookmark,
  FiBookOpen,
  FiChevronLeft,
  FiEdit3,
  FiFileText,
  FiGrid,
  FiHeadphones,
  FiEye,
  FiImage,
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
import PublicationCoverMedia from "../publication/PublicationCoverMedia";
import ContentEmptyState from "../shared/ContentEmptyState";
import AppShareSheet from "../share/ShareSheet";
import { publicationService } from "../../services/publicationService";
import { useAuth } from "../../hooks/useAuth";
import { SeenFeedItem } from "../../pages/social/SeenFeedPage";

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
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const engagementQuery = useQuery({
    enabled: Boolean(item?.id),
    queryKey: ["seen-engagement", item?.id],
    queryFn: () => publicationService.getSeenEngagement(item.id).then((response) => response.data.data.engagement),
    retry: false,
    staleTime: 30000,
  });
  const engagement = normalizeProfileEngagement(item, engagementQuery.data);
  const refresh = (response) => {
    const next = response.data?.data?.engagement;
    if (next) queryClient.setQueryData(["seen-engagement", item.id], next);
    else engagementQuery.refetch();
  };
  const reactionMutation = useMutation({
    mutationFn: (reaction) => engagementQuery.data?.viewerReaction === reaction
      ? publicationService.removeSeenReaction(item.id)
      : publicationService.reactToSeen(item.id, reaction),
    onSuccess: (response) => { refresh(response); setReactionsOpen(false); },
  });
  const commentMutation = useMutation({
    mutationFn: (text) => publicationService.commentOnSeen(item.id, text),
    onSuccess: (response) => { refresh(response); setComment(""); },
  });
  const repostMutation = useMutation({
    mutationFn: () => engagementQuery.data?.viewerShared ? publicationService.removeSeenShare(item.id) : publicationService.shareSeen(item.id),
    onSuccess: refresh,
  });
  const saveMutation = useMutation({ mutationFn: () => publicationService.toggleSeenSave(item.id), onSuccess: refresh });
  const submitComment = (event) => {
    event.preventDefault();
    const text = comment.trim();
    if (text) commentMutation.mutate(text);
  };
  const shareUrl = `${window.location.origin}/seen/${encodeURIComponent(item.id)}`;
  return (
    <>
    <div className="seen-engagement-bar profile-seen-engagement-bar">
      <div className="seen-engagement-left">
        <button aria-expanded={reactionsOpen} aria-label={`Open reactions for ${item.title || "Seen"}`} className="seen-reactions" onClick={() => setReactionsOpen((value) => !value)} type="button">
          <span>{profileReactionCluster(engagement)}</span>
          <b>{compactCount(engagement.reactions)}</b>
        </button>
        <button aria-expanded={commentsOpen} aria-label={`Open comments for ${item.title || "Seen"}`} onClick={() => setCommentsOpen((value) => !value)} type="button">
          <FiMessageSquare />
          <b>{compactCount(engagement.comments)}</b>
        </button>
        <button aria-label={engagementQuery.data?.viewerShared ? "Remove repost" : `Repost ${item.title || "Seen"}`} disabled={repostMutation.isPending} onClick={() => repostMutation.mutate()} type="button">
          <FiRepeat />
          <b>{compactCount(engagement.reposts)}</b>
        </button>
      </div>
      <div className="seen-engagement-right">
        <button aria-label={engagement.saved ? "Remove from Saved" : `Save ${item.title || "Seen"}`} className={engagement.saved ? "is-selected" : ""} disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button"><FiBookmark fill={engagement.saved ? "currentColor" : "none"} /></button>
        <button aria-label={`Share ${item.title || "Seen"}`} onClick={() => setShareOpen(true)} type="button"><FiSend /></button>
      </div>
    </div>
    {reactionsOpen ? <div className="profile-seen-reaction-picker">{Object.entries(profileReactionLabel).slice(0, 8).map(([key, icon]) => <button aria-label={`React with ${key.toLowerCase()}`} disabled={reactionMutation.isPending} key={key} onClick={() => reactionMutation.mutate(key)} type="button">{icon}</button>)}</div> : null}
    {commentsOpen ? <section className="profile-seen-comments-panel">
      <div>{(engagementQuery.data?.comments || []).map((entry) => <article key={entry.id}><strong>{entry.author?.name || "Fan"}</strong><p>{entry.text}</p></article>)}{!engagementQuery.data?.comments?.length ? <p>No comments yet.</p> : null}</div>
      <form onSubmit={submitComment}><input aria-label="Add a Seen comment" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." value={comment} /><button disabled={!comment.trim() || commentMutation.isPending} type="submit">Post</button></form>
    </section> : null}
    {shareOpen ? <SeenShareSheet item={item} onClose={() => setShareOpen(false)} shareUrl={shareUrl} /> : null}
    </>
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

function SeenListDetailView({ currentUser, focusSeenId = "", items, onBack, onFeedRemove, onFeedRemoveByCreator, onFeedReplace, onFeedUpdate }) {
  useEffect(() => {
    if (!focusSeenId || focusSeenId === "all") return undefined;
    const frame = window.requestAnimationFrame(() => {
      const selector = `[data-profile-seen-row="${CSS.escape(String(focusSeenId))}"]`;
      document.querySelector(selector)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusSeenId]);

  return (
    <section className="profile-series-feed-view profile-seen-list-feed-view seen-shell-main">
      <header className="profile-series-feed-head">
        <button aria-label="Back to Seens" className="profile-series-feed-back" onClick={onBack} type="button"><FiChevronLeft /></button>
        <h2>My Seens</h2>
        <b>{items.length}</b>
      </header>
      <div className="seen-feed-list profile-my-seens-feed">
        {items.map((item, index) => <SeenFeedItem animateOnScroll={index > 0} currentUser={currentUser} item={item} key={item.id} onFeedRemove={onFeedRemove} onFeedRemoveByCreator={onFeedRemoveByCreator} onFeedReplace={onFeedReplace} onFeedUpdate={onFeedUpdate} />)}
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

function SeenShareSheet({ item, onClose, shareUrl }) {
  const title = item?.title || "Untitled Seen";
  const creatorName = creatorNameFor(item);
  const media = findMedia(item);
  return <AppShareSheet isOpen onClose={onClose} payload={{
    author: { avatarUrl: item?.creator?.avatar || item?.creator?.avatarUrl || "", id: item?.creator?.id || item?.creator?._id || "", name: creatorName, username: item?.creator?.username || "" },
    canonicalUrl: shareUrl,
    contentId: String(item?.id || item?._id || ""),
    contentType: "seen",
    destinationRoute: `/seen/${encodeURIComponent(item?.id || item?._id || "")}`,
    imageUrl: media?.secureUrl || media?.url || media?.thumbnailUrl || "",
    mediaType: media?.mediaType || media?.resourceType || media?.type || "",
    textPreview: title,
    title,
  }} variant="seen" />;
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
  highlightSeenId = "",
  kind = "content",
  onActiveSeriesChange,
  onActiveSeenListChange,
  owner = false,
  reposted = false,
  series = [],
}) {
  const { user: currentUser } = useAuth();
  const [activeSeen, setActiveSeen] = useState(null);
  const [actionSeen, setActionSeen] = useState(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [localActiveSeriesId, setLocalActiveSeriesId] = useState("");
  const visibleContent = useMemo(() => kind === "seens" ? (content || []).filter((item) => item.status === "PUBLISHED" || item.publishedAt || (owner && item.status === "DRAFT")) : content || [], [content, kind, owner]);
  const [localContent, setLocalContent] = useState(null);
  const effectiveContent = localContent || visibleContent;
  useEffect(() => {
    setLocalContent(null);
  }, [visibleContent]);

  if (kind === "seens") {
    if (!effectiveContent.length && !series.length) return <ContentEmptyState compact message={owner ? "Publish a Seen to start sharing your stories and ideas." : "Published Seens will appear here when this creator shares one."} primaryAction={owner ? { label: "Create a Seen", to: "/create/seen" } : { label: "Explore Seens", to: "/seen" }} secondaryAction={{ label: "Discover people", to: "/discover" }} title={owner ? "Create your first Seen" : (emptyText || "No Seens yet")} variant="seen" />;
    const drafts = owner ? effectiveContent.filter((item) => item.status === "DRAFT") : [];
    const publishedContent = effectiveContent.filter((item) => item.status !== "DRAFT").sort((left, right) => Number(right.pricing?.mode === "ONE_TIME") - Number(left.pricing?.mode === "ONE_TIME"));
    const seriesGroups = new Map(series.map((item) => [String(item.id), { ...item, seens: [] }]));
    publishedContent.forEach((item) => {
      const id = seriesIdFor(item);
      if (!id) return;
      if (!seriesGroups.has(String(id))) seriesGroups.set(String(id), { id: String(id), name: seriesFor(item), title: seriesFor(item), seens: [] });
      seriesGroups.get(String(id)).seens.push(item);
    });
    const seriesTiles = [...seriesGroups.values()].filter((item) => owner || item.seenCount || item.seens.length);
    const selectedSeriesId = activeSeriesId || localActiveSeriesId;
    const activeSeries = selectedSeriesId ? seriesGroups.get(String(selectedSeriesId)) : null;
    const items = activeSeries ? (seriesGroups.get(String(activeSeries.id))?.seens || []) : publishedContent.filter((item) => !seriesIdFor(item));
    const pinnedSeens = publishedContent.filter((item) => item.isPinned);
    const featuredSeens = reposted ? publishedContent : [...publishedContent.filter((item) => item.pricing?.mode === "ONE_TIME"), ...pinnedSeens.filter((item) => item.pricing?.mode !== "ONE_TIME")];
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
    const updateProfileSeenEngagement = (id, engagement) => {
      setLocalContent((current) => (current || effectiveContent).map((entry) => String(entry.id || entry._id) === String(id) ? { ...entry, engagement } : entry));
    };
    const replaceProfileSeen = (id, publication) => {
      setLocalContent((current) => (current || effectiveContent).map((entry) => String(entry.id || entry._id) === String(id) ? { ...entry, ...publication } : entry));
    };
    const removeProfileSeen = (id) => {
      setLocalContent((current) => (current || effectiveContent).filter((entry) => String(entry.id || entry._id) !== String(id)));
    };
    const removeProfileSeensByCreator = (creatorId) => {
      setLocalContent((current) => (current || effectiveContent).filter((entry) => String(entry.creator?.id || entry.creator?._id || "") !== String(creatorId)));
    };
    if (activeSeenListId) {
      return (
        <>
          <SeenListDetailView
            currentUser={currentUser}
            focusSeenId={activeSeenListId}
            items={publishedContent}
            onBack={closeSeenList}
            onFeedRemove={removeProfileSeen}
            onFeedRemoveByCreator={removeProfileSeensByCreator}
            onFeedReplace={replaceProfileSeen}
            onFeedUpdate={updateProfileSeenEngagement}
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
    if (draftsOpen) {
      return (
        <section className="profile-seen-drafts is-open">
          <header><button onClick={() => setDraftsOpen(false)} type="button">‹ My Seens</button><i>·</i><b>Drafts {drafts.length}</b></header>
          <div className="profile-seens-grid">
            {drafts.map((item) => <Link className="profile-seen-tile is-draft" key={item.id} to={`/studio/seens/${item.id}/edit?from=drafts`}>
              {item.coverMedia?.secureUrl ? <PublicationCoverMedia alt={`${item.title || "Untitled Seen"} draft cover`} autoPlay loop media={item.coverMedia} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
              <span className="profile-seen-shade" />
              <span className="profile-seen-badge">DRAFT</span>
              <span className="profile-seen-copy"><strong>{item.title || "Untitled Seen"}</strong></span>
            </Link>)}
          </div>
        </section>
      );
    }
    return (
      <>
        <div className="profile-seens-grid">
          {drafts.length ? <button className="profile-seen-tile profile-drafts-tile" onClick={() => setDraftsOpen(true)} type="button">
            {drafts[0]?.coverMedia?.secureUrl ? <PublicationCoverMedia alt="Seen drafts" autoPlay loop media={drafts[0].coverMedia} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
            <span className="profile-seen-shade" />
            <span className="profile-draft-count">{drafts.length}</span>
            <span className="profile-seen-copy"><strong>Drafts</strong></span>
          </button> : null}
          {seriesTiles.map((seriesItem) => {
            const media = seriesItem.coverMedia || findMedia(seriesItem.seens?.[0]) || seriesItem.previewSeens?.find((item) => item.coverMedia)?.coverMedia;
            const count = seriesItem.seenCount ?? seriesItem.seens?.length ?? 0;
            const name = seriesItem.name || seriesItem.title || "Untitled Series";
            return <button className="profile-seen-tile profile-series-tile" key={seriesItem.id} onClick={() => openSeries(seriesItem)} type="button">
              {media?.secureUrl ? <PublicationCoverMedia alt={`${name} series cover`} autoPlay loop media={media} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
              <span className="profile-seen-shade" />
              <span className="profile-seen-badge">SERIES <b>{count}</b></span>
              <span className="profile-seen-copy"><strong>{name}</strong><small>{count} {count === 1 ? "Seen" : "Seens"}</small></span>
            </button>;
          })}
          {featuredSeens.map((item) => {
            const chapters = item.chapters?.length || 0;
            const paid = item.pricing?.mode === "ONE_TIME";
            const tile = (
              <>
                {item.coverMedia?.secureUrl ? <PublicationCoverMedia alt={`${item.title} cover`} autoPlay loop media={item.coverMedia} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
                <span className="profile-seen-shade" />
                <span className="profile-seen-badge">{paid ? <>🔒 PAID · ✦{Number(item.pricing?.starsAmount || 0).toLocaleString()}</> : reposted ? <><FiRepeat /> REPOST</> : "PINNED"}</span>
                <span className="profile-seen-copy">
                  <strong>{item.title}</strong>
                  <small>{chapters} {chapters === 1 ? "chapter" : "chapters"}</small>
                </span>
              </>
            );

            if (reposted) {
              return (
                <Link
                  aria-label={`Open reposted Seen ${item.title || "Untitled Seen"}`}
                  className="profile-seen-tile"
                  key={item.id}
                  to={`/seen/${item.id}`}
                >
                  {tile}
                </Link>
              );
            }

            return (
              <button className={`profile-seen-tile ${paid ? "is-paid" : ""} ${String(highlightSeenId) === String(item.id || item._id) ? "is-newly-published" : ""}`} key={item.id} onClick={() => onActiveSeenListChange ? onActiveSeenListChange(item.id) : setActiveSeen(item)} type="button">
                {tile}
              </button>
            );
          })}
          {!reposted && publishedContent.length ? <button className="profile-seen-tile profile-all-seens-tile" onClick={() => onActiveSeenListChange?.("all")} type="button">
            {publishedContent[0]?.coverMedia?.secureUrl ? <PublicationCoverMedia alt="All Seens" autoPlay loop media={publishedContent[0].coverMedia} /> : <span className="profile-seen-fallback"><FiGrid /></span>}
            <span className="profile-seen-shade" />
            <span className="profile-draft-count">{publishedContent.length}</span>
            <span className="profile-seen-copy"><strong>All Seens</strong><small>Open every Seen</small></span>
          </button> : null}
        </div>
        {activeSeen ? <SeenPreviewSheet item={activeSeen} onClose={() => setActiveSeen(null)} onSeriesChanged={(updated) => {
          setLocalContent((current) => (current || effectiveContent).map((item) => item.id === updated.id ? updated : item));
          setActiveSeen(updated);
        }} owner={owner} /> : null}
      </>
    );
  }

  if (!visibleContent.length) return <ContentEmptyState compact message={owner ? "Create something new and it will appear on your profile." : "There is no published content in this section yet."} primaryAction={owner ? { label: "Create", to: "/create" } : { label: "Discover people", to: "/discover" }} title={owner ? "Share your first creation" : (emptyText || "No content yet")} variant="profile" />;
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

