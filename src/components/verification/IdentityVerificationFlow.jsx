import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiCalendar, FiGift, FiLock, FiShield, FiCreditCard, FiTrendingUp, FiMessageCircle } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import axios from "../../api/axiosInstance";
import ManualBankApplication from "./ManualBankApplication";
import { getMessageSocket } from "../../services/messageSocket";
import ManualIdentityApplication from "./ManualIdentityApplication";
import "./IdentityVerificationFlow.css";

const holds = [
  __uiTuple([FiCheck, { __uiMessage: "verification.creditedInstantly" }, { __uiMessage: "verification.theMomentSomeoneSpendsCoinsOnYouThe" }]),
  __uiTuple([FiCalendar, { __uiMessage: "verification.withdrawableAfter14Days" }, { __uiMessage: "verification.newCreators14DaysAfter60DaysWithout" }]),
  __uiTuple([FiShield, { __uiMessage: "verification.ifAPaymentIsRefunded" }, { __uiMessage: "verification.whenTheAppStoreGooglePlayOrA" }]),
  __uiTuple([FiLock, { __uiMessage: "verification.noReserves" }, { __uiMessage: "verification.nothingIsHeldBackBeyondTheClearingDays" }]),
  __uiTuple([FiMessageCircle, { __uiMessage: "verification.directAccessAndPaidSeens" }, { __uiMessage: "verification.unansweredDirectAccessReturnsToTheFanAfter" }]),
  __uiTuple([FiGift, { __uiMessage: "verification.giftsAndDreamSupport" }, { __uiMessage: "verification.finalForFansNoRefundsExceptStoreOr" }]),
  __uiTuple([FiCreditCard, { __uiMessage: "verification.beforeTheFirstPayout" }, { __uiMessage: "verification.manualPayoutRequirements" }]),
  __uiTuple([FiGift, { __uiMessage: "verification.bonusCoins" }, { __uiMessage: "verification.fansGetBonusCoinsWithBiggerPacksAnd" }]),
  __uiTuple([FiShield, { __uiMessage: "verification.upTo500BeforeVerification" }, { __uiMessage: "verification.earnFreelyUpTo500AfterThatGifts" }]),
  __uiTuple([FiShield, { __uiMessage: "verification.fairPlay" }, { __uiMessage: "options.Gifts_between_accounts_on_the_same_device_or_network_are_blocked_New_cards_on_the_web_have_a_daily_limit_Confirmed_fraud_is_reversed" }]),
];

