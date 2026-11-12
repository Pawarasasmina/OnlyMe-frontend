import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { FiArrowRight, FiMessageSquare, FiRefreshCw } from "react-icons/fi";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const config = {
  user: { get title() { return __msg("layouts.userReports"); }, get description() { return __msg("admin.directProfileReportsOnly"); }, load: adminService.getUserReports },
  post: { get title() { return __msg("layouts.postReports"); }, get description() { return __msg("admin.homeFeedNoteAndSeenReports"); }, load: adminService.getPostReports },
  message: { get title() { return __msg("layouts.messageReports"); }, get description() { return __msg("admin.directGroupAndConversationReports"); }, load: () => adminService.getMessageReports({ limit: 100 }) },
};
const label = (value = "") => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export default function AdminReportListPage({ type }) {
  __useUiLanguage();
  const page = config[type];
  const query = useQuery({ queryKey: ["admin", `${type}-reports-list`], queryFn: () => page.load().then((response) => response.data.data) });
  const reports = query.data?.items || [];
  const summary = query.data?.summary || {};
  return <div className="mx-auto max-w-[1500px]"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">{__msg("admin.trustAndSafety")}</p><h1 dir="auto" className="mt-1 text-3xl font-black">{page.title}</h1><p className="mt-1 text-sm text-slate-500">{page.description} {__msg("admin.openAReportToReviewEvidenceAndTakeAction")}</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold" onClick={() => query.refetch()}><FiRefreshCw /> {__msg("discover.refresh")}</button></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-4">{[[__msg("fanWeb.all"), summary.total], [__msg("discover.new"), summary.received], [__msg("system.copy.c49bceb8a70b"), summary.reviewing], [__msg("social.completed"), summary.resolved]].map(([text, value]) => <div className="rounded-2xl border bg-white p-4" key={text}><p className="text-2xl font-black">{value || 0}</p><p className="text-xs text-slate-500">{text}</p></div>)}</section>
    {query.isLoading ? <p className="mt-8">{__msg("admin.loadingReports")}</p> : !reports.length ? <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500"><FiMessageSquare className="mx-auto mb-2 text-2xl" />{__msg("admin.noReportsFound")}</div> : <section className="mt-6 space-y-3">{reports.map((report) => <article className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:border-orange-300 sm:flex-row sm:items-center" key={report._id}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${report.status === "RECEIVED" ? "bg-red-100 text-red-700" : report.status === "REVIEWING" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{label(report.status)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{label(report.scope)}</span></div><h2 className="mt-3 font-black">{label(report.reason)}</h2><p className="mt-1 text-sm text-slate-600">{__msg("admin.reportedAccount_ea28f2")} <b>{report.reportedUser?.name || __msg("admin.unknown_bc7819")}</b> {report.reportedUser?.username ? `(@${report.reportedUser.username})` : ""}</p><p className="mt-1 text-xs text-slate-400">{__msg("admin.raisedBy")} {report.reporter?.name || __msg("admin.unknown_bc7819")} · {new Date(report.createdAt).toLocaleString(__uiLocale())}</p></div><Link className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" to={`/admin/${type}-reports/${report._id}`}>{__msg("admin.viewReport")} <FiArrowRight data-ui-directional="true" /></Link></article>)}</section>}
  </div>;
}
