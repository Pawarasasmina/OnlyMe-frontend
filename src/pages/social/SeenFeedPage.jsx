import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import ShowMoreEyeIcon from "../../components/branding/ShowMoreEyeIcon";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { nextSeenFeedPage, updateSeenFeedPages } from "../../utils/seenFeedPagination";
import { FiArchive, FiBarChart2, FiBookmark, FiChevronLeft, FiChevronRight, FiEdit3, FiEyeOff, FiFlag, FiGrid, FiImage, FiLock, FiMessageCircle, FiMic, FiMoreHorizontal, FiPlay, FiPlus, FiPlusCircle, FiRefreshCw, FiRepeat, FiSearch, FiSend, FiSlash, FiTrash2, FiUploadCloud, FiVolume2, FiVolumeX, FiZap } from "react-icons/fi";
import FanCreateSheet from "../../components/fanWeb/FanCreateSheet";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import ContentEntityList from "../../components/contentEntities/ContentEntityList";
import SeriesPickerSheet from "../../components/publication/SeriesPickerSheet";
import PublicationCoverMedia from "../../components/publication/PublicationCoverMedia";
import ShareSheet from "../../components/share/ShareSheet";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import StoryCreator from "../../components/stories/StoryCreator";
import ActivitySparkMark from "../../components/activity/ActivitySparkMark";
import SeenEyeMark from "../../components/branding/SeenEyeMark";
import CoinIcon from "../../components/branding/CoinIcon";
import VoiceCommentRecorder from "../../components/comments/VoiceCommentRecorder";
import VoiceMessageBubble from "../../components/messaging/VoiceMessageBubble";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { fanService } from "../../services/fanService";
import { publicationService } from "../../services/publicationService";
import { analyticsService } from "../../services/analyticsService";
import { repostService } from "../../services/repostService";
import { useRecommendationTracking } from "../../hooks/useRecommendationTracking";
import { resolveMediaUrl } from "../../utils/media";
import { canCreateFeedPost } from "../../utils/postPermissions";
import ContentEmptyState from "../../components/shared/ContentEmptyState";
import { confirmDialog } from "../../components/shared/AppDialogProvider";
import { canCreateStory } from "../../utils/storyPermissions";
import { useAuth } from "../../hooks/useAuth";
import { useSocialCapabilities } from "../../hooks/useSocialCapabilities";
import { useUnreadActivityCount } from "../../hooks/useUnreadActivityCount";
import { atseenReportReasons } from "../../data/atseenMockData";
import { relativeTime } from "../../utils/relativeTime";
import { isSeenOwner, normalizeId } from "../../utils/seenOwnership";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";

const seenReactionOptions = [
  { key: "SEE_YOU", get label() { return __msg("discover.iSeeYou"); }, icon: "\uD83D\uDC41\uFE0F" },
  { key: "LOVE", get label() { return __msg("fanWeb.love"); }, icon: "\u2764\uFE0F" },
  { key: "FIRE", get label() { return __msg("fanWeb.fire"); }, icon: "\uD83D\uDD25" },
  { key: "TEARY", get label() { return __msg("social.moved"); }, icon: "\uD83E\uDD79" },
  { key: "LAUGH", get label() { return __msg("fanWeb.laugh"); }, icon: "\uD83D\uDE02" },
  { key: "LIKE", get label() { return __msg("fanWeb.support"); }, icon: "\uD83E\uDD1D" },
  { key: "CLAP", get label() { return __msg("fanWeb.clap"); }, icon: "\uD83D\uDC4F" },
  { key: "WOW", get label() { return __msg("social.surprised"); }, icon: "\uD83D\uDE2E" },
  { key: "ADMIRE", get label() { return __msg("social.adore"); }, icon: "\uD83D\uDE0D" },
  { key: "SAD", get label() { return __msg("social.sad"); }, icon: "\uD83D\uDE22" },
  { key: "HUG", get label() { return __msg("social.hug"); }, icon: "\uD83E\uDEC2" },
  { key: "STRONG", get label() { return __msg("fanWeb.strong"); }, icon: "\uD83D\uDCAA" },
  { key: "PRAY", get label() { return __msg("fanWeb.respect"); }, icon: "\uD83D\uDE4F" },
  { key: "HUNDRED", get label() { return __msg("social.oneHundred"); }, icon: "\uD83D\uDCAF" },
  { key: "SPARKLES", get label() { return __msg("social.sparkles"); }, icon: "\u2728" },
];

const reactionLabel = Object.fromEntries(seenReactionOptions.map((item) => [item.key, item.icon]));
reactionLabel.INSIGHTFUL = "\uD83D\uDD25";
reactionLabel.PHONE = "\uD83D\uDCF1";
const reactionMeta = Object.fromEntries(seenReactionOptions.map((item, index) => [item.key, { ...item, order: index }]));
reactionMeta.INSIGHTFUL = { key: "INSIGHTFUL", get label() { return __msg("fanWeb.fire"); }, icon: "\uD83D\uDD25", order: 2 };
reactionMeta.PHONE = { key: "PHONE", get label() { return __msg("fanWeb.callMe"); }, icon: "\uD83D\uDCF1", order: 99 };

function formatCount(value = 0) {
  return new Intl.NumberFormat(__uiLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
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
  const mediaDescriptor = [media.mediaType, media.resourceType, media.type, media.mimeType, media.format, media.assetId, media.publicId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const mediaUrl = String(media.secureUrl || media.url || media.playbackUrl || "");
  const durationSeconds = Math.round(Number(media.durationSeconds ?? media.duration) || 0);
  const videoCover = mediaDescriptor.includes("video")
    || ["mp4", "webm", "mov", "m4v", "ogv"].some((format) => mediaDescriptor.split(/\s+/).includes(format))
    || /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i.test(mediaUrl)
    || durationSeconds > 0;
  return {
    id: String(raw.id || raw._id),
    title: raw.title || __msg("profile.untitledSeen"),
    description: raw.description || raw.summary || "",
    category: raw.category || raw.topic || "",
    createdAt: raw.publishedAt || raw.createdAt || "",
    statusVersion: Number(raw.statusVersion ?? 0),
    isPinned: Boolean(raw.isPinned || raw.pinned || raw.profilePinned || raw.featured),
    media: {
      type: videoCover ? "video" : "image",
      url: resolveMediaUrl(mediaUrl),
      durationSeconds,
    },
    chapters: (raw.chapters || []).map((chapter, index) => ({
      id: chapter.stableChapterId || chapter.id || `${raw.id}-${index}`,
      title: chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 }),
      blocks: chapter.blocks || [],
      locked: Boolean(chapter.locked),
      worldBonus: Boolean(chapter.worldBonus),
    })),
    bonusWorld: raw.bonusWorld || null,
    pricing: raw.pricing || { mode: "FREE", starsAmount: null },
    paymentAvailable: Boolean(raw.paymentAvailable),
    ownerCount: Number(raw.ownerCount || 0),
    attachedEntities: raw.attachedEntities || [],
    series: raw.series || null,
    seriesId: raw.seriesId || raw.series?._id || raw.series?.id || "",
    access: raw.access || "",
    creatorId: raw.creatorId || raw.ownerId || raw.createdBy || creator.id || creator._id || "",
    creator: {
      id: String(creator.id || creator._id || ""),
      displayName: creator.name || creator.displayName || creator.username || __msg("discover.creator"),
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
      authorName: raw.previewComment.author?.name || __msg("profile.fan"),
      avatarUrl: raw.previewComment.author?.avatar || "",
      text: raw.previewComment.text || "",
    } : null,
    readMinutes: formatReadTime(raw.chapters || []),
  };
}

function actionError(error) {
  if (error.response?.status === 401) return __msg("social.logInToUseThisSeenAction");
  if (error.response?.status === 403) return __msg("social.thisSeenActionIsNotAvailableForYour");
  return error.response?.data?.message || __msg("social.couldNotUpdateThisSeen");
}

function SeenSkeleton() {
  __useUiLanguage();
  return <div className="seen-proto-skeleton" aria-label={__msg("social.loadingSeen")}>
    <div className="seen-proto-skeleton-head"><span /><div><i /><b /></div></div>
    <div className="seen-proto-skeleton-content"><div className="seen-proto-skeleton-media" /><div><span /><span /><span /></div></div>
    <div className="seen-proto-skeleton-lines"><span /><span /><em /></div>
  </div>;
}

function SeenThinEyeMark({ className = "" }) {
  __useUiLanguage();
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M2.5 12C5.4 6.9 18.6 6.9 21.5 12C18.6 17.1 5.4 17.1 2.5 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>;
}

function SeenHeader({ activeTab, activityCount = 0, onTabChange, onActivity, onCreate, onSearch }) {
  __useUiLanguage();
  const activityLabel = activityCount > 99 ? "99+" : String(activityCount);
  return <header className="seen-proto-header">
    <nav aria-label={__msg("social.seenFeedTabs")} className="seen-proto-tabs">
      <button className={activeTab === "seen" ? "is-active" : ""} onClick={() => onTabChange("seen")} type="button"><SeenEyeMark className="seen-tab-eye-mark" />Seen</button>
      <button className={activeTab === "friends" ? "is-active" : ""} onClick={() => onTabChange("friends")} type="button">{__msg("stories.friends_c11d5e")}</button>
    </nav>
    <div className="seen-proto-header-actions">
      <button aria-label={__msg("fanWeb.create")} onClick={onCreate} type="button"><FiPlus /></button>
      <button aria-label={__msg("discover.search")} onClick={onSearch} type="button"><FiSearch /></button>
      <button aria-label={__msg("fan.openActivity")} className="seen-activity-button" onClick={onActivity} type="button">
        <ActivitySparkMark className="seen-activity-spark-mark" />
        {activityCount > 0 ? <span className="activity-count-badge">{activityLabel}</span> : null}
      </button>
    </div>
  </header>;
}

