import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiArrowUp,
  FiBarChart2,
  FiBookmark,
  FiCheck,
  FiEdit3,
  FiEye,
  FiExternalLink,
  FiImage,
  FiLink,
  FiLock,
  FiMapPin,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiSettings,
  FiShield,
  FiTrash2,
  FiVideo,
} from "react-icons/fi";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
import PremiumWelcomeSheet from "../../components/financial/PremiumWelcomeSheet";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";
import ShareSheet from "../../components/share/ShareSheet";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
import { savedService } from "../../services/savedService";
import { walletService } from "../../services/walletService";

const PLANET = String.fromCodePoint(0x1FA90);
const FLEX = String.fromCodePoint(0x1F4AA);
const STAR = String.fromCharCode(10022);

function firstName(value = "") {
  return String(value).trim().split(/\s+/)[0] || "Creator";
}

function mediaFor(publication, chapters) {
  if (publication?.coverMedia?.secureUrl) return publication.coverMedia;
  return chapters
    .flatMap((chapter) => chapter.blocks || [])
    .find((block) => block.media?.secureUrl)?.media || null;
}

function storyItems(publication, chapters, audience = "FREE") {
  const storyPreviewMedia = chapters
    .filter((chapter) => publication?.kind === "EXPERIENCE" || (audience === "FREE" ? chapter.isPreview : !chapter.isPreview && !chapter.locked))
    .flatMap((chapter) =>
    (chapter.blocks || [])
      .filter((block) => block.metadata?.storyPreview && ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl)
      .map((block) => ({ ...block.media, title: block.metadata?.label || chapter.title })),
  );
  if (storyPreviewMedia.length) return storyPreviewMedia.slice(0, 3);

  if (audience === "SUBSCRIBER") return [];

  const chapterMedia = chapters.flatMap((chapter) =>
    (chapter.blocks || [])
      .filter((block) => ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl)
      .map((block) => ({ ...block.media, title: chapter.title })),
  );
  return [publication?.coverMedia, ...chapterMedia].filter(Boolean).slice(0, 3);
}

function steppedInside(publication, engagement) {
  return Number(
    publication?.steppedInside ||
    publication?.viewCount ||
    publication?.views ||
    publication?.metrics?.views ||
    engagement?.viewCount ||
    engagement?.views ||
    0,
  );
}

function chapterIsLocked(chapter, premium, index) {
  return Boolean(chapter?.locked || (premium && index > 0 && !chapter?.isPreview));
}

function WorldMedia({ media, owner, title, onEdit }) {
  const isVideo = ["video", "VIDEO"].includes(media?.resourceType || media?.mediaType || media?.type);
  return (
    <div className="world-prototype-media">
      {media?.secureUrl ? (
        isVideo ? <video muted playsInline src={media.secureUrl} /> : <img alt={`${title} cover`} src={media.secureUrl} />
      ) : (
        <span className="world-prototype-media-empty">{PLANET}</span>
      )}
      {owner ? <button aria-label="Edit cover media" className="world-prototype-media-edit" onClick={onEdit} type="button"><FiEdit3 /></button> : null}
      {isVideo ? <span className="world-prototype-video-time"><FiVideo /> 0:30</span> : null}
    </div>
  );
}

