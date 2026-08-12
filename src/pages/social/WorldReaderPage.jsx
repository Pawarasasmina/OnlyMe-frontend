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
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiScissors,
  FiVideo,
} from "react-icons/fi";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
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

function storyItems(publication, chapters) {
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

function WorldChapterList({ chapters, editTarget, onOpen, owner, premium }) {
  return (
    <section className="world-prototype-experience">
      <div className="world-prototype-section-head">
        <h2>Experience</h2>
        <span>{Math.min(chapters.length, 3)} / 10 chapters - {premium ? `${PLANET} Premium` : "Free World"}</span>
      </div>
      <div className="world-prototype-chapters">
        {chapters.slice(0, 10).map((chapter, index) => {
          const locked = chapterIsLocked(chapter, premium, index);
          return (
            <button className="world-prototype-chapter-row" key={chapter.stableChapterId || `${chapter.title}-${index}`} onClick={() => onOpen(index)} type="button">
              <span>{index + 1}</span>
              <span>
                <b>{chapter.title || `Chapter ${index + 1}`}</b>
                <small>
                  {owner ? <strong>+ Write the story</strong> : locked ? "Locked chapter" : "Open chapter"}
                  {" - "}
                  {locked ? <><FiLock /> private</> : <em>free preview</em>}
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

function WorldStories({ chapters, onOpen, owner, stories }) {
  return (
    <>
      <section className="world-prototype-story-previews">
        <div className="world-prototype-section-head is-compact">
          <h2>Stories</h2>
          <span>up to 3 - seen before purchase</span>
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
        <h2><FiScissors /> Stories</h2>
        <div>
          <button className="is-active" type="button"><FiScissors /><span>5:47 AM</span></button>
          <button className="is-active" type="button"><FiScissors /><span>Day 214</span></button>
          {owner ? <button type="button"><FiPlus /><span>New</span></button> : null}
        </div>
      </section>
    </>
  );
}

export default function WorldReaderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [joinOpen, setJoinOpen] = useState(false);
  const [comment, setComment] = useState("");
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
  const stories = storyItems(publication, chapters);
  const views = steppedInside(publication, engagement.data);
  const creatorName = publication?.creator?.name || publication?.creator?.displayName || publication?.creator?.username || "Creator";

  if (query.isLoading) return <div className="world-prototype-state">Opening planet...</div>;
  if (query.isError || !publication) return <div className="world-prototype-state"><h1>World unavailable</h1><p>It may be unpublished, archived, or missing.</p></div>;

  const openChapter = (index) => {
    const chapter = chapters[index];
    if (!chapter) return;
    if (chapterIsLocked(chapter, premium, index) && !membership && !owner) {
      if (!user) return navigate("/login", { state: { from: { pathname: location.pathname } } });
      setJoinOpen(true);
      return;
    }
    document.getElementById(`world-chapter-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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

      <WorldStories chapters={chapters} onOpen={openChapter} owner={owner} stories={stories} />

      <section className="world-prototype-creator">
        <span>{firstName(creatorName)} <b>✓</b> - <strong>{views ? views.toLocaleString() : "0"}</strong> stepped inside</span>
      </section>

      <div className="world-prototype-premium-pill">{PLANET} {premium ? "Premium World" : "Free World"} - 1 free chapter - {STAR}{publication.pricing?.starsAmount || 190}/mo</div>

      <h1 className="world-prototype-title">{publication.title}</h1>
      <WorldMedia media={media} owner={owner} title={publication.title} onEdit={() => navigate(`/studio/worlds/${publicationId}/edit`)} />

      <p className="world-prototype-summary">{publication.description || publication.summary || "Step inside this world."}</p>

      <WorldChapterList chapters={chapters} editTarget={`/studio/worlds/${publicationId}/edit`} onOpen={openChapter} owner={owner} premium={premium} />

      {chapters.length ? (
        <div className="world-prototype-hidden-chapters">
          {chapters.map((chapter, index) => (
            <section id={`world-chapter-${index}`} key={chapter.stableChapterId || index}>
              <h3>{chapter.title}</h3>
            </section>
          ))}
        </div>
      ) : null}

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
      {membership ? <p className="world-prototype-membership">Resident through {new Date(membership.currentPeriodEnd).toLocaleDateString()} - <Link to="/memberships">Manage</Link></p> : null}
      <JoinPremiumModal onClose={() => setJoinOpen(false)} onSuccess={() => query.refetch()} open={joinOpen} publication={publication} />
    </article>
  );
}
