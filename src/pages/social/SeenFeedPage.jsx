import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBookmark, FiEye, FiEyeOff, FiFlag, FiMessageCircle, FiMoreHorizontal, FiPlus, FiRepeat, FiSearch, FiSend, FiSlash } from "react-icons/fi";
import FanCreateSheet from "../../components/fanWeb/FanCreateSheet";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import ShareSheet from "../../components/share/ShareSheet";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import StoryCreator from "../../components/stories/StoryCreator";
import { publicationService } from "../../services/publicationService";
import { resolveMediaUrl } from "../../utils/media";
import { canCreateFeedPost } from "../../utils/postPermissions";
import { canCreateStory } from "../../utils/storyPermissions";
import { useAuth } from "../../hooks/useAuth";
import { useSocialCapabilities } from "../../hooks/useSocialCapabilities";

const seenReactionOptions = [
  { key: "LIKE", label: "Support", icon: "\uD83E\uDD1D" },
  { key: "LOVE", label: "Love", icon: "\u2764\uFE0F" },
  { key: "FIRE", label: "Fire", icon: "\uD83D\uDD25" },
  { key: "CLAP", label: "Clap", icon: "\uD83D\uDC4F" },
  { key: "LAUGH", label: "Laugh", icon: "\uD83D\uDE02" },
  { key: "SEE_YOU", label: "I see you", icon: "\uD83D\uDC41\uFE0F" },
  { key: "SAD", label: "Feel you", icon: "\uD83E\uDD72" },
  { key: "PHONE", label: "Call me", icon: "\uD83D\uDCF1" },
  { key: "STRONG", label: "Strong", icon: "\uD83D\uDCAA" },
  { key: "PRAY", label: "Respect", icon: "\uD83D\uDE4F" },
];

const reactionLabel = Object.fromEntries(seenReactionOptions.map((item) => [item.key, item.icon]));
reactionLabel.INSIGHTFUL = "\uD83D\uDD25";

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