function CreatorHeader({ creator, createdAt, isOwn, onMenuToggle, onViewsClick, menuOpen, views }) {
  __useUiLanguage();
  const profileTo = creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/profile";
  const meta = [creator.location || creator.status || (creator.username ? `@${creator.username}` : __msg("constants.atSeen")), relativeTime(createdAt, "")].filter(Boolean).join(" - ");
  return <div className="seen-item-creator">
    <Link aria-label={__msg("stories.openProfile", { value0: creator.displayName })} className={`seen-avatar-ring ${creator.hasUnseenStory ? "has-story" : ""}`} to={profileTo}>
      <FanAvatar alt="" name={creator.displayName} size="h-[31px] w-[31px]" src={creator.avatarUrl} />
    </Link>
    <Link className="seen-creator-copy" to={profileTo}>
      <strong>{creator.displayName}{isOwn ? <em> {__msg("social.you")}</em> : null}{creator.verified ? <VerifiedBadge className="seen-verified" /> : null}</strong>
      <span>{meta}</span>
    </Link>
    {isOwn ? (
      <button aria-label={__msg("social.openSeenInsights")} className="seen-creator-views is-clickable" onClick={onViewsClick} type="button">
        <SeenThinEyeMark />
        {formatCount(views)}
      </button>
    ) : (
      <span className="seen-creator-views">
        <SeenThinEyeMark />
        {formatCount(views)}
      </span>
    )}
    <button aria-expanded={menuOpen} aria-label={__msg("social.openSeenOptions")} className="seen-more-button" onClick={onMenuToggle} type="button"><FiMoreHorizontal /></button>
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
  __useUiLanguage();
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
    { icon: FiBookmark, label: saved ? __msg("social.removeFromLibrary") : __msg("social.saveToLibrary"), onClick: onSave },
    { icon: FiSend, label: __msg("admin.share"), onClick: onShare },
    { icon: ShowMoreEyeIcon, label: __msg("fanWeb.showMoreLikeThis"), subtitle: __msg("fanWeb.tunesYourFeed"), onClick: onShowMore },
    { icon: FiEyeOff, label: __msg("social.notInterested"), onClick: onHide },
    { icon: FiFlag, label: __msg("discover.report"), onClick: onReport },
    { danger: true, icon: FiSlash, label: __msg("social.block", { value0: firstName }), onClick: onBlock },
  ];

  return <div className="seen-feed-options-layer" style={sheetPosition}>
    <button aria-label={__msg("social.closeSeenOptions")} className="seen-feed-options-scrim" onClick={onClose} type="button" />
    <section aria-label={__msg("social.optionsFor", { value0: itemTitle })} aria-modal="true" className="seen-feed-options-sheet" role="dialog">
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
  __useUiLanguage();
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

