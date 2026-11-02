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

const firstName = person => (person?.name || person?.displayName || person?.username || "Your friend").split(/\s+/)[0];
const personProfile = person => `/profile/${encodeURIComponent(person.username)}`;
function useInvitations(user) {
  return useQuery({ queryKey: ["owner-invitations", user?.id || user?._id], queryFn: () => profileService.getInvitations().then(r => r.data.data), retry: false, refetchInterval: 30000 });
}
function InvitationState({ query, children }) {
  if (query.isPending) return <p className="invite-state" role="status">Loading invitations…</p>;
  if (query.isError) return <div className="invite-state" role="alert"><p>Unable to load your invitations.</p><button onClick={() => query.refetch()} type="button">Try again</button></div>;
  return children;
}

export function InviteLanding({ inviter, onClose, onJoin, busy = false }) {
  const first = firstName(inviter);
  return <div className="invite-landing-panel">
    <div className="invite-landing-top"><button aria-label="Close invitation" onClick={onClose} type="button"><FiX /></button></div>
    <div className="invite-landing-body"><FanAvatar name={inviter.name || inviter.displayName} size="h-[104px] w-[104px]" src={inviter.avatar || inviter.avatarUrl} /><small>{first.toUpperCase()} INVITED YOU</small><h1>Join {first} on @seen</h1><p>See what your people are living right now.</p></div>
    <div className="invite-landing-actions"><button className="invite-primary" disabled={busy} onClick={() => onJoin(true)} type="button">Join</button><p><FiLock /> {first} will see that you joined — only {first}.</p><button className="invite-private-join" disabled={busy} onClick={() => onJoin(false)} type="button">Join without telling {first}</button></div>
  </div>;
}

export default function BringFriendsFlow({ user, onClose, onFullScreen }) {
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
  const payload = { contentType: "invitation", contentId: user?.id || user?._id, canonicalUrl: inviteUrl, destinationRoute: `/invite/${data.code}`, title: `${firstName(user)} invited you to @seen`, author: user };
  if (preview) return <InviteLanding inviter={user} onClose={onClose} onJoin={visible => { onClose(); showToast(visible ? "This is what your friend sees ✓" : `Joined — ${firstName(user)} won’t be told`, { variant: "archive", duration: 1600 }); }} />;
  return <InvitationState query={query}><div className="bring-friends-home">
    <div className="bring-friends-faces">{Array.from({ length: 3 }, (_, i) => friends[i] ? <div key={friends[i].id}><FanAvatar name={friends[i].name} src={friends[i].avatar} size="h-[56px] w-[56px]" /><small>{firstName(friends[i])}</small></div> : <span aria-label="Invite a friend" className="bring-friends-placeholder" key={i}><FiPlus /></span>)}</div>
    {count ? <button className="invite-text-link invite-see-all" onClick={() => { onClose(); navigate("/invitations"); }} type="button">See all ({count}) ›</button> : null}
    <h2>{data.ringEarned || count >= 3 ? "Your gold ring is on" : `${3 - count} more ${3 - count === 1 ? "friend" : "friends"} — and a gold ring`}</h2>
    <p>Invite the people you want here. When three join, your photo gets a gold ring — for good.</p>
    <button className="invite-primary" disabled={!inviteUrl} onClick={() => setShareOpen(true)} type="button">Send an invite</button>
    <small className="invite-privacy"><FiLock /> Only you see who joined with your invite</small>
    <button className="invite-text-link invite-preview-button" onClick={() => setPreview(true)} type="button">See what your friend sees ›</button>
  </div><ShareSheet isOpen={shareOpen} onClose={() => { setShareOpen(false); onClose(); }} payload={payload} /></InvitationState>;
}