function WorldChapterList({ canAccessPremium, chapters, collapsible = false, editTarget, expanded = true, onOpen, onToggle, owner, premium }) {
  return (
    <section className="world-prototype-experience">
      <div className="world-prototype-section-head">
        <h2>Experience</h2>
        <span>{chapters.length} / 10 chapters - {premium ? `${PLANET} Premium` : "Free World"}</span>
      </div>
      {collapsible && !expanded ? <button className="experience-owner-chapter-toggle" onClick={onToggle} type="button">Chapters · {chapters.length} <span>⌄</span></button> : null}
      {expanded ? <div className="world-prototype-chapters">
        {chapters.slice(0, 10).map((chapter, index) => {
          const memberChapter = premium && index > 0 && !chapter?.isPreview;
          const locked = !canAccessPremium && chapterIsLocked(chapter, premium, index);
          return (
            <button className="world-prototype-chapter-row" key={chapter.stableChapterId || `${chapter.title}-${index}`} onClick={() => onOpen(index)} type="button">
              <span>{index + 1}</span>
              <span>
                <b>{chapter.title || `Chapter ${index + 1}`}</b>
                <small>
                  {owner ? <strong>+ Write the story</strong> : locked ? "Locked chapter" : memberChapter ? "Open member chapter" : "Open chapter"}
                  {" - "}
                  {owner && memberChapter ? <><FiLock /> private</> : locked ? <><FiLock /> private</> : <em>{memberChapter ? "member access" : "free preview"}</em>}
                  {locked && owner ? " - schedule" : null}
                </small>
              </span>
              <i>›</i>
            </button>
          );
        })}
      </div> : null}
      {collapsible && expanded ? <button className="experience-owner-hide" onClick={onToggle} type="button">Hide <span>⌃</span></button> : null}
      {owner ? <Link className="world-prototype-add-chapter" to={editTarget}><FiPlus /> Add a chapter</Link> : null}
    </section>
  );
}

function WorldStories({ canViewSubscriberStories, chapters, onJoin, onOpen, owner, stories, subscriberStories }) {
  return (
    <>
      <section className="world-prototype-story-previews">
        <div className="world-prototype-section-head is-compact">
          <h2>Free preview stories</h2>
          <span>visible before subscription</span>
        </div>
        <div>
          {stories.length ? stories.map((story, index) => (
            <button className="world-prototype-story-thumb" key={`${story.assetId || story.secureUrl}-${index}`} onClick={() => onOpen(Math.min(index, chapters.length - 1))} type="button">
              {story.resourceType === "video" ? <video muted src={story.secureUrl} /> : <img alt={story.title || "World story"} src={story.secureUrl} />}
            </button>
          )) : null}
          {owner ? (
            <button className="world-prototype-story-add" type="button">
              <FiPlus />
              <span>add</span>
            </button>
          ) : null}
        </div>
      </section>

      <section className="world-prototype-story-rings">
        <h2><FiLock /> Subscriber stories</h2>
        <div>
          {canViewSubscriberStories ? subscriberStories.map((story, index) => (
            <button className="is-active" key={`${story.assetId || story.secureUrl}-${index}`} onClick={() => onOpen(Math.min(index + 1, chapters.length - 1))} type="button">
              {story.resourceType === "video" ? <video muted playsInline src={story.secureUrl} /> : <img alt={story.title || `Subscriber story ${index + 1}`} src={story.secureUrl} />}
              <span>{story.title || `Story ${index + 1}`}</span>
            </button>
          )) : (
            <button className="world-prototype-subscriber-story-lock" onClick={onJoin} type="button"><FiLock /><span>Subscribe to view</span></button>
          )}
          {owner ? <button type="button"><FiPlus /><span>New</span></button> : null}
        </div>
      </section>
    </>
  );
}

