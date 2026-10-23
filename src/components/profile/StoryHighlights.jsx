import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiCheck, FiEdit2, FiLink, FiMinusCircle, FiPlus, FiSend, FiTrash2, FiX } from "react-icons/fi";
import ShareSheet from "../share/ShareSheet";
import StoryViewer from "../stories/StoryViewer";
import { storyService } from "../../services/storyService";

const highlightKey = (creatorId) => ["story-highlights", creatorId];
const mediaUrl = (story = {}) => story.thumbnailUrl || story.mediaUrl || story.image || "";

function ageLabel(value) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days < 1) return "Today";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function StoryThumb({ active = false, onClick, story }) {
  return <button aria-pressed={active} className={`profile-highlight-story ${active ? "is-selected" : ""}`} onClick={onClick} type="button">
    {story.mediaType === "video" ? <video muted playsInline preload="metadata" src={mediaUrl(story)} /> : <img alt="" src={mediaUrl(story)} />}
    <span className="profile-highlight-check">{active ? <FiCheck /> : null}</span><small>{ageLabel(story.createdAt)}</small>
  </button>;
}

function useCenteredSheetStyle() {
  const [style, setStyle] = useState(undefined);
  useEffect(() => {
    const center = document.querySelector(".social-center-scroll");
    if (!center) return undefined;
    const update = () => { const bounds = center.getBoundingClientRect(); setStyle({ left: `${bounds.left}px`, width: `${bounds.width}px` }); };
    update(); window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update); observer?.observe(center);
    return () => { window.removeEventListener("resize", update); observer?.disconnect(); };
  }, []);
  return style;
}

function HighlightCreator({ onClose, onCreated }) {
  const [step, setStep] = useState("stories");
  const [selected, setSelected] = useState([]);
  const [coverId, setCoverId] = useState("");
  const [name, setName] = useState("");
  const sheetStyle = useCenteredSheetStyle();
  const archive = useQuery({ queryKey: ["story-archive"], queryFn: storyService.getStoryArchive, staleTime: 30000 });
  const selectedStories = useMemo(() => selected.map((id) => archive.data?.find((story) => story.id === id)).filter(Boolean), [archive.data, selected]);
  const create = useMutation({ mutationFn: storyService.createHighlight, onSuccess: onCreated });
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const next = () => { if (selected.length) { setCoverId((current) => current || selected[0]); setStep("details"); } };
  const cover = selectedStories.find((story) => story.id === coverId);
  return createPortal(<div className="profile-highlight-layer" role="dialog" aria-modal="true" aria-label="Create story highlight"><button aria-label="Close highlight creator" className="profile-highlight-scrim" onClick={onClose} type="button" /><section className="profile-highlight-sheet" style={sheetStyle}><i className="profile-highlight-handle" />
    {step === "stories" ? <><header><button aria-label="Close" onClick={onClose} type="button"><FiX /></button><div><h2>New highlight</h2><p>Select stories from your archive</p></div><button className="profile-highlight-next" disabled={!selected.length} onClick={next} type="button">Next</button></header>{archive.isLoading ? <p className="profile-highlight-status">Loading your story archive…</p> : null}{archive.isError ? <p className="profile-highlight-status is-error">Could not load your story archive.</p> : null}{!archive.isLoading && !archive.data?.length ? <p className="profile-highlight-status">Your story archive is empty. Share a story first, then add it here.</p> : null}<div className="profile-highlight-archive">{archive.data?.map((story) => <StoryThumb active={selected.includes(story.id)} key={story.id} onClick={() => toggle(story.id)} story={story} />)}</div></>
    : <><header className="is-details"><button aria-label="Back" onClick={() => setStep("stories")} type="button"><FiArrowLeft /></button><h2>Cover &amp; name</h2><span /></header><div className="profile-highlight-cover-preview">{cover?.mediaType === "video" ? <video muted src={mediaUrl(cover)} /> : <img alt="Selected highlight cover" src={mediaUrl(cover)} />}</div><div className="profile-highlight-cover-options">{selectedStories.map((story) => <StoryThumb active={coverId === story.id} key={story.id} onClick={() => setCoverId(story.id)} story={story} />)}</div><p className="profile-highlight-cover-help">Tap to choose the cover</p><label className="profile-highlight-name"><span className="sr-only">Highlight name</span><input autoFocus maxLength={30} onChange={(event) => setName(event.target.value)} placeholder="Highlights" value={name} /></label>{create.error ? <p className="profile-highlight-error">{create.error?.response?.data?.message || "Highlight could not be created."}</p> : null}<button className="profile-highlight-done" disabled={!name.trim() || !coverId || create.isPending} onClick={() => create.mutate({ name: name.trim(), storyIds: selected, coverStoryId: coverId })} type="button">{create.isPending ? "Creating…" : "Done"}</button></>}
  </section></div>, document.body);
}

