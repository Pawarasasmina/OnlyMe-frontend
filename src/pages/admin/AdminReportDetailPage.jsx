import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import ModerationChecklist from "../../components/admin/ModerationChecklist";
import PostReportPreview from "../../components/admin/PostReportPreview";
import { adminService } from "../../services/adminService";
import { EMPTY_REVIEW_CHECKS, reviewIsComplete } from "../../utils/moderationReview";

const durations = [["1_HOUR", "1 hour"], ["5_HOURS", "5 hours"], ["24_HOURS", "1 day"], ["7_DAYS", "7 days"], ["30_DAYS", "1 month"]];
const label = (value = "") => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function MessagePreview({ report }) {
  const messages = report.snapshot?.messages || (report.snapshot ? [report.snapshot] : []);
  return <div className="rounded-2xl bg-slate-100 p-4">{messages.map((message, index) => <div className="mb-2 max-w-[85%] rounded-2xl rounded-bl-md bg-white p-3 shadow-sm" key={message.messageId || index}><p className="whitespace-pre-wrap break-words text-sm">{message.body || `[${message.mediaType || "Media message"}]`}</p></div>)}</div>;
}

export default function AdminReportDetailPage({ type }) {
  const { reportId } = useParams();
  const client = useQueryClient();
  const [action, setAction] = useState("NO_ACTION");
  const [duration, setDuration] = useState("24_HOURS");
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState(EMPTY_REVIEW_CHECKS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ["admin", type, "report", reportId], queryFn: () => adminService.getReportDetail(type, reportId).then((response) => response.data.data.report) });
  const report = query.data;
  const restrictionAction = type === "message" ? "MESSAGING_RESTRICTED" : "ACCOUNT_RESTRICTED";
  const outcomes = [["NO_ACTION", "Dismiss", "No violation found"], ["WARNING", "Send warning", "Notify the account owner"], [restrictionAction, type === "message" ? "Restrict messaging" : "Restrict login", "Apply a temporary restriction"]];
  const decide = async () => { if (!reviewIsComplete(checks)) return setError("Complete all four checks."); if (!note.trim()) return setError("Add an admin decision note."); if (action === restrictionAction && !window.confirm(`Apply this restriction for ${label(duration)}?`)) return; setBusy(true); setError(""); try { const payload = { action, note: note.trim(), ...(action === restrictionAction ? { duration } : {}) }; if (type === "message") await adminService.resolveMessageReport(reportId, payload); else if (type === "post") await adminService.resolvePostReport(reportId, payload); else await adminService.resolveUserReport(reportId, payload); await query.refetch(); await client.invalidateQueries({ queryKey: ["admin", `${type}-reports-list`] }); } catch (requestError) { setError(requestError.response?.data?.message || "Could not save decision."); } finally { setBusy(false); } };
  if (query.isLoading) return <p>Loading report…</p>;
  if (!report) return <p className="rounded-2xl border bg-white p-8">Report not found.</p>;
  const snapshot = report.snapshot || {};
  return <div className="mx-auto max-w-5xl"><Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-600" to={`/admin/${type}-reports`}><FiArrowLeft /> Back to {type} reports</Link><header className="mt-5 rounded-2xl border bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase text-orange-500">{label(report.scope)} report</p><h1 className="mt-1 text-3xl font-black">{label(report.reason)}</h1><p className="mt-2 text-sm text-slate-500">Reported {new Date(report.createdAt).toLocaleString()}</p></div><span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{label(report.status)}</span></div></header>
    <section className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Reported account</p><p className="mt-2 font-black">{report.reportedUser?.name}</p><p className="text-sm text-slate-500">@{report.reportedUser?.username} · {report.reportedUser?.email}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Reporter</p><p className="mt-2 font-black">{report.reporter?.name}</p><p className="text-sm text-slate-500">@{report.reporter?.username} · {report.reporter?.email}</p></div></section>{report.details && <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><b>Reporter note:</b> {report.details}</p>}
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="mb-4 text-lg font-black">Captured evidence</h2>{type === "post" ? <PostReportPreview report={report} /> : type === "message" ? <MessagePreview report={report} /> : <div className="rounded-xl bg-slate-50 p-5"><p className="font-black">@{snapshot.username || report.reportedUser?.username}</p><p className="mt-1 text-sm text-slate-600">{snapshot.name || report.reportedUser?.name}</p><p className="mt-3 text-xs text-slate-400">Profile ID: {snapshot.userId || report.reportedUser?._id}</p></div>}</section>
    {!['RESOLVED', 'CLOSED'].includes(report.status) && <section className="mt-5 space-y-5 rounded-2xl border bg-white p-5"><ModerationChecklist checks={checks} onChange={setChecks} /><div><h2 className="font-black">Choose an outcome</h2><div className="mt-3 grid gap-2 md:grid-cols-3">{outcomes.map(([value, heading, description]) => <button className={`rounded-xl border p-4 text-left ${action === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : ""}`} key={value} onClick={() => setAction(value)}><b>{heading}</b><span className="mt-1 block text-xs text-slate-500">{description}</span></button>)}</div></div>{action === restrictionAction && <label className="text-sm font-bold">Restriction duration<select className="mt-2 block w-full rounded-xl border p-3 sm:max-w-xs" value={duration} onChange={(event) => setDuration(event.target.value)}>{durations.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>}<label className="text-sm font-bold">Admin decision note *<textarea className="mt-2 min-h-28 w-full rounded-xl border p-3 font-normal" placeholder="Explain your decision" value={note} onChange={(event) => setNote(event.target.value)} /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-40" disabled={busy || !reviewIsComplete(checks) || !note.trim()} onClick={decide}>{busy ? "Saving…" : `Confirm: ${outcomes.find(([value]) => value === action)?.[1]}`}</button></section>}
  </div>;
}