export function JoinedInvitationsPage() {
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
      if (type === "mute") { await (isMuted ? profileService.unmuteAccount(person.id) : profileService.muteAccount(person.id)); showToast(isMuted ? "Unmuted ✓" : "Muted ✓", { variant: "archive" }); client.invalidateQueries({ queryKey: ["muted-accounts"] }); }
      if (type === "block") { await messageService.block(person.id); showToast("Blocked ✓", { variant: "archive" }); }
      setMenu(null);
      for (const key of ["unified-profile", "seen-feed", "feed-posts", "discover"]) client.invalidateQueries({ queryKey: [key] });
    } catch (error) { showToast(error?.response?.data?.message || "Could not update this account.", { variant: "archive" }); }
    finally { setBusy(false); }
  };
  const section = (title, people, showEmpty = false) => people?.length || showEmpty ? <section className="invite-people-section"><h2>{title} · {people?.length || 0}</h2>{people?.length ? people.map(person => <article className="invite-person-row" key={person.id}>
    <button className="invite-person-profile" onClick={() => navigate(personProfile(person))} type="button"><FanAvatar name={person.name} src={person.avatar} size="h-[46px] w-[46px]" /><span><b>{person.name}</b><small>@{person.username} · joined {relativeTime(person.joinedAt)} ago</small></span></button>
    <button aria-label={`Message ${person.name}`} className="invite-person-message" onClick={() => message(person)} type="button"><FiMessageCircle /></button><button aria-label={`More about ${person.name}`} className="invite-person-more" onClick={() => setMenu(person)} type="button"><FiMoreHorizontal /></button>
  </article>) : <p className="invite-empty">No friends yet. <button onClick={() => navigate("/profile?bringFriends=1")} type="button">Invite ›</button></p>}</section> : null;
  return <main className="joined-invitations-page"><header><button aria-label="Back to profile" onClick={() => navigate("/profile")} type="button"><FiArrowLeft /></button><h1>Joined with your invite</h1></header><p className="invite-list-privacy"><FiLock /> Only you see this list</p><InvitationState query={query}>{section("FRIENDS", query.data?.friends, true)}{section("CREATORS", query.data?.creators)}</InvitationState>
    {menu ? <div className="invite-person-menu-layer"><button aria-label="Close person menu" className="invite-person-menu-dim" onClick={() => !busy && setMenu(null)} type="button" /><section aria-label={`Actions for ${menu.name}`} className="invite-person-menu" style={menuPosition} role="dialog" aria-modal="true">{confirmBlock ? <div className="invite-block-confirm"><h2>Block {firstName(menu)}?</h2><p>They won’t see your world and you won’t see theirs. They won’t be told.</p><button disabled={busy} onClick={() => action("block")} type="button">{busy ? "Blocking..." : "Block"}</button><button disabled={busy} onClick={() => setMenu(null)} type="button">Cancel</button></div> : <><div className="invite-menu-person"><FanAvatar name={menu.name} src={menu.avatar} size="h-10 w-10" /><span><b>{menu.name}</b><small>@{menu.username}</small></span></div>
      <button disabled={busy} onClick={() => navigate(personProfile(menu))} type="button"><FiUser /> View profile</button><button disabled={busy} onClick={() => message(menu)} type="button"><FiMessageCircle /> Message</button><button onClick={() => { setGift(menu); setMenu(null); }} type="button"><FiGift /> Send a gift</button><button onClick={() => { setShare({ contentType: "profile", contentId: menu.id, route: personProfile(menu), title: menu.name, author: menu }); setMenu(null); }} type="button"><FiShare2 /> Share profile</button><button disabled={busy || muted.isPending} onClick={() => action("mute")} type="button"><FiVolumeX /> {isMuted ? "Unmute" : "Mute"}</button><button className="is-danger" disabled={busy} onClick={() => setConfirmBlock(true)} type="button"><FiSlash /> Block {firstName(menu)}</button>
    </>}</section></div> : null}
    {gift ? <StoryGiftPicker onClose={() => setGift(null)} recipient={gift} sourceType="DIRECT" /> : null}
    <ShareSheet isOpen={Boolean(share)} onClose={() => setShare(null)} payload={share} />
  </main>;
}
