import { useQuery } from "@tanstack/react-query";
import { FiArrowRight, FiMessageSquare, FiRefreshCw } from "react-icons/fi";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const config = {
  user: { title: "User reports", description: "Direct profile reports only.", load: adminService.getUserReports },
  post: { title: "Post reports", description: "Home feed, Note, and Seen reports.", load: adminService.getPostReports },
  message: { title: "Message reports", description: "Direct, group, and conversation reports.", load: () => adminService.getMessageReports({ limit: 100 }) },
};
const label = (value = "") => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export default function AdminReportListPage({ type }) {
  const page = config[type];
  const query = useQuery({ queryKey: ["admin", `${type}-reports-list`], queryFn: () => page.load().then((response) => response.data.data) });
  const reports = query.data?.items || [];
  const summary = query.data?.summary || {};
  return <div className="mx-auto max-w-[1500px]"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Trust and safety</p><h1 className="mt-1 text-3xl font-black">{page.title}</h1><p className="mt-1 text-sm text-slate-500">{page.description} Open a report to review evidence and take action.</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold" onClick={() => query.refetch()}><FiRefreshCw /> Refresh</button></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-4">{[["All", summary.total], ["New", summary.received], ["In review", summary.reviewing], ["Completed", summary.resolved]].map(([text, value]) => <div className="rounded-2xl border bg-white p-4" key={text}><p className="text-2xl font-black">{value || 0}</p><p className="text-xs text-slate-500">{text}</p></div>)}</section>
    {query.isLoading ? <p className="mt-8">Loading reports…</p> : !reports.length ? <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500"><FiMessageSquare className="mx-auto mb-2 text-2xl" />No reports found.</div> : <section className="mt-6 space-y-3">{reports.map((report) => <article className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:border-orange-300 sm:flex-row sm:items-center" key={report._id}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${report.status === "RECEIVED" ? "bg-red-100 text-red-700" : report.status === "REVIEWING" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{label(report.status)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{label(report.scope)}</span></div><h2 className="mt-3 font-black">{label(report.reason)}</h2><p className="mt-1 text-sm text-slate-600">Reported account: <b>{report.reportedUser?.name || "Unknown"}</b> {report.reportedUser?.username ? `(@${report.reportedUser.username})` : ""}</p><p className="mt-1 text-xs text-slate-400">Raised by {report.reporter?.name || "Unknown"} · {new Date(report.createdAt).toLocaleString()}</p></div><Link className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" to={`/admin/${type}-reports/${report._id}`}>View report <FiArrowRight /></Link></article>)}</section>}
  </div>;
}