export default function IdentityVerificationFlow({ onClose, initialView = "verify", onRequestBankSetup }) {
  __useUiLanguage();
  const { user, setUser } = useAuth();
  const client = useQueryClient();
  const [view, setView] = useState(initialView.startsWith("bank-") ? "setup" : initialView), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [position, setPosition] = useState({});
  const panel = useRef(null);
  const query = useQuery({ queryKey: ["identity", user?.id || user?._id], queryFn: () => axios.get("/identity").then(r => r.data.data), refetchInterval: q => q.state.data?.status === "pending_review" || q.state.data?.bankStatus === "PENDING_REVIEW" ? 5000 : false, refetchOnWindowFocus: true });
  const wallet = useQuery({ queryKey: ["identity-payout-wallet"], queryFn: () => axios.get("/wallet").then(r => r.data.data.wallet), enabled: view === "payouts" });
  const status = query.data || {}, verified = status.status === "verified";
  const unavailable = (view === "verify" ? false : status.bankAvailable === false || status.available === false);
  const close = useCallback(() => onClose ? onClose() : window.history.back(), [onClose]);
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
  }, [busy, close]);
  useEffect(() => {
    if (!verified) return;
    setUser?.(current => current ? { ...current, isVerified: !status.sealRevoked } : current);
    client.invalidateQueries({ queryKey: ["unified-profile"] });
  }, [verified, status.sealRevoked, client, setUser]);
  const refetchStatus = query.refetch;
  useEffect(() => {
    const socket = getMessageSocket();
    if (!socket) return undefined;
    const refresh = () => { void refetchStatus(); client.invalidateQueries({ queryKey: ["payout-bank"] }); client.invalidateQueries({ queryKey: ["monetization"] }); };
    socket.on("payout-bank:updated", refresh);
    return () => socket.off("payout-bank:updated", refresh);
  }, [refetchStatus, client]);
  useEffect(() => {
    if (status.bankReady) client.invalidateQueries({ queryKey: ["monetization"] });
  }, [status.bankReady, client]);
  const row = (Icon, title, detail, action) => <div className="identity-row"><span className="identity-icon"><Icon /></span><div><b>{title}</b><p>{detail}</p></div>{action}</div>;
  const primary = (label, action, disabled = false) => <button type="button" className="identity-primary" disabled={busy || disabled} onClick={action}>{busy ? __msg("admin.saving") : label}</button>;
  return createPortal(<div className="identity-overlay" style={position}><button aria-label={__msg("verification.closeVerification")} className="identity-backdrop" disabled={busy} onClick={close} /><section className={`identity-sheet view-${view}`} role="dialog" aria-modal="true" aria-label={view === "verify" ? __msg("social.verification") : view === "setup" ? __msg("verification.setUpPayouts") : view === "bank" ? __msg("verification.addABankForPayouts") : view === "holds" ? __msg("verification.holdsRefunds") : __msg("verification.payouts")} ref={panel} tabIndex={-1}><span className="identity-handle" />
    {view === "verify" ? <ManualIdentityApplication onClose={close} onAddBank={() => onRequestBankSetup ? onRequestBankSetup() : setView("setup")} bankReady={status.bankReady} bankLoading={query.isPending} /> : query.isPending ? <p role="status">{__msg("verification.loadingVerification")}</p> : query.isError ? <><h2>{__msg("social.verification")}</h2><p role="alert">{__msg("verification.unableToLoadYourVerificationStatus")}</p>{primary(__msg("discover.tryAgain"), () => query.refetch())}</> : <>
    {unavailable && view !== "verify" && <div className="identity-availability" role="status"><FiShield aria-hidden="true" /><div><b>{__msg("verification.bankSetupIsTemporarilyUnavailable")}</b><p>{__msg("verification.yourVerifiedBadgeStaysOnPleaseComeBackLater")}</p></div></div>}
    {status.sealRevoked && view !== "verify" && <p role="status">{__msg("verification.yourPublicVerifiedSealIsCurrentlySuspendedContactSupport")}</p>}
    {view === "setup" && <><h2>{__msg("verification.setUpPayouts")}</h2><p>{__msg("verification.twoStepsDoneOnce")}</p>{row(verified ? FiCheck : FiShield, __msg("verification.getVerified"), verified ? __msg("verification.verifiedByTheSeenTeam") : __msg("verification.adminIdentityReview"), !verified && <button onClick={() => setView("verify")}>{__msg("verification.verify")}</button>)}{row(status.bankReady ? FiCheck : FiCreditCard, __msg("verification.addABank"), status.bankReady ? __msg("verification.accountEndingValue0ApprovedByAdmin", { value0: status.bankLast4 }) : status.bankStatus === "PENDING_REVIEW" ? __msg("verification.bankDetailsAreUnderAdminReview") : __msg("verification.bankDetailsReviewedByTheSeenTeam"), verified && <button disabled={busy || unavailable} onClick={() => setView("bank")}>{status.bankStatus === "PENDING_REVIEW" ? __msg("verification.view") : status.bankReady ? __msg("verification.manage") : __msg("publication.add")}</button>)}{primary(__msg("comments.done"), () => setView("payouts"), !verified || !status.bankReady)}</>}
    {view === "bank" && <ManualBankApplication onClose={() => { query.refetch(); setView("setup"); }} onSaved={() => query.refetch()} />}

    {view === "payouts" && <><h2>{__msg("verification.payouts")}</h2>{!status.bankReady ? <>{primary(__msg("verification.setUpPayouts"), () => setView("setup"))}</> : <><div className="identity-balance"><p>{__msg("verification.availableToWithdraw")}</p><strong>{wallet.isPending ? "…" : wallet.isError ? __msg("admin.unavailable") : new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(wallet.data?.availableIncomeUsd || 0)}</strong></div><div className="identity-clearing"><span>{__msg("verification.clearing")}<small>{__msg("verification.creditedInstantlyWithdrawableAfter")} {Math.round((wallet.data?.withdrawalHoldHours || 336) / 24)} {__msg("verification.days")}</small></span><b>${wallet.data?.pendingIncomeUsd?.toFixed(2) || "0"}</b></div>{row(FiCreditCard, __msg("verification.bankEnding", { value0: status.bankLast4 }), __msg("verification.approvedByTheSeenTeam"))}{row(FiTrendingUp, __msg("verification.levelNew"), __msg("verification.moneyIsReady14DaysAfterItArrives"))}{row(FiCalendar, __msg("verification.monthlyPayoutPreference"), __msg("verification.processedByTheSeenTeam"), <button role="switch" aria-checked={status.automaticPayout} aria-label={__msg("verification.monthlyPayoutPreference")} className="identity-switch" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await axios.put("/identity/bank/automatic-payout", { active: !status.automaticPayout }); await query.refetch(); } catch (e) { setError(e.response?.data?.message || __msg("verification.savePayoutFailed")); } finally { setBusy(false); } }}><span /></button>)}<p className="identity-withdraw-note">{__msg("verification.payoutsAreProcessedByTheSeenTeam")}</p></>}<small className="identity-center">{__msg("verification.bankDetailsAreConfirmedByAnAdmin")}</small><button className="identity-link" onClick={() => setView("holds")}>{__msg("verification.holdsRefunds_9dfe1d")}</button></>}
    {view === "holds" && <><h2>{__msg("verification.holdsRefunds")}</h2>{holds.map(([Icon, title, detail]) => <div key={title}>{row(Icon, title, detail)}</div>)}<button className="identity-link" onClick={() => setView("payouts")}>{__msg("verification.backToPayouts")}</button></>}
    </>}{error && <p role="alert" className="identity-error">{__systemMessage(error)}</p>}
  </section></div>, document.body);
}
