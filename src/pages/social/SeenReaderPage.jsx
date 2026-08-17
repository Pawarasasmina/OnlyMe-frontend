import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiBookmark, FiCheck, FiChevronRight, FiExternalLink, FiEye, FiFlag, FiLock, FiMessageCircle, FiMoreHorizontal, FiPlay, FiRepeat, FiSend, FiX } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { publicationService } from "../../services/publicationService";
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
const SEEN_REPORT_REASONS = [
  { label: "Spam", value: "SPAM" },
  { label: "False information", value: "FALSE_INFORMATION" },
  { label: "Harassment", value: "HARASSMENT" },
  { label: "Hate", value: "HATE" },
  { label: "Nudity", value: "NUDITY" },
  { label: "Illegal content", value: "ILLEGAL_CONTENT" },
  { label: "Copyright", value: "COPYRIGHT" },
  { label: "Other", value: "OTHER" },
];

function formatCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return count.toLocaleString();
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function actionError(error) {
  if (error.response?.status === 401) return "Log in to use this Seen action.";
  if (error.response?.status === 403) return "This Seen action is not available for your account.";
  return error.response?.data?.message || "Unable to complete this action.";
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

function isMediaBlock(block) {
  return ["IMAGE", "VIDEO", "AUDIO", "VOICE"].includes(block?.type);
}

function creatorName(creator = {}) {
  return creator.name || creator.displayName || creator.username || "Creator";
}

function creatorFirstName(creator = {}) {
  return creatorName(creator).split(" ")[0] || "Creator";
}

function creatorRoute(creator = {}) {
  return creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/discover";
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
      title: publication?.title || "Seen preview",
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
    title: publication?.title || "Untitled Seen",
    description: publication?.description || publication?.summary || "",
    creator: publication?.creator || {},
    heroMedia: heroMedia ? { ...heroMedia, durationSeconds: mediaDuration(heroMedia) } : null,
    previewMedia: [...previewMap.values()].slice(0, 3),
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

function MarkedText({ text, highlight, tone = "blue" }) {
  if (!highlight || !text?.includes(highlight)) return text;
  const [before, after] = text.split(highlight);
  return <>
    {before}
    <mark className={`seen-reader-mark seen-reader-mark-${tone}`}>{highlight}</mark>
    {after}
  </>;
}

function InlineMedia({ block, title }) {
  const [failed, setFailed] = useState(false);
  const url = mediaUrl(block.media);
  if (!url || failed) return <div className="seen-reader-media-fallback">@seen</div>;
  if (["VIDEO", "video"].includes(block.type) || ["VIDEO", "video"].includes(block.media?.mediaType)) {
    return <video className="seen-reader-media" controls preload="metadata" src={url} title={`${title} video`} />;
  }
  if (["AUDIO", "VOICE"].includes(block.type) || ["AUDIO", "VOICE"].includes(block.media?.mediaType)) {
    return <audio className="seen-reader-audio" controls src={url} />;
  }
  return <img alt={`${title} chapter media`} className="seen-reader-media" loading="lazy" onError={() => setFailed(true)} src={url} />;
}

function ReaderBlock({ block, title }) {
  if (block.type === "KEY_POINT") {
    return <section className="seen-reader-keypoint">
      <span>Key point</span>
      <p><MarkedText highlight={block.metadata?.highlight} text={block.text} tone={block.metadata?.highlightTone || "gold"} /></p>
    </section>;
  }
  if (block.type === "HIGHLIGHT") {
    return <p className="seen-reader-paragraph"><mark>{block.text}</mark></p>;
  }
  if (block.type === "LINK") {
    return <a className="seen-reader-link" href={block.url} rel="noreferrer" target="_blank">{block.label || block.url}<FiExternalLink /></a>;
  }
  if (["IMAGE", "VIDEO", "AUDIO", "VOICE"].includes(block.type)) {
    return <InlineMedia block={block} title={title} />;
  }
  return <p className="seen-reader-paragraph">{block.text}</p>;
}

function ChapterChecklist({ points = [] }) {
  if (points.length < 2) return null;
  return <section className="seen-reader-checklist" aria-label="Chapter checklist">
    {points.map((point) => <p key={point.id || point.text}>
      <FiCheck />
      <span><MarkedText highlight={point.metadata?.highlight} text={point.text} tone={point.metadata?.highlightTone || "green"} /></span>
    </p>)}
  </section>;
}

function OverviewSkeleton() {
  return <section className="seen-detail-page" aria-label="Loading Seen overview">
    <div className="seen-detail-skeleton-head"><span /><div><i /><b /></div><em /><em /></div>
    <div className="seen-detail-skeleton-media" />
    <div className="seen-detail-skeleton-lines"><span /><span /><span /></div>
    <div className="seen-detail-skeleton-thumbs"><span /><span /><span /></div>
    <div className="seen-detail-skeleton-row" />
    <div className="seen-detail-skeleton-row" />
  </section>;
}

function ReaderSkeleton() {
  return <div className="seen-reader-page">
    <div className="seen-reader-skeleton-head" />
    <div className="seen-reader-skeleton-card" />
    <div className="seen-reader-skeleton-media" />
    <div className="seen-reader-skeleton-lines" />
  </div>;
}

function SeenIntroMedia({ media, title }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(mediaDuration(media));
  const isVideo = media?.type === "video";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMetadata = () => setDuration(mediaDuration(media) || mediaDuration({ duration: video.duration }));
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("loadedmetadata", onMetadata);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("loadedmetadata", onMetadata);
    };
  }, [media]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  if (!media?.url) {
    return <div className="seen-detail-media-fallback" aria-label="No intro media available" />;
  }

  if (!isVideo) {
    return <div className="seen-detail-hero" aria-label={`${title || "Seen"} intro media`}>
      <img alt={`${title || "Seen"} intro media`} src={media.url} />
    </div>;
  }

  return <>
    <button aria-label={playing ? "Pause Seen intro" : "Play Seen intro"} className="seen-detail-hero" onClick={toggle} type="button">
      <video autoPlay muted playsInline poster={media.thumbnailUrl || undefined} preload="metadata" ref={videoRef} src={media.url} />
    </button>
    {isVideo ? <div className="seen-detail-playback" aria-live="polite">
      <FiPlay aria-hidden="true" />
      <span>{formatDuration(duration)} <i aria-hidden="true">\u2022</i> {playing ? "playing" : "paused"}</span>
    </div> : null}
  </>;
}

