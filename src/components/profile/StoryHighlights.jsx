import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiEdit2, FiLink, FiMinusCircle, FiPlus, FiSend, FiTrash2 } from "react-icons/fi";
import { useStoryViewerPosition } from "../../hooks/useStoryViewerPosition";
import { HighlightCover } from "../stories/StoryHighlightPicker";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import ShareSheet from "../share/ShareSheet";
import StoryViewer from "../stories/StoryViewer";
import { storyService } from "../../services/storyService";

const highlightKey = (creatorId) => ["story-highlights", creatorId];

function ageLabel(value) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days < 1) return "Today";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function StoryThumb({ active = false, number, onClick, story }) {
  return <button aria-pressed={active} className={`profile-highlight-story ${active ? "is-selected" : ""}`} onClick={onClick} type="button">
    <HighlightCover story={story} />
    <span className="profile-highlight-check">{active ? number || <FiCheck /> : null}</span><small>{ageLabel(story.createdAt)}</small>
  </button>;
}

function useCenteredSheetStyle(onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const key = (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key === "Tab") {
        const layer = document.querySelector(".profile-highlight-actions-layer,.profile-highlight-manage-layer,.profile-highlight-layer");
        const items = layer?.querySelectorAll("button:not(:disabled),input");
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (!layer.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("keydown", key, true); previous?.focus?.(); };
  }, []);
  return useStoryViewerPosition(true);
}

function HighlightCreator({ onClose, onCreated }) {
  const [step, setStep] = useState("stories");
  const [selected, setSelected] = useState([]);
  const [coverId, setCoverId] = useState("");
  const [name, setName] = useState("");
  const sheetStyle = useCenteredSheetStyle(onClose);
  const archive = useQuery({ queryKey: ["story-archive"], queryFn: storyService.getStoryArchive, staleTime: 30000 });
  const selectedStories = useMemo(() => selected.map((id) => archive.data?.find((story) => story.id === id)).filter(Boolean), [archive.data, selected]);
  const create = useMutation({ mutationFn: storyService.createHighlight, onSuccess: onCreated });
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const next = () => { if (selected.length) { setCoverId((current) => selected.includes(current) ? current : selected[0]); setStep("details"); } };
  const cover = selectedStories.find((story) => story.id === coverId);
  return createPortal(<div className="profile-highlight-layer" style={sheetStyle} role="dialog" aria-modal="true" aria-label="Create story highlight"><button aria-label="Close highlight creator" className="profile-highlight-scrim" onClick={onClose} type="button" /><section className={`profile-highlight-sheet is-${step}`}><i className="profile-highlight-handle" />
    {step === "stories" ? <><header><div><h2>New highlight</h2><p>Select stories from your archive</p></div><button className="profile-highlight-next" disabled={!selected.length} onClick={next} type="button">Next</button></header>{archive.isLoading ? <p className="profile-highlight-status">Loading your story archive…</p> : null}{archive.isError ? <p className="profile-highlight-status is-error">Could not load your story archive.</p> : null}{!archive.isLoading && !archive.data?.length ? <p className="profile-highlight-status">Your story archive is empty. Share a story first, then add it here.</p> : null}<div className="profile-highlight-archive">{archive.data?.map((story) => <StoryThumb active={selected.includes(story.id)} number={selected.indexOf(story.id) + 1} key={story.id} onClick={() => toggle(story.id)} story={story} />)}</div></>
    : <><header className="is-details"><button aria-label="Back" onClick={() => setStep("stories")} type="button">&lsaquo; Back</button><h2>Cover &amp; name</h2><span /></header><div className="profile-highlight-cover-preview"><HighlightCover story={cover} /></div>{selectedStories.length > 1 ? <><div className="profile-highlight-cover-options">{selectedStories.map((story) => <StoryThumb active={coverId === story.id} key={story.id} onClick={() => setCoverId(story.id)} story={story} />)}</div><p className="profile-highlight-cover-help">Tap to choose the cover</p></> : null}<label className="profile-highlight-name"><span className="sr-only">Highlight name</span><input autoFocus maxLength={16} onChange={(event) => setName(event.target.value)} placeholder="Highlights" value={name} /></label>{create.error ? <p className="profile-highlight-error">{create.error?.response?.data?.message || "Highlight could not be created."}</p> : null}<button className="profile-highlight-done" disabled={!coverId || create.isPending} onClick={() => create.mutate({ name: name.trim() || "Highlights", storyIds: selected, coverStoryId: coverId })} type="button">{create.isPending ? "Creating…" : "Done"}</button></>}
  </section></div>, document.body);
}

