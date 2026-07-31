import { Link, useLocation } from "react-router-dom";
import { FiCheckCircle, FiCreditCard, FiEdit3, FiGrid, FiMapPin, FiSettings, FiStar } from "react-icons/fi";
import SeeYouButton from "../orbit/SeeYouButton";
import { formatOrbitStatusLine } from "../orbit/orbitFormat";
import FanAvatar from "./shared/FanAvatar";
import FanCard from "./shared/FanCard";
import ProgressBar from "./shared/ProgressBar";
import VerifiedBadge from "./shared/VerifiedBadge";
import LoadingSkeleton from "./shared/LoadingSkeleton";
import EmptyState from "./shared/EmptyState";
import { useCityProgress, useOrbit } from "../../hooks/useOrbit";
import { formatSparks, getUserDisplay } from "./shared/userDisplay";
import LightYourWorldChecklist from "../onboarding/LightYourWorldChecklist";
import { atseenCreators } from "../../data/atseenMockData";

function RailLink({ icon: Icon, label, to }) {
  return <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-atseen-muted transition hover:bg-atseen-surface-2 hover:text-white" to={to}><Icon className="text-atseen-blue" /> {label}</Link>;
}

function ProfileSummary({ currentUser, display, status, user }) {
  const name = currentUser?.name || display.name;
  const location = currentUser ? formatOrbitStatusLine(currentUser) : display.location;
  const orbitStatus = currentUser?.status || status;
  const sparks = user?.sparks || user?.points || 1240;
  const avatar = currentUser?.avatar || display.avatar;
  const isVerified = Boolean(currentUser?.verified || display.isVerified);

  return (
    <FanCard className="mb-4 flex items-center gap-3 p-4">
      <FanAvatar name={name} size="h-[52px] w-[52px]" src={avatar} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-base font-extrabold text-atseen-text">
          {name}
          {isVerified ? <VerifiedBadge /> : null}
        </p>
        {orbitStatus || location ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-atseen-muted">
            <FiMapPin className="shrink-0 text-atseen-blue" aria-hidden="true" />
            <span className="truncate">{currentUser ? location : [orbitStatus, location].filter(Boolean).join(" - ")}</span>
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-atseen-blue">
        <FiStar aria-hidden="true" />
        {formatSparks(sparks)}
      </div>
    </FanCard>
  );
}

function OrbitLight({ recommendation }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl py-2">
      <Link
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl transition hover:bg-atseen-surface-2"
        to={`/profile/${encodeURIComponent(recommendation.username)}`}
      >
        <FanAvatar name={recommendation.name} size="h-10 w-10" src={recommendation.avatar} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-extrabold text-atseen-text">
            {recommendation.name}
            {recommendation.verified ? <VerifiedBadge /> : null}
          </p>
          <p className="truncate text-xs text-atseen-muted">{recommendation.reason || recommendation.status}</p>
        </div>
      </Link>
      <SeeYouButton compact hasSeenSignal={recommendation.hasSeenSignal} targetName={recommendation.name} targetUserId={recommendation.id} />
    </div>
  );
}

function OrbitLightsCard({ recommendations = [], loading }) {
  return (
    <FanCard className="mb-4">
      <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-atseen-dim">New lights in your orbit</p>
      {loading ? <LoadingSkeleton className="h-12" count={3} /> : null}
      {!loading && recommendations.length ? (
        <div className="space-y-1">
          {recommendations.slice(0, 4).map((recommendation) => <OrbitLight key={recommendation.id} recommendation={recommendation} />)}
        </div>
      ) : null}
      {!loading && !recommendations.length ? <EmptyState message="New recommendations will appear as your profile gains interests and location context." title="No new lights yet" /> : null}
    </FanCard>
  );
}

