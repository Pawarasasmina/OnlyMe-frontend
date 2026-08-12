import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiCheck,
  FiCreditCard,
  FiEye,
  FiMapPin,
  FiMonitor,
  FiRefreshCw,
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

function StudioStat({ label, sub, value, tone }) {
  return (
    <article className="creator-studio-stat">
      <span>{label}</span>
      <strong className={tone === "success" ? "is-success" : ""}>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </article>
  );
}

function SourceBar({ color, label, percent }) {
  return (
    <div className="creator-studio-source-row">
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

export default function CreatorStudio() {
  const navigate = useNavigate();
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
    const monthlyStars = activeWorlds.reduce((sum, world) => sum + residentsFor(world) * priceStarsFor(world), 0);
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
  const bestSeen = metrics.seens[0];
  const bestWorld = metrics.activeWorlds[0];
  const sourceHasData = metrics.published.length || wallPosts.length || metrics.seens.length;

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
          <Link className="creator-studio-earning-row" key={entry.id} to="/wallet/ledger">
            <span>{STAR}</span>
            <b>{entry.event?.replaceAll("_", " ") || "Creator earning"}</b>
            <small>{STAR}{compact(entry.starsChange)} {DOT} {relativeTime(entry.createdAt)}</small>
            <strong>+{moneyFromStars(entry.starsChange)}</strong>
          </Link>
        )) : (
          <p className="creator-studio-empty">Creator earnings will appear here after gifts, paid access, calls, or memberships settle.</p>
        )}
      </section>

      <section className="creator-studio-section">
        <h2>WHERE PEOPLE FIND YOU</h2>
        <div className="creator-studio-source-card">
          <SourceBar color="#9CCBFF" label="Discover" percent={sourceHasData ? 44 : 0} />
          <SourceBar color="#6ECF97" label="Wall" percent={wallPosts.length ? 31 : 0} />
          <SourceBar color="#B092FF" label="Scenes" percent={metrics.seens.length ? 25 : 0} />
        </div>
      </section>

      <section className="creator-studio-section">
        <h2>BEST PERFORMERS</h2>
        <BestPerformer detail={bestSeen ? `${compact(bestSeen.viewCount || bestSeen.views || 0)} saw this` : "Create your first Seen"} icon={<FiEye />} label="Best Seen" title={bestSeen?.title || "No Seen yet"} to={bestSeen ? `/studio/seens/${bestSeen.id}` : "/create/seen"} />
        <BestPerformer detail={profileVisits ? `${compact(profileVisits)} profile visits` : "Status analytics pending"} icon={<FiMonitor />} label="Best status" title={profileData.profile?.activeStatus?.label || "Status tracking"} to="/settings/profile" />
        <BestPerformer detail={bestWorld ? `${bestWorld.chapterCount || bestWorld.chapters?.length || 0} chapters` : "Create your World"} icon={<FiMapPin />} label="Best World" title={bestWorld?.title || "No World yet"} to={bestWorld ? `/studio/worlds/${bestWorld.id}` : "/create/premium-world"} />
      </section>

      <p className="creator-studio-note">Your numbers are yours. No subscription, no paywall - ever. {STAR} <Link to="/wallet">How payouts work {CHEVRON}</Link></p>
    </main>
  );
}
