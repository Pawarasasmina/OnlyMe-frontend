import { useQuery } from "@tanstack/react-query";
import { FiClock, FiRefreshCw } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCard from "../../components/fanWeb/shared/FanCard";
import EmptyState from "../../components/fanWeb/shared/EmptyState";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { fanService } from "../../services/fanService";
import { formatDateTime } from "../../utils/fanDashboardFormatters";

function ActivityItem({ item }) {
  const creator = item.relatedCreator;
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] py-3.5">
      <FanAvatar name={creator?.displayName || "Activity"} size="h-[38px] w-[38px]" src={creator?.avatarUrl} />
      <p className="min-w-0 flex-1 text-sm leading-6 text-white/85">{item.description}</p>
      <span className="shrink-0 text-[10px] text-atseen-muted">{formatDateTime(item.createdAt)}</span>
    </div>
  );
}

function ActivityPage() {
  const activityQuery = useQuery({
    queryKey: ["fan", "activity"],
    queryFn: () => fanService.getActivity({ limit: 100 }).then((response) => response.data.data.activity),
    retry: false,
  });
  const activity = activityQuery.data || [];

  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">Activity</h1>
      {activityQuery.isLoading ? <div className="mt-5"><LoadingSkeleton count={6} /></div> : null}
      {activityQuery.isError ? <FanCard className="mt-5 border-atseen-danger/25 bg-atseen-danger/10"><p className="font-semibold text-atseen-danger">Unable to load recent activity.</p><button className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-atseen-blue" onClick={() => activityQuery.refetch()} type="button"><FiRefreshCw /> Retry</button></FanCard> : null}
      {!activityQuery.isLoading && !activityQuery.isError && activity.length ? <div className="mt-5">{activity.map((item) => <ActivityItem item={item} key={item.id} />)}</div> : null}
      {!activityQuery.isLoading && !activityQuery.isError && !activity.length ? <div className="mt-5"><EmptyState icon={FiClock} message="No recent activity to show." /></div> : null}
    </div>
  );
}

export default ActivityPage;