function CityProgressCard({ cities = [], loading }) {
  return (
    <FanCard className="mb-4">
      <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-atseen-dim">Cities lighting up</p>
      {loading ? <LoadingSkeleton className="h-10" count={3} /> : null}
      {!loading && cities.length ? (
        <>
          <div className="space-y-4">
            {cities.map((city) => {
              const hasTarget = Number.isFinite(city.targetCount) && city.targetCount > 0;
              const percent = hasTarget ? city.progressPercentage ?? (city.currentCount / city.targetCount) * 100 : 100;
              return (
                <div key={`${city.city}-${city.country}`}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <p className="min-w-0 truncate font-extrabold text-atseen-text">
                      <span className="mr-1 text-atseen-muted">{city.country || "AT"}</span>
                      {city.city}
                    </p>
                    <p className="shrink-0 text-atseen-muted">
                      {formatSparks(city.currentCount)}{hasTarget ? ` / ${formatSparks(city.targetCount)}` : " creators"}
                    </p>
                  </div>
                  <ProgressBar label={`${city.city} creator activity`} value={percent} />
                </div>
              );
            })}
          </div>
          {cities.some((city) => city.source === "seeded_launch_config") ? (
            <p className="mt-4 text-center text-[11px] text-atseen-muted">Your queue decides where we go next.</p>
          ) : null}
        </>
      ) : null}
      {!loading && !cities.length ? <p className="text-center text-[11px] leading-5 text-atseen-muted">City activity appears when approved creators share public locations.</p> : null}
    </FanCard>
  );
}

const rightRailPeople = [
  { id: "anna", name: "Anna Petrova", meta: "Traveling · Madrid", src: atseenCreators.anna.avatar },
  { id: "omar", name: "Omar Haddad", meta: "Coffee break · Dubai", src: atseenCreators.omar.avatar },
  { id: "sofia", name: "Sofia Reyes", meta: "At home · Mexico C...", src: atseenCreators.sofia.avatar },
  { id: "luca", name: "Luca Romano", meta: "Coffee break · Milan", src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=220&h=220&q=70" },
];

function SearchPrototypeRightRail() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[340px] shrink-0 overflow-y-auto border-l border-white/[0.055] bg-[#0a0c0f] px-6 pb-8 pt-[38px] min-[1240px]:block">
      <Link className="mb-5 flex min-h-[98px] items-center gap-3 rounded-[22px] border border-white/[0.075] bg-white/[0.026] px-5 py-4 shadow-[0_18px_55px_rgba(0,0,0,0.2)]" to="/profile/lina">
        <span className="rounded-full border-2 border-atseen-blue p-1">
          <FanAvatar name="Lina Moreau" size="h-[42px] w-[42px]" src={atseenCreators.lina.avatar} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-black text-white">Being seen right now</span>
          <span className="mt-1 block truncate text-[13px] font-semibold text-white/[0.36]">Lina and 10 others are At seen</span>
        </span>
        <span className="h-3 w-3 shrink-0 rounded-full bg-[#6ecf97] shadow-[0_0_16px_rgba(110,207,151,0.9)]" />
      </Link>

      <section className="mb-5 rounded-[22px] border border-white/[0.075] bg-white/[0.026] px-5 py-5" aria-labelledby="search-rail-suggested">
        <h2 className="mb-4 text-[17px] font-black tracking-[-0.02em] text-white" id="search-rail-suggested">Suggested for you</h2>
        <div className="space-y-3">
          {rightRailPeople.map((person) => (
            <div className="flex items-center gap-3" key={person.id}>
              <Link className="flex min-w-0 flex-1 items-center gap-3" to={`/profile/${person.id}`}>
                <FanAvatar name={person.name} size="h-[52px] w-[52px]" src={person.src} />
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-black text-white">{person.name}</span>
                  <span className="mt-0.5 block truncate text-[13px] font-semibold text-white/[0.38]">{person.meta}</span>
                </span>
              </Link>
              <button className="min-h-9 shrink-0 rounded-full border border-atseen-blue/35 bg-atseen-blue/10 px-5 text-[13px] font-black text-[#b7dcff] transition hover:bg-atseen-blue/[0.18]" type="button">
                Follow
              </button>
            </div>
          ))}
        </div>
      </section>

      <Link className="group mb-5 block h-[180px] overflow-hidden rounded-[22px] border border-white/[0.075] bg-white/[0.026]" to="/seen/e18">
        <span className="relative block h-full">
          <img alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=680&h=420&q=70" />
          <span className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/15 to-black/78" />
          <span className="absolute bottom-5 left-4 right-4">
            <span className="block text-[13px] font-black uppercase tracking-[0.04em] text-[#bfe3ff]">Trending Seen</span>
            <span className="mt-1 block text-[18px] font-black leading-tight text-white">How I Validate Ideas</span>
            <span className="mt-1 block text-[12px] font-semibold text-white/[0.58]">James · 99K saw this</span>
          </span>
        </span>
      </Link>

      <section className="rounded-[22px] border border-white/[0.075] bg-white/[0.026] px-5 py-5" aria-labelledby="search-rail-fresh">
        <h2 className="mb-4 text-[17px] font-black tracking-[-0.02em] text-white" id="search-rail-fresh">Fresh Seens</h2>
        <Link className="flex items-center gap-3" to="/seen/fresh-hidden-places">
          <img alt="" className="h-[52px] w-[52px] rounded-[14px] object-cover" src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=180&h=180&q=70" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-black text-white">3 Hidden Places I Love</span>
            <span className="mt-0.5 block truncate text-[13px] font-semibold text-white/[0.38]">Lina · 3 chapters</span>
          </span>
        </Link>
      </section>
    </aside>
  );
}

