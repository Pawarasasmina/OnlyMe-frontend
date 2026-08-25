import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBookOpen,
  FiFileText,
  FiGrid,
  FiHeadphones,
  FiImage,
  FiLock,
  FiRepeat,
  FiScissors,
  FiVideo,
  FiX,
} from "react-icons/fi";

const icons = { IMAGE: FiImage, VIDEO: FiVideo, AUDIO: FiHeadphones, TEXT: FiFileText };

function findMedia(item) {
  if (item?.coverMedia?.secureUrl) return item.coverMedia;
  return item?.chapters
    ?.flatMap((chapter) => chapter.blocks || [])
    ?.find((block) => block.media?.secureUrl)?.media || null;
}

function descriptionFor(item) {
  const summary = item?.summary || item?.description || "";
  if (summary) return summary;
  const textBlock = item?.chapters
    ?.flatMap((chapter) => chapter.blocks || [])
    ?.find((block) => block.text?.trim());
  return textBlock?.text || "A Seen from this profile.";
}

function viewsFor(item) {
  return Number(item?.viewCount || item?.views || item?.steppedInside || item?.metrics?.views || 0);
}

function seriesFor(item) {
  const value = item?.series?.name || item?.series?.title || item?.seriesName || item?.seriesTitle || item?.collection?.title || item?.collectionName;
  if (value) return value;
  const seriesTag = (item?.tags || []).find((tag) => String(tag).startsWith("series:"));
  return seriesTag ? String(seriesTag).slice(7).replace(/-/g, " ") : "";
}

function SeriesSheet({ currentSeries, onClose, onSetSeries }) {
  const [draftSeries, setDraftSeries] = useState("");
  const [selectedSeries, setSelectedSeries] = useState(currentSeries || "");

  const addSeries = () => {
    const next = draftSeries.trim();
    if (!next) return;
    setSelectedSeries(next);
    onSetSeries(next);
    setDraftSeries("");
  };

  const removeSeries = () => {
    setSelectedSeries("");
    onSetSeries("");
  };

  return (
    <div aria-modal="true" className="profile-series-backdrop" onMouseDown={onClose} role="dialog">
      <section className="profile-series-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="profile-series-handle" />
        <h2>Series</h2>
        <p>One tap - the Seen joins the book.</p>

        {selectedSeries ? (
          <button className="profile-series-pill" onClick={() => onSetSeries(selectedSeries)} type="button">{selectedSeries}</button>
        ) : null}

        <div className="profile-series-create">
          <input
            aria-label="New series name"
            maxLength={40}
            onChange={(event) => setDraftSeries(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addSeries();
            }}
            placeholder="New series..."
            value={draftSeries}
          />
          <button aria-label="Create series" onClick={addSeries} type="button">+</button>
        </div>

        <button className="profile-series-remove" disabled={!selectedSeries} onClick={removeSeries} type="button">Remove from series</button>
      </section>
    </div>
  );
}

function SeenPreviewSheet({ item, onClose, owner }) {
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [localSeries, setLocalSeries] = useState(() => seriesFor(item));
  const media = findMedia(item);
  const chapters = item?.chapters || [];
  const views = viewsFor(item);
  const isVideo = ["video", "VIDEO"].includes(media?.resourceType || media?.mediaType || media?.type);
  const editTarget = `/studio/seens/${item.id}/edit?from=drafts`;
  const seenTarget = `/seen/${item.id}`;

  return (
    <div aria-modal="true" className="profile-seen-preview-backdrop" onMouseDown={onClose} role="dialog">
      <section className="profile-seen-preview-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="profile-seen-preview-handle" />
        <div className="profile-seen-preview-media">
          {media?.secureUrl ? (
            isVideo ? <video muted playsInline src={media.secureUrl} /> : <img alt={`${item.title} cover`} src={media.secureUrl} />
          ) : <span className="profile-seen-preview-fallback"><FiBookOpen /></span>}
          <span className="profile-seen-preview-shade" />
          {isVideo ? <em><FiVideo /> 0:15</em> : null}
          <h2>{item.title || "Untitled Seen"}</h2>
        </div>

        <p className="profile-seen-preview-views">
          <span aria-hidden="true">🔥</span>
          <b>{views ? views.toLocaleString() : "0"}</b> stepped inside
        </p>
        <p className="profile-seen-preview-description">{descriptionFor(item)}</p>

        {chapters.length ? (
          <div className="profile-seen-preview-chapters">
            {chapters.slice(0, 3).map((chapter, index) => (
              <Link className="profile-seen-preview-chapter" key={chapter.stableChapterId || `${item.id}-${index}`} to={seenTarget}>
                <span>{index + 1}</span>
                <b>{chapter.title || `Chapter ${index + 1}`}</b>
              </Link>
            ))}
          </div>
        ) : null}

        <button className="profile-seen-preview-series" onClick={() => setSeriesOpen(true)} type="button">
          <span><FiGrid /></span>
          <span>
            <b>{localSeries ? `Series: ${localSeries}` : "Add to a series"}</b>
            <small>{localSeries ? "Tap to change or remove" : "Group Seens into one book"}</small>
          </span>
          <i>›</i>
        </button>

        <button className="profile-seen-preview-story" type="button"><FiScissors /> Add to your story</button>

        <div className="profile-seen-preview-actions">
          {owner ? <Link to={editTarget}>Edit</Link> : <Link to={seenTarget}>Open</Link>}
          <button type="button">Share</button>
          <button aria-label="Close Seen preview" className="is-close" onClick={onClose} type="button"><FiX /></button>
        </div>
        {seriesOpen ? (
          <SeriesSheet
            currentSeries={localSeries}
            onClose={() => setSeriesOpen(false)}
            onSetSeries={(next) => setLocalSeries(next)}
          />
        ) : null}
      </section>
    </div>
  );
}

