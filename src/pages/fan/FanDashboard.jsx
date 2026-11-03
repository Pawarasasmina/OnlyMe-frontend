/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiCreditCard, FiLock, FiMail, FiMessageCircle, FiUsers } from "react-icons/fi";
import Button from "../../components/common/Button";
import {
  ActivityRow,
  ConversationPreviewRow,
  DashboardEmptyState,
  DashboardErrorState,
  DisabledActionNotice,
  ListSkeleton,
  PageHeader,
  ProfileSummaryCard,
  PurchasedContentCard,
  QuickActions,
  SectionPanel,
  StatCard,
  SubscriptionCard,
  WalletTransactionRow,
} from "../../components/fan/FanDashboardWidgets";
import { useAuth } from "../../hooks/useAuth";
import { fanService } from "../../services/fanService";
import { formatCoins } from "../../utils/fanDashboardFormatters";

const sectionLinkClass =
  "inline-flex w-fit rounded-full text-sm font-semibold text-brand-secondary outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark";

function pluralize(count, singular, plural = `${singular}s`) {
  return Number(count) === 1 ? singular : plural;
}

function FanDashboard() {
  __useUiLanguage();
  const { user, loading: authLoading } = useAuth();
  const dashboardQuery = useQuery({
    queryKey: ["fan", "dashboard"],
    queryFn: () => fanService.getDashboard().then((response) => response.data.data),
    enabled: Boolean(user) && !authLoading,
    retry: false,
  });

  const data = dashboardQuery.data;
  const profile = data?.profile;
  const summary = data?.summary || {};
  const isLoading = dashboardQuery.isLoading || authLoading;
  const hasError = dashboardQuery.isError;
  const displayName = profile?.displayName || user?.name || profile?.username || user?.username || "fan";
  const hasWalletTransactions = Boolean(data?.wallet?.recentTransactions?.length);
  const walletBalance = Number(data?.wallet?.balance || 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Overview"
        title={__msg("fan.welcomeBack", { value0: displayName })}
        description={__msg("fan.manageYourSubscriptionsWalletPurchasesAndCreatorInteractionsFrom")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          actionLabel="View Subscriptions"
          empty={!summary.activeSubscriptions}
          error={hasError}
          help={`${summary.activeSubscriptions || 0} ${pluralize(summary.activeSubscriptions, "creator")} currently supported.`}
          icon={FiUsers}
          loading={isLoading}
          title={__msg("fan.activeSubscriptions")}
          to="/fan/subscriptions"
          value={summary.activeSubscriptions ?? 0}
        />
        <StatCard
          actionLabel="Open Wallet"
          empty={!summary.coinBalance}
          error={hasError}
          help="Available balance from your wallet ledger."
          icon={FiCreditCard}
          loading={isLoading}
          title={__msg("fan.starBalance")}
          to="/fan/wallet"
          value={formatCoins(summary.coinBalance)}
        />
        <StatCard
          actionLabel="View Purchases"
          empty={!summary.purchasedContentCount}
          error={hasError}
          help={`${summary.purchasedContentCount || 0} paid ${pluralize(summary.purchasedContentCount, "item")} available to you.`}
          icon={FiLock}
          loading={isLoading}
          title={__msg("fan.purchasedContent")}
          to="/fan/purchases"
          value={summary.purchasedContentCount ?? 0}
        />
        <StatCard
          actionLabel="Open Messages"
          empty={!summary.unreadMessages}
          error={hasError}
          help={`${summary.unreadMessages || 0} unread ${pluralize(summary.unreadMessages, "message")} from creators.`}
          icon={FiMail}
          loading={isLoading}
          title={__msg("fan.unreadMessages")}
          to="/fan/messages"
          value={summary.unreadMessages ?? 0}
        />
      </div>

      <ProfileSummaryCard
        error={dashboardQuery.isError}
        loading={isLoading}
        onRetry={() => dashboardQuery.refetch()}
        profile={profile}
      />

      <SectionPanel title={__msg("fan.quickActions")} description={__msg("fan.jumpIntoTheFanWorkflowsAvailableInThisBuild")}>
        {isLoading ? <ListSkeleton count={1} /> : <QuickActions capabilities={data?.capabilities} />}
        {!isLoading && !data?.capabilities?.coinPurchase ? (
          <div className="mt-3">
            <DisabledActionNotice>{__msg("fan.starPurchasingWillBeAvailableAfterThePaymentModule")}</DisabledActionNotice>
          </div>
        ) : null}
      </SectionPanel>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionPanel
          action={<Link className={sectionLinkClass} to="/fan/subscriptions">{__msg("fan.viewAllSubscriptions")}</Link>}
          description={__msg("fan.upToThreeRecentActiveSubscriptions")}
          title={__msg("fan.activeSubscriptions")}
        >
          {isLoading ? <ListSkeleton /> : null}
          {hasError ? <DashboardErrorState onRetry={() => dashboardQuery.refetch()} /> : null}
          {!isLoading && !hasError && data?.subscriptions?.length ? (
            <div className="space-y-3">
              {data.subscriptions.slice(0, 3).map((subscription) => (
                <SubscriptionCard key={subscription.id} showManage={Boolean(data?.capabilities?.subscriptionManagement)} subscription={subscription} />
              ))}
            </div>
          ) : null}
          {!isLoading && !hasError && !data?.subscriptions?.length ? (
            <DashboardEmptyState
              message={__msg("fan.youAreNotSubscribedToAnyCreatorsYet")}
              action={
                <Link to="/">
                  <Button type="button">{__msg("fan.discoverCreators")}</Button>
                </Link>
              }
            />
          ) : null}
        </SectionPanel>

        <SectionPanel
          action={<Link className={sectionLinkClass} to="/fan/wallet">{__msg("fan.viewFullWallet")}</Link>}
          description={__msg("fan.currentBalanceAndRecentWalletActivity")}
          title={__msg("profile.wallet")}
        >
          {isLoading ? <ListSkeleton /> : null}
          {hasError ? <DashboardErrorState onRetry={() => dashboardQuery.refetch()} /> : null}
          {!isLoading && !hasError ? (
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-brand-mist/60">{__msg("fan.availableBalance")}</p>
              <p className="mt-1 text-3xl font-black text-white">{formatCoins(walletBalance)}</p>
            </div>
          ) : null}
          {!isLoading && !hasError && hasWalletTransactions ? (
            <div className="space-y-3">
              {data.wallet.recentTransactions.slice(0, 5).map((transaction) => (
                <WalletTransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : null}
          {!isLoading && !hasError && !hasWalletTransactions && walletBalance === 0 ? (
            <DashboardEmptyState icon={FiCreditCard} message={__msg("fan.yourStarBalanceIsCurrentlyEmpty")} />
          ) : null}
          {!isLoading && !hasError && !hasWalletTransactions && walletBalance > 0 ? (
            <DashboardEmptyState icon={FiCreditCard} message={__msg("fan.noRecentWalletActivity")} />
          ) : null}
        </SectionPanel>

        <SectionPanel
          action={<Link className={sectionLinkClass} to="/fan/purchases">{__msg("fan.viewAllPurchasedContent")}</Link>}
          description={__msg("fan.recentPaidContentUnlockedByThisFanAccount")}
          title={__msg("fan.purchasedContent")}
        >
          {isLoading ? <ListSkeleton /> : null}
          {hasError ? <DashboardErrorState onRetry={() => dashboardQuery.refetch()} /> : null}
          {!isLoading && !hasError && data?.purchasedContent?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.purchasedContent.slice(0, 4).map((item) => (
                <PurchasedContentCard item={item} key={item.id} />
              ))}
            </div>
          ) : null}
          {!isLoading && !hasError && !data?.purchasedContent?.length ? (
            <DashboardEmptyState icon={FiLock} message={__msg("fan.youHaveNotUnlockedAnyPaidContentYet")} />
          ) : null}
        </SectionPanel>

        <SectionPanel
          action={<Link className={sectionLinkClass} to="/fan/messages">{__msg("fan.viewAllMessages")}</Link>}
          description={__msg("fan.recentCreatorConversations")}
          title={__msg("share.messages")}
        >
          {isLoading ? <ListSkeleton /> : null}
          {hasError ? <DashboardErrorState onRetry={() => dashboardQuery.refetch()} /> : null}
          {!isLoading && !hasError && data?.messages?.recentConversations?.length ? (
            <div className="space-y-3">
              {data.messages.recentConversations.slice(0, 5).map((conversation) => (
                <ConversationPreviewRow conversation={conversation} key={conversation.id} />
              ))}
            </div>
          ) : null}
          {!isLoading && !hasError && !data?.messages?.recentConversations?.length ? (
            <DashboardEmptyState icon={FiMessageCircle} message={__msg("fan.youDoNotHaveAnyConversationsYet")} />
          ) : null}
        </SectionPanel>
      </div>

      <SectionPanel
        action={<Link className={sectionLinkClass} to="/fan/activity">{__msg("fan.viewRecentActivity")}</Link>}
        description={__msg("fan.latestRealAccountEventsFromSubscriptionsWalletMessagesAnd")}
        title={__msg("fan.recentActivity")}
      >
        {isLoading ? <ListSkeleton count={4} /> : null}
        {hasError ? <DashboardErrorState onRetry={() => dashboardQuery.refetch()} /> : null}
        {!isLoading && !hasError && data?.recentActivity?.length ? (
          <div className="space-y-3">
            {data.recentActivity.slice(0, 8).map((activity) => (
              <ActivityRow activity={activity} key={activity.id} />
            ))}
          </div>
        ) : null}
        {!isLoading && !hasError && !data?.recentActivity?.length ? (
          <DashboardEmptyState message={__msg("fan.noRecentActivityToShow")} />
        ) : null}
      </SectionPanel>
    </div>
  );
}

export default FanDashboard;