function SeenContextMenu({ busyAction = "", isOpen, isOwn, item, onArchive, onClose, onDelete, onEdit, onHide, onInsights, onMove, onMute, onPinToggle, onReact, onReactionMore, onReport, onRepost, onSave, onShare, pending }) {
  __useUiLanguage();
  const sheetPosition = useSeenSheetPosition(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const firstName = item.creator.displayName.split(" ").filter(Boolean)[0] || "creator";
  const chapterCount = item.chapters.length;
  const actions = isOwn ? [
    { icon: FiEdit3, key: "edit", title: __msg("profile.edit"), onClick: onEdit },
    { icon: FiZap, key: "pin", title: item.isPinned ? __msg("social.unpinFromTop") : __msg("social.pinToTop"), onClick: onPinToggle },
    { icon: FiChevronLeft, key: "earlier", title: __msg("social.moveEarlier"), onClick: () => onMove(-1) },
    { icon: FiChevronRight, key: "later", title: __msg("social.moveLater"), onClick: () => onMove(1) },
    { icon: FiBarChart2, key: "insights", title: __msg("profile.insights"), onClick: onInsights },
    { icon: FiArchive, key: "archive", title: __msg("fanWeb.archive"), onClick: onArchive },
    { danger: true, icon: FiTrash2, key: "delete", title: __msg("posts.delete"), onClick: onDelete },
  ] : [
    { icon: FiBookmark, key: "save", title: item.viewerState.saved ? __msg("profile.removeFromSaved") : __msg("contentEntities.save_efc007"), onClick: onSave },
    { icon: FiRepeat, key: "repost", title: item.viewerState.reposted ? __msg("fanWeb.removeRepost") : __msg("fanWeb.repost"), onClick: onRepost },
    { icon: FiUploadCloud, key: "share", title: __msg("admin.share"), onClick: onShare },
    { icon: FiEyeOff, key: "hide", title: __msg("social.notInterested"), onClick: onHide },
    { icon: FiVolumeX, key: "mute", title: __msg("social.muteValue0", { value0: firstName }), onClick: onMute },
    { danger: true, icon: FiFlag, key: "report", title: __msg("discover.report"), onClick: onReport },
  ];

  return <div className="seen-context-layer seen-feed-options-layer" style={sheetPosition}>
    <button aria-label={__msg("social.closeSeenActions")} className="seen-feed-options-scrim" onClick={onClose} type="button" />
    <section aria-label={`${isOwn ? __msg("verification.manage") : __msg("social.optionsFor_e3e2cf")} ${item.title}`} aria-modal="true" className={`seen-context-menu ${isOwn ? "is-owner" : "is-visitor"}`} role="dialog">
      {!isOwn ? <div aria-label={__msg("publication.reactToSeen")} className="seen-context-reactions">{seenReactionOptions.slice(0, 6).map((reaction) => <button aria-label={reaction.label} className={item.viewerState.reaction === reaction.key ? "is-selected" : ""} disabled={pending} key={reaction.key} onClick={() => onReact(reaction.key)} type="button">{reaction.icon}</button>)}<button aria-label={__msg("fanWeb.moreReactions")} disabled={pending} onClick={onReactionMore} type="button"><FiPlus /></button></div> : null}
      <div className="seen-context-preview">
        <span>{item.media.url ? item.media.type === "video" ? <video muted playsInline preload="metadata" src={item.media.url} /> : <img alt="" src={item.media.url} /> : <SeenEyeMark />}</span>
        <div><strong>{item.title}</strong><small>{isOwn ? "" : `${item.creator.displayName} · `}{chapterCount} {chapterCount === 1 ? __msg("profile.chapter_09d4c7") : __msg("discover.chapters")}</small></div>
      </div>
      <div className="seen-context-actions">{actions.map((action) => <SeenActionRow danger={action.danger} disabled={(!isOwn && pending) || (Boolean(busyAction) && busyAction !== action.key)} icon={action.icon} key={action.key} onClick={action.onClick} pending={busyAction === action.key} title={action.title} />)}</div>
    </section>
  </div>;
}

function OwnerSeenActionsSheet({ busyAction = "", isOpen, item, onAddStory, onArchive, onChangeCover, onClose, onDelete, onEdit, onInsights, onPinToggle, onSeries, onShare }) {
  __useUiLanguage();
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
  const metadata = ["Seen", `${chapterCount} ${chapterWord}`, relativeTime(item.createdAt, "") || __msg("profile.value0Min", { value0: item.readMinutes })].filter(Boolean).join(" · ");
  const busy = Boolean(busyAction);

  const actions = [
    { icon: FiUploadCloud, key: "share", title: __msg("admin.share"), onClick: onShare },
    { icon: FiPlusCircle, key: "story", title: __msg("activity.addToYourStory"), onClick: onAddStory },
    { icon: FiBarChart2, key: "insights", title: __msg("profile.insights"), onClick: onInsights },
    { icon: FiEdit3, key: "edit", title: __msg("profile.edit"), onClick: onEdit },
    { icon: FiImage, key: "cover", title: __msg("profile.changeCover"), onClick: onChangeCover },
    { icon: FiZap, key: "pin", title: item.isPinned ? __msg("profile.unpin") : __msg("profile.pinToProfile"), onClick: onPinToggle },
    { icon: FiGrid, key: "series", title: seriesName ? `Series: ${seriesName}` : __msg("profile.addToASeries"), onClick: onSeries },
    { icon: FiArchive, key: "archive", title: __msg("fanWeb.archive"), subtitle: __msg("profile.hiddenFromProfileStatsStay"), onClick: onArchive },
    { danger: true, icon: FiTrash2, key: "delete", title: __msg("posts.delete"), subtitle: __msg("profile.goneForEveryone"), onClick: onDelete },
  ];

  return (
    <div className="seen-feed-options-layer seen-owner-options-layer" style={sheetPosition}>
      <button aria-label={__msg("profile.closeSeenOwnerActions")} className="seen-feed-options-scrim" onClick={onClose} type="button" />
      <section aria-label={__msg("profile.manage_4047c4", { value0: item.title })} aria-modal="true" className="seen-owner-actions-sheet" role="dialog">
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

function SeenInsightsSheet({ fallbackViews = 0, insightsQuery, isOpen, onClose, title }) {
  __useUiLanguage();
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
  const dailyByDate = new Map((insights.dailyViews || []).map((row) => [row._id || row.date, Number(row.value ?? row.views ?? 0)]));
  const dailyViews = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return dailyByDate.get(date.toISOString().slice(0, 10)) || 0;
  });
  const maxDailyViews = Math.max(1, ...dailyViews);
  const totalViews = Number(insights.totalViews ?? insights.opens ?? insights.views ?? fallbackViews ?? 0);
  const todayViews = Number(insights.todayViews ?? dailyViews[6] ?? 0);
  const readToEndValue = insights.readToEndPercent;
  const hasReadToEnd = readToEndValue !== null && readToEndValue !== undefined && Number.isFinite(Number(readToEndValue));
  const readToEnd = hasReadToEnd ? Math.max(0, Math.min(100, Number(readToEndValue))) : 0;
  const weekChange = Number.isFinite(Number(insights.weekChangePercent)) ? Number(insights.weekChangePercent) : null;
  const metrics = [[__msg("fanWeb.reactions"), insights.reactions], [__msg("contentEntities.saved"), insights.saves], [__msg("settings.reposts"), insights.shares], [__msg("admin.comments"), insights.comments]];
  const sourceLabels = { feed: __msg("social.feed"), profile: __msg("social.profile"), reposts: __msg("settings.reposts") };
  const trafficSources = insights.trafficSources?.length ? insights.trafficSources : Object.keys(sourceLabels).map((source) => ({ source, percent: 0 }));
  return (
    <div className="seen-feed-options-layer" style={sheetPosition}>
      <button aria-label={__msg("social.closeSeenInsights")} className="seen-feed-options-scrim" onClick={onClose} type="button" />
      <section aria-label={__msg("social.insightsFor", { value0: title })} aria-modal="true" className="seen-owner-actions-sheet seen-insights-sheet" role="dialog">
        <span className="seen-feed-options-handle" aria-hidden="true" />
        {insightsQuery.isLoading ? <p className="seen-insights-state">{__msg("social.loadingInsights")}</p> : null}
        {insightsQuery.isError ? <button className="seen-insights-state" onClick={() => insightsQuery.refetch()} type="button">{__msg("social.unableToLoadInsightsRetry")}</button> : null}
        {!insightsQuery.isLoading && !insightsQuery.isError ? <div className="seen-insights-content">
          <p className="seen-insights-title">{title}</p>
          <div className="seen-insights-total"><strong>{totalViews.toLocaleString(__uiLocale())}</strong><span>{__msg("social.views")}</span>{weekChange === null ? null : <em className={weekChange < 0 ? "is-down" : ""}>{weekChange < 0 ? "↓" : "↑"} {Math.abs(weekChange)}{__msg("social.week")}</em>}</div>
          <p className="seen-insights-today"><b>{__msg("profile.today")}</b> · {todayViews.toLocaleString(__uiLocale())} {todayViews === 1 ? __msg("social.view") : __msg("social.views")}</p>
          <div aria-label={__msg("social.viewsOverTheLast7Days")} className="seen-insights-chart">{dailyViews.map((value, index) => <i className={index === 6 ? "is-today" : ""} key={index} style={{ "--bar-height": `${Math.max(value ? 18 : 4, (value / maxDailyViews) * 100)}%` }}><span>{value}</span></i>)}</div>
          <div className="seen-insights-chart-labels"><span>{__msg("social.7DaysAgo")}</span><span>{__msg("orbit.today")}</span></div>
          <div className="seen-insights-completion"><span>{__msg("social.readToTheEnd")}</span><b>{hasReadToEnd ? `${readToEnd}%` : __msg("admin.unavailable")}</b><i><span style={{ width: `${readToEnd}%` }} /></i></div>
          <div className="seen-insights-metrics">{metrics.map(([label, value]) => <span key={label}><b>{Number(value || 0).toLocaleString(__uiLocale())}</b><small>{label}</small></span>)}</div>
          <h3>{__msg("social.whereTheyCameFrom")}</h3>
          <div className="seen-insights-sources">{trafficSources.map(({ source, percent }) => <div className={`is-${source}`} key={source}><span>{sourceLabels[source] || source}</span><b>{Number(percent || 0)}%</b><i><span style={{ width: `${Math.max(0, Math.min(100, Number(percent || 0)))}%` }} /></i></div>)}</div>
          <p className="seen-insights-private">{__msg("stories.onlyYouSeeThis")}</p>
        </div> : null}
      </section>
    </div>
  );
}

function SeenReportSheet({ done, isOpen, onClose, onReport, pending, title }) {
  __useUiLanguage();
  const sheetPosition = useSeenSheetPosition(isOpen);

  if (!isOpen) return null;
  return <div className="seen-feed-options-layer" style={sheetPosition}><button aria-label={__msg("fan.closeReport")} className="seen-feed-options-scrim" onClick={onClose} type="button" /><section aria-modal="true" className="seen-feed-options-sheet" role="dialog"><span className="seen-feed-options-handle" /><h2>{done ? __msg("fanWeb.reportReceived") : __msg("profile.report", { value0: title })}</h2>{done ? <div className="p-4"><p className="text-sm leading-6 text-white/60">{__msg("fanWeb.ourTeamReviewsEveryReportYouWillNotBe")}</p><button className="mt-4 w-full rounded-xl bg-atseen-blue px-4 py-3 text-sm font-bold text-slate-950" onClick={onClose} type="button">{__msg("comments.done")}</button></div> : <div className="seen-feed-options-list"><p className="px-4 py-2 text-xs text-white/50">{__msg("social.whyAreYouReportingThisSeen")}</p>{atseenReportReasons.map((reason) => <button disabled={pending} key={reason} onClick={() => onReport(reason)} type="button"><FiFlag /><span><b>{reason}</b></span></button>)}</div>}</section></div>;
}

function CompactSeenMedia({ item, onOpen }) {
  __useUiLanguage();
  const isVideo = item.media.type === "video";
  const [muted, setMuted] = useState(true);

  useEffect(() => setMuted(true), [item.id]);

  return <div className="seen-media-wrap">
    <button aria-label={__msg("contentEntities.open", { value0: item.title })} className="seen-media" onClick={onOpen} type="button">
      {item.media.url ? <PublicationCoverMedia alt={__msg("discover.cover", { value0: item.title })} autoPlay loop maxPlaybackSeconds={6} media={{ mediaType: isVideo ? "VIDEO" : "IMAGE", secureUrl: item.media.url }} muted={muted} /> : <span className="seen-media-fallback">@seen</span>}
      {isVideo && item.media.durationSeconds ? <span className="seen-video-pill">▶ {formatDuration(item.media.durationSeconds)}</span> : null}
    </button>
    {isVideo && item.media.url ? <button aria-label={muted ? __msg("social.unmuteVideo") : __msg("social.muteVideo")} aria-pressed={!muted} className="seen-video-sound-toggle" onClick={() => setMuted((value) => !value)} title={muted ? __msg("social.unmuteVideo") : __msg("social.muteVideo")} type="button">{muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}</button> : null}
  </div>;
}

function SeenSummary({ item, onOpenChapter, onPurchase }) {
  __useUiLanguage();
  const chapterCount = item.chapters.length;
  const chapterWord = chapterCount === 1 ? "chapter" : "chapters";
  const meta = [`${chapterCount} ${chapterWord}`, __msg("profile.value0Min", { value0: item.readMinutes })].join(" Â· ");
  return <div className="seen-summary">
    <CompactSeenMedia item={item} onOpen={() => onOpenChapter(0)} />
    <div className="seen-summary-copy">
      <button className="seen-summary-main-link" onClick={() => onOpenChapter(0)} type="button">
        {item.category ? <em>{item.category}</em> : null}
        <strong>{item.title}</strong>
        <small>{meta}</small>
        {item.description ? <p>{item.description}</p> : null}
      </button>
    </div>
    {item.pricing?.mode === "ONE_TIME" && item.access === "ENTITLED_SEEN" ? <button className="seen-paid-overview-unlock is-owned" onClick={() => onOpenChapter(0)} type="button"><span>{__msg("system.SeenFeedPage.755844bc39")}</span><small>{__msg("system.SeenFeedPage.7243089e5c")}</small><b>{__msg("publication.open")}</b></button> : null}
    {item.pricing?.mode === "ONE_TIME" && item.access !== "ENTITLED_SEEN" ? <button className="seen-paid-overview-unlock" disabled={!item.paymentAvailable} onClick={onPurchase} type="button"><span><FiLock /> ✦ {Number(item.pricing.starsAmount || 0).toLocaleString(__uiLocale())}</span><small>{__msg("system.SeenFeedPage.fc2d3a48d2")} {item.ownerCount.toLocaleString(__uiLocale())} {__msg("profile.ownIt")}</small><b>{item.paymentAvailable ? __msg("system.SeenFeedPage.310e3f8652") : __msg("admin.unavailable")}</b></button> : null}
    <ChapterPreviewList chapters={item.chapters} maxVisible={5} onOpenChapter={onOpenChapter} />
  </div>;
}

function ChapterPreviewList({ chapters, maxVisible = 3, onOpenChapter }) {
  __useUiLanguage();
  if (!chapters.length) return null;
  const visible = chapters.slice(0, maxVisible);
  const extra = chapters.length - visible.length;
  return <div className="seen-chapter-list" aria-label={__msg("social.seenChapters")}>
    {visible.map((chapter, index) => (
      <button className="seen-chapter-preview" key={chapter.id || index} onClick={() => onOpenChapter(index)} type="button">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{chapter.locked ? <><FiLock /> {chapter.title}</> : chapter.title}</strong>
        <FiChevronRight aria-hidden="true" />
      </button>
    ))}
    {extra > 0 ? <button className="seen-chapter-preview is-more" onClick={() => onOpenChapter(visible.length)} type="button"><span>+{extra}</span><strong>{__msg("social.moreInside")}</strong><FiChevronRight aria-hidden="true" /></button> : null}
  </div>;
}

function InlineChapterBlock({ block }) {
  __useUiLanguage();
  const type = String(block?.type || "TEXT").toUpperCase();
  const url = resolveMediaUrl(block?.secureUrl || block?.url || block?.media?.secureUrl || block?.media?.url || "");
  if (type.includes("IMAGE") || type.includes("PHOTO")) return url ? <img alt={block.alt || ""} className="seen-inline-image" src={url} /> : null;
  if (type.includes("VIDEO")) return url ? <video className="seen-inline-image" controls playsInline poster={resolveMediaUrl(block?.thumbnailUrl || "")} src={url} /> : null;
  if (type.includes("AUDIO") || type.includes("VOICE")) return <div className="seen-inline-audio"><button aria-label={__msg("social.playVoiceNote")} type="button"><FiPlay /></button><span aria-hidden="true">||||||||||</span><small>{formatDuration(block.durationSeconds || block.duration)}</small></div>;
  if (type.includes("HIGHLIGHT") || type.includes("QUOTE")) return <blockquote>{block.text || block.label || ""}</blockquote>;
  const points = block.items || block.points || block.options;
  if (Array.isArray(points) && points.length) return <ul>{points.map((point, index) => <li key={point.id || index}>{point.text || point.label || String(point)}</li>)}</ul>;
  return block?.text || block?.label ? <p>{block.text || block.label}</p> : null;
}

function InlineSeenChapter({ chapter, chapterIndex, chapters, item, onJoinWorld, onOverview, onPurchase, onSelect }) {
  __useUiLanguage();
  const blocks = chapter?.blocks || [];
  const nextChapter = chapters[chapterIndex + 1];
  if (chapter?.worldBonus && chapter?.locked && item.bonusWorld) return <section className="seen-inline-chapter is-world-bonus" aria-live="polite">
    <div className="seen-inline-chapter-kicker"><b>{String(chapterIndex + 1).padStart(2, "0")}</b><span>{__msg("profile.chapter")} {chapterIndex + 1} {__msg("onboarding.of")} {chapters.length}</span></div>
    <h2>{chapter.title || item.title}</h2><i className="seen-inline-accent" />
    <div className="seen-paid-locked-blur" aria-hidden="true"><i /><i /><i /></div>
    <div className="seen-world-bonus-card"><span aria-hidden="true">◉</span><h3>{__msg("system.SeenFeedPage.34ab070662")} {item.creator.displayName.split(" ")[0]}{__msg("profile.sWorld")}</h3><p>{__msg("system.SeenFeedPage.4a66d14807")} {item.creator.displayName.split(" ")[0]} {__msg("system.SeenFeedPage.d1ae84013a")}</p><button onClick={onJoinWorld} type="button">{__msg("system.SeenFeedPage.70ba407056")} <CoinIcon size={12} /> {Number(item.bonusWorld.firstMonthStars || item.bonusWorld.regularStars || 0).toLocaleString(__uiLocale())} {__msg("social.firstMonth")}</button></div>
    <button className="seen-world-bonus-back" onClick={onOverview} type="button">‹ <b>{__msg("creator.backToOverview")}</b></button>
  </section>;
  if (chapter?.locked) return <section className="seen-inline-chapter is-locked" aria-live="polite">
    <div className="seen-inline-chapter-kicker"><b>{String(chapterIndex + 1).padStart(2, "0")}</b><span>{__msg("profile.chapter")} {chapterIndex + 1} {__msg("onboarding.of")} {chapters.length}</span></div>
    <h2>{chapter.title || item.title}</h2><i className="seen-inline-accent" />
    <div className="seen-paid-locked-blur" aria-hidden="true"><i /><i /><i /></div>
    <div className="seen-paid-locked-card"><span><FiLock /></span><h2>{__msg("system.SeenFeedPage.7898d6a540")}</h2><p>{__msg("system.SeenFeedPage.1446710a0d")} {item.ownerCount.toLocaleString(__uiLocale())} {__msg("profile.ownIt")}</p><button onClick={onPurchase} type="button">{__msg("system.SeenFeedPage.8c6ae9a2fd")} {Number(item.pricing?.starsAmount || 0).toLocaleString(__uiLocale())}</button></div>
    {nextChapter ? <button className="seen-inline-next" onClick={() => onSelect(chapterIndex + 1)} type="button"><small>{__msg("onboarding.next")}</small><strong>{String(chapterIndex + 2).padStart(2, "0")} <span aria-hidden="true">&middot;</span> {nextChapter.locked ? <FiLock aria-label={__msg("system.SeenFeedPage.2a02ed17e8")} /> : null}{nextChapter.title}</strong><FiChevronRight /></button> : <button className="seen-inline-next" onClick={onOverview} type="button"><small>{__msg("comments.done")}</small><strong>{__msg("creator.backToOverview")}</strong><FiChevronRight /></button>}
  </section>;
  return <section className="seen-inline-chapter" aria-live="polite">
    <div className="seen-inline-chapter-kicker"><b>{String(chapterIndex + 1).padStart(2, "0")}</b><span>{__msg("profile.chapter")} {chapterIndex + 1} {__msg("onboarding.of")} {chapters.length}</span></div>
    <h2>{chapter?.title || item.title}</h2>
    <i className="seen-inline-accent" />
    <div className="seen-inline-blocks">{blocks.length ? blocks.map((block, index) => <InlineChapterBlock block={block} key={block.id || `${chapter.id}-${index}`} />) : <p>{__msg("social.thisChapterHasNoContentYet")}</p>}</div>
    {nextChapter ? <button className="seen-inline-next" onClick={() => onSelect(chapterIndex + 1)} type="button"><small>{__msg("onboarding.next")}</small><strong>{String(chapterIndex + 2).padStart(2, "0")} <span aria-hidden="true">&middot;</span> {nextChapter.locked ? <FiLock aria-label={__msg("system.SeenFeedPage.2a02ed17e8")} /> : null}{nextChapter.title}</strong><FiChevronRight /></button> : <button className="seen-inline-next" onClick={onOverview} type="button"><small>{__msg("comments.done")}</small><strong>{__msg("creator.backToOverview")}</strong><FiChevronRight /></button>}
  </section>;
}

function PreviewComment({ comment }) {
  __useUiLanguage();
  if (!comment?.text) return null;
  return <div className="seen-preview-comment">
    <FanAvatar alt="" name={comment.authorName} size="h-[17px] w-[17px]" src={comment.avatarUrl} />
    <p>“{comment.text}”</p>
  </div>;
}

function CommentsPanel({ currentUser, engagementQuery, item, mutation, onEngagementChange, value, onChange, onSubmit }) {
  __useUiLanguage();
  const comments = engagementQuery.data?.comments || [];
  const [replyTo, setReplyTo] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [voiceCommentOpen, setVoiceCommentOpen] = useState(false);
  const [reposted, setReposted] = useState({});
  const repostCommentMutation = useMutation({
    mutationFn: (comment) => repostService.toggle("cm", comment.id, "SeenEngagement").then((response) => ({ comment, ...response.data.data })),
    onSuccess: ({ comment, reposted: value }) => setReposted((current) => ({ ...current, [comment.id]: value })),
  });
  const voiceCommentMutation = useMutation({
    mutationFn: (recording) => publicationService.voiceCommentOnSeen(item.id, { audioBlob: recording.audioBlob, text: recording.text, waveform: recording.waveform }),
    onSuccess: (response) => {
      onEngagementChange(response.data.data.engagement);
      setVoiceCommentOpen(false);
    },
  });
  const commentReactionMutation = useMutation({
    mutationFn: ({ comment, reaction }) => (reaction
      ? publicationService.reactToSeenComment(item.id, comment.id, reaction)
      : publicationService.removeSeenCommentReaction(item.id, comment.id)),
    onSuccess: (response) => {
      onEngagementChange(response.data.data.engagement);
      setReactionTarget(null);
    },
  });
  useEffect(() => {
    if (!mutation.isSuccess) return;
    setReplyTo(null);
  }, [mutation.isSuccess]);
  const beginReply = (comment) => {
    setReplyTo(comment);
    onChange("");
  };
  const renderComment = (comment, nested = false) => {
    const reactionIcons = (comment.topReactions || []).map((key) => reactionLabel[key] || reactionLabel.INSIGHTFUL).join("") || "🤝";
    return <article className={nested ? "is-reply" : ""} key={comment.id}>
      <FanAvatar alt="" name={comment.author?.name || "Fan"} size="h-6 w-6" src={comment.author?.avatar} />
      <div className="seen-comment-copy">
        <p><Link to={comment.author?.username ? `/profile/${comment.author.username}` : `/seen/${item.id}`}>{comment.author?.name || __msg("profile.fan")}</Link>{comment.text}</p>
        {comment.audio ? <VoiceMessageBubble audio={comment.audio} label={__msg("comments.voiceComment")} /> : null}
        <span><button aria-label={__msg("social.reactTo", { value0: comment.author?.name || "comment" })} className={comment.viewerReaction ? "is-selected seen-comment-reaction" : "seen-comment-reaction"} onClick={() => setReactionTarget(comment)} type="button"><b aria-hidden="true">{reactionIcons}</b>{formatCount(comment.reactionCount || 0)}</button>{nested ? null : <button onClick={() => beginReply(comment)} type="button">{__msg("fan.reply")}</button>}{String(comment.author?.id || "") !== String(currentUser?.id || currentUser?._id || "") ? <button aria-label={__msg("system.WallCommentList.eab1801d81")} className={(reposted[comment.id] ?? comment.viewerReposted) ? "is-selected" : ""} disabled={repostCommentMutation.isPending} onClick={() => repostCommentMutation.mutate(comment)} type="button"><FiRepeat /></button> : null}</span>
      </div>
    </article>;
  };
  return <section className="seen-comments-panel">
    <div className="seen-comments-list">
      {comments.slice(0, 2).map((comment) => <div className="seen-comment-thread" key={comment.id}>{renderComment(comment)}{(comment.replies || []).slice(0, 2).map((reply) => renderComment(reply, true))}</div>)}
      {!comments.length && !engagementQuery.isLoading ? <p className="seen-comments-empty">{__msg("fanWeb.beTheFirstToComment")}</p> : null}
    </div>
    {replyTo ? <div className="seen-replying-to"><span>{__msg("creator.replyingTo")} <b>{replyTo.author?.name || __msg("profile.fan")}</b></span><button aria-label={__msg("fan.cancelReply")} onClick={() => setReplyTo(null)} type="button">×</button></div> : null}
    <form onSubmit={(event) => onSubmit(event, replyTo?.id)}>
      <FanAvatar alt="" name={currentUser?.displayName || currentUser?.name || currentUser?.username || "You"} size="h-6 w-6" src={currentUser?.avatarUrl || currentUser?.avatar} />
      <label>
        <input aria-label={__msg("profile.addASeenComment")} maxLength={500} onChange={(event) => onChange(event.target.value)} placeholder={__msg("fanWeb.addAComment")} value={value} />
        <button aria-label={__msg("fanWeb.recordAVoiceComment")} className="seen-comment-mic" disabled={mutation.isPending || voiceCommentMutation.isPending} onClick={() => setVoiceCommentOpen(true)} type="button"><FiMic /></button>
      </label>
      <button className="seen-comment-post" disabled={!value.trim() || mutation.isPending} type="submit">{__msg("fanWeb.post")}</button>
    </form>
    {voiceCommentOpen ? <VoiceCommentRecorder busy={voiceCommentMutation.isPending} onClose={() => setVoiceCommentOpen(false)} onSubmit={(recording) => voiceCommentMutation.mutate(recording)} /> : null}
    {reactionTarget ? <ReactionPicker item={{ title: `Comment by ${reactionTarget.author?.name || "Fan"}`, engagement: { reactionBreakdown: reactionTarget.reactionBreakdown || {} }, viewerState: { reaction: reactionTarget.viewerReaction } }} onClose={() => setReactionTarget(null)} onSelect={(reaction) => commentReactionMutation.mutate({ comment: reactionTarget, reaction })} pending={commentReactionMutation.isPending} /> : null}
  </section>;
}

function reactionCluster(item) {
  const top = item.engagement.topReactions?.length ? item.engagement.topReactions : orderedReactionCounts(item.engagement.reactionBreakdown).map((reaction) => reaction.type);
  return top.slice(0, 3).map((key) => reactionLabel[key] || reactionLabel.INSIGHTFUL).join("");
}

function SeenReactionsSheet({ currentUserId, item, onAddYours, onClose }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const sheetPosition = useSeenSheetPosition(true);
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

  return <div className="seen-reactions-layer" style={sheetPosition}>
    <button aria-label={__msg("fanWeb.closeReactions")} className="seen-reactions-scrim" onClick={onClose} type="button" />
    <section aria-label={__msg("social.reactionsFor", { value0: item.title })} aria-modal="true" className="seen-reactors-sheet" role="dialog">
      <span aria-hidden="true" className="seen-reactors-handle" />
      <header className="seen-reactors-header">
        <h2>{__msg("fanWeb.reactions")}</h2>
        <span>{formatCount(item.engagement.reactions)}</span>
      </header>
      <div aria-label={__msg("fanWeb.reactionFilters")} className="seen-reactors-tabs" role="tablist">
        <button aria-selected={!activeReaction} className={!activeReaction ? "is-active" : ""} onClick={() => setActiveReaction(null)} role="tab" type="button">{__msg("fanWeb.all")}</button>
        {reactionCounts.map((reaction) => <button aria-selected={activeReaction === reaction.type} className={activeReaction === reaction.type ? "is-active" : ""} key={reaction.type} onClick={() => setActiveReaction(reaction.type)} role="tab" type="button"><span aria-hidden="true">{reaction.icon}</span>{formatCount(reaction.count)}</button>)}
      </div>
      <div className="seen-reactors-list">
        {query.isLoading ? <p className="seen-reactors-state">{__msg("fanWeb.loadingReactions")}</p> : null}
        {query.isError ? <div className="seen-reactors-state"><p>{__msg("fanWeb.couldNotLoadReactions")}</p><button onClick={() => query.refetch()} type="button">{__msg("activity.retry")}</button></div> : null}
        {!query.isLoading && !query.isError && reactors.length ? reactors.map((reactor) => {
          const isCurrentUser = String(reactor.user?.id || "") === String(currentUserId || "");
          const name = isCurrentUser ? __msg("fanWeb.you") : reactor.user?.displayName || reactor.user?.username || __msg("social.atseenUser");
          return <button className="seen-reactor-row" key={reactor.id} onClick={() => openProfile(reactor.user || {})} type="button">
            <FanAvatar alt={__msg("fan.avatar", { value0: name })} name={name} size="h-[38px] w-[38px]" src={reactor.user?.avatarUrl} />
            <span className="seen-reactor-copy">
              <strong>{name}{reactor.user?.verified ? <VerifiedBadge className="seen-reactor-verified" /> : null}</strong>
              {reactor.user?.username ? <small>@{reactor.user.username}</small> : null}
            </span>
            <span aria-label={reactionMeta[reactor.reaction]?.label || __msg("fanWeb.reaction")} className="seen-reactor-emoji">{reactionLabel[reactor.reaction] || reactionLabel.INSIGHTFUL}</span>
          </button>;
        }) : null}
        {!query.isLoading && !query.isError && !reactors.length ? <p className="seen-reactors-state">{__msg("fanWeb.noReactionsYet")}</p> : null}
        {query.hasNextPage ? <button className="seen-reactors-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} type="button">{query.isFetchingNextPage ? __msg("admin.loading") : __msg("fan.loadMore")}</button> : null}
      </div>
      <button className="seen-reactors-add" onClick={onAddYours} type="button">{__msg("fanWeb.addYours")}</button>
    </section>
  </div>;
}

function ReactionPicker({ item, onClose, onSelect, pending }) {
  __useUiLanguage();
  const selectedReaction = item.viewerState.reaction;
  const sheetPosition = useSeenSheetPosition(true);
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

  return <div className="seen-reactions-layer" style={sheetPosition}>
    <button aria-label={__msg("fanWeb.closeReactions")} className="seen-reactions-scrim" onClick={onClose} type="button" />
    <section aria-label={__msg("social.chooseAReactionFor", { value0: item.title })} aria-modal="true" className="seen-reaction-sheet" role="dialog">
    <span aria-hidden="true" className="seen-reaction-handle" />
    <div aria-label={__msg("social.chooseASeenReaction")} className="seen-reaction-grid" role="group">
      {seenReactionOptions.map((reaction) => {
        const count = Number(item.engagement.reactionBreakdown?.[reaction.key]) || 0;
        const selected = selectedReaction === reaction.key || (selectedReaction === "INSIGHTFUL" && reaction.key === "FIRE");
        return <button aria-label={__msg("fanWeb.reaction_bfb553", { value0: selected ? __msg("profile.remove") : __msg("fanWeb.send"), value1: reaction.label })} aria-pressed={selected} className={selected ? "is-selected seen-reaction-option" : "seen-reaction-option"} disabled={pending} key={reaction.key} onClick={() => onSelect(selected ? "" : reaction.key)} type="button">
          <span aria-hidden="true">{reaction.icon}</span>
          <small>{count || ""}</small>
        </button>;
      })}
    </div>
    <p>{__msg("social.oneReactionMakeItYours")}</p>
    </section>
  </div>;
}

function EngagementBar({ item, onCommentToggle, onCopyLink, onReactHold, onReactOpen, onRepost, onSave, commentsOpen, isOwn = false, pending }) {
  __useUiLanguage();
  const selected = item.viewerState;
  const holdTimer = useRef(null);
  const held = useRef(false);
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);
  const cancelHold = () => window.clearTimeout(holdTimer.current);
  return <div className="seen-engagement-bar">
    <div className="seen-engagement-left">
      <button aria-label={selected.reaction ? __msg("social.changeReaction") : __msg("publication.reactToSeen")} className={selected.reaction ? "is-selected seen-reactions" : "seen-reactions"} disabled={pending} onClick={() => { if (!held.current) onReactOpen(); held.current = false; }} onPointerCancel={cancelHold} onPointerDown={() => { held.current = false; holdTimer.current = window.setTimeout(() => { held.current = true; onReactHold(); navigator.vibrate?.(12); }, 420); }} onPointerLeave={cancelHold} onPointerUp={cancelHold} type="button">
        <span>{reactionCluster(item)}</span><b>{formatCount(item.engagement.reactions)}</b>
      </button>
      <button aria-expanded={commentsOpen} aria-label={__msg("fanWeb.openComments")} className={commentsOpen ? "is-selected" : ""} onClick={onCommentToggle} type="button"><FiMessageCircle /><b>{formatCount(item.engagement.comments)}</b></button>
      {!isOwn ? <button aria-label={selected.reposted ? __msg("fanWeb.removeRepost") : __msg("social.repostSeen")} className={selected.reposted ? "is-selected" : ""} disabled={pending} onClick={onRepost} type="button"><FiRepeat /><b>{formatCount(item.engagement.reposts)}</b></button> : null}
    </div>
    <div className="seen-engagement-right">
      <button aria-label={selected.saved ? __msg("profile.removeFromSaved") : __msg("publication.saveSeen")} className={selected.saved ? "is-selected" : ""} disabled={pending} onClick={onSave} type="button"><FiBookmark fill={selected.saved ? "currentColor" : "none"} /></button>
      <button aria-label={__msg("social.shareSeenLink")} onClick={onCopyLink} type="button"><FiSend /></button>
    </div>
  </div>;
}

export function SeenFeedItem({ animateOnScroll = true, batchId = "", currentUser = null, item: rawItem, onFeedMove = () => {}, onFeedRemove, onFeedRemoveByCreator, onFeedReplace, onFeedUpdate, position = 0 }) {
  __useUiLanguage();
  const item = normalizeSeen(rawItem);
  const reduceMotion = useReducedMotion();
  const target = `/seen/${encodeURIComponent(item.id)}`;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useFanToast();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [reactionsSheetOpen, setReactionsSheetOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeLink, setNoticeLink] = useState("");
  const [actionPill, setActionPill] = useState("");
  const [busyOwnerAction, setBusyOwnerAction] = useState("");
  const [activeChapter, setActiveChapter] = useState(-1);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(1);
  const [mobileSwipe, setMobileSwipe] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const longPressRef = useRef({ startX: 0, startY: 0, timer: null });
  const lastContentTapRef = useRef({ at: 0, x: 0, y: 0 });
  const trackingTopics = useMemo(() => [item.category].filter(Boolean), [item.category]);
  const trackingRef = useRecommendationTracking({ batchId, creatorId: item.creator.id, entityId: item.id, entityType: "seen", position, topics: trackingTopics });
  const engagementQuery = useQuery({
    enabled: commentsOpen || reactionPickerOpen,
    queryKey: ["seen-engagement", item.id],
    queryFn: () => publicationService.getSeenEngagement(item.id).then((response) => response.data.data.engagement),
    retry: false,
  });

  useEffect(() => {
    if (!actionPill) return undefined;
    const timeout = window.setTimeout(() => setActionPill(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [actionPill]);

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
        setActionPill(__msg("social.reposted"));
      } else {
        setActionPill(__msg("social.repostRemoved"));
      }
      setNotice("");
      setNoticeLink("");
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => runAction(publicationService.toggleSeenSave(item.id)),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      setActionPill(response.data.data.engagement?.viewerSaved ? __msg("contentEntities.saved") : __msg("social.removedFromSaved"));
      setNotice("");
      setNoticeLink("");
    },
  });
  const commentMutation = useMutation({
    mutationFn: ({ text, parentCommentId }) => runAction(publicationService.commentOnSeen(item.id, text, "", parentCommentId)),
    onSuccess: () => {
      setComment("");
      setCommentsOpen(true);
    },
  });
  const hideMutation = useMutation({
    mutationFn: () => publicationService.hideSeen(item.id),
    onSuccess: () => {
      void analyticsService.trackRecommendationSignal({ batchId, creatorId: item.creator.id, entityId: item.id, eventType: "NOT_INTERESTED", position, reason: "hide_seen", topics: [item.category].filter(Boolean) });
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
      showToast(!item.isPinned ? __msg("social.pinned") : __msg("social.unpinned"));
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
      showToast(__msg("system.SeenFeedPage.75f83ea34e"));
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
      showToast(__msg("social.seenDeleted"));
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
    mediaType: item.media.type,
    textPreview: `${item.title} — ${item.creator.displayName.split(" ").filter(Boolean)[0] || item.creator.displayName}`,
    title: item.title,
  }), [item.creator.avatarUrl, item.creator.displayName, item.creator.id, item.creator.username, item.id, item.media.type, item.media.url, item.title, shareUrl, target]);
  const submitComment = (event, parentCommentId = "") => {
    event.preventDefault();
    const text = comment.trim();
    if (text) commentMutation.mutate({ text, parentCommentId });
  };
  const selectReaction = (reaction) => {
    if (reactionMutation.isPending) return;
    reactionMutation.mutate(reaction);
  };
  const addHeartFromDoubleTap = () => {
    // A double tap is additive: an existing heart stays selected rather than
    // being toggled off. Any other reaction is replaced, preserving the
    // one-reaction-per-person invariant enforced by the API.
    if (reactionMutation.isPending || item.viewerState.reaction === "LOVE") return;
    reactionMutation.mutate("LOVE");
  };
  const detectTouchDoubleTap = (event) => {
    if (event.pointerType !== "touch") return;
    const previous = lastContentTapRef.current;
    const now = Date.now();
    const nearby = Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 34;
    if (previous.at && now - previous.at <= 320 && nearby) {
      lastContentTapRef.current = { at: 0, x: 0, y: 0 };
      addHeartFromDoubleTap();
      return;
    }
    lastContentTapRef.current = { at: now, x: event.clientX, y: event.clientY };
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
  const openChangeCover = () => {
    setMenuOpen(false);
    navigate(`/studio/seens/${item.id}/edit?from=seen&focus=cover`);
  };
  const openAddToStory = () => {
    setMenuOpen(false);
    navigate(`/seen/${encodeURIComponent(item.id)}/share/story`, { state: { fromOwnerMenu: true } });
  };
  const confirmDelete = async () => {
    const accepted = await confirmDialog({
      title: __msg("system.SeenFeedPage.29a32cfec6"),
      message: __msg("system.SeenFeedPage.904ee0f865"),
      confirmLabel: __msg("system.SeenFeedPage.29a32cfec6"),
    });
    if (!accepted) return;
    deleteMutation.mutate();
  };
  const closeContextMenu = () => setContextMenuOpen(false);
  const runContextAction = (action) => {
    closeContextMenu();
    action();
  };
  const clearLongPress = () => {
    if (longPressRef.current.timer) window.clearTimeout(longPressRef.current.timer);
    longPressRef.current.timer = null;
  };
  const startLongPress = (event) => {
    if (event.pointerType === "mouse" || event.target.closest?.("button, a, input, textarea, select, video, audio, [role='dialog']")) return;
    clearLongPress();
    longPressRef.current.startX = event.clientX;
    longPressRef.current.startY = event.clientY;
    longPressRef.current.timer = window.setTimeout(() => {
      setMenuOpen(false);
      setContextMenuOpen(true);
      navigator.vibrate?.(18);
      longPressRef.current.timer = null;
    }, 520);
  };
  const moveLongPress = (event) => {
    if (!longPressRef.current.timer) return;
    if (Math.hypot(event.clientX - longPressRef.current.startX, event.clientY - longPressRef.current.startY) > 10) clearLongPress();
  };
  useEffect(() => clearLongPress, []);
  const selectChapter = (index, direction) => {
    const next = Math.min(Math.max(index, -1), item.chapters.length - 1);
    setSwipeDirection(direction || (next > activeChapter || (activeChapter === item.chapters.length - 1 && next === -1) ? 1 : -1));
    setActiveChapter(next);
  };
  const previousPanel = () => selectChapter(activeChapter - 1, -1);
  const nextPanel = () => selectChapter(activeChapter < item.chapters.length - 1 ? activeChapter + 1 : -1, 1);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setMobileSwipe(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.("change", update);
    return () => mediaQuery.removeEventListener?.("change", update);
  }, []);
  const finishSwipe = (_event, info) => {
    if (!mobileSwipe) return;
    const forward = info.offset.x <= -52 || info.velocity.x <= -420;
    const backward = info.offset.x >= 52 || info.velocity.x >= 420;
    if (forward) nextPanel();
    else if (backward && activeChapter >= 0) previousPanel();
  };
  const previousChapterPanel = activeChapter >= 0 ? activeChapter - 1 : null;
  const nextChapterPanel = activeChapter < item.chapters.length - 1 ? activeChapter + 1 : item.chapters.length ? -1 : null;
  const renderInlinePanel = (panel) => panel == null ? <span /> : panel < 0
    ? <SeenSummary item={item} onOpenChapter={selectChapter} onPurchase={() => setPurchaseOpen(true)} />
    : <InlineSeenChapter chapter={item.chapters[panel]} chapterIndex={panel} chapters={item.chapters} item={item} onJoinWorld={() => navigate(`/world/${encodeURIComponent(item.bonusWorld.id)}?join=1`)} onOverview={() => selectChapter(-1, -1)} onPurchase={() => setPurchaseOpen(true)} onSelect={selectChapter} />;

  return <motion.article
    className={reactionPickerOpen || reactionsSheetOpen ? "has-reaction-picker seen-feed-item" : "seen-feed-item"}
    initial={reduceMotion || !animateOnScroll ? false : { opacity: 0, y: 52 }}
    ref={trackingRef}
    onContextMenu={(event) => { if (!event.target.closest?.("input, textarea")) { event.preventDefault(); setMenuOpen(false); setContextMenuOpen(true); } }}
    onPointerCancel={clearLongPress}
    onPointerDown={startLongPress}
    onPointerLeave={clearLongPress}
    onPointerMove={moveLongPress}
    onPointerUp={clearLongPress}
    transition={reduceMotion ? { duration: 0 } : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    viewport={{ amount: 0.12, margin: "0px 0px -4% 0px", once: true }}
    whileInView={reduceMotion || !animateOnScroll ? undefined : { opacity: 1, y: 0 }}
  >
    {actionPill ? <p className="seen-action-pill" role="status">{actionPill}</p> : null}
    <div className="seen-item-menu-wrap">
      <CreatorHeader
        createdAt={item.createdAt}
        creator={item.creator}
        isOwn={isOwn}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        onViewsClick={() => setInsightsOpen(true)}
        views={item.engagement.views}
      />
      {isOwn ? (
        <OwnerSeenActionsSheet
          busyAction={busyOwnerAction}
          isOpen={menuOpen}
          item={item}
          onAddStory={openAddToStory}
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
              onSuccess: () => setNotice(__msg("social.thanksWeWillShowYouMoreSeensLikeThis")),
            });
          }}
          pending={menuPending}
          saved={item.viewerState.saved}
        />
      )}
    </div>
    <SeenContextMenu
      busyAction={busyOwnerAction}
      isOpen={contextMenuOpen}
      isOwn={isOwn}
      item={item}
      onArchive={() => runContextAction(() => archiveMutation.mutate())}
      onClose={closeContextMenu}
      onDelete={() => runContextAction(confirmDelete)}
      onEdit={() => runContextAction(() => navigate(`/studio/seens/${item.id}/edit?from=seen`))}
      onHide={() => runContextAction(() => hideMutation.mutate())}
      onInsights={() => { closeContextMenu(); setInsightsOpen(true); }}
      onMove={(direction) => runContextAction(() => onFeedMove(item.id, direction))}
      onMute={() => runContextAction(() => muteMutation.mutate())}
      onPinToggle={() => runContextAction(() => pinMutation.mutate())}
      onReact={(reaction) => runContextAction(() => reactionMutation.mutate(reaction))}
      onReactionMore={() => { closeContextMenu(); setReactionPickerOpen(true); }}
      onReport={() => { closeContextMenu(); setReportDone(false); setReportOpen(true); }}
      onRepost={() => runContextAction(() => repostMutation.mutate())}
      onSave={() => runContextAction(() => saveMutation.mutate())}
      onShare={() => { closeContextMenu(); setShareSheetOpen(true); }}
      pending={pending}
    />
    <SeenReportSheet done={reportDone} isOpen={reportOpen} onClose={() => { setReportOpen(false); setReportDone(false); }} onReport={(reason) => reportMutation.mutate(reason)} pending={reportMutation.isPending} title={item.title} />
    <ShareSheet isOpen={shareSheetOpen} onClose={() => setShareSheetOpen(false)} payload={sharePayload} variant="seen" />
    <PurchaseWorldModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} onSuccess={() => onFeedReplace(item.id, { ...rawItem, access: "ENTITLED_SEEN", paymentAvailable: false, ownerCount: Number(rawItem.ownerCount || 0) + 1, chapters: (rawItem.chapters || []).map((chapter) => ({ ...chapter, locked: false })) })} publication={rawItem} />
    <SeenInsightsSheet fallbackViews={item.engagement.views} insightsQuery={insightsQuery} isOpen={insightsOpen} onClose={() => setInsightsOpen(false)} title={item.title} />
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
    <div className={`seen-feed-copy ${activeChapter >= 0 ? "is-reading" : "is-overview"}`}>
      <div className="seen-inline-stage" onDoubleClick={addHeartFromDoubleTap} onPointerUp={detectTouchDoubleTap}>
        <button aria-label={activeChapter <= 0 ? __msg("social.backToSeenOverview") : __msg("creator.previousChapter")} className="seen-inline-arrow is-previous" disabled={activeChapter < 0} onClick={previousPanel} type="button"><FiChevronLeft /></button>
        <motion.div animate={{ opacity: 1, x: 0 }} className="seen-inline-track" drag={mobileSwipe ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragDirectionLock dragElastic={mobileSwipe ? .82 : 0} dragMomentum={false} initial={reduceMotion ? false : { opacity: .45, x: swipeDirection * 54 }} key={activeChapter} onDragEnd={finishSwipe} transition={reduceMotion ? { duration: 0 } : { duration: .26, ease: [0.22,1,0.36,1] }}>
          <div aria-hidden="true" className="seen-inline-panel is-neighbor">{renderInlinePanel(previousChapterPanel)}</div>
          <div className="seen-inline-panel is-current">{renderInlinePanel(activeChapter)}</div>
          <div aria-hidden="true" className="seen-inline-panel is-neighbor">{renderInlinePanel(nextChapterPanel)}</div>
        </motion.div>
        <button aria-label={activeChapter < 0 ? __msg("social.openFirstChapter") : activeChapter < item.chapters.length - 1 ? __msg("social.nextChapter") : __msg("social.backToSeenOverview")} className="seen-inline-arrow is-next" disabled={!item.chapters.length} onClick={nextPanel} type="button"><FiChevronRight /></button>
      </div>
      {item.chapters.length ? <div className="seen-inline-progress" aria-label={__msg("social.seenChapterNavigation")}>
        <div>{[-1, ...item.chapters.map((_, index) => index)].map((panel) => <button aria-label={panel < 0 ? __msg("social.openOverview") : __msg("creator.openChapter", { value0: panel + 1 })} className={panel === activeChapter ? "is-active" : ""} key={panel} onClick={() => selectChapter(panel)} type="button" />)}</div>
        <button onClick={() => selectChapter(activeChapter < 0 ? 0 : -1)} type="button">{activeChapter < 0 ? __msg("social.swipeForChapters") : __msg("stories.overview")} <FiChevronRight /></button>
      </div> : null}
      <ContentEntityList entities={item.attachedEntities} onNotice={setNotice} />
      {activeChapter < 0 ? <PreviewComment comment={item.previewComment} /> : null}
      {activeChapter < 0 && item.moreFrom ? <Link className="seen-more-from-paid" to={`/seen/${encodeURIComponent(item.moreFrom.id)}`}><span>{__msg("system.SeenFeedPage.bf2f575661")} {item.creator?.name?.split(" ")?.[0] || item.creator?.username || __msg("financial.creator")}</span><b>{item.moreFrom.title}</b><strong>✦{Number(item.moreFrom.priceStars || 0).toLocaleString(__uiLocale())} ›</strong></Link> : null}
      <EngagementBar commentsOpen={commentsOpen} isOwn={isOwn} item={item} onCommentToggle={() => setCommentsOpen((value) => !value)} onCopyLink={() => setShareSheetOpen(true)} onReactHold={() => setReactionPickerOpen(true)} onReactOpen={openReactions} onRepost={() => repostMutation.mutate()} onSave={() => saveMutation.mutate()} pending={pending} />
      {reactionsSheetOpen ? <SeenReactionsSheet currentUserId={normalizeId(currentUser)} item={item} onAddYours={openPickerFromSheet} onClose={() => setReactionsSheetOpen(false)} /> : null}
      {reactionPickerOpen ? <ReactionPicker item={item} onClose={() => setReactionPickerOpen(false)} onSelect={selectReaction} pending={reactionMutation.isPending} /> : null}
      {notice ? <p className="seen-item-notice" role="status">{__systemMessage(notice)}{noticeLink ? <Link to={noticeLink}>{__msg("social.viewReposts")}</Link> : null}</p> : null}
      {commentsOpen ? <CommentsPanel currentUser={currentUser} engagementQuery={engagementQuery} item={item} mutation={commentMutation} onChange={setComment} onEngagementChange={mergeEngagement} onSubmit={submitComment} value={comment} /> : null}
    </div>
  </motion.article>;
}

