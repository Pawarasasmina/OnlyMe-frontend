/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiGift, FiLock, FiMessageCircle, FiMoreHorizontal, FiPlus, FiShare2, FiSlash, FiUser, FiVolumeX, FiX } from "react-icons/fi";
import { profileService } from "../../services/profileService";
import { messageService } from "../../services/messageService";
import { useAuth } from "../../hooks/useAuth";
import { relativeTime } from "../../utils/relativeTime";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import ShareSheet from "../share/ShareSheet";
import StoryGiftPicker from "../stories/StoryGiftPicker";
import "./BringFriendsFlow.css";

const firstName = person => (person?.name || person?.displayName || person?.username || __msg("messages.yourFriend")).split(/\s+/)[0];
const personProfile = person => `/profile/${encodeURIComponent(person.username)}`;
function useInvitations(user) {
  return useQuery({ queryKey: ["owner-invitations", user?.id || user?._id], queryFn: () => profileService.getInvitations().then(r => r.data.data), retry: false, refetchInterval: 30000 });
}
function InvitationState({ query, children }) {
  __useUiLanguage();
  if (query.isPending) return <p className="invite-state" role="status">{__msg("profile.loadingInvitations")}</p>;
  if (query.isError) return <div className="invite-state" role="alert"><p>{__msg("profile.unableToLoadYourInvitations")}</p><button onClick={() => query.refetch()} type="button">{__msg("discover.tryAgain")}</button></div>;
  return children;
}

export function InviteLanding({ inviter, onClose, onJoin, busy = false }) {
  __useUiLanguage();
  const first = firstName(inviter);
  return <div className="invite-landing-panel">
    <div className="invite-landing-top"><button aria-label={__msg("profile.closeInvitation")} onClick={onClose} type="button"><FiX /></button></div>
    <div className="invite-landing-body"><FanAvatar name={inviter.name || inviter.displayName} size="h-[104px] w-[104px]" src={inviter.avatar || inviter.avatarUrl} /><small>{first.toUpperCase()} {__msg("profile.invitedYou")}</small><h1>{__msg("profile.join")} {first} {__msg("profile.onSeen")}</h1><p>{__msg("profile.seeWhatYourPeopleAreLivingRightNow")}</p></div>
    <div className="invite-landing-actions"><button className="invite-primary" disabled={busy} onClick={() => onJoin(true)} type="button">{__msg("profile.join")}</button><p><FiLock /> {first} {__msg("profile.willSeeThatYouJoinedOnly")} {first}.</p><button className="invite-private-join" disabled={busy} onClick={() => onJoin(false)} type="button">{__msg("profile.joinWithoutTelling")} {first}</button></div>
  </div>;
}

