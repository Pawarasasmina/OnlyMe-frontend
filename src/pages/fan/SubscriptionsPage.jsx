import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FiClock, FiSearch, FiUsers, FiXCircle } from "react-icons/fi";
import Button from "../../components/common/Button";
import {
  DashboardEmptyState,
  DashboardErrorState,
  FilterPills,
  ListSkeleton,
  PageHeader,
  SectionPanel,
  StatCard,
  SubscriptionCard,
} from "../../components/fan/FanDashboardWidgets";
import { fanService } from "../../services/fanService";

const filters = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expiring Soon", value: "expiringSoon" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
];

function SubscriptionsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const subscriptionsQuery = useQuery({
    queryKey: ["fan", "subscriptions", activeFilter],
    queryFn: () =>
      fanService
        .getSubscriptions({ status: activeFilter })
        .then((response) => response.data.data),
    retry: false,
  });

  const data = subscriptionsQuery.data;
  const summary = data?.summary || {};
  const subscriptions = data?.subscriptions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscriptions"
        title="Creator Subscriptions"
        description="Review active, cancelled, expired, and expiring subscriptions tied to your fan account."
        action={
          <Link to="/">
            <Button type="button" variant="secondary">
              Discover Creators
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          actionLabel="Show Active"
          empty={!summary.active}
          error={subscriptionsQuery.isError}
          help="Current creator memberships."
          icon={FiUsers}
          loading={subscriptionsQuery.isLoading}
          title="Active Subscriptions"
          value={summary.active ?? 0}
        />
        <StatCard
          actionLabel="Review"
          empty={!summary.expiringSoon}
          error={subscriptionsQuery.isError}
          help="Renewals or access ending in the next seven days when dates exist."
          icon={FiClock}
          loading={subscriptionsQuery.isLoading}
          title="Expiring Soon"
          value={summary.expiringSoon ?? 0}
        />
        <StatCard
          actionLabel="Show History"
          empty={!summary.cancelledOrExpired}
          error={subscriptionsQuery.isError}
          help="Subscriptions no longer active."
          icon={FiXCircle}
          loading={subscriptionsQuery.isLoading}
          title="Cancelled or Expired"
          value={summary.cancelledOrExpired ?? 0}
        />
        <StatCard
          error={subscriptionsQuery.isError}
          help="Not shown because subscription pricing is not reliably stored on current records."
          icon={FiSearch}
          loading={subscriptionsQuery.isLoading}
          title="Monthly Spend"
          value="Not available"
        />
      </div>

      <SectionPanel title="All Subscriptions" description="Use filters to narrow the visible subscription records.">
        <FilterPills active={activeFilter} filters={filters} onChange={setActiveFilter} />
        <div className="mt-5">
          {subscriptionsQuery.isLoading ? <ListSkeleton count={4} /> : null}
          {subscriptionsQuery.isError ? (
            <DashboardErrorState message="Unable to load subscriptions." onRetry={() => subscriptionsQuery.refetch()} />
          ) : null}
          {!subscriptionsQuery.isLoading && !subscriptionsQuery.isError && subscriptions.length ? (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <SubscriptionCard key={subscription.id} subscription={subscription} />
              ))}
            </div>
          ) : null}
          {!subscriptionsQuery.isLoading && !subscriptionsQuery.isError && !subscriptions.length ? (
            <DashboardEmptyState
              message="You are not subscribed to any creators yet."
              action={
                <Link to="/">
                  <Button type="button">Discover Creators</Button>
                </Link>
              }
            />
          ) : null}
        </div>
      </SectionPanel>
    </div>
  );
}

export default SubscriptionsPage;
