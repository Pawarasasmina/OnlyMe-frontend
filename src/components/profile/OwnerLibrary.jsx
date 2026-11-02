import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiBookmark, FiCheck, FiChevronRight } from "react-icons/fi";
import { walletService } from "../../services/walletService";
import { membershipService } from "../../services/membershipService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorMessage } from "../../utils/financialErrorMessages";
import { resolveMediaUrl } from "../../utils/media";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import "./OwnerLibrary.css";

const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Date unavailable";
const active = item => ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(item.status) && new Date(item.currentPeriodEnd) > new Date();
const cancelled = item => item.cancelAtPeriodEnd || item.status === "CANCEL_AT_PERIOD_END";
const worldId = item => item.premiumPublication?.id || item.premiumPublication?._id;
const title = item => item.premiumPublication?.title || `${item.creator?.name?.split(" ")[0] || "Creator"}’s World`;
function State({ query, children }) {
  if (query.isPending) return <p className="owner-things-state" role="status">Loading…</p>;
  if (query.isError) return <div className="owner-things-state" role="alert">Unable to load this right now. <button onClick={() => query.refetch()} type="button">Try again</button></div>;
  return children;
}

export default function OwnerLibrary({ userId, wallet, onClose, onFullScreen }) {
  const client = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [screen, setScreen] = useState("library");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receiptEmailSent, setReceiptEmailSent] = useState(false);
  const lock = useRef(false);
  const command = useRef(null);
  const root = useRef(null);
  useEffect(() => {
    const sheet = root.current?.closest(".owner-things-sheet");
    if (sheet) sheet.scrollTop = 0;
    root.current?.focus({ preventScroll: true });
  }, [screen]);
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then(r => r.data.data.items || []), retry: false });
  const owned = useQuery({ queryKey: ["owner-library", userId], queryFn: () => walletService.getWorldEntitlements().then(r => (r.data.data.items || []).filter(x => x.status === "ACTIVE" && x.publication && x.publication.kind !== "PREMIUM_WORLD")), retry: false });
  const detail = useQuery({ queryKey: ["membership-library", selected?.id], queryFn: () => walletService.getMembershipLibrary(selected.id).then(r => r.data.data), enabled: Boolean(selected) && screen === "manage", refetchInterval: 30000, retry: false });
  const membership = memberships.data?.find(x => x.id === selected?.id) || selected;
  const changeScreen = next => { setError(""); setScreen(next); onFullScreen(next === "cancel" || next === "done"); };
  const open = item => { setSelected(item); changeScreen("manage"); };
  const save = async mode => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    if (command.current?.mode !== mode || command.current?.id !== membership.id) command.current = { mode, id: membership.id, key: createIdempotencyKey(`premium-${mode}`) };
    try {
      const response = await membershipService[mode === "cancel" ? "cancelMembership" : "resumeMembership"](membership.id, command.current.key);
      const updated = response.data.data.membership;
      if (mode === "cancel") setReceiptEmailSent(Boolean(response.data.data.receiptEmailSent));
      client.setQueryData(["memberships"], rows => (rows || []).map(x => x.id === membership.id ? { ...x, ...updated, creator: x.creator, premiumPublication: x.premiumPublication } : x));
      command.current = null;
      changeScreen(mode === "cancel" ? "done" : "manage");
      await Promise.all([client.invalidateQueries({ queryKey: ["memberships"] }), client.invalidateQueries({ queryKey: ["world", worldId(membership)] }), client.invalidateQueries({ queryKey: ["fan", "activity"] })]);
    } catch (err) { setError(financialErrorMessage(err)); } finally { lock.current = false; setBusy(false); }
  };
  const who = membership ? <div className="library-who"><FanAvatar name={membership.creator?.name} src={membership.creator?.avatar} /><div><b>{title(membership)}</b><small>Member #{membership.memberNumber || "—"} · {screen === "cancel" ? `${membership.starsPerPeriod.toLocaleString()} coins a month` : `since ${date(membership.joinedAt || membership.currentPeriodStart)}`}</small></div></div> : null;
  const items = detail.data?.items || [];
  return <div className={`owner-library ${screen === "cancel" || screen === "done" ? "is-full" : ""}`} aria-busy={busy} ref={root} tabIndex={-1}>
    {screen === "library" ? <>
      <h2>Your library</h2>
      <State query={owned}>{owned.data?.length ? <><h3>YOURS FOREVER</h3>{owned.data.map(item => { const p = item.publication; const id = p.id || p._id; return <Link className="owner-things-row" key={item.id} onClick={onClose} to={p.kind === "EXPERIENCE" ? `/experience/${id}` : p.kind === "SEEN" ? `/seen/${id}` : `/world/${id}`}>
        {p.coverMedia?.secureUrl ? <img alt="" className="library-owned-cover" src={resolveMediaUrl(p.coverMedia.secureUrl)} /> : <FiBookmark />}<span className="owner-things-copy"><b>{p.title}</b><small>{p.creator?.name || "Owned content"}</small></span><FiChevronRight /></Link>; })}</> : null}</State>
      <State query={memberships}>{memberships.data?.filter(active).length ? <><h3>YOUR WORLDS</h3>{memberships.data.filter(active).map(item => <button className="owner-things-row" key={item.id} onClick={() => open(item)} type="button"><FanAvatar name={item.creator?.name} src={item.creator?.avatar} /><span className="owner-things-copy"><b>{title(item)}</b><small>#{item.memberNumber || "—"} · {cancelled(item) ? "ends" : "renews"} {date(item.currentPeriodEnd)}</small></span><span className="library-manage">Manage ›</span></button>)}</> : !owned.isPending && !owned.isError && !owned.data?.length ? <p className="owner-things-state">What you unlock lives here — forever. Worlds you join will appear here too.</p> : null}</State>
    </> : null}
    {screen === "manage" ? <>
      {who}
      <State query={detail}><div className="library-recap"><h3>YOUR MONTH INSIDE</h3><div>{[[detail.data?.recap?.stories, "new stories"], [detail.data?.recap?.chapters, "new chapters"], [detail.data?.recap?.messages, "messages in your circles"]].map(([n, label]) => <div key={label}><b>{n ?? "—"}</b><small>{label}</small></div>)}</div></div></State>
      {cancelled(membership) ? <div className="library-recap"><b>Your membership ends {date(membership.currentPeriodEnd)}</b><p>Everything stays open until then. No more charges.</p><button className="library-primary" disabled={busy || !active(membership)} onClick={() => save("resume")} type="button">{busy ? "Saving…" : "Restart membership"}</button></div> : <div className="library-payment"><div><span><b>Next payment</b><small>Renews automatically</small></span><span><b>{date(membership.currentPeriodEnd)}</b> · <img alt="coins" src="/brand/goldcoin.png" /> {membership.starsPerPeriod.toLocaleString()}</span></div>{wallet && wallet.balance < membership.starsPerPeriod ? <Link onClick={onClose} to="/wallet"><b>Top up to stay</b><small>You have {wallet.balance.toLocaleString()} coins · renewal needs {membership.starsPerPeriod.toLocaleString()}</small></Link> : null}<button disabled={busy} onClick={() => changeScreen("cancel")} type="button">Cancel membership</button></div>}
      <p className="library-footnote">Cancel anytime — you keep access until the end of the period you paid for.</p>
    </> : null}
    {screen === "cancel" ? <>
      <div className="library-cancel-content"><div className="library-wall">{items.filter(x => x.image).slice(0, 6).map(x => <img alt="" key={x.id} src={resolveMediaUrl(x.image)} />)}</div><button aria-label="Back to membership" className="library-back" disabled={busy} onClick={() => changeScreen("manage")} type="button"><FiArrowLeft /></button>{who}<h1>Cancel your membership?</h1><p>Here’s exactly what happens — nothing more.</p><ol className="library-timeline"><li><b>Today</b><small>Everything stays open — stories, chapters, circles.</small></li><li><b>{date(membership.currentPeriodEnd)}</b><small>Your membership ends. Nothing more is charged.</small></li><li><b>Anytime after</b><small>You can join this World again.</small></li></ol>{items.length ? <div className="library-waiting"><h3>WAITING FOR YOU INSIDE</h3><div>{items.map(x => <div className="library-preview-card" key={x.id}><span>{x.image ? <img alt="" src={resolveMediaUrl(x.image)} /> : <FiBookmark />}</span><b>{x.title}</b><small>{x.kind === "story" ? "Private story" : "Chapter"}</small></div>)}</div></div> : null}</div>
      <div className="library-bar"><button className="library-primary" disabled={busy} onClick={() => save("cancel")} type="button">{busy ? "Cancelling…" : "Finish cancellation"}</button><button className="library-secondary" disabled={busy} onClick={() => changeScreen("manage")} type="button">Go back</button></div>
    </> : null}
    {screen === "done" ? <><div className="library-success"><span className="library-success-ring"><FiCheck /></span><h1>Your membership is cancelled</h1><p>You won’t be charged again.{receiptEmailSent ? " A confirmation is on its way to your email." : ""}</p><div className="library-success-card">{who}<small>Open for you until {date(membership.currentPeriodEnd)}</small></div></div><div className="library-bar"><button className="library-primary" disabled={busy} onClick={onClose} type="button">Done</button><button className="library-secondary" disabled={busy || !active(membership)} onClick={() => save("resume")} type="button">{busy ? "Saving…" : "Restart membership"}</button></div></> : null}
    {error ? <p className="library-error" role="alert">{error}</p> : null}
  </div>;
}
