import { useState } from "react";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { atseenCreators, atseenOrbitPositions, atseenWorlds } from "../../../data/atseenMockData";

function OrbitMap({ currentUser }) {
  const { showToast } = useFanToast();
  const [preview, setPreview] = useState(null);

  const worldForCreator = (creatorId) => atseenWorlds.find((world) => world.creatorId === creatorId);
  const creators = Object.values(atseenCreators);

  return (
    <>
      <div className="relative mt-[18px] h-[380px] overflow-hidden rounded-[22px] border border-atseen-line bg-[radial-gradient(80%_90%_at_50%_45%,#0d1420,#06080B_75%)]">
        {[
          [520, 190],
          [380, 140],
          [250, 92],
        ].map(([width, height]) => (
          <div className="atseen-orbit-ring" key={width} style={{ width, height }} />
        ))}
        {[
          [12, 14],
          [88, 20],
          [7, 55],
          [93, 64],
          [24, 90],
          [70, 92],
          [45, 6],
          [58, 95],
        ].map(([left, top], index) => (
          <span
            className="atseen-twinkle absolute h-[2.5px] w-[2.5px] rounded-full bg-atseen-blue"
            key={`${left}-${top}`}
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 0.25}s` }}
          />
        ))}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
          <FanAvatar className="border-2 border-atseen-blue shadow-glow" name={currentUser.name} size="h-[58px] w-[58px]" src={currentUser.avatar} />
          <p className="mt-1.5 text-[10.5px] font-bold text-atseen-text">You</p>
        </div>
        {creators.map((creator) => {
          const [left, top] = atseenOrbitPositions[creator.id];
          const world = worldForCreator(creator.id);

          return (
            <button
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center transition duration-200 hover:scale-110"
              key={creator.id}
              onClick={() => setPreview(creator)}
              style={{ left: `${left}%`, top: `${top}%` }}
              type="button"
            >
              <span className="relative inline-block">
                <FanAvatar className="border-2 border-atseen-blue/45 shadow-glow" name={creator.name} size="h-11 w-11" src={creator.avatar} />
                {world ? <span className="absolute -right-2 -top-3 text-base drop-shadow">{world.worldEmoji}</span> : null}
              </span>
              <span className="mt-1 block text-[10px] font-bold text-atseen-text drop-shadow">{creator.name.split(" ")[0]}</span>
            </button>
          );
        })}
        <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-atseen-muted">tap a light to meet them ✦</p>
      </div>

      <FanModal isOpen={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name || "Creator preview"}>
        {preview ? (
          <div>
            <div className="flex items-center gap-4">
              <FanAvatar className="border-2 border-atseen-blue/45" name={preview.name} size="h-16 w-16" src={preview.avatar} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-lg font-bold text-atseen-text">
                  {preview.name}
                  {preview.verified ? <VerifiedBadge /> : null}
                </p>
                <p className="text-sm text-atseen-muted">
                  {preview.statusEmoji} {preview.status} · {preview.location}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-atseen-blue/20 bg-atseen-blue/10 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">Why You Two</p>
              <p className="mt-2 text-sm font-semibold text-atseen-text">{preview.reason}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-sm font-semibold text-atseen-text transition hover:border-atseen-blue/50"
                onClick={() => showToast(`Private signal sent to ${preview.name.split(" ")[0]}.`)}
                type="button"
              >
                I see you
              </button>
              <button
                className="flex-1 rounded-xl bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-4 py-3 text-sm font-bold text-atseen-bg"
                onClick={() => showToast("Messages live in the app.")}
                type="button"
              >
                Message
              </button>
            </div>
          </div>
        ) : null}
      </FanModal>
    </>
  );
}

export default OrbitMap;
