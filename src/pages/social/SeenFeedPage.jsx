import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArchive, FiBarChart2, FiBookmark, FiEdit3, FiEye, FiEyeOff, FiFlag, FiGrid, FiImage, FiMessageCircle, FiMoreHorizontal, FiPlus, FiPlusCircle, FiRefreshCw, FiRepeat, FiSearch, FiSend, FiSlash, FiTrash2, FiUploadCloud, FiZap } from "react-icons/fi";
import FanCreateSheet from "../../components/fanWeb/FanCreateSheet";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import ContentEntityList from "../../components/contentEntities/ContentEntityList";
import SeriesPickerSheet from "../../components/publication/SeriesPickerSheet";
import ShareSheet from "../../components/share/ShareSheet";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import StoryCreator from "../../components/stories/StoryCreator";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { publicationService } from "../../services/publicationService";
import { resolveMediaUrl } from "../../utils/media";
import { canCreateFeedPost } from "../../utils/postPermissions";
import { canCreateStory } from "../../utils/storyPermissions";
import { useAuth } from "../../hooks/useAuth";
import { useSocialCapabilities } from "../../hooks/useSocialCapabilities";
import { atseenReportReasons } from "../../data/atseenMockData";
import { relativeTime } from "../../utils/relativeTime";
import { isSeenOwner, normalizeId } from "../../utils/seenOwnership";

const seenReactionOptions = [
  { key: "LIKE", label: "Support", icon: "\uD83E\uDD1D" },
  { key: "LOVE", label: "Love", icon: "\u2764\uFE0F" },
  { key: "FIRE", label: "Fire", icon: "\uD83D\uDD25" },
  { key: "CLAP", label: "Clap", icon: "\uD83D\uDC4F" },
  { key: "LAUGH", label: "Laugh", icon: "\uD83D\uDE02" },
  { key: "SEE_YOU", label: "I see you", icon: "\uD83D\uDC41\uFE0F" },
  { key: "WOW", label: "Surprised", icon: "\uD83D\uDE2E" },
  { key: "TEARY", label: "Moved", icon: "\uD83E\uDD79" },
  { key: "ADMIRE", label: "Adore", icon: "\uD83D\uDE0D" },
  { key: "SAD", label: "Sad", icon: "\uD83D\uDE22" },
  { key: "HUG", label: "Hug", icon: "\uD83E\uDEC2" },
  { key: "STRONG", label: "Strong", icon: "\uD83D\uDCAA" },
  { key: "PRAY", label: "Respect", icon: "\uD83D\uDE4F" },
  { key: "HUNDRED", label: "One hundred", icon: "\uD83D\uDCAF" },
  { key: "SPARKLES", label: "Sparkles", icon: "\u2728" },
];

const reactionLabel = Object.fromEntries(seenReactionOptions.map((item) => [item.key, item.icon]));
reactionLabel.INSIGHTFUL = "\uD83D\uDD25";
reactionLabel.PHONE = "\uD83D\uDCF1";
const reactionMeta = Object.fromEntries(seenReactionOptions.map((item, index) => [item.key, { ...item, order: index }]));
reactionMeta.INSIGHTFUL = { key: "INSIGHTFUL", label: "Fire", icon: "\uD83D\uDD25", order: 2 };
reactionMeta.PHONE = { key: "PHONE", label: "Call me", icon: "\uD83D\uDCF1", order: 99 };

function formatCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return count.toLocaleString();
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatReadTime(chapters = []) {
  const words = chapters.reduce((total, chapter) => total + (chapter.blocks || []).reduce((count, block) => {
    const text = [block.text, block.label, block.url].filter(Boolean).join(" ");
    return count + text.trim().split(/\s+/u).filter(Boolean).length;
  }, 0), 0);
  return Math.max(1, Math.ceil(words / 220));
}

function orderedReactionCounts(reactionBreakdown = {}) {
  return Object.entries(reactionBreakdown)
    .map(([type, count]) => ({ type, count: Number(count) || 0, icon: reactionLabel[type] || reactionLabel.INSIGHTFUL, order: reactionMeta[type]?.order ?? 100 }))
    .filter((item) => item.count > 0)
    .sort((first, second) => second.count - first.count || first.order - second.order || first.type.localeCompare(second.type));
}

function nextEngagementFromReaction(item, nextReaction) {
  const previousReaction = item.viewerState.reaction;
  const sameReaction = previousReaction && previousReaction === nextReaction;
  const reactionBreakdown = { ...(item.engagement.reactionBreakdown || {}) };
  let reactionCount = Number(item.engagement.reactions) || 0;

  if (previousReaction) {
    reactionBreakdown[previousReaction] = Math.max(0, (Number(reactionBreakdown[previousReaction]) || 0) - 1);
    if (!reactionBreakdown[previousReaction]) delete reactionBreakdown[previousReaction];
    reactionCount = Math.max(0, reactionCount - 1);
  }

  if (nextReaction && !sameReaction) {
    reactionBreakdown[nextReaction] = (Number(reactionBreakdown[nextReaction]) || 0) + 1;
    reactionCount += 1;
  }

  return {
    reactionCount,
    reactionBreakdown,
    topReactions: orderedReactionCounts(reactionBreakdown).slice(0, 3).map((reaction) => reaction.type),
    commentCount: item.engagement.comments,
    shareCount: item.engagement.reposts,
    saveCount: item.engagement.saveCount || 0,
    viewCount: item.engagement.views,
    viewerReaction: sameReaction ? null : nextReaction || null,
    viewerShared: item.viewerState.reposted,
    viewerSaved: item.viewerState.saved,
  };
}

