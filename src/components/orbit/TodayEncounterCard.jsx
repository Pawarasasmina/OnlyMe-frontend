import { Link } from "react-router-dom";
import { useState } from "react";
import { FiMapPin } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanCard from "../fanWeb/shared/FanCard";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import OrbitProfilePreview from "./OrbitProfilePreview";
import { formatOrbitStatusLine } from "./orbitFormat";

function TodayEncounterCard({ encounter }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!encounter) return null;

  const profilePath = encounter.profileRoute || `/profile/${encodeURIComponent(encounter.username)}`;
  const statusLine = formatOrbitStatusLine(encounter);

  return (
    <div className="hidden sm:block">
      <p className="mb-3 mt-[26px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Today&apos;s Encounter</p>
      <FanCard className="flex items-center gap-4 rounded-[20px] p-[18px]">
        <Link to={profilePath}>
          <FanAvatar name={encounter.name} size="h-[66px] w-[66px]" src={encounter.avatar} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[15px] font-bold text-atseen-text">
            {encounter.name}
            {encounter.verified ? <VerifiedBadge /> : null}
          </p>
          {statusLine ? (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-atseen-muted">
              <FiMapPin aria-hidden="true" className="text-atseen-blue" />
              {statusLine}
            </p>
          ) : null}
          <p className="mt-2 text-[12.5px] font-semibold text-atseen-blue">{encounter.reason}</p>
        </div>
        <button
          className="shrink-0 rounded-[11px] border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-xs font-semibold transition hover:border-atseen-blue/40"
          onClick={() => setPreviewOpen(true)}
          type="button"
        >
          Meet
        </button>
      </FanCard>
      <OrbitProfilePreview node={previewOpen ? encounter : null} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}

export default TodayEncounterCard;
