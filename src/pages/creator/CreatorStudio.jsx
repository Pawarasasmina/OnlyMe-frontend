import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiEye,
  FiMapPin,
  FiMonitor,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { contentService } from "../../services/contentService";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
import { publicationService } from "../../services/publicationService";
import { walletService } from "../../services/walletService";

const STARS_PER_USD = 10;
const STAR = "\u2726";
const PLANET = "\u{1FA90}";
const UP = "\u25B2";
const DOT = "\u00B7";
const CHEVRON = "\u203A";
const PROFESSIONAL_DASHBOARD_BETA_MASK_ENABLED = false;

function compact(value) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return number.toLocaleString();
}

function moneyFromStars(stars) {
  return `$${((Number(stars) || 0) / STARS_PER_USD).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function compactMoneyFromStars(stars) {
  const dollars = (Number(stars) || 0) / STARS_PER_USD;
  const hasCents = dollars % 1 !== 0;
  return `$${dollars.toLocaleString(undefined, {
    maximumFractionDigits: hasCents ? 2 : 0,
    minimumFractionDigits: hasCents ? 2 : 0,
  })}`;
}

function relativeTime(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function isCreatorCredit(entry = {}) {
  const event = String(entry.event || "").toUpperCase();
  const referenceType = String(entry.reference?.type || "").toUpperCase();
  return Number(entry.starsChange) > 0 && (
    event.includes("CREATOR") ||
    event.includes("EARNING") ||
    referenceType.includes("DIRECT_ACCESS") ||
    referenceType.includes("DREAM") ||
    referenceType.includes("GIFT") ||
    referenceType.includes("PAID_CALL") ||
    referenceType.includes("WORLD")
  );
}

function settledDirectAccess(item = {}) {
  const settlement = String(item.settlementStatus || "").toUpperCase();
  return ["CAPTURED", "SETTLED", "RELEASED"].includes(settlement);
}

function residentsFor(world = {}) {
  return Number(world.residentCount || world.memberCount || world.subscriberCount || world.membershipCount || 0);
}

function priceStarsFor(world = {}) {
  return Number(world.pricing?.starsAmount || world.priceStars || world.monthlyStars || 0);
}

function monthlyStarsFor(world = {}) {
  return Number(world.monthlyStars || residentsFor(world) * priceStarsFor(world));
}

function seenViewsFor(item = {}) {
  return Number(item.viewCount || item.views || item.walkCount || item.engagement?.viewCount || 0);
}

function wallEngagementFor(post = {}) {
  return Number(post.viewCount || 0)
    + Number(post.reactionCount || post.supportCount || 0)
    + Number(post.commentCount || 0)
    + Number(post.shareCount || 0)
    + Number(post.saveCount || 0);
}

function wallTitleFor(post = {}) {
  const text = String(post.text || post.shareCaption || "").trim().replace(/\s+/g, " ");
  if (text) return text.length > 42 ? `${text.slice(0, 39)}...` : text;
  return post.context || "Wall note";
}

function bestBy(items = [], score) {
  return items.reduce((best, item) => score(item) > score(best || {}) ? item : best, null);
}

function bestLocationFor(posts = []) {
  const locations = new Map();
  for (const post of posts) {
    const location = String(post.location || "").trim();
    if (!location) continue;
    const current = locations.get(location) || { count: 0, location, value: 0 };
    current.count += 1;
    current.value += wallEngagementFor(post) + 1;
    locations.set(location, current);
  }
  const rows = [...locations.values()];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const best = bestBy(rows, (row) => row.value);
  if (!best) return null;
  return { ...best, percent: total ? Math.round((best.value / total) * 100) : 0 };
}

function sourcePercentages(sources = []) {
  const total = sources.reduce((sum, source) => sum + Math.max(0, Number(source.value) || 0), 0);
  if (!total) return sources.map((source) => ({ ...source, percent: 0 }));

  const raw = sources.map((source) => {
    const value = Math.max(0, Number(source.value) || 0);
    const exact = (value / total) * 100;
    return { ...source, exact, percent: Math.floor(exact) };
  });
  const remainder = 100 - raw.reduce((sum, source) => sum + source.percent, 0);
  return [...raw]
    .sort((left, right) => (right.exact - right.percent) - (left.exact - left.percent))
    .map((source, index) => ({ ...source, percent: source.percent + (index < remainder ? 1 : 0) }))
    .sort((left, right) => sources.findIndex((source) => source.label === left.label) - sources.findIndex((source) => source.label === right.label));
}

function initialsFor(user = {}) {
  const source = user.name || user.username || "A";
  return source.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function earningTitle(entry = {}) {
  const event = String(entry.event || "").toUpperCase();
  const person = entry.counterparty?.name || entry.counterparty?.username || "Someone";
  const publicationTitle = entry.publication?.title;
  const giftName = entry.metadata?.giftName || "a gift";

  if (event.includes("PREMIUM_CREATOR_EARNING")) {
    return publicationTitle ? `${person} became a resident - ${publicationTitle}` : `${person} became a resident`;
  }
  if (event.includes("WORLD_CREATOR_EARNING")) {
    return publicationTitle ? `${person} unlocked ${publicationTitle}` : `${person} unlocked a World`;
  }
  if (event.includes("DREAM_CREATOR_EARNING")) {
    return `${person} sent a gift - ${giftName}`;
  }
  if (event.includes("DA_CREATOR_EARNING")) {
    return `${person} Direct Access answered`;
  }
  if (event.includes("CALL_CREATOR_EARNING")) {
    return `${person} booked Direct Access`;
  }
  return `${person} sent creator earnings`;
}

function StudioStat({ label, sub, value, tone }) {
  return (
    <article className="creator-studio-stat">
      <span>{label}</span>
      <strong className={tone === "success" ? "is-success" : ""}>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </article>
  );
}

function SourceBar({ color, label, percent, value }) {
  return (
    <div aria-label={`${label}: ${value} signals, ${percent}%`} className="creator-studio-source-row">
      <span>{label}</span>
      <i><b style={{ width: `${percent}%`, background: color }} /></i>
      <strong>{percent}%</strong>
    </div>
  );
}

function PathItem({ done, label, to }) {
  return (
    <Link className={done ? "creator-studio-path-item is-done" : "creator-studio-path-item"} to={to}>
      <span>{done ? <FiCheck /> : null}</span>
      <b>{label}</b>
    </Link>
  );
}

function BestPerformer({ icon, label, title, detail, to }) {
  return (
    <Link className="creator-studio-performer" to={to}>
      <span>{icon}</span>
      <b>{title}</b>
      <small>{label} {DOT} {detail}</small>
    </Link>
  );
}

function EarningRow({ entry }) {
  const avatar = entry.counterparty?.avatar;
  return (
    <Link className="creator-studio-earning-row" to="/wallet/ledger">
      <span className="creator-studio-earning-avatar">
        {avatar ? <img alt="" src={avatar} /> : <b>{initialsFor(entry.counterparty)}</b>}
      </span>
      <span className="creator-studio-earning-copy">
        <b>{earningTitle(entry)}</b>
        <small>{STAR}{compact(Math.abs(entry.starsChange))} {DOT} {relativeTime(entry.createdAt)}</small>
      </span>
      <strong>+{compactMoneyFromStars(entry.starsChange)}</strong>
    </Link>
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
          <article>
            <span>80%</span>
            <div>
              <b>You keep 80%, after app store fees</b>
              <small>Worlds, Direct Access, gifts - the same share everywhere, on what remains after store processing.</small>
            </div>
          </article>
          <article>
            <span><FiDollarSign /></span>
            <div>
              <b>Payouts in 3-5 business days</b>
              <small>To your bank, from $50. Transfer fees on us.</small>
            </div>
          </article>
          <article>
            <span><FiZap /></span>
            <div>
              <b>No subscription, no listing fees</b>
              <small>Creating and publishing on @seen is free - forever.</small>
            </div>
          </article>
        </div>
        <Link className="creator-payouts-terms" to="/settings">Full terms in Settings {"->"} Payouts.</Link>
      </section>
    </div>
  );
}

export default function CreatorStudio() {
  const navigate = useNavigate();
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const publicationsQuery = useQuery({
    queryKey: ["creator-studio", "publications"],
    queryFn: () => publicationService.listMyPublications({ limit: 50 }).then((response) => response.data.data.items || []),
  });
  const legacyQuery = useQuery({
    queryKey: ["creator-studio", "legacy-content"],
    queryFn: () => contentService.listMyContent({ limit: 5 }).then((response) => response.data.data.items || []),
  });
  const ledgerQuery = useQuery({
    queryKey: ["creator-studio", "wallet-ledger"],
    queryFn: () => walletService.getLedger({ limit: 20 }).then((response) => response.data.data.items || []),
    retry: false,
  });
  const directAccessQuery = useQuery({
    queryKey: ["creator-studio", "direct-access"],
    queryFn: () => messageService.getDirectAccessWindows().then((response) => response.data.data.windows || []),
    retry: false,
  });
  const profileQuery = useQuery({
    queryKey: ["creator-studio", "profile"],
    queryFn: () => profileService.getUnifiedMe().then((response) => response.data.data),
    retry: false,
  });
  const viewersQuery = useQuery({
    queryKey: ["creator-studio", "viewers"],
    queryFn: () => profileService.getOwnViewers({ limit: 1 }).then((response) => response.data.data),
    retry: false,
  });

  const publications = useMemo(() => publicationsQuery.data || [], [publicationsQuery.data]);
  const ledger = useMemo(() => ledgerQuery.data || [], [ledgerQuery.data]);
  const directAccess = useMemo(() => directAccessQuery.data || [], [directAccessQuery.data]);
  const profileData = profileQuery.data || {};
  const loading = publicationsQuery.isLoading || legacyQuery.isLoading || profileQuery.isLoading;
  const error = publicationsQuery.isError || legacyQuery.isError;

  const metrics = useMemo(() => {
    const seens = publications.filter((item) => item.kind === "SEEN");
    const worlds = publications.filter((item) => item.kind === "PREMIUM_WORLD");
    const activeWorlds = worlds.filter((item) => item.status !== "ARCHIVED");
    const published = publications.filter((item) => item.status === "PUBLISHED");
    const totalChapters = publications.reduce((sum, item) => sum + Number(item.chapterCount || item.chapters?.length || 0), 0);
    const totalViews = publications.reduce((sum, item) => sum + Number(item.viewCount || item.views || item.walkCount || 0), 0);
    const creatorCredits = ledger.filter(isCreatorCredit);
    const earnedStars = creatorCredits.reduce((sum, item) => sum + Math.max(0, Number(item.starsChange) || 0), 0);
    const heldRequests = directAccess.filter((item) => item.settlementStatus === "HELD");
    const answeredRequests = directAccess.filter(settledDirectAccess);
    const residents = activeWorlds.reduce((sum, world) => sum + residentsFor(world), 0);
    const monthlyStars = activeWorlds.reduce((sum, world) => sum + monthlyStarsFor(world), 0);
    return { activeWorlds, answeredRequests, creatorCredits, earnedStars, heldRequests, monthlyStars, published, residents, seens, totalChapters, totalViews };
  }, [directAccess, ledger, publications]);

  const profileVisits = Number(viewersQuery.data?.seenTodayCount || profileData.publicMetrics?.profileVisitCount || 0);
  const profilePhotos = profileData.photos || [];
  const wallPosts = profileData.wallPosts || profileData.sharedWallPosts || [];
  const followingCount = Number(profileData.publicMetrics?.followingCount || 0);
  const daTotal = metrics.heldRequests.length + metrics.answeredRequests.length;
  const daConversion = profileVisits ? Math.round((daTotal / profileVisits) * 1000) / 10 : 0;
  const responseRate = daTotal ? Math.round((metrics.answeredRequests.length / daTotal) * 100) : 0;

  const creatorPath = [
    { done: metrics.seens.length > 0, label: "Publish your first Seen", to: metrics.seens.length ? "/studio/seens" : "/create/seen" },
    { done: wallPosts.length > 0, label: "Write a note on the wall", to: "/wall" },
    { done: followingCount >= 3, label: "Follow 3 people", to: "/discover" },
    { done: profilePhotos.length > 0, label: "Add photos to your profile", to: "/settings/profile" },
  ];
  const pathDone = creatorPath.filter((item) => item.done).length;
  const bestSeen = bestBy(metrics.seens, (item) => seenViewsFor(item));
  const bestWorld = bestBy(metrics.activeWorlds, (item) => residentsFor(item) * 1000 + monthlyStarsFor(item) + Number(item.chapterCount || item.chapters?.length || 0) * 10);
  const bestWallPost = bestBy(wallPosts, (post) => wallEngagementFor(post));
  const bestLocation = bestLocationFor(wallPosts);
  const activeStatus = profileData.profile?.activeStatus;
  const wallSignals = wallPosts.reduce((sum, post) => sum + wallEngagementFor(post) + 1, 0);
  const sourceRows = sourcePercentages([
    { color: "#9CCBFF", label: "Discover", value: profileVisits },
    { color: "#6ECF97", label: "Wall", value: wallSignals },
    { color: "#B092FF", label: "Scenes", value: metrics.totalViews },
  ]);
  const performerRows = [
    bestSeen ? {
      detail: `${compact(seenViewsFor(bestSeen))} saw this`,
      icon: <FiEye />,
      label: "Best Seen",
      title: bestSeen.title || "Untitled Seen",
      to: `/studio/seens/${bestSeen.id}`,
    } : {
      detail: "Publish a Seen to unlock this",
      icon: <FiEye />,
      label: "Best Seen",
      title: "No Seen yet",
      to: "/create/seen",
    },
    {
      detail: profileVisits ? `${compact(profileVisits)} profile visits` : "Turn on a status to track profile interest",
      icon: <FiMonitor />,
      label: "Best status",
      title: activeStatus?.label || "No active status",
      to: "/settings/profile",
    },
    bestLocation ? {
      detail: `${bestLocation.percent}% of located Wall reach`,
      icon: <FiMapPin />,
      label: "Best location",
      title: bestLocation.location,
      to: "/wall",
    } : {
      detail: "Add locations to Wall posts to track this",
      icon: <FiMapPin />,
      label: "Best location",
      title: profileData.profile?.location || "No location yet",
      to: "/wall",
    },
    bestWallPost ? {
      detail: `${compact(wallEngagementFor(bestWallPost))} interactions`,
      icon: <FiEdit3 />,
      label: "Best Wall",
      title: wallTitleFor(bestWallPost),
      to: `/posts/${bestWallPost.originalPostId || bestWallPost.id}`,
    } : null,
    bestWorld ? {
      detail: [
        residentsFor(bestWorld) ? `${compact(residentsFor(bestWorld))} residents` : null,
        Number(bestWorld.chapterCount || bestWorld.chapters?.length || 0) ? `${compact(bestWorld.chapterCount || bestWorld.chapters?.length || 0)} chapters` : null,
        priceStarsFor(bestWorld) ? `${STAR}${compact(priceStarsFor(bestWorld))}` : null,
      ].filter(Boolean).join(" - ") || bestWorld.status?.replaceAll("_", " ") || "World performance",
      icon: <FiMapPin />,
      label: bestWorld.kind === "PREMIUM_WORLD" ? "Best Premium World" : "Best World",
      title: bestWorld.title || "Untitled World",
      to: `/studio/worlds/${bestWorld.id}`,
    } : {
      detail: "Create a World to track residents",
      icon: <FiMapPin />,
      label: "Best World",
      title: "No World yet",
      to: "/create/premium-world",
    },
  ].filter(Boolean);

  if (PROFESSIONAL_DASHBOARD_BETA_MASK_ENABLED) {
    return (
      <main className="grid min-h-[560px] place-items-start px-4 pt-20 text-center sm:pt-28">
        <section className="mx-auto w-full max-w-md rounded-3xl border border-atseen-line bg-atseen-surface p-8 shadow-2xl" role="status">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-atseen-blue/10 text-3xl text-atseen-blue"><FiClock /></span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-atseen-blue">Coming soon</p>
          <h1 className="mt-2 text-3xl font-black">Professional dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-atseen-muted">We’re preparing your professional tools, insights, and earnings experience. The dashboard will become available after the beta release.</p>
          <Link className="mt-7 inline-flex items-center gap-2 rounded-full border border-atseen-line px-5 py-2.5 text-sm font-bold transition hover:border-atseen-blue/50 hover:text-atseen-blue" to="/profile"><FiArrowLeft /> Back to Profile</Link>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="creator-studio-prototype">
        <LoadingSkeleton className="h-14" count={1} />
        <LoadingSkeleton className="h-40" count={1} />
        <LoadingSkeleton className="h-20" count={2} />
        <LoadingSkeleton className="h-64" count={1} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="creator-studio-prototype">
        <button className="creator-studio-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button>
        <section className="creator-studio-error">
          <h1>Creator Dashboard</h1>
          <p>Unable to load creator studio.</p>
          <button onClick={() => { publicationsQuery.refetch(); legacyQuery.refetch(); profileQuery.refetch(); }} type="button"><FiRefreshCw /> Retry</button>
        </section>
      </main>
    );
  }

  return (
    <>
    <main className="creator-studio-prototype">
      <header className="creator-studio-header">
        <button aria-label="Back" className="creator-studio-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button>
        <div>
          <h1>Creator Dashboard</h1>
          <p>This month {DOT} free forever {STAR}</p>
        </div>
        <Link aria-label="Wallet" to="/wallet"><FiCreditCard /></Link>
      </header>

      <section className="creator-studio-earnings">
        <span>Your earnings this month</span>
        <strong>{moneyFromStars(metrics.earnedStars)}</strong>
        <small>{metrics.creatorCredits.length ? `${UP} Real creator credits from your ledger` : "No settled creator earnings yet"}</small>
      </section>

      <Link className="creator-studio-residents" to="/studio/worlds">
        <span aria-hidden="true">{PLANET}</span>
        <b>Residents {DOT} <i>{compact(metrics.residents)}</i></b>
        <strong>{metrics.residents ? `${moneyFromStars(metrics.monthlyStars)}/mo` : "Create World"}</strong>
      </Link>

      <section className="creator-studio-path">
        <div>
          <b>Creator path</b>
          <span>{pathDone}/{creatorPath.length}</span>
        </div>
        {creatorPath.map((item) => <PathItem done={item.done} key={item.label} label={item.label} to={item.to} />)}
      </section>

      <section className="creator-studio-stat-grid">
        <StudioStat label="PROFILE VISITS" sub={profileVisits ? `${UP} today` : "No visits today"} value={profileVisits ? compact(profileVisits) : "--"} />
        <StudioStat label="SEEN VIEWS" sub={metrics.totalViews ? `${UP} from publications` : "views pending"} value={metrics.totalViews ? compact(metrics.totalViews) : "--"} />
        <StudioStat label="DA CONVERSION" sub={daTotal ? `${daTotal} Direct Access windows` : "No DA windows yet"} value={daConversion ? `${daConversion}%` : "--"} />
        <StudioStat label="RESPONSE RATE" sub={daTotal ? `${metrics.answeredRequests.length}/${daTotal} answered` : "Measured from real replies"} tone="success" value={responseRate ? `${responseRate}%` : "--"} />
      </section>

      <section className="creator-studio-section">
        <h2>RECENT EARNINGS</h2>
        {metrics.creatorCredits.length ? metrics.creatorCredits.slice(0, 5).map((entry) => (
          <EarningRow entry={entry} key={entry.id} />
        )) : (
          <p className="creator-studio-empty">Creator earnings will appear here after gifts, paid access, calls, or memberships settle.</p>
        )}
      </section>

      <section className="creator-studio-section">
        <h2>WHERE PEOPLE FIND YOU</h2>
        <div className="creator-studio-source-card">
          {sourceRows.map((source) => <SourceBar color={source.color} key={source.label} label={source.label} percent={source.percent} value={source.value} />)}
        </div>
      </section>

      <section className="creator-studio-section">
        <h2>BEST PERFORMERS</h2>
        {performerRows.map((item) => (
          <BestPerformer detail={item.detail} icon={item.icon} key={item.label} label={item.label} title={item.title} to={item.to} />
        ))}
      </section>

      <p className="creator-studio-note">Your numbers are yours. No subscription, no paywall - ever. {STAR} <button onClick={() => setPayoutsOpen(true)} type="button">How payouts work {CHEVRON}</button></p>
    </main>
    {payoutsOpen ? <PayoutsSheet onClose={() => setPayoutsOpen(false)} /> : null}
    </>
  );
}