function DefaultFanWebRightRail({ capabilities, status, user }) {
  const display = getUserDisplay(user, status);
  const orbitQuery = useOrbit({ limit: 12 });
  const cityQuery = useCityProgress();
  const orbit = orbitQuery.data;
  const currentUser = orbit?.currentUser;
  const recommendations = orbit?.recommendations || [];

  return (
    <aside className="sticky top-0 hidden h-screen w-[320px] shrink-0 overflow-y-auto px-5 pb-6 pt-[42px] min-[1020px]:block">
      <ProfileSummary currentUser={currentUser} display={display} status={status} user={user} />
      <div className="mb-4">
        <LightYourWorldChecklist />
      </div>
      <OrbitLightsCard loading={orbitQuery.isLoading} recommendations={recommendations} />
      <CityProgressCard cities={cityQuery.data || []} loading={cityQuery.isLoading} />
      {capabilities.isCreator ? (
        <FanCard className="mb-4">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Creator access</p>
          <p className="mt-2 text-sm text-atseen-muted">{capabilities.isApprovedCreator ? "Your creator account is approved." : "Complete verification to unlock creation and Studio access."}</p>
          <div className="mt-3 space-y-1">
            {capabilities.canCreate ? <RailLink icon={FiEdit3} label="Create" to="/creator/content/new" /> : null}
            {capabilities.canAccessStudio ? <RailLink icon={FiGrid} label="Creator Studio" to="/studio" /> : null}
            {!capabilities.isApprovedCreator ? <RailLink icon={FiCheckCircle} label="Verification" to="/creator/verification" /> : null}
          </div>
        </FanCard>
      ) : (
        <FanCard className="mb-4">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Fan access</p>
          <p className="mt-2 text-sm text-atseen-muted">Your wallet and subscriptions stay separate from private Orbit signals.</p>
          <div className="mt-3 space-y-1">
            <RailLink icon={FiCreditCard} label="Wallet" to="/fan/wallet" />
            <RailLink icon={FiStar} label="Subscriptions" to="/fan/subscriptions" />
          </div>
        </FanCard>
      )}
      <FanCard className="mb-4"><RailLink icon={FiSettings} label="Settings" to="/settings/profile" /></FanCard>
      <footer className="px-1 text-[11px] leading-6 text-atseen-dim">
        <p>
          <Link className="transition hover:text-atseen-muted" to="/settings/privacy">Privacy</Link>
          <span> - </span>
          <Link className="transition hover:text-atseen-muted" to="/settings/profile">Community Guidelines</Link>
        </p>
        <p>Atseen OU - legal@atseen.com</p>
      </footer>
    </aside>
  );
}

function FanWebRightRail(props) {
  const location = useLocation();
  if (location.pathname === "/search") return <SearchPrototypeRightRail />;
  return <DefaultFanWebRightRail {...props} />;
}

export default FanWebRightRail;
