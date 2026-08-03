import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBookmark, FiCheck, FiFlag, FiMessageCircle, FiMoreHorizontal, FiShare2, FiSmile } from "react-icons/fi";
import FeedPostComposer from "../../posts/FeedPostComposer";
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

const commentEmojiGroups = [
  { key: "recent", label: "Recent", emojis: ["😀", "😂", "🥰", "😍", "😎", "😭", "😮", "😅", "🙂", "🙃"] },
  { key: "gestures", label: "Gestures", emojis: ["👍", "❤️", "👏", "🙏", "🤝", "💪", "👌", "🙌", "✌️", "🤞"] },
  { key: "vibes", label: "Vibes", emojis: ["✨", "🔥", "💯", "🎉", "⭐", "🌙", "☀️", "💡", "🎶", "📌"] },
  { key: "food", label: "Food", emojis: ["☕", "🍕", "🍔", "🍰", "🍓", "🍉", "🍜", "🍟", "🥗", "🍿"] },
];

const mongoIdPattern = /^[a-f\d]{24}$/i;

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
    reactions: post.reactions || [],
    result: post.result || "",
    seededComments: comments,
    supportCount: Number(post.supportCount ?? post.handshakes ?? 0),
    shareCount: Number(post.shareCount ?? 0),
    text: post.text || "",
    timestamp: post.timestamp || relativeTime(post.createdAt || post.publishedAt),
    viewerReaction: post.viewerReaction || null,
    viewerSaved: Boolean(post.viewerSaved),
    viewerShared: Boolean(post.viewerShared),
  };
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
  const commentInputRef = useRef(null);
  const [reaction, setReaction] = useState(normalized.viewerReaction);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [saved, setSaved] = useState(normalized.viewerSaved);
  const [shared, setShared] = useState(normalized.viewerShared);
  const [comments, setComments] = useState(normalized.seededComments);
  const [commentText, setCommentText] = useState("");
  const [shareCaption, setShareCaption] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [activeEmojiGroupKey, setActiveEmojiGroupKey] = useState(commentEmojiGroups[0].key);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const ownsPost = normalized.isOwner || canManageFeedPost(user, normalized);
  const selectedReaction = reactions.find((item) => item.key === reaction);
  const reactionSummary = (normalized.reactions?.length
    ? normalized.reactions
    : normalized.supportCount > 0 ? [{ count: normalized.supportCount, reaction: "like" }] : [])
    .map((item) => ({
      count: Number(item.count) || 0,
      reaction: reactions.find((reactionItem) => reactionItem.key === item.reaction),
    }))
    .filter((item) => item.count > 0 && item.reaction);
  const reactionCount = reactionSummary.reduce((total, item) => total + item.count, 0);
  const activeEmojiGroup = commentEmojiGroups.find((group) => group.key === activeEmojiGroupKey) || commentEmojiGroups[0];
  const commentCount = Math.max(normalized.commentCount, comments.length);
  const actionPostId = normalized.originalPostId || normalized.id;
  const postUrl = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/posts/${actionPostId}`;
  }, [actionPostId]);

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
      toggleShare();
      setMoreOpen(false);
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

  return (
    <>
      <article className="border-b border-white/[0.05] py-[18px]">
        {normalized.sharedBy ? (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-atseen-muted">
            <FiShare2 className="text-atseen-blue" />
            <span className="font-bold text-atseen-text">{normalized.sharedBy.name || `@${normalized.sharedBy.username}`}</span>
            <span>shared this · {relativeTime(normalized.feedCreatedAt)}</span>
          </div>
        ) : null}
        {normalized.shareCaption ? (
          <p className="mb-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{normalized.shareCaption}</p>
        ) : null}
        <div className={normalized.sharedBy ? "rounded-2xl border border-atseen-line bg-atseen-surface/45 p-3" : ""}>
        <div className="flex items-center gap-2.5">
          <button className="shrink-0" onClick={() => showToast(`${creator.name}'s profile preview opens from Orbit.`)} type="button">
            <FanAvatar name={creator.name} size="h-[38px] w-[38px]" src={creator.avatar} />
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-[13.5px] font-bold text-atseen-text">
              {creator.name}
              {creator.verified ? <VerifiedBadge /> : null}
            </p>
            <p className="text-[10.5px] text-atseen-muted">{normalized.timestamp}</p>
          </div>
          {normalized.context || normalized.location ? (
            <span className="ml-auto whitespace-nowrap rounded-full border border-atseen-blue/20 bg-atseen-blue/10 px-2.5 py-1 text-[10px] font-bold text-atseen-blue">
              {[`${normalized.contextEmoji} ${normalized.context}`.trim(), normalized.location].filter(Boolean).join(" - ")}
            </span>
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

        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-7 text-white/90">{normalized.text}</p>
        {normalized.result ? (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-atseen-success/25 bg-atseen-success/10 px-3 py-1.5 text-[11.5px] font-semibold text-atseen-success">
            <FiCheck aria-hidden="true" /> {normalized.result}
          </p>
        ) : null}
        {normalized.media?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {normalized.media.map((image) => (
              <img alt="" className="h-[150px] w-[150px] rounded-[13px] object-cover sm:h-[160px] sm:w-[160px]" key={image.id || image.url} loading="lazy" src={image.url} />
            ))}
          </div>
        ) : null}
        </div>

        <div className="mt-3 flex items-center gap-5 text-[11.5px] font-semibold text-atseen-dim">
          <div
            className="relative"
            onMouseEnter={() => setReactionPickerOpen(true)}
            onMouseLeave={() => setReactionPickerOpen(false)}
          >
            {reactionPickerOpen ? (
              <div className="absolute bottom-0 left-0 z-20 pb-6">
                <div aria-hidden="true" className="absolute bottom-0 left-0 h-8 w-full" />
                <div className="flex gap-1 rounded-full border border-atseen-line bg-[#161B24] px-2 py-1.5 shadow-glow">
                {reactions.map((item) => (
                  <button
                    aria-label={item.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:-translate-y-1 hover:bg-white/10"
                    disabled={reactionMutation.isPending}
                    key={item.key}
                    onClick={() => {
                      saveReaction(reaction === item.key ? "" : item.key);
                      setReactionPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">{item.icon}</span>
                  </button>
                ))}
                </div>
              </div>
            ) : null}
            <button
              aria-label={selectedReaction ? `Reacted ${selectedReaction.label}` : "React to post"}
              className={`inline-flex items-center gap-2 transition hover:text-white [&>span:not(:first-child)]:hidden ${selectedReaction ? "text-atseen-blue" : ""}`}
              disabled={reactionMutation.isPending}
              onClick={() => saveReaction(reaction ? "" : "like")}
              onFocus={() => setReactionPickerOpen(true)}
              type="button"
            >
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
          <button className="inline-flex items-center gap-1.5 transition hover:text-white" onClick={() => setCommentsOpen(true)} type="button">
            <FiMessageCircle aria-hidden="true" /> <span>{commentCount}</span>
          </button>
          <button className={`inline-flex items-center gap-1.5 transition hover:text-white ${shared ? "text-atseen-blue" : ""}`} disabled={shareMutation.isPending} onClick={toggleShare} type="button">
            <FiShare2 aria-hidden="true" /> <span>{shared ? "Shared" : "Share"}{normalized.shareCount ? ` ${normalized.shareCount}` : ""}</span>
          </button>
          <button
            aria-label={saved ? "Remove saved post" : "Save post"}
            className={`ml-auto inline-flex items-center gap-1.5 transition hover:text-white ${saved ? "text-atseen-blue" : ""}`}
            disabled={saveMutation.isPending}
            onClick={toggleSave}
            type="button"
          >
            <FiBookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </article>

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
                {commentEmojiGroups.map((group) => (
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
        <p className="text-sm leading-6 text-atseen-muted">Add your own note before this appears on your profile and in the Wall feed.</p>
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
              ["share", shared ? "Remove from profile" : "Share to profile", FiShare2],
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
