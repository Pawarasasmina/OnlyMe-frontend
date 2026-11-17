import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { msg, getLocale, optionLabel } from "../../../i18n/runtime.js";
import { useLanguage } from "../../../hooks/useLanguage";
import { useAuth } from "../../../hooks/useAuth";
import { firstWallPhoto, wallPricePresentation } from "../../../utils/wallMarketplace";
import { relativeTime } from "../../../utils/relativeTime";
import { resolveMediaUrl } from "../../../utils/media";
import FanAvatar from "../shared/FanAvatar";
import { wallClosedLabel } from "../../../utils/wallResolution";

export default function WallMarketplaceTile({ post, hideCategory = false, location: feedLocation = "" }) {
  useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const author = post.author || post.creator || {};
  const own = post.isOwner || Boolean((user?.id || user?._id) && String(author.id || author._id) === String(user.id || user._id));
  const name = own ? msg("fanWeb.you") : author.name || author.displayName || author.username || msg("fanWeb.author");
  const photo = firstWallPhoto(post);
  const text = post.text || post.transcript || post.media?.find(item => item.transcript)?.transcript || "";
  const price = wallPricePresentation(post, { locale: getLocale(), freeLabel: msg("profile.free"), location: feedLocation });
  const closedLabel = wallClosedLabel(post);
  const id = post.originalPostId || post.id || post._id;
  const target = { pathname: `/posts/${encodeURIComponent(id)}` };
  const state = { wallReturnTo: location.pathname + location.search };
  const [more, setMore] = useState(false);
  const scrollRef = useRef(null);
  const gestureRef = useRef({ moved: false, x: 0, y: 0 });
  const checkScroll = () => {
    const element = scrollRef.current;
    if (element) setMore(element.scrollHeight > element.clientHeight + 2 && element.scrollTop + element.clientHeight < element.scrollHeight - 2);
  };
  useEffect(() => {
    checkScroll();
    const observer = new ResizeObserver(checkScroll);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [text, photo?.url, photo?.secureUrl]);
  return <article className="wall-market-tile" onPointerDownCapture={event => {
    gestureRef.current = { moved: false, x: event.clientX, y: event.clientY };
  }} onPointerMoveCapture={event => {
    if (Math.hypot(event.clientX - gestureRef.current.x, event.clientY - gestureRef.current.y) > 8) gestureRef.current.moved = true;
  }} onPointerCancelCapture={() => { gestureRef.current.moved = true; }} onScrollCapture={() => { gestureRef.current.moved = true; }} onClick={event => {
    if (event.target.closest("a,button,input,textarea") || gestureRef.current.moved || window.getSelection()?.toString()) return;
    navigate(target, { state });
  }} onKeyDown={event => {
    if (event.key === "Enter" && event.target === scrollRef.current) { event.preventDefault(); navigate(target, { state }); }
  }}>
    <div className="wall-market-image">
      {photo ? <Link className="wall-market-photo-link" to={target} state={state} aria-label={msg("wallGrid.openNote")}><img className="wall-market-photo" src={resolveMediaUrl(photo.url || photo.secureUrl)} alt="" loading="lazy" /></Link>
        : <div aria-label={msg("wallGrid.noteText")} className={`wall-market-text${more ? " has-more" : ""}`} dir="auto" onScroll={checkScroll} ref={scrollRef} role="region" tabIndex={0}>{text}</div>}
      <Link className="wall-market-avatar" to={target} state={state} aria-label={msg("wallGrid.openNote")}><FanAvatar name={name} src={author.avatar || author.avatarUrl} size="h-6 w-6" /></Link>
      {price ? <Link className="wall-market-price" to={target} state={state} title={price}>{price}</Link> : null}
    </div>
    {closedLabel || (!hideCategory && !price) ? <Link className="wall-market-category" to={target} state={state}>{closedLabel || optionLabel(post.postType || post.context || "Community")}</Link> : null}
    {photo && text ? <Link aria-label={msg("wallGrid.openNote")} className="wall-market-caption" dir="auto" state={state} to={target}>{text}</Link> : null}
    <Link className="wall-market-meta" to={target} state={state} title={[name, post.location, relativeTime(post.publishedAt || post.createdAt)].filter(Boolean).join(" · ")}>{name}{post.location ? ` · ${String(post.location).split(",")[0]}` : ""} · {relativeTime(post.publishedAt || post.createdAt)}{post.editedAt ? ` ? ${msg("wallEdit.edited")}` : ""}</Link>
  </article>;
}