function HighlightEditor({ highlight, onClose, onChanged }) {
  const [name, setName] = useState(highlight.name);
  const [coverId, setCoverId] = useState(highlight.coverStoryId || highlight.stories[0]?.originalStoryId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sheetStyle = useCenteredSheetStyle();
  const cover = highlight.stories.find((story) => story.originalStoryId === coverId) || highlight.stories[0];
  const save = async () => { if (!name.trim() || busy) return; setBusy(true); setError(""); try { await storyService.updateHighlight(highlight.id, { name: name.trim(), coverStoryId: coverId }); await onChanged(); onClose(); } catch (cause) { setError(cause?.response?.data?.message || "Highlight could not be updated."); } finally { setBusy(false); } };
  return createPortal(<div className="profile-highlight-manage-layer" role="dialog" aria-modal="true" aria-label="Edit highlight"><button aria-label="Close editor" className="profile-highlight-scrim" onClick={onClose} type="button" /><section className="profile-highlight-manage-sheet is-prototype-edit" style={sheetStyle}><i className="profile-highlight-handle" /><header><span /><h2>Edit highlight</h2><button aria-label="Close" onClick={onClose} type="button"><FiX /></button></header><div className="profile-highlight-cover-preview"><img alt="Highlight cover" src={mediaUrl(cover)} /></div><div className="profile-highlight-edit-cover-options">{highlight.stories.map((story) => <button aria-label="Use this cover" className={story.originalStoryId === coverId ? "is-selected" : ""} key={story.originalStoryId} onClick={() => setCoverId(story.originalStoryId)} type="button"><img alt="" src={mediaUrl(story)} /></button>)}</div><label className="profile-highlight-name"><span className="sr-only">Highlight name</span><input maxLength={30} onChange={(event) => setName(event.target.value)} value={name} /></label>{error ? <p className="profile-highlight-error">{error}</p> : null}<button className="profile-highlight-done" disabled={!name.trim() || busy} onClick={save} type="button">{busy ? "Saving…" : "Done"}</button></section></div>, document.body);
}

function HighlightActions({ busy, highlight, onClose, onDelete, onEdit, onRemove, onShare, story }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sheetStyle = useCenteredSheetStyle();
  return createPortal(<div className="profile-highlight-actions-layer" role="dialog" aria-modal="true" aria-label={`${highlight.name} actions`}><button aria-label="Close highlight actions" className="profile-highlight-scrim" onClick={onClose} type="button" /><section className="profile-highlight-actions-sheet" style={sheetStyle}><i className="profile-highlight-handle" /><header><b>{highlight.name}</b><small>{highlight.stories.length} {highlight.stories.length === 1 ? "story" : "stories"}</small></header><div><button onClick={onEdit} type="button"><FiEdit2 /><span>Edit highlight</span></button><button onClick={onShare} type="button"><FiSend /><span>Send to...</span></button><button onClick={async () => { await navigator.clipboard.writeText(`${window.location.href.split("#")[0]}#highlight-${highlight.id}`); onClose(); }} type="button"><FiLink /><span>Copy link</span></button><button disabled={Boolean(busy)} onClick={() => onRemove(story.originalStoryId)} type="button"><FiMinusCircle /><span>{busy === "remove" ? "Removing..." : "Remove from highlight"}</span></button><button className="is-danger" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)} type="button"><FiTrash2 /><span>Delete highlight</span></button></div></section>{confirmDelete ? <div className="profile-highlight-delete-confirm"><b>Delete “{highlight.name}”?</b><small>The stories stay in your archive</small><span><button onClick={() => setConfirmDelete(false)} type="button">Cancel</button><button disabled={Boolean(busy)} onClick={onDelete} type="button">{busy === "delete" ? "Deleting..." : "Delete"}</button></span></div> : null}</div>, document.body);
}

