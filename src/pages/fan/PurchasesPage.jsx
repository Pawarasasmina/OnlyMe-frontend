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
  { label: "All", value: "all" },
  { label: "Photo", value: "photo" },
  { label: "Video", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Text", value: "text" },
  { label: "Bundle", value: "bundle" },
];

function PurchasesPage() {
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
        title="Purchased Content"
        description="Paid content unlocked by your authenticated fan account will appear here when purchase records are available."
      />

      <SectionPanel title="Unlocked Content" description="Only content authorized for this fan account is requested from the backend.">
        <FilterPills active={filter} filters={filters} onChange={setFilter} />
        <div className="mt-5">
          {purchasesQuery.isLoading ? <ListSkeleton count={4} /> : null}
          {purchasesQuery.isError ? <DashboardErrorState message="Unable to load purchased content." onRetry={() => purchasesQuery.refetch()} /> : null}
          {!purchasesQuery.isLoading && !purchasesQuery.isError && filteredItems.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <PurchasedContentCard item={item} key={item.id} />
              ))}
            </div>
          ) : null}
          {!purchasesQuery.isLoading && !purchasesQuery.isError && !filteredItems.length ? (
            <DashboardEmptyState icon={FiLock} message="You have not unlocked any paid content yet." />
          ) : null}
        </div>
      </SectionPanel>
    </div>
  );
}

export default PurchasesPage;
