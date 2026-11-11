import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBookmark, FiCheck, FiChevronRight, FiExternalLink, FiEye, FiFlag, FiHeart, FiList, FiLock, FiMapPin, FiMessageCircle, FiMic, FiPlay, FiPlus, FiRepeat, FiSend, FiSlash, FiSquare, FiX } from "react-icons/fi";
import ChapterVoicePlayer from "../../components/publication/ChapterVoicePlayer";
import PublicationCoverMedia from "../../components/publication/PublicationCoverMedia";
import CoinIcon from "../../components/branding/CoinIcon";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import ContentEntityList from "../../components/contentEntities/ContentEntityList";
import ShareSheet from "../../components/share/ShareSheet";
import VoiceCommentRecorder from "../../components/comments/VoiceCommentRecorder";
import VoiceMessageBubble from "../../components/messaging/VoiceMessageBubble";
import { useAuth } from "../../hooks/useAuth";
import { analyticsService } from "../../services/analyticsService";
import { publicationService } from "../../services/publicationService";
import { profileService } from "../../services/profileService";
import { repostService } from "../../services/repostService";
import { resolveMediaUrl } from "../../utils/media";

const reactionEmoji = {
  LIKE: "\uD83E\uDD1D",
  LOVE: "\u2764\uFE0F",
  FIRE: "\uD83D\uDD25",
  CLAP: "\uD83D\uDC4F",
  LAUGH: "\uD83D\uDE02",
  SEE_YOU: "\uD83D\uDC41\uFE0F",
  SAD: "\uD83E\uDD72",
  PHONE: "\uD83D\uDCF1",
  STRONG: "\uD83D\uDCAA",
  PRAY: "\uD83D\uDE4F",
  INSIGHTFUL: "\uD83D\uDD25",
};

const DEFAULT_ENGAGEMENT = { reactionCount: 0, commentCount: 0, shareCount: 0, viewCount: 0, viewerReaction: null, viewerShared: false, viewerSaved: false, comments: [] };

function withOptimisticCommentHeart(engagement = {}, commentId, active) {
  const update = (comment) => String(comment.id) === String(commentId)
    ? { ...comment, viewerReaction: active ? "LOVE" : null, reactionCount: Math.max(0, Number(comment.reactionCount || 0) + (active ? 1 : -1)), reactionBreakdown: { ...(comment.reactionBreakdown || {}), LOVE: Math.max(0, Number(comment.reactionBreakdown?.LOVE || 0) + (active ? 1 : -1)) }, topReactions: active ? ["LOVE"] : comment.topReactions || [] }
    : { ...comment, replies: (comment.replies || []).map(update) };
  return { ...engagement, comments: (engagement.comments || []).map(update) };
}
const STAR = "\u2726";
const SEEN_REPORT_REASONS = [
  { get label() { return __msg("social.spam"); }, value: "SPAM" },
  { get label() { return __msg("fan.harassmentOrBullying"); }, value: "HARASSMENT" }, { get label() { return __msg("social.hate"); }, value: "HATE" },
  { get label() { return __msg("system.SeenReaderPage.be4acdd0d2"); }, value: "DEFAMATION" }, { get label() { return __msg("system.SeenReaderPage.415eeccf09"); }, value: "SEXUAL_CONTENT" },
  { get label() { return __msg("discover.violence"); }, value: "VIOLENCE" }, { get label() { return __msg("system.SeenReaderPage.bea5831470"); }, value: "SELF_HARM" },
  { get label() { return __msg("fan.scamOrFraud"); }, value: "SCAM" }, { get label() { return __msg("system.SeenReaderPage.0d9eff1da0"); }, value: "COPYRIGHT" },
  { get label() { return __msg("system.SeenReaderPage.a66546f650"); }, value: "IMPERSONATION" }, { get label() { return __msg("system.SeenReaderPage.4873074e0d"); }, value: "CHILD_SAFETY" },
  { get label() { return __msg("admin.other"); }, value: "OTHER" },
];

