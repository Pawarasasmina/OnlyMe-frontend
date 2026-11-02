import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiX } from "react-icons/fi";
import { walletService } from "../../services/walletService";
import { membershipService } from "../../services/membershipService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";
import "./worldSubscription.css";

const COIN = "🪙";
const firstNameOf = (creator) => (creator?.name || creator?.displayName || creator?.username || "Creator").trim().split(/\s+/)[0];
const nextDate = () => new Date(Date.now() + 30 * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function JoinPremiumModal({ authenticated = true, onClose, onRequireAuth, open, publication, onSuccess }) {
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [topUpNeeded, setTopUpNeeded] = useState(0);
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), enabled: open && authenticated, retry: false });

  useEffect(() => {
    if (open && !key) setKey(createIdempotencyKey("premium-join"));
    if (!open) { setKey(""); setError(""); setTopUpNeeded(0); }
  }, [key, open]);

  const data = useMemo(() => {
    const offer = publication?.membershipOffer || {};
    const regular = Number(offer.regularPrice || publication?.pricing?.starsAmount || 0);
    const intro = Number(offer.introPrice || (publication?.firstMonthOfferEnabled ? Math.ceil(regular / 2) : regular));
    const creator = publication?.creator || {};
    const stories = (publication?.chapters || []).flatMap((chapter) => (chapter.blocks || []).filter((block) => block.metadata?.storyPreview && block.media?.secureUrl).map((block) => ({ ...block.media, title: block.metadata?.label || chapter.title }))).slice(0, 3);
    return { regular, charge: intro > 0 && intro < regular ? intro : regular, creator, stories, included: publication?.includedExperiences || publication?.includedExperiencePreviews || [], circles: publication?.privateCircles || [], members: publication?.memberPreview || publication?.members?.previewAvatars || publication?.members?.preview || [] };
  }, [publication]);

  if (!open || !publication) return null;
  const firstName = firstNameOf(data.creator);
  const limitExceeded = wallet.data?.monthlySpendingLimit && Number(wallet.data.monthlySpent || 0) + data.charge > wallet.data.monthlySpendingLimit;

  const finish = async (response) => {
    await Promise.all([client.invalidateQueries({ queryKey: ["wallet"] }), client.invalidateQueries({ queryKey: ["memberships"] }), client.invalidateQueries({ queryKey: ["world", publication.id || publication._id] }), client.invalidateQueries({ queryKey: ["unified-profile"] })]);
    await onSuccess?.(response?.data?.data);
  };
  const confirm = async () => {
    if (busy) return;
    if (!authenticated) { onRequireAuth?.(); return; }
    setBusy(true); setError(""); setTopUpNeeded(0);
    try { await finish(await membershipService.joinPremiumWorld(publication.id || publication._id, key)); }
    catch (requestError) {
      const code = financialErrorCode(requestError);
      if (code === "MEMBERSHIP_ALREADY_ACTIVE") await onSuccess?.();
      else if (code === "INSUFFICIENT_STARS") { const missing = Math.max(0, data.charge - Number(wallet.data?.balance || 0)); setTopUpNeeded(missing); setError(`Add exactly ${missing} coins to continue.`); }
      else setError(financialErrorMessage(requestError));
    } finally { setBusy(false); }
  };
  const topUpAndResume = async () => {
    if (!topUpNeeded || busy) return;
    setBusy(true); setError("");
    try { await walletService.topUpExact(topUpNeeded, createIdempotencyKey("world-exact-topup")); await finish(await membershipService.joinPremiumWorld(publication.id || publication._id, key)); }
    catch (requestError) { setError(financialErrorMessage(requestError, "Top-up or subscription could not be completed.")); }
    finally { setBusy(false); }
  };

  return <div className="premium-confirm-overlay" onMouseDown={onClose} role="presentation"><section aria-label={`Confirm ${publication.title} membership`} aria-modal="true" className="premium-confirm-sheet" onMouseDown={(event) => event.stopPropagation()} role="dialog">
    <span className="premium-confirm-handle" /><button aria-label="Close" className="premium-confirm-close" onClick={onClose} type="button"><FiX /></button>
    <small>JOIN {firstName.toUpperCase()}&apos;S WORLD</small><h2>Confirm membership</h2><p>Everything inside <b>{publication.title}</b> unlocks immediately.</p>
    <div className="premium-confirm-summary"><p><span>Today</span><b>{COIN} {data.charge}</b></p><p><span>Next payment · {nextDate()}</span><b>{COIN} {data.regular}</b></p><p><span>Billing</span><b>Every 30 days</b></p></div>
    <ul><li><FiCheck /> Included Paid Seens and all chapters</li><li><FiCheck /> Private stories and Circles</li><li><FiCheck /> One included Direct Access answer monthly</li></ul>
    {authenticated ? <div className="premium-confirm-balance"><span>Wallet balance</span><b>{COIN} {wallet.data?.balance ?? "—"}</b></div> : null}
    {limitExceeded ? <p className="premium-join-error">This purchase exceeds your monthly Wallet limit. <Link to="/wallet">Change limit</Link></p> : null}{error ? <p aria-live="assertive" className="premium-join-error">{error}</p> : null}
    {topUpNeeded ? <button className="premium-confirm-primary" disabled={busy} onClick={topUpAndResume} type="button">{busy ? "Adding coins…" : `Add exactly ${COIN} ${topUpNeeded} & continue`}</button> : <button className="premium-confirm-primary" disabled={busy || limitExceeded || (authenticated && (wallet.isError || wallet.isLoading))} onClick={confirm} type="button">{!authenticated ? "Sign in to join" : busy ? "Joining…" : `Confirm & join · ${COIN}${data.charge}`}</button>}
    <p className="premium-confirm-terms">Renews at {COIN}{data.regular} every 30 days · cancel anytime</p>
  </section></div>;
}
