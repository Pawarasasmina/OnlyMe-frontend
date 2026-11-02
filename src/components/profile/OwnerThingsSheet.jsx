import BringFriendsFlow from "./BringFriendsFlow";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArchive, FiArrowLeft, FiBookmark, FiChevronRight, FiGift, FiHeart, FiSettings } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { walletService } from "../../services/walletService";
import { fanService } from "../../services/fanService";
import { publicationService } from "../../services/publicationService";
import { postService } from "../../services/postService";
import { GIFT_THANKS_OPEN_EVENT } from "../fanWeb/shared/giftThanksEvent";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import "./OwnerThingsSheet.css";
import OwnerLibrary from "./OwnerLibrary";

function WalletCoinIcon() {
  return <svg aria-hidden="true" fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="22"><circle cx="12" cy="12" r="8.5" /><path d="M12 6v12m3-9c-1-2-6-2-6 1 0 3 6 1 6 4 0 3-5 3-6 1" /></svg>;
}

function QueryState({ query, empty, children }) {
  if (query.isLoading) return <p className="owner-things-state">Loading…</p>;
  if (query.isError) return <div className="owner-things-state"><p>Unable to load this right now.</p><button onClick={() => query.refetch()} type="button">Try again</button></div>;
  return children || <p className="owner-things-state">{empty}</p>;
}