function EmptyState({ canCreate, onCreate, tab }) {
  __useUiLanguage();
  const friends = tab === "friends";
  return <ContentEmptyState message={friends ? __msg("social.followPeopleToFillThisSpaceWithTheStories") : __msg("social.publishedSeensWillAppearHereYouCanExplorePeople")} primaryAction={friends ? { label: __msg("profile.discoverPeople"), to: "/discover" } : canCreate ? { label: __msg("profile.createASeen"), onClick: onCreate } : { label: __msg("profile.discoverPeople"), to: "/discover" }} secondaryAction={friends ? { label: __msg("profile.exploreSeens"), to: "/seen?tab=explore" } : null} title={friends ? __msg("social.yourFriendsSeensLiveHere") : __msg("profile.noSeensYet_1d5d33")} variant="seen" />;
}

function EndState({ onCreate }) {
  __useUiLanguage();
  return <section className="seen-end-state">
    <SeenEyeMark className="seen-tab-eye-mark seen-end-eye-mark" />
    <h2>{__msg("social.youReAllCaughtUp")}</h2>
    <p>{__msg("social.nowShowThemSomethingPostWhatOnlyYouCan")}</p>
    <button onClick={onCreate} type="button">{__msg("social.createASeen")}</button>
  </section>;
}

const feedTabsByEntry = new Map();

