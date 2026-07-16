import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiChevronRight } from "react-icons/fi";
import FanAvatar from "./shared/FanAvatar";
import FanCard from "./shared/FanCard";
import ProgressBar from "./shared/ProgressBar";
import VerifiedBadge from "./shared/VerifiedBadge";
import { useFanToast } from "./shared/FanToastContext";
import { atseenCities, atseenCreators } from "../../data/atseenMockData";
import { fanService } from "../../services/fanService";
import { getUserDisplay, formatSparks } from "./shared/userDisplay";

function FanWebRightRail({ status, user }) {
  const display = getUserDisplay(user, status);
  const { showToast } = useFanToast();
  const [seenLights, setSeenLights] = useState(() => {
    const initial = {};
    ["lina", "omar", "anna"].forEach((id) => {
      initial[id] = Boolean(localStorage.getItem(`atseen_seen_signal_${id}`));
    });
    return initial;
  });
  const balanceQuery = useQuery({
    queryKey: ["fan", "dashboard", "rightRail"],
    queryFn: () => fanService.getDashboard().then((response) => response.data.data),
    retry: false,
  });
  const walletBalance = balanceQuery.data?.summary?.coinBalance ?? balanceQuery.data?.wallet?.balance ?? 1240;
  const newLights = ["lina", "omar", "anna"];
  const [lina, omar, anna] = newLights.map((id) => atseenCreators[id]);

  const handleSee = (creator) => {
    const key = `atseen_seen_signal_${creator.id}`;
    const alreadySeen = localStorage.getItem(key);
    localStorage.setItem(key, "1");
    setSeenLights((current) => ({ ...current, [creator.id]: true }));
    showToast(
      alreadySeen
        ? `${creator.name.split(" ")[0]} already knows you saw them.`
        : `Private signal: only ${creator.name.split(" ")[0]} will see that you saw them.`
    );
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 overflow-y-auto px-5 pb-6 pt-[34px] min-[1020px]:block">
      <FanCard className="mb-3 flex items-center gap-3 p-4">
        <FanAvatar name={display.name} size="h-[46px] w-[46px]" src={display.avatar} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-atseen-text">
            {display.name}
            {display.isVerified ? <VerifiedBadge /> : null}
          </p>
          <p className="truncate text-[11px] text-atseen-muted">
            {display.status} · {display.location}
          </p>
        </div>
        <Link className="shrink-0 text-sm font-bold text-atseen-blue transition hover:text-white" to="/fan/wallet">
          ✦ {formatSparks(walletBalance)}
        </Link>
      </FanCard>

      <FanCard className="mb-3">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">New Lights In Your Orbit</p>
        <div className="mt-3 space-y-3">
          {[lina, omar, anna].map((creator) => {
            const seen = seenLights[creator.id];

            return (
              <div className="flex items-center gap-2.5" key={creator.id}>
                <FanAvatar name={creator.name} size="h-9 w-9" src={creator.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-xs font-bold text-atseen-text">
                    {creator.name}
                    {creator.verified ? <VerifiedBadge /> : null}
                  </p>
                  <p className="truncate text-[10.5px] text-atseen-muted">
                    {creator.statusEmoji} {creator.status}
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-full px-2 py-1 text-[11px] font-bold text-atseen-blue transition hover:bg-atseen-surface-2 hover:text-white"
                  onClick={() => handleSee(creator)}
                  type="button"
                >
                  {seen ? "Seen" : "I see you"}
                </button>
              </div>
            );
          })}
        </div>
      </FanCard>

      <FanCard className="mb-3">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Cities Lighting Up</p>
        <div className="mt-3 space-y-3">
          {atseenCities.map((city) => (
            <div key={city.city}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <p className="font-bold text-atseen-text">
                  {city.flag} {city.city}
                </p>
                <p className="text-[10.5px] text-atseen-muted">
                  {city.current.toLocaleString()} / {city.goal.toLocaleString()}
                </p>
              </div>
              <ProgressBar label={`${city.city} launch progress`} value={(city.current / city.goal) * 100} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-atseen-muted">Your queue decides where we go next ✦</p>
      </FanCard>

      <FanCard className="mb-3 flex items-center gap-3 p-4">
        <span className="text-lg">✦</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-atseen-text">Your Direct Access</p>
          <p className="truncate text-[11px] text-atseen-muted">Priority ✦100 · Measured by @seen</p>
        </div>
        <FiChevronRight aria-hidden="true" className="text-atseen-dim" />
      </FanCard>

      <p className="px-1 text-[10px] leading-5 text-atseen-dim">
        <Link className="transition hover:text-atseen-blue" to="/terms">Terms</Link> ·{" "}
        <Link className="transition hover:text-atseen-blue" to="/privacy">Privacy</Link> ·{" "}
        <Link className="transition hover:text-atseen-blue" to="/community-guidelines">Community Guidelines</Link>
        <br />
        © Atseen OU · legal@atseen.com
      </p>
    </aside>
  );
}

export default FanWebRightRail;