function ProfileContentGrid({ content = [], emptyText = "", kind = "content", owner = false, reposted = false }) {
  const [activeSeen, setActiveSeen] = useState(null);
  const [activeSeries, setActiveSeries] = useState("");
  const visibleContent = useMemo(() => kind === "seens" ? (content || []).filter((item) => item.status === "PUBLISHED" || item.publishedAt) : content || [], [content, kind]);

  if (kind === "seens") {
    if (!visibleContent.length) return <div className="profile-empty-state">{emptyText || "No published Seens yet."}</div>;
    const seriesGroups = new Map();
    visibleContent.forEach((item) => {
      const name = seriesFor(item);
      if (!name) return;
      if (!seriesGroups.has(name)) seriesGroups.set(name, []);
      seriesGroups.get(name).push(item);
    });
    const items = activeSeries ? seriesGroups.get(activeSeries) || [] : visibleContent.filter((item) => !seriesFor(item));
    return (
      <>
        {activeSeries ? <button className="profile-series-path" onClick={() => setActiveSeries("")} type="button">‹ My Seens <span>·</span> {activeSeries} <span>·</span> {items.length}</button> : null}
        <div className="profile-seens-grid">
          {!activeSeries ? [...seriesGroups.entries()].map(([name, seriesItems]) => {
            const media = findMedia(seriesItems[0]);
            return <button className="profile-seen-tile profile-series-tile" key={name} onClick={() => setActiveSeries(name)} type="button">
              {media?.secureUrl ? <img alt={`${name} series cover`} loading="lazy" src={media.secureUrl} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
              <span className="profile-seen-shade" />
              <span className="profile-seen-badge">SERIES <b>{seriesItems.length}</b></span>
              <span className="profile-seen-copy"><strong>{name}</strong><small>{seriesItems.length} {seriesItems.length === 1 ? "Seen" : "Seens"}</small></span>
            </button>;
          }) : null}
          {items.map((item) => {
            const chapters = item.chapters?.length || 0;
            const tile = (
              <>
                {item.coverMedia?.secureUrl ? <img alt={`${item.title} cover`} loading="lazy" src={item.coverMedia.secureUrl} /> : <span className="profile-seen-fallback"><FiBookOpen /></span>}
                <span className="profile-seen-shade" />
                {reposted ? <span className="profile-seen-badge"><FiRepeat /> REPOST</span> : null}
                <span className="profile-seen-copy">
                  <strong>{item.title}</strong>
                  <small>{chapters} {chapters === 1 ? "chapter" : "chapters"}</small>
                </span>
              </>
            );

            return (
              <button className="profile-seen-tile" key={item.id} onClick={() => setActiveSeen(item)} type="button">
                {tile}
              </button>
            );
          })}
        </div>
        {activeSeen ? <SeenPreviewSheet item={activeSeen} onClose={() => setActiveSeen(null)} owner={owner} /> : null}
      </>
    );
  }

  if (!visibleContent.length) return <div className="profile-empty-state">{emptyText || "No published content yet."}</div>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {visibleContent.map((item) => {
        const Icon = item.locked ? FiLock : icons[item.contentType] || FiFileText;
        const media = item.media?.find((entry) => entry.isPrimary) || item.media?.[0] || item.thumbnail;
        const image = !item.locked && media?.mediaType === "IMAGE" ? media.secureUrl : null;
        return (
          <article className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-atseen-line bg-atseen-surface" key={item.id}>
            {image ? <img alt="" className="h-full w-full object-cover" src={image} /> : <Icon className="text-3xl text-atseen-blue/60" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
              <p className="line-clamp-2 text-xs font-bold text-white">{item.title}</p>
              {item.locked ? <p className="mt-1 text-[10px] text-atseen-muted">Locked content</p> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default ProfileContentGrid;