export default function BringFriendsFlow({ user, onClose, onFullScreen }) {
  __useUiLanguage();
  const query = useInvitations(user);
  const [preview, setPreview] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useFanToast();
  const client = useQueryClient();
  useEffect(() => { onFullScreen(preview); }, [preview, onFullScreen]);
  useEffect(() => { if (query.data?.ringEarned) client.invalidateQueries({ queryKey: ["unified-profile"] }); }, [query.data?.ringEarned, client]);
  const data = query.data || {}, friends = data.friends || [], count = data.joinedCount || 0;
  const inviteUrl = data.code ? `${window.location.origin}/invite/${data.code}` : "";
  const payload = { contentType: "invitation", contentId: user?.id || user?._id, canonicalUrl: inviteUrl, destinationRoute: `/invite/${data.code}`, title: __msg("messages.value0InvitedYouToSeen", { value0: firstName(user) }), author: user };
  if (preview) return <InviteLanding inviter={user} onClose={onClose} onJoin={visible => { onClose(); showToast(visible ? __msg("system.copy.76a417772044") : __msg("system.BringFriendsFlow.d75a9886b1", { value0: firstName(user) }), { variant: "archive", duration: 1600 }); }} />;
  return <InvitationState query={query}><div className="bring-friends-home">
    <div className="bring-friends-faces">{Array.from({ length: 3 }, (_, i) => friends[i] ? <div key={friends[i].id}><FanAvatar name={friends[i].name} src={friends[i].avatar} size="h-[56px] w-[56px]" /><small>{firstName(friends[i])}</small></div> : <span aria-label={__msg("profile.inviteAFriend")} className="bring-friends-placeholder" key={i}><FiPlus /></span>)}</div>
    {count ? <button className="invite-text-link invite-see-all" onClick={() => { onClose(); navigate("/invitations"); }} type="button">{__msg("profile.seeAll")}{count}) ›</button> : null}
    <h2>{data.ringEarned || count >= 3 ? __msg("profile.yourGoldRingIsOn") : __msg("profile.moreAndAGoldRing", { value0: 3 - count, value1: 3 - count === 1 ? "friend" : "friends" })}</h2>
    <p>{__msg("profile.inviteThePeopleYouWantHereWhenThreeJoin")}</p>
    <button className="invite-primary" disabled={!inviteUrl} onClick={() => setShareOpen(true)} type="button">{__msg("profile.sendAnInvite")}</button>
    <small className="invite-privacy"><FiLock /> {__msg("profile.onlyYouSeeWhoJoinedWithYourInvite")}</small>
    <button className="invite-text-link invite-preview-button" onClick={() => setPreview(true)} type="button">{__msg("profile.seeWhatYourFriendSees")}</button>
  </div><ShareSheet isOpen={shareOpen} onClose={() => { setShareOpen(false); onClose(); }} payload={payload} /></InvitationState>;
}

