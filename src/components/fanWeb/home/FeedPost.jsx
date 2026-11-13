import { useReactionSelection } from "../../../hooks/useReactionSelection";
import { popReactionCapsule } from "../../../utils/reactionMotion";
import { localizedTuple as __uiTuple } from "../../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { msg as __msg } from "../../../i18n/runtime.js";
import { wallNoteStoryDraft } from "../../../utils/wallNoteStory";
import { relativeTime as compactPostAge } from "../../../utils/relativeTime";
import WallReactionTray from "./WallReactionTray";
import { wallCloseLabels } from "../../../utils/wallResolution";
import ShowMoreEyeIcon from "../../branding/ShowMoreEyeIcon";
import WallPostTypeBadge from "./WallPostTypeBadge";
import { wallPostCaption } from "../../../utils/wallVoiceDisplay";
import { WallTextContent, WallVoiceNote } from "./WallPostContent";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiArchive, FiBookmark, FiCheck, FiEyeOff, FiFlag, FiMessageCircle, FiMic, FiMapPin, FiMoreHorizontal, FiPlusCircle, FiRepeat, FiSend, FiShare2, FiSlash, FiTrash2, FiUserMinus } from "react-icons/fi";
import FeedPostComposer from "../../posts/FeedPostComposer";
import ContentEntityList from "../../contentEntities/ContentEntityList";
import ShareSheet from "../../share/ShareSheet";
import StoryCreator from "../../stories/StoryCreator";
import VoiceCommentRecorder from "../../comments/VoiceCommentRecorder";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import { confirmDialog } from "../../shared/AppDialogProvider";
import "./WallNoteMenu.css";
import "./WallNoteContent.css";
import WallCommentList from "./WallCommentList";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { atseenCreators, atseenReportReasons } from "../../../data/atseenMockData";
import { useAuth } from "../../../hooks/useAuth";
import { analyticsService } from "../../../services/analyticsService";
import { profileService } from "../../../services/profileService";
import { repostService } from "../../../services/repostService";
import { postService } from "../../../services/postService";
import {
  useSetPostResolution,
  useBumpFeedPost,
  useBlockFeedPostAuthor,
  useArchiveFeedPost,
  useCreateFeedPostComment,
  useDeleteFeedPostComment,
  useReactToFeedPostComment,
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
  { key: "like", get label() { return __msg("fanWeb.like"); }, icon: "👍" },
  { key: "love", get label() { return __msg("fanWeb.love"); }, icon: "❤️" },
  { key: "care", get label() { return __msg("fanWeb.care"); }, icon: "🤗" },
  { key: "wow", get label() { return __msg("fanWeb.wow"); }, icon: "😮" },
  { key: "useful", get label() { return __msg("fanWeb.useful"); }, icon: "💡" },
  { key: "fire", get label() { return __msg("fanWeb.fire"); }, icon: "🔥" },
];

const commentReportReasons = [
  __uiTuple([{ __uiMessage: "social.spam" }, "SPAM"]),
  __uiTuple([{ __uiMessage: "social.harassment" }, "HARASSMENT"]),
  __uiTuple([{ __uiMessage: "social.hate" }, "HATE"]),
  __uiTuple([{ __uiMessage: "social.nudity" }, "NUDITY"]),
  __uiTuple([{ __uiMessage: "discover.sexualContent" }, "SEXUAL_CONTENT"]),
  __uiTuple([{ __uiMessage: "discover.violence" }, "VIOLENCE"]),
  __uiTuple([{ __uiMessage: "system.SeenReaderPage.bea5831470" }, "SELF_HARM"]),
  __uiTuple([{ __uiMessage: "discover.scam" }, "SCAM"]),
  __uiTuple([{ __uiMessage: "social.copyright" }, "COPYRIGHT"]),
  __uiTuple([{ __uiMessage: "system.SeenReaderPage.a66546f650" }, "IMPERSONATION"]),
  __uiTuple([{ __uiMessage: "system.SeenReaderPage.4873074e0d" }, "CHILD_SAFETY"]),
  __uiTuple([{ __uiMessage: "admin.other" }, "OTHER"]),
];

function wallReplyIntent(post) {
  const type = String(post.postType || post.context || "").trim().toLowerCase();
  if (type === "need help" || type === "need_help") return __msg("fanWeb.iCanHelp");
  if (type === "looking for" || type === "looking_for" || post.topic === "Meet people") return "I\u2019m in";
  if (["offering", "buy & sell", "buy/sell", "buy_sell"].includes(type)) return __msg("fanWeb.interested");
  if (["question", "advice"].includes(type)) return __msg("fanWeb.answer");
  return "";
}

const postReactionOptions = [
  { key: "see_you", get label() { return __msg("discover.iSeeYou"); }, icon: "👁" },
  { key: "love", get label() { return __msg("fanWeb.love"); }, icon: "\u2764\uFE0F" },
  { key: "fire", get label() { return __msg("fanWeb.fire"); }, icon: "\uD83D\uDD25" },
  { key: "teary", get label() { return __msg("social.moved"); }, icon: "🥹" },
  { key: "laugh", get label() { return __msg("fanWeb.laugh"); }, icon: "\uD83D\uDE02" },
  { key: "like", get label() { return __msg("fanWeb.support"); }, icon: "\uD83E\uDD1D" },
  { key: "clap", get label() { return __msg("fanWeb.clap"); }, icon: "\uD83D\uDC4F" },
  { key: "wow", get label() { return __msg("social.surprised"); }, icon: "\uD83D\uDE2E" },
  { key: "admire", get label() { return __msg("social.adore"); }, icon: "\uD83D\uDE0D" },
  { key: "sad", get label() { return __msg("social.sad"); }, icon: "\uD83D\uDE22" },
  { key: "hug", get label() { return __msg("social.hug"); }, icon: "🫂" },
  { key: "strong", get label() { return __msg("fanWeb.strong"); }, icon: "\uD83D\uDCAA" },
  { key: "pray", get label() { return __msg("fanWeb.respect"); }, icon: "\uD83D\uDE4F" },
  { key: "hundred", get label() { return __msg("social.oneHundred"); }, icon: "\uD83D\uDCAF" },
  { key: "sparkles", get label() { return __msg("social.sparkles"); }, icon: "\u2728" },
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
  { key: "recent", get label() { return __msg("fanWeb.recent"); }, emojis: ["😀", "😂", "🥰", "😍", "😎", "😭", "😮", "😅", "🙂", "🙃"] },
  { key: "gestures", get label() { return __msg("fanWeb.gestures"); }, emojis: ["👍", "❤️", "👏", "🙏", "🤝", "💪", "👌", "🙌", "✌️", "🤞"] },
  { key: "vibes", get label() { return __msg("fanWeb.vibes"); }, emojis: ["✨", "🔥", "💯", "🎉", "⭐", "🌙", "☀️", "💡", "🎶", "📌"] },
  { key: "food", get label() { return __msg("fanWeb.food"); }, emojis: ["☕", "🍕", "🍔", "🍰", "🍓", "🍉", "🍜", "🍟", "🥗", "🍿"] },
];

