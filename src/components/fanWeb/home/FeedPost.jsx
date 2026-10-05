import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiArchive, FiBookmark, FiCheck, FiEye, FiEyeOff, FiFlag, FiMessageCircle, FiMic, FiMoreHorizontal, FiPlusCircle, FiRepeat, FiSend, FiShare2, FiSlash, FiTrash2, FiUserMinus } from "react-icons/fi";
import FeedPostComposer from "../../posts/FeedPostComposer";
import ContentEntityList from "../../contentEntities/ContentEntityList";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";
import ShareSheet from "../../share/ShareSheet";
import StoryCreator from "../../stories/StoryCreator";
import VoiceCommentRecorder from "../../comments/VoiceCommentRecorder";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { atseenCreators, atseenReportReasons } from "../../../data/atseenMockData";
import { useAuth } from "../../../hooks/useAuth";
import { analyticsService } from "../../../services/analyticsService";
import { profileService } from "../../../services/profileService";
import { postService } from "../../../services/postService";
import {
  useBlockFeedPostAuthor,
  useArchiveFeedPost,
  useCreateFeedPostComment,
  useDeleteFeedPost,
  useHideFeedPost,
  useMarkFeedPostViewed,
  useReactToFeedPost,
  useReportFeedPost,
  useToggleFeedPostSave,
  useToggleFeedPostShare,
} from "../../../hooks/useFeedPosts";
import { canManageFeedPost } from "../../../utils/postPermissions";

const reactions = [
  { key: "like", label: "Like", icon: "👍" },
  { key: "love", label: "Love", icon: "❤️" },
  { key: "care", label: "Care", icon: "🤗" },
  { key: "wow", label: "Wow", icon: "😮" },
  { key: "useful", label: "Useful", icon: "💡" },
  { key: "fire", label: "Fire", icon: "🔥" },
];

const postReactionOptions = [
  { key: "like", label: "Support", icon: "\uD83E\uDD1D" },
  { key: "love", label: "Love", icon: "\u2764\uFE0F" },
  { key: "care", label: "Care", icon: "\uD83E\uDD17" },
  { key: "wow", label: "Wow", icon: "\uD83D\uDE2E" },
  { key: "useful", label: "Useful", icon: "\uD83D\uDCA1" },
  { key: "fire", label: "Fire", icon: "\uD83D\uDD25" },
  { key: "clap", label: "Clap", icon: "\uD83D\uDC4F" },
  { key: "laugh", label: "Laugh", icon: "\uD83D\uDE02" },
  { key: "see_you", label: "I see you", icon: "\uD83D\uDC41\uFE0F" },
  { key: "sad", label: "Feel you", icon: "\uD83E\uDD72" },
  { key: "phone", label: "Call me", icon: "\uD83D\uDCF1" },
  { key: "strong", label: "Strong", icon: "\uD83D\uDCAA" },
  { key: "pray", label: "Respect", icon: "\uD83D\uDE4F" },
];

