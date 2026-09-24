import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { walletService } from "../../services/walletService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

const STAR = "✦";
const PACKS = [{ usd: 4.99, bonus: 0 }, { usd: 9.99, bonus: 5 }, { usd: 29.99, bonus: 20 }, { usd: 49.99, bonus: 50, badge: "Popular" }, { usd: 99.99, bonus: 150, badge: "Best value" }, { usd: 249.99, bonus: 500 }];
const creatorEvents = new Set(["WORLD_CREATOR_EARNING", "PREMIUM_CREATOR_EARNING", "DREAM_CREATOR_EARNING", "CHAT_GIFT_EARNING", "DA_CREATOR_EARNING", "CALL_CREATOR_EARNING", "CREATOR_EARNING_REVERSAL"]);
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value || 0));

function activityTitle(item) {
  const person = item.counterparty?.name;
  const publication = item.publication?.title;
  if (["CREDIT_ADMIN", "WALLET_TOPUP_CREDIT"].includes(item.event)) return "Coin pack";
  if (item.event.includes("DA_")) return person ? `${person} unlocked your question` : "Direct Access unlocked";
  if (item.event.includes("CALL_")) return person ? `${person} booked a call` : "Paid call";
  if (item.event.includes("GIFT")) return person ? `${person} sent a gift` : "Gift received";
  if (item.event.includes("DREAM")) return person ? `${person} supported your dream${publication ? ` “${publication}”` : ""}` : publication || "Dream support";
  if (item.event.includes("PREMIUM")) return person ? `${person} subscribed to your World` : publication || "World subscription";
  if (item.event.includes("WORLD")) return person ? `${person} bought ${publication || "your World"}` : publication || "World unlock";
  return item.event.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ActivityRow({ item, rate, income = false }) {
  const positive = Number(item.starsChange) >= 0;
  const initials = (item.counterparty?.name || item.counterparty?.username || "S").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <article className="wallet-prototype-activity-row"><div className="wallet-prototype-activity-copy">{income ? <span className="wallet-prototype-avatar">{item.counterparty?.avatar ? <img alt="" src={item.counterparty.avatar} /> : <b>{initials}</b>}</span> : null}<span><strong>{activityTitle(item)}</strong><small>{item.counterparty?.username ? `@${item.counterparty.username} · ` : ""}{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span></div><b className={positive ? "is-credit" : "is-debit"}>{positive ? "+" : "−"} {income ? money(Math.abs(item.starsChange) / rate) : <>{STAR}{Math.abs(item.starsChange).toLocaleString()}</>}</b></article>;
}

export default function WalletPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("coins");
  const [topUpBusy, setTopUpBusy] = useState(null);
  const [topUpMessage, setTopUpMessage] = useState("");
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), retry: false });
  const ledgerQuery = useQuery({ queryKey: ["wallet-ledger", 1], queryFn: () => walletService.getLedger({ page: 1, limit: 100 }).then((response) => response.data.data.items), retry: false });
  const wallet = walletQuery.data;
  const rate = Number(wallet?.starsPerUsd || 10);
  const incomeItems = useMemo(() => (ledgerQuery.data || []).filter((item) => creatorEvents.has(item.event)), [ledgerQuery.data]);
  const packs = useMemo(() => PACKS.map((pack) => ({ ...pack, base: Math.round(pack.usd * rate), total: Math.round(pack.usd * rate) + pack.bonus })), [rate]);

  const topUp = async (pack) => {
    const bonusCopy = pack.bonus ? `, including ${STAR}${pack.bonus} bonus` : "";
    if (!window.confirm(`Add ${STAR}${pack.total.toLocaleString()} to your Wallet${bonusCopy}?`)) return;
    setTopUpBusy(pack.usd);
    setTopUpMessage("");
    try {
      await walletService.topUp(pack.usd, createIdempotencyKey("wallet-topup"));
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["wallet"] }), queryClient.invalidateQueries({ queryKey: ["wallet-ledger"] })]);
      setTopUpMessage(`${STAR}${pack.total.toLocaleString()} added to your Wallet.`);
    } catch (error) {
      setTopUpMessage(error.response?.data?.message || "Could not top up your Wallet. Please try again.");
    } finally {
      setTopUpBusy(null);
    }
  };

  return <section className="wallet-prototype-page">
    <header className="wallet-prototype-header"><button aria-label="Go back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><h1>Wallet</h1></header>
    <div className="wallet-prototype-tabs" role="tablist"><button className={tab === "coins" ? "is-active" : ""} onClick={() => setTab("coins")} role="tab" type="button">Coins</button><button className={tab === "income" ? "is-active" : ""} onClick={() => setTab("income")} role="tab" type="button">Income</button></div>
    {walletQuery.isLoading ? <p className="wallet-prototype-state">Loading Wallet…</p> : walletQuery.isError ? <p className="wallet-prototype-state is-error">Wallet is unavailable.</p> : tab === "coins" ? <>
      <section className="wallet-prototype-balance"><small>Your balance</small><strong>{STAR}{Number(wallet.balance || 0).toLocaleString()}</strong><span>≈ {money(wallet.balanceUsd)}</span><div><span>Your bonus&nbsp; {STAR}{Number(wallet.bonusBalance || 0).toLocaleString()}</span><span>spent first · not withdrawable</span></div></section>
      <h2 className="wallet-prototype-label">Top up</h2>
      <div className="wallet-prototype-packs">{packs.map((pack) => <button aria-label={`Add ${pack.total} Stars`} disabled={topUpBusy !== null} key={pack.usd} onClick={() => topUp(pack)} type="button">{pack.badge ? <em>{pack.badge}</em> : null}<strong>{STAR}{pack.total.toLocaleString()} {pack.bonus ? <small>+ {STAR}{pack.bonus} bonus</small> : null}</strong><span>{topUpBusy === pack.usd ? "Adding…" : money(pack.usd)}</span></button>)}</div>
      {topUpMessage ? <p className="wallet-prototype-state" role="status">{topUpMessage}</p> : null}
      <p className="wallet-prototype-rate">{STAR}{rate.toLocaleString()} = $1 · Direct top-up preview · Coins never convert back to money</p>
      <h2 className="wallet-prototype-label">Activity</h2>
      <div className="wallet-prototype-activity">{ledgerQuery.isLoading ? <p className="wallet-prototype-state">Loading activity…</p> : (ledgerQuery.data || []).length ? ledgerQuery.data.slice(0, 12).map((item) => <ActivityRow item={item} key={item.id} rate={rate} />) : <p className="wallet-prototype-state">No Stars activity yet.</p>}</div>
    </> : <>
      <section className="wallet-prototype-income"><small>Creator income · real money</small><strong>{money(wallet.incomeUsd)}</strong><span>Paid out to your account · minimum $20</span><div><button disabled title="Payout processing is not connected yet" type="button">Withdraw</button><button disabled title="Income conversion is not connected yet" type="button">To coins →</button></div></section>
      <h2 className="wallet-prototype-label">Who supported you</h2>
      <div className="wallet-prototype-activity">{incomeItems.length ? incomeItems.map((item) => <ActivityRow income item={item} key={item.id} rate={rate} />) : <p className="wallet-prototype-state">Your creator income will appear here.</p>}</div>
      <h2 className="wallet-prototype-label wallet-prototype-payout-label">Payouts &amp; auto</h2><p className="wallet-prototype-rate">Income uses the platform rate of {STAR}{rate.toLocaleString()} = $1.</p>
    </>}
  </section>;
}
