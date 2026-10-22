import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiCheck, FiPlus, FiX } from "react-icons/fi";
import StoryViewer from "../stories/StoryViewer";
import { storyService } from "../../services/storyService";

const highlightKey = (creatorId) => ["story-highlights", creatorId];

function mediaUrl(story) {
  return story.thumbnailUrl || story.mediaUrl || story.image || "";
}

function ageLabel(value) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days < 1) return "Today";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function StoryThumb({ active = false, onClick, story }) {
  return (
    <button aria-pressed={active} className={`profile-highlight-story ${active ? "is-selected" : ""}`} onClick={onClick} type="button">
      {story.mediaType === "video" ? <video muted playsInline preload="metadata" src={mediaUrl(story)} /> : <img alt="" src={mediaUrl(story)} />}
      <span className="profile-highlight-check">{active ? <FiCheck /> : null}</span>
      <small>{ageLabel(story.createdAt)}</small>
    </button>
  );
}

function HighlightCreator({ onClose, onCreated }) {
  const [step, setStep] = useState("stories");
  const [selected, setSelected] = useState([]);
  const [coverId, setCoverId] = useState("");
  const [name, setName] = useState("");
  const [sheetPosition, setSheetPosition] = useState(undefined);
  const archive = useQuery({ queryKey: ["story-archive"], queryFn: storyService.getStoryArchive, staleTime: 30000 });
  const selectedStories = useMemo(() => selected.map((id) => archive.data?.find((story) => story.id === id)).filter(Boolean), [archive.data, selected]);
  const create = useMutation({
    mutationFn: storyService.createHighlight,
    onSuccess: (highlight) => onCreated(highlight),
  });
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const next = () => {
    if (!selected.length) return;
    setCoverId((current) => current || selected[0]);
    setStep("details");
  };
  const submit = () => create.mutate({ name: name.trim(), storyIds: selected, coverStoryId: coverId });
  const error = create.error?.response?.data?.message || create.error?.message || "";

  useEffect(() => {
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({
        "--highlight-sheet-center-x": `${bounds.left + bounds.width / 2}px`,
        "--highlight-sheet-column-width": `${bounds.width}px`,
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
  }, []);

  return createPortal(
    <div className="profile-highlight-layer" role="dialog" aria-modal="true" aria-label="Create story highlight">
      <button aria-label="Close highlight creator" className="profile-highlight-scrim" onClick={onClose} type="button" />
      <section className="profile-highlight-sheet" style={sheetPosition}>
        <i className="profile-highlight-handle" />
        {step === "stories" ? (
          <>
            <header><button aria-label="Close" onClick={onClose} type="button"><FiX /></button><div><h2>New highlight</h2><p>Select stories from your archive</p></div><button className="profile-highlight-next" disabled={!selected.length} onClick={next} type="button">Next</button></header>
            {archive.isLoading ? <p className="profile-highlight-status">Loading your story archive…</p> : null}
            {archive.isError ? <p className="profile-highlight-status is-error">Could not load your story archive.</p> : null}
            {!archive.isLoading && !archive.data?.length ? <p className="profile-highlight-status">Your story archive is empty. Share a story first, then add it here.</p> : null}
            <div className="profile-highlight-archive">{archive.data?.map((story) => <StoryThumb active={selected.includes(story.id)} key={story.id} onClick={() => toggle(story.id)} story={story} />)}</div>
          </>
        ) : (
          <>
            <header className="is-details"><button aria-label="Back" onClick={() => setStep("stories")} type="button"><FiArrowLeft /></button><h2>Cover &amp; name</h2><span /></header>
            <div className="profile-highlight-cover-preview">{selectedStories.find((story) => story.id === coverId)?.mediaType === "video" ? <video muted src={mediaUrl(selectedStories.find((story) => story.id === coverId))} /> : <img alt="Selected highlight cover" src={mediaUrl(selectedStories.find((story) => story.id === coverId))} />}</div>
            <div className="profile-highlight-cover-options" aria-label="Choose cover">{selectedStories.map((story) => <StoryThumb active={coverId === story.id} key={story.id} onClick={() => setCoverId(story.id)} story={story} />)}</div>
            <p className="profile-highlight-cover-help">Tap to choose the cover</p>
            <label className="profile-highlight-name"><span>Highlight name</span><input autoFocus maxLength={30} onChange={(event) => setName(event.target.value)} placeholder="Highlights" value={name} /></label>
            {error ? <p className="profile-highlight-error" role="alert">{error}</p> : null}
            <button className="profile-highlight-done" disabled={!name.trim() || !coverId || create.isPending} onClick={submit} type="button">{create.isPending ? "Creating…" : "Done"}</button>
          </>
        )}
      </section>
    </div>, document.body,
  );
}

export default function StoryHighlights({ creatorId, isOwner }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [viewer, setViewer] = useState(null);
  const highlights = useQuery({ queryKey: highlightKey(creatorId), queryFn: () => storyService.getCreatorHighlights(creatorId), enabled: Boolean(creatorId), retry: false });
  useEffect(() => setViewer(null), [creatorId]);
  const created = (highlight) => {
    queryClient.setQueryData(highlightKey(creatorId), (current = []) => [...current, highlight]);
    queryClient.invalidateQueries({ queryKey: highlightKey(creatorId) });
    setCreating(false);
  };
  if (!isOwner && !highlights.data?.length) return null;
  return (
    <>
      <section className="profile-highlights" aria-label="Story highlights">
        {highlights.data?.map((highlight) => (
          <button key={highlight.id} onClick={() => setViewer(highlight)} type="button"><span>{highlight.coverUrl ? <img alt="" src={highlight.coverUrl} /> : null}</span><small>{highlight.name}</small></button>
        ))}
        {isOwner ? <button className="profile-highlight-add" onClick={() => setCreating(true)} type="button"><span><FiPlus /></span><small>New</small></button> : null}
      </section>
      {creating ? <HighlightCreator onClose={() => setCreating(false)} onCreated={created} /> : null}
      <StoryViewer initialIndex={0} isOpen={Boolean(viewer)} onClose={() => setViewer(null)} previewOnly stories={viewer?.stories || []} />
    </>
  );
}
