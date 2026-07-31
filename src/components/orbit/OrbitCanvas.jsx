import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import OrbitNode from "./OrbitNode";
import OrbitProfilePreview from "./OrbitProfilePreview";
import OrbitRings from "./OrbitRings";
import { formatOrbitStatusLine } from "./orbitFormat";

const tierPositions = {
  close: [
    { x: 59, y: 35 },
    { x: 42, y: 38 },
    { x: 62, y: 62 },
    { x: 39, y: 63 },
  ],
  aligned: [
    { x: 50, y: 18 },
    { x: 73, y: 30 },
    { x: 70, y: 75 },
    { x: 30, y: 72 },
    { x: 27, y: 30 },
  ],
  discover: [
    { x: 84, y: 51 },
    { x: 18, y: 49 },
    { x: 50, y: 84 },
    { x: 64, y: 15 },
    { x: 34, y: 84 },
    { x: 15, y: 67 },
    { x: 83, y: 71 },
  ],
};

function fallbackPosition(index) {
  const angle = (index * 137.5 * Math.PI) / 180;
  const radiusX = 34 - (index % 3) * 5;
  const radiusY = 30 - (index % 2) * 5;
  return {
    x: Math.min(88, Math.max(12, 50 + Math.cos(angle) * radiusX)),
    y: Math.min(84, Math.max(16, 50 + Math.sin(angle) * radiusY)),
  };
}

function positionForNode(node, index, tierCounts) {
  const tier = tierPositions[node.resonanceTier] ? node.resonanceTier : "discover";
  const tierIndex = tierCounts[tier] || 0;
  tierCounts[tier] = tierIndex + 1;
  return tierPositions[tier][tierIndex] || fallbackPosition(index);
}

function OrbitCanvas({ currentUser, recommendations = [], todayEncounter }) {
  const [preview, setPreview] = useState(null);
  const positions = useMemo(() => {
    const tierCounts = {};
    return recommendations.map((node, index) => positionForNode(node, index, tierCounts));
  }, [recommendations]);
  const currentName = currentUser?.name || "You";
  const todayEncounterId = todayEncounter?.id;
  const encounterLine = formatOrbitStatusLine(todayEncounter);

  return (
    <>
      <section className="relative mt-[18px] min-h-[calc(100dvh-190px)] overflow-hidden rounded-[22px] border border-atseen-line bg-[radial-gradient(80%_90%_at_50%_45%,#0d1420,#06080B_75%)] sm:h-[440px] sm:min-h-0">
        <OrbitRings />
        <Link
          aria-label="Open your profile"
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center transition hover:scale-105"
          to="/profile"
        >
          <span className="relative inline-flex">
            <FanAvatar className="border-2 border-atseen-blue shadow-glow" name={currentName} size="h-[58px] w-[58px]" src={currentUser?.avatar} />
            {currentUser?.verified ? <VerifiedBadge className="absolute -right-1 bottom-0" /> : null}
          </span>
          <p className="mt-1.5 max-w-[100px] truncate text-[10.5px] font-bold text-atseen-text">You</p>
        </Link>
        {recommendations.slice(0, 12).map((node, index) => (
          <OrbitNode featured={todayEncounterId === node.id} isNew={index < 3 && todayEncounterId !== node.id} key={node.id} node={node} onOpen={setPreview} position={positions[index]} />
        ))}
        <p className="absolute inset-x-0 bottom-3 z-[2] text-center text-[10px] text-atseen-muted">
          tap a light to meet them
        </p>
        {todayEncounter ? (
          <button
            aria-label={`Meet today's encounter, ${todayEncounter.name}. ${todayEncounter.reason}`}
            className="absolute bottom-9 left-4 right-4 z-30 flex items-center gap-3 rounded-2xl border border-atseen-line bg-[#151a24]/95 p-3 text-left shadow-glow backdrop-blur transition hover:border-atseen-blue/45 sm:hidden"
            onClick={() => setPreview(todayEncounter)}
            type="button"
          >
            <FanAvatar name={todayEncounter.name} size="h-11 w-11" src={todayEncounter.avatar} />
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">Today&apos;s Encounter</span>
              <span className="mt-0.5 block truncate text-sm font-extrabold text-atseen-text">{todayEncounter.name}</span>
              {encounterLine ? <span className="mt-0.5 block truncate text-[11px] text-atseen-muted">{encounterLine}</span> : null}
            </span>
            <span className="shrink-0 text-xs font-extrabold text-atseen-blue">Meet</span>
          </button>
        ) : null}
      </section>
      <OrbitProfilePreview node={preview} onClose={() => setPreview(null)} />
    </>
  );
}

export default OrbitCanvas;
