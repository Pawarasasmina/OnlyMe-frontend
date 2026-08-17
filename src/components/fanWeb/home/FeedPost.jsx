import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiBookmark, FiCheck, FiEye, FiFlag, FiMessageCircle, FiMoreHorizontal, FiRepeat, FiSend, FiShare2, FiSmile } from "react-icons/fi";
import FeedPostComposer from "../../posts/FeedPostComposer";
import ShareSheet from "../../share/ShareSheet";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { atseenCreators, atseenReportReasons } from "../../../data/atseenMockData";
import { useAuth } from "../../../hooks/useAuth";
import {
  useBlockFeedPostAuthor,
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
  if (!item?.url || failed) {
    return <span className="home-feed-media-fallback" role="img" aria-label="Media unavailable">Media unavailable</span>;
  }
  if (String(item.type || "").toLowerCase().startsWith("video")) {
    return <video controls preload="metadata" src={item.url} title={`${title} video`} />;
  }
  return <img alt={`${title} attachment`} loading="lazy" onError={() => setFailed(true)} src={item.url} />;
}

function normalizeFeedPost(post = {}) {
  const mockCreator = post.creatorId ? atseenCreators[post.creatorId] : null;
  const author = post.author || post.creator || mockCreator || { name: "Creator", username: "creator" };
  const media = post.media?.length ? post.media : (post.images || []).map((url) => ({ id: url, type: "image", url }));
  const comments = post.comments?.length
    ? post.comments.map((comment) => ({
      id: comment.id || comment._id,
      text: comment.text || "",
      author: comment.author || comment.user || null,
      creatorId: comment.creatorId,
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

function FeedPost({ post }) {
  const navigate = useNavigate();
  const normalized = useMemo(() => normalizeFeedPost(post), [post]);
  const creator = normalized.author;
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const deleteMutation = useDeleteFeedPost();
  const reactionMutation = useReactToFeedPost();
  const commentMutation = useCreateFeedPostComment();
  const saveMutation = useToggleFeedPostSave();
  const shareMutation = useToggleFeedPostShare();
  const hideMutation = useHideFeedPost();
  const reportMutation = useReportFeedPost();
  const blockMutation = useBlockFeedPostAuthor();
  const viewMutation = useMarkFeedPostViewed();
  const articleRef = useRef(null);
  const commentInputRef = useRef(null);
  const viewTrackedRef = useRef(false);
  const [reaction, setReaction] = useState(normalized.viewerReaction);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [saved, setSaved] = useState(normalized.viewerSaved);
  const [shared, setShared] = useState(normalized.viewerShared);
  const [comments, setComments] = useState(normalized.seededComments);
  const [commentText, setCommentText] = useState("");
  const [shareCaption, setShareCaption] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [activeEmojiGroupKey, setActiveEmojiGroupKey] = useState(homeCommentEmojiGroups[0].key);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewCount, setViewCount] = useState(normalized.viewCount);

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
  const activeEmojiGroup = homeCommentEmojiGroups.find((group) => group.key === activeEmojiGroupKey) || homeCommentEmojiGroups[0] || commentEmojiGroups[0];
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
    imageUrl: normalized.media?.[0]?.url || "",
    textPreview: normalized.text,
    title: normalized.context
      ? [normalized.context, normalized.location].filter(Boolean).join(" - ")
      : normalized.text.slice(0, 96) || "Home post",
  }), [actionPostId, creator.avatar, creator.id, creator.name, creator.username, normalized.context, normalized.location, normalized.media, normalized.text, postUrl]);
  const contextFilter = filterForContext(normalized.context, normalized.location);
  const contextHref = contextFilter
    ? `/wall?filter=${encodeURIComponent(contextFilter)}${normalized.location ? `&city=${encodeURIComponent(normalized.location)}` : ""}`
    : "/wall";
  const firstMedia = normalized.media?.[0] || {};
  const mediaLayout = normalized.media?.length === 1 && String(firstMedia.type || "").toLowerCase().startsWith("video")
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
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reactionPickerOpen]);

  useEffect(() => {
    viewTrackedRef.current = false;
  }, [actionPostId]);

  useEffect(() => {
    const target = articleRef.current;
    if (!target || ownsPost || !mongoIdPattern.test(String(actionPostId || ""))) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || viewTrackedRef.current || viewMutation.isPending) return;
      viewTrackedRef.current = true;
      viewMutation.mutate(actionPostId, {
        onSuccess: (result) => {
          if (Number.isFinite(Number(result?.viewCount))) setViewCount(Number(result.viewCount));
        },
        onError: () => {
          viewTrackedRef.current = false;
        },
      });
    }, { threshold: 0.55 });

    observer.observe(target);
    return () => observer.disconnect();
  }, [actionPostId, ownsPost, viewMutation]);

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
          setEmojiPanelOpen(false);
          showToast("Comment posted.");
        },
      }
    );
  };

  const saveReaction = (nextReaction) => {
    if (!requireDatabasePost()) return;

    reactionMutation.mutate(
      { postId: actionPostId, reaction: nextReaction },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Reaction could not be saved."),
        onSuccess: syncSavedPost,
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
      { postId: normalized.id, payload: { reason } },
      {
        onError: (error) => showToast(error?.response?.data?.message || "Report could not be submitted."),
        onSuccess: () => {
          setReportDone(true);
          showToast("Report submitted.");
        },
      }
    );
  };

  const insertCommentEmoji = (emoji) => {
    const input = commentInputRef.current;
    setCommentText((current) => {
      const start = input?.selectionStart ?? current.length;
      const end = input?.selectionEnd ?? current.length;
      const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
      const cursor = start + emoji.length;

      window.requestAnimationFrame(() => {
        input?.focus();
        input?.setSelectionRange(cursor, cursor);
      });

      return next;
    });
  };

  const moreAction = (action) => {
    if (action === "save") {
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
          <button
            aria-label={`More actions for ${creator.name}'s post`}
            className="rounded-full p-1.5 text-atseen-dim transition hover:bg-atseen-surface-2 hover:text-white"
            onClick={() => setMoreOpen(true)}
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
              onClick={() => setReactionPickerOpen(true)}
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
          <button aria-label="Open comments" className="home-feed-action-button" onClick={() => setCommentsOpen(true)} title="Comment" type="button">
            <FiMessageCircle aria-hidden="true" /> <span>{commentCount}</span>
          </button>
          <button aria-label={shared ? "Remove repost" : "Repost"} className={`home-feed-action-button ${shared ? "is-selected" : ""}`} disabled={shareMutation.isPending} onClick={toggleShare} title="Repost" type="button">
            <FiRepeat aria-hidden="true" /> <span>{formatCount(normalized.shareCount)}</span>
          </button>
          <span aria-label={`${formatCount(viewCount)} views`} className="home-feed-action-button is-readonly" title="Views">
            <FiEye aria-hidden="true" /> <span>{formatCount(viewCount)}</span>
          </span>
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
      </article>

      <ShareSheet isOpen={sendOpen} onClose={() => setSendOpen(false)} payload={sharePayload} />

      {reactionPickerOpen ? (
        <div
          aria-label={`Reactions for ${creator.name}'s post`}
          aria-modal="true"
          className="home-reaction-overlay"
          onClick={() => setReactionPickerOpen(false)}
          role="dialog"
        >
          <div className="home-reaction-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="home-reaction-handle" aria-hidden="true" />
            <div className="home-reaction-grid" role="group" aria-label="Choose a reaction">
              {postReactionOptions.map((item) => {
                const count = reactionCountsByKey[item.key] || 0;
                const selected = reaction === item.key;
                return (
                  <button
                    aria-label={`${selected ? "Remove" : "Send"} ${item.label} reaction`}
                    aria-pressed={selected}
                    className={`home-reaction-option ${selected ? "is-selected" : ""}`}
                    disabled={reactionMutation.isPending}
                    key={item.key}
                    onClick={() => {
                      saveReaction(selected ? "" : item.key);
                      setReactionPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </div>
            <p>{reactionCount ? `${reactionCount} reaction${reactionCount === 1 ? "" : "s"} - make it yours` : "One reaction - make it yours"}</p>
          </div>
        </div>
      ) : null}

      <FanModal
        isOpen={commentsOpen}
        onClose={() => {
          setCommentsOpen(false);
          setEmojiPanelOpen(false);
        }}
        title={`Comments - ${commentCount}`}
      >
        <p className="border-b border-atseen-line pb-3 text-xs leading-5 text-atseen-muted">{normalized.text}</p>
        <div className="max-h-[330px] overflow-y-auto">
          {comments.map((comment) => {
            const commentCreator = comment.author || (comment.creatorId === "me" ? { name: "You" } : atseenCreators[comment.creatorId]) || { name: "Creator" };
            return (
              <div className="flex gap-3 border-b border-white/[0.05] py-3" key={comment.id}>
                <FanAvatar name={commentCreator.name} size="h-8 w-8" src={commentCreator.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-atseen-text">{commentCreator.name}</p>
                  <p className="mt-1 text-sm leading-6 text-white/85">{comment.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-atseen-line bg-atseen-surface-2 focus-within:border-atseen-blue">
              <button
                aria-expanded={emojiPanelOpen}
                aria-label="Open emoji keyboard"
                className={`ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition hover:bg-white/10 hover:text-white ${emojiPanelOpen ? "text-atseen-blue" : "text-atseen-muted"}`}
                onClick={() => setEmojiPanelOpen((current) => !current)}
                type="button"
              >
                <FiSmile aria-hidden="true" />
              </button>
              <input
                className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-white outline-none"
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitComment();
                }}
                placeholder="Say something real..."
                ref={commentInputRef}
                value={commentText}
              />
            </div>
            <button
              className="rounded-xl bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-4 text-sm font-bold text-atseen-bg disabled:opacity-60"
              disabled={commentMutation.isPending}
              onClick={submitComment}
              type="button"
            >
              {commentMutation.isPending ? "Sending..." : "Send"}
            </button>
          </div>
          {emojiPanelOpen ? (
            <div className="mt-2 rounded-2xl border border-atseen-line bg-[#11161F] p-3 shadow-glow">
              <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
                {homeCommentEmojiGroups.map((group) => (
                  <button
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${activeEmojiGroupKey === group.key ? "bg-atseen-blue text-atseen-bg" : "bg-atseen-surface-2 text-atseen-muted hover:text-white"}`}
                    key={group.key}
                    onClick={() => setActiveEmojiGroupKey(group.key)}
                    type="button"
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
                {activeEmojiGroup.emojis.map((emoji) => (
                  <button
                    aria-label={`Add emoji ${emoji}`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition hover:bg-white/10 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-atseen-blue"
                    key={emoji}
                    onClick={() => insertCommentEmoji(emoji)}
                    type="button"
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </FanModal>

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

      <FanModal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="divide-y divide-white/[0.05]">
          {(ownsPost
            ? [
              ["edit", "Edit Post", FiMoreHorizontal],
              ["delete", "Delete Post", FiFlag],
              ["copy", "Copy Link", FiShare2],
              ["view", "View Post", FiMoreHorizontal],
            ]
            : [
              ["save", saved ? "Remove saved post" : "Save post", FiBookmark],
              ["share", "Share", FiShare2],
              ["copy", "Copy Link", FiShare2],
              ["not-useful", "Not useful", FiMoreHorizontal],
              ["report", "Report", FiFlag],
              ["block", `Block ${creator.name.split(" ")[0]}`, FiFlag],
            ]).map(([key, label, Icon]) => (
            <button
              className={`flex w-full items-center gap-3 px-1 py-3 text-left text-sm font-semibold transition hover:text-atseen-blue ${key === "block" || key === "delete" ? "text-atseen-danger" : "text-atseen-text"}`}
              key={key}
              onClick={() => moreAction(key)}
              type="button"
            >
              <Icon aria-hidden="true" className="text-atseen-muted" /> {label}
            </button>
          ))}
        </div>
      </FanModal>

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
