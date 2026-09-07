import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiArrowUp,
  FiCheck,
  FiEdit3,
  FiExternalLink,
  FiLock,
  FiMapPin,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiVideo,
} from "react-icons/fi";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
import PremiumWelcomeSheet from "../../components/financial/PremiumWelcomeSheet";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
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
    .filter((chapter) => audience === "FREE" ? chapter.isPreview : !chapter.isPreview && !chapter.locked)
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

function WorldChapterList({ canAccessPremium, chapters, editTarget, onOpen, owner, premium }) {
  return (
    <section className="world-prototype-experience">
      <div className="world-prototype-section-head">
        <h2>Experience</h2>
        <span>{Math.min(chapters.length, 3)} / 10 chapters - {premium ? `${PLANET} Premium` : "Free World"}</span>
      </div>
      <div className="world-prototype-chapters">
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
                  {locked ? <><FiLock /> private</> : <em>{memberChapter ? "member access" : "free preview"}</em>}
                  {locked && owner ? " - schedule" : null}
                </small>
              </span>
              <i>›</i>
            </button>
          );
        })}
      </div>
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

export default function WorldReaderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [activeChapterIndex, setActiveChapterIndex] = useState(null);
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  const query = useQuery({ queryKey: ["world", id], queryFn: () => api.getPublicPublication(id).then((response) => response.data.data.publication), retry: false });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), enabled: Boolean(user), retry: false });
  const engagement = useQuery({ queryKey: ["world-engagement", id], queryFn: () => api.getSeenEngagement(id).then((response) => response.data.data.engagement), retry: false });

  const publication = query.data;
  const publicationId = publication?.id || publication?._id;
  const chapters = useMemo(() => publication?.chapters || [], [publication]);
  const premium = publication?.kind === "PREMIUM_WORLD";
  const membership = memberships.data?.find((item) => String(item.premiumPublication?._id || item.premiumPublication?.id) === String(publicationId));
  const owner = String(user?.id || user?._id || "") === String(publication?.creator?.id || publication?.creator?._id || "");
  const media = mediaFor(publication, chapters);
  const canViewSubscriberStories = owner || publication?.access === "ACTIVE_PREMIUM_MEMBER";
  const activeMembership = membership && ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(membership.status) && new Date(membership.currentPeriodEnd) > new Date() ? membership : null;
  const stories = storyItems(publication, chapters, "FREE");
  const subscriberStories = storyItems(publication, chapters, "SUBSCRIBER");
  const views = steppedInside(publication, engagement.data);
  const creatorName = publication?.creator?.name || publication?.creator?.displayName || publication?.creator?.username || "Creator";

  if (query.isLoading) return <div className="world-prototype-state">Opening planet...</div>;
  if (query.isError || !publication) return <div className="world-prototype-state"><h1>World unavailable</h1><p>It may be unpublished, archived, or missing.</p></div>;

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
    if (chapterIsLocked(chapter, premium, index) && !canViewSubscriberStories) {
      if (!user) return navigate("/login", { state: { from: { pathname: location.pathname } } });
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

  const completeWorld = async () => {
    localStorage.setItem(`atseen_walked_world_${publicationId}`, new Date().toISOString());
    if (user) await api.markWorldWalked(publicationId).catch(() => null);
    navigate("/seen", { state: { walkedWorld: { id: publicationId, title: publication.title, creator: publication.creator } } });
  };

  return (
    <>
    <article className="world-prototype-page">
      <header className="world-prototype-top">
        <button aria-label="Back to profile" onClick={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)} type="button"><FiArrowLeft /></button>
        <div>
          <button aria-label="Open public world" onClick={() => window.open(`/world/${publicationId}`, "_blank", "noopener,noreferrer")} type="button"><FiExternalLink /></button>
          <button aria-label="More world actions" type="button"><FiMoreHorizontal /></button>
        </div>
      </header>

      <section className="world-prototype-planet">
        <button aria-label={owner ? "Change planet face" : "Planet face"} onClick={() => owner && navigate(`/studio/worlds/${publicationId}/edit`)} type="button">
          <span>{FLEX}</span>
          <span>{publication.planet?.emoji || PLANET}</span>
        </button>
        {owner ? <p>tap the planet to change its face</p> : null}
      </section>

      <WorldStories
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
      />

      <section className="world-prototype-creator">
        <span>{firstName(creatorName)} <b>✓</b> - <strong>{views ? views.toLocaleString() : "0"}</strong> stepped inside</span>
      </section>

      <div className="world-prototype-premium-pill">{PLANET} {premium ? "Premium World" : "Free World"} - 1 free chapter - {STAR}{publication.pricing?.starsAmount || 190}/mo</div>

      <h1 className="world-prototype-title">{publication.title}</h1>
      <WorldMedia media={media} owner={owner} title={publication.title} onEdit={() => navigate(`/studio/worlds/${publicationId}/edit`)} />

      <p className="world-prototype-summary">{publication.description || publication.summary || "Step inside this world."}</p>

      <WorldChapterList canAccessPremium={owner || canViewSubscriberStories} chapters={chapters} editTarget={`/studio/worlds/${publicationId}/edit`} onOpen={openChapter} owner={owner} premium={premium} />

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
              </article>
            ))}
          </div>
        ) : <p className="world-prototype-empty-comments"><FiMessageCircle /> No comments yet.</p>}
      </section>

      {chapters.length ? <button className="world-prototype-complete" onClick={completeWorld} type="button"><FiCheck /> Continue</button> : null}
      {activeMembership ? <p className="world-prototype-membership">Member · window renews {new Date(activeMembership.currentPeriodEnd).toLocaleDateString()} · <Link to="/memberships">Manage</Link></p> : null}
    </article>
    {showPremiumWelcome ? <PremiumWelcomeSheet onClose={() => setShowPremiumWelcome(false)} publication={publication} /> : null}
    </>
  );
}
