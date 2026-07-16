import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiClock, FiRefreshCw } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCard from "../../components/fanWeb/shared/FanCard";
import EmptyState from "../../components/fanWeb/shared/EmptyState";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { atseenCreators, atseenMockActivity } from "../../data/atseenMockData";
import { fanService } from "../../services/fanService";
import { formatDateTime } from "../../utils/fanDashboardFormatters";

function normalizeActivity(item) {
  if (item.creatorId) {
    return item;
  }

  return {
    id: item.id,
    creatorId: item.relatedCreator?.username || "lina",
    description: item.description,
    time: formatDateTime(item.createdAt),
    type: item.type,
  };
}

function ActivityItem({ item }) {
  const creator = atseenCreators[item.creatorId] || atseenCreators.lina;

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] py-3.5">
      <FanAvatar name={creator.name} size="h-[38px] w-[38px]" src={creator.avatar} />
      <div className="min-w-0 flex-1 text-sm leading-6 text-atseen-text">
        <span className="font-bold">{creator.name.split(" ")[0]}</span>{" "}
        <span className="text-white/85">{item.description.replace(creator.name.split(" ")[0], "").trim()}</span>
        {item.amount ? <span className="font-bold text-atseen-blue"> +✦{item.amount}</span> : null}
      </div>
      <span className="shrink-0 text-[10px] text-atseen-muted">{item.time}</span>
    </div>
  );
}

function ActivityPage() {
  const activityQuery = useQuery({
    queryKey: ["fan", "activity"],
    queryFn: () => fanService.getActivity({ limit: 100 }).then((response) => response.data.data.activity),
    retry: false,
  });

  const activity = useMemo(() => {
    const backend = activityQuery.data || [];
    return (backend.length ? backend : atseenMockActivity).map(normalizeActivity);
  }, [activityQuery.data]);

  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">Activity</h1>
      {activityQuery.isLoading ? <div className="mt-5"><LoadingSkeleton count={6} /></div> : null}
      {activityQuery.isError ? (
        <FanCard className="mt-5 border-atseen-danger/25 bg-atseen-danger/10">
          <p className="font-semibold text-atseen-danger">Unable to load recent activity.</p>
          <button
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-2 text-sm font-semibold text-atseen-text"
            onClick={() => activityQuery.refetch()}
            type="button"
          >
            <FiRefreshCw aria-hidden="true" /> Retry
          </button>
        </FanCard>
      ) : null}
      {!activityQuery.isLoading && !activityQuery.isError ? (
        <>
          <FanCard className="mt-[18px] flex items-center gap-3">
            <span className="flex shrink-0">
              {["lina", "omar", "anna"].map((id, index) => (
                <FanAvatar
                  className={`${index ? "-ml-2" : ""} blur-[3px]`}
                  key={id}
                  name={atseenCreators[id].name}
                  size="h-8 w-8"
                  src={atseenCreators[id].avatar}
                />
              ))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-atseen-text">✦ 14 people saw you today</p>
              <p className="text-[11px] text-atseen-muted">Who exactly stays private · signals are always free ✦</p>
            </div>
          </FanCard>
          {activity.length ? (
            <div className="mt-5">
              <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Today</p>
              {activity.slice(0, 3).map((item) => (
                <ActivityItem item={item} key={item.id} />
              ))}
              <p className="mb-1 mt-6 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Earlier</p>
              {activity.slice(3).map((item) => (
                <ActivityItem item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState icon={FiClock} message="No recent activity to show." />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default ActivityPage;
