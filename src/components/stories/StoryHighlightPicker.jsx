import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiPlus } from "react-icons/fi";
import { storyService } from "../../services/storyService";
import { useStoryViewerPosition } from "../../hooks/useStoryViewerPosition";
import { storyTextStyle } from "../../utils/storyPresentation";

export function HighlightCover({ story, url }) {
  __useUiLanguage();
  if (!story && !url) return null;
  const source = url || story?.thumbnailUrl || story?.mediaUrl || story?.image;
  if (story?.mediaType === "text") return <span className="highlight-text-cover" style={{ background: story.background || "#24344f" }}><span style={storyTextStyle(story.editorMetadata?.textItems?.[0] || {})}>{story.text || story.caption}</span></span>;
  if (story?.mediaType === "video" && (!url || url === story.mediaUrl) && (!story.thumbnailUrl || story.thumbnailUrl === story.mediaUrl)) return <video muted playsInline preload="metadata" src={`${story.mediaUrl}#t=1`} />;
  return source ? <img alt="" src={source} /> : null;
}

export default function StoryHighlightPicker({ creatorId, onClose, onOpenProfile, story }) {
  __useUiLanguage();
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
    const title = highlight?.name || name.trim() || __msg("profile.highlights");
    try {
      if (highlight) await storyService.addStoryToHighlight(highlight.id, story.id);
      else await storyService.createHighlight({ name: title, storyIds: [story.id], coverStoryId: story.id });
      setAdded(title);
      void queryClient.invalidateQueries({ queryKey: ["story-highlights", creatorId] });
    } catch (cause) { setError(cause?.response?.data?.message || __msg("stories.storyCouldNotBeAddedPleaseTryAgain")); }
    finally { setBusy(false); }
  };
  if (added) return createPortal(<div className="story-highlight-success-layer" style={position}><button className="story-highlight-success" onClick={onOpenProfile} type="button"><span aria-hidden="true"><FiCheck /></span><span role="status"><b>{__msg("stories.addedTo")}{added}”</b><small>{__msg("stories.itSOnYourProfileNow")}</small></span></button></div>, document.body);
  return createPortal(<div className="story-highlight-picker-layer" style={position}>
    <button aria-label={__msg("stories.closeHighlightPicker")} className="story-highlight-picker-scrim" disabled={busy} onClick={onClose} type="button" />
    <section aria-label={step === "new" ? __msg("profile.newHighlight") : __msg("stories.addToHighlight")} aria-modal="true" className="story-highlight-picker-sheet" ref={dialog} role="dialog" tabIndex={-1}>
      <i aria-hidden="true" />
      <header>{step === "new" ? <button className="story-highlight-back" disabled={busy} onClick={() => { setStep("choose"); setError(""); }} type="button">{__msg("profile.back")}</button> : null}<h2>{step === "new" ? __msg("profile.newHighlight") : __msg("stories.addToHighlight")}</h2></header>
      {step === "choose" ? <>
        <div className="story-highlight-picker-list">
          <button disabled={busy} onClick={() => setStep("new")} type="button"><span className="story-highlight-new-circle"><FiPlus /></span><b>{__msg("discover.new")}</b></button>
          {highlights.data?.map((highlight) => <button disabled={busy} key={highlight.id} onClick={() => save(highlight)} type="button"><span><HighlightCover story={highlight.stories?.[0]} url={highlight.coverUrl} /></span><b dir="auto">{highlight.name}</b></button>)}
        </div>
        {highlights.isPending ? <p className="story-highlight-status" role="status">{__msg("stories.loadingHighlights")}</p> : null}
        {highlights.isError ? <p className="story-highlight-status" role="alert">{__msg("stories.couldNotLoadHighlights")} <button onClick={() => highlights.refetch()} type="button">{__msg("activity.retry")}</button></p> : null}
        <small>{__msg("stories.highlightsStayOnYourProfileAfterTheStoryIs")}</small>
      </> : <form className="story-highlight-create" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className="story-highlight-cover-preview"><HighlightCover story={story} /></div>
        <input aria-label={__msg("profile.highlightName")} autoFocus disabled={busy} maxLength={16} onChange={(event) => setName(event.target.value)} placeholder={__msg("profile.highlights")} value={name} />
        <button className={!name.trim() ? "is-empty" : ""} disabled={busy} type="submit">{busy ? __msg("stories.adding_ffb2e6") : __msg("publication.add")}</button>
      </form>}
      {busy && step === "choose" ? <p className="story-highlight-status" role="status">{__msg("stories.adding_ffb2e6")}</p> : null}
      {error ? <p className="story-highlight-error" role="alert">{__systemMessage(error)}</p> : null}
    </section>
  </div>, document.body);
}