function useWallSheetPosition(isOpen) {
  const [sheetPosition, setSheetPosition] = useState(undefined);

  useEffect(() => {
    if (!isOpen) return undefined;
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;

    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({
        "--wall-sheet-center-x": `${bounds.left + (bounds.width / 2)}px`,
        "--wall-sheet-column-width": `${bounds.width}px`,
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

function reactionDisplayFor(key) {
  return postReactionOptions.find((reactionItem) => reactionItem.key === key)
    || reactions.find((reactionItem) => reactionItem.key === key);
}

const commentEmojiGroups = [
  { key: "recent", label: "Recent", emojis: ["😀", "😂", "🥰", "😍", "😎", "😭", "😮", "😅", "🙂", "🙃"] },
  { key: "gestures", label: "Gestures", emojis: ["👍", "❤️", "👏", "🙏", "🤝", "💪", "👌", "🙌", "✌️", "🤞"] },
  { key: "vibes", label: "Vibes", emojis: ["✨", "🔥", "💯", "🎉", "⭐", "🌙", "☀️", "💡", "🎶", "📌"] },
  { key: "food", label: "Food", emojis: ["☕", "🍕", "🍔", "🍰", "🍓", "🍉", "🍜", "🍟", "🥗", "🍿"] },
];

const mongoIdPattern = /^[a-f\d]{24}$/i;
const homeCommentEmojiGroups = [
  { key: "recent", label: "Recent", emojis: ["\uD83D\uDE00", "\uD83D\uDE02", "\uD83E\uDD70", "\uD83D\uDE0D", "\uD83D\uDE0E", "\uD83D\uDE2D", "\uD83D\uDE2E", "\uD83D\uDE05", "\uD83D\uDE42", "\uD83D\uDE43"] },
  { key: "gestures", label: "Gestures", emojis: ["\uD83D\uDC4D", "\u2764\uFE0F", "\uD83D\uDC4F", "\uD83D\uDE4F", "\uD83E\uDD1D", "\uD83D\uDCAA", "\uD83D\uDC4C", "\uD83D\uDE4C", "\u270C\uFE0F", "\uD83E\uDD1E"] },
  { key: "vibes", label: "Vibes", emojis: ["\u2728", "\uD83D\uDD25", "\uD83D\uDCAF", "\uD83C\uDF89", "\u2B50", "\uD83C\uDF19", "\u2600\uFE0F", "\uD83D\uDCA1", "\uD83C\uDFB6", "\uD83D\uDCCC"] },
  { key: "food", label: "Food", emojis: ["\u2615", "\uD83C\uDF55", "\uD83C\uDF54", "\uD83C\uDF70", "\uD83C\uDF53", "\uD83C\uDF49", "\uD83C\uDF5C", "\uD83C\uDF5F", "\uD83E\uDD57", "\uD83C\uDF7F"] },
];

// Retained for compatibility with previously persisted comment-composer preferences.
void commentEmojiGroups;
void homeCommentEmojiGroups;

function relativeTime(value, fallback = "now") {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  if (!timestamp) return fallback;
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return count.toLocaleString();
}

function MediaItem({ item, title }) {
  const [failed, setFailed] = useState(false);
  const translations = useMemo(() => item?.translations || [], [item?.translations]);
  const [selectedTranslation, setSelectedTranslation] = useState(translations[0]?.language || "");
  const activeTranslation = translations.find((translation) => translation.language === selectedTranslation) || translations[0] || null;
  useEffect(() => {
    if (!translations.length) return;
    if (!translations.some((translation) => translation.language === selectedTranslation)) {
      setSelectedTranslation(translations[0].language);
    }
  }, [selectedTranslation, translations]);
  if (!item?.url || failed) {
    return <span className="home-feed-media-fallback" role="img" aria-label="Media unavailable">Media unavailable</span>;
  }
  if (String(item.type || "").toLowerCase() === "audio") {
    return (
      <div className="home-feed-voice-card">
        <div className="home-feed-voice-title"><FiMic aria-hidden="true" /> Voice note</div>
        <VoiceMessageBubble audio={{ duration: item.duration, url: item.url, waveform: item.waveform }} label="Voice note" />
        {item.transcript ? (
          <div className="home-feed-voice-transcript">
            <span>Original transcript</span>
            <p>{item.transcript}</p>
          </div>
        ) : null}
        {translations.length ? (
          <div className="home-feed-voice-transcript">
            <label>
              View translation
              <select onChange={(event) => setSelectedTranslation(event.target.value)} value={activeTranslation?.language || ""}>
                {translations.map((translation) => {
                  return <option key={translation.language} value={translation.language}>{translation.languageName || translation.language}</option>;
                })}
              </select>
            </label>
            {activeTranslation ? (
              <>
                <span>Translated to {activeTranslation.languageName || activeTranslation.language}</span>
                <p>{activeTranslation.text}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
  if (String(item.type || "").toLowerCase().startsWith("video")) {
    return <video controls preload="metadata" src={item.url} title={`${title} video`} />;
  }
  return <img alt={`${title} attachment`} loading="lazy" onError={() => setFailed(true)} src={item.url} />;
}

function WallReactionsSheet({ currentUserId, onAddYours, onClose, postId, style }) {
  const [activeReaction, setActiveReaction] = useState("");
  const query = useQuery({
    enabled: Boolean(postId),
    queryKey: ["wall-reactions", postId],
    queryFn: () => postService.getReactions(postId),
    retry: false,
  });
  const counts = query.data?.counts || {};
  const reactionTabs = postReactionOptions.filter((item) => Number(counts[item.key]) > 0);
  const reactors = (query.data?.reactions || []).filter((item) => !activeReaction || item.reaction === activeReaction);

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

  return (
    <div className="seen-reactions-layer" style={style}>
      <button aria-label="Close reactions" className="seen-reactions-scrim" onClick={onClose} type="button" />
      <section aria-label="Wall note reactions" aria-modal="true" className="seen-reactors-sheet" role="dialog">
        <span aria-hidden="true" className="seen-reactors-handle" />
        <header className="seen-reactors-header"><h2>Reactions</h2><span>{formatCount(query.data?.total || 0)}</span></header>
        <div aria-label="Reaction filters" className="seen-reactors-tabs" role="tablist">
          <button aria-selected={!activeReaction} className={!activeReaction ? "is-active" : ""} onClick={() => setActiveReaction("")} role="tab" type="button">All</button>
          {reactionTabs.map((item) => <button aria-selected={activeReaction === item.key} className={activeReaction === item.key ? "is-active" : ""} key={item.key} onClick={() => setActiveReaction(item.key)} role="tab" type="button"><span aria-hidden="true">{item.icon}</span>{formatCount(counts[item.key])}</button>)}
        </div>
        <div className="seen-reactors-list">
          {query.isLoading ? <p className="seen-reactors-state">Loading reactions...</p> : null}
          {query.isError ? <div className="seen-reactors-state"><p>Could not load reactions</p><button onClick={() => query.refetch()} type="button">Retry</button></div> : null}
          {!query.isLoading && !query.isError ? reactors.map((reactor) => {
            const isCurrentUser = String(reactor.user?.id || "") === String(currentUserId || "");
            const name = isCurrentUser ? "You" : reactor.user?.name || reactor.user?.username || "Atseen user";
            const meta = reactionDisplayFor(reactor.reaction);
            return <Link className="seen-reactor-row" key={reactor.id} onClick={onClose} to={reactor.user?.username ? `/profile/${encodeURIComponent(reactor.user.username)}` : "/profile"}>
              <FanAvatar alt={`${name} avatar`} name={name} size="h-[38px] w-[38px]" src={reactor.user?.avatar} />
              <span className="seen-reactor-copy"><strong>{name}{reactor.user?.verified ? <VerifiedBadge className="seen-reactor-verified" /> : null}</strong>{reactor.user?.username ? <small>@{reactor.user.username}</small> : null}</span>
              <span aria-label={meta?.label || "Reaction"} className="seen-reactor-emoji">{meta?.icon || "🤝"}</span>
            </Link>;
          }) : null}
          {!query.isLoading && !query.isError && !reactors.length ? <p className="seen-reactors-state">No reactions yet</p> : null}
        </div>
        <button className="seen-reactors-add" onClick={onAddYours} type="button">Add yours &gt;</button>
      </section>
    </div>
  );
}

function normalizeFeedPost(post = {}) {
  const mockCreator = post.creatorId ? atseenCreators[post.creatorId] : null;
  const author = post.author || post.creator || mockCreator || { name: "Creator", username: "creator" };
  const media = post.media?.length ? post.media : (post.images || []).map((url) => ({ id: url, type: "image", url }));
  const comments = post.comments?.length
    ? post.comments.map((comment) => ({
      id: comment.id || comment._id,
      text: comment.text || "",
      audio: comment.audio || null,
      author: comment.author || comment.user || null,
      creatorId: comment.creatorId,
      viewerSaved: Boolean(comment.viewerSaved || comment.saved),
    }))
    : post.seededComments || [];

  return {
    id: post.id,
    originalPostId: post.originalPostId || post.id,
    shareId: post.shareId || null,
    sharedBy: post.sharedBy || null,
    shareCaption: post.shareCaption || "",
    feedCreatedAt: post.feedCreatedAt || post.publishedAt || post.createdAt,
    author: {
      id: author.id || author._id || post.creatorId,
      avatar: author.avatar || "",
      name: author.name || "Creator",
      username: author.username || "creator",
      verified: Boolean(author.verified || author.isVerified),
    },
    commentCount: Number(post.commentCount ?? post.comments ?? 0),
    context: post.context || "",
    contextEmoji: post.contextEmoji || "",
    createdAt: post.createdAt || post.publishedAt,
    attachedEntities: post.attachedEntities || [],
    entityRefs: post.entityRefs || [],
    isOwner: Boolean(post.isOwner),
    location: post.location || "",
    media,
    reactionBreakdown: post.reactionBreakdown || {},
    reactions: post.reactions || [],
    result: post.result || "",
    seededComments: comments,
    supportCount: Number(post.supportCount ?? post.handshakes ?? 0),
    shareCount: Number(post.shareCount ?? 0),
    text: post.text || "",
    timestamp: post.timestamp || relativeTime(post.createdAt || post.publishedAt),
    topReactions: post.topReactions || [],
    viewCount: Number(post.viewCount ?? post.views ?? post.viewerCount ?? 0),
    viewerReaction: post.viewerReaction || null,
    viewerSaved: Boolean(post.viewerSaved),
    viewerShared: Boolean(post.viewerShared),
  };
}

function filterForContext(context = "", location = "") {
  const normalized = String(context || "").trim().toLowerCase();
  if (normalized === "right now") return "right_now";
  if (normalized === "events") return "events";
  if (normalized === "things to do") return "things_to_do";
  if (["coffee", "restaurant"].includes(normalized)) return "food";
  if (!normalized && location) return "places";
  return "";
}

function voiceStoryCopy(media = {}, fallback = "") {
  const translations = Array.isArray(media.translations) ? media.translations : [];
  const originalTranscript = String(media.transcript || fallback || "").trim();
  const translation = translations.find((item) => String(item?.text || "").trim());
  const translationText = String(translation?.text || "").trim();
  return {
    originalTranscript,
    translationLabel: translation?.languageName || translation?.language || "",
    translationText: translationText && translationText !== originalTranscript ? translationText : "",
  };
}

function FeedPost({ post, profileMenu = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const normalized = useMemo(() => normalizeFeedPost(post), [post]);
  const creator = normalized.author;
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const deleteMutation = useDeleteFeedPost();
  const archiveMutation = useArchiveFeedPost();
  const reactionMutation = useReactToFeedPost();
  const commentMutation = useCreateFeedPostComment();
  const saveMutation = useToggleFeedPostSave();
  const shareMutation = useToggleFeedPostShare();
  const hideMutation = useHideFeedPost();
  const reportMutation = useReportFeedPost();
  const blockMutation = useBlockFeedPostAuthor();
  const viewMutation = useMarkFeedPostViewed();
  const articleRef = useRef(null);
  const impressionTrackedRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const [reaction, setReaction] = useState(normalized.viewerReaction);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reactionsSheetOpen, setReactionsSheetOpen] = useState(false);
  const [saved, setSaved] = useState(normalized.viewerSaved);
  const [shared, setShared] = useState(normalized.viewerShared);
  const [comments, setComments] = useState(normalized.seededComments);
  const [commentText, setCommentText] = useState("");
  const [shareCaption, setShareCaption] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [voiceCommentOpen, setVoiceCommentOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const wallSheetPosition = useWallSheetPosition(moreOpen || reactionPickerOpen || reactionsSheetOpen);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewCount, setViewCount] = useState(normalized.viewCount);
  const [moreBusy, setMoreBusy] = useState("");
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);

  const ownsPost = normalized.isOwner || canManageFeedPost(user, normalized);
  const headerName = ownsPost ? "You" : creator.name;
  const selectedReaction = reactionDisplayFor(reaction);
  const reactionSummary = (normalized.reactions?.length
    ? normalized.reactions
    : normalized.topReactions?.length && normalized.reactionBreakdown
      ? normalized.topReactions.map((reactionKey) => ({ count: normalized.reactionBreakdown[reactionKey], reaction: reactionKey }))
    : normalized.supportCount > 0 ? [{ count: normalized.supportCount, reaction: "like" }] : [])
    .map((item) => ({
      count: Number(item.count) || 0,
      reaction: reactionDisplayFor(item.reaction),
    }))
    .filter((item) => item.count > 0 && item.reaction);
  const reactionCount = reactionSummary.reduce((total, item) => total + item.count, 0);
  const reactionCountsByKey = useMemo(() => reactionSummary.reduce((counts, item) => ({
    ...counts,
    [item.reaction.key]: item.count,
  }), {}), [reactionSummary]);
  const commentCount = Math.max(normalized.commentCount, comments.length);
  const compactText = normalized.text.length > 260 && !expanded ? `${normalized.text.slice(0, 260).trim()}...` : normalized.text;
  const visibleReactionSamples = reactionSummary.length
    ? reactionSummary.slice(0, 3).map(({ reaction: summaryReaction }) => summaryReaction.icon).join(" ")
    : "\uD83E\uDD1D \u2764\uFE0F \uD83D\uDD25";
  const actionPostId = normalized.originalPostId || normalized.id;
  const postUrl = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/posts/${actionPostId}`;
  }, [actionPostId]);
  const firstMedia = useMemo(() => normalized.media?.[0] || {}, [normalized.media]);
  const firstMediaType = String(firstMedia.type || "").toLowerCase();
  const isVoiceOnlyPost = normalized.media?.length === 1 && firstMediaType === "audio";
  const voiceCopyForStory = useMemo(() => isVoiceOnlyPost ? voiceStoryCopy(firstMedia, normalized.text) : {}, [firstMedia, isVoiceOnlyPost, normalized.text]);
  const voiceTextForStory = voiceCopyForStory.originalTranscript || voiceCopyForStory.translationText || "";
  const sharePayload = useMemo(() => ({
    author: {
      avatarUrl: creator.avatar,
      id: creator.id,
      name: creator.name,
      username: creator.username,
    },
    canonicalUrl: postUrl,
    contentId: actionPostId,
    contentType: "feed_post",
    destinationRoute: `/posts/${actionPostId}`,
    imageUrl: isVoiceOnlyPost ? "" : normalized.media?.[0]?.url || "",
    storyDraft: isVoiceOnlyPost ? {
      caption: voiceTextForStory,
      imageUrl: "",
      sharedCard: {
        destinationRoute: `/posts/${actionPostId}`,
        displayMode: "text_only",
        eyebrow: "NOTE",
        imageUrl: "",
        kind: "voice_note",
        originalTranscript: voiceCopyForStory.originalTranscript,
        subtitle: "from my Wall - tap >",
        translationLabel: voiceCopyForStory.translationLabel,
        translationText: voiceCopyForStory.translationText,
        title: voiceTextForStory || normalized.text || "Voice note",
      },
    } : undefined,
    textPreview: normalized.text,
    title: normalized.context
      ? [normalized.context, normalized.location].filter(Boolean).join(" - ")
      : normalized.text.slice(0, 96) || "Home post",
  }), [actionPostId, creator.avatar, creator.id, creator.name, creator.username, isVoiceOnlyPost, normalized.context, normalized.location, normalized.media, normalized.text, postUrl, voiceCopyForStory.originalTranscript, voiceCopyForStory.translationLabel, voiceCopyForStory.translationText, voiceTextForStory]);
  const contextFilter = filterForContext(normalized.context, normalized.location);
  const contextHref = contextFilter
    ? `/wall?filter=${encodeURIComponent(contextFilter)}${normalized.location ? `&city=${encodeURIComponent(normalized.location)}` : ""}`
    : "/wall";
  const mediaLayout = normalized.media?.length === 1 && firstMediaType === "audio"
    ? "audio"
    : normalized.media?.length === 1 && firstMediaType.startsWith("video")
    ? "hero"
    : "compact";

  useEffect(() => {
    setReaction(normalized.viewerReaction);
  }, [normalized.viewerReaction]);

  useEffect(() => {
    setComments(normalized.seededComments);
  }, [normalized.seededComments]);

  useEffect(() => {
    setSaved(normalized.viewerSaved);
  }, [normalized.viewerSaved]);

  useEffect(() => {
    setShared(normalized.viewerShared);
  }, [normalized.viewerShared]);

  useEffect(() => {
    setViewCount(normalized.viewCount);
  }, [normalized.viewCount]);

  useEffect(() => {
    if (!reactionPickerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setReactionPickerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("seen-sheet-lock");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("seen-sheet-lock");
    };
  }, [reactionPickerOpen]);

  useEffect(() => {
    viewTrackedRef.current = false;
    impressionTrackedRef.current = false;
  }, [actionPostId]);

  useEffect(() => {
    const target = articleRef.current;
    if (!target || ownsPost || !mongoIdPattern.test(String(actionPostId || ""))) return undefined;
    let impressionTimer = null;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (impressionTimer) window.clearTimeout(impressionTimer);
        impressionTimer = null;
        return;
      }
      if (!impressionTrackedRef.current && !impressionTimer) {
        impressionTimer = window.setTimeout(() => {
          impressionTrackedRef.current = true;
          impressionTimer = null;
          analyticsService.queueContentImpression({
            entityId: actionPostId,
            entityType: "feed_post",
            metadata: { placement: "home_feed", position: Number(normalized.position || 0), visibleMs: 500, visibleThreshold: 0.55 },
            source: "home",
          });
        }, 500);
      }
      if (!viewTrackedRef.current && !viewMutation.isPending) {
        viewTrackedRef.current = true;
        viewMutation.mutate(actionPostId, {
          onSuccess: (result) => {
            if (Number.isFinite(Number(result?.viewCount))) setViewCount(Number(result.viewCount));
          },
          onError: () => {
            viewTrackedRef.current = false;
          },
        });
      }
    }, { threshold: 0.55 });

    observer.observe(target);
    return () => {
      if (impressionTimer) window.clearTimeout(impressionTimer);
      observer.disconnect();
    };
  }, [actionPostId, normalized.position, ownsPost, viewMutation]);

  const syncSavedPost = (savedPost) => {
    const next = normalizeFeedPost(savedPost);
    setReaction(next.viewerReaction);
    setComments(next.seededComments);
    setSaved(next.viewerSaved);
    setShared(next.viewerShared);
  };

  const requireDatabasePost = () => {
    if (mongoIdPattern.test(String(actionPostId || ""))) return true;
    showToast("This prototype post is not stored in the database yet.");
    return false;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      showToast("Post link copied.");
    } catch {
      showToast("Could not copy the link. Try again from your browser.");
    }
  };

  const toggleShare = () => {
    if (shareMutation.isPending) return;
    if (!requireDatabasePost()) return;

    if (shared) {
      shareMutation.mutate(
        { postId: actionPostId },
        {
          onError: (error) => showToast(error?.response?.data?.message || "Post could not be unshared."),
          onSuccess: (savedPost) => {
            syncSavedPost(savedPost);
            setShareOpen(false);
            setShareCaption("");
            showToast("Removed from your profile.");
          },
        }
      );
      return;
    }

    setShareOpen(true);
  };

  const submitShare = () => {
    if (shareMutation.isPending) return;
    if (!requireDatabasePost()) return;

    shareMutation.mutate(
      { caption: shareCaption.trim(), postId: actionPostId },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Post could not be shared."),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          setShareOpen(false);
          setShareCaption("");
          showToast("Shared to your profile.");
        },
      }
    );
  };

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      showToast("Write one line first.");
      return;
    }
    if (commentMutation.isPending) return;
    if (!requireDatabasePost()) return;

    commentMutation.mutate(
      { postId: actionPostId, text: trimmed },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Comment could not be saved."),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          setCommentText("");
          showToast("Comment posted.");
        },
      }
    );
  };

  const submitVoiceComment = (recording) => {
    if (commentMutation.isPending || !requireDatabasePost()) return;
    commentMutation.mutate(
      { postId: actionPostId, text: recording.text || "Voice comment", voice: recording },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Voice comment could not be saved."),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          setVoiceCommentOpen(false);
          showToast("Voice comment posted.");
        },
      },
    );
  };

  const saveReaction = (nextReaction) => {
    if (!requireDatabasePost()) return;

    reactionMutation.mutate(
      { postId: actionPostId, reaction: nextReaction },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Reaction could not be saved."),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          queryClient.invalidateQueries({ queryKey: ["wall-reactions", actionPostId] });
        },
      }
    );
  };

  const toggleSave = () => {
    if (saveMutation.isPending) return;
    if (!requireDatabasePost()) return;

    saveMutation.mutate(actionPostId, {
      onError: (error) => showToast(error?.response?.data?.message || "Post could not be saved."),
      onSuccess: (savedPost) => {
        const next = normalizeFeedPost(savedPost);
        setSaved(next.viewerSaved);
        showToast(next.viewerSaved ? "Saved to your library." : "Removed from your library.");
      },
    });
  };

  const hidePost = () => {
    if (hideMutation.isPending) return;
    if (!requireDatabasePost()) return;

    hideMutation.mutate(
      { postId: actionPostId, reason: "NOT_USEFUL" },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Post could not be hidden."),
        onSuccess: () => showToast("Thanks. We will tune your feed."),
      }
    );
  };

  const blockAuthor = () => {
    if (blockMutation.isPending) return;
    if (!requireDatabasePost()) return;

    blockMutation.mutate(actionPostId, {
      onError: (error) => showToast(error?.response?.data?.message || "Account could not be blocked."),
      onSuccess: () => showToast(`${creator.name.split(" ")[0]} is blocked. They will not know.`),
    });
  };

  const reportPost = (reason) => {
    if (reportMutation.isPending) return;
    if (!requireDatabasePost()) return;

    reportMutation.mutate(
      { postId: actionPostId, payload: { reason } },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Report could not be submitted."),
        onSuccess: () => {
          setReportDone(true);
          showToast("Report submitted.");
        },
      }
    );
  };

  const moreAction = (action) => {
    if (action === "story") {
      if (!requireDatabasePost()) return;
      setMoreOpen(false);
      setStoryCreatorOpen(true);
    } else if (action === "save") {
      toggleSave();
      setMoreOpen(false);
    } else if (action === "share") {
      setMoreOpen(false);
      openSendSheet();
    } else if (action === "copy") {
      copyLink();
      setMoreOpen(false);
    } else if (action === "not-useful") {
      hidePost();
      setMoreOpen(false);
    } else if (action === "show-more") {
      saveReaction("useful");
      showToast("Thanks. We will show you more notes like this.");
      setMoreOpen(false);
    } else if (action === "hide") {
      hidePost();
      setMoreOpen(false);
    } else if (action === "unfollow") {
      if (!creator.username || moreBusy) return;
      setMoreBusy("unfollow");
      profileService.toggleFollow(creator.username)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
          queryClient.invalidateQueries({ queryKey: ["discover"] });
          queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
          showToast(`Unfollowed ${creator.name.split(" ")[0]}.`);
          setMoreOpen(false);
        })
        .catch((error) => showToast(error?.response?.data?.message || "Could not unfollow this account."))
        .finally(() => setMoreBusy(""));
    } else if (action === "report-spam") {
      reportPost("SPAM");
      setMoreOpen(false);
    } else if (action === "repost") {
      setMoreOpen(false);
      toggleShare();
    } else if (action === "archive") {
      if (archiveMutation.isPending || !requireDatabasePost()) return;
      setMoreBusy("archive");
      archiveMutation.mutate(actionPostId, {
        onError: (error) => {
          setMoreBusy("");
          showToast(error?.response?.data?.message || "Note could not be archived.");
        },
        onSuccess: () => {
          setMoreBusy("");
          setMoreOpen(false);
          showToast("Note archived. Its statistics are preserved.");
        },
      });
    } else if (action === "block") {
      blockAuthor();
      setMoreOpen(false);
    } else if (action === "report") {
      setMoreOpen(false);
      setReportOpen(true);
    } else if (action === "edit") {
      setMoreOpen(false);
      setEditOpen(true);
    } else if (action === "delete") {
      setMoreOpen(false);
      setDeleteOpen(true);
    } else if (action === "view") {
      void analyticsService.trackContentView({ entityId: actionPostId, entityType: "feed_post", source: "home" });
      window.location.assign(postUrl);
      setMoreOpen(false);
    }
  };

  const openSendSheet = () => {
    if (!requireDatabasePost()) return;
    setSendOpen(true);
  };

  return (
    <>
      <article className="home-feed-post" ref={articleRef}>
        {normalized.sharedBy ? (
          <div className="home-feed-shared-by">
            <FiShare2 className="text-atseen-blue" />
            <span className="font-bold text-atseen-text">{normalized.sharedBy.name || `@${normalized.sharedBy.username}`}</span>
            <span>shared this &middot; {relativeTime(normalized.feedCreatedAt)}</span>
          </div>
        ) : null}
        {normalized.shareCaption ? (
          <p className="mb-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{normalized.shareCaption}</p>
        ) : null}
        <div className={normalized.sharedBy ? "home-shared-post" : ""}>
        <div className="home-feed-post-head">
          <Link className="shrink-0" to={`/profile/${encodeURIComponent(creator.username)}`}>
            <FanAvatar name={creator.name} size="h-[22px] w-[22px]" src={creator.avatar} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link className="home-feed-author" to={`/profile/${encodeURIComponent(creator.username)}`}>
              {headerName}
              {creator.verified ? <VerifiedBadge /> : null}
            </Link>
            <p className="home-feed-meta">{[normalized.location, normalized.timestamp].filter(Boolean).join(" - ")}</p>
          </div>
          {normalized.context || normalized.location ? (
            <Link className="home-context-pill" to={contextHref}>
              {[`${normalized.contextEmoji} ${normalized.context}`.trim(), normalized.location].filter(Boolean).join(" - ")}
            </Link>
          ) : <span className="ml-auto" />}
          <span aria-label={`${formatCount(viewCount)} views`} className="home-feed-head-views" title="Views">
            <FiEye aria-hidden="true" /> <span>{formatCount(viewCount)}</span>
          </span>
          <button
            aria-label={`More actions for ${creator.name}'s post`}
            className="rounded-full p-1.5 text-atseen-dim transition hover:bg-atseen-surface-2 hover:text-white"
            onClick={() => setMoreOpen((current) => profileMenu ? !current : true)}
            type="button"
          >
            <FiMoreHorizontal aria-hidden="true" />
          </button>
        </div>

        <p className="home-feed-text">{compactText}</p>
        {normalized.text.length > 260 ? (
          <button className="home-feed-show-more" onClick={() => setExpanded((current) => !current)} type="button">
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
        <ContentEntityList entities={normalized.attachedEntities} onNotice={showToast} />
        {normalized.result ? (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-atseen-success/25 bg-atseen-success/10 px-3 py-1.5 text-[11.5px] font-semibold text-atseen-success">
            <FiCheck aria-hidden="true" /> {normalized.result}
          </p>
        ) : null}
        {normalized.media?.length ? (
          <div className={`home-feed-media media-count-${Math.min(normalized.media.length, 4)} media-layout-${mediaLayout}`}>
            {normalized.media.map((mediaItem) => (
              <MediaItem item={mediaItem} key={mediaItem.id || mediaItem.url} title={normalized.text.slice(0, 48) || "Home post"} />
            ))}
          </div>
        ) : null}
        </div>

        <div className="home-feed-actions">
          <div className="relative">
            <button
              aria-label={selectedReaction ? `Change ${selectedReaction.label} reaction` : "React to post"}
              className={`home-reaction-capsule ${selectedReaction ? "is-selected" : ""}`}
              disabled={reactionMutation.isPending}
              onClick={() => reactionCount ? setReactionsSheetOpen(true) : setReactionPickerOpen(true)}
              title="React"
              type="button"
            >
              <span className="home-reaction-samples" aria-hidden="true">{visibleReactionSamples}</span>
              <strong>{formatCount(reactionCount)}</strong>
              {reactionSummary.length ? (
                <span aria-hidden="true" className="inline-flex items-center gap-2">
                  {reactionSummary.map(({ count, reaction: summaryReaction }) => (
                    <span className="inline-flex items-center gap-1" key={summaryReaction.key}>
                      <span className="text-base">{summaryReaction.icon}</span>
                      <span>{count}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span aria-hidden="true" className="inline-flex items-center gap-1">
                  <span className="text-base">👍</span>
                  <span>0</span>
                </span>
              )}
              <span aria-hidden="true" className="text-base">{selectedReaction?.icon || "👍"}</span>
              <span className="hidden">{reactionCount}</span>
            </button>
          </div>
          <button aria-expanded={commentsOpen} aria-label="Open comments" className={`home-feed-action-button ${commentsOpen ? "is-selected" : ""}`} onClick={() => setCommentsOpen((current) => !current)} title="Comment" type="button">
            <FiMessageCircle aria-hidden="true" /> <span>{commentCount}</span>
          </button>
          <button aria-label={shared ? "Remove repost" : "Repost"} className={`home-feed-action-button ${shared ? "is-selected" : ""}`} disabled={shareMutation.isPending} onClick={toggleShare} title="Repost" type="button">
            <FiRepeat aria-hidden="true" /> <span>{formatCount(normalized.shareCount)}</span>
          </button>
          <button
            aria-label={saved ? "Remove saved post" : "Save post"}
            className={`home-feed-action-button ml-auto ${saved ? "is-selected" : ""}`}
            disabled={saveMutation.isPending}
            onClick={toggleSave}
            title={saved ? "Unsave" : "Save"}
            type="button"
          >
            <FiBookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          </button>
          <button aria-label="Send post" className="home-feed-action-button" onClick={openSendSheet} title="Send" type="button">
            <FiSend aria-hidden="true" />
          </button>
        </div>

        {commentsOpen ? (
          <section className="seen-comments-panel wall-comments-panel">
            <div className="seen-comments-list">
              {comments.map((comment) => {
                const commentCreator = comment.author || (comment.creatorId === "me" ? { name: "You" } : atseenCreators[comment.creatorId]) || { name: "Creator" };
                return (
                  <article key={comment.id}>
                    <FanAvatar alt="" name={commentCreator.name} size="h-6 w-6" src={commentCreator.avatar || commentCreator.avatarUrl} />
                    <div className="seen-comment-copy">
                      <p>
                        <Link to={commentCreator.username ? `/profile/${encodeURIComponent(commentCreator.username)}` : "/wall"}>{commentCreator.name}</Link>
                        {comment.text}
                      </p>
                      {comment.audio ? <VoiceMessageBubble audio={comment.audio} label="Voice comment" /> : null}
                    </div>
                  </article>
                );
              })}
              {!comments.length ? <p className="seen-comments-empty">Be the first to comment.</p> : null}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); submitComment(); }}>
              <FanAvatar alt="" name={user?.displayName || user?.name || user?.username || "You"} size="h-6 w-6" src={user?.avatarUrl || user?.avatar} />
              <input aria-label="Add a Wall note comment" maxLength={500} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment..." value={commentText} />
              <button aria-label="Record a voice comment" className="seen-comment-mic" disabled={commentMutation.isPending} onClick={() => setVoiceCommentOpen(true)} type="button"><FiMic /></button>
              <button className="seen-comment-post" disabled={!commentText.trim() || commentMutation.isPending} type="submit">Post</button>
            </form>
          </section>
        ) : null}
      </article>

      {voiceCommentOpen ? <VoiceCommentRecorder busy={commentMutation.isPending} onClose={() => setVoiceCommentOpen(false)} onSubmit={submitVoiceComment} /> : null}

      <ShareSheet isOpen={sendOpen} onClose={() => setSendOpen(false)} payload={sharePayload} />

      {reactionsSheetOpen ? (
        <WallReactionsSheet
          currentUserId={user?.id || user?._id}
          onAddYours={() => {
            setReactionsSheetOpen(false);
            setReactionPickerOpen(true);
          }}
          onClose={() => setReactionsSheetOpen(false)}
          postId={actionPostId}
          style={wallSheetPosition}
        />
      ) : null}

      {reactionPickerOpen ? (
        <div className="seen-reactions-layer" style={wallSheetPosition}>
          <button aria-label="Close reactions" className="seen-reactions-scrim" onClick={() => setReactionPickerOpen(false)} type="button" />
          <section aria-label={`Choose a reaction for ${creator.name}'s post`} aria-modal="true" className="seen-reaction-sheet" role="dialog">
            <span aria-hidden="true" className="seen-reaction-handle" />
            <div aria-label="Choose a Wall note reaction" className="seen-reaction-grid" role="group">
              {postReactionOptions.map((item) => {
                const count = reactionCountsByKey[item.key] || 0;
                const selected = reaction === item.key;
                return (
                  <button
                    aria-label={`${selected ? "Remove" : "Send"} ${item.label} reaction`}
                    aria-pressed={selected}
                    className={selected ? "is-selected seen-reaction-option" : "seen-reaction-option"}
                    disabled={reactionMutation.isPending}
                    key={item.key}
                    onClick={() => {
                      saveReaction(selected ? "" : item.key);
                      setReactionPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <small>{count || ""}</small>
                  </button>
                );
              })}
            </div>
            <p>One reaction — make it yours</p>
          </section>
        </div>
      ) : null}

      <FanModal
        isOpen={shareOpen}
        onClose={() => {
          setShareOpen(false);
          setShareCaption("");
        }}
        title="Share to profile"
      >
        <p className="text-sm leading-6 text-atseen-muted">Add your own note before this appears on your profile and in the Home feed.</p>
        <label className="mt-4 block text-xs font-bold text-atseen-muted">
          Caption <span className="font-normal">(optional)</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-atseen-line bg-atseen-bg p-3 text-sm text-white outline-none focus:border-atseen-blue"
            maxLength={500}
            onChange={(event) => setShareCaption(event.target.value)}
            placeholder="Say something about this post..."
            value={shareCaption}
          />
        </label>
        <div className="mt-4 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg">
          <div className="flex items-center gap-3 p-3">
            <FanAvatar name={creator.name} size="h-9 w-9" src={creator.avatar} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-xs font-bold">{creator.name}{creator.verified ? <VerifiedBadge /> : null}</p>
              <p className="text-[10px] text-atseen-muted">@{creator.username} · Original post</p>
            </div>
          </div>
          <div className="border-t border-atseen-line p-3">
            <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-white/90">{normalized.text}</p>
            {normalized.media?.[0]?.url ? <img alt="Post preview" className="mt-3 max-h-52 w-full rounded-xl object-cover" src={normalized.media[0].url} /> : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="rounded-xl border border-atseen-blue/40 px-4 py-2 text-sm font-bold text-atseen-blue" onClick={() => navigate(`/messages?share=${encodeURIComponent(`${window.location.origin}/posts/${actionPostId}`)}`)} type="button">Send in message</button>
          <button className="rounded-xl border border-atseen-line px-4 py-2 text-sm font-bold text-atseen-text" onClick={copyLink} type="button">Copy Link</button>
          <button
            className="rounded-xl border border-atseen-line px-4 py-2 text-sm font-bold text-atseen-text"
            onClick={() => {
              setShareOpen(false);
              setShareCaption("");
            }}
            type="button"
          >
            Cancel
          </button>
          <button className="rounded-xl bg-atseen-blue px-4 py-2 text-sm font-bold text-atseen-bg disabled:opacity-60" disabled={shareMutation.isPending} onClick={submitShare} type="button">
            {shareMutation.isPending ? "Sharing..." : "Share"}
          </button>
        </div>
      </FanModal>

      <FanModal
        className="home-post-more-sheet"
        hideHeader
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        overlayClassName="home-post-more-overlay"
        overlayStyle={wallSheetPosition}
        portal
        title={ownsPost ? "Your note" : "This note"}
      >
        <span className="home-post-more-handle" aria-hidden="true" />
        <h2 className="home-post-more-title">{ownsPost ? "Your note" : "This note"}</h2>
        <div className="home-post-more-list">
          {(ownsPost
            ? [
              { key: "story", label: "Add to your story", subtitle: "As a card — people tap it and land on your Wall", icon: FiPlusCircle },
              { key: "repost", label: "Repost to my profile", subtitle: "Your profile, your list — add as many as you like", icon: FiRepeat },
              { key: "share", label: "Share", icon: FiSend },
              { key: "archive", label: "Archive", subtitle: "Off the showcase, stats stay", icon: FiArchive },
              { key: "delete", label: "Delete note", icon: FiTrash2, danger: true },
            ]
            : [
              { key: "share", label: "Share", icon: FiSend },
              { key: "show-more", label: "Show more like this", subtitle: "Tunes your feed", icon: FiEye },
              { key: "hide", label: "Hide this note", icon: FiEyeOff },
              { key: "unfollow", label: `Unfollow ${creator.name.split(" ")[0]}`, icon: FiUserMinus },
              { key: "report-spam", label: "Report spam", subtitle: "Spam, misleading links or repeated promotions", icon: FiSlash, danger: true },
              { key: "report", label: "Report", icon: FiFlag },
              { key: "block", label: `Block ${creator.name.split(" ")[0]}`, icon: FiSlash, danger: true },
            ]).map(({ danger, icon: Icon, key, label, subtitle }) => (
            <button
              className={danger || key === "delete" ? "is-danger" : ""}
              disabled={moreBusy === key}
              key={key}
              onClick={() => moreAction(key)}
              type="button"
            >
              <Icon aria-hidden="true" />
              <span><strong>{moreBusy === key ? "Please wait..." : label}</strong>{subtitle ? <small>{subtitle}</small> : null}</span>
            </button>
          ))}
        </div>
      </FanModal>

      <StoryCreator
        initialContent={{
          sharedCard: {
            destinationRoute: `/posts/${actionPostId}`,
            ...(isVoiceOnlyPost ? { displayMode: "text_only" } : {}),
            eyebrow: isVoiceOnlyPost ? "NOTE" : [creator.name, normalized.context, normalized.location].filter(Boolean).join(" · "),
            imageUrl: "",
            kind: isVoiceOnlyPost ? "voice_note" : "post",
            ...(isVoiceOnlyPost ? {
              originalTranscript: voiceCopyForStory.originalTranscript,
              translationLabel: voiceCopyForStory.translationLabel,
              translationText: voiceCopyForStory.translationText,
            } : {}),
            subtitle: isVoiceOnlyPost ? "from my Wall - tap >" : "from the Wall · tap ›",
            title: isVoiceOnlyPost ? voiceTextForStory || normalized.text || "Voice note" : normalized.text.slice(0, 96) || "View post",
          },
        }}
        isOpen={storyCreatorOpen}
        onClose={() => setStoryCreatorOpen(false)}
        onPublished={() => {
          setStoryCreatorOpen(false);
          showToast("Note added to your story.");
        }}
      />

      <FeedPostComposer currentUser={creator} initialPost={{ ...normalized, id: actionPostId }} isOpen={editOpen} mode="edit" onClose={() => setEditOpen(false)} />

      <FanModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Post">
        <p className="text-sm leading-6 text-atseen-muted">This removes the post from Home and your public posts. This action cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl border border-atseen-line px-4 py-3 text-sm font-bold text-atseen-text" onClick={() => setDeleteOpen(false)} type="button">Cancel</button>
          <button
            className="rounded-xl bg-atseen-danger px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            disabled={deleteMutation.isPending}
            onClick={() => {
              deleteMutation.mutate(actionPostId, {
                onError: (error) => showToast(error?.response?.data?.message || "Post could not be deleted."),
                onSuccess: () => {
                  setDeleteOpen(false);
                  showToast("Post deleted.");
                },
              });
            }}
            type="button"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Post"}
          </button>
        </div>
      </FanModal>

      <FanModal isOpen={reportOpen} onClose={() => setReportOpen(false)} title={reportDone ? "Report received" : "Report post"}>
        {reportDone ? (
          <div className="text-center">
            <p className="text-sm leading-6 text-atseen-muted">Our team reviews every report. You will not be revealed as the reporter.</p>
            <button
              className="mt-5 rounded-xl border border-atseen-line px-5 py-3 text-sm font-bold text-atseen-text"
              onClick={() => {
                setReportOpen(false);
                setReportDone(false);
              }}
              type="button"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-atseen-muted">Why are you reporting this?</p>
            <div className="mt-2 divide-y divide-white/[0.05]">
              {atseenReportReasons.map((reason) => (
                <button
                  className="block w-full px-1 py-3 text-left text-sm font-semibold text-atseen-text transition hover:text-atseen-blue"
                  key={reason}
                  onClick={() => reportPost(reason)}
                  disabled={reportMutation.isPending}
                  type="button"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}
      </FanModal>
    </>
  );
}

export default FeedPost;