function SeenDetailMoreMenu({ onClose, onReport, onShare }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="seen-detail-sheet-layer">
    <button aria-label="Close More menu" className="seen-detail-sheet-scrim" onClick={onClose} type="button" />
    <section aria-label="More Seen actions" aria-modal="true" className="seen-detail-more-sheet" role="dialog">
      <span className="seen-detail-sheet-handle" aria-hidden="true" />
      <h2>More</h2>
      <button onClick={onShare} type="button">
        <FiSend aria-hidden="true" />
        <span>Share</span>
      </button>
      <button onClick={onReport} type="button">
        <FiFlag aria-hidden="true" />
        <span>Report Experience</span>
      </button>
    </section>
  </div>;
}

function SeenReportSheet({ error, isDone, isOpen, isSubmitting, onClose, onDone, onSelectReason }) {
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
    <button aria-label="Close report dialog" className="seen-detail-sheet-scrim" onClick={onClose} type="button" />
    <section aria-label={isDone ? "Report received" : "Report Experience"} aria-modal="true" className={isDone ? "seen-detail-report-sheet is-done" : "seen-detail-report-sheet"} role="dialog">
      <span className="seen-detail-sheet-handle" aria-hidden="true" />
      {isDone ? (
        <div className="seen-detail-report-done">
          <FiEye aria-hidden="true" />
          <h2>Thank you</h2>
          <p>Our team will review this shortly.</p>
          <button onClick={onDone} type="button">Done</button>
        </div>
      ) : (
        <>
          <h2>Report Experience</h2>
          <p>Why are you reporting this?</p>
          <div className="seen-detail-report-reasons">
            {SEEN_REPORT_REASONS.map((reason) => (
              <button disabled={isSubmitting} key={reason.value} onClick={() => onSelectReason(reason)} type="button">
                <span>{reason.label}</span>
                <FiChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
          {error ? <p className="seen-detail-report-error" role="alert">{error}</p> : null}
        </>
      )}
    </section>
  </div>;
}

function SeenOverview({
  detail,
  engagement,
  mutations,
  notice,
  noticeLink,
  onBack,
  onCopyLink,
  onOpenChapter,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState("");
  const navigate = useNavigate();
  const creator = detail.creator;
  const saved = Boolean(engagement.viewerSaved);
  const chapterWord = detail.chapters.length === 1 ? "chapter" : "chapters";
  const metadata = `${creatorFirstName(creator)} \u00b7 ${detail.chapters.length} ${chapterWord} \u00b7 ${formatCount(detail.metrics.views)} saw this`;
  const introSeconds = mediaDuration(detail.heroMedia);
  const creatorContext = detail.heroMedia?.type === "video"
    ? `${introSeconds ? `${introSeconds} seconds` : "Video intro"} \u2014 why this world exists`
    : "why this Seen exists";

  const share = () => {
    setMoreOpen(false);
    onCopyLink();
  };
  const report = () => {
    setMoreOpen(false);
    setReportDone(false);
    setReportOpen(true);
    setReportError("");
  };
  const closeReport = () => {
    setReportOpen(false);
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

  return <>
  <section className="seen-detail-page">
    <header className="seen-detail-header">
      <button aria-label="Back to Seen" className="seen-detail-circle" onClick={onBack} type="button"><FiArrowLeft /></button>
      <div className="seen-detail-title">
        <h1>{detail.title}</h1>
        <p>{metadata}</p>
      </div>
      <button
        aria-label={saved ? "Remove Seen from Saved" : "Save Seen"}
        className={saved ? "is-active seen-detail-circle" : "seen-detail-circle"}
        disabled={mutations.save.isPending}
        onClick={() => mutations.save.mutate()}
        type="button"
      >
        <FiBookmark fill={saved ? "currentColor" : "none"} />
      </button>
      <div className="seen-detail-more-wrap">
        <button aria-expanded={moreOpen} aria-label="More Seen actions" className="seen-detail-circle" onClick={() => setMoreOpen((value) => !value)} type="button"><FiMoreHorizontal /></button>
        {moreOpen ? <SeenDetailMoreMenu onClose={() => setMoreOpen(false)} onReport={report} onShare={share} /> : null}
      </div>
    </header>

    <SeenIntroMedia media={detail.heroMedia} title={detail.title} />

    <div className="seen-detail-body">
      <Link className="seen-detail-creator" to={creatorRoute(creator)}>
        <FanAvatar name={creatorName(creator)} size="h-[30px] w-[30px]" src={creator.avatar} />
        <span>
          <strong>{creatorName(creator)}{creator.verified ? <VerifiedBadge className="seen-detail-verified" /> : null}</strong>
          <small>{creatorContext}</small>
        </span>
      </Link>

      {detail.description ? <p className="seen-detail-description">{detail.description}</p> : null}
      <button className="seen-detail-reply" onClick={() => navigate(`/create/seen?replyToSeenId=${encodeURIComponent(detail.id)}`)} type="button">
        <span aria-hidden="true">\u21aa</span> Reply with your Seen
      </button>

      {detail.previewMedia.length ? <div className="seen-detail-preview-grid">
        {detail.previewMedia.map((item, index) => (
          <button aria-label={`Open ${item.title || detail.title} preview`} key={item.url} onClick={() => onOpenChapter(item.chapterIndex || 0)} type="button">
            <img alt={`${detail.title} preview ${index + 1}`} loading="lazy" src={item.thumbnailUrl || item.url} />
            {item.type === "video" ? <span><FiPlay aria-hidden="true" /></span> : null}
          </button>
        ))}
      </div> : null}

      <h2 className="seen-detail-journey-label">THE JOURNEY</h2>
      {detail.chapters.length ? <div className="seen-detail-journey-list">
        {detail.chapters.map((chapter, index) => {
          const locked = Boolean(chapter.locked);
          return (
            <button
              aria-label={locked ? `${chapter.title} is locked` : `Open ${chapter.title}`}
              className={locked ? "is-locked" : ""}
              disabled={locked}
              key={chapter.stableChapterId || index}
              onClick={() => onOpenChapter(index)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{chapter.title || `Chapter ${index + 1}`}</strong>
              {locked ? <FiLock aria-hidden="true" /> : <em aria-hidden="true">\u203a</em>}
            </button>
          );
        })}
      </div> : <p className="seen-detail-empty">No chapters yet.</p>}

      {notice ? <p className="seen-detail-notice" role="status">{notice}{noticeLink ? <Link to={noticeLink}>View reposts</Link> : null}</p> : null}
    </div>
  </section>
  <SeenReportSheet
    error={reportError}
    isDone={reportDone}
    isOpen={reportOpen}
    isSubmitting={mutations.report.isPending}
    onClose={closeReport}
    onDone={closeReport}
    onSelectReason={submitReport}
  />
  </>;
}

export default function SeenReaderPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const readerTopRef = useRef(null);
  const hasChapterParam = searchParams.has("chapter");
  const requestedChapter = Number(searchParams.get("chapter"));
  const [chapterIndex, setChapterIndex] = useState(Number.isSafeInteger(requestedChapter) && requestedChapter >= 0 ? requestedChapter : 0);
  const [comment, setComment] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeLink, setNoticeLink] = useState("");

  const publicationQuery = useQuery({
    queryKey: ["seen-detail", id],
    queryFn: () => publicationService.getPublicPublication(id).then((response) => response.data.data.publication),
    retry: false,
  });
  const engagementQuery = useQuery({
    queryKey: ["seen-engagement", id],
    queryFn: () => publicationService.getSeenEngagement(id).then((response) => response.data.data.engagement),
    retry: false,
  });

  const publication = publicationQuery.data;
  const engagement = engagementQuery.data || DEFAULT_ENGAGEMENT;
  const detail = useMemo(() => normalizeSeenDetail(publication, engagement), [publication, engagement]);
  const chapters = detail.chapters;
  const safeChapterIndex = Math.min(Math.max(chapterIndex, 0), Math.max(chapters.length - 1, 0));
  const chapter = chapters[safeChapterIndex] || null;
  const visibleBlocks = chapter?.blocks || [];
  const pointBlocks = visibleBlocks.filter((block) => ["KEY_POINT", "HIGHLIGHT"].includes(block.type) && block.text?.trim());
  const explicitChecklistPoints = pointBlocks.filter((block) => block.metadata?.presentation === "CHECKLIST");
  const checklistPoints = explicitChecklistPoints.length >= 2 ? explicitChecklistPoints : pointBlocks.length >= 3 ? pointBlocks.slice(1, 5) : [];
  const checklistIds = new Set(checklistPoints.map(blockKey));
  const hasInlineMedia = visibleBlocks.some(isMediaBlock);
  const hasChapterContent = visibleBlocks.some((block) => block.text?.trim() || block.url || block.media?.secureUrl);
  const usefulActive = Boolean(engagement.viewerReaction);
  const selectedReaction = reactionEmoji[engagement.viewerReaction] || reactionEmoji.LIKE;
  const shareUrl = useMemo(() => (typeof window === "undefined" ? "" : `${window.location.origin}/seen/${id}`), [id]);

  const syncSeenEngagementCaches = (next) => {
    if (!next) return;
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
    if (!chapters.length || !hasChapterParam) return;
    const next = Math.min(Math.max(Number.isSafeInteger(requestedChapter) ? requestedChapter : 0, 0), chapters.length - 1);
    setChapterIndex(next);
    if (String(next) !== searchParams.get("chapter")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("chapter", String(next));
      setSearchParams(nextParams, { replace: true });
    }
  }, [chapters.length, hasChapterParam, requestedChapter, searchParams, setSearchParams]);

  useEffect(() => {
    if (!publication || !hasChapterParam || chapters.length) return;
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [chapters.length, hasChapterParam, publication, setSearchParams]);

  useEffect(() => {
    if (!hasChapterParam) return;
    window.requestAnimationFrame(() => {
      readerTopRef.current?.scrollIntoView({ block: "start" });
    });
  }, [hasChapterParam, safeChapterIndex]);

  const updateEngagement = async (request) => {
    try {
      const response = await request;
      const next = response.data.data.engagement;
      syncSeenEngagementCaches(next);
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
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

  const reactionMutation = useMutation({ mutationFn: () => updateEngagement(engagement.viewerReaction ? publicationService.removeSeenReaction(id) : publicationService.reactToSeen(id, "LIKE")) });
  const shareMutation = useMutation({
    mutationFn: () => updateEngagement(engagement.viewerShared ? publicationService.removeSeenShare(id) : publicationService.shareSeen(id)),
    onSuccess: (next) => {
      if (next.viewerShared) {
        setNotice("Reposted to your profile.");
        setNoticeLink("/profile?tab=reposts");
      } else {
        setNotice("Removed from your profile.");
      }
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => updateEngagement(publicationService.toggleSeenSave(id)),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["seen-engagement", id] });
      const previous = queryClient.getQueryData(["seen-engagement", id]) || engagement || DEFAULT_ENGAGEMENT;
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
    mutationFn: (text) => updateEngagement(publicationService.commentOnSeen(id, text)),
    onSuccess: () => {
      setComment("");
      setCommentsOpen(true);
    },
  });
  const reportMutation = useMutation({
    mutationFn: (payload) => publicationService.reportSeen(id, payload),
    retry: false,
  });

  const submitComment = (event) => {
    event.preventDefault();
    const text = comment.trim();
    if (text) commentMutation.mutate(text);
  };
  const copyLink = async () => {
    if (navigator.share && publication) {
      try {
        await navigator.share({ title: publication.title || "Seen", url: shareUrl });
        return;
      } catch {
        // Fall through to clipboard when native share is cancelled or unavailable.
      }
    }
    await navigator.clipboard?.writeText(shareUrl);
    setNotice("Seen link copied.");
  };
  const changeChapter = (nextIndex) => {
    const next = Math.min(Math.max(nextIndex, 0), Math.max(chapters.length - 1, 0));
    setChapterIndex(next);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("chapter", String(next));
    setSearchParams(nextParams, { replace: true });
  };
  const openChapter = (nextIndex) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("chapter", String(nextIndex));
    setSearchParams(nextParams, { replace: false });
  };
  const backFromOverview = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/seen");
  };

  if (publicationQuery.isLoading) return hasChapterParam ? <ReaderSkeleton /> : <OverviewSkeleton />;
  if (publicationQuery.isError || !publication) return <div className="seen-reader-page"><section className="seen-reader-error"><h1>This Seen is not available.</h1><Link to="/seen">Back to Seen</Link></section></div>;

  if (!hasChapterParam) {
    return <SeenOverview
      detail={detail}
      engagement={engagement}
      mutations={{ save: saveMutation, share: shareMutation, report: reportMutation }}
      notice={notice}
      noticeLink={noticeLink}
      onBack={backFromOverview}
      onCopyLink={copyLink}
      onOpenChapter={openChapter}
    />;
  }

  let renderedChecklist = false;
  const chapterContent = visibleBlocks.flatMap((block) => {
    if (checklistIds.has(blockKey(block))) {
      if (renderedChecklist) return [];
      renderedChecklist = true;
      return [<ChapterChecklist key="chapter-checklist" points={checklistPoints} />];
    }
    return [<ReaderBlock block={block} key={blockKey(block)} title={publication.title} />];
  });

  return <section className="seen-reader-page" ref={readerTopRef}>
    <header className="seen-reader-header">
      <button aria-label="Back to Seen overview" className="seen-reader-circle" onClick={() => navigate(`/seen/${id}`, { replace: true })} type="button"><FiArrowLeft /></button>
      <div className="seen-reader-titleblock">
        <span>Chapter {safeChapterIndex + 1} of {chapters.length || 1} {"\u00b7"} {publication.title}</span>
        <h1>{chapter?.title || publication.title}</h1>
      </div>
      <button aria-label={engagement.viewerSaved ? "Unpin Seen" : "Pin Seen"} className={engagement.viewerSaved ? "is-active seen-reader-circle" : "seen-reader-circle"} disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button"><FiBookmark fill={engagement.viewerSaved ? "currentColor" : "none"} /></button>
    </header>

    <div className="seen-reader-progress" aria-label="Chapter progress">
      {(chapters.length ? chapters : [chapter]).map((item, index) => <button aria-label={`Open chapter ${index + 1}`} className={index <= safeChapterIndex ? "is-active" : ""} key={item?.stableChapterId || index} onClick={() => changeChapter(index)} type="button" />)}
    </div>

    <article className="seen-reader-content">
      {hasChapterContent ? <>
        {chapterContent}
        {!hasInlineMedia && publication.coverMedia?.secureUrl ? <img alt={`${publication.title} cover`} className="seen-reader-media" loading="lazy" src={mediaUrl(publication.coverMedia)} /> : null}
      </> : <section className="seen-reader-empty-chapter">
        {publication.coverMedia?.secureUrl ? <img alt={`${publication.title} cover`} className="seen-reader-media" loading="lazy" src={mediaUrl(publication.coverMedia)} /> : null}
        <h2>This chapter needs content</h2>
        <p>{publication.summary || "Add text, key points, highlights, links, or media blocks to this chapter so readers have something to step through."}</p>
        <Link to="/studio/seens">Open Seen manager</Link>
      </section>}
    </article>

    <footer className="seen-reader-footer">
      <div className="seen-reader-actions">
        <button aria-label={usefulActive ? "Remove reaction" : "Mark useful"} className={usefulActive ? "is-active" : ""} disabled={reactionMutation.isPending} onClick={() => reactionMutation.mutate()} type="button"><span>{selectedReaction}</span><b>Useful</b><small>{formatCount(engagement.reactionCount)}</small></button>
        <button aria-expanded={commentsOpen} aria-label="Open comments" className={commentsOpen ? "is-active" : ""} onClick={() => setCommentsOpen((value) => !value)} type="button"><FiMessageCircle /><small>{formatCount(engagement.commentCount)}</small></button>
        <button aria-label={engagement.viewerShared ? "Remove repost" : "Repost Seen"} className={engagement.viewerShared ? "is-active" : ""} disabled={shareMutation.isPending} onClick={() => shareMutation.mutate()} type="button"><FiRepeat /><small>{formatCount(engagement.shareCount)}</small></button>
        <button aria-label="Share Seen link" onClick={copyLink} type="button"><FiSend /></button>
        <span><FiEye /><small>{formatCount(engagement.viewCount || 0)}</small></span>
      </div>
      {notice ? <p className="seen-reader-notice" role="status">{notice}{noticeLink ? <Link to={noticeLink}>View reposts</Link> : null}</p> : null}
      {commentsOpen ? <section className="seen-reader-comments">
        <form onSubmit={submitComment}>
          <input aria-label="Add a Seen comment" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." value={comment} />
          <button disabled={!comment.trim() || commentMutation.isPending} type="submit">Post</button>
        </form>
        {(engagement.comments || []).map((item) => <article key={item.id}>
          <strong>{item.author?.name || "Fan"}</strong>
          <p>{item.text}</p>
        </article>)}
      </section> : null}
      <div className="seen-reader-nav">
        {safeChapterIndex < chapters.length - 1 ? <button onClick={() => changeChapter(safeChapterIndex + 1)} type="button">Next {"\u2192"}</button> : <strong>Seen complete</strong>}
        <button aria-label="Close Seen reader" onClick={() => navigate(`/seen/${id}`, { replace: true })} type="button"><FiX /></button>
      </div>
    </footer>
  </section>;
}
