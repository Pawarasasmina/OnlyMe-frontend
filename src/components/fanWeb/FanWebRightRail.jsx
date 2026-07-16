import { Link } from "react-router-dom";
import { FiCheckCircle, FiEdit3, FiGrid, FiSettings } from "react-icons/fi";
import FanAvatar from "./shared/FanAvatar";
import FanCard from "./shared/FanCard";
import VerifiedBadge from "./shared/VerifiedBadge";
import { getUserDisplay } from "./shared/userDisplay";

function RailLink({ icon: Icon, label, to }) {
  return <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-atseen-muted transition hover:bg-atseen-surface-2 hover:text-white" to={to}><Icon className="text-atseen-blue" /> {label}</Link>;
}

function FanWebRightRail({ capabilities, status, user }) {
  const display = getUserDisplay(user, status);
  return (
    <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 overflow-y-auto px-5 pb-6 pt-[34px] min-[1020px]:block">
      <FanCard className="mb-3 flex items-center gap-3 p-4">
        <FanAvatar name={display.name} size="h-[46px] w-[46px]" src={display.avatar} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-atseen-text">{display.name}{display.isVerified ? <VerifiedBadge /> : null}</p>
          <p className="truncate text-[11px] text-atseen-muted">@{display.username}</p>
          {display.status ? <p className="mt-1 truncate text-[11px] text-atseen-blue">{display.status}</p> : null}
        </div>
      </FanCard>
      {capabilities.isCreator ? (
        <FanCard className="mb-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Creator access</p>
          <p className="mt-2 text-sm text-atseen-muted">{capabilities.isApprovedCreator ? "Your creator account is approved." : "Complete verification to unlock creation and Studio access."}</p>
          <div className="mt-3 space-y-1">
            {capabilities.canCreate ? <RailLink icon={FiEdit3} label="Create" to="/creator/content/new" /> : null}
            {capabilities.canAccessStudio ? <RailLink icon={FiGrid} label="Creator Studio" to="/studio" /> : null}
            {!capabilities.isApprovedCreator ? <RailLink icon={FiCheckCircle} label="Verification" to="/creator/verification" /> : null}
          </div>
        </FanCard>
      ) : null}
      <FanCard className="mb-3"><RailLink icon={FiSettings} label="Settings" to="/settings" /></FanCard>
      <p className="px-1 text-[10px] leading-5 text-atseen-dim">Financial and audience metrics are omitted until supported by live services.</p>
    </aside>
  );
}

export default FanWebRightRail;