export default function OwnerThingsSheet({ isOpen, onClose, initialView = "menu" }) {
  const { user } = useAuth();
  const [view, setView] = useState("menu");
  const [libraryFull, setLibraryFull] = useState(false);
  const [position, setPosition] = useState({});
  const [friendsSeen, setFriendsSeen] = useState(() => { try { return localStorage.getItem(`atseen:friends-opened:${user?.id}`) === "1"; } catch { return false; } });
  const sheetRef = useRef(null);
  useEffect(() => { if (isOpen) setView(initialView); }, [isOpen, initialView]);
  const archiveCount = useQuery({
    queryKey: ["profile-archive", "count", user?.id],
    queryFn: async () => {
      const [publications, notes] = await Promise.all([
        publicationService.listMyPublications({ status: "ARCHIVED", limit: 1 }).then(response => response.data.data),
        postService.getMyPosts({ status: "archived", limit: 1 }),
      ]);
      return Number(publications.pagination?.total ?? publications.items?.length ?? 0)
        + Number(notes.pagination?.total ?? notes.items?.length ?? 0);
    },
    enabled: isOpen && Boolean(user?.id),
    retry: false,
  });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then(response => response.data.data.wallet), enabled: isOpen, retry: false });
  const thanks = useQuery({
    queryKey: ["owner-gift-thanks", user?.id],
    queryFn: async () => {
      let page = 1, data;
      do {
        const response = await fanService.getActivity({ direction: "received", filter: "support", limit: 100, page });
        data = response.data.data;
        page += 1;
      } while (data.pageInfo?.hasMore);
      // Activity pages are cumulative: the last page contains all preceding rows.
      return (data.items || data.activity || []).filter(item => /gift.*thank|thank.*gift/i.test(item.type || ""));
    },
    enabled: isOpen && Boolean(user?.id),
    refetchInterval: isOpen ? 30000 : false,
    retry: false,
  });
  useEffect(() => {
    if (!isOpen) { setView("menu"); setLibraryFull(false); return undefined; }
    const previous = document.activeElement;
    const center = document.querySelector(".social-center-scroll");
    const update = () => { if (center) { const bounds = center.getBoundingClientRect(); setPosition({ "--owner-things-left": `${bounds.left}px`, "--owner-things-width": `${bounds.width}px` }); } };
    const keydown = event => {
      if (event.target?.closest?.(".share-sheet-overlay")) return;
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const controls = [...(sheetRef.current?.querySelectorAll('button:not(:disabled),a[href]') || [])];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    update(); sheetRef.current?.focus();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (center) observer?.observe(center);
    window.addEventListener("resize", update); window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; observer?.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const rows = [
    { label: "Library", sub: "What you own and your Worlds", Icon: FiBookmark, action: () => setView("library"), filled: true },
    { label: "Thanks", sub: thanks.isError ? "Count unavailable" : thanks.data?.length ? `${thanks.data.length} from creators` : thanks.isPending ? "Loading..." : "when creators thank you for gifts", Icon: FiHeart, action: () => setView("thanks") },
    { label: "Archive", sub: archiveCount.isError ? "Count unavailable" : archiveCount.data > 0 ? `${archiveCount.data} ${archiveCount.data === 1 ? "item" : "items"}` : archiveCount.isPending ? "Loading…" : "hidden from your profile", Icon: FiArchive, to: "/archive" },
    { label: "Wallet", sub: wallet.data ? `${Number(wallet.data.balance || 0).toLocaleString()} · $${Number(wallet.data.balanceUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Coins & earnings", Icon: WalletCoinIcon, to: "/wallet" },
    { label: "Bring friends", sub: "3 friends join \u2014 a gold ring on your photo", Icon: FiGift, isNew: !friendsSeen, action: () => { setView("friends"); setFriendsSeen(true); try { localStorage.setItem(`atseen:friends-opened:${user?.id}`, "1"); } catch { /* optional hint */ } } },
    { label: "Settings", sub: "Account & privacy", Icon: FiSettings, to: "/settings" },
  ];
  const title = { menu: "Your things", library: "Library", thanks: "Thanks", friends: "Bring friends" }[view];
  return createPortal(<div className={`owner-things-layer ${view === "friends" ? "is-bring-friends" : ""}`} style={position}>
    <button aria-label="Close your things" className="owner-things-dim" onClick={onClose} tabIndex={-1} type="button" />
    <section aria-label={title} aria-modal="true" className={`owner-things-sheet ${libraryFull ? "library-full-screen" : ""}`} ref={sheetRef} role="dialog" tabIndex={-1}>
      <span className="owner-things-handle" />
      {!["library", "friends"].includes(view) ? <header>{view !== "menu" ? <button aria-label="Back to your things" onClick={() => { setView("menu"); setLibraryFull(false); }} type="button"><FiArrowLeft /></button> : null}{view !== "library" ? <h2>{title}</h2> : null}</header> : null}
      {view === "menu" ? <div>{rows.map(({ label, sub, Icon, to, action, isNew, filled }) => {
        const content = <><span className={`owner-things-icon ${filled ? "is-filled" : ""}`}><Icon /></span><span className="owner-things-copy"><b>{label}{isNew ? <em>NEW</em> : null}</b><small>{sub}</small></span><FiChevronRight /></>;
        return to ? <Link className="owner-things-row" key={label} onClick={onClose} to={to}>{content}</Link> : <button className="owner-things-row" key={label} onClick={action} type="button">{content}</button>;
      })}</div> : null}
      {view === "library" ? <OwnerLibrary onClose={onClose} onFullScreen={setLibraryFull} userId={user?.id} wallet={wallet.data} /> : null}
      {view === "thanks" ? <QueryState empty="When a creator thanks you for a gift, it stays here." query={thanks}>{thanks.data?.length ? thanks.data.map(item => {
        const actor = item.relatedCreator || item.actor || {};
        return <button className="owner-things-row" key={item.id || item._id} onClick={() => { onClose(); window.dispatchEvent(new CustomEvent(GIFT_THANKS_OPEN_EVENT, { detail: item })); }} type="button"><FanAvatar name={actor.name || actor.displayName || "Creator"} size="h-10 w-10" src={actor.avatarUrl || actor.avatar} /><span className="owner-things-copy"><b>{actor.name || actor.displayName || "Creator"}</b><small>{item.preview || item.message || item.title || "Thank you for your gift"}</small></span><FiChevronRight /></button>;
      }) : null}</QueryState> : null}
      {view === "friends" ? <BringFriendsFlow user={user} onClose={onClose} onFullScreen={setLibraryFull} /> : null}
    </section>
  </div>, document.body);
}
