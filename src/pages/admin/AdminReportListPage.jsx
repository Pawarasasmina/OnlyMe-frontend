import { getLocale as locale, msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { FiAlertTriangle, FiArrowRight, FiCheckCircle, FiClock, FiRefreshCw, FiShield } from "react-icons/fi";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const config = {
  user: { get title() { return msg("layouts.userReports"); }, get description() { return msg("admin.directProfileReportsOnly"); }, load: adminService.getUserReports },
  post: { get title() { return msg("layouts.postReports"); }, get description() { return msg("admin.homeFeedNoteAndSeenReports"); }, load: adminService.getPostReports },
  message: { get title() { return msg("layouts.messageReports"); }, get description() { return msg("admin.directGroupAndConversationReports"); }, load: () => adminService.getMessageReports({ limit: 100 }) },
};
const label = (value = "") => String(value).replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const deadlineLabel = (dueAt) => {
  const deadline = new Date(dueAt); if (!Number.isFinite(deadline.getTime())) return null;
  const difference = deadline.getTime() - Date.now(); const absolute = Math.abs(difference);
  if (absolute < 86400000) { const amount = absolute < 3600000 ? `${Math.max(1, Math.ceil(absolute / 60000))}m` : `${Math.max(1, Math.ceil(absolute / 3600000))}h`; return difference < 0 ? `${amount} overdue` : `${amount} remaining`; }
  return `${difference < 0 ? "Overdue" : "Due"} · ${deadline.toLocaleDateString(locale(), { day: "2-digit", month: "2-digit", year: "numeric" })}`;
};

export default function AdminReportListPage({ type }) {
  useLanguage(); const page = config[type];
  const query = useQuery({ queryKey: ["admin", `${type}-reports-list`], queryFn: () => page.load().then((response) => response.data.data) });
  const reports = query.data?.items || []; const summary = query.data?.summary || {};
  const cards = [["All reports", summary.total, FiShield], ["New", summary.received, FiAlertTriangle], ["In review", summary.reviewing, FiClock], ["Completed", summary.resolved, FiCheckCircle]];
  return <div className="mx-auto max-w-[1500px] space-y-6">
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[.18em] text-orange-500">Trust &amp; Safety / Review workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight">{page.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{page.description} {msg("admin.openAReportToReviewEvidenceAndTakeAction")}</p></div><div className="flex gap-2"><Link className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white" to="/admin/safety"><FiShield /> Unified queue</Link><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black" onClick={() => query.refetch()} type="button"><FiRefreshCw /> Refresh</button></div></div></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([text, value, Icon]) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={text}><Icon className="text-orange-500" /><p className="mt-3 text-3xl font-black">{value || 0}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{text}</p></article>)}</section>
    {query.isLoading ? <div className="rounded-2xl border bg-white p-10 text-center">Loading reports...</div> : query.isError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">Unable to load reports. <button className="font-bold underline" onClick={() => query.refetch()} type="button">Try again</button></div> : !reports.length ? <div className="rounded-3xl border border-dashed bg-white p-14 text-center"><FiCheckCircle className="mx-auto text-4xl text-emerald-500" /><p className="mt-3 font-black">No reports in this workspace</p></div> : <section className="space-y-3">{reports.map((report) => { const deadline = deadlineLabel(report.dueAt); const overdue = deadline && new Date(report.dueAt) < new Date(); return <article className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md sm:flex-row sm:items-center" key={report._id}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${report.priority === "URGENT" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>{report.priority || "STANDARD"}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${report.status === "RECEIVED" ? "bg-red-100 text-red-700" : report.status === "REVIEWING" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{label(report.status)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{label(report.scope)}</span>{deadline && !["RESOLVED", "CLOSED"].includes(report.status) ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{deadline}</span> : null}</div><h2 className="mt-3 text-lg font-black">{label(report.reason)}</h2><p className="mt-1 text-sm text-slate-600">Reported account: <b>{report.reportedUser?.name || "Unknown"}</b> {report.reportedUser?.username ? <bdi dir="ltr">(@{report.reportedUser.username})</bdi> : null}</p><p className="mt-2 text-xs text-slate-400">Raised by {report.reporter?.name || "Unknown"} · {new Date(report.createdAt).toLocaleString(locale())}</p></div><Link className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white group-hover:bg-orange-600" to={`/admin/${type}-reports/${report._id}`}>Full review <FiArrowRight /></Link></article>; })}</section>}
  </div>;
}
