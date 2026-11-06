import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiDownload, FiLock, FiTrendingUp, FiX } from "react-icons/fi";
import FinancialConfirmDialog from "./FinancialConfirmDialog";
import WalletBalance from "./WalletBalance";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import PublicationCoverMedia from "../publication/PublicationCoverMedia";
import { walletService } from "../../services/walletService";
import { purchaseService } from "../../services/purchaseService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";
import "./PurchaseWorldModal.css";

const creatorName = (item) => item?.creator?.displayName || item?.creator?.name || item?.creator?.username || "the creator";
const creatorFirstName = (item) => creatorName(item).trim().split(/\s+/)[0] || "the creator";
const itemId = (item) => item?.id || item?._id;

function PaidSeenPurchaseSheet({ busy, error, onClose, onPurchase, onTopUp, publication, topUpNeeded }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const chapters = publication?.chapters || [];
  const creator = publication?.creator || {};
  const cover = publication?.coverMedia || publication?.cover || publication?.coverImage;
  const price = Number(publication?.pricing?.starsAmount || 0);
  return <div aria-modal="true" className="paid-seen-purchase-layer" role="dialog" aria-label={`Unlock ${publication?.title || "this Seen"}`}>
    <button aria-label="Close purchase" className="paid-seen-purchase-scrim" disabled={busy} onClick={onClose} type="button" />
    <section className="paid-seen-purchase-sheet">
      <span className="paid-seen-purchase-handle" /><button aria-label="Close" className="paid-seen-purchase-close" disabled={busy} onClick={onClose} type="button"><FiX /></button>
      <div className="paid-seen-purchase-hero"><PublicationCoverMedia alt="" media={cover} /><span className="paid-seen-purchase-creator"><FanAvatar name={creatorName(publication)} size="h-7 w-7" src={creator.avatar} /><b>{creatorFirstName(publication)}</b></span><div><small>{publication?.category || "SEEN"} · {chapters.length} CHAPTERS</small><h2>{publication?.title}</h2><p>{publication?.summary || publication?.description}</p></div></div>
      <div className="paid-seen-purchase-owners"><span>●●●</span><b>{Number(publication?.ownerCount || 0).toLocaleString()} people own this</b><small>Updated recently</small></div>
      <p className="paid-seen-purchase-inside">INSIDE · chapter 1 is a free preview</p>
      <div className="paid-seen-purchase-chapters">{chapters.slice(0, 3).map((chapter, index) => index === 0 ? <div className={`paid-seen-inline-preview ${previewOpen ? "is-open" : ""}`} key={chapter.stableChapterId || index}><button aria-expanded={previewOpen} aria-label={`${previewOpen ? "Close" : "Open"} free preview: ${chapter.title || "Chapter 1"}`} className="is-preview" onClick={() => setPreviewOpen((value) => !value)} type="button"><span>{String(index + 1).padStart(2, "0")}</span><b>{chapter.title || "Chapter 1"}</b><em>{previewOpen ? "Close ↑" : "Free preview ›"}</em></button><section aria-hidden={!previewOpen} className="paid-seen-preview-content"><h3>{chapter.title || "Chapter 1"}</h3>{chapter.summary ? <p>{chapter.summary}</p> : null}{(chapter.blocks || []).map((block, blockIndex) => ["IMAGE", "VIDEO"].includes(block.type) && block.media ? <PublicationCoverMedia alt="" key={block.id || blockIndex} media={block.media} /> : block.text ? <p key={block.id || blockIndex}>{block.text}</p> : null)}{!(chapter.blocks || []).some((block) => block.text || block.media) && !chapter.summary ? <p>This free chapter is ready to read after the creator adds its content.</p> : null}</section></div> : <div key={chapter.stableChapterId || index}><span>{String(index + 1).padStart(2, "0")}</span><b>{chapter.title || `Chapter ${index + 1}`}</b><FiLock />{chapter.summary ? <small>{chapter.summary}</small> : null}</div>)}</div>
      <div className="paid-seen-purchase-benefits"><span><b>∞</b><small>Yours forever</small></span><span><FiTrendingUp /><small>New chapters included</small></span><span><FiDownload /><small>Keep a PDF copy</small></span></div>
      {publication?.includedInWorld ? <p className="paid-seen-purchase-world">Also inside {creatorFirstName(publication)}&apos;s World — <b>✦ {price}</b> count toward your first month</p> : null}
      {error ? <p className="paid-seen-purchase-error" role="alert">{error}</p> : null}
      {topUpNeeded > 0 ? <button className="paid-seen-purchase-primary" disabled={busy} onClick={onTopUp} type="button">{busy ? "Adding…" : `Add ${topUpNeeded} Stars and unlock`}</button> : <button className="paid-seen-purchase-primary" disabled={busy} onClick={onPurchase} type="button">{busy ? "Confirming…" : <>Unlock · <span>✦ {price}</span></>}</button>}
      <small className="paid-seen-purchase-terms">One-time · yours forever · opens instantly</small>
    </section>
  </div>;
}

