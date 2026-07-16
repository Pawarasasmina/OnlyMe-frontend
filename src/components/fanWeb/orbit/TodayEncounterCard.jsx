import FanAvatar from "../shared/FanAvatar";
import FanCard from "../shared/FanCard";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { atseenCreators } from "../../../data/atseenMockData";

function TodayEncounterCard() {
  const creator = atseenCreators.omar;
  const { showToast } = useFanToast();

  return (
    <div>
      <p className="mb-3 mt-6 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Today’s Encounter</p>
      <FanCard className="flex items-center gap-4">
        <FanAvatar name={creator.name} size="h-[66px] w-[66px]" src={creator.avatar} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[15px] font-bold text-atseen-text">
            {creator.name}
            {creator.verified ? <VerifiedBadge /> : null}
          </p>
          <p className="mt-1 text-[11.5px] text-atseen-muted">
            {creator.statusEmoji} {creator.status} · {creator.location}
          </p>
          <p className="mt-2 text-[12.5px] font-semibold text-atseen-blue">{creator.reason}</p>
        </div>
        <button
          className="shrink-0 rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-xs font-semibold text-atseen-text transition hover:border-atseen-blue/50"
          onClick={() => showToast("Omar’s creator preview opens from the orbit map.")}
          type="button"
        >
          Meet
        </button>
      </FanCard>
    </div>
  );
}

export default TodayEncounterCard;
