import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiCalendar, FiGift, FiLock, FiShield, FiCreditCard, FiTrendingUp, FiMessageCircle } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import axios from "../../api/axiosInstance";
import ManualIdentityApplication from "./ManualIdentityApplication";
import "./IdentityVerificationFlow.css";

const holds = [
  [FiCheck, "Credited instantly", "The moment someone spends coins on you, the money is on your balance — the same wherever they bought the coins."],
  [FiCalendar, "Withdrawable after 14 days", "New creators: 14 days. After 60 days without disputes: 7. Top creators: 3. Levels go up by themselves."],
  [FiShield, "If a payment is refunded", "When the App Store, Google Play or a bank refunds a fan, the same amount comes off your balance and shows in activity. If the balance is short it goes negative and is covered by future earnings — we never charge your card."],
  [FiLock, "No reserves", "Nothing is held back beyond the clearing days. If a refund arrives after a payout, it comes off future earnings."],
  [FiMessageCircle, "Direct Access and paid Seens", "Unanswered Direct Access returns to the fan after 48h and is never counted. A paid Seen can be refunded within 24h — it is deducted."],
  [FiGift, "Gifts and Dream support", "Final for fans — no refunds except store or bank refunds and confirmed fraud."],
  [FiCreditCard, "Before the first payout", "18+, a country where payouts work, and verification through Stripe. Earning itself needs no documents."],
  [FiGift, "Bonus coins", "Fans get bonus coins with bigger packs and their first pack. They earn you the same as bought coins — @seen covers them."],
  [FiShield, "Up to $500 before verification", "Earn freely up to $500. After that gifts keep coming for 30 days — verify once to keep receiving and to withdraw."],
  [FiShield, "Fair play", "Gifts between accounts on the same device or network are blocked. New cards on the web have a daily limit. Confirmed fraud is reversed."],
];