function PaidSeenSuccess({ entitlement, onClose, publication }) {
  const navigate = useNavigate();
  const [thanksSent, setThanksSent] = useState(false);
  const [thanksSending, setThanksSending] = useState(false);
  const [thanksError, setThanksError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const chapters = publication?.chapters || [];
  const creator = publication?.creator || {};
  const cover = publication?.coverMedia || publication?.cover || publication?.coverImage;
  const firstName = creatorFirstName(publication);
  const startIndex = Math.min(1, Math.max(0, chapters.length - 1));
  const startTitle = chapters[startIndex]?.title || chapters[0]?.title || "Start reading";
  const ownerNumber = Number(entitlement?.ownerNumber || publication?.ownerCount || 0) + (entitlement?.ownerNumber ? 0 : 1);
  const note = publication?.ownerWelcomeNote || `Welcome in. Start with “${startTitle}” — that’s where it gets real. Tell me what you think.`;
  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(note);
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(utterance);
  };
  const openChapter = () => { onClose(); navigate(`/seen/${encodeURIComponent(itemId(publication))}?chapter=${startIndex}`, { replace: true }); };
  const openThanks = async () => {
    if (thanksSent || thanksSending) return;
    setThanksSending(true);
    setThanksError("");
    try {
      await purchaseService.thankSeenCreator(itemId(publication));
      setThanksSent(true);
    } catch (requestError) {
      setThanksError(requestError?.response?.data?.message || "Could not send thanks. Please try again.");
    } finally {
      setThanksSending(false);
    }
  };
  return <div aria-modal="true" className="paid-seen-success-layer" role="dialog" aria-label={`${publication?.title || "Seen"} is yours`}><section className="paid-seen-success">
    <button aria-label="Close" className="paid-seen-success-close" onClick={onClose} type="button"><FiX /></button>
    <div className="paid-seen-success-cover"><PublicationCoverMedia alt="" media={cover} /><span><FiCheck /></span></div><h2>It&apos;s yours</h2><p>“{publication?.title}” · by {firstName}</p>
    <div className="paid-seen-success-owner"><i /> OWNER № {String(ownerNumber).padStart(3, "0")} · {new Date().toLocaleDateString()} <i /></div>
    <div className="paid-seen-success-chapters">{chapters.slice(0, 5).map((chapter, index) => <div key={chapter.stableChapterId || index}><span>{String(index + 1).padStart(2, "0")}</span><b>{chapter.title || `Chapter ${index + 1}`}</b><i><FiCheck /></i></div>)}</div>
    <article className="paid-seen-success-note"><header><FanAvatar name={creatorName(publication)} size="h-9 w-9" src={creator.avatar} /><span><b>A note from {firstName}</b><small>for everyone who owns this</small></span></header><p>“{note}”</p><button aria-label={speaking ? "Stop creator note" : "Play creator note"} aria-pressed={speaking} onClick={speak} type="button"><i className={speaking ? "is-playing" : ""}>{speaking ? "■" : "▶"}</i><b>0:14</b><span className="paid-seen-voice-wave" aria-hidden="true">{[5,9,12,7,11,14,8,12,6,10,13,8,5].map((height, index) => <i key={index} style={{ height }} />)}</span></button></article>
    <p className="paid-seen-success-community">●●● You and {Number(publication?.ownerCount || 0).toLocaleString()} others own this</p><button className="paid-seen-success-start" onClick={openChapter} type="button">Start “{startTitle}”</button>
    {thanksError ? <p className="paid-seen-success-thanks-error" role="alert">{thanksError}</p> : null}
    <div className="paid-seen-success-actions"><button className={thanksSent ? "is-sent" : ""} disabled={thanksSent || thanksSending} onClick={openThanks} type="button">{thanksSent ? `Sent to ${firstName} ✓` : thanksSending ? "Sending…" : `Say thanks to ${firstName}`}</button><button onClick={onClose} type="button">Later</button></div>
  </section></div>;
}

