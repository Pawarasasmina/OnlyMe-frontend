import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { adminService } from "../../services/adminService";

function ContentModeration() {
  const queryClient = useQueryClient();
  const contentQuery = useQuery({ queryKey: ["admin", "content"], queryFn: () => adminService.getContent().then((response) => response.data.data.items) });
  const statusMutation = useMutation({
    mutationFn: ({ contentId, status }) => adminService.updateContentStatus(contentId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  if (contentQuery.isLoading) return <Loader label="Loading content..." />;
  if (contentQuery.isError) return <p className="rounded-2xl bg-red-500/10 p-4 text-red-200">Unable to load content.</p>;

  return <div><h2 className="text-3xl font-black">Content moderation</h2><p className="mt-2 text-brand-mist/60">Review published and unpublished creator content.</p>{statusMutation.isError && <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{statusMutation.error.response?.data?.message || "Unable to update content"}</p>}{contentQuery.data.length === 0 ? <p className="mt-7 rounded-3xl border border-dashed border-white/15 p-10 text-center text-brand-mist/55">No content has been created yet.</p> : <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{contentQuery.data.map((item) => { const image = item.images?.find((entry) => entry.isMain) || item.images?.[0]; return <article className="overflow-hidden rounded-3xl border border-white/10 bg-brand-dark/60" key={item._id}>{image && <img alt={item.topic || item.title} className="aspect-[4/3] w-full object-cover" src={image.url} />}<div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{item.topic || item.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.status === "published" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>{item.status}</span></div><p className="mt-2 text-xs text-brand-mist/45">By @{item.creator?.username || "unknown"}</p>{item.description && <p className="mt-3 line-clamp-3 text-sm text-brand-mist/60">{item.description}</p>}<Button className="mt-5 w-full" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ contentId: item._id, status: item.status === "published" ? "draft" : "published" })} variant={item.status === "published" ? "ghost" : "primary"}>{item.status === "published" ? "Unpublish" : "Publish"}</Button></div></article>; })}</div>}</div>;
}

export default ContentModeration;