export default function IdentityVerificationFlow({ onClose, initialView = "verify" }) {
  const { user, setUser } = useAuth();
  const client = useQueryClient();
  const [view, setView] = useState(initialView), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [position, setPosition] = useState({});
  const [temporarilyUnavailable, setTemporarilyUnavailable] = useState(false);
  const panel = useRef(null);
  const query = useQuery({ queryKey: ["identity", user?.id || user?._id], queryFn: () => axios.get("/identity").then(r => r.data.data), refetchInterval: q => q.state.data?.status === "processing" ? 5000 : false, refetchOnWindowFocus: true, enabled: view !== "verify" });
  const wallet = useQuery({ queryKey: ["identity-payout-wallet"], queryFn: () => axios.get("/wallet").then(r => r.data.data.wallet), enabled: view === "payouts" });
  const status = query.data || {}, verified = status.status === "verified";
  const unavailable = (view === "verify" ? false : status.bankAvailable === false || status.available === false) || temporarilyUnavailable;
  const close = () => onClose ? onClose() : window.history.back();
  useEffect(() => {
    const previous = document.activeElement;
    const update = () => { const el = document.querySelector(".social-center-scroll"); if (el) { const r = el.getBoundingClientRect(); setPosition({ left: r.left, width: r.width }); } };
    update(); window.addEventListener("resize", update);
    panel.current?.focus();
    const keydown = e => {
      if (e.key === "Escape" && !busy) close();
      if (e.key === "Tab") {
        const all = [...(panel.current?.querySelectorAll('button:not(:disabled),a[href],input') || [])];
        if (!all.length) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === all[0] || document.activeElement === panel.current)) { e.preventDefault(); all.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === all.at(-1)) { e.preventDefault(); all[0].focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("resize", update); document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [busy]);
  useEffect(() => {
    if (!verified) return;
    setUser?.(current => current ? { ...current, isVerified: !status.sealRevoked } : current);
    client.invalidateQueries({ queryKey: ["unified-profile"] });
  }, [verified, status.sealRevoked, client, setUser]);
  const perform = async path => {
    setBusy(true); setError("");
    try {
      const data = await axios.post(`/identity/${path}`).then(r => r.data.data);
      if (data.url) { const url = new URL(data.url); if (url.protocol !== "https:" || !(url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com"))) throw new Error("Invalid verification destination"); window.location.assign(data.url); }
      else await query.refetch();
    } catch (e) {
      if (e.response?.status === 503) setTemporarilyUnavailable(true);
      else setError("We couldn’t open Stripe. Please try again.");
    }
    finally { setBusy(false); }
  };
  const row = (Icon, title, detail, action) => <div className="identity-row"><span className="identity-icon"><Icon /></span><div><b>{title}</b><p>{detail}</p></div>{action}</div>;
  const primary = (label, action, disabled = false) => <button type="button" className="identity-primary" disabled={busy || disabled} onClick={action}>{busy ? "Opening Stripe..." : label}</button>;
  return createPortal(<div className="identity-overlay" style={position}><button aria-label="Close verification" className="identity-backdrop" onClick={close} /><section className={`identity-sheet view-${view}`} role="dialog" aria-modal="true" aria-label={view === "verify" ? "Verification" : view === "setup" ? "Set up payouts" : view === "bank" ? "Add your bank with Stripe" : view === "holds" ? "Holds & refunds" : "Payouts"} ref={panel} tabIndex={-1}><span className="identity-handle" />
    {view === "verify" ? <ManualIdentityApplication onClose={close} /> : query.isPending ? <p role="status">Loading verification...</p> : query.isError ? <><h2>Verification</h2><p role="alert">Unable to load your verification status.</p>{primary("Try again", () => query.refetch())}</> : <>
    {unavailable && view !== "verify" && <div className="identity-availability" role="status"><FiShield aria-hidden="true" /><div><b>Verification is temporarily unavailable</b><p>You can keep using @seen. Please come back later to verify your identity or set up your bank.</p></div></div>}
    {status.sealRevoked && view !== "verify" && <p role="status">Your public verified seal is currently suspended. Contact support for help.</p>}
    {view === "setup" && <><h2>Set up payouts</h2><p>Two steps. Done once.</p>{row(verified ? FiCheck : FiShield, "Get verified", verified ? "Verified" : "ID + selfie · 2 minutes", !verified && <button onClick={() => setView("verify")}>Verify</button>)}{row(status.bankReady ? FiCheck : FiCreditCard, "Add a bank", status.bankReady ? `Bank •• ${status.bankLast4}` : "Bank and tax details, securely with Stripe", !status.bankReady && verified && <button onClick={() => setView("bank")}>Add</button>)}{primary("Done", () => setView("payouts"), !verified || !status.bankReady)}</>}
    {view === "bank" && <><span className="identity-bank-symbol"><FiCreditCard /></span><h2 className="identity-center">Add your bank with Stripe</h2><p className="identity-center">You’ll continue to Stripe to add your bank and tax details.<br />@seen never sees your full account number.</p>{primary(unavailable ? "Bank setup unavailable" : "Continue to Stripe", () => perform("bank"), unavailable)}<button className="identity-later" onClick={() => setView("setup")}>Cancel</button><small className="identity-center">By continuing, you agree to the <a href="/settings/support/terms">Payout terms</a> and <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noreferrer">Stripe’s Connected Account Agreement</a>.</small></>}
    {view === "payouts" && <><h2>Payouts</h2>{!status.bankReady ? <>{primary("Set up payouts", () => setView("setup"))}</> : <><div className="identity-balance"><p>Available to withdraw</p><strong>{wallet.isPending ? "…" : wallet.isError ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(wallet.data?.availableIncomeUsd || 0)}</strong></div><div className="identity-clearing"><span>Clearing<small>Credited instantly · withdrawable after {Math.round((wallet.data?.withdrawalHoldHours || 336) / 24)} days</small></span><b>${wallet.data?.pendingIncomeUsd?.toFixed(2) || "0"}</b></div>{row(FiCreditCard, `Bank •• ${status.bankLast4}`, "Arrives in 3–5 business days · Stripe Connect")}{row(FiTrendingUp, "Level · New", "Money is ready 14 days after it arrives")}{row(FiCalendar, "Automatic payout", "On the 1st of every month", <button role="switch" aria-checked={status.automaticPayout} aria-label="Automatic payout" className="identity-switch" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await axios.put("/identity/automatic-payout", { active: !status.automaticPayout }); await query.refetch(); } catch (e) { setError(e.response?.data?.message || "Could not save payout setting."); } finally { setBusy(false); } }}><span /></button>)}<p className="identity-withdraw-note">Withdraw early from $50 · the monthly payout starts at $20</p></>}<small className="identity-center">Monthly on the 1st from $20 · anytime from $50</small><button className="identity-link" onClick={() => setView("holds")}>Holds & refunds ›</button></>}
    {view === "holds" && <><h2>Holds & refunds</h2>{holds.map(([Icon, title, detail]) => <div key={title}>{row(Icon, title, detail)}</div>)}<button className="identity-link" onClick={() => setView("payouts")}>Back to payouts</button></>}
    </>}{error && <p role="alert" className="identity-error">{error}</p>}
  </section></div>, document.body);
}
