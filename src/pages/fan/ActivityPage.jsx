import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiBookmark, FiClock, FiEye, FiGift, FiMessageCircle, FiRefreshCw, FiUserPlus, FiZap } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { fanService } from "../../services/fanService";
import { walletService } from "../../services/walletService";

const RECEIVED_FILTERS = [["All", "all"], ["💫 Seen", "seen"], ["Support", "support"], ["Saves", "saves"], ["Comments", "comments"], ["Follows", "follows"], ["Earnings", "earnings"]];
const SENT_FILTERS = [["All", "all"], ["💫 Seen", "seen"], ["Support", "support"], ["Saves", "saves"], ["Comments", "comments"], ["Follows", "follows"], ["Purchases", "purchases"]];

function relativeTime(value) {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d` : new Date(value).toLocaleDateString();
}

function classify(item) {
  const text = `${item.type || ""} ${item.description || ""}`.toLowerCase();
  const dreamGift = item.event === "DREAM_GIFT_DEBIT" || item.event === "DREAM_CREATOR_EARNING" || item.reference?.type === "DREAM_GIFT" || text.includes("gift");
  const sent = item.type === "wallet_debit" || text.includes("subscribed to") || text.includes("you sent") || text.includes("you saved") || text.includes("you followed") || text.includes("you commented");
  const financial = item.type === "wallet_credit" || item.type === "wallet_debit" || Boolean(item.starsChange) || text.includes("refund") || text.includes("earning") || text.includes("stars");
  let filter = financial ? (sent ? "purchases" : "earnings") : "other";
  if (dreamGift) filter = "support";
  else if (text.includes("follow")) filter = "follows";
  else if (text.includes("comment") || text.includes("reply") || text.includes("message")) filter = "comments";
  else if (text.includes("save") || text.includes("bookmark")) filter = "saves";
  else if (text.includes("seen") || text.includes("saw you") || text.includes("orbit")) filter = "seen";
  else if (sent && (text.includes("wallet") || text.includes("spent") || text.includes("subscription") || text.includes("unlock") || text.includes("gift"))) filter = "purchases";
  else if (!sent && (item.type === "wallet_credit" || text.includes("gift") || text.includes("earning") || text.includes("direct access") || text.includes("unlocked"))) filter = "earnings";
  return { ...item, direction: sent ? "sent" : "received", filter };
}

function routeFor(item) {
  if (item.relatedCreator?.username) return `/profile/${encodeURIComponent(item.relatedCreator.username)}`;
  if (item.filter === "earnings" || item.filter === "purchases") return "/wallet/ledger";
  if (item.filter === "comments") return "/messages";
  if (item.filter === "seen") return "/orbit";
  return "/wall";
}

function iconFor(filter) {
  if (filter === "support") return FiGift;
  if (filter === "follows") return FiUserPlus;
  if (filter === "saves") return FiBookmark;
  if (filter === "comments") return FiMessageCircle;
  if (filter === "earnings" || filter === "purchases") return FiZap;
  return FiEye;
}

function ActivityItem({ acknowledged, item, onAcknowledge, onOpen }) {
  const creator = item.relatedCreator;
  const Icon = iconFor(item.filter);
  return (
    <article className={`activity-prototype-row ${item.filter === "support" ? "is-dream-gift" : ""}`} onClick={() => onOpen(item)}>
      {creator ? <FanAvatar name={creator.displayName || creator.name || "Activity"} size="h-10 w-10" src={creator.avatarUrl || creator.avatar} /> : <span className="activity-prototype-icon"><Icon /></span>}
      <div className="activity-prototype-copy">
        <p>{item.description}</p>
        {item.relatedContent?.title ? <q>{item.relatedContent.title}</q> : null}
        <time>{relativeTime(item.createdAt)}</time>
      </div>
      <div className="activity-prototype-right">
        {item.filter === "support" && item.starsChange ? <strong className={item.starsChange < 0 ? "is-sent" : ""}>{item.starsChange > 0 ? "+" : "−"}{Math.abs(item.starsChange).toLocaleString()} ✦</strong> : item.starsChange > 0 ? <strong>+{item.starsChange.toLocaleString()}</strong> : null}
        <button className={acknowledged ? "is-seen" : ""} onClick={(event) => { event.stopPropagation(); onAcknowledge(item.id); }} type="button">{acknowledged ? "Seen ✓" : <FiEye />}</button>
      </div>
    </article>
  );
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const [direction, setDirection] = useState("received");
  const [filter, setFilter] = useState("all");
  const [acknowledged, setAcknowledged] = useState(() => new Set());
  const activityQuery = useQuery({ queryKey: ["fan", "activity"], queryFn: () => fanService.getActivity({ limit: 100 }).then((response) => response.data.data.activity), retry: false });
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), retry: false });
  const ledgerQuery = useQuery({ queryKey: ["wallet-ledger", "activity"], queryFn: () => walletService.getLedger({ limit: 100 }).then((response) => response.data.data.items || []), retry: false });
  const items = useMemo(() => {
    const base = (activityQuery.data || []).map(classify);
    const known = new Set(base.map((item) => item.id));
    const ledger = (ledgerQuery.data || []).filter((entry) => !known.has(`ledger-${entry.id}`)).map((entry) => {
      const dreamGift = entry.event === "DREAM_GIFT_DEBIT" || entry.event === "DREAM_CREATOR_EARNING";
      const name = entry.counterparty?.name || entry.counterparty?.username || (entry.starsChange < 0 ? "a creator" : "Someone");
      const giftName = entry.metadata?.giftName || "a gift";
      const description = dreamGift
        ? entry.starsChange < 0 ? `You sent ${giftName} toward ${name}'s Dream` : `${name} sent ${giftName} toward your Dream`
        : `${entry.event?.replaceAll("_", " ") || "Stars activity"}`;
      return classify({ id: `ledger-${entry.id}`, event: entry.event, reference: entry.reference, type: entry.starsChange > 0 ? "wallet_credit" : "wallet_debit", description, relatedCreator: entry.counterparty ? { displayName: entry.counterparty.name, username: entry.counterparty.username, avatarUrl: entry.counterparty.avatar } : null, createdAt: entry.createdAt, starsChange: Number(entry.starsChange) || 0 });
    });
    return [...base, ...ledger].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activityQuery.data, ledgerQuery.data]);
  const visible = items.filter((item) => item.direction === direction && (filter === "all" || item.filter === filter));
  const filters = direction === "received" ? RECEIVED_FILTERS : SENT_FILTERS;
  const loading = activityQuery.isLoading || ledgerQuery.isLoading;
  const failed = activityQuery.isError && ledgerQuery.isError;
  const acknowledge = (id) => setAcknowledged((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return <main className="activity-prototype-page">
    <header className="activity-prototype-header"><button aria-label="Back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><p>Reactions, people and earnings — everything that found you</p></header>
    <nav className="activity-prototype-segment"><button className={direction === "received" ? "is-active" : ""} onClick={() => { setDirection("received"); setFilter("all"); }} type="button">Received</button><button className={direction === "sent" ? "is-active" : ""} onClick={() => { setDirection("sent"); setFilter("all"); }} type="button">Sent</button></nav>
    <div className="activity-prototype-filters">{filters.map(([label, value]) => <button className={filter === value ? "is-active" : ""} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}</div>
    {direction === "received" && filter === "earnings" ? <button className="activity-wallet-card" onClick={() => navigate("/wallet")} type="button"><FiZap /><span><strong>{Number(walletQuery.data?.balance || 0).toLocaleString()} Stars</strong><small>Wallet balance</small></span><b>›</b></button> : null}
    <section className="activity-prototype-list">
      {loading ? <LoadingSkeleton className="h-16" count={7} /> : null}
      {failed ? <div className="activity-prototype-state"><FiRefreshCw /><p>Unable to load recent activity.</p><button onClick={() => { activityQuery.refetch(); ledgerQuery.refetch(); }} type="button">Try again</button></div> : null}
      {!loading && !failed ? visible.map((item) => <ActivityItem acknowledged={acknowledged.has(item.id)} item={item} key={item.id} onAcknowledge={acknowledge} onOpen={(entry) => navigate(routeFor(entry))} />) : null}
      {!loading && !failed && !visible.length ? <div className="activity-prototype-state"><FiClock /><strong>{filter === "seen" ? "Your Orbit is tuning to you" : "Nothing here yet"}</strong><p>{filter === "seen" ? "The moment someone sees you, it lands here." : "Your world is just waking up."}</p>{filter === "seen" ? <button onClick={() => navigate("/orbit")} type="button">Open your Orbit 💫</button> : null}</div> : null}
    </section>
  </main>;
}
