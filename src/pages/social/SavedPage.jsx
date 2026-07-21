import { useQuery } from "@tanstack/react-query";
import { FiBookmark } from "react-icons/fi";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import SeenCard from "../../components/publication/SeenCard";
import { savedService } from "../../services/savedService";

function EmptySection({ children }) {
  return <div className="rounded-2xl border border-dashed border-atseen-line p-8 text-center text-sm text-atseen-muted">{children}</div>;
}

export default function SavedPage() {
  const query = useQuery({ queryKey: ["saved-content"], queryFn: () => savedService.list().then((response) => response.data.data), retry: false });
  if (query.isLoading) return <div><h1 className="text-3xl font-black">Saved</h1><LoadingSkeleton className="mt-5 h-48" count={2} /></div>;
  if (query.isError) return <div><h1 className="text-3xl font-black">Saved</h1><div className="mt-5 rounded-2xl border border-atseen-line p-8 text-center"><p className="text-atseen-muted">Unable to load saved posts.</p><button className="mt-3 font-bold text-atseen-blue" onClick={() => query.refetch()} type="button">Try again</button></div></div>;
  const seens = query.data?.seens || [];
  const wallPosts = query.data?.wallPosts || [];
  return <div><header><p className="text-[10px] font-bold uppercase tracking-[.2em] text-atseen-muted">Your private collection</p><div className="mt-1 flex items-center gap-3"><FiBookmark className="text-2xl text-atseen-blue" /><h1 className="text-3xl font-black">Saved</h1></div><p className="mt-2 text-sm text-atseen-muted">Only you can see the Seens and Wall posts saved here.</p></header>
    <section className="mt-7"><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-atseen-blue">Seen</p><h2 className="mt-1 text-xl font-black">Saved Seens</h2></div><span className="text-xs text-atseen-muted">{seens.length}</span></div>{seens.length ? <div className="space-y-6">{seens.map((item) => <SeenCard item={item} key={item.id} variant="feed" />)}</div> : <EmptySection>Save a Seen with the bookmark icon and it will appear here.</EmptySection>}</section>
    <section className="mt-10"><div className="mb-1 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-atseen-blue">Wall</p><h2 className="mt-1 text-xl font-black">Saved Wall posts</h2></div><span className="text-xs text-atseen-muted">{wallPosts.length}</span></div>{wallPosts.length ? <div>{wallPosts.map((post) => <FeedPost key={post.id} post={post} />)}</div> : <div className="mt-4"><EmptySection>Save a Wall post with the bookmark icon and it will appear here.</EmptySection></div>}</section>
  </div>;
}