function formatCount(value = 0) {
  return new Intl.NumberFormat(__uiLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function actionError(error) {
  if (error.response?.status === 401) return __msg("social.logInToUseThisSeenAction");
  if (error.response?.status === 403) return __msg("social.thisSeenActionIsNotAvailableForYour");
  return error.response?.data?.message || __msg("social.unableToCompleteThisAction");
}

function mediaUrl(media) {
  return resolveMediaUrl(media?.secureUrl || media?.url || "");
}

function mediaType(media) {
  const value = String(media?.mediaType || media?.resourceType || media?.type || "").toLowerCase();
  return value.includes("video") ? "video" : "image";
}

function mediaDuration(media) {
  const value = Number(media?.durationSeconds ?? media?.duration);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function blockKey(block) {
  return block?.id || `${block?.type || "block"}-${block?.order || 0}-${block?.text || block?.url || ""}`;
}


function creatorName(creator = {}) {
  return creator.name || creator.displayName || creator.username || __msg("discover.creator");
}

function creatorFirstName(creator = {}) {
  return creatorName(creator).split(" ")[0] || __msg("discover.creator");
}

function SeenEngagementBar({ engagement, isOwn = false, mutations, onCommentToggle, onCopyLink, saved, commentsOpen }) {
  __useUiLanguage();
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [reactionFilter, setReactionFilter] = useState("ALL");
  const reactionKeys = engagement.topReactions?.length
    ? engagement.topReactions
    : Object.entries(engagement.reactionBreakdown || {}).sort((left, right) => right[1] - left[1]).map(([key]) => key);
  const reactionIcons = reactionKeys.slice(0, 3).map((key) => reactionEmoji[key]).filter(Boolean);
  if (!reactionIcons.length) reactionIcons.push(reactionEmoji.LIKE);
  const reactors = engagement.reactors || [];
  const visibleReactors = reactionFilter === "ALL" ? reactors : reactors.filter((item) => item.reaction === reactionFilter);
  const filterKeys = Object.keys(engagement.reactionBreakdown || {}).sort((left, right) => (engagement.reactionBreakdown[right] || 0) - (engagement.reactionBreakdown[left] || 0));

  return <>
  <div className="seen-compact-engagement" aria-label={__msg("social.seenEngagement")}>
    <button aria-expanded={reactionsOpen} aria-label={__msg("social.openReactions")} className={`seen-compact-reactions ${engagement.viewerReaction ? "is-active" : ""}`} onClick={() => setReactionsOpen(true)} type="button"><span>{reactionIcons.map((icon, index) => <i key={`${icon}-${index}`}>{icon}</i>)}</span><small>{formatCount(engagement.reactionCount)}</small></button>
    <button aria-expanded={commentsOpen} aria-label={__msg("fanWeb.openComments")} className={commentsOpen ? "is-active" : ""} onClick={onCommentToggle} type="button"><FiMessageCircle /><small>{formatCount(engagement.commentCount)}</small></button>
    {!isOwn ? <button aria-label={engagement.viewerShared ? __msg("fanWeb.removeRepost") : __msg("social.repostSeen")} className={engagement.viewerShared ? "is-active" : ""} disabled={mutations.share.isPending} onClick={() => mutations.share.mutate()} type="button"><FiRepeat /><small>{formatCount(engagement.shareCount)}</small></button> : null}
    <span aria-label={__msg("fanWeb.views", { value0: formatCount(engagement.viewCount || 0) })}><FiEye /><small>{formatCount(engagement.viewCount || 0)}</small></span>
    <span className="seen-compact-spacer" />
    <button aria-label={saved ? __msg("publication.removeSeenFromSaved") : __msg("publication.saveSeen")} className={saved ? "is-active" : ""} disabled={mutations.save.isPending} onClick={() => mutations.save.mutate()} type="button"><FiBookmark fill={saved ? "currentColor" : "none"} /></button>
    <button aria-label={__msg("social.shareSeenLink")} onClick={onCopyLink} type="button"><FiSend /></button>
  </div>
  {reactionsOpen ? <div className="seen-reactions-layer">
    <button aria-label={__msg("fanWeb.closeReactions")} className="seen-reactions-scrim" onClick={() => setReactionsOpen(false)} type="button" />
    <section aria-label={__msg("social.seenReactions")} aria-modal="true" className="seen-reactions-sheet" role="dialog">
      <span className="seen-reactions-handle" />
      <header><h2>{__msg("fanWeb.reactions")} <small>{formatCount(engagement.reactionCount)}</small></h2><button aria-label={__msg("fanWeb.closeReactions")} onClick={() => setReactionsOpen(false)} type="button"><FiX /></button></header>
      <nav aria-label={__msg("profile.filterReactions")}>
        <button className={reactionFilter === "ALL" ? "is-active" : ""} onClick={() => setReactionFilter("ALL")} type="button">{__msg("fanWeb.all")}</button>
        {filterKeys.map((key) => <button className={reactionFilter === key ? "is-active" : ""} key={key} onClick={() => setReactionFilter(key)} type="button">{reactionEmoji[key] || reactionEmoji.LIKE} <small>{formatCount(engagement.reactionBreakdown[key])}</small></button>)}
      </nav>
      <div className="seen-reactions-list">
        {visibleReactors.map((item) => <article key={item.id}><FanAvatar className="seen-reaction-avatar" name={item.user?.name} size="h-[34px] w-[34px]" src={item.user?.avatar} /><span className="seen-reaction-person-copy"><strong>{item.user?.name || __msg("admin.user")}</strong>{item.user?.username ? <small>@{item.user.username}</small> : null}</span><i>{reactionEmoji[item.reaction] || reactionEmoji.LIKE}</i></article>)}
        {!visibleReactors.length ? <p>{__msg("social.noReactionsInThisGroupYet")}</p> : null}
      </div>
      <footer aria-label={__msg("social.chooseYourReaction")}>
        {Object.entries(reactionEmoji).filter(([key]) => key !== "INSIGHTFUL").map(([key, icon]) => <button aria-label={__msg("profile.reactWith", { value0: key.toLowerCase() })} className={engagement.viewerReaction === key ? "is-active" : ""} disabled={mutations.reaction.isPending} key={key} onClick={() => mutations.reaction.mutate(key)} type="button">{icon}</button>)}
      </footer>
    </section>
  </div> : null}
  </>;
}

function SeenCommentsSheet({ comment, currentUser, engagement, isOpen, isPending, onChange, onClose, onReact, onSubmit, onVoiceSubmit, reactionPending, title, voicePending }) {
  __useUiLanguage();
  const [activityParams] = useSearchParams();
  const focusedComment = activityParams.get("comment");
  useEffect(() => {
    if (!isOpen || !focusedComment) return undefined;
    const frame = requestAnimationFrame(() => {
      [...document.querySelectorAll("[data-seen-comment-id]")].find(node => node.dataset.seenCommentId === focusedComment)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, focusedComment, engagement.comments]);
  const [replyTo, setReplyTo] = useState(null);
  const [sheetPosition, setSheetPosition] = useState(null);
  const [voiceCommentOpen, setVoiceCommentOpen] = useState(false);
  const [reposted, setReposted] = useState({});
  const repostMutation = useMutation({
    mutationFn: (item) => repostService.toggle("cm", item.id, "SeenEngagement").then((response) => ({ item, ...response.data.data })),
    onSuccess: ({ item, reposted: value }) => setReposted((current) => ({ ...current, [item.id]: value })),
  });
  useEffect(() => {
    if (!isOpen) return undefined;
    const updatePosition = () => {
      const center = document.querySelector(".social-center-scroll");
      const rect = center?.getBoundingClientRect();
      const width = Math.min(440, rect?.width || window.innerWidth);
      setSheetPosition({ left: Math.max(0, (rect?.left || 0) + ((rect?.width || window.innerWidth) - width) / 2), width });
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    updatePosition();
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const comments = engagement.comments || [];
  const renderComment = (item, isReply = false) => {
    const reacted = Boolean(item.viewerReaction);
    const visibleReactionCount = reacted ? Math.max(1, Number(item.reactionCount || 0)) : Number(item.reactionCount || 0);
    return <article className={`${isReply ? "is-reply" : ""} ${String(item.id) === focusedComment ? "is-activity-focus" : ""}`} data-seen-comment-id={item.id} key={item.id}>
      <FanAvatar className="seen-comment-avatar" name={item.author?.name || "Fan"} size="h-6 w-6" src={item.author?.avatar} />
      <div className="seen-comment-copy">
        <p>{item.author?.username ? <Link to={`/profile/${item.author.username}`}>{item.author?.name || __msg("profile.fan")}</Link> : <strong>{item.author?.name || __msg("profile.fan")}</strong>}{item.text}</p>
        {item.audio ? <VoiceMessageBubble audio={item.audio} label={__msg("comments.voiceComment")} /> : null}
        <span><button aria-label={reacted ? "Remove heart" : `Heart ${item.author?.name || __msg("social.comment")}`} aria-pressed={reacted} className={reacted ? "is-selected seen-comment-reaction" : "seen-comment-reaction"} disabled={reactionPending} onClick={() => onReact(item, reacted ? "" : "LOVE")} type="button"><FiHeart fill={reacted ? "currentColor" : "none"} />{formatCount(visibleReactionCount)}</button>{isReply ? null : <button onClick={() => setReplyTo(item)} type="button">{__msg("fan.reply")}</button>}{String(item.author?.id || "") !== String(currentUser?.id || currentUser?._id || "") ? <button aria-label={__msg("system.WallCommentList.eab1801d81")} className={(reposted[item.id] ?? item.viewerReposted) ? "is-selected" : ""} disabled={repostMutation.isPending} onClick={() => repostMutation.mutate(item)} type="button"><FiRepeat /></button> : null}</span>
      </div>
    </article>;
  };

  return <div className="seen-comments-layer">
    <button aria-label={__msg("social.closeComments")} className="seen-comments-scrim" onClick={onClose} type="button" />
    <section aria-label={__msg("social.commentsOn", { value0: title })} aria-modal="true" className="seen-comments-sheet" role="dialog" style={sheetPosition || undefined}>
      <span aria-hidden="true" className="seen-comments-handle" />
      <header>
        <div><h2>{__msg("admin.comments")}</h2><small>{title}</small></div>
        <button aria-label={__msg("social.closeComments")} onClick={onClose} type="button"><FiX /></button>
      </header>
      <div className="seen-comments-list">
        {comments.map((item) => <div className="seen-comment-thread" key={item.id}>{renderComment(item)}{(item.replies || []).map((reply) => renderComment(reply, true))}</div>)}
        {!comments.length ? <p className="seen-comments-empty">{__msg("social.noCommentsYetStartTheConversation")}</p> : null}
      </div>
      {replyTo ? <div className="seen-sheet-replying"><span>{__msg("creator.replyingTo")} <b>{replyTo.author?.name || __msg("profile.fan")}</b></span><button aria-label={__msg("fan.cancelReply")} onClick={() => setReplyTo(null)} type="button"><FiX /></button></div> : null}
      <form onSubmit={(event) => { onSubmit(event, replyTo?.id || ""); if (comment.trim()) setReplyTo(null); }}>
        <FanAvatar className="seen-sheet-composer-avatar" name={currentUser?.displayName || currentUser?.name || currentUser?.username || "You"} size="h-6 w-6" src={currentUser?.avatarUrl || currentUser?.avatar} />
        <label><input aria-label={__msg("profile.addASeenComment")} autoFocus maxLength={500} onChange={onChange} placeholder={__msg("fanWeb.addAComment")} value={comment} /><button aria-label={__msg("fanWeb.recordAVoiceComment")} disabled={isPending || voicePending} onClick={() => setVoiceCommentOpen(true)} type="button"><FiMic /></button></label>
        <button disabled={!comment.trim() || isPending} type="submit">{__msg("fanWeb.post")}</button>
      </form>
      {voiceCommentOpen ? <VoiceCommentRecorder busy={voicePending} onClose={() => setVoiceCommentOpen(false)} onSubmit={(recording) => { onVoiceSubmit(recording, replyTo?.id || ""); setReplyTo(null); setVoiceCommentOpen(false); }} /> : null}
    </section>
  </div>;
}

function normalizeSeenDetail(publication, engagement) {
  const chapters = [...(publication?.chapters || [])].sort((left, right) => (left.order || 0) - (right.order || 0));
  const cover = publication?.coverMedia;
  const intro = publication?.introMedia;
  const introUrl = mediaUrl(intro);
  const coverUrl = mediaUrl(cover);
  const previewMap = new Map();

  chapters.forEach((chapter, chapterIndex) => {
    (chapter.blocks || []).forEach((block) => {
      if (!["IMAGE", "VIDEO"].includes(block.type)) return;
      const url = mediaUrl(block.media);
      if (!url || previewMap.has(url)) return;
      const type = mediaType(block.media);
      previewMap.set(url, {
        chapterIndex,
        id: block.id,
        thumbnailUrl: mediaUrl(block.media?.thumbnailUrl) || (type === "video" ? coverUrl : url),
        title: chapter.title,
        type,
        url,
      });
    });
  });

  [intro, cover].forEach((media, index) => {
    const url = mediaUrl(media);
    if (!url || previewMap.has(url)) return;
    const type = mediaType(media);
    previewMap.set(url, {
      chapterIndex: 0,
      id: `root-${index}`,
      thumbnailUrl: mediaUrl(media?.thumbnailUrl) || (type === "video" ? coverUrl : url),
      title: publication?.title || __msg("social.seenPreview"),
      type,
      url,
    });
  });

  const heroMedia = introUrl
    ? { ...intro, thumbnailUrl: mediaUrl(intro?.thumbnailUrl) || coverUrl, type: mediaType(intro), url: introUrl }
    : coverUrl
      ? { ...cover, type: mediaType(cover), url: coverUrl }
      : [...previewMap.values()][0] || null;

  return {
    id: publication?.id,
    access: publication?.access || "",
    title: publication?.title || __msg("profile.untitledSeen"),
    description: publication?.description || publication?.summary || "",
    creator: publication?.creator || {},
    attachedEntities: publication?.attachedEntities || [],
    heroMedia: heroMedia ? { ...heroMedia, durationSeconds: mediaDuration(heroMedia) } : null,
    previewMedia: [...previewMap.values()].slice(0, 3),
    mediaCandidates: seenProfileMediaCandidates(publication),
    chapters,
    metrics: {
      comments: Number(engagement?.commentCount) || 0,
      reactions: Number(engagement?.reactionCount) || 0,
      reposts: Number(engagement?.shareCount) || 0,
      views: Number(engagement?.viewCount) || 0,
    },
    viewerState: {
      saved: Boolean(engagement?.viewerSaved),
      shared: Boolean(engagement?.viewerShared),
      reaction: engagement?.viewerReaction || null,
    },
  };
}

function seenProfileMediaCandidates(publication) {
  const candidates = [];
  const seenAssets = new Set();
  const addCandidate = ({ label, media, sourceMediaId }) => {
    if (!media || !["IMAGE", "VIDEO"].includes(media.mediaType) || !media.assetId || seenAssets.has(media.assetId)) return;
    const type = media.mediaType === "VIDEO" || media.resourceType === "video" ? "video" : "image";
    const url = mediaUrl(media);
    if (!url) return;
    seenAssets.add(media.assetId);
    candidates.push({
      assetId: media.assetId,
      duration: mediaDuration(media),
      label,
      sourceMediaId,
      thumbnailUrl: resolveMediaUrl(media.thumbnailUrl || "") || url,
      type,
      url,
    });
  };
  addCandidate({ label: __msg("creator.cover"), media: publication?.coverMedia, sourceMediaId: "cover" });
  (publication?.chapters || []).forEach((chapter) => {
    (chapter.blocks || []).forEach((block) => {
      addCandidate({ label: chapter.title || __msg("social.seenMedia"), media: block.media, sourceMediaId: block.id });
    });
  });
  return candidates;
}

function MarkedText({ text, highlight, tone = "blue" }) {
  __useUiLanguage();
  if (!highlight || !text?.includes(highlight)) return text;
  const [before, after] = text.split(highlight);
  return <>
    {before}
    <mark className={`seen-reader-mark seen-reader-mark-${tone}`}>{highlight}</mark>
    {after}
  </>;
}

function imageOverlayText(block = {}) {
  return String(block.metadata?.overlayText || block.metadata?.caption || "").trim();
}

function imageOverlayColor(block = {}) {
  return block.metadata?.overlayColor || "#ffffff";
}

function imageOverlayFillColor(block = {}) {
  return block.metadata?.overlayFillColor || "";
}

function InlineMedia({ block, title }) {
  __useUiLanguage();
  const [failed, setFailed] = useState(false);
  const url = mediaUrl(block.media);
  if (!url || failed) return <div className="seen-reader-media-fallback">@seen</div>;
  if (["VIDEO", "video"].includes(block.type) || ["VIDEO", "video"].includes(block.media?.mediaType)) {
    return <PublicationCoverMedia alt={__msg("fanWeb.video", { value0: title })} className="seen-reader-media" controls media={block.media} preload="metadata" />;
  }
  if (["AUDIO", "VOICE"].includes(block.type) || ["AUDIO", "VOICE"].includes(block.media?.mediaType)) {
    const transcript = String(block.metadata?.transcript || "").trim();
    return <ChapterVoicePlayer duration={block.media?.duration} transcript={transcript} url={url} />;
  }
  const overlayText = imageOverlayText(block);
  return <figure className={overlayText ? "seen-reader-image-frame has-overlay" : "seen-reader-image-frame"}>
    <img alt={__msg("social.chapterMedia", { value0: title })} className="seen-reader-media" loading="lazy" onError={() => setFailed(true)} src={url} />
    {overlayText ? <figcaption style={{ "--overlay-fill-color": imageOverlayFillColor(block), "--overlay-text-color": imageOverlayColor(block) }}>{overlayText}</figcaption> : null}
  </figure>;
}

function PollBlock({ accessToken = "", block, chapterId, publicationId }) {
  __useUiLanguage();
  const options = Array.isArray(block.metadata?.options) ? block.metadata.options : [];
  const queryClient = useQueryClient();
  const pollQuery = useQuery({
    queryKey: ["publication-poll", publicationId, chapterId, block.id, accessToken],
    queryFn: () => publicationService.getPoll(publicationId, chapterId, block.id, accessToken ? { access: accessToken } : undefined).then((response) => response.data.data),
    enabled: Boolean(publicationId && chapterId && block.id && options.length),
    retry: false,
  });
  const voteMutation = useMutation({
    mutationFn: (optionIndex) => publicationService.votePoll(publicationId, chapterId, block.id, optionIndex, accessToken ? { access: accessToken } : undefined).then((response) => response.data.data),
    onSuccess: (data) => queryClient.setQueryData(["publication-poll", publicationId, chapterId, block.id, accessToken], data),
  });
  const data = pollQuery.data || {};
  const counts = Array.isArray(data.counts) ? data.counts : [];
  const total = Number(data.totalVotes || 0);
  const selected = data.viewerChoice ?? null;
  const error = pollQuery.error || voteMutation.error;

  return <section className="world-chapter-reader-poll">
    <h3>{block.metadata?.question || __msg("admin.poll")}</h3>
    <div>
      {options.map((option, index) => {
        const count = Number(counts[index] || 0);
        const percent = total ? Math.round((count / total) * 100) : 0;
        return <button className={selected === index ? "is-selected" : ""} disabled={voteMutation.isPending} key={`${block.id}-${option}-${index}`} onClick={() => voteMutation.mutate(index)} type="button">
          {data.resultsVisible ? <span className="world-poll-fill" style={{ width: `${percent}%` }} /> : null}
          <span>{option}</span>
          {data.resultsVisible ? <b>{percent}%</b> : selected === index ? <b>{__msg("social.chosen")}</b> : null}
        </button>;
      })}
    </div>
    <p>{error ? actionError(error) : data.resultsVisible ? __msg("social.vote", { value0: total.toLocaleString(__uiLocale()), value1: total === 1 ? "" : "s" }) : selected == null ? __msg("social.chooseOneAnswer") : __msg("social.yourAnswerIsSaved")}</p>
  </section>;
}

function ReaderBlock({ accessToken, block, chapterId, publicationId, title }) {
  __useUiLanguage();
  if (block.metadata?.location?.label) return <span className="chapter-location-prototype"><FiMapPin />{block.metadata.location.label}</span>;
  if (block.type === "LIST" || block.type === "KEY_POINT") {
    const listItems = Array.isArray(block.metadata?.listItems) ? block.metadata.listItems.filter(Boolean) : [];
    if (block.type === "LIST" || listItems.length) return <ul className="seen-reader-list-block">
      {(listItems.length ? listItems : String(block.text || "").split("\n").filter(Boolean)).map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}
    </ul>;
  }
  if (block.type === "KEY_POINT") {
    return <section className="seen-reader-keypoint">
      <span>{__msg("social.keyPoint")}</span>
      <p><MarkedText highlight={block.metadata?.highlight} text={block.text} tone={block.metadata?.highlightTone || "gold"} /></p>
    </section>;
  }
  if (block.type === "HIGHLIGHT") {
    const colors = { ICE_BLUE: "#9CCBFF", AMBER: "#F2C76E", CORAL: "#F18A78", MINT: "#6ECF97", LILAC: "#B7A5FF", WHITE: "#F4F7FB" };
    return <p className="seen-reader-paragraph"><mark style={{ background: colors[block.metadata?.color] || colors.ICE_BLUE, color: "#0A0C0F" }}>{block.text}</mark></p>;
  }
  if (block.type === "LINK") {
    return <a className="chapter-link-prototype" href={block.url} rel="noreferrer" target="_blank"><FiExternalLink /><span><b>{block.label || block.url}</b><small>{block.url}</small></span></a>;
  }
  if (block.type === "POLL") {
    return <PollBlock accessToken={accessToken} block={block} chapterId={chapterId} publicationId={publicationId} />;
  }
  if (["IMAGE", "VIDEO", "AUDIO", "VOICE"].includes(block.type)) {
    return <InlineMedia block={block} title={title} />;
  }
  return <p className="seen-reader-paragraph">{block.text}</p>;
}

function ChapterChecklist({ points = [] }) {
  __useUiLanguage();
  if (points.length < 2) return null;
  return <section className="seen-reader-checklist" aria-label={__msg("social.chapterChecklist")}>
    {points.map((point) => <p key={point.id || point.text}>
      <FiCheck />
      <span><MarkedText highlight={point.metadata?.highlight} text={point.text} tone={point.metadata?.highlightTone || "green"} /></span>
    </p>)}
  </section>;
}

function ReaderSkeleton() {
  __useUiLanguage();
  return <div className="seen-reader-page seen-reader-loading-page">
    <div className="seen-reader-skeleton-head" />
    <div className="seen-reader-skeleton-card" />
    <div className="seen-reader-skeleton-media" />
    <div className="seen-reader-skeleton-lines" />
  </div>;
}

const SPAM_ACTIONS = [
  { defaultChecked: true, description: "", key: "reportSpam", get label() { return __msg("fanWeb.reportSpam"); }, required: true },
  { defaultChecked: true, get description() { return __msg("social.everyPostAndCommentByThisCreator"); }, key: "deleteMessages", get label() { return __msg("social.deleteAllMessages"); } },
  { defaultChecked: false, description: "", key: "deleteReactions", get label() { return __msg("social.deleteAllReactions"); } },
  { defaultChecked: false, get description() { return __msg("social.theyWonTSeeYouOrWriteToYou"); }, key: "banCreator", get label() { return __msg("social.banCreator"); } },
  { defaultChecked: false, get description() { return __msg("social.accessEndsNowNoRefundForViolations"); }, key: "removeFromWorld", get label() { return __msg("social.removeFromYourWorld"); } },
];

function creatorActionName(creator = {}) {
  return creatorFirstName(creator) === "Creator" ? "creator" : creatorFirstName(creator);
}

function SeenDetailMoreMenu({ canAddToMedia, creator, title, onAddToMedia, onClose, onReport, onReportSpam, onShare }) {
  __useUiLanguage();
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="seen-detail-sheet-layer">
    <button aria-label={__msg("social.closeMoreMenu")} className="seen-detail-sheet-scrim" onClick={onClose} type="button" />
    <section aria-label={__msg("social.moreSeenActions")} aria-modal="true" className="seen-detail-more-sheet" role="dialog">
      <span className="seen-detail-sheet-handle" aria-hidden="true" />
      <div className="seen-detail-more-heading">
        <h2>{title}</h2>
        <p>{__msg("social.experience")} {creatorFirstName(creator)}</p>
      </div>
      <button onClick={onShare} type="button">
        <FiSend aria-hidden="true" />
        <span>{__msg("admin.share")}</span>
      </button>
      {canAddToMedia ? (
        <button onClick={onAddToMedia} type="button">
          <FiPlus aria-hidden="true" />
          <span>{__msg("social.addToProfileMedia")}</span>
        </button>
      ) : null}
      <button className="is-danger" onClick={onReportSpam} type="button">
        <FiSlash aria-hidden="true" />
        <span><strong>{__msg("fanWeb.reportSpam")}</strong><small>{__msg("social.deleteMessagesReactionsBan")}</small></span>
      </button>
      <button className="is-danger" onClick={onReport} type="button">
        <FiFlag aria-hidden="true" />
        <span>{__msg("discover.report")}</span>
      </button>
    </section>
  </div>;
}

function SeenToMediaPicker({ addedKeys, candidates, isOpen, isSubmitting, onClose, onSubmit }) {
  __useUiLanguage();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (isOpen) setSelected([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const toggle = (candidate) => {
    if (addedKeys.has(candidate.sourceMediaId) || isSubmitting) return;
    setSelected((current) => current.includes(candidate.sourceMediaId)
      ? current.filter((id) => id !== candidate.sourceMediaId)
      : [...current, candidate.sourceMediaId]);
  };

  return <div className="seen-detail-sheet-layer">
    <button aria-label={__msg("social.closeAddToProfileMedia")} className="seen-detail-sheet-scrim" disabled={isSubmitting} onClick={onClose} type="button" />
    <section aria-label={__msg("social.addToProfileMedia")} aria-modal="true" className="seen-profile-media-sheet" role="dialog">
      <span className="seen-detail-sheet-handle" aria-hidden="true" />
      <div className="seen-profile-media-head">
        <div>
          <h2>{__msg("social.addToProfileMedia")}</h2>
          <p>{__msg("social.chooseWhatYouWantToKeepOnYourProfile")}</p>
        </div>
        <button aria-label={__msg("social.closeAddToProfileMedia")} disabled={isSubmitting} onClick={onClose} type="button"><FiX /></button>
      </div>
      <div className="seen-profile-media-grid">
        {candidates.map((candidate) => {
          const alreadyAdded = addedKeys.has(candidate.sourceMediaId);
          const checked = selected.includes(candidate.sourceMediaId);
          return (
            <button
              aria-label={__msg("social.from", { value0: alreadyAdded ? __msg("social.alreadyInMedia") : checked ? __msg("social.deselect") : __msg("content.select"), value1: candidate.type, value2: candidate.label })}
              aria-pressed={checked || alreadyAdded}
              className={`${checked ? "is-selected " : ""}${alreadyAdded ? "is-added " : ""}seen-profile-media-tile`}
              disabled={isSubmitting || alreadyAdded}
              key={candidate.sourceMediaId}
              onClick={() => toggle(candidate)}
              type="button"
            >
              <img alt="" loading="lazy" src={candidate.thumbnailUrl || candidate.url} />
              {candidate.type === "video" ? <span className="seen-profile-media-video"><FiPlay />{candidate.duration ? formatDuration(candidate.duration) : __msg("profile.video")}</span> : null}
              <strong>{alreadyAdded ? __msg("social.inMedia") : checked ? __msg("onboarding.selected") : candidate.label}</strong>
            </button>
          );
        })}
      </div>
      <button className="seen-profile-media-submit" disabled={!selected.length || isSubmitting} onClick={() => onSubmit(selected)} type="button">
        {isSubmitting ? __msg("stories.adding") : __msg("social.addSelected")}
      </button>
    </section>
  </div>;
}

function SeenSpamActionSheet({ creator, error, isOpen, isSubmitting, onBack, onClose, onDone }) {
  __useUiLanguage();
  const [selected, setSelected] = useState(() => SPAM_ACTIONS.filter((action) => action.defaultChecked).map((action) => action.key));

  useEffect(() => {
    if (isOpen) setSelected(SPAM_ACTIONS.filter((action) => action.defaultChecked).map((action) => action.key));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggle = (action) => {
    if (action.required || isSubmitting) return;
    setSelected((current) => current.includes(action.key) ? current.filter((key) => key !== action.key) : [...current, action.key]);
  };
  const selectedActions = SPAM_ACTIONS.filter((action) => selected.includes(action.key));
  const actionName = creatorActionName(creator);

  return <div className="seen-detail-sheet-layer">
    <button aria-label={__msg("social.closeSpamReportOptions")} className="seen-detail-sheet-scrim" disabled={isSubmitting} onClick={onClose} type="button" />
    <section aria-label={__msg("social.spamReportOptions")} aria-modal="true" className="seen-detail-spam-sheet" role="dialog">
      <span className="seen-detail-sheet-handle" aria-hidden="true" />
      <h2>{__msg("social.looksLikeSpam")}</h2>
      <p>{__msg("social.chooseWhatToDoAbout")} {actionName}</p>
      <div className="seen-detail-spam-options">
        {SPAM_ACTIONS.map((action) => {
          const checked = selected.includes(action.key);
          const label = action.key === "banCreator" ? __msg("social.banValue0", { value0: actionName }) : action.key === "removeFromWorld" ? __msg("social.removeFromYourWorld") : action.label;
          return <button aria-pressed={checked} disabled={isSubmitting || action.required} key={action.key} onClick={() => toggle(action)} type="button">
            <span className={checked ? "is-checked" : ""}>{checked ? <FiCheck /> : <FiSquare />}</span>
            <b>{label}</b>
            {action.description ? <small>{action.description}</small> : null}
          </button>;
        })}
      </div>
      {error ? <p className="seen-detail-report-error" role="alert">{__systemMessage(error)}</p> : null}
      <button className="seen-detail-spam-submit" disabled={isSubmitting || !selectedActions.length} onClick={() => onDone(selectedActions)} type="button">
        {isSubmitting ? __msg("profile.sending") : __msg("social.done", { value0: selectedActions.length })}
      </button>
      <button className="seen-detail-spam-back" disabled={isSubmitting} onClick={onBack} type="button">{__msg("social.reportOptions")}</button>
    </section>
  </div>;
}

function SeenReportSheet({ error, isDone, isOpen, isSubmitting, onClose, onDone, onSelectReason }) {
  __useUiLanguage();
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return <div className="seen-detail-sheet-layer">
    <button aria-label={__msg("social.closeReportDialog")} className="seen-detail-sheet-scrim" onClick={onClose} type="button" />
    <section aria-label={isDone ? __msg("fanWeb.reportReceived") : __msg("social.reportExperience")} aria-modal="true" className={isDone ? "seen-detail-report-sheet is-done" : "seen-detail-report-sheet"} role="dialog">
      <span className="seen-detail-sheet-handle" aria-hidden="true" />
      {isDone ? (
        <div className="seen-detail-report-done">
          <FiEye aria-hidden="true" />
          <h2>{__msg("social.thankYou")}</h2>
          <p>{__msg("social.ourTeamWillReviewThisShortly")}</p>
          <button onClick={onDone} type="button">{__msg("comments.done")}</button>
        </div>
      ) : (
        <>
          <h2>{__msg("social.reportExperience")}</h2>
          <p>{__msg("fanWeb.whyAreYouReportingThis")}</p>
          <div className="seen-detail-report-reasons">
            {SEEN_REPORT_REASONS.map((reason) => (
              <button disabled={isSubmitting} key={reason.value} onClick={() => onSelectReason(reason)} type="button">
                <span>{reason.label}</span>
                <FiChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
          {error ? <p className="seen-detail-report-error" role="alert">{__systemMessage(error)}</p> : null}
        </>
      )}
    </section>
  </div>;
}

// Kept temporarily for compatibility with embedders that still import the legacy presentation.
// eslint-disable-next-line no-unused-vars
function SeenOverview({
  comment,
  commentsOpen,
  detail,
  engagement,
  mutations,
  notice,
  noticeLink,
  onBack,
  onCopyLink,
  onCommentChange,
  onCommentSubmit,
  onCommentToggle,
  onOpenMediaPicker,
  onNotice,
  onOpenChapter,
  onShareClose,
  sharePayload,
  shareSheetOpen,
}) {
  __useUiLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [spamOpen, setSpamOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState("");
  const creator = detail.creator;
  const canAddToMedia = detail.access === "OWNER" && detail.mediaCandidates.length > 0;
  const saved = Boolean(engagement.viewerSaved);
  const chapterWord = detail.chapters.length === 1 ? "chapter" : "chapters";
  const metadata = __msg("social.value0Value1Value2Value3SawThis", { value0: creatorFirstName(creator), value1: detail.chapters.length, value2: chapterWord, value3: formatCount(detail.metrics.views) });
  const share = () => {
    setMoreOpen(false);
    onCopyLink();
  };
  const report = () => {
    setMoreOpen(false);
    setSpamOpen(false);
    setReportDone(false);
    setReportOpen(true);
    setReportError("");
  };
  const reportSpam = () => {
    setMoreOpen(false);
    setReportOpen(false);
    setReportDone(false);
    setSpamOpen(true);
    setReportError("");
  };
  const addToMedia = () => {
    setMoreOpen(false);
    onOpenMediaPicker();
  };
  const closeReport = () => {
    setReportOpen(false);
    setSpamOpen(false);
    setReportDone(false);
    setReportError("");
  };
  const submitReport = (reason) => {
    if (mutations.report.isPending) return;
    setReportError("");
    mutations.report.mutate(
      { reason: reason.value, label: reason.label },
      {
        onError: (error) => setReportError(actionError(error)),
        onSuccess: () => setReportDone(true),
      },
    );
  };
  const submitSpamReport = (selectedActions) => {
    if (mutations.report.isPending) return;
    setReportError("");
    mutations.report.mutate(
      {
        reason: "SPAM",
        label: "Spam",
        reportMode: "SPAM_ACTIONS",
        safetyActions: selectedActions.map(({ key, label, description }) => ({ key, label, description })),
      },
      {
        onError: (error) => setReportError(actionError(error)),
        onSuccess: () => {
          setSpamOpen(false);
          setReportOpen(true);
          setReportDone(true);
          const creatorLabel = creatorFirstName(creator);
          const actionText = selectedActions.some((action) => action.key === "deleteMessages") ? "messages deleted · " : "";
          onNotice(__msg("social.reportSent", { value0: creatorLabel, value1: actionText }));
        },
      },
    );
  };
  const startSeenFromScreen = (event) => {
    if (event.target.closest?.("a, button, input, textarea, select, video, audio, .seen-detail-engagement")) return;
    const firstOpenChapter = detail.chapters.findIndex((chapter) => !chapter.locked);
    if (firstOpenChapter >= 0) onOpenChapter(firstOpenChapter);
  };

  return <>
  <section className="seen-detail-page is-screen-clickable" onClick={startSeenFromScreen}>
    <header className="seen-detail-header seen-detail-prototype-header">
      <span className="seen-detail-type">{__msg("social.seen")}</span>
      <div className="seen-detail-title">
        <h1>{detail.title}</h1>
        <p>{metadata}</p>
      </div>
      <button aria-label={__msg("social.closeSeen")} className="seen-detail-close" onClick={onBack} type="button"><FiX /></button>
      <div className="seen-detail-more-wrap">
        {moreOpen ? <SeenDetailMoreMenu canAddToMedia={canAddToMedia} creator={creator} title={detail.title} onAddToMedia={addToMedia} onClose={() => setMoreOpen(false)} onReport={report} onReportSpam={reportSpam} onShare={share} /> : null}
      </div>
    </header>

    <div className="seen-detail-body seen-detail-prototype-body">
      <div className="seen-detail-overview">
        <button aria-label={__msg("social.start", { value0: detail.title })} className="seen-detail-cover" onClick={() => onOpenChapter(0)} type="button">
          {detail.heroMedia?.url ? <PublicationCoverMedia alt={__msg("discover.cover", { value0: detail.title })} autoPlay loop media={detail.heroMedia} /> : detail.heroMedia?.thumbnailUrl ? <img alt={__msg("discover.cover", { value0: detail.title })} src={detail.heroMedia.thumbnailUrl} /> : <span aria-hidden="true">@seen</span>}
        </button>
        <div><h2>{detail.title}</h2><p>{creatorFirstName(creator)} · {detail.chapters.length} {chapterWord} · ~{Math.max(1, detail.chapters.length)} {__msg("messages.min")}</p></div>
      </div>

      {detail.description ? <p className="seen-detail-description">{detail.description}</p> : null}
      <ContentEntityList entities={detail.attachedEntities} onNotice={onNotice} />
      {detail.chapters.length ? <div className="seen-detail-journey-list">
        {detail.chapters.map((chapter, index) => {
          const locked = Boolean(chapter.locked);
          return (
            <button
              aria-label={locked ? __msg("social.isLocked", { value0: chapter.title }) : __msg("contentEntities.open", { value0: chapter.title })}
              className={locked ? "is-locked" : ""}
              disabled={locked}
              key={chapter.stableChapterId || index}
              onClick={() => onOpenChapter(index)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong>
              {locked ? <FiLock aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div> : <p className="seen-detail-empty">{__msg("social.noChaptersYet")}</p>}

      {notice ? <p className="seen-detail-notice" role="status">{__systemMessage(notice)}{noticeLink ? <Link to={noticeLink}>{__msg("social.viewReposts")}</Link> : null}</p> : null}

      <footer className="seen-detail-engagement">
        <div className="seen-detail-start-meta"><span>{detail.chapters.length} {chapterWord} · ~{Math.max(1, detail.chapters.length)} {__msg("messages.min")}</span><span>{__msg("social.tapToStart")}</span></div>
        <SeenEngagementBar commentsOpen={commentsOpen} engagement={engagement} isOwn={detail.access === "OWNER"} mutations={mutations} onCommentToggle={onCommentToggle} onCopyLink={onCopyLink} saved={saved} />
      </footer>
    </div>
  </section>
  <SeenSpamActionSheet
    creator={creator}
    error={reportError}
    isOpen={spamOpen}
    isSubmitting={mutations.report.isPending}
    onBack={() => {
      setSpamOpen(false);
      setReportOpen(true);
      setReportError("");
    }}
    onClose={closeReport}
    onDone={submitSpamReport}
  />
  <SeenReportSheet
    error={reportError}
    isDone={reportDone}
    isOpen={reportOpen}
    isSubmitting={mutations.report.isPending}
    onClose={closeReport}
    onDone={closeReport}
    onSelectReason={submitReport}
  />
  <SeenCommentsSheet comment={comment} currentUser={mutations.currentUser} engagement={engagement} isOpen={commentsOpen} isPending={mutations.comment.isPending} onChange={onCommentChange} onClose={onCommentToggle} onReact={mutations.commentReaction} onSubmit={onCommentSubmit} onVoiceSubmit={mutations.voiceComment} reactionPending={mutations.commentReactionPending} title={detail.title} voicePending={mutations.voiceCommentPending} />
  <ShareSheet isOpen={shareSheetOpen} onClose={onShareClose} payload={sharePayload} variant="seen" />
  </>;
}

export default function SeenReaderPage() {
  __useUiLanguage();
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const accessToken = searchParams.get("access") || searchParams.get("token") || "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const readerTopRef = useRef(null);
  const scrollSeenActionRef = useRef({ next: null, previous: null });
  const scrollAdvanceRef = useRef({ locked: false, touchStartY: null, wheelDistance: 0, wheelTimer: null });
  const scrollTransitionDirectionRef = useRef(null);
  const requestedChapter = Number(searchParams.get("chapter"));
  const [chapterIndex, setChapterIndex] = useState(Number.isSafeInteger(requestedChapter) && requestedChapter >= 0 ? requestedChapter : 0);
  const [comment, setComment] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(Boolean(searchParams.get("comment")));
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeLink, setNoticeLink] = useState("");
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const [chapterSheetPosition, setChapterSheetPosition] = useState(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const originRef = useRef(location.state?.seenOrigin || null);

  useEffect(() => {
    if (!chapterListOpen) return undefined;
    const positionSheet = () => {
      const center = document.querySelector(".social-center-scroll");
      const rect = center?.getBoundingClientRect();
      const width = Math.min(440, rect?.width || window.innerWidth);
      setChapterSheetPosition({ left: Math.max(0, (rect?.left || 0) + ((rect?.width || window.innerWidth) - width) / 2), width });
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setChapterListOpen(false);
    };
    positionSheet();
    window.addEventListener("resize", positionSheet);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", positionSheet);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [chapterListOpen]);

  const publicationQuery = useQuery({
    queryKey: ["seen-detail", id, accessToken],
    queryFn: () => publicationService.getPublicPublication(id, accessToken ? { access: accessToken } : undefined).then((response) => response.data.data.publication),
    retry: false,
  });
  const engagementQuery = useQuery({
    queryKey: ["seen-engagement", id, accessToken],
    queryFn: () => publicationService.getSeenEngagement(id, accessToken ? { access: accessToken } : undefined).then((response) => response.data.data.engagement),
    retry: false,
  });

  const publication = publicationQuery.data;
  useEffect(() => {
    if (!publication?.id && !publication?._id) return;
    void analyticsService.trackContentView({
      entityId: String(publication.id || publication._id),
      entityType: "seen",
      source: "seen",
    });
  }, [publication?.id, publication?._id]);

  useEffect(() => {
    if (!publication?.id && !publication?._id) return;
    const direction = scrollTransitionDirectionRef.current;
    const page = readerTopRef.current || document.querySelector(".seen-detail-page");
    if (!direction || !page) return;
    scrollTransitionDirectionRef.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    page.animate([
      { opacity: 0, transform: `translateY(${direction === "next" ? 36 : -36}px) scale(.992)` },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ], { duration: 220, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }, [publication?.id, publication?._id]);

  const creatorId = String(publication?.creator?.id || publication?.creator?._id || "");
  const creatorSeensQuery = useQuery({
    queryKey: ["seen-creator-sequence", creatorId],
    queryFn: async () => {
      const creatorResponse = await publicationService.listPublishedSeens({ creator: creatorId, limit: 50 });
      const creatorItems = (creatorResponse.data.data.items || []).filter((item) => (
        String(item.creator?.id || item.creator?._id || "") === creatorId
      ));
      if (creatorItems.length > 1) return creatorItems;

      // A running API instance may not yet support the creator filter, or an
      // intermediate cache may contain only the current Seen. Verify against
      // the visible feed before deciding that the creator sequence is over.
      const feedResponse = await publicationService.listPublishedSeens({ limit: 50 });
      const feedMatches = (feedResponse.data.data.items || []).filter((item) => (
        String(item.creator?.id || item.creator?._id || "") === creatorId
      ));
      const merged = new Map([...creatorItems, ...feedMatches].map((item) => [String(item.id || item._id), item]));
      return [...merged.values()];
    },
    enabled: Boolean(creatorId),
    refetchOnMount: "always",
    staleTime: 0,
  });
  const engagement = engagementQuery.data || DEFAULT_ENGAGEMENT;
  const detail = useMemo(() => normalizeSeenDetail(publication, engagement), [publication, engagement]);
  const isOwner = detail.access === "OWNER";
  const ownMediaQuery = useQuery({
    enabled: Boolean(isOwner),
    queryKey: ["profile-media", "me"],
    queryFn: () => profileService.getOwnMedia().then((response) => response.data.data),
    retry: false,
  });
  const addedSeenMediaIds = useMemo(() => new Set((ownMediaQuery.data?.media || [])
    .filter((item) => item.sourceType === "seen" && String(item.sourceId) === String(id))
    .map((item) => item.sourceMediaId)
    .filter(Boolean)), [id, ownMediaQuery.data]);
  const chapters = detail.chapters;
  const safeChapterIndex = Math.min(Math.max(chapterIndex, 0), Math.max(chapters.length - 1, 0));
  const chapter = chapters[safeChapterIndex] || null;
  const visibleBlocks = chapter?.blocks || [];
  const pointBlocks = visibleBlocks.filter((block) => ["KEY_POINT", "HIGHLIGHT"].includes(block.type) && block.text?.trim());
  const explicitChecklistPoints = pointBlocks.filter((block) => block.metadata?.presentation === "CHECKLIST");
  const checklistPoints = explicitChecklistPoints.length >= 2 ? explicitChecklistPoints : pointBlocks.length >= 3 ? pointBlocks.slice(1, 5) : [];
  const checklistIds = new Set(checklistPoints.map(blockKey));
  const hasChapterContent = visibleBlocks.some((block) => block.text?.trim() || block.url || block.media?.secureUrl || block.type === "POLL");
  const shareUrl = useMemo(() => (typeof window === "undefined" ? "" : `${window.location.origin}/seen/${id}`), [id]);
  const sharePayload = useMemo(() => ({
    author: {
      avatarUrl: publication?.creator?.avatar || "",
      id: publication?.creator?.id || publication?.creator?._id || "",
      name: creatorName(publication?.creator),
      username: publication?.creator?.username || "",
    },
    canonicalUrl: shareUrl,
    contentId: id,
    contentType: "seen",
    destinationRoute: `/seen/${encodeURIComponent(id)}`,
    imageUrl: mediaUrl(publication?.coverMedia),
    mediaType: mediaType(publication?.coverMedia),
    textPreview: publication?.title || "Seen",
    title: publication?.title || "Seen",
  }), [id, publication, shareUrl]);
  const nextSeen = useMemo(() => {
    if (publication?.nextSeen && String(publication.nextSeen.id || publication.nextSeen._id) !== String(id)) {
      return publication.nextSeen;
    }
    const creatorSeens = creatorSeensQuery.data || [];
    const currentIndex = creatorSeens.findIndex((item) => String(item.id || item._id) === String(id));
    if (currentIndex < 0) return creatorSeens.find((item) => String(item.id || item._id) !== String(id)) || null;
    return [
      ...creatorSeens.slice(currentIndex + 1),
      ...creatorSeens.slice(0, currentIndex),
    ].find((item) => String(item.id || item._id) !== String(id)) || null;
  }, [creatorSeensQuery.data, id, publication?.nextSeen]);
  const previousSeen = useMemo(() => {
    const creatorSeens = creatorSeensQuery.data || [];
    const currentIndex = creatorSeens.findIndex((item) => String(item.id || item._id) === String(id));
    if (currentIndex < 0) return null;
    return [
      ...creatorSeens.slice(0, currentIndex).reverse(),
      ...creatorSeens.slice(currentIndex + 1).reverse(),
    ].find((item) => String(item.id || item._id) !== String(id)) || null;
  }, [creatorSeensQuery.data, id]);

  const syncSeenEngagementCaches = (next) => {
    if (!next) return;
    queryClient.setQueryData(["seen-engagement", id, accessToken], next);
    queryClient.setQueryData(["seen-engagement", id], next);
    queryClient.setQueriesData({ queryKey: ["seen-feed"] }, (current = []) => Array.isArray(current)
      ? current.map((entry) => String(entry.id) === String(id) ? {
        ...entry,
        engagement: {
          reactionCount: next.reactionCount,
          reactionBreakdown: next.reactionBreakdown || entry.engagement?.reactionBreakdown || {},
          topReactions: next.topReactions || entry.engagement?.topReactions || [],
          commentCount: next.commentCount,
          shareCount: next.shareCount,
          saveCount: next.saveCount,
          viewCount: entry.engagement?.viewCount ?? next.viewCount ?? 0,
          viewerReaction: next.viewerReaction,
          viewerShared: next.viewerShared,
          viewerSaved: next.viewerSaved,
        },
        previewComment: next.comments?.at(-1) || entry.previewComment || null,
      } : entry)
      : current);
  };

  useEffect(() => {
    if (!chapters.length) return;
    const next = Math.min(Math.max(Number.isSafeInteger(requestedChapter) ? requestedChapter : 0, 0), chapters.length - 1);
    setChapterIndex(next);
    if (String(next) !== searchParams.get("chapter")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("chapter", String(next));
      setSearchParams(nextParams, { replace: true, state: location.state });
    }
  }, [chapters.length, location.state, requestedChapter, searchParams, setSearchParams]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      readerTopRef.current?.scrollIntoView({ block: "start" });
    });
  }, [safeChapterIndex]);

  const updateEngagement = async (request) => {
    try {
      const response = await request;
      const next = response.data.data.engagement;
      syncSeenEngagementCaches(next);
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      setNotice("");
      setNoticeLink("");
      return next;
    } catch (error) {
      setNotice(actionError(error));
      setNoticeLink("");
      throw error;
    }
  };

  const reactionMutation = useMutation({
    mutationFn: (reaction) => engagement.viewerReaction === reaction
      ? updateEngagement(publicationService.removeSeenReaction(id, accessToken))
      : updateEngagement(publicationService.reactToSeen(id, reaction || "LIKE", accessToken)),
  });
  const shareMutation = useMutation({
    mutationFn: () => updateEngagement(engagement.viewerShared ? publicationService.removeSeenShare(id, accessToken) : publicationService.shareSeen(id, "", accessToken)),
    onSuccess: (next) => {
      if (next.viewerShared) {
        setNotice(__msg("social.repostedToYourProfile"));
        setNoticeLink("/profile?tab=reposts");
      } else {
        setNotice(__msg("fanWeb.removedFromYourProfile"));
      }
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => updateEngagement(publicationService.toggleSeenSave(id, accessToken)),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["seen-engagement", id, accessToken], exact: true });
      const previous = queryClient.getQueryData(["seen-engagement", id, accessToken]) || engagement || DEFAULT_ENGAGEMENT;
      const viewerSaved = !previous.viewerSaved;
      const optimistic = {
        ...DEFAULT_ENGAGEMENT,
        ...previous,
        saveCount: Math.max(0, (Number(previous.saveCount) || 0) + (viewerSaved ? 1 : -1)),
        viewerSaved,
      };
      syncSeenEngagementCaches(optimistic);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) syncSeenEngagementCaches(context.previous);
    },
  });
  const commentMutation = useMutation({
    mutationFn: ({ parentCommentId, text }) => updateEngagement(publicationService.commentOnSeen(id, text, accessToken, parentCommentId)),
    onSuccess: () => {
      setComment("");
      setCommentsOpen(true);
    },
  });
  const commentReactionMutation = useMutation({
    mutationFn: ({ commentId, reaction }) => updateEngagement(reaction
      ? publicationService.reactToSeenComment(id, commentId, reaction, accessToken)
      : publicationService.removeSeenCommentReaction(id, commentId, accessToken)),
    onMutate: ({ commentId, reaction }) => {
      const previous = engagement;
      syncSeenEngagementCaches(withOptimisticCommentHeart(previous, commentId, Boolean(reaction)));
      return { previous };
    },
    onError: (_error, _variables, context) => context?.previous && syncSeenEngagementCaches(context.previous),
  });
  const voiceCommentMutation = useMutation({
    mutationFn: ({ parentCommentId, recording }) => updateEngagement(publicationService.voiceCommentOnSeen(id, { ...recording, accessToken, parentCommentId })),
  });
  const addSeenMediaMutation = useMutation({
    mutationFn: (mediaIds) => profileService.addSeenMediaToProfileMedia(id, mediaIds).then((response) => response.data?.data),
    onSuccess: async (result) => {
      const count = Number(result?.added?.length) || 0;
      const duplicateCount = Number(result?.skippedDuplicates?.length) || 0;
      setMediaPickerOpen(false);
      setNotice(count > 1 ? __msg("social.addedValue0ItemsToProfileMedia", { value0: count }) : count === 1 ? __msg("social.addedToProfileMedia") : duplicateCount ? __msg("social.alreadyInProfileMedia") : __msg("social.noMediaAdded"));
      setNoticeLink("/profile?tab=media");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile-media"] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
    },
    onError: (error) => {
      setNotice(error?.response?.data?.message || __msg("social.someSelectedMediaCouldNotBeAdded"));
      setNoticeLink("");
    },
  });

  const submitComment = (event, parentCommentId = "") => {
    event.preventDefault();
    const text = comment.trim();
    if (text) commentMutation.mutate({ parentCommentId, text });
  };
  const reactToComment = (targetComment, reaction) => {
    if (!targetComment?.id || commentReactionMutation.isPending) return;
    commentReactionMutation.mutate({ commentId: targetComment.id, reaction });
  };
  const submitVoiceComment = (recording, parentCommentId = "") => {
    if (!recording?.audioBlob || voiceCommentMutation.isPending) return;
    voiceCommentMutation.mutate({ parentCommentId, recording });
  };
  const openMediaAdd = () => {
    const candidates = detail.mediaCandidates.filter((candidate) => !addedSeenMediaIds.has(candidate.sourceMediaId));
    if (!candidates.length) {
      setNotice(__msg("social.alreadyInProfileMedia"));
      setNoticeLink("/profile?tab=media");
      return;
    }
    if (detail.mediaCandidates.length === 1) {
      addSeenMediaMutation.mutate([detail.mediaCandidates[0].sourceMediaId]);
      return;
    }
    setMediaPickerOpen(true);
  };
  const changeChapter = (nextIndex) => {
    const next = Math.min(Math.max(nextIndex, 0), Math.max(chapters.length - 1, 0));
    setChapterIndex(next);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("chapter", String(next));
    setSearchParams(nextParams, { replace: true, state: location.state });
  };
  const openNextSeen = () => {
    if (!nextSeen) return;
    setChapterIndex(0);
    navigate(`/seen/${encodeURIComponent(nextSeen.id || nextSeen._id)}?chapter=0`, { state: { seenOrigin: originRef.current } });
  };
  const openSeenWithScrollEffect = async (direction, destination) => {
    if (!destination) return;
    const page = readerTopRef.current || document.querySelector(".seen-detail-page");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let exitAnimation = null;
    if (page && !reduceMotion) {
      exitAnimation = page.animate([
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: `translateY(${direction === "next" ? -36 : 36}px) scale(.992)` },
      ], { duration: 160, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" });
      await exitAnimation.finished.catch(() => {});
    }
    scrollTransitionDirectionRef.current = direction;
    setChapterIndex(0);
    navigate(`/seen/${encodeURIComponent(destination.id || destination._id)}?chapter=0`, { replace: true, state: { seenOrigin: originRef.current } });
    exitAnimation?.cancel();
  };
  const continueReader = () => {
    if (safeChapterIndex < chapters.length - 1) changeChapter(safeChapterIndex + 1);
    else openNextSeen();
  };
  scrollSeenActionRef.current = {
    next: () => openSeenWithScrollEffect("next", nextSeen),
    previous: () => openSeenWithScrollEffect("previous", previousSeen),
  };

  useEffect(() => {
    const gesture = scrollAdvanceRef.current;
    const scrollContainer = document.querySelector(".social-center-scroll");
    gesture.locked = false;
    gesture.touchStartY = null;
    gesture.wheelDistance = 0;

    const usesPanelScroll = scrollContainer
      && window.getComputedStyle(scrollContainer).overflowY !== "visible";
    const isAtPageEnd = () => usesPanelScroll
      ? scrollContainer.clientHeight + scrollContainer.scrollTop >= scrollContainer.scrollHeight - 2
      : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const isAtPageStart = () => usesPanelScroll
      ? scrollContainer.scrollTop <= 2
      : window.scrollY <= 2;
    const canAdvance = (target) => !chapterListOpen && !commentsOpen && !mediaPickerOpen && !shareSheetOpen
      && !target?.closest?.("input, textarea, select, video, audio, [role='dialog']")
      && Boolean(nextSeen || previousSeen);
    const switchSeen = (direction) => {
      if (gesture.locked) return;
      gesture.locked = true;
      scrollSeenActionRef.current[direction]?.();
    };
    const resetWheel = () => {
      gesture.wheelDistance = 0;
      gesture.wheelTimer = null;
    };
    const onWheel = (event) => {
      const direction = event.deltaY > 0 ? "next" : "previous";
      const atBoundary = direction === "next" ? isAtPageEnd() : isAtPageStart();
      const destination = direction === "next" ? nextSeen : previousSeen;
      if (!event.deltaY || !atBoundary || !destination || !canAdvance(event.target)) {
        resetWheel();
        return;
      }
      event.preventDefault();
      if (gesture.wheelDistance && Math.sign(gesture.wheelDistance) !== Math.sign(event.deltaY)) resetWheel();
      gesture.wheelDistance += event.deltaY;
      if (gesture.wheelTimer) window.clearTimeout(gesture.wheelTimer);
      gesture.wheelTimer = window.setTimeout(resetWheel, 240);
      if (Math.abs(gesture.wheelDistance) >= 80) switchSeen(direction);
    };
    const onTouchStart = (event) => {
      gesture.touchStartY = event.touches.length === 1 && canAdvance(event.target)
        ? event.touches[0].clientY
        : null;
    };
    const onTouchEnd = (event) => {
      if (gesture.touchStartY == null || event.changedTouches.length !== 1) return;
      const distance = gesture.touchStartY - event.changedTouches[0].clientY;
      gesture.touchStartY = null;
      if (distance >= 64 && isAtPageEnd() && nextSeen) switchSeen("next");
      if (distance <= -64 && isAtPageStart() && previousSeen) switchSeen("previous");
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      if (gesture.wheelTimer) window.clearTimeout(gesture.wheelTimer);
    };
  }, [chapterListOpen, commentsOpen, id, mediaPickerOpen, nextSeen, previousSeen, shareSheetOpen]);

  const handleReaderClick = (event) => {
    if (event.target.closest?.("a, button, input, textarea, select, video, audio")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const clickedLeftSide = event.clientX < bounds.left + bounds.width / 2;
    if (clickedLeftSide) {
      if (safeChapterIndex > 0) changeChapter(safeChapterIndex - 1);
      return;
    }
    continueReader();
  };
  const closeReader = () => {
    const origin = originRef.current;
    if (origin?.pathname) {
      navigate(`${origin.pathname}${origin.search || ""}${origin.hash || ""}`, {
        replace: true,
        state: { restoreScroll: origin.scroll },
      });
      return;
    }
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/seen", { replace: true });
  };

  const openOverviewChapter = (index) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("overview");
    nextParams.set("chapter", String(index));
    setChapterIndex(index);
    setSearchParams(nextParams, { replace: true, state: location.state });
  };

  if (publicationQuery.isLoading) return <ReaderSkeleton />;
  if (publicationQuery.isError || !publication) return <div className="seen-reader-page"><section className="seen-reader-error"><h1>{__msg("social.thisSeenIsNotAvailable")}</h1><Link to="/seen">{__msg("social.backToSeen")}</Link></section></div>;

  if (searchParams.get("overview") === "1") {
    const paid = publication.pricing?.mode === "ONE_TIME";
    const creator = publication.creator || {};
    return <section className="seen-paid-overview-page" ref={readerTopRef}>
      <header className="seen-paid-overview-nav">
        <button aria-label={__msg("profile.backToProfile")} onClick={closeReader} type="button"><FiChevronRight /></button>
        <h1>{creatorFirstName(creator)} {__msg("system.SeenPermalinkPage.9947c72274")}</h1>
      </header>
      <section className="seen-paid-overview-author">
        <FanAvatar name={creatorName(creator)} size="h-9 w-9" src={creator.avatar} />
        <span><b>{creatorName(creator)}</b><small>{publication.experienceLocation || publication.category || __msg("system.SeenReaderPage.bb372a53a2")}</small></span>
        <em><FiEye /> {formatCount(engagement.viewCount || 0)}</em>
      </section>
      <section className="seen-paid-overview-hero">
        <button aria-label={__msg("system.SeenReaderPage.ca86092945")} onClick={() => openOverviewChapter(0)} type="button">
          {mediaUrl(publication.coverMedia) ? <PublicationCoverMedia alt={__msg("discover.cover", { value0: publication.title })} autoPlay loop media={publication.coverMedia} /> : <span aria-hidden="true">@seen</span>}
        </button>
        <div><small>{publication.category || "Seen"}</small><h2>{publication.title}</h2><span>{chapters.length} {__msg("system.SeenReaderPage.4fbee6d40b")}{Math.max(1, chapters.length)} {__msg("messages.min")}</span><p>{publication.description || publication.summary}</p></div>
      </section>
      {paid ? <button className="seen-paid-overview-unlock" disabled={!publication.paymentAvailable} onClick={() => publication.paymentAvailable && setPurchaseOpen(true)} type="button"><span><FiLock /> {Number(publication.pricing?.starsAmount || 0).toLocaleString(__uiLocale())}</span><small>{__msg("system.SeenFeedPage.fc2d3a48d2")} {Number(publication.ownerCount || 0).toLocaleString(__uiLocale())} {__msg("profile.ownIt")}</small><b>{publication.paymentAvailable ? __msg("system.SeenFeedPage.310e3f8652") : __msg("system.SeenFeedPage.755844bc39")}</b></button> : null}
      <nav className="seen-paid-overview-chapters" aria-label={__msg("social.seenChapters")}>
        {chapters.map((item, index) => <button className={item.locked ? "is-locked" : ""} key={item.stableChapterId || index} onClick={() => openOverviewChapter(index)} type="button"><span>{String(index + 1).padStart(2, "0")}</span><i>{item.locked ? <FiLock /> : null}</i><b>{item.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</b><FiChevronRight /></button>)}
      </nav>
      <footer className="seen-paid-overview-engagement"><SeenEngagementBar commentsOpen={commentsOpen} engagement={engagement} isOwn={isOwner} mutations={{ reaction: reactionMutation, save: saveMutation, share: shareMutation }} onCommentToggle={() => setCommentsOpen(true)} onCopyLink={() => setShareSheetOpen(true)} saved={Boolean(engagement.viewerSaved)} /></footer>
      <SeenCommentsSheet comment={comment} currentUser={currentUser} engagement={engagement} isOpen={commentsOpen} isPending={commentMutation.isPending} onChange={(event) => setComment(event.target.value)} onClose={() => setCommentsOpen(false)} onReact={reactToComment} onSubmit={submitComment} onVoiceSubmit={submitVoiceComment} reactionPending={commentReactionMutation.isPending} title={publication.title} voicePending={voiceCommentMutation.isPending} />
      <ShareSheet isOpen={shareSheetOpen} onClose={() => setShareSheetOpen(false)} payload={sharePayload} variant="seen" />
      <PurchaseWorldModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} onSuccess={() => publicationQuery.refetch()} publication={publication} />
    </section>;
  }

  let renderedChecklist = false;
  const chapterContent = visibleBlocks.flatMap((block) => {
    if (checklistIds.has(blockKey(block))) {
      if (renderedChecklist) return [];
      renderedChecklist = true;
      return [<ChapterChecklist key="chapter-checklist" points={checklistPoints} />];
    }
    return [<ReaderBlock accessToken={accessToken} block={block} chapterId={chapter?.stableChapterId} key={blockKey(block)} publicationId={id} title={publication.title} />];
  });

  return <section className="seen-reader-page" ref={readerTopRef}>
    <header className="seen-reader-header">
      <button aria-expanded={chapterListOpen} aria-label={__msg("social.openChapterList")} className="seen-reader-brand-pill" onClick={() => setChapterListOpen(true)} type="button"><FiList /> {__msg("social.seen")}</button>
      <div className="seen-reader-titleblock">
        <h1>{publication.title}</h1>
        <span>{[publication.category, `${chapters.length || 1} ${chapters.length === 1 ? "chapter" : "chapters"}`, __msg("profile.value0Min", { value0: Math.max(1, chapters.length) }), `${safeChapterIndex + 1}/${chapters.length || 1}`].filter(Boolean).join(" · ")}</span>
      </div>
      <button aria-label={__msg("social.closeSeenReader")} className="seen-reader-close" onClick={closeReader} type="button"><FiX /></button>
    </header>

    <div className="seen-reader-chapter-heading">
      <span>{String(safeChapterIndex + 1).padStart(2, "0")}</span>
      <h2>{chapter?.title || publication.title}</h2>
      {!isOwner && chapter?.stableChapterId ? <button aria-label={__msg("system.SeenReaderPage.9713f9218c")} className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={async () => { const reason = window.prompt("Report category: SPAM, HARASSMENT, HATE, DEFAMATION, NUDITY, VIOLENCE, SELF_HARM, SCAM, COPYRIGHT, IMPERSONATION, CHILD_SAFETY, or OTHER", "OTHER"); if (!reason) return; const details = window.prompt("Add a private note for the moderation team (optional):", "") || ""; try { await publicationService.reportChapter(id, chapter.stableChapterId, { reason: reason.trim().toUpperCase(), details }); setNotice(__msg("system.SeenReaderPage.cd83da62bc")); } catch (requestError) { setNotice(requestError.response?.data?.message || __msg("system.copy.c1ab3e66c148")); } }} type="button"><FiFlag /></button> : <i aria-hidden="true" />}
    </div>

    <article className={`seen-reader-content ${chapter?.locked ? "is-paid-locked" : ""}`} onClick={handleReaderClick}>
      {chapter?.locked && chapter?.worldBonus && publication.bonusWorld ? <section className="seen-paid-locked-chapter is-world-bonus">
        <div className="seen-paid-locked-blur" aria-hidden="true"><i /><i /><i /></div>
        <div className="seen-world-bonus-card">
          <span aria-hidden="true">◉</span>
          <h3>{__msg("system.SeenFeedPage.34ab070662")} {creatorFirstName(publication.creator)}{__msg("profile.sWorld")}</h3>
          <p>{__msg("system.SeenFeedPage.4a66d14807")} {creatorFirstName(publication.creator)} {__msg("system.SeenFeedPage.d1ae84013a")}</p>
          <button onClick={(event) => { event.stopPropagation(); navigate(`/world/${encodeURIComponent(publication.bonusWorld.id)}?join=1`); }} type="button">{__msg("system.SeenFeedPage.70ba407056")} <CoinIcon size={12} /> {Number(publication.bonusWorld.firstMonthStars || publication.bonusWorld.regularStars || 0).toLocaleString(__uiLocale())} {__msg("social.firstMonth")}</button>
        </div>
        <button className="seen-world-bonus-back" onClick={(event) => { event.stopPropagation(); closeReader(); }} type="button">‹ <b>{__msg("creator.backToOverview")}</b></button>
      </section> : chapter?.locked ? <section className="seen-paid-locked-chapter">
        <div className="seen-paid-locked-blur" aria-hidden="true"><i /><i /><i /></div>
        <div className="seen-paid-locked-card">
          <span><FiLock /></span>
          <h2>{__msg("system.SeenFeedPage.7898d6a540")}</h2>
          <p>{__msg("system.SeenFeedPage.1446710a0d")} {Number(publication.ownerCount || 0).toLocaleString(__uiLocale())} {__msg("profile.ownIt")}</p>
          <button onClick={(event) => { event.stopPropagation(); setPurchaseOpen(true); }} type="button">{__msg("system.PurchaseWorldModal.c3d96877a2")} {STAR} {Number(publication.pricing?.starsAmount || 0).toLocaleString(__uiLocale())}</button>
        </div>
        {chapters[safeChapterIndex + 1] ? <button className="seen-paid-locked-next" onClick={(event) => { event.stopPropagation(); changeChapter(safeChapterIndex + 1); }} type="button"><small>{__msg("system.SeenReaderPage.1992d5e8d5")}</small><b>{String(safeChapterIndex + 2).padStart(2, "0")} <span aria-hidden="true">&middot;</span> <FiLock /> {chapters[safeChapterIndex + 1].title}</b><FiChevronRight /></button> : null}
      </section> : hasChapterContent ? <>
        {chapterContent}
      </> : <section className="seen-reader-empty-chapter">
        {mediaUrl(publication.coverMedia) ? <PublicationCoverMedia alt={__msg("discover.cover", { value0: publication.title })} className="seen-reader-media" controls media={publication.coverMedia} /> : null}
        <h2>{isOwner ? __msg("social.thisChapterNeedsContent") : __msg("social.thisChapterIsEmpty")}</h2>
        <p>{isOwner ? __msg("social.addTextKeyPointsHighlightsLinksOrMediaSo") : __msg("social.theCreatorHasNotAddedAnythingToThisChapter")}</p>
        {isOwner ? <Link to={`/studio/seens/${encodeURIComponent(id)}/edit?from=seen`}>{__msg("social.editThisSeen")}</Link> : null}
      </section>}
    </article>

    <footer className="seen-reader-footer">
      {publication.pricing?.mode === "ONE_TIME" ? <button className="seen-paid-unlock-row" disabled={!publication.paymentAvailable} onClick={() => publication.paymentAvailable && setPurchaseOpen(true)} type="button"><span><FiLock /> <b>✦ {Number(publication.pricing?.starsAmount || 0).toLocaleString(__uiLocale())} {__msg("profile.oneTime")}</b></span><small>{Number(publication.ownerCount || 0).toLocaleString(__uiLocale())} {__msg("profile.ownIt")}{publication.paymentAvailable ? __msg("system.SeenReaderPage.425623c6c3") : __msg("system.SeenReaderPage.2a419895f5")}</small><strong>{publication.paymentAvailable ? __msg("system.SeenFeedPage.310e3f8652") : __msg("system.SeenFeedPage.755844bc39")}</strong></button> : null}
      {safeChapterIndex === chapters.length - 1 && nextSeen ? <button className="seen-reader-up-next" onClick={openNextSeen} type="button">
        {mediaUrl(nextSeen.coverMedia) ? <PublicationCoverMedia alt="" autoPlay loop media={nextSeen.coverMedia} /> : <span aria-hidden="true"><FiEye /></span>}
        <span><small>{__msg("social.upNextFrom")} {creatorFirstName(publication.creator)}</small><strong>{nextSeen.title || __msg("social.nextSeen")}</strong><em>{nextSeen.chapters?.length || 0} {__msg("discover.chapters")}</em></span>
        <FiChevronRight aria-hidden="true" />
      </button> : null}
      <div className="seen-reader-progress-wrap">
        <div className="seen-reader-progress" aria-label={__msg("social.chapterProgress")}>
          {(chapters.length ? chapters : [chapter]).map((item, index) => <button aria-label={__msg("creator.openChapter", { value0: index + 1 })} className={index <= safeChapterIndex ? "is-active" : ""} key={item?.stableChapterId || index} onClick={() => changeChapter(index)} type="button" />)}
        </div>
        <div className="seen-reader-progress-meta"><span>{__msg("profile.chapter")} {safeChapterIndex + 1} {__msg("onboarding.of")} {chapters.length || 1}</span><button onClick={continueReader} type="button">{safeChapterIndex < chapters.length - 1 ? __msg("social.tapToContinue") : __msg("social.complete")}</button></div>
      </div>
      <SeenEngagementBar commentsOpen={commentsOpen} engagement={engagement} isOwn={isOwner} mutations={{ reaction: reactionMutation, save: saveMutation, share: shareMutation }} onCommentToggle={() => setCommentsOpen((value) => !value)} onCopyLink={() => setShareSheetOpen(true)} saved={Boolean(engagement.viewerSaved)} />
      {notice ? <p className="seen-reader-notice" role="status">{__systemMessage(notice)}{noticeLink ? <Link to={noticeLink}>{__msg("social.viewReposts")}</Link> : null}</p> : null}
    </footer>
    <SeenCommentsSheet comment={comment} currentUser={currentUser} engagement={engagement} isOpen={commentsOpen} isPending={commentMutation.isPending} onChange={(event) => setComment(event.target.value)} onClose={() => setCommentsOpen(false)} onReact={reactToComment} onSubmit={submitComment} onVoiceSubmit={submitVoiceComment} reactionPending={commentReactionMutation.isPending} title={publication.title} voicePending={voiceCommentMutation.isPending} />
    {chapterListOpen ? <div className="seen-chapter-list-layer">
      <button aria-label={__msg("social.closeChapterList")} className="seen-chapter-list-scrim" onClick={() => setChapterListOpen(false)} type="button" />
      <section aria-label={__msg("social.chaptersIn", { value0: publication.title })} aria-modal="true" className="seen-chapter-list-sheet" role="dialog" style={chapterSheetPosition || undefined}>
        <span aria-hidden="true" className="seen-chapter-list-handle" />
        <header>
          {mediaUrl(publication.coverMedia) ? <PublicationCoverMedia alt="" className="seen-chapter-list-cover" media={publication.coverMedia} /> : <span className="seen-chapter-list-cover is-fallback"><FiEye /></span>}
          <div><small>Seen</small><h2>{publication.title}</h2>{detail.description ? <p>{detail.description}</p> : null}</div>
          <button aria-label={__msg("social.closeChapterList")} onClick={() => setChapterListOpen(false)} type="button"><FiX /></button>
        </header>
        <nav aria-label={__msg("social.seenChapters")}>
          {(chapters.length ? chapters : [{ title: publication.title }]).map((item, index) => <button aria-current={index === safeChapterIndex ? "page" : undefined} className={`${index === safeChapterIndex ? "is-active" : ""} ${item.locked ? "is-locked" : ""}`} key={item.stableChapterId || index} onClick={() => { changeChapter(index); if (!item.locked) setChapterListOpen(false); }} type="button"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong>{item.locked ? <FiLock /> : index === safeChapterIndex ? <small>{__msg("social.reading")}</small> : <FiChevronRight />}</button>)}
        </nav>
        {isOwner && detail.mediaCandidates.length ? <button className="seen-chapter-list-media-action" disabled={addSeenMediaMutation.isPending} onClick={() => { setChapterListOpen(false); openMediaAdd(); }} type="button"><FiPlus /> {__msg("social.addSeenMediaToProfile")}</button> : null}
      </section>
    </div> : null}
    <SeenToMediaPicker
      addedKeys={addedSeenMediaIds}
      candidates={detail.mediaCandidates}
      isOpen={mediaPickerOpen}
      isSubmitting={addSeenMediaMutation.isPending}
      onClose={() => setMediaPickerOpen(false)}
      onSubmit={(mediaIds) => addSeenMediaMutation.mutate(mediaIds)}
    />
    <ShareSheet isOpen={shareSheetOpen} onClose={() => setShareSheetOpen(false)} payload={sharePayload} variant="seen" />
    <PurchaseWorldModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} onSuccess={() => publicationQuery.refetch()} publication={publication} />
  </section>;
}
