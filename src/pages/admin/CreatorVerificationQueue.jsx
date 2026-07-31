import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiSearch, FiShield } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import AdminVerificationStatusBadge from "../../components/admin/AdminVerificationStatusBadge";
import { adminVerificationService } from "../../services/adminVerificationService";

const statuses = ["PENDING_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];
const statusLabels = { PENDING_REVIEW: "Pending Review", CHANGES_REQUESTED: "Changes Requested", APPROVED: "Approved", REJECTED: "Rejected" };

function CreatorVerificationQueue() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get("search") || "");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const filters = {
    page, limit: 20,
    status: searchParams.get("status") || undefined,
    country: searchParams.get("country") || undefined,
    documentType: searchParams.get("documentType") || undefined,
    search: searchParams.get("search") || undefined,
  };
  const sort = searchParams.get("sort") || "newest";

  const queueQuery = useQuery({ queryKey: ["admin", "creator-verifications", filters], queryFn: () => adminVerificationService.list(filters).then((response) => response.data.data), placeholderData: (previous) => previous });
  const summaryQueries = useQueries({ queries: statuses.map((status) => ({ queryKey: ["admin", "creator-verification-count", status], queryFn: () => adminVerificationService.list({ status, page: 1, limit: 1 }).then((response) => response.data.data.pagination.total) })) });

  const update = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  };
  const items = useMemo(() => {
    const result = [...(queueQuery.data?.items || [])];
    if (sort === "oldest") return result.sort((a, b) => new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt));
    if (sort === "name") return result.sort((a, b) => String(a.creator?.name || "").localeCompare(String(b.creator?.name || "")));
    return result.sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
  }, [queueQuery.data?.items, sort]);
  const pagination = queueQuery.data?.pagination;

  return <div className="mx-auto max-w-[1700px]"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Trust and safety</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Creator verifications</h1><p className="mt-1 text-sm text-slate-500">Manually review creator identity applications and documents.</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin"] })} type="button"><FiRefreshCw />Refresh</button></div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statuses.map((status, index) => <button className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-orange-300" key={status} onClick={() => update("status", status)} type="button"><p className="text-sm font-medium text-slate-500">{statusLabels[status]}</p><p className="mt-2 text-3xl font-black">{summaryQueries[index].isLoading ? "…" : summaryQueries[index].data ?? "—"}</p></button>)}</div>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><form className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_170px_180px_180px_auto]" onSubmit={(event) => { event.preventDefault(); update("search", searchText.trim()); }}><label className="relative"><span className="sr-only">Search username or email</span><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400" onChange={(event) => setSearchText(event.target.value)} placeholder="Username or email" value={searchText} /></label><select aria-label="Verification status" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onChange={(event) => update("status", event.target.value)} value={filters.status || ""}><option value="">All statuses</option>{["NOT_STARTED", "DRAFT", ...statuses].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><input aria-label="Country filter" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onBlur={(event) => update("country", event.target.value.trim())} defaultValue={filters.country || ""} placeholder="Country" /><select aria-label="Document type" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onChange={(event) => update("documentType", event.target.value)} value={filters.documentType || ""}><option value="">All documents</option><option value="national_id">National ID</option><option value="passport">Passport</option><option value="driver_license">Driving licence</option><option value="other">Other</option></select><select aria-label="Sort results" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onChange={(event) => update("sort", event.target.value)} value={sort}><option value="newest">Newest submitted</option><option value="oldest">Oldest submitted</option><option value="name">Creator name</option></select><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white" type="submit">Search</button></form>

      {queueQuery.isLoading ? <div className="p-8 text-slate-600"><Loader label="Loading verification queue..." /></div> : null}
      {queueQuery.isError ? <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load creator verifications. <button className="font-bold underline" onClick={() => queueQuery.refetch()} type="button">Retry</button></div> : null}
      {!queueQuery.isLoading && !queueQuery.isError && !items.length ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><FiShield className="mx-auto text-4xl text-slate-300" /><p className="mt-3 font-bold text-slate-700">No verification applications found</p><p className="mt-1 text-sm text-slate-500">Adjust the filters or wait for creator submissions.</p></div></div> : null}
      {items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Creator</th><th className="px-4 py-3">Country</th><th className="px-4 py-3">Document</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Creator access</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr className="hover:bg-slate-50" key={item.id}><td className="px-4 py-3"><p className="font-bold">{item.creator?.name || "Unknown creator"}</p><p className="text-xs text-slate-500">@{item.creator?.username} · {item.creator?.email}</p></td><td className="px-4 py-3 text-slate-600">{item.country || "—"}</td><td className="px-4 py-3 capitalize text-slate-600">{item.documentType?.replaceAll("_", " ") || "—"}</td><td className="px-4 py-3 text-slate-500">{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Not submitted"}</td><td className="px-4 py-3"><AdminVerificationStatusBadge status={item.status} /></td><td className="px-4 py-3 capitalize text-slate-600">{item.creator?.creatorApprovalStatus || "pending"}</td><td className="px-4 py-3 text-right"><Link className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white" to={`/admin/creator-verifications/${item.id}`}>Review</Link></td></tr>)}</tbody></table></div> : null}
      {pagination?.pages > 1 ? <div className="flex items-center justify-between border-t border-slate-200 p-4"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} · {pagination.total} records</p><div className="flex gap-2"><button aria-label="Previous page" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" disabled={page <= 1} onClick={() => update("page", String(page - 1))} type="button"><FiChevronLeft /></button><button aria-label="Next page" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" disabled={page >= pagination.pages} onClick={() => update("page", String(page + 1))} type="button"><FiChevronRight /></button></div></div> : null}
    </section>
  </div>;
}

export default CreatorVerificationQueue;