export default function StoryHighlights({ creatorId, isOwner }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [actionStory, setActionStory] = useState(null);
  const [editing, setEditing] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const highlights = useQuery({ queryKey: highlightKey(creatorId), queryFn: () => storyService.getCreatorHighlights(creatorId), enabled: Boolean(creatorId), retry: false });
  useEffect(() => { setViewer(null); setActionStory(null); }, [creatorId]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: highlightKey(creatorId) });
  const created = (highlight) => { queryClient.setQueryData(highlightKey(creatorId), (current = []) => [...current, highlight]); void refresh(); setCreating(false); };
  const removeStory = async (storyId) => { if (!viewer || busy) return; setBusy("remove"); try { await storyService.removeStoryFromHighlight(viewer.id, storyId); await refresh(); const stories = viewer.stories.filter((story) => story.originalStoryId !== storyId); setActionStory(null); setViewer(stories.length ? { ...viewer, stories } : null); } finally { setBusy(""); } };
  const deleteHighlight = async () => { if (!viewer || busy) return; setBusy("delete"); try { await storyService.deleteHighlight(viewer.id); await refresh(); setActionStory(null); setViewer(null); } finally { setBusy(""); } };
  if (!isOwner && !highlights.data?.length) return null;
  return <><section className="profile-highlights" aria-label="Story highlights">{highlights.data?.map((highlight) => <div className="profile-highlight-item" id={`highlight-${highlight.id}`} key={highlight.id}><button onClick={() => setViewer(highlight)} type="button"><span>{highlight.coverUrl ? <img alt="" src={highlight.coverUrl} /> : null}</span><small>{highlight.name}</small></button></div>)}{isOwner ? <button className="profile-highlight-add" onClick={() => setCreating(true)} type="button"><span><FiPlus /></span><small>New</small></button> : null}</section>{creating ? <HighlightCreator onClose={() => setCreating(false)} onCreated={created} /> : null}{editing ? <HighlightEditor highlight={editing} onChanged={refresh} onClose={() => setEditing(null)} /> : null}<StoryViewer initialIndex={0} isOpen={Boolean(viewer)} key={viewer ? `${viewer.id}:${viewer.stories.map((story) => story.originalStoryId).join(",")}` : "closed"} onClose={() => { setActionStory(null); setViewer(null); }} onMore={isOwner ? setActionStory : undefined} previewOnly stories={viewer?.stories || []} />{actionStory && viewer ? <HighlightActions busy={busy} highlight={viewer} onClose={() => setActionStory(null)} onDelete={deleteHighlight} onEdit={() => { setActionStory(null); setEditing(viewer); }} onRemove={removeStory} onShare={() => { setActionStory(null); setShareOpen(true); }} story={actionStory} /> : null}{shareOpen && viewer ? <ShareSheet isOpen onClose={() => setShareOpen(false)} payload={{ contentId: viewer.id, contentType: "story", imageUrl: viewer.coverUrl, previewText: `${viewer.name} highlight`, route: `/profile/${creatorId}#highlight-${viewer.id}`, title: viewer.name }} /> : null}</>;
}
