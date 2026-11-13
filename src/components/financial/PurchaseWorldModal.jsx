import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiDownload, FiLock, FiTrendingUp, FiX } from "react-icons/fi";
import FinancialConfirmDialog from "./FinancialConfirmDialog";
import WalletBalance from "./WalletBalance";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import PublicationCoverMedia from "../publication/PublicationCoverMedia";
import { ConfirmationRings, OwnershipBurst } from "../publication/SuccessMoment";
import { walletService } from "../../services/walletService";
import { purchaseService } from "../../services/purchaseService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";
import "./PurchaseWorldModal.css";

const creatorName = (item) => item?.creator?.displayName || item?.creator?.name || item?.creator?.username || __msg("context.theCreator");
const creatorFirstName = (item) => creatorName(item).trim().split(/\s+/)[0] || __msg("context.theCreator");
const itemId = (item) => item?.id || item?._id;

function PaidSeenPurchaseSheet({ busy, error, onClose, onPurchase, onTopUp, publication, topUpNeeded }) {
  __useUiLanguage();
  const [previewOpen, setPreviewOpen] = useState(false);
  const chapters = publication?.chapters || [];
  const creator = publication?.creator || {};
  const cover = publication?.coverMedia || publication?.cover || publication?.coverImage;
  const price = Number(publication?.pricing?.starsAmount || 0);
  return <div aria-modal="true" className="paid-seen-purchase-layer" role="dialog" aria-label={__msg("social.unlock", { value0: publication?.title || "this Seen" })}>
    <button aria-label={__msg("system.PurchaseWorldModal.e683c030f8")} className="paid-seen-purchase-scrim" disabled={busy} onClick={onClose} type="button" />
    <section aria-busy={busy} className={`paid-seen-purchase-sheet ${busy ? "animate-pulse" : ""}`}>
      <span className="paid-seen-purchase-handle" /><button aria-label={__msg("activity.close")} className="paid-seen-purchase-close" disabled={busy} onClick={onClose} type="button"><FiX /></button>
      <div className="paid-seen-purchase-hero"><PublicationCoverMedia alt="" media={cover} /><span className="paid-seen-purchase-creator"><FanAvatar name={creatorName(publication)} size="h-7 w-7" src={creator.avatar} /><b>{creatorFirstName(publication)}</b></span><div><small>{publication?.category || __msg("social.seen")} · {chapters.length} {__msg("creator.chapters_84ff9e")}</small><h2>{publication?.title}</h2><p>{publication?.summary || publication?.description}</p></div></div>
      {Number(publication?.ownerCount) > 0 ? <div className="paid-seen-purchase-owners"><b>{__msg("celebrations.ownerCount", { count: Number(publication.ownerCount) })}</b></div> : null}
      <p className="paid-seen-purchase-inside">{__msg("system.PurchaseWorldModal.45673e3598")}</p>
      <div className="paid-seen-purchase-chapters">{chapters.slice(0, 3).map((chapter, index) => index === 0 ? <div className={`paid-seen-inline-preview ${previewOpen ? "is-open" : ""}`} key={chapter.stableChapterId || index}><button aria-expanded={previewOpen} aria-label={__msg("system.PurchaseWorldModal.6e1421465e", { value0: previewOpen ? __msg("activity.close") : __msg("fan.open"), value1: chapter.title || __msg("profile.chapter1") })} className="is-preview" onClick={() => setPreviewOpen((value) => !value)} type="button"><span>{String(index + 1).padStart(2, "0")}</span><b>{chapter.title || __msg("profile.chapter1")}</b><em>{previewOpen ? __msg("system.PurchaseWorldModal.0a15c0f769") : __msg("system.PurchaseWorldModal.886de6a0df")}</em></button><section aria-hidden={!previewOpen} className="paid-seen-preview-content"><h3>{chapter.title || __msg("profile.chapter1")}</h3>{chapter.summary ? <p>{chapter.summary}</p> : null}{(chapter.blocks || []).map((block, blockIndex) => ["IMAGE", "VIDEO"].includes(block.type) && block.media ? <PublicationCoverMedia alt="" key={block.id || blockIndex} media={block.media} /> : block.text ? <p key={block.id || blockIndex}>{block.text}</p> : null)}{!(chapter.blocks || []).some((block) => block.text || block.media) && !chapter.summary ? <p>{__msg("system.PurchaseWorldModal.2e1fd894ab")}</p> : null}</section></div> : <div key={chapter.stableChapterId || index}><span>{String(index + 1).padStart(2, "0")}</span><b>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</b><FiLock />{chapter.summary ? <small>{chapter.summary}</small> : null}</div>)}</div>
      <div className="paid-seen-purchase-benefits"><span><b>∞</b><small>{__msg("system.PurchaseWorldModal.ff2c6965dd")}</small></span><span><FiTrendingUp /><small>{__msg("system.PurchaseWorldModal.a94aeaac16")}</small></span><span><FiDownload /><small>{__msg("system.PurchaseWorldModal.09871388d5")}</small></span></div>
      {publication?.includedInWorld ? <p className="paid-seen-purchase-world">{__msg("system.PurchaseWorldModal.fcc5f54cb1")} {creatorFirstName(publication)}{__msg("system.PurchaseWorldModal.fbc4d86824")} <b><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" />{price}</b> {__msg("system.PurchaseWorldModal.f06353e729")}</p> : null}
      {error ? <p className="paid-seen-purchase-error" role="alert">{__systemMessage(error)}</p> : null}
      {topUpNeeded > 0 ? <button className="paid-seen-purchase-primary" disabled={busy} onClick={onTopUp} type="button">{busy ? __msg("stories.adding_ffb2e6") : __msg("system.PurchaseWorldModal.0b4aefcc15", { value0: topUpNeeded })}</button> : <button className="paid-seen-purchase-primary" disabled={busy} onClick={onPurchase} type="button">{busy ? __msg("financial.confirming") : <>{__msg("system.PurchaseWorldModal.c3d96877a2")} <span><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" />{price}</span></>}</button>}
      <small className="paid-seen-purchase-terms">{__msg("system.PurchaseWorldModal.66db63cf40")}</small>
    </section>
  </div>;
}

function PaidSeenSuccess({ entitlement, onClose, publication }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const [thanksSent, setThanksSent] = useState(false);
  const [thanksSending, setThanksSending] = useState(false);
  const [thanksError, setThanksError] = useState("");
  const chapters = publication?.chapters || [];
  const creator = publication?.creator || {};
  const cover = publication?.coverMedia || publication?.cover || publication?.coverImage;
  const firstName = creatorFirstName(publication);
  const startIndex = Math.min(1, Math.max(0, chapters.length - 1));
  const startTitle = chapters[startIndex]?.title || chapters[0]?.title || __msg("financial.startReading");
  const ownerNumber = Number(entitlement?.ownerNumber || 0);
  const otherOwners = Math.max(0, Number(publication?.ownerCount || 0));
  const note = publication?.ownerWelcomeNote || __msg("financial.welcomeInStartWithValue0ThatSWhere", { value0: startTitle });
  const voice = publication?.introMedia || publication?.worldWelcomeVoiceMedia;
  const openChapter = () => { onClose(); navigate(`/seen/${encodeURIComponent(itemId(publication))}?chapter=${startIndex}`, { replace: true }); };
  const openThanks = async () => {
    if (thanksSent || thanksSending) return;
    setThanksSending(true);
    setThanksError("");
    try {
      await purchaseService.thankSeenCreator(itemId(publication));
      setThanksSent(true);
    } catch (requestError) {
      setThanksError(requestError?.response?.data?.message || __msg("financial.couldNotSendThanksPleaseTryAgain"));
    } finally {
      setThanksSending(false);
    }
  };
  return <div aria-modal="true" className="paid-seen-success-layer" role="dialog" aria-label={__msg("system.PurchaseWorldModal.edf408ff7a", { value0: publication?.title || "Seen" })}><section className="paid-seen-success">
    <button aria-label={__msg("activity.close")} className="paid-seen-success-close" onClick={onClose} type="button"><FiX /></button>
    <div className="paid-seen-success-cover"><PublicationCoverMedia alt="" media={cover} /><span><FiCheck /></span></div><h2>{__msg("system.PurchaseWorldModal.c1976f6dca")}</h2><p>“{publication?.title}{__msg("system.PurchaseWorldModal.cc5ab6d689")} {firstName}</p>
    <ConfirmationRings /><OwnershipBurst />
    <div className="paid-seen-success-owner"><i /> {ownerNumber > 0 ? <>{__msg("system.PurchaseWorldModal.ec01f98448")} {String(ownerNumber).padStart(3, "0")} · </> : null}{new Date(entitlement?.grantedAt || Date.now()).toLocaleDateString(__uiLocale())} <i /></div>
    <div className="paid-seen-success-chapters">{chapters.map((chapter, index) => <div key={chapter.stableChapterId || index} style={{ "--unlock-delay": `${1.1 + index * .28}s` }}><span>{String(index + 1).padStart(2, "0")}</span><b>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</b><i><FiLock className="paid-seen-chapter-lock" /><FiCheck className="paid-seen-chapter-check" /></i></div>)}</div>
    <article className="paid-seen-success-note"><header><FanAvatar name={creatorName(publication)} size="h-9 w-9" src={creator.avatar} /><span><b>{__msg("social.aNoteFrom")} {firstName}</b><small>{__msg("system.PurchaseWorldModal.11cf67e0f7")}</small></span></header><p>“{note}”</p>{voice?.secureUrl || voice?.url ? <audio aria-label={__msg("system.PurchaseWorldModal.2743bf40d9")} controls preload="metadata" src={voice.secureUrl || voice.url} /> : null}</article>
    {otherOwners > 0 ? <p className="paid-seen-success-community">{__msg("celebrations.otherOwners", { count: otherOwners })}</p> : null}<button className="paid-seen-success-start" onClick={openChapter} type="button">{__msg("system.PurchaseWorldModal.109685d3ab")}{startTitle}”</button>
    {thanksError ? <p className="paid-seen-success-thanks-error" role="alert">{thanksError}</p> : null}
    <div className="paid-seen-success-actions"><button className={thanksSent ? "is-sent" : ""} disabled={thanksSent || thanksSending} onClick={openThanks} type="button">{thanksSent ? __msg("share.sentTo", { value0: firstName }) : thanksSending ? __msg("stories.sending") : __msg("system.PurchaseWorldModal.e612dd35b8", { value0: firstName })}</button><button onClick={onClose} type="button">{__msg("verification.later")}</button></div>
  </section></div>;
}

export default function PurchaseWorldModal({ open, onClose, publication, onSuccess }) {
  __useUiLanguage();
  const client = useQueryClient();
  const navigate = useNavigate();
  const purchasing = useRef(false);
  const [key, setKey] = useState(""); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [topUpNeeded, setTopUpNeeded] = useState(0); const [entitlement, setEntitlement] = useState(null);
  const [purchasedPublication, setPurchasedPublication] = useState(null);
  const paidSeen = publication?.kind === "SEEN"; const experience = publication?.kind === "EXPERIENCE"; const noun = paidSeen ? "Seen" : experience ? __msg("contentEntities.experience") : __msg("admin.world"); const id = itemId(publication);
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), enabled: open && !entitlement, retry: false });
  useEffect(() => { if (open && !key) setKey(createIdempotencyKey(paidSeen ? "seen-purchase" : experience ? "experience-purchase" : "world-purchase")); if (!open) { setKey(""); setAccepted(false); setError(""); setTopUpNeeded(0); setEntitlement(null); } }, [experience, key, open, paidSeen]);
  const finishPurchase = async (response) => {
    if (paidSeen && response) {
      setPurchasedPublication(publication);
      setEntitlement(response.data?.data?.entitlement || { purchased: true });
    }
    // A completed payment must not become a payment error if a background refresh fails.
    void Promise.allSettled([client.invalidateQueries({ queryKey: ["wallet"] }), client.invalidateQueries({ queryKey: ["world-entitlements"] }), client.invalidateQueries({ queryKey: ["world", id] }), client.invalidateQueries({ queryKey: ["unified-profile"] })]);
    if (!paidSeen || !response) {
      onClose();
      void Promise.resolve(onSuccess?.({ alreadyOwned: !response })).catch(() => {});
      if (paidSeen && !response) navigate(`/seen/${encodeURIComponent(id)}?chapter=${Math.min(1, Math.max(0, (publication?.chapters?.length || 1) - 1))}`, { replace: true });
    }
  };
  const closeSuccess = () => { onClose(); void Promise.resolve(onSuccess?.()).catch(() => {}); };
  const confirmPurchase = async () => { if (purchasing.current) return; purchasing.current = true; setBusy(true); setError(""); try { await finishPurchase(await purchaseService.purchaseWorld(id, key || createIdempotencyKey("seen-purchase"))); } catch (requestError) { const code = financialErrorCode(requestError); if (["ALREADY_ENTITLED", "SELF_PURCHASE_NOT_REQUIRED"].includes(code)) await finishPurchase(null); else if (code === "INSUFFICIENT_STARS") { const short = Math.max(0, Number(publication.pricing?.starsAmount || 0) - Number(wallet.data?.balance || 0)); setTopUpNeeded(short); setError(__msg("system.PurchaseWorldModal.198907bfa4", { value0: short })); } else setError(financialErrorMessage(requestError)); } finally { purchasing.current = false; setBusy(false); } };
  const topUpAndResume = async () => { if (purchasing.current || !topUpNeeded) return; purchasing.current = true; setBusy(true); setError(""); try { await walletService.topUpExact(topUpNeeded, createIdempotencyKey("purchase-exact-topup")); await finishPurchase(await purchaseService.purchaseWorld(id, key)); } catch (requestError) { if (["ALREADY_ENTITLED", "SELF_PURCHASE_NOT_REQUIRED"].includes(financialErrorCode(requestError))) await finishPurchase(null); else setError(financialErrorMessage(requestError)); } finally { purchasing.current = false; setBusy(false); } };
  const remaining = useMemo(() => wallet.data ? wallet.data.balance - Number(publication?.pricing?.starsAmount || 0) : null, [publication?.pricing?.starsAmount, wallet.data]);
  if (!open) return null;
  if (paidSeen && entitlement) return <PaidSeenSuccess entitlement={entitlement} onClose={closeSuccess} publication={purchasedPublication || publication} />;
  if (paidSeen) return <PaidSeenPurchaseSheet busy={busy} error={error} onClose={onClose} onPurchase={confirmPurchase} onTopUp={topUpAndResume} publication={publication} topUpNeeded={topUpNeeded} />;
  return <FinancialConfirmDialog presentation="center-sheet" open={open} onClose={() => !busy && onClose()} title={__msg("financial.unlockThis", { value0: noun })} actions={<><button className="rounded-full border border-atseen-line px-5 py-3" disabled={busy} onClick={onClose}>{__msg("admin.cancel")}</button><button className="rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg disabled:opacity-40" disabled={busy || !accepted || wallet.isError} onClick={confirmPurchase}>{busy ? __msg("financial.processing") : __msg("financial.unlock", { value0: publication?.pricing?.starsAmount })}</button></>}><p className="font-bold">{publication?.title}</p><p className="mt-1 text-sm text-atseen-muted">{__msg("financial.permanentAccessToThis")} {noun}{__msg("financial.onePaymentIncludingFutureChapterUpdates")}</p><div className="mt-4 rounded-xl bg-atseen-bg p-4"><p className="text-xs text-atseen-muted">{__msg("financial.currentBalance")}</p><WalletBalance /><p className="mt-2 text-xs text-atseen-muted">{__msg("financial.estimatedRemainingBalance")} {remaining == null ? __msg("admin.unavailable") : <><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" />{remaining}</>}</p></div><label className="mt-4 flex items-start gap-3 text-sm"><input checked={accepted} className="mt-1" onChange={(event) => setAccepted(event.target.checked)} type="checkbox" /> {__msg("financial.iConfirmThisOneTimeStarsPurchase")}</label>{error ? <p aria-live="assertive" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{__systemMessage(error)}</p> : null}{topUpNeeded > 0 ? <button className="mt-3 w-full rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg disabled:opacity-40" disabled={busy} onClick={topUpAndResume} type="button">{__msg("publication.add")} {topUpNeeded} {__msg("system.PurchaseWorldModal.7f542f65f5")}</button> : null}</FinancialConfirmDialog>;
}
