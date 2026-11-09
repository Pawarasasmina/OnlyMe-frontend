import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
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

const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleDateString(__uiLocale(), { month: "short", day: "numeric" }) : __msg("admin.dateUnavailable");
const active = item => ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(item.status) && new Date(item.currentPeriodEnd) > new Date();
const cancelled = item => item.cancelAtPeriodEnd || item.status === "CANCEL_AT_PERIOD_END";
const worldId = item => item.premiumPublication?.id || item.premiumPublication?._id;
const title = item => item.premiumPublication?.title || __msg("profile.value0SWorld", { value0: item.creator?.name?.split(" ")[0] || __msg("discover.creator") });
function State({ query, children }) {
  __useUiLanguage();
  if (query.isPending) return <p className="owner-things-state" role="status">{__msg("financial.loading")}</p>;
  if (query.isError) return <div className="owner-things-state" role="alert">{__msg("profile.unableToLoadThisRightNow")} <button onClick={() => query.refetch()} type="button">{__msg("discover.tryAgain")}</button></div>;
  return children;
}

export default function OwnerLibrary({ userId, wallet, onClose, onFullScreen, subscriptionsOnly = false }) {
  __useUiLanguage();
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
  const owned = useQuery({ enabled: !subscriptionsOnly, queryKey: ["owner-library", userId], queryFn: () => walletService.getWorldEntitlements().then(r => (r.data.data.items || []).filter(x => x.status === "ACTIVE" && x.publication && x.publication.kind !== "PREMIUM_WORLD")), retry: false });
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
  const who = membership ? <div className="library-who"><FanAvatar name={membership.creator?.name} src={membership.creator?.avatar} /><div><b>{title(membership)}</b><small>{__msg("profile.member")}{membership.memberNumber || "—"} · {screen === "cancel" ? __msg("profile.coinsAMonth", { value0: membership.starsPerPeriod.toLocaleString(__uiLocale()) }) : __msg("profile.since", { value0: date(membership.joinedAt || membership.currentPeriodStart) })}</small></div></div> : null;
  const items = detail.data?.items || [];
  return <div className={`owner-library ${subscriptionsOnly ? "is-subscriptions" : ""} ${screen === "cancel" || screen === "done" ? "is-full" : ""}`} aria-busy={busy} ref={root} tabIndex={-1}>
    {screen === "library" ? <>
      <h2>{__msg(subscriptionsOnly ? "admin.subscriptions" : "profile.yourLibrary")}</h2>
      {!subscriptionsOnly && <State query={owned}>{owned.data?.length ? <><h3>{__msg("profile.yoursForever")}</h3>{owned.data.map(item => { const p = item.publication; const id = p.id || p._id; return <Link className="owner-things-row" key={item.id} onClick={onClose} to={p.kind === "EXPERIENCE" ? `/experience/${id}` : p.kind === "SEEN" ? `/seen/${id}` : `/world/${id}`}>
        {p.coverMedia?.secureUrl ? <img alt="" className="library-owned-cover" src={resolveMediaUrl(p.coverMedia.secureUrl)} /> : <FiBookmark />}<span className="owner-things-copy"><b dir="auto">{p.title}</b><small>{p.creator?.name || __msg("profile.ownedContent")}</small></span><FiChevronRight data-ui-directional="true" /></Link>; })}</> : null}</State>}
      <State query={memberships}>{memberships.data?.filter(active).length ? <>{!subscriptionsOnly && <h3>{__msg("profile.yourWorlds")}</h3>}{memberships.data.filter(active).map(item => <button className="owner-things-row" key={item.id} onClick={() => open(item)} type="button"><FanAvatar name={item.creator?.name} src={item.creator?.avatar} /><span className="owner-things-copy"><b>{title(item)}</b><small>{subscriptionsOnly ? (cancelled(item) ? `${__msg("profile.ends")} ${date(item.currentPeriodEnd)}` : __msg("payments.renews", { date: date(item.currentPeriodEnd), coins: item.starsPerPeriod.toLocaleString(__uiLocale()) })) : <>#{item.memberNumber || "—"} · {cancelled(item) ? __msg("profile.ends") : __msg("profile.renews")} {date(item.currentPeriodEnd)}</>}</small></span>{subscriptionsOnly ? <FiChevronRight data-ui-directional="true" /> : <span className="library-manage">{__msg("profile.manage")}</span>}</button>)}</> : (subscriptionsOnly || (!owned.isPending && !owned.isError && !owned.data?.length)) ? <p className="owner-things-state">{__msg("profile.whatYouUnlockLivesHereForeverWorldsYouJoin")}</p> : null}</State>
    </> : null}
    {screen === "manage" ? <>
      {who}
      <State query={detail}><div className="library-recap"><h3>{__msg("profile.yourMonthInside")}</h3><div>{[[detail.data?.recap?.stories, __msg("system.copy.e131cebf6fe4")], [detail.data?.recap?.chapters, __msg("system.copy.9736f1d145e3")], [detail.data?.recap?.messages, __msg("system.copy.b6949fd239d1")]].map(([n, label]) => <div key={label}><b>{n ?? "—"}</b><small>{label}</small></div>)}</div></div></State>
      {cancelled(membership) ? <div className="library-recap"><b>{__msg("profile.yourMembershipEnds")} {date(membership.currentPeriodEnd)}</b><p>{__msg("profile.everythingStaysOpenUntilThenNoMoreCharges")}</p><button className="library-primary" disabled={busy || !active(membership)} onClick={() => save("resume")} type="button">{busy ? __msg("financial.saving") : __msg("profile.restartMembership")}</button></div> : <div className="library-payment"><div><span><b>{__msg("profile.nextPayment")}</b><small>{__msg("profile.renewsAutomatically")}</small></span><span><b>{date(membership.currentPeriodEnd)}</b> · <img alt={__msg("profile.coins")} src="/brand/goldcoin.png" /> {membership.starsPerPeriod.toLocaleString(__uiLocale())}</span></div>{wallet && wallet.balance < membership.starsPerPeriod ? <Link onClick={onClose} to="/wallet"><b>{__msg("profile.topUpToStay")}</b><small>{__msg("profile.youHave")} {wallet.balance.toLocaleString(__uiLocale())} {__msg("profile.coinsRenewalNeeds")} {membership.starsPerPeriod.toLocaleString(__uiLocale())}</small></Link> : null}<button disabled={busy} onClick={() => changeScreen("cancel")} type="button">{__msg("profile.cancelMembership")}</button></div>}
      <p className="library-footnote">{__msg("profile.cancelAnytimeYouKeepAccessUntilTheEndOf")}</p>
    </> : null}
    {screen === "cancel" ? <>
      <div className="library-cancel-content"><div className="library-wall">{items.filter(x => x.image).slice(0, 6).map(x => <img alt="" key={x.id} src={resolveMediaUrl(x.image)} />)}</div><button aria-label={__msg("profile.backToMembership")} className="library-back" disabled={busy} onClick={() => changeScreen("manage")} type="button"><FiArrowLeft data-ui-directional="true" /></button>{who}<h1>{__msg("profile.cancelYourMembership")}</h1><p>{__msg("profile.hereSExactlyWhatHappensNothingMore")}</p><ol className="library-timeline"><li><b>{__msg("profile.today")}</b><small>{__msg("profile.everythingStaysOpenStoriesChaptersCircles")}</small></li><li><b>{date(membership.currentPeriodEnd)}</b><small>{__msg("profile.yourMembershipEndsNothingMoreIsCharged")}</small></li><li><b>{__msg("profile.anytimeAfter")}</b><small>{__msg("profile.youCanJoinThisWorldAgain")}</small></li></ol>{items.length ? <div className="library-waiting"><h3>{__msg("profile.waitingForYouInside")}</h3><div>{items.map(x => <div className="library-preview-card" key={x.id}><span>{x.image ? <img alt="" src={resolveMediaUrl(x.image)} /> : <FiBookmark />}</span><b dir="auto">{x.title}</b><small>{x.kind === "story" ? __msg("profile.privateStory") : __msg("profile.chapter")}</small></div>)}</div></div> : null}</div>
      <div className="library-bar"><button className="library-primary" disabled={busy} onClick={() => save("cancel")} type="button">{busy ? __msg("profile.cancelling") : __msg("profile.finishCancellation")}</button><button className="library-secondary" disabled={busy} onClick={() => changeScreen("manage")} type="button">{__msg("profile.goBack")}</button></div>
    </> : null}
    {screen === "done" ? <><div className="library-success"><span className="library-success-ring"><FiCheck /></span><h1>{__msg("profile.yourMembershipIsCancelled")}</h1><p>{__msg("profile.youWonTBeChargedAgain")}{receiptEmailSent ? __msg("profile.aConfirmationIsOnItsWayToYourEmail") : ""}</p><div className="library-success-card">{who}<small>{__msg("profile.openForYouUntil")} {date(membership.currentPeriodEnd)}</small></div></div><div className="library-bar"><button className="library-primary" disabled={busy} onClick={onClose} type="button">{__msg("comments.done")}</button><button className="library-secondary" disabled={busy || !active(membership)} onClick={() => save("resume")} type="button">{busy ? __msg("financial.saving") : __msg("profile.restartMembership")}</button></div></> : null}
    {error ? <p className="library-error" role="alert">{__systemMessage(error)}</p> : null}
  </div>;
}