const mongoIdPattern = /^[a-f\d]{24}$/i;
const homeCommentEmojiGroups = [
  { key: "recent", get label() { return __msg("fanWeb.recent"); }, emojis: ["\uD83D\uDE00", "\uD83D\uDE02", "\uD83E\uDD70", "\uD83D\uDE0D", "\uD83D\uDE0E", "\uD83D\uDE2D", "\uD83D\uDE2E", "\uD83D\uDE05", "\uD83D\uDE42", "\uD83D\uDE43"] },
  { key: "gestures", get label() { return __msg("fanWeb.gestures"); }, emojis: ["\uD83D\uDC4D", "\u2764\uFE0F", "\uD83D\uDC4F", "\uD83D\uDE4F", "\uD83E\uDD1D", "\uD83D\uDCAA", "\uD83D\uDC4C", "\uD83D\uDE4C", "\u270C\uFE0F", "\uD83E\uDD1E"] },
  { key: "vibes", get label() { return __msg("fanWeb.vibes"); }, emojis: ["\u2728", "\uD83D\uDD25", "\uD83D\uDCAF", "\uD83C\uDF89", "\u2B50", "\uD83C\uDF19", "\u2600\uFE0F", "\uD83D\uDCA1", "\uD83C\uDFB6", "\uD83D\uDCCC"] },
  { key: "food", get label() { return __msg("fanWeb.food"); }, emojis: ["\u2615", "\uD83C\uDF55", "\uD83C\uDF54", "\uD83C\uDF70", "\uD83C\uDF53", "\uD83C\uDF49", "\uD83C\uDF5C", "\uD83C\uDF5F", "\uD83E\uDD57", "\uD83C\uDF7F"] },
];

// Retained for compatibility with previously persisted comment-composer preferences.
void commentEmojiGroups;
void homeCommentEmojiGroups;

function relativeTime(value, fallback = "now") {
  return compactPostAge(value, fallback);
}