function ChapterBlock({ block }) {
  if (["TEXT", "HIGHLIGHT"].includes(block.type)) return <p className={`world-chapter-reader-text ${block.type === "HIGHLIGHT" ? "is-highlight" : ""}`}>{block.text}</p>;
  if (block.type === "KEY_POINT") return <div className="world-chapter-reader-point"><FiCheck /><span>{block.text}</span></div>;
  if (block.type === "IMAGE" && block.media?.secureUrl) return <img alt="Chapter attachment" className="world-chapter-reader-image" src={block.media.secureUrl} />;
  if (block.type === "VIDEO" && block.media?.secureUrl) return <video className="world-chapter-reader-video" controls playsInline preload="metadata" src={block.media.secureUrl} />;
  if (["AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl) return <audio className="world-chapter-reader-audio" controls preload="metadata" src={block.media.secureUrl} />;
  if (block.type === "LINK" && block.url) return <a className="world-chapter-reader-link" href={block.url} rel="noreferrer" target="_blank">{block.label || "Open link"} <FiExternalLink /></a>;
  if (block.type === "POLL") return <ChapterPoll block={block} />;
  return null;
}

function ChapterPoll({ block }) {
  const { id } = useParams();
  const { user } = useAuth();
  const chapterId = block.chapterId;
  const poll = useQuery({ queryKey: ["publication-poll", id, chapterId, block.id], queryFn: () => api.getPoll(id, chapterId, block.id).then((response) => response.data.data), enabled: Boolean(id && chapterId), retry: false });
  const [busy, setBusy] = useState(false);
  const vote = async (optionIndex) => {
    if (!user) return;
    setBusy(true);
    try { const result = await api.votePoll(id, chapterId, block.id, optionIndex).then((response) => response.data.data); poll.refetch(); return result; } finally { setBusy(false); }
  };
  const resultsVisible = poll.data?.resultsVisible !== false;
  const total = resultsVisible ? poll.data?.totalVotes || 0 : 0;
  return <section className="world-chapter-reader-poll"><h3>{block.metadata?.question}</h3><div>{(block.metadata?.options || []).map((option, index) => { const count = resultsVisible ? poll.data?.counts?.[index] || 0 : 0; const percent = total ? Math.round(count * 100 / total) : 0; const selected = poll.data?.viewerChoice === index; return <button className={selected ? "is-selected" : ""} disabled={busy || !user} key={option} onClick={() => vote(index)} type="button"><span className="world-poll-fill" style={{ width: `${percent}%` }} /><span>{option}</span><b>{resultsVisible && total ? `${percent}%` : ""}</b></button>; })}</div><p>{!user ? "Sign in to vote" : resultsVisible ? `${total} ${total === 1 ? "vote" : "votes"} · you can change your answer` : poll.data?.viewerChoice == null ? "Results are private to the creator" : "Vote saved · results are private to the creator"}</p></section>;
}

function ChapterExperience({ chapter, chapterIndex, chapters, onBack, onSelect }) {
  const blocks = [...(chapter.blocks || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map((block) => ({ ...block, chapterId: chapter.stableChapterId }));
  const nextIndex = chapterIndex + 1 < chapters.length ? chapterIndex + 1 : null;
  return (
    <article className="world-chapter-reader">
      <header className="world-chapter-reader-head">
        <button aria-label="Back to Planet" onClick={onBack} type="button"><FiArrowLeft /></button>
        <div>
          <small>Chapter {chapterIndex + 1} of {chapters.length} · The experience</small>
          <h1>{chapter.title || `Chapter ${chapterIndex + 1}`}</h1>
        </div>
        <span><FiMapPin /></span>
      </header>
      <nav aria-label="Chapter progress" className="world-chapter-reader-progress">
        {chapters.map((item, index) => <button aria-label={`Open chapter ${index + 1}`} className={index === chapterIndex ? "is-current" : ""} key={item.stableChapterId || index} onClick={() => onSelect(index)} type="button" />)}
      </nav>
      <section className="world-chapter-reader-content">
        {blocks.length ? blocks.map((block, index) => <ChapterBlock block={block} key={block.id || index} />) : <p className="world-chapter-reader-empty">This chapter has no published content yet.</p>}
      </section>
      <footer className="world-chapter-reader-actions">
        {nextIndex !== null ? <button className="is-next" onClick={() => onSelect(nextIndex)} type="button">Next →</button> : <button className="is-next" onClick={onBack} type="button">Back to Planet</button>}
        <button aria-label="Close chapter" onClick={onBack} type="button">×</button>
      </footer>
    </article>
  );
}

function ExperienceViewer({ chapters, media, onClose, onOpenChapter, preview, publication }) {
  const isVideo = ["video", "VIDEO"].includes(media?.resourceType || media?.mediaType || media?.type);
  const premium = publication.pricing?.mode === "ONE_TIME";
  return (
    <article className="experience-viewer-page">
      <header className="experience-viewer-head">
        <button aria-label="Close Experience" onClick={onClose} type="button">×</button>
        <span>{preview ? "Preview" : "Experience"}</span>
      </header>
      <main>
        <div className="experience-viewer-media">
          {media?.secureUrl ? isVideo ? <video controls playsInline preload="metadata" src={media.secureUrl} /> : <img alt={`${publication.title} cover`} src={media.secureUrl} /> : <span>{STAR}</span>}
          {isVideo ? <small><FiVideo /> {media.duration ? `0:${String(Math.round(media.duration)).padStart(2, "0")}` : "0:30"}</small> : null}
        </div>
        <h1>{publication.title}</h1>
        <p>{publication.experiencePath || publication.description || publication.summary}</p>
        {publication.category ? <span className="experience-viewer-category">{publication.category}</span> : null}
        <section className="experience-viewer-chapters">
          {chapters.map((chapter, index) => {
            const locked = Boolean(chapter.locked || (premium && index > 0));
            return (
              <button key={chapter.stableChapterId || `${chapter.title}-${index}`} onClick={() => onOpenChapter(index)} type="button">
                <i>{index + 1}</i>
                <strong>{chapter.title || `Chapter ${index + 1}`}</strong>
                {locked ? <FiLock /> : <em>Free</em>}
                <b>›</b>
              </button>
            );
          })}
        </section>
      </main>
    </article>
  );
}

function ExperienceAnalyticsSheet({ insights = {}, loading, onClose, publication }) {
  const [position, setPosition] = useState(undefined);
  useEffect(() => {
    const center = document.querySelector(".social-center-scroll");
    if (!center) return undefined;
    const update = () => { const bounds = center.getBoundingClientRect(); setPosition({ "--experience-sheet-x": `${bounds.left + bounds.width / 2}px`, "--experience-sheet-width": `${bounds.width}px` }); };
    update(); window.addEventListener("resize", update); const observer = new ResizeObserver(update); observer.observe(center);
    return () => { window.removeEventListener("resize", update); observer.disconnect(); };
  }, []);
  const bars = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    return Number((insights.dailyViews || []).find((row) => row._id === key)?.value || 0);
  });
  const max = Math.max(1, ...bars);
  const views = Number(insights.opens || insights.views || 0);
  const completion = views ? Math.min(100, Math.round(Number(insights.walked || 0) * 100 / views)) : 0;
  return <div className="experience-analytics-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation" style={position}><section aria-modal="true" className="experience-analytics-sheet" role="dialog"><button aria-label="Close analytics" className="experience-analytics-handle" onClick={onClose} type="button" /><small>{publication.title}</small>{loading ? <p className="experience-analytics-loading">Loading analytics…</p> : <>
    <div className="experience-analytics-total"><strong>${Number(insights.revenueUsd || 0).toFixed(2)}</strong><span>earned</span><em>{STAR}{Number(insights.revenueStars || 0).toLocaleString()} total</em></div>
    <p><b>Today</b> · {bars[6]} views</p>
    <div className="experience-analytics-chart">{bars.map((value, index) => <i key={index} style={{ height: `${Math.max(8, value / max * 100)}%` }} />)}</div>
    <div className="experience-analytics-axis"><span>7 days ago</span><span>today</span></div>
    <h3>Funnel</h3><div className="experience-analytics-meter"><span>Views <b>{views.toLocaleString()}</b></span><i><b style={{ width: "100%" }} /></i></div><div className="experience-analytics-meter"><span>Own it <b>{Number(insights.ownerCount || 0).toLocaleString()}</b></span><i><b style={{ width: `${views ? Math.min(100, Number(insights.ownerCount || 0) * 100 / views) : 0}%` }} /></i></div>
    <h3>Inside</h3><div className="experience-analytics-meter"><span>Read to the end <b>{completion}%</b></span><i><b style={{ width: `${completion}%` }} /></i></div>
    <div className="experience-analytics-stats"><span><b>{Number(insights.comments || 0)}</b><small>Comments</small></span><span><b>{Number(insights.shares || 0)}</b><small>Shared</small></span><span><b>{bars.reduce((sum, value) => sum + value, 0)}</b><small>This week</small></span><span><b>{Number(insights.priceStars || 0)}</b><small>Price</small></span></div><footer>Only you see this</footer>
  </>}</section></div>;
}

export default function WorldReaderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const visitorPreviewRequested = new URLSearchParams(location.search).get("preview") === "visitor";
  const [comment, setComment] = useState("");
  const [activeChapterIndex, setActiveChapterIndex] = useState(null);
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  const [showExperienceUnlock, setShowExperienceUnlock] = useState(false);
  const [commentSavePending, setCommentSavePending] = useState("");
  const [ownerChaptersExpanded, setOwnerChaptersExpanded] = useState(false);
  const [ownerShareOpen, setOwnerShareOpen] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [ownerAnalyticsOpen, setOwnerAnalyticsOpen] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const query = useQuery({ queryKey: ["world", id, visitorPreviewRequested ? "visitor-preview" : "public"], queryFn: () => (visitorPreviewRequested ? api.getMyPublication(id) : api.getPublicPublication(id)).then((response) => response.data.data.publication), retry: false });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), enabled: Boolean(user), retry: false });
  const engagement = useQuery({ queryKey: ["world-engagement", id], queryFn: () => api.getSeenEngagement(id).then((response) => response.data.data.engagement), retry: false });
  const ownerInsights = useQuery({ queryKey: ["experience-insights", id], queryFn: () => api.getSeenInsights(id).then((response) => response.data.data.insights), enabled: ownerAnalyticsOpen, retry: false });

  const publication = query.data;
  const publicationId = publication?.id || publication?._id;
  const chapters = useMemo(() => publication?.chapters || [], [publication]);
  const premium = publication?.kind === "PREMIUM_WORLD";
  const experience = publication?.kind === "EXPERIENCE";
  const membership = memberships.data?.find((item) => String(item.premiumPublication?._id || item.premiumPublication?.id) === String(publicationId));
  const actualOwner = String(user?.id || user?._id || "") === String(publication?.creator?.id || publication?.creator?._id || "");
  const visitorPreview = actualOwner && visitorPreviewRequested;
  const owner = actualOwner && !visitorPreview;
  const media = mediaFor(publication, chapters);
  const canViewSubscriberStories = owner || ["ACTIVE_PREMIUM_MEMBER", "ENTITLED_EXPERIENCE"].includes(publication?.access);
  const activeMembership = membership && ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(membership.status) && new Date(membership.currentPeriodEnd) > new Date() ? membership : null;
  const stories = storyItems(publication, chapters, "FREE");
  const subscriberStories = storyItems(publication, chapters, "SUBSCRIBER");
  const views = steppedInside(publication, engagement.data);
  const creatorName = publication?.creator?.name || publication?.creator?.displayName || publication?.creator?.username || "Creator";
  const ownerSharePayload = useMemo(() => ({ author: { avatarUrl: publication?.creator?.avatar || "", id: publication?.creator?.id || "", name: creatorName, username: publication?.creator?.username || "" }, contentId: publicationId, contentType: "experience", destinationRoute: `/experience/${encodeURIComponent(publicationId || "")}`, imageUrl: publication?.coverMedia?.secureUrl || "", textPreview: publication?.experiencePath || publication?.description || "", title: publication?.title || "Experience" }), [creatorName, publication, publicationId]);
  useEffect(() => { if (publication) setCommentsEnabled(publication.commentsEnabled !== false); }, [publication]);

  if (query.isLoading) return <div className="world-prototype-state">Opening planet...</div>;
  if (query.isError || !publication) return <div className="world-prototype-state"><h1>World unavailable</h1><p>It may be unpublished, archived, or missing.</p></div>;

  /* Obsolete availability overlay removed.
    description={experience
      ? "Experiences will let you follow a creator’s structured journey chapter by chapter, with free and permanent-unlock options."
      : "Worlds will be private creator spaces with premium chapters, stories, and closer subscriber access."}
    highlights={experience
      ? ["Step-by-step chapters", "Rich photos, video, and voice", "Keep premium access permanently"]
      : ["Exclusive creator stories", "Premium member chapters", "A closer community space"]}
    icon={experience ? "✦" : "🪐"}
    title={experience ? "Experience viewing" : "World viewing"}
  */

  if (premium && !owner && !canViewSubscriberStories) {
    return (
      <article className="premium-locked-page">
        <JoinPremiumModal
          authenticated={Boolean(user)}
          onClose={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
          onRequireAuth={() => navigate("/login", { state: { from: { pathname: location.pathname } } })}
          onSuccess={async () => {
            await Promise.all([query.refetch(), memberships.refetch()]);
            setShowPremiumWelcome(true);
          }}
          open
          publication={publication}
        />
      </article>
    );
  }

  if (activeChapterIndex !== null && chapters[activeChapterIndex]) {
    return <ChapterExperience chapter={chapters[activeChapterIndex]} chapterIndex={activeChapterIndex} chapters={chapters} onBack={() => setActiveChapterIndex(null)} onSelect={setActiveChapterIndex} />;
  }

  const openChapter = (index) => {
    const chapter = chapters[index];
    if (!chapter) return;
    const locked = experience
      ? publication.pricing?.mode === "ONE_TIME" && index > 0
      : chapterIsLocked(chapter, premium, index);
    if (locked && !canViewSubscriberStories) {
      if (!user) return navigate("/login", { state: { from: { pathname: location.pathname } } });
      if (experience) setShowExperienceUnlock(true);
      return;
    }
    setActiveChapterIndex(index);
  };

  const addComment = async (event) => {
    event.preventDefault();
    const value = comment.trim();
    if (!value) return;
    await api.commentOnSeen(publicationId, value);
    setComment("");
    engagement.refetch();
  };

  const toggleCommentSave = async (targetComment) => {
    if (!targetComment?.id || commentSavePending) return;
    setCommentSavePending(targetComment.id);
    try {
      const action = targetComment.viewerSaved ? savedService.unsaveComment : savedService.saveComment;
      const response = await action(targetComment.id);
      const nextSaved = Boolean(response.data?.data?.saved);
      queryClient.setQueryData(["world-engagement", id], (current) => current ? {
        ...current,
        comments: (current.comments || []).map((item) => item.id === targetComment.id ? { ...item, viewerSaved: nextSaved } : item),
      } : current);
      queryClient.invalidateQueries({ queryKey: ["saved"] });
    } finally {
      setCommentSavePending("");
    }
  };

  const completeWorld = async () => {
    localStorage.setItem(`atseen_walked_world_${publicationId}`, new Date().toISOString());
    if (user) {
      await api.markWorldWalked(publicationId).catch(() => null);
      queryClient.invalidateQueries({ queryKey: ["saved"] });
    }
    navigate(experience && publication.creator?.username ? `/profile/${publication.creator.username}` : "/seen", { state: { walkedWorld: { id: publicationId, title: publication.title, creator: publication.creator } } });
  };

  if (experience && !owner) {
    return (
      <>
        <ExperienceViewer
          chapters={chapters}
          media={media}
          onClose={() => visitorPreview ? navigate(-1) : navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
          onOpenChapter={openChapter}
          preview={visitorPreview}
          publication={publication}
        />
        <PurchaseWorldModal onClose={() => setShowExperienceUnlock(false)} onSuccess={() => query.refetch()} open={showExperienceUnlock} publication={publication} />
      </>
    );
  }

  if (experience && owner) {
    const archiveExperience = async () => {
      const owned = await api.getMyPublication(publicationId).then((response) => response.data.data.publication);
      await api.archivePublication(publicationId, owned.statusVersion);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/profile", { replace: true });
    };
    if (ownerMenuOpen) return <article className="experience-owner-menu-page"><header><button aria-label="Back to Experience" onClick={() => setOwnerMenuOpen(false)} type="button"><FiArrowLeft /></button><div><h1>{publication.title}</h1><p>Premium Experience · {STAR}{publication.pricing?.starsAmount || 0} · one-time</p></div></header><nav>
      <button onClick={() => { setOwnerMenuOpen(false); setOwnerShareOpen(true); }} type="button"><FiExternalLink /><span><strong>Share</strong></span></button>
      <button onClick={() => { setOwnerMenuOpen(false); setOwnerShareOpen(true); }} type="button"><FiLink /><span><strong>Access by link</strong><small>send a link — you confirm who enters</small></span></button>
      <button onClick={() => navigate(`/studio/experiences/${publicationId}/edit`)} type="button"><FiEdit3 /><span><strong>Edit</strong><small>title, path, price, chapters</small></span></button>
      <button onClick={() => navigate(`/studio/experiences/${publicationId}/edit?focus=cover`)} type="button"><FiImage /><span><strong>Change cover</strong></span></button>
      <button onClick={async () => { const next = !commentsEnabled; await api.setCommentsEnabled(publicationId, next); setCommentsEnabled(next); }} type="button"><FiMessageCircle /><span><strong>Turn comments {commentsEnabled ? "off" : "on"}</strong></span></button>
      <button onClick={() => navigate("/settings")} type="button"><FiShield /><span><strong>Moderators</strong><small>this product’s own cleanup team</small></span></button>
      <button className="is-danger" onClick={archiveExperience} type="button"><FiTrash2 /><span><strong>Remove from sale</strong><small>buyers keep it forever</small></span></button>
    </nav></article>;
    return (
      <><article className="experience-owner-page">
        <header className="experience-owner-head">
          <button aria-label="Back to profile" onClick={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)} type="button"><FiArrowLeft /></button>
          <div><button aria-label="Experience insights" onClick={() => setOwnerAnalyticsOpen(true)} type="button"><FiBarChart2 /></button><button aria-label="Share Experience" onClick={() => setOwnerShareOpen(true)} type="button"><FiExternalLink /></button><button aria-label="More Experience actions" onClick={() => setOwnerMenuOpen(true)} type="button"><FiMoreHorizontal /></button></div>
        </header>
        <div className="experience-owner-cover"><WorldMedia media={media} owner title={publication.title} onEdit={() => navigate(`/studio/experiences/${publicationId}/edit`)} /><button onClick={() => navigate(`/experience/${publicationId}?preview=visitor`)} type="button"><FiEye /> Preview</button></div>
        <button className="experience-owner-settings" onClick={() => navigate(`/studio/experiences/${publicationId}/edit`)} type="button"><FiSettings /> Settings <span>⌄</span></button>
        <p className="experience-owner-byline">{firstName(creatorName)} <b>✓</b> · <button onClick={() => navigate("/create/experience")} type="button">New world</button></p>
        <div className="experience-owner-premium">Premium Experience · {STAR}{publication.pricing?.starsAmount || 0} · one-time</div>
        <h1>{publication.title}</h1>
        <p className="experience-owner-summary">{publication.experiencePath || publication.description || publication.summary}</p>
        <WorldChapterList canAccessPremium chapters={chapters} collapsible editTarget={`/studio/experiences/${publicationId}/edit`} expanded={ownerChaptersExpanded} onOpen={openChapter} onToggle={() => setOwnerChaptersExpanded((current) => !current)} owner premium />
        {commentsEnabled ? <section className="world-prototype-comments experience-owner-comments">
          <h2>Comments</h2>
          <form onSubmit={addComment}><input maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." value={comment} /><button aria-label="Post comment" type="submit"><FiArrowUp /></button></form>
        </section> : null}
      </article>
      <ShareSheet isOpen={ownerShareOpen} onClose={() => setOwnerShareOpen(false)} payload={ownerSharePayload} />
      {ownerAnalyticsOpen ? <ExperienceAnalyticsSheet insights={ownerInsights.data} loading={ownerInsights.isLoading} onClose={() => setOwnerAnalyticsOpen(false)} publication={publication} /> : null}
      </>
    );
  }

  return (
    <>
    <article className="world-prototype-page">
      <header className="world-prototype-top">
        <button aria-label={visitorPreview ? "Back to Experience editor" : "Back to profile"} onClick={() => visitorPreview ? navigate(-1) : navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)} type="button"><FiArrowLeft /></button>
        <div>
          <button aria-label="Open public world" onClick={() => window.open(`/world/${publicationId}`, "_blank", "noopener,noreferrer")} type="button"><FiExternalLink /></button>
          <button aria-label="More world actions" type="button"><FiMoreHorizontal /></button>
        </div>
      </header>

      {!experience ? <section className="world-prototype-planet">
        <button aria-label={owner ? "Change planet face" : "Planet face"} onClick={() => owner && navigate(`/studio/worlds/${publicationId}/edit`)} type="button">
          <span>{FLEX}</span>
          <span>{publication.planet?.emoji || PLANET}</span>
        </button>
        {owner ? <p>tap the planet to change its face</p> : null}
      </section> : null}

      {!experience ? <WorldStories
        canViewSubscriberStories={canViewSubscriberStories}
        chapters={chapters}
        onJoin={() => {
          if (!user) navigate("/login", { state: { from: { pathname: location.pathname } } });
          else navigate(location.pathname);
        }}
        onOpen={openChapter}
        owner={owner}
        stories={stories}
        subscriberStories={subscriberStories}
      /> : null}

      <section className="world-prototype-creator">
        <span>{firstName(creatorName)} <b>✓</b> - <strong>{views ? views.toLocaleString() : "0"}</strong> stepped inside</span>
      </section>

      <div className="world-prototype-premium-pill">{experience ? publication.pricing?.mode === "FREE" ? "Free Experience - every chapter is open" : `Premium Experience - all chapters unlock for ${STAR}${publication.pricing?.starsAmount} once` : `${PLANET} ${premium ? "Premium World" : "Free World"} - 1 free chapter - ${STAR}${publication.pricing?.starsAmount || 190}/mo`}</div>

      <h1 className="world-prototype-title">{publication.title}</h1>
      <WorldMedia media={media} owner={owner} title={publication.title} onEdit={() => navigate(experience ? `/studio/experiences/${publicationId}/edit` : `/studio/worlds/${publicationId}/edit`)} />

      <p className="world-prototype-summary">{publication.description || publication.summary || "Step inside this world."}</p>

      <WorldChapterList canAccessPremium={owner || canViewSubscriberStories} chapters={chapters} collapsible={experience && owner} editTarget={experience ? `/studio/experiences/${publicationId}/edit` : `/studio/worlds/${publicationId}/edit`} expanded={!experience || !owner || ownerChaptersExpanded} onOpen={openChapter} onToggle={() => setOwnerChaptersExpanded((current) => !current)} owner={owner} premium={premium || experience} />

      {experience && publication.allowDownload && (owner || canViewSubscriberStories || publication.pricing?.mode === "FREE") ? <button className="experience-download-pdf" onClick={() => window.print()} type="button">↥ Download PDF · watermarked for @{user?.username || "guest"}</button> : null}

      {experience && publication.pricing?.mode === "ONE_TIME" && !canViewSubscriberStories ? <button className="world-prototype-complete" onClick={() => user ? setShowExperienceUnlock(true) : navigate("/login", { state: { from: { pathname: location.pathname } } })} type="button">Unlock every chapter · {STAR}{publication.pricing?.starsAmount}</button> : null}

      <section className="world-prototype-comments">
        <h2>Comments</h2>
        <form onSubmit={addComment}>
          <input maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." value={comment} />
          <button aria-label="Post comment" type="submit"><FiArrowUp /></button>
        </form>
        {engagement.data?.comments?.length ? (
          <div className="world-prototype-comment-list">
            {engagement.data.comments.slice(0, 3).map((item) => (
              <article key={item.id}>
                <b>{item.author?.name || "Fan"}</b>
                <p>{item.text}</p>
                <button aria-label={item.viewerSaved ? "Remove saved comment" : "Save comment"} disabled={commentSavePending === item.id} onClick={() => toggleCommentSave(item)} type="button">
                  <FiBookmark aria-hidden="true" fill={item.viewerSaved ? "currentColor" : "none"} />
                </button>
              </article>
            ))}
          </div>
        ) : <p className="world-prototype-empty-comments"><FiMessageCircle /> No comments yet.</p>}
      </section>

      {chapters.length ? <button className="world-prototype-complete" onClick={completeWorld} type="button"><FiCheck /> {experience ? "Finish Experience" : "Continue"}</button> : null}
      {activeMembership ? <p className="world-prototype-membership">Member · window renews {new Date(activeMembership.currentPeriodEnd).toLocaleDateString()} · <Link to="/memberships">Manage</Link></p> : null}
    </article>
    {showPremiumWelcome ? <PremiumWelcomeSheet onClose={() => setShowPremiumWelcome(false)} publication={publication} /> : null}
    <PurchaseWorldModal onClose={() => setShowExperienceUnlock(false)} onSuccess={() => query.refetch()} open={showExperienceUnlock} publication={publication} />
    </>
  );
}
