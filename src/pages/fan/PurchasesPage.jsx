/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiLock } from "react-icons/fi";
import {
  DashboardEmptyState,
  DashboardErrorState,
  FilterPills,
  ListSkeleton,
  PageHeader,
  PurchasedContentCard,
  SectionPanel,
} from "../../components/fan/FanDashboardWidgets";
import { fanService } from "../../services/fanService";

const filters = [
  { get label() { return __msg("fanWeb.all"); }, value: "all" },
  { get label() { return __msg("fanWeb.photo"); }, value: "photo" },
  { get label() { return __msg("profile.video"); }, value: "video" },
  { get label() { return __msg("fan.audio_acdac2"); }, value: "audio" },
  { get label() { return __msg("fan.text"); }, value: "text" },
  { get label() { return __msg("fan.bundle"); }, value: "bundle" },
];

function PurchasesPage() {
  __useUiLanguage();
  const [filter, setFilter] = useState("all");
  const purchasesQuery = useQuery({
    queryKey: ["fan", "purchases"],
    queryFn: () => fanService.getPurchases().then((response) => response.data.data),
    retry: false,
  });

  const filteredItems = useMemo(() => {
    const items = purchasesQuery.data?.items || [];

    if (filter === "all") {
      return items;
    }

    return items.filter((item) => item.contentType === filter);
  }, [filter, purchasesQuery.data?.items]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Purchases"
        title={__msg("fan.purchasedContent")}
        description={__msg("fan.paidContentUnlockedByYourAuthenticatedFanAccountWill")}
      />

      <SectionPanel title={__msg("fan.unlockedContent")} description={__msg("fan.onlyContentAuthorizedForThisFanAccountIsRequested")}>
        <FilterPills active={filter} filters={filters} onChange={setFilter} />
        <div className="mt-5">
          {purchasesQuery.isLoading ? <ListSkeleton count={4} /> : null}
          {purchasesQuery.isError ? <DashboardErrorState message={__msg("fan.unableToLoadPurchasedContent")} onRetry={() => purchasesQuery.refetch()} /> : null}
          {!purchasesQuery.isLoading && !purchasesQuery.isError && filteredItems.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <PurchasedContentCard item={item} key={item.id} />
              ))}
            </div>
          ) : null}
          {!purchasesQuery.isLoading && !purchasesQuery.isError && !filteredItems.length ? (
            <DashboardEmptyState icon={FiLock} message={__msg("fan.youHaveNotUnlockedAnyPaidContentYet")} />
          ) : null}
        </div>
      </SectionPanel>
    </div>
  );
}

export default PurchasesPage;
