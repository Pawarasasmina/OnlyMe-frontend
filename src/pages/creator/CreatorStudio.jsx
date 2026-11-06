import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiDollarSign,
  FiEye,
  FiMapPin,
  FiMonitor,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { creatorService } from "../../services/creatorService";
import { useAuth } from "../../hooks/useAuth";

const STAR = "\u2726";
const DOT = "\u00B7";
const PLANET = "\u{1FA90}";
const TABS = [
  { id: "overview", get label() { return __msg("stories.overview"); } },
  { id: "audience", get label() { return __msg("creator.audience"); } },
  { id: "earnings", get label() { return __msg("layouts.earnings"); } },
];
const PATH_ITEMS = [
  { key: "publishedSeen", get label() { return __msg("creator.publishYourFirstSeen"); }, to: "/create/seen" },
  { key: "wallPost", get label() { return __msg("creator.writeANoteOnTheWall"); }, to: "/wall?compose=note" },
  { key: "followsThree", get label() { return __msg("creator.follow3People"); }, to: "/discover" },
  { key: "profilePhotos", get label() { return __msg("creator.addPhotosToYourProfile"); }, to: "/settings/profile" },
];
const SOURCE_LABELS = {
  directAccess: "Direct Access",
  get dreamSupport() { return __msg("admin.dreamSupport"); },
  get gifts() { return __msg("creator.gifts"); },
  get unlocks() { return __msg("creator.unlocks_aecf18"); },
  get worldSubscriptions() { return __msg("creator.worldSubscriptions"); },
  get other() { return __msg("creator.otherEarnings"); },
};

function compact(value) {
  if (value == null) return "--";
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return number.toLocaleString(__uiLocale());
}

