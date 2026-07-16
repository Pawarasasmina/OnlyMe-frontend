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
  { label: "All", value: "all" },
  { label: "Credits", value: "credit" },
  { label: "Debits", value: "debit" },
  { label: "Captured", value: "completed" },
  { label: "Held", value: "pending" },
];

function WalletPage() {
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
        title="Star Wallet"
        description="Track your available Stars, held Stars, and ledger activity. 10 Stars = $1."
        action={
          <Button disabled type="button">
            Buy Stars
          </Button>
        }
      />

      <DisabledActionNotice>Star purchasing is not wired to a payment provider yet, so the balance cannot be changed from the frontend.</DisabledActionNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          empty={isZeroBalance}
          error={walletQuery.isError}
          help="Available spendable balance."
          icon={FiCreditCard}
          loading={walletQuery.isLoading}
          title="Available Balance"
          value={formatCoins(wallet?.balance || 0)}
        />
        <StatCard
          empty={!summary.totalHeld}
          error={walletQuery.isError}
          help="Stars held for pending Direct Access."
          icon={FiClock}
          loading={walletQuery.isLoading}
          title="Held Stars"
          value={formatCoins(summary.totalHeld || 0)}
        />
        <StatCard
          empty={!summary.totalPurchased}
          error={walletQuery.isError}
          help="Completed credit transactions."
          icon={FiPlusCircle}
          loading={walletQuery.isLoading}
          title="Purchased Stars"
          value={formatCoins(summary.totalPurchased || 0)}
        />
        <StatCard
          empty={!summary.totalSpent}
          error={walletQuery.isError}
          help="Completed debit transactions."
          icon={FiMinusCircle}
          loading={walletQuery.isLoading}
          title="Spent Stars"
          value={formatCoins(summary.totalSpent || 0)}
        />
        <StatCard
          empty={!summary.totalRefunded}
          error={walletQuery.isError}
          help="Stars returned from expired or cancelled requests."
          icon={FiRefreshCw}
          loading={walletQuery.isLoading}
          title="Refunds"
          value={formatCoins(summary.totalRefunded || 0)}
        />
        <StatCard
          empty={!summary.recentTransactionCount}
          error={walletQuery.isError}
          help="Transactions currently loaded."
          icon={FiDownload}
          loading={walletQuery.isLoading}
          title="Recent Transactions"
          value={summary.recentTransactionCount ?? 0}
        />
      </div>

      <SectionPanel title="Transaction History" description="Credits and debits recorded for this fan wallet.">
        <FilterPills active={filter} filters={filters} onChange={setFilter} />
        <div className="mt-5">
          {walletQuery.isLoading ? <ListSkeleton count={5} /> : null}
          {walletQuery.isError ? <DashboardErrorState message="Unable to load wallet data." onRetry={() => walletQuery.refetch()} /> : null}
          {!walletQuery.isLoading && !walletQuery.isError && filteredTransactions.length ? (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <WalletTransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : null}
          {!walletQuery.isLoading && !walletQuery.isError && !filteredTransactions.length ? (
            <DashboardEmptyState icon={FiCreditCard} message="Your Star balance is currently empty." />
          ) : null}
        </div>
      </SectionPanel>
    </div>
  );
}

export default WalletPage;