function HighlightEditor({ highlight, onClose, onChanged }) {
  const [name, setName] = useState(highlight.name);
  const coverId = highlight.coverStoryId || highlight.stories[0]?.originalStoryId || "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sheetStyle = useCenteredSheetStyle(onClose);
  const cover = highlight.stories.find((story) => story.originalStoryId === coverId) || highlight.stories[0];
  const save = async () => { if (!name.trim() || busy) return; setBusy(true); setError(""); try { await storyService.updateHighlight(highlight.id, { name: name.trim(), coverStoryId: coverId }); await onChanged(); onClose(); } catch (cause) { setError(cause?.response?.data?.message || "Highlight could not be updated."); } finally { setBusy(false); } };
  return createPortal(<div className="profile-highlight-manage-layer" style={sheetStyle} role="dialog" aria-modal="true" aria-label="Edit highlight"><button aria-label="Close editor" className="profile-highlight-scrim" onClick={onClose} type="button" /><section className="profile-highlight-manage-sheet is-prototype-edit"><i className="profile-highlight-handle" /><header><h2>Edit highlight</h2></header><div className="profile-highlight-cover-preview"><HighlightCover story={cover} /></div><label className="profile-highlight-name"><span className="sr-only">Highlight name</span><input autoFocus maxLength={16} onChange={(event) => setName(event.target.value)} value={name} /></label>{error ? <p className="profile-highlight-error">{error}</p> : null}<button className="profile-highlight-done" disabled={!name.trim() || busy} onClick={save} type="button">{busy ? "Saving…" : "Done"}</button></section></div>, document.body);
}

function HighlightActions({ busy, permalink, highlight, onClose, onDelete, onEdit, onRemove, onShare, story }) {
  const { showToast } = useFanToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sheetStyle = useCenteredSheetStyle(onClose);
  return createPortal(<div className="profile-highlight-actions-layer" style={sheetStyle} role="dialog" aria-modal="true" aria-label={`${highlight.name} actions`}><button aria-label="Close highlight actions" className="profile-highlight-scrim" onClick={onClose} type="button" /><section className="profile-highlight-actions-sheet"><i className="profile-highlight-handle" /><header><b>{highlight.name}</b><small>{highlight.stories.length} {highlight.stories.length === 1 ? "story" : "stories"}</small></header><div><button onClick={onEdit} type="button"><FiEdit2 /><span>Edit highlight</span></button><button onClick={onShare} type="button"><FiSend /><span>Send to...</span></button><button onClick={async () => { try { await navigator.clipboard.writeText(new URL(permalink, window.location.origin).href); showToast("Link copied"); onClose(); } catch { showToast("Could not copy the link. Please try again."); } }} type="button"><FiLink /><span>Copy link</span></button>{highlight.stories.length > 1 ? <button disabled={Boolean(busy)} onClick={() => onRemove(story.originalStoryId)} type="button"><FiMinusCircle /><span>{busy === "remove" ? "Removing..." : "Remove from highlight"}</span></button> : null}<button className="is-danger" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)} type="button"><FiTrash2 /><span>Delete highlight</span></button></div></section>{confirmDelete ? <div className="profile-highlight-delete-confirm"><b>Delete “{highlight.name}”?</b><small>The stories stay in your archive</small><span><button onClick={() => setConfirmDelete(false)} type="button">Cancel</button><button disabled={Boolean(busy)} onClick={onDelete} type="button">{busy === "delete" ? "Deleting..." : "Delete"}</button></span></div> : null}</div>, document.body);
}