function normalizeSeen(raw = {}) {
  const media = raw.coverMedia || {};
  const creator = raw.creator || {};
  return {
    id: String(raw.id || raw._id),
    title: raw.title || "Untitled Seen",
    description: raw.description || raw.summary || "",
    createdAt: raw.publishedAt || raw.createdAt || "",
    media: {
      type: String(media.mediaType || media.resourceType || "IMAGE").toLowerCase().includes("video") ? "video" : "image",
      url: resolveMediaUrl(media.secureUrl || media.url || ""),
      durationSeconds: media.duration ? Math.round(Number(media.duration)) : 0,
    },
    chapters: (raw.chapters || []).map((chapter, index) => ({
      id: chapter.stableChapterId || chapter.id || `${raw.id}-${index}`,
      title: chapter.title || `Chapter ${index + 1}`,
    })),
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
    <div className="seen-proto-skeleton-media" />
    <div className="seen-proto-skeleton-lines"><span /><span /><em /></div>
  </div>;
}

function SeenHeader({ activeTab, onTabChange, onCreate, onSearch }) {
  return <header className="seen-proto-header">
    <nav aria-label="Seen feed tabs" className="seen-proto-tabs">
      <button className={activeTab === "seen" ? "is-active" : ""} onClick={() => onTabChange("seen")} type="button"><FiEye aria-hidden="true" />Seen</button>
      <button className={activeTab === "friends" ? "is-active" : ""} onClick={() => onTabChange("friends")} type="button">Friends</button>
    </nav>
    <div className="seen-proto-header-actions">
      <button aria-label="Create a Seen" onClick={onCreate} type="button"><FiPlus /></button>
      <button aria-label="Search" onClick={onSearch} type="button"><FiSearch /></button>
    </div>
  </header>;
}

function CreatorHeader({ creator, onMenuToggle, menuOpen }) {
  const profileTo = creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/profile";
  return <div className="seen-item-creator">
    <Link aria-label={`Open ${creator.displayName} profile`} className={`seen-avatar-ring ${creator.hasUnseenStory ? "has-story" : ""}`} to={profileTo}>
      <FanAvatar alt="" name={creator.displayName} size="h-[31px] w-[31px]" src={creator.avatarUrl} />
    </Link>
    <Link className="seen-creator-copy" to={profileTo}>
      <strong>{creator.displayName}{creator.verified ? <VerifiedBadge className="seen-verified" /> : null}</strong>
      <span>{creator.location || creator.status || (creator.username ? `@${creator.username}` : "At seen")}</span>
    </Link>
    <button aria-expanded={menuOpen} aria-label="Open Seen options" className="seen-more-button" onClick={onMenuToggle} type="button"><FiMoreHorizontal /></button>
  </div>;
}

function SeenOptionsSheet({ creatorName, isOpen, itemTitle, onBlock, onClose, onHide, onMute, onReport, onSave, onShare, pending, saved }) {
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
    { icon: FiEyeOff, label: "Not interested", onClick: onHide },
    { icon: FiEyeOff, label: `Mute ${firstName}`, onClick: onMute },
    { icon: FiFlag, label: "Report", onClick: onReport },
    { danger: true, icon: FiSlash, label: `Block ${firstName}`, onClick: onBlock },
  ];

  return <div className="seen-feed-options-layer">
    <button aria-label="Close Seen options" className="seen-feed-options-scrim" onClick={onClose} type="button" />
    <section aria-label={`Options for ${itemTitle}`} aria-modal="true" className="seen-feed-options-sheet" role="dialog">
      <span className="seen-feed-options-handle" aria-hidden="true" />
      <h2>{itemTitle}</h2>
      <div className="seen-feed-options-list">
        {actions.map(({ danger, icon: Icon, label, onClick }) => (
          <button className={danger ? "is-danger" : ""} disabled={pending} key={label} onClick={onClick} type="button">
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  </div>;
}

function SeenMedia({ item, target }) {
  const chapterCount = item.chapters.length;
  return <Link className="seen-media" to={target}>
    {item.media.url ? <img alt={`${item.title} cover`} loading="lazy" src={item.media.url} /> : <span className="seen-media-fallback">@seen</span>}
    <span className="seen-media-shade" aria-hidden="true" />
    {item.media.type === "video" && item.media.durationSeconds ? <span className="seen-video-pill">▶ {formatDuration(item.media.durationSeconds)}</span> : null}
    <span className="seen-media-copy">
      <strong>{item.title}</strong>
      {chapterCount > 1 ? <small>{chapterCount} chapters</small> : null}
    </span>
  </Link>;
}

function ChapterPreview({ chapter, target }) {
  if (!chapter) return null;
  return <Link className="seen-chapter-preview" to={target}>
    <span>01</span>
    <strong>{chapter.title}</strong>
    <em>Open ›</em>
  </Link>;
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
  const top = item.engagement.topReactions?.length ? item.engagement.topReactions : ["LIKE", "LOVE", "FIRE"];
  return top.slice(0, 3).map((key) => reactionLabel[key] || reactionLabel.INSIGHTFUL).join("");
}

function ReactionPicker({ item, onClose, onSelect, pending }) {
  const selectedReaction = item.viewerState.reaction;
  const total = item.engagement.reactions;
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div aria-label={`Reactions for ${item.title}`} aria-modal="true" className="seen-reaction-sheet" role="dialog">
    <div aria-hidden="true" className="seen-reaction-handle" />
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
    <p>{total ? `${formatCount(total)} reaction${total === 1 ? "" : "s"} \u2014 make it yours` : "One reaction \u2014 make it yours"}</p>
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
      <span className="seen-view-count"><FiEye /><b>{formatCount(item.engagement.views)}</b></span>
    </div>
    <div className="seen-engagement-right">
      <button aria-label={selected.saved ? "Remove from Saved" : "Save Seen"} className={selected.saved ? "is-selected" : ""} disabled={pending} onClick={onSave} type="button"><FiBookmark fill={selected.saved ? "currentColor" : "none"} /></button>
      <button aria-label="Share Seen link" onClick={onCopyLink} type="button"><FiSend /></button>
    </div>
  </div>;
}

function SeenFeedItem({ item: rawItem, onFeedRemove, onFeedRemoveByCreator, onFeedUpdate }) {
  const item = normalizeSeen(rawItem);
  const target = `/seen/${encodeURIComponent(item.id)}`;
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeLink, setNoticeLink] = useState("");
  const engagementQuery = useQuery({
    enabled: commentsOpen,
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
    onSuccess: () => setReactionPickerOpen(false),
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
    mutationFn: () => publicationService.reportSeen(item.id, { reason: "OTHER", label: "Report" }),
    onSuccess: () => {
      setMenuOpen(false);
      setNotice("Report received.");
    },
    onError: (error) => setNotice(actionError(error)),
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
  const copyLink = async () => {
    setMenuOpen(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url: shareUrl });
        return;
      } catch {
        // Fall through to clipboard when native share is cancelled or unavailable.
      }
    }
    await navigator.clipboard?.writeText(shareUrl);
    setNotice("Seen link copied.");
  };
  const submitComment = (event) => {
    event.preventDefault();
    const text = comment.trim();
    if (text) commentMutation.mutate(text);
  };
  const selectReaction = (reaction) => {
    if (reactionMutation.isPending) return;
    reactionMutation.mutate(reaction);
  };
  const menuPending = saveMutation.isPending || repostMutation.isPending || hideMutation.isPending || muteMutation.isPending || blockMutation.isPending || reportMutation.isPending;
  const pending = reactionMutation.isPending || repostMutation.isPending || saveMutation.isPending || commentMutation.isPending || hideMutation.isPending || muteMutation.isPending || blockMutation.isPending || reportMutation.isPending;

  return <article className={reactionPickerOpen ? "has-reaction-picker seen-feed-item" : "seen-feed-item"}>
    {reactionPickerOpen ? <button aria-label="Close reactions" className="seen-reaction-scrim" onClick={() => setReactionPickerOpen(false)} type="button" /> : null}
    <div className="seen-item-menu-wrap">
      <CreatorHeader creator={item.creator} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((value) => !value)} />
      <SeenOptionsSheet
        creatorName={item.creator.displayName}
        isOpen={menuOpen}
        itemTitle={item.title}
        onBlock={() => blockMutation.mutate()}
        onClose={() => setMenuOpen(false)}
        onHide={() => hideMutation.mutate()}
        onMute={() => muteMutation.mutate()}
        onReport={() => reportMutation.mutate()}
        onSave={() => {
          setMenuOpen(false);
          saveMutation.mutate();
        }}
        onShare={() => {
          setMenuOpen(false);
          setShareSheetOpen(true);
        }}
        pending={menuPending}
        saved={item.viewerState.saved}
      />
    </div>
    <ShareSheet isOpen={shareSheetOpen} onClose={() => setShareSheetOpen(false)} payload={sharePayload} variant="seen" />
    <SeenMedia item={item} target={target} />
    <div className="seen-feed-copy">
      {item.description ? <p className="seen-description">{item.description}</p> : null}
      <ChapterPreview chapter={item.chapters[0]} target={target} />
      <PreviewComment comment={item.previewComment} />
      <EngagementBar commentsOpen={commentsOpen} item={item} onCommentToggle={() => setCommentsOpen((value) => !value)} onCopyLink={copyLink} onReactOpen={() => { setMenuOpen(false); setReactionPickerOpen(true); }} onRepost={() => repostMutation.mutate()} onSave={() => saveMutation.mutate()} pending={pending} />
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
  const removeFeedItem = (id) => {
    queryClient.setQueryData(["seen-feed", tab], (current = []) => current.filter((entry) => String(entry.id) !== String(id)));
  };
  const removeFeedItemsByCreator = (creatorId) => {
    queryClient.setQueryData(["seen-feed", tab], (current = []) => current.filter((entry) => String(entry.creator?.id || entry.creator?._id || "") !== String(creatorId)));
  };

  return <section className="seen-prototype-page">
    <SeenHeader activeTab={tab} onCreate={openCreate} onSearch={() => navigate("/search?type=seens")} onTabChange={setTab} />
    <FanCreateSheet
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
      {items.map((item) => <SeenFeedItem item={item} key={item.id} onFeedRemove={removeFeedItem} onFeedRemoveByCreator={removeFeedItemsByCreator} onFeedUpdate={updateFeedItem} />)}
      <EndState onCreate={openCreate} />
    </div> : <EmptyState tab={tab} /> : null}
  </section>;
}
