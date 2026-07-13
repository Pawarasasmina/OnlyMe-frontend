import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiFileText } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { adminService } from "../../services/adminService";

function ContentModeration() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const contentQuery = useQuery({ queryKey: ["admin", "content"], queryFn: () => adminService.getContent().then((response) => response.data.data.items) });
  const statusMutation = useMutation({ mutationFn: ({ contentId, status }) => adminService.updateContentStatus(contentId, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }) });
  const items = useMemo(() => (contentQuery.data || []).filter((item) => filter === "all" || item.status === filter), [contentQuery.data, filter]);

  if (contentQuery.isLoading) return <div className="text-slate-600"><Loader label="Loading content..." /></div>;
  if (contentQuery.isError) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Unable to load content.</p>;

  return <div className="mx-auto max-w-[1600px]"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Safety</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Content moderation</h1><p className="mt-1 text-sm text-slate-500">Review and control creator publications.</p></div><div className="flex rounded-xl border border-slate-200 bg-white p-1">{["all", "published", "draft"].map((status) => <button className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${filter === status ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`} key={status} onClick={() => setFilter(status)} type="button">{status}</button>)}</div></div>
    {statusMutation.isError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{statusMutation.error.response?.data?.message || "Unable to update content"}</p>}
    {!items.length ? <div className="mt-6 grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-center"><div><FiFileText className="mx-auto text-4xl text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No content in this view</p></div></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{items.map((item) => { const image = item.images?.find((entry) => entry.isMain) || item.images?.[0]; return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={item._id}><div className="relative bg-slate-100">{image ? <img alt={item.topic || item.title} className="aspect-[16/10] w-full object-cover" src={image.url} /> : <div className="grid aspect-[16/10] place-items-center"><FiFileText className="text-3xl text-slate-300" /></div>}<span className={`absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-black uppercase shadow-sm ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{item.status}</span></div><div className="p-4"><h2 className="truncate font-bold">{item.topic || item.title}</h2><p className="mt-1 text-xs text-slate-500">@{item.creator?.username || "unknown"} · {new Date(item.createdAt).toLocaleDateString()}</p>{item.description && <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{item.description}</p>}<button className={`mt-4 w-full rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:opacity-50 ${item.status === "published" ? "border border-red-200 text-red-600 hover:bg-red-50" : "bg-slate-900 text-white hover:bg-slate-700"}`} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ contentId: item._id, status: item.status === "published" ? "draft" : "published" })} type="button">{item.status === "published" ? "Unpublish content" : "Approve and publish"}</button></div></article>; })}</div>}
  </div>;
}

export default ContentModeration;