function normalizeSeen(raw = {}) {
  const media = raw.coverMedia || {};
  const creator = raw.creator || {};
  return {
    id: String(raw.id || raw._id),
    title: raw.title || "Untitled Seen",
    description: raw.description || raw.summary || "",
    category: raw.category || raw.topic || "",
    createdAt: raw.publishedAt || raw.createdAt || "",
    statusVersion: Number(raw.statusVersion ?? 0),
    isPinned: Boolean(raw.isPinned || raw.pinned || raw.profilePinned || raw.featured),
    media: {
      type: String(media.mediaType || media.resourceType || "IMAGE").toLowerCase().includes("video") ? "video" : "image",
      url: resolveMediaUrl(media.secureUrl || media.url || ""),
      durationSeconds: media.duration ? Math.round(Number(media.duration)) : 0,
    },
    chapters: (raw.chapters || []).map((chapter, index) => ({
      id: chapter.stableChapterId || chapter.id || `${raw.id}-${index}`,
      title: chapter.title || `Chapter ${index + 1}`,
      blocks: chapter.blocks || [],
    })),
    attachedEntities: raw.attachedEntities || [],
    series: raw.series || null,
    seriesId: raw.seriesId || raw.series?._id || raw.series?.id || "",
    access: raw.access || "",
    creatorId: raw.creatorId || raw.ownerId || raw.createdBy || creator.id || creator._id || "",
    creator: {
      id: String(creator.id || creator._id || ""),
      displayName: creator.name || creator.displayName || creator.username || "Creator",
      username: creator.username || "",
      avatarUrl: creator.avatar || "",
      location: creator.location || "",
      verified: Boolean(creator.verified || creator.isVerified),
      status: creator.status || "",
      hasUnseenStory: Boolean(creator.hasUnseenStory),
    },
    engagement: {
      reactions: Number(raw.engagement?.reactionCount ?? raw.reactionCount) || 0,
      reactionBreakdown: raw.engagement?.reactionBreakdown || raw.reactionBreakdown || {},
      topReactions: raw.engagement?.topReactions || raw.topReactions || [],
      comments: Number(raw.engagement?.commentCount ?? raw.commentCount) || 0,
      reposts: Number(raw.engagement?.shareCount ?? raw.shareCount) || 0,
      saveCount: Number(raw.engagement?.saveCount ?? raw.saveCount) || 0,
      views: Number(raw.engagement?.viewCount ?? raw.viewCount) || 0,
    },
    viewerState: {
      reaction: raw.engagement?.viewerReaction || raw.viewerReaction || null,
      reposted: Boolean(raw.engagement?.viewerShared || raw.viewerShared),
      saved: Boolean(raw.engagement?.viewerSaved || raw.viewerSaved),
    },
    previewComment: raw.previewComment ? {
      authorName: raw.previewComment.author?.name || "Fan",
      avatarUrl: raw.previewComment.author?.avatar || "",
      text: raw.previewComment.text || "",
    } : null,
    readMinutes: formatReadTime(raw.chapters || []),
  };
}

function actionError(error) {
  if (error.response?.status === 401) return "Log in to use this Seen action.";
  if (error.response?.status === 403) return "This Seen action is not available for your account.";
  return error.response?.data?.message || "Could not update this Seen.";
}

function SeenSkeleton() {
  return <div className="seen-proto-skeleton" aria-label="Loading Seen">
    <div className="seen-proto-skeleton-head"><span /><div><i /><b /></div></div>
    <div className="seen-proto-skeleton-content"><div className="seen-proto-skeleton-media" /><div><span /><span /><span /></div></div>
    <div className="seen-proto-skeleton-lines"><span /><span /><em /></div>
  </div>;
}

function SeenHeader({ activeTab, onTabChange, onActivity, onCreate, onSearch }) {
  return <header className="seen-proto-header">
    <nav aria-label="Seen feed tabs" className="seen-proto-tabs">
      <button className={activeTab === "seen" ? "is-active" : ""} onClick={() => onTabChange("seen")} type="button"><FiEye aria-hidden="true" />Seen</button>
      <button className={activeTab === "friends" ? "is-active" : ""} onClick={() => onTabChange("friends")} type="button">Friends</button>
    </nav>
    <div className="seen-proto-header-actions">
      <button aria-label="Create" onClick={onCreate} type="button"><FiPlus /></button>
      <button aria-label="Search" onClick={onSearch} type="button"><FiSearch /></button>
      <button aria-label="Open activity" onClick={onActivity} type="button"><FiZap /></button>
    </div>
  </header>;
}

function CreatorHeader({ creator, createdAt, isOwn, onMenuToggle, menuOpen, views }) {
  const profileTo = creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/profile";
  const meta = [creator.location || creator.status || (creator.username ? `@${creator.username}` : "At seen"), relativeTime(createdAt, "")].filter(Boolean).join(" - ");
  return <div className="seen-item-creator">
    <Link aria-label={`Open ${creator.displayName} profile`} className={`seen-avatar-ring ${creator.hasUnseenStory ? "has-story" : ""}`} to={profileTo}>
      <FanAvatar alt="" name={creator.displayName} size="h-[31px] w-[31px]" src={creator.avatarUrl} />
    </Link>
    <Link className="seen-creator-copy" to={profileTo}>
      <strong>{creator.displayName}{isOwn ? <em> - you</em> : null}{creator.verified ? <VerifiedBadge className="seen-verified" /> : null}</strong>
      <span>{meta}</span>
    </Link>
    <span className="seen-creator-views"><FiEye aria-hidden="true" />{formatCount(views)}</span>
    <button aria-expanded={menuOpen} aria-label="Open Seen options" className="seen-more-button" onClick={onMenuToggle} type="button"><FiMoreHorizontal /></button>
  </div>;
}