function formatCount(value = 0) {
  return new Intl.NumberFormat(__uiLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function MediaItem({ item, title, postId, postText }) {
  __useUiLanguage();
  const [failed, setFailed] = useState(false);
  if (!item?.url || failed) {
    return <span className="home-feed-media-fallback" role="img" aria-label={__msg("fanWeb.mediaUnavailable")}>{__msg("fanWeb.mediaUnavailable")}</span>;
  }
  if (String(item.type || "").toLowerCase() === "audio") {
    return <WallVoiceNote item={item} postId={postId} postText={postText} />;
  }
  if (String(item.type || "").toLowerCase().startsWith("video")) {
    return <video controls preload="metadata" src={item.url} title={__msg("fanWeb.video", { value0: title })} />;
  }
  return <img alt={__msg("fanWeb.attachment", { value0: title })} loading="lazy" onError={() => setFailed(true)} src={item.url} />;
}

function WallReactionsSheet({ currentUserId, onAddYours, onClose, postId, style }) {
  __useUiLanguage();
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
      <button aria-label={__msg("fanWeb.closeReactions")} className="seen-reactions-scrim" onClick={onClose} type="button" />
      <section aria-label={__msg("fanWeb.wallNoteReactions")} aria-modal="true" className="seen-reactors-sheet" role="dialog">
        <span aria-hidden="true" className="seen-reactors-handle" />
        <header className="seen-reactors-header"><h2>{__msg("fanWeb.reactions")}</h2><span>{formatCount(query.data?.total || 0)}</span></header>
        <div aria-label={__msg("fanWeb.reactionFilters")} className="seen-reactors-tabs" role="tablist">
          <button aria-selected={!activeReaction} className={!activeReaction ? "is-active" : ""} onClick={() => setActiveReaction("")} role="tab" type="button">{__msg("fanWeb.all")}</button>
          {reactionTabs.map((item) => <button aria-selected={activeReaction === item.key} className={activeReaction === item.key ? "is-active" : ""} key={item.key} onClick={() => setActiveReaction(item.key)} role="tab" type="button"><span aria-hidden="true">{item.icon}</span>{formatCount(counts[item.key])}</button>)}
        </div>
        <div className="seen-reactors-list">
          {query.isLoading ? <p className="seen-reactors-state">{__msg("fanWeb.loadingReactions")}</p> : null}
          {query.isError ? <div className="seen-reactors-state"><p>{__msg("fanWeb.couldNotLoadReactions")}</p><button onClick={() => query.refetch()} type="button">{__msg("activity.retry")}</button></div> : null}
          {!query.isLoading && !query.isError ? reactors.map((reactor) => {
            const isCurrentUser = String(reactor.user?.id || "") === String(currentUserId || "");
            const name = isCurrentUser ? __msg("fanWeb.you") : reactor.user?.name || reactor.user?.username || __msg("social.atseenUser");
            const meta = reactionDisplayFor(reactor.reaction);
            return <Link className="seen-reactor-row" key={reactor.id} onClick={onClose} to={reactor.user?.username ? `/profile/${encodeURIComponent(reactor.user.username)}` : "/profile"}>
              <FanAvatar alt={__msg("fan.avatar", { value0: name })} name={name} size="h-[38px] w-[38px]" src={reactor.user?.avatar} />
              <span className="seen-reactor-copy"><strong>{name}{reactor.user?.verified ? <VerifiedBadge className="seen-reactor-verified" /> : null}</strong>{reactor.user?.username ? <small>@{reactor.user.username}</small> : null}</span>
              <span aria-label={meta?.label || __msg("fanWeb.reaction")} className="seen-reactor-emoji">{meta?.icon || "🤝"}</span>
            </Link>;
          }) : null}
          {!query.isLoading && !query.isError && !reactors.length ? <p className="seen-reactors-state">{__msg("fanWeb.noReactionsYet")}</p> : null}
        </div>
        <button className="seen-reactors-add" onClick={onAddYours} type="button">{__msg("fanWeb.addYours")}</button>
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
      ...comment,
      id: comment.id || comment._id,
      text: comment.text || "",
      audio: comment.audio || null,
      author: comment.author || comment.user || null,
      creatorId: comment.creatorId,
      viewerSaved: Boolean(comment.viewerSaved || comment.saved),
      viewerReposted: Boolean(comment.viewerReposted),
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
      name: author.name || __msg("discover.creator"),
      username: author.username || "creator",
      verified: Boolean(author.verified || author.isVerified),
    },
    commentCount: Number(post.commentCount ?? post.comments ?? 0),
    resolvedAt: post.resolvedAt || null,
    canBump: Boolean(post.canBump),
    availabilityAge: `${Math.max(0, Math.floor((Date.now() - new Date(post.bumpedAt || post.publishedAt || post.createdAt).getTime()) / 86400000))}d`,
    closedReason: post.closedReason || "",
    isClosed: Boolean(post.isClosed),
    rightNow: Boolean(post.rightNow || post.postType === "Right Now" || post.context === "Right now"),
    canResolve: Boolean(post.canResolve),
    postType: post.postType || "",
    topic: post.topic || "",
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
    reactorPreviews: post.reactorPreviews || [],
    result: post.result || "",
    seededComments: comments,
    supportCount: Number(post.supportCount ?? post.handshakes ?? 0),
    shareCount: Number(post.shareCount ?? 0),
    privateShareCount: Number(post.privateShareCount ?? 0),
    text: post.text || "",
    timestamp: post.timestamp || compactPostAge(post.bumpedAt || post.publishedAt || post.createdAt),
    topReactions: post.topReactions || [],
    viewCount: Number(post.viewCount ?? post.views ?? post.viewerCount ?? 0),
    viewerReaction: post.viewerReaction || null,
    viewerSaved: Boolean(post.viewerSaved),
    viewerShared: Boolean(post.viewerShared),
  };
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

function WallPostViewEye() {
  __useUiLanguage();
  return (
    <svg aria-hidden="true" className="home-feed-head-eye" fill="none" viewBox="0 0 16 10">
      <path d="M1 5c1.85-2.05 4.2-3.05 7-3.05s5.15 1 7 3.05c-1.85 2.05-4.2 3.05-7 3.05S2.85 7.05 1 5Z" />
      <circle cx="8" cy="5" r="1.15" />
    </svg>
  );
}

function FeedPost({ post, profileMenu = false, focusedCommentId = "" }) {
  const { language: __uiLanguage } = __useUiLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const normalized = useMemo(() => normalizeFeedPost(post), [post]);
  const [livePrivateShareCount, setLivePrivateShareCount] = useState(normalized.privateShareCount);
  useEffect(() => setLivePrivateShareCount(normalized.privateShareCount), [normalized.privateShareCount]);
  useEffect(() => {
    const update = (event) => {
      if (event.detail?.contentType === "feed_post" && String(event.detail.contentId) === String(normalized.id)) {
        setLivePrivateShareCount(Number(event.detail.privateShareCount) || 0);
      }
    };
    window.addEventListener("atseen:private-share", update);
    return () => window.removeEventListener("atseen:private-share", update);
  }, [normalized.id]);
  const [resolvedAt, setResolvedAt] = useState(normalized.resolvedAt);
  useEffect(() => { setResolvedAt(normalized.resolvedAt); }, [normalized.resolvedAt]);
  const caption = wallPostCaption(normalized.text, normalized.media);
  const creator = normalized.author;
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const deleteMutation = useDeleteFeedPost();
  const resolutionMutation = useSetPostResolution();
  const bumpMutation = useBumpFeedPost();
  const archiveMutation = useArchiveFeedPost();
  const reactionMutation = useReactToFeedPost();
  const commentMutation = useCreateFeedPostComment();
  const commentDeleteMutation = useDeleteFeedPostComment();
  const commentReactionMutation = useReactToFeedPostComment();
  const saveMutation = useToggleFeedPostSave();
  const shareMutation = useToggleFeedPostShare();
  const hideMutation = useHideFeedPost();
  const reportMutation = useReportFeedPost();
  const blockMutation = useBlockFeedPostAuthor();
  const viewMutation = useMarkFeedPostViewed();
  const articleRef = useRef(null);
  const reactionAnchorRef = useRef(null);
  const reactionHoldRef = useRef(null);
  const reactionHeldRef = useRef(false);
  useEffect(() => () => window.clearTimeout(reactionHoldRef.current), []);
  const impressionTrackedRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const [reaction, setReaction] = useState(normalized.viewerReaction);
  const [reactionBreakdown, setReactionBreakdown] = useState(normalized.reactionBreakdown || {});
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reactionExpanded, setReactionExpanded] = useState(false);
  const [allComments, setAllComments] = useState(Boolean(focusedCommentId));
  const openReactionPicker = () => { setReactionExpanded(false); setReactionPickerOpen(true); };
  const [reactionsSheetOpen, setReactionsSheetOpen] = useState(false);
  const [saved, setSaved] = useState(normalized.viewerSaved);
  const [shared, setShared] = useState(normalized.viewerShared);
  const [comments, setComments] = useState(normalized.seededComments);
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [reactingCommentId, setReactingCommentId] = useState("");
  const commentInputRef = useRef(null);
  const [shareCaption, setShareCaption] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(Boolean(focusedCommentId));
  useEffect(() => {
    if (!focusedCommentId) return undefined;
    setAllComments(true); setCommentsOpen(true);
    let target;
    const frame = requestAnimationFrame(() => {
      target = [...(articleRef.current?.querySelectorAll("[data-comment-id]") || [])].find(element => element.dataset.commentId === focusedCommentId);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.classList.add("is-activity-focus");
    });
    const timer = setTimeout(() => target?.classList.remove("is-activity-focus"), 4000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); target?.classList.remove("is-activity-focus"); };
  }, [focusedCommentId]);
  const [voiceCommentOpen, setVoiceCommentOpen] = useState(false);
  const [repostingCommentId, setRepostingCommentId] = useState("");
  const [commentReport, setCommentReport] = useState(null);
  const [commentReportStage, setCommentReportStage] = useState("options");
  const [commentReportBusy, setCommentReportBusy] = useState(false);
  const toggleCommentRepost = async (comment) => {
    if (!comment?.id || repostingCommentId) return;
    setRepostingCommentId(comment.id);
    try {
      const response = await repostService.toggle("cm", comment.id, "FeedPost");
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, viewerReposted: response.data.data.reposted, repostCount: response.data.data.repostCount } : item));
      showToast(response.data.data.reposted ? __msg("social.repostedToYourProfile") : __msg("fanWeb.repostRemoved"));
    } catch (error) {
      showToast(error.response?.data?.message || __msg("fanWeb.couldNotUpdateRepost"));
    } finally {
      setRepostingCommentId("");
    }
  };
  const [moreOpen, setMoreOpen] = useState(false);
  const wallSheetPosition = useWallSheetPosition(moreOpen || reactionPickerOpen || reactionsSheetOpen || Boolean(commentReport));
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewCount, setViewCount] = useState(normalized.viewCount);
  const [moreBusy, setMoreBusy] = useState("");
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);

  const ownsPost = normalized.isOwner || canManageFeedPost(user, normalized);
  const headerName = ownsPost ? __msg("fanWeb.you") : creator.name;
  const closeLabels = wallCloseLabels(normalized.postType, normalized.context);
  const selectedReaction = reactionDisplayFor(reaction);
  const reactionSummary = (Object.keys(reactionBreakdown).length
    ? Object.entries(reactionBreakdown).map(([reactionKey, count]) => ({ count, reaction: reactionKey }))
    : normalized.reactions?.length
      ? normalized.reactions
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
  const replyIntent = wallReplyIntent(normalized);
  const visibleReactionSamples = reactionSummary.length
    ? [...reactionSummary].sort((a, b) => Number(b.reaction.key === reaction) - Number(a.reaction.key === reaction) || b.count - a.count).slice(0, 2).map(({ reaction: summaryReaction }) => summaryReaction.icon).join(" ")
    : "\u2764\uFE0F \uD83D\uDD25";
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
    destinationRoute: `/wall?note=${encodeURIComponent(actionPostId)}`,
    imageUrl: isVoiceOnlyPost ? "" : normalized.media?.[0]?.url || "",
    mediaType: firstMediaType,
    storyDraft: wallNoteStoryDraft({ id: actionPostId, text: normalized.text, location: normalized.location, own: ownsPost, author: creator, ...(isVoiceOnlyPost ? { transcript: voiceTextForStory, translationText: voiceCopyForStory.translationText, translationLabel: voiceCopyForStory.translationLabel } : {}) }),
    textPreview: normalized.text,
    title: normalized.context
      ? [normalized.context, normalized.location].filter(Boolean).join(" - ")
      : normalized.text.slice(0, 96) || __msg("fanWeb.homePost"),
  }), [actionPostId, firstMediaType, isVoiceOnlyPost, normalized.context, normalized.location, normalized.media, normalized.text, postUrl, voiceCopyForStory.translationLabel, voiceCopyForStory.translationText, voiceTextForStory, ownsPost, creator, __uiLanguage]);
  const mediaLayout = normalized.media?.length === 1 && firstMediaType === "audio"
    ? "audio"
    : normalized.media?.length === 1 && firstMediaType.startsWith("video")
    ? "hero"
    : "compact";

  useEffect(() => {
    setReaction(normalized.viewerReaction);
  }, [normalized.viewerReaction]);

  useEffect(() => {
    setReactionBreakdown(normalized.reactionBreakdown || {});
  }, [normalized.reactionBreakdown]);

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
    if (!reactionPickerOpen || !reactionExpanded) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setReactionPickerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("seen-sheet-lock");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("seen-sheet-lock");
    };
  }, [reactionPickerOpen, reactionExpanded]);

  useEffect(() => {
    viewTrackedRef.current = false;
    impressionTrackedRef.current = false;
  }, [actionPostId]);

  useEffect(() => {
    const target = articleRef.current;
    if (!target || ownsPost || !mongoIdPattern.test(String(actionPostId || ""))) return undefined;
    let impressionTimer = null;
    let visibleAt = 0;
    const topics = [normalized.context, normalized.location].filter(Boolean);
    const signal = (eventType, extra = {}) => analyticsService.trackRecommendationSignal({ creatorId: creator.id, entityId: actionPostId, entityType: "feed_post", eventType, position: Number(normalized.position || 0), topics, ...extra });

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (impressionTimer) window.clearTimeout(impressionTimer);
        impressionTimer = null;
        if (visibleAt) {
          const watchMs = Date.now() - visibleAt;
          visibleAt = 0;
          if (!target.querySelector("video")) void signal(watchMs < 2000 ? "FAST_SKIP" : "CONTENT_WATCH", { watchMs });
        }
        return;
      }
      if (!visibleAt) visibleAt = Date.now();
      if (!impressionTrackedRef.current && !impressionTimer) {
        impressionTimer = window.setTimeout(() => {
          impressionTrackedRef.current = true;
          impressionTimer = null;
          analyticsService.queueContentImpression({
            entityId: actionPostId,
            entityType: "feed_post",
            metadata: { creatorId: creator.id, placement: "home_feed", position: Number(normalized.position || 0), topics, visibleMs: 500, visibleThreshold: 0.55 },
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
    const video = target.querySelector("video");
    const watched = new Set();
    let completed = false;
    const onTime = () => watched.add(Math.floor(video.currentTime));
    const onEnded = () => { completed = true; void signal("CONTENT_COMPLETED", { completion: 1, durationMs: Math.round((video.duration || 0) * 1000), watchMs: watched.size * 1000 }); };
    const onPlay = () => { if (completed && video.currentTime < 1) { completed = false; void signal("CONTENT_REPLAY", { completion: 1, durationMs: Math.round((video.duration || 0) * 1000), watchMs: watched.size * 1000 }); } };
    video?.addEventListener("timeupdate", onTime);
    video?.addEventListener("ended", onEnded);
    video?.addEventListener("play", onPlay);
    return () => {
      if (impressionTimer) window.clearTimeout(impressionTimer);
      observer.disconnect();
      video?.removeEventListener("timeupdate", onTime);
      video?.removeEventListener("ended", onEnded);
      video?.removeEventListener("play", onPlay);
      if (watched.size && !completed) void signal(watched.size < 2 ? "FAST_SKIP" : "CONTENT_WATCH", { completion: video?.duration ? Math.min(1, watched.size / Math.ceil(video.duration)) : 0, durationMs: Math.round((video?.duration || 0) * 1000), watchMs: watched.size * 1000 });
    };
  }, [actionPostId, creator.id, normalized.context, normalized.location, normalized.position, ownsPost, viewMutation]);

  const syncSavedPost = (savedPost) => {
    const next = normalizeFeedPost(savedPost);
    setReaction(next.viewerReaction);
    setReactionBreakdown(next.reactionBreakdown || {});
    setComments(next.seededComments);
    setSaved(next.viewerSaved);
    setShared(next.viewerShared);
  };

  const requireDatabasePost = () => {
    if (mongoIdPattern.test(String(actionPostId || ""))) return true;
    showToast(__msg("system.FeedPost.eb517f4f8d"));
    return false;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      showToast(__msg("fanWeb.postLinkCopied"));
    } catch {
      showToast(__msg("fanWeb.couldNotCopyTheLinkTryAgainFromYour"));
    }
  };

  const toggleShare = () => {
    if (shareMutation.isPending) return;
    if (!requireDatabasePost()) return;
    shareMutation.mutate(
      { postId: actionPostId },
      {
        onError: (error) => showToast(error?.response?.data?.message || (shared ? __msg("system.copy.ad2e8a42b6df") : __msg("system.copy.7287585f3a5a"))),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          queryClient.setQueryData(["wall-note", actionPostId], savedPost);
          showToast(shared ? __msg("fanWeb.removedFromYourProfile") : __msg("social.repostedToYourProfile"));
        },
      }
    );
  };

  const submitShare = () => {
    if (shareMutation.isPending || !requireDatabasePost()) return;
    shareMutation.mutate(
      { caption: shareCaption.trim(), postId: actionPostId },
      {
        onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.7287585f3a5a")),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          setShareOpen(false);
          setShareCaption("");
          showToast(__msg("social.repostedToYourProfile"));
        },
      },
    );
  };

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      showToast(__msg("fanWeb.writeOneLineFirst"));
      return;
    }
    if (commentMutation.isPending) return;
    if (!requireDatabasePost()) return;

    commentMutation.mutate(
      { postId: actionPostId, text: trimmed, parentCommentId: replyTarget?.id || null },
      {
        onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.7da534f3c979")),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          setCommentText("");
          setReplyTarget(null);
          showToast(__msg("fanWeb.commentPosted"));
        },
      }
    );
  };

  const submitVoiceComment = (recording) => {
    if (commentMutation.isPending || !requireDatabasePost()) return;
    commentMutation.mutate(
      { postId: actionPostId, text: recording.text || "Voice comment", voice: recording, parentCommentId: replyTarget?.id || null },
      {
        onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.c0f41d1f6549")),
        onSuccess: (savedPost) => {
          syncSavedPost(savedPost);
          setVoiceCommentOpen(false);
          setReplyTarget(null);
          showToast(__msg("fanWeb.voiceCommentPosted"));
        },
      },
    );
  };

  const { choose: chooseExpandedReaction, selecting: selectingExpandedReaction } = useReactionSelection({
    enabled: reactionPickerOpen && reactionExpanded,
    busy: reactionMutation.isPending,
    onSelect: value => saveReaction(value),
    onClose: () => { setReactionPickerOpen(false); setReactionExpanded(false); },
  });

  const saveReaction = (nextReaction) => {
    if (!requireDatabasePost()) return;

    const previousReaction = reaction;
    const previousBreakdown = { ...reactionBreakdown };
    const nextBreakdown = { ...reactionBreakdown };
    if (previousReaction) {
      nextBreakdown[previousReaction] = Math.max(0, (Number(nextBreakdown[previousReaction]) || 0) - 1);
      if (!nextBreakdown[previousReaction]) delete nextBreakdown[previousReaction];
    }
    if (nextReaction) nextBreakdown[nextReaction] = (Number(nextBreakdown[nextReaction]) || 0) + 1;
    if (nextReaction && nextReaction !== reaction) popReactionCapsule(reactionAnchorRef.current);
    setReaction(nextReaction || null);
    setReactionBreakdown(nextBreakdown);

    reactionMutation.mutate(
      { postId: actionPostId, reaction: nextReaction },
      {
        onError: (error) => {
          setReaction(previousReaction);
          setReactionBreakdown(previousBreakdown);
          showToast(error?.response?.data?.message || __msg("social.reactionCouldNotBeSaved"));
        },
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
      onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.973556fd7dbb")),
      onSuccess: (savedPost) => {
        const next = normalizeFeedPost(savedPost);
        setSaved(next.viewerSaved);
        showToast(next.viewerSaved ? __msg("system.copy.0b1c15edc891") : __msg("system.copy.d3784c484014"));
      },
    });
  };

  const hidePost = () => {
    if (hideMutation.isPending) return;
    if (!requireDatabasePost()) return;

    hideMutation.mutate(
      { postId: actionPostId, reason: "NOT_USEFUL" },
      {
        onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.466de5f1c1fc")),
        onSuccess: () => {
          void analyticsService.trackRecommendationSignal({ creatorId: creator.id, entityId: actionPostId, entityType: "feed_post", eventType: "NOT_INTERESTED", reason: "not_useful", topics: [normalized.context, normalized.location].filter(Boolean) });
          showToast(__msg("fanWeb.thanksWeWillTuneYourFeed"));
        },
      }
    );
  };

  const blockAuthor = () => {
    if (blockMutation.isPending) return;
    if (!requireDatabasePost()) return;

    blockMutation.mutate(actionPostId, {
      onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.21a85920d87a")),
      onSuccess: () => showToast(__msg("fanWeb.isBlockedTheyWillNotKnow", { value0: creator.name.split(" ")[0] })),
    });
  };

  const reportPost = (reason) => {
    if (reportMutation.isPending) return;
    if (!requireDatabasePost()) return;

    reportMutation.mutate(
      { postId: actionPostId, payload: { reason } },
      {
        onError: (error) => showToast(error?.response?.data?.message || __msg("social.reportCouldNotBeSubmitted")),
        onSuccess: () => {
          setReportDone(true);
          showToast(__msg("fanWeb.reportSubmitted"));
        },
      }
    );
  };

  const closeCommentReport = () => {
    if (commentReportBusy) return;
    setCommentReport(null);
    setCommentReportStage("options");
  };

  const reportComment = async (reason) => {
    if (!commentReport?.id || commentReportBusy || !requireDatabasePost()) return;
    setCommentReportBusy(true);
    try {
      await postService.reportComment(actionPostId, commentReport.id, {
        reason,
      });
      setCommentReportStage("done");
      showToast(__msg("system.FeedPost.61ff742230"));
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("fanWeb.commentReportCouldNotBeSubmitted"));
    } finally {
      setCommentReportBusy(false);
    }
  };

  const deleteComment = async () => {
    if (!commentReport?.id || commentReportBusy || !requireDatabasePost()) return;
    setCommentReportBusy(true);
    try {
      const savedPost = await commentDeleteMutation.mutateAsync({ postId: actionPostId, commentId: commentReport.id });
      syncSavedPost(savedPost);
      setCommentReport(null);
      setCommentReportStage("options");
      if (replyTarget?.id === commentReport.id) setReplyTarget(null);
      showToast("Comment deleted.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Comment could not be deleted.");
    } finally {
      setCommentReportBusy(false);
    }
  };

  const confirmDeleteNote = async () => {
    const accepted = await confirmDialog({
      title: __msg("fanWeb.deleteNote"),
      message: __msg("fanWeb.thisRemovesThePostFromHomeAndYourPublic"),
      confirmLabel: __msg("fanWeb.deleteNote"),
    });
    if (!accepted || deleteMutation.isPending) return;
    deleteMutation.mutate(actionPostId, {
      onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.c1027a54c0b9")),
      onSuccess: () => {
        showToast(__msg("system.FeedPost.cd7e7590cd"));
        navigate("/wall", { replace: true });
      },
    });
  };

  const moreAction = (action) => {
    if (action === "resolution") {
      if (moreBusy || resolutionMutation.isPending || !ownsPost || !normalized.canResolve || !requireDatabasePost()) return;
      setMoreBusy("resolution");
      resolutionMutation.mutate({ postId: actionPostId, solved: !resolvedAt }, {
        onSuccess: (savedPost) => {
          setResolvedAt(savedPost.resolvedAt || null);
          setMoreOpen(false);
          if (savedPost.resolvedAt && (savedPost.postType === "Buy & Sell" || (!savedPost.postType && ["Buy/Sell", "Shopping"].includes(savedPost.context)))) {
            queryClient.setQueryData(["wall-note", actionPostId], savedPost);
            navigate(`/wall?note=${encodeURIComponent(actionPostId)}`, { state: { scrollToWallFeed: true } });
          }
          showToast(savedPost.resolvedAt ? __msg("fanWeb.value0YourPostAndRepliesStayVisible", { value0: closeLabels.state }) : __msg("system.copy.f299214ce87b"));
        },
        onError: (error) => showToast(error?.response?.data?.message || __msg("system.copy.0d705e31e0f2")),
        onSettled: () => setMoreBusy(""),
      });
      return;
    }
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
      showToast(__msg("fanWeb.thanksWeWillShowYouMoreNotesLikeThis"));
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
          showToast(__msg("fanWeb.unfollowed", { value0: creator.name.split(" ")[0] }));
          setMoreOpen(false);
        })
        .catch((error) => showToast(error?.response?.data?.message || __msg("fanWeb.couldNotUnfollowThisAccount")))
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
          showToast(error?.response?.data?.message || __msg("system.copy.f52be8d8cbf4"));
        },
        onSuccess: () => {
          setMoreBusy("");
          setMoreOpen(false);
          showToast(__msg("system.FeedPost.17219f1010"));
          navigate("/wall", { replace: true });
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
      void confirmDeleteNote();
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
      <article className={`home-feed-post ${resolvedAt || normalized.isClosed ? "is-solved" : ""}`} ref={articleRef}>
        {normalized.sharedBy ? (
          <div className="home-feed-shared-by">
            <FiShare2 className="text-atseen-blue" />
            <span className="font-bold text-atseen-text">{normalized.sharedBy.name || `@${normalized.sharedBy.username}`}</span>
            <span>{__msg("fanWeb.sharedThis")} {relativeTime(normalized.feedCreatedAt)}</span>
          </div>
        ) : null}
        {normalized.shareCaption ? (
          <p className="mb-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{normalized.shareCaption}</p>
        ) : null}
        <div className={normalized.sharedBy ? "home-shared-post" : ""}>
        <div className="home-feed-post-head">
          <Link className="shrink-0" to={`/profile/${encodeURIComponent(creator.username)}`}>
            <FanAvatar name={creator.name} size="h-9 w-9" src={creator.avatar} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link className="home-feed-author" to={`/profile/${encodeURIComponent(creator.username)}`}>
              {headerName}
              {creator.verified ? <VerifiedBadge /> : null}
            </Link>
            <div className="home-feed-meta wall-note-meta"><WallPostTypeBadge closedLabel={resolvedAt ? closeLabels.state : normalized.isClosed ? normalized.closedReason === "ended" ? "Ended" : "Expired" : ""} rightNow={normalized.rightNow && !normalized.isClosed && !resolvedAt} postType={normalized.postType} context={normalized.context} /><span className="wall-note-age">&middot; {normalized.timestamp}</span>{normalized.location ? <span className="wall-note-place" title={normalized.location}>&middot; <FiMapPin aria-hidden="true" />{normalized.location.split(",")[0]}</span> : null}</div>
          </div>
          <span aria-label={__msg("fanWeb.views", { value0: formatCount(viewCount) })} className="home-feed-head-views" title={__msg("fanWeb.views_24be61")}>
            <WallPostViewEye /> <span>{formatCount(viewCount)}</span>
          </span>
          <button
            aria-label={__msg("fanWeb.moreActionsForSPost", { value0: creator.name })}
            className="rounded-full p-1.5 text-atseen-dim transition hover:bg-atseen-surface-2 hover:text-white"
            onClick={() => setMoreOpen((current) => profileMenu ? !current : true)}
            type="button"
          >
            <FiMoreHorizontal aria-hidden="true" />
          </button>
        </div>

        <WallTextContent postId={actionPostId} text={caption} />
        <ContentEntityList entities={normalized.attachedEntities} onNotice={showToast} />
        {normalized.result ? (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-atseen-success/25 bg-atseen-success/10 px-3 py-1.5 text-[11.5px] font-semibold text-atseen-success">
            <FiCheck aria-hidden="true" /> {normalized.result}
          </p>
        ) : null}
        {normalized.media?.length ? (
          <div className={`home-feed-media media-count-${Math.min(normalized.media.length, 4)} media-layout-${mediaLayout}`}>
            {normalized.media.map((mediaItem) => (
              <MediaItem item={mediaItem} postId={actionPostId} postText={caption} key={mediaItem.id || mediaItem.url} title={normalized.text.slice(0, 48) || __msg("fanWeb.homePost")} />
            ))}
          </div>
        ) : null}
        </div>

        {ownsPost && normalized.canBump && !normalized.isClosed && !resolvedAt ? <div className="wall-note-availability">
          <span><strong>{__msg("system.FeedPost.ead062ce71")}</strong><small>{__msg("system.FeedPost.301777fff4")} {normalized.availabilityAge} {__msg("profile.ago")}</small></span>
          <button className="wall-note-bump" disabled={bumpMutation.isPending || resolutionMutation.isPending} onClick={() => {
            if (!requireDatabasePost()) return;
            bumpMutation.mutate(actionPostId, {
              onSuccess: () => showToast(__msg("system.FeedPost.67773e32b8")),
              onError: error => showToast(error?.response?.data?.message || __msg("system.copy.5e9038a11032")),
            });
          }} type="button">{bumpMutation.isPending ? __msg("system.FeedPost.94fdea95ad") : __msg("system.FeedPost.1d22547907")}</button>
          <button disabled={bumpMutation.isPending || resolutionMutation.isPending} onClick={() => moreAction("resolution")} type="button">{__msg("activity.close")}</button>
        </div> : ownsPost && normalized.canResolve && !normalized.isClosed && !resolvedAt ? <button className="wall-note-solve" disabled={resolutionMutation.isPending} onClick={() => moreAction("resolution")} type="button"><FiCheck aria-hidden="true" />{closeLabels.action}</button> : null}
        <div className="home-feed-actions">
          {normalized.reactorPreviews.length ? <button className="wall-reactor-faces" aria-label={__msg("system.FeedPost.5833158617")} onClick={() => setReactionsSheetOpen(true)} type="button">{normalized.reactorPreviews.slice(0, 2).map(person => <FanAvatar key={person.id || person._id} name={person.name} size="h-5 w-5" src={person.avatar || person.avatarUrl} />)}</button> : null}
          <div className="relative">
            <button
              aria-label={selectedReaction ? __msg("fanWeb.changeReaction", { value0: selectedReaction.label }) : __msg("fanWeb.reactToPost")}
              className={`home-reaction-capsule ${selectedReaction ? "is-selected" : ""}`}
              disabled={reactionMutation.isPending}
              onClick={() => { if (!reactionHeldRef.current) openReactionPicker(); reactionHeldRef.current = false; }}
              onPointerDown={() => { reactionHeldRef.current = false; reactionHoldRef.current = window.setTimeout(() => { reactionHeldRef.current = true; setReactionsSheetOpen(true); }, 500); }}
              onPointerUp={() => window.clearTimeout(reactionHoldRef.current)}
              onPointerLeave={() => window.clearTimeout(reactionHoldRef.current)}
              onPointerCancel={() => window.clearTimeout(reactionHoldRef.current)}
              onContextMenu={(event) => { event.preventDefault(); setReactionsSheetOpen(true); }}
              ref={reactionAnchorRef}
              title={__msg("admin.react")}
              type="button"
            >
              <span className="home-reaction-samples" aria-hidden="true">{visibleReactionSamples}</span>
              <strong>{reactionCount ? formatCount(reactionCount) : "+"}</strong>

            </button>
          </div>
          <button aria-expanded={commentsOpen} aria-label={__msg("fanWeb.openComments")} className={`home-feed-action-button ${commentsOpen ? "is-selected" : ""}`} onClick={() => setCommentsOpen((current) => !current)} title={__msg("admin.comment")} type="button">
            <FiMessageCircle aria-hidden="true" /> <span>{commentCount}</span>{!ownsPost && !normalized.isClosed && !resolvedAt && replyIntent ? <strong className="wall-join-label">{replyIntent}</strong> : null}
          </button>
          {!ownsPost ? <button aria-label={shared ? __msg("fanWeb.removeRepost") : __msg("fanWeb.repost")} className={`home-feed-action-button ${shared ? "is-selected" : ""}`} disabled={shareMutation.isPending} onClick={toggleShare} title={__msg("fanWeb.repost")} type="button">
            <FiRepeat aria-hidden="true" />{normalized.shareCount > 0 ? <span>{formatCount(normalized.shareCount)}</span> : null}
          </button> : null}
          <button
            aria-label={saved ? __msg("fanWeb.removeSavedPost") : __msg("fanWeb.savePost")}
            className={`home-feed-action-button ml-auto ${saved ? "is-selected" : ""}`}
            disabled={saveMutation.isPending}
            onClick={toggleSave}
            title={saved ? __msg("fanWeb.unsave") : __msg("contentEntities.save_efc007")}
            type="button"
          >
            <FiBookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          </button>
          <button aria-label={__msg("fanWeb.sendPost")} className="home-feed-action-button" onClick={openSendSheet} title={__msg("fanWeb.send")} type="button">
            <FiSend aria-hidden="true" />{livePrivateShareCount > 0 ? <span className="wall-private-share-count">{formatCount(livePrivateShareCount)}</span> : null}
          </button>
        </div>

        {!commentsOpen && commentCount > 0 ? <button aria-expanded="false" className="wall-view-comments" onClick={() => { setAllComments(true); setCommentsOpen(true); }} type="button">{__msg("fanWeb.viewAll")} {commentCount} {__msg("fanWeb.comments")}</button> : null}
        {commentsOpen ? (
          <section aria-label={__msg("fanWeb.wallNoteComments")} className="seen-comments-panel wall-comments-panel">
            {!allComments && comments.length > 2 ? <button className="wall-view-comments" onClick={() => setAllComments(true)} type="button">{__msg("fanWeb.viewAll")} {commentCount} {__msg("fanWeb.comments")}</button> : null}
            <WallCommentList noteOwner={creator} comments={comments} allComments={allComments} options={postReactionOptions} userId={user?.id || user?._id} repostingId={repostingCommentId} reactingId={reactingCommentId} onRepost={toggleCommentRepost}
              onOpenOptions={(comment) => { setCommentReport(comment); setCommentReportStage("options"); }}
              onReply={(comment) => { setReplyTarget(comment); commentInputRef.current?.focus(); }}
              onReact={async (comment, value) => {
                if (reactingCommentId || !requireDatabasePost()) return;
                const previousComments = comments;
                const active = Boolean(value);
                setComments((current) => current.map((item) => item.id === comment.id ? { ...item, viewerReaction: active ? "love" : null, reactionCount: Math.max(0, Number(item.reactionCount || 0) + (active ? 1 : -1)) } : item));
                setReactingCommentId(comment.id);
                try { syncSavedPost(await commentReactionMutation.mutateAsync({ postId: actionPostId, commentId: comment.id, reaction: value })); }
                catch (error) { setComments(previousComments); showToast(error?.response?.data?.message || __msg("system.copy.1f1cb99a02e2")); }
                finally { setReactingCommentId(""); }
              }} />
            {replyTarget ? <div className="wall-reply-target" role="status">{__msg("creator.replyingTo")} <strong>{replyTarget.author?.name || __msg("discover.creator")}</strong><button aria-label={__msg("fan.cancelReply")} onClick={() => setReplyTarget(null)} type="button">&times;</button></div> : null}
            <form onSubmit={(event) => { event.preventDefault(); submitComment(); }}>
              <FanAvatar alt="" name={user?.displayName || user?.name || user?.username || "You"} size="h-6 w-6" src={user?.avatarUrl || user?.avatar} />
              <input ref={commentInputRef} aria-label={replyTarget ? __msg("system.FeedPost.ff43b5c585", { value0: replyTarget.author?.name || __msg("discover.creator") }) : __msg("fanWeb.addAWallNoteComment")} maxLength={500} onChange={(event) => setCommentText(event.target.value)} placeholder={replyTarget ? __msg("system.FeedPost.ff43b5c585", { value0: replyTarget.author?.name || __msg("discover.creator") }) : __msg("fanWeb.addAComment")} value={commentText} />
              <button aria-label={__msg("fanWeb.recordAVoiceComment")} className="seen-comment-mic" disabled={commentMutation.isPending} onClick={() => setVoiceCommentOpen(true)} type="button"><FiMic /></button>
              <button className="seen-comment-post" disabled={!commentText.trim() || commentMutation.isPending} type="submit">{__msg("fanWeb.post")}</button>
            </form>
          </section>
        ) : null}
      </article>

      {voiceCommentOpen ? <VoiceCommentRecorder busy={commentMutation.isPending} onClose={() => setVoiceCommentOpen(false)} onSubmit={submitVoiceComment} /> : null}

      {commentReport ? (
        <div className="seen-feed-options-layer" style={wallSheetPosition}>
          <button aria-label={__msg("system.FeedPost.f5508161f2")} className="seen-feed-options-scrim" disabled={commentReportBusy} onClick={closeCommentReport} type="button" />
          <section aria-label={__msg("system.FeedPost.dc57782ca4")} aria-modal="true" className="seen-feed-options-sheet" role="dialog">
            <span aria-hidden="true" className="seen-feed-options-handle" />
            <h2>{commentReportStage === "options" ? __msg("admin.comment") : commentReportStage === "done" ? __msg("fanWeb.reportReceived") : __msg("system.FeedPost.018f970ebb")}</h2>
            {commentReportStage === "options" ? (
              <div className="seen-feed-options-list">
                {String(commentReport.author?.id || commentReport.author?._id || "") === String(user?.id || user?._id || "")
                  ? <button className="is-danger" disabled={commentReportBusy} onClick={deleteComment} type="button"><FiTrash2 aria-hidden="true" /><span><b>{commentReportBusy ? "Deleting…" : "Delete comment"}</b><small>This removes the comment and its replies.</small></span></button>
                  : <button className="is-danger" onClick={() => setCommentReportStage("reasons")} type="button"><FiFlag aria-hidden="true" /><span><b>{__msg("discover.report")}</b></span></button>}
              </div>
            ) : commentReportStage === "done" ? (
              <div className="wall-comment-report-done">
                <p>{__msg("system.FeedPost.5b74a3346f")}</p>
                <button onClick={closeCommentReport} type="button">{__msg("comments.done")}</button>
              </div>
            ) : (
              <div className="seen-feed-options-list wall-comment-report-reasons">
                {commentReportReasons.map(([label, reason]) => <button disabled={commentReportBusy} key={reason} onClick={() => reportComment(reason)} type="button"><span><b>{label}</b></span></button>)}
              </div>
            )}
          </section>
        </div>
      ) : null}

      <ShareSheet isOpen={sendOpen} onClose={() => setSendOpen(false)} payload={sharePayload} />

      {reactionsSheetOpen ? (
        <WallReactionsSheet
          currentUserId={user?.id || user?._id}
          onAddYours={() => {
            setReactionsSheetOpen(false);
            openReactionPicker();
          }}
          onClose={() => setReactionsSheetOpen(false)}
          postId={actionPostId}
          style={wallSheetPosition}
        />
      ) : null}

      {reactionPickerOpen && !reactionExpanded ? <WallReactionTray anchorRef={reactionAnchorRef} busy={reactionMutation.isPending} onClose={() => setReactionPickerOpen(false)} onMore={() => setReactionExpanded(true)} onSelect={saveReaction} options={postReactionOptions} quickKeys={["see_you", "love", "fire", "teary", "laugh", "like"]} selected={reaction} useEyeIcon={false} /> : null}
      {reactionPickerOpen && reactionExpanded ? (
        <div className="seen-reactions-layer" style={wallSheetPosition}>
          <button aria-label={__msg("fanWeb.closeReactions")} className="seen-reactions-scrim" onClick={() => setReactionPickerOpen(false)} type="button" />
          <section aria-label={__msg("fanWeb.chooseAReactionForSPost", { value0: creator.name })} aria-modal="true" className="seen-reaction-sheet" role="dialog">
            <span aria-hidden="true" className="seen-reaction-handle" />
            <div aria-label={__msg("fanWeb.chooseAWallNoteReaction")} className="seen-reaction-grid" role="group">
              {postReactionOptions.map((item) => {
                const count = reactionCountsByKey[item.key] || 0;
                const selected = reaction === item.key;
                return (
                  <button
                    aria-label={__msg("fanWeb.reaction_bfb553", { value0: selected ? __msg("profile.remove") : __msg("fanWeb.send"), value1: item.label })}
                    aria-pressed={selected}
                    className={selected ? "is-selected seen-reaction-option" : "seen-reaction-option"}
                    disabled={reactionMutation.isPending || selectingExpandedReaction}
                    key={item.key}
                    onClick={(event) => chooseExpandedReaction(event, selected ? "" : item.key)}
                    type="button"
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <small>{count || ""}</small>
                  </button>
                );
              })}
            </div>
            <p>{__msg("fanWeb.oneReactionMakeItYours")}</p>
          </section>
        </div>
      ) : null}

      <FanModal
        isOpen={shareOpen}
        onClose={() => {
          setShareOpen(false);
          setShareCaption("");
        }}
        title={__msg("fanWeb.shareToProfile")}
      >
        <p className="text-sm leading-6 text-atseen-muted">{__msg("fanWeb.addYourOwnNoteBeforeThisAppearsOnYour")}</p>
        <label className="mt-4 block text-xs font-bold text-atseen-muted">{__msg("fanWeb.caption")}<span className="font-normal">{__msg("admin.optional")}</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-atseen-line bg-atseen-bg p-3 text-sm text-white outline-none focus:border-atseen-blue"
            maxLength={500}
            onChange={(event) => setShareCaption(event.target.value)}
            placeholder={__msg("fanWeb.saySomethingAboutThisPost")}
            value={shareCaption}
          />
        </label>
        <div className="mt-4 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg">
          <div className="flex items-center gap-3 p-3">
            <FanAvatar name={creator.name} size="h-9 w-9" src={creator.avatar} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-xs font-bold">{creator.name}{creator.verified ? <VerifiedBadge /> : null}</p>
              <p className="text-[10px] text-atseen-muted">@{creator.username} {__msg("fanWeb.originalPost")}</p>
            </div>
          </div>
          <div className="border-t border-atseen-line p-3">
            <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-white/90">{normalized.text}</p>
            {normalized.media?.[0]?.url ? <img alt={__msg("fanWeb.postPreview")} className="mt-3 max-h-52 w-full rounded-xl object-cover" src={normalized.media[0].url} /> : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="rounded-xl border border-atseen-blue/40 px-4 py-2 text-sm font-bold text-atseen-blue" onClick={() => navigate(`/messages?share=${encodeURIComponent(`${window.location.origin}/posts/${actionPostId}`)}`)} type="button">{__msg("fanWeb.sendInMessage")}</button>
          <button className="rounded-xl border border-atseen-line px-4 py-2 text-sm font-bold text-atseen-text" onClick={copyLink} type="button">{__msg("discover.copyLink")}</button>
          <button
            className="rounded-xl border border-atseen-line px-4 py-2 text-sm font-bold text-atseen-text"
            onClick={() => {
              setShareOpen(false);
              setShareCaption("");
            }}
            type="button"
          >{__msg("admin.cancel")}</button>
          <button className="rounded-xl bg-atseen-blue px-4 py-2 text-sm font-bold text-atseen-bg disabled:opacity-60" disabled={shareMutation.isPending} onClick={submitShare} type="button">
            {shareMutation.isPending ? __msg("fanWeb.sharing") : __msg("admin.share")}
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
        title={ownsPost ? __msg("fanWeb.yourNote") : __msg("fanWeb.thisNote")}
      >
        <span className="home-post-more-handle" aria-hidden="true" />
        <h2 className="home-post-more-title">{ownsPost ? __msg("fanWeb.yourNote") : __msg("fanWeb.thisNote")}</h2>
        <div className="home-post-more-list">
          {(ownsPost
            ? [
              ...(normalized.canResolve ? [{ key: "resolution", label: resolvedAt ? __msg("fanWeb.reopen") : closeLabels.action, subtitle: resolvedAt ? __msg("fanWeb.backAmongActivePosts") : __msg("fanWeb.staysVisibleWithItsCommentsAndReplies"), icon: FiCheck }] : []),
              { key: "story", label: __msg("activity.addToYourStory"), subtitle: __msg("system.FeedPost.1acf81ee86"), icon: FiPlusCircle },
              { key: "repost", label: shared ? __msg("fan.removeFromProfile") : __msg("fanWeb.repostToMyProfile"), subtitle: shared ? __msg("fanWeb.takeItOffYourShowcase") : __msg("fanWeb.yourProfileYourListAddAsManyAsYou"), icon: FiRepeat },
              { key: "share", label: __msg("admin.share"), icon: FiSend },
              { key: "archive", label: __msg("fanWeb.archive"), subtitle: __msg("system.FeedPost.286f4ff649"), icon: FiArchive },
              { key: "delete", label: __msg("fanWeb.deleteNote"), icon: FiTrash2, danger: true },
            ]
            : [
              { key: "share", label: __msg("admin.share"), icon: FiSend },
              { key: "show-more", label: __msg("fanWeb.showMoreLikeThis"), subtitle: __msg("system.FeedPost.365aacfae4"), icon: ShowMoreEyeIcon },
              { key: "hide", label: __msg("fanWeb.hideThisNote"), icon: FiEyeOff },
              { key: "unfollow", label: __msg("social.unfollow", { value0: creator.name.split(" ")[0] }), icon: FiUserMinus },
              { key: "report-spam", label: __msg("fanWeb.reportSpam"), subtitle: __msg("fanWeb.spamMisleadingLinksOrRepeatedPromotions"), icon: FiSlash, danger: true },
              { key: "report", label: __msg("discover.report"), icon: FiFlag },
              { key: "block", label: __msg("social.block", { value0: creator.name.split(" ")[0] }), icon: FiSlash, danger: true },
            ]).map(({ danger, icon: Icon, key, label, subtitle }) => (
            <button
              className={danger || key === "delete" ? "is-danger" : ""}
              disabled={Boolean(moreBusy)}
              data-action={key}
              key={key}
              onClick={() => moreAction(key)}
              type="button"
            >
              <span className="home-post-more-icon"><Icon aria-hidden="true" /></span>
              <span className="home-post-more-copy"><strong>{moreBusy === key ? __msg("fanWeb.pleaseWait") : label}</strong>{subtitle ? <small>{subtitle}</small> : null}</span>
            </button>
          ))}
        </div>
      </FanModal>

      <StoryCreator
        initialContent={sharePayload.storyDraft}
        isOpen={storyCreatorOpen}
        onClose={() => setStoryCreatorOpen(false)}
        onPublished={() => {
          setStoryCreatorOpen(false);
          showToast(__msg("fanWeb.noteAddedToYourStory"));
        }}
      />

      <FeedPostComposer currentUser={creator} initialPost={{ ...normalized, id: actionPostId }} isOpen={editOpen} mode="edit" onClose={() => setEditOpen(false)} />

      <FanModal isOpen={reportOpen} onClose={() => setReportOpen(false)} title={reportDone ? __msg("fanWeb.reportReceived") : __msg("fanWeb.reportPost")}>
        {reportDone ? (
          <div className="text-center">
            <p className="text-sm leading-6 text-atseen-muted">{__msg("fanWeb.ourTeamReviewsEveryReportYouWillNotBe")}</p>
            <button
              className="mt-5 rounded-xl border border-atseen-line px-5 py-3 text-sm font-bold text-atseen-text"
              onClick={() => {
                setReportOpen(false);
                setReportDone(false);
              }}
              type="button"
            >{__msg("comments.done")}</button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-atseen-muted">{__msg("fanWeb.whyAreYouReportingThis")}</p>
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