export default function SeenFeedPage() {
  __useUiLanguage();
  const location = useLocation();
  const [tab, setTabState] = useState(() => feedTabsByEntry.get(location.key) || "seen");
  const setTab = (nextTab) => {
    feedTabsByEntry.set(location.key, nextTab);
    setTabState(nextTab);
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStart = useRef(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const capabilities = useSocialCapabilities();
  const unreadActivityCount = useUnreadActivityCount(Boolean(user));
  const queryClient = useQueryClient();
  const feedKey = ["seen-feed", tab, user?.id || "guest"];
  const loadMoreRef = useRef(null);
  const query = useInfiniteQuery({
    queryKey: feedKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => publicationService.listPublishedSeens({ limit: 30, tab, page: pageParam }).then((response) => response.data.data),
    getNextPageParam: nextSeenFeedPage,
    retry: 1,
    staleTime: 1000 * 60,
  });
  const worldQuery = useQuery({
    queryKey: ["create-menu-world-target", user?.id],
    queryFn: () => publicationService.listMyPublications({ kind: "PREMIUM_WORLD", limit: 10 }).then((response) => response.data.data.items || []),
    enabled: Boolean(user && capabilities.isApprovedCreator),
    retry: false,
    staleTime: 1000 * 60,
  });
  const items = useMemo(() => {
    const seenIds = new Set();
    return (query.data?.pages || []).flatMap((page) => page.items || []).filter((item) => {
      const id = String(item.id || item._id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
  }, [query.data]);
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchNextPageError || !loadMoreRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchNextPage();
    }, { root: loadMoreRef.current.closest(".social-center-scroll"), rootMargin: "300px" });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError, items.length]);
  const existingWorld = (worldQuery.data || []).find((item) => ["PUBLISHED", "CHANGES_REQUESTED", "PENDING_REVIEW", "REJECTED"].includes(item.status))
    || (worldQuery.data || []).find((item) => item.status === "DRAFT");
  const worldTarget = existingWorld
    ? ["PUBLISHED", "CHANGES_REQUESTED", "PENDING_REVIEW", "REJECTED"].includes(existingWorld.status)
      ? `/world/${existingWorld.id}`
      : `/studio/worlds/${existingWorld.id}/edit`
    : "";
  const canCreateStoryNow = capabilities.canCreate && canCreateStory(user);
  const canPostNote = capabilities.canCreate && canCreateFeedPost(user);
  const acknowledgeActivityNotifications = useMutation({
    mutationFn: fanService.acknowledgeAllActivity,
    onMutate: () => {
      queryClient.setQueryData(["fan", "activity", "unread-count"], 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
    },
  });
  const openCreate = () => setCreateOpen((current) => !current);
  const openActivity = () => {
    if (unreadActivityCount > 0 && !acknowledgeActivityNotifications.isPending) acknowledgeActivityNotifications.mutate();
    navigate("/activity");
  };
  const updateFeedItem = (id, engagement) => {
    queryClient.setQueryData(feedKey, (current) => updateSeenFeedPages(current, (entries) => entries.map((entry) => String(entry.id) === String(id) ? {
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
    } : entry)));
  };
  const replaceFeedItem = (id, nextItem) => {
    queryClient.setQueryData(feedKey, (current) => updateSeenFeedPages(current, (entries) => entries.map((entry) => String(entry.id || entry._id) === String(id) ? { ...entry, ...nextItem } : entry)));
  };
  const moveFeedItem = (id, direction) => {
    queryClient.setQueryData(feedKey, (current) => {
      if (!current) return current;
      const flattened = current.pages.flatMap((page) => page.items || []);
      const from = flattened.findIndex((entry) => String(entry.id || entry._id) === String(id));
      const to = Math.min(Math.max(from + direction, 0), flattened.length - 1);
      if (from < 0 || from === to) return current;
      const reordered = [...flattened];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      let cursor = 0;
      return {
        ...current,
        pages: current.pages.map((page) => {
          const count = (page.items || []).length;
          const nextPage = { ...page, items: reordered.slice(cursor, cursor + count) };
          cursor += count;
          return nextPage;
        }),
      };
    });
  };
  const removeFeedItem = (id) => {
    queryClient.setQueryData(feedKey, (current) => updateSeenFeedPages(current, (entries) => entries.filter((entry) => String(entry.id) !== String(id))));
  };
  const removeFeedItemsByCreator = (creatorId) => {
    queryClient.setQueryData(feedKey, (current) => updateSeenFeedPages(current, (entries) => entries.filter((entry) => String(entry.creator?.id || entry.creator?._id || "") !== String(creatorId))));
  };
  const startPull = (event) => {
    const scrollRoot = event.currentTarget.closest(".social-center-scroll");
    if ((scrollRoot?.scrollTop || 0) <= 0) pullStart.current = event.touches?.[0]?.clientY ?? null;
  };
  const movePull = (event) => {
    if (pullStart.current == null) return;
    const distance = Math.max(0, Math.min(110, (event.touches?.[0]?.clientY || 0) - pullStart.current));
    setPullDistance(distance);
  };
  const endPull = () => {
    if (pullDistance >= 72 && !query.isRefetching) void query.refetch();
    pullStart.current = null;
    setPullDistance(0);
  };

  return <section className="seen-prototype-page" onTouchCancel={endPull} onTouchEnd={endPull} onTouchMove={movePull} onTouchStart={startPull}>
    {pullDistance > 0 ? <div aria-live="polite" className="flex items-center justify-center py-2 text-xs font-bold text-atseen-muted" style={{ height: pullDistance / 2 }}>{pullDistance >= 72 ? __msg("social.releaseForAFreshPersonalizedBatch") : __msg("social.pullForFreshSeens")}</div> : null}
    <SeenHeader activeTab={tab} activityCount={unreadActivityCount} onActivity={openActivity} onCreate={openCreate} onSearch={() => navigate("/search?from=seen")} onTabChange={setTab} />
    <FanCreateSheet
      canCreateSeen={capabilities.canCreate}
      canCreateWorld={capabilities.isApprovedCreator}
      canCreateStoryNow={canCreateStoryNow}
      canPostNote={canPostNote}
      isOpen={createOpen}
      onClose={() => setCreateOpen(false)}
      onNote={() => {
        setCreateOpen(false);
        navigate(`/wall?compose=note&composeRequest=${Date.now()}`);
      }}
      onStory={() => {
        setCreateOpen(false);
        setStoryCreatorOpen(true);
      }}
      worldTarget={worldTarget}
    />
    <StoryCreator isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
    {query.isLoading ? <div className="seen-feed-list"><SeenSkeleton /><SeenSkeleton /></div> : null}
    {query.isError && !query.data ? <div className="seen-feed-error"><p>{__msg("social.couldnTLoadSeens")}</p><button onClick={() => query.refetch()} type="button">{__msg("discover.tryAgain")}</button></div> : null}
    {!query.isLoading && query.data ? items.length || hasNextPage ? <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="seen-feed-list"
      initial={reduceMotion ? false : { opacity: 0, y: 52 }}
      key={tab}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      {items.map((item, index) => <SeenFeedItem animateOnScroll={index > 0} batchId={query.data?.pages?.[0]?.recommendation?.batchId || ""} currentUser={user} item={item} key={item.id} onFeedMove={moveFeedItem} onFeedRemove={removeFeedItem} onFeedRemoveByCreator={removeFeedItemsByCreator} onFeedReplace={replaceFeedItem} onFeedUpdate={updateFeedItem} position={index} />)}
      {hasNextPage ? <div className="seen-feed-error" ref={loadMoreRef}>
        {isFetchNextPageError ? <p>{__msg("social.couldnTLoadMoreSeens")}</p> : null}
        <button disabled={isFetchingNextPage} onClick={() => fetchNextPage()} type="button">{isFetchingNextPage ? __msg("social.loadingMoreSeens") : isFetchNextPageError ? __msg("discover.tryAgain") : __msg("social.loadMoreSeens")}</button>
      </div> : <EndState onCreate={openCreate} />}
    </motion.div> : <EmptyState canCreate={capabilities.canCreate} onCreate={openCreate} tab={tab} /> : null}
  </section>;
}
