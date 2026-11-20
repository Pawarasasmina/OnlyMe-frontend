import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage";
import WallSheetFrame from "../fanWeb/home/WallSheetFrame";
import { useDiscoverFollowMutation, useHideDiscoverCreator } from "../../hooks/useDiscoverQuery";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import DiscoverEncounterPreview from "./DiscoverEncounterPreview";

function WorldIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="4.5"/><ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-18 12 12)"/></svg>;
}

function FollowIcon({ unfollow = false, ...props }) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d={unfollow ? "M16 11h6" : "M19 8v6M22 11h-6"}/></svg>;
}
function UnfollowIcon(props) { return <FollowIcon {...props} unfollow />; }
function MessageIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z"/></svg>;
}
function PreviewIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C5.3 7.8 18.7 7.8 22 12 18.7 16.2 5.3 16.2 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function HideIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12C5.4 6.9 18.6 6.9 21.5 12c-1 1.8-2.7 3.4-4.8 4.4M9.5 18.6c-3-.8-5.6-3.2-7-6.6M3 3l18 18M9.9 9.9a3 3 0 104.2 4.2"/></svg>;
}

export default function DiscoverQuickActions({ card, anchorRef, queryParams, onClose }) {
  useLanguage();
  const navigate = useNavigate();
  const { showToast } = useFanToast();
  const [preview, setPreview] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const dismiss = (after) => {
    if (closeTimer.current !== null) return;
    setClosing(true);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400;
    closeTimer.current = window.setTimeout(() => {
      onClose();
      if (typeof after === "function") after();
    }, duration);
  };
  const follow = useDiscoverFollowMutation(queryParams);
  const hide = useHideDiscoverCreator(queryParams);
  const id = card.userId || card.creator?.id || card.creatorId || card.id;
  const username = card.username || card.creator?.username;
  const name = username || card.displayName || card.creator?.name || msg("discover.creator");
  const following = Boolean(card.isFollowing || card.following || card.actions?.following);
  const world = card.world || card.featuredOffer;
  const worldRoute = world?.route || (world?.id ? `/world/${world.id}` : null);
  const busy = closing || follow.isPending || hide.isPending;
  const fail = error => showToast(error?.response?.data?.message || msg("social.somethingWentWrongWhileLoadingRecommendations"));
  const go = route => dismiss(() => navigate(route));
  const row = (Icon, label, action, disabled = false) => <button className={`discover-quick-action${Icon === WorldIcon ? " is-world" : ""}`} disabled={busy || disabled} onClick={action} type="button"><span className="discover-quick-icon"><Icon aria-hidden="true"/></span><span className="discover-quick-label">{label}</span></button>;
  const hidePerson = () => hide.mutate(id, { onSuccess: () => dismiss(), onError: fail });
  return <WallSheetFrame contentKey={preview ? "preview" : "actions"} className={`discover-quick-layer${closing ? " is-closing" : ""}`} anchorRef={anchorRef} title={name} onClose={dismiss}>
    <div className="discover-quick-actions">
      {preview ? <DiscoverEncounterPreview card={card} queryParams={queryParams} go={go} onHide={hidePerson} disabled={busy}/> : <>
        <h2 dir="auto">{name}</h2>
        {row(following ? UnfollowIcon : FollowIcon, following ? msg("profile.unfollow") : msg("discover.follow"), () => follow.mutate({ ...card, username }, { onSuccess: () => dismiss(), onError: fail }), !username)}
        {row(MessageIcon, msg("discover.message"), () => go(`/messages?with=${encodeURIComponent(id)}`), !id)}
        {worldRoute ? row(WorldIcon, msg("discover.viewWorld"), () => go(worldRoute)) : null}
        {row(PreviewIcon, msg("admin.preview"), () => setPreview(true))}
        {row(HideIcon, msg("discover.notInterested"), hidePerson, !id)}
      </>}
    </div>
  </WallSheetFrame>;
}
