/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
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
  { get label() { return __msg("fanWeb.all"); }, value: "all" },
  { get label() { return __msg("fan.active"); }, value: "active" },
  { get label() { return __msg("fan.expiringSoon_50b61e"); }, value: "expiringSoon" },
  { get label() { return __msg("fan.cancelled"); }, value: "cancelled" },
  { get label() { return __msg("fan.expired"); }, value: "expired" },
];

function SubscriptionsPage() {
  __useUiLanguage();
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
        title={__msg("fan.creatorSubscriptions")}
        description={__msg("fan.reviewActiveCancelledExpiredAndExpiringSubscriptionsTiedTo")}
        action={
          <Link to="/">
            <Button type="button" variant="secondary">{__msg("fan.discoverCreators")}</Button>
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
          title={__msg("fan.activeSubscriptions")}
          value={summary.active ?? 0}
        />
        <StatCard
          actionLabel="Review"
          empty={!summary.expiringSoon}
          error={subscriptionsQuery.isError}
          help="Renewals or access ending in the next seven days when dates exist."
          icon={FiClock}
          loading={subscriptionsQuery.isLoading}
          title={__msg("fan.expiringSoon_50b61e")}
          value={summary.expiringSoon ?? 0}
        />
        <StatCard
          actionLabel="Show History"
          empty={!summary.cancelledOrExpired}
          error={subscriptionsQuery.isError}
          help="Subscriptions no longer active."
          icon={FiXCircle}
          loading={subscriptionsQuery.isLoading}
          title={__msg("fan.cancelledOrExpired")}
          value={summary.cancelledOrExpired ?? 0}
        />
        <StatCard
          error={subscriptionsQuery.isError}
          help="Not shown because subscription pricing is not reliably stored on current records."
          icon={FiSearch}
          loading={subscriptionsQuery.isLoading}
          title={__msg("fan.monthlySpend")}
          value="Not available"
        />
      </div>

      <SectionPanel title={__msg("fan.allSubscriptions")} description={__msg("fan.useFiltersToNarrowTheVisibleSubscriptionRecords")}>
        <FilterPills active={activeFilter} filters={filters} onChange={setActiveFilter} />
        <div className="mt-5">
          {subscriptionsQuery.isLoading ? <ListSkeleton count={4} /> : null}
          {subscriptionsQuery.isError ? (
            <DashboardErrorState message={__msg("fan.unableToLoadSubscriptions")} onRetry={() => subscriptionsQuery.refetch()} />
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
              message={__msg("fan.youAreNotSubscribedToAnyCreatorsYet")}
              action={
                <Link to="/">
                  <Button type="button">{__msg("fan.discoverCreators")}</Button>
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
