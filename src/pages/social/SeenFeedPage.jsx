import { useQuery } from "@tanstack/react-query";
import SeenCard from "../../components/publication/SeenCard";
import { publicationService } from "../../services/publicationService";

export default function SeenFeedPage() {
  const query = useQuery({ queryKey: ["published-seens"], queryFn: () => publicationService.listPublishedSeens({ limit: 30 }).then((response) => response.data.data.items || []), retry: false });
  return <div className="seen-feed-page"><header className="seen-feed-heading"><h1>Seen</h1><p>Friends</p></header>{query.isLoading ? <div className="mt-5 space-y-5"><div className="h-[520px] animate-pulse rounded-3xl bg-atseen-surface"/><div className="h-[520px] animate-pulse rounded-3xl bg-atseen-surface"/></div> : query.isError ? <div className="mt-6 rounded-2xl border border-atseen-line p-10 text-center"><p className="text-atseen-muted">Unable to load Seen.</p><button className="mt-4 font-bold text-atseen-blue" onClick={() => query.refetch()}>Try again</button></div> : query.data.length ? <div className="mt-5 space-y-6">{query.data.map((item) => <SeenCard item={item} key={item.id} variant="feed" />)}</div> : <div className="mt-6 rounded-3xl border border-dashed border-atseen-line p-12 text-center"><span className="text-3xl text-atseen-blue">◉</span><h2 className="mt-4 font-black">A young Seen</h2><p className="mt-2 text-sm text-atseen-muted">Published free Seens will appear here.</p></div>}</div>;
}
