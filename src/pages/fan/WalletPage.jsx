/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiClock, FiCreditCard, FiDownload, FiMinusCircle, FiPlusCircle, FiRefreshCw } from "react-icons/fi";
import Button from "../../components/common/Button";
import {
  DashboardEmptyState,
  DashboardErrorState,
  DisabledActionNotice,
  FilterPills,
  ListSkeleton,
  PageHeader,
  SectionPanel,
  StatCard,
  WalletTransactionRow,
} from "../../components/fan/FanDashboardWidgets";
import { fanService } from "../../services/fanService";
import { formatCoins } from "../../utils/fanDashboardFormatters";

const filters = [
  { get label() { return __msg("fanWeb.all"); }, value: "all" },
  { get label() { return __msg("fan.credits"); }, value: "credit" },
  { get label() { return __msg("fan.debits"); }, value: "debit" },
  { get label() { return __msg("fan.captured"); }, value: "completed" },
  { get label() { return __msg("fan.held_87807a"); }, value: "pending" },
];

function WalletPage() {
  __useUiLanguage();
  const [filter, setFilter] = useState("all");
  const walletQuery = useQuery({
    queryKey: ["fan", "wallet"],
    queryFn: () => fanService.getWallet({ limit: 100 }).then((response) => response.data.data.wallet),
    retry: false,
  });

  const wallet = walletQuery.data;
  const filteredTransactions = useMemo(() => {
    const transactions = wallet?.recentTransactions || [];

    if (filter === "all") {
      return transactions;
    }

    if (filter === "credit" || filter === "debit") {
      return transactions.filter((transaction) => transaction.direction === filter);
    }

    return transactions.filter((transaction) => transaction.status === filter);
  }, [filter, wallet?.recentTransactions]);

  const summary = wallet?.summary || {};
  const isZeroBalance = !walletQuery.isLoading && !walletQuery.isError && Number(wallet?.balance || 0) === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wallet"
        title={__msg("fan.starWallet")}
        description={__msg("fan.trackYourAvailableStarsHeldStarsAndLedgerActivity")}
        action={
          <Button disabled type="button">{__msg("fan.buyStars")}</Button>
        }
      />

      <DisabledActionNotice>{__msg("fan.starPurchasingIsNotWiredToAPaymentProvider")}</DisabledActionNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          empty={isZeroBalance}
          error={walletQuery.isError}
          help="Available spendable balance."
          icon={FiCreditCard}
          loading={walletQuery.isLoading}
          title={__msg("fan.availableBalance_396a22")}
          value={formatCoins(wallet?.balance || 0)}
        />
        <StatCard
          empty={!summary.totalHeld}
          error={walletQuery.isError}
          help="Stars held for pending Direct Access."
          icon={FiClock}
          loading={walletQuery.isLoading}
          title={__msg("fan.heldStars")}
          value={formatCoins(summary.totalHeld || 0)}
        />
        <StatCard
          empty={!summary.totalPurchased}
          error={walletQuery.isError}
          help="Completed credit transactions."
          icon={FiPlusCircle}
          loading={walletQuery.isLoading}
          title={__msg("fan.purchasedStars")}
          value={formatCoins(summary.totalPurchased || 0)}
        />
        <StatCard
          empty={!summary.totalSpent}
          error={walletQuery.isError}
          help="Completed debit transactions."
          icon={FiMinusCircle}
          loading={walletQuery.isLoading}
          title={__msg("fan.spentStars")}
          value={formatCoins(summary.totalSpent || 0)}
        />
        <StatCard
          empty={!summary.totalRefunded}
          error={walletQuery.isError}
          help="Stars returned from expired or cancelled requests."
          icon={FiRefreshCw}
          loading={walletQuery.isLoading}
          title={__msg("fan.refunds")}
          value={formatCoins(summary.totalRefunded || 0)}
        />
        <StatCard
          empty={!summary.recentTransactionCount}
          error={walletQuery.isError}
          help="Transactions currently loaded."
          icon={FiDownload}
          loading={walletQuery.isLoading}
          title={__msg("fan.recentTransactions")}
          value={summary.recentTransactionCount ?? 0}
        />
      </div>

      <SectionPanel title={__msg("fan.transactionHistory")} description={__msg("fan.creditsAndDebitsRecordedForThisFanWallet")}>
        <FilterPills active={filter} filters={filters} onChange={setFilter} />
        <div className="mt-5">
          {walletQuery.isLoading ? <ListSkeleton count={5} /> : null}
          {walletQuery.isError ? <DashboardErrorState message={__msg("fan.unableToLoadWalletData")} onRetry={() => walletQuery.refetch()} /> : null}
          {!walletQuery.isLoading && !walletQuery.isError && filteredTransactions.length ? (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <WalletTransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : null}
          {!walletQuery.isLoading && !walletQuery.isError && !filteredTransactions.length ? (
            <DashboardEmptyState icon={FiCreditCard} message={__msg("fan.yourStarBalanceIsCurrentlyEmpty")} />
          ) : null}
        </div>
      </SectionPanel>
    </div>
  );
}

export default WalletPage;