function useSeenSheetPosition(isOpen) {
  const [sheetPosition, setSheetPosition] = useState(undefined);

  useEffect(() => {
    if (!isOpen) return undefined;

    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;

    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({
        "--seen-sheet-center-x": `${bounds.left + (bounds.width / 2)}px`,
        "--seen-sheet-column-width": `${bounds.width}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);

    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [isOpen]);

  return sheetPosition;
}

function SeenOptionsSheet({ creatorName, isOpen, itemTitle, onBlock, onClose, onHide, onReport, onSave, onShare, onShowMore, pending, saved }) {
  const sheetPosition = useSeenSheetPosition(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const firstName = creatorName.split(" ").filter(Boolean)[0] || "creator";
  const actions = [
    { icon: FiBookmark, label: saved ? "Remove from library" : "Save to library", onClick: onSave },
    { icon: FiSend, label: "Share", onClick: onShare },
    { icon: FiEye, label: "Show more like this", subtitle: "Tunes your feed", onClick: onShowMore },
    { icon: FiEyeOff, label: "Not interested", onClick: onHide },
    { icon: FiFlag, label: "Report", onClick: onReport },
    { danger: true, icon: FiSlash, label: `Block ${firstName}`, onClick: onBlock },
  ];

  return <div className="seen-feed-options-layer" style={sheetPosition}>
    <button aria-label="Close Seen options" className="seen-feed-options-scrim" onClick={onClose} type="button" />
    <section aria-label={`Options for ${itemTitle}`} aria-modal="true" className="seen-feed-options-sheet" role="dialog">
      <span className="seen-feed-options-handle" aria-hidden="true" />
      <h2>{itemTitle}</h2>
      <div className="seen-feed-options-list">
        {actions.map(({ danger, icon: Icon, label, onClick, subtitle }) => (
          <button className={danger ? "is-danger" : ""} disabled={pending} key={label} onClick={onClick} type="button">
            <Icon aria-hidden="true" />
            <span><b>{label}</b>{subtitle ? <small>{subtitle}</small> : null}</span>
          </button>
        ))}
      </div>
    </section>
  </div>;
}

function SeenActionRow({ danger = false, disabled = false, icon: Icon, onClick, pending = false, subtitle = "", title }) {
  return (
    <button className={danger ? "is-danger seen-owner-action-row" : "seen-owner-action-row"} disabled={disabled || pending} onClick={onClick} type="button">
      <Icon aria-hidden="true" />
      <span>
        <b>{title}</b>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
      {pending ? <FiRefreshCw aria-hidden="true" className="seen-owner-action-spinner" /> : null}
    </button>
  );
}

function OwnerSeenActionsSheet({ busyAction = "", isOpen, item, onAddStory, onArchive, onChangeCover, onClose, onDelete, onEdit, onInsights, onPinToggle, onSeries, onShare }) {
  const sheetPosition = useSeenSheetPosition(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const chapterCount = item.chapters.length;
  const chapterWord = chapterCount === 1 ? "chapter" : "chapters";
  const seriesName = item.series?.name || item.series?.title || "";
  const metadata = ["Seen", `${chapterCount} ${chapterWord}`, relativeTime(item.createdAt, "") || `~${item.readMinutes} min`].filter(Boolean).join(" · ");
  const busy = Boolean(busyAction);

  const actions = [
    { icon: FiUploadCloud, key: "share", title: "Share", onClick: onShare },
    { icon: FiPlusCircle, key: "story", title: "Add to your story", onClick: onAddStory },
    { icon: FiBarChart2, key: "insights", title: "Insights", onClick: onInsights },
    { icon: FiEdit3, key: "edit", title: "Edit", onClick: onEdit },
    { icon: FiImage, key: "cover", title: "Change cover", onClick: onChangeCover },
    { icon: FiZap, key: "pin", title: item.isPinned ? "Unpin" : "Pin to profile", onClick: onPinToggle },
    { icon: FiGrid, key: "series", title: seriesName ? `Series: ${seriesName}` : "Add to a series", onClick: onSeries },
    { icon: FiArchive, key: "archive", title: "Archive", subtitle: "hidden from profile, stats stay", onClick: onArchive },
    { danger: true, icon: FiTrash2, key: "delete", title: "Delete", subtitle: "gone for everyone", onClick: onDelete },
  ];

  return (
    <div className="seen-feed-options-layer seen-owner-options-layer" style={sheetPosition}>
      <button aria-label="Close Seen owner actions" className="seen-feed-options-scrim" onClick={onClose} type="button" />
      <section aria-label={`Manage ${item.title}`} aria-modal="true" className="seen-owner-actions-sheet" role="dialog">
        <span className="seen-feed-options-handle" aria-hidden="true" />
        <header className="seen-owner-actions-header">
          <h2>{item.title}</h2>
          <p>{metadata}</p>
        </header>
        <div className="seen-owner-actions-list">
          {actions.map((action) => (
            <SeenActionRow
              danger={action.danger}
              disabled={busy && busyAction !== action.key}
              icon={action.icon}
              key={action.key}
              onClick={action.onClick}
              pending={busyAction === action.key}
              subtitle={action.subtitle}
              title={action.title}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SeenInsightsSheet({ insightsQuery, isOpen, onClose, title }) {
  const sheetPosition = useSeenSheetPosition(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const insights = insightsQuery.data?.data?.data?.insights || insightsQuery.data?.data?.insights || {};
  const rows = [
    ["Views", insights.views],
    ["Unique viewers", insights.uniqueViewers],
    ["Saves", insights.saves],
    ["Shares", insights.shares],
    ["Reactions", insights.reactions],
    ["Comments", insights.comments],
    ["Impressions", insights.impressions],
    ["Opens", insights.opens],
  ];
  return (
    <div className="seen-feed-options-layer" style={sheetPosition}>
      <button aria-label="Close Seen insights" className="seen-feed-options-scrim" onClick={onClose} type="button" />
      <section aria-label={`Insights for ${title}`} aria-modal="true" className="seen-owner-actions-sheet seen-insights-sheet" role="dialog">
        <span className="seen-feed-options-handle" aria-hidden="true" />
        <header className="seen-owner-actions-header"><h2>Insights</h2><p>{title}</p></header>
        {insightsQuery.isLoading ? <p className="seen-insights-state">Loading insights...</p> : null}
        {insightsQuery.isError ? <button className="seen-insights-state" onClick={() => insightsQuery.refetch()} type="button">Unable to load insights. Retry</button> : null}
        {!insightsQuery.isLoading && !insightsQuery.isError ? <div className="seen-insights-grid">{rows.map(([label, value]) => <span key={label}><b>{Number(value || 0).toLocaleString()}</b><small>{label}</small></span>)}</div> : null}
      </section>
    </div>
  );
}

function SeenReportSheet({ done, isOpen, onClose, onReport, pending, title }) {
  const sheetPosition = useSeenSheetPosition(isOpen);

  if (!isOpen) return null;
  return <div className="seen-feed-options-layer" style={sheetPosition}><button aria-label="Close report" className="seen-feed-options-scrim" onClick={onClose} type="button" /><section aria-modal="true" className="seen-feed-options-sheet" role="dialog"><span className="seen-feed-options-handle" /><h2>{done ? "Report received" : `Report ${title}`}</h2>{done ? <div className="p-4"><p className="text-sm leading-6 text-white/60">Our team reviews every report. You will not be revealed as the reporter.</p><button className="mt-4 w-full rounded-xl bg-atseen-blue px-4 py-3 text-sm font-bold text-slate-950" onClick={onClose} type="button">Done</button></div> : <div className="seen-feed-options-list"><p className="px-4 py-2 text-xs text-white/50">Why are you reporting this Seen?</p>{atseenReportReasons.map((reason) => <button disabled={pending} key={reason} onClick={() => onReport(reason)} type="button"><FiFlag /><span><b>{reason}</b></span></button>)}</div>}</section></div>;
}

function CompactSeenMedia({ item, target }) {
  return <Link className="seen-media" to={target}>
    {item.media.url ? <img alt={`${item.title} cover`} loading="lazy" src={item.media.url} /> : <span className="seen-media-fallback">@seen</span>}
    {item.media.type === "video" && item.media.durationSeconds ? <span className="seen-video-pill">▶ {formatDuration(item.media.durationSeconds)}</span> : null}
  </Link>;
}

function SeenSummary({ item, target }) {
  const chapterCount = item.chapters.length;
  const chapterWord = chapterCount === 1 ? "chapter" : "chapters";
  const meta = [item.category, `${chapterCount} ${chapterWord}`, `~${item.readMinutes} min`].filter(Boolean).join(" - ");
  return <div className="seen-summary">
    <CompactSeenMedia item={item} target={target} />
    <Link className="seen-summary-copy" to={target}>
      <strong>{item.title}</strong>
      <small>{meta}</small>
      {item.description ? <p>{item.description}</p> : null}
    </Link>
  </div>;
}

function ChapterPreviewList({ chapters, target }) {
  if (!chapters.length) return null;
  const visible = chapters.slice(0, 3);
  const extra = chapters.length - visible.length;
  return <div className="seen-chapter-list" aria-label="Seen chapters">
    {visible.map((chapter, index) => (
      <Link className="seen-chapter-preview" key={chapter.id || index} to={`${target}?chapter=${index}`}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{chapter.title}</strong>
      </Link>
    ))}
    {extra > 0 ? <Link className="seen-chapter-preview is-more" to={target}><span>+{extra}</span><strong>more inside</strong></Link> : null}
  </div>;
}

function PreviewComment({ comment }) {
  if (!comment?.text) return null;
  return <div className="seen-preview-comment">
    <FanAvatar alt="" name={comment.authorName} size="h-[17px] w-[17px]" src={comment.avatarUrl} />
    <p>“{comment.text}”</p>
  </div>;
}

function CommentsPanel({ engagementQuery, item, mutation, value, onChange, onSubmit }) {
  const comments = engagementQuery.data?.comments || [];
  return <section className="seen-comments-panel">
    <form onSubmit={onSubmit}>
      <input aria-label="Add a Seen comment" maxLength={500} onChange={(event) => onChange(event.target.value)} placeholder="Add a comment..." value={value} />
      <button disabled={!value.trim() || mutation.isPending} type="submit">Post</button>
    </form>
    <div className="seen-comments-list">
      {comments.map((comment) => <article key={comment.id}>
        <FanAvatar alt="" name={comment.author?.name || "Fan"} size="h-6 w-6" src={comment.author?.avatar} />
        <p><Link to={comment.author?.username ? `/profile/${comment.author.username}` : `/seen/${item.id}`}>{comment.author?.name || "Fan"}</Link>{comment.text}</p>
      </article>)}
      {!comments.length && !engagementQuery.isLoading ? <p className="seen-comments-empty">Be the first to comment.</p> : null}
    </div>
  </section>;
}

function reactionCluster(item) {
  const top = item.engagement.topReactions?.length ? item.engagement.topReactions : orderedReactionCounts(item.engagement.reactionBreakdown).map((reaction) => reaction.type);
  return top.slice(0, 3).map((key) => reactionLabel[key] || reactionLabel.INSIGHTFUL).join("");
}

function SeenReactionsSheet({ currentUserId, item, onAddYours, onClose }) {
  const navigate = useNavigate();
  const [activeReaction, setActiveReaction] = useState(null);
  const reactionCounts = orderedReactionCounts(item.engagement.reactionBreakdown);
  const query = useInfiniteQuery({
    enabled: Boolean(item?.id),
    initialPageParam: 1,
    queryKey: ["seen-reactors", item.id, activeReaction],
    queryFn: ({ pageParam }) => publicationService.listSeenReactors(item.id, { reaction: activeReaction || undefined, page: pageParam, limit: 20 }).then((response) => response.data.data),
    getNextPageParam: (lastPage) => lastPage.pagination?.hasMore ? (lastPage.pagination.page || 1) + 1 : undefined,
    retry: false,
  });
  const reactors = query.data?.pages.flatMap((pageData) => pageData.items || []) || [];
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("seen-sheet-lock");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("seen-sheet-lock");
    };
  }, [onClose]);

  const openProfile = (user) => {
    onClose();
    navigate(user.username ? `/profile/${encodeURIComponent(user.username)}` : "/profile");
  };

  return <div className="seen-reactions-layer">
    <button aria-label="Close reactions" className="seen-reactions-scrim" onClick={onClose} type="button" />
    <section aria-label={`Reactions for ${item.title}`} aria-modal="true" className="seen-reactors-sheet" role="dialog">
      <span aria-hidden="true" className="seen-reactors-handle" />
      <header className="seen-reactors-header">
        <h2>Reactions</h2>
        <span>{formatCount(item.engagement.reactions)}</span>
      </header>
      <div aria-label="Reaction filters" className="seen-reactors-tabs" role="tablist">
        <button aria-selected={!activeReaction} className={!activeReaction ? "is-active" : ""} onClick={() => setActiveReaction(null)} role="tab" type="button">All</button>
        {reactionCounts.map((reaction) => <button aria-selected={activeReaction === reaction.type} className={activeReaction === reaction.type ? "is-active" : ""} key={reaction.type} onClick={() => setActiveReaction(reaction.type)} role="tab" type="button"><span aria-hidden="true">{reaction.icon}</span>{formatCount(reaction.count)}</button>)}
      </div>
      <div className="seen-reactors-list">
        {query.isLoading ? <p className="seen-reactors-state">Loading reactions...</p> : null}
        {query.isError ? <div className="seen-reactors-state"><p>Could not load reactions</p><button onClick={() => query.refetch()} type="button">Retry</button></div> : null}
        {!query.isLoading && !query.isError && reactors.length ? reactors.map((reactor) => {
          const isCurrentUser = String(reactor.user?.id || "") === String(currentUserId || "");
          const name = isCurrentUser ? "You" : reactor.user?.displayName || reactor.user?.username || "Atseen user";
          return <button className="seen-reactor-row" key={reactor.id} onClick={() => openProfile(reactor.user || {})} type="button">
            <FanAvatar alt={`${name} avatar`} name={name} size="h-[38px] w-[38px]" src={reactor.user?.avatarUrl} />
            <span className="seen-reactor-copy">
              <strong>{name}{reactor.user?.verified ? <VerifiedBadge className="seen-reactor-verified" /> : null}</strong>
              {reactor.user?.username ? <small>@{reactor.user.username}</small> : null}
            </span>
            <span aria-label={reactionMeta[reactor.reaction]?.label || "Reaction"} className="seen-reactor-emoji">{reactionLabel[reactor.reaction] || reactionLabel.INSIGHTFUL}</span>
          </button>;
        }) : null}
        {!query.isLoading && !query.isError && !reactors.length ? <p className="seen-reactors-state">No reactions yet</p> : null}
        {query.hasNextPage ? <button className="seen-reactors-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} type="button">{query.isFetchingNextPage ? "Loading..." : "Load more"}</button> : null}
      </div>
      <button className="seen-reactors-add" onClick={onAddYours} type="button">Add yours &gt;</button>
    </section>
  </div>;
}

function ReactionPicker({ item, onClose, onSelect, pending }) {
  const selectedReaction = item.viewerState.reaction;
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("seen-sheet-lock");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("seen-sheet-lock");
    };
  }, [onClose]);

  return <div className="seen-reactions-layer">
    <button aria-label="Close reactions" className="seen-reactions-scrim" onClick={onClose} type="button" />
    <section aria-label={`Choose a reaction for ${item.title}`} aria-modal="true" className="seen-reaction-sheet" role="dialog">
    <span aria-hidden="true" className="seen-reaction-handle" />
    <div aria-label="Choose a Seen reaction" className="seen-reaction-grid" role="group">
      {seenReactionOptions.map((reaction) => {
        const count = Number(item.engagement.reactionBreakdown?.[reaction.key]) || 0;
        const selected = selectedReaction === reaction.key || (selectedReaction === "INSIGHTFUL" && reaction.key === "FIRE");
        return <button aria-label={`${selected ? "Remove" : "Send"} ${reaction.label} reaction`} aria-pressed={selected} className={selected ? "is-selected seen-reaction-option" : "seen-reaction-option"} disabled={pending} key={reaction.key} onClick={() => onSelect(selected ? "" : reaction.key)} type="button">
          <span aria-hidden="true">{reaction.icon}</span>
          <small>{count || ""}</small>
        </button>;
      })}
    </div>
    <p>One reaction \u2014 make it yours</p>
    </section>
  </div>;
}

function EngagementBar({ item, onCommentToggle, onCopyLink, onReactOpen, onRepost, onSave, commentsOpen, pending }) {
  const selected = item.viewerState;
  return <div className="seen-engagement-bar">
    <div className="seen-engagement-left">
      <button aria-label={selected.reaction ? "Change reaction" : "React to Seen"} className={selected.reaction ? "is-selected seen-reactions" : "seen-reactions"} disabled={pending} onClick={onReactOpen} type="button">
        <span>{reactionCluster(item)}</span><b>{formatCount(item.engagement.reactions)}</b>
      </button>
      <button aria-expanded={commentsOpen} aria-label="Open comments" className={commentsOpen ? "is-selected" : ""} onClick={onCommentToggle} type="button"><FiMessageCircle /><b>{formatCount(item.engagement.comments)}</b></button>
      <button aria-label={selected.reposted ? "Remove repost" : "Repost Seen"} className={selected.reposted ? "is-selected" : ""} disabled={pending} onClick={onRepost} type="button"><FiRepeat /><b>{formatCount(item.engagement.reposts)}</b></button>
    </div>
    <div className="seen-engagement-right">
      <button aria-label={selected.saved ? "Remove from Saved" : "Save Seen"} className={selected.saved ? "is-selected" : ""} disabled={pending} onClick={onSave} type="button"><FiBookmark fill={selected.saved ? "currentColor" : "none"} /></button>
      <button aria-label="Share Seen link" onClick={onCopyLink} type="button"><FiSend /></button>
    </div>
  </div>;
}

function SeenFeedItem({ currentUser = null, item: rawItem, onFeedRemove, onFeedRemoveByCreator, onFeedReplace, onFeedUpdate }) {
  const item = normalizeSeen(rawItem);
  const target = `/seen/${encodeURIComponent(item.id)}`;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useFanToast();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionsSheetOpen, setReactionsSheetOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeLink, setNoticeLink] = useState("");
  const [busyOwnerAction, setBusyOwnerAction] = useState("");
  const engagementQuery = useQuery({
    enabled: commentsOpen || reactionPickerOpen,
    queryKey: ["seen-engagement", item.id],
    queryFn: () => publicationService.getSeenEngagement(item.id).then((response) => response.data.data.engagement),
    retry: false,
  });

  const mergeEngagement = (engagement) => {
    if (!engagement) return;
    onFeedUpdate(item.id, engagement);
    queryClient.setQueryData(["seen-engagement", item.id], engagement);
  };

  const runAction = async (request) => {
    try {
      const response = await request;
      mergeEngagement(response.data.data.engagement);
      setNotice("");
      setNoticeLink("");
      return response;
    } catch (error) {
      setNotice(actionError(error));
      throw error;
    }
  };

  const reactionMutation = useMutation({
    mutationFn: (reaction) => runAction(reaction ? publicationService.reactToSeen(item.id, reaction) : publicationService.removeSeenReaction(item.id)),
    onMutate: async (reaction) => {
      const next = nextEngagementFromReaction(item, reaction);
      mergeEngagement(next);
      return { next };
    },
    onSuccess: (response) => {
      mergeEngagement(response.data.data.engagement);
      queryClient.invalidateQueries({ queryKey: ["seen-reactors", item.id] });
      setReactionPickerOpen(false);
    },
    onError: (error) => {
      mergeEngagement({
        reactionCount: item.engagement.reactions,
        reactionBreakdown: item.engagement.reactionBreakdown,
        topReactions: item.engagement.topReactions,
        commentCount: item.engagement.comments,
        shareCount: item.engagement.reposts,
        saveCount: item.engagement.saveCount,
        viewCount: item.engagement.views,
        viewerReaction: item.viewerState.reaction,
        viewerShared: item.viewerState.reposted,
        viewerSaved: item.viewerState.saved,
      });
      setNotice(actionError(error));
    },
  });
  const repostMutation = useMutation({
    mutationFn: () => runAction(item.viewerState.reposted ? publicationService.removeSeenShare(item.id) : publicationService.shareSeen(item.id)),
    onSuccess: (response) => {
      const shared = Boolean(response.data.data.engagement?.viewerShared);
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      if (shared) {
        setNotice("Reposted to your profile.");
        setNoticeLink("/profile?tab=reposts");
      } else {
        setNotice("Removed from your profile.");
        setNoticeLink("");
      }
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => runAction(publicationService.toggleSeenSave(item.id)),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      setNotice(response.data.data.engagement?.viewerSaved ? "Saved to library." : "Removed from library.");
    },
  });
  const commentMutation = useMutation({
    mutationFn: (text) => runAction(publicationService.commentOnSeen(item.id, text)),
    onSuccess: () => {
      setComment("");
      setCommentsOpen(true);
    },
  });
  const hideMutation = useMutation({
    mutationFn: () => publicationService.hideSeen(item.id),
    onSuccess: () => {
      setMenuOpen(false);
      onFeedRemove(item.id);
    },
    onError: (error) => setNotice(actionError(error)),
  });
  const muteMutation = useMutation({
    mutationFn: () => publicationService.muteSeenCreator(item.id),
    onSuccess: () => {
      setMenuOpen(false);
      onFeedRemoveByCreator(item.creator.id);
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
    },
    onError: (error) => setNotice(actionError(error)),
  });
  const blockMutation = useMutation({
    mutationFn: () => publicationService.blockSeenCreator(item.id),
    onSuccess: () => {
      setMenuOpen(false);
      onFeedRemoveByCreator(item.creator.id);
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
    onError: (error) => setNotice(actionError(error)),
  });
  const reportMutation = useMutation({
    mutationFn: (reason) => publicationService.reportSeen(item.id, { reason }),
    onSuccess: () => {
      setMenuOpen(false);
      setReportDone(true);
    },
    onError: (error) => setNotice(actionError(error)),
  });
  const pinMutation = useMutation({
    mutationFn: () => publicationService.pinSeen(item.id, !item.isPinned, item.statusVersion),
    onMutate: () => setBusyOwnerAction("pin"),
    onSuccess: async (response) => {
      const publication = response.data?.data?.publication;
      if (publication) onFeedReplace(item.id, publication);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seen-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["series"] }),
      ]);
      setMenuOpen(false);
      showToast(!item.isPinned ? "Pinned" : "Unpinned");
    },
    onError: (error) => showToast(actionError(error)),
    onSettled: () => setBusyOwnerAction(""),
  });
  const archiveMutation = useMutation({
    mutationFn: () => publicationService.archivePublication(item.id, item.statusVersion),
    onMutate: () => setBusyOwnerAction("archive"),
    onSuccess: async () => {
      setMenuOpen(false);
      onFeedRemove(item.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seen-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["series"] }),
      ]);
      showToast("In archive - restore anytime");
    },
    onError: (error) => showToast(actionError(error)),
    onSettled: () => setBusyOwnerAction(""),
  });
  const deleteMutation = useMutation({
    mutationFn: () => publicationService.deleteSeen(item.id, item.statusVersion),
    onMutate: () => setBusyOwnerAction("delete"),
    onSuccess: async () => {
      setMenuOpen(false);
      onFeedRemove(item.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seen-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["series"] }),
      ]);
      showToast("Seen deleted.");
    },
    onError: (error) => showToast(actionError(error)),
    onSettled: () => setBusyOwnerAction(""),
  });
  const insightsQuery = useQuery({
    enabled: insightsOpen,
    queryKey: ["seen-insights", item.id],
    queryFn: () => publicationService.getSeenInsights(item.id),
    retry: false,
  });

  const shareUrl = `${window.location.origin}${target}`;
  const sharePayload = useMemo(() => ({
    author: {
      avatarUrl: item.creator.avatarUrl,
      id: item.creator.id,
      name: item.creator.displayName,
      username: item.creator.username,
    },
    canonicalUrl: shareUrl,
    contentId: item.id,
    contentType: "seen",
    destinationRoute: target,
    imageUrl: item.media.url,
    textPreview: `${item.title} — ${item.creator.displayName.split(" ").filter(Boolean)[0] || item.creator.displayName}`,
    title: item.title,
  }), [item.creator.avatarUrl, item.creator.displayName, item.creator.id, item.creator.username, item.id, item.media.url, item.title, shareUrl, target]);
  const submitComment = (event) => {
    event.preventDefault();
    const text = comment.trim();
    if (text) commentMutation.mutate(text);
  };
  const selectReaction = (reaction) => {
    if (reactionMutation.isPending) return;
    reactionMutation.mutate(reaction);
  };
  const openReactions = () => {
    setMenuOpen(false);
    if (item.engagement.reactions > 0) setReactionsSheetOpen(true);
    else setReactionPickerOpen(true);
  };
  const openPickerFromSheet = () => {
    setReactionsSheetOpen(false);
    setReactionPickerOpen(true);
  };
  const menuPending = saveMutation.isPending || repostMutation.isPending || hideMutation.isPending || muteMutation.isPending || blockMutation.isPending || reportMutation.isPending;
  const pending = reactionMutation.isPending || repostMutation.isPending || saveMutation.isPending || commentMutation.isPending || hideMutation.isPending || muteMutation.isPending || blockMutation.isPending || reportMutation.isPending || pinMutation.isPending || archiveMutation.isPending || deleteMutation.isPending;

  const isOwn = isSeenOwner(currentUser, rawItem) || isSeenOwner(currentUser, item);
  const ownerStoryContent = useMemo(() => ({
    caption: `${item.title}\n${shareUrl}`,
    imageUrl: item.media.url,
  }), [item.media.url, item.title, shareUrl]);
  const openChangeCover = () => {
    setMenuOpen(false);
    navigate(`/studio/seens/${item.id}/edit?from=seen&focus=cover`);
  };
  const confirmDelete = () => {
    if (!window.confirm("Delete this Seen?\n\nThis will permanently remove it for everyone.")) return;
    deleteMutation.mutate();
  };

  return <article className={reactionPickerOpen || reactionsSheetOpen ? "has-reaction-picker seen-feed-item" : "seen-feed-item"}>
    <div className="seen-item-menu-wrap">
      <CreatorHeader createdAt={item.createdAt} creator={item.creator} isOwn={isOwn} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((value) => !value)} views={item.engagement.views} />
      {isOwn ? (
        <OwnerSeenActionsSheet
          busyAction={busyOwnerAction}
          isOpen={menuOpen}
          item={item}
          onAddStory={() => { setMenuOpen(false); setStoryCreatorOpen(true); }}
          onArchive={() => archiveMutation.mutate()}
          onChangeCover={openChangeCover}
          onClose={() => setMenuOpen(false)}
          onDelete={confirmDelete}
          onEdit={() => { setMenuOpen(false); navigate(`/studio/seens/${item.id}/edit?from=seen`); }}
          onInsights={() => { setMenuOpen(false); setInsightsOpen(true); }}
          onPinToggle={() => pinMutation.mutate()}
          onSeries={() => { setMenuOpen(false); setSeriesOpen(true); }}
          onShare={() => { setMenuOpen(false); setShareSheetOpen(true); }}
        />
      ) : (
        <SeenOptionsSheet
          creatorName={item.creator.displayName}
          isOpen={menuOpen}
          itemTitle={item.title}
          onBlock={() => blockMutation.mutate()}
          onClose={() => setMenuOpen(false)}
          onHide={() => hideMutation.mutate()}
          onReport={() => { setMenuOpen(false); setReportDone(false); setReportOpen(true); }}
          onSave={() => {
            setMenuOpen(false);
            saveMutation.mutate();
          }}
          onShare={() => {
            setMenuOpen(false);
            setShareSheetOpen(true);
          }}
          onShowMore={() => {
            setMenuOpen(false);
            reactionMutation.mutate("ADMIRE", {
              onSuccess: () => setNotice("Thanks. We will show you more Seens like this."),
            });
          }}
          pending={menuPending}
          saved={item.viewerState.saved}
        />
      )}
    </div>
    <SeenReportSheet done={reportDone} isOpen={reportOpen} onClose={() => { setReportOpen(false); setReportDone(false); }} onReport={(reason) => reportMutation.mutate(reason)} pending={reportMutation.isPending} title={item.title} />
    <ShareSheet isOpen={shareSheetOpen} onClose={() => setShareSheetOpen(false)} payload={sharePayload} variant="seen" />
    <StoryCreator initialContent={ownerStoryContent} isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
    <SeenInsightsSheet insightsQuery={insightsQuery} isOpen={insightsOpen} onClose={() => setInsightsOpen(false)} title={item.title} />
    <SeriesPickerSheet
      isOpen={seriesOpen}
      onClose={() => setSeriesOpen(false)}
      onSelected={(series) => {
        const updated = { ...rawItem, series, seriesId: series?.id || null };
        onFeedReplace(item.id, updated);
      }}
      seenId={item.id}
      selectedSeries={item.series}
      selectedSeriesId={item.seriesId}
    />
    <div className="seen-feed-copy">
      <SeenSummary item={item} target={target} />
      <ChapterPreviewList chapters={item.chapters} target={target} />
      <ContentEntityList entities={item.attachedEntities} onNotice={setNotice} />
      <PreviewComment comment={item.previewComment} />
      <EngagementBar commentsOpen={commentsOpen} item={item} onCommentToggle={() => setCommentsOpen((value) => !value)} onCopyLink={() => setShareSheetOpen(true)} onReactOpen={openReactions} onRepost={() => repostMutation.mutate()} onSave={() => saveMutation.mutate()} pending={pending} />
      {reactionsSheetOpen ? <SeenReactionsSheet currentUserId={normalizeId(currentUser)} item={item} onAddYours={openPickerFromSheet} onClose={() => setReactionsSheetOpen(false)} /> : null}
      {reactionPickerOpen ? <ReactionPicker item={item} onClose={() => setReactionPickerOpen(false)} onSelect={selectReaction} pending={reactionMutation.isPending} /> : null}
      {notice ? <p className="seen-item-notice" role="status">{notice}{noticeLink ? <Link to={noticeLink}>View reposts</Link> : null}</p> : null}
      {commentsOpen ? <CommentsPanel engagementQuery={engagementQuery} item={item} mutation={commentMutation} onChange={setComment} onSubmit={submitComment} value={comment} /> : null}
    </div>
  </article>;
}

function EmptyState({ tab }) {
  return <div className="seen-empty-state">
    <FiEye aria-hidden="true" />
    {tab === "friends" ? <>
      <h2>Your friends’ Seens live here</h2>
      <p>Follow people — what they post appears first.</p>
    </> : <>
      <h2>No Seens yet</h2>
      <p>Published free Seens will appear here.</p>
    </>}
  </div>;
}

function EndState({ onCreate }) {
  return <section className="seen-end-state">
    <FiEye aria-hidden="true" />
    <h2>You’re all caught up ✦</h2>
    <p>Now show them something.<br />Post what only you can show.</p>
    <button onClick={onCreate} type="button">Create a Seen ✦</button>
  </section>;
}

export default function SeenFeedPage() {
  const [tab, setTab] = useState("seen");
  const [createOpen, setCreateOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const capabilities = useSocialCapabilities();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["seen-feed", tab],
    queryFn: () => publicationService.listPublishedSeens({ limit: 30, tab }).then((response) => response.data.data.items || []),
    retry: 1,
    staleTime: 1000 * 60,
  });
  const items = useMemo(() => query.data || [], [query.data]);
  const canCreateStoryNow = capabilities.canCreate && canCreateStory(user);
  const canPostNote = capabilities.canCreate && canCreateFeedPost(user);
  const openCreate = () => setCreateOpen(true);
  const updateFeedItem = (id, engagement) => {
    queryClient.setQueryData(["seen-feed", tab], (current = []) => current.map((entry) => String(entry.id) === String(id) ? {
      ...entry,
      engagement: {
        reactionCount: engagement.reactionCount,
        reactionBreakdown: engagement.reactionBreakdown || entry.engagement?.reactionBreakdown || {},
        topReactions: engagement.topReactions || entry.engagement?.topReactions || [],
        commentCount: engagement.commentCount,
        shareCount: engagement.shareCount,
        saveCount: engagement.saveCount,
        viewCount: entry.engagement?.viewCount ?? 0,
        viewerReaction: engagement.viewerReaction,
        viewerShared: engagement.viewerShared,
        viewerSaved: engagement.viewerSaved,
      },
      previewComment: engagement.comments?.at(-1) || entry.previewComment || null,
    } : entry));
  };
  const replaceFeedItem = (id, nextItem) => {
    queryClient.setQueryData(["seen-feed", tab], (current = []) => current.map((entry) => String(entry.id || entry._id) === String(id) ? { ...entry, ...nextItem } : entry));
  };
  const removeFeedItem = (id) => {
    queryClient.setQueryData(["seen-feed", tab], (current = []) => current.filter((entry) => String(entry.id) !== String(id)));
  };
  const removeFeedItemsByCreator = (creatorId) => {
    queryClient.setQueryData(["seen-feed", tab], (current = []) => current.filter((entry) => String(entry.creator?.id || entry.creator?._id || "") !== String(creatorId)));
  };

  return <section className="seen-prototype-page">
    <SeenHeader activeTab={tab} onActivity={() => navigate("/activity")} onCreate={openCreate} onSearch={() => navigate("/search?type=seens")} onTabChange={setTab} />
    <FanCreateSheet
      canCreateSeen={capabilities.canCreate}
      canCreateWorld={capabilities.isApprovedCreator}
      canCreateStoryNow={canCreateStoryNow}
      canPostNote={canPostNote}
      isOpen={createOpen}
      onClose={() => setCreateOpen(false)}
      onNote={() => {
        setCreateOpen(false);
        navigate("/wall?compose=note");
      }}
      onStory={() => {
        setCreateOpen(false);
        setStoryCreatorOpen(true);
      }}
    />
    <StoryCreator isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
    {query.isLoading ? <div className="seen-feed-list"><SeenSkeleton /><SeenSkeleton /></div> : null}
    {query.isError ? <div className="seen-feed-error"><p>Couldn’t load Seens.</p><button onClick={() => query.refetch()} type="button">Try again</button></div> : null}
    {!query.isLoading && !query.isError ? items.length ? <div className="seen-feed-list">
      {items.map((item) => <SeenFeedItem currentUser={user} item={item} key={item.id} onFeedRemove={removeFeedItem} onFeedRemoveByCreator={removeFeedItemsByCreator} onFeedReplace={replaceFeedItem} onFeedUpdate={updateFeedItem} />)}
      <EndState onCreate={openCreate} />
    </div> : <EmptyState tab={tab} /> : null}
  </section>;
}
