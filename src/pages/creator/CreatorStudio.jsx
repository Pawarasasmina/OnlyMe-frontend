import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiEye,
  FiMapPin,
  FiMonitor,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { creatorService } from "../../services/creatorService";

const STAR = "\u2726";
const DOT = "\u00B7";
const PLANET = "\u{1FA90}";
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "audience", label: "Audience" },
  { id: "earnings", label: "Earnings" },
];
const PATH_ITEMS = [
  { key: "publishedSeen", label: "Publish your first Seen", to: "/create/seen" },
  { key: "wallPost", label: "Write a note on the wall", to: "/wall?compose=note" },
  { key: "followsThree", label: "Follow 3 people", to: "/discover" },
  { key: "profilePhotos", label: "Add photos to your profile", to: "/settings/profile" },
];
const SOURCE_LABELS = {
  directAccess: "Direct Access",
  dreamSupport: "Dream support",
  gifts: "Gifts",
  unlocks: "Unlocks",
  worldSubscriptions: "World subscriptions",
};

function compact(value) {
  if (value == null) return "--";
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return number.toLocaleString();
}

function money(value) {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function compactMoney(value) {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: amount % 1 ? 2 : 0, minimumFractionDigits: amount % 1 ? 2 : 0 })}`;
}

function relativeTime(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function trendText(changePercent, empty = "Not enough data") {
  if (changePercent == null) return empty;
  if (changePercent > 0) return `▲ ${changePercent}%`;
  if (changePercent < 0) return `▼ ${Math.abs(changePercent)}%`;
  return "0%";
}

function trendClass(changePercent) {
  if (changePercent == null || changePercent === 0) return "is-flat";
  return changePercent > 0 ? "is-up" : "is-down";
}

function initialsFor(user = {}) {
  const source = user?.name || user?.username || "A";
  return source.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function medianLabel(minutes) {
  if (minutes == null) return "No requests yet";
  if (minutes < 60) return `~${minutes}m median`;
  return `~${Math.round(minutes / 60)}h median`;
}

function Header({ onBack }) {
  return (
    <header className="creator-studio-header">
      <button aria-label="Back" className="creator-studio-back" onClick={onBack} type="button"><FiArrowLeft /></button>
      <div>
        <h1>Creator Dashboard</h1>
        <p>This month {DOT} free forever {STAR}</p>
      </div>
      <Link aria-label="Wallet" className="creator-studio-wallet" to="/wallet"><FiCreditCard /></Link>
    </header>
  );
}

function Tabs({ active, onChange }) {
  return (
    <div aria-label="Creator dashboard tabs" className="creator-studio-tabs" role="tablist">
      {TABS.map((tab) => (
        <button aria-selected={active === tab.id} className={active === tab.id ? "is-active" : ""} key={tab.id} onClick={() => onChange(tab.id)} role="tab" type="button">
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="creator-studio-section-title">{children}</h2>;
}

function Card({ children, className = "" }) {
  return <section className={`creator-studio-card ${className}`}>{children}</section>;
}

function MetricCard({ label, sub, trend, value }) {
  return (
    <Card className="creator-studio-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={trendClass(trend)}>{sub}</small>
    </Card>
  );
}

function CreatorPath({ data = {} }) {
  return (
    <Card className="creator-studio-path">
      <div className="creator-studio-card-head">
        <b>Creator path</b>
        <span>{data.completed || 0}/{data.total || PATH_ITEMS.length}</span>
      </div>
      {PATH_ITEMS.map((item) => {
        const done = Boolean(data[item.key]);
        return (
          <Link className={done ? "creator-studio-path-item is-done" : "creator-studio-path-item"} key={item.key} to={item.to}>
            <span>{done ? <FiCheck /> : null}</span>
            <b>{item.label}</b>
          </Link>
        );
      })}
    </Card>
  );
}

function ReachCard({ metric = {} }) {
  return (
    <Card className="creator-studio-reach">
      <span>Reach this month</span>
      <div>
        <strong>{compact(metric.value)}</strong>
        <small className={trendClass(metric.changePercent)}>{trendText(metric.changePercent)}</small>
      </div>
    </Card>
  );
}

function PerformerRow({ detail, icon, title, to }) {
  const content = (
    <>
      <span className="creator-studio-row-icon">{icon}</span>
      <span>
        <b>{title}</b>
        <small>{detail}</small>
      </span>
    </>
  );
  return to ? <Link className="creator-studio-performer" to={to}>{content}</Link> : <div className="creator-studio-performer">{content}</div>;
}

function BestPerformers({ data = {} }) {
  const seen = data.seen;
  const status = data.status;
  const location = data.location;
  return (
    <section className="creator-studio-section">
      <SectionTitle>Best performers</SectionTitle>
      <PerformerRow detail={seen ? `Best Seen ${DOT} ${seen.metricLabel}` : "Best Seen · Publish a Seen to unlock this"} icon={<FiEye />} title={seen?.title || "No Seen yet"} to={seen?.id ? `/studio/seens/${seen.id}` : "/create/seen"} />
      <PerformerRow detail={status ? `Best status ${DOT} ${status.metricLabel}` : "Best status · No status data yet"} icon={<FiMonitor />} title={status?.title || "No status data yet"} />
      <PerformerRow detail={location ? `Best location ${DOT} ${location.metricLabel}` : "Best location · No location data yet"} icon={<FiMapPin />} title={location?.title || "No location data yet"} to={location ? "/wall" : null} />
    </section>
  );
}

function Bars({ empty, rows = [] }) {
  const fallbackRows = [
    { color: "#9CCBFF", label: "Discover", percent: 0, value: 0 },
    { color: "#6ECF97", label: "Wall", percent: 0, value: 0 },
    { color: "#B092FF", label: "Seen", percent: 0, value: 0 },
  ];
  const shownRows = rows.length ? rows : fallbackRows;
  const hasData = shownRows.some((row) => Number(row.value) > 0 || Number(row.percent) > 0);
  return (
    <div className="creator-studio-bars" role="list">
      {shownRows.map((row) => (
        <div aria-label={`${row.label}: ${row.percent || 0}%`} className="creator-studio-bar-row" key={row.label} role="listitem">
          <span>{row.label}</span>
          <i><b style={{ background: row.color || "#9CCBFF", width: `${row.percent || 0}%` }} /></i>
          <strong>{row.percent || 0}%</strong>
        </div>
      ))}
      {!hasData ? <p className="creator-studio-bars-note">{empty}</p> : null}
    </div>
  );
}

function RecentActivity({ items = [] }) {
  return (
    <section className="creator-studio-section">
      <SectionTitle>Recent activity</SectionTitle>
      {items.length ? items.map((item, index) => (
        <div className="creator-studio-activity-row" key={`${item.createdAt}-${index}`}>
          <span>{item.text}</span>
          <time>{relativeTime(item.createdAt)}</time>
        </div>
      )) : <p className="creator-studio-empty">No recent creator activity yet</p>}
    </section>
  );
}

function Overview({ data, onEarnings }) {
  const overview = data.overview || {};
  return (
    <div className="creator-studio-panel">
      <CreatorPath data={data.creatorPath} />
      <ReachCard metric={overview.reach} />
      <section className="creator-studio-kpi-grid">
        <MetricCard label="SEEN VIEWS" sub={trendText(overview.seenViews?.changePercent, "Views pending")} trend={overview.seenViews?.changePercent} value={overview.seenViews?.value ? compact(overview.seenViews.value) : "--"} />
        <MetricCard label="PROFILE VISITS" sub={trendText(overview.profileVisits?.changePercent, "No visits yet")} trend={overview.profileVisits?.changePercent} value={overview.profileVisits?.value ? compact(overview.profileVisits.value) : "--"} />
        <MetricCard label="NEW FOLLOWERS" sub={overview.newFollowers?.periodLabel || "this week"} value={`+${compact(overview.newFollowers?.value || 0)}`} />
        <MetricCard label="RESPONSE RATE" sub={medianLabel(overview.responseRate?.medianResponseMinutes)} value={overview.responseRate?.value == null ? "--" : `${overview.responseRate.value}%`} />
      </section>
      <button className="creator-studio-nav-row" onClick={onEarnings} type="button">
        <span>Earnings this month</span>
        <strong>{money(overview.earnings?.amount)}</strong>
        <small className={trendClass(overview.earnings?.changePercent)}>{trendText(overview.earnings?.changePercent, "")}</small>
        <FiChevronRight />
      </button>
      <BestPerformers data={overview.bestPerformers} />
      <section className="creator-studio-section">
        <SectionTitle>Where people find you</SectionTitle>
        <Bars empty="No source attribution yet" rows={overview.discoverySources} />
      </section>
      <RecentActivity items={overview.recentActivity} />
    </div>
  );
}

function Audience({ data = {} }) {
  const audience = data.audience || {};
  return (
    <div className="creator-studio-panel">
      <Card className="creator-studio-followers">
        <span>Followers</span>
        <div><strong>{compact(audience.followers || 0)}</strong><small>+{compact(audience.newFollowersThisWeek || 0)} this week</small></div>
      </Card>
      <section className="creator-studio-section">
        <SectionTitle>New vs returning</SectionTitle>
        {audience.newVsReturning?.newPercent == null ? <p className="creator-studio-empty">Not enough audience data yet</p> : (
          <div className="creator-studio-split">
            <i><b style={{ width: `${audience.newVsReturning.newPercent}%` }} /></i>
            <div><span>{audience.newVsReturning.newPercent}% new</span><span>{audience.newVsReturning.returningPercent}% returning</span></div>
          </div>
        )}
      </section>
      <section className="creator-studio-section">
        <SectionTitle>Top cities</SectionTitle>
        <Bars empty="Not enough location data yet" rows={(audience.topCities || []).map((row) => ({ ...row, color: "#9CCBFF" }))} />
      </section>
      <section className="creator-studio-section">
        <SectionTitle>Audience interests</SectionTitle>
        {audience.interests?.length ? <div className="creator-studio-chips">{audience.interests.map((item) => <span key={item.label}>{item.label}</span>)}</div> : <p className="creator-studio-empty">Not enough audience data yet</p>}
      </section>
      <section className="creator-studio-summary">
        <SummaryRow label="Entered your World" value={`${compact(audience.enteredWorldThisWeek || 0)} · week`} />
        <SummaryRow label="Mutual connections" value={compact(audience.mutualConnections || 0)} />
        <SummaryRow label="Story views · avg" value={audience.averageStoryViews == null ? "--" : compact(audience.averageStoryViews)} />
      </section>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return <div className="creator-studio-summary-row"><span>{label}</span><strong>{value}</strong></div>;
}

function EarningRow({ item }) {
  return (
    <Link className="creator-studio-earning-row" to="/wallet/ledger">
      <span className="creator-studio-earning-avatar">{item.counterparty?.avatar ? <img alt="" src={item.counterparty.avatar} /> : <b>{initialsFor(item.counterparty)}</b>}</span>
      <span className="creator-studio-earning-copy">
        <b>{item.description}</b>
        <small>{STAR}{compact(item.metadata?.stars || 0)} {DOT} {relativeTime(item.createdAt)} ago</small>
      </span>
      <strong>+{compactMoney(item.amount)}</strong>
    </Link>
  );
}

function Earnings({ data = {}, onPayouts }) {
  const earnings = data.earnings || {};
  const bySource = earnings.bySource || {};
  return (
    <div className="creator-studio-panel">
      <Card className="creator-studio-earnings-hero">
        <span>Your earnings this month</span>
        <strong>{money(earnings.thisMonth)}</strong>
        <small className={trendClass(earnings.changePercent)}>{earnings.changePercent == null ? "Real creator credits from your ledger" : `${trendText(earnings.changePercent)} vs last month`}</small>
      </Card>
      <Link className="creator-studio-residents" to="/profile">
        <span aria-hidden="true">{PLANET}</span>
        <b>Residents {DOT} <i>{compact(earnings.residents?.count || 0)}</i></b>
        <strong>{money(earnings.residents?.monthlyRecurringRevenue)}/mo</strong>
      </Link>
      <section className="creator-studio-section">
        <SectionTitle>By source</SectionTitle>
        <div className="creator-studio-source-list">
          {Object.entries(SOURCE_LABELS).map(([key, label]) => <SummaryRow key={key} label={label} value={money(bySource[key])} />)}
        </div>
      </section>
      <section className="creator-studio-section">
        <SectionTitle>Recent earnings</SectionTitle>
        {earnings.recent?.length ? earnings.recent.map((item) => <EarningRow item={item} key={item.id} />) : <p className="creator-studio-empty">No earnings yet</p>}
      </section>
      <Link className="creator-studio-wallet-row" to="/wallet/ledger"><span>Wallet & payouts</span><FiChevronRight /></Link>
      <p className="creator-studio-note">Your numbers are yours. No subscription, no paywall - ever. {STAR} <button onClick={onPayouts} type="button">How payouts work <FiChevronRight /></button></p>
    </div>
  );
}

function PayoutsSheet({ onClose }) {
  return (
    <div className="creator-payouts-backdrop" onClick={onClose} role="presentation">
      <section aria-modal="true" className="creator-payouts-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <span className="creator-payouts-handle" />
        <h2>How payouts work</h2>
        <p>Simple, and the same for everyone.</p>
        <div className="creator-payouts-list">
          <article><span>80%</span><div><b>You keep 80%, after app store fees</b><small>Worlds, Direct Access, gifts, and support use the stored creator credit in your ledger.</small></div></article>
          <article><span><FiDollarSign /></span><div><b>Payouts in 3-5 business days</b><small>To your bank, from $50. Transfer fees on us.</small></div></article>
          <article><span><FiZap /></span><div><b>No subscription, no listing fees</b><small>Creating and publishing on @seen is free - forever.</small></div></article>
        </div>
        <Link className="creator-payouts-terms" to="/settings">Full terms in Settings {"->"} Payouts.</Link>
      </section>
    </div>
  );
}

export default function CreatorStudio() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const dashboardQuery = useQuery({
    queryKey: ["creator-dashboard"],
    queryFn: () => creatorService.getDashboard().then((response) => response.data.data),
    retry: false,
    staleTime: 30000,
  });

  if (dashboardQuery.isLoading) {
    return (
      <main className="creator-studio-prototype">
        <LoadingSkeleton className="h-12" count={1} />
        <LoadingSkeleton className="h-10" count={1} />
        <LoadingSkeleton className="h-28" count={2} />
        <LoadingSkeleton className="h-48" count={1} />
      </main>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <main className="creator-studio-prototype">
        <button aria-label="Back" className="creator-studio-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button>
        <section className="creator-studio-error">
          <h1>Creator Dashboard</h1>
          <p>Unable to load creator studio.</p>
          <button onClick={() => dashboardQuery.refetch()} type="button"><FiRefreshCw /> Retry</button>
        </section>
      </main>
    );
  }

  const data = dashboardQuery.data || {};
  return (
    <>
      <main className="creator-studio-prototype">
        <Header onBack={() => navigate(-1)} />
        <Tabs active={activeTab} onChange={setActiveTab} />
        {activeTab === "overview" ? <Overview data={data} onEarnings={() => setActiveTab("earnings")} /> : null}
        {activeTab === "audience" ? <Audience data={data} /> : null}
        {activeTab === "earnings" ? <Earnings data={data} onPayouts={() => setPayoutsOpen(true)} /> : null}
      </main>
      {payoutsOpen ? <PayoutsSheet onClose={() => setPayoutsOpen(false)} /> : null}
    </>
  );
}
