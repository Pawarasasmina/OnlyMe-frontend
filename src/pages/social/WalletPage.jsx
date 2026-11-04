import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { walletService } from "../../services/walletService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { walletRate, walletPacks, ledgerUsd } from "../../utils/walletPresentation";
import { resolveMediaUrl } from "../../utils/media";
import "./WalletPage.css";
import PayoutFlow from "../../components/financial/PayoutFlow";

function Coin({ value }) {
  return <span className="wallet-coin"><img alt="" src="/brand/goldcoin.png" />{Number(value).toLocaleString(__uiLocale())}</span>;
}
const creatorEvents = new Set(["WORLD_CREATOR_EARNING", "PREMIUM_CREATOR_EARNING", "DREAM_CREATOR_EARNING", "CHAT_GIFT_EARNING", "DA_CREATOR_EARNING", "CALL_CREATOR_EARNING"]);
const money = (value) => value == null || !Number.isFinite(Number(value)) ? "\u2014" : new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value));

function activityTitle(item) {
  const person = item.counterparty?.name;
  const publication = item.publication?.title;
  if (["CREDIT_ADMIN", "WALLET_TOPUP_CREDIT"].includes(item.event)) return __msg("social.coinPack");
  if (item.event === "INCOME_CONVERSION_DEBIT") return __msg("social.creatorIncomeConverted");
  if (item.event === "INCOME_CONVERSION_CREDIT") return __msg("social.coinsFromCreatorIncome");
  if (item.event.includes("DA_")) return person ? __msg("social.value0UnlockedYourQuestion", { value0: person }) : __msg("social.directAccessUnlocked");
  if (item.event.includes("CALL_")) return person ? `${person} booked a call` : __msg("social.paidCall");
  if (item.event.includes("GIFT")) return person ? `${person} sent a gift` : __msg("social.giftReceived");
  if (item.event.includes("DREAM")) return person ? __msg("social.value0SupportedYourDreamValue1", { value0: person, value1: publication ? ` “${publication}”` : "" }) : publication || __msg("admin.dreamSupport");
  if (item.event.includes("PREMIUM")) return person ? __msg("social.value0SubscribedToYourWorld", { value0: person }) : publication || __msg("social.worldSubscription");
  if (item.event.includes("WORLD")) return person ? `${person} bought ${publication || "your World"}` : publication || __msg("social.worldUnlock");
  return item.event.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ActivityRow({ item, rate, income = false }) {
  __useUiLanguage();
  const positive = Number(item.starsChange) >= 0;
  const initials = (item.counterparty?.name || item.counterparty?.username || "S").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <article className="wallet-prototype-activity-row"><div className="wallet-prototype-activity-copy">{income ? <span className="wallet-prototype-avatar">{item.counterparty?.avatar ? <img alt="" src={resolveMediaUrl(item.counterparty.avatar)} /> : <b>{initials}</b>}</span> : null}<span><strong>{income && item.counterparty?.name ? item.counterparty.name : activityTitle(item)}</strong><small>{income && item.counterparty?.name ? `${activityTitle(item).replace(item.counterparty.name, "").trim()} \u00b7 ` : ""}{item.counterparty?.username ? `@${item.counterparty.username} · ` : ""}{new Date(item.createdAt).toLocaleDateString(__uiLocale(), { month: "short", day: "numeric" })}</small></span></div><b className={positive ? "is-credit" : "is-debit"}>{positive ? "+" : "−"} {income ? money(ledgerUsd(item, rate)) : <><Coin value={Math.abs(item.starsChange)} /></>}</b></article>;
}

function AutomaticIncome({ data }) {
  __useUiLanguage();
  const items = data?.items || [];
  return <section className="mt-3 border-t border-white/10">
    {items.length ? items.map((item) => { const name = item.subscriber?.name || item.subscriber?.username || __msg("social.subscriber"); return <article className="flex items-center justify-between gap-4 border-b border-white/10 px-2 py-4" key={item.id}><span className="min-w-0"><b className="block truncate text-sm">{item.world?.title || __msg("admin.world")} · {name}</b><small className="mt-1 block text-[11px] font-semibold text-emerald-400">{Number(item.stars || 0).toLocaleString(__uiLocale())} {__msg("social.auto")}</small></span><strong className="flex-none text-sm text-emerald-400">+{money(item.usd)}</strong></article>; }) : <p className="border-b border-white/10 px-2 py-5 text-xs text-white/40">{__msg("social.noAutomaticWorldRenewalsYet")}</p>}

  </section>;
}

export default function WalletPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payoutOpen, setPayoutOpen] = useState(searchParams.get("withdraw") === "1");
  const closePayout = () => {
    setPayoutOpen(false);
    if (searchParams.has("withdraw")) {
      const next = new URLSearchParams(searchParams);
      next.delete("withdraw");
      setSearchParams(next, { replace: true });
    }
  };
  const queryClient = useQueryClient();
  const pageRef = useRef(null);
  const [sheetBounds, setSheetBounds] = useState({});
  const [limitBusy, setLimitBusy] = useState(false);
  const [limitError, setLimitError] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  useEffect(() => {
    if (!limitOpen) return undefined;
    const sync = () => { const bounds = pageRef.current?.getBoundingClientRect(); if (bounds) setSheetBounds({ "--wallet-sheet-left": `${bounds.left}px`, "--wallet-sheet-width": `${bounds.width}px` }); };
    sync();
    window.addEventListener("resize", sync);
    const close = (event) => { if (event.key === "Escape") setLimitOpen(false); };
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("keydown", close); window.removeEventListener("resize", sync); };
  }, [limitOpen]);
  const [tab, setTab] = useState(searchParams.get("tab") === "income" || searchParams.get("withdraw") === "1" ? "income" : "coins");
  const [topUpBusy, setTopUpBusy] = useState(null);
  const [topUpMessage, setTopUpMessage] = useState("");
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), retry: false });
  const ledgerQuery = useQuery({ queryKey: ["wallet-ledger", 1], queryFn: () => walletService.getLedger({ page: 1, limit: 100 }).then((response) => response.data.data.items), retry: false });
  const wallet = walletQuery.data;
  const rate = walletRate(wallet);
  const incomeItems = useMemo(() => (ledgerQuery.data || []).filter((item) => creatorEvents.has(item.event)), [ledgerQuery.data]);
  const packs = useMemo(() => walletPacks(wallet), [wallet]);

  const topUp = async (pack) => {
    const bonusCopy = pack.bonus ? `, including ${pack.bonus} bonus coins` : "";
    if (!window.confirm(__msg("social.addValue0Value1ToYourWalletValue2", { value0: "", value1: pack.total.toLocaleString(__uiLocale()), value2: bonusCopy }))) return;
    setTopUpBusy(pack.usd);
    setTopUpMessage("");
    try {
      const response = await walletService.topUp(pack.usd, createIdempotencyKey("wallet-topup"));
      const credited = response.data.data?.topUp?.totalStars;
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["wallet"] }), queryClient.invalidateQueries({ queryKey: ["wallet-ledger"] })]);
      setTopUpMessage(__msg("social.value0Value1AddedToYourWallet", { value0: "", value1: credited != null ? Number(credited).toLocaleString(__uiLocale()) : pack.total.toLocaleString(__uiLocale()) }));
    } catch (error) {
      setTopUpMessage(error.response?.data?.message || __msg("social.couldNotTopUpYourWalletPleaseTry"));
    } finally {
      setTopUpBusy(null);
    }
  };
  const saveLimit = async (value) => {
    setLimitBusy(true);
    setLimitError("");
    try {
      const response = await walletService.updateSpendingLimit(value);
      queryClient.setQueryData(["wallet"], current => ({ ...current, monthlySpendingLimitUsd: response.data.data.monthlySpendingLimitUsd }));
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setLimitOpen(false);
    } catch (error) { setLimitError(error.response?.data?.message || __msg("wallet.limitSaveError")); }
    finally { setLimitBusy(false); }
  };

  return <section className="wallet-prototype-page" ref={pageRef}>
    <header className="wallet-prototype-header"><button aria-label={__msg("profile.goBack")} onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /></button><h1>{__msg("profile.wallet")}</h1></header>
    <div className="wallet-prototype-tabs" role="tablist"><button className={tab === "coins" ? "is-active" : ""} onClick={() => setTab("coins")} aria-selected={tab === "coins"} role="tab" type="button">{__msg("social.coins")}</button><button className={tab === "income" ? "is-active" : ""} onClick={() => setTab("income")} aria-selected={tab === "income"} role="tab" type="button">{__msg("social.income")}</button></div>
    {walletQuery.isLoading ? <p className="wallet-prototype-state">{__msg("social.loadingWallet")}</p> : walletQuery.isError ? <p className="wallet-prototype-state is-error">{__msg("social.walletIsUnavailable")}</p> : tab === "coins" ? <>
      <section className="wallet-prototype-balance"><small>{__msg("financial.yourBalance")}</small><strong><Coin value={wallet.balance ?? 0} /></strong><span>= {money(rate ? Number(wallet.balance ?? 0) / rate : null)}</span><div><span>{__msg("social.yourBonus")} <Coin value={wallet.bonusBalance ?? 0} /></span><span>{__msg("social.spentFirstNotWithdrawable")}</span></div></section>
      <div className="wallet-month-spending"><span><small>{__msg("wallet.spentThisMonth")}</small><strong>{wallet.spentThisMonthStars != null ? <Coin value={wallet.spentThisMonthStars} /> : "\u2014"} <em>{money(wallet.spentThisMonthUsd)}</em></strong></span><button onClick={() => setLimitOpen(true)} type="button"><small>{__msg("wallet.monthlyLimit")}</small><b>{wallet.monthlySpendingLimitUsd === 0 ? __msg("fanWeb.off") : money(wallet.monthlySpendingLimitUsd)}<FiChevronRight /></b></button></div>
      <h2 className="wallet-prototype-label">{__msg("social.topUp")}</h2>
      {!packs.length ? <p className="wallet-prototype-state">{__msg("wallet.packsUnavailable")}</p> : null}
      <div className="wallet-prototype-packs">{packs.map((pack) => <button aria-label={__msg("social.addStars", { value0: pack.total })} disabled={topUpBusy !== null} key={pack.usd} onClick={() => topUp(pack)} type="button">{pack.badge === "popular" ? <em>{__msg("data.popular")}</em> : pack.badge === "best_value" ? <em>{__msg("social.bestValue")}</em> : null}<strong><Coin value={pack.total} /> {pack.bonus ? <small>+ <Coin value={pack.bonus} /> {__msg("social.bonus")}</small> : null}</strong><span>{topUpBusy === pack.usd ? __msg("stories.adding_ffb2e6") : money(pack.usd)}</span></button>)}</div>
      {topUpMessage ? <p className="wallet-prototype-state" role="status">{topUpMessage}</p> : null}
      <p className="wallet-prototype-rate">{__msg("wallet.secureCheckout")}</p>
      <h2 className="wallet-prototype-label">{__msg("social.activity")}</h2>
      <div className="wallet-prototype-activity">{ledgerQuery.isError ? <p className="wallet-prototype-state is-error">{__msg("financial.ledgerHistoryIsUnavailable")}</p> : ledgerQuery.isLoading ? <p className="wallet-prototype-state">{__msg("social.loadingActivity")}</p> : (ledgerQuery.data || []).length ? ledgerQuery.data.slice(0, 12).map((item) => <ActivityRow item={item} key={item.id} rate={rate} />) : <p className="wallet-prototype-state">{__msg("social.noStarsActivityYet")}</p>}</div>
    </> : <>
      <section className="wallet-prototype-income"><small>{__msg("social.creatorIncomeRealMoney")}</small><strong>{money(wallet.availableIncomeUsd)}</strong><span>{__msg("wallet.availableToWithdraw")}{wallet.pendingIncomeUsd > 0 ? ` \u00b7 ${money(wallet.pendingIncomeUsd)} ${__msg("wallet.clearing")}` : ""}{wallet.clearingDays != null ? ` (${wallet.clearingDays} ${__msg("wallet.days")})` : ""}{wallet.withdrawalMinimumUsd != null ? ` \u00b7 ${__msg("social.minimum")} ${money(wallet.withdrawalMinimumUsd)}` : ""}</span><div><button onClick={() => setPayoutOpen(true)} type="button">{__msg("social.withdraw")}</button><button onClick={() => navigate("/wallet/to-coins")} type="button">{__msg("social.toCoins")}</button></div></section>
      <h2 className="wallet-prototype-label">{__msg("social.whoSupportedYou")}</h2>
      <div className="wallet-prototype-activity">{ledgerQuery.isError ? <p className="wallet-prototype-state is-error">{__msg("financial.ledgerHistoryIsUnavailable")}</p> : ledgerQuery.isLoading ? <p className="wallet-prototype-state">{__msg("social.loadingActivity")}</p> : incomeItems.length ? incomeItems.map((item) => <ActivityRow income item={item} key={item.id} rate={rate} />) : <p className="wallet-prototype-state">{__msg("social.yourCreatorIncomeWillAppearHere")}</p>}</div>
      <h2 className="wallet-prototype-label wallet-prototype-payout-label">{__msg("social.payoutsAuto")}</h2>
      <AutomaticIncome data={wallet.automaticIncome} />
    </>}
    {limitOpen ? <div className="wallet-limit-layer" style={sheetBounds} role="dialog" aria-modal="true" aria-labelledby="wallet-limit-title"><button className="wallet-limit-dim" aria-label={__msg("fanWeb.closeDialog")} onClick={() => setLimitOpen(false)} type="button" /><section className="wallet-limit-sheet"><span className="wallet-limit-handle" /><h2 id="wallet-limit-title">{__msg("wallet.monthlyLimit")}</h2><p>{__msg("wallet.limitExplanation")}</p><div className="wallet-limit-choices">{(wallet?.spendingLimitOptionsUsd || []).map(value => <button aria-pressed={wallet.monthlySpendingLimitUsd === value} className={wallet.monthlySpendingLimitUsd === value ? "is-active" : ""} disabled={limitBusy} onClick={() => saveLimit(value)} key={value} type="button">{value === 0 ? __msg("fanWeb.off") : money(value)}</button>)}</div>{limitError ? <p role="alert">{limitError}</p> : null}<small>{__msg("wallet.thisMonth")}: {money(wallet?.spentThisMonthUsd)}</small></section></div> : null}
    {payoutOpen ? <PayoutFlow anchorRef={pageRef} onClose={closePayout} /> : null}
  </section>;
}