export default function StoryHighlights({ creatorId, creatorUsername, isOwner }) {
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const [creating, setCreating] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [viewerStart, setViewerStart] = useState(0);
  const [actionStory, setActionStory] = useState(null);
  const [editing, setEditing] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const highlights = useQuery({ queryKey: highlightKey(creatorId), queryFn: () => storyService.getCreatorHighlights(creatorId), enabled: Boolean(creatorId), retry: false });
  useEffect(() => { setViewer(null); setActionStory(null); }, [creatorId]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: highlightKey(creatorId) });
  useEffect(() => {
    const id = window.location.hash.replace("#highlight-", "");
    if (!window.location.hash.startsWith("#highlight-") || !highlights.data) return;
    const target = highlights.data.find((item) => item.id === id);
    if (target) setViewer(target);
  }, [creatorId, highlights.data]);
  const created = (highlight) => { queryClient.setQueryData(highlightKey(creatorId), (current = []) => [...current, highlight]); void refresh(); setCreating(false); showToast("Added to your profile"); };
  const removeStory = async (storyId) => { if (!viewer || busy) return; setBusy("remove"); try { await storyService.removeStoryFromHighlight(viewer.id, storyId); await refresh(); const stories = viewer.stories.filter((story) => story.originalStoryId !== storyId); setActionStory(null); setViewer(stories.length ? { ...viewer, stories } : null); } catch (cause) { showToast(cause?.response?.data?.message || "Could not update highlight. Please try again."); } finally { setBusy(""); } };
  const deleteHighlight = async () => { if (!viewer || busy) return; setBusy("delete"); try { await storyService.deleteHighlight(viewer.id); await refresh(); setActionStory(null); setViewer(null); } catch (cause) { showToast(cause?.response?.data?.message || "Could not update highlight. Please try again."); } finally { setBusy(""); } };
  const permalink = viewer ? `/profile/${encodeURIComponent(creatorUsername || creatorId)}#highlight-${viewer.id}` : "";
  const adjacentHighlight = (direction) => {
    const list = highlights.data || [];
    const next = list[list.findIndex((item) => item.id === viewer?.id) + direction];
    setActionStory(null);
    setViewerStart(direction < 0 && next ? Math.max(0, next.stories.length - 1) : 0);
    setViewer(next || null);
  };
  if (!isOwner && !highlights.data?.length) return null;
  return <><section className="profile-highlights" aria-label="Story highlights">{highlights.data?.map((highlight) => <div className="profile-highlight-item" id={`highlight-${highlight.id}`} key={highlight.id}><button onClick={() => { setViewerStart(0); setViewer(highlight); }} type="button"><span><HighlightCover story={highlight.stories?.[0]} url={highlight.coverUrl} /></span><small>{highlight.name}</small></button></div>)}{isOwner ? <button className="profile-highlight-add" onClick={() => setCreating(true)} type="button"><span><FiPlus /></span><small>New</small></button> : null}</section>{creating ? <HighlightCreator onClose={() => setCreating(false)} onCreated={created} /> : null}{editing ? <HighlightEditor highlight={editing} onChanged={async () => { await refresh(); const latest = queryClient.getQueryData(highlightKey(creatorId)); setViewer((current) => latest?.find((item) => item.id === current?.id) || current); }} onClose={() => setEditing(null)} /> : null}<StoryViewer showHighlightViews={isOwner} externalPaused={Boolean(actionStory || editing || shareOpen)} highlightTitle={viewer?.name} initialIndex={viewerStart} onComplete={() => adjacentHighlight(1)} onPreviousComplete={highlights.data?.findIndex((item) => item.id === viewer?.id) > 0 ? () => adjacentHighlight(-1) : undefined} isOpen={Boolean(viewer)} key={viewer ? `${viewer.id}:${viewer.stories.map((story) => story.originalStoryId).join(",")}` : "closed"} onClose={() => { setActionStory(null); setViewer(null); }} onMore={isOwner ? setActionStory : undefined} previewOnly stories={viewer?.stories || []} />{actionStory && viewer ? <HighlightActions permalink={permalink} busy={busy} highlight={viewer} onClose={() => setActionStory(null)} onDelete={deleteHighlight} onEdit={() => { setActionStory(null); setEditing(viewer); }} onRemove={removeStory} onShare={() => { setActionStory(null); setShareOpen(true); }} story={actionStory} /> : null}{shareOpen && viewer ? <ShareSheet isOpen onClose={() => setShareOpen(false)} payload={{ contentId: viewer.id, contentType: "story", imageUrl: viewer.coverUrl, previewText: `${viewer.name} highlight`, route: permalink, title: viewer.name }} /> : null}</>;
}
