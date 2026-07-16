import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiBookmark, FiChevronRight, FiCreditCard, FiGrid, FiLock, FiSettings, FiUsers } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCard from "../../components/fanWeb/shared/FanCard";
import ProgressBar from "../../components/fanWeb/shared/ProgressBar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { atseenFeedPosts, atseenWorlds } from "../../data/atseenMockData";
import { useAuth } from "../../hooks/useAuth";
import { fanService } from "../../services/fanService";
import { getUserDisplay, formatSparks } from "../../components/fanWeb/shared/userDisplay";

const profileTabs = [
  { key: "seens", label: "My Seens", icon: FiGrid },
  { key: "saved", label: "Saved", icon: FiBookmark },
];

function ProfileLink({ icon: Icon, label, to }) {
  return (
    <Link
      className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface px-4 py-3 text-sm font-semibold text-atseen-text transition hover:border-atseen-blue/45"
      to={to}
    >
      <Icon aria-hidden="true" className="text-atseen-blue" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <FiChevronRight aria-hidden="true" className="text-atseen-dim" />
    </Link>
  );
}

function ProfileSeenCard({ post }) {
  return (
    <article className="rounded-2xl border border-atseen-line bg-atseen-surface p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-atseen-blue/20 bg-atseen-blue/10 px-2.5 py-1 text-[10px] font-bold text-atseen-blue">
          {post.contextEmoji} {post.context}
        </span>
        <span className="text-[10.5px] text-atseen-muted">{post.handshakes * 3} supporters</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/90">{post.text}</p>
    </article>
  );
}

