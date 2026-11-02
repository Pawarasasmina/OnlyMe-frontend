import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiMoreHorizontal, FiSend } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";
import { STORY_QUICK_REACTIONS, STORY_REACTIONS } from "../../constants/storyReactions";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import ShareSheet from "../share/ShareSheet";
import { usePhotoSurface } from "./usePhotoSurface";

export default function ProfilePhotoViewer({ active, items, isOwner, onClose, onSelect, onRemove, profile, error }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [menu, setMenu] = useState(false);
  const [tray, setTray] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [people, setPeople] = useState(false);
  const [filter, setFilter] = useState("");
  const [share, setShare] = useState(false);
  const [notice, setNotice] = useState("");
  const carousel = useRef(null);
  const gesture = useRef({});
  const timer = useRef(null);
  const scrollTimer = useRef(null);
  const closeLayer = () => { if (share) setShare(false); else if (people) setPeople(false); else if (menu) setMenu(false); else if (tray) setTray(false); else onClose(); };
  const position = usePhotoSurface(Boolean(active), closeLayer);
  const index = items.findIndex(item => item.id === active?.id);
  const username = profile.username;
  const queryKey = ["photo-reactions", username, active?.id];
  const reactions = useQuery({ queryKey, queryFn: () => profileService.getPhotoReactions(username, active.id).then(response => response.data.data), enabled: Boolean(active && username), retry: false });
  const react = useMutation({ mutationFn: reaction => profileService.setPhotoReaction(username, active.id, reaction).then(response => response.data.data), onSuccess: value => { client.setQueryData(queryKey, previous => ({ ...previous, ...value })); client.invalidateQueries({ queryKey }); client.invalidateQueries({ queryKey: ["profile-media"] }); setTray(false); }, onError: error => setNotice(error.response?.data?.message || "Could not save your reaction.") });
  const report = useMutation({ mutationFn: () => profileService.reportProfileMedia(username, active.id, { reason: "OTHER" }), onSuccess: () => { setMenu(false); setNotice("Report received. Our team will review this photo."); }, onError: () => setNotice("Unable to submit the report. Please try again.") });
  useEffect(() => {
    setMenu(false); setTray(false); setPeople(false); setFilter(""); setNotice("");
    const el = carousel.current; if (el && index >= 0 && Math.abs(el.scrollLeft - index * el.clientWidth) > 2) el.scrollTo({ left: index * el.clientWidth, behavior: "instant" });
  }, [active?.id, index]);
  useEffect(() => {
    if (!active) return undefined;
    const keydown = event => {
      if (people || menu || share) return;
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); onSelect(items[index - 1]); }
      if (event.key === "ArrowRight" && index < items.length - 1) { event.preventDefault(); onSelect(items[index + 1]); }
    };
    window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("keydown", keydown); clearTimeout(timer.current); clearTimeout(scrollTimer.current); };
  }, [active, index, items, onSelect, people, menu, share]);
  if (!active) return null;
  const data = reactions.data || {};
  const count = data.reactionCount || 0;
  const top = Object.entries(data.reactionBreakdown || {}).sort((a, b) => b[1] - a[1]);
  const sendReaction = emoji => { if (user && !react.isPending) react.mutate(emoji); };
  const imageUrl = resolveMediaUrl(active.url || active.mediaUrl);
  const name = (profile.displayName || user?.name || username || "Profile").split(" ")[0];
  const start = event => {
    gesture.current = { x: event.clientX, y: event.clientY, left: carousel.current.scrollLeft, moved: false, mouse: event.pointerType === "mouse" };
    if (gesture.current.mouse) event.currentTarget.setPointerCapture?.(event.pointerId);
    clearTimeout(timer.current); timer.current = setTimeout(() => { gesture.current.held = true; setTray(true); }, 450);
  };
  const move = event => {
    const g = gesture.current; if (g.x === undefined) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (Math.hypot(dx, dy) > 8) { g.moved = true; clearTimeout(timer.current); }
    if (g.mouse && g.moved) carousel.current.scrollLeft = g.left - dx;
  };
  const end = event => {
    clearTimeout(timer.current); const g = gesture.current;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (dy > 90 && Math.abs(dx) < Math.abs(dy) * .6) onClose();
    else if (g.mouse && g.moved) {
      const next = Math.max(0, Math.min(items.length - 1, index + (dx < -40 ? 1 : dx > 40 ? -1 : 0)));
      carousel.current.scrollTo({ left: next * carousel.current.clientWidth, behavior: "smooth" });
      if (next !== index) onSelect(items[next]);
    }
    gesture.current = {};
  };
  return createPortal(<div aria-label="Photo viewer" aria-modal="true" className="profile-photo-viewer" role="dialog" style={position}>
    <div className="photo-viewer-body">
      <header className="photo-viewer-header"><button aria-label="Close photo viewer" className="photo-viewer-back" onClick={onClose} type="button"><FiArrowLeft /></button><FanAvatar name={name} size="h-[30px] w-[30px]" src={resolveMediaUrl(profile.avatar || (isOwner ? user?.avatar : ""))} /><b>{name}</b><span>{index + 1} / {items.length}</span><button aria-label="Photo options" aria-expanded={menu} className="photo-viewer-more" onClick={() => setMenu(!menu)} type="button"><FiMoreHorizontal /></button></header>
      <div className="photo-viewer-image-shell">
        <div className="photo-viewer-carousel" onDoubleClick={() => sendReaction("❤️")} onPointerCancel={end} onPointerDown={start} onPointerMove={move} onPointerUp={end} onScroll={() => {
          clearTimeout(scrollTimer.current); scrollTimer.current = setTimeout(() => { const el = carousel.current; if (!el) return; const next = Math.round(el.scrollLeft / el.clientWidth); if (items[next] && next !== index) onSelect(items[next]); }, 120);
        }} ref={carousel}>
          {items.map((item, offset) => <div className="photo-viewer-slide" key={item.id}><PhotoFrame item={item} load={Math.abs(offset - index) < 2} /></div>)}
        </div>
        {index > 0 ? <button aria-label="Previous photo" className="photo-viewer-arrow is-prev" onClick={() => onSelect(items[index - 1])} type="button"><FiChevronLeft /></button> : null}
        {index < items.length - 1 ? <button aria-label="Next photo" className="photo-viewer-arrow is-next" onClick={() => onSelect(items[index + 1])} type="button"><FiChevronRight /></button> : null}
      </div>
      <footer className="photo-viewer-footer">
        <button aria-label="People who reacted" className="photo-reaction-faces" onClick={() => { setPeople(true); setFilter(""); }} type="button">{(data.reactionPreview || []).map(person => <FanAvatar key={person.id} name={person.name} size="h-5 w-5" src={resolveMediaUrl(person.avatar)} />)}</button>
        <button aria-label="Photo reactions" aria-expanded={tray} className={`photo-reaction-capsule ${data.viewerReaction ? "is-selected" : ""}`} onClick={() => { if (!gesture.current.held) setTray(!tray); gesture.current.held = false; }} onPointerDown={() => { clearTimeout(timer.current); timer.current = setTimeout(() => { gesture.current.held = true; setPeople(true); setFilter(""); }, 450); }} onPointerUp={() => clearTimeout(timer.current)} onPointerLeave={() => clearTimeout(timer.current)} type="button"><span>{(top.length ? top.slice(0, 2).map(([emoji]) => emoji) : ["❤️", "🔥"]).join("")}</span><b>{count || "+"}</b></button>
        <button aria-label="Share photo" className="photo-viewer-share" onClick={() => setShare(true)} type="button"><FiSend /></button>
        <div aria-label="Photo position" className="photo-viewer-dots">{items.map((item, offset) => <button aria-label={`Photo ${offset + 1}`} aria-current={offset === index ? "true" : undefined} className={offset === index ? "is-current" : ""} key={item.id} onClick={() => onSelect(item)} type="button" />)}</div>
        {tray ? <div aria-label="Choose a reaction" className={`photo-reaction-tray ${expanded ? "is-expanded" : ""}`} role="group">{(expanded ? STORY_REACTIONS : STORY_QUICK_REACTIONS).map(emoji => <button aria-label={`React with ${emoji}`} aria-pressed={data.viewerReaction === emoji} disabled={!user || react.isPending} key={emoji} onClick={() => sendReaction(data.viewerReaction === emoji ? null : emoji)} type="button">{emoji}</button>)}<button aria-label={expanded ? "Fewer reactions" : "More reactions"} onClick={() => setExpanded(!expanded)} type="button">{expanded ? "−" : "+"}</button></div> : null}
      </footer>
      {notice || error ? <p className="photo-error" role="status">{notice || error}</p> : null}
    </div>
    {menu ? <div className="photo-sub-overlay"><button aria-label="Close photo options" className="photo-modal-dim" onClick={() => setMenu(false)} type="button" /><section aria-label="Photo options" className="photo-options-sheet"><span className="photo-sheet-handle" /><button onClick={() => { setMenu(false); setShare(true); }} type="button">Share</button>{isOwner ? <button className="is-danger" onClick={() => { setMenu(false); onRemove(active); }} type="button">Delete photo</button> : <button className="is-danger" disabled={report.isPending} onClick={() => report.mutate()} type="button">Report photo</button>}</section></div> : null}
    {people ? <div className="photo-sub-overlay"><button aria-label="Close reactions" className="photo-modal-dim" onClick={() => setPeople(false)} type="button" /><section aria-label="Reactions" className="photo-reactors-sheet"><span className="photo-sheet-handle" /><h2>Reactions <small>{count}</small></h2><nav aria-label="Filter reactions"><button aria-pressed={!filter} onClick={() => setFilter("")} type="button">All</button>{top.map(([emoji, total]) => <button aria-pressed={filter === emoji} key={emoji} onClick={() => setFilter(emoji)} type="button">{emoji} {total}</button>)}</nav>{reactions.isLoading ? <p>Loading reactions…</p> : reactions.isError ? <button onClick={() => reactions.refetch()} type="button">Unable to load. Retry</button> : <div className="photo-reactors-list">{(data.reactors || []).filter(person => !filter || person.emoji === filter).map(person => <Link key={person.id} onClick={onClose} to={person.username ? `/profile/${person.username}` : "#"}><FanAvatar name={person.name} size="h-[38px] w-[38px]" src={resolveMediaUrl(person.avatar)} /><b>{person.name}</b><span>{person.emoji}</span></Link>)}{!count ? <p>No reactions yet.</p> : null}</div>}</section></div> : null}
    <ShareSheet isOpen={share} onClose={() => setShare(false)} payload={{ contentId: String(profile.ownerUserId || user?.id || ""), contentType: "profile", route: `/profile/${encodeURIComponent(username)}?photo=${active.id}`, title: `${name}’s photo`, imageUrl, author: { name: profile.displayName, username, avatar: profile.avatar }, storyDraft: { imageUrl } }} />
  </div>, document.body);
}

function PhotoFrame({ item, load }) {
  const [ready, setReady] = useState(false);
  const src = resolveMediaUrl(item.url || item.mediaUrl);
  return <div className={`photo-viewer-frame ${ready ? "is-ready" : ""}`} style={{ backgroundImage: `url("${resolveMediaUrl(item.thumbnailUrl || item.url || item.mediaUrl)}")` }}><img alt={item.caption || "Profile photo"} draggable="false" loading={load ? "eager" : "lazy"} onLoad={() => setReady(true)} src={src} /></div>;
}
