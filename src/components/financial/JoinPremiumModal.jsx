import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
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
const firstNameOf = (creator) => (creator?.name || creator?.displayName || creator?.username || __msg("discover.creator")).trim().split(/\s+/)[0];
const nextDate = () => new Date(Date.now() + 30 * 86400000).toLocaleDateString(__uiLocale(), { month: "short", day: "numeric" });

export default function JoinPremiumModal({ authenticated = true, onClose, onRequireAuth, open, publication, onSuccess }) {
  __useUiLanguage();
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
      else if (code === "INSUFFICIENT_STARS") { const missing = Math.max(0, data.charge - Number(wallet.data?.balance || 0)); setTopUpNeeded(missing); setError(__msg("system.JoinPremiumModal.d276a2dd52", { value0: missing })); }
      else setError(financialErrorMessage(requestError));
    } finally { setBusy(false); }
  };
  const topUpAndResume = async () => {
    if (!topUpNeeded || busy) return;
    setBusy(true); setError("");
    try { await walletService.topUpExact(topUpNeeded, createIdempotencyKey("world-exact-topup")); await finish(await membershipService.joinPremiumWorld(publication.id || publication._id, key)); }
    catch (requestError) { setError(financialErrorMessage(requestError, __msg("financial.topUpOrSubscriptionCouldNotBeCompleted"))); }
    finally { setBusy(false); }
  };

  return <div className="premium-confirm-overlay" onMouseDown={onClose} role="presentation"><section aria-label={__msg("system.JoinPremiumModal.0f4f9df90a", { value0: publication.title })} aria-modal="true" className="premium-confirm-sheet" onMouseDown={(event) => event.stopPropagation()} role="dialog">
    <span className="premium-confirm-handle" /><button aria-label={__msg("activity.close")} className="premium-confirm-close" onClick={onClose} type="button"><FiX /></button>
    <small>{__msg("system.JoinPremiumModal.9a3f6528f2")} {firstName.toUpperCase()}{__msg("system.JoinPremiumModal.6ec321d6e9")}</small><h2>{__msg("system.JoinPremiumModal.9011f129d9")}</h2><p>{__msg("system.JoinPremiumModal.ac8d88aff1")} <b>{publication.title}</b> {__msg("system.JoinPremiumModal.8d0e8c3f37")}</p>
    <div className="premium-confirm-summary"><p><span>{__msg("profile.today")}</span><b>{COIN} {data.charge}</b></p><p><span>{__msg("system.JoinPremiumModal.074a29f683")} {nextDate()}</span><b>{COIN} {data.regular}</b></p><p><span>{__msg("system.JoinPremiumModal.abaec4522b")}</span><b>{__msg("publication.every30Days")}</b></p></div>
    <ul><li><FiCheck /> {__msg("system.JoinPremiumModal.914207af96")}</li><li><FiCheck /> {__msg("system.JoinPremiumModal.bb12385ea4")}</li><li><FiCheck /> {__msg("system.JoinPremiumModal.aae5bc7716")}</li></ul>
    {authenticated ? <div className="premium-confirm-balance"><span>{__msg("fan.walletBalance")}</span><b>{COIN} {wallet.data?.balance ?? "—"}</b></div> : null}
    {limitExceeded ? <p className="premium-join-error">{__msg("system.JoinPremiumModal.5015bbda18")} <Link to="/wallet">{__msg("system.JoinPremiumModal.d1aa984bcc")}</Link></p> : null}{error ? <p aria-live="assertive" className="premium-join-error">{__systemMessage(error)}</p> : null}
    {topUpNeeded ? <button className="premium-confirm-primary" disabled={busy} onClick={topUpAndResume} type="button">{busy ? __msg("system.JoinPremiumModal.f4a74a9448") : __msg("system.JoinPremiumModal.0d37aa474c", { value0: COIN, value1: topUpNeeded })}</button> : <button className="premium-confirm-primary" disabled={busy || limitExceeded || (authenticated && (wallet.isError || wallet.isLoading))} onClick={confirm} type="button">{!authenticated ? __msg("system.JoinPremiumModal.6b6b38fab4") : busy ? __msg("system.JoinPremiumModal.f44c1e4259") : __msg("system.JoinPremiumModal.2a87192b60", { value0: COIN, value1: data.charge })}</button>}
    <p className="premium-confirm-terms">{__msg("system.JoinPremiumModal.8908e1d740")} {COIN}{data.regular} {__msg("system.JoinPremiumModal.5192e0ac96")}</p>
  </section></div>;
}