function FanProfilePage() {
  const { status } = useOutletContext();
  const { user } = useAuth();
  const display = getUserDisplay(user, status);
  const { showToast } = useFanToast();
  const [activeTab, setActiveTab] = useState("seens");
  const dashboardQuery = useQuery({
    queryKey: ["fan", "dashboard", "profile"],
    queryFn: () => fanService.getDashboard().then((response) => response.data.data),
    retry: false,
  });
  const profile = dashboardQuery.data?.profile;
  const walletBalance = dashboardQuery.data?.summary?.coinBalance || dashboardQuery.data?.wallet?.balance || 1240;
  const followers = profile?.followersCount || 128;
  const following = profile?.followingCount || 84;
  const supporters = profile?.supportersCount || 46;
  const canUseProfessionalDashboard = Boolean(user?.creatorProfile || user?.canCreate || user?.role === "creator");

  return (
    <div>
      <div className="relative h-[330px] overflow-hidden rounded-[22px] border border-atseen-line bg-[radial-gradient(80%_90%_at_50%_45%,#0d1420,#06080B_75%)]">
        {[420, 280].map((width) => (
          <div className="atseen-orbit-ring" key={width} style={{ width, height: width === 420 ? 155 : 102 }} />
        ))}
        {[
          [14, 18],
          [86, 24],
          [9, 66],
          [91, 70],
          [30, 88],
          [66, 10],
        ].map(([left, top], index) => (
          <span
            className="atseen-twinkle absolute h-[2.5px] w-[2.5px] rounded-full bg-atseen-blue"
            key={`${left}-${top}`}
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 0.25}s` }}
          />
        ))}
        <div className="absolute left-1/2 top-[46%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
          <FanAvatar className="border-2 border-atseen-blue shadow-glow" name={display.name} size="h-[84px] w-[84px]" src={display.avatar} />
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-atseen-text">
            {display.name}
            {display.isVerified ? <VerifiedBadge /> : null}
          </p>
          <p className="mt-1 text-[10.5px] text-atseen-muted">
            @{display.username} {"\u00B7"} {display.location} {"\u00B7"} {followers} followers
          </p>
          <span className="mt-2 inline-flex rounded-full border border-atseen-blue/25 bg-atseen-blue/10 px-3 py-1.5 text-[11px] font-bold text-atseen-blue">
            {display.status}
          </span>
        </div>
        {[
          ["World", "Train", "Morning Discipline", 20, 30],
          ["World", "Read", "My Bookshelf", 80, 36],
        ].map(([worldLabel, themeLabel, label, left, top]) => (
          <button
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center transition hover:scale-110"
            key={label}
            onClick={() => showToast(`${label} opens in Worlds.`)}
            style={{ left: `${left}%`, top: `${top}%` }}
            type="button"
          >
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-atseen-blue/30 bg-atseen-blue/10 text-[10px] font-black text-atseen-blue">
              {worldLabel}
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full border border-atseen-line bg-atseen-bg px-1.5 py-0.5 text-[9px] text-atseen-muted">{themeLabel}</span>
            </span>
            <span className="mt-1 block text-[10.5px] font-bold text-atseen-text">{label}</span>
          </button>
        ))}
        <p className="absolute bottom-2.5 left-0 right-0 text-center text-[10px] text-atseen-muted">
          your worlds {"\u00B7"} tap a planet to step inside
        </p>
      </div>

      <div className="mt-[18px] flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px] text-atseen-muted">
        <span><b className="text-atseen-text">{supporters}</b> supporters</span>
        <span><b className="text-atseen-text">{followers}</b> followers</span>
        <span><b className="text-atseen-text">{following}</b> following</span>
        <span><b className="text-atseen-text">2</b> worlds</span>
        <span><b className="text-atseen-text">{"\u2726"} {formatSparks(walletBalance)}</b> Stars</span>
      </div>

      {canUseProfessionalDashboard ? (
        <FanCard className="mt-[18px] flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-atseen-blue/25 bg-atseen-blue/10 text-xs font-black text-atseen-blue">Pro</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-atseen-text">Professional dashboard</p>
            <p className="text-[11px] text-atseen-muted">Supporters, revenue sources, best performers</p>
          </div>
          <FiChevronRight aria-hidden="true" className="text-atseen-dim" />
        </FanCard>
      ) : null}

      <button
        className="relative mt-4 block h-[190px] w-full overflow-hidden rounded-[18px]"
        onClick={() => showToast("Intro video plays in the app.")}
        type="button"
      >
        <img alt="" className="h-full w-full object-cover" src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=70" />
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-atseen-bg/90" />
        <span className="absolute left-1/2 top-[42%] flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-atseen-bg/60 text-white backdrop-blur">
          {"\u25B6"}
        </span>
        <span className="absolute bottom-3 left-4 text-left">
          <span className="block text-sm font-bold text-white">30 seconds of me</span>
          <span className="block text-[10.5px] text-atseen-muted">0:30 {"\u00B7"} why this person exists here</span>
        </span>
      </button>

      <FanCard className="mt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-atseen-blue/25 bg-atseen-blue/10 text-[10px] font-black text-atseen-blue">Dream</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">My Dream Experience</p>
            <p className="text-sm font-bold text-atseen-text">A rooftop cinema for the whole orbit</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar label="Dream support progress" value={16} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-atseen-muted">
          <span><b className="text-atseen-text">{"\u2726"}480</b> support received {"\u00B7"} 12 people</span>
          <span>goal {"\u2726"}3,000</span>
        </div>
      </FanCard>

      <div className="mt-6 flex rounded-2xl border border-atseen-line bg-atseen-surface p-1">
        {profileTabs.map(({ icon: Icon, key, label }) => (
          <button
            className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
              activeTab === key ? "bg-atseen-blue text-atseen-bg" : "text-atseen-muted hover:text-atseen-text"
            }`}
            key={key}
            onClick={() => setActiveTab(key)}
            type="button"
          >
            <Icon aria-hidden="true" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === "seens" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {atseenFeedPosts.slice(2, 6).map((post) => <ProfileSeenCard key={post.id} post={post} />)}
        </div>
      ) : null}

      {activeTab === "saved" ? (
        <div className="mt-3 grid gap-3">
          {atseenFeedPosts.slice(0, 2).map((post) => <ProfileSeenCard key={post.id} post={post} />)}
        </div>
      ) : null}

      <p className="mb-1 mt-6 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Wall</p>
      {atseenFeedPosts.slice(2, 4).map((post) => (
        <div className="border-b border-white/[0.05] py-3.5" key={post.id}>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] text-atseen-muted">Pinned {"\u00B7"} {post.handshakes * 3} saved</span>
            <span className="rounded-full border border-atseen-blue/20 bg-atseen-blue/10 px-2.5 py-1 text-[10px] font-bold text-atseen-blue">
              {post.contextEmoji} {post.context}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/90">{post.text}</p>
        </div>
      ))}

      <div className="mt-6 grid gap-2">
        <ProfileLink icon={FiCreditCard} label="Wallet" to="/fan/wallet" />
        <ProfileLink icon={FiUsers} label="Subscriptions" to="/fan/subscriptions" />
        <ProfileLink icon={FiLock} label="Purchases" to="/fan/purchases" />
        <ProfileLink icon={FiSettings} label="Settings" to="/settings/profile" />
      </div>
      <div className="mt-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Worlds</p>
        <div className="mt-2 flex gap-3">
          {atseenWorlds.slice(0, 3).map((world) => (
            <Link className="rounded-2xl border border-atseen-line bg-atseen-surface px-4 py-3 text-2xl transition hover:border-atseen-blue/45" key={world.id} to="/fan/worlds">
              <span className="relative">
                {world.worldEmoji}
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm">{world.themeEmoji}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FanProfilePage;