function money(value) {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString(__uiLocale(), { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function compactMoney(value) {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString(__uiLocale(), { maximumFractionDigits: amount % 1 ? 2 : 0, minimumFractionDigits: amount % 1 ? 2 : 0 })}`;
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

function trendText(changePercent, empty = __msg("creator.notEnoughData")) {
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
  if (minutes == null) return __msg("creator.noRequestsYet");
  if (minutes < 60) return `~${minutes}m median`;
  return `~${Math.round(minutes / 60)}h median`;
}

function Header({ onBack }) {
  __useUiLanguage();
  return (
    <header className="creator-studio-header">
      <button aria-label={__msg("discover.back")} className="creator-studio-back" onClick={onBack} type="button"><FiArrowLeft data-ui-directional="true" /></button>
      <div>
        <h1>{__msg("creator.creatorDashboard")}</h1>
        <p>{__msg("admin.thisMonth")} {DOT} {__msg("creator.freeForever")} {STAR}</p>
      </div>
      <Link aria-label={__msg("profile.wallet")} className="creator-studio-wallet" to="/wallet"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-1" /><path d="M21 9h-6a2 2 0 000 6h6a1 1 0 001-1v-4a1 1 0 00-1-1z" /></svg></Link>
    </header>
  );
}

function Tabs({ active, onChange }) {
  __useUiLanguage();
  return (
    <div aria-label={__msg("creator.creatorDashboardTabs")} className="creator-studio-tabs" role="tablist">
      {TABS.map((tab) => (
        <button aria-selected={active === tab.id} className={active === tab.id ? "is-active" : ""} key={tab.id} onClick={() => onChange(tab.id)} role="tab" type="button">
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  __useUiLanguage();
  return <h2 className="creator-studio-section-title">{children}</h2>;
}

function Card({ children, className = "" }) {
  __useUiLanguage();
  return <section className={`creator-studio-card ${className}`}>{children}</section>;
}

function MetricCard({ label, sub, trend, value, valueClassName = "" }) {
  __useUiLanguage();
  return (
    <Card className="creator-studio-kpi">
      <span>{label}</span>
      <strong className={valueClassName}>{value}</strong>
      <small className={trendClass(trend)}>{sub}</small>
    </Card>
  );
}

function GrowSummaryCard({ data = {}, loading = false }) {
  __useUiLanguage();
  const total = Number(data.counts?.total || 0);
  const goal = Number(data.config?.spotlightGoal || 2500);
  const remaining = Number(data.counts?.spotlightRemaining ?? Math.max(0, goal - total));
  const progress = goal > 0 ? Math.min(100, total / goal * 100) : 0;
  return (
    <Link aria-label={__msg("creator.openGrow")} className={`creator-studio-grow-card ${loading ? "is-loading" : ""}`} to="/grow">
      <span className="creator-studio-grow-head"><b>{__msg("creator.grow")}</b><strong>+{money(data.earnings?.amount || 0)}</strong></span>
      <small>{loading ? __msg("creator.loadingYourGrowth") : <>{total.toLocaleString(__uiLocale())} {__msg("creator.peopleCameThroughYourLink")} {DOT} {remaining.toLocaleString(__uiLocale())} {__msg("creator.toSpotlight")}</>}</small>
      <i><b style={{ width: `${progress}%` }} /></i>
    </Link>
  );
}

function CreatorPath({ data = {} }) {
  __useUiLanguage();
  return (
    <Card className="creator-studio-path">
      <div className="creator-studio-card-head">
        <b>{__msg("creator.creatorPath")}</b>
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
  __useUiLanguage();
  const change = metric.changePercent == null ? 0 : Number(metric.changePercent);
  return (
    <Card className="creator-studio-reach">
      <span>{__msg("creator.reachThisMonth")}</span>
      <div>
        <strong>{compact(metric.value)}</strong>
        <small className={change < 0 ? "is-down" : "is-up"}>{change < 0 ? `▼ ${Math.abs(change)}%` : `▲ ${change}%`}</small>
      </div>
    </Card>
  );
}

function PerformerRow({ detail, icon, title, to }) {
  __useUiLanguage();
  const content = (
    <>
      <span className="creator-studio-row-icon">{icon}</span>
      <span className="creator-studio-performer-copy">
        <b>{title}</b>
        <small>{detail}</small>
      </span>
    </>
  );
  return to ? <Link className="creator-studio-performer" to={to}>{content}</Link> : <div className="creator-studio-performer">{content}</div>;
}

function BestPerformers({ data = {} }) {
  __useUiLanguage();
  const seen = data.seen;
  const wallPost = data.wallPost || data.status;
  const location = data.location;
  return (
    <section className="creator-studio-section">
      <SectionTitle>{__msg("creator.bestPerformers")}</SectionTitle>
      <PerformerRow detail={seen ? __msg("creator.bestSeen", { value0: DOT, value1: seen.metricLabel }) : __msg("creator.bestSeenPublishASeenToUnlockThis")} icon={<FiEye />} title={seen?.title || __msg("creator.noSeenYet")} to={seen?.id ? `/seen/${seen.id}` : "/create/seen"} />
      <PerformerRow detail={wallPost ? __msg("creator.bestStatus", { value0: DOT, value1: wallPost.metricLabel }) : __msg("creator.bestStatusWriteAWallPostToUnlockThis")} icon={<FiMonitor />} title={wallPost?.title || __msg("creator.noWallPostsYet")} to={wallPost?.id ? `/wall?post=${wallPost.id}` : "/wall?compose=note"} />
      <PerformerRow detail={location ? __msg("creator.mostUsedLocation", { value0: DOT, value1: location.metricLabel }) : __msg("creator.mostUsedLocationAddALocationToAWall")} icon={<FiMapPin />} title={location?.title || __msg("creator.noLocationsYet")} to={location ? "/wall" : "/wall?compose=note"} />
    </section>
  );
}

function Bars({ empty, rows = [] }) {
  __useUiLanguage();
  const fallbackRows = [
    { color: "#9CCBFF", label: __msg("discover.discover"), percent: 0, value: 0 },
    { color: "#6ECF97", label: __msg("fanWeb.wall"), percent: 0, value: 0 },
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
  __useUiLanguage();
  return (
    <section className="creator-studio-section">
      <SectionTitle>{__msg("creator.recentActivity")}</SectionTitle>
      {items.length ? items.map((item, index) => (
        <div className="creator-studio-activity-row" key={`${item.createdAt}-${index}`}>
          <span dir="auto">{item.text}</span>
          <time>{relativeTime(item.createdAt)}</time>
        </div>
      )) : <p className="creator-studio-empty">{__msg("creator.noRecentCreatorActivityYet")}</p>}
    </section>
  );
}

function Overview({ data, onEarnings }) {
  __useUiLanguage();
  const overview = data.overview || {};
  return (
    <div className="creator-studio-panel">
      <CreatorPath data={data.creatorPath} />
      <ReachCard metric={overview.reach} />
      <section className="creator-studio-kpi-grid">
        <MetricCard label={__msg("creator.seenViews")} sub={trendText(overview.seenViews?.changePercent, "Views pending")} trend={overview.seenViews?.changePercent} value={compact(overview.seenViews?.value ?? 0)} />
        <MetricCard label={__msg("creator.profileVisits")} sub={trendText(overview.profileVisits?.changePercent, "No visits yet")} trend={overview.profileVisits?.changePercent} value={compact(overview.profileVisits?.value ?? 0)} />
        <MetricCard label={__msg("creator.newFollowers")} sub={overview.newFollowers?.periodLabel || "this week"} value={`+${compact(overview.newFollowers?.value || 0)}`} />
        <MetricCard label={__msg("creator.responseRate")} sub={medianLabel(overview.responseRate?.medianResponseMinutes)} value={overview.responseRate?.value == null ? "--" : `${overview.responseRate.value}%`} valueClassName={overview.responseRate?.value == null ? "" : "is-success"} />
      </section>
      <button className="creator-studio-nav-row" onClick={onEarnings} type="button">
        <span>{__msg("creator.earningsThisMonth")}</span>
        <strong>{money(overview.earnings?.amount)}</strong>
        <small className={trendClass(overview.earnings?.changePercent)}>{trendText(overview.earnings?.changePercent, "")}</small>
        <FiChevronRight data-ui-directional="true" />
      </button>
      <BestPerformers data={overview.bestPerformers} />
      <section className="creator-studio-section">
        <SectionTitle>{__msg("creator.wherePeopleFindYou")}</SectionTitle>
        <Bars empty="No source attribution yet" rows={overview.discoverySources} />
      </section>
      <RecentActivity items={overview.recentActivity} />
    </div>
  );
}

function Audience({ data = {} }) {
  __useUiLanguage();
  const audience = data.audience || {};
  const cityColors = ["#9CCBFF", "#6ECF97", "#B092FF"];
  return (
    <div className="creator-studio-panel">
      <Card className="creator-studio-followers">
        <span>{__msg("discover.followers")}</span>
        <div><strong>{compact(audience.followers || 0)}</strong><small className={Number(audience.newFollowersThisMonth) > 0 ? "is-up" : "is-flat"}>+{compact(audience.newFollowersThisMonth || 0)} {__msg("creator.thisMonth")}</small></div>
      </Card>
      <section className="creator-studio-section">
        <SectionTitle>{__msg("creator.newVsReturning")}</SectionTitle>
        {audience.newVsReturning?.newPercent == null ? <p className="creator-studio-empty">{__msg("creator.notEnoughAudienceDataYet")}</p> : (
          <div className="creator-studio-split">
            <i><b style={{ width: `${audience.newVsReturning.newPercent}%` }} /></i>
            <div><span>{audience.newVsReturning.newPercent}{__msg("creator.new")}</span><span>{audience.newVsReturning.returningPercent}{__msg("creator.returning")}</span></div>
          </div>
        )}
      </section>
      <section className="creator-studio-section">
        <SectionTitle>{__msg("creator.topCities")}</SectionTitle>
        <Bars empty="Not enough location data yet" rows={(audience.topCities || []).map((row, index) => ({ ...row, color: cityColors[index] || cityColors[0] }))} />
      </section>
      <section className="creator-studio-section">
        <SectionTitle>{__msg("creator.audienceInterests")}</SectionTitle>
        {audience.interests?.length ? <div className="creator-studio-chips">{audience.interests.map((item) => <span key={item.label}>{item.label}</span>)}</div> : <p className="creator-studio-empty">{__msg("creator.notEnoughAudienceDataYet")}</p>}
      </section>
      <section className="creator-studio-summary">
        <SummaryRow label={__msg("creator.enteredYourWorld")} value={`${compact(audience.enteredWorldThisWeek || 0)} · week`} />
        <SummaryRow label={__msg("creator.mutualConnections")} value={compact(audience.mutualConnections || 0)} />
        <SummaryRow label={__msg("creator.storyViewsAvg")} value={audience.averageStoryViews == null ? "--" : compact(audience.averageStoryViews)} />
      </section>
    </div>
  );
}

function SummaryRow({ label, value }) {
  __useUiLanguage();
  return <div className="creator-studio-summary-row"><span>{label}</span><strong>{value}</strong></div>;
}

function EarningRow({ item }) {
  __useUiLanguage();
  return (
    <Link className="creator-studio-earning-row" to="/wallet/ledger">
      <span className="creator-studio-earning-avatar">{item.counterparty?.avatar ? <img alt="" src={item.counterparty.avatar} /> : <b>{initialsFor(item.counterparty)}</b>}</span>
      <span className="creator-studio-earning-copy">
        <b>{item.description}</b>
        <small>{STAR}{compact(item.metadata?.stars || 0)} {DOT} {relativeTime(item.createdAt)} {__msg("profile.ago")}</small>
      </span>
      <strong>+{compactMoney(item.amount)}</strong>
    </Link>
  );
}

function Earnings({ data = {}, onPayouts }) {
  __useUiLanguage();
  const earnings = data.earnings || {};
  const bySource = earnings.bySource || {};
  const [price, setPrice] = useState(10);
  return (
    <div className="creator-studio-panel">
      <Card className="creator-studio-earnings-hero">
        <span>{__msg("creator.yourEarningsThisMonth")}</span>
        <strong>{money(earnings.thisMonth)}</strong>
        <small className={trendClass(earnings.changePercent)}>{earnings.changePercent == null ? __msg("creator.realCreatorCreditsFromYourLedger") : __msg("creator.vsLastMonth", { value0: trendText(earnings.changePercent) })}</small>
      </Card>
      <Link className="creator-studio-residents" to="/profile">
        <span aria-hidden="true">{PLANET}</span>
        <b>{__msg("creator.residents")} {DOT} <i>{compact(earnings.residents?.count || 0)}</i></b>
        <strong>{money(earnings.residents?.monthlyRecurringRevenue)}{__msg("common.perMonth")}</strong>
      </Link>
      <section className="creator-studio-section">
        <SectionTitle>{__msg("creator.bySource")}</SectionTitle>
        <div className="creator-studio-source-list">
          {Object.entries(SOURCE_LABELS).map(([key, label]) => <SummaryRow key={key} label={label} value={money(bySource[key])} />)}
        </div>
      </section>
      <section className="creator-studio-section">
        <SectionTitle>{__msg("creator.recentEarnings")}</SectionTitle>
        {earnings.recent?.length ? earnings.recent.map((item) => <EarningRow item={item} key={item.id} />) : <p className="creator-studio-empty">{__msg("creator.noEarningsYet")}</p>}
      </section>
      <Link className="creator-studio-wallet-row" to="/wallet"><span>{__msg("creator.walletPayouts")}</span><FiChevronRight data-ui-directional="true" /></Link>
      <section className="creator-ways-card"><SectionTitle>{__msg("creator.waysToEarn")}</SectionTitle><article><b>{__msg("profile.experiences")}</b><small>{__msg("creator.sellFocusedChaptersPeopleCanKeep")}</small></article><article><b>{__msg("creator.worldSubscriptions")}</b><small>{__msg("creator.buildRecurringValueForYourResidents")}</small></article><article><b>{__msg("creator.gifts")}</b><small>{__msg("creator.letPeopleSupportYourWorkDirectly")}</small></article></section>
      <section className="creator-calculator-card"><SectionTitle>{__msg("creator.earningsCalculator")}</SectionTitle><p>{__msg("creator.chooseAnExampleExperiencePrice")}</p><div>{[5, 10, 20, 50].map((value) => <button className={price === value ? "is-active" : ""} key={value} onClick={() => setPrice(value)} type="button">${value}</button>)}</div><strong>{__msg("creator.yourEarningsForA")}{price} {__msg("creator.saleAreShownBeforePublishing")}</strong><small>{__msg("creator.thisExampleIsEducationalAndIsNotGuaranteedIncome")}</small></section>
      <p className="creator-studio-note">{__msg("creator.yourNumbersAreYoursNoSubscriptionNoPaywallEver")} {STAR} <button onClick={onPayouts} type="button">{__msg("creator.howPayoutsWork")} <FiChevronRight data-ui-directional="true" /></button></p>
    </div>
  );
}

function PayoutsSheet({ onClose }) {
  __useUiLanguage();
  const [sheetPosition, setSheetPosition] = useState(undefined);

  useEffect(() => {
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({
        "--creator-payouts-center-x": `${bounds.left + bounds.width / 2}px`,
        "--creator-payouts-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="creator-payouts-backdrop" onClick={onClose} role="presentation" style={sheetPosition}>
      <section aria-modal="true" className="creator-payouts-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <span className="creator-payouts-handle" />
        <h2>{__msg("creator.howPayoutsWork")}</h2>
        <p>{__msg("creator.simpleAndTheSameForEveryone")}</p>
        <div className="creator-payouts-list">
          <article><span>80%</span><div><b>{__msg("creator.youKeep80AfterAppStoreFees")}</b><small>{__msg("creator.worldsDirectAccessGiftsAndSupportUseTheStored")}</small></div></article>
          <article><span><FiDollarSign /></span><div><b>{__msg("creator.payoutsIn35BusinessDays")}</b><small>{__msg("creator.toYourBankFrom50TransferFeesOnUs")}</small></div></article>
          <article><span><FiZap /></span><div><b>{__msg("creator.noSubscriptionNoListingFees")}</b><small>{__msg("creator.creatingAndPublishingOnSeenIsFreeForever")}</small></div></article>
        </div>
        <span className="creator-payouts-terms">{__msg("creator.fullTermsInSettings")} {"->"} {__msg("creator.payouts")}</span>
      </section>
    </div>
  );
}

export default function CreatorStudio() {
  __useUiLanguage();
  const { user } = useAuth();
  const accountType = user?.profileAccountType || (user?.creatorApprovalStatus === "approved" ? "creator" : "personal");
  const canGrow = ["creator", "business"].includes(accountType);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get("tab");
    return ["overview", "audience", "earnings"].includes(requested) ? requested : "overview";
  });
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const dashboardQuery = useQuery({
    queryKey: ["creator-dashboard"],
    queryFn: () => creatorService.getDashboard().then((response) => response.data.data),
    enabled: true,
    retry: false,
    staleTime: 30000,
  });
  const growQuery = useQuery({
    queryKey: ["creator-grow"],
    queryFn: () => creatorService.getGrow().then((response) => response.data.data),
    enabled: canGrow,
    retry: false,
    staleTime: 30000,
  });

  /* Obsolete availability overlay removed.
    description="A focused command center for understanding your audience, tracking earnings, and growing everything you create on @seen."
    highlights={["Audience and content insights", "Earnings and payout overview", "Growth signals in one place"]}
    icon="⌁"
    title="Creator Dashboard"
  */

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
        <button aria-label={__msg("discover.back")} className="creator-studio-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /></button>
        <section className="creator-studio-error">
          <h1>{__msg("creator.creatorDashboard")}</h1>
          <p>{__msg("creator.unableToLoadCreatorStudio")}</p>
          <button onClick={() => dashboardQuery.refetch()} type="button"><FiRefreshCw /> {__msg("activity.retry")}</button>
        </section>
      </main>
    );
  }

  const data = dashboardQuery.data || {};
  const previewNew = searchParams.get("preview") === "new";
  return (
    <>
      <main className="creator-studio-prototype">
        <Header onBack={() => navigate(-1)} />
        {!previewNew && canGrow ? <GrowSummaryCard data={growQuery.data} loading={growQuery.isLoading} /> : null}
        <Tabs active={activeTab} onChange={setActiveTab} />
        {previewNew ? <section className="creator-new-preview"><small>{__msg("creator.previewNewCreator")}</small><h2>{__msg("creator.startCreatingStartEarning")}</h2><p>{__msg("creator.linaBeganWithOneUsefulExperienceWelcomedPeopleInto")}</p><div><Link to="/create/experience">{__msg("creator.createAnExperience")}</Link><Link to="/create/world">{__msg("creator.startYourWorld")}</Link>{canGrow ? <Link to="/grow">{__msg("creator.shareYourGiftLink")}</Link> : null}</div><button onClick={() => navigate("/studio", { replace: true })} type="button">{__msg("creator.exitPreview")}</button></section> : null}
        {!previewNew && activeTab === "overview" ? <Overview data={data} onEarnings={() => setActiveTab("earnings")} /> : null}
        {!previewNew && activeTab === "audience" ? <Audience data={data} /> : null}
        {!previewNew && activeTab === "earnings" ? <Earnings data={data} onPayouts={() => setPayoutsOpen(true)} /> : null}
      </main>
      {payoutsOpen ? <PayoutsSheet onClose={() => setPayoutsOpen(false)} /> : null}
    </>
  );
}