export default function PurchaseWorldModal({ open, onClose, publication, onSuccess }) {
  const client = useQueryClient();
  const [key, setKey] = useState(""); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [topUpNeeded, setTopUpNeeded] = useState(0); const [entitlement, setEntitlement] = useState(null);
  const paidSeen = publication?.kind === "SEEN"; const experience = publication?.kind === "EXPERIENCE"; const noun = paidSeen ? "Seen" : experience ? "Experience" : "World"; const id = itemId(publication);
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), enabled: open && !entitlement, retry: false });
  useEffect(() => { if (open && !key) setKey(createIdempotencyKey(paidSeen ? "seen-purchase" : experience ? "experience-purchase" : "world-purchase")); if (!open) { setKey(""); setAccepted(false); setError(""); setTopUpNeeded(0); setEntitlement(null); } }, [experience, key, open, paidSeen]);
  const finishPurchase = async (response) => {
    if (paidSeen) setEntitlement(response?.data?.data?.entitlement || { purchased: true });
    await Promise.all([client.invalidateQueries({ queryKey: ["wallet"] }), client.invalidateQueries({ queryKey: ["world-entitlements"] }), client.invalidateQueries({ queryKey: ["world", id] }), client.invalidateQueries({ queryKey: ["unified-profile"] })]);
    if (!paidSeen) { await onSuccess?.(); onClose(); }
  };
  const closeSuccess = () => { onClose(); onSuccess?.(); };
  const confirmPurchase = async () => { setBusy(true); setError(""); try { await finishPurchase(await purchaseService.purchaseWorld(id, key)); } catch (requestError) { const code = financialErrorCode(requestError); if (["ALREADY_ENTITLED", "SELF_PURCHASE_NOT_REQUIRED"].includes(code)) await finishPurchase(null); else if (code === "INSUFFICIENT_STARS") { const short = Math.max(0, Number(publication.pricing?.starsAmount || 0) - Number(wallet.data?.balance || 0)); setTopUpNeeded(short); setError(`Add exactly ${short} Stars to continue.`); } else setError(financialErrorMessage(requestError)); } finally { setBusy(false); } };
  const topUpAndResume = async () => { setBusy(true); setError(""); try { await walletService.topUpExact(topUpNeeded, createIdempotencyKey("purchase-exact-topup")); await finishPurchase(await purchaseService.purchaseWorld(id, key)); } catch (requestError) { setError(financialErrorMessage(requestError)); } finally { setBusy(false); } };
  const remaining = useMemo(() => wallet.data ? wallet.data.balance - Number(publication?.pricing?.starsAmount || 0) : null, [publication?.pricing?.starsAmount, wallet.data]);
  if (!open) return null;
  if (paidSeen && entitlement) return <PaidSeenSuccess entitlement={entitlement} onClose={closeSuccess} publication={publication} />;
  if (paidSeen) return <PaidSeenPurchaseSheet busy={busy} error={error} onClose={onClose} onPurchase={confirmPurchase} onTopUp={topUpAndResume} publication={publication} topUpNeeded={topUpNeeded} />;
  return <FinancialConfirmDialog presentation="center-sheet" open={open} onClose={() => !busy && onClose()} title={`Unlock this ${noun}`} actions={<><button className="rounded-full border border-atseen-line px-5 py-3" disabled={busy} onClick={onClose}>Cancel</button><button className="rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg disabled:opacity-40" disabled={busy || !accepted || wallet.isError} onClick={confirmPurchase}>{busy ? "Processing…" : `Unlock · ✦${publication?.pricing?.starsAmount}`}</button></>}><p className="font-bold">{publication?.title}</p><p className="mt-1 text-sm text-atseen-muted">Permanent access to this {noun}. One payment, including future chapter updates.</p><div className="mt-4 rounded-xl bg-atseen-bg p-4"><p className="text-xs text-atseen-muted">Current balance</p><WalletBalance /><p className="mt-2 text-xs text-atseen-muted">Estimated remaining balance: {remaining == null ? "Unavailable" : `✦${remaining}`}</p></div><label className="mt-4 flex items-start gap-3 text-sm"><input checked={accepted} className="mt-1" onChange={(event) => setAccepted(event.target.checked)} type="checkbox" /> I confirm this one-time Stars purchase.</label>{error ? <p aria-live="assertive" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}{topUpNeeded > 0 ? <button className="mt-3 w-full rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg disabled:opacity-40" disabled={busy} onClick={topUpAndResume} type="button">Add {topUpNeeded} Stars and continue</button> : null}</FinancialConfirmDialog>;
}
