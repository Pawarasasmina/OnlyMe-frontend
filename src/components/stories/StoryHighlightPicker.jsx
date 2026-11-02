import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiPlus } from "react-icons/fi";
import { storyService } from "../../services/storyService";
import { useStoryViewerPosition } from "../../hooks/useStoryViewerPosition";
import { storyTextStyle } from "../../utils/storyPresentation";

export function HighlightCover({ story, url }) {
  if (!story && !url) return null;
  const source = url || story?.thumbnailUrl || story?.mediaUrl || story?.image;
  if (story?.mediaType === "text") return <span className="highlight-text-cover" style={{ background: story.background || "#24344f" }}><span style={storyTextStyle(story.editorMetadata?.textItems?.[0] || {})}>{story.text || story.caption}</span></span>;
  if (story?.mediaType === "video" && (!url || url === story.mediaUrl) && (!story.thumbnailUrl || story.thumbnailUrl === story.mediaUrl)) return <video muted playsInline preload="metadata" src={`${story.mediaUrl}#t=1`} />;
  return source ? <img alt="" src={source} /> : null;
}

export default function StoryHighlightPicker({ creatorId, onClose, onOpenProfile, story }) {
  const queryClient = useQueryClient();
  const position = useStoryViewerPosition(true);
  const [step, setStep] = useState("choose");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");
  const dialog = useRef(null);
  const highlights = useQuery({ queryKey: ["story-highlights", creatorId], queryFn: () => storyService.getCreatorHighlights(creatorId), enabled: Boolean(creatorId), retry: false });
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    const key = (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); if (!busy) onClose(); }
      if (event.key === "Tab") {
        const items = dialog.current?.querySelectorAll("button:not(:disabled),input");
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("keydown", key, true); previous?.focus?.(); };
  }, [busy, onClose]);
  useEffect(() => { if (!added) return undefined; const timer = window.setTimeout(onClose, 3200); return () => window.clearTimeout(timer); }, [added, onClose]);
  const save = async (highlight) => {
    if (busy) return;
    setBusy(true); setError("");
    const title = highlight?.name || name.trim() || "Highlights";
    try {
      if (highlight) await storyService.addStoryToHighlight(highlight.id, story.id);
      else await storyService.createHighlight({ name: title, storyIds: [story.id], coverStoryId: story.id });
      setAdded(title);
      void queryClient.invalidateQueries({ queryKey: ["story-highlights", creatorId] });
    } catch (cause) { setError(cause?.response?.data?.message || "Story could not be added. Please try again."); }
    finally { setBusy(false); }
  };
  if (added) return createPortal(<div className="story-highlight-success-layer" style={position}><button className="story-highlight-success" onClick={onOpenProfile} type="button"><span aria-hidden="true"><FiCheck /></span><span role="status"><b>Added to “{added}”</b><small>It’s on your profile now</small></span></button></div>, document.body);
  return createPortal(<div className="story-highlight-picker-layer" style={position}>
    <button aria-label="Close highlight picker" className="story-highlight-picker-scrim" disabled={busy} onClick={onClose} type="button" />
    <section aria-label={step === "new" ? "New highlight" : "Add to highlight"} aria-modal="true" className="story-highlight-picker-sheet" ref={dialog} role="dialog" tabIndex={-1}>
      <i aria-hidden="true" />
      <header>{step === "new" ? <button className="story-highlight-back" disabled={busy} onClick={() => { setStep("choose"); setError(""); }} type="button">‹ Back</button> : null}<h2>{step === "new" ? "New highlight" : "Add to highlight"}</h2></header>
      {step === "choose" ? <>
        <div className="story-highlight-picker-list">
          <button disabled={busy} onClick={() => setStep("new")} type="button"><span className="story-highlight-new-circle"><FiPlus /></span><b>New</b></button>
          {highlights.data?.map((highlight) => <button disabled={busy} key={highlight.id} onClick={() => save(highlight)} type="button"><span><HighlightCover story={highlight.stories?.[0]} url={highlight.coverUrl} /></span><b>{highlight.name}</b></button>)}
        </div>
        {highlights.isPending ? <p className="story-highlight-status" role="status">Loading highlights…</p> : null}
        {highlights.isError ? <p className="story-highlight-status" role="alert">Could not load highlights. <button onClick={() => highlights.refetch()} type="button">Retry</button></p> : null}
        <small>Highlights stay on your profile after the story is gone</small>
      </> : <form className="story-highlight-create" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className="story-highlight-cover-preview"><HighlightCover story={story} /></div>
        <input aria-label="Highlight name" autoFocus disabled={busy} maxLength={16} onChange={(event) => setName(event.target.value)} placeholder="Highlights" value={name} />
        <button className={!name.trim() ? "is-empty" : ""} disabled={busy} type="submit">{busy ? "Adding…" : "Add"}</button>
      </form>}
      {busy && step === "choose" ? <p className="story-highlight-status" role="status">Adding…</p> : null}
      {error ? <p className="story-highlight-error" role="alert">{error}</p> : null}
    </section>
  </div>, document.body);
}
