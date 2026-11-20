import { msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage";
import { useDiscoverSeeYouMutation } from "../../hooks/useDiscoverQuery";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import DiscoverPreviewMedia from "./DiscoverPreviewMedia";

export default function DiscoverEncounterPreview({ card, queryParams, go, onHide, disabled }) {
  useLanguage();
  const { showToast } = useFanToast();
  const signal = useDiscoverSeeYouMutation(queryParams);
  const preview = card.preview || {};
  const id = card.userId || card.creator?.id || card.creatorId || card.id;
  const username = card.username || card.creator?.username;
  const name = card.displayName || card.creator?.name || username;
  const profileRoute = card.profileUrl || `/profile/${encodeURIComponent(username)}`;
  const status = preview.activeStatus || card.activeStatus;
  const statusLine = [status ? `${status.emoji || ""} ${status.label || ""}`.trim() : card.creator?.status, card.city || card.creator?.location?.city].filter(Boolean).join(" · ");
  const cover = preview.cover || (card.media?.type === "video" ? card.media.poster : card.coverImage) || card.avatar;
  const seens = (preview.seens || (card.featuredSeen ? [card.featuredSeen] : [])).slice(0, 3);
  const sent = Boolean(card.actions?.hasSeenSignal || signal.isSuccess);
  const mutual = sent && Boolean(preview.hasIncomingSignal);
  const happening = preview.happeningNow || card.quote || status?.label;
  const sendSignal = () => {
    if (sent || signal.isPending) return;
    signal.mutate(id, { onError: error => showToast(error?.response?.data?.message || msg("orbit.unableToSendThatSignal")) });
  };
  return <div className="discover-encounter">
    <button className="discover-encounter-profile" onClick={() => go(profileRoute)} type="button" aria-label={msg("discover.viewProfile")}>
      <span className="discover-encounter-banner"><DiscoverPreviewMedia sources={[cover, card.avatar, card.creator?.avatar]}/><span/></span>
      <span className="discover-encounter-identity">
        <FanAvatar name={name} src={card.avatar || card.creator?.avatar} size="h-[62px] w-[62px]"/>
        <span className="discover-encounter-name"><strong dir="auto"><span><bdi dir="ltr"><i>@</i>{username || name}</bdi></span>{card.isVerified || card.creator?.verified ? <VerifiedBadge variant="profile"/> : null}</strong>{statusLine ? <small dir="auto">{statusLine}</small> : null}</span>
      </span>
    </button>
    {happening ? <div className="discover-encounter-now"><span>{msg("orbit.happeningNow")}</span><p dir="auto">“{happening}”</p></div> : null}
    {preview.sharedWalk?.title ? <div className="discover-encounter-shared"><span aria-hidden="true">⭐</span>{msg("discover.bothWalked", { title: preview.sharedWalk.title })}</div> : null}
    {seens.length ? <div className="discover-encounter-seens">
      {seens.map(seen => <button key={seen.id} onClick={() => go(seen.route || `/seen/${seen.id}`)} type="button" aria-label={seen.title}>
        <DiscoverPreviewMedia media={seen.coverMedia} sources={[seen.cover, seen.coverImage, seen.thumbnailUrl, cover, card.avatar, card.creator?.avatar]} alt={seen.title}/><span/><strong dir="auto">{seen.title}</strong>
      </button>)}
    </div> : null}
    {preview.quote ? <p className="discover-encounter-quote" dir="auto">“{preview.quote}”</p> : null}
    {card.dream?.title ? <button className="discover-encounter-dream" type="button" onClick={() => go(card.dream.status === "completed" ? profileRoute : `${profileRoute}?dream=${encodeURIComponent(card.dream.id || "")}`)}>
      <span aria-hidden="true">{card.dream.status === "completed" ? "✅" : card.dream.emoji || "✨"}</span>
      <span><strong dir="auto">{card.dream.status === "completed" ? msg("orbit.dreamCompleted") : msg("orbit.dreamsOf", { value0: card.dream.title })}</strong><small>{msg(card.dream.status === "completed" ? "orbit.askHowItWent" : "orbit.helpMakeItHappen")}</small></span><span aria-hidden="true">›</span>
    </button> : null}
    <div className="discover-encounter-actions">
      <button type="button" aria-pressed={sent} disabled={disabled || sent || signal.isPending} onClick={sendSignal}><span aria-hidden="true">{mutual ? "💫" : "👁"}</span> {signal.isPending ? msg("orbit.sending") : mutual ? msg("fan.youSeeEachOther") : sent ? msg("discover.signalSeen") : msg("discover.iSeeYou")}</button>
      <button type="button" disabled={disabled} onClick={() => go(`/messages?with=${encodeURIComponent(id)}`)}><span aria-hidden="true">💬</span> {msg("discover.message")}</button>
    </div>
    <p className="discover-encounter-hint">{sent ? msg("discover.onlyPersonSees", { name: name?.split(" ")[0] || username }) : msg("orbit.tapThePhotoToStepInside")}</p>
    <button className="discover-encounter-hide" type="button" disabled={disabled} onClick={onHide}>{msg("social.notInterested")}</button>
  </div>;
}
