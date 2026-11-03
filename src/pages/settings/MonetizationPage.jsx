import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiChevronRight, FiFileText, FiGift, FiGlobe, FiLock, FiMessageCircle, FiShield, FiStar, FiTag } from "react-icons/fi";
import api from "../../api/axiosInstance";
import AccountTypeSetting from "../../components/profile/AccountTypeSetting";
import CreatorVerificationPage from "../creator/CreatorVerificationPage";
import { GiftSettingsSheet } from "./ProfileSettingsPage";
import "./MonetizationPage.css";

const money = value => new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD" }).format(value);
function ToolRow({ Icon, title, detail, status, onClick, positive }) {
  __useUiLanguage();
  return <button className="monetization-tool" onClick={onClick} type="button"><span className="monetization-icon"><Icon /></span><span className="monetization-tool-copy"><b>{title}</b><small>{detail}</small></span><span className={positive ? "monetization-on" : "monetization-state"}>{status || <FiChevronRight data-ui-directional="true" />}</span></button>;
}
export default function MonetizationPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const client = useQueryClient();
  const anchor = useRef(null);
  const [sheet, setSheet] = useState(() => { const value = new URLSearchParams(window.location.search).get("verification"); return ["bank-return", "bank-refresh"].includes(value) ? value : null; });
  const [setup, setSetup] = useState(false);
  const [afterEligibility, setAfterEligibility] = useState("verify");
  const [bounds, setBounds] = useState({});
  const setupPanel = useRef(null);
  const [form, setForm] = useState({ dateOfBirth: "", country: "", acceptTerms: false });
  const query = useQuery({ queryKey: ["monetization"], queryFn: () => api.get("/settings/monetization").then(r => r.data.data), refetchOnWindowFocus: true });
  const wallet = useQuery({ queryKey: ["monetization", "wallet"], queryFn: () => api.get("/wallet").then(r => r.data.data.wallet) });
  const data = query.data;
  const mutation = useMutation({ mutationFn: () => api.put("/settings/monetization", { ...form, country: form.country || data.country, termsVersion: data.policy.termsVersion }), onSuccess: r => { client.setQueryData(["monetization"], r.data.data); setSetup(false); client.invalidateQueries({ queryKey: ["profile", "me"] }); client.invalidateQueries({ queryKey: ["unified-profile"] }); if (!r.data.data.payoutsReady) setSheet(afterEligibility); } });
  useEffect(() => {
    const refresh = () => { client.invalidateQueries({ queryKey: ["monetization"] }); };
    window.addEventListener("onlyme-verification-updated", refresh);
    return () => window.removeEventListener("onlyme-verification-updated", refresh);
  }, [client]);
  useEffect(() => {
    if (!setup) return undefined;
    const previous = document.activeElement;
    const center = anchor.current?.closest(".social-center-scroll") || anchor.current;
    const measure = () => { const rect = center?.getBoundingClientRect(); if (rect) setBounds({ left: rect.left, width: rect.width }); };
    measure();
    const observer = new ResizeObserver(measure);
    if (center) observer.observe(center);
    window.addEventListener("resize", measure);
    setupPanel.current?.querySelector("input,select,button")?.focus();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); previous?.focus(); };
  }, [setup]);
  const setupKeys = event => {
    if (event.key === "Escape" && !mutation.isPending) setSetup(false);
    if (event.key !== "Tab") return;
    const elements = [...setupPanel.current.querySelectorAll("input:not(:disabled),select:not(:disabled),button:not(:disabled),a[href]")];
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const eligibilityComplete = data && data.policy.enabled && data.eligibility.age && data.eligibility.standing && data.eligibility.terms && data.hasDateOfBirth && data.country;
  const openEligibility = next => {
    setAfterEligibility(next);
    setSheet(null);
    setForm({ dateOfBirth: "", country: data.country, acceptTerms: false });
    mutation.reset();
    setSetup(true);
  };
  const openSetup = () => {
    if (!data.eligibility.terms || !data.eligibility.age || !data.eligibility.standing || !data.policy.enabled) {
      openEligibility("verify");
      return;
    }
    if (data.verified || eligibilityComplete) { setSheet("verify"); return; }
    openEligibility("verify");
  };
  const requestBankSetup = () => {
    if (eligibilityComplete) setSheet("setup");
    else openEligibility("setup");
  };
  const toolAction = action => data.enabled ? action() : openSetup();
  const sellerAction = action => toolAction(() => data.sellerReady ? action() : setSheet("verify"));
  const type = data?.accountType ? data.accountType[0].toUpperCase() + data.accountType.slice(1) : "";
  const countryLabel = (() => {
    if (!data?.country || !/^[A-Z]{2}$/.test(data.country)) return data?.country || "";
    try { return new Intl.DisplayNames([__uiLocale()], { type: "region" }).of(data.country); }
    catch { return data.country; }
  })();
  const check = (ok, title, detail) => <div className="monetization-check" key={title}><span className={ok ? "is-passed" : ""}>{ok ? <FiCheck /> : <FiLock />}</span><div><b>{title}</b><small>{detail}</small></div></div>;
  return <main className="monetization-page" ref={anchor}>
    <header className="monetization-header"><button aria-label={__msg("settings.backToSettings")} onClick={() => navigate("/settings")} type="button"><FiArrowLeft data-ui-directional="true" /></button><h1>{__msg("settings.monetization")}</h1></header>
    {query.isPending ? <p role="status">{__msg("settings.loadingMonetization")}</p> : query.isError ? <div role="alert"><p>{__msg("settings.unableToLoadMonetization")}</p><button className="monetization-primary" onClick={() => query.refetch()} type="button">{__msg("discover.tryAgain")}</button></div> : <>
      <section className={`monetization-summary ${data.enabled ? "is-enabled" : ""}`}><div><span className="monetization-summary-icon">{data.enabled ? <FiCheck /> : <FiGift />}</span><div><b>{data.enabled ? __msg("settings.youCanEarnOnSeen") : __msg("settings.earningIsOff")}</b><small>{data.enabled ? `${type} · ${countryLabel}` : __msg("settings.giftsAndDreamsAreOpenToEveryone18")}</small></div></div>{!data.enabled && <button className="monetization-primary" onClick={openSetup} type="button">{__msg("settings.completeEligibility")}</button>}</section>
      <h2 className="monetization-label">{__msg("settings.eligibility")}</h2>
      {check(data.eligibility.age, __msg("settings.18OrOlder"), data.hasDateOfBirth ? __msg("settings.fromYourAccountDetails") : __msg("settings.dateOfBirthNotSet"))}
      {check(data.eligibility.country, __msg("settings.payoutsWorkInYourCountry"), countryLabel || __msg("content.notSet"))}
      {check(data.eligibility.terms, __msg("settings.monetizationTermsAccepted"), __msg("settings.giftsAreSupportNotPaymentForGoods_fb948c"))}
      {check(data.eligibility.standing, __msg("settings.accountInGoodStanding"), data.eligibility.standing ? __msg("settings.noActiveAccountRestrictions") : __msg("settings.accountRestrictionsApply"))}
      <h2 className="monetization-label">{__msg("creator.waysToEarn")}</h2>
      <ToolRow Icon={FiGift} title={__msg("creator.gifts")} detail={__msg("settings.onYourProfileStoriesChatsAndSeens")} status={data.tools.gifts ? "On" : "Off"} positive={data.tools.gifts} onClick={() => toolAction(() => setSheet("gifts"))} />
      <ToolRow Icon={FiStar} title={__msg("profile.dream")} detail={__msg("settings.peopleBackYourGoal")} status={data.tools.dream ? "On" : "Off"} positive={data.tools.dream} onClick={() => toolAction(() => navigate("/profile/dream"))} />
      <AccountTypeSetting renderTrigger={openAccountType => <><ToolRow Icon={FiMessageCircle} title="Direct Access" detail={__msg("settings.paidQuestionsAndCalls")} status={data.tools.directAccess ? "On" : data.accountType === "personal" ? "Switch ›" : "Set up ›"} positive={data.tools.directAccess} onClick={() => data.accountType === "personal" ? openAccountType() : sellerAction(() => navigate("/settings/direct-access"))} /><ToolRow Icon={FiLock} title={__msg("settings.paidSeens")} detail={__msg("settings.freeOrPaidFirstChapterAlwaysFree")} status={data.tools.paidSeens ? "On" : "Set up ›"} positive={data.tools.paidSeens} onClick={() => sellerAction(() => navigate("/create/seen"))} /><ToolRow Icon={FiGlobe} title={__msg("admin.world")} detail={__msg("settings.monthlySubscriptionToEverythingYouShare")} status={data.tools.world ? "On" : data.accountType === "personal" ? "Switch ›" : "Set up ›"} positive={data.tools.world} onClick={() => data.accountType === "personal" ? openAccountType() : sellerAction(() => navigate("/studio/worlds"))} />{data.accountType === "business" && <ToolRow Icon={FiTag} title={__msg("settings.offers")} detail={__msg("settings.contactButtonsAndOffersOnTheWall")} status={data.tools.offers ? "On" : "Off"} positive={data.tools.offers} onClick={openAccountType} />}<h2 className="monetization-label">{__msg("verification.payouts")}</h2><ToolRow Icon={FiFileText} title={__msg("verification.payouts")} detail={wallet.isPending ? __msg("settings.loadingBalance") : wallet.isError ? __msg("settings.balanceUnavailable") : __msg("settings.available", { value0: money(wallet.data.availableIncomeUsd), value1: wallet.data.pendingIncomeUsd > 0 ? ` · ${money(wallet.data.pendingIncomeUsd)} clearing` : "" })} status={data.payoutsReady ? "Verified" : "Set up ›"} positive={data.payoutsReady} onClick={() => setSheet("payouts")} /><ToolRow Icon={FiShield} title={__msg("social.verification")} detail={__msg("settings.badgeAndPayoutsWhenYouFirstWithdraw")} status={data.verified ? "Verified" : "Set up ›"} positive={data.verified} onClick={() => setSheet("verify")} /><ToolRow Icon={FiShield} title={__msg("verification.holdsRefunds")} detail={__msg("settings.howMoneyClearsAndWhatHappensOnARefund")} onClick={() => setSheet("holds")} /><ToolRow Icon={FiFileText} title={__msg("profile.accountType")} detail={`${type}${data.category ? ` · ${data.category}` : ""}`} onClick={openAccountType} /></>} />
    </>}
    {setup && data && <div className="monetization-setup-layer" style={bounds}><button aria-label={__msg("settings.closeEligibility")} className="monetization-dim" onClick={() => !mutation.isPending && setSetup(false)} type="button" /><section ref={setupPanel} onKeyDown={setupKeys} className="monetization-setup" role="dialog" aria-modal="true" aria-label={__msg("settings.completeEligibility")}><h2>{__msg("settings.completeEligibility")}</h2><p>{__msg("settings.confirmYourDetailsToStartEarning")}</p>{!data.policy.enabled ? <p>{__msg("settings.monetizationIsTemporarilyUnavailable")}</p> : <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>{!data.hasDateOfBirth && <label>{__msg("verification.dateOfBirth")}<input type="date" required value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} /><small>{__msg("settings.yourBirthdayIsSavedOnce")}</small></label>}<label>{__msg("settings.payoutCountry")}{data.payoutsReady && data.eligibility.country ? <span className="monetization-approved-country">{countryLabel}</span> : data.policy.supportedCountries.length ? <select required value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}><option value="">{__msg("settings.chooseYourCountry")}</option>{data.policy.supportedCountries.map(country => <option key={country}>{country}</option>)}</select> : <><input required maxLength={80} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder={__msg("verification.countryNameOrTwoLetterCode")} /><small>{__msg("settings.yourPayoutCountryWillBeConfirmedWhenAnAdmin")}</small></>}</label><label className="monetization-consent"><input type="checkbox" required checked={form.acceptTerms} onChange={e => setForm({ ...form, acceptTerms: e.target.checked })} /><span>{__msg("settings.iAcceptThe")} <a href="/settings/support/terms" target="_blank" rel="noreferrer">{__msg("settings.monetizationTerms")}</a>{__msg("settings.giftsAreSupportNotPaymentForGoods")}</span></label><button className="monetization-primary" disabled={mutation.isPending} type="submit">{mutation.isPending ? __msg("financial.saving") : __msg("profile.continue")}</button></form>}{mutation.isError && <p className="monetization-error" role="alert">{mutation.error.response?.data?.message || __msg("settings.unableToSaveYourDetails")}</p>}<button className="monetization-cancel" disabled={mutation.isPending} onClick={() => setSetup(false)} type="button">{__msg("admin.cancel")}</button></section></div>}
    {sheet === "gifts" && <GiftSettingsSheet anchorRef={anchor} isOpen onClose={() => { setSheet(null); query.refetch(); }} />}
    {sheet && sheet !== "gifts" && <CreatorVerificationPage key={sheet} initialView={sheet} onRequestBankSetup={requestBankSetup} onClose={() => { setSheet(null); window.history.replaceState(null, "", "/settings/monetization"); query.refetch(); wallet.refetch(); }} />}
  </main>;
}
