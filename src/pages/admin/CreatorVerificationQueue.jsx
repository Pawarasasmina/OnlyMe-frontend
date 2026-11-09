import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useMemo, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiSearch, FiShield } from "react-icons/fi";

import Loader from "../../components/common/Loader";

import AdminVerificationStatusBadge from "../../components/admin/AdminVerificationStatusBadge";

import { adminVerificationService } from "../../services/adminVerificationService";



const statuses = ["PENDING_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];

const statusLabels = { get PENDING_REVIEW() { return __msg("admin.pendingReview"); }, get CHANGES_REQUESTED() { return __msg("admin.changesRequested"); }, get APPROVED() { return __msg("admin.approved"); }, get REJECTED() { return __msg("admin.rejected"); } };



function CreatorVerificationQueue() {
  __useUiLanguage();

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



  return <div className="mx-auto max-w-[1700px]"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">{__msg("admin.trustAndSafety")}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{__msg("admin.identityAndCreatorVerifications")}</h1><p className="mt-1 text-sm text-slate-500">{__msg("admin.reviewIdentityDocumentsAndSelfiesThenApproveRejectOr")}</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin"] })} type="button"><FiRefreshCw />{__msg("discover.refresh")}</button></div>



    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statuses.map((status, index) => <button className="rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm hover:border-orange-300" key={status} onClick={() => update("status", status)} type="button"><p className="text-sm font-medium text-slate-500">{__enumLabel(statusLabels[status])}</p><p className="mt-2 text-3xl font-black">{summaryQueries[index].isLoading ? "…" : summaryQueries[index].data ?? "—"}</p></button>)}</div>



    <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><form className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_170px_180px_180px_auto]" onSubmit={(event) => { event.preventDefault(); update("search", searchText.trim()); }}><label className="relative"><span className="sr-only">{__msg("admin.searchUsernameOrEmail")}</span><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 py-2.5 ps-10 pe-3 text-sm outline-none focus:border-orange-400" onChange={(event) => setSearchText(event.target.value)} placeholder={__msg("admin.usernameOrEmail")} value={searchText} /></label><select aria-label={__msg("admin.verificationStatus")} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onChange={(event) => update("status", event.target.value)} value={filters.status || ""}><option value="">{__msg("admin.allStatuses")}</option>{["NOT_STARTED", "DRAFT", ...statuses].map((status) => <option key={status} value={status}>{__enumLabel(status.replaceAll("_", " "))}</option>)}</select><input aria-label={__msg("admin.countryFilter")} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onBlur={(event) => update("country", event.target.value.trim())} defaultValue={filters.country || ""} placeholder={__msg("verification.country")} /><select aria-label={__msg("verification.documentType")} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onChange={(event) => update("documentType", event.target.value)} value={filters.documentType || ""}><option value="">{__msg("admin.allDocuments")}</option><option value="national_id">{__msg("verification.nationalId")}</option><option value="passport">{__msg("verification.passport")}</option><option value="driver_license">{__msg("verification.drivingLicence")}</option><option value="other">{__msg("admin.other")}</option></select><select aria-label={__msg("search.sortResults")} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" onChange={(event) => update("sort", event.target.value)} value={sort}><option value="newest">{__msg("admin.newestSubmitted")}</option><option value="oldest">{__msg("admin.oldestSubmitted")}</option><option value="name">{__msg("admin.creatorName")}</option></select><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white" type="submit">{__msg("discover.search")}</button></form>



      {queueQuery.isLoading ? <div className="p-8 text-slate-600"><Loader label={__msg("admin.loadingVerificationQueue")} /></div> : null}

      {queueQuery.isError ? <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{__msg("admin.unableToLoadCreatorVerifications")} <button className="font-bold underline" onClick={() => queueQuery.refetch()} type="button">{__msg("activity.retry")}</button></div> : null}

      {!queueQuery.isLoading && !queueQuery.isError && !items.length ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><FiShield className="mx-auto text-4xl text-slate-300" /><p className="mt-3 font-bold text-slate-700">{__msg("admin.noVerificationApplicationsFound")}</p><p className="mt-1 text-sm text-slate-500">{__msg("admin.adjustTheFiltersOrWaitForCreatorSubmissions")}</p></div></div> : null}

      {items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-start text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">{__msg("discover.creator")}</th><th className="px-4 py-3">{__msg("verification.country")}</th><th className="px-4 py-3">{__msg("admin.document")}</th><th className="px-4 py-3">{__msg("verification.submitted")}</th><th className="px-4 py-3">{__msg("social.verification")}</th><th className="px-4 py-3">{__msg("admin.creatorAccess")}</th><th className="px-4 py-3 text-end">{__msg("admin.action")}</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr className="hover:bg-slate-50" key={item.id}><td className="px-4 py-3"><p className="font-bold">{item.creator?.name || __msg("admin.unknownCreator")}</p><p dir="auto" className="text-xs text-slate-500">@{item.creator?.username} · {item.creator?.email}</p></td><td className="px-4 py-3 text-slate-600">{item.country || "—"}</td><td className="px-4 py-3 capitalize text-slate-600">{item.documentType?.replaceAll("_", " ") || "—"}</td><td className="px-4 py-3 text-slate-500">{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString(__uiLocale()) : __msg("admin.notSubmitted")}</td><td className="px-4 py-3"><AdminVerificationStatusBadge status={item.status} /></td><td className="px-4 py-3 capitalize text-slate-600">{item.creator?.creatorApprovalStatus || __msg("admin.pending")}</td><td className="px-4 py-3 text-end"><Link className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white" to={`/admin/creator-verifications/${item.id}`}>{__msg("admin.review")}</Link></td></tr>)}</tbody></table></div> : null}

      {pagination?.pages > 1 ? <div className="flex items-center justify-between border-t border-slate-200 p-4"><p className="text-sm text-slate-500">{__msg("admin.page")} {pagination.page} {__msg("onboarding.of")} {pagination.pages} · {pagination.total} {__msg("admin.records")}</p><div className="flex gap-2"><button aria-label={__msg("admin.previousPage")} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" disabled={page <= 1} onClick={() => update("page", String(page - 1))} type="button"><FiChevronLeft data-ui-directional="true" /></button><button aria-label={__msg("admin.nextPage")} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" disabled={page >= pagination.pages} onClick={() => update("page", String(page + 1))} type="button"><FiChevronRight data-ui-directional="true" /></button></div></div> : null}

    </section>

  </div>;

}



export default CreatorVerificationQueue;