export function JoinedInvitationsPage() {
  __useUiLanguage();
  const { user } = useAuth();
  const query = useInvitations(user);
  const navigate = useNavigate();
  const client = useQueryClient();
  const { showToast } = useFanToast();
  const [menu, setMenu] = useState(null), [gift, setGift] = useState(null), [share, setShare] = useState(null), [busy, setBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  useEffect(() => { setConfirmBlock(false); }, [menu]);
  const [menuPosition, setMenuPosition] = useState(undefined);
  useEffect(() => {
    if (!menu) return undefined;
    const column = document.querySelector(".social-center-scroll");
    const update = () => { if (column) { const rect = column.getBoundingClientRect(); setMenuPosition({ position: "fixed", left: rect.left, width: rect.width, bottom: 0 }); } };
    update();
    const previous = document.activeElement;
    const panel = document.querySelector(".invite-person-menu");
    panel?.querySelector("button")?.focus();
    const keydown = event => {
      if (event.key === "Escape" && !busy) setMenu(null);
      if (event.key === "Tab") {
        const buttons = [...(panel?.querySelectorAll("button:not(:disabled)") || [])];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("resize", update); window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [menu, busy, confirmBlock]);
  const muted = useQuery({ queryKey: ["muted-accounts"], queryFn: () => profileService.getMutedAccounts().then(r => r.data.data.items || []), enabled: Boolean(menu), retry: false });
  const isMuted = muted.data?.some(row => String(row.userId || row.creator?.id || row.id) === menu?.id);
  const message = person => navigate(`/messages?with=${encodeURIComponent(person.id)}`);
  const action = async type => {
    if (busy || !menu) return;
    const person = menu;
    setBusy(true);
    try {
      if (type === "mute") { await (isMuted ? profileService.unmuteAccount(person.id) : profileService.muteAccount(person.id)); showToast(isMuted ? __msg("profile.unmuted") : __msg("profile.muted"), { variant: "archive" }); client.invalidateQueries({ queryKey: ["muted-accounts"] }); client.invalidateQueries({ queryKey: ["settings", "muted-accounts"] }); }
      if (type === "block") { await messageService.block(person.id); showToast(__msg("profile.blocked"), { variant: "archive" }); }
      setMenu(null);
      for (const key of ["unified-profile", "seen-feed", "feed-posts", "discover"]) client.invalidateQueries({ queryKey: [key] });
    } catch (error) { showToast(error?.response?.data?.message || __msg("profile.couldNotUpdateThisAccount"), { variant: "archive" }); }
    finally { setBusy(false); }
  };
  const section = (title, people, showEmpty = false) => people?.length || showEmpty ? <section className="invite-people-section"><h2>{title} · {people?.length || 0}</h2>{people?.length ? people.map(person => <article className="invite-person-row" key={person.id}>
    <button className="invite-person-profile" onClick={() => navigate(personProfile(person))} type="button"><FanAvatar name={person.name} src={person.avatar} size="h-[46px] w-[46px]" /><span><b dir="auto">{person.name}</b><small dir="auto">@{person.username} {__msg("profile.joined")} {relativeTime(person.joinedAt)} {__msg("profile.ago")}</small></span></button>
    <button aria-label={__msg("profile.message", { value0: person.name })} className="invite-person-message" onClick={() => message(person)} type="button"><FiMessageCircle /></button><button aria-label={__msg("profile.moreAbout", { value0: person.name })} className="invite-person-more" onClick={() => setMenu(person)} type="button"><FiMoreHorizontal /></button>
  </article>) : <p className="invite-empty">{__msg("profile.noFriendsYet")} <button onClick={() => navigate("/profile?bringFriends=1")} type="button">{__msg("profile.invite")}</button></p>}</section> : null;
  return <main className="joined-invitations-page"><header><button aria-label={__msg("profile.backToProfile")} onClick={() => navigate("/profile")} type="button"><FiArrowLeft data-ui-directional="true" /></button><h1>{__msg("profile.joinedWithYourInvite")}</h1></header><p className="invite-list-privacy"><FiLock /> {__msg("profile.onlyYouSeeThisList")}</p><InvitationState query={query}>{section("FRIENDS", query.data?.friends, true)}{section("CREATORS", query.data?.creators)}</InvitationState>
    {menu ? <div className="invite-person-menu-layer"><button aria-label={__msg("profile.closePersonMenu")} className="invite-person-menu-dim" onClick={() => !busy && setMenu(null)} type="button" /><section aria-label={__msg("discover.actionsFor", { value0: menu.name })} className="invite-person-menu" style={menuPosition} role="dialog" aria-modal="true">{confirmBlock ? <div className="invite-block-confirm"><h2>{__msg("profile.block")} {firstName(menu)}?</h2><p>{__msg("profile.theyWonTSeeYourWorldAndYouWon")}</p><button disabled={busy} onClick={() => action("block")} type="button">{busy ? __msg("profile.blocking") : __msg("profile.block")}</button><button disabled={busy} onClick={() => setMenu(null)} type="button">{__msg("admin.cancel")}</button></div> : <><div className="invite-menu-person"><FanAvatar name={menu.name} src={menu.avatar} size="h-10 w-10" /><span><b dir="auto">{menu.name}</b><small dir="auto">@{menu.username}</small></span></div>
      <button disabled={busy} onClick={() => navigate(personProfile(menu))} type="button"><FiUser /> {__msg("onboarding.viewProfile")}</button><button disabled={busy} onClick={() => message(menu)} type="button"><FiMessageCircle /> {__msg("discover.message")}</button><button onClick={() => { setGift(menu); setMenu(null); }} type="button"><FiGift /> {__msg("profile.sendAGift")}</button><button onClick={() => { setShare({ contentType: "profile", contentId: menu.id, route: personProfile(menu), title: menu.name, author: menu }); setMenu(null); }} type="button"><FiShare2 /> {__msg("profile.shareProfile")}</button><button disabled={busy || muted.isPending} onClick={() => action("mute")} type="button"><FiVolumeX /> {isMuted ? __msg("profile.unmute") : __msg("profile.mute")}</button><button className="is-danger" disabled={busy} onClick={() => setConfirmBlock(true)} type="button"><FiSlash /> {__msg("profile.block")} {firstName(menu)}</button>
    </>}</section></div> : null}
    {gift ? <StoryGiftPicker onClose={() => setGift(null)} recipient={gift} sourceType="DIRECT" /> : null}
    <ShareSheet isOpen={Boolean(share)} onClose={() => setShare(null)} payload={share} />
  </main>;
}
